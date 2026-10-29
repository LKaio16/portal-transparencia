import type { Metadata } from "next";
import Link from "next/link";
import { Atkinson_Hyperlegible } from "next/font/google";
import { carregarMeta } from "@/lib/dados";
import { formatarData } from "@/lib/formato";
import "./globals.css";

// Fonte criada para máxima legibilidade, inclusive para pessoas com baixa visão.
const fonteTexto = Atkinson_Hyperlegible({
  variable: "--font-texto",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: { default: "Olho no Mandato", template: "%s · Olho no Mandato" },
  description: "Veja de forma simples se deputados federais e senadores estão trabalhando: presença, votos, projetos, gastos e patrimônio.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const meta = carregarMeta("camara");
  return (
    <html lang="pt-BR">
      <body className={`${fonteTexto.variable} antialiased`}>
        <header className="border-b border-line bg-surface">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg">
              <span aria-hidden className="grid h-8 w-8 place-items-center rounded-full bg-accent text-white">👁</span>
              Olho no Mandato
            </Link>
            <nav className="flex flex-wrap gap-x-4 gap-y-1 text-base">
              <Link href="/cidades" className="hover:underline">Minha cidade</Link>
              <Link href="/" className="hover:underline">Deputados</Link>
              <Link href="/senadores" className="hover:underline">Senadores</Link>
              <Link href="/estaduais" className="hover:underline">Estaduais</Link>
              <Link href="/comparar" className="hover:underline">Comparar</Link>
              <Link href="/alertas/conta" prefetch={false} className="hover:underline">Meus alertas</Link>
              <Link href="/como-funciona" className="hover:underline">Como funciona</Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
        <footer className="mt-12 border-t border-line bg-surface">
          <div className="mx-auto max-w-5xl px-4 py-6 text-sm text-ink-2 space-y-2">
            <p>
              Dados oficiais da{" "}
              <a className="underline" href="https://dadosabertos.camara.leg.br" target="_blank" rel="noreferrer">Câmara dos Deputados</a>, do{" "}
              <a className="underline" href="https://legis.senado.leg.br/dadosabertos" target="_blank" rel="noreferrer">Senado Federal</a> e do{" "}
              <a className="underline" href="https://dadosabertos.tse.jus.br" target="_blank" rel="noreferrer">TSE</a>. Atualizado em{" "}
              {formatarData(meta.atualizadoEm)}.
            </p>
            <p>
              Site independente e apartidário. Encontrou um erro?{" "}
              <Link href="/como-funciona#correcoes" className="underline">Avise a gente</Link>.{" "}
              <Link href="/privacidade" className="underline">Privacidade</Link>.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
