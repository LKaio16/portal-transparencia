"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Revela uma única vez os grupos marcados com data-reveal. O CSS mantém tudo visível por padrão.
function instalarRevelacoes(root: ParentNode = document) {
  const reduzido = matchMedia("(prefers-reduced-motion: reduce)");
  const animacoes = new Map<HTMLElement, Animation>();
  const elementos = [...root.querySelectorAll<HTMLElement>("[data-reveal]")];
  const terminar = (el: HTMLElement) => {
    el.dataset.revealPlayed = "true";
    animacoes.get(el)?.cancel();
    animacoes.delete(el);
  };
  const observador =
    typeof IntersectionObserver === "function"
      ? new IntersectionObserver(
          (entradas) => {
            for (const entrada of entradas) {
              if (!entrada.isIntersecting) continue;
              const el = entrada.target as HTMLElement;
              observador?.unobserve(el);
              el.dataset.revealPlayed = "true";
              if (reduzido.matches || document.visibilityState === "hidden" || entrada.boundingClientRect.bottom <= 0) terminar(el);
              else animacoes.get(el)?.play();
            }
          },
          { threshold: 0, rootMargin: "0px 0px 96px 0px" },
        )
      : undefined;
  const parar = () => {
    observador?.disconnect();
    elementos.forEach(terminar);
  };
  const aoMudar = () => {
    if (reduzido.matches) parar();
  };
  reduzido.addEventListener("change", aoMudar);
  for (const el of elementos) {
    if (el.dataset.revealPlayed === "true") continue;
    const ret = el.getBoundingClientRect();
    if (reduzido.matches || !observador || !el.animate || ret.top < innerHeight || document.visibilityState === "hidden") {
      terminar(el);
      continue;
    }
    const tipo = el.dataset.reveal;
    const transform = tipo === "media" ? "scale(1.06)" : tipo === "slide" ? "translateX(-24px)" : "translateY(16px)";
    const atraso = Math.min(Number(el.dataset.revealDelay ?? 0), 240);
    const animacao = el.animate(
      [
        { opacity: 0, transform },
        { opacity: 1, transform: "none" },
      ],
      { duration: tipo === "media" ? 700 : 600, delay: atraso, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "backwards" },
    );
    animacao.pause();
    animacao.onfinish = () => terminar(el);
    animacoes.set(el, animacao);
    observador.observe(el);
  }
  return () => {
    parar();
    reduzido.removeEventListener("change", aoMudar);
  };
}

export default function Revelar() {
  const caminho = usePathname();
  useEffect(() => instalarRevelacoes(), [caminho]);
  return null;
}
