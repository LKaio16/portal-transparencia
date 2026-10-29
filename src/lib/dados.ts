import fs from "node:fs";
import path from "node:path";
import indiceCamara from "@/data/indice.json";
import metaCamara from "@/data/meta.json";
import indiceSenado from "@/data/senado-indice.json";
import metaSenado from "@/data/senado-meta.json";
import tse from "@/data/tse.json";
import resumos from "@/data/resumos.json";
import noticias from "@/data/noticias.json";
import processos from "@/data/curadoria/processos.json";

export type Casa = "camara" | "senado";

export type ResumoParlamentar = {
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
  materia: string | null;
  ementa: string | null;
  link: string | null;
  chaveResumo: string | null;
  aprovada: boolean | null;
  secreta?: boolean;
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
  link?: string;
};

export type Parlamentar = {
  id: number;
  nome: string;
  partido: string;
  uf: string;
  foto: string;
  email: string;
  paginaOficial?: string;
  participacao?: string;
  mandato?: { inicio: string | null; fim: string | null };
  presenca: { sessoes: number; presentes: number; percentual: number | null };
  ausencias?: { justificadas: number; semJustificativa: number; semRegistro: number };
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

export type DadosEleitorais = {
  eleicao: { ano: number; cargo: string; partido: string; nomeUrna: string; situacao: string };
  patrimonio: { ano: number; cargo: string; total: number; porTipo: { tipo: string; valor: number }[] }[];
  campanha: {
    ano: number;
    total: number;
    publico: number;
    percentualPublico: number;
    porOrigem: { origem: string; valor: number }[];
    doadores: { nome: string; valor: number }[];
  } | null;
  candidatura2026: { cargo: string; partido: string; situacao: string | null } | null;
};

export type Meta = {
  ano: number;
  atualizadoEm: string;
  votacoesNominais: number;
  sessoesPlenario?: number;
  medias: { presenca: number; votacoes: number; gastos: number; proposicoes: number };
};

export type Noticia = { titulo: string; link: string; fonte: string; data: string; tipo: "oficial" | "imprensa" };

export type Processo = {
  parlamentar: string;
  tribunal: string;
  numero: string;
  tipo: string;
  situacao: string;
  assunto: string;
  fonteOficial: string;
  fontesImprensa?: { titulo: string; veiculo: string; link: string }[];
  verificadoEm: string;
  verificadoPor: string;
};

// Item usado na comparação: números principais de qualquer parlamentar.
export type ItemComparacao = ResumoParlamentar & {
  chave: string;
  casa: Casa;
  patrimonio: number | null;
  campanha: number | null;
  percentualPublico: number | null;
};

const prefixo = (casa: Casa) => (casa === "camara" ? "dep" : "sen");

export function carregarIndice(casa: Casa): ResumoParlamentar[] {
  return (casa === "camara" ? indiceCamara : indiceSenado) as ResumoParlamentar[];
}

export function carregarMeta(casa: Casa): Meta {
  return casa === "camara" ? metaCamara : metaSenado;
}

// Lido só no build (páginas estáticas), então pode usar o sistema de arquivos.
export function carregarParlamentar(casa: Casa, id: string): Parlamentar | null {
  const pasta = casa === "camara" ? "deputados" : "senadores";
  const arquivo = path.join(process.cwd(), "src", "data", pasta, `${Number(id)}.json`);
  if (!fs.existsSync(arquivo)) return null;
  return JSON.parse(fs.readFileSync(arquivo, "utf-8"));
}

export function carregarDadosEleitorais(casa: Casa, id: number): DadosEleitorais | null {
  return (tse as Record<string, DadosEleitorais>)[`${prefixo(casa)}:${id}`] ?? null;
}

export function carregarNoticias(casa: Casa, id: number): Noticia[] {
  return (noticias as Record<string, Noticia[]>)[`${prefixo(casa)}:${id}`] ?? [];
}

export function carregarProcessos(casa: Casa, id: number): Processo[] {
  return (processos as Processo[]).filter((p) => p.parlamentar === `${prefixo(casa)}:${id}`);
}

export function carregarResumos(): Record<string, string> {
  return resumos as Record<string, string>;
}

export function carregarItensComparacao(): ItemComparacao[] {
  return (["camara", "senado"] as Casa[]).flatMap((casa) =>
    carregarIndice(casa).map((p) => {
      const e = carregarDadosEleitorais(casa, p.id);
      return {
        ...p,
        chave: `${prefixo(casa)}-${p.id}`,
        casa,
        patrimonio: e?.patrimonio.at(-1)?.total ?? null,
        campanha: e?.campanha?.total ?? null,
        percentualPublico: e?.campanha?.percentualPublico ?? null,
      };
    }),
  );
}
