// Coleta os dados abertos do Senado Federal e gera os JSON usados pelo site.
//
// Uso:
//   node scripts/coletar-senado.mjs          -> ano atual
//   ANO=2025 node scripts/coletar-senado.mjs -> outro ano
//
// Fontes: https://legis.senado.leg.br/dadosabertos (senadores, votações nominais, processos)
//         https://www.senado.leg.br/transparencia/LAI/verba (CEAPS: cota para exercício da atividade parlamentar)

import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import {
  PASTA_RAW,
  arredondar,
  buscarJson,
  dia,
  emParalelo,
  normalizarNome,
  numeroBr,
  ordenarSomas,
  salvarJson,
} from "./util.mjs";

const ANO = Number(process.env.ANO ?? new Date().getFullYear());
const API = "https://legis.senado.leg.br/dadosabertos";
const URL_CEAPS = `https://www.senado.leg.br/transparencia/LAI/verba/despesa_ceaps_${ANO}.csv`;

const TIPOS_PRINCIPAIS = new Set(["PL", "PLP", "PEC", "PDL", "PRS"]);

// Códigos de voto do Senado. Diferente da Câmara, o Senado informa o motivo da ausência.
const VOTOU = new Set(["Sim", "Não", "Abstenção", "Votou", "Presidente (art. 51 RISF)"]);
const PRESENTE_SEM_VOTAR = new Set(["P-NRV", "P-OD"]);
const NAO_COMPARECEU = "NCom";
const ehAusenciaJustificada = (sigla) => ["AP", "MIS", "REP"].includes(sigla) || /^L/.test(sigla);

const TEXTO_VOTO = {
  Votou: "Votou (voto secreto)",
  "Presidente (art. 51 RISF)": "Presidindo a sessão",
  "P-NRV": "Presente, sem registrar voto",
  "P-OD": "Presente (obstrução)",
  AP: "Ausente: atividade parlamentar",
  MIS: "Ausente: missão oficial",
  REP: "Ausente: representação do Senado",
  LS: "Ausente: licença de saúde",
  LP: "Ausente: licença particular",
  LAP: "Ausente: licença (atividade parlamentar)",
  LG: "Ausente: licença-gestante",
  NCom: "Não compareceu",
  NA: "Sem registro",
};

const capitalizar = (t) => {
  const s = String(t ?? "").trim().toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
};
const https = (url) => String(url ?? "").replace(/^http:/, "https:");
const urlMateria = (codigo) => `https://www25.senado.leg.br/web/atividade/materias/-/materia/${codigo}`;

async function main() {
  console.log("Buscando senadores em exercício...");
  const lista = (await buscarJson(`${API}/senador/lista/atual.json`)).ListaParlamentarEmExercicio.Parlamentares.Parlamentar;
  const senadores = new Map(
    lista.map(({ IdentificacaoParlamentar: id, Mandato: m }) => {
      const inicio = m.PrimeiraLegislaturaDoMandato?.DataInicio ?? null;
      return [
        Number(id.CodigoParlamentar),
        {
          id: Number(id.CodigoParlamentar),
          nome: id.NomeParlamentar,
          nomeCompleto: id.NomeCompletoParlamentar,
          partido: id.SiglaPartidoParlamentar,
          uf: id.UfParlamentar,
          foto: https(id.UrlFotoParlamentar),
          email: id.EmailParlamentar ?? "",
          paginaOficial: https(id.UrlPaginaParlamentar),
          participacao: m.DescricaoParticipacao ?? "Titular",
          mandato: { inicio, fim: m.SegundaLegislaturaDoMandato?.DataFim ?? m.PrimeiraLegislaturaDoMandato?.DataFim ?? null },
          anoEleicao: inicio ? Number(inicio.slice(0, 4)) - 1 : null,
          presenca: { sessoes: 0, presentes: 0, percentual: null },
          ausencias: { justificadas: 0, semJustificativa: 0, semRegistro: 0 },
          votacoes: { total: 0, votou: 0, percentual: null, recentes: [] },
          gastos: { total: 0, documentos: 0, porCategoria: {}, porMes: Array(12).fill(0), fornecedores: {} },
          proposicoes: { principais: 0, comoPrimeiroAutor: 0, pedidosInformacao: 0, requerimentos: 0, outras: 0, porTipo: {}, lista: [] },
        },
      ];
    }),
  );

  // --- Votações nominais do Plenário ---
  console.log("Processando votações...");
  const hoje = new Date().toISOString().slice(0, 10);
  const votacoes = (await buscarJson(`${API}/votacao?dataInicio=${ANO}-01-01&dataFim=${ANO}-12-31`))
    .filter((v) => v.dataSessao <= hoje)
    .sort((a, b) => b.dataSessao.localeCompare(a.dataSessao) || b.sequencialVotacao - a.sequencialVotacao);
  for (const v of votacoes) {
    const base = {
      id: String(v.codigoSessaoVotacao),
      data: v.dataSessao,
      descricao: v.descricaoVotacao,
      materia: v.identificacao ?? null,
      ementa: v.ementa?.replace(/\s+/g, " ").trim() ?? null,
      link: v.codigoMateria ? urlMateria(v.codigoMateria) : null,
      chaveResumo: v.codigoMateria ? `sen:${v.codigoMateria}` : null,
      aprovada: v.resultadoVotacao === "A" ? true : v.resultadoVotacao === "R" ? false : null,
      secreta: v.votacaoSecreta === "S",
    };
    // Só aparece na lista quem estava em exercício no dia, então suplentes não são penalizados.
    for (const voto of v.votos ?? []) {
      const sen = senadores.get(voto.codigoParlamentar);
      if (!sen) continue;
      const sigla = voto.siglaVotoParlamentar ?? "NA";
      sen.votacoes.total += 1;
      if (VOTOU.has(sigla)) sen.votacoes.votou += 1;
      if (VOTOU.has(sigla) || PRESENTE_SEM_VOTAR.has(sigla)) sen.presenca.presentes += 1;
      else if (sigla === NAO_COMPARECEU) sen.ausencias.semJustificativa += 1;
      else if (ehAusenciaJustificada(sigla)) sen.ausencias.justificadas += 1;
      else sen.ausencias.semRegistro += 1;
      if (sen.votacoes.recentes.length < 25) sen.votacoes.recentes.push({ ...base, voto: TEXTO_VOTO[sigla] ?? sigla });
    }
  }

  // --- Proposições de autoria ---
  console.log("Buscando proposições de cada senador...");
  await emParalelo([...senadores.values()], 6, async (sen) => {
    const processos = await buscarJson(`${API}/processo?codigoParlamentarAutor=${sen.id}&dataInicioApresentacao=${ANO}-01-01`);
    const ps = sen.proposicoes;
    const nomeNormalizado = normalizarNome(sen.nome);
    for (const p of processos) {
      const [sigla, numeroAno = ""] = String(p.identificacao ?? "").split(" ");
      const [numero, ano] = numeroAno.split("/").map(Number);
      if (TIPOS_PRINCIPAIS.has(sigla)) {
        // A autoria vem como texto: "Senador Fulano (PP/SE), Senadora Beltrana (...)". O primeiro é o autor principal.
        const primeiroAutor = normalizarNome(String(p.autoria ?? "").split(",")[0]).includes(nomeNormalizado);
        ps.principais += 1;
        ps.porTipo[sigla] = (ps.porTipo[sigla] ?? 0) + 1;
        if (primeiroAutor) ps.comoPrimeiroAutor += 1;
        ps.lista.push({
          id: p.codigoMateria,
          sigla,
          numero,
          ano,
          ementa: String(p.ementa ?? "").replace(/\s+/g, " ").trim(),
          data: dia(p.dataApresentacao),
          situacao: capitalizar(p.situacaoAtual),
          primeiroAutor,
          link: urlMateria(p.codigoMateria),
        });
      } else if (sigla === "RQS") ps.requerimentos += 1;
      else ps.outras += 1;
    }
    ps.lista.sort((a, b) => b.data.localeCompare(a.data));
  });

  // --- CEAPS (gastos) ---
  console.log("Baixando e processando gastos (CEAPS)...");
  const arquivoCeaps = path.join(PASTA_RAW, `ceaps-${ANO}.csv`);
  fs.mkdirSync(PASTA_RAW, { recursive: true });
  const resp = await fetch(URL_CEAPS);
  if (!resp.ok) throw new Error(`Falha ao baixar ${URL_CEAPS}: HTTP ${resp.status}`);
  fs.writeFileSync(arquivoCeaps, Buffer.from(await resp.arrayBuffer()));
  // A planilha usa o nome em maiúsculas, sem o código. Às vezes é o nome parlamentar ("JORGE SEIF"),
  // às vezes um pedaço do nome completo ("WEVERTON ROCHA").
  const porNome = new Map([...senadores.values()].map((s) => [normalizarNome(s.nome), s]));
  const acharSenador = (nome) => {
    const n = normalizarNome(nome);
    if (porNome.has(n)) return porNome.get(n);
    const partes = n.split(" ");
    return [...senadores.values()].find((s) => partes.every((p) => normalizarNome(s.nomeCompleto).split(" ").includes(p)));
  };
  const naoEncontrados = new Set();
  const linhasCeaps = parse(lerTextoMisto(arquivoCeaps), { delimiter: ";", columns: true, bom: true, relax_quotes: true, relax_column_count: true, from_line: 2 });
  for (const g of linhasCeaps) {
    const sen = acharSenador(g.SENADOR);
    if (!sen) {
      naoEncontrados.add(g.SENADOR);
      continue;
    }
    const valor = numeroBr(g.VALOR_REEMBOLSADO);
    const categoria = resumirCategoria(g.TIPO_DESPESA);
    const mes = Number(g.MES) - 1;
    sen.gastos.total += valor;
    sen.gastos.documentos += 1;
    sen.gastos.porCategoria[categoria] = (sen.gastos.porCategoria[categoria] ?? 0) + valor;
    if (mes >= 0 && mes < 12) sen.gastos.porMes[mes] += valor;
    const fornecedor = g.FORNECEDOR?.trim() || "Não informado";
    sen.gastos.fornecedores[fornecedor] = (sen.gastos.fornecedores[fornecedor] ?? 0) + valor;
  }
  if (naoEncontrados.size) console.log(`  gastos de quem não está mais em exercício (ignorados): ${[...naoEncontrados].join(", ")}`);

  // --- Consolidação ---
  console.log("Gerando arquivos...");
  const indice = [];
  for (const sen of senadores.values()) {
    sen.presenca.sessoes = sen.votacoes.total;
    sen.presenca.percentual = sen.votacoes.total ? arredondar((sen.presenca.presentes / sen.votacoes.total) * 100, 1) : null;
    sen.votacoes.percentual = sen.votacoes.total ? arredondar((sen.votacoes.votou / sen.votacoes.total) * 100, 1) : null;
    const g = sen.gastos;
    g.total = arredondar(g.total);
    g.porMes = g.porMes.map((v) => arredondar(v));
    g.porCategoria = ordenarSomas(g.porCategoria, "categoria");
    g.fornecedores = ordenarSomas(g.fornecedores, "nome", 8);

    salvarJson(`senadores/${sen.id}.json`, sen);
    indice.push({
      id: sen.id,
      nome: sen.nome,
      partido: sen.partido,
      uf: sen.uf,
      foto: sen.foto,
      presenca: sen.presenca.percentual,
      votacoes: sen.votacoes.percentual,
      gastos: g.total,
      proposicoes: sen.proposicoes.principais,
    });
  }
  indice.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  const media = (campo) => {
    const valores = indice.map((d) => d[campo]).filter((v) => v !== null);
    return arredondar(valores.reduce((s, v) => s + v, 0) / valores.length, 1);
  };
  const meta = {
    ano: ANO,
    atualizadoEm: new Date().toISOString(),
    totalSenadores: indice.length,
    votacoesNominais: votacoes.length,
    medias: { presenca: media("presenca"), votacoes: media("votacoes"), gastos: media("gastos"), proposicoes: media("proposicoes") },
  };
  salvarJson("senado-indice.json", indice);
  salvarJson("senado-meta.json", meta, true);
  console.log(`Pronto: ${indice.length} senadores, ${votacoes.length} votações nominais.`);
}

// Os nomes oficiais das categorias são longos; usamos versões curtas pelo começo do texto.
const CATEGORIAS = [
  ["Locomoção", "Locomoção, hospedagem, alimentação e combustíveis"],
  ["Passagens", "Passagens aéreas, aquáticas e terrestres"],
  ["Aluguel", "Aluguel e despesas do escritório político"],
  ["Contratação de consultorias", "Consultorias, assessorias e pesquisas"],
  ["Aquisição de material", "Material e serviços para o escritório"],
  ["Divulgação", "Divulgação da atividade parlamentar"],
  ["Serviços de Segurança", "Segurança privada"],
];
function resumirCategoria(texto) {
  const t = String(texto ?? "").trim();
  if (!t) return "Não informado";
  return CATEGORIAS.find(([inicio]) => t.startsWith(inicio))?.[1] ?? capitalizar(t.split(",")[0]);
}

// A planilha da CEAPS mistura linhas em UTF-8 e em latin1; decodifica cada linha no formato certo.
function lerTextoMisto(arquivo) {
  const utf8 = new TextDecoder("utf-8", { fatal: true });
  const latin1 = new TextDecoder("latin1");
  const bytes = fs.readFileSync(arquivo);
  const linhas = [];
  let inicio = 0;
  for (let i = 0; i <= bytes.length; i++) {
    if (i === bytes.length || bytes[i] === 0x0a) {
      const pedaco = bytes.subarray(inicio, i);
      try {
        linhas.push(utf8.decode(pedaco));
      } catch {
        linhas.push(latin1.decode(pedaco));
      }
      inicio = i + 1;
    }
  }
  return linhas.join("\n");
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
