import { EmbaixadasDestaques } from "@/components/public/embaixadas/destaques";
import { SectionTitle } from "@/components/public/section-title";
import { listarEmbaixadasDestaque } from "@/lib/embaixadas-publicas";

export async function EmbaixadasSecao() {
  const destaques = await listarEmbaixadasDestaque();

  return (
    <section id="embaixadas" className="border-t border-border bg-surface-soft px-4 py-12 md:px-6 md:py-20">
      <div className="mx-auto max-w-5xl">
        <SectionTitle>Embaixadas Nilopolitanas</SectionTitle>
        <p className="mt-4 text-center text-text-muted">
          Conheça as igrejas que sediam nossas embaixadas e encontre a mais próxima de você.
        </p>
        <EmbaixadasDestaques igrejas={destaques} />
      </div>
    </section>
  );
}
