"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { ResumoEstadual } from "@/lib/locais";
import { UFS, formatarPercentual, formatarReaisCurto } from "@/lib/formato";
import Iniciais from "./Iniciais";

const normalizar = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default function ListaEstaduais({ deputados }: { deputados: ResumoEstadual[] }) {
  const params = useSearchParams();
  const [uf, setUf] = useState(params.get("uf")?.toUpperCase() ?? "");
  const [busca, setBusca] = useState("");
  const [partido, setPartido] = useState("");

  const partidos = useMemo(() => [...new Set(deputados.filter((d) => !uf || d.uf === uf).map((d) => d.partido))].sort(), [deputados, uf]);
  const filtrados = useMemo(() => {
    const termo = normalizar(busca.trim());
    return deputados.filter((d) => (!uf || d.uf === uf) && (!partido || d.partido === partido) && (!termo || normalizar(d.nome).includes(termo)));
  }, [deputados, uf, partido, busca]);
  // Sem filtro, a lista de 1.000+ nomes fica pesada no celular: mostramos as primeiras e pedimos um filtro.
  const LIMITE = 60;

  return (
    <section className="space-y-4">
      <div className="cartao grid gap-4 p-4 sm:grid-cols-3 sm:p-5">
        <label className="block space-y-1.5">
          <span className="text-sm font-bold text-ink-2">Estado</span>
          <select value={uf} onChange={(e) => { setUf(e.target.value); setPartido(""); }} className="campo">
            <option value="">Todos os estados</option>
            {Object.entries(UFS).map(([sigla, nome]) => (
              <option key={sigla} value={sigla}>{nome}</option>
            ))}
          </select>
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-bold text-ink-2">Nome</span>
          <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Digite um nome" className="campo" />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-bold text-ink-2">Partido</span>
          <select value={partido} onChange={(e) => setPartido(e.target.value)} className="campo">
            <option value="">Todos os partidos</option>
            {partidos.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </label>
      </div>

      <p className="text-ink-2" aria-live="polite">
        {filtrados.length} {filtrados.length === 1 ? "deputado encontrado" : "deputados encontrados"}
        {filtrados.length > LIMITE && ` · mostrando os ${LIMITE} primeiros, use os filtros para achar o seu`}
      </p>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtrados.slice(0, LIMITE).map((d) => (
          <li key={d.id}>
            <Link href={`/estadual/${d.id}`} className="group flex h-full gap-4 rounded-2xl border border-line bg-surface p-4 shadow-card transition hover:-translate-y-0.5 hover:border-accent hover:shadow-lg">
              <Iniciais nome={d.nome} />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="font-bold leading-tight group-hover:text-accent">{d.nome}</div>
                <div className="text-sm text-ink-2">{d.partido} · {UFS[d.uf] ?? d.uf}</div>
                <div className="text-sm text-ink-2">
                  Patrimônio: {d.patrimonio === null ? "—" : formatarReaisCurto(d.patrimonio)}
                  {d.percentualPublico !== null && <> · campanha {formatarPercentual(d.percentualPublico)} pública</>}
                </div>
                {d.temAtividade && <span className="inline-block rounded-full bg-accent-soft px-2 py-0.5 text-xs font-bold text-accent">projetos e gastos disponíveis</span>}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
