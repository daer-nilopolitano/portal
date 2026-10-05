import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { PacoteOffline } from "@/lib/cursos-offline";
import { resolveAsset } from "./text";
import type { Course } from "./types";

const BYTES_POR_PAGINA = 60 * 1024; // páginas estáticas do curso (HTML + dados), em média
const BYTES_ARQUIVOS_DO_APP = 500 * 1024; // JS, CSS e fontes compartilhados (baixados uma vez só)

/**
 * O que o botão "Baixar para ler offline" deve guardar de um curso: as páginas, as imagens dos capítulos e uma
 * "versão" (hash do conteúdo) para avisar quando o curso mudar. Roda no servidor, no build.
 * Vídeos não entram: os do YouTube/Vimeo precisam de internet e os arquivos locais são pesados.
 */
export function getPacoteOffline(course: Course): PacoteOffline {
  const base = `/cursos/${course.slug}`;
  const paginas = ["/cursos", base, ...course.chapters.map((chapter) => `${base}/${chapter.slug}`)];

  const imagens = new Set<string>();
  for (const chapter of course.chapters) {
    for (const block of chapter.blocks) {
      if (block.type !== "image") continue;
      const url = resolveAsset(course.slug, block.src);
      // Só imagens da própria origem (as externas não passam pelo cache do app).
      if (url.startsWith("/") && !url.startsWith("//")) imagens.add(url);
    }
  }

  let bytesImagens = 0;
  const tamanhos: string[] = [];
  for (const url of imagens) {
    try {
      const tamanho = fs.statSync(path.join(process.cwd(), "public", url)).size;
      bytesImagens += tamanho;
      tamanhos.push(`${url}:${tamanho}`);
    } catch {
      // imagem ainda não sincronizada em public/course-assets: fica fora da estimativa
    }
  }

  const versao = createHash("sha1")
    .update(JSON.stringify(course))
    .update(tamanhos.join("|"))
    .digest("hex")
    .slice(0, 10);

  return {
    slug: course.slug,
    titulo: course.title,
    paginas,
    imagens: [...imagens],
    bytesEstimados: bytesImagens + paginas.length * BYTES_POR_PAGINA + BYTES_ARQUIVOS_DO_APP,
    versao,
  };
}
