// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
/**
 * Rendimiento por tema: mapa de calor (escala divergente rosa ↔ azul, 50 % neutro)
 * y tabla ordenable. Pulsar un tema abre «Practicar por temas» con él preseleccionado.
 */
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import type { BlockStat, Temario } from "@/api/types";
import { cn } from "@/lib/cn";
import { formatInt, formatPercent, formatSigned } from "@/lib/format";
import { HEAT_HIGH, HEAT_LOW, heatColor, heatTextIsLight } from "@/lib/heat";
import { shortTitle } from "@/lib/labels";
import { Tooltip } from "@/components/ui/overlays";

interface Props {
  temario: Temario;
  byTopic: BlockStat[];
  onSelect: (topicId: string) => void;
}

export function TopicHeatmap({ temario, byTopic, onSelect }: Props) {
  const stats = useMemo(() => new Map(byTopic.map((s) => [s.topic ?? s.key, s])), [byTopic]);
  return (
    <div>
      <div className="space-y-3">
        {temario.blocks.map((b) => (
          <div key={b.id} className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-start gap-3">
            <span className="pt-3 text-xs font-semibold text-fg-muted">Bloque {b.id}</span>
            <div className="flex flex-wrap gap-1.5">
              {b.topics.map((t) => {
                const s = stats.get(t.id);
                const has = s && s.total > 0;
                return (
                  <Tooltip
                    key={t.id}
                    delay={120}
                    content={
                      <span className="block max-w-64">
                        <span className="font-semibold">{t.id}</span> · {shortTitle(t.title, 90)}
                        <span className="mt-1 block opacity-85">
                          {has ? `${formatPercent(s.accuracy)} de acierto · ${formatInt(s.total)} respuestas` : "Sin responder todavía"}
                        </span>
                      </span>
                    }
                  >
                    <button
                      type="button"
                      onClick={() => onSelect(t.id)}
                      aria-label={`${t.id}: ${has ? `${formatPercent(s.accuracy)} de acierto en ${formatInt(s.total)} respuestas` : "sin responder"}. Practicar este tema`}
                      className={cn(
                        "grid size-11 place-items-center rounded-xl text-center leading-none transition-transform duration-150 hover:scale-105 focus-visible:scale-105",
                        has ? "shadow-card" : "border border-dashed border-border-strong bg-surface-2/40",
                        has && heatTextIsLight(s.accuracy) ? "text-white" : "text-fg",
                      )}
                      style={has ? { background: heatColor(s.accuracy) } : undefined}
                    >
                      <span>
                        <span className="block text-[11px] font-semibold">{t.id}</span>
                        <span className={cn("mt-1 block text-[10.5px] tabular-nums", has ? "opacity-90" : "text-fg-subtle")}>
                          {has ? formatPercent(s.accuracy) : "—"}
                        </span>
                      </span>
                    </button>
                  </Tooltip>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-fg-muted">
        <span className="flex items-center gap-2">
          0 %
          <span
            className="h-2.5 w-40 rounded-full"
            style={{ background: `linear-gradient(90deg, ${HEAT_LOW}, var(--app-surface-3), ${HEAT_HIGH})` }}
            aria-hidden
          />
          100 % de acierto
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-[4px] border border-dashed border-border-strong" aria-hidden /> Sin responder
        </span>
      </div>
    </div>
  );
}

type SortKey = "topic" | "total" | "accuracy" | "net";

export function TopicTable({ temario, byTopic, onSelect }: Props) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "accuracy", dir: 1 });
  const order = useMemo(() => {
    const ids = temario.blocks.flatMap((b) => b.topics.map((t) => t.id));
    return new Map(ids.map((id, i) => [id, i]));
  }, [temario]);
  const titles = useMemo(() => new Map(temario.blocks.flatMap((b) => b.topics.map((t) => [t.id, t.title] as const))), [temario]);
  const rows = useMemo(() => {
    const list = byTopic.filter((s) => s.total > 0);
    const val = (s: BlockStat): number =>
      sort.key === "topic" ? (order.get(s.topic ?? s.key) ?? 999) : sort.key === "total" ? s.total : sort.key === "accuracy" ? s.accuracy : s.net_ratio;
    return [...list].sort((a, b) => (val(a) - val(b)) * sort.dir || (order.get(a.topic ?? a.key) ?? 0) - (order.get(b.topic ?? b.key) ?? 0));
  }, [byTopic, sort, order]);

  const header = (key: SortKey, label: string, align: "left" | "right" = "right") => {
    const active = sort.key === key;
    return (
      <th
        scope="col"
        aria-sort={active ? (sort.dir === 1 ? "ascending" : "descending") : "none"}
        className={cn("px-3 py-2.5 first:pl-5 last:pr-5", align === "right" ? "text-right" : "text-left", key === "topic" && "w-1/2")}
      >
        <button
          type="button"
          onClick={() => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : key === "total" ? -1 : 1 }))}
          className={cn("inline-flex items-center gap-1 text-xs font-semibold transition-colors", active ? "text-fg" : "text-fg-muted hover:text-fg")}
        >
          {label}
          {active ? sort.dir === 1 ? <ArrowUp className="size-3" aria-hidden /> : <ArrowDown className="size-3" aria-hidden /> : null}
        </button>
      </th>
    );
  };

  if (rows.length === 0) return <p className="py-8 text-center text-sm text-fg-muted">Aún no hay respuestas clasificadas por tema.</p>;
  return (
    <div className="max-h-[26rem] overflow-auto rounded-xl border border-border" role="region" aria-label="Tabla de temas" tabIndex={0}>
      <table className="w-full min-w-[620px] border-collapse text-sm">
        <thead className="sticky top-0 z-10 border-b border-border bg-surface-2">
          <tr>
            {header("topic", "Tema", "left")}
            {header("total", "Respuestas")}
            <th scope="col" className="px-3 py-2.5 text-right text-xs font-semibold text-fg-muted">
              Aciertos / fallos
            </th>
            {header("accuracy", "Acierto")}
            {header("net", "Neto")}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((s) => {
            const id = s.topic ?? s.key;
            return (
              <tr key={id} className="transition-colors hover:bg-surface-2/60">
                <td className="max-w-0 py-2.5 pl-5 pr-3">
                  <button type="button" onClick={() => onSelect(id)} className="flex w-full min-w-0 items-baseline gap-2 text-left" title={titles.get(id) ?? s.label}>
                    <span className="w-10 shrink-0 font-semibold tabular-nums text-fg">{id}</span>
                    <span className="truncate text-[13px] text-fg-muted">{shortTitle(titles.get(id) ?? s.label, 80)}</span>
                  </button>
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-fg-muted">{formatInt(s.total)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  <span className="text-success-text">{formatInt(s.correct)}</span>
                  <span className="text-fg-subtle"> / </span>
                  <span className="text-danger-text">{formatInt(s.wrong)}</span>
                </td>
                <td className="px-3 py-2.5 text-right">
                  <span className="inline-flex items-center gap-2">
                    <span className="size-2.5 rounded-full" style={{ background: heatColor(s.accuracy) }} aria-hidden />
                    <span className="font-semibold tabular-nums text-fg">{formatPercent(s.accuracy)}</span>
                  </span>
                </td>
                <td className="py-2.5 pl-3 pr-5 text-right tabular-nums text-fg-muted">{formatSigned(s.net_ratio * 100, 0)} %</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
