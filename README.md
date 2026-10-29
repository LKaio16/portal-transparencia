# Olho no Mandato

Site que mostra, em linguagem simples, se deputados federais e senadores estão trabalhando:
presença, votos, projetos apresentados, gastos da cota parlamentar, patrimônio declarado, dinheiro de campanha,
notícias e processos na Justiça (com curadoria). Quem quiser recebe alertas por e-mail.

Fontes oficiais:
- [Dados Abertos da Câmara](https://dadosabertos.camara.leg.br) e [cota parlamentar](https://www.camara.leg.br/cota-parlamentar/)
- [Dados Abertos do Senado](https://legis.senado.leg.br/dadosabertos) e [CEAPS](https://www.senado.leg.br/transparencia/LAI/verba/)
- [Dados Abertos do TSE](https://dadosabertos.tse.jus.br) (candidaturas, bens e prestação de contas)

## Como rodar

```bash
npm install
npm run coletar       # Câmara + Senado do ano atual (~1 min)
npm run coletar:tse   # patrimônio e campanhas (TSE); baixa ~1 GB na primeira vez
npm run coletar:noticias  # notícias das agências oficiais e da imprensa (GDELT)
npm run resumir       # opcional: resumos em linguagem simples com IA (precisa de ANTHROPIC_API_KEY)
npm run dev           # abre em http://localhost:3000
npm run alertas       # envia o resumo diário para quem segue parlamentares
npm run coletar:assembleias  # atividade nas Assembleias com dados abertos (hoje: ALMG)
npm run coletar:tse-local    # deputados estaduais (2022), prefeitos e vereadores (2024); baixa ~2 GB na 1ª vez
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
| `scripts/coletar-noticias.mjs` | Notícias por parlamentar (Agência Câmara, Agência Senado, GDELT) |
| `src/data/curadoria/processos.json` | Processos conferidos à mão; regras em [CURADORIA.md](CURADORIA.md) |
| `src/servidor/` | Banco, e-mails e regras dos alertas (só roda no servidor) |
| `src/app/api/alertas/` | Inscrição, confirmação, conta e descadastro |
| `scripts/enviar-alertas.mjs` | E-mail diário com as novidades |
| `scripts/assembleias/` | Um adaptador por Assembleia Legislativa (hoje: `mg.mjs`) |
| `scripts/coletar-tse-local.mjs` | Eleitos estaduais e municipais, patrimônio e campanhas |
| `src/app/estaduais/`, `src/app/estadual/[id]/` | Deputados estaduais |
| `src/app/cidades/` | "Minha cidade": prefeito, vereadores e links para quem representa o estado |
| `src/app/como-funciona/page.tsx` | Metodologia e canal de correções |
| `.github/workflows/coletar-dados.yml` | Atualização diária automática (GitHub Actions) |

As páginas são geradas estaticamente no build (uma por deputado), então o site é rápido e barato de hospedar.

## Publicar

1. Suba o projeto para um repositório no GitHub.
2. Importe o repositório na [Vercel](https://vercel.com) (plano gratuito).
3. A action `Coletar dados da Câmara` roda todo dia e faz commit dos dados novos, o que dispara um novo deploy.
   Para ela também gerar os resumos, cadastre o segredo `ANTHROPIC_API_KEY` no repositório.

Antes de publicar, troque o e-mail de correções em `src/app/como-funciona/page.tsx`.

## Alertas por e-mail

Funcionam sem configurar nada no computador: sem `DATABASE_URL` o site usa um banco Postgres embutido
(em `data/banco-local`) e, sem `RESEND_API_KEY`, os e-mails viram arquivos em `data/emails-enviados`.
Copie `.env.example` para `.env.local` e preencha `SEGREDO_SITE` antes de rodar com `npm run start`.

Para colocar no ar:

1. Crie um banco Postgres gratuito (por exemplo [Neon](https://neon.tech) ou [Supabase](https://supabase.com)).
   As tabelas são criadas sozinhas na primeira conexão.
2. Crie uma conta no [Resend](https://resend.com), verifique seu domínio e gere uma chave.
3. Cadastre `DATABASE_URL`, `RESEND_API_KEY`, `EMAIL_REMETENTE`, `SITE_URL` e `SEGREDO_SITE` na Vercel
   (variáveis de ambiente) **e** nos segredos do repositório no GitHub (para o envio diário).
4. Troque os e-mails de exemplo em `src/app/como-funciona/page.tsx` e `src/app/privacidade/page.tsx`.

O banco local só aceita um processo por vez: pare o `npm run start` antes de rodar `npm run alertas` no computador.

## Adicionar uma Assembleia Legislativa

1. Crie `scripts/assembleias/<uf>.mjs` exportando `casa` (nome, sigla, site, se publica presença) e
   `coletar(ano)`, que devolve a lista de deputados em exercício no mesmo formato de `mg.mjs`
   (`nomeCivil`, `proposicoes`, `gastos`...).
2. Adicione o adaptador à lista em `scripts/coletar-assembleias.mjs`.
3. Rode `npm run coletar:assembleias` e depois `npm run coletar:tse-local estaduais`: a ligação com os eleitos
   é feita pelo nome civil e pelo estado.
