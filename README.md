# Olho no Mandato

Site que mostra, em linguagem simples, se os deputados federais estão trabalhando:
presença nas sessões, participação nas votações, projetos apresentados e gastos da cota parlamentar.

Todos os dados vêm de fontes oficiais da Câmara dos Deputados:
- [Dados Abertos da Câmara](https://dadosabertos.camara.leg.br) (arquivos em lote e API v2)
- [Cota parlamentar](https://www.camara.leg.br/cota-parlamentar/)

## Como rodar

```bash
npm install
npm run coletar   # baixa os dados do ano e gera src/data/*.json (~20 s)
npm run dev       # abre em http://localhost:3000
```

Para processar outro ano: `ANO=2025 npm run coletar`.
Para reprocessar sem baixar de novo: `npm run coletar -- --sem-baixar`.

## Estrutura

| Caminho | O que é |
|---|---|
| `scripts/coletar.mjs` | Baixa os arquivos da Câmara, calcula os números e grava os JSON |
| `src/data/` | Dados gerados (um JSON por deputado + índice + médias) |
| `src/app/page.tsx` | Página inicial com busca e filtros |
| `src/app/deputado/[id]/page.tsx` | Ficha do deputado |
| `src/app/como-funciona/page.tsx` | Metodologia e canal de correções |
| `.github/workflows/coletar-dados.yml` | Atualização diária automática (GitHub Actions) |

As páginas são geradas estaticamente no build (uma por deputado), então o site é rápido e barato de hospedar.

## Publicar

1. Suba o projeto para um repositório no GitHub.
2. Importe o repositório na [Vercel](https://vercel.com) (plano gratuito).
3. A action `Coletar dados da Câmara` roda todo dia e faz commit dos dados novos, o que dispara um novo deploy.

Antes de publicar, troque o e-mail de correções em `src/app/como-funciona/page.tsx`.
