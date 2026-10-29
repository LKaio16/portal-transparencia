// Adaptador da Assembleia Legislativa de Minas Gerais (ALMG).
// API: https://dadosabertos.almg.gov.br (deputados, proposições e verba indenizatória).
// A ALMG não publica presença em plenário pela API, então essa parte fica de fora.
//
// Todo adaptador exporta `coletar(ano)` e devolve a mesma estrutura (ver scripts/coletar-assembleias.mjs).

import { buscarJson, dia, emParalelo } from "../util.mjs";

const API = "https://dadosabertos.almg.gov.br/api/v2";
const TIPOS_PRINCIPAIS = { PL: "Projeto de Lei", PLC: "Projeto de Lei Complementar", PEC: "Proposta de Emenda à Constituição", PRE: "Projeto de Resolução" };

export const casa = {
  uf: "MG",
  nome: "Assembleia Legislativa de Minas Gerais",
  sigla: "ALMG",
  site: "https://www.almg.gov.br",
  fonteDados: "https://dadosabertos.almg.gov.br",
  temPresenca: false,
  nomeVerba: "verba indenizatória",
};

const urlDeputado = (id) => `https://www.almg.gov.br/deputados/conheca_deputados/deputados-info.html?idDep=${id}`;
const urlProposicao = (sigla, numero, ano) => `https://www.almg.gov.br/projetos-de-lei/${sigla}/${numero}/${ano}`;

export async function coletar(ano) {
  const { list } = await buscarJson(`${API}/deputados/em_exercicio?formato=json`);
  const deputados = new Map();
  await emParalelo(list, 6, async (d) => {
    const { deputado } = await buscarJson(`${API}/deputados/${d.id}?formato=json`);
    deputados.set(String(d.id), {
      idCasa: d.id,
      nome: d.nome,
      nomeCivil: deputado.nomeServidor ?? d.nome,
      partido: d.partido,
      email: deputado.emails?.[0]?.endereco ? `${deputado.emails[0].endereco}@almg.gov.br` : "",
      paginaOficial: urlDeputado(d.id),
      proposicoes: { principais: 0, comoPrimeiroAutor: 0, requerimentos: 0, outras: 0, porTipo: {}, lista: [] },
      gastos: { total: 0, documentos: 0, porCategoria: {}, porMes: Array(12).fill(0), fornecedores: {} },
    });
  });

  // Proposições do ano: a busca devolve 100 por página; o campo "matricula" lista os autores (um por linha).
  console.log("  ALMG: proposições...");
  const primeira = await buscarJson(`${API}/proposicoes/pesquisa/direcionada?formato=json&ano=${ano}&tp=100&p=1`);
  const paginas = Math.ceil(primeira.resultado.noOcorrencias / 100);
  const itens = [...primeira.resultado.listaItem];
  const resto = await emParalelo(
    Array.from({ length: paginas - 1 }, (_, i) => i + 2),
    4,
    async (p) => (await buscarJson(`${API}/proposicoes/pesquisa/direcionada?formato=json&ano=${ano}&tp=100&p=${p}`)).resultado.listaItem,
  );
  itens.push(...resto.flat());
  for (const item of itens) {
    const autores = String(item.matricula ?? "").split(/\s+/).filter(Boolean);
    autores.forEach((matricula, ordem) => {
      const dep = deputados.get(matricula);
      if (!dep) return;
      const ps = dep.proposicoes;
      const sigla = item.siglaTipoProjeto;
      if (TIPOS_PRINCIPAIS[sigla]) {
        ps.principais += 1;
        ps.porTipo[sigla] = (ps.porTipo[sigla] ?? 0) + 1;
        if (ordem === 0) ps.comoPrimeiroAutor += 1;
        ps.lista.push({
          id: `${sigla}-${item.numero}-${item.ano}`,
          sigla,
          numero: Number(item.numero),
          ano: Number(item.ano),
          ementa: String(item.ementa ?? item.assunto ?? "").replace(/\s+/g, " ").trim(),
          data: dia(item.dataPublicacao),
          situacao: item.situacao ?? "",
          primeiroAutor: ordem === 0,
          link: urlProposicao(sigla, item.numero, item.ano),
        });
      } else if (/^RQ/.test(sigla)) ps.requerimentos += 1;
      else ps.outras += 1;
    });
  }

  // Verba indenizatória: uma consulta por deputado e mês.
  console.log("  ALMG: verba indenizatória...");
  const hoje = new Date();
  const ultimoMes = ano === hoje.getFullYear() ? hoje.getMonth() + 1 : 12;
  const pedidos = [...deputados.values()].flatMap((dep) => Array.from({ length: ultimoMes }, (_, i) => ({ dep, mes: i + 1 })));
  await emParalelo(pedidos, 2, async ({ dep, mes }) => {
    const { list: despesas = [] } = await buscarJson(`${API}/prestacao_contas/verbas_indenizatorias/deputados/${dep.idCasa}/${ano}/${mes}?formato=json`);
    for (const tipo of despesas) {
      for (const d of tipo.listaDetalheVerba ?? []) {
        const valor = Number(d.valorReembolsado) || 0;
        dep.gastos.total += valor;
        dep.gastos.documentos += 1;
        dep.gastos.porCategoria[tipo.descTipoDespesa] = (dep.gastos.porCategoria[tipo.descTipoDespesa] ?? 0) + valor;
        dep.gastos.porMes[mes - 1] += valor;
        const fornecedor = String(d.nomeEmitente ?? "").trim() || "Não informado";
        dep.gastos.fornecedores[fornecedor] = (dep.gastos.fornecedores[fornecedor] ?? 0) + valor;
      }
    }
  });

  return [...deputados.values()];
}
