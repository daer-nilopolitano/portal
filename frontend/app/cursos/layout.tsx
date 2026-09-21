import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter, Newsreader } from "next/font/google";
import { CursosAuthGuard } from "./_auth-guard";
import "./cursos.css";

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});
const serif = Newsreader({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: { default: "Cursos", template: "%s | Cursos" },
};

export default function CursosLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <div className={`c-root ${sans.variable} ${serif.variable}`}>
      <CursosAuthGuard>{children}</CursosAuthGuard>
    </div>
  );
}
