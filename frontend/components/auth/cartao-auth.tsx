import Image from "next/image";
import type { ReactNode } from "react";
import { NOME_SITE } from "@/lib/content/site";

interface Props {
  subtitulo: string;
  children: ReactNode;
  rodape?: ReactNode;
}

/** Moldura das telas de senha fora da área logada (esqueci / redefinir): mesmo visual da tela de login. */
export function CartaoAuth({ subtitulo, children, rodape }: Props) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <Image src="/logo-daer.png" alt="" width={56} height={61} priority />
          <p className="mt-3 text-xl font-bold text-primary">{NOME_SITE}</p>
          <p className="mt-1 text-sm text-text-muted">{subtitulo}</p>
        </div>

        <div className="mt-6 rounded-lg border border-border bg-surface p-6">{children}</div>

        {rodape && <div className="mt-4 text-center text-xs text-text-muted">{rodape}</div>}
      </div>
    </div>
  );
}
