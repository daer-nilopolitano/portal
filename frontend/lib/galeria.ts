import type { Album, AlbumResumo, CategoriaAlbum, Foto, ImagemRendition } from "@/lib/types";

type AlbumAPI = {
  id: number;
  meta: { slug: string };
  title: string;
  data: string | null;
  categoria: CategoriaAlbum;
  local: string;
  descricao?: string;
  capa: ImagemRendition | null;
  total_fotos?: number;
  fotos?: Foto[];
};

function mapResumo(a: AlbumAPI): AlbumResumo {
  return {
    id: a.id,
    slug: a.meta.slug,
    title: a.title,
    data: a.data,
    categoria: a.categoria,
    local: a.local,
    capa: a.capa,
    totalFotos: a.total_fotos ?? a.fotos?.length ?? 0,
  };
}

/**
 * Listagem de álbuns (/galeria) — mais recente primeiro.
 * O Wagtail rejeita `limit` acima de 20 (WAGTAILAPI_LIMIT_MAX) com erro 400.
 * Se um dia passar de 20 álbuns, é preciso subir esse limite no settings.py
 * do backend ou paginar aqui.
 */
export async function getAlbuns(limit = 20): Promise<AlbumResumo[]> {
  const params = new URLSearchParams({
    type: "cms.AlbumPage",
    fields: "data,categoria,local,capa,total_fotos",
    order: "-data",
    limit: String(limit),
  });
  const url = `${process.env.NEXT_PUBLIC_API_URL}/cms/pages/?${params}`;

  try {
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) {
      console.error("[galeria] HTTP", res.status, url);
      return [];
    }
    const { items } = (await res.json()) as { items: AlbumAPI[] };
    return items.map(mapResumo);
  } catch (err) {
    console.error("[galeria] falha ao buscar", url, err);
    return [];
  }
}

/** Álbum completo (descrição + fotos) pelo slug — para /galeria/[slug]. */
export async function getAlbumPorSlug(slug: string): Promise<Album | null> {
  const params = new URLSearchParams({
    type: "cms.AlbumPage",
    slug,
    fields: "data,categoria,local,descricao,capa,fotos",
  });
  const url = `${process.env.NEXT_PUBLIC_API_URL}/cms/pages/?${params}`;

  try {
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) {
      console.error("[galeria] HTTP", res.status, url);
      return null;
    }
    const { items } = (await res.json()) as { items: AlbumAPI[] };
    const item = items[0];
    if (!item) return null;

    return {
      ...mapResumo(item),
      descricao: item.descricao ?? "",
      fotos: item.fotos ?? [],
    };
  } catch (err) {
    console.error("[galeria] falha ao buscar álbum", url, err);
    return null;
  }
}
