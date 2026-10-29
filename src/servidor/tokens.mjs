// Link de descadastro assinado: não precisa ser guardado no banco e não pode ser forjado sem o segredo.

import crypto from "node:crypto";
import { urlDoSite } from "./email.mjs";

function segredo() {
  const s = process.env.SEGREDO_SITE;
  if (!s && process.env.NODE_ENV === "production") throw new Error("Defina a variável SEGREDO_SITE em produção.");
  return s ?? "dev-apenas-local";
}

const assinar = (id) => crypto.createHmac("sha256", segredo()).update(`sair:${id}`).digest("base64url");

/** @param {number} id */
export const linkSair = (id) => `${urlDoSite()}/alertas/sair?i=${id}&t=${assinar(id)}`;

/** @param {string} id @param {string} token */
export function assinaturaValida(id, token) {
  if (!/^\d+$/.test(String(id)) || typeof token !== "string") return false;
  const esperado = Buffer.from(assinar(Number(id)));
  const recebido = Buffer.from(token);
  return esperado.length === recebido.length && crypto.timingSafeEqual(esperado, recebido);
}
