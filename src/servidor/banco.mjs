// Acesso ao banco de dados dos alertas. Usado pelo site (rotas /api) e pelo script diário.
//
// - Em produção: qualquer Postgres (Neon, Supabase, Railway...) via DATABASE_URL.
// - Sem DATABASE_URL: um Postgres embutido (PGlite) salvo em data/banco-local, para testar no computador.

import path from "node:path";

const ESQUEMA = `
  CREATE TABLE IF NOT EXISTS inscritos (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    token_acesso_hash TEXT UNIQUE,
    consentimento_em TIMESTAMPTZ NOT NULL,
    confirmado_em TIMESTAMPTZ,
    ultimo_envio DATE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE TABLE IF NOT EXISTS seguindo (
    inscrito_id INTEGER NOT NULL REFERENCES inscritos(id) ON DELETE CASCADE,
    parlamentar TEXT NOT NULL,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (inscrito_id, parlamentar)
  );
  -- Pedidos esperando o clique no e-mail (seguir alguém ou entrar na conta). Expiram em 24 h.
  CREATE TABLE IF NOT EXISTS pendentes (
    token_hash TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    parlamentar TEXT,
    expira_em TIMESTAMPTZ NOT NULL
  );
  -- Controle de abuso: hash do IP (nunca o IP em si), apagado depois de 24 h.
  CREATE TABLE IF NOT EXISTS tentativas (
    chave TEXT NOT NULL,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS tentativas_chave ON tentativas (chave, criado_em);
`;

let conexao = null;

async function conectar() {
  if (process.env.DATABASE_URL) {
    const { default: postgres } = await import("postgres");
    const sql = postgres(process.env.DATABASE_URL, { max: 3, onnotice: () => {} });
    await sql.unsafe(ESQUEMA);
    return { consultar: (texto, params = []) => sql.unsafe(texto, params), fechar: () => sql.end() };
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const db = new PGlite(path.join(process.cwd(), "data", "banco-local"));
  await db.exec(ESQUEMA);
  return { consultar: async (texto, params = []) => (await db.query(texto, params)).rows, fechar: () => db.close() };
}

/**
 * Executa uma consulta SQL com parâmetros ($1, $2...) e devolve as linhas.
 * @param {string} texto
 * @param {unknown[]} [params]
 * @returns {Promise<Record<string, any>[]>}
 */
export async function consultar(texto, params = []) {
  conexao ??= conectar();
  return (await conexao).consultar(texto, params);
}

export async function fecharBanco() {
  if (conexao) await (await conexao).fechar();
  conexao = null;
}
