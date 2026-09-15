import { EmbaixadasDestaques } from "@/components/public/embaixadas/destaques";
import { SectionTitle } from "@/components/public/section-title";
import { getFromApi } from "@/lib/api";
import type { Igreja } from "@/lib/types";

export async function EmbaixadasSecao() {
  const igrejas = await getFromApi<Igreja[]>("/igrejas/").catch(() => []);

  return (
    <section id="embaixadas" className="border-t border-border bg-background px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <SectionTitle>Embaixadas Nilopolitanas</SectionTitle>
        <p className="mt-4 text-center text-text-muted">
          Conheça as igrejas que sediam nossas embaixadas e encontre a mais próxima de você.
        </p>
        <EmbaixadasDestaques igrejas={igrejas} />
      </div>
    </section>
  );
}
