# Curadoria de processos

A seção "Na Justiça" de cada ficha mostra processos cadastrados à mão em
`src/data/curadoria/processos.json`. Nada entra automaticamente: cada registro precisa
de uma pessoa que conferiu a informação na fonte oficial.

## Regras

1. **Só fonte oficial.** O campo `fonteOficial` deve ser um link `https` de tribunal, Ministério
   Público ou órgão público (`.jus.br`, `.mp.br`, `.leg.br`, `.gov.br`). Notícias de imprensa podem
   complementar, mas nunca substituem a fonte oficial.
2. **Situação exata.** Use apenas um destes valores em `situacao`:
   `investigado`, `denunciado`, `réu`, `condenado, cabe recurso`, `condenado, sem recurso`,
   `absolvido`, `arquivado`.
3. **Linguagem neutra.** O `assunto` descreve o que consta no processo ("Inquérito sobre suposto
   desvio de verbas de gabinete"), sem adjetivos nem conclusões. Máximo de 280 caracteres.
4. **Desfechos também entram.** Se um processo foi arquivado ou terminou em absolvição, atualize o
   registro; não apague. Quem foi investigado tem direito de mostrar que foi inocentado.
5. **Revisão periódica.** Registros verificados há mais de 180 dias geram aviso no build.
6. **Processos em segredo de justiça não entram.**
7. **Pedidos de correção** (inclusive dos próprios parlamentares) são respondidos com prioridade.

## Formato

```json
[
  {
    "parlamentar": "dep:123456",
    "tribunal": "STF",
    "numero": "Inq 0000",
    "tipo": "Inquérito",
    "situacao": "investigado",
    "assunto": "Texto curto e neutro sobre o objeto do processo.",
    "fonteOficial": "https://portal.stf.jus.br/processos/detalhe.asp?incidente=0000000",
    "fontesImprensa": [
      { "titulo": "Título da reportagem", "veiculo": "Nome do veículo", "link": "https://..." }
    ],
    "verificadoEm": "2026-10-29",
    "verificadoPor": "Nome de quem conferiu"
  }
]
```

`parlamentar` é `dep:<id da Câmara>` ou `sen:<código do Senado>`, o mesmo número que aparece no
endereço da ficha (`/deputado/123456` ou `/senador/1234`).

Antes de publicar, rode `npm run validar-curadoria` (o `npm run build` já faz isso e falha se houver erro).
