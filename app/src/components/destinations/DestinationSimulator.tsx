// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
/**
 * Simulador de destinos: «con tu nota, ¿qué plazas te habrían quedado y dónde acabarías?».
 *
 * Pide al núcleo `simulate_destinations` (a partir de un intento entregado o de la calculadora) y
 * muestra cada escenario —proyección para la próxima convocatoria y réplicas reales de 2024,
 * 2023, 2021 y 2019— sobre un mapa 2.5D de España, con tu número de orden, las plazas libres al
 * elegir, el tipo de plaza y lo que eligieron las personas con un número de orden como el tuyo.
 */
import { useEffect, useMemo, useState } from "react";
import { BookOpenCheck, Briefcase, Building2, Calculator, Hash, MapPinned, Sparkles, Star, Ticket } from "lucide-react";
import { api } from "@/api/client";
import type { DestinationScenario, DestinationSimulation, ManualGradeInput } from "@/api/types";
import { Badge } from "@/components/ui/Badge";
import { CardHeader } from "@/components/ui/Card";
import { Segmented } from "@/components/ui/controls";
import { ErrorState } from "@/components/ui/display";
import { Skeleton } from "@/components/ui/misc";
import { Collapsible } from "@/components/ui/overlays";
import { cn } from "@/lib/cn";
import { formatGrade, formatInt, formatPercent } from "@/lib/format";
import { useSession } from "@/store/session";
import { GEO } from "./geo";
import { SpainMap25D, type MapMetric } from "./SpainMap25D";

export type SimulatorSource = { attempt_id: string } | { input: ManualGradeInput };

interface DestinationSimulatorProps {
  source: SimulatorSource;
  className?: string;
}

const SMALL = new Set(["de", "del", "la", "las", "el", "los", "y", "e", "para", "con", "en", "a", "al"]);
const ACRONYMS = new Set(["aeat", "csic", "inss", "sepe", "tgss", "dgt", "boe", "isfas", "muface", "aemet", "aesan", "cnmc", "csn", "uned", "imserso", "ine", "dgp"]);

/** «S. DE E. DE LA SEG. SOCIAL Y PENSIONES» → «S. de E. de la Seg. Social y Pensiones». */
export function prettyBoe(text: string | null): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .split(/\s+/)
    .map((w, i) => {
      const bare = w.replace(/[^a-záéíóúñü]/g, "");
      if (ACRONYMS.has(bare)) return w.toUpperCase();
      if (/^[a-z]\.$/.test(w)) return w.toUpperCase();
      if (i > 0 && SMALL.has(w)) return w;
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(" ")
    .replace(/\b([a-záéíóú])\.([a-záéíóú])/g, (_, a: string, b: string) => `${a}.${b.toUpperCase()}`);
}

function scenarioTitle(s: DestinationScenario): string {
  return s.kind === "projection" ? `${s.year || "Próxima"} · proyección` : String(s.year);
}

export function DestinationSimulator({ source, className }: DestinationSimulatorProps) {
  const profile = useSession((s) => s.profile);
  const [sim, setSim] = useState<DestinationSimulation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scenarioId, setScenarioId] = useState<string>("");
  const [metric, setMetric] = useState<MapMetric>("available");
  const sourceKey = JSON.stringify(source);

  useEffect(() => {
    let alive = true;
    setSim(null);
    setError(null);
    api
      .simulateDestinations(profile?.id ?? null, JSON.parse(sourceKey) as SimulatorSource)
      .then((result) => {
        if (!alive) return;
        setSim(result);
        // Por defecto, la convocatoria real más reciente (la proyección es la primera).
        const firstHistorical = result.scenarios.find((s) => s.kind === "historical");
        setScenarioId((current) => current || (firstHistorical ?? result.scenarios[0])?.id || "");
      })
      .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      alive = false;
    };
  }, [profile?.id, sourceKey]);

  const scenario = useMemo(() => sim?.scenarios.find((s) => s.id === scenarioId) ?? sim?.scenarios[0] ?? null, [sim, scenarioId]);
  const top = scenario?.likely[0] ?? null;
  const preferredProvinces = useMemo(() => (scenario?.preferred ?? []).map((p) => p.province).filter(Boolean), [scenario]);
  // Sin plaza en el escenario, el mapa (y su leyenda) muestran cómo se repartieron las plazas.
  const mapMetric: MapMetric = scenario?.rank || metric === "posts" ? metric : "posts";

  return (
    <section
      aria-labelledby="simulador-destinos"
      className={cn("@container overflow-hidden rounded-2xl border border-border bg-surface shadow-card", className)}
    >
      <CardHeader
        id="simulador-destinos"
        title="Simulador de destinos"
        description="Con tu nota, ¿en qué número de orden habrías quedado, qué plazas te habrían quedado libres y dónde acabarías?"
        icon={<MapPinned />}
        action={
          sim ? (
            <Badge tone={sim.data_quality === "real" ? "success" : "info"} variant="soft">
              {sim.data_quality === "real" ? "Datos reales del BOE" : sim.data_quality === "partial" ? "Datos parciales" : "Datos de ejemplo"}
            </Badge>
          ) : null
        }
      />

      {error ? (
        <div className="p-5">
          <ErrorState message={error} />
        </div>
      ) : !sim || !scenario ? (
        <div className="grid gap-4 p-5 @5xl:grid-cols-[1fr_320px]">
          <Skeleton className="h-[420px] rounded-2xl" />
          <div className="space-y-3">
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4">
            <Segmented
              label="Convocatoria"
              size="sm"
              value={scenario.id}
              onChange={setScenarioId}
              options={sim.scenarios.map((s) => ({ value: s.id, label: scenarioTitle(s) }))}
            />
            <Segmented
              label="Qué muestra el mapa"
              size="sm"
              value={metric}
              onChange={setMetric}
              options={[
                { value: "available", label: "Libres a tu turno" },
                { value: "likely", label: "Dónde acabarías" },
                { value: "posts", label: "Plazas totales" },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5 px-5 pt-4 @3xl:grid-cols-4">
            <Kpi
              icon={<Hash />}
              label="Tu número de orden"
              value={scenario.rank ? `≈ ${formatInt(scenario.rank.p50)}` : "—"}
              hint={
                scenario.rank
                  ? `entre ${formatInt(scenario.rank.p10)} y ${formatInt(scenario.rank.p90)} de ${formatInt(scenario.aprobados)}`
                  : "sin plaza"
              }
            />
            <Kpi
              icon={<Ticket />}
              label="Plazas libres al elegir"
              value={scenario.rank ? `≈ ${formatInt(Math.round(scenario.available_posts))}` : "—"}
              hint={scenario.rank ? `${formatPercent(scenario.available_share)} de ${formatInt(scenario.posts_total)}` : "—"}
            />
            <Kpi
              icon={<Sparkles />}
              label="Probabilidad de plaza"
              value={formatPercent(scenario.p_plaza)}
              hint={scenario.kind === "projection" ? "en la convocatoria objetivo" : `con el corte real de ${scenario.year}`}
            />
            <Kpi
              icon={<BookOpenCheck />}
              label={scenario.kind === "projection" ? "Nota simulada" : "Nota equivalente"}
              value={scenario.equivalent_grade !== null ? formatGrade(scenario.equivalent_grade) : "—"}
              hint={scenario.kind === "projection" ? "mediana · reglas de la convocatoria objetivo" : `mediana · reglas de ${scenario.year}`}
            />
          </div>
          {scenario.equivalent_grade !== null ? (
            <p className="px-5 pt-2 text-[12px] leading-5 text-fg-subtle">
              {scenario.kind === "projection" ? "La nota simulada" : "La nota equivalente"} no es la de este intento ({formatGrade(sim.observed_grade)}) recalculada: es la
              mediana de miles de exámenes simulados con tu ritmo y tu precisión,{" "}
              {scenario.kind === "projection" ? "con las reglas de la convocatoria objetivo" : `corregidos con las reglas y los cortes de ${scenario.year}`}, contando
              solo los escenarios en que apruebas. Puede diferir de tu nota porque cada convocatoria tiene sus reglas y porque, con pocas preguntas, la simulación es prudente con tu precisión (la acerca al 50 %).
            </p>
          ) : null}

          <div className="px-5 pt-4">
            <div className="relative overflow-hidden rounded-2xl border border-border bg-[radial-gradient(110%_80%_at_50%_0%,var(--app-glow),transparent_65%),radial-gradient(70%_60%_at_100%_100%,var(--app-glow-2),transparent_70%)]">
              <SpainMap25D
                provinces={scenario.provinces}
                metric={mapMetric}
                animationKey={scenario.id}
                preferred={preferredProvinces}
                pin={top && metric !== "posts" ? { locality: top.locality, province: top.province, label: `Más probable: ${top.locality}` } : null}
                notice={
                  !scenario.rank ? (
                    <div className="rounded-xl border border-warning/40 bg-warning-soft px-4 py-3 text-[13px] text-warning-text backdrop-blur">
                      Con este rendimiento no habrías obtenido plaza en {scenario.label}. El mapa muestra cómo se repartieron sus{" "}
                      {formatInt(scenario.posts_total)} plazas.
                    </div>
                  ) : null
                }
              />
            </div>
            <div className="mt-2.5 flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
              <p className="max-w-3xl text-[13px] leading-6 text-fg-muted">{scenario.summary}</p>
              <MapLegend metric={mapMetric} />
            </div>
          </div>

          <div className="grid gap-4 p-5 @4xl:grid-cols-3">
            <Panel icon={<Star />} title="Lo más probable" subtitle={`Lo que eligieron las ${formatInt(sim.neighbour_window * 2 + 1)} personas con un número de orden como el tuyo`}>
              <LikelyList scenario={scenario} />
            </Panel>
            <Panel icon={<Briefcase />} title="Tipo de plaza" subtitle="Ámbito del organismo: probabilidad de acabar en él y plazas libres al elegir">
              <CategoryList scenario={scenario} />
            </Panel>
            <Panel icon={<Building2 />} title="Podrías elegir" subtitle="Si obtienes plaza: localidades donde aún quedarían plazas al llegar tu turno (media)">
              <ChooseList scenario={scenario} />
            </Panel>
          </div>

          <div className="border-t border-border px-5 py-3">
            <Collapsible title="¿Cómo se calcula?" icon={<Calculator className="text-fg-subtle" />}>
              <ul className="list-disc space-y-1.5 pl-5 text-[13px] leading-6 text-fg-muted">
                {sim.assumptions.map((a) => (
                  <li key={a}>{a}</li>
                ))}
                <li>{GEO.attribution}</li>
              </ul>
            </Collapsible>
          </div>
        </>
      )}
    </section>
  );
}

function Kpi({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface-2/60 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[11.5px] text-fg-muted [&_svg]:size-3.5">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-0.5 text-lg font-semibold tabular-nums tracking-tight text-fg">{value}</div>
      <div className="truncate text-[11.5px] text-fg-subtle">{hint}</div>
    </div>
  );
}

function Bar({ value }: { value: number }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
      <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${Math.max(2, Math.min(100, value * 100))}%` }} />
    </div>
  );
}

function Panel({ icon, title, subtitle, children }: { icon: React.ReactNode; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl border border-border bg-surface-2/50 p-4">
      <div className="flex items-center gap-2 text-[13.5px] font-semibold text-fg [&_svg]:size-4 [&_svg]:text-accent-text">
        {icon}
        {title}
      </div>
      <p className="mb-3 mt-0.5 text-[12px] leading-5 text-fg-subtle">{subtitle}</p>
      {children}
    </div>
  );
}

function LikelyList({ scenario }: { scenario: DestinationScenario }) {
  if (!scenario.likely.length) return <p className="text-[13px] text-fg-muted">Sin plaza en este escenario.</p>;
  const max = scenario.likely[0]?.probability ?? 1;
  return (
    <div className="space-y-2.5">
      {scenario.likely.slice(0, 6).map((d) => (
        <div key={`${d.locality}-${d.unit}-${d.organism}`} className="space-y-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="min-w-0 truncate text-[13px] font-medium text-fg" title={`${d.locality} · ${d.category}`}>
              {d.locality} <span className="font-normal text-fg-subtle">· {d.category}</span>
            </span>
            <span className="shrink-0 text-[12px] font-semibold tabular-nums text-fg">{formatPercent(d.probability, d.probability < 0.1 ? 1 : 0)}</span>
          </div>
          {d.unit ? (
            <p className="truncate text-[11.5px] text-fg-subtle" title={prettyBoe(d.unit)}>
              {prettyBoe(d.unit)}
            </p>
          ) : null}
          <Bar value={d.probability / max} />
        </div>
      ))}
    </div>
  );
}

function CategoryList({ scenario }: { scenario: DestinationScenario }) {
  const list = scenario.categories.filter((c) => c.posts > 0).slice(0, 8);
  const max = Math.max(1e-9, ...list.map((c) => c.p_likely));
  return (
    <div className="space-y-2.5">
      {list.map((c) => (
        <div key={c.category} className="space-y-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="min-w-0 truncate text-[13px] font-medium text-fg" title={c.category}>
              {c.category}
            </span>
            <span className="shrink-0 text-[12px] tabular-nums text-fg-muted">
              <span className="font-semibold text-fg">{formatPercent(c.p_likely, c.p_likely < 0.1 ? 1 : 0)}</span> · {formatInt(Math.round(c.available_posts))} libres
            </span>
          </div>
          <Bar value={c.p_likely / max} />
        </div>
      ))}
    </div>
  );
}

function ChooseList({ scenario }: { scenario: DestinationScenario }) {
  const prefs = scenario.preferred;
  const list = [...scenario.localities]
    .filter((l) => l.available_posts >= 0.5)
    .sort((a, b) => b.available_posts - a.available_posts)
    .slice(0, 9);
  return (
    <div className="space-y-3">
      {prefs.length ? (
        <div className="space-y-1.5">
          <p className="text-[12px] font-medium text-fg-muted">Tus localidades preferidas</p>
          {prefs.map((l) => (
            <div key={l.locality} className="flex items-center justify-between gap-2 rounded-lg border border-warning/30 bg-warning-soft px-2.5 py-1.5 text-[13px]">
              <span className="truncate font-medium text-fg">{l.locality}</span>
              <span className="shrink-0 tabular-nums text-fg-muted">
                {l.posts ? (
                  <>
                    <span className="font-semibold text-fg">{formatPercent(l.p_available)}</span> · ≈ {formatInt(Math.round(l.available_posts))} libres
                  </>
                ) : (
                  "sin plazas ese año"
                )}
              </span>
            </div>
          ))}
        </div>
      ) : null}
      <div className="space-y-1.5">
        {list.map((l) => (
          <div key={`${l.locality}-${l.province}`} className="flex items-center justify-between gap-2 text-[13px]">
            <span className="min-w-0 truncate text-fg">
              {l.locality}
              {l.locality !== l.province ? <span className="text-fg-subtle"> · {l.province}</span> : null}
            </span>
            <span className="shrink-0 tabular-nums text-fg-muted">
              ≈ <span className="font-semibold text-fg">{formatInt(Math.round(l.available_posts))}</span> / {formatInt(l.posts)}
            </span>
          </div>
        ))}
        {!list.length ? <p className="text-[13px] text-fg-muted">No quedarían plazas libres.</p> : null}
      </div>
    </div>
  );
}

function MapLegend({ metric }: { metric: MapMetric }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-border bg-surface-2/60 px-2.5 py-1.5 text-[11px] text-fg-muted">
      {metric === "available" ? (
        <>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-2 rounded-[2px] border border-fg/30 bg-fg/10" /> plazas que hubo
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-2 rounded-[2px] bg-accent" /> libres a tu turno
          </span>
          <span>color: probabilidad de que quede alguna</span>
        </>
      ) : metric === "likely" ? (
        <span>Altura y color: probabilidad de acabar en cada provincia</span>
      ) : (
        <span>Altura: plazas adjudicadas (escala raíz)</span>
      )}
      <span className="flex items-center gap-1.5">
        <svg viewBox="-7 -7 14 14" className="size-3 fill-fg" aria-hidden>
          <path d="M0,-6.5L1.76,-2.42L6.18,-2.01L2.84,0.92L3.82,5.26L0,3L-3.82,5.26L-2.84,0.92L-6.18,-2.01L-1.76,-2.42Z" />
        </svg>
        sede autonómica
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block size-1.5 rounded-full bg-fg/80" aria-hidden /> capital de provincia
      </span>
    </div>
  );
}
