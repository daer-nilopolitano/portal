"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { apiFetch, mediaUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatarDataBR } from "@/lib/format";
import { ROTULO_FAIXA_ETARIA, ROTULO_TIPO } from "@/lib/labels";
import type { Embaixada, Estatisticas } from "@/lib/types";
import type { TimelineItem } from "@/components/public/timeline";
import { getCronogramaEventos } from "@/lib/eventos";

interface CarteirinhaResumo {
  foto_url: string | null;
  validade: string;
}

function proximoEvento(eventos: TimelineItem[]) {
  const hoje = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
  return eventos.find((e) => e.dataISO && e.dataISO >= hoje) ?? null;
}

export default function PainelPage() {
  const { token, membro } = useAuth();
  const ehDiretoria = !!membro?.cargo_diretoria;
  const ehEmbaixador = membro?.tipo === "embaixador_do_rei";

  const [estatisticas, setEstatisticas] = useState<Estatisticas | null>(null);
  const [minhaEmbaixada, setMinhaEmbaixada] = useState<Embaixada | null>(null);
  const [todasEmbaixadas, setTodasEmbaixadas] = useState<Embaixada[] | null>(null);
  const [carteirinha, setCarteirinha] = useState<CarteirinhaResumo | null>(null);
  const [carregando, setCarregando] = useState(true);

  const [eventos, setEventos] = useState<TimelineItem[]>([]);

  useEffect(() => {
    if (!token || !membro) return;
    setCarregando(true);

    const pedidos: Promise<unknown>[] = [
      apiFetch<Estatisticas>("/estatisticas/", { token }).then(setEstatisticas),
    ];

    if (ehDiretoria) {
      pedidos.push(apiFetch<Embaixada[]>("/embaixadas/", { token }).then(setTodasEmbaixadas));
      pedidos.push(getCronogramaEventos().then(setEventos));
    } else {
      pedidos.push(
        apiFetch<Embaixada>(`/embaixadas/${membro.embaixada_id}/`, { token }).then(setMinhaEmbaixada)
      );
    }

    if (ehEmbaixador) {
      pedidos.push(
        apiFetch<CarteirinhaResumo>("/carteirinhas/me/", { token })
          .then(setCarteirinha)
          .catch(() => setCarteirinha(null))
      );
    }

    Promise.all(pedidos).finally(() => setCarregando(false));
  }, [token, membro, ehDiretoria, ehEmbaixador]);

  if (!membro) return null;

  return (
    <div>
      <h1 className="text-2xl font-bold text-primary">Olá, {membro.nome.split(" ")[0]}</h1>
      <p className="mt-2 text-text-muted">
        {membro.embaixada_nome} · {ROTULO_TIPO[membro.tipo]}
      </p>

      {carregando ? (
        <p className="mt-8 text-sm text-text-muted">Carregando…</p>
      ) : ehEmbaixador ? (
        <PainelEmbaixador embaixada={minhaEmbaixada} carteirinha={carteirinha} estatisticas={estatisticas} />
      ) : ehDiretoria ? (
        <PainelDiretoria estatisticas={estatisticas} totalEmbaixadas={todasEmbaixadas?.length ?? 0} eventos={eventos} />
      ) : (
        <PainelEmbaixada
          embaixada={minhaEmbaixada}
          estatisticas={estatisticas}
          ehConselheiro={membro.tipo === "conselheiro"}
        />
      )}
    </div>
  );
}

function Card({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <h2 className="font-heading text-base font-semibold text-primary">{titulo}</h2>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Contador({ rotulo, valor }: { rotulo: string; valor: number }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4 text-center">
      <p className="text-2xl font-bold text-primary">{valor}</p>
      <p className="text-xs text-text-muted">{rotulo}</p>
    </div>
  );
}

function ListaNomes({ nomes, vazio }: { nomes: string[]; vazio: string }) {
  if (nomes.length === 0) return <p className="text-sm text-text-muted">{vazio}</p>;
  return (
    <ul className="space-y-1 text-sm text-text">
      {nomes.map((nome) => (
        <li key={nome}>{nome}</li>
      ))}
    </ul>
  );
}

function PainelDiretoria({
  estatisticas,
  totalEmbaixadas,
  eventos,
}: {
  estatisticas: Estatisticas | null;
  totalEmbaixadas: number;
  eventos: TimelineItem[];
}) {
  const evento = proximoEvento(eventos);
  if (!estatisticas) return null;

  return (
    <div className="mt-8 space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Contador rotulo="Embaixadas" valor={totalEmbaixadas} />
        <Contador rotulo="Conselheiros" valor={estatisticas.total_conselheiros} />
        <Contador rotulo="Auxiliares" valor={estatisticas.total_auxiliares} />
        <Contador rotulo="Embaixadores" valor={estatisticas.total_embaixadores} />
        <Contador rotulo="Sem carteirinha" valor={estatisticas.sem_carteirinha.length} />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card titulo="Embaixadores por faixa etária">
          <ul className="space-y-1 text-sm text-text">
            {Object.entries(estatisticas.embaixadores_por_faixa).map(([faixa, qtd]) => (
              <li key={faixa}>
                {ROTULO_FAIXA_ETARIA[faixa] ?? faixa}: <span className="font-medium">{qtd}</span>
              </li>
            ))}
            {Object.keys(estatisticas.embaixadores_por_faixa).length === 0 && (
              <p className="text-text-muted">Nenhum embaixador cadastrado ainda.</p>
            )}
          </ul>
        </Card>

        <Card titulo="Próximo evento">
          {evento ? (
            <div>
              <p className="font-medium text-text">{evento.data}</p>
              <p className="mt-1 text-sm text-text-muted">{evento.texto}</p>
            </div>
          ) : (
            <p className="text-sm text-text-muted">Nenhum evento futuro no cronograma.</p>
          )}
        </Card>

        <Card titulo="Embaixadas sem conselheiro">
          <ListaNomes nomes={estatisticas.embaixadas_sem_conselheiro} vazio="Todas as embaixadas têm conselheiro." />
          {estatisticas.embaixadas_sem_conselheiro.length > 0 && (
            <Link href="/painel/embaixadas" className="mt-3 inline-block text-xs text-primary underline underline-offset-2">
              Ver embaixadas
            </Link>
          )}
        </Card>

        <Card titulo="Sem carteirinha emitida">
          <ListaNomes
            nomes={estatisticas.sem_carteirinha.map((m) => m.nome)}
            vazio="Todos os embaixadores têm carteirinha."
          />
          {estatisticas.sem_carteirinha.length > 0 && (
            <Link href="/painel/embaixadores" className="mt-3 inline-block text-xs text-primary underline underline-offset-2">
              Ver embaixadores
            </Link>
          )}
        </Card>

        <Card titulo="Sem acesso ao sistema">
          <ListaNomes nomes={estatisticas.sem_acesso.map((m) => m.nome)} vazio="Todo mundo já tem acesso." />
        </Card>

        <Card titulo="Aniversariantes do mês">
          <ListaNomes
            nomes={estatisticas.aniversariantes_mes.map((m) => m.nome)}
            vazio="Ninguém faz aniversário este mês."
          />
        </Card>
      </div>

      <div className="flex gap-3">
        <Link href="/painel/embaixadas" className="btn-primary">
          + Nova embaixada
        </Link>
        <Link href="/painel/conselheiros" className="btn-ghost">
          + Novo conselheiro
        </Link>
      </div>
    </div>
  );
}

function PainelEmbaixada({
  embaixada,
  estatisticas,
  ehConselheiro,
}: {
  embaixada: Embaixada | null;
  estatisticas: Estatisticas | null;
  ehConselheiro: boolean;
}) {
  if (!estatisticas) return null;

  return (
    <div className="mt-8 space-y-6">
      {embaixada && (
        <Card titulo={embaixada.nome}>
          <p className="text-sm text-text-muted">Igreja: {embaixada.igreja_nome}</p>
          <p className="mt-1 text-sm text-text-muted">
            Conselheiros: {embaixada.conselheiro_nomes.length > 0 ? embaixada.conselheiro_nomes.join(", ") : "—"}
          </p>
          <p className="mt-1 text-sm text-text-muted">
            Horários:{" "}
            {embaixada.horarios_reuniao.length > 0
              ? embaixada.horarios_reuniao.map((h) => `${h.dia_semana_display} ${h.horario}`).join(", ")
              : "—"}
          </p>
        </Card>
      )}

      <div className="grid grid-cols-3 gap-3 sm:max-w-md">
        <Contador rotulo="Embaixadores" valor={estatisticas.total_embaixadores} />
        <Contador rotulo="Auxiliares" valor={estatisticas.total_auxiliares} />
        <Contador rotulo="Sem carteirinha" valor={estatisticas.sem_carteirinha.length} />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card titulo="Embaixadores por faixa etária">
          <ul className="space-y-1 text-sm text-text">
            {Object.entries(estatisticas.embaixadores_por_faixa).map(([faixa, qtd]) => (
              <li key={faixa}>
                {ROTULO_FAIXA_ETARIA[faixa] ?? faixa}: <span className="font-medium">{qtd}</span>
              </li>
            ))}
            {Object.keys(estatisticas.embaixadores_por_faixa).length === 0 && (
              <p className="text-text-muted">Nenhum embaixador cadastrado ainda.</p>
            )}
          </ul>
        </Card>

        <Card titulo="Aniversariantes do mês">
          <ListaNomes
            nomes={estatisticas.aniversariantes_mes.map((m) => m.nome)}
            vazio="Ninguém faz aniversário este mês."
          />
        </Card>

        <Card titulo="Sem carteirinha emitida">
          <ListaNomes
            nomes={estatisticas.sem_carteirinha.map((m) => m.nome)}
            vazio="Todos os embaixadores têm carteirinha."
          />
        </Card>

        <Card titulo="Sem acesso ao sistema">
          <ListaNomes nomes={estatisticas.sem_acesso.map((m) => m.nome)} vazio="Todo mundo já tem acesso." />
        </Card>
      </div>

      {ehConselheiro && (
        <Link href="/painel/embaixadores" className="btn-primary inline-block">
          + Novo embaixador
        </Link>
      )}
    </div>
  );
}

function PainelEmbaixador({
  embaixada,
  carteirinha,
  estatisticas,
}: {
  embaixada: Embaixada | null;
  carteirinha: CarteirinhaResumo | null;
  estatisticas: Estatisticas | null;
}) {
  return (
    <div className="mt-8 grid gap-6 sm:grid-cols-2">
      <Card titulo="Minha carteirinha">
        {carteirinha ? (
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 overflow-hidden rounded-full border-2 border-daer-yellow bg-gray-100">
              {carteirinha.foto_url ? (
                <Image
                  src={mediaUrl(carteirinha.foto_url) ?? ""}
                  alt=""
                  width={64}
                  height={64}
                  className="h-full w-full object-cover"
                />
              ) : null}
            </div>
            <div>
              <p className="text-sm text-text-muted">Válida até</p>
              <p className="font-medium text-text">{formatarDataBR(carteirinha.validade)}</p>
              <Link href="/minha-carteirinha" className="mt-1 inline-block text-xs text-primary underline underline-offset-2">
                Ver carteirinha
              </Link>
            </div>
          </div>
        ) : (
          <p className="text-sm text-text-muted">
            Sua carteirinha ainda não foi emitida. Fale com seu conselheiro.
          </p>
        )}
      </Card>

      <Card titulo="Minha embaixada">
        {embaixada ? (
          <>
            <p className="text-sm text-text-muted">
              Conselheiros: {embaixada.conselheiro_nomes.length > 0 ? embaixada.conselheiro_nomes.join(", ") : "—"}
            </p>
            <p className="mt-1 text-sm text-text-muted">
              Reuniões:{" "}
              {embaixada.horarios_reuniao.length > 0
                ? embaixada.horarios_reuniao.map((h) => `${h.dia_semana_display} ${h.horario}`).join(", ")
                : "—"}
            </p>
          </>
        ) : (
          <p className="text-sm text-text-muted">Carregando…</p>
        )}
      </Card>

      {estatisticas && estatisticas.aniversariantes_mes.length > 0 && (
        <Card titulo="Aniversariantes do mês">
          <ListaNomes nomes={estatisticas.aniversariantes_mes.map((m) => m.nome)} vazio="" />
        </Card>
      )}
    </div>
  );
}
