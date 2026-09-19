"use client";

import { useAuth } from "@/lib/auth-context";
import { ROTULO_TIPO } from "@/lib/labels";

export default function PainelPage() {
  const { membro } = useAuth();

  if (!membro) return null;

  return (
    <div>
      <h1 className="text-2xl font-bold text-primary">
        Olá, {membro.nome.split(" ")[0]}
      </h1>
      <p className="mt-2 text-text-muted">
        {membro.embaixada_nome} · {ROTULO_TIPO[membro.tipo ?? ""] ?? "Sem tipo definido"}
      </p>

      {/*
        Resumo por papel (contadores, atalhos) entra aqui quando as telas de
        gestão estiverem prontas — cada bloco consome os endpoints já
        existentes: /api/embaixadas/, /api/membros/, /api/papeis/.
      */}
      <p className="mt-8 text-sm text-text-muted">Resumo geral em construção.</p>
    </div>
  );
}
