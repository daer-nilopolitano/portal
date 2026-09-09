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
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
        {!verificacao ? (
          <>
            <XCircle className="mx-auto h-12 w-12 text-red-500" />
            <p className="mt-4 font-heading text-lg font-semibold text-daer-blue">
              Carteirinha não encontrada
            </p>
            <p className="mt-2 text-sm text-gray-600">
              Verifique se o código do QR está correto.
            </p>
          </>
        ) : (
          <>
            {verificacao.valida ? (
              <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
            ) : (
              <XCircle className="mx-auto h-12 w-12 text-red-500" />
            )}
            <p className="mt-4 font-heading text-lg font-semibold text-daer-blue">
              {verificacao.valida ? "Carteirinha válida" : "Carteirinha inválida ou vencida"}
            </p>
            <div className="mt-6 space-y-1 text-left text-sm">
              <p>
                <span className="text-gray-500">Nome:</span>{" "}
                <span className="font-medium text-gray-800">{verificacao.nome}</span>
              </p>
              <p>
                <span className="text-gray-500">Embaixada:</span>{" "}
                <span className="font-medium text-gray-800">{verificacao.embaixada}</span>
              </p>
              <p>
                <span className="text-gray-500">Válida até:</span>{" "}
                <span className="font-medium text-gray-800">
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
