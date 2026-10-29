import Link from "next/link";

export default function NaoEncontrada() {
  return (
    <div className="mx-auto max-w-md space-y-4 rounded-2xl border border-line bg-surface p-6 text-center">
      <h1 className="text-2xl font-bold">Página não encontrada</h1>
      <p className="text-ink-2">O endereço pode estar errado, ou essa pessoa não está mais no cargo.</p>
      <div className="flex flex-wrap justify-center gap-4">
        <Link href="/cidades" className="underline">Buscar minha cidade</Link>
        <Link href="/" className="underline">Deputados</Link>
        <Link href="/senadores" className="underline">Senadores</Link>
      </div>
    </div>
  );
}
