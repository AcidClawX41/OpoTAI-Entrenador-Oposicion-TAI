// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
/** Ficha del formato oficial a partir de un esquema de puntuación (sin calcular nada). */
import type { ScoringScheme } from "@/api/types";
import { ordinalFem } from "@/lib/format";
import { structureFromScheme, type StructureOverrides } from "@/lib/exam/structure";
import { ExamStructure } from "./ExamStructure";

export function SchemeSummary({ scheme, overrides, compact }: { scheme: ScoringScheme; overrides?: StructureOverrides; compact?: boolean }) {
  const units = scheme.grading.units;
  const perPart = units.length > 1;
  return (
    <div className="space-y-4">
      <ExamStructure info={structureFromScheme(scheme, overrides)} compact={compact} />
      {units.some((u) => u.cutoff_note) ? (
        <div className="rounded-xl border border-border bg-surface-2/50 px-4 py-3">
          {units.map((u, i) =>
            u.cutoff_note ? (
              <p key={i} className="text-xs leading-5 text-fg-muted">
                <strong className="font-semibold text-fg">{perPart ? `Corte ${ordinalFem(u.parts[0] ?? i + 1)} parte: ` : "Corte: "}</strong>
                {u.cutoff_note}
              </p>
            ) : null,
          )}
        </div>
      ) : null}
    </div>
  );
}
