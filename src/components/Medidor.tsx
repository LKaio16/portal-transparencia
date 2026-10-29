// Barra de 0 a 100% com um traço marcando a média da Casa.
export default function Medidor({
  valor,
  media,
  rotulo,
  alto = false,
}: {
  valor: number | null;
  media?: number;
  rotulo: string;
  alto?: boolean;
}) {
  return (
    <div
      role="meter"
      aria-label={rotulo}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={valor ?? undefined}
      className={`relative mt-1.5 w-full rounded-full bg-track ${alto ? "h-3" : "h-2"}`}
    >
      <div className="h-full rounded-full bg-linear-to-r from-accent to-accent-strong" style={{ width: `${valor ?? 0}%` }} />
      {media !== undefined && (
        <div
          title={`Média da Casa: ${Math.round(media)}%`}
          className={`absolute w-1 rounded-full bg-ink ${alto ? "-top-1.5 h-6" : "-top-1 h-4"}`}
          style={{ left: `calc(${media}% - 2px)` }}
        />
      )}
    </div>
  );
}
