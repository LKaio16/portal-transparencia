// Junta notícias recentes sobre cada parlamentar e grava em src/data/noticias.json.
//
// Fontes:
//  - Agência Câmara e Agência Senado (RSS oficiais). Os feeds só trazem as últimas ~20 notícias,
//    por isso o arquivo acumula de um dia para o outro (guarda 90 dias).
//  - GDELT (https://www.gdeltproject.org): base aberta que monitora a imprensa. Limite de 1 consulta a
//    cada 5 segundos; se estiver indisponível, o script segue só com as agências oficiais.
//
// Guardamos só título, veículo, data e link: o leitor lê a notícia no site original.
//
// Uso: node scripts/coletar-noticias.mjs [--sem-imprensa]

import fs from "node:fs";
import path from "node:path";
import { PASTA_SAIDA, normalizarNome } from "./util.mjs";

const ARQUIVO = path.join(PASTA_SAIDA, "noticias.json");
const DIAS_GUARDADOS = 90;
const MAX_POR_PARLAMENTAR = 12;
const SEM_IMPRENSA = process.argv.includes("--sem-imprensa");
const FEEDS = [
  { fonte: "Agência Câmara", url: "https://www.camara.leg.br/noticias/rss/ultimas-noticias" },
  { fonte: "Agência Senado", url: "https://www12.senado.leg.br/noticias/feed/todasnoticias/RSS" },
];
const GDELT = "https://api.gdeltproject.org/api/v2/doc/doc";
const NOMES_POR_CONSULTA = 8;
const PAUSA_GDELT_MS = 6000;

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const semTags = (t) =>
  String(t ?? "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();

function lerRss(xml) {
  const campo = (item, nome) => item.match(new RegExp(`<${nome}[^>]*>([\\s\\S]*?)</${nome}>`))?.[1] ?? "";
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, item]) => ({
    titulo: semTags(campo(item, "title")),
    link: semTags(campo(item, "link")),
    data: new Date(semTags(campo(item, "pubDate"))).toISOString().slice(0, 10),
    // O texto completo (content:encoded) inclui legendas de foto como "Dep. Fulano (PDT - GO)".
    texto: semTags(campo(item, "description") + " " + campo(item, "content:encoded")),
  }));
}

function carregarParlamentares() {
  const ler = (arquivo) => JSON.parse(fs.readFileSync(path.join(PASTA_SAIDA, arquivo), "utf-8"));
  return [
    ...ler("indice.json").map((p) => ({ ...p, chave: `dep:${p.id}` })),
    ...ler("senado-indice.json").map((p) => ({ ...p, chave: `sen:${p.id}` })),
  ].map((p) => ({ ...p, nomeNormalizado: normalizarNome(p.nome) }));
}

// As agências escrevem "deputado Fulano de Tal (PT-SP)". Procuramos esse padrão e só aceitamos
// quando o nome E o estado batem, para não confundir homônimos.
const PADRAO_CITACAO = /((?:[A-ZÀ-Ý][\p{L}'.]+)(?:\s+(?:d[aeo]s?\s+)?[A-ZÀ-Ý][\p{L}'.]+){0,5})\s*\(\s*[\p{L}]+\s*[-–/]\s*([A-Z]{2})\s*\)/gu;

function citadosNoTexto(texto, porUf) {
  const achados = new Set();
  for (const [, nome, uf] of texto.matchAll(PADRAO_CITACAO)) {
    const n = ` ${normalizarNome(nome)}`;
    for (const p of porUf.get(uf) ?? []) if (n.endsWith(` ${p.nomeNormalizado}`)) achados.add(p.chave);
  }
  return achados;
}

async function noticiasOficiais(parlamentares) {
  const porUf = new Map();
  for (const p of parlamentares) {
    if (!porUf.has(p.uf)) porUf.set(p.uf, []);
    porUf.get(p.uf).push(p);
  }
  const resultado = [];
  for (const feed of FEEDS) {
    try {
      const resp = await fetch(feed.url, { headers: { "user-agent": "OlhoNoMandato/0.1 (site de transparencia)" } });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const itens = lerRss(await resp.text());
      let vinculadas = 0;
      for (const item of itens) {
        const citados = citadosNoTexto(`${item.titulo}. ${item.texto}`, porUf);
        if (citados.size) vinculadas++;
        for (const chave of citados) resultado.push({ chave, titulo: item.titulo, link: item.link, fonte: feed.fonte, data: item.data, tipo: "oficial" });
      }
      console.log(`  ${feed.fonte}: ${itens.length} notícias, ${vinculadas} citam parlamentares`);
    } catch (erro) {
      console.warn(`  ${feed.fonte} indisponível: ${erro.message}`);
    }
  }
  return resultado;
}

// Imprensa via GDELT: consulta vários nomes de uma vez e só vincula a notícia se o nome estiver no título.
async function noticiasImprensa(parlamentares) {
  const resultado = [];
  // Nomes de uma palavra só ("Romário", "Cleitinho") geram muitos falsos positivos na imprensa; ficam de fora.
  const elegiveis = parlamentares.filter((p) => p.nomeNormalizado.includes(" "));
  const grupos = [];
  for (let i = 0; i < elegiveis.length; i += NOMES_POR_CONSULTA) grupos.push(elegiveis.slice(i, i + NOMES_POR_CONSULTA));
  console.log(`  imprensa (GDELT): ${grupos.length} consultas, ~${Math.ceil((grupos.length * PAUSA_GDELT_MS) / 60000)} min`);
  let falhasSeguidas = 0;
  for (const [i, grupo] of grupos.entries()) {
    if (i > 0) await esperar(PAUSA_GDELT_MS);
    const termos = grupo.map((p) => `"${p.nome.replace(/"/g, "")}"`).join(" OR ");
    const url = `${GDELT}?query=${encodeURIComponent(`(${termos}) sourcelang:por sourcecountry:BR`)}&mode=artlist&format=json&maxrecords=75&timespan=7d&sort=datedesc`;
    try {
      const resp = await fetch(url, { headers: { "user-agent": "OlhoNoMandato/0.1 (site de transparencia)" } });
      if (resp.status === 429) throw new Error("limite de consultas");
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const texto = await resp.text();
      const artigos = texto.trim().startsWith("{") ? (JSON.parse(texto).articles ?? []) : [];
      for (const a of artigos) {
        const titulo = ` ${normalizarNome(a.title)} `;
        for (const p of grupo) {
          if (!titulo.includes(` ${p.nomeNormalizado} `)) continue;
          const d = String(a.seendate ?? "");
          resultado.push({ chave: p.chave, titulo: String(a.title).trim(), link: a.url, fonte: a.domain, data: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`, tipo: "imprensa" });
        }
      }
      falhasSeguidas = 0;
    } catch (erro) {
      falhasSeguidas++;
      if (falhasSeguidas >= 3) {
        console.warn(`  GDELT indisponível (${erro.message}); seguindo só com as agências oficiais.`);
        break;
      }
      await esperar(PAUSA_GDELT_MS * 3);
    }
  }
  return resultado;
}

async function main() {
  const parlamentares = carregarParlamentares();
  const anteriores = fs.existsSync(ARQUIVO) ? JSON.parse(fs.readFileSync(ARQUIVO, "utf-8")) : {};

  console.log("Buscando notícias...");
  const novas = [...(await noticiasOficiais(parlamentares)), ...(SEM_IMPRENSA ? [] : await noticiasImprensa(parlamentares))];

  const limite = new Date(Date.now() - DIAS_GUARDADOS * 864e5).toISOString().slice(0, 10);
  const ativos = new Set(parlamentares.map((p) => p.chave));
  const saida = {};
  for (const chave of new Set([...Object.keys(anteriores), ...novas.map((n) => n.chave)])) {
    if (!ativos.has(chave)) continue;
    const porLink = new Map();
    for (const n of [...(anteriores[chave] ?? []), ...novas.filter((x) => x.chave === chave)]) {
      if (n.data >= limite && !porLink.has(n.link)) porLink.set(n.link, { titulo: n.titulo, link: n.link, fonte: n.fonte, data: n.data, tipo: n.tipo });
    }
    const lista = [...porLink.values()].sort((a, b) => b.data.localeCompare(a.data)).slice(0, MAX_POR_PARLAMENTAR);
    if (lista.length) saida[chave] = lista;
  }
  fs.writeFileSync(ARQUIVO, JSON.stringify(saida));
  const total = Object.values(saida).reduce((s, l) => s + l.length, 0);
  console.log(`Pronto: ${total} notícias de ${Object.keys(saida).length} parlamentares (${novas.length} encontradas hoje).`);
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
