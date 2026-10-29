// Gera resumos em linguagem simples das propostas (ementas) usando o Claude.
//
// Uso:
//   node scripts/resumir.mjs              -> resume tudo o que ainda não tem resumo
//   node scripts/resumir.mjs --limite 200 -> resume no máximo 200 itens (para testar o custo)
//
// Precisa de credenciais da API da Anthropic (variável ANTHROPIC_API_KEY).
// Os resumos ficam em src/data/resumos.json e são reaproveitados: cada ementa só é resumida uma vez.
// Rode depois de coletar-camara e coletar-senado.

import fs from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { PASTA_SAIDA, emParalelo } from "./util.mjs";

const MODELO = "claude-opus-5-5";
const POR_PEDIDO = 40; // ementas enviadas em cada chamada
const ARQUIVO = path.join(PASTA_SAIDA, "resumos.json");
const argLimite = process.argv.indexOf("--limite");
const LIMITE = argLimite > 0 ? Number(process.argv[argLimite + 1]) : Infinity;

const INSTRUCOES = `Você escreve para um site brasileiro de transparência política, lido por pessoas de todas as idades e níveis de escolaridade.
Para cada ementa (o resumo oficial de uma proposta legislativa), escreva UMA frase curta, em português simples, dizendo o que a proposta faz na prática para a população.
Regras:
- No máximo 25 palavras. Comece com um verbo no presente ("Cria...", "Proíbe...", "Aumenta...", "Muda...").
- Troque números de leis e jargão jurídico pelo efeito concreto. Se a ementa só cita a lei alterada sem dizer o assunto, diga o assunto dessa lei de forma genérica.
- Seja neutro: não elogie, não critique, não opine e não invente efeitos que a ementa não diz.
- Mantenha nomes próprios (pessoas homenageadas, cidades, órgãos).
Responda somente com um objeto JSON no formato {"<chave>": "<frase>", ...}, usando exatamente as chaves recebidas.`;

function coletarItens() {
  const itens = new Map(); // chave -> ementa
  for (const [pasta, prefixo] of [["deputados", "cam"], ["senadores", "sen"]]) {
    const dir = path.join(PASTA_SAIDA, pasta);
    for (const arquivo of fs.readdirSync(dir)) {
      const p = JSON.parse(fs.readFileSync(path.join(dir, arquivo), "utf-8"));
      for (const prop of p.proposicoes.lista) if (prop.ementa) itens.set(`${prefixo}:${prop.id}`, prop.ementa);
      for (const v of p.votacoes.recentes) if (v.chaveResumo && v.ementa) itens.set(v.chaveResumo, v.ementa);
    }
  }
  return itens;
}

async function resumirLote(client, lote) {
  const entrada = Object.fromEntries(lote);
  const response = await client.beta.messages.create({
    model: MODELO,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default", // se o modelo recusar, a API refaz o pedido com o modelo recomendado
    output_config: { effort: "low" },
    system: INSTRUCOES,
    messages: [{ role: "user", content: JSON.stringify(entrada, null, 1) }],
  });
  if (response.stop_reason === "refusal") throw new Error(`pedido recusado (${response.stop_details?.category ?? "sem categoria"})`);
  if (response.stop_reason === "max_tokens") throw new Error("resposta cortada por max_tokens");
  const texto = response.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  const json = JSON.parse(texto.slice(texto.indexOf("{"), texto.lastIndexOf("}") + 1));
  const resultado = {};
  for (const [chave] of lote) if (typeof json[chave] === "string" && json[chave].trim()) resultado[chave] = json[chave].trim();
  return { resultado, uso: response.usage };
}

async function main() {
  const resumos = fs.existsSync(ARQUIVO) ? JSON.parse(fs.readFileSync(ARQUIVO, "utf-8")) : {};
  const pendentes = [...coletarItens()].filter(([chave]) => !resumos[chave]).slice(0, LIMITE);
  console.log(`${Object.keys(resumos).length} já resumidos, ${pendentes.length} pendentes.`);
  if (!pendentes.length) return;

  const client = new Anthropic();
  const lotes = [];
  for (let i = 0; i < pendentes.length; i += POR_PEDIDO) lotes.push(pendentes.slice(i, i + POR_PEDIDO));

  let feitos = 0;
  let tokensEntrada = 0;
  let tokensSaida = 0;
  await emParalelo(lotes, 3, async (lote, i) => {
    for (let tentativa = 1; tentativa <= 2; tentativa++) {
      try {
        const { resultado, uso } = await resumirLote(client, lote);
        Object.assign(resumos, resultado);
        feitos += Object.keys(resultado).length;
        tokensEntrada += uso.input_tokens;
        tokensSaida += uso.output_tokens;
        // Grava a cada lote: se o script parar no meio, o que já foi feito não se perde.
        fs.writeFileSync(ARQUIVO, JSON.stringify(resumos));
        console.log(`  lote ${i + 1}/${lotes.length}: ${Object.keys(resultado).length} resumos`);
        return;
      } catch (erro) {
        if (erro instanceof Anthropic.AuthenticationError) throw new Error("Credenciais inválidas ou ausentes: defina ANTHROPIC_API_KEY.");
        if (erro instanceof Anthropic.RateLimitError || erro instanceof Anthropic.APIConnectionError || erro instanceof SyntaxError) {
          if (tentativa < 2) continue;
        }
        console.warn(`  lote ${i + 1} falhou: ${erro.message}`);
        return;
      }
    }
  });
  console.log(`Pronto: ${feitos} novos resumos (${tokensEntrada} tokens de entrada, ${tokensSaida} de saída).`);
}

main().catch((erro) => {
  console.error(erro.message ?? erro);
  process.exit(1);
});
