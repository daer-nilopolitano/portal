import { EmbaixadasSecao } from "@/components/embaixadas-secao";
import { EventosSecao } from "@/components/eventos-secao";
import { SobreSecao } from "@/components/sobre-secao";

export default function HomePage() {
  return (
    <>
      <section className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h1 className="text-4xl font-bold text-daer-blue">DAER Nilopolitano</h1>
        <p className="mt-4 text-lg text-gray-600">
          Departamento Associacional de Embaixadores do Rei Nilopolitano.
        </p>
      </section>

      <SobreSecao />
      <EventosSecao />
      <EmbaixadasSecao />
    </>
  );
}
