import type { Metadata } from "next";
import Link from "next/link";
import { UFS } from "@/lib/formato";

export const metadata: Metadata = { title: "Minha cidade" };

export default function Cidades() {
  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="rotulo">Minha cidade</p>
        <h1 className="text-3xl font-bold leading-tight sm:text-4xl">Quem representa a sua cidade?</h1>
        <p className="max-w-2xl text-lg text-ink-2">
          Escolha o estado e depois a cidade para ver o prefeito e os vereadores eleitos em 2024, além dos deputados e senadores do seu
          estado.
        </p>
      </header>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Object.entries(UFS).map(([sigla, nome]) => (
          <li key={sigla}>
            <Link
              href={`/cidades/${sigla.toLowerCase()}`}
              className="group flex items-center justify-between gap-2 rounded-2xl border border-line bg-surface px-4 py-4 font-bold shadow-card transition hover:-translate-y-0.5 hover:border-accent hover:text-accent"
            >
              <span>{nome}</span>
              <span aria-hidden className="text-muted transition group-hover:translate-x-0.5 group-hover:text-accent">→</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
