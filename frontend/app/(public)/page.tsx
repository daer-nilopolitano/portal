import Image from "next/image";
import { EmbaixadasSecao } from "@/components/embaixadas-secao";
import { EventosSecao } from "@/components/eventos-secao";
import { SobreSecao } from "@/components/sobre-secao";

export default function HomePage() {
  return (
    <>
      <section className="relative flex h-[420px] items-center justify-center overflow-hidden text-center md:h-[480px]">
        <Image
          src="/capa-daer.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        {/* Véu escuro neutro (não a cor primary) sobre a montagem já desfocada — reforça o duotone e garante contraste do texto em qualquer trecho da foto. */}
        <div className="absolute inset-0 bg-slate-950/55" />
        <div className="relative px-6">
          <Image
            src="/logo-daer.png"
            alt="Brasão do DAER Nilopolitano"
            width={96}
            height={104}
            priority
            className="mx-auto"
          />
          <h1 className="mt-4 text-4xl font-bold text-white">
            DAER Nilopolitano
          </h1>
          <p className="mt-3 text-lg text-white/90">
            Departamento Associacional de Embaixadores do Rei Nilopolitano.
          </p>
        </div>
      </section>

      <SobreSecao />
      <EventosSecao />
      <EmbaixadasSecao />
    </>
  );
}
