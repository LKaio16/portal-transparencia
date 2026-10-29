import type { Metadata } from "next";
import Link from "next/link";
import { carregarMeta } from "@/lib/dados";
import { formatarData } from "@/lib/formato";

export const metadata: Metadata = { title: "Como funciona" };

// TODO: trocar pelo e-mail real do projeto antes de publicar.
const EMAIL_CORRECOES = "contato@exemplo.com.br";

export default function ComoFunciona() {
  const meta = carregarMeta("camara");
  const metaSenado = carregarMeta("senado");
  return (
    <article className="max-w-3xl space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Como funciona</h1>
        <p className="text-lg text-ink-2">
          Este site é independente e apartidário. Todos os números vêm de bases oficiais e são calculados do mesmo jeito para
          todos os deputados, de todos os partidos.
        </p>
      </header>

      <Bloco titulo="De onde vêm os dados">
        <ul className="list-disc space-y-1 pl-6">
          <li>
            <a className="underline" href="https://dadosabertos.camara.leg.br" target="_blank" rel="noreferrer">Dados Abertos da Câmara dos Deputados</a>:
            deputados em exercício, sessões, presenças, votações e proposições.
          </li>
          <li>
            <a className="underline" href="https://www.camara.leg.br/cota-parlamentar/" target="_blank" rel="noreferrer">Cota para o Exercício da Atividade Parlamentar</a>:
            todos os gastos reembolsados pela Câmara.
          </li>
          <li>
            <a className="underline" href="https://legis.senado.leg.br/dadosabertos" target="_blank" rel="noreferrer">Dados Abertos do Senado Federal</a>:
            senadores em exercício, votações nominais (com o motivo de cada ausência) e proposições.
          </li>
          <li>
            <a className="underline" href="https://www.senado.leg.br/transparencia/LAI/verba/" target="_blank" rel="noreferrer">CEAPS</a>:
            gastos reembolsados pela cota dos senadores.
          </li>
          <li>
            <a className="underline" href="https://dadosabertos.tse.jus.br" target="_blank" rel="noreferrer">Dados Abertos do TSE</a>: candidaturas,
            bens declarados e prestação de contas das campanhas.
          </li>
        </ul>
        <p>
          Os dados são atualizados automaticamente. Última atualização: <strong>{formatarData(meta.atualizadoEm)}</strong>.
          Período analisado: <strong>{meta.ano}</strong> ({meta.sessoesPlenario} sessões deliberativas e {meta.votacoesNominais}{" "}
          votações nominais no Plenário da Câmara e {metaSenado.votacoesNominais} no Plenário do Senado até agora).
        </p>
      </Bloco>

      <Bloco titulo="Como calculamos cada número">
        <dl className="space-y-4">
          <Item termo="Presença (Câmara)">
            Sessões deliberativas do Plenário (as que têm votação) com presença registrada, divididas pelo total dessas sessões
            desde que o deputado começou a atuar no ano. Assim, quem assumiu no meio do ano (suplente) não é comparado com um
            período em que não estava no cargo.
          </Item>
          <Item termo="Presença (Senado)">
            O Senado registra, em cada votação nominal, se o senador votou, estava presente sem votar ou estava ausente — e o motivo
            da ausência (licença de saúde, missão oficial, atividade parlamentar etc.). Contamos como presença quem votou ou estava
            presente, e mostramos as ausências justificadas separadas das faltas sem justificativa. Só entram as votações em que o
            senador estava em exercício.
          </Item>
          <Item termo="Participação nas votações">
            Votações nominais do Plenário em que o deputado registrou voto (Sim, Não, Abstenção, Obstrução ou presidindo a
            sessão), divididas pelo total de votações nominais no mesmo período.
          </Item>
          <Item termo="Projetos apresentados">
            Projetos de Lei, Projetos de Lei Complementar, Propostas de Emenda à Constituição, Projetos de Decreto Legislativo e
            Projetos de Resolução em que o deputado assina como autor ou coautor. Requerimentos e pedidos de informação aparecem
            separados, porque são instrumentos de outro tipo.
          </Item>
          <Item termo="Gastos">
            Soma do valor líquido de todas as notas reembolsadas pela cota parlamentar no ano. O valor máximo da cota muda de
            estado para estado, porque inclui as passagens até Brasília.
          </Item>
          <Item termo="Patrimônio declarado">
            Soma dos bens que o próprio candidato declarou ao TSE na eleição que lhe deu o mandato atual e, se concorreu, na eleição de
            2026. Os valores não são conferidos pelo TSE e imóveis costumam ser declarados pelo valor de compra.
          </Item>
          <Item termo="Custo da campanha">
            Soma das receitas declaradas na prestação de contas da campanha que deu o mandato atual. Consideramos dinheiro público o
            que veio do Fundo Especial de Financiamento de Campanha (fundo eleitoral) e do Fundo Partidário.
          </Item>
          <Item termo="Deputados estaduais, prefeitos e vereadores">
            Partimos da lista de eleitos do TSE (deputados estaduais e distritais em 2022; prefeitos e vereadores em 2024), com o
            patrimônio declarado e o custo das campanhas. Mostramos quem foi eleito, que pode não ser quem está no cargo hoje: vices e
            suplentes assumem quando o titular morre, renuncia, é cassado ou se afasta. Projetos e gastos dos deputados estaduais só
            aparecem para as Assembleias que publicam dados abertos num formato que conseguimos ler (por enquanto, Minas Gerais). As
            câmaras municipais ainda não têm um padrão nacional de dados abertos.
          </Item>
          <Item termo="Notícias">
            Buscamos todo dia as notícias da Agência Câmara e da Agência Senado e, na imprensa, pela base aberta GDELT. Nas agências,
            só ligamos a notícia ao parlamentar quando aparecem o nome e o estado juntos, como em &quot;deputada Fulana (PT-SP)&quot;. Na
            imprensa, o nome precisa estar no título. Mostramos só título, veículo e data, com link para a notícia original.
          </Item>
          <Item termo="Na Justiça">
            Processos cadastrados à mão, depois de conferidos no site do tribunal ou do Ministério Público. Cada registro mostra a
            situação exata (investigado, réu, condenado com ou sem recurso, absolvido, arquivado), o link oficial e a data da última
            conferência. Desfechos favoráveis, como arquivamento e absolvição, também são publicados. Processos em segredo de justiça
            não entram.
          </Item>
          <Item termo="Alertas por e-mail">
            Quem pede alertas recebe no máximo um e-mail por dia, só quando há votação, projeto novo ou notícia sobre quem acompanha.
            O cadastro só vale depois de confirmado pelo link enviado ao e-mail, e pode ser cancelado com um clique.{" "}
            <Link href="/privacidade" className="underline">Veja a política de privacidade</Link>.
          </Item>
          <Item termo="Resumos em linguagem simples">
            Quando aparece um resumo em negrito, ele foi escrito por inteligência artificial a partir do texto oficial (a ementa), que
            continua disponível logo abaixo em &quot;Texto oficial&quot;. O resumo pode simplificar detalhes: na dúvida, vale sempre o texto oficial.
          </Item>
        </dl>
      </Bloco>

      <Bloco titulo="O que os números não mostram">
        <ul className="list-disc space-y-1 pl-6">
          <li>Na Câmara, faltas justificadas (licença médica, missão oficial, licença-maternidade etc.) aparecem como falta nos dados abertos.</li>
          <li>Ter patrimônio alto ou que cresceu não é crime nem indício de irregularidade por si só.</li>
          <li>Trabalho nas comissões, relatorias e articulação política não estão contados aqui.</li>
          <li>Quantidade de projetos não mede qualidade: um bom projeto pode valer mais que dez.</li>
          <li>Gastar a cota é permitido por lei. Um gasto alto não significa irregularidade.</li>
        </ul>
        <p>Use estes números como ponto de partida para conhecer o trabalho de quem você elegeu, não como veredito.</p>
      </Bloco>

      <Bloco titulo="Encontrou um erro?" id="correcoes">
        <p>
          Se você é cidadão, jornalista, deputado ou assessor e encontrou uma informação errada ou desatualizada, escreva para{" "}
          <a className="underline" href={`mailto:${EMAIL_CORRECOES}`}>{EMAIL_CORRECOES}</a>. Conferimos com a fonte oficial e
          corrigimos o quanto antes.
        </p>
      </Bloco>
    </article>
  );
}

function Bloco({ titulo, id, children }: { titulo: string; id?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="space-y-3 rounded-2xl border border-line bg-surface p-5">
      <h2 className="text-2xl font-bold">{titulo}</h2>
      {children}
    </section>
  );
}

function Item({ termo, children }: { termo: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="font-bold">{termo}</dt>
      <dd className="text-ink-2">{children}</dd>
    </div>
  );
}
