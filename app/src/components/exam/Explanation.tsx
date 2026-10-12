// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
/** Caja «Por qué»: explicación, nota de la opción marcada, referencias y aviso de normativa. */
import { BookMarked, CircleCheck, CircleX, Info, Lightbulb, MinusCircle, TriangleAlert } from "lucide-react";
import type { Letter } from "@/api/types";
import { cn } from "@/lib/cn";
import { Markdown } from "@/components/ui/Markdown";

const LETTERS: Letter[] = ["A", "B", "C", "D"];

interface ExplanationProps {
  chosen: Letter | null;
  correct: Letter | null;
  annulled?: boolean;
  explanation: string | null;
  optionNotes: (string | null)[] | null;
  references: string[];
  outdated?: boolean;
  outdatedNote?: string | null;
  /** Muestra la cabecera de resultado (modo inmediato). */
  showVerdict?: boolean;
  /** `neutral`: sin color de acierto/fallo (la revisión ya colorea las opciones). */
  tone?: "auto" | "neutral";
  className?: string;
}

export function Explanation({
  chosen,
  correct,
  annulled = false,
  explanation,
  optionNotes,
  references,
  outdated = false,
  outdatedNote = null,
  showVerdict = false,
  tone: toneMode = "auto",
  className,
}: ExplanationProps) {
  const isCorrect = !annulled && chosen !== null && chosen === correct;
  const chosenNote = chosen && !isCorrect ? (optionNotes?.[LETTERS.indexOf(chosen)] ?? null) : null;
  const tone = toneMode === "neutral" || annulled || chosen === null ? "neutral" : isCorrect ? "success" : "danger";

  return (
    <div
      className={cn(
        "rounded-2xl border p-5",
        tone === "success" && "border-success/30 bg-success-soft",
        tone === "danger" && "border-danger/30 bg-danger-soft",
        tone === "neutral" && "border-border bg-surface-2/70",
        className,
      )}
      role={showVerdict ? "status" : undefined}
    >
      {showVerdict ? (
        <p className="mb-3 flex items-center gap-2 text-[15px] font-semibold text-fg">
          {annulled ? (
            <>
              <MinusCircle className="size-5 text-fg-muted" aria-hidden /> Pregunta anulada en la plantilla: no puntúa
            </>
          ) : chosen === null ? (
            <>
              <Info className="size-5 text-info-text" aria-hidden /> En blanco · la respuesta correcta es la {correct ?? "—"}
            </>
          ) : isCorrect ? (
            <>
              <CircleCheck className="size-5 text-success-text" aria-hidden /> ¡Correcto!
            </>
          ) : (
            <>
              <CircleX className="size-5 text-danger-text" aria-hidden /> Incorrecto · la respuesta correcta es la {correct ?? "—"}
            </>
          )}
        </p>
      ) : null}

      <div className="flex gap-3">
        <Lightbulb className="mt-0.5 size-4.5 shrink-0 text-warning-text" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-fg-muted">Por qué</p>
          {explanation ? (
            <Markdown className="mt-1.5 text-[14.5px] text-fg">{explanation}</Markdown>
          ) : (
            <p className="mt-1.5 text-[14.5px] leading-6 text-fg-muted">
              Esta pregunta aún no tiene explicación.{" "}
              {correct ? (
                <>
                  La respuesta correcta es la <strong className="text-fg">{correct}</strong>.
                </>
              ) : null}
            </p>
          )}
          {chosenNote ? (
            <div className="mt-3 rounded-xl border border-danger/25 bg-surface/70 px-3.5 py-2.5 text-[14px]">
              <span className="font-semibold text-danger-text">Has marcado {chosen}: </span>
              <Markdown inline className="inline text-fg-muted">
                {chosenNote}
              </Markdown>
            </div>
          ) : null}
          {references.length > 0 ? (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <BookMarked className="size-3.5 text-fg-subtle" aria-label="Referencias" />
              {references.map((r) => (
                <span key={r} className="rounded-md border border-border bg-surface px-2 py-0.5 text-xs text-fg-muted">
                  {r}
                </span>
              ))}
            </div>
          ) : null}
          {outdated ? (
            <p className="mt-3 flex items-start gap-2 rounded-xl border border-warning/30 bg-warning-soft px-3 py-2 text-[13px] text-fg">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning-text" aria-hidden />
              <span>
                <strong>Normativa o tecnología desactualizada.</strong> {outdatedNote ?? "Comprueba la versión vigente antes de memorizarla."}
              </span>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
