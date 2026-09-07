"use client";

import { useAuth } from "@/lib/auth-context";

export default function MinhaCarteirinhaPage() {
  const { pessoa } = useAuth();

  if (!pessoa) return null;

  return (
    <div>
      <h1 className="text-2xl font-bold text-daer-blue">Minha carteirinha</h1>
      {/*
        A carteirinha em si (foto, QR code, validade) consome
        GET /api/carteirinhas/me/ — entra aqui quando essa tela for construída
        de fato. Por enquanto só confirma que a área logada está funcionando
        para qualquer papel.
      */}
      <p className="mt-4 text-gray-600">{pessoa.nome}</p>
      <p className="mt-8 text-sm text-gray-500">Em construção.</p>
    </div>
  );
}
