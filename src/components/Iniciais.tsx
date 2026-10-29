// No lugar da foto (o TSE não permite usar as fotos dos candidatos fora do site dele).
export default function Iniciais({ nome, tamanho = "md" }: { nome: string; tamanho?: "sm" | "md" | "lg" }) {
  const partes = nome.split(/\s+/).filter((p) => p.length > 2 || /^[A-Z]/.test(p));
  const letras = ((partes[0]?.[0] ?? "") + (partes.length > 1 ? partes.at(-1)![0] : "")).toUpperCase();
  const classe = { sm: "h-12 w-12 text-base", md: "h-16 w-16 text-xl", lg: "h-28 w-28 text-4xl" }[tamanho];
  return (
    <span aria-hidden className={`grid shrink-0 place-items-center rounded-full bg-accent-soft font-bold text-accent ${classe}`}>
      {letras}
    </span>
  );
}
