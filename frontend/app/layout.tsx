import type {Metadata} from "next";
import {Manrope, Sora} from "next/font/google";
import {AuthProvider} from "@/lib/auth-context";
import {ThemeProvider} from "@/lib/theme-context";
import {NOME_SITE, TAGLINE} from "@/lib/content/site";
import "./globals.css";

const sora = Sora({subsets: ["latin"], weight: ["600", "700"], variable: "--font-heading"});
const manrope = Manrope({subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-body"});

export const metadata: Metadata = {
    title: NOME_SITE,
    description: TAGLINE,
};

export default function RootLayout({children}: { children: React.ReactNode }) {
    return (
        <html lang="pt-BR" className={`${sora.variable} ${manrope.variable}`} suppressHydrationWarning>
        <head>
            <script
                dangerouslySetInnerHTML={{
                    __html: `(function(){try{var t=localStorage.getItem('tema')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark');}catch(e){}})();`,
                }}
            />
        </head>
        <body className="bg-background font-body text-text">
        <ThemeProvider>
            <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
        </body>
        </html>
    );
}
