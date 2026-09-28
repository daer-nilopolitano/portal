import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GaleriaFotos } from "@/components/public/galeria-fotos";
import { formatarDataBR } from "@/lib/format";
import { getAlbumPorSlug } from "@/lib/galeria";
import { ROTULO_CATEGORIA_ALBUM } from "@/lib/labels";

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props) {
  const album = await getAlbumPorSlug(params.slug);
  return { title: album?.title ?? "Álbum" };
}

export default async function AlbumDetalhePage({ params }: Props) {
  const album = await getAlbumPorSlug(params.slug);
  if (!album) notFound();

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <nav aria-label="breadcrumb" className="flex items-center gap-1 text-sm text-text-muted">
        <Link href="/" className="hover:text-primary">
          Início
        </Link>
        <ChevronRight size={14} aria-hidden="true" />
        <Link href="/galeria" className="hover:text-primary">
          Galeria
        </Link>
      </nav>

      <h1 className="mt-4 font-heading text-3xl font-bold text-primary">{album.title}</h1>

      <div className="mt-2 flex flex-wrap gap-x-3 text-sm text-text-muted">
        {album.data ? <span>{formatarDataBR(album.data)}</span> : null}
        {album.categoria ? <span>{ROTULO_CATEGORIA_ALBUM[album.categoria]}</span> : null}
        {album.local ? <span>{album.local}</span> : null}
      </div>

      {album.descricao ? (
        <p className="text-measure mt-6 text-lg italic text-text-muted">{album.descricao}</p>
      ) : null}

      <GaleriaFotos fotos={album.fotos} />
    </main>
  );
}
