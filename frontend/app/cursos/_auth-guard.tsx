"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

const PAPEIS_PERMITIDOS = ["conselheiro", "auxiliar"];

export function CursosAuthGuard({ children }: { children: React.ReactNode }) {
  const { membro, carregando } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (carregando) return;
    if (!membro) {
      router.replace("/login");
    } else if (!PAPEIS_PERMITIDOS.includes(membro.tipo)) {
      router.replace("/painel");
    }
  }, [carregando, membro, router]);

  if (carregando || !membro || !PAPEIS_PERMITIDOS.includes(membro.tipo)) {
    return null;
  }

  return <>{children}</>;
}
