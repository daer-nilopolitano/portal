"use client";

import Image from "next/image";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import { ErroApi, mediaUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  esquecerCarteirinha,
  guardarCarteirinha,
  lerCarteirinhaSalva,
  type CarteirinhaMe,
  type CarteirinhaSalva,
} from "@/lib/carteirinha-offline";
import { useApi } from "@/lib/use-api";
import { formatarDataBR } from "@/lib/format";
import { ROTULO_FAIXA_ETARIA, ROTULO_POSTO } from "@/lib/labels";
import { NOME_SITE } from "@/lib/content/site";

interface CartaoProps {
  carteirinha: CarteirinhaMe;
  /** `true` quando o cartão vem da cópia guardada no aparelho (sem rede, a foto só pode ser a guardada). */
  copia: boolean;
  fotoSalva: string | null;
}

function Cartao({ carteirinha, copia, fotoSalva }: CartaoProps) {
  const urlVerificacao =
    typeof window !== "undefined"
      ? `${window.location.origin}/verificar/${carteirinha.identificador}`
      : "";

  const rotuloFuncao = carteirinha.posto ? ROTULO_POSTO[carteirinha.posto] : "Embaixador do Rei";

  return (
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
          {copia && fotoSalva ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fotoSalva} alt="" width={112} height={112} className="h-full w-full object-cover" />
          ) : !copia && carteirinha.foto_url ? (
            <Image
              src={mediaUrl(carteirinha.foto_url) ?? ""}
              alt=""
              width={112}
              height={112}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-3xl font-semibold text-gray-500">
              {carteirinha.membro_nome.charAt(0)}
            </div>
          )}
        </div>

        <p className="mt-4 text-center font-heading text-lg font-semibold text-daer-blue">
          {carteirinha.membro_nome}
        </p>
        <p className="text-sm font-medium uppercase tracking-wide text-daer-blue-light">{rotuloFuncao}</p>
        <p className="mt-1 text-sm text-gray-600">{carteirinha.embaixada_nome}</p>

        <div className="my-5 h-px w-full bg-gray-100" />

        <div className="flex justify-center gap-8 text-center">
          {carteirinha.faixa_etaria && (
            <div>
              <p className="text-xs text-gray-500">Faixa etária</p>
              <p className="text-sm font-medium text-gray-800">
                {ROTULO_FAIXA_ETARIA[carteirinha.faixa_etaria] ?? carteirinha.faixa_etaria}
              </p>
            </div>
          )}
          <div>
            <p className="text-xs text-gray-500">Válida até</p>
            <p className="text-sm font-medium text-gray-800">{formatarDataBR(carteirinha.validade)}</p>
          </div>
        </div>

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
  );
}

export default function MinhaCarteirinhaPage() {
  const { membro } = useAuth();
  const membroId = membro?.membro_id ?? null;
  const { data, isLoading: carregando, error: erroCarga, mutate } = useApi<CarteirinhaMe>("/carteirinhas/me/");
  // Cópia guardada neste aparelho: aparece na hora, sem esperar a rede, e é o que abre quando não há internet.
  // (Esta página só monta depois do login carregar, no navegador; ler o armazenamento direto no início é seguro.)
  const [salva, setSalva] = useState<CarteirinhaSalva | null>(() =>
    membroId === null ? null : lerCarteirinhaSalva(membroId),
  );
  useEffect(() => {
    setSalva(membroId === null ? null : lerCarteirinhaSalva(membroId));
  }, [membroId]);

  // Carregou da API: atualiza a cópia (dados e foto) para a próxima vez.
  useEffect(() => {
    if (!data || membroId === null) return;
    let cancelado = false;
    guardarCarteirinha(membroId, data).then((nova) => {
      if (!cancelado) setSalva(nova);
    });
    return () => {
      cancelado = true;
    };
  }, [data, membroId]);

  // 404 = o servidor diz que não há carteirinha emitida. Qualquer outro erro (sem internet, servidor fora do ar)
  // não quer dizer isso: aí vale a cópia guardada.
  const naoEmitida = erroCarga instanceof ErroApi && erroCarga.status === 404;
  useEffect(() => {
    if (!naoEmitida) return;
    esquecerCarteirinha();
    setSalva(null);
  }, [naoEmitida]);

  const copia = !data && !naoEmitida ? salva : null;

  if (data || copia) {
    const quando = copia
      ? new Date(copia.salvoEm).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
      : null;
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold text-primary">Minha carteirinha</h1>

        {copia && erroCarga && (
          <div
            role="status"
            className="mx-auto mb-4 max-w-sm rounded-lg border border-border bg-surface-2 p-3 text-sm text-text-muted"
          >
            <p>
              Não foi possível atualizar agora. Mostrando a carteirinha salva em {quando}. A validade só é
              confirmada com internet.
            </p>
            <button type="button" onClick={() => mutate()} className="btn-ghost mt-3">
              Tentar novamente
            </button>
          </div>
        )}

        <Cartao
          carteirinha={(data ?? copia?.dados) as CarteirinhaMe}
          copia={!data}
          fotoSalva={copia?.fotoDataUrl ?? null}
        />
      </div>
    );
  }

  if (carregando) {
    return <p className="text-sm text-text-muted">Carregando…</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-primary">Minha carteirinha</h1>
      {naoEmitida || !erroCarga ? (
        <p className="mt-4 text-sm text-text-muted">
          Sua carteirinha ainda não foi emitida. Fale com seu conselheiro ou com a Diretoria.
        </p>
      ) : (
        <>
          <p className="mt-4 text-sm text-text-muted">
            Não foi possível carregar sua carteirinha. Verifique sua conexão e tente novamente.
          </p>
          <button type="button" onClick={() => mutate()} className="btn-outline mt-4">
            Tentar novamente
          </button>
        </>
      )}
    </div>
  );
}
