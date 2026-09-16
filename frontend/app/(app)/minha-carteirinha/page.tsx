"use client";

import Image from "next/image";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import { apiFetch, mediaUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatarDataBR } from "@/lib/format";
import { ROTULO_CARGO_DIRETORIA, ROTULO_PAPEL } from "@/lib/labels";
import { NOME_SITE } from "@/lib/content/site";

interface CarteirinhaMe {
  id: number;
  pessoa_nome: string;
  foto_url: string | null;
  embaixada_nome: string;
  papel: string | null;
  cargo_diretoria: string | null;
  identificador: string;
  validade: string;
  emitida_em: string;
}

export default function MinhaCarteirinhaPage() {
  const { token } = useAuth();
  const [carteirinha, setCarteirinha] = useState<CarteirinhaMe | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    apiFetch<CarteirinhaMe>("/carteirinhas/me/", { token })
      .then(setCarteirinha)
      .catch(() =>
        setErro("Sua carteirinha ainda não foi emitida. Fale com seu conselheiro ou com a Diretoria.")
      )
      .finally(() => setCarregando(false));
  }, [token]);

  if (carregando) {
    return <p className="text-sm text-text-muted">Carregando…</p>;
  }

  if (erro || !carteirinha) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-primary">Minha carteirinha</h1>
        <p className="mt-4 text-sm text-text-muted">{erro}</p>
      </div>
    );
  }

  const urlVerificacao =
    typeof window !== "undefined"
      ? `${window.location.origin}/verificar/${carteirinha.identificador}`
      : "";

  const rotuloFuncao = carteirinha.papel
    ? carteirinha.papel === "diretoria" && carteirinha.cargo_diretoria
      ? ROTULO_CARGO_DIRETORIA[carteirinha.cargo_diretoria] ?? ROTULO_PAPEL.diretoria
      : ROTULO_PAPEL[carteirinha.papel]
    : "Sem papel definido";

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-primary">Minha carteirinha</h1>

      <div className="mx-auto max-w-sm overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 bg-daer-blue px-5 py-4">
          <Image src="/logo-daer.png" alt="" width={32} height={35} />
          <div>
            <p className="text-sm font-semibold text-white">{NOME_SITE}</p>
            <p className="text-xs text-white/70">Carteirinha Digital</p>
          </div>
        </div>

        <div className="flex flex-col items-center px-6 py-6">
          <div className="h-28 w-28 overflow-hidden rounded-full border-4 border-daer-yellow bg-gray-100">
            {carteirinha.foto_url ? (
              <Image
                src={mediaUrl(carteirinha.foto_url) ?? ""}
                alt=""
                width={112}
                height={112}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-3xl font-semibold text-gray-500">
                {carteirinha.pessoa_nome.charAt(0)}
              </div>
            )}
          </div>

          <p className="mt-4 text-center font-heading text-lg font-semibold text-daer-blue">
            {carteirinha.pessoa_nome}
          </p>
          <p className="text-sm font-medium uppercase tracking-wide text-daer-blue-light">
            {rotuloFuncao}
          </p>
          <p className="mt-1 text-sm text-gray-600">{carteirinha.embaixada_nome}</p>

          <div className="my-5 h-px w-full bg-gray-100" />

          <p className="text-xs text-gray-500">Válida até</p>
          <p className="text-sm font-medium text-gray-800">
            {formatarDataBR(carteirinha.validade)}
          </p>

          {urlVerificacao && (
            <div className="mt-5 rounded-lg border border-gray-100 p-3">
              <QRCodeSVG value={urlVerificacao} size={140} />
            </div>
          )}
          <p className="mt-2 text-center text-xs text-gray-500">
            Aponte a câmera pra verificar a validade desta carteirinha
          </p>
        </div>
      </div>
    </div>
  );
}
