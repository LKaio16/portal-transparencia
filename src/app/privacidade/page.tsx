import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacidade" };

// TODO: trocar pelo e-mail real do encarregado de dados (LGPD) antes de publicar.
const EMAIL_PRIVACIDADE = "privacidade@exemplo.com.br";

export default function Privacidade() {
  return (
    <article className="max-w-3xl space-y-6">
      <h1 className="text-3xl font-bold">Política de privacidade</h1>
      <p className="text-lg text-ink-2">
        Em resumo: para navegar no site você não precisa se cadastrar e nós não rastreamos você. Só guardamos dados se você pedir
        alertas por e-mail, e você pode apagá-los quando quiser.
      </p>

      <Bloco titulo="Quais dados guardamos">
        <ul className="list-disc space-y-1 pl-6">
          <li><strong>Seu e-mail</strong> e a <strong>lista de parlamentares que você acompanha</strong>, só se você pedir alertas.</li>
          <li>A data em que você confirmou o cadastro e a data do último e-mail enviado.</li>
          <li>
            Para evitar abuso (alguém cadastrando e-mails de outras pessoas em massa), guardamos por até 24 horas uma versão
            embaralhada (hash) do endereço de internet de quem faz pedidos. Não é possível voltar dela para o endereço original.
          </li>
        </ul>
        <p>Não usamos cookies de publicidade nem ferramentas de rastreamento. O único cookie mantém você conectado à página Meus alertas.</p>
      </Bloco>

      <Bloco titulo="Para que usamos">
        <p>
          Exclusivamente para enviar os alertas que você pediu. Não vendemos, não emprestamos e não compartilhamos seus dados com
          partidos, candidatos, campanhas ou qualquer outra pessoa. A base legal é o seu consentimento (art. 7º, I, da LGPD), dado
          ao marcar a caixa de concordância e confirmar pelo link enviado ao seu e-mail.
        </p>
        <p>Para entregar os e-mails usamos um serviço de envio especializado, que só recebe o endereço e o conteúdo de cada mensagem.</p>
      </Bloco>

      <Bloco titulo="Seus direitos">
        <ul className="list-disc space-y-1 pl-6">
          <li>Ver quem você acompanha e parar de seguir qualquer um, na página <Link href="/alertas/conta" className="underline">Meus alertas</Link>.</li>
          <li>Apagar todos os seus dados com um clique, na mesma página ou pelo link no rodapé de qualquer e-mail.</li>
          <li>Pedir informações ou correções pelo e-mail <a href={`mailto:${EMAIL_PRIVACIDADE}`} className="underline">{EMAIL_PRIVACIDADE}</a>.</li>
        </ul>
        <p>Quando você apaga seus dados, eles são removidos imediatamente da base usada pelo site.</p>
      </Bloco>

      <Bloco titulo="Dados dos parlamentares">
        <p>
          As informações sobre deputados e senadores vêm de bases públicas oficiais (Câmara, Senado e TSE) e são publicadas por
          interesse público, no exercício do controle social sobre agentes políticos. O CPF dos parlamentares é usado só para
          cruzar essas bases e nunca é exibido.
        </p>
      </Bloco>
    </article>
  );
}

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-2xl border border-line bg-surface p-5">
      <h2 className="text-2xl font-bold">{titulo}</h2>
      {children}
    </section>
  );
}
