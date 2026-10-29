import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { carregarDeputado, carregarIndice, carregarMeta, type Deputado, type Votacao } from "@/lib/dados";
import {
  NOMES_TIPOS,
  UFS,
  formatarData,
  formatarPercentual,
  formatarReais,
  formatarReaisCurto,
  urlCamaraDeputado,
  urlProposicao,
} from "@/lib/formato";
import Medidor from "@/components/Medidor";

export const dynamicParams = false;

export function generateStaticParams() {
  return carregarIndice().map((d) => ({ id: String(d.id) }));
}

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const dep = carregarDeputado((await params).id);
  return dep ? { title: `${dep.nome} (${dep.partido}-${dep.uf})` } : {};
}

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export default async function PaginaDeputado({ params }: Props) {
  const dep = carregarDeputado((await params).id);
  if (!dep) notFound();
  const meta = carregarMeta();

  return (
    <article className="space-y-8">
      <Link href="/" className="text-ink-2 underline">← Todos os deputados</Link>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Image
          src={dep.foto}
          alt={`Foto de ${dep.nome}`}
          width={120}
          height={160}
          unoptimized
          priority
          className="h-40 w-[120px] rounded-xl bg-track object-cover"
        />
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">{dep.nome}</h1>
          <p className="text-lg text-ink-2">
            Deputado(a) federal · {dep.partido} · {UFS[dep.uf] ?? dep.uf}
          </p>
          <p className="text-sm text-ink-2">
            <a href={urlCamaraDeputado(dep.id)} target="_blank" rel="noreferrer" className="underline">Página oficial na Câmara</a>
            {dep.email && (
              <>
                {" · "}
                <a href={`mailto:${dep.email}`} className="underline">Enviar e-mail ao gabinete</a>
              </>
            )}
          </p>
        </div>
      </header>

      <Resumo dep={dep} meta={meta} />
      <SecaoPresenca dep={dep} media={meta.medias.presenca} />
      <SecaoVotacoes dep={dep} media={meta.medias.votacoes} />
      <SecaoProjetos dep={dep} media={meta.medias.proposicoes} />
      <SecaoGastos dep={dep} media={meta.medias.gastos} meta={meta} />

      <aside className="rounded-xl border border-line bg-surface p-4 text-sm text-ink-2">
        Dados de {meta.ano} até {formatarData(meta.atualizadoEm)}, das bases oficiais da Câmara dos Deputados. Faltas
        podem ter justificativa (licença médica, missão oficial etc.) que não aparece nesses dados.{" "}
        <Link href="/como-funciona" className="underline">Veja como calculamos</Link>.
      </aside>
    </article>
  );
}

function Resumo({ dep, meta }: { dep: Deputado; meta: ReturnType<typeof carregarMeta> }) {
  const comparar = (valor: number | null, media: number) =>
    valor === null ? "" : valor >= media ? "acima da média" : "abaixo da média";
  return (
    <section aria-labelledby="titulo-resumo" className="rounded-2xl bg-accent-soft p-5">
      <h2 id="titulo-resumo" className="mb-3 text-xl font-bold">Resumo de {meta.ano}, em poucas palavras</h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        <ItemResumo icone="🏛️" titulo={formatarPercentual(dep.presenca.percentual)} texto={`de presença nas sessões do Plenário (${comparar(dep.presenca.percentual, meta.medias.presenca)})`} />
        <ItemResumo icone="🗳️" titulo={formatarPercentual(dep.votacoes.percentual)} texto={`das votações em que poderia votar (${comparar(dep.votacoes.percentual, meta.medias.votacoes)})`} />
        <ItemResumo icone="📄" titulo={String(dep.proposicoes.principais)} texto={`projetos de lei e propostas apresentados (média: ${Math.round(meta.medias.proposicoes)})`} />
        <ItemResumo icone="💰" titulo={formatarReaisCurto(dep.gastos.total)} texto={`gastos da cota parlamentar (média: ${formatarReaisCurto(meta.medias.gastos)})`} />
      </ul>
    </section>
  );
}

function ItemResumo({ icone, titulo, texto }: { icone: string; titulo: string; texto: string }) {
  return (
    <li className="flex items-start gap-3 rounded-xl bg-surface p-3">
      <span aria-hidden className="text-2xl">{icone}</span>
      <span>
        <strong className="block text-2xl">{titulo}</strong>
        <span className="text-ink-2">{texto}</span>
      </span>
    </li>
  );
}

function Secao({ id, titulo, explicacao, children }: { id: string; titulo: string; explicacao: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="space-y-4 rounded-2xl border border-line bg-surface p-5">
      <div>
        <h2 id={id} className="text-2xl font-bold">{titulo}</h2>
        <p className="text-ink-2">{explicacao}</p>
      </div>
      {children}
    </section>
  );
}

function SecaoPresenca({ dep, media }: { dep: Deputado; media: number }) {
  const { sessoes, presentes, percentual } = dep.presenca;
  return (
    <Secao id="presenca" titulo="Presença" explicacao="As sessões deliberativas são as reuniões do Plenário em que se vota. Ir a elas é uma das obrigações básicas do mandato.">
      <p className="text-lg">
        Compareceu a <strong>{presentes}</strong> de <strong>{sessoes}</strong> sessões ({formatarPercentual(percentual)}) e faltou a{" "}
        <strong>{sessoes - presentes}</strong>.
      </p>
      <div>
        <Medidor valor={percentual} media={media} alto rotulo="Presença nas sessões" />
        <Legenda media={media} />
      </div>
    </Secao>
  );
}

function Legenda({ media }: { media: number }) {
  return (
    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-2">
      <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-5 rounded-full bg-accent" /> Este deputado</span>
      <span className="flex items-center gap-1.5"><span className="inline-block h-4 w-0.5 bg-ink" /> Média da Câmara ({Math.round(media)}%)</span>
    </div>
  );
}

const TEXTO_VOTO: Record<string, string> = {
  "Artigo 17": "Presidindo a sessão",
  Registrado: "Voto registrado",
};

function SecaoVotacoes({ dep, media }: { dep: Deputado; media: number }) {
  const { total, votou, percentual, recentes } = dep.votacoes;
  return (
    <Secao id="votacoes" titulo="Como votou" explicacao="Votações nominais são aquelas em que o voto de cada deputado fica registrado no painel do Plenário.">
      <p className="text-lg">
        Votou em <strong>{votou}</strong> de <strong>{total}</strong> votações nominais ({formatarPercentual(percentual)}).
      </p>
      <div>
        <Medidor valor={percentual} media={media} alto rotulo="Participação nas votações" />
        <Legenda media={media} />
      </div>
      <h3 className="pt-2 text-lg font-bold">Votações mais recentes</h3>
      <ul className="divide-y divide-line">
        {recentes.map((v) => (
          <ItemVotacao key={v.id} v={v} />
        ))}
      </ul>
    </Secao>
  );
}

function ItemVotacao({ v }: { v: Votacao }) {
  const naoVotou = v.voto === "Não votou";
  return (
    <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-1">
        <div className="text-sm text-muted">
          {formatarData(v.data)}
          {v.aprovada !== null && <> · {v.aprovada ? "Aprovado" : "Rejeitado"} pelo Plenário</>}
        </div>
        <p>{resumirDescricao(v.descricao)}</p>
        {v.idProposicao && (
          <a href={urlProposicao(v.idProposicao)} target="_blank" rel="noreferrer" className="text-sm underline">
            Ver a proposta votada
          </a>
        )}
      </div>
      <span
        className={`shrink-0 self-start rounded-full border px-3 py-1 text-sm font-bold ${
          naoVotou ? "border-dashed border-muted text-muted" : "border-ink text-ink"
        }`}
      >
        {naoVotou ? "Não votou" : `Votou: ${TEXTO_VOTO[v.voto] ?? v.voto}`}
      </span>
    </li>
  );
}

// Remove o placar ("Sim: 461; Não: 4; Total: 465.") do fim da descrição oficial.
function resumirDescricao(texto: string) {
  return texto.replace(/\s*Sim:\s*\d+[\s\S]*$/, "").trim();
}

function SecaoProjetos({ dep, media }: { dep: Deputado; media: number }) {
  const ps = dep.proposicoes;
  return (
    <Secao id="projetos" titulo="O que está propondo" explicacao="Projetos de lei e propostas de emenda à Constituição apresentados neste ano, sozinho ou junto com outros deputados.">
      <p className="text-lg">
        Apresentou <strong>{ps.principais}</strong> projetos ({ps.comoPrimeiroAutor} como autor principal). A média da Câmara é{" "}
        {Math.round(media)}.
      </p>
      <ul className="flex flex-wrap gap-2 text-sm">
        {Object.entries(ps.porTipo).map(([sigla, qtd]) => (
          <li key={sigla} className="rounded-full bg-track px-3 py-1">{NOMES_TIPOS[sigla] ?? sigla}: <strong>{qtd}</strong></li>
        ))}
        <li className="rounded-full bg-track px-3 py-1" title="Pedidos formais de informação enviados a ministros e órgãos do governo">
          Pedidos de informação ao governo: <strong>{ps.pedidosInformacao}</strong>
        </li>
        <li className="rounded-full bg-track px-3 py-1">Requerimentos: <strong>{ps.requerimentos}</strong></li>
      </ul>
      {ps.lista.length > 0 ? (
        <details open={ps.lista.length <= 5} className="group">
          <summary className="cursor-pointer font-bold underline">
            Ver os {ps.lista.length} projetos
          </summary>
          <ul className="mt-3 divide-y divide-line">
            {ps.lista.map((p) => (
              <li key={p.id} className="space-y-1 py-3">
                <div className="text-sm text-muted">
                  {p.sigla} {p.numero}/{p.ano} · apresentado em {formatarData(p.data)}
                  {!p.primeiroAutor && " · coautor"}
                </div>
                <p>{p.ementa}</p>
                <div className="flex flex-wrap gap-x-4 text-sm">
                  {p.situacao && <span className="text-ink-2">Situação: {p.situacao}</span>}
                  <a href={urlProposicao(p.id)} target="_blank" rel="noreferrer" className="underline">Ler na íntegra</a>
                </div>
              </li>
            ))}
          </ul>
        </details>
      ) : (
        <p className="text-ink-2">Nenhum projeto de lei apresentado neste ano até agora.</p>
      )}
    </Secao>
  );
}

function SecaoGastos({ dep, media, meta }: { dep: Deputado; media: number; meta: ReturnType<typeof carregarMeta> }) {
  const g = dep.gastos;
  const maiorCategoria = g.porCategoria[0]?.valor ?? 0;
  const ultimoMes = meta.ano === new Date(meta.atualizadoEm).getFullYear() ? new Date(meta.atualizadoEm).getMonth() + 1 : 12;
  const meses = g.porMes.slice(0, ultimoMes);
  const maiorMes = Math.max(...meses, 1);

  return (
    <Secao
      id="gastos"
      titulo="Gastos com dinheiro público"
      explicacao="A cota parlamentar é uma verba mensal para despesas do mandato: passagens, combustível, escritório, divulgação etc. O deputado gasta e a Câmara reembolsa."
    >
      <p className="text-lg">
        Gastou <strong>{formatarReais(g.total)}</strong> em {g.documentos} notas fiscais.{" "}
        {g.total > media ? "Acima" : "Abaixo"} da média da Câmara ({formatarReais(media)}).
      </p>

      {g.porCategoria.length > 0 && (
        <>
          <h3 className="text-lg font-bold">Em que gastou</h3>
          <ul className="space-y-3">
            {g.porCategoria.map((c) => (
              <li key={c.categoria}>
                <div className="flex justify-between gap-3 text-sm">
                  <span>{c.categoria}</span>
                  <span className="shrink-0 font-bold">{formatarReais(c.valor)}</span>
                </div>
                <div className="mt-1 h-2.5 w-full rounded-full bg-track">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${(c.valor / maiorCategoria) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>

          <h3 className="pt-2 text-lg font-bold">Gastos por mês</h3>
          <div className="flex h-40 items-end gap-[2px]" role="img" aria-label="Gráfico de gastos por mês; os valores estão na tabela abaixo">
            {meses.map((v, i) => (
              <div key={i} className="group relative flex h-full flex-1 flex-col justify-end">
                <span className="pointer-events-none absolute -top-7 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded bg-ink px-2 py-0.5 text-xs text-surface group-hover:block">
                  {MESES[i]}: {formatarReais(v)}
                </span>
                <div className="rounded-t bg-accent group-hover:opacity-80" style={{ height: `${(v / maiorMes) * 100}%`, minHeight: v > 0 ? 2 : 0 }} />
              </div>
            ))}
          </div>
          <div className="flex gap-[2px] text-center text-xs text-muted">
            {meses.map((_, i) => (
              <span key={i} className="flex-1">{MESES[i]}</span>
            ))}
          </div>
          <details>
            <summary className="cursor-pointer text-sm underline">Ver valores mês a mês</summary>
            <table className="mt-2 w-full text-sm">
              <tbody>
                {meses.map((v, i) => (
                  <tr key={i} className="border-b border-line">
                    <td className="py-1">{MESES[i]}</td>
                    <td className="py-1 text-right">{formatarReais(v)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>

          <h3 className="pt-2 text-lg font-bold">Quem mais recebeu</h3>
          <ol className="divide-y divide-line">
            {g.fornecedores.map((f) => (
              <li key={f.nome} className="flex justify-between gap-3 py-2 text-sm">
                <span className="min-w-0 break-words">{f.nome}</span>
                <span className="shrink-0 font-bold">{formatarReais(f.valor)}</span>
              </li>
            ))}
          </ol>
          <p className="text-sm text-ink-2">
            As notas fiscais de cada gasto podem ser conferidas na{" "}
            <a href={urlCamaraDeputado(dep.id)} target="_blank" rel="noreferrer" className="underline">página oficial do deputado</a>.
          </p>
        </>
      )}
    </Secao>
  );
}
