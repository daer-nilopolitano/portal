import type { MetadataRoute } from "next";
import { NOME_SITE, TAGLINE } from "@/lib/content/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: NOME_SITE,
    short_name: "DAERNIL",
    description: TAGLINE,
    // Identidade e escopo fixos: o app instalado continua o mesmo se o start_url mudar um dia.
    id: "/",
    scope: "/",
    lang: "pt-BR",
    // Quem instala é membro: abre direto no painel (quem não estiver logado é levado ao login).
    start_url: "/painel",
    display: "standalone",
    // Mesmas cores de --color-background (tema claro) em globals.css; o manifest não suporta tema escuro.
    background_color: "#FAF9F6",
    theme_color: "#FAF9F6",
    icons: [
      { src: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Versões com margem de segurança para o Android recortar em círculo/gota sem cortar o escudo.
      { src: "/maskable-icon-192x192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/maskable-icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Atalhos ao segurar o ícone no Android. Quem não tem acesso à página é redirecionado pelo próprio app.
    shortcuts: [
      {
        name: "Minha carteirinha",
        short_name: "Carteirinha",
        url: "/minha-carteirinha",
        icons: [{ src: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Cursos",
        url: "/cursos",
        icons: [{ src: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
