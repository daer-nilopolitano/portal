import Image from "next/image";
import { EmbaixadasSecao } from "@/components/public/embaixadas/secao";
import { EmbaixadoresDoReiSecao } from "@/components/public/embaixadores-do-rei-secao";
import { EventosSecao } from "@/components/public/eventos-secao";
import { NoticiasSecao } from "@/components/public/noticias-secao";
import { SobreSecao } from "@/components/public/sobre-secao";

export default function HomePage() {
  return (
    <>
      <section className="relative flex h-[420px] items-center justify-center overflow-hidden text-center md:h-[480px]">
        <Image
          src="/capa-daer.svg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
      </section>

      <SobreSecao />
      <EmbaixadoresDoReiSecao />
      <EventosSecao />
      <NoticiasSecao />
      <EmbaixadasSecao />
    </>
  );
}
