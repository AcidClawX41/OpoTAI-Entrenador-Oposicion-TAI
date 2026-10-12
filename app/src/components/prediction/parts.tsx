// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
/** Piezas de la predicción: barras por tamaño de localidad, gran ciudad sin Madrid y rango de puesto. */
import type { ReactNode } from "react";
import { Building2, Castle, Trees } from "lucide-react";
import type { Prediction, TierId } from "@/api/types";
import { cn } from "@/lib/cn";
import { formatInt, formatProbability, formatShare } from "@/lib/format";
import { Meter } from "@/components/ui/display";

export const TIER_ICON: Record<TierId, ReactNode> = {
  gran_ciudad: <Building2 />,
  ciudad_media: <Castle />,
  pueblo: <Trees />,
};

export function TierMeters({ prediction, compact = false }: { prediction: Prediction; compact?: boolean }) {
  const p = prediction.p_big_city_outside_madrid;
  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      {prediction.tiers.map((t) => (
        <Meter
          key={t.tier}
          icon={TIER_ICON[t.tier]}
          label={t.label}
          value={t.probability}
          valueText={formatProbability(t.probability)}
          sublabel={!compact && t.share_of_plazas !== null ? `${formatShare(t.share_of_plazas)} de las plazas en la convocatoria de referencia` : undefined}
        />
      ))}
      {p !== null ? (
        <div className="flex items-center gap-3 rounded-xl border border-info/25 bg-info-soft px-3.5 py-2.5">
          <Building2 className="size-4 shrink-0 text-info-text" aria-hidden />
          <p className="min-w-0 flex-1 text-[13px] leading-5 text-fg">
            <span className="font-semibold">Grandes ciudades sin contar Madrid</span>{" "}
            <span className="text-fg-muted">(Barcelona, València, Sevilla…)</span>
          </p>
          <span className="shrink-0 text-[15px] font-semibold tabular-nums text-fg">{formatProbability(p)}</span>
        </div>
      ) : null}
    </div>
  );
}

/** Puesto estimado: banda p10–p90, mediana y número de plazas sobre un eje común. */
export function RankRange({ prediction, className }: { prediction: Prediction; className?: string }) {
  const rank = prediction.estimated_rank;
  const plazas = prediction.plazas;
  if (!rank) return null;
  const axisMax = Math.max(rank.p90 * 1.08, (plazas ?? 0) * 1.35, 10);
  const pos = (v: number) => `${Math.min(100, Math.max(0, (v / axisMax) * 100))}%`;
  const inside = plazas !== null && rank.p50 <= plazas;
  return (
    <div className={cn("w-full", className)}>
      <div className="relative h-9" role="img" aria-label={`Puesto estimado ${formatInt(rank.p50)}, entre ${formatInt(rank.p10)} y ${formatInt(rank.p90)}${plazas ? `, con ${formatInt(plazas)} plazas` : ""}`}>
        <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-surface-3" />
        {plazas ? (
          <div className="absolute top-1/2 h-2 -translate-y-1/2 rounded-l-full bg-success/30" style={{ left: 0, width: pos(plazas) }} aria-hidden />
        ) : null}
        <div
          className="absolute top-1/2 h-3.5 -translate-y-1/2 rounded-full bg-accent/35 ring-1 ring-accent/50"
          style={{ left: pos(rank.p10), width: `calc(${pos(rank.p90)} - ${pos(rank.p10)})` }}
          aria-hidden
        />
        <div
          className={cn("absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface", inside ? "bg-success" : "bg-accent")}
          style={{ left: pos(rank.p50) }}
          aria-hidden
        />
        {plazas ? (
          <div className="absolute top-0 h-full w-px bg-success" style={{ left: pos(plazas) }} aria-hidden />
        ) : null}
      </div>
      <div className="relative mt-1 h-4 text-[11px] text-fg-subtle">
        <span className="absolute left-0">1.º</span>
        {plazas ? (
          <span className="absolute -translate-x-1/2 whitespace-nowrap font-medium text-success-text" style={{ left: pos(plazas) }}>
            {formatInt(plazas)} plazas
          </span>
        ) : null}
        <span className="absolute right-0">puesto</span>
      </div>
    </div>
  );
}
