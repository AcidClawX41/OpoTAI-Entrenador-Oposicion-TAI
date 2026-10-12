// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
/**
 * Selector del modo de un examen completo: «Aprendizaje» (sin límite y corrección en cada
 * pregunta) o «Examen real» (cronómetro oficial y corrección al entregar).
 * Dos tarjetas grandes con semántica de grupo de opciones (radiogroup) y flechas del teclado.
 */
import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { Check, GraduationCap, Timer } from "lucide-react";
import { cn } from "@/lib/cn";
import type { ExamRunMode } from "@/lib/examMode";
import { RUN_MODE_LABEL } from "@/lib/examMode";
import { playSfx } from "@/lib/sfx";

interface ExamModeChooserProps {
  value: ExamRunMode;
  onChange: (mode: ExamRunMode) => void;
  /** Minutos del cronómetro oficial (del sorteo, del esquema o del banco); null si no se conoce. */
  durationMinutes: number | null;
  /** Sustituye la línea del cronómetro (p. ej. en supuestos sueltos). */
  timerLabel?: string;
  /** «auto»: dos columnas si caben; «stack»: una debajo de otra. */
  layout?: "auto" | "stack";
  label?: string;
  /** Muestra el título «¿Cómo quieres hacerlo?» encima de las tarjetas. */
  heading?: ReactNode;
  className?: string;
}

interface ModeCopy {
  mode: ExamRunMode;
  icon: ReactNode;
  lead: string;
  points: string[];
}

export function modeCopy(mode: ExamRunMode, durationMinutes: number | null, timerLabel?: string): ModeCopy {
  if (mode === "learning")
    return {
      mode,
      icon: <GraduationCap />,
      lead: "Sin límite de tiempo",
      points: ["Corrección y explicación en cada pregunta", "Ideal para estudiar"],
    };
  return {
    mode,
    icon: <Timer />,
    lead: timerLabel ?? (durationMinutes ? `Cronómetro oficial (${durationMinutes} min)` : "Cronómetro oficial"),
    points: ["Se corrige al entregar, como el tribunal", "Se entrega solo al agotarse el tiempo"],
  };
}

const TONE: Record<ExamRunMode, { active: string; icon: string; iconActive: string; dot: string; check: string }> = {
  learning: {
    active: "border-info bg-info-soft shadow-[0_10px_30px_-18px_var(--app-info)]",
    icon: "bg-info-soft text-info-text",
    iconActive: "bg-info text-white",
    dot: "border-info bg-info",
    check: "text-info-text",
  },
  real: {
    active: "border-accent bg-accent-soft shadow-glow",
    icon: "bg-accent-soft text-accent-text",
    iconActive: "bg-accent text-accent-fg",
    dot: "border-accent bg-accent",
    check: "text-accent-text",
  },
};

const MODES: ExamRunMode[] = ["learning", "real"];

export function ExamModeChooser({
  value,
  onChange,
  durationMinutes,
  timerLabel,
  layout = "auto",
  label = "Modo del examen",
  heading,
  className,
}: ExamModeChooserProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const baseId = useId();

  const select = (mode: ExamRunMode) => {
    if (mode !== value) playSfx("nav");
    onChange(mode);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    const idx = MODES.indexOf(value);
    const next =
      event.key === "Home" ? 0 : event.key === "End" ? MODES.length - 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? (idx + MODES.length - 1) % MODES.length : (idx + 1) % MODES.length;
    const mode = MODES[next];
    if (mode) {
      select(mode);
      refs.current[next]?.focus();
    }
  };

  return (
    <div className={cn("@container", className)}>
      {heading ? (
        <p id={`${baseId}-heading`} className="mb-2.5 text-[13px] font-semibold text-fg">
          {heading}
        </p>
      ) : null}
      <div
        role="radiogroup"
        aria-label={heading ? undefined : label}
        aria-labelledby={heading ? `${baseId}-heading` : undefined}
        onKeyDown={onKeyDown}
        className={cn("grid gap-3", layout === "auto" && "@md:grid-cols-2")}
      >
        {MODES.map((mode, i) => {
          const copy = modeCopy(mode, durationMinutes, timerLabel);
          const active = mode === value;
          const tone = TONE[mode];
          const descId = `${baseId}-${mode}`;
          return (
            <button
              key={mode}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={RUN_MODE_LABEL[mode]}
              aria-describedby={descId}
              tabIndex={active ? 0 : -1}
              data-mode={mode}
              onClick={() => select(mode)}
              className={cn(
                "group relative flex min-w-0 items-start gap-3.5 rounded-2xl border-2 p-4 text-left transition-all duration-200",
                active ? tone.active : "border-border bg-surface hover:-translate-y-0.5 hover:border-border-strong hover:shadow-card",
              )}
            >
              <span
                className={cn(
                  "grid size-11 shrink-0 place-items-center rounded-xl transition-colors [&_svg]:size-5.5",
                  active ? tone.iconActive : tone.icon,
                )}
                aria-hidden
              >
                {copy.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="text-[16px] font-semibold tracking-tight text-fg">{RUN_MODE_LABEL[mode]}</span>
                  <span
                    aria-hidden
                    className={cn(
                      "grid size-5 shrink-0 place-items-center rounded-full border-2 transition-colors",
                      active ? tone.dot : "border-border-strong bg-transparent",
                    )}
                  >
                    {active ? <Check className="size-3 text-white" strokeWidth={3.5} /> : null}
                  </span>
                </span>
                <span id={descId} className="block">
                  <span className="mt-0.5 block text-[13.5px] font-semibold text-fg-muted">{copy.lead}</span>
                  <span className="mt-2 block space-y-1">
                    {copy.points.map((p) => (
                      <span key={p} className="flex items-start gap-1.5 text-[12.5px] leading-5 text-fg-muted">
                        <Check className={cn("mt-0.5 size-3.5 shrink-0", active ? tone.check : "text-fg-subtle")} strokeWidth={2.75} aria-hidden />
                        <span>{p}</span>
                      </span>
                    ))}
                  </span>
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
