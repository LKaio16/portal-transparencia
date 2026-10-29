// Funções compartilhadas pelos scripts de coleta.

import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse";

export const RAIZ = path.resolve(import.meta.dirname, "..");
export const PASTA_RAW = path.join(RAIZ, "data", "raw");
export const PASTA_SAIDA = path.join(RAIZ, "src", "data");

// Os scripts usam a mesma configuração local do site (SITE_URL, SEGREDO_SITE...), se existir.
try {
  process.loadEnvFile(path.join(RAIZ, ".env.local"));
} catch {
  // sem .env.local: valem só as variáveis de ambiente
}

// Lê um CSV linha a linha (como objeto). Os arquivos do TSE e do Senado vêm em latin1.
export async function* linhasCsv(arquivo, { encoding = "utf8", fromLine = 1 } = {}) {
  const parser = fs.createReadStream(arquivo, { encoding }).pipe(
    parse({ delimiter: ";", columns: true, bom: true, relax_quotes: true, relax_column_count: true, from_line: fromLine }),
  );
  for await (const linha of parser) yield linha;
}

export async function buscarJson(url, tentativas = 3) {
  for (let i = 1; ; i++) {
    try {
      const resp = await fetch(url, { headers: { accept: "application/json" } });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      return await resp.json();
    } catch (erro) {
      if (i >= tentativas) throw new Error(`${url}: ${erro.message}`);
      await new Promise((r) => setTimeout(r, 1000 * i));
    }
  }
}

// Executa `fn` para cada item com no máximo `limite` chamadas em paralelo.
export async function emParalelo(itens, limite, fn) {
  const resultados = new Array(itens.length);
  let proximo = 0;
  const trabalhador = async () => {
    while (proximo < itens.length) {
      const i = proximo++;
      resultados[i] = await fn(itens[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limite, itens.length) }, trabalhador));
  return resultados;
}

export const arredondar = (n, casas = 2) => Math.round(n * 10 ** casas) / 10 ** casas;
export const dia = (dataHora) => (dataHora ?? "").slice(0, 10);
export const numeroBr = (texto) => Number(String(texto ?? "").replace(/\./g, "").replace(",", ".")) || 0;

// "José da Silva" -> "JOSE DA SILVA", para comparar nomes de bases diferentes.
export const normalizarNome = (t) =>
  String(t ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z ]/g, " ").replace(/\s+/g, " ").trim();

// Soma valores por chave e devolve [{chave, valor}] do maior para o menor.
export function ordenarSomas(mapa, nomeChave, limite = Infinity) {
  return Object.entries(mapa)
    .map(([chave, valor]) => ({ [nomeChave]: chave, valor: arredondar(valor) }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, limite);
}

export function salvarJson(relativo, dados, bonito = false) {
  const arquivo = path.join(PASTA_SAIDA, relativo);
  fs.mkdirSync(path.dirname(arquivo), { recursive: true });
  fs.writeFileSync(arquivo, JSON.stringify(dados, null, bonito ? 2 : 0));
}
