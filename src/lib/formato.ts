// Formatação e constantes usadas tanto no servidor quanto no navegador.

export const UFS: Record<string, string> = {
  AC: "Acre", AL: "Alagoas", AP: "Amapá", AM: "Amazonas", BA: "Bahia", CE: "Ceará",
  DF: "Distrito Federal", ES: "Espírito Santo", GO: "Goiás", MA: "Maranhão", MT: "Mato Grosso",
  MS: "Mato Grosso do Sul", MG: "Minas Gerais", PA: "Pará", PB: "Paraíba", PR: "Paraná",
  PE: "Pernambuco", PI: "Piauí", RJ: "Rio de Janeiro", RN: "Rio Grande do Norte",
  RS: "Rio Grande do Sul", RO: "Rondônia", RR: "Roraima", SC: "Santa Catarina", SP: "São Paulo",
  SE: "Sergipe", TO: "Tocantins",
};

export const NOMES_TIPOS: Record<string, string> = {
  PL: "Projeto de Lei",
  PLP: "Projeto de Lei Complementar",
  PEC: "Proposta de Emenda à Constituição",
  PDL: "Projeto de Decreto Legislativo",
  PRC: "Projeto de Resolução",
};

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const moedaCompacta = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 });

export const formatarReais = (v: number) => moeda.format(v);
export const formatarReaisCurto = (v: number) => moedaCompacta.format(v);
export const formatarPercentual = (v: number | null) => (v === null ? "—" : `${v.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}%`);
export const formatarData = (iso: string) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "");

export const urlCamaraDeputado = (id: number) => `https://www.camara.leg.br/deputados/${id}`;
export const urlProposicao = (id: number | string) => `https://www.camara.leg.br/propostas-legislativas/${id}`;
