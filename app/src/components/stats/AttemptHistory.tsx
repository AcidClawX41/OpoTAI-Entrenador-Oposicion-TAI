// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
/** Historial de intentos con acceso a sus resultados y borrado con confirmación. */
import { useMemo, useState } from "react";
import { ArrowRight, History, Trash2 } from "lucide-react";
import type { AttemptSummary } from "@/api/types";
import { formatDateTime, formatGrade, formatInt, formatProbability } from "@/lib/format";
import { MODE_LABEL } from "@/lib/labels";
import { formatDuration } from "@/lib/time";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Segmented } from "@/components/ui/controls";
import { Dialog } from "@/components/ui/Dialog";
import { Tooltip } from "@/components/ui/overlays";

type Filter = "all" | "full" | "practice";

const PAGE = 10;

interface Props {
  attempts: AttemptSummary[];
  onDelete: (attemptId: string) => Promise<void>;
}

export function AttemptHistory({ attempts, onDelete }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const [visible, setVisible] = useState(PAGE);
  const [pending, setPending] = useState<AttemptSummary | null>(null);
  const [deleting, setDeleting] = useState(false);
  const list = useMemo(
    () =>
      attempts.filter((a) =>
        filter === "all" ? true : filter === "full" ? a.mode === "simulacro" || a.mode === "official" : a.mode === "practice" || a.mode === "review" || a.mode === "case",
      ),
    [attempts, filter],
  );

  return (
    <Card>
      <CardHeader
        title="Historial de intentos"
        description={`${formatInt(attempts.length)} ${attempts.length === 1 ? "intento" : "intentos"} guardados en este perfil`}
        icon={<History />}
        action={
          <Segmented
            size="sm"
            label="Tipo de intento"
            value={filter}
            onChange={(v) => {
              setFilter(v);
              setVisible(PAGE);
            }}
            options={[
              { value: "all", label: "Todos" },
              { value: "full", label: "Simulacros y oficiales" },
              { value: "practice", label: "Prácticas" },
            ]}
          />
        }
      />
      {list.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-fg-muted">No hay intentos de este tipo todavía.</p>
      ) : (
        <div className="mt-4 overflow-x-auto" role="region" aria-label="Historial de intentos" tabIndex={0}>
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead className="border-y border-border bg-surface-2/60 text-xs text-fg-muted">
              <tr>
                <th scope="col" className="w-[44%] py-2.5 pl-5 pr-3 text-left font-semibold">
                  Intento
                </th>
                <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                  Nota
                </th>
                <th scope="col" className="px-3 py-2.5 text-left font-semibold">
                  Resultado
                </th>
                <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                  Aciertos · fallos · blanco
                </th>
                <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                  Plaza
                </th>
                <th scope="col" className="py-2.5 pl-3 pr-5 text-right font-semibold">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {list.slice(0, visible).map((a) => {
                const full = a.mode === "simulacro" || a.mode === "official";
                const finished = a.status === "finished";
                return (
                  <tr key={a.attempt_id} className="transition-colors hover:bg-surface-2/50">
                    <td className="max-w-0 py-3 pl-5 pr-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <Badge tone={full ? "accent" : "neutral"} className="shrink-0">
                          {MODE_LABEL[a.mode]}
                        </Badge>
                        <Tooltip content={a.title} className="min-w-0" disabled={a.title.length < 48}>
                          <span className="truncate font-medium text-fg">{a.title}</span>
                        </Tooltip>
                      </div>
                      <p className="mt-1 text-xs text-fg-subtle">
                        {formatDateTime(a.finished_at ?? a.started_at)} · {formatDuration(a.elapsed_seconds)}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">
                      {a.total_grade !== null && a.max_grade !== null ? (
                        <>
                          <span className="font-semibold text-fg">{formatGrade(a.total_grade)}</span>
                          <span className="text-fg-subtle"> / {formatInt(a.max_grade)}</span>
                        </>
                      ) : (
                        <span className="text-fg-subtle">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {!finished ? (
                        <Badge tone="warning">En curso</Badge>
                      ) : a.passed === null ? (
                        <span className="text-fg-subtle">—</span>
                      ) : (
                        <Badge tone={a.passed ? "success" : "danger"}>{full ? (a.passed ? "APTO" : "NO APTO") : a.passed ? "Aprobado" : "Suspenso"}</Badge>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">
                      <span className="text-success-text">{formatInt(a.correct)}</span>
                      <span className="text-fg-subtle"> · </span>
                      <span className="text-danger-text">{formatInt(a.wrong)}</span>
                      <span className="text-fg-subtle"> · </span>
                      <span className="text-fg-muted">{formatInt(a.blank)}</span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums text-fg-muted">{a.p_plaza !== null ? formatProbability(a.p_plaza) : "—"}</td>
                    <td className="whitespace-nowrap py-3 pl-3 pr-5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {finished ? (
                          <ButtonLink to={`/resultados/${a.attempt_id}`} size="xs" variant="ghost" rightIcon={<ArrowRight className="size-3.5" />}>
                            Ver
                          </ButtonLink>
                        ) : null}
                        <Tooltip content="Eliminar intento">
                          <button
                            type="button"
                            onClick={() => setPending(a)}
                            aria-label={`Eliminar el intento «${a.title}» del ${formatDateTime(a.finished_at ?? a.started_at)}`}
                            className="grid size-7 place-items-center rounded-lg text-fg-subtle transition-colors hover:bg-danger-soft hover:text-danger-text"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </Tooltip>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {list.length > visible ? (
        <div className="flex justify-center border-t border-border px-5 py-3">
          <Button size="sm" variant="ghost" onClick={() => setVisible((v) => v + PAGE)}>
            Mostrar más · quedan {formatInt(list.length - visible)}
          </Button>
        </div>
      ) : (
        <div className="h-2" />
      )}

      <Dialog
        open={pending !== null}
        onClose={() => setPending(null)}
        icon={<Trash2 />}
        iconTone="danger"
        title="¿Eliminar este intento?"
        description={
          pending
            ? `«${pending.title}» del ${formatDateTime(pending.finished_at ?? pending.started_at)}. Dejará de contar en tus estadísticas y no se puede deshacer.`
            : undefined
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setPending(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              loading={deleting}
              leftIcon={<Trash2 className="size-4" />}
              onClick={async () => {
                if (!pending) return;
                setDeleting(true);
                try {
                  await onDelete(pending.attempt_id);
                  setPending(null);
                } finally {
                  setDeleting(false);
                }
              }}
            >
              Eliminar
            </Button>
          </>
        }
      />
    </Card>
  );
}
