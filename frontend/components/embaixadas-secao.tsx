import { EmbaixadasCarrossel } from "@/components/embaixadas-carrossel";
import { EmbaixadasMapa } from "@/components/embaixadas-mapa";
import { SectionTitle } from "@/components/section-title";
import { getFromApi } from "@/lib/api";

export interface Igreja {
  id: number;
  nome: string;
  cep: string;
  rua: string;
  numero: string;
  complemento: string;
  bairro: string;
  municipio: string;
  latitude: number | null;
  longitude: number | null;
}

export async function EmbaixadasSecao() {
  const igrejas = await getFromApi<Igreja[]>("/igrejas/").catch(() => []);

  return (
    <section id="embaixadas" className="border-t border-border bg-surface px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <SectionTitle>Embaixadas Nilopolitanas</SectionTitle>
        <p className="mt-4 text-center text-text-muted">
          Conheça as igrejas que sediam nossas embaixadas e encontre a mais próxima de você.
        </p>
        <div className="mt-12 grid gap-8 md:grid-cols-2">
          <EmbaixadasCarrossel igrejas={igrejas} />
          <EmbaixadasMapa igrejas={igrejas} />
        </div>
      </div>
    </section>
  );
}
