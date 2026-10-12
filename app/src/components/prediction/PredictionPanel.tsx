// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
/**
 * «Tus posibilidades»: probabilidad de aprobar y de plaza, puesto estimado,
 * destinos por tamaño de localidad, ciudades principales, localidades preferidas,
 * veredicto y «¿Cómo se calcula?». Reutilizado en Resultados y en la Calculadora.
 */
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Calculator, ListOrdered, MapPin, Sparkles, Star, Target, TriangleAlert } from "lucide-react";
import type { CityProbability, Prediction } from "@/api/types";
import { cn } from "@/lib/cn";
import { formatGrade, formatInt, formatPercent, formatPercentile, formatProbability, formatShare } from "@/lib/format";
import { DATA_QUALITY_LABEL } from "@/lib/labels";
import { Badge } from "@/components/ui/Badge";
import { Collapsible, Tooltip } from "@/components/ui/overlays";
import { Progress } from "@/components/ui/misc";
import { RankRange, TIER_ICON, TierMeters } from "./parts";

function probabilityTone(p: number): "success" | "warning" | "danger" {
  if (p >= 0.6) return "success";
  if (p >= 0.3) return "warning";
  return "danger";
}

function Kpi({ label, value, hint, tone, highlight }: { label: string; value: number; hint?: ReactNode; tone: "success" | "warning" | "danger"; highlight?: boolean }) {
  return (
    <div className={cn("rounded-2xl border p-4", highlight ? "border-accent/35 bg-accent-soft" : "border-border bg-surface-2/60")}>
      <p className="text-[13px] font-medium text-fg-muted">{label}</p>
      <p className="mt-1.5 text-[34px] font-semibold leading-none tracking-tight text-fg tabular-nums">{formatProbability(value)}</p>
      <Progress value={value} tone={highlight ? "accent" : tone} className="mt-3" label={label} />
      {hint ? <p className="mt-2 text-xs text-fg-muted">{hint}</p> : null}
    </div>
  );
}

function CityRow({ city, preferred = false }: { city: CityProbability; preferred?: boolean }) {
  const tone = probabilityTone(city.probability);
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 py-2.5">
      <div className="flex min-w-0 items-center gap-2">
        <span className="text-fg-subtle [&_svg]:size-3.5" aria-hidden>
          {preferred ? <Star className="fill-current text-warning-text" /> : TIER_ICON[city.tier]}
        </span>
        <span className="truncate text-[13px] font-medium text-fg">{city.locality}</span>
        {city.province && city.province !== city.locality ? <span className="truncate text-xs text-fg-subtle">{city.province}</span> : null}
      </div>
      <span className="text-[13px] font-semibold tabular-nums text-fg">{formatProbability(city.probability)}</span>
      <div className="col-span-2 flex items-center gap-3">
        <Progress value={city.probability} tone={tone} size="xs" label={`Probabilidad de plaza en ${city.locality}`} />
        <span className="w-28 shrink-0 text-right text-[11px] text-fg-subtle">
          {city.share_of_plazas > 0 ? `${formatShare(city.share_of_plazas)} de las plazas` : "sin plazas en la referencia"}
        </span>
      </div>
    </li>
  );
}

interface PredictionPanelProps {
  prediction: Prediction;
  /** Muestra la nota observada (resultados) además de la esperada. */
  showObserved?: boolean;
  className?: string;
}

export function PredictionPanel({ prediction: p, showObserved = true, className }: PredictionPanelProps) {
  const quality = DATA_QUALITY_LABEL[p.data_quality];
  const rank = p.estimated_rank;
  return (
    <section aria-labelledby="posibilidades" className={cn("@container rounded-2xl border border-border bg-surface shadow-card", className)}>
      <header className="flex flex-wrap items-start justify-between gap-3 px-6 pt-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent-text">
            <Target className="size-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 id="posibilidades" className="text-[15px] font-semibold leading-6 tracking-tight text-fg">
              Tus posibilidades
            </h2>
            <p className="mt-0.5 text-[13px] text-fg-muted">{p.target_label}</p>
          </div>
        </div>
        <Tooltip content={quality.description} side="left">
          <Badge tone={p.data_quality === "real" ? "success" : p.data_quality === "partial" ? "warning" : "neutral"} size="md" tabIndex={0}>
            {quality.label}
          </Badge>
        </Tooltip>
      </header>

      <div className="grid gap-x-8 gap-y-6 p-6 @4xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <Kpi label="Probabilidad de aprobar" value={p.p_pass} tone={probabilityTone(p.p_pass)} />
            <Kpi label="Probabilidad de plaza" value={p.p_plaza} tone={probabilityTone(p.p_plaza)} highlight />
          </div>

          <dl className="grid grid-cols-2 gap-3 text-sm @lg:grid-cols-3">
            {showObserved ? (
              <div>
                <dt className="text-xs text-fg-muted">Tu nota en este intento</dt>
                <dd className="mt-0.5 font-semibold tabular-nums text-fg">{formatGrade(p.observed_grade)}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-xs text-fg-muted">Nota esperada (mediana)</dt>
              <dd className="mt-0.5 font-semibold tabular-nums text-fg">{formatGrade(p.expected_grade)}</dd>
            </div>
            <div>
              <dt className="text-xs text-fg-muted">Corte estimado</dt>
              <dd className="mt-0.5 font-semibold tabular-nums text-fg">
                {formatPercent(p.cutoff_ratio)} <span className="text-xs font-normal text-fg-subtle">de la directa máx.</span>
              </dd>
            </div>
          </dl>

          {rank ? (
            <div className="rounded-2xl border border-border bg-surface-2/50 p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="flex items-center gap-2 text-[13px] font-medium text-fg">
                  <ListOrdered className="size-4 text-fg-subtle" aria-hidden />
                  Puesto estimado
                </p>
                {p.estimated_percentile !== null ? (
                  <p className="text-xs text-fg-muted">
                    Mejor que el <strong className="tabular-nums text-fg">{formatPercentile(p.estimated_percentile)}</strong> de los presentados
                  </p>
                ) : null}
              </div>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-fg tabular-nums">
                ≈ {formatInt(rank.p50)}
                <span className="ml-2 text-sm font-normal text-fg-muted">
                  entre {formatInt(rank.p10)} y {formatInt(rank.p90)}
                </span>
              </p>
              <RankRange prediction={p} className="mt-3" />
            </div>
          ) : null}

          <p className="flex items-start gap-2.5 rounded-xl border border-accent/25 bg-accent-soft px-4 py-3 text-sm leading-6 text-fg">
            <Sparkles className="mt-1 size-4 shrink-0 text-accent-text" aria-hidden />
            <span>{p.verdict}</span>
          </p>

          <div>
            <p className="flex items-center gap-2 text-[13px] font-semibold text-fg">
              <Star className="size-3.5 text-warning-text" aria-hidden />
              Tus localidades preferidas
            </p>
            {p.preferred.length > 0 ? (
              <ul className="mt-1 divide-y divide-border">
                {p.preferred.map((c) => (
                  <CityRow key={c.locality} city={c} preferred />
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[13px] leading-5 text-fg-muted">
                Elige hasta 3 localidades en{" "}
                <Link to="/ajustes/objetivo" className="font-medium text-accent-text underline-offset-2 hover:underline">
                  Ajustes · Objetivo
                </Link>{" "}
                y verás aquí tus opciones en cada una.
              </p>
            )}
          </div>
        </div>

        <div className="min-w-0 space-y-6">
          <div>
            <p className="mb-3 text-[13px] font-semibold text-fg">¿Dónde podrías elegir destino?</p>
            <TierMeters prediction={p} />
          </div>

          {p.top_cities.length > 0 ? (
            <div>
              <p className="flex items-center gap-2 text-[13px] font-semibold text-fg">
                <MapPin className="size-3.5 text-fg-subtle" aria-hidden />
                Principales ciudades por número de plazas
              </p>
              <ul className="mt-1 divide-y divide-border">
                {p.top_cities.slice(0, 6).map((c) => (
                  <CityRow key={c.locality} city={c} />
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>

      <div className="px-6 pb-6">
        <Collapsible title="¿Cómo se calcula?" icon={<Calculator className="text-fg-subtle" />}>
          <div className="grid gap-6 @3xl:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-fg-subtle">Razonamiento</p>
              <ol className="space-y-2 text-[13px] leading-5 text-fg-muted">
                {p.reasoning.map((r, i) => (
                  <li key={i} className="flex gap-2.5">
                    <span className="grid size-5 shrink-0 place-items-center rounded-full bg-surface-3 text-[11px] font-semibold text-fg tabular-nums">{i + 1}</span>
                    <span className="min-w-0">{r}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-fg-subtle">Supuestos del modelo</p>
              <ul className="list-disc space-y-1.5 pl-4 text-[13px] leading-5 text-fg-muted marker:text-fg-subtle">
                {p.assumptions.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
              <p className="mt-4 text-[13px] leading-5 text-fg-muted">
                <strong className="text-fg">{quality.label}.</strong> {quality.description}
              </p>
            </div>
          </div>
          <p className="mt-5 flex items-start gap-2 rounded-xl border border-warning/30 bg-warning-soft px-3.5 py-2.5 text-[13px] leading-5 text-fg">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning-text" aria-hidden />
            <span>
              Es una estimación orientativa basada en convocatorias anteriores, no una predicción oficial. El corte, las plazas y los destinos reales dependen de cada
              convocatoria.
            </span>
          </p>
        </Collapsible>
      </div>
    </section>
  );
}
