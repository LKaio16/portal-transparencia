import type { Metadata } from "next";
import { Suspense } from "react";
import { carregarItensComparacao } from "@/lib/dados";
import Comparador from "@/components/Comparador";

export const metadata: Metadata = { title: "Comparar" };

export default function Comparar() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Comparar parlamentares</h1>
        <p className="text-lg text-ink-2">Escolha até 3 deputados ou senadores e veja os números lado a lado.</p>
      </header>
      <Suspense>
        <Comparador itens={carregarItensComparacao()} />
      </Suspense>
    </div>
  );
}
