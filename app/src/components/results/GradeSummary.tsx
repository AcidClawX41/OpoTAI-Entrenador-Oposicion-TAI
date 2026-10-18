// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
/**
 * Tarjeta de la nota: «Nota real» con indicador radial (una o varias unidades de
 * calificación), APTO / NO APTO, margen respecto al corte y recuento de respuestas.
 * Se usa en Resultados y en la Calculadora. Solo presenta lo que calcula el núcleo.
 */
import type { ReactNode } from "react";
import { CircleCheck, CircleMinus, CircleX, Clock, Info, MinusCircle, Scale } from "lucide-react";
import type { GradeResult, ScoringScheme, UnitGrade } from "@/api/types";
import { cn } from "@/lib/cn";
import { formatDirect, formatGrade, formatInt } from "@/lib/format";
import { CUTOFF_SOURCE_LABEL, unitLabel } from "@/lib/labels";
import { partName } from "@/lib/exam/structure";
import { formatDuration } from "@/lib/time";
import { RadialGauge } from "@/components/ui/RadialGauge";
import { Progress } from "@/components/ui/misc";

interface GradeSummaryProps {
  grade: GradeResult;
  /** Esquema (para estimar cuántos aciertos faltan). */
  scheme?: ScoringScheme | null;
  /** «APTO / NO APTO» en exámenes completos; «Aprobado / Suspenso» en prácticas. */
  verdictStyle?: "exam" | "practice";
  elapsedSeconds?: number | null;
  durationMinutes?: number | null;
  /** Versión más baja para la calculadora. */
  compact?: boolean;
  className?: string;
}

export function totals(grade: GradeResult) {
  return grade.parts.reduce(
    (acc, p) => ({
      correct: acc.correct + p.correct,
      wrong: acc.wrong + p.wrong,
      blank: acc.blank + p.blank,
      annulled: acc.annulled + p.annulled,
      direct: acc.direct + p.direct,
      max_direct: acc.max_direct + p.max_direct,
    }),
    { correct: 0, wrong: 0, blank: 0, annulled: 0, direct: 0, max_direct: 0 },
  );
}

/** Aciertos aproximados que faltan para llegar al corte de una unidad (solo informativo). */
export function correctsToCutoff(unit: UnitGrade, scheme: ScoringScheme | null | undefined): number | null {
  if (unit.passed || unit.margin_direct >= 0 || !scheme) return null;
  const values = scheme.parts.filter((p) => unit.parts.includes(p.part)).map((p) => p.value);
  const value = values.length ? Math.min(...values) : null;
  if (!value || value <= 0) return null;
  return Math.max(1, Math.ceil(-unit.margin_direct / value - 1e-9));
}

function VerdictPill({ passed, style, size = "md" }: { passed: boolean; style: "exam" | "practice"; size?: "sm" | "md" }) {
  const text = style === "exam" ? (passed ? "APTO" : "NO APTO") : passed ? "Aprobado" : "Suspenso";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-bold tracking-wide",
        size === "md" ? "h-8 px-3.5 text-sm" : "h-6.5 px-2.5 text-xs",
        passed ? "bg-success text-white shadow-[0_6px_20px_-6px_var(--app-success)]" : "bg-danger-soft text-danger-text ring-1 ring-danger/30",
      )}
    >
      {passed ? <CircleCheck className="size-4" aria-hidden /> : <CircleX className="size-4" aria-hidden />}
      {text}
    </span>
  );
}

function UnitGauge({ unit, label, sublabel, size, single }: { unit: UnitGrade; label: string; sublabel?: string | null; size: number; single: boolean }) {
  return (
    <div className="flex flex-col items-center">
      {!single ? (
        <p className="mb-1 text-center leading-4">
          <span className="block text-xs font-semibold uppercase tracking-[0.08em] text-fg-subtle">{label}</span>
          {sublabel ? <span className="block text-[12px] font-medium text-fg-muted">{sublabel}</span> : null}
        </p>
      ) : null}
      <RadialGauge
        value={unit.ungraded ? 0 : unit.grade}
        max={unit.max_grade}
        marker={unit.pass_grade}
        size={size}
        thickness={single ? 16 : 13}
        tone={unit.passed ? "success" : "danger"}
        label={
          unit.ungraded
            ? `${label}: sin corregir porque no se superó la parte anterior${unit.would_be_grade != null ? `; orientativa ${formatGrade(unit.would_be_grade)}` : ""}`
            : `${label}: ${formatGrade(unit.grade)} de ${formatInt(unit.max_grade)}; se aprueba con ${formatInt(unit.pass_grade)}`
        }
      >
        {unit.ungraded ? (
          // Partes eliminatorias: no se corrige, pero se enseña lo que habría sacado (no cuenta).
          <div className="px-3 leading-none">
            <p className="text-[15px] font-semibold text-fg">Sin corregir</p>
            {unit.would_be_grade != null ? (
              <p className="mt-2 text-[11px] text-fg-muted">
                Orientativa <span className="font-semibold tabular-nums text-fg">{formatGrade(unit.would_be_grade)}</span>
                <br />
                no cuenta
              </p>
            ) : null}
          </div>
        ) : (
          <div className="leading-none">
            {single ? <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-subtle">Nota real</p> : null}
            <p className={cn("font-semibold tracking-tight text-fg tabular-nums", single ? "text-[44px]" : "text-[30px]")}>{formatGrade(unit.grade)}</p>
            <p className={cn("text-fg-muted", single ? "mt-2 text-xs" : "mt-1.5 text-[11px]")}>
              de {formatInt(unit.max_grade)} · aprueba {formatInt(unit.pass_grade)}
            </p>
          </div>
        )}
      </RadialGauge>
      {!single ? (
        <span
          className={cn(
            "-mt-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
            unit.passed ? "bg-success-soft text-success-text" : "bg-danger-soft text-danger-text",
          )}
        >
          {unit.passed ? <CircleCheck className="size-3" aria-hidden /> : <CircleX className="size-3" aria-hidden />}
          {unit.passed ? "Superada" : unit.ungraded ? "No se corrige" : "No superada"}
        </span>
      ) : null}
    </div>
  );
}

function UnitBar({ unit, label, scheme, showLabel }: { unit: UnitGrade; label: string; scheme?: ScoringScheme | null; showLabel: boolean }) {
  const missing = correctsToCutoff(unit, scheme);
  return (
    <div>
      <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-[13px]">
        <span className="font-medium text-fg">
          {showLabel ? `${label} · ` : ""}Puntuación directa{" "}
          <span className="tabular-nums">{formatDirect(unit.direct)}</span>
          <span className="text-fg-subtle"> de {formatDirect(unit.max_direct)}</span>
        </span>
        <span className="text-xs text-fg-muted">
          Corte <strong className="font-semibold tabular-nums text-fg">{formatDirect(unit.cutoff_direct)}</strong> · {CUTOFF_SOURCE_LABEL[unit.cutoff_source]}
        </span>
      </div>
      <Progress
        value={Math.max(0, unit.direct)}
        max={unit.max_direct || 1}
        marker={unit.cutoff_direct}
        tone={unit.passed ? "success" : "danger"}
        size="md"
        label={`${label}: puntuación directa ${formatDirect(unit.direct)} de ${formatDirect(unit.max_direct)}, corte ${formatDirect(unit.cutoff_direct)}`}
      />
      <p className={cn("mt-1.5 text-xs", unit.passed ? "text-success-text" : "text-danger-text")}>
        {unit.ungraded
          ? `No se corrige porque no superaste la parte anterior (como en el examen real), así que cuenta 0.${
              unit.would_be_grade != null ? ` Con esta directa te habría correspondido un ${formatGrade(unit.would_be_grade)} (orientativo).` : ""
            }`
          : unit.margin_direct >= 0
          ? `Superas el corte por ${formatDirect(unit.margin_direct)} ${Math.abs(unit.margin_direct - 1) < 1e-9 ? "punto" : "puntos"} directos.`
          : `Te faltan ${formatDirect(-unit.margin_direct)} puntos directos para el corte${missing ? ` (≈ ${formatInt(missing)} ${missing === 1 ? "acierto" : "aciertos"} más)` : ""}.`}
      </p>
    </div>
  );
}

function CountTile({ label, value, icon, tone }: { label: string; value: number; icon: ReactNode; tone: "success" | "danger" | "neutral" | "muted" }) {
  return (
    <div className="rounded-xl border border-border bg-surface-2/60 px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-xs text-fg-muted">
        <span
          className={cn(
            "[&_svg]:size-3.5",
            tone === "success" && "text-success-text",
            tone === "danger" && "text-danger-text",
            tone === "neutral" && "text-fg-subtle",
            tone === "muted" && "text-fg-subtle",
          )}
        >
          {icon}
        </span>
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-fg">{formatInt(value)}</p>
    </div>
  );
}

export function GradeSummary({ grade, scheme, verdictStyle = "exam", elapsedSeconds = null, durationMinutes = null, compact = false, className }: GradeSummaryProps) {
  const units = grade.units;
  const single = units.length <= 1;
  const t = totals(grade);
  const passGrade = units.reduce((s, u) => s + u.pass_grade, 0);
  const twoParts = grade.parts.length > 1;
  const unitName = (u: UnitGrade): string | null => {
    if (u.parts.length !== 1) return null;
    const kind = scheme?.parts.find((p) => p.part === u.parts[0])?.kind;
    return kind ? partName(kind) : null;
  };
  return (
    <div className={cn("@container relative overflow-hidden rounded-2xl border border-border bg-surface shadow-card", className)}>
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -left-20 -top-24 size-80 [mask-image:radial-gradient(closest-side,#000,transparent)]",
          grade.passed ? "bg-success/12" : "bg-danger/10",
        )}
      />
      <div className={cn("relative grid gap-x-10 gap-y-6 @3xl:grid-cols-[auto_minmax(0,1fr)] @3xl:items-center", compact ? "p-5" : "p-6 @3xl:p-7")}>
        <div className="flex flex-col items-center gap-3">
          <div className={cn("flex items-start justify-center", single ? "" : "gap-4")}>
            {units.map((u, i) => (
              <UnitGauge
                key={i}
                unit={u}
                label={unitLabel(u, units.length)}
                sublabel={unitName(u)}
                single={single}
                size={single ? (compact ? 184 : 212) : compact ? 146 : 160}
              />
            ))}
          </div>
          {!single ? (
            <p className="text-center text-sm text-fg-muted">
              Nota final <strong className="text-lg font-semibold tabular-nums text-fg">{formatGrade(grade.total_grade)}</strong>
              <span className="text-fg-subtle"> de {formatInt(grade.max_grade)}</span>
            </p>
          ) : null}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <VerdictPill passed={grade.passed} style={verdictStyle} />
            <p className="text-sm text-fg-muted">
              {single ? (
                <>
                  Apruebas con <strong className="text-fg tabular-nums">{formatInt(passGrade)}</strong> de {formatInt(grade.max_grade)}
                  {twoParts ? " · las dos partes se califican juntas" : ""}
                </>
              ) : (
                <>Examen en dos partes: hay que superar las dos y la nota final es la suma</>
              )}
            </p>
          </div>

          <div className="mt-5 space-y-4">
            {units.map((u, i) => (
              <UnitBar key={i} unit={u} label={unitLabel(u, units.length)} scheme={scheme} showLabel={!single} />
            ))}
          </div>

          <div className={cn("mt-5 grid grid-cols-2 gap-2.5", compact ? "@md:grid-cols-4" : "@lg:grid-cols-4")}>
            <CountTile label="Aciertos" value={t.correct} icon={<CircleCheck />} tone="success" />
            <CountTile label="Fallos" value={t.wrong} icon={<CircleX />} tone="danger" />
            <CountTile label="En blanco" value={t.blank} icon={<CircleMinus />} tone="neutral" />
            <CountTile label="Anuladas" value={t.annulled} icon={<MinusCircle />} tone="muted" />
          </div>

          {!compact ? (
            <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-fg-muted">
              <span className="inline-flex items-center gap-1.5">
                <Scale className="size-3.5 text-fg-subtle" aria-hidden />
                La nota real transforma tu puntuación directa como el tribunal: el corte equivale a {formatInt(units[0]?.pass_grade ?? 50)}
                {single ? "" : " en cada parte"}.
              </span>
              {elapsedSeconds !== null ? (
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="size-3.5 text-fg-subtle" aria-hidden />
                  {formatDuration(elapsedSeconds)}
                  {durationMinutes ? ` de ${formatInt(durationMinutes)} min` : ""}
                </span>
              ) : null}
            </p>
          ) : null}
        </div>
      </div>
      {grade.notes.length > 0 && !compact ? (
        <div className="relative border-t border-border bg-surface-2/40 px-6 py-3.5">
          <ul className="space-y-1.5">
            {grade.notes.map((n) => (
              <li key={n} className="flex items-start gap-2 text-[13px] leading-5 text-fg-muted">
                <Info className="mt-0.5 size-3.5 shrink-0 text-info-text" aria-hidden />
                {n}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
