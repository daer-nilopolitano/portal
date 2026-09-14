import { CheckCircle2, XCircle } from "lucide-react";
import { getFromApi } from "@/lib/api";
import { formatarDataBR } from "@/lib/format";

interface Verificacao {
  nome: string;
  embaixada: string;
  valida: boolean;
  validade: string;
}

export default async function VerificarCarteirinhaPage({
  params,
}: {
  params: { identificador: string };
}) {
  const verificacao = await getFromApi<Verificacao>(
    `/carteirinhas/verificar/${params.identificador}/`
  ).catch(() => null);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-8 text-center shadow-sm">
        {!verificacao ? (
          <>
            <XCircle className="mx-auto h-12 w-12 text-danger" />
            <p className="mt-4 font-heading text-lg font-semibold text-primary">
              Carteirinha não encontrada
            </p>
            <p className="mt-2 text-sm text-text-muted">
              Verifique se o código do QR está correto.
            </p>
          </>
        ) : (
          <>
            {verificacao.valida ? (
              <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
            ) : (
              <XCircle className="mx-auto h-12 w-12 text-danger" />
            )}
            <p className="mt-4 font-heading text-lg font-semibold text-primary">
              {verificacao.valida ? "Carteirinha válida" : "Carteirinha inválida ou vencida"}
            </p>
            <div className="mt-6 space-y-1 text-left text-sm">
              <p>
                <span className="text-text-muted">Nome:</span>{" "}
                <span className="font-medium text-text">{verificacao.nome}</span>
              </p>
              <p>
                <span className="text-text-muted">Embaixada:</span>{" "}
                <span className="font-medium text-text">{verificacao.embaixada}</span>
              </p>
              <p>
                <span className="text-text-muted">Válida até:</span>{" "}
                <span className="font-medium text-text">
                  {formatarDataBR(verificacao.validade)}
                </span>
              </p>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
