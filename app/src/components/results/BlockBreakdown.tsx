// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
/** Rendimiento por bloques y por temas (barras apiladas aciertos/fallos/blancos) con acceso a practicar. */
import { useMemo, useState } from "react";
import { BarChart3, Dumbbell } from "lucide-react";
import type { BlockStat, Temario } from "@/api/types";
import { cn } from "@/lib/cn";
import { formatInt, formatPercent } from "@/lib/format";
import { blockTitle, shortTitle, topicTitle } from "@/lib/labels";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Segmented } from "@/components/ui/controls";
import { Tooltip } from "@/components/ui/overlays";

export function StackedBar({ stat, className }: { stat: Pick<BlockStat, "correct" | "wrong" | "blank" | "total">; className?: string }) {
  const total = Math.max(1, stat.total);
  const pct = (n: number) => `${(n / total) * 100}%`;
  return (
    <div
      className={cn("flex h-2.5 w-full overflow-hidden rounded-full bg-surface-3", className)}
      role="img"
      aria-label={`${formatInt(stat.correct)} aciertos, ${formatInt(stat.wrong)} fallos y ${formatInt(stat.blank)} en blanco de ${formatInt(stat.total)}`}
    >
      <span className="h-full bg-success transition-[width] duration-500" style={{ width: pct(stat.correct) }} />
      <span className="h-full bg-danger transition-[width] duration-500" style={{ width: pct(stat.wrong) }} />
      <span className="h-full bg-fg-subtle/35 transition-[width] duration-500" style={{ width: pct(stat.blank) }} />
    </div>
  );
}

export function StackedLegend({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-fg-muted", className)}>
      <span className="inline-flex items-center gap-1.5">
        <span className="size-2.5 rounded-sm bg-success" aria-hidden /> Aciertos
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="size-2.5 rounded-sm bg-danger" aria-hidden /> Fallos
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="size-2.5 rounded-sm bg-fg-subtle/35" aria-hidden /> En blanco
      </span>
    </div>
  );
}

/** Temas flojos de un intento: acierto < 60 %, del peor al mejor (máx. `limit`). */
export function weakTopics(byTopic: BlockStat[], limit = 5): BlockStat[] {
  return byTopic
    .filter((t) => t.topic && t.total > 0 && t.accuracy < 0.6)
    .sort((a, b) => a.net_ratio - b.net_ratio || b.total - a.total)
    .slice(0, limit);
}

interface BlockBreakdownProps {
  byBlock: BlockStat[];
  byTopic: BlockStat[];
  temario: Temario | null;
  onPractice?: (topics: string[]) => void;
  busy?: boolean;
}

export function BlockBreakdown({ byBlock, byTopic, temario, onPractice, busy }: BlockBreakdownProps) {
  const [view, setView] = useState<"blocks" | "topics">("blocks");
  const [showAll, setShowAll] = useState(false);
  const weak = useMemo(() => weakTopics(byTopic), [byTopic]);
  const topics = useMemo(() => [...byTopic].sort((a, b) => a.net_ratio - b.net_ratio || b.total - a.total), [byTopic]);
  const rows = view === "blocks" ? byBlock : showAll ? topics : topics.slice(0, 8);

  return (
    <Card className="@container flex h-full flex-col">
      <CardHeader
        title="Por bloques y temas"
        description={view === "blocks" ? "Cómo te ha ido en cada bloque del temario" : "Del tema más flojo al más fuerte"}
        icon={<BarChart3 />}
        action={
          byTopic.length > 0 ? (
            <Segmented
              size="sm"
              label="Agrupar por"
              value={view}
              onChange={setView}
              options={[
                { value: "blocks", label: "Bloques" },
                { value: "topics", label: "Temas" },
              ]}
            />
          ) : undefined
        }
      />
      <div className="flex-1 px-5 pb-2 pt-4">
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-fg-muted">No hay preguntas clasificadas por tema en este intento.</p>
        ) : (
          <ul className="space-y-3.5">
            {rows.map((s) => {
              const full =
                view === "blocks"
                  ? (blockTitle(temario, s.block) ?? s.label)
                  : (topicTitle(temario, s.topic) ?? s.label.replace(/^[IV]+\.\d+\s*·\s*/, ""));
              const code = view === "blocks" ? (s.block ? `Bloque ${s.block}` : "Sin clasificar") : (s.topic ?? s.key);
              const subtitle = view === "blocks" && !s.block ? null : shortTitle(full, 64);
              return (
                <li key={s.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 @xl:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_auto]">
                  <Tooltip content={full} className="min-w-0" side="top" disabled={!subtitle}>
                    <p className="min-w-0 truncate text-[13px]">
                      <span className="font-semibold text-fg">{code}</span>
                      {subtitle ? <span className="text-fg-muted"> · {subtitle}</span> : null}
                    </p>
                  </Tooltip>
                  <StackedBar stat={s} className="col-span-2 row-start-2 @xl:col-span-1 @xl:row-start-auto" />
                  <p className="text-right text-xs tabular-nums text-fg-muted @xl:w-24">
                    <span className={cn("font-semibold", s.accuracy >= 0.6 ? "text-success-text" : s.accuracy >= 0.4 ? "text-warning-text" : "text-danger-text")}>
                      {formatPercent(s.accuracy)}
                    </span>{" "}
                    · {formatInt(s.correct)}/{formatInt(s.total)}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
        {view === "topics" && topics.length > 8 ? (
          <button type="button" onClick={() => setShowAll((v) => !v)} className="mt-3 text-xs font-medium text-accent-text hover:underline">
            {showAll ? "Ver menos" : `Ver los ${formatInt(topics.length)} temas`}
          </button>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3.5">
        <StackedLegend />
        {onPractice && weak.length > 0 ? (
          <Button size="sm" variant="soft" loading={busy} leftIcon={<Dumbbell className="size-3.5" />} onClick={() => onPractice(weak.map((t) => t.topic ?? t.key))}>
            Practicar {weak.length === 1 ? `el tema ${weak[0]?.topic}` : `tus ${weak.length} temas más flojos`}
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
