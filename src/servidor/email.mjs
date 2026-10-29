// Envio de e-mails.
// - Com RESEND_API_KEY: envia de verdade pelo Resend (https://resend.com, plano gratuito de 3 mil e-mails/mês).
// - Sem a chave: grava o e-mail como arquivo HTML em data/emails-enviados, para testar sem enviar nada.

import fs from "node:fs";
import path from "node:path";

const REMETENTE = process.env.EMAIL_REMETENTE ?? "Olho no Mandato <alertas@exemplo.com.br>";

// Na Vercel, sem SITE_URL, usa o endereço de produção que ela mesma informa.
export const urlDoSite = () =>
  (
    process.env.SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000")
  ).replace(/\/$/, "");

const escapar = (t) => String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
export { escapar };

/**
 * Envolve o conteúdo no layout padrão dos e-mails, com o link de descadastro no rodapé.
 * @param {{ titulo: string, corpo: string, linkSair?: string }} opcoes
 */
export function layoutEmail({ titulo, corpo, linkSair }) {
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f6f5f2;font-family:Arial,Helvetica,sans-serif;color:#0b0b0b">
<div style="max-width:560px;margin:0 auto;padding:24px 16px">
  <p style="font-weight:bold;font-size:18px;margin:0 0 16px">👁 Olho no Mandato</p>
  <div style="background:#ffffff;border:1px solid #e3e1db;border-radius:12px;padding:20px">
    <h1 style="font-size:20px;margin:0 0 12px">${escapar(titulo)}</h1>
    ${corpo}
  </div>
  <p style="font-size:12px;color:#52514e;line-height:1.5;margin-top:16px">
    Você recebe este e-mail porque pediu alertas no Olho no Mandato, site independente e apartidário.
    ${linkSair ? `<a href="${linkSair}" style="color:#52514e">Cancelar todos os alertas</a> · ` : ""}
    <a href="${urlDoSite()}/alertas/conta" style="color:#52514e">Gerenciar alertas</a> ·
    <a href="${urlDoSite()}/privacidade" style="color:#52514e">Privacidade</a>
  </p>
</div></body></html>`;
}

/**
 * @param {{ para: string, assunto: string, html: string, texto: string, linkSair?: string }} msg
 */
export async function enviarEmail({ para, assunto, html, texto, linkSair }) {
  // Cabeçalhos que permitem descadastro com um clique no Gmail/Outlook.
  const cabecalhos = linkSair
    ? { "List-Unsubscribe": `<${linkSair.replace("/alertas/sair", "/api/alertas/sair")}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" }
    : {};

  if (!process.env.RESEND_API_KEY) {
    const pasta = path.join(process.cwd(), "data", "emails-enviados");
    fs.mkdirSync(pasta, { recursive: true });
    const nome = `${new Date().toISOString().replace(/[:.]/g, "-")}-${para.replace(/[^a-z0-9@._-]/gi, "_")}.html`;
    fs.writeFileSync(path.join(pasta, nome), `<!-- Para: ${para} | Assunto: ${assunto} -->\n${html}`);
    console.log(`[e-mail de teste] para ${para}: "${assunto}" -> data/emails-enviados/${nome}`);
    return;
  }

  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: REMETENTE, to: [para], subject: assunto, html, text: texto, headers: cabecalhos }),
  });
  if (!resp.ok) throw new Error(`Falha ao enviar e-mail: HTTP ${resp.status} ${await resp.text()}`);
}
