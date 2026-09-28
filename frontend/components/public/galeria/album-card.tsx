import Image from "next/image";
import Link from "next/link";
import { formatarDataBR } from "@/lib/format";
import { ROTULO_CATEGORIA_ALBUM } from "@/lib/labels";
import type { AlbumResumo } from "@/lib/types";

interface Props {
  album: AlbumResumo;
}

export function AlbumCard({ album }: Props) {
  return (
    <Link
      href={`/galeria/${album.slug}`}
      className="group block overflow-hidden rounded-lg border border-border bg-surface transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-surface-2">
        {album.capa ? (
          <Image
            src={album.capa.full_url ?? album.capa.url}
            alt={album.capa.alt || album.title}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : null}
      </div>

      <div className="p-5">
        <h3 className="font-heading text-xl font-semibold text-primary group-hover:text-primary-hover">
          {album.title}
        </h3>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-muted">
          {album.data ? <span>{formatarDataBR(album.data)}</span> : null}
          {album.categoria ? <span>{ROTULO_CATEGORIA_ALBUM[album.categoria]}</span> : null}
          <span>{album.totalFotos} {album.totalFotos === 1 ? "foto" : "fotos"}</span>
        </div>

        {album.local ? <p className="mt-1 text-sm text-text-muted">{album.local}</p> : null}
      </div>
    </Link>
  );
}
