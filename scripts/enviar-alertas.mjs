// Envia o resumo diário para quem segue parlamentares: votações, projetos novos e notícias desde o último envio.
// Rode depois das coletas do dia. Também limpa pedidos expirados e registros antigos de controle de abuso.
//
// Uso: node scripts/enviar-alertas.mjs
// Variáveis: DATABASE_URL (sem ela usa o banco local), RESEND_API_KEY (sem ela grava os e-mails em arquivo),
//            SITE_URL (endereço público do site), SEGREDO_SITE (assina os links de descadastro).

import fs from "node:fs";
import path from "node:path";
import { PASTA_SAIDA } from "./util.mjs";
import { consultar, fecharBanco } from "../src/servidor/banco.mjs";
import { enviarEmail, escapar, layoutEmail, urlDoSite } from "../src/servidor/email.mjs";
import { linkSair } from "../src/servidor/tokens.mjs";

const MAX_ITENS_POR_SECAO = 5;
const hoje = new Date().toISOString().slice(0, 10);
const noticias = JSON.parse(fs.readFileSync(path.join(PASTA_SAIDA, "noticias.json"), "utf-8"));
const formatarData = (iso) => iso.split("-").reverse().join("/");

const cache = new Map();
function carregar(chave) {
  if (cache.has(chave)) return cache.get(chave);
  const [prefixo, id] = chave.split("-");
  const pasta = prefixo === "dep" ? "deputados" : "senadores";
  const arquivo = path.join(PASTA_SAIDA, pasta, `${Number(id)}.json`);
  const dados = fs.existsSync(arquivo)
    ? { ...JSON.parse(fs.readFileSync(arquivo, "utf-8")), rota: `/${prefixo === "dep" ? "deputado" : "senador"}/${Number(id)}`, prefixo }
    : null;
  cache.set(chave, dados);
  return dados;
}

// Novidades de um parlamentar com data posterior a `desde` (AAAA-MM-DD).
function novidades(chave, desde) {
  const p = carregar(chave);
  if (!p) return null;
  const votos = p.votacoes.recentes.filter((v) => v.data > desde);
  const projetos = p.proposicoes.lista.filter((x) => x.data > desde);
  const lidas = (noticias[`${p.prefixo}:${p.id}`] ?? []).filter((n) => n.data > desde);
  if (!votos.length && !projetos.length && !lidas.length) return null;
  return { p, votos, projetos, noticias: lidas };
}

function lista(itens, render) {
  const mostrados = itens.slice(0, MAX_ITENS_POR_SECAO).map(render).join("");
  const resto = itens.length - MAX_ITENS_POR_SECAO;
  return `<ul style="padding-left:18px;margin:6px 0 12px">${mostrados}</ul>${resto > 0 ? `<p style="font-size:13px;margin:0 0 12px">e mais ${resto}.</p>` : ""}`;
}

function blocoParlamentar({ p, votos, projetos, noticias }) {
  const site = urlDoSite();
  let html = `<h2 style="font-size:17px;margin:20px 0 4px"><a href="${site}${p.rota}" style="color:#0b0b0b">${escapar(p.nome)}</a> <span style="font-weight:normal;color:#52514e;font-size:14px">${escapar(p.partido)}-${escapar(p.uf)}</span></h2>`;
  if (votos.length) {
    html += `<p style="margin:8px 0 0;font-weight:bold">🗳️ Votações</p>`;
    html += lista(votos, (v) => `<li style="margin-bottom:6px">${formatarData(v.data)} · <strong>${escapar(v.voto)}</strong>${v.materia ? ` em ${escapar(v.materia)}` : ""}${v.ementa ? `: ${escapar(v.ementa.slice(0, 160))}${v.ementa.length > 160 ? "…" : ""}` : ""}</li>`);
  }
  if (projetos.length) {
    html += `<p style="margin:8px 0 0;font-weight:bold">📄 Projetos apresentados</p>`;
    html += lista(projetos, (x) => `<li style="margin-bottom:6px">${escapar(x.sigla)} ${x.numero}/${x.ano}: ${escapar(x.ementa.slice(0, 160))}${x.ementa.length > 160 ? "…" : ""}</li>`);
  }
  if (noticias.length) {
    html += `<p style="margin:8px 0 0;font-weight:bold">📰 Notícias</p>`;
    html += lista(noticias, (n) => `<li style="margin-bottom:6px"><a href="${escapar(n.link)}" style="color:#2a78d6">${escapar(n.titulo)}</a> <span style="color:#52514e">(${escapar(n.fonte)})</span></li>`);
  }
  return html + `<p style="margin:0"><a href="${site}${p.rota}" style="color:#2a78d6">Ver ficha completa</a></p>`;
}

async function main() {
  await consultar(`DELETE FROM pendentes WHERE expira_em < now()`);
  await consultar(`DELETE FROM tentativas WHERE criado_em < now() - interval '1 day'`);

  const inscritos = await consultar(
    `SELECT i.id, i.email, COALESCE(i.ultimo_envio, i.confirmado_em::date) AS desde, array_agg(s.parlamentar) AS seguindo
     FROM inscritos i JOIN seguindo s ON s.inscrito_id = i.id
     WHERE i.confirmado_em IS NOT NULL AND (i.ultimo_envio IS NULL OR i.ultimo_envio < $1::date)
     GROUP BY i.id`,
    [hoje],
  );
  console.log(`${inscritos.length} inscrito(s) para verificar.`);

  let enviados = 0;
  for (const inscrito of inscritos) {
    const desde = new Date(inscrito.desde).toISOString().slice(0, 10);
    const blocos = inscrito.seguindo.map((chave) => novidades(chave, desde)).filter(Boolean);
    if (!blocos.length) continue;
    const nomes = blocos.map((b) => b.p.nome);
    const assunto = nomes.length === 1 ? `Novidades sobre ${nomes[0]}` : `Novidades sobre ${nomes.slice(0, 2).join(", ")}${nomes.length > 2 ? ` e mais ${nomes.length - 2}` : ""}`;
    const sair = linkSair(inscrito.id);
    try {
      await enviarEmail({
        para: inscrito.email,
        assunto,
        linkSair: sair,
        html: layoutEmail({
          titulo: "O que aconteceu desde o último alerta",
          corpo: `<p style="color:#52514e;margin:0">Dados oficiais da Câmara, do Senado e notícias desde ${formatarData(desde)}.</p>${blocos.map(blocoParlamentar).join("")}`,
          linkSair: sair,
        }),
        texto: `${assunto}\n\n${blocos.map((b) => `${b.p.nome}: ${b.votos.length} votação(ões), ${b.projetos.length} projeto(s), ${b.noticias.length} notícia(s). ${urlDoSite()}${b.p.rota}`).join("\n")}\n\nCancelar: ${sair}`,
      });
      await consultar(`UPDATE inscritos SET ultimo_envio = $1::date WHERE id = $2`, [hoje, inscrito.id]);
      enviados++;
    } catch (erro) {
      console.warn(`  falha ao enviar para o inscrito ${inscrito.id}: ${erro.message}`);
    }
  }
  console.log(`Pronto: ${enviados} e-mail(s) enviados.`);
  await fecharBanco();
}

main().catch(async (erro) => {
  console.error(erro);
  await fecharBanco();
  process.exit(1);
});
