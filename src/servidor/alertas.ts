// Regras dos alertas por e-mail: inscrição com confirmação (double opt-in), acesso por link mágico,
// descadastro e exclusão de dados. Só roda no servidor.
//
// Nunca guardamos tokens em texto puro, só o hash SHA-256: se o banco vazar, os links não funcionam.

import crypto from "node:crypto";
import indiceCamara from "@/data/indice.json";
import indiceSenado from "@/data/senado-indice.json";
import { consultar } from "./banco.mjs";
import { enviarEmail, escapar, layoutEmail, urlDoSite } from "./email.mjs";
import { assinaturaValida } from "./tokens.mjs";

export const COOKIE_SESSAO = "olho_sessao";
const HORAS_PARA_CONFIRMAR = 24;
const MAX_PARLAMENTARES = 20;

type ResumoAlerta = { chave: string; nome: string; partido: string; uf: string; cargo: string; rota: string };

const PARLAMENTARES = new Map<string, ResumoAlerta>([
  ...indiceCamara.map((p): [string, ResumoAlerta] => [`dep-${p.id}`, { chave: `dep-${p.id}`, nome: p.nome, partido: p.partido, uf: p.uf, cargo: "Deputado(a)", rota: `/deputado/${p.id}` }]),
  ...indiceSenado.map((p): [string, ResumoAlerta] => [`sen-${p.id}`, { chave: `sen-${p.id}`, nome: p.nome, partido: p.partido, uf: p.uf, cargo: "Senador(a)", rota: `/senador/${p.id}` }]),
]);

export const buscarParlamentar = (chave: string) => PARLAMENTARES.get(chave) ?? null;

export const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");
const novoToken = () => {
  const token = crypto.randomBytes(32).toString("base64url");
  return { token, hash: hashToken(token) };
};
export const hashIp = (ip: string) =>
  crypto.createHash("sha256").update(`${process.env.SEGREDO_SITE ?? "dev-apenas-local"}:${ip}`).digest("hex").slice(0, 32);

const EMAIL_VALIDO = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;
export const normalizarEmail = (email: string) => email.trim().toLowerCase();
export const emailValido = (email: string) => EMAIL_VALIDO.test(email) && email.length <= 254;

/** Registra uma tentativa e diz se ainda está dentro do limite. */
export async function dentroDoLimite(chave: string, maximo: number, janelaMinutos: number) {
  const [{ total }] = await consultar(
    `SELECT count(*)::int AS total FROM tentativas WHERE chave = $1 AND criado_em > now() - ($2 || ' minutes')::interval`,
    [chave, String(janelaMinutos)],
  );
  if (total >= maximo) return false;
  await consultar(`INSERT INTO tentativas (chave) VALUES ($1)`, [chave]);
  return true;
}

async function criarPendente(email: string, parlamentar: string | null) {
  const { token, hash } = novoToken();
  await consultar(`INSERT INTO pendentes (token_hash, email, parlamentar, expira_em) VALUES ($1, $2, $3, now() + ($4 || ' hours')::interval)`, [
    hash,
    email,
    parlamentar,
    String(HORAS_PARA_CONFIRMAR),
  ]);
  return `${urlDoSite()}/alertas/confirmar?t=${token}`;
}

/** Pedido para seguir um parlamentar: sempre manda um e-mail de confirmação, mesmo para quem já é inscrito. */
export async function pedirInscricao(email: string, chave: string) {
  const p = buscarParlamentar(chave);
  if (!p) throw new Error("parlamentar inválido");
  const link = await criarPendente(email, chave);
  await enviarEmail({
    para: email,
    assunto: `Confirme: alertas sobre ${p.nome}`,
    html: layoutEmail({
      titulo: `Confirme seus alertas sobre ${p.nome}`,
      corpo: `<p>Recebemos um pedido para enviar a este e-mail novidades sobre <strong>${escapar(p.nome)}</strong> (${escapar(p.cargo)}, ${escapar(p.partido)}-${escapar(p.uf)}): votações, projetos apresentados e notícias.</p>
<p><a href="${link}" style="display:inline-block;background:#2a78d6;color:#ffffff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">Confirmar alertas</a></p>
<p style="font-size:13px;color:#52514e">O link vale por ${HORAS_PARA_CONFIRMAR} horas. Se não foi você, é só ignorar este e-mail: nada será enviado.</p>`,
    }),
    texto: `Confirme seus alertas sobre ${p.nome}: ${link}\n\nSe não foi você, ignore este e-mail.`,
  });
}

/** Link de acesso à conta. Responde igual exista ou não o e-mail, para não revelar quem é inscrito. */
export async function pedirAcesso(email: string) {
  const [inscrito] = await consultar(`SELECT id FROM inscritos WHERE email = $1 AND confirmado_em IS NOT NULL`, [email]);
  if (!inscrito) return;
  const link = await criarPendente(email, null);
  await enviarEmail({
    para: email,
    assunto: "Seu link para gerenciar os alertas",
    html: layoutEmail({
      titulo: "Gerenciar seus alertas",
      corpo: `<p>Use o botão abaixo para ver e mudar quem você acompanha.</p>
<p><a href="${link}" style="display:inline-block;background:#2a78d6;color:#ffffff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">Abrir minha conta</a></p>
<p style="font-size:13px;color:#52514e">O link vale por ${HORAS_PARA_CONFIRMAR} horas e só pode ser usado uma vez.</p>`,
    }),
    texto: `Abra sua conta de alertas: ${link}`,
  });
}

/**
 * Confirma um pedido pendente: cria (ou reaproveita) o inscrito, adiciona o parlamentar seguido e
 * devolve um token de acesso novo para guardar no cookie. Cada confirmação troca o token antigo.
 */
export async function confirmar(tokenPendente: string) {
  const [pendente] = await consultar(`DELETE FROM pendentes WHERE token_hash = $1 AND expira_em > now() RETURNING email, parlamentar`, [
    hashToken(tokenPendente),
  ]);
  if (!pendente) return null;
  const acesso = novoToken();
  const [inscrito] = await consultar(
    `INSERT INTO inscritos (email, token_acesso_hash, consentimento_em, confirmado_em)
     VALUES ($1, $2, now(), now())
     ON CONFLICT (email) DO UPDATE SET token_acesso_hash = EXCLUDED.token_acesso_hash,
       confirmado_em = COALESCE(inscritos.confirmado_em, now())
     RETURNING id`,
    [pendente.email, acesso.hash],
  );
  let adicionado = null;
  if (pendente.parlamentar && buscarParlamentar(pendente.parlamentar)) {
    const [{ total }] = await consultar(`SELECT count(*)::int AS total FROM seguindo WHERE inscrito_id = $1`, [inscrito.id]);
    if (total < MAX_PARLAMENTARES) {
      await consultar(`INSERT INTO seguindo (inscrito_id, parlamentar) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [inscrito.id, pendente.parlamentar]);
      adicionado = buscarParlamentar(pendente.parlamentar);
    }
  }
  return { tokenAcesso: acesso.token, adicionado };
}

export async function buscarConta(tokenAcesso: string | undefined) {
  if (!tokenAcesso) return null;
  const [inscrito] = await consultar(`SELECT id, email, confirmado_em FROM inscritos WHERE token_acesso_hash = $1`, [hashToken(tokenAcesso)]);
  if (!inscrito) return null;
  const linhas = await consultar(`SELECT parlamentar FROM seguindo WHERE inscrito_id = $1 ORDER BY criado_em`, [inscrito.id]);
  return {
    id: inscrito.id as number,
    email: inscrito.email as string,
    seguindo: linhas.map((l) => buscarParlamentar(l.parlamentar)).filter((p): p is ResumoAlerta => Boolean(p)),
  };
}

export async function deixarDeSeguir(tokenAcesso: string | undefined, chave: string) {
  const conta = await buscarConta(tokenAcesso);
  if (!conta) return false;
  await consultar(`DELETE FROM seguindo WHERE inscrito_id = $1 AND parlamentar = $2`, [conta.id, chave]);
  return true;
}

/** Apaga o e-mail e tudo ligado a ele (direito de exclusão da LGPD). */
export async function excluirConta(tokenAcesso: string | undefined) {
  const conta = await buscarConta(tokenAcesso);
  if (!conta) return false;
  await consultar(`DELETE FROM inscritos WHERE id = $1`, [conta.id]);
  await consultar(`DELETE FROM pendentes WHERE email = $1`, [conta.email]);
  return true;
}

/** Descadastro pelo link do rodapé dos e-mails: apaga a inscrição inteira. */
export async function sairPorLink(id: string, assinatura: string) {
  if (!assinaturaValida(id, assinatura)) return false;
  const linhas = await consultar(`DELETE FROM inscritos WHERE id = $1 RETURNING email`, [Number(id)]);
  if (linhas[0]) await consultar(`DELETE FROM pendentes WHERE email = $1`, [linhas[0].email]);
  return linhas.length > 0;
}
