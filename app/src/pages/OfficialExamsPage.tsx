// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { Briefcase, CalendarDays, CircleCheck, CirclePlay, ExternalLink, FileWarning, Hourglass, Landmark, Layers } from "lucide-react";
import { api } from "@/api/client";
import type { BankSummary, BlockId } from "@/api/types";
import { cn } from "@/lib/cn";
import { formatDate, formatGrade, formatInt, formatPercent, plural } from "@/lib/format";
import { ACCESS_LABEL, ANSWER_KEY_LABEL, officialBanks } from "@/lib/labels";
import { RUN_MODE_FEEDBACK, RUN_MODE_LABEL, runModeFromSettings, withRunMode, type ExamRunMode } from "@/lib/examMode";
import { bankStructure, companionBank, officialExamMinutes, officialExamSections, theorySectionsCounted } from "@/lib/exam/structure";
import { openExternal } from "@/lib/platform";
import { formatMinutes } from "@/lib/time";
import { useApi } from "@/hooks/useApi";
import { useExamLauncher } from "@/hooks/useExamLauncher";
import { useSession } from "@/store/session";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/controls";
import { EmptyState, PageHeader } from "@/components/ui/display";
import { Progress } from "@/components/ui/misc";
import { Tooltip } from "@/components/ui/overlays";
import { ExamLaunchDialog } from "@/components/exam/ExamLaunchDialog";

function examTitle(bank: BankSummary): string {
  const extra = bank.id.endsWith("-ext") ? " · llamamiento extraordinario" : "";
  return bank.year ? `Convocatoria ${bank.year}${extra}` : bank.title;
}

/** Nota sobre el examen completo repartido en dos bancos (p. ej. 2018: 2.º ejercicio publicado aparte). */
function companionNote(bank: BankSummary, companion: BankSummary | null): string | null {
  if (!companion) return null;
  if (bank.complete_exam)
    return companion.answer_key === "propia"
      ? "1.er y 2.º ejercicio (2.º con respuestas propuestas por OpoTAI)"
      : "1.er y 2.º ejercicio, publicados por separado";
  return `${companion.year ? `2.º ejercicio de la convocatoria ${companion.year}` : "2.º ejercicio"}: el examen completo está en «${examTitle(companion)}».`;
}

function BankCard({
  bank,
  banks,
  lastGrade,
  onStart,
  onOpenComplete,
  busy,
}: {
  bank: BankSummary;
  banks: BankSummary[];
  lastGrade: { grade: number; max: number } | null;
  onStart: (theoryBlock: BlockId | null) => void;
  /** En un ejercicio publicado aparte: abre la réplica del examen completo. */
  onOpenComplete?: () => void;
  busy: boolean;
}) {
  const navigate = useNavigate();
  const totalQ = bank.question_count + bank.reserve_count;
  const explained = totalQ > 0 ? Math.min(1, bank.explained_count / totalQ) : 0;
  const sections = officialExamSections(banks, bank);
  const companion = companionBank(banks, bank);
  const secondary = !bank.complete_exam && companion !== null;
  const note = companionNote(bank, companion);
  const { alternatives, choosable, counted } = theorySectionsCounted(sections);
  const [block, setBlock] = useState<BlockId | null>(choosable ? (alternatives[0]?.block ?? null) : null);
  const theoryQ = counted.reduce((n, s) => n + s.question_count, 0);
  const theoryR = counted.reduce((n, s) => n + s.reserve_count, 0);
  const cases = sections.filter((s) => s.kind === "case");
  const caseQ = cases[0]?.question_count ?? 0;
  const minutes = officialExamMinutes(banks, bank);
  const source = bank.source_urls[0];
  return (
    <article className="group flex w-full flex-col rounded-2xl border border-border bg-surface p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-pop">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {bank.access ? <Badge tone={bank.access === "libre" ? "accent" : "info"}>{ACCESS_LABEL[bank.access]}</Badge> : null}
          <Badge
            tone={bank.answer_key === "definitiva" ? "success" : bank.answer_key === "provisional" ? "warning" : "neutral"}
            icon={bank.answer_key === "definitiva" ? <CircleCheck /> : bank.answer_key === "provisional" ? <Hourglass /> : undefined}
          >
            {ANSWER_KEY_LABEL[bank.answer_key]}
          </Badge>
        </div>
        {source ? (
          <Tooltip content="Ver la fuente oficial (INAP)">
            <button
              type="button"
              onClick={() => void openExternal(source)}
              aria-label={`Fuente oficial de ${examTitle(bank)}`}
              className="grid size-8 place-items-center rounded-lg text-fg-subtle transition-colors hover:bg-surface-2 hover:text-fg"
            >
              <ExternalLink className="size-4" />
            </button>
          </Tooltip>
        ) : null}
      </div>

      <h3 className="mt-3 text-lg font-semibold tracking-tight text-fg">{examTitle(bank)}</h3>
      <p className="mt-1 flex items-center gap-1.5 text-[13px] text-fg-muted">
        <CalendarDays className="size-3.5" aria-hidden />
        {bank.exam_date ? `Examen del ${formatDate(bank.exam_date)}` : "Sin fecha de examen"}
      </p>

      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-surface-2/70 px-2 py-2.5">
          <dt className="text-[11px] text-fg-muted">1.ª parte</dt>
          <dd className="mt-0.5 text-[15px] font-semibold tabular-nums text-fg">
            {theoryQ > 0 ? (
              <>
                {formatInt(theoryQ)}
                {theoryR ? <span className="text-xs font-normal text-fg-subtle"> +{theoryR}</span> : null}
              </>
            ) : (
              "—"
            )}
          </dd>
        </div>
        <div className="rounded-xl bg-surface-2/70 px-2 py-2.5">
          <dt className="text-[11px] text-fg-muted">2.ª parte</dt>
          <dd className="mt-0.5 text-[15px] font-semibold tabular-nums text-fg">
            {cases.length > 0 ? (
              <>
                {formatInt(caseQ)}
                <span className="text-xs font-normal text-fg-subtle"> · 1 de {formatInt(cases.length)}</span>
              </>
            ) : (
              "—"
            )}
          </dd>
        </div>
        <div className="rounded-xl bg-surface-2/70 px-2 py-2.5">
          <dt className="text-[11px] text-fg-muted">Duración</dt>
          <dd className="mt-0.5 text-[15px] font-semibold tabular-nums text-fg">{formatMinutes(minutes)}</dd>
        </div>
      </dl>

      {note ? (
        <div
          className={cn(
            "mt-3 flex items-start gap-2 rounded-xl border px-3 py-2 text-[12.5px] leading-5",
            secondary ? "border-warning/30 bg-warning-soft text-fg" : "border-info/25 bg-info-soft text-fg",
          )}
        >
          <Layers className={cn("mt-0.5 size-3.5 shrink-0", secondary ? "text-warning-text" : "text-info-text")} aria-hidden />
          <span className="min-w-0 flex-1">
            {note}
            {secondary && onOpenComplete ? (
              <>
                {" "}
                <button type="button" onClick={onOpenComplete} className="font-semibold text-accent-text underline-offset-2 hover:underline">
                  Hacer el examen completo
                </button>
              </>
            ) : null}
          </span>
        </div>
      ) : null}

      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="text-fg-muted">Preguntas explicadas</span>
          <span className="font-semibold tabular-nums text-fg">{formatPercent(explained)}</span>
        </div>
        <Progress value={explained} tone={explained >= 0.9 ? "success" : explained > 0 ? "accent" : "neutral"} />
      </div>

      <div className="mt-3 flex min-h-6 flex-wrap items-center gap-2 text-xs text-fg-muted">
        {bank.annulled_count > 0 ? (
          <span className="inline-flex items-center gap-1">
            <FileWarning className="size-3.5 text-warning-text" aria-hidden /> {plural(bank.annulled_count, "anulada")}
          </span>
        ) : null}
        {lastGrade ? (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 font-medium text-fg">
            Tu última nota: <span className="tabular-nums">{formatGrade(lastGrade.grade)}</span>
            <span className="text-fg-subtle">/{formatInt(lastGrade.max)}</span>
          </span>
        ) : null}
      </div>

      {choosable ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface-2/50 px-3 py-2">
          <span className="text-xs text-fg-muted">1.ª parte: comunes + bloque a elegir</span>
          <Segmented
            size="sm"
            label="Bloque de la 1.ª parte"
            value={block ?? alternatives[0]!.block!}
            onChange={(b) => setBlock(b)}
            options={alternatives.map((s) => ({ value: s.block!, label: `Bloque ${s.block}` }))}
          />
        </div>
      ) : null}

      <div className="mt-auto flex flex-wrap gap-2 pt-5">
        <Button variant="primary" size="sm" className="flex-1" disabled={busy} leftIcon={<CirclePlay className="size-3.5" />} onClick={() => onStart(block)}>
          {secondary ? "Hacer solo este ejercicio" : "Empezar el examen"}
        </Button>
        {cases.length > 0 ? (
          <Button
            size="sm"
            variant="ghost"
            leftIcon={<Briefcase className="size-3.5" />}
            onClick={() => navigate(`/supuestos?banco=${encodeURIComponent(bank.sections.some((s) => s.kind === "case") ? bank.id : (companion?.id ?? bank.id))}`)}
          >
            Supuestos
          </Button>
        ) : null}
      </div>
    </article>
  );
}

export default function OfficialExamsPage() {
  const catalog = useSession((s) => s.catalog);
  const settings = useSession((s) => s.settings);
  const saveSettings = useSession((s) => s.saveSettings);
  const profile = useSession((s) => s.profile)!;
  const { launch, busy, dialog } = useExamLauncher();
  const [access, setAccess] = useState<"all" | "libre" | "promocion_interna">("all");
  const [pending, setPending] = useState<{ bank: BankSummary; block: BlockId | null } | null>(null);
  const attempts = useApi(() => api.listAttempts(profile.id, 200), [profile.id]);

  const banks = useMemo(() => officialBanks(catalog).filter((b) => access === "all" || b.access === access), [catalog, access]);
  const lastByTitle = useMemo(() => {
    const map = new Map<string, { grade: number; max: number }>();
    for (const a of attempts.data ?? [])
      if (a.mode === "official" && a.status === "finished" && a.total_grade !== null && a.max_grade !== null && !map.has(a.title))
        map.set(a.title, { grade: a.total_grade, max: a.max_grade });
    return map;
  }, [attempts.data]);
  const mode = runModeFromSettings(settings);
  const setMode = (next: ExamRunMode) => void saveSettings({ exam_feedback: RUN_MODE_FEEDBACK[next] });
  const allBanks = catalog?.banks ?? [];
  const structure = pending ? bankStructure(catalog, pending.bank) : null;
  const pendingNote = pending ? companionNote(pending.bank, companionBank(allBanks, pending.bank)) : null;

  const start = () => {
    if (!pending) return;
    const { bank, block } = pending;
    setPending(null);
    void launch(
      withRunMode({ type: "official", bank_id: bank.id, include_reserve: true, timed: true, feedback: RUN_MODE_FEEDBACK[mode], theory_block: block }, mode),
    );
  };

  return (
    <div className="@container">
      <PageHeader
        title="Exámenes oficiales"
        description="Convocatorias anteriores tal y como se examinaron: las dos partes (cuestionario y supuesto práctico), con sus preguntas de reserva, las anuladas y la plantilla del tribunal."
      />
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <Segmented
          label="Turno de acceso"
          value={access}
          onChange={setAccess}
          options={[
            { value: "all", label: "Todos" },
            { value: "libre", label: "Ingreso libre" },
            { value: "promocion_interna", label: "Promoción interna" },
          ]}
        />
        <p className="text-[13px] text-fg-muted">
          Modo actual: <strong className="font-semibold text-fg">{RUN_MODE_LABEL[mode]}</strong> · lo eliges al empezar cada examen
        </p>
      </div>

      {banks.length === 0 ? (
        <EmptyState icon={<Landmark />} title="No hay exámenes oficiales" description="Cuando el núcleo incluya bancos oficiales aparecerán aquí." />
      ) : (
        <div className="grid gap-4 @3xl:grid-cols-2 @6xl:grid-cols-3">
          {banks.map((bank, i) => {
            const companion = companionBank(allBanks, bank);
            return (
              <motion.div key={bank.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.035, duration: 0.3 }} className="flex">
                <BankCard
                  bank={bank}
                  banks={allBanks}
                  busy={busy}
                  lastGrade={lastByTitle.get(bank.title) ?? null}
                  onStart={(block) => setPending({ bank, block })}
                  onOpenComplete={companion && !bank.complete_exam ? () => setPending({ bank: companion, block: null }) : undefined}
                />
              </motion.div>
            );
          })}
        </div>
      )}

      <ExamLaunchDialog
        open={pending !== null}
        onClose={() => setPending(null)}
        eyebrow={pending?.bank.access ? `Examen oficial · ${ACCESS_LABEL[pending.bank.access]}` : "Examen oficial"}
        title={pending ? examTitle(pending.bank) : ""}
        description={
          pending
            ? `${pending.bank.exam_date ? `Examen del ${formatDate(pending.bank.exam_date)}. ` : ""}${
                pending.bank.complete_exam
                  ? "Réplica exacta: las dos partes forman un único examen y se corrigen como lo hizo el tribunal."
                  : "Réplica de esta parte del examen, corregida como lo hizo el tribunal."
              }${pendingNote ? ` ${pendingNote}` : ""}`
            : undefined
        }
        structure={structure}
        mode={mode}
        onModeChange={setMode}
        durationMinutes={structure?.durationMinutes ?? pending?.bank.duration_minutes ?? null}
        busy={busy}
        onStart={start}
      />
      {dialog}
    </div>
  );
}
