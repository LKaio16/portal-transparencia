import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { COOKIE_SESSAO, buscarConta, buscarParlamentar } from "@/servidor/alertas";

export const metadata: Metadata = { title: "Meus alertas", robots: { index: false } };
export const dynamic = "force-dynamic";

const MENSAGENS: Record<string, string> = {
  "link-enviado": "Se este e-mail tiver alertas cadastrados, enviamos um link de acesso. Confira sua caixa de entrada (e o spam).",
  "email-invalido": "Digite um e-mail válido.",
  "link-expirado": "Este link expirou ou já foi usado. Peça um novo abaixo.",
  entrou: "Você entrou na sua conta.",
  removido: "Pronto, você não vai mais receber alertas sobre esse parlamentar.",
  excluido: "Seus dados foram apagados. Você não vai mais receber nenhum e-mail.",
  erro: "Algo deu errado do nosso lado. Tente de novo em instantes.",
};

export default async function Conta({ searchParams }: { searchParams: Promise<{ msg?: string; p?: string }> }) {
  const { msg, p } = await searchParams;
  const conta = await buscarConta((await cookies()).get(COOKIE_SESSAO)?.value);
  const aviso = msg === "seguindo" ? `Tudo certo! Você vai receber alertas sobre ${buscarParlamentar(p ?? "")?.nome ?? "este parlamentar"}.` : msg && MENSAGENS[msg];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-3xl font-bold">Meus alertas</h1>
      {aviso && (
        <p role="status" className="rounded-xl border border-accent bg-accent-soft p-4">{aviso}</p>
      )}

      {conta ? (
        <>
          <section className="space-y-3 rounded-2xl border border-line bg-surface p-5">
            <p className="text-ink-2">
              Alertas enviados para <strong className="text-ink">{conta.email}</strong>. Mandamos no máximo um e-mail por dia, só quando
              houver novidade.
            </p>
            <h2 className="text-xl font-bold">Quem você acompanha</h2>
            {conta.seguindo.length ? (
              <ul className="divide-y divide-line">
                {conta.seguindo.map((s) => (
                  <li key={s.chave} className="flex items-center justify-between gap-3 py-3">
                    <span>
                      <Link href={s.rota} className="font-bold underline">{s.nome}</Link>{" "}
                      <span className="text-sm text-ink-2">{s.cargo} · {s.partido}-{s.uf}</span>
                    </span>
                    <form action="/api/alertas/deixar" method="post">
                      <input type="hidden" name="parlamentar" value={s.chave} />
                      <button type="submit" className="text-sm underline">Parar de seguir</button>
                    </form>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-ink-2">
                Você não acompanha ninguém ainda. Abra a ficha de um <Link href="/" className="underline">deputado</Link> ou{" "}
                <Link href="/senadores" className="underline">senador</Link> e clique em &quot;Receber alertas&quot;.
              </p>
            )}
          </section>

          <section className="space-y-3 rounded-2xl border border-line bg-surface p-5">
            <h2 className="text-xl font-bold">Seus dados</h2>
            <p className="text-ink-2">
              Guardamos só o seu e-mail e a lista de quem você acompanha. Você pode apagar tudo a qualquer momento.{" "}
              <Link href="/privacidade" className="underline">Política de privacidade</Link>.
            </p>
            <div className="flex flex-wrap gap-3">
              <form action="/api/alertas/excluir" method="post">
                <button type="submit" className="rounded-lg border border-ink px-4 py-2 font-bold">Apagar meus dados e cancelar tudo</button>
              </form>
              <form action="/api/alertas/sair-dispositivo" method="post">
                <button type="submit" className="px-2 py-2 text-ink-2 underline">Sair deste aparelho</button>
              </form>
            </div>
          </section>
        </>
      ) : (
        <section className="space-y-3 rounded-2xl border border-line bg-surface p-5">
          <p className="text-ink-2">
            Aqui você vê e muda quem acompanha. Não precisa de senha: digite seu e-mail e enviamos um link de acesso.
          </p>
          <form action="/api/alertas/acesso" method="post" className="flex flex-col gap-3 sm:flex-row">
            <label className="flex-1">
              <span className="sr-only">Seu e-mail</span>
              <input type="email" name="email" required autoComplete="email" placeholder="seu@email.com" className="w-full rounded-lg border border-line bg-bg px-3 py-2" />
            </label>
            <button type="submit" className="rounded-lg bg-accent px-4 py-2 font-bold text-white">Receber link de acesso</button>
          </form>
        </section>
      )}
    </div>
  );
}
