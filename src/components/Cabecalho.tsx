"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { MENU } from "@/lib/menu";


export function Marca({ className = "" }: { className?: string }) {
  return (
    <span className={`titulo font-bold ${className}`}>
      <span className="realce">O</span>lho no Mandato
    </span>
  );
}

// Barra grafite fixa no topo; no celular os links ficam num painel de tela cheia.
export default function Cabecalho() {
  const caminho = usePathname();
  const [aberto, setAberto] = useState(false);
  const botao = useRef<HTMLButtonElement>(null);
  const painel = useRef<HTMLDivElement>(null);

  useEffect(() => setAberto(false), [caminho]);

  useEffect(() => {
    if (!aberto) return;
    const alvos = () => [...(painel.current?.querySelectorAll<HTMLElement>("a,button") ?? [])];
    alvos()[0]?.focus();
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAberto(false);
        botao.current?.focus();
      }
      if (e.key === "Tab") {
        const lista = alvos();
        const primeiro = lista[0];
        const ultimo = lista[lista.length - 1];
        if (e.shiftKey && document.activeElement === primeiro) {
          e.preventDefault();
          ultimo?.focus();
        } else if (!e.shiftKey && document.activeElement === ultimo) {
          e.preventDefault();
          primeiro?.focus();
        }
      }
    };
    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  }, [aberto]);

  const atual = (href: string) => ((href === "/" ? caminho === "/" : caminho.startsWith(href)) ? "page" : undefined);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--grafite-linha)] bg-grafite text-[var(--grafite-texto)]">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-6 px-6 lg:h-[72px] lg:px-12">
        <Link href="/" className="flex min-h-11 shrink-0 items-center text-xl lg:text-[22px]" aria-label="Olho no Mandato, página inicial">
          <Marca />
        </Link>
        <nav aria-label="Principal" className="hidden flex-1 justify-center gap-7 min-[1100px]:flex">
          {MENU.map((item) => (
            <Link key={item.href} href={item.href} aria-current={atual(item.href)} className="sublinha flex min-h-11 items-center text-[17px]">
              {item.rotulo}
            </Link>
          ))}
        </nav>
        <Link
          href="/alertas/conta"
          prefetch={false}
          className="ml-auto hidden min-h-11 items-center text-[17px] underline decoration-1 underline-offset-[6px] min-[1100px]:flex"
        >
          Meus alertas
        </Link>
        <button
          ref={botao}
          type="button"
          aria-expanded={aberto}
          aria-controls="menu-movel"
          onClick={() => setAberto(true)}
          className="ml-auto flex min-h-11 min-w-11 items-center gap-2 text-[17px] min-[1100px]:hidden"
        >
          <Menu aria-hidden size={22} strokeWidth={1.75} /> Menu
        </button>
      </div>

      {aberto && (
        <div
          id="menu-movel"
          ref={painel}
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          className="menu-painel fixed inset-0 z-50 overflow-y-auto bg-grafite px-6 py-4 md:left-auto md:w-[60%]"
        >
          <div className="flex h-12 items-center justify-end">
            <button
              type="button"
              onClick={() => {
                setAberto(false);
                botao.current?.focus();
              }}
              className="flex min-h-11 min-w-11 items-center gap-2 text-[17px]"
            >
              <X aria-hidden size={22} strokeWidth={1.75} /> Fechar
            </button>
          </div>
          <nav aria-label="Menu completo" className="mt-6 grid md:grid-cols-2">
            {[...MENU, { href: "/alertas/conta", rotulo: "Meus alertas" }].map((item) => (
              <Link key={item.href} href={item.href} aria-current={atual(item.href)} className="titulo flex min-h-14 items-center text-[32px] font-semibold">
                <span className="sublinha">{item.rotulo}</span>
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
