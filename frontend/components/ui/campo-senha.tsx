"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface Props {
  id: string;
  rotulo: string;
  valor: string;
  aoMudar: (valor: string) => void;
  autoComplete: "current-password" | "new-password";
  desabilitado?: boolean;
  minLength?: number;
  ajuda?: string;
}

/** Campo de senha com botão de mostrar/ocultar. */
export function CampoSenha({
  id,
  rotulo,
  valor,
  aoMudar,
  autoComplete,
  desabilitado,
  minLength,
  ajuda,
}: Props) {
  const [visivel, setVisivel] = useState(false);

  return (
    <div>
      <label htmlFor={id} className="field-label">
        {rotulo}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visivel ? "text" : "password"}
          autoComplete={autoComplete}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={valor}
          onChange={(e) => aoMudar(e.target.value)}
          className="field pr-11"
          disabled={desabilitado}
          minLength={minLength}
          required
        />
        <button
          type="button"
          onClick={() => setVisivel((atual) => !atual)}
          aria-label={visivel ? "Ocultar senha" : "Mostrar senha"}
          aria-pressed={visivel}
          className="absolute inset-y-0 right-0 flex h-11 w-11 items-center justify-center text-text-muted hover:text-primary"
        >
          {visivel ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {ajuda && <p className="mt-1 text-xs text-text-muted">{ajuda}</p>}
    </div>
  );
}
