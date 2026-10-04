"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

/** Faixa discreta quando o aparelho fica sem internet (o app abre offline, mas os dados vêm da API). */
export function AvisoOffline() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const atualizar = () => setOffline(!navigator.onLine);
    atualizar();
    window.addEventListener("online", atualizar);
    window.addEventListener("offline", atualizar);
    return () => {
      window.removeEventListener("online", atualizar);
      window.removeEventListener("offline", atualizar);
    };
  }, []);

  if (!offline) return null;

  return (
    <div role="status" className="flex items-center gap-2 border-b border-border bg-surface-2 px-4 py-2 text-sm text-text-muted sm:px-6 lg:px-8">
      <WifiOff size={16} className="flex-shrink-0" aria-hidden="true" />
      Sem conexão — alguns dados podem não carregar.
    </div>
  );
}
