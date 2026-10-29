// Valida a base curada de processos (src/data/curadoria/processos.json) antes de cada build.
// Um registro só entra no site se tiver fonte oficial, situação clara e data de verificação.
// Se algo estiver errado, o build falha: melhor não publicar do que publicar algo sem fonte.
//
// Formato de cada registro: veja CURADORIA.md.

import fs from "node:fs";
import path from "node:path";
import { PASTA_SAIDA } from "./util.mjs";

const ARQUIVO = path.join(PASTA_SAIDA, "curadoria", "processos.json");
const SITUACOES = ["investigado", "denunciado", "réu", "condenado, cabe recurso", "condenado, sem recurso", "absolvido", "arquivado"];
// Fontes oficiais aceitas: Judiciário, Ministério Público, Legislativo e Executivo federais/estaduais.
const DOMINIOS_OFICIAIS = /(^|\.)(jus\.br|mp\.br|leg\.br|gov\.br)$/;
const DIAS_PARA_REVISAR = 180;

const registros = JSON.parse(fs.readFileSync(ARQUIVO, "utf-8"));
const parlamentares = new Set([
  ...JSON.parse(fs.readFileSync(path.join(PASTA_SAIDA, "indice.json"), "utf-8")).map((p) => `dep:${p.id}`),
  ...JSON.parse(fs.readFileSync(path.join(PASTA_SAIDA, "senado-indice.json"), "utf-8")).map((p) => `sen:${p.id}`),
]);

const erros = [];
const avisos = [];
const hoje = new Date();
const urlValida = (u, oficial) => {
  try {
    const { protocol, hostname } = new URL(u);
    return protocol === "https:" && (!oficial || DOMINIOS_OFICIAIS.test(hostname));
  } catch {
    return false;
  }
};

registros.forEach((r, i) => {
  const onde = `registro ${i + 1} (${r.parlamentar ?? "sem parlamentar"}, ${r.numero ?? "sem número"})`;
  for (const campo of ["parlamentar", "tribunal", "numero", "tipo", "situacao", "assunto", "fonteOficial", "verificadoEm", "verificadoPor"]) {
    if (!String(r[campo] ?? "").trim()) erros.push(`${onde}: campo "${campo}" é obrigatório`);
  }
  if (r.parlamentar && !parlamentares.has(r.parlamentar)) avisos.push(`${onde}: parlamentar não está mais em exercício (não aparecerá no site)`);
  if (r.situacao && !SITUACOES.includes(r.situacao)) erros.push(`${onde}: situação "${r.situacao}" inválida. Use: ${SITUACOES.join(", ")}`);
  if (r.fonteOficial && !urlValida(r.fonteOficial, true)) erros.push(`${onde}: fonteOficial precisa ser um link https de órgão oficial (.jus.br, .mp.br, .leg.br, .gov.br)`);
  for (const f of r.fontesImprensa ?? []) {
    if (!f.titulo || !f.veiculo || !urlValida(f.link, false)) erros.push(`${onde}: cada fonte de imprensa precisa de titulo, veiculo e link https`);
  }
  if (String(r.assunto ?? "").length > 280) erros.push(`${onde}: assunto deve ter no máximo 280 caracteres`);
  const verificado = new Date(r.verificadoEm);
  if (Number.isNaN(verificado.getTime())) erros.push(`${onde}: verificadoEm deve ser uma data AAAA-MM-DD`);
  else if (verificado > hoje) erros.push(`${onde}: verificadoEm está no futuro`);
  else if ((hoje - verificado) / 864e5 > DIAS_PARA_REVISAR) avisos.push(`${onde}: verificado há mais de ${DIAS_PARA_REVISAR} dias, revise a situação`);
});

for (const a of avisos) console.warn(`aviso: ${a}`);
if (erros.length) {
  for (const e of erros) console.error(`erro: ${e}`);
  console.error(`\nCuradoria com ${erros.length} erro(s). Corrija src/data/curadoria/processos.json antes de publicar.`);
  process.exit(1);
}
console.log(`Curadoria ok: ${registros.length} registro(s).`);
