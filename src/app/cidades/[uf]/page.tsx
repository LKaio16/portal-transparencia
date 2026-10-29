import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cidadesDoEstado } from "@/lib/locais";
import { UFS } from "@/lib/formato";
import BuscaCidade from "@/components/BuscaCidade";

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(UFS).map((uf) => ({ uf: uf.toLowerCase() }));
}

type Props = { params: Promise<{ uf: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const uf = (await params).uf.toUpperCase();
  return { title: `Cidades de ${UFS[uf] ?? uf}` };
}

export default async function CidadesDoEstado({ params }: Props) {
  const uf = (await params).uf;
  const nomeUf = UFS[uf.toUpperCase()];
  if (!nomeUf) notFound();
  const cidades = cidadesDoEstado(uf).map(({ nome, slug, prefeito }) => ({ nome, slug, prefeito }));

  return (
    <div className="space-y-6">
      <Link href="/cidades" className="text-ink-2 underline">← Escolher outro estado</Link>
      <h1 className="text-3xl font-bold">Cidades de {nomeUf}</h1>
      {uf.toUpperCase() === "DF" ? (
        <p className="text-ink-2">
          O Distrito Federal não tem prefeito nem vereadores: quem cuida da cidade é o governo do DF e a Câmara Legislativa (deputados
          distritais). <Link href="/estaduais?uf=DF" className="underline">Ver os deputados distritais</Link>.
        </p>
      ) : (
        <BuscaCidade uf={uf} cidades={cidades} />
      )}
    </div>
  );
}
