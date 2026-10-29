import type { Metadata } from "next";
import PaginaLista from "@/components/PaginaLista";

export const metadata: Metadata = { title: "Senadores" };

export default function Senadores() {
  return <PaginaLista casa="senado" />;
}
