import type { Metadata, Viewport } from "next";
import { Manrope, Sora } from "next/font/google";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-context";
import { RegistroPwa } from "@/components/pwa/registro-pwa";
import { NOME_SITE, TAGLINE } from "@/lib/content/site";
import "./globals.css";

const sora = Sora({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-heading",
});
const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: NOME_SITE,
  description: TAGLINE,
  applicationName: NOME_SITE,
  appleWebApp: { capable: true, title: "DAERNIL", statusBarStyle: "default" },
};

// viewport-fit=cover deixa a página ocupar a tela toda no celular (a barra inferior respeita a área segura com
// env(safe-area-inset-bottom)). As cores da barra de status são as de --color-background em globals.css.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAF9F6" },
    { media: "(prefers-color-scheme: dark)", color: "#0D0C0B" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="pt-BR"
      className={`${sora.variable} ${manrope.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('tema');var tema=t==='dark'||t==='light'?t:(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.classList.toggle('dark', tema==='dark');}catch(e){}})();`,
          }}
        />
      </head>
      <body className="bg-background font-body text-text">
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
        <RegistroPwa />
      </body>
    </html>
  );
}
