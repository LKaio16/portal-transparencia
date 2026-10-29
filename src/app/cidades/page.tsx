import type { Metadata } from "next";
import Link from "next/link";
import { UFS } from "@/lib/formato";

export const metadata: Metadata = { title: "Minha cidade" };

export default function Cidades() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Quem representa a sua cidade?</h1>
        <p className="max-w-2xl text-lg text-ink-2">
          Escolha o estado e depois a cidade para ver o prefeito e os vereadores eleitos em 2024, além dos deputados e senadores do seu
          estado.
        </p>
      </header>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {Object.entries(UFS).map(([sigla, nome]) => (
          <li key={sigla}>
            <Link href={`/cidades/${sigla.toLowerCase()}`} className="block rounded-xl border border-line bg-surface px-4 py-3 font-bold hover:border-accent">
              {nome}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
