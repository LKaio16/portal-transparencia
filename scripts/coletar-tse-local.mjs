// Eleitos nos estados e municípios, a partir do TSE:
//  - deputados estaduais e distritais eleitos em 2022 (e se concorreram em 2026);
//  - prefeitos e vereadores eleitos em 2024.
// Para cada um: patrimônio declarado e quanto custou a campanha (com a parte de dinheiro público).
// A atividade nas Assembleias (coletar-assembleias.mjs) é ligada a estes eleitos na hora de montar
// as páginas (src/lib/locais.ts), pelo nome civil e pelo estado.
//
// Uso: node scripts/coletar-tse-local.mjs   (os arquivos de 2024 somam ~2 GB e são baixados na primeira vez)
//
// Importante: mostramos quem foi ELEITO. Quem está no cargo hoje pode ser outra pessoa (suplente que
// assumiu, cassação, morte). O site avisa isso em cada página.

import { arredondar, normalizarNome, numeroBr, ordenarSomas, salvarJson } from "./util.mjs";
import { CDN, arquivoTse, ehPublico, lerTse, origemReceita, resumirTipoBem, titulo, valido } from "./tse-comum.mjs";

const CARGOS_ESTADUAIS = new Set(["DEPUTADO ESTADUAL", "DEPUTADO DISTRITAL"]);
const CARGOS_MUNICIPAIS = new Set(["PREFEITO", "VEREADOR"]);
const eleito = (situacao) => /^ELEITO/.test(situacao ?? "");

const csv = {
  cand: (ano) => arquivoTse(`consulta_cand_${ano}_BRASIL.csv`, `${CDN}/consulta_cand/consulta_cand_${ano}.zip`),
  bens: (ano) => arquivoTse(`bem_candidato_${ano}_BRASIL.csv`, `${CDN}/bem_candidato/bem_candidato_${ano}.zip`),
  receitas: (ano) =>
    arquivoTse(`receitas_candidatos_${ano}_BRASIL.csv`, `${CDN}/prestacao_contas/prestacao_de_contas_eleitorais_candidatos_${ano}.zip`),
};

// "SÃO JOÃO DEL-REI" -> "sao-joao-del-rei"
const slug = (t) => normalizarNome(t).toLowerCase().replace(/\s+/g, "-");

// Lê as candidaturas de uma eleição; quem foi ao 2º turno aparece duas vezes e vale a última situação.
async function lerCandidaturas(ano, filtro) {
  const porSq = new Map();
  for await (const c of lerTse(await csv.cand(ano))) {
    if (c.CD_TIPO_ELEICAO !== "2" || !filtro(c)) continue;
    const anterior = porSq.get(c.SQ_CANDIDATO);
    if (anterior) {
      if (Number(c.NR_TURNO) > anterior.turno) Object.assign(anterior, { turno: Number(c.NR_TURNO), situacao: c.DS_SIT_TOT_TURNO });
      continue;
    }
    porSq.set(c.SQ_CANDIDATO, {
      sq: c.SQ_CANDIDATO,
      turno: Number(c.NR_TURNO),
      cpf: c.NR_CPF_CANDIDATO,
      cargo: c.DS_CARGO,
      uf: c.SG_UF,
      ue: c.SG_UE,
      municipio: c.NM_UE,
      partido: c.SG_PARTIDO,
      nome: c.NM_URNA_CANDIDATO,
      nomeCompleto: c.NM_CANDIDATO,
      ocupacao: c.DS_OCUPACAO,
      situacao: c.DS_SIT_TOT_TURNO,
    });
  }
  return porSq;
}

async function somarBens(ano, sqs) {
  const bens = new Map();
  for await (const b of lerTse(await csv.bens(ano))) {
    if (b.CD_TIPO_ELEICAO !== "2" || !sqs.has(b.SQ_CANDIDATO)) continue;
    if (!bens.has(b.SQ_CANDIDATO)) bens.set(b.SQ_CANDIDATO, { total: 0, porTipo: {} });
    const item = bens.get(b.SQ_CANDIDATO);
    const valor = numeroBr(b.VR_BEM_CANDIDATO);
    const tipo = resumirTipoBem(b.DS_TIPO_BEM_CANDIDATO);
    item.total += valor;
    item.porTipo[tipo] = (item.porTipo[tipo] ?? 0) + valor;
  }
  return bens;
}

async function somarReceitas(ano, sqs, comDoadores) {
  const receitas = new Map();
  for await (const r of lerTse(await csv.receitas(ano))) {
    if (!sqs.has(r.SQ_CANDIDATO)) continue;
    if (!receitas.has(r.SQ_CANDIDATO)) receitas.set(r.SQ_CANDIDATO, { total: 0, porOrigem: {}, doadores: {} });
    const item = receitas.get(r.SQ_CANDIDATO);
    const valor = numeroBr(r.VR_RECEITA);
    const origem = origemReceita(r);
    item.total += valor;
    item.porOrigem[origem] = (item.porOrigem[origem] ?? 0) + valor;
    if (comDoadores.has(r.SQ_CANDIDATO)) {
      const doador = valido(r.NM_DOADOR_RFB) ? r.NM_DOADOR_RFB : valido(r.NM_DOADOR) ? r.NM_DOADOR : null;
      if (doador) item.doadores[titulo(doador)] = (item.doadores[titulo(doador)] ?? 0) + valor;
    }
  }
  return receitas;
}

function resumoCampanha(r, ano, completo) {
  if (!r) return null;
  const publico = Object.entries(r.porOrigem).filter(([o]) => ehPublico(o)).reduce((s, [, v]) => s + v, 0);
  const base = { ano, total: arredondar(r.total), publico: arredondar(publico), percentualPublico: r.total ? arredondar((publico / r.total) * 100, 1) : 0 };
  return completo ? { ...base, porOrigem: ordenarSomas(r.porOrigem, "origem"), doadores: ordenarSomas(r.doadores, "nome", 5) } : base;
}

const resumoBens = (b, ano, cargo, completo) =>
  b ? { ano, cargo: titulo(cargo), total: arredondar(b.total), ...(completo ? { porTipo: ordenarSomas(b.porTipo, "tipo", 6) } : {}) } : { ano, cargo: titulo(cargo), total: 0, ...(completo ? { porTipo: [] } : {}) };

async function estaduais() {
  console.log("Deputados estaduais (2022)...");
  const eleitos = [...(await lerCandidaturas(2022, (c) => CARGOS_ESTADUAIS.has(c.DS_CARGO)))].map(([, c]) => c).filter((c) => eleito(c.situacao));
  const sqs = new Set(eleitos.map((c) => c.sq));

  // Quem concorreu de novo em 2026 (o CPF liga as duas eleições; ele nunca é gravado).
  const porCpf = new Map(eleitos.filter((c) => valido(c.cpf)).map((c) => [c.cpf, c]));
  const em2026 = new Map();
  for (const c of (await lerCandidaturas(2026, (c) => porCpf.has(c.NR_CPF_CANDIDATO))).values()) em2026.set(porCpf.get(c.cpf).sq, c);
  const sqs2026 = new Set([...em2026.values()].map((c) => c.sq));

  const [bens2022, bens2026, receitas] = [await somarBens(2022, sqs), await somarBens(2026, sqs2026), await somarReceitas(2022, sqs, sqs)];

  const indice = [];
  for (const c of eleitos) {
    const atual = em2026.get(c.sq);
    const dados = {
      id: c.sq,
      nome: titulo(c.nome),
      nomeCompleto: titulo(c.nomeCompleto),
      partido: c.partido,
      uf: c.uf,
      cargo: c.cargo === "DEPUTADO DISTRITAL" ? "Deputado(a) distrital" : "Deputado(a) estadual",
      ocupacao: titulo(c.ocupacao),
      eleicao: { ano: 2022, cargo: titulo(c.cargo), partido: c.partido, nomeUrna: c.nome, situacao: titulo(c.situacao) },
      patrimonio: [resumoBens(bens2022.get(c.sq), 2022, c.cargo, true), ...(atual ? [resumoBens(bens2026.get(atual.sq), 2026, atual.cargo, true)] : [])],
      campanha: resumoCampanha(receitas.get(c.sq), 2022, true),
      candidatura2026: atual ? { cargo: titulo(atual.cargo), partido: atual.partido, situacao: valido(atual.situacao) ? titulo(atual.situacao) : null } : null,
    };
    salvarJson(`estaduais/${c.sq}.json`, dados);
    indice.push({
      id: c.sq,
      nome: dados.nome,
      partido: c.partido,
      uf: c.uf,
      cargo: dados.cargo,
      patrimonio: dados.patrimonio.at(-1)?.total ?? null,
      campanha: dados.campanha?.total ?? null,
      percentualPublico: dados.campanha?.percentualPublico ?? null,
      nomeCompleto: dados.nomeCompleto,
    });
  }
  indice.sort((a, b) => a.uf.localeCompare(b.uf) || a.nome.localeCompare(b.nome, "pt-BR"));
  salvarJson("estaduais/indice.json", indice);
  console.log(`  ${indice.length} deputados estaduais/distritais.`);
}

async function municipais() {
  console.log("Prefeitos e vereadores (2024)...");
  const eleitos = [...(await lerCandidaturas(2024, (c) => CARGOS_MUNICIPAIS.has(c.DS_CARGO)))].map(([, c]) => c).filter((c) => eleito(c.situacao));
  const sqs = new Set(eleitos.map((c) => c.sq));
  const prefeitos = new Set(eleitos.filter((c) => c.cargo === "PREFEITO").map((c) => c.sq));
  console.log(`  ${prefeitos.size} prefeitos e ${eleitos.length - prefeitos.size} vereadores. Somando bens e receitas (pode levar alguns minutos)...`);
  const bens = await somarBens(2024, sqs);
  const receitas = await somarReceitas(2024, sqs, prefeitos);

  const cidades = new Map();
  for (const c of eleitos) {
    const chave = `${c.uf}|${c.ue}`;
    if (!cidades.has(chave)) cidades.set(chave, { codigo: c.ue, uf: c.uf, nome: titulo(c.municipio), slug: slug(c.municipio), prefeito: null, vereadores: [] });
    const cidade = cidades.get(chave);
    const completo = c.cargo === "PREFEITO";
    const pessoa = {
      id: c.sq,
      nome: titulo(c.nome),
      nomeCompleto: titulo(c.nomeCompleto),
      partido: c.partido,
      ocupacao: titulo(c.ocupacao),
      situacao: titulo(c.situacao),
      patrimonio: resumoBens(bens.get(c.sq), 2024, c.cargo, completo),
      campanha: resumoCampanha(receitas.get(c.sq), 2024, completo),
    };
    if (completo) cidade.prefeito = pessoa;
    else cidade.vereadores.push(pessoa);
  }

  const indice = [];
  for (const cidade of cidades.values()) {
    cidade.vereadores.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    salvarJson(`municipios/${cidade.uf}/${cidade.codigo}.json`, cidade);
    indice.push({ codigo: cidade.codigo, uf: cidade.uf, nome: cidade.nome, slug: cidade.slug, prefeito: cidade.prefeito?.nome ?? null, vereadores: cidade.vereadores.length });
  }
  indice.sort((a, b) => a.uf.localeCompare(b.uf) || a.nome.localeCompare(b.nome, "pt-BR"));
  salvarJson("municipios/indice.json", indice);
  console.log(`  ${indice.length} municípios.`);
}

async function main() {
  const so = process.argv[2];
  if (!so || so === "estaduais") await estaduais();
  if (!so || so === "municipais") await municipais();
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
