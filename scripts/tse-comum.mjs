// Funções compartilhadas pelos cruzamentos com o TSE (federais, estaduais e municipais).

import fs from "node:fs";
import path from "node:path";
import { unzipSync } from "fflate";
import { PASTA_RAW, linhasCsv } from "./util.mjs";

export const PASTA_TSE = path.join(PASTA_RAW, "tse");
export const CDN = "https://cdn.tse.jus.br/estatistica/sead/odsele";

export async function arquivoTse(nomeCsv, urlZip) {
  const destino = path.join(PASTA_TSE, nomeCsv);
  if (fs.existsSync(destino)) return destino;
  fs.mkdirSync(PASTA_TSE, { recursive: true });
  console.log(`Baixando ${urlZip} (só na primeira vez)...`);
  const resp = await fetch(urlZip);
  if (!resp.ok) throw new Error(`Falha ao baixar ${urlZip}: HTTP ${resp.status}`);
  const zip = new Uint8Array(await resp.arrayBuffer());
  const arquivos = unzipSync(zip, { filter: (f) => f.name.endsWith(nomeCsv) });
  const conteudo = Object.values(arquivos)[0];
  if (!conteudo) throw new Error(`${nomeCsv} não encontrado em ${urlZip}`);
  fs.writeFileSync(destino, conteudo);
  return destino;
}

export const lerTse = (arquivo) => linhasCsv(arquivo, { encoding: "latin1" });
export const valido = (v) => v && !String(v).startsWith("#NULO") && v !== "-1" && v !== "-4";
// "JUIZ DE FORA" -> "Juiz de Fora": preposições ficam em minúsculas (menos no começo).
const MINUSCULAS = new Set(["de", "da", "do", "das", "dos", "e", "d'"]);
export const titulo = (t) =>
  String(t ?? "")
    .toLowerCase()
    .split(/(\s+)/)
    .map((p, i) => (i > 0 && MINUSCULAS.has(p) ? p : p.replace(/(^|-)\p{L}/gu, (c) => c.toUpperCase())))
    .join("");

// Agrupa a origem do dinheiro de campanha em categorias fáceis de entender.
export function origemReceita(r) {
  if (r.DS_FONTE_RECEITA === "FUNDO ESPECIAL") return "Fundo eleitoral (dinheiro público)";
  if (r.DS_FONTE_RECEITA === "FUNDO PARTIDARIO") return "Fundo partidário (dinheiro público)";
  const o = r.DS_ORIGEM_RECEITA ?? "";
  if (o.includes("pessoas f")) return "Doações de pessoas";
  if (o.includes("próprios") || o.includes("prÓprios") || o.includes("próprios")) return "Dinheiro do próprio candidato";
  if (o.includes("Financiamento Coletivo") || o.includes("Internet")) return "Vaquinha online";
  if (o.includes("partido")) return "Repasses do partido (outros recursos)";
  if (o.includes("outros candidatos")) return "Repasses de outros candidatos";
  return "Outras origens";
}
export const ehPublico = (origem) => origem.includes("dinheiro público");

// "Apartamento" / "Casa" / "Quotas ou quinhões de capital" ... agrupados em poucas categorias.
export function resumirTipoBem(t) {
  const s = String(t ?? "").toLowerCase();
  if (/apartamento|casa|terreno|prédio|predio|sala|loja|imóvel|imovel|galpão|construção|benfeitoria/.test(s)) return "Imóveis urbanos";
  if (/rural|fazenda|terra nua|sítio|sitio|chácara|chacara/.test(s)) return "Imóveis rurais";
  if (/veículo|veiculo|aeronave|embarcação|embarcacao|automóvel/.test(s)) return "Veículos, barcos e aviões";
  if (/quota|ações|acoes|participaç|participac/.test(s)) return "Participação em empresas";
  if (/depósito|deposito|poupança|poupanca|aplicação|aplicacao|fundo|renda fixa|dinheiro|espécie|especie|conta|título|titulo|cripto/.test(s)) return "Dinheiro e aplicações";
  return "Outros bens";
}
