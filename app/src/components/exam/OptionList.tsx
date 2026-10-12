// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
/**
 * Opciones A–D grandes y seleccionables (clic de nuevo = dejar en blanco). Siguen
 * siendo pulsables aunque contengan imágenes; el zoom de esas imágenes va en un
 * botón aparte para no anidar elementos interactivos.
 */
import { Check, Loader2, X, ZoomIn } from "lucide-react";
import type { AnswerFeedback, Letter } from "@/api/types";
import { cn } from "@/lib/cn";
import { useUi } from "@/store/ui";
import { Markdown, markdownImages } from "@/components/ui/Markdown";

const LETTERS: Letter[] = ["A", "B", "C", "D"];

interface OptionListProps {
  questionId: string;
  options: string[];
  choice: Letter | null;
  onSelect: (letter: Letter) => void;
  feedback?: AnswerFeedback | null;
  locked?: boolean;
  pending?: Letter | null;
  disabled?: boolean;
  /** Corrección conocida sin interacción (revisión de resultados). */
  reveal?: { correct: Letter | null; chosen: Letter | null; annulled?: boolean } | null;
}

export function OptionList({ questionId, options, choice, onSelect, feedback = null, locked = false, pending = null, disabled = false, reveal = null }: OptionListProps) {
  const openLightbox = useUi((s) => s.openLightbox);
  const result = reveal ?? (feedback ? { correct: feedback.correct, chosen: feedback.chosen, annulled: feedback.annulled } : null);
  const interactive = !reveal && !locked && !disabled;

  return (
    <div role="radiogroup" aria-label="Opciones de respuesta" className="space-y-2.5">
      {options.map((text, i) => {
        const letter = LETTERS[i] ?? "A";
        const selected = (result ? result.chosen : choice) === letter;
        const isCorrect = result !== null && result.correct === letter;
        const isWrongChoice = result !== null && selected && !isCorrect && !result.annulled;
        const dim = result !== null && !isCorrect && !isWrongChoice;
        const images = markdownImages(text);
        const state = result
          ? isCorrect
            ? "correct"
            : isWrongChoice
              ? "wrong"
              : "idle"
          : selected
            ? "selected"
            : "idle";
        return (
          <div key={`${questionId}-${letter}`} className="relative">
            <button
              type="button"
              role="radio"
              aria-checked={selected}
              aria-disabled={!interactive || undefined}
              disabled={disabled && !reveal}
              onClick={() => interactive && onSelect(letter)}
              className={cn(
                "group flex w-full items-start gap-3.5 rounded-xl border px-4 py-3.5 text-left transition-all duration-150",
                interactive && "hover:-translate-y-px",
                state === "idle" && "border-border bg-surface hover:border-border-strong hover:bg-surface-2/60",
                state === "selected" && "border-accent bg-accent-soft shadow-[0_0_0_1px_var(--app-accent)]",
                state === "correct" && "border-success bg-success-soft shadow-[0_0_0_1px_var(--app-success)]",
                state === "wrong" && "border-danger bg-danger-soft shadow-[0_0_0_1px_var(--app-danger)]",
                dim && "opacity-60",
                !interactive && !reveal && "cursor-default",
                images.length > 0 && "pr-14",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "mt-px grid size-8 shrink-0 place-items-center rounded-full border text-[13px] font-bold transition-colors",
                  state === "idle" && "border-border-strong bg-surface-2 text-fg-muted group-hover:text-fg",
                  state === "selected" && "border-accent bg-accent text-accent-fg",
                  state === "correct" && "border-success bg-success text-white",
                  state === "wrong" && "border-danger bg-danger text-white",
                )}
              >
                {pending === letter ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : state === "correct" ? (
                  <Check className="size-4" strokeWidth={3} />
                ) : state === "wrong" ? (
                  <X className="size-4" strokeWidth={3} />
                ) : (
                  letter
                )}
              </span>
              <span className="min-w-0 flex-1 pt-1">
                <span className="sr-only">{`Opción ${letter}${state === "correct" ? " (correcta)" : state === "wrong" ? " (tu respuesta, incorrecta)" : ""}: `}</span>
                <Markdown inline imageMode="static" className="text-[15px] leading-[1.6] text-fg">
                  {text}
                </Markdown>
              </span>
            </button>
            {images.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  const img = images[0];
                  if (img) openLightbox(img);
                }}
                aria-label={`Ampliar la imagen de la opción ${letter}`}
                className="absolute right-3 top-3 grid size-8 place-items-center rounded-lg border border-border bg-surface text-fg-muted shadow-card transition-colors hover:text-fg"
              >
                <ZoomIn className="size-4" />
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
