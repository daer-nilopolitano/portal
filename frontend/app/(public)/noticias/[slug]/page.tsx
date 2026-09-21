import { ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { NoticiaGaleria } from "@/components/public/noticias/galeria";
import { formatarDataBR } from "@/lib/format";
import { getNoticiaPorSlug } from "@/lib/noticias";

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props) {
  const noticia = await getNoticiaPorSlug(params.slug);
  return { title: noticia?.title ?? "Notícia" };
}

export default async function NoticiaDetalhePage({ params }: Props) {
  const noticia = await getNoticiaPorSlug(params.slug);
  if (!noticia) notFound();

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <nav aria-label="breadcrumb" className="flex items-center gap-1 text-sm text-text-muted">
        <Link href="/" className="hover:text-primary">
          Início
        </Link>
        <ChevronRight size={14} aria-hidden="true" />
        <Link href="/noticias" className="hover:text-primary">
          Notícias
        </Link>
      </nav>

      <h1 className="mt-4 font-heading text-3xl font-bold text-primary">{noticia.title}</h1>

      <div className="mt-2 flex flex-wrap gap-x-3 text-sm text-text-muted">
        {noticia.data_publicacao ? <span>{formatarDataBR(noticia.data_publicacao)}</span> : null}
        {noticia.autor ? <span>Por {noticia.autor}</span> : null}
      </div>

      {noticia.imagem_capa ? (
        <div className="relative mt-6 aspect-video overflow-hidden rounded-lg bg-surface-2">
          <Image
            src={noticia.imagem_capa.full_url ?? noticia.imagem_capa.url}
            alt={noticia.imagem_capa.alt || noticia.title}
            fill
            sizes="(min-width: 768px) 768px, 100vw"
            className="object-cover"
            priority
          />
        </div>
      ) : null}

      <div className="noticia-corpo text-measure mt-8" dangerouslySetInnerHTML={{ __html: noticia.corpo }} />

      <NoticiaGaleria fotos={noticia.galeria} />
    </main>
  );
}
