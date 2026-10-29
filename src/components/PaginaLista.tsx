import { Suspense } from "react";
import Link from "next/link";
import { carregarIndice, carregarMeta, type Casa } from "@/lib/dados";
import { CASAS, formatarPercentual, formatarReaisCurto } from "@/lib/formato";
import ListaParlamentares from "./ListaParlamentares";

// Página inicial de cada Casa: médias + busca.
export default function PaginaLista({ casa }: { casa: Casa }) {
  const parlamentares = carregarIndice(casa);
  const meta = carregarMeta(casa);
  const textos = CASAS[casa];

  return (
    <div className="space-y-8">
      <nav aria-label="Escolha a Casa" className="flex gap-2">
        {(["camara", "senado"] as Casa[]).map((c) => (
          <Link
            key={c}
            href={c === "camara" ? "/" : "/senadores"}
            aria-current={c === casa ? "page" : undefined}
            className={`rounded-full border px-4 py-1.5 font-bold ${c === casa ? "border-accent bg-accent text-white" : "border-line bg-surface"}`}
          >
            {CASAS[c].pluralTitulo}
          </Link>
        ))}
      </nav>

      <Link href="/cidades" className="flex items-center justify-between gap-3 rounded-2xl bg-accent p-4 text-white">
        <span>
          <strong className="block text-lg">Quem representa a sua cidade?</strong>
          <span className="text-sm opacity-90">Prefeito, vereadores, deputados e senadores, em um só lugar.</span>
        </span>
        <span aria-hidden className="text-2xl">→</span>
      </Link>

      <section className="space-y-3">
        <h1 className="text-3xl font-bold leading-tight sm:text-4xl">Seu {textos.singular} está trabalhando?</h1>
        <p className="max-w-2xl text-lg text-ink-2">
          Veja, em linguagem simples, se os {parlamentares.length} {textos.plural} estão indo às votações, apresentando projetos — e quanto
          gastam de dinheiro público. Tudo com dados oficiais.
        </p>
      </section>

      <section aria-label={`Médias em ${meta.ano}`} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Media rotulo={casa === "camara" ? "Presença média nas sessões" : "Presença média nas votações"} valor={formatarPercentual(meta.medias.presenca)} />
        <Media rotulo="Participação média nas votações" valor={formatarPercentual(meta.medias.votacoes)} />
        <Media rotulo={`Projetos por ${textos.singular} (média)`} valor={meta.medias.proposicoes.toLocaleString("pt-BR")} />
        <Media rotulo="Gasto médio da cota" valor={formatarReaisCurto(meta.medias.gastos)} />
      </section>
      <p className="-mt-5 text-sm text-muted">Médias de {meta.ano}, até agora.</p>

      <Suspense>
        <ListaParlamentares casa={casa} parlamentares={parlamentares} medias={meta.medias} />
      </Suspense>
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
