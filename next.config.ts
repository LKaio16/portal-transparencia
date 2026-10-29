import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Drivers de banco rodam direto no Node, sem passar pelo bundler (o PGlite usa WebAssembly).
  serverExternalPackages: ["@electric-sql/pglite", "postgres"],
};

export default nextConfig;
