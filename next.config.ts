import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Drivers de banco rodam direto no Node, sem passar pelo bundler (o PGlite usa WebAssembly).
  serverExternalPackages: ["@electric-sql/pglite", "postgres"],
  // As páginas de cidade são geradas sob demanda e leem os dados do disco: incluí-los no pacote do servidor.
  outputFileTracingIncludes: {
    "/cidades/[uf]/[cidade]": ["./src/data/municipios/**/*", "./src/data/estaduais/indice.json"],
  },
};

export default nextConfig;
