// Dados de deputados estaduais, prefeitos e vereadores (lidos do disco, só no servidor).

import fs from "node:fs";
import path from "node:path";
import type { DadosEleitorais, Parlamentar, Proposicao } from "./dados";

const PASTA = path.join(process.cwd(), "src", "data");
const lerJson = <T,>(relativo: string): T | null => {
  const arquivo = path.join(PASTA, relativo);
  return fs.existsSync(arquivo) ? (JSON.parse(fs.readFileSync(arquivo, "utf-8")) as T) : null;
};

export type CasaEstadual = {
  uf: string;
  nome: string;
  sigla: string;
  site: string;
  fonteDados: string;
  temPresenca: boolean;
  nomeVerba: string;
  ano: number;
  atualizadoEm: string;
};

export type ResumoEstadual = {
  id: string;
  nome: string;
  nomeCompleto: string;
  partido: string;
  uf: string;
  cargo: string;
  patrimonio: number | null;
  campanha: number | null;
  percentualPublico: number | null;
  temAtividade: boolean;
};

export type Estadual = DadosEleitorais & {
  id: string;
  nome: string;
  nomeCompleto: string;
  partido: string;
  uf: string;
  cargo: string;
  ocupacao: string;
  atividade:
    | (Pick<Parlamentar, "gastos"> & {
        idCasa: number;
        nome: string;
        partido: string;
        email: string;
        paginaOficial: string;
        proposicoes: { principais: number; comoPrimeiroAutor: number; requerimentos: number; outras: number; porTipo: Record<string, number>; lista: Proposicao[] };
        casa: CasaEstadual;
        ano: number;
        atualizadoEm: string;
      })
    | null;
};

export type PessoaMunicipal = {
  id: string;
  nome: string;
  nomeCompleto: string;
  partido: string;
  ocupacao: string;
  situacao: string;
  patrimonio: { ano: number; cargo: string; total: number; porTipo?: { tipo: string; valor: number }[] };
  campanha: {
    ano: number;
    total: number;
    publico: number;
    percentualPublico: number;
    porOrigem?: { origem: string; valor: number }[];
    doadores?: { nome: string; valor: number }[];
  } | null;
};

export type Cidade = { codigo: string; uf: string; nome: string; slug: string; prefeito: PessoaMunicipal | null; vereadores: PessoaMunicipal[] };
export type ResumoCidade = { codigo: string; uf: string; nome: string; slug: string; prefeito: string | null; vereadores: number };

type ArquivoAtividade = { casa: Omit<CasaEstadual, "ano" | "atualizadoEm">; ano: number; atualizadoEm: string; deputados: (NonNullable<Estadual["atividade"]> & { nomeCivil: string })[] };

// Mesmo critério dos scripts: sem acentos, maiúsculas, só letras.
const normalizarNome = (t: string) =>
  t.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z ]/g, " ").replace(/\s+/g, " ").trim();

let atividades: ArquivoAtividade[] | null = null;
function carregarAtividades() {
  if (atividades) return atividades;
  const pasta = path.join(PASTA, "estaduais");
  atividades = fs.existsSync(pasta)
    ? fs.readdirSync(pasta).filter((f) => f.startsWith("atividade-")).map((f) => JSON.parse(fs.readFileSync(path.join(pasta, f), "utf-8")))
    : [];
  return atividades!;
}

// A atividade vem das Assembleias e é ligada ao eleito pelo nome civil (o mesmo do TSE) e pelo estado.
function buscarAtividade(uf: string, nomeCompleto: string): Estadual["atividade"] {
  const a = carregarAtividades().find((x) => x.casa.uf === uf);
  const d = a?.deputados.find((x) => normalizarNome(x.nomeCivil) === normalizarNome(nomeCompleto));
  return a && d ? { ...d, casa: { ...a.casa, ano: a.ano, atualizadoEm: a.atualizadoEm }, ano: a.ano, atualizadoEm: a.atualizadoEm } : null;
}

export const carregarCasasEstaduais = (): CasaEstadual[] => carregarAtividades().map((a) => ({ ...a.casa, ano: a.ano, atualizadoEm: a.atualizadoEm }));

export const carregarIndiceEstaduais = (): ResumoEstadual[] =>
  (lerJson<Omit<ResumoEstadual, "temAtividade">[]>("estaduais/indice.json") ?? []).map((d) => ({ ...d, temAtividade: Boolean(buscarAtividade(d.uf, d.nomeCompleto)) }));

export function carregarEstadual(id: string): Estadual | null {
  const d = /^\d+$/.test(id) ? lerJson<Omit<Estadual, "atividade">>(`estaduais/${id}.json`) : null;
  return d ? { ...d, atividade: buscarAtividade(d.uf, d.nomeCompleto) } : null;
}

let indiceCidades: ResumoCidade[] | null = null;
export const carregarIndiceCidades = () => (indiceCidades ??= lerJson<ResumoCidade[]>("municipios/indice.json") ?? []);
export const cidadesDoEstado = (uf: string) => carregarIndiceCidades().filter((c) => c.uf === uf.toUpperCase());

export function carregarCidade(uf: string, slug: string): Cidade | null {
  const resumo = carregarIndiceCidades().find((c) => c.uf === uf.toUpperCase() && c.slug === slug);
  return resumo ? lerJson<Cidade>(`municipios/${resumo.uf}/${resumo.codigo}.json`) : null;
}
