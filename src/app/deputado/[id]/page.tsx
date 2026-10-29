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
  return carregarIndice("camara").map((d) => ({ id: String(d.id) }));
}

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const dep = carregarParlamentar("camara", (await params).id);
  return dep ? { title: `${dep.nome} (${dep.partido}-${dep.uf})` } : {};
}

export default async function PaginaDeputado({ params }: Props) {
  const dep = carregarParlamentar("camara", (await params).id);
  if (!dep) notFound();
  return (
    <Ficha
      casa="camara"
      p={dep}
      meta={carregarMeta("camara")}
      eleitoral={carregarDadosEleitorais("camara", dep.id)}
      resumos={carregarResumos()}
      noticias={carregarNoticias("camara", dep.id)}
      processos={carregarProcessos("camara", dep.id)}
    />
  );
}
