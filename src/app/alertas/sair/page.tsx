import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Cancelar alertas", robots: { index: false }, referrer: "no-referrer" };

export default async function Sair({ searchParams }: { searchParams: Promise<{ i?: string; t?: string; feito?: string }> }) {
  const { i, t, feito } = await searchParams;
  return (
    <div className="mx-auto max-w-md space-y-4 rounded-2xl border border-line bg-surface p-6 text-center">
      <h1 className="text-2xl font-bold">Cancelar alertas</h1>
      {feito === "1" ? (
        <p>Pronto. Seu e-mail foi apagado e você não vai mais receber alertas.</p>
      ) : feito === "0" ? (
        <p className="text-ink-2">
          Este link não é válido ou o cadastro já foi apagado. Se ainda receber e-mails, use a página{" "}
          <Link href="/alertas/conta" className="underline">Meus alertas</Link>.
        </p>
      ) : i && t ? (
        <form action="/api/alertas/sair" method="post" className="space-y-4">
          <input type="hidden" name="i" value={i} />
          <input type="hidden" name="t" value={t} />
          <p className="text-ink-2">Isso cancela todos os alertas e apaga seu e-mail da nossa base.</p>
          <button type="submit" className="rounded-lg bg-accent px-6 py-3 font-bold text-white">Cancelar todos os alertas</button>
        </form>
      ) : (
        <p className="text-ink-2">Link incompleto. Abra o link exatamente como veio no e-mail.</p>
      )}
    </div>
  );
}
