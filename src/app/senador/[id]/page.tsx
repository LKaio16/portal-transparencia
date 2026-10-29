import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  carregarDadosEleitorais,
  carregarIndice,
  carregarMeta,
  carregarNoticias,
  carregarParlamentar,
  carregarProcessos,
  carregarResumos,
} from "@/lib/dados";
import Ficha from "@/components/Ficha";

export const dynamicParams = false;

export function generateStaticParams() {
  return carregarIndice("senado").map((s) => ({ id: String(s.id) }));
}

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const sen = carregarParlamentar("senado", (await params).id);
  return sen ? { title: `${sen.nome} (${sen.partido}-${sen.uf})` } : {};
}

export default async function PaginaSenador({ params }: Props) {
  const sen = carregarParlamentar("senado", (await params).id);
  if (!sen) notFound();
  return (
    <Ficha
      casa="senado"
      p={sen}
      meta={carregarMeta("senado")}
      eleitoral={carregarDadosEleitorais("senado", sen.id)}
      resumos={carregarResumos()}
      noticias={carregarNoticias("senado", sen.id)}
      processos={carregarProcessos("senado", sen.id)}
    />
  );
}
