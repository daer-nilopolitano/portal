import { EmbaixadasMapa } from "@/components/embaixadas-mapa";
import { SectionTitle } from "@/components/section-title";
import { getFromApi } from "@/lib/api";

interface Igreja {
  id: number;
  nome: string;
  municipio: string;
  bairro: string;
  latitude: number | null;
  longitude: number | null;
}

export async function EmbaixadasSecao() {
  // Usa o endpoint público de Igreja (não o de Embaixada, que exige login) —
  // no site institucional mostramos qual igreja sedia cada embaixada, sem
  // expor o nome do conselheiro responsável publicamente.
  const igrejas = await getFromApi<Igreja[]>("/igrejas/").catch(() => []);

  return (
    <section id="embaixadas" className="border-t border-gray-100 bg-white px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <SectionTitle>Embaixadas Nilopolitanas</SectionTitle>
        <p className="mt-4 text-center text-gray-600">
          Conheça as igrejas que sediam nossas embaixadas e encontre a mais próxima de
          você.
        </p>

        <div className="mt-12 grid gap-8 md:grid-cols-2">
          <ul className="space-y-3">
            {igrejas.length === 0 && (
              <li className="text-sm text-gray-500">Nenhuma embaixada cadastrada ainda.</li>
            )}
            {igrejas.map((igreja) => (
              <li key={igreja.id} className="rounded-md border border-gray-200 p-4">
                <p className="font-semibold text-daer-blue">{igreja.nome}</p>
                <p className="text-sm text-gray-600">
                  {igreja.bairro}
                  {igreja.bairro && igreja.municipio ? ", " : ""}
                  {igreja.municipio}
                </p>
              </li>
            ))}
          </ul>

          <EmbaixadasMapa igrejas={igrejas} />
        </div>
      </div>
    </section>
  );
}
