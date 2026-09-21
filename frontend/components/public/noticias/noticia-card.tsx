import Image from "next/image";
import Link from "next/link";
import { formatarDataBR } from "@/lib/format";
import type { NoticiaResumo } from "@/lib/types";

interface Props {
  noticia: NoticiaResumo;
  /** Card maior, usado só pra notícia mais recente no topo da listagem. */
  destaque?: boolean;
}

export function NoticiaCard({ noticia, destaque = false }: Props) {
  return (
    <Link
      href={`/noticias/${noticia.slug}`}
      className="group block overflow-hidden rounded-lg border border-border bg-surface transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-video overflow-hidden bg-surface-2">
        {noticia.imagem_capa ? (
          <Image
            src={noticia.imagem_capa.full_url ?? noticia.imagem_capa.url}
            alt={noticia.imagem_capa.alt || noticia.title}
            fill
            sizes={
              destaque
                ? "(min-width: 768px) 60vw, 100vw"
                : "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            }
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : null}
      </div>

      <div className="p-4">
        {noticia.data_publicacao ? (
          <span className="text-xs text-text-muted">{formatarDataBR(noticia.data_publicacao)}</span>
        ) : null}

        <h3
          className={`mt-1 font-heading font-semibold text-primary group-hover:text-primary-hover ${
            destaque ? "text-2xl" : "text-lg"
          }`}
        >
          {noticia.title}
        </h3>

        {noticia.resumo ? (
          <p
            className={`mt-2 text-text-muted ${
              destaque ? "line-clamp-3 text-base" : "line-clamp-2 text-sm"
            }`}
          >
            {noticia.resumo}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
