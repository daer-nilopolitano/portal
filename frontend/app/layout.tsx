import type { Metadata } from "next";
import { Manrope, Sora } from "next/font/google";
import { AuthProvider } from "@/lib/auth-context";
import "./globals.css";

// Escolha deliberada de tipografia — Sora (títulos) + Manrope (corpo) — em vez
// do par Inter/system-ui que aparece por padrão em quase todo scaffold.
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
  title: "DAER Nilopolitano",
  description: "Departamento Associacional de Embaixadores do Rei Nilopolitano",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`${sora.variable} ${manrope.variable}`}>
      <body className="bg-white font-body text-gray-900">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
