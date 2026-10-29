"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
  const params = useSearchParams();
  const [busca, setBusca] = useState(params.get("q") ?? "");
  const [uf, setUf] = useState(params.get("uf")?.toUpperCase() ?? "");
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

  // Mostra 24 por vez (12 no celular); volta ao início quando um filtro muda.
  const passo = () => (typeof window !== "undefined" && window.innerWidth < 768 ? 12 : 24);
  const [limite, setLimite] = useState(24);
  useEffect(() => setLimite(passo()), [busca, uf, partido, ordem]);

  const limpar = () => {
    setBusca("");
    setUf("");
    setPartido("");
  };

  const temFiltro = Boolean(busca || uf || partido);

  return (
    <section aria-labelledby="titulo-lista" className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="titulo-lista" className="text-2xl font-bold">Encontre seu {textos.singular}</h2>
          <p className="text-ink-2" aria-live="polite">
            {filtrados.length === 1 ? `1 ${textos.singular} encontrado` : `${filtrados.length} ${textos.plural} encontrados`}
          </p>
        </div>
        {temFiltro && (
          <button onClick={limpar} className="rounded-full border border-line bg-surface px-4 py-1.5 text-sm font-bold text-ink-2 hover:border-accent hover:text-accent">
            Limpar filtros ✕
          </button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Campo rotulo="Nome">
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Digite um nome"
            className="campo"
          />
        </Campo>
        <Campo rotulo="Estado">
          <select value={uf} onChange={(e) => setUf(e.target.value)} className="campo">
            <option value="">Todos os estados</option>
            {Object.entries(UFS).map(([sigla, nome]) => (
              <option key={sigla} value={sigla}>{nome}</option>
            ))}
          </select>
        </Campo>
        <Campo rotulo="Partido">
          <select value={partido} onChange={(e) => setPartido(e.target.value)} className="campo">
            <option value="">Todos os partidos</option>
            {partidos.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </Campo>
        <Campo rotulo="Ordenar por">
          <select value={ordem} onChange={(e) => setOrdem(e.target.value as Ordem)} className="campo">
            {Object.entries(ORDENS).map(([valor, nome]) => (
              <option key={valor} value={valor}>{nome}</option>
            ))}
          </select>
        </Campo>
      </div>

      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {filtrados.slice(0, limite).map((d) => (
          <li key={d.id}>
            <Link
              href={`${textos.rota}/${d.id}`}
              className="cartao cartao-link group flex h-full gap-4 p-5"
            >
              <Image
                src={d.foto}
                alt=""
                width={72}
                height={96}
                unoptimized
                className="h-24 w-[72px] shrink-0 rounded-xl bg-track object-cover"
              />
              <div className="min-w-0 flex-1 space-y-2">
                <div>
                  <div className="font-bold leading-tight group-hover:text-accent">{d.nome}</div>
                  <div className="text-sm text-ink-2">{d.partido} · {UFS[d.uf] ?? d.uf}</div>
                </div>
                <div className="text-sm">
                  <div className="flex items-baseline justify-between">
                    <span className="text-ink-2">Presença</span>
                    <span className="font-bold">{formatarPercentual(d.presenca)}</span>
                  </div>
                  <Medidor valor={d.presenca} media={medias.presenca} rotulo={`Presença de ${d.nome}`} />
                </div>
                <div className="flex flex-wrap gap-1.5 text-xs font-bold">
                  <span className="rounded-full bg-track px-2 py-0.5 text-ink-2">{d.proposicoes} projetos</span>
                  <span className="rounded-full bg-track px-2 py-0.5 text-ink-2">{formatarReaisCurto(d.gastos)} gastos</span>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {filtrados.length > limite && (
        <div className="flex justify-center pt-4">
          <button type="button" onClick={() => setLimite((l) => l + 24)} className="inline-flex min-h-12 items-center rounded-full border border-borda px-6 font-bold hover:bg-surface">
            Mostrar mais 24
          </button>
        </div>
      )}
      {filtrados.length === 0 && (
        <p className="cartao p-8 text-center text-ink-2">Nenhum resultado com esses filtros. Tente outro nome ou limpe os filtros.</p>
      )}
    </section>
  );
}

function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-bold text-ink-2">{rotulo}</span>
      {children}
    </label>
  );
}
