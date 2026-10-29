import type { Metadata } from "next";
import Link from "next/link";
import localFont from "next/font/local";
import { ExternalLink } from "lucide-react";
import { carregarMeta } from "@/lib/dados";
import { formatarData } from "@/lib/formato";
import Cabecalho, { Marca } from "@/components/Cabecalho";
import { MENU } from "@/lib/menu";
import Revelar from "@/components/Revelar";
import "./globals.css";

// Atkinson: criada para máxima legibilidade, inclusive para baixa visão. Spline Sans: títulos e marca.
const fonteTexto = localFont({
  variable: "--font-texto",
  display: "swap",
  src: [
    { path: "../../public/fonts/atkinson-hyperlegible/AtkinsonHyperlegible-Regular.ttf", weight: "400", style: "normal" },
    { path: "../../public/fonts/atkinson-hyperlegible/AtkinsonHyperlegible-Bold.ttf", weight: "700", style: "normal" },
  ],
});
const fonteTitulo = localFont({
  variable: "--font-spline",
  display: "swap",
  src: [{ path: "../../public/fonts/spline-sans/SplineSans[wght].ttf", weight: "300 700", style: "normal" }],
});

export const metadata: Metadata = {
  title: { default: "Olho no Mandato", template: "%s · Olho no Mandato" },
  description: "Veja de forma simples se deputados federais e senadores estão trabalhando: presença, votos, projetos, gastos e patrimônio.",
};

const FONTES = [
  ["Câmara dos Deputados", "https://dadosabertos.camara.leg.br"],
  ["Senado Federal", "https://legis.senado.leg.br/dadosabertos"],
  ["TSE", "https://dadosabertos.tse.jus.br"],
];

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const meta = carregarMeta("camara");
  return (
    <html lang="pt-BR">
      <body className={`${fonteTexto.variable} ${fonteTitulo.variable} antialiased`}>
        <a href="#conteudo" className="link-pular">Pular para o conteúdo</a>
        <Cabecalho />

        <main id="conteudo" className="mx-auto max-w-6xl px-4 py-8 sm:py-10">{children}</main>

        <footer className="mt-24">
          <div className="mx-auto grid max-w-[1280px] gap-12 px-6 pt-16 pb-12 lg:grid-cols-2 lg:px-12">
            <div className="space-y-6">
              <p className="titulo max-w-xl text-[clamp(1.5rem,2.4vw,2.2rem)] font-medium leading-tight">
                <span className="text-muted">Dados públicos em linguagem simples, </span>para você acompanhar quem elegeu.
              </p>
              <p className="flex items-center gap-2 text-ink-2">
                <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-marca" /> Dados atualizados em {formatarData(meta.atualizadoEm)}
              </p>
              <div className="pt-6">
                <p className="text-[15px] text-muted">Correções</p>
                <Link href="/como-funciona#correcoes" className="inline-flex min-h-11 items-center text-2xl underline underline-offset-4">
                  Encontrou um erro? Avise a gente
                </Link>
              </div>
            </div>
            <div className="grid gap-10 sm:grid-cols-2">
              <div>
                <p className="mb-3 text-[15px] text-muted">Navegação</p>
                <ul>
                  {MENU.map((m) => (
                    <li key={m.href}>
                      <Link href={m.href} className="flex min-h-11 items-center text-xl">{m.rotulo}</Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-3 text-[15px] text-muted">Fontes oficiais</p>
                <ul>
                  {FONTES.map(([nome, url]) => (
                    <li key={url}>
                      <a href={url} target="_blank" rel="noreferrer" className="flex min-h-11 items-center gap-2 text-xl">
                        {nome} <ExternalLink aria-hidden size={18} strokeWidth={1.75} className="text-muted" />
                        <span className="sr-only">(abre em nova aba)</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="sm:col-span-2" data-reveal="rise">
                <p className="text-[clamp(3rem,7vw,7rem)] leading-[0.9] tracking-[-0.05em]"><Marca /></p>
                <p className="titulo mt-2 text-2xl font-semibold lg:text-[32px]">Transparência para todos</p>
              </div>
            </div>
          </div>
          <div className="bg-grafite text-[var(--grafite-texto)]">
            <div className="mx-auto flex max-w-[1280px] flex-col gap-2 px-6 py-5 text-[15px] sm:flex-row sm:items-center sm:justify-between lg:px-12">
              <p>© {new Date().getFullYear()} Olho no Mandato. Site independente e apartidário, feito com dados abertos.</p>
              <div className="flex flex-wrap gap-x-6">
                <Link href="/privacidade" className="flex min-h-11 items-center">Privacidade</Link>
                <Link href="/como-funciona" className="flex min-h-11 items-center">Como funciona</Link>
                <Link href="/alertas/conta" prefetch={false} className="flex min-h-11 items-center">Meus alertas</Link>
              </div>
            </div>
          </div>
        </footer>
        <Revelar />
      </body>
    </html>
  );
}
