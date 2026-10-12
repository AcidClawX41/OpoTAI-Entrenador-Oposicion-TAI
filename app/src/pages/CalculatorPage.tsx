// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Calculator, CircleAlert, CircleCheck, Info, MapPinned, RotateCcw, Scissors } from "lucide-react";
import { api } from "@/api/client";
import { errorMessage } from "@/api/errors";
import type { CalculatorResult, ManualGradeInput, ScoringScheme } from "@/api/types";
import { cn } from "@/lib/cn";
import { defaultParts, partQuestions, toManualInput, updatePart, validateParts, type CalcPart } from "@/lib/calculator";
import { formatInt, formatNumber, formatPenalty, formatPercent, ordinalFem } from "@/lib/format";
import { ACCESS_LABEL } from "@/lib/labels";
import { useSession } from "@/store/session";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Field, NumberField, Segmented, Select, Slider } from "@/components/ui/controls";
import { EmptyState, PageHeader } from "@/components/ui/display";
import { Skeleton, Spinner } from "@/components/ui/misc";
import { GradeSummary } from "@/components/results/GradeSummary";
import { PartsTable } from "@/components/results/PartsTable";
import { PredictionPanel } from "@/components/prediction/PredictionPanel";

const DestinationSimulator = lazy(() =>
  import("@/components/destinations/DestinationSimulator").then((m) => ({ default: m.DestinationSimulator })),
);

function PartInputs({
  scheme,
  part,
  value,
  error,
  unassigned,
  onChange,
}: {
  scheme: ScoringScheme;
  part: ScoringScheme["parts"][number];
  value: CalcPart;
  error: string | null;
  unassigned: number;
  onChange: (patch: Partial<Pick<CalcPart, "correct" | "wrong" | "blank">>) => void;
}) {
  const n = partQuestions(part);
  const multi = scheme.parts.length > 1;
  return (
    <fieldset className={cn("rounded-2xl border p-4", error ? "border-danger/50 bg-danger-soft/40" : "border-border bg-surface-2/40")}>
      <legend className="sr-only">{`${ordinalFem(part.part)} parte`}</legend>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-fg">
          {multi ? `${ordinalFem(part.part)} parte · ` : ""}
          {part.kind === "case" ? "Supuesto práctico" : "Cuestionario"}
        </p>
        <p className="text-xs text-fg-muted">
          {formatInt(n)} preguntas · acierto +{formatNumber(part.value, 3)} · error {formatPenalty(part.value, part.penalty_divisor)}
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        <NumberField label="Aciertos" value={value.correct} min={0} max={n} onChange={(v) => onChange({ correct: v })} invalid={Boolean(error)} />
        <NumberField label="Fallos" value={value.wrong} min={0} max={n} onChange={(v) => onChange({ wrong: v })} invalid={Boolean(error)} />
        <NumberField label="En blanco" value={value.blank} min={0} max={n} onChange={(v) => onChange({ blank: v })} invalid={Boolean(error)} />
      </div>
      <p className={cn("mt-2.5 flex items-start gap-1.5 text-xs", error ? "text-danger-text" : "text-fg-muted")} role={error ? "alert" : undefined}>
        {error ? (
          <>
            <CircleAlert className="mt-px size-3.5 shrink-0" aria-hidden /> {error}
          </>
        ) : unassigned > 0 ? (
          <>
            <Info className="mt-px size-3.5 shrink-0" aria-hidden /> Quedan {formatInt(unassigned)} sin asignar: cuentan como en blanco.
          </>
        ) : (
          <>
            <CircleCheck className="mt-px size-3.5 shrink-0 text-success-text" aria-hidden /> {formatInt(n)} de {formatInt(n)} preguntas
            {value.blankTouched ? "" : " · los blancos se rellenan solos"}
          </>
        )}
      </p>
    </fieldset>
  );
}

export default function CalculatorPage() {
  const catalog = useSession((s) => s.catalog);
  const settings = useSession((s) => s.settings);
  const profile = useSession((s) => s.profile);
  const schemes = catalog?.schemes ?? [];
  const [schemeId, setSchemeId] = useState<string | null>(null);
  const scheme = useMemo(
    () => schemes.find((s) => s.id === (schemeId ?? catalog?.default_scheme)) ?? schemes[0] ?? null,
    [schemes, schemeId, catalog?.default_scheme],
  );
  const [parts, setParts] = useState<CalcPart[]>([]);
  const [cutMode, setCutMode] = useState<"auto" | "custom">(settings?.cutoff_override_ratio !== null && settings?.cutoff_override_ratio !== undefined ? "custom" : "auto");
  const [cutRatio, setCutRatio] = useState<number>(settings?.cutoff_override_ratio ?? 0.5);
  const [result, setResult] = useState<CalculatorResult | null>(null);
  const [simInput, setSimInput] = useState<ManualGradeInput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);
  // Desde Inicio («Probar con otra nota»): abre el simulador de destinos con la nota de partida.
  const location = useLocation();
  const wantsSimulator = (location.state as { simulate?: boolean } | null)?.simulate === true;
  const autoSimulated = useRef(false);

  // Nuevo esquema → valores de partida.
  useEffect(() => {
    if (scheme) setParts(defaultParts(scheme));
  }, [scheme]);

  const validation = useMemo(() => (scheme ? validateParts(scheme, parts) : []), [scheme, parts]);
  const valid = parts.length > 0 && validation.every((v) => !v.error);
  // El núcleo nunca aplica un corte por debajo del mínimo reglamentario (30 %): el control empieza ahí.
  const cutFloor = scheme ? Math.max(...scheme.grading.units.map((u) => u.min_direct_ratio), 0) || 0.3 : 0.3;
  const override = cutMode === "custom" ? Math.max(cutRatio, cutFloor) : null;

  useEffect(() => {
    if (!scheme || !valid) return;
    const id = ++seq.current;
    setLoading(true);
    const timer = window.setTimeout(() => {
      api
        .calculateGrade(profile?.id ?? null, toManualInput(scheme, parts, override))
        .then((r) => {
          if (id !== seq.current) return;
          setResult(r);
          setError(null);
        })
        .catch((e: unknown) => {
          if (id === seq.current) setError(errorMessage(e));
        })
        .finally(() => {
          if (id === seq.current) setLoading(false);
        });
    }, 220);
    return () => window.clearTimeout(timer);
  }, [scheme, parts, override, valid, profile?.id]);

  useEffect(() => {
    if (!wantsSimulator || autoSimulated.current || !result || !scheme || !valid) return;
    autoSimulated.current = true;
    setSimInput(toManualInput(scheme, parts, override));
    window.setTimeout(() => document.getElementById("simulador-destinos")?.scrollIntoView({ behavior: "smooth", block: "start" }), 450);
  }, [wantsSimulator, result, scheme, valid, parts, override]);

  if (!catalog || !scheme) {
    return (
      <>
        <PageHeader title="Calculadora de nota" />
        <EmptyState icon={<Calculator />} title="No hay esquemas de puntuación" description="Faltan los datos de puntuación del núcleo." />
      </>
    );
  }

  const stale = loading || !valid;

  return (
    <div className="@container">
      <PageHeader
        title="Calculadora de nota"
        description="Tu nota real y tus posibilidades a partir de aciertos, fallos y blancos, con la corrección oficial del tribunal."
      />
      <div className="grid items-start gap-5 @5xl:grid-cols-[minmax(0,1fr)_minmax(0,1.45fr)]">
        <Card className="@5xl:sticky @5xl:top-6">
          <CardHeader
            title="Tus respuestas"
            description={`${ACCESS_LABEL[scheme.access]} · ${formatInt(scheme.duration_minutes)} min`}
            icon={<Calculator />}
            action={
              <Button size="xs" variant="ghost" leftIcon={<RotateCcw className="size-3" />} onClick={() => setParts(defaultParts(scheme))}>
                Restablecer
              </Button>
            }
          />
          <div className="space-y-4 p-5">
            {schemes.length > 1 ? (
              <Field label="Formato del examen" htmlFor="calc-esquema">
                <Select id="calc-esquema" value={scheme.id} onChange={(e) => setSchemeId(e.target.value)}>
                  {schemes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                      {s.id === catalog.default_scheme ? " (vigente)" : ""}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : null}

            {scheme.parts.map((p) => {
              const value = parts.find((x) => x.part === p.part);
              const v = validation.find((x) => x.part === p.part);
              if (!value || !v) return null;
              return (
                <PartInputs
                  key={`${scheme.id}-${p.part}`}
                  scheme={scheme}
                  part={p}
                  value={value}
                  error={v.error}
                  unassigned={v.unassigned}
                  onChange={(patch) => setParts((cur) => updatePart(scheme, cur, p.part, patch))}
                />
              );
            })}

            <div className="space-y-3 rounded-2xl border border-border bg-surface-2/40 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-sm font-semibold text-fg">
                  <Scissors className="size-4 text-fg-subtle" aria-hidden /> Nota de corte
                </p>
                <Segmented
                  size="sm"
                  label="Nota de corte"
                  value={cutMode}
                  onChange={setCutMode}
                  options={[
                    { value: "auto", label: "Automática" },
                    { value: "custom", label: "Personalizada" },
                  ]}
                />
              </div>
              {cutMode === "custom" ? (
                <div>
                  <div className="mb-2 flex items-baseline justify-between text-[13px]">
                    <span className="text-fg-muted">Corte en la puntuación directa</span>
                    <span className="font-semibold tabular-nums text-fg">{formatPercent(Math.max(cutRatio, cutFloor))} de la máxima</span>
                  </div>
                  <Slider
                    label="Corte personalizado"
                    min={cutFloor}
                    max={0.8}
                    step={0.01}
                    value={Math.max(cutRatio, cutFloor)}
                    onChange={setCutRatio}
                    valueText={`${formatPercent(Math.max(cutRatio, cutFloor))} de la puntuación directa máxima`}
                  />
                  <p className="mt-2 text-xs leading-5 text-fg-muted">Nunca por debajo del mínimo reglamentario de cada parte.</p>
                </div>
              ) : (
                <p className="text-xs leading-5 text-fg-muted">
                  Se usa el corte oficial si se conoce; si no, una estimación con los datos de convocatorias anteriores.
                </p>
              )}
            </div>
          </div>
        </Card>

        <div className="relative min-w-0 space-y-5" aria-live="polite" aria-busy={loading || undefined}>
          {error ? (
            <div className="flex items-start gap-2 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-fg" role="alert">
              <CircleAlert className="mt-0.5 size-4 shrink-0 text-danger-text" aria-hidden /> {error}
            </div>
          ) : null}
          {!valid ? (
            <div className="flex items-start gap-2 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-fg">
              <CircleAlert className="mt-0.5 size-4 shrink-0 text-warning-text" aria-hidden /> Corrige los datos marcados para recalcular la nota.
            </div>
          ) : null}
          {result ? (
            <div className={cn("space-y-5 transition-opacity duration-200", stale && "opacity-60")}>
              <div className="relative">
                <GradeSummary grade={result.grade} scheme={scheme} compact />
                {loading ? <Spinner className="absolute right-4 top-4" label="Calculando…" /> : null}
              </div>
              <Card>
                <PartsTable grade={result.grade} scheme={scheme} />
              </Card>
              <PredictionPanel prediction={result.prediction} showObserved={false} />
              {scheme && valid ? (
                <Button
                  variant="secondary"
                  className="w-full"
                  leftIcon={<MapPinned className="size-4" />}
                  onClick={() => {
                    setSimInput(toManualInput(scheme, parts, override));
                    window.setTimeout(() => document.getElementById("simulador-destinos")?.scrollIntoView({ behavior: "smooth", block: "start" }), 350);
                  }}
                >
                  Simular destinos con esta nota
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="space-y-5">
              <Skeleton className="h-72" />
              <Skeleton className="h-96" />
            </div>
          )}
        </div>
      </div>
      {simInput ? (
        <div className="mt-6">
          <Suspense fallback={<Skeleton className="h-[520px] rounded-2xl" />}>
            <DestinationSimulator source={{ input: simInput }} />
          </Suspense>
        </div>
      ) : null}
    </div>
  );
}
