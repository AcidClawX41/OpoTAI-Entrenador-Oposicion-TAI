// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
/** Diálogos del examen: entrega (con resumen) y salida. */
import { CircleCheck, Flag, LogOut, Send, TriangleAlert, Trash2 } from "lucide-react";
import type { ExamPaper } from "@/api/types";
import { formatInt, plural } from "@/lib/format";
import type { ExamSummary } from "@/lib/exam/summary";
import { tabsOf } from "@/lib/exam/navigation";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";

interface SubmitDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onGo: (questionId: string) => void;
  paper: ExamPaper;
  summary: ExamSummary;
  submitting: boolean;
}

export function SubmitDialog({ open, onClose, onConfirm, onGo, paper, summary, submitting }: SubmitDialogProps) {
  const needsCase = paper.requires_case_choice;
  const twoParts = tabsOf(paper).length > 1;
  return (
    <Dialog
      open={open}
      onClose={onClose}
      icon={<Send />}
      title="¿Entregar el examen?"
      description="Una vez entregado se corrige como el tribunal y ya no podrás cambiar las respuestas."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Seguir revisando
          </Button>
          <Button variant="primary" loading={submitting} leftIcon={<Send className="size-4" />} onClick={onConfirm} data-autofocus="">
            Entregar examen
          </Button>
        </>
      }
    >
      <dl className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-surface-2/70 p-3">
          <dt className="text-xs text-fg-muted">Respondidas</dt>
          <dd className="mt-1 text-xl font-semibold tabular-nums text-fg">
            {formatInt(summary.answered)}
            <span className="text-sm font-normal text-fg-subtle"> / {formatInt(summary.total)}</span>
          </dd>
        </div>
        <div className="rounded-xl border border-border bg-surface-2/70 p-3">
          <dt className="text-xs text-fg-muted">En blanco</dt>
          <dd className="mt-1 text-xl font-semibold tabular-nums text-fg">{formatInt(summary.blank)}</dd>
        </div>
        <div className="rounded-xl border border-border bg-surface-2/70 p-3">
          <dt className="text-xs text-fg-muted">Dudosas</dt>
          <dd className="mt-1 text-xl font-semibold tabular-nums text-fg">{formatInt(summary.flagged.length)}</dd>
        </div>
      </dl>

      {twoParts ? (
        <ul className="mt-3 space-y-1.5" aria-label="Respondidas por partes">
          {(["theory", "case"] as const).map((tab, i) => (
            <li key={tab} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-[13px]">
              <span className="flex items-center gap-2 text-fg">
                <span className="grid size-5 place-items-center rounded-full bg-accent text-[11px] font-bold text-accent-fg" aria-hidden>
                  {i + 1}
                </span>
                Parte {i + 1} · {tab === "theory" ? "Cuestionario" : "Supuesto práctico"}
              </span>
              <span className="tabular-nums text-fg-muted">
                {tab === "case" && summary.caseChoicePending
                  ? "sin elegir supuesto"
                  : `${formatInt(summary.perTab[tab].answered)} de ${formatInt(summary.perTab[tab].total)} respondidas`}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {summary.flagged.length > 0 ? (
        <div className="mt-4">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-fg-muted">
            <Flag className="size-3.5 text-warning-text" aria-hidden /> Revisa tus dudosas:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {summary.flagged.map((f) => (
              <button
                key={f.questionId}
                type="button"
                onClick={() => onGo(f.questionId)}
                className="rounded-lg border border-warning/40 bg-warning-soft px-2.5 py-1 text-xs font-semibold tabular-nums text-warning-text hover:border-warning"
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {needsCase ? (
        summary.chosenCase ? (
          <p className="mt-4 flex items-start gap-2 rounded-xl border border-success/30 bg-success-soft px-3.5 py-2.5 text-sm text-fg">
            <CircleCheck className="mt-0.5 size-4 shrink-0 text-success-text" aria-hidden />
            <span>
              Supuesto elegido: <strong>{summary.chosenCase.title}</strong>
              {summary.answeredInOtherCases > 0
                ? `. Las ${summary.answeredInOtherCases} respuestas del otro supuesto no puntúan.`
                : "."}
            </span>
          </p>
        ) : (
          <p className="mt-4 flex items-start gap-2 rounded-xl border border-warning/30 bg-warning-soft px-3.5 py-2.5 text-sm text-fg">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning-text" aria-hidden />
            No has elegido supuesto práctico: la 2.ª parte contará como en blanco.
          </p>
        )
      ) : null}
      {summary.reservesAnswered > 0 ? (
        <p className="mt-3 text-xs text-fg-subtle">
          Has respondido {plural(summary.reservesAnswered, "pregunta")} de reserva: solo cuentan si se anula alguna pregunta.
        </p>
      ) : null}
    </Dialog>
  );
}

interface ExitDialogProps {
  open: boolean;
  onClose: () => void;
  onSaveExit: () => void;
  onAbandon: () => void;
  busy: boolean;
}

export function ExitDialog({ open, onClose, onSaveExit, onAbandon, busy }: ExitDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      icon={<LogOut />}
      iconTone="warning"
      title="¿Salir del examen?"
      description="Tu progreso está guardado: podrás continuarlo desde Inicio. Si lo abandonas, no contará en tus estadísticas."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Seguir con el examen
          </Button>
          <Button variant="danger" loading={busy} leftIcon={<Trash2 className="size-4" />} onClick={onAbandon}>
            Abandonar
          </Button>
          <Button variant="primary" loading={busy} leftIcon={<LogOut className="size-4" />} onClick={onSaveExit} data-autofocus="">
            Guardar y salir
          </Button>
        </>
      }
    />
  );
}
