// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
import { useMemo, useState } from "react";
import { Check, CirclePlay, Gauge, Hash, Info, Rocket, Shuffle, Timer } from "lucide-react";
import { api } from "@/api/client";
import { cn } from "@/lib/cn";
import { formatDate, formatGrade, formatInt } from "@/lib/format";
import { ACCESS_LABEL } from "@/lib/labels";
import { RUN_MODE_FEEDBACK, runModeFromSettings, withRunMode, type ExamRunMode } from "@/lib/examMode";
import { formatMinutes } from "@/lib/time";
import { useApi } from "@/hooks/useApi";
import { useExamLauncher } from "@/hooks/useExamLauncher";
import { useSession } from "@/store/session";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Field, Segmented, Select, Slider, Switch } from "@/components/ui/controls";
import { EmptyState, PageHeader } from "@/components/ui/display";
import { Tooltip } from "@/components/ui/overlays";
import { SchemeSummary } from "@/components/exam/SchemeSummary";
import { ExamModeChooser } from "@/components/exam/ExamModeChooser";

/** Simulacros numerados del núcleo («Simulacro OpoTAI n.º 1…30», ver docs/CONTRATO-API.md). */
const NUMBERED_COUNT = 30;
const NUMBERED_TITLE = /Simulacro OpoTAI n\.º\s*(\d+)/i;

interface NumberedDone {
  grade: number | null;
  max: number | null;
  date: string;
}

function NumberedSimulacros({
  mode,
  durationMinutes,
  busy,
  onStart,
}: {
  mode: ExamRunMode;
  durationMinutes: number;
  busy: boolean;
  onStart: (n: number) => void;
}) {
  const profile = useSession((s) => s.profile)!;
  const attempts = useApi(() => api.listAttempts(profile.id, 200), [profile.id]);
  const done = useMemo(() => {
    const map = new Map<number, NumberedDone>();
    for (const a of attempts.data ?? []) {
      const m = a.status === "finished" ? NUMBERED_TITLE.exec(a.title) : null;
      const n = m ? Number(m[1]) : NaN;
      if (Number.isInteger(n) && !map.has(n)) map.set(n, { grade: a.total_grade, max: a.max_grade, date: a.finished_at ?? a.started_at });
    }
    return map;
  }, [attempts.data]);
  const firstPending = useMemo(() => {
    for (let n = 1; n <= NUMBERED_COUNT; n++) if (!done.has(n)) return n;
    return 1;
  }, [done]);
  const [picked, setPicked] = useState<number | null>(null);
  const selected = picked ?? firstPending;
  const info = done.get(selected);

  return (
    <Card>
      <CardHeader
        title="Simulacros numerados"
        description="30 exámenes completos de composición fija: si repites uno, tendrás las mismas preguntas para medir tu progreso."
        icon={<Hash />}
        action={<Badge tone="neutral">{formatInt(done.size)}/{formatInt(NUMBERED_COUNT)} hechos</Badge>}
      />
      <div className="space-y-4 p-5">
        <div role="radiogroup" aria-label="Simulacro numerado" className="grid grid-cols-10 gap-1.5">
          {Array.from({ length: NUMBERED_COUNT }, (_, i) => i + 1).map((n) => {
            const d = done.get(n);
            const active = n === selected;
            return (
              <Tooltip key={n} content={d ? `Hecho el ${formatDate(d.date)}${d.grade !== null ? ` · nota ${formatGrade(d.grade)}` : ""}` : `Simulacro n.º ${n} · sin hacer`} className="flex">
                <button
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={`Simulacro n.º ${n}${d ? ", hecho" : ""}`}
                  onClick={() => setPicked(n)}
                  className={cn(
                    "relative grid h-9 w-full place-items-center rounded-lg text-[13px] font-semibold tabular-nums transition-all duration-150",
                    active
                      ? "bg-accent text-accent-fg shadow-glow"
                      : d
                        ? "border border-success/35 bg-success-soft text-success-text hover:border-success/60"
                        : "border border-border bg-surface-2 text-fg-muted hover:border-border-strong hover:text-fg",
                  )}
                >
                  {n}
                  {d && !active ? <Check className="absolute -right-1 -top-1 size-3.5 rounded-full bg-success p-0.5 text-white" strokeWidth={4} aria-hidden /> : null}
                </button>
              </Tooltip>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface-2/50 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-fg">Simulacro OpoTAI n.º {selected}</p>
            <p className="mt-0.5 text-[12.5px] text-fg-muted">
              Cuestionario + supuesto práctico · {mode === "real" ? `${formatInt(durationMinutes)} min` : "sin límite"}
              {info ? ` · hecho el ${formatDate(info.date)}${info.grade !== null ? ` (nota ${formatGrade(info.grade)})` : ""}` : " · sin hacer"}
            </p>
          </div>
          <Button variant="primary" loading={busy} leftIcon={<CirclePlay className="size-4" />} onClick={() => onStart(selected)}>
            Empezar el n.º {selected}
          </Button>
        </div>
      </div>
    </Card>
  );
}

export default function SimulacroPage() {
  const catalog = useSession((s) => s.catalog);
  const settings = useSession((s) => s.settings);
  const saveSettings = useSession((s) => s.saveSettings);
  const { launch, busy, dialog } = useExamLauncher();
  const [schemeId, setSchemeId] = useState<string | null>(null);
  const [kind, setKind] = useState<"full" | "quick">("full");
  const [quickCount, setQuickCount] = useState(30);
  const [quickCase, setQuickCase] = useState(false);
  const [preferUnseen, setPreferUnseen] = useState(true);

  const scheme = useMemo(() => {
    if (!catalog) return null;
    return catalog.schemes.find((s) => s.id === (schemeId ?? catalog.default_scheme)) ?? catalog.schemes[0] ?? null;
  }, [catalog, schemeId]);
  const defaultScheme = catalog?.schemes.find((s) => s.id === catalog.default_scheme) ?? scheme;

  if (!catalog || !scheme || !settings) {
    return (
      <>
        <PageHeader title="Simulacro" />
        <EmptyState icon={<Info />} title="No hay esquemas de examen disponibles" description="Faltan los datos de puntuación del núcleo." />
      </>
    );
  }

  const mode = runModeFromSettings(settings);
  const setMode = (next: ExamRunMode) => void saveSettings({ exam_feedback: RUN_MODE_FEEDBACK[next] });
  const theory = scheme.parts.find((p) => p.kind === "theory");
  const casePart = scheme.parts.find((p) => p.kind === "case");
  const fullQuestions = theory?.questions ?? 80;
  const caseQuestions = (casePart?.questions ?? 0) * (casePart?.cases_to_choose ?? 1);
  const includeCase = kind === "full" ? Boolean(casePart) : quickCase && Boolean(casePart);
  const part1 = kind === "full" ? fullQuestions : Math.min(quickCount, fullQuestions);
  const totalQuestions = fullQuestions + caseQuestions;
  const duration =
    kind === "full"
      ? scheme.duration_minutes
      : Math.max(10, Math.round(((scheme.duration_minutes * (part1 + (includeCase ? caseQuestions : 0))) / Math.max(1, totalQuestions)) / 5) * 5);
  // Nota conjunta (una unidad con las dos partes, p. ej. 2023/2024): en la versión rápida el peso
  // relativo del supuesto cambia; se avisa con el peso real frente al del examen completo.
  const jointUnit = scheme.grading.units.some((u) => u.parts.length > 1);
  const caseMax = (casePart?.questions ?? 0) * (casePart?.value ?? 1);
  const theoryValue = theory?.value ?? 1;
  const caseShare = caseMax / Math.max(1, caseMax + part1 * theoryValue);
  const fullCaseShare = caseMax / Math.max(1, caseMax + fullQuestions * theoryValue);
  const available = catalog.banks.reduce(
    (n, b) => n + b.sections.filter((s) => s.kind === "theory").reduce((m, s) => m + s.question_count + s.reserve_count, 0),
    0,
  );

  const start = () =>
    void launch(
      withRunMode(
        {
          type: "simulacro",
          scheme_id: scheme.id,
          part1_questions: kind === "full" ? null : part1,
          include_case: includeCase,
          duration_minutes: kind === "full" ? null : duration,
          prefer_unseen: preferUnseen,
          seed: null,
          feedback: RUN_MODE_FEEDBACK[mode],
        },
        mode,
      ),
    );

  /** Freestyle: examen real completo (esquema vigente) con preguntas de todas las convocatorias. */
  const freeScheme = defaultScheme ?? scheme;
  const freeTheory = freeScheme.parts.find((p) => p.kind === "theory");
  const freeCase = freeScheme.parts.find((p) => p.kind === "case");
  const penalty = freeTheory?.penalty_divisor ? `cada error resta 1/${formatInt(freeTheory.penalty_divisor)} de acierto` : "los errores no restan";
  const startFreestyle = () =>
    void launch(
      withRunMode(
        {
          type: "simulacro",
          scheme_id: freeScheme.id,
          part1_questions: null,
          include_case: Boolean(freeCase),
          duration_minutes: null,
          prefer_unseen: false,
          seed: null,
          feedback: RUN_MODE_FEEDBACK[mode],
          freestyle: true,
        },
        mode,
      ),
    );

  return (
    <div className="@container">
      <PageHeader
        title="Simulacro"
        description="Un examen completo con el formato oficial vigente —cuestionario y supuesto práctico—, corregido exactamente como lo hace el tribunal."
      />

      <ExamModeChooser
        value={mode}
        onChange={setMode}
        durationMinutes={duration}
        timerLabel={kind === "quick" ? `Cronómetro proporcional (${formatInt(duration)} min)` : undefined}
        heading="¿Cómo quieres hacerlo?"
        className="mb-6"
      />

      <div className="grid items-start gap-5 @4xl:grid-cols-[minmax(0,1.12fr)_minmax(0,1fr)]">
        <Card className="@container">
          <CardHeader
            title="Formato oficial"
            description={scheme.title}
            icon={<Gauge />}
            action={<Badge tone="accent">{ACCESS_LABEL[scheme.access]}</Badge>}
          />
          <div className="p-5">
            <SchemeSummary
              scheme={scheme}
              overrides={kind === "quick" ? { questions1: part1, reserve1: 0, caseReserve: 0, includeCase, durationMinutes: duration } : { reserve1: 0, caseReserve: 0 }}
            />
            {scheme.notes ? <p className="mt-4 text-[13px] leading-6 text-fg-muted">{scheme.notes}</p> : null}
          </div>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader
              title="Simulacro Freestyle"
              description="El examen real con una batería al azar de todas las convocatorias"
              icon={<Shuffle />}
              action={<Badge tone="warning">Libre + interna</Badge>}
            />
            <div className="space-y-4 p-5">
              <p className="text-sm leading-6 text-fg-muted">
                Mezcla preguntas de <strong className="font-semibold text-fg">ingreso libre y promoción interna de cualquier año</strong> con el
                número de preguntas, el tiempo y la corrección del examen vigente, para repasar conceptos y fallos de forma general.
              </p>
              <div className="rounded-xl border border-accent/25 bg-accent-soft px-4 py-3 text-sm text-fg">
                <strong className="tabular-nums">{formatInt(freeTheory?.questions ?? 80)} preguntas</strong>
                {freeCase ? ` + supuesto práctico (${formatInt(freeCase.questions)})` : ""} · {penalty} ·{" "}
                {mode === "real" ? `${formatMinutes(freeScheme.duration_minutes)} · corrección al entregar` : "sin límite · corrección en cada pregunta"}
              </div>
              <Button variant="primary" size="lg" className="w-full" loading={busy} leftIcon={<Shuffle className="size-4.5" />} onClick={startFreestyle}>
                Empezar Freestyle
              </Button>
            </div>
          </Card>

          <Card>
            <CardHeader title="Simulacro a medida" description="Preguntas nuevas cada vez: completo o en versión rápida" icon={<Rocket />} />
            <div className="space-y-5 p-5">
              {catalog.schemes.length > 1 ? (
                <Field label="Formato" htmlFor="esquema">
                  <Select id="esquema" value={scheme.id} onChange={(e) => setSchemeId(e.target.value)}>
                    {catalog.schemes.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                        {s.id === catalog.default_scheme ? " (vigente)" : ""}
                      </option>
                    ))}
                  </Select>
                </Field>
              ) : null}

              <Segmented
                label="Tipo de simulacro"
                fullWidth
                value={kind}
                onChange={setKind}
                options={[
                  { value: "full", label: "Completo · dos partes", icon: <Timer /> },
                  { value: "quick", label: "Rápido", icon: <Rocket /> },
                ]}
              />

              {kind === "quick" ? (
                <div className="space-y-4 rounded-xl border border-border bg-surface-2/50 p-4">
                  <div>
                    <div className="mb-2 flex items-baseline justify-between">
                      <span className="text-[13px] font-medium text-fg">Preguntas de la 1.ª parte</span>
                      <span className="text-sm font-semibold tabular-nums text-fg">{formatInt(part1)}</span>
                    </div>
                    <Slider label="Preguntas de la 1.ª parte" min={10} max={fullQuestions} step={5} value={part1} onChange={setQuickCount} valueText={`${part1} preguntas`} />
                  </div>
                  {casePart ? (
                    <Switch
                      checked={quickCase}
                      onChange={setQuickCase}
                      label="Incluir la 2.ª parte (supuesto práctico)"
                      description={`${formatInt(casePart.questions)} preguntas más, a elegir entre ${formatInt(casePart.cases_offered ?? 2)} supuestos`}
                    />
                  ) : null}
                </div>
              ) : null}

              <Switch
                checked={preferUnseen}
                onChange={setPreferUnseen}
                label="Priorizar preguntas no vistas"
                description="Elige primero preguntas que todavía no has respondido nunca"
              />

              <div className="rounded-xl border border-accent/25 bg-accent-soft px-4 py-3 text-sm text-fg">
                <strong className="tabular-nums">{formatInt(part1)} preguntas</strong>
                {includeCase ? ` + supuesto práctico (${formatInt(caseQuestions)})` : ""} ·{" "}
                {mode === "real" ? `${formatMinutes(duration)} · corrección al entregar` : "sin límite · corrección en cada pregunta"}
              </div>
              {kind === "quick" && includeCase && jointUnit && part1 < fullQuestions ? (
                <p className="flex items-start gap-2 rounded-xl border border-warning/30 bg-warning-soft px-4 py-2.5 text-xs leading-5 text-fg">
                  <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                  En este formato la nota es conjunta: con {formatInt(part1)} preguntas en la 1.ª parte, el supuesto pesa un{" "}
                  {formatInt(Math.round(caseShare * 100))} % de la nota (en el examen real, un {formatInt(Math.round(fullCaseShare * 100))} %).
                </p>
              ) : null}
              {available > 0 && available < part1 ? (
                <p className="flex items-start gap-2 text-xs leading-5 text-fg-muted">
                  <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                  Hay {formatInt(available)} preguntas de teoría disponibles: el simulacro usará todas las que haya.
                </p>
              ) : null}
              <Button variant="primary" size="lg" className="w-full" loading={busy} leftIcon={<CirclePlay className="size-4.5" />} onClick={start}>
                Empezar simulacro
              </Button>
            </div>
          </Card>

          <NumberedSimulacros
            mode={mode}
            durationMinutes={defaultScheme?.duration_minutes ?? scheme.duration_minutes}
            busy={busy}
            onStart={(number) => void launch(withRunMode({ type: "numbered", number, feedback: RUN_MODE_FEEDBACK[mode] }, mode))}
          />
        </div>
      </div>
      {dialog}
    </div>
  );
}
