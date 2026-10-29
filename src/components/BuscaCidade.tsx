"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type Item = { nome: string; slug: string; prefeito: string | null };

const normalizar = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default function BuscaCidade({ uf, cidades }: { uf: string; cidades: Item[] }) {
  const [busca, setBusca] = useState("");
  const filtradas = useMemo(() => {
    const termo = normalizar(busca.trim());
    return termo ? cidades.filter((c) => normalizar(c.nome).includes(termo)) : cidades;
  }, [busca, cidades]);

  return (
    <div className="space-y-4">
      <label className="block max-w-md space-y-1">
        <span className="text-sm font-bold">Nome da cidade</span>
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Digite para filtrar"
          autoFocus
          className="w-full rounded-lg border border-line bg-surface px-3 py-2"
        />
      </label>
      <p className="text-ink-2" aria-live="polite">{filtradas.length} cidades</p>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {filtradas.map((c) => (
          <li key={c.slug}>
            <Link href={`/cidades/${uf}/${c.slug}`} className="block rounded-xl border border-line bg-surface px-4 py-2 hover:border-accent">
              <span className="block font-bold">{c.nome}</span>
              {c.prefeito && <span className="text-sm text-ink-2">Prefeito(a) eleito(a): {c.prefeito}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
