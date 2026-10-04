import type { Metadata } from "next";
import { PaginaEmbaixadas } from "@/components/public/embaixadas/pagina-mapa";
import { NOME_SITE } from "@/lib/content/site";
import { listarEmbaixadasDestaque } from "@/lib/embaixadas-publicas";

export const metadata: Metadata = {
  title: `Embaixadas — ${NOME_SITE}`,
  description: "Mapa das igrejas que sediam as embaixadas nilopolitanas, com horários de reunião e como chegar.",
};

// Mesma janela de atualização da seção da home.
export const revalidate = 60;

export default async function EmbaixadasPage() {
  const igrejas = await listarEmbaixadasDestaque();
  return <PaginaEmbaixadas igrejas={igrejas} />;
}
