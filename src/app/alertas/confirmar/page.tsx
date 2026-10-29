import type { Metadata } from "next";

export const metadata: Metadata = { title: "Confirmar alertas", robots: { index: false }, referrer: "no-referrer" };

// A confirmação exige um clique: alguns provedores de e-mail abrem os links sozinhos para checar vírus,
// e isso não pode confirmar uma inscrição que a pessoa não pediu.
export default async function Confirmar({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  return (
    <div className="mx-auto max-w-md space-y-4 rounded-2xl border border-line bg-surface p-6 text-center">
      <h1 className="text-2xl font-bold">Confirmar</h1>
      {t ? (
        <form action="/api/alertas/confirmar" method="post" className="space-y-4">
          <input type="hidden" name="t" value={t} />
          <p className="text-ink-2">Clique no botão para confirmar que este e-mail é seu.</p>
          <button type="submit" className="rounded-lg bg-accent px-6 py-3 font-bold text-white">Confirmar</button>
        </form>
      ) : (
        <p className="text-ink-2">Link incompleto. Abra o link exatamente como veio no e-mail.</p>
      )}
    </div>
  );
}
