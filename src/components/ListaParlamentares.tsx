"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Casa, ResumoParlamentar } from "@/lib/dados";
import { CASAS, UFS, formatarPercentual, formatarReaisCurto } from "@/lib/formato";
import Medidor from "./Medidor";

type Ordem = "nome" | "presenca" | "votacoes" | "proposicoes" | "gastos";

const ORDENS: Record<Ordem, string> = {
  nome: "Nome (A–Z)",
  presenca: "Menor presença primeiro",
  votacoes: "Menor participação em votações",
  proposicoes: "Mais projetos apresentados",
  gastos: "Maiores gastos",
};

// Tira acentos para a busca achar "joao" em "João".
const normalizar = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default function ListaParlamentares({
  casa,
  parlamentares,
  medias,
}: {
  casa: Casa;
  parlamentares: ResumoParlamentar[];
  medias: { presenca: number };
}) {
  const textos = CASAS[casa];
  const [busca, setBusca] = useState("");
  const [uf, setUf] = useState("");
  const [partido, setPartido] = useState("");
  const [ordem, setOrdem] = useState<Ordem>("nome");

  const partidos = useMemo(() => [...new Set(parlamentares.map((d) => d.partido))].sort(), [parlamentares]);

  const filtrados = useMemo(() => {
    const termo = normalizar(busca.trim());
    const lista = parlamentares.filter(
      (d) => (!termo || normalizar(d.nome).includes(termo)) && (!uf || d.uf === uf) && (!partido || d.partido === partido),
    );
    const valor = (d: ResumoParlamentar) => d[ordem as Exclude<Ordem, "nome">] ?? 0;
    return lista.sort((a, b) => {
      if (ordem === "nome") return a.nome.localeCompare(b.nome, "pt-BR");
      if (ordem === "presenca" || ordem === "votacoes") return valor(a) - valor(b);
      return valor(b) - valor(a);
    });
  }, [parlamentares, busca, uf, partido, ordem]);

  const limpar = () => {
    setBusca("");
    setUf("");
    setPartido("");
  };

  return (
    <section aria-labelledby="titulo-lista" className="space-y-4">
      <h2 id="titulo-lista" className="text-2xl font-bold">Encontre seu {textos.singular}</h2>

      <div className="grid gap-3 rounded-xl border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Campo rotulo="Nome">
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Digite um nome"
            className="w-full rounded-lg border border-line bg-bg px-3 py-2"
          />
        </Campo>
        <Campo rotulo="Estado">
          <select value={uf} onChange={(e) => setUf(e.target.value)} className="w-full rounded-lg border border-line bg-bg px-3 py-2">
            <option value="">Todos os estados</option>
            {Object.entries(UFS).map(([sigla, nome]) => (
              <option key={sigla} value={sigla}>{nome}</option>
            ))}
          </select>
        </Campo>
        <Campo rotulo="Partido">
          <select value={partido} onChange={(e) => setPartido(e.target.value)} className="w-full rounded-lg border border-line bg-bg px-3 py-2">
            <option value="">Todos os partidos</option>
            {partidos.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </Campo>
        <Campo rotulo="Ordenar por">
          <select value={ordem} onChange={(e) => setOrdem(e.target.value as Ordem)} className="w-full rounded-lg border border-line bg-bg px-3 py-2">
            {Object.entries(ORDENS).map(([valor, nome]) => (
              <option key={valor} value={valor}>{nome}</option>
            ))}
          </select>
        </Campo>
      </div>

      <p className="text-ink-2" aria-live="polite">
        {filtrados.length === 1 ? `1 ${textos.singular} encontrado` : `${filtrados.length} ${textos.plural} encontrados`}
        {(busca || uf || partido) && (
          <>
            {" · "}
            <button onClick={limpar} className="underline">limpar filtros</button>
          </>
        )}
      </p>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtrados.map((d) => (
          <li key={d.id}>
            <Link
              href={`${textos.rota}/${d.id}`}
              className="flex h-full gap-3 rounded-xl border border-line bg-surface p-3 transition hover:border-accent"
            >
              <Image
                src={d.foto}
                alt=""
                width={64}
                height={86}
                unoptimized
                className="h-[86px] w-16 shrink-0 rounded-lg bg-track object-cover"
              />
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="font-bold leading-tight">{d.nome}</div>
                <div className="text-sm text-ink-2">{d.partido} · {UFS[d.uf] ?? d.uf}</div>
                <div className="text-sm">
                  <div className="flex justify-between">
                    <span>Presença</span>
                    <span className="font-bold">{formatarPercentual(d.presenca)}</span>
                  </div>
                  <Medidor valor={d.presenca} media={medias.presenca} rotulo={`Presença de ${d.nome}`} />
                </div>
                <div className="flex justify-between gap-2 text-sm text-ink-2">
                  <span>{d.proposicoes} projetos</span>
                  <span>{formatarReaisCurto(d.gastos)} gastos</span>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-bold">{rotulo}</span>
      {children}
    </label>
  );
}
