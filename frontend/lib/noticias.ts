import type { ImagemRendition, Noticia, NoticiaFoto, NoticiaResumo } from "@/lib/types";

type NoticiaAPI = {
  id: number;
  meta: { slug: string };
  title: string;
  data_publicacao: string | null;
  autor: string;
  resumo: string;
  corpo?: string;
  imagem_capa: ImagemRendition | null;
  galeria?: NoticiaFoto[];
};

function mapResumo(n: NoticiaAPI): NoticiaResumo {
  return {
    id: n.id,
    slug: n.meta.slug,
    title: n.title,
    data_publicacao: n.data_publicacao,
    autor: n.autor,
    resumo: n.resumo,
    imagem_capa: n.imagem_capa,
  };
}

/** Listagem de notícias (/noticias) — mais recente primeiro. */
export async function getNoticias(limit = 20): Promise<NoticiaResumo[]> {
  const params = new URLSearchParams({
    type: "cms.NoticiaPage",
    fields: "data_publicacao,autor,resumo,imagem_capa",
    order: "-data_publicacao",
    limit: String(limit),
  });
  const url = `${process.env.NEXT_PUBLIC_API_URL}/cms/pages/?${params}`;

  try {
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) {
      console.error("[noticias] HTTP", res.status, url);
      return [];
    }
    const { items } = (await res.json()) as { items: NoticiaAPI[] };
    return items.map(mapResumo);
  } catch (err) {
    console.error("[noticias] falha ao buscar", url, err);
    return [];
  }
}

/** Notícia completa (corpo + galeria) pelo slug — para /noticias/[slug]. */
export async function getNoticiaPorSlug(slug: string): Promise<Noticia | null> {
  const params = new URLSearchParams({
    type: "cms.NoticiaPage",
    slug,
    fields: "data_publicacao,autor,resumo,corpo,imagem_capa,galeria",
  });
  const url = `${process.env.NEXT_PUBLIC_API_URL}/cms/pages/?${params}`;

  try {
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) {
      console.error("[noticias] HTTP", res.status, url);
      return null;
    }
    const { items } = (await res.json()) as { items: NoticiaAPI[] };
    const item = items[0];
    if (!item) return null;

    return {
      ...mapResumo(item),
      corpo: item.corpo ?? "",
      galeria: item.galeria ?? [],
    };
  } catch (err) {
    console.error("[noticias] falha ao buscar notícia", url, err);
    return null;
  }
}
