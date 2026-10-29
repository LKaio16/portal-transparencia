// Coleta a atividade dos deputados estaduais nas Assembleias que têm dados abertos.
// Cada Assembleia tem um adaptador em scripts/assembleias/<uf>.mjs; para incluir um estado novo,
// crie o arquivo exportando `casa` e `coletar(ano)` no mesmo formato de mg.mjs e adicione aqui.
//
// Saída: src/data/estaduais/atividade-<UF>.json, ligada depois aos eleitos pelo coletar-tse-local.mjs.
//
// Uso: node scripts/coletar-assembleias.mjs

import { arredondar, ordenarSomas, salvarJson } from "./util.mjs";
import * as mg from "./assembleias/mg.mjs";

const ADAPTADORES = [mg];
const ANO = Number(process.env.ANO ?? new Date().getFullYear());

async function main() {
  for (const adaptador of ADAPTADORES) {
    console.log(`${adaptador.casa.sigla} (${adaptador.casa.uf})...`);
    try {
      const deputados = await adaptador.coletar(ANO);
      for (const d of deputados) {
        d.gastos.total = arredondar(d.gastos.total);
        d.gastos.porMes = d.gastos.porMes.map((v) => arredondar(v));
        d.gastos.porCategoria = ordenarSomas(d.gastos.porCategoria, "categoria");
        d.gastos.fornecedores = ordenarSomas(d.gastos.fornecedores, "nome", 8);
        d.proposicoes.lista.sort((a, b) => b.data.localeCompare(a.data));
      }
      salvarJson(`estaduais/atividade-${adaptador.casa.uf}.json`, {
        casa: adaptador.casa,
        ano: ANO,
        atualizadoEm: new Date().toISOString(),
        deputados,
      });
      console.log(`  ${deputados.length} deputados em exercício.`);
    } catch (erro) {
      // Uma Assembleia fora do ar não pode derrubar a coleta das outras.
      console.warn(`  ${adaptador.casa.sigla} falhou: ${erro.message}`);
    }
  }
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
