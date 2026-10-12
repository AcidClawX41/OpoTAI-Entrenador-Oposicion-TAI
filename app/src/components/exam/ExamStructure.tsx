// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
/**
 * «Estructura del examen»: 1.ª parte · Cuestionario y 2.ª parte · Supuesto práctico, con el
 * número de preguntas, la puntuación de aciertos y errores, la escala y el mínimo de cada parte,
 * la duración total y la regla de aprobado. Solo presenta datos del esquema oficial.
 */
import { ArrowRight, CircleMinus, CirclePlus, Clock, Equal, Plus, Scale } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatDirect, formatInt, formatNumber, formatPenalty, ordinalFem } from "@/lib/format";
import type { ExamStructureInfo, StructurePart } from "@/lib/exam/structure";

function caseLine(p: StructurePart): string {
  const choose = p.casesOffered && p.casesOffered > 1 ? `Eliges ${p.casesToChoose ?? 1} de ${p.casesOffered} supuestos` : "Un supuesto";
  return `${choose} · ${formatInt(p.questions)} preguntas`;
}

function scaleText(p: StructurePart, info: ExamStructureInfo): string {
  if (p.maxGrade !== null && p.passGrade !== null) return `Nota de 0 a ${formatInt(p.maxGrade)} · mínimo ${formatInt(p.passGrade)}`;
  if (info.grading === "joint") return `Suma a la nota conjunta (0–${formatInt(info.totalMax)})`;
  return `Nota de 0 a ${formatInt(info.totalMax)} · aprueba con ${formatInt(info.totalPass)}`;
}

function PartCard({ p, info, compact }: { p: StructurePart; info: ExamStructureInfo; compact: boolean }) {
  const isCase = p.kind === "case";
  return (
    <div
      data-part={p.part}
      className={cn("flex min-w-0 flex-1 flex-col rounded-2xl border border-border bg-surface-2/60", compact ? "p-3.5" : "p-4")}
    >
      <div className="flex items-center gap-2.5">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent text-[13px] font-bold text-accent-fg tabular-nums" aria-hidden>
          {p.part}
        </span>
        <p className="min-w-0 text-[14.5px] font-semibold leading-5 tracking-tight text-fg">
          {ordinalFem(p.part)} parte <span className="text-fg-subtle">·</span> {p.name}
        </p>
      </div>
      {compact ? (
        <p className="mt-2.5 text-[13.5px] font-medium leading-5 text-fg">
          {isCase ? caseLine(p) : `${formatInt(p.questions)} preguntas`}
          {p.reserve ? <span className="font-normal text-fg-muted"> + {formatInt(p.reserve)} de reserva</span> : null}
        </p>
      ) : (
        <>
          <p className="mt-3 text-[28px] font-semibold leading-none tracking-tight text-fg tabular-nums">
            {formatInt(p.questions)} <span className="text-[15px] font-medium text-fg-muted">preguntas</span>
          </p>
          <p className="mt-1.5 text-[13px] leading-5 text-fg-muted">
            {isCase && p.casesOffered && p.casesOffered > 1
              ? `Eliges ${p.casesToChoose ?? 1} de ${p.casesOffered} supuestos (bloques III y IV)`
              : isCase
                ? "Un supuesto práctico"
                : "Tipo test, 4 opciones"}
            {p.reserve ? ` · +${formatInt(p.reserve)} de reserva` : ""}
          </p>
        </>
      )}
      <div className={cn("flex flex-wrap gap-1.5 text-xs font-medium", compact ? "mt-2" : "mt-3")}>
        <span className="inline-flex items-center gap-1 rounded-md bg-success-soft px-2 py-1 text-success-text">
          <CirclePlus className="size-3.5" aria-hidden /> Acierto +{formatNumber(p.value, 2)}
        </span>
        <span className="inline-flex items-center gap-1 rounded-md bg-danger-soft px-2 py-1 text-danger-text">
          <CircleMinus className="size-3.5" aria-hidden /> Error {formatPenalty(p.value, p.penaltyDivisor)}
        </span>
        <span className="inline-flex items-center gap-1 rounded-md bg-surface-3 px-2 py-1 text-fg-muted">
          <Equal className="size-3.5" aria-hidden /> Blanco 0
        </span>
      </div>
      <span className="flex-1" aria-hidden />
      <p className={cn("flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-t border-border text-[12.5px] text-fg-muted", compact ? "mt-2.5 pt-2.5" : "mt-3.5 pt-3")}>
        <span className="font-semibold text-fg">{scaleText(p, info)}</span>
        {p.cutoffDirect !== null && p.maxGrade !== null ? (
          <span className="tabular-nums">
            corte {formatDirect(p.cutoffDirect)}/{formatDirect(p.maxDirect)} directos
          </span>
        ) : null}
      </p>
    </div>
  );
}

/** Regla de aprobado en una frase. */
export function passRule(info: ExamStructureInfo): string {
  if (info.grading === "per_part") {
    const first = info.parts[0];
    const same = info.parts.every((p) => p.passGrade === first?.passGrade && p.maxGrade === first?.maxGrade);
    const each = same && first ? ` (${formatInt(first.passGrade ?? 0)} de ${formatInt(first.maxGrade ?? 0)} en cada una)` : "";
    return `Hay que superar las dos partes${each}. La nota final es la suma: de 0 a ${formatInt(info.totalMax)}.`;
  }
  if (info.grading === "joint")
    return `Las dos partes se califican juntas: la puntuación directa de ambas se convierte en una nota de 0 a ${formatInt(info.totalMax)} y se aprueba con ${formatInt(info.totalPass)}${
      info.jointCutoffDirect !== null ? ` (corte: ${formatDirect(info.jointCutoffDirect)} puntos directos)` : ""
    }.`;
  return `Nota de 0 a ${formatInt(info.totalMax)}; se aprueba con ${formatInt(info.totalPass)}.`;
}

export function durationLine(info: ExamStructureInfo): string {
  if (!info.durationMinutes) return "Sin límite de tiempo.";
  return info.parts.length > 1
    ? `${formatInt(info.durationMinutes)} min para las dos partes, sin pausa.`
    : `${formatInt(info.durationMinutes)} min, sin pausa.`;
}

interface ExamStructureProps {
  info: ExamStructureInfo;
  /** Versión reducida (presentación del sorteo, diálogos). */
  compact?: boolean;
  /** Muestra el título «Estructura del examen». */
  showTitle?: boolean;
  className?: string;
}

export function ExamStructure({ info, compact = false, showTitle = true, className }: ExamStructureProps) {
  const [first, second] = info.parts;
  return (
    <section aria-label="Estructura del examen" className={cn("@container", className)}>
      {showTitle ? (
        <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-subtle">
          Estructura del examen{info.parts.length > 1 ? " · dos partes, un solo examen" : ""}
        </p>
      ) : null}
      {first && second ? (
        <div className="flex flex-col items-stretch gap-2 @lg:flex-row">
          <PartCard p={first} info={info} compact={compact} />
          <span className="grid shrink-0 place-items-center self-center text-fg-subtle" aria-hidden>
            {info.grading === "per_part" ? <Plus className="size-4" /> : <ArrowRight className="size-4" />}
          </span>
          <PartCard p={second} info={info} compact={compact} />
        </div>
      ) : first ? (
        <PartCard p={first} info={info} compact={compact} />
      ) : null}
      <ul className={cn("text-fg-muted", compact ? "mt-3 space-y-1.5 text-[13px] leading-5" : "mt-4 space-y-2.5 text-sm leading-6")}>
        <li className="flex items-start gap-2.5">
          <Clock className="mt-0.5 size-4 shrink-0 text-accent-text" aria-hidden />
          <span>
            <strong className="font-semibold text-fg">Duración oficial:</strong> {durationLine(info)}
          </span>
        </li>
        <li className="flex items-start gap-2.5">
          <Scale className="mt-0.5 size-4 shrink-0 text-accent-text" aria-hidden />
          <span>
            <strong className="font-semibold text-fg">Para aprobar:</strong> {passRule(info)}
          </span>
        </li>
      </ul>
    </section>
  );
}
