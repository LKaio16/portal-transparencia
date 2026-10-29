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
  description: "Veja de forma simples se os deputados federais estão trabalhando: presença, votos, projetos e gastos.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const meta = carregarMeta();
  return (
    <html lang="pt-BR">
      <body className={`${fonteTexto.variable} antialiased`}>
        <header className="border-b border-line bg-surface">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg">
              <span aria-hidden className="grid h-8 w-8 place-items-center rounded-full bg-accent text-white">👁</span>
              Olho no Mandato
            </Link>
            <nav className="flex gap-4 text-base">
              <Link href="/" className="hover:underline">Deputados</Link>
              <Link href="/como-funciona" className="hover:underline">Como funciona</Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
        <footer className="mt-12 border-t border-line bg-surface">
          <div className="mx-auto max-w-5xl px-4 py-6 text-sm text-ink-2 space-y-2">
            <p>
              Dados oficiais da{" "}
              <a className="underline" href="https://dadosabertos.camara.leg.br" target="_blank" rel="noreferrer">
                Câmara dos Deputados (Dados Abertos)
              </a>
              . Atualizado em {formatarData(meta.atualizadoEm)}.
            </p>
            <p>
              Site independente e apartidário. Encontrou um erro?{" "}
              <Link href="/como-funciona#correcoes" className="underline">Avise a gente</Link>.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
