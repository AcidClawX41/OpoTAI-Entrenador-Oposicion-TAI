// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
/**
 * Puntuación por partes: aciertos, errores, blancos, anuladas, penalización, puntuación directa,
 * nota en la escala de cada parte, mínimo y si se supera; y la nota final del examen.
 * Con calificación conjunta, la nota y el mínimo ocupan las filas de las partes que la forman.
 */
import { CircleCheck, CircleX } from "lucide-react";
import type { GradeResult, PartScore, ScoringScheme, UnitGrade } from "@/api/types";
import { cn } from "@/lib/cn";
import { formatDirect, formatGrade, formatInt, formatNumber, formatPenalty, ordinalFem } from "@/lib/format";
import { partName } from "@/lib/exam/structure";
import { totals } from "./GradeSummary";

function Verdict({ passed, final = false, ungraded = false }: { passed: boolean; final?: boolean; ungraded?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold",
        passed ? (final ? "bg-success text-white" : "bg-success-soft text-success-text") : "bg-danger-soft text-danger-text",
      )}
    >
      {passed ? <CircleCheck className="size-3.5" aria-hidden /> : <CircleX className="size-3.5" aria-hidden />}
      {final ? (passed ? "APTO" : "NO APTO") : passed ? "Superada" : ungraded ? "No se corrige" : "No superada"}
    </span>
  );
}

function unitOf(grade: GradeResult, part: number): UnitGrade | undefined {
  return grade.units.find((u) => u.parts.includes(part));
}

export function PartsTable({ grade, scheme, className }: { grade: GradeResult; scheme?: ScoringScheme | null; className?: string }) {
  const t = totals(grade);
  const penalty = grade.parts.reduce((s, p) => s + p.penalty_points, 0);
  const multi = grade.parts.length > 1;
  const passSum = grade.units.reduce((s, u) => s + u.pass_grade, 0);
  const th = "px-3 py-2.5 text-right text-xs font-semibold text-fg-muted first:pl-5 first:text-left last:pr-5";
  const td = "px-3 py-3 text-right tabular-nums first:pl-5 first:text-left last:pr-5";
  const kindOf = (p: PartScore) => scheme?.parts.find((x) => x.part === p.part)?.kind;
  const rendered = new Set<UnitGrade>();

  return (
    <div className={cn("overflow-x-auto", className)} role="region" aria-label="Puntuación por partes" tabIndex={0}>
      <table className="w-full min-w-[900px] border-collapse text-sm">
        <thead className="border-b border-border bg-surface-2/60">
          <tr>
            <th scope="col" className={th}>
              Parte
            </th>
            <th scope="col" className={th}>
              Aciertos
            </th>
            <th scope="col" className={th}>
              Errores
            </th>
            <th scope="col" className={th}>
              En blanco
            </th>
            <th scope="col" className={th}>
              Anuladas
            </th>
            <th scope="col" className={th}>
              Penalización
            </th>
            <th scope="col" className={th}>
              Directa
            </th>
            <th scope="col" className={th}>
              Nota
            </th>
            <th scope="col" className={th}>
              Mínimo
            </th>
            <th scope="col" className={cn(th, "text-center")}>
              Resultado
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {grade.parts.map((p) => {
            const kind = kindOf(p);
            const unit = unitOf(grade, p.part);
            const shared = unit && unit.parts.length > 1;
            const first = unit && !rendered.has(unit);
            if (unit) rendered.add(unit);
            const span = shared ? grade.parts.filter((x) => unit.parts.includes(x.part)).length : 1;
            return (
              <tr key={p.part}>
                <th scope="row" className={cn(td, "font-normal")}>
                  <span className="flex items-center gap-2.5">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent text-[11.5px] font-bold text-accent-fg" aria-hidden>
                      {p.part}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-medium text-fg">
                        {ordinalFem(p.part)} parte · {kind ? partName(kind) : p.title}
                      </span>
                      <span className="mt-0.5 block text-xs text-fg-subtle">
                        {formatInt(p.counted)} preguntas · acierto +{formatNumber(p.value, 3)} · error {formatPenalty(p.value, p.penalty_divisor)}
                      </span>
                    </span>
                  </span>
                </th>
                <td className={cn(td, "font-medium text-success-text")}>{formatInt(p.correct)}</td>
                <td className={cn(td, "font-medium text-danger-text")}>{formatInt(p.wrong)}</td>
                <td className={cn(td, "text-fg-muted")}>{formatInt(p.blank)}</td>
                <td className={cn(td, "text-fg-subtle")}>{formatInt(p.annulled)}</td>
                <td className={cn(td, "text-fg-muted")}>{p.penalty_points > 0 ? `−${formatNumber(p.penalty_points, 2, 2)}` : "0"}</td>
                <td className={td}>
                  <span className="font-semibold text-fg">{formatDirect(p.direct)}</span>
                  <span className="text-fg-subtle"> / {formatDirect(p.max_direct)}</span>
                </td>
                {unit && first ? (
                  <>
                    <td className={cn(td, shared && "border-l border-border bg-surface-2/30")} rowSpan={span}>
                      {unit.ungraded ? (
                        <>
                          <span className="font-semibold text-fg">Sin corregir</span>
                          {unit.would_be_grade != null ? (
                            <span className="mt-0.5 block text-[11px] text-fg-subtle">orientativa {formatGrade(unit.would_be_grade)} · no cuenta</span>
                          ) : null}
                        </>
                      ) : (
                        <>
                          <span className="font-semibold text-fg">{formatGrade(unit.grade)}</span>
                          <span className="text-fg-subtle"> / {formatInt(unit.max_grade)}</span>
                        </>
                      )}
                      {shared ? <span className="mt-0.5 block text-[11px] text-fg-subtle">nota conjunta</span> : null}
                    </td>
                    <td className={cn(td, shared && "bg-surface-2/30")} rowSpan={span}>
                      <span className="font-medium text-fg">{formatInt(unit.pass_grade)}</span>
                      <span className="mt-0.5 block text-[11px] text-fg-subtle">corte {formatDirect(unit.cutoff_direct)} dir.</span>
                    </td>
                    <td className={cn(td, "text-center", shared && "bg-surface-2/30")} rowSpan={span}>
                      <Verdict passed={unit.passed} ungraded={unit.ungraded} />
                    </td>
                  </>
                ) : !unit ? (
                  <>
                    <td className={cn(td, "text-fg-subtle")}>—</td>
                    <td className={cn(td, "text-fg-subtle")}>—</td>
                    <td className={cn(td, "text-center text-fg-subtle")}>—</td>
                  </>
                ) : null}
              </tr>
            );
          })}
        </tbody>
        {multi ? (
          <tfoot className="border-t-2 border-border-strong bg-surface-2/50">
            <tr>
              <th scope="row" className={cn(td, "font-semibold text-fg")}>
                Examen completo
                <span className="mt-0.5 block text-xs font-normal text-fg-subtle">
                  {grade.units.length > 1 ? "Nota final = suma de las dos partes" : "Las dos partes se califican juntas"}
                </span>
              </th>
              <td className={cn(td, "font-semibold text-success-text")}>{formatInt(t.correct)}</td>
              <td className={cn(td, "font-semibold text-danger-text")}>{formatInt(t.wrong)}</td>
              <td className={cn(td, "text-fg-muted")}>{formatInt(t.blank)}</td>
              <td className={cn(td, "text-fg-subtle")}>{formatInt(t.annulled)}</td>
              <td className={cn(td, "text-fg-muted")}>{penalty > 0 ? `−${formatNumber(penalty, 2, 2)}` : "0"}</td>
              <td className={td}>
                <span className="font-semibold text-fg">{formatDirect(t.direct)}</span>
                <span className="text-fg-subtle"> / {formatDirect(t.max_direct)}</span>
              </td>
              <td className={td}>
                <span className="text-[15px] font-bold text-fg">{formatGrade(grade.total_grade)}</span>
                <span className="text-fg-subtle"> / {formatInt(grade.max_grade)}</span>
              </td>
              <td className={cn(td, "text-fg-muted")}>
                {grade.units.length > 1 ? grade.units.map((u) => formatInt(u.pass_grade)).join(" + ") : formatInt(passSum)}
              </td>
              <td className={cn(td, "text-center")}>
                <Verdict passed={grade.passed} final />
              </td>
            </tr>
          </tfoot>
        ) : null}
      </table>
    </div>
  );
}
