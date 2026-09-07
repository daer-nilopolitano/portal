"use client";

import { useAuth } from "@/lib/auth-context";

const ROTULO_PAPEL: Record<string, string> = {
  diretoria: "Diretoria",
  conselheiro: "Conselheiro",
  embaixador_do_rei: "Embaixador do Rei",
};

export default function PainelPage() {
  const { pessoa } = useAuth();

  if (!pessoa) return null;

  return (
    <div>
      <h1 className="text-2xl font-bold text-daer-blue">
        Olá, {pessoa.nome.split(" ")[0]}
      </h1>
      <p className="mt-2 text-gray-600">
        {pessoa.embaixada_nome} · {ROTULO_PAPEL[pessoa.papel ?? ""] ?? "Sem papel definido"}
      </p>

      {/*
        Resumo por papel (contadores, atalhos) entra aqui quando as telas de
        gestão estiverem prontas — cada bloco consome os endpoints já
        existentes: /api/embaixadas/, /api/pessoas/, /api/papeis/.
      */}
      <p className="mt-8 text-sm text-gray-500">Resumo geral em construção.</p>
    </div>
  );
}
