import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { carregarIndice } from "@/lib/dados";
import { carregarCidade, carregarIndiceEstaduais, type PessoaMunicipal } from "@/lib/locais";
import { UFS, formatarPercentual, formatarReais, formatarReaisCurto } from "@/lib/formato";
import Iniciais from "@/components/Iniciais";
import { BarrasValores, Secao } from "@/components/Ficha";

// São mais de 5 mil cidades: as páginas são geradas na primeira visita e guardadas por um dia.
export const revalidate = 86400;
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ uf: string; cidade: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { uf, cidade } = await params;
  const c = carregarCidade(uf, cidade);
  return c ? { title: `${c.nome} (${c.uf})`, description: `Prefeito, vereadores, deputados e senadores que representam ${c.nome}.` } : {};
}

const textoPatrimonio = (p: PessoaMunicipal) => (p.patrimonio.total > 0 ? formatarReais(p.patrimonio.total) : "não declarou bens");

export default async function PaginaCidade({ params }: Props) {
  const { uf, cidade } = await params;
  const c = carregarCidade(uf, cidade);
  if (!c) notFound();
  const nomeUf = UFS[c.uf] ?? c.uf;
  const deputadosFederais = carregarIndice("camara").filter((d) => d.uf === c.uf).length;
  const senadores = carregarIndice("senado").filter((s) => s.uf === c.uf).length;
  const estaduais = carregarIndiceEstaduais().filter((d) => d.uf === c.uf).length;
  const somaCampanhas = c.vereadores.reduce((s, v) => s + (v.campanha?.total ?? 0), 0);
  const somaPublico = c.vereadores.reduce((s, v) => s + (v.campanha?.publico ?? 0), 0);

  return (
    <article className="space-y-8">
      <Link href={`/cidades/${uf}`} className="text-ink-2 underline">← Cidades de {nomeUf}</Link>
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">{c.nome} ({c.uf})</h1>
        <p className="text-lg text-ink-2">Quem foi eleito para representar a cidade, segundo o TSE.</p>
      </header>

      <p className="rounded-xl border border-line bg-surface p-4 text-sm text-ink-2">
        Estes são os <strong>eleitos em 2024</strong>. Quem está no cargo hoje pode ser outra pessoa: vices e suplentes assumem quando o
        titular morre, renuncia, é cassado ou se afasta. Confira no site da prefeitura e da câmara municipal.
      </p>

      <Secao id="prefeito" titulo="Prefeitura" explicacao="O prefeito comanda a cidade: saúde básica, escolas municipais, transporte, limpeza, obras.">
        {c.prefeito ? <FichaPrefeito p={c.prefeito} /> : <p className="text-ink-2">O TSE ainda não tem um prefeito eleito registrado para esta cidade (eleição anulada ou em disputa na Justiça).</p>}
      </Secao>

      <Secao
        id="vereadores"
        titulo={`Câmara Municipal: ${c.vereadores.length} vereadores`}
        explicacao="Os vereadores criam as leis da cidade e fiscalizam o prefeito."
      >
        {somaCampanhas > 0 && (
          <p>
            Juntas, as campanhas dos vereadores eleitos custaram <strong>{formatarReais(somaCampanhas)}</strong>, sendo{" "}
            <strong>{formatarPercentual((somaPublico / somaCampanhas) * 100)}</strong> de dinheiro público.
          </p>
        )}
        <ul className="divide-y divide-line">
          {c.vereadores.map((v) => (
            <li key={v.id} className="flex items-start gap-3 py-3">
              <Iniciais nome={v.nome} tamanho="sm" />
              <div className="min-w-0 flex-1">
                <div className="font-bold">{v.nome} <span className="font-normal text-ink-2">· {v.partido}</span></div>
                <div className="text-sm text-ink-2">{v.nomeCompleto}{v.ocupacao && v.ocupacao !== "Outros" && ` · ${v.ocupacao}`}</div>
                <div className="text-sm">
                  Patrimônio: <strong>{textoPatrimonio(v)}</strong>
                  {v.campanha && (
                    <>
                      {" · "}Campanha: <strong>{formatarReaisCurto(v.campanha.total)}</strong> ({formatarPercentual(v.campanha.percentualPublico)} público)
                    </>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
        <p className="text-sm text-ink-2">
          As câmaras municipais não publicam presença, votos e projetos num formato único para o país todo, por isso essas informações
          ainda não aparecem aqui. Muitas publicam no próprio site e no Diário Oficial do município.
        </p>
      </Secao>

      <Secao id="estado" titulo={`Quem representa ${nomeUf}`} explicacao="Além da prefeitura e da câmara, a cidade é representada por:">
        <ul className="grid gap-3 sm:grid-cols-3">
          <LinkRepresentantes href={`/estaduais?uf=${c.uf}`} numero={estaduais} texto="deputados estaduais" />
          <LinkRepresentantes href={`/?uf=${c.uf}`} numero={deputadosFederais} texto="deputados federais" />
          <LinkRepresentantes href={`/senadores?uf=${c.uf}`} numero={senadores} texto="senadores" />
        </ul>
      </Secao>

      <aside className="rounded-xl border border-line bg-surface p-4 text-sm text-ink-2">
        Fonte: TSE (candidaturas, bens declarados e prestação de contas das eleições de 2024).{" "}
        <a href="https://divulgacandcontas.tse.jus.br" target="_blank" rel="noreferrer" className="underline">DivulgaCandContas</a> ·{" "}
        <a href="https://queridodiario.ok.org.br/" target="_blank" rel="noreferrer" className="underline">
          Pesquisar nos Diários Oficiais dos municípios (Querido Diário)
        </a>
      </aside>
    </article>
  );
}

function FichaPrefeito({ p }: { p: PessoaMunicipal }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Iniciais nome={p.nome} />
        <div>
          <div className="text-xl font-bold">{p.nome} <span className="font-normal text-ink-2">· {p.partido}</span></div>
          <div className="text-sm text-ink-2">{p.nomeCompleto}{p.ocupacao && ` · ${p.ocupacao}`}</div>
        </div>
      </div>
      <p>
        <strong>Patrimônio declarado em 2024:</strong> {textoPatrimonio(p)}
      </p>
      {p.patrimonio.porTipo && p.patrimonio.porTipo.length > 0 && <BarrasValores itens={p.patrimonio.porTipo.map((t) => ({ rotulo: t.tipo, valor: t.valor }))} />}
      {p.campanha ? (
        <>
          <p>
            <strong>Campanha de 2024:</strong> arrecadou {formatarReais(p.campanha.total)}, sendo{" "}
            <strong>{formatarPercentual(p.campanha.percentualPublico)}</strong> de dinheiro público (fundo eleitoral e partidário).
          </p>
          {p.campanha.porOrigem && <BarrasValores itens={p.campanha.porOrigem.map((o) => ({ rotulo: o.origem, valor: o.valor }))} />}
          {p.campanha.doadores && p.campanha.doadores.length > 0 && (
            <>
              <p className="text-sm font-bold">Maiores doadores e repasses</p>
              <ol className="divide-y divide-line">
                {p.campanha.doadores.map((d) => (
                  <li key={d.nome} className="flex justify-between gap-3 py-2 text-sm">
                    <span className="min-w-0 break-words">{d.nome}</span>
                    <span className="shrink-0 font-bold">{formatarReais(d.valor)}</span>
                  </li>
                ))}
              </ol>
            </>
          )}
        </>
      ) : (
        <p className="text-ink-2">Não encontramos a prestação de contas da campanha nos dados do TSE.</p>
      )}
    </div>
  );
}

function LinkRepresentantes({ href, numero, texto }: { href: string; numero: number; texto: string }) {
  return (
    <li>
      <Link href={href} className="block rounded-xl border border-line p-4 hover:border-accent">
        <span className="block text-2xl font-bold">{numero}</span>
        <span className="text-ink-2">{texto}</span>
      </Link>
    </li>
  );
}
