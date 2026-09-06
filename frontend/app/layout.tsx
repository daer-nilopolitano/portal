import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="pt-BR">
      <body className="bg-white text-daer-blue">{children}</body>
    </html>
  );
}
