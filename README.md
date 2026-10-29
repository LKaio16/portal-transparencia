# Olho no Mandato

Site que mostra, em linguagem simples, se deputados federais e senadores estão trabalhando:
presença, votos, projetos apresentados, gastos da cota parlamentar, patrimônio declarado e dinheiro de campanha.

Fontes oficiais:
- [Dados Abertos da Câmara](https://dadosabertos.camara.leg.br) e [cota parlamentar](https://www.camara.leg.br/cota-parlamentar/)
- [Dados Abertos do Senado](https://legis.senado.leg.br/dadosabertos) e [CEAPS](https://www.senado.leg.br/transparencia/LAI/verba/)
- [Dados Abertos do TSE](https://dadosabertos.tse.jus.br) (candidaturas, bens e prestação de contas)

## Como rodar

```bash
npm install
npm run coletar       # Câmara + Senado do ano atual (~1 min)
npm run coletar:tse   # patrimônio e campanhas (TSE); baixa ~1 GB na primeira vez
npm run resumir       # opcional: resumos em linguagem simples com IA (precisa de ANTHROPIC_API_KEY)
npm run dev           # abre em http://localhost:3000
```

Para processar outro ano: `ANO=2025 npm run coletar`.
Para reprocessar a Câmara sem baixar de novo: `npm run coletar:camara -- --sem-baixar`.
Para testar os resumos com poucos itens: `npm run resumir -- --limite 80`.

O CPF dos parlamentares é usado só para cruzar as bases da Câmara com o TSE e nunca é gravado nos arquivos do site.

## Estrutura

| Caminho | O que é |
|---|---|
| `scripts/coletar-camara.mjs` | Câmara: presença, votos, projetos e gastos |
| `scripts/coletar-senado.mjs` | Senado: presença (com motivo das ausências), votos, projetos e gastos |
| `scripts/coletar-tse.mjs` | TSE: patrimônio declarado, custo da campanha e candidatura em 2026 |
| `scripts/resumir.mjs` | Resumos das propostas em linguagem simples (Claude) |
| `src/data/` | Dados gerados (um JSON por parlamentar, índices, médias, `tse.json`, `resumos.json`) |
| `src/app/page.tsx`, `src/app/senadores/` | Listas com busca e filtros |
| `src/app/deputado/[id]/`, `src/app/senador/[id]/` | Fichas (usam `src/components/Ficha.tsx`) |
| `src/app/comparar/` | Comparação lado a lado |
| `src/app/como-funciona/page.tsx` | Metodologia e canal de correções |
| `.github/workflows/coletar-dados.yml` | Atualização diária automática (GitHub Actions) |

As páginas são geradas estaticamente no build (uma por deputado), então o site é rápido e barato de hospedar.

## Publicar

1. Suba o projeto para um repositório no GitHub.
2. Importe o repositório na [Vercel](https://vercel.com) (plano gratuito).
3. A action `Coletar dados da Câmara` roda todo dia e faz commit dos dados novos, o que dispara um novo deploy.
   Para ela também gerar os resumos, cadastre o segredo `ANTHROPIC_API_KEY` no repositório.

Antes de publicar, troque o e-mail de correções em `src/app/como-funciona/page.tsx`.
