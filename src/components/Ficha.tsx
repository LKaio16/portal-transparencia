import Image from "next/image";
import Link from "next/link";
import type { Casa, DadosEleitorais, Meta, Parlamentar, Proposicao, Votacao } from "@/lib/dados";
import {
  CASAS,
  NOMES_TIPOS,
  UFS,
  formatarData,
  formatarPercentual,
  formatarReais,
  formatarReaisCurto,
  textoResultado,
  urlCamaraDeputado,
  urlProposicao,
} from "@/lib/formato";
import Medidor from "./Medidor";

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

type Props = {
  casa: Casa;
  p: Parlamentar;
  meta: Meta;
  eleitoral: DadosEleitorais | null;
  resumos: Record<string, string>;
};

// Ficha completa de um parlamentar. Serve para deputados e senadores.
export default function Ficha({ casa, p, meta, eleitoral, resumos }: Props) {
  const textos = CASAS[casa];
  const paginaOficial = p.paginaOficial ?? urlCamaraDeputado(p.id);
  const chaveComparar = `${casa === "camara" ? "dep" : "sen"}-${p.id}`;

  return (
    <article className="space-y-8">
      <Link href={casa === "camara" ? "/" : "/senadores"} className="text-ink-2 underline">
        ← Todos os {textos.plural}
      </Link>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Image
          src={p.foto}
          alt={`Foto de ${p.nome}`}
          width={120}
          height={160}
          unoptimized
          priority
          className="h-40 w-[120px] rounded-xl bg-track object-cover"
        />
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">{p.nome}</h1>
          <p className="text-lg text-ink-2">
            {textos.cargo}
            {p.participacao && p.participacao !== "Titular" && ` (${p.participacao.toLowerCase()} em exercício)`} · {p.partido} ·{" "}
            {UFS[p.uf] ?? p.uf}
          </p>
          {p.mandato?.fim && <p className="text-sm text-ink-2">Mandato até {formatarData(p.mandato.fim)}</p>}
          <p className="flex flex-wrap gap-x-3 text-sm text-ink-2">
            <a href={paginaOficial} target="_blank" rel="noreferrer" className="underline">Página oficial</a>
            {p.email && <a href={`mailto:${p.email}`} className="underline">Enviar e-mail ao gabinete</a>}
            <Link href={`/comparar?p=${chaveComparar}`} className="underline">Comparar com outros</Link>
          </p>
        </div>
      </header>

      <Resumo p={p} meta={meta} casa={casa} />
      <SecaoPresenca p={p} media={meta.medias.presenca} casa={casa} />
      <SecaoVotacoes p={p} media={meta.medias.votacoes} resumos={resumos} />
      <SecaoProjetos p={p} media={meta.medias.proposicoes} casa={casa} resumos={resumos} />
      <SecaoGastos p={p} media={meta.medias.gastos} meta={meta} paginaOficial={paginaOficial} casa={casa} />
      <SecaoEleicoes p={p} eleitoral={eleitoral} />

      <aside className="rounded-xl border border-line bg-surface p-4 text-sm text-ink-2">
        Dados de {meta.ano} até {formatarData(meta.atualizadoEm)}, das bases oficiais{" "}
        {casa === "camara" ? "da Câmara dos Deputados" : "do Senado Federal"} e do TSE.
        {casa === "camara" && " Faltas podem ter justificativa (licença médica, missão oficial etc.) que não aparece nesses dados."}{" "}
        <Link href="/como-funciona" className="underline">Veja como calculamos</Link>.
      </aside>
    </article>
  );
}

function Resumo({ p, meta, casa }: { p: Parlamentar; meta: Meta; casa: Casa }) {
  const comparar = (valor: number | null, media: number) =>
    valor === null ? "" : valor >= media ? "acima da média" : "abaixo da média";
  return (
    <section aria-labelledby="titulo-resumo" className="rounded-2xl bg-accent-soft p-5">
      <h2 id="titulo-resumo" className="mb-3 text-xl font-bold">Resumo de {meta.ano}, em poucas palavras</h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        <ItemResumo
          icone="🏛️"
          titulo={formatarPercentual(p.presenca.percentual)}
          texto={`de presença ${casa === "camara" ? "nas sessões" : "nas votações"} do Plenário (${comparar(p.presenca.percentual, meta.medias.presenca)})`}
        />
        <ItemResumo icone="🗳️" titulo={formatarPercentual(p.votacoes.percentual)} texto={`das votações em que poderia votar (${comparar(p.votacoes.percentual, meta.medias.votacoes)})`} />
        <ItemResumo icone="📄" titulo={String(p.proposicoes.principais)} texto={`projetos de lei e propostas apresentados (média: ${Math.round(meta.medias.proposicoes)})`} />
        <ItemResumo icone="💰" titulo={formatarReaisCurto(p.gastos.total)} texto={`gastos da cota parlamentar (média: ${formatarReaisCurto(meta.medias.gastos)})`} />
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

export function Secao({ id, titulo, explicacao, children }: { id: string; titulo: string; explicacao: string; children: React.ReactNode }) {
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

function Legenda({ media }: { media: number }) {
  return (
    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-2">
      <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-5 rounded-full bg-accent" /> Este parlamentar</span>
      <span className="flex items-center gap-1.5"><span className="inline-block h-4 w-0.5 bg-ink" /> Média da Casa ({Math.round(media)}%)</span>
    </div>
  );
}

// Barras horizontais de uma série só, com o valor escrito ao lado (não depende só da cor).
function BarrasValores({ itens }: { itens: { rotulo: string; valor: number }[] }) {
  const maior = Math.max(...itens.map((i) => i.valor), 1);
  return (
    <ul className="space-y-3">
      {itens.map((i) => (
        <li key={i.rotulo}>
          <div className="flex justify-between gap-3 text-sm">
            <span>{i.rotulo}</span>
            <span className="shrink-0 font-bold">{formatarReais(i.valor)}</span>
          </div>
          <div className="mt-1 h-2.5 w-full rounded-full bg-track">
            <div className="h-full rounded-full bg-accent" style={{ width: `${(i.valor / maior) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function SecaoPresenca({ p, media, casa }: { p: Parlamentar; media: number; casa: Casa }) {
  const { sessoes, presentes, percentual } = p.presenca;
  const a = p.ausencias;
  return (
    <Secao
      id="presenca"
      titulo="Presença"
      explicacao={
        casa === "camara"
          ? "As sessões deliberativas são as reuniões do Plenário em que se vota. Ir a elas é uma das obrigações básicas do mandato."
          : "No Senado, a presença é registrada em cada votação nominal do Plenário, junto com o motivo de quem faltou."
      }
    >
      {casa === "camara" ? (
        <p className="text-lg">
          Compareceu a <strong>{presentes}</strong> de <strong>{sessoes}</strong> sessões ({formatarPercentual(percentual)}) e faltou a{" "}
          <strong>{sessoes - presentes}</strong>.
        </p>
      ) : (
        <p className="text-lg">
          Estava presente em <strong>{presentes}</strong> de <strong>{sessoes}</strong> votações ({formatarPercentual(percentual)}).
        </p>
      )}
      <div>
        <Medidor valor={percentual} media={media} alto rotulo="Presença" />
        <Legenda media={media} />
      </div>
      {a && sessoes - presentes > 0 && (
        <ul className="grid gap-2 text-sm sm:grid-cols-3">
          <li className="rounded-lg bg-track px-3 py-2">Ausências justificadas (licença, missão oficial etc.): <strong>{a.justificadas}</strong></li>
          <li className="rounded-lg bg-track px-3 py-2">Faltas sem justificativa: <strong>{a.semJustificativa}</strong></li>
          {a.semRegistro > 0 && <li className="rounded-lg bg-track px-3 py-2">Sem registro: <strong>{a.semRegistro}</strong></li>}
        </ul>
      )}
    </Secao>
  );
}

const TEXTO_VOTO: Record<string, string> = {
  "Artigo 17": "Presidindo a sessão",
  Registrado: "Voto registrado",
};

function SecaoVotacoes({ p, media, resumos }: { p: Parlamentar; media: number; resumos: Record<string, string> }) {
  const { total, votou, percentual, recentes } = p.votacoes;
  return (
    <Secao id="votacoes" titulo="Como votou" explicacao="Votações nominais são aquelas em que o voto de cada parlamentar fica registrado no painel do Plenário.">
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
          <ItemVotacao key={v.id} v={v} resumo={v.chaveResumo ? resumos[v.chaveResumo] : undefined} />
        ))}
      </ul>
    </Secao>
  );
}

function ItemVotacao({ v, resumo }: { v: Votacao; resumo?: string }) {
  const votou = !/^(Não votou|Ausente|Não compareceu|Sem registro|Presente, sem)/.test(v.voto);
  const textoVoto = TEXTO_VOTO[v.voto] ?? v.voto;
  return (
    <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-1">
        <div className="text-sm text-muted">
          {formatarData(v.data)}
          {v.materia && <> · {v.materia}</>}
          {v.aprovada !== null && <> · {v.aprovada ? "Aprovado" : "Rejeitado"} pelo Plenário</>}
        </div>
        {resumo ? (
          <p className="font-bold">{resumo}</p>
        ) : (
          v.ementa && <p>{v.ementa}</p>
        )}
        <p className="text-sm text-ink-2">{resumirDescricao(v.descricao)}</p>
        {resumo && v.ementa && (
          <details className="text-sm text-ink-2">
            <summary className="cursor-pointer underline">Texto oficial</summary>
            <p className="mt-1">{v.ementa}</p>
          </details>
        )}
        {v.link && (
          <a href={v.link} target="_blank" rel="noreferrer" className="text-sm underline">Ver a proposta votada</a>
        )}
      </div>
      <span
        className={`shrink-0 self-start rounded-full border px-3 py-1 text-sm font-bold ${
          votou ? "border-ink text-ink" : "border-dashed border-muted text-muted"
        }`}
      >
        {votou ? `Votou: ${textoVoto}` : textoVoto}
      </span>
    </li>
  );
}

// Remove o placar ("Sim: 461; Não: 4; Total: 465.") do fim da descrição oficial.
function resumirDescricao(texto: string) {
  return texto.replace(/\s*Sim:\s*\d+[\s\S]*$/, "").trim();
}

function SecaoProjetos({ p, media, casa, resumos }: { p: Parlamentar; media: number; casa: Casa; resumos: Record<string, string> }) {
  const ps = p.proposicoes;
  const prefixo = CASAS[casa].prefixoResumo;
  return (
    <Secao id="projetos" titulo="O que está propondo" explicacao="Projetos de lei e propostas de emenda à Constituição apresentados neste ano, sozinho ou junto com outros parlamentares.">
      <p className="text-lg">
        Apresentou <strong>{ps.principais}</strong> projetos ({ps.comoPrimeiroAutor} como autor principal). A média da Casa é{" "}
        {Math.round(media)}.
      </p>
      <ul className="flex flex-wrap gap-2 text-sm">
        {Object.entries(ps.porTipo).map(([sigla, qtd]) => (
          <li key={sigla} className="rounded-full bg-track px-3 py-1">{NOMES_TIPOS[sigla] ?? sigla}: <strong>{qtd}</strong></li>
        ))}
        {casa === "camara" && (
          <li className="rounded-full bg-track px-3 py-1" title="Pedidos formais de informação enviados a ministros e órgãos do governo">
            Pedidos de informação ao governo: <strong>{ps.pedidosInformacao}</strong>
          </li>
        )}
        <li className="rounded-full bg-track px-3 py-1">Requerimentos: <strong>{ps.requerimentos}</strong></li>
      </ul>
      {ps.lista.length > 0 ? (
        <details open={ps.lista.length <= 5}>
          <summary className="cursor-pointer font-bold underline">Ver os {ps.lista.length} projetos</summary>
          <ul className="mt-3 divide-y divide-line">
            {ps.lista.map((item) => (
              <ItemProjeto key={item.id} item={item} resumo={resumos[`${prefixo}:${item.id}`]} />
            ))}
          </ul>
        </details>
      ) : (
        <p className="text-ink-2">Nenhum projeto de lei apresentado neste ano até agora.</p>
      )}
    </Secao>
  );
}

function ItemProjeto({ item, resumo }: { item: Proposicao; resumo?: string }) {
  return (
    <li className="space-y-1 py-3">
      <div className="text-sm text-muted">
        {item.sigla} {item.numero}/{item.ano} · apresentado em {formatarData(item.data)}
        {!item.primeiroAutor && " · coautor"}
      </div>
      {resumo ? (
        <>
          <p className="font-bold">{resumo}</p>
          <details className="text-sm text-ink-2">
            <summary className="cursor-pointer underline">Texto oficial</summary>
            <p className="mt-1">{item.ementa}</p>
          </details>
        </>
      ) : (
        <p>{item.ementa}</p>
      )}
      <div className="flex flex-wrap gap-x-4 text-sm">
        {item.situacao && <span className="text-ink-2">Situação: {item.situacao}</span>}
        <a href={item.link ?? urlProposicao(item.id)} target="_blank" rel="noreferrer" className="underline">Ler na íntegra</a>
      </div>
    </li>
  );
}

function SecaoGastos({ p, media, meta, paginaOficial, casa }: { p: Parlamentar; media: number; meta: Meta; paginaOficial: string; casa: Casa }) {
  const g = p.gastos;
  const atualizado = new Date(meta.atualizadoEm);
  const ultimoMes = meta.ano === atualizado.getFullYear() ? atualizado.getMonth() + 1 : 12;
  const meses = g.porMes.slice(0, ultimoMes);
  const maiorMes = Math.max(...meses, 1);

  return (
    <Secao
      id="gastos"
      titulo="Gastos com dinheiro público"
      explicacao={`A cota parlamentar${casa === "senado" ? " (CEAPS)" : ""} é uma verba mensal para despesas do mandato: passagens, combustível, escritório, divulgação etc. O parlamentar gasta e a Casa reembolsa.`}
    >
      <p className="text-lg">
        Gastou <strong>{formatarReais(g.total)}</strong> em {g.documentos} notas fiscais. {g.total > media ? "Acima" : "Abaixo"} da média da
        Casa ({formatarReais(media)}).
      </p>

      {g.porCategoria.length > 0 && (
        <>
          <h3 className="text-lg font-bold">Em que gastou</h3>
          <BarrasValores itens={g.porCategoria.map((c) => ({ rotulo: c.categoria, valor: c.valor }))} />

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
            <a href={paginaOficial} target="_blank" rel="noreferrer" className="underline">página oficial</a>.
          </p>
        </>
      )}
    </Secao>
  );
}

function SecaoEleicoes({ p, eleitoral }: { p: Parlamentar; eleitoral: DadosEleitorais | null }) {
  if (!eleitoral) return null;
  const { eleicao, patrimonio, campanha, candidatura2026 } = eleitoral;
  const [primeiro, ultimo] = [patrimonio[0], patrimonio.at(-1)];
  const variacao = ultimo && primeiro !== ultimo && primeiro.total > 0 ? ((ultimo.total - primeiro.total) / primeiro.total) * 100 : null;
  const ehSuplente = p.participacao?.includes("Suplente");

  return (
    <Secao
      id="eleicoes"
      titulo="Patrimônio e campanha"
      explicacao="Informações que o próprio candidato declarou à Justiça Eleitoral (TSE) ao se candidatar, e a prestação de contas da campanha."
    >
      <div className="rounded-xl bg-track p-4">
        <p>
          <strong>Eleições {eleicao.ano}:</strong> candidatou-se a {eleicao.cargo.toLowerCase()} pelo {eleicao.partido} e{" "}
          {textoResultado(eleicao.situacao)}.
        </p>
        <p className="mt-1">
          <strong>Eleições 2026:</strong>{" "}
          {candidatura2026
            ? `candidatou-se a ${candidatura2026.cargo.toLowerCase()} pelo ${candidatura2026.partido} e ${textoResultado(candidatura2026.situacao)}.`
            : "não aparece como candidato(a)."}
        </p>
      </div>

      <h3 className="text-lg font-bold">Patrimônio declarado</h3>
      <ul className="grid gap-3 sm:grid-cols-2">
        {patrimonio.map((b) => (
          <li key={b.ano} className="rounded-xl border border-line p-3">
            <div className="text-sm text-ink-2">Em {b.ano} (candidatura a {b.cargo.toLowerCase()})</div>
            <div className="text-2xl font-bold">{formatarReais(b.total)}</div>
          </li>
        ))}
      </ul>
      {variacao !== null && ultimo && (
        <p>
          O patrimônio declarado {variacao >= 0 ? "aumentou" : "diminuiu"} <strong>{formatarPercentual(Math.abs(variacao))}</strong> entre{" "}
          {primeiro.ano} e {ultimo.ano}.
        </p>
      )}
      {ultimo && ultimo.porTipo.length > 0 && (
        <>
          <p className="text-sm font-bold">Composição em {ultimo.ano}</p>
          <BarrasValores itens={ultimo.porTipo.map((t) => ({ rotulo: t.tipo, valor: t.valor }))} />
        </>
      )}
      <p className="text-sm text-ink-2">
        Os valores são os declarados pelo candidato. Imóveis costumam ser declarados pelo preço de compra, não pelo valor de mercado, e
        variações podem vir de herança, venda de bens ou atualização de valores.
      </p>

      <h3 className="pt-2 text-lg font-bold">Quanto custou a campanha de {eleicao.ano}</h3>
      {campanha ? (
        <>
          <p className="text-lg">
            Arrecadou <strong>{formatarReais(campanha.total)}</strong>. Desse total, <strong>{formatarPercentual(campanha.percentualPublico)}</strong>{" "}
            ({formatarReais(campanha.publico)}) veio de dinheiro público (fundo eleitoral e fundo partidário).
          </p>
          <BarrasValores itens={campanha.porOrigem.map((o) => ({ rotulo: o.origem, valor: o.valor }))} />
          {campanha.doadores.length > 0 && (
            <>
              <p className="text-sm font-bold">Maiores doadores e repasses</p>
              <ol className="divide-y divide-line">
                {campanha.doadores.map((d) => (
                  <li key={d.nome} className="flex justify-between gap-3 py-2 text-sm">
                    <span className="min-w-0 break-words">{d.nome}</span>
                    <span className="shrink-0 font-bold">{formatarReais(d.valor)}</span>
                  </li>
                ))}
              </ol>
              <p className="text-sm text-ink-2">O fundo eleitoral chega ao candidato por meio do partido, por isso o partido costuma aparecer como maior doador.</p>
            </>
          )}
        </>
      ) : (
        <p className="text-ink-2">
          {ehSuplente
            ? "Suplentes não fazem prestação de contas própria: a campanha é declarada pelo titular da chapa."
            : "Não encontramos prestação de contas desta campanha nos dados do TSE."}
        </p>
      )}
      <p className="text-sm text-ink-2">
        Fonte:{" "}
        <a href="https://divulgacandcontas.tse.jus.br" target="_blank" rel="noreferrer" className="underline">DivulgaCandContas (TSE)</a>.
      </p>
    </Secao>
  );
}
