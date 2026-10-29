// Coleta os dados abertos da Câmara dos Deputados e gera os JSON usados pelo site.
//
// Uso:
//   node scripts/coletar-camara.mjs              -> baixa os arquivos do ano atual e processa
//   node scripts/coletar-camara.mjs --sem-baixar -> reaproveita os arquivos já baixados em data/raw
//   ANO=2025 node scripts/coletar-camara.mjs     -> processa outro ano
//
// Fontes: https://dadosabertos.camara.leg.br (arquivos em lote + API v2)
//         https://www.camara.leg.br/cotas (Cota para o Exercício da Atividade Parlamentar)

import fs from "node:fs";
import path from "node:path";
import { unzipSync } from "fflate";
import { PASTA_RAW, PASTA_SAIDA, arredondar, buscarJson, dia, emParalelo, linhasCsv, ordenarSomas } from "./util.mjs";

const ANO = Number(process.env.ANO ?? new Date().getFullYear());
const SEM_BAIXAR = process.argv.includes("--sem-baixar");
const API = "https://dadosabertos.camara.leg.br/api/v2";
const LOTE = "https://dadosabertos.camara.leg.br/arquivos";

const ARQUIVOS = {
  presenca: `${LOTE}/eventosPresencaDeputados/csv/eventosPresencaDeputados-${ANO}.csv`,
  eventos: `${LOTE}/eventos/csv/eventos-${ANO}.csv`,
  votos: `${LOTE}/votacoesVotos/csv/votacoesVotos-${ANO}.csv`,
  votacoes: `${LOTE}/votacoes/csv/votacoes-${ANO}.csv`,
  autores: `${LOTE}/proposicoesAutores/csv/proposicoesAutores-${ANO}.csv`,
  proposicoes: `${LOTE}/proposicoes/csv/proposicoes-${ANO}.csv`,
  votacoesProposicoes: `${LOTE}/votacoesProposicoes/csv/votacoesProposicoes-${ANO}.csv`,
  votacoesObjetos: `${LOTE}/votacoesObjetos/csv/votacoesObjetos-${ANO}.csv`,
  cota: `https://www.camara.leg.br/cotas/Ano-${ANO}.csv.zip`,
};

// Tipos de proposição que viram lei ou mudam a Constituição (o "trabalho legislativo" principal).
const TIPOS_PRINCIPAIS = {
  PL: "Projeto de Lei",
  PLP: "Projeto de Lei Complementar",
  PEC: "Proposta de Emenda à Constituição",
  PDL: "Projeto de Decreto Legislativo",
  PRC: "Projeto de Resolução",
};

// Tipos que representam "o assunto" de uma votação no Plenário (inclui Medidas Provisórias).
const TIPOS_VOTADOS = new Set([...Object.keys(TIPOS_PRINCIPAIS), "MPV", "PLN", "PLV"]);

// ---------- utilidades ----------

async function baixar(nome, url) {
  const destino = path.join(PASTA_RAW, url.endsWith(".zip") ? `${nome}.zip` : `${nome}.csv`);
  if (SEM_BAIXAR && fs.existsSync(destino)) return destino;
  console.log(`Baixando ${nome}...`);
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Falha ao baixar ${url}: HTTP ${resp.status}`);
  fs.writeFileSync(destino, Buffer.from(await resp.arrayBuffer()));
  return destino;
}

function caminhoCsvCota(zipPath) {
  const csv = path.join(PASTA_RAW, `cota.csv`);
  if (SEM_BAIXAR && fs.existsSync(csv)) return csv;
  const arquivos = unzipSync(fs.readFileSync(zipPath));
  const nome = Object.keys(arquivos).find((n) => n.endsWith(".csv"));
  if (!nome) throw new Error("ZIP da cota não contém CSV");
  fs.writeFileSync(csv, arquivos[nome]);
  return csv;
}

const buscarApi = (caminho) => buscarJson(`${API}${caminho}`);

// ---------- coleta ----------

async function main() {
  fs.mkdirSync(PASTA_RAW, { recursive: true });
  fs.mkdirSync(path.join(PASTA_SAIDA, "deputados"), { recursive: true });

  const caminhos = {};
  for (const [nome, url] of Object.entries(ARQUIVOS)) caminhos[nome] = await baixar(nome, url);
  caminhos.cota = caminhoCsvCota(caminhos.cota);

  console.log("Buscando deputados em exercício...");
  const { dados: listaApi } = await buscarApi("/deputados?ordem=ASC&ordenarPor=nome&itens=1000");
  const deputados = new Map(
    listaApi.map((d) => [
      String(d.id),
      {
        id: d.id,
        nome: d.nome,
        partido: d.siglaPartido,
        uf: d.siglaUf,
        foto: d.urlFoto,
        email: d.email,
        primeiraAtividade: null,
        presenca: { sessoes: 0, presentes: 0, percentual: null },
        votacoes: { total: 0, votou: 0, percentual: null, recentes: [] },
        gastos: { total: 0, documentos: 0, porCategoria: {}, porMes: Array(12).fill(0), fornecedores: {} },
        proposicoes: { principais: 0, comoPrimeiroAutor: 0, pedidosInformacao: 0, requerimentos: 0, outras: 0, porTipo: {}, lista: [] },
      },
    ]),
  );
  const marcarAtividade = (dep, data) => {
    if (data && (!dep.primeiraAtividade || data < dep.primeiraAtividade)) dep.primeiraAtividade = data;
  };

  // --- Presença em sessões deliberativas do Plenário ---
  console.log("Processando presença...");
  const sessoes = new Map(); // idEvento -> data
  for await (const e of linhasCsv(caminhos.eventos)) {
    if (
      e.descricaoTipo === "Sessão Deliberativa" &&
      e["localCamara.nome"] === "Plenário da Câmara dos Deputados" &&
      e.situacao.startsWith("Encerrada")
    ) {
      sessoes.set(e.id, dia(e.dataHoraInicio));
    }
  }
  const presentesPorSessao = new Map(); // idEvento -> Set(idDeputado)
  for await (const p of linhasCsv(caminhos.presenca)) {
    if (!sessoes.has(p.idEvento)) continue;
    if (!presentesPorSessao.has(p.idEvento)) presentesPorSessao.set(p.idEvento, new Set());
    presentesPorSessao.get(p.idEvento).add(p.idDeputado);
    const dep = deputados.get(p.idDeputado);
    if (dep) marcarAtividade(dep, sessoes.get(p.idEvento));
  }
  // Só contam sessões que já têm a lista de presença publicada.
  const sessoesValidas = [...presentesPorSessao.keys()].map((id) => ({ id, data: sessoes.get(id) }));

  // --- Votações nominais do Plenário ---
  console.log("Processando votações...");
  const votacoes = new Map(); // id -> info
  for await (const v of linhasCsv(caminhos.votacoes)) {
    if (v.siglaOrgao !== "PLEN") continue;
    votacoes.set(v.id, {
      id: v.id,
      data: v.data,
      descricao: v.descricao,
      idProposicao: v.ultimaApresentacaoProposicao_idProposicao !== "0" ? v.ultimaApresentacaoProposicao_idProposicao : null,
      aprovada: v.aprovacao === "1" ? true : v.aprovacao === "0" ? false : null,
    });
  }
  const votosPorVotacao = new Map(); // idVotacao -> Map(idDeputado -> voto)
  for await (const v of linhasCsv(caminhos.votos)) {
    if (!votacoes.has(v.idVotacao)) continue;
    if (!votosPorVotacao.has(v.idVotacao)) votosPorVotacao.set(v.idVotacao, new Map());
    votosPorVotacao.get(v.idVotacao).set(v.deputado_id, v.voto || "Registrado");
    const dep = deputados.get(v.deputado_id);
    if (dep) marcarAtividade(dep, votacoes.get(v.idVotacao).data);
  }
  const votacoesNominais = [...votosPorVotacao.keys()]
    .map((id) => votacoes.get(id))
    .sort((a, b) => b.data.localeCompare(a.data) || b.id.localeCompare(a.id));

  // A descrição oficial da votação diz o procedimento ("Rejeitado o requerimento..."), não o assunto.
  // Descobrimos qual proposta principal estava em jogo para explicar do que se trata.
  console.log("Identificando o assunto das votações...");
  const nominais = new Set(votacoesNominais.map((v) => v.id));
  const principalPorVotacao = new Map(); // idVotacao -> {id, materia, ementa} | {materia} (só o título)
  const propostaPorTitulo = new Map(); // "PLP 186/2026" -> {id, materia, ementa}
  const registrarPrincipal = (idVotacao, proposta, prioridade) => {
    const atual = principalPorVotacao.get(idVotacao);
    if (!atual || atual.prioridade > prioridade) principalPorVotacao.set(idVotacao, { ...proposta, prioridade });
  };
  for (const [arquivo, prioridadeBase] of [[caminhos.votacoesProposicoes, 0], [caminhos.votacoesObjetos, 2]]) {
    for await (const r of linhasCsv(arquivo)) {
      if (!nominais.has(r.idVotacao)) continue;
      const materia = `${r.proposicao_siglaTipo} ${r.proposicao_numero}/${r.proposicao_ano}`;
      if (TIPOS_VOTADOS.has(r.proposicao_siglaTipo)) {
        const proposta = { id: r.proposicao_id, materia, ementa: r.proposicao_ementa.replace(/\s+/g, " ").trim() };
        propostaPorTitulo.set(materia, proposta);
        registrarPrincipal(r.idVotacao, proposta, prioridadeBase);
      } else {
        // Ex.: "RPD 1 => PLP 186/2026": requerimento sobre outra proposta.
        const alvo = r.proposicao_titulo?.split("=>")[1]?.trim();
        if (alvo) registrarPrincipal(r.idVotacao, { materia: alvo }, prioridadeBase + 1);
      }
    }
  }
  const semEmenta = [...new Set([...principalPorVotacao.values()].filter((p) => !p.id && !propostaPorTitulo.has(p.materia)).map((p) => p.materia))];
  await emParalelo(semEmenta, 6, async (materia) => {
    const [, sigla, numero, ano] = materia.match(/^(\S+) (\d+)\/(\d+)$/) ?? [];
    if (!sigla) return;
    try {
      const { dados } = await buscarApi(`/proposicoes?siglaTipo=${sigla}&numero=${numero}&ano=${ano}`);
      const p = dados[0];
      if (p) propostaPorTitulo.set(materia, { id: String(p.id), materia, ementa: p.ementa.replace(/\s+/g, " ").trim() });
    } catch (erro) {
      console.warn(`  não foi possível buscar ${materia}: ${erro.message}`);
    }
  });
  for (const v of votacoesNominais) {
    const achada = principalPorVotacao.get(v.id);
    const p = achada?.id ? achada : achada && propostaPorTitulo.get(achada.materia);
    v.materia = p?.materia ?? achada?.materia ?? null;
    v.ementa = p?.ementa ?? null;
    v.link = p?.id ? `https://www.camara.leg.br/propostas-legislativas/${p.id}` : null;
    v.chaveResumo = p?.id ? `cam:${p.id}` : null;
    delete v.idProposicao;
  }

  // --- Cota parlamentar (gastos) ---
  console.log("Processando gastos da cota parlamentar...");
  for await (const g of linhasCsv(caminhos.cota)) {
    const dep = deputados.get(g.ideCadastro);
    if (!dep) continue;
    const valor = Number(g.vlrLiquido.replace(",", ".")) || 0;
    const categoria = formatarCategoria(g.txtDescricao);
    const mes = Number(g.numMes) - 1;
    dep.gastos.total += valor;
    dep.gastos.documentos += 1;
    dep.gastos.porCategoria[categoria] = (dep.gastos.porCategoria[categoria] ?? 0) + valor;
    if (mes >= 0 && mes < 12) dep.gastos.porMes[mes] += valor;
    const fornecedor = g.txtFornecedor.trim() || "Não informado";
    dep.gastos.fornecedores[fornecedor] = (dep.gastos.fornecedores[fornecedor] ?? 0) + valor;
  }

  // --- Proposições de autoria ---
  console.log("Processando proposições...");
  const proposicoes = new Map();
  for await (const p of linhasCsv(caminhos.proposicoes)) {
    proposicoes.set(p.id, {
      id: Number(p.id),
      sigla: p.siglaTipo,
      numero: Number(p.numero),
      ano: Number(p.ano),
      ementa: p.ementa.replace(/\s+/g, " ").trim(),
      data: dia(p.dataApresentacao),
      situacao: p.ultimoStatus_descricaoSituacao || p.ultimoStatus_descricaoTramitacao || "",
    });
  }
  for await (const a of linhasCsv(caminhos.autores)) {
    const dep = deputados.get(a.idDeputadoAutor);
    const prop = proposicoes.get(a.idProposicao);
    if (!dep || !prop || a.proponente !== "1") continue;
    const ps = dep.proposicoes;
    if (TIPOS_PRINCIPAIS[prop.sigla]) {
      ps.principais += 1;
      ps.porTipo[prop.sigla] = (ps.porTipo[prop.sigla] ?? 0) + 1;
      const primeiroAutor = a.ordemAssinatura === "1";
      if (primeiroAutor) ps.comoPrimeiroAutor += 1;
      ps.lista.push({ ...prop, primeiroAutor });
    } else if (prop.sigla === "RIC") ps.pedidosInformacao += 1;
    else if (prop.sigla === "REQ") ps.requerimentos += 1;
    else ps.outras += 1;
  }

  // --- Consolidação por deputado ---
  console.log("Gerando arquivos...");
  const indice = [];
  for (const dep of deputados.values()) {
    const desde = dep.primeiraAtividade;
    // Conta só o período em que o deputado estava em exercício (a partir da primeira atividade no ano),
    // para não penalizar suplentes que assumiram no meio do ano.
    const sessoesDoPeriodo = desde ? sessoesValidas.filter((s) => s.data >= desde) : [];
    dep.presenca.sessoes = sessoesDoPeriodo.length;
    dep.presenca.presentes = sessoesDoPeriodo.filter((s) => presentesPorSessao.get(s.id).has(String(dep.id))).length;
    dep.presenca.percentual = dep.presenca.sessoes ? arredondar((dep.presenca.presentes / dep.presenca.sessoes) * 100, 1) : null;

    const votacoesDoPeriodo = desde ? votacoesNominais.filter((v) => v.data >= desde) : [];
    dep.votacoes.total = votacoesDoPeriodo.length;
    for (const v of votacoesDoPeriodo) {
      const voto = votosPorVotacao.get(v.id).get(String(dep.id));
      if (voto) dep.votacoes.votou += 1;
      if (dep.votacoes.recentes.length < 25) dep.votacoes.recentes.push({ ...v, voto: voto ?? "Não votou" });
    }
    dep.votacoes.percentual = dep.votacoes.total ? arredondar((dep.votacoes.votou / dep.votacoes.total) * 100, 1) : null;

    const g = dep.gastos;
    g.total = arredondar(g.total);
    g.porMes = g.porMes.map((v) => arredondar(v));
    g.porCategoria = ordenarSomas(g.porCategoria, "categoria");
    g.fornecedores = ordenarSomas(g.fornecedores, "nome", 8);

    dep.proposicoes.lista.sort((a, b) => b.data.localeCompare(a.data));

    fs.writeFileSync(path.join(PASTA_SAIDA, "deputados", `${dep.id}.json`), JSON.stringify(dep));
    indice.push({
      id: dep.id,
      nome: dep.nome,
      partido: dep.partido,
      uf: dep.uf,
      foto: dep.foto,
      presenca: dep.presenca.percentual,
      votacoes: dep.votacoes.percentual,
      gastos: g.total,
      proposicoes: dep.proposicoes.principais,
    });
  }

  const media = (campo) => {
    const valores = indice.map((d) => d[campo]).filter((v) => v !== null);
    return arredondar(valores.reduce((s, v) => s + v, 0) / valores.length, 1);
  };
  const meta = {
    ano: ANO,
    atualizadoEm: new Date().toISOString(),
    totalDeputados: indice.length,
    sessoesPlenario: sessoesValidas.length,
    votacoesNominais: votacoesNominais.length,
    medias: {
      presenca: media("presenca"),
      votacoes: media("votacoes"),
      gastos: media("gastos"),
      proposicoes: media("proposicoes"),
    },
  };
  fs.writeFileSync(path.join(PASTA_SAIDA, "indice.json"), JSON.stringify(indice));
  fs.writeFileSync(path.join(PASTA_SAIDA, "meta.json"), JSON.stringify(meta, null, 2));
  console.log(`Pronto: ${indice.length} deputados, ${meta.sessoesPlenario} sessões, ${meta.votacoesNominais} votações nominais.`);
}

// "COMBUSTÍVEIS E LUBRIFICANTES." -> "Combustíveis e lubrificantes"
function formatarCategoria(texto) {
  const t = texto.trim().replace(/[.\s]+$/, "").replace(/\s*,\s*/g, ", ").toLowerCase();
  return (t.charAt(0).toUpperCase() + t.slice(1)).replace("distrito federal", "Distrito Federal");
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
