import type { Metadata } from "next";
import { Suspense } from "react";
import { carregarCasasEstaduais, carregarIndiceEstaduais } from "@/lib/locais";
import { UFS } from "@/lib/formato";
import ListaEstaduais from "@/components/ListaEstaduais";

export const metadata: Metadata = { title: "Deputados estaduais" };

export default function Estaduais() {
  const deputados = carregarIndiceEstaduais();
  const casas = carregarCasasEstaduais();
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Deputados estaduais</h1>
        <p className="max-w-2xl text-lg text-ink-2">
          Os {deputados.length.toLocaleString("pt-BR")} deputados estaduais e distritais eleitos em 2022: patrimônio declarado, quanto custou
          a campanha e se concorreram de novo em 2026.
        </p>
        <p className="max-w-2xl text-sm text-ink-2">
          Cada Assembleia Legislativa publica seus dados de um jeito, e muitas ainda não têm dados abertos. Por enquanto, projetos e gastos
          aparecem para:{" "}
          <strong>{casas.length ? casas.map((c) => `${c.sigla} (${UFS[c.uf]})`).join(", ") : "nenhuma Assembleia"}</strong>. Novos estados
          entram aos poucos.
        </p>
      </header>
      <Suspense>
        <ListaEstaduais deputados={deputados} />
      </Suspense>
    </div>
  );
}
