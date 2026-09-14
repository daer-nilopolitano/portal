import { EmbaixadasPainel } from "@/components/embaixadas-painel";
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
    <section id="embaixadas" className="border-t border-border bg-background px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <SectionTitle>Embaixadas Nilopolitanas</SectionTitle>
        <p className="mt-4 text-center text-text-muted">
          Conheça as igrejas que sediam nossas embaixadas e encontre a mais próxima de você.
        </p>
        <EmbaixadasPainel igrejas={igrejas} />
      </div>
    </section>
  );
}
