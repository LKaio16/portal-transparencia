import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { carregarEstadual, carregarIndiceEstaduais } from "@/lib/locais";
import { NOMES_TIPOS, UFS, formatarData } from "@/lib/formato";
import Iniciais from "@/components/Iniciais";
import { ItemProjeto, Secao, SecaoEleicoes, SecaoGastos } from "@/components/Ficha";

export const dynamicParams = false;

export function generateStaticParams() {
  return carregarIndiceEstaduais().map((d) => ({ id: d.id }));
}

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const d = carregarEstadual((await params).id);
  return d ? { title: `${d.nome} (${d.partido}-${d.uf})` } : {};
}

const TIPOS_ESTADUAIS: Record<string, string> = { ...NOMES_TIPOS, PLC: "Projeto de Lei Complementar", PRE: "Projeto de Resolução" };

export default async function PaginaEstadual({ params }: Props) {
  const d = carregarEstadual((await params).id);
  if (!d) notFound();
  const a = d.atividade;

  return (
    <article className="space-y-8">
      <Link href={`/estaduais?uf=${d.uf}`} className="text-ink-2 underline">← Deputados estaduais de {UFS[d.uf] ?? d.uf}</Link>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Iniciais nome={d.nome} tamanho="lg" />
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">{d.nome}</h1>
          <p className="text-lg text-ink-2">{d.cargo} · {d.partido} · {UFS[d.uf] ?? d.uf}</p>
          <p className="text-sm text-ink-2">Nome completo: {d.nomeCompleto}{d.ocupacao && ` · ${d.ocupacao}`}</p>
          {a && (
            <p className="flex flex-wrap gap-x-3 text-sm text-ink-2">
              <a href={a.paginaOficial} target="_blank" rel="noreferrer" className="underline">Página na {a.casa.sigla}</a>
              {a.email && <a href={`mailto:${a.email}`} className="underline">Enviar e-mail ao gabinete</a>}
            </p>
          )}
        </div>
      </header>

      <p className="rounded-xl border border-line bg-surface p-4 text-sm text-ink-2">
        Mostramos quem foi <strong>eleito</strong> em 2022, segundo o TSE. Se o titular se afastou (para ser secretário, por exemplo), quem
        está exercendo o mandato hoje pode ser um suplente.
      </p>

      {a ? (
        <>
          <Secao
            id="projetos"
            titulo="O que está propondo"
            explicacao={`Projetos apresentados na ${a.casa.sigla} em ${a.ano}, sozinho ou com outros deputados.`}
          >
            <p className="text-lg">
              Apresentou <strong>{a.proposicoes.principais}</strong> projetos ({a.proposicoes.comoPrimeiroAutor} como autor principal) e{" "}
              {a.proposicoes.requerimentos} requerimentos.
            </p>
            <ul className="flex flex-wrap gap-2 text-sm">
              {Object.entries(a.proposicoes.porTipo).map(([sigla, qtd]) => (
                <li key={sigla} className="rounded-full bg-track px-3 py-1">{TIPOS_ESTADUAIS[sigla] ?? sigla}: <strong>{qtd}</strong></li>
              ))}
            </ul>
            {a.proposicoes.lista.length > 0 && (
              <details open={a.proposicoes.lista.length <= 5}>
                <summary className="cursor-pointer font-bold underline">Ver os {a.proposicoes.lista.length} projetos</summary>
                <ul className="mt-3 divide-y divide-line">
                  {a.proposicoes.lista.map((item) => (
                    <ItemProjeto key={item.id} item={item} />
                  ))}
                </ul>
              </details>
            )}
          </Secao>
          <SecaoGastos
            gastos={a.gastos}
            meta={{ ano: a.ano, atualizadoEm: a.atualizadoEm }}
            paginaOficial={a.paginaOficial}
            explicacao={`A ${a.casa.nomeVerba} reembolsa despesas do mandato, como combustível, aluguel de escritório e divulgação.`}
          />
          {!a.casa.temPresenca && (
            <p className="text-sm text-ink-2">A {a.casa.sigla} não publica a presença dos deputados em dados abertos, por isso ela não aparece aqui.</p>
          )}
        </>
      ) : (
        <Secao id="atividade" titulo="Atividade na Assembleia" explicacao="Projetos, votos, presença e gastos.">
          <p className="text-ink-2">
            A Assembleia Legislativa de {UFS[d.uf] ?? d.uf} ainda não está no nosso site: os dados dela não são publicados num formato
            aberto que dê para ler automaticamente, ou ainda não fizemos a ligação. Enquanto isso, consulte o site da Assembleia.
          </p>
        </Secao>
      )}

      <SecaoEleicoes eleitoral={d} />

      <aside className="rounded-xl border border-line bg-surface p-4 text-sm text-ink-2">
        Dados do TSE (eleições de 2022 e 2026){a && <> e da {a.casa.nome}, atualizados em {formatarData(a.atualizadoEm)}</>}.{" "}
        <Link href="/como-funciona" className="underline">Veja como calculamos</Link>.
      </aside>
    </article>
  );
}
