"use client";

import { useState } from "react";
import Link from "next/link";

// Caixa "Receber alertas" da ficha. Manda o pedido e o servidor envia o e-mail de confirmação.
export default function SeguirParlamentar({ chave, nome }: { chave: string; nome: string }) {
  const [estado, setEstado] = useState<"fechado" | "aberto" | "enviando" | "ok" | "erro">("fechado");
  const [mensagem, setMensagem] = useState("");

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEstado("enviando");
    try {
      const resp = await fetch("/api/alertas/inscrever", { method: "POST", body: new FormData(evento.currentTarget) });
      const dados = await resp.json();
      setMensagem(dados.mensagem);
      setEstado(dados.ok ? "ok" : "erro");
    } catch {
      setMensagem("Não foi possível enviar agora. Tente de novo em instantes.");
      setEstado("erro");
    }
  }

  if (estado === "fechado") {
    return (
      <button
        onClick={() => setEstado("aberto")}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-accent bg-accent-soft px-5 py-4 font-bold text-accent transition hover:bg-surface sm:w-auto"
      >
        <span aria-hidden>🔔</span> Receber alertas sobre {nome}
      </button>
    );
  }

  if (estado === "ok") {
    return (
      <p role="status" className="rounded-xl border border-accent bg-accent-soft p-4">
        ✉️ {mensagem}
      </p>
    );
  }

  return (
    <form onSubmit={enviar} className="cartao space-y-4 p-5 sm:p-6">
      <p className="font-bold">Receba por e-mail quando {nome} votar, apresentar projetos ou aparecer nas notícias.</p>
      <input type="hidden" name="parlamentar" value={chave} />
      {/* Campo-isca: invisível para pessoas, robôs costumam preencher. */}
      <input type="text" name="site" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      <label className="block space-y-1.5">
        <span className="text-sm font-bold text-ink-2">Seu e-mail</span>
        <input type="email" name="email" required autoComplete="email" className="campo" />
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="consentimento" value="sim" required className="mt-1 h-4 w-4" />
        <span>
          Concordo em receber e-mails de alertas e com a <Link href="/privacidade" className="underline">política de privacidade</Link>.
          Posso cancelar quando quiser.
        </span>
      </label>
      {estado === "erro" && <p role="alert" className="text-sm font-bold">{mensagem}</p>}
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={estado === "enviando"} className="botao">
          {estado === "enviando" ? "Enviando..." : "Quero receber"}
        </button>
        <button type="button" onClick={() => setEstado("fechado")} className="px-2 py-2 text-ink-2 underline">Cancelar</button>
      </div>
    </form>
  );
}
