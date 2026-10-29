import fs from "node:fs";
import path from "node:path";
import indice from "@/data/indice.json";
import meta from "@/data/meta.json";

export type ResumoDeputado = {
  id: number;
  nome: string;
  partido: string;
  uf: string;
  foto: string;
  presenca: number | null;
  votacoes: number | null;
  gastos: number;
  proposicoes: number;
};

export type Votacao = {
  id: string;
  data: string;
  descricao: string;
  idProposicao: string | null;
  aprovada: boolean | null;
  voto: string;
};

export type Proposicao = {
  id: number;
  sigla: string;
  numero: number;
  ano: number;
  ementa: string;
  data: string;
  situacao: string;
  primeiroAutor: boolean;
};

export type Deputado = {
  id: number;
  nome: string;
  partido: string;
  uf: string;
  foto: string;
  email: string;
  primeiraAtividade: string | null;
  presenca: { sessoes: number; presentes: number; percentual: number | null };
  votacoes: { total: number; votou: number; percentual: number | null; recentes: Votacao[] };
  gastos: {
    total: number;
    documentos: number;
    porCategoria: { categoria: string; valor: number }[];
    porMes: number[];
    fornecedores: { nome: string; valor: number }[];
  };
  proposicoes: {
    principais: number;
    comoPrimeiroAutor: number;
    pedidosInformacao: number;
    requerimentos: number;
    outras: number;
    porTipo: Record<string, number>;
    lista: Proposicao[];
  };
};

export type Meta = typeof meta;

export function carregarIndice(): ResumoDeputado[] {
  return indice as ResumoDeputado[];
}

export function carregarMeta(): Meta {
  return meta;
}

// Lido só no build (páginas estáticas), então pode usar o sistema de arquivos.
export function carregarDeputado(id: string): Deputado | null {
  const arquivo = path.join(process.cwd(), "src", "data", "deputados", `${Number(id)}.json`);
  if (!fs.existsSync(arquivo)) return null;
  return JSON.parse(fs.readFileSync(arquivo, "utf-8"));
}
