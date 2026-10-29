import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowDown, ArrowRight, ArrowUpRight, BellRing, FileText, Gauge, Plus, Search } from "lucide-react";
import { carregarIndice, carregarMeta, type Casa } from "@/lib/dados";
import { CASAS, formatarPercentual, formatarReaisCurto } from "@/lib/formato";
import { Marca } from "./Cabecalho";
import ListaParlamentares from "./ListaParlamentares";

const ICONE = { size: 24, strokeWidth: 1.75, "aria-hidden": true } as const;

function SetaBotao({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="botao gap-3 pr-2">
      {children}
      <span className="seta-circulo grid h-9 w-9 place-items-center rounded-full bg-marca text-black">
        <ArrowRight size={18} strokeWidth={2} aria-hidden />
      </span>
    </Link>
  );
}

// Página inicial de cada Casa: abertura com busca, médias, lista e caminhos para o resto do site.
export default function PaginaLista({ casa }: { casa: Casa }) {
  const parlamentares = carregarIndice(casa);
  const meta = carregarMeta(casa);
  const textos = CASAS[casa];
  const camara = casa === "camara";
  const rotaLista = camara ? "/" : "/senadores";

  const medias = [
    { valor: formatarPercentual(meta.medias.presenca), rotulo: camara ? "Presença nas sessões" : "Presença nas votações" },
    { valor: formatarPercentual(meta.medias.votacoes), rotulo: "Participação nas votações" },
    { valor: meta.medias.proposicoes.toLocaleString("pt-BR"), rotulo: `Projetos por ${textos.singular}` },
    { valor: formatarReaisCurto(meta.medias.gastos), rotulo: "Gasto médio da cota" },
  ];

  const indicadores = [
    ["Presença", `Quantas sessões com votação o ${textos.singular} acompanhou, contadas desde o dia em que assumiu.`],
    ["Votações", "Em quantas votações nominais do Plenário ele registrou voto, inclusive abstenção e obstrução."],
    ["Projetos", "Projetos de lei, emendas à Constituição e outros textos em que ele assina como autor ou coautor."],
    ["Gastos da cota", "Quanto ele pediu de reembolso da cota parlamentar no ano. O limite muda de estado para estado."],
  ];

  const perguntas = [
    [
      "Como vocês calculam a presença?",
      "Contamos as sessões do Plenário com votação em que a presença foi registrada e dividimos pelo total dessas sessões desde que o parlamentar começou a atuar no ano. Quem assumiu no meio do ano não é comparado com um período em que não estava no cargo.",
    ],
    [
      "O que entra em gastos?",
      "É a soma do valor líquido de todas as notas reembolsadas pela cota parlamentar no ano. O valor máximo da cota muda de estado para estado, porque inclui as passagens até Brasília.",
    ],
    [
      "O patrimônio foi conferido?",
      "Não. É a soma dos bens que o próprio candidato declarou ao TSE. O TSE não confere esses valores, e imóveis costumam ser declarados pelo valor de compra.",
    ],
    [
      "Quantos e-mails eu vou receber?",
      "No máximo um por dia, só quando há votação, projeto novo ou notícia sobre quem você segue. O cadastro só vale depois que você confirma pelo link, e dá para cancelar com um clique.",
    ],
    ["Encontrei um erro. O que eu faço?", "Avise pela página Como funciona. Conferimos com a fonte oficial e corrigimos."],
  ];

  return (
    <div className="-mt-8 sm:-mt-10">
      {/* Abertura: declaração e busca em cima à direita, marca monumental embaixo à esquerda. */}
      <section className="sangria bg-grafite text-[var(--grafite-texto)]" aria-labelledby="titulo-abertura">
        <div className="mx-auto grid min-h-[min(100svh-64px,760px)] max-w-[1280px] grid-rows-[auto_1fr_auto] px-6 pt-14 pb-6 md:min-h-[min(100svh-72px,980px)] lg:px-12">
          <div className="md:ml-[35%] lg:ml-[48%]">
            <h1 id="titulo-abertura" className="entra titulo text-[clamp(1.6rem,2.5vw,2.4rem)] leading-[1.18] font-medium" style={{ "--i": 2 } as React.CSSProperties}>
              Veja se o seu {textos.singular} vai às votações, apresenta projetos e quanto gasta do dinheiro público. Tudo com dados{" "}
              <span className="realce">oficiais</span>, em linguagem simples.
            </h1>
            <form action={`${rotaLista}#lista`} method="get" role="search" className="entra mt-8" style={{ "--i": 3 } as React.CSSProperties}>
              <label htmlFor="busca-abertura" className="mb-2 block text-[15px] text-[var(--grafite-muted)]">
                Buscar por nome, partido ou estado
              </label>
              <div className="flex h-16 items-center rounded-full border border-[var(--grafite-linha)] bg-grafite-2 pl-6 pr-1.5 focus-within:border-[var(--grafite-texto)]">
                <Search size={20} strokeWidth={1.75} aria-hidden className="shrink-0 text-[var(--grafite-muted)]" />
                <input
                  id="busca-abertura"
                  name="q"
                  type="search"
                  autoComplete="off"
                  placeholder={`Ex.: nome do ${textos.singular}`}
                  className="h-full min-w-0 flex-1 bg-transparent px-3 text-lg text-[var(--grafite-texto)] placeholder:text-[var(--grafite-muted)] focus:outline-none"
                />
                <button type="submit" aria-label="Buscar" className="seta-circulo grid h-[52px] w-[52px] shrink-0 place-items-center rounded-full bg-marca text-black hover:bg-[var(--marca-hover)]">
                  <ArrowRight size={22} strokeWidth={2} aria-hidden />
                </button>
              </div>
              <Link href="/cidades" className="mt-4 inline-flex min-h-11 items-center gap-1 underline underline-offset-4">
                Quem representa a sua cidade? <ArrowRight size={16} aria-hidden />
              </Link>
            </form>
          </div>
          <div />
          <div className="flex flex-col-reverse gap-6 md:flex-row md:items-end md:justify-between">
            <p aria-hidden className="titulo text-[clamp(4.5rem,13vw,12rem)] leading-[0.86] font-bold tracking-[-0.045em]">
              <span className="entra block" style={{ "--i": 0 } as React.CSSProperties}>Olho no</span>
              <span className="entra block" style={{ "--i": 1 } as React.CSSProperties}>Mandato</span>
            </p>
            <a href="#lista" className="inline-flex min-h-11 items-center gap-2 text-[17px] md:mb-4">
              Ver a lista <ArrowDown size={18} aria-hidden />
            </a>
          </div>
        </div>
      </section>

      {/* Médias da Casa: rótulo à esquerda, título editorial, retrato alto e grade 2x2. */}
      <section className="py-24 lg:py-32" aria-labelledby="titulo-medias">
        <div className="grid gap-6 lg:grid-cols-[26%_1fr]">
          <p className="flex items-center gap-2 font-bold"><Plus size={18} aria-hidden className="rounded-full bg-ink text-bg" /> Média da Casa</p>
          <h2 id="titulo-medias" className="text-[clamp(2rem,3.6vw,3.4rem)] leading-[1.05] font-semibold tracking-[-0.035em]">
            Como {camara ? "a Câmara" : "o Senado"} trabalhou em {meta.ano},{" "}
            <span className="text-muted">em quatro números para você comparar.</span>
          </h2>
        </div>
        <div className="mt-14 grid gap-10 lg:grid-cols-[30%_1fr] lg:gap-[12%]">
          <div className="order-last overflow-hidden rounded-[20px] lg:order-none" data-reveal="media">
            <Image
              src="/images/congresso_nacional.jpg"
              alt="Fachada do Palácio do Congresso Nacional, em Brasília, com as duas torres e a cúpula do Senado"
              width={1200}
              height={2000}
              sizes="(min-width: 1024px) 30vw, 100vw"
              className="aspect-[4/3] w-full object-cover object-[center_40%] lg:aspect-[3/5]"
            />
            <p className="mt-2 text-xs text-muted">Foto: Agência Senado, CC BY 2.0</p>
          </div>
          <div>
            <p className="titulo text-[clamp(1.25rem,1.8vw,1.6rem)] leading-snug">
              <strong className="font-semibold">Antes de olhar um nome, veja a média.</strong>{" "}
              <span className="text-muted">Cada ficha mostra o parlamentar ao lado destes valores.</span>
            </p>
            <ul className="mt-8 grid grid-cols-2 gap-2">
              {medias.map((m, i) => (
                <li key={m.rotulo} className="cartao flex min-h-40 flex-col justify-between p-5 sm:min-h-52 sm:p-6" data-reveal="rise" data-reveal-delay={i * 60}>
                  <div className="flex items-start justify-between gap-2">
                    <span className="titulo text-[clamp(1.9rem,4vw,3.4rem)] leading-none font-semibold">
                      {i === 0 ? <span className="realce">{m.valor}</span> : m.valor}
                    </span>
                    <span className="text-[13px] text-muted">0{i + 1}</span>
                  </div>
                  <span className="self-end text-right text-[15px] sm:text-[17px]">{m.rotulo}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[15px] text-muted">
              Dados até agora, atualizados todo dia a partir das fontes oficiais.{" "}
              <Link href="/como-funciona" className="inline-flex min-h-11 items-center underline">Entenda cada número</Link>
            </p>
          </div>
        </div>
      </section>

      {/* Lista com filtros: é o alvo da busca da abertura. */}
      <div id="lista" className="scroll-mt-24">
        <Suspense>
          <ListaParlamentares casa={casa} parlamentares={parlamentares} medias={meta.medias} />
        </Suspense>
      </div>

      {/* Como usar: declaração centralizada e três passos. */}
      <section className="py-24 text-center lg:py-32" aria-labelledby="titulo-como-usar">
        <p className="rotulo">Como usar</p>
        <h2 id="titulo-como-usar" className="mx-auto mt-6 max-w-4xl text-[clamp(1.5rem,2.6vw,2.4rem)] leading-tight font-medium">
          Você escolhe um nome, lê a ficha em linguagem simples e decide se quer acompanhar. Se seguir, recebe no máximo um e-mail por dia.
        </h2>
        <ul className="mx-auto mt-14 grid max-w-5xl gap-8 text-left md:grid-cols-3">
          {[
            [Search, "Busque pelo nome", "Ou filtre por estado e partido"],
            [FileText, "Leia a ficha", "Presença, votos, projetos, gastos e patrimônio"],
            [BellRing, "Siga e receba alertas", "Cancele com um clique quando quiser"],
          ].map(([Icone, titulo, texto], i) => {
            const I = Icone as typeof Search;
            return (
              <li key={titulo as string} className="flex items-center gap-4" data-reveal="slide" data-reveal-delay={i * 80}>
                <span className={`grid h-16 w-16 shrink-0 place-items-center rounded-full lg:h-[72px] lg:w-[72px] ${i === 1 ? "bg-marca text-black" : "border border-borda"}`}>
                  <I {...ICONE} />
                </span>
                <span>
                  <span className="titulo block text-xl font-medium lg:text-2xl">{titulo as string}</span>
                  <span className="text-muted">{texto as string}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      {/* O que medimos: faixa grafite com lista numerada. */}
      <section className="sangria bg-grafite py-24 text-[var(--grafite-texto)] lg:py-32" aria-labelledby="titulo-medimos">
        <div className="mx-auto max-w-[1280px] px-6 lg:px-12">
          <div className="text-center">
            <p className="flex items-center justify-center gap-2 text-[var(--grafite-muted)]"><Gauge size={18} aria-hidden /> O que medimos</p>
            <h2 id="titulo-medimos" className="mt-3 text-[clamp(2rem,3.8vw,3.6rem)] font-semibold">Quatro números. Nenhum julgamento.</h2>
            <p className="mx-auto mt-3 max-w-xl text-[var(--grafite-muted)]">Cada indicador sai direto da fonte oficial e vem explicado na ficha.</p>
          </div>
          <ol className="mt-14">
            {indicadores.map(([titulo, texto], i) => (
              <li key={titulo} className="border-b border-[var(--grafite-linha)] last:border-0" data-reveal="rise" data-reveal-delay={i * 80}>
                <details open={i === 0} className="group py-6">
                  <summary className="flex min-h-11 items-start gap-4 sm:gap-8">
                    <span className="pt-2 text-[var(--grafite-muted)]">0{i + 1}</span>
                    <span className="titulo flex-1 text-[clamp(1.75rem,3.3vw,3rem)] leading-tight font-semibold group-open:text-marca">{titulo}</span>
                    <span className="grid h-12 w-16 shrink-0 place-items-center rounded-full border border-[var(--grafite-linha)] group-open:border-marca group-open:bg-marca group-open:text-black">
                      <ArrowUpRight size={22} strokeWidth={1.75} aria-hidden className="mais" />
                    </span>
                  </summary>
                  <p className="mt-3 max-w-2xl pl-8 text-lg text-[var(--grafite-muted)] sm:pl-14">
                    {texto}{" "}
                    <Link href="/como-funciona" className="inline-flex min-h-11 items-center text-[var(--grafite-texto)] underline">Como calculamos</Link>
                  </p>
                </details>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Outros mandatos: faixa amarela com cartões em leque. */}
      <section className="sangria overflow-hidden bg-marca py-24 text-black lg:py-32" aria-labelledby="titulo-outros">
        <div className="mx-auto max-w-[1280px] px-6 text-center lg:px-12">
          <p className="flex items-center justify-center gap-2 text-[15px] font-bold tracking-[0.08em]"><span aria-hidden className="h-2.5 w-2.5 bg-black" /> OUTROS MANDATOS</p>
          <h2 id="titulo-outros" className="mx-auto mt-5 max-w-3xl text-[clamp(2.25rem,4.8vw,4.6rem)] leading-[1.02] font-semibold tracking-[-0.035em]">
            Do Senado à Câmara da sua cidade, quem você elegeu está aqui
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg">
            Senadores, deputados estaduais de todas as Assembleias e prefeitos e vereadores eleitos em 2024.
          </p>
          <div className="mt-8 flex justify-center">
            <Link href="/cidades" className="inline-flex min-h-14 items-center gap-3 rounded-full bg-black py-2 pr-2 pl-6 font-bold text-white">
              Encontre a sua cidade
              <span className="seta-circulo grid h-10 w-10 place-items-center rounded-full bg-marca text-black"><ArrowRight size={18} aria-hidden /></span>
            </Link>
          </div>
          <div className="relative mx-auto mt-16 h-[min(110vw,560px)] max-w-[880px]" data-reveal="rise">
            {[
              { href: "/senadores", img: "senado_plenario", alt: "Plenário do Senado Federal", titulo: "Senadores", texto: "Presença, votos e gastos.", pos: "left-[-6%] sm:left-[2%] rotate-[-8deg] top-[6%]" },
              { href: "/estaduais", img: "assembleia_legislativa", alt: "Sede da Assembleia Legislativa de São Paulo", titulo: "Deputados estaduais", texto: "Os eleitos de cada Assembleia em 2022.", pos: "right-[-6%] sm:right-[2%] rotate-[8deg] top-[6%]" },
              { href: "/cidades", img: "camara_municipal", alt: "Plenário da Câmara Municipal de Curitiba", titulo: "Minha cidade", texto: "Prefeito e vereadores eleitos em 2024.", pos: "left-1/2 -translate-x-1/2 top-0 z-10" },
            ].map((c) => (
              <Link
                key={c.href}
                href={c.href}
                className={`leque-lado absolute w-[54%] rounded-[22px] bg-[#fffdfa] p-3 text-left text-black shadow-[0_18px_40px_rgb(0_0_0/0.18)] sm:w-[36%] ${c.pos}`}
              >
                <Image src={`/images/${c.img}.jpg`} alt={c.alt} width={1200} height={1500} sizes="(min-width: 640px) 320px, 54vw" className="aspect-[4/5] w-full rounded-[14px] object-cover" />
                <span className="titulo mt-3 block text-xl font-medium sm:text-2xl">{c.titulo}</span>
                <span className="block text-[15px] text-[#514d44]">{c.texto}</span>
              </Link>
            ))}
          </div>
          <p className="mt-6 text-xs">Fotos: Senado Federal (CC BY 2.0), Alesp (CC BY 4.0), Câmara Municipal de Curitiba (domínio público)</p>
        </div>
      </section>

      {/* Compare e acompanhe: duas molduras quadradas com prévias nativas. */}
      <section className="py-24 lg:py-32" aria-labelledby="titulo-comparar">
        <div className="grid items-end gap-4 md:grid-cols-[1.3fr_1fr_auto]">
          <h2 id="titulo-comparar" className="text-[clamp(2.5rem,5vw,4.6rem)] leading-none font-medium tracking-[-0.035em]">Compare e acompanhe</h2>
          <p className="text-xl text-ink-2">Duas ferramentas para ir além da ficha.</p>
          <Link href="/alertas/conta" prefetch={false} className="inline-flex min-h-11 items-center underline underline-offset-4">Gerenciar meus alertas</Link>
        </div>
        <div className="mt-10 grid gap-8 md:grid-cols-2 md:gap-5">
          <div>
            <figure aria-hidden className="grid aspect-square place-items-center overflow-hidden rounded-md bg-surface-alt p-6">
              <div className="grid w-full max-w-md grid-cols-2 gap-3" data-reveal="rise">
                {["A", "B"].map((l, j) => (
                  <div key={l} className="rounded-2xl bg-surface p-4">
                    <span className="titulo grid h-12 w-12 place-items-center rounded-full bg-ink text-lg font-bold text-bg">{l}</span>
                    <p className="mt-2 text-sm font-bold">Parlamentar {l}</p>
                    {["Presença", "Votações", "Gastos", "Patrimônio"].map((r, k) => (
                      <div key={r} className="mt-3">
                        <p className="text-xs text-muted">{r}</p>
                        <div className="relative mt-1 h-2 rounded-full bg-track">
                          <span className="absolute inset-y-0 left-0 rounded-full bg-ink" style={{ width: `${[[82, 64, 40, 55], [58, 77, 68, 30]][j][k]}%` }} />
                          <span className="absolute -top-1 h-4 w-0.5 bg-accent" style={{ left: "66%" }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
                <p className="col-span-2 text-center text-xs text-muted">Exemplo</p>
              </div>
            </figure>
            <h3 className="mt-4 text-2xl font-medium">Comparador</h3>
            <p className="text-lg text-ink-2">Ponha até quatro nomes lado a lado, com presença, votos, gastos e patrimônio.</p>
            <div className="mt-4"><SetaBotao href="/comparar">Abrir o comparador</SetaBotao></div>
          </div>
          <div>
            <figure aria-hidden className="grid aspect-square place-items-center overflow-hidden rounded-md bg-grafite p-6">
              <div className="w-full max-w-sm rounded-2xl bg-[#0c1013] p-5 text-[var(--grafite-texto)] ring-1 ring-[var(--grafite-linha)]" data-reveal="rise">
                <p className="text-sm"><Marca /> · <span className="text-[var(--grafite-muted)]">Exemplo de alerta</span></p>
                <div className="mt-4 rounded-xl bg-grafite-2 p-4">
                  <p className="text-xs text-[var(--grafite-muted)]">Votação nominal registrada hoje</p>
                  <p className="font-bold">Deputada Fulana (UF) votou Sim</p>
                </div>
                <div className="mt-2 rounded-xl bg-grafite-2 p-4">
                  <p className="text-xs text-[var(--grafite-muted)]">Projeto</p>
                  <p className="font-bold">Novo projeto apresentado</p>
                </div>
              </div>
            </figure>
            <h3 className="mt-4 text-2xl font-medium">Alertas por e-mail</h3>
            <p className="text-lg text-ink-2">Siga quem você quiser e receba no máximo um e-mail por dia.</p>
            <Link href="/alertas/conta" prefetch={false} className="mt-4 inline-flex min-h-12 items-center rounded-full border border-borda px-6 font-bold">Gerenciar meus alertas</Link>
          </div>
        </div>
      </section>

      {/* De onde vêm os dados: três linhas em escala de cartaz. */}
      <section className="sangria bg-surface-alt py-20 lg:py-28" aria-labelledby="titulo-fontes">
        <div className="mx-auto max-w-[1280px] px-6 lg:px-12">
          <div className="flex justify-between text-[15px] tracking-[0.16em]">
            <h2 id="titulo-fontes" className="font-sans font-bold tracking-[0.16em]">DE ONDE VÊM OS DADOS</h2>
            <span aria-hidden>[03]</span>
          </div>
          <ul className="mt-14 space-y-10 md:text-center">
            {[
              ["Câmara dos Deputados", "https://dadosabertos.camara.leg.br"],
              ["Senado Federal", "https://legis.senado.leg.br/dadosabertos"],
              ["Tribunal Superior Eleitoral", "https://dadosabertos.tse.jus.br"],
            ].map(([nome, url], i) => (
              <li key={url} data-reveal="rise" data-reveal-delay={i * 100}>
                <a href={url} target="_blank" rel="noreferrer" className={`titulo inline-flex min-h-12 items-center gap-4 text-[clamp(2.1rem,5.6vw,5.2rem)] leading-tight font-medium hover:underline ${i === 2 ? "text-muted" : ""}`}>
                  <span aria-hidden className="h-3.5 w-3.5 shrink-0 rounded-full bg-accent" />
                  {nome}
                  <span className="sr-only"> (abre em nova aba)</span>
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-14 text-lg text-muted md:text-center">Presença, votos, projetos e gastos vêm das Casas. Patrimônio e campanhas vêm do TSE. Atualizamos todo dia.</p>
        </div>
      </section>

      {/* Perguntas: título grande à esquerda, acordeão à direita. */}
      <section className="grid gap-10 py-24 lg:grid-cols-[38%_1fr] lg:gap-[4%] lg:py-32" aria-labelledby="titulo-perguntas">
        <div className="lg:sticky lg:top-32 lg:self-start">
          <h2 id="titulo-perguntas" className="text-[clamp(2.6rem,5.4vw,5rem)] leading-[0.95] font-bold tracking-[-0.04em] uppercase">
            Perguntas <span className="block text-muted">antes de ler uma ficha</span>
          </h2>
          <p className="mt-6 max-w-sm text-xl text-muted">Respostas curtas sobre como lemos os dados oficiais.</p>
          <Link href="/como-funciona" className="mt-2 inline-flex min-h-11 items-center underline underline-offset-4">Ler Como funciona</Link>
        </div>
        <div className="space-y-4">
          {perguntas.map(([p, r], i) => (
            <details key={p} open={i === 0} className="group rounded-[14px] border border-line bg-surface open:bg-surface-alt" data-reveal="rise" data-reveal-delay={i * 60}>
              <summary className="flex min-h-[88px] items-center justify-between gap-4 px-6 text-xl font-medium sm:text-2xl">
                <span className="titulo">{p}</span>
                <Plus size={24} strokeWidth={1.75} aria-hidden className="mais shrink-0" />
              </summary>
              <p className="mx-6 border-t border-line pt-4 pb-6 text-lg text-ink-2">{r}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Fechamento: faixa preta com fileiras de palavras e fotos e o selo central. */}
      <section className="sangria relative overflow-hidden bg-black py-20 text-white" aria-labelledby="titulo-fechamento">
        <h2 id="titulo-fechamento" className="sr-only">Escolha alguém para acompanhar</h2>
        <div aria-hidden className="titulo space-y-6 text-[clamp(2rem,3.4vw,3.6rem)] font-bold whitespace-nowrap">
          <div className="flex items-center gap-8 pl-[4%]" data-reveal="slide">
            <span>Busque</span>
            <Image src="/images/plenario_detalhe.jpg" alt="" width={1920} height={1080} sizes="320px" className="h-[clamp(80px,9vw,140px)] w-auto brightness-[0.85]" />
            <span>Leia a ficha</span>
            <Image src="/images/urna_eletronica.jpg" alt="" width={1920} height={1080} sizes="320px" className="h-[clamp(80px,9vw,140px)] w-auto" />
          </div>
          <div className="flex items-center justify-end gap-8 pr-[4%]" data-reveal="rise">
            <Image src="/images/documentos_publicos.jpg" alt="" width={1920} height={1080} sizes="320px" className="h-[clamp(80px,9vw,140px)] w-auto" />
            <span>Siga</span>
            <Image src="/images/plenario_detalhe.jpg" alt="" width={1920} height={1080} sizes="320px" className="h-[clamp(80px,9vw,140px)] w-auto brightness-[0.85]" />
            <span>Compare</span>
          </div>
        </div>
        <a
          href="#lista"
          className="absolute top-1/2 left-1/2 grid h-[clamp(140px,14vw,220px)] w-[clamp(140px,14vw,220px)] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-marca text-black shadow-xl"
        >
          <span className="titulo px-4 text-center text-sm leading-tight font-bold sm:text-base">Escolha alguém para acompanhar</span>
        </a>
        <p className="mt-10 text-center text-xs text-white/60">Fotos: Senado Federal (CC BY 2.0), TSE e Moacir Ximenes (domínio público)</p>
      </section>
    </div>
  );
}
