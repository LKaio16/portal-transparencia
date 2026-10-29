"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { ItemComparacao } from "@/lib/dados";
import { CASAS, formatarPercentual, formatarReaisCurto } from "@/lib/formato";

const MAXIMO = 3;

const normalizar = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

type Linha = {
  rotulo: string;
  explicacao: string;
  valor: (i: ItemComparacao) => number | null;
  formatar: (v: number | null) => string;
};

const LINHAS: Linha[] = [
  { rotulo: "Presença", explicacao: "nas sessões/votações do Plenário em 2026", valor: (i) => i.presenca, formatar: formatarPercentual },
  { rotulo: "Votações", explicacao: "participação nas votações nominais", valor: (i) => i.votacoes, formatar: formatarPercentual },
  { rotulo: "Projetos", explicacao: "apresentados em 2026", valor: (i) => i.proposicoes, formatar: (v) => (v === null ? "—" : String(v)) },
  { rotulo: "Gastos da cota", explicacao: "em 2026", valor: (i) => i.gastos, formatar: (v) => (v === null ? "—" : formatarReaisCurto(v)) },
  { rotulo: "Patrimônio declarado", explicacao: "na última candidatura", valor: (i) => i.patrimonio, formatar: (v) => (v === null ? "—" : formatarReaisCurto(v)) },
  { rotulo: "Custo da campanha", explicacao: "que deu o mandato atual", valor: (i) => i.campanha, formatar: (v) => (v === null ? "—" : formatarReaisCurto(v)) },
  { rotulo: "Dinheiro público na campanha", explicacao: "fundo eleitoral e partidário", valor: (i) => i.percentualPublico, formatar: formatarPercentual },
];

export default function Comparador({ itens }: { itens: ItemComparacao[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const [busca, setBusca] = useState("");

  const porChave = useMemo(() => new Map(itens.map((i) => [i.chave, i])), [itens]);
  const selecionados = (params.get("p") ?? "")
    .split(",")
    .map((c) => porChave.get(c))
    .filter((i): i is ItemComparacao => Boolean(i))
    .slice(0, MAXIMO);

  const atualizar = (lista: ItemComparacao[]) => {
    const p = lista.map((i) => i.chave).join(",");
    router.replace(p ? `/comparar?p=${p}` : "/comparar", { scroll: false });
  };

  const sugestoes = useMemo(() => {
    const termo = normalizar(busca.trim());
    if (termo.length < 2) return [];
    return itens.filter((i) => normalizar(i.nome).includes(termo) && !selecionados.some((s) => s.chave === i.chave)).slice(0, 8);
  }, [busca, itens, selecionados]);

  return (
    <div className="space-y-6">
      {selecionados.length < MAXIMO && (
        <div className="relative max-w-md">
          <label className="block space-y-1">
            <span className="text-sm font-bold">Adicionar parlamentar</span>
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Digite um nome"
              className="campo"
            />
          </label>
          {sugestoes.length > 0 && (
            <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-line bg-surface shadow-lg">
              {sugestoes.map((s) => (
                <li key={s.chave}>
                  <button
                    className="w-full px-3 py-2 text-left hover:bg-track"
                    onClick={() => {
                      atualizar([...selecionados, s]);
                      setBusca("");
                    }}
                  >
                    <span className="font-bold">{s.nome}</span>{" "}
                    <span className="text-sm text-ink-2">
                      {CASAS[s.casa].cargo} · {s.partido}-{s.uf}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {selecionados.length === 0 ? (
        <p className="cartao border-dashed p-10 text-center text-ink-2">
          Digite o nome de um deputado ou senador acima para começar.
        </p>
      ) : (
        <div className="cartao overflow-x-auto p-3 sm:p-5">
          <table className="w-full table-fixed border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <th className="w-[26%] p-1 text-left align-bottom font-normal text-muted sm:p-2">
                  <span className="sr-only">Indicador</span>
                </th>
                {selecionados.map((s) => (
                  <th key={s.chave} className="p-1 align-bottom sm:p-2">
                    <div className="flex flex-col items-center gap-1 text-center">
                      <Image src={s.foto} alt="" width={56} height={75} unoptimized className="h-[75px] w-14 rounded-lg bg-track object-cover" />
                      <Link href={`${CASAS[s.casa].rota}/${s.id.toString()}`} className="break-words font-bold leading-tight underline [overflow-wrap:anywhere]">
                        {s.nome}
                      </Link>
                      <span className="text-xs font-normal text-ink-2 [overflow-wrap:anywhere]">
                        {s.casa === "camara" ? "Dep." : "Sen."} · {s.partido}-{s.uf}
                      </span>
                      <button
                        onClick={() => atualizar(selecionados.filter((x) => x.chave !== s.chave))}
                        className="text-xs font-normal text-ink-2 underline"
                        aria-label={`Remover ${s.nome} da comparação`}
                      >
                        remover
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {LINHAS.map((l) => {
                const valores = selecionados.map(l.valor);
                const maior = Math.max(...valores.map((v) => v ?? 0), 1);
                return (
                  <tr key={l.rotulo}>
                    <th scope="row" className="border-t border-line p-1 text-left align-top sm:p-2">
                      <span className="block text-xs font-bold sm:text-sm">{l.rotulo}</span>
                      <span className="hidden text-xs font-normal text-ink-2 sm:block">{l.explicacao}</span>
                    </th>
                    {valores.map((v, i) => (
                      <td key={selecionados[i].chave} className="border-t border-line p-1 text-center align-top sm:p-2">
                        <span className="block text-sm font-bold sm:text-base">{l.formatar(v)}</span>
                        <span className="mx-auto mt-1 block h-2 w-full max-w-24 rounded-full bg-track">
                          <span className="block h-full rounded-full bg-accent" style={{ width: `${((v ?? 0) / maior) * 100}%` }} />
                        </span>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-sm text-ink-2">
        Deputados e senadores têm regras diferentes (no Senado a presença é medida em cada votação), então compare com cuidado entre Casas.
      </p>
    </div>
  );
}
