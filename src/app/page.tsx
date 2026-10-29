import { carregarIndice, carregarMeta } from "@/lib/dados";
import { formatarPercentual, formatarReaisCurto } from "@/lib/formato";
import ListaDeputados from "@/components/ListaDeputados";

export default function Inicio() {
  const deputados = carregarIndice();
  const meta = carregarMeta();

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h1 className="text-3xl font-bold leading-tight sm:text-4xl">Seu deputado está trabalhando?</h1>
        <p className="max-w-2xl text-lg text-ink-2">
          Veja, em linguagem simples, se os {meta.totalDeputados} deputados federais estão indo às sessões, votando,
          apresentando projetos — e quanto gastam de dinheiro público. Tudo com dados oficiais da Câmara.
        </p>
      </section>

      <section aria-label={`Médias da Câmara em ${meta.ano}`} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Media rotulo="Presença média nas sessões" valor={formatarPercentual(meta.medias.presenca)} />
        <Media rotulo="Participação média nas votações" valor={formatarPercentual(meta.medias.votacoes)} />
        <Media rotulo="Projetos por deputado (média)" valor={meta.medias.proposicoes.toLocaleString("pt-BR")} />
        <Media rotulo="Gasto médio da cota" valor={formatarReaisCurto(meta.medias.gastos)} />
      </section>
      <p className="-mt-5 text-sm text-muted">Médias da Câmara em {meta.ano}, até agora.</p>

      <ListaDeputados deputados={deputados} medias={meta.medias} />
    </div>
  );
}

function Media({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <div className="text-2xl font-bold">{valor}</div>
      <div className="text-sm text-ink-2">{rotulo}</div>
    </div>
  );
}
