// Cruza deputados e senadores com os dados eleitorais do TSE:
// patrimônio declarado (eleição que deu o mandato e 2026) e dinheiro da campanha que os elegeu.
//
// Uso: node scripts/coletar-tse.mjs   (rode depois de coletar-camara e coletar-senado)
//
// Os arquivos do TSE são grandes (~1 GB no total) e não mudam com frequência, por isso
// ficam em data/raw/tse e só são baixados na primeira vez.
// Fonte: https://dadosabertos.tse.jus.br
//
// O CPF é usado só para cruzar as bases e NUNCA é gravado nos arquivos do site.

import fs from "node:fs";
import path from "node:path";
import {
  PASTA_SAIDA,
  arredondar,
  buscarJson,
  emParalelo,
  normalizarNome,
  numeroBr,
  ordenarSomas,
  salvarJson,
} from "./util.mjs";
import { CDN, PASTA_TSE, arquivoTse, ehPublico, lerTse, origemReceita, resumirTipoBem, titulo, valido } from "./tse-comum.mjs";

const ANO_ATUAL = 2026;
const ANOS_CANDIDATOS = [2018, 2022, ANO_ATUAL];
const ANOS_RECEITAS = [2018, 2022];
const CARGOS_SENADO = new Set(["SENADOR", "1º SUPLENTE", "2º SUPLENTE"]);

async function main() {
  // --- Quem procurar ---
  const deputados = JSON.parse(fs.readFileSync(path.join(PASTA_SAIDA, "indice.json"), "utf-8"));
  const senadores = JSON.parse(fs.readFileSync(path.join(PASTA_SAIDA, "senado-indice.json"), "utf-8")).map((s) =>
    JSON.parse(fs.readFileSync(path.join(PASTA_SAIDA, "senadores", `${s.id}.json`), "utf-8")),
  );

  console.log("Buscando CPF dos deputados na API da Câmara (só para cruzar com o TSE)...");
  const cacheCpf = path.join(PASTA_TSE, "cpfs-camara.json");
  const cpfs = fs.existsSync(cacheCpf) ? JSON.parse(fs.readFileSync(cacheCpf, "utf-8")) : {};
  await emParalelo(deputados.filter((d) => !cpfs[d.id]), 8, async (d) => {
    const { dados } = await buscarJson(`https://dadosabertos.camara.leg.br/api/v2/deputados/${d.id}`);
    cpfs[d.id] = { cpf: dados.cpf, nomeCivil: dados.nomeCivil };
  });
  fs.mkdirSync(PASTA_TSE, { recursive: true });
  fs.writeFileSync(cacheCpf, JSON.stringify(cpfs));

  // --- Candidaturas ---
  console.log("Lendo candidaturas do TSE...");
  const porCpf = new Map(); // cpf -> [candidatura]
  const porNomeSenado = new Map(); // "ano|UF|NOME" -> candidatura
  const porNomeDeputado = new Map(); // "UF|NOME" (2022) -> candidatura
  for (const ano of ANOS_CANDIDATOS) {
    const arq = await arquivoTse(`consulta_cand_${ano}_BRASIL.csv`, `${CDN}/consulta_cand/consulta_cand_${ano}.zip`);
    const vistos = new Map(); // sq -> candidatura (quem foi ao 2º turno aparece duas vezes)
    for await (const c of lerTse(arq)) {
      if (c.CD_TIPO_ELEICAO !== "2") continue; // só eleições ordinárias
      const anterior = vistos.get(c.SQ_CANDIDATO);
      if (anterior) {
        if (Number(c.NR_TURNO) > anterior.turno) Object.assign(anterior, { turno: Number(c.NR_TURNO), situacao: c.DS_SIT_TOT_TURNO });
        continue;
      }
      const cand = {
        turno: Number(c.NR_TURNO),
        ano,
        sq: c.SQ_CANDIDATO,
        cpf: c.NR_CPF_CANDIDATO,
        cargo: c.DS_CARGO,
        uf: c.SG_UF,
        partido: c.SG_PARTIDO,
        nomeUrna: c.NM_URNA_CANDIDATO,
        situacao: c.DS_SIT_TOT_TURNO,
      };
      vistos.set(c.SQ_CANDIDATO, cand);
      if (valido(cand.cpf)) {
        if (!porCpf.has(cand.cpf)) porCpf.set(cand.cpf, []);
        porCpf.get(cand.cpf).push(cand);
      }
      if (CARGOS_SENADO.has(cand.cargo)) porNomeSenado.set(`${ano}|${cand.uf}|${normalizarNome(c.NM_CANDIDATO)}`, cand);
      if (ano === 2022 && cand.cargo === "DEPUTADO FEDERAL") porNomeDeputado.set(`${cand.uf}|${normalizarNome(c.NM_CANDIDATO)}`, cand);
    }
  }

  // Para cada parlamentar: a candidatura que deu o mandato atual e a de 2026 (se houver).
  const alvos = [];
  for (const d of deputados) {
    const { cpf, nomeCivil } = cpfs[d.id] ?? {};
    const lista = porCpf.get(cpf) ?? [];
    const base =
      lista.find((c) => c.ano === 2022 && c.cargo === "DEPUTADO FEDERAL") ?? porNomeDeputado.get(`${d.uf}|${normalizarNome(nomeCivil)}`);
    const cpfFinal = base?.cpf ?? cpf;
    alvos.push({ chave: `dep:${d.id}`, base, atual: (porCpf.get(cpfFinal) ?? []).find((c) => c.ano === ANO_ATUAL) });
  }
  for (const s of senadores) {
    const base = porNomeSenado.get(`${s.anoEleicao}|${s.uf}|${normalizarNome(s.nomeCompleto)}`);
    alvos.push({ chave: `sen:${s.id}`, base, atual: base && (porCpf.get(base.cpf) ?? []).find((c) => c.ano === ANO_ATUAL) });
  }
  const semBase = alvos.filter((a) => !a.base).map((a) => a.chave);
  console.log(`  encontrados: ${alvos.length - semBase.length}/${alvos.length}${semBase.length ? ` (sem par: ${semBase.join(", ")})` : ""}`);

  // --- Bens declarados ---
  console.log("Somando bens declarados...");
  const sqsPorAno = new Map(ANOS_CANDIDATOS.map((a) => [a, new Set()]));
  for (const a of alvos) for (const c of [a.base, a.atual]) if (c) sqsPorAno.get(c.ano).add(c.sq);
  const bens = new Map(); // sq -> {total, porTipo}
  for (const ano of ANOS_CANDIDATOS) {
    const arq = await arquivoTse(`bem_candidato_${ano}_BRASIL.csv`, `${CDN}/bem_candidato/bem_candidato_${ano}.zip`);
    const procurados = sqsPorAno.get(ano);
    for await (const b of lerTse(arq)) {
      if (!procurados.has(b.SQ_CANDIDATO) || b.CD_TIPO_ELEICAO !== "2") continue;
      if (!bens.has(b.SQ_CANDIDATO)) bens.set(b.SQ_CANDIDATO, { total: 0, porTipo: {} });
      const item = bens.get(b.SQ_CANDIDATO);
      const valor = numeroBr(b.VR_BEM_CANDIDATO);
      const tipo = resumirTipoBem(b.DS_TIPO_BEM_CANDIDATO);
      item.total += valor;
      item.porTipo[tipo] = (item.porTipo[tipo] ?? 0) + valor;
    }
  }

  // --- Dinheiro de campanha ---
  const receitas = new Map(); // sq -> {total, porOrigem, doadores}
  for (const ano of ANOS_RECEITAS) {
    const procurados = sqsPorAno.get(ano);
    if (!procurados.size) continue;
    console.log(`Lendo receitas de campanha de ${ano} (arquivo grande, pode levar 1-2 min)...`);
    const arq = await arquivoTse(
      `receitas_candidatos_${ano}_BRASIL.csv`,
      `${CDN}/prestacao_contas/prestacao_de_contas_eleitorais_candidatos_${ano}.zip`,
    );
    for await (const r of lerTse(arq)) {
      if (!procurados.has(r.SQ_CANDIDATO)) continue;
      if (!receitas.has(r.SQ_CANDIDATO)) receitas.set(r.SQ_CANDIDATO, { total: 0, porOrigem: {}, doadores: {} });
      const item = receitas.get(r.SQ_CANDIDATO);
      const valor = numeroBr(r.VR_RECEITA);
      const origem = origemReceita(r);
      item.total += valor;
      item.porOrigem[origem] = (item.porOrigem[origem] ?? 0) + valor;
      const doador = valido(r.NM_DOADOR_RFB) ? r.NM_DOADOR_RFB : valido(r.NM_DOADOR) ? r.NM_DOADOR : null;
      if (doador) item.doadores[titulo(doador)] = (item.doadores[titulo(doador)] ?? 0) + valor;
    }
  }

  // --- Saída ---
  const resumoBens = (c) => {
    if (!c) return null;
    const b = bens.get(c.sq);
    return { ano: c.ano, cargo: titulo(c.cargo), total: arredondar(b?.total ?? 0), porTipo: b ? ordenarSomas(b.porTipo, "tipo", 6) : [] };
  };
  const saida = {};
  for (const { chave, base, atual } of alvos) {
    if (!base) continue;
    const r = receitas.get(base.sq);
    const publico = r ? Object.entries(r.porOrigem).filter(([o]) => ehPublico(o)).reduce((s, [, v]) => s + v, 0) : 0;
    saida[chave] = {
      eleicao: { ano: base.ano, cargo: titulo(base.cargo), partido: base.partido, nomeUrna: base.nomeUrna, situacao: titulo(base.situacao) },
      patrimonio: [resumoBens(base), resumoBens(atual)].filter(Boolean),
      campanha: r
        ? {
            ano: base.ano,
            total: arredondar(r.total),
            publico: arredondar(publico),
            percentualPublico: r.total ? arredondar((publico / r.total) * 100, 1) : 0,
            porOrigem: ordenarSomas(r.porOrigem, "origem"),
            doadores: ordenarSomas(r.doadores, "nome", 5),
          }
        : null,
      candidatura2026: atual
        ? { cargo: titulo(atual.cargo), partido: atual.partido, situacao: valido(atual.situacao) ? titulo(atual.situacao) : null }
        : null,
    };
  }
  salvarJson("tse.json", saida);
  console.log(`Pronto: dados eleitorais de ${Object.keys(saida).length} parlamentares.`);
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
