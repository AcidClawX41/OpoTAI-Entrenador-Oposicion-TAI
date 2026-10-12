// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
/**
 * Navegador de preguntas agrupado por partes (1.ª parte · Cuestionario y 2.ª parte · Supuesto
 * práctico): respondida / dudosa / actual, reservas aparte, supuesto elegido y leyenda.
 */
import type { ReactNode } from "react";
import type { ExamPaper, PaperQuestion, PaperSection } from "@/api/types";
import { cn } from "@/lib/cn";
import { formatInt, ordinalFem, plural } from "@/lib/format";
import type { ExamState, TabKey } from "@/lib/exam/model";
import { caseSections, currentEntry, showsOneCase, theorySections } from "@/lib/exam/navigation";
import type { ExamSummary } from "@/lib/exam/summary";
import { partName } from "@/lib/exam/structure";
import { Badge } from "@/components/ui/Badge";

interface QuestionNavigatorProps {
  paper: ExamPaper;
  state: ExamState;
  summary: ExamSummary;
  onGo: (questionId: string) => void;
  /** Cambia de parte (1.ª parte · Cuestionario / 2.ª parte · Supuesto práctico). */
  onTab: (tab: TabKey) => void;
}

function Cell({ q, state, current, dimmed, onGo }: { q: PaperQuestion; state: ExamState; current: boolean; dimmed: boolean; onGo: (id: string) => void }) {
  const ans = state.answers[q.id];
  const fb = state.feedback[q.id];
  const answered = (ans?.choice ?? null) !== null;
  const flagged = ans?.flagged ?? false;
  const tone = fb
    ? fb.annulled
      ? "neutral"
      : fb.chosen === null
        ? "revealed"
        : fb.is_correct
          ? "correct"
          : "wrong"
    : answered
      ? "answered"
      : "empty";
  const label = `Pregunta ${q.display_number}: ${
    tone === "correct" ? "acertada" : tone === "wrong" ? "fallada" : tone === "answered" ? `respondida (${ans?.choice})` : tone === "revealed" ? "solución vista" : "sin responder"
  }${flagged ? ", marcada como dudosa" : ""}${current ? ", actual" : ""}`;
  return (
    <button
      type="button"
      onClick={() => onGo(q.id)}
      aria-label={label}
      aria-current={current ? "step" : undefined}
      className={cn(
        "relative grid h-9 place-items-center rounded-lg text-[12.5px] font-semibold tabular-nums transition-all duration-100 hover:scale-105",
        tone === "empty" && "border border-border bg-surface-2 text-fg-muted hover:border-border-strong hover:text-fg",
        tone === "answered" && "bg-accent text-accent-fg",
        tone === "correct" && "bg-success text-white",
        tone === "wrong" && "bg-danger text-white",
        tone === "revealed" && "border border-dashed border-border-strong bg-surface-2 text-fg-subtle",
        tone === "neutral" && "bg-surface-3 text-fg-muted",
        dimmed && !current && "opacity-55",
        current && "ring-2 ring-fg ring-offset-2 ring-offset-surface",
      )}
    >
      {q.display_number}
      {flagged ? <span className="absolute -right-1 -top-1 size-2.5 rounded-full bg-warning ring-2 ring-surface" aria-hidden /> : null}
    </button>
  );
}

function Grid({ questions, state, currentId, dimmed = false, onGo }: { questions: PaperQuestion[]; state: ExamState; currentId: string | undefined; dimmed?: boolean; onGo: (id: string) => void }) {
  return (
    <div className="grid grid-cols-6 gap-1.5">
      {questions.map((q) => (
        <Cell key={q.id} q={q} state={state} current={q.id === currentId} dimmed={dimmed} onGo={onGo} />
      ))}
    </div>
  );
}

function SectionGroup({
  title,
  badge,
  section,
  state,
  currentId,
  dimmed,
  onGo,
}: {
  title: string | null;
  badge?: ReactNode;
  section: PaperSection;
  state: ExamState;
  currentId: string | undefined;
  dimmed?: boolean;
  onGo: (id: string) => void;
}) {
  const main = section.questions.filter((q) => !q.is_reserve);
  const reserve = section.questions.filter((q) => q.is_reserve);
  return (
    <div className="space-y-3">
      {title ? (
        <p className="flex min-w-0 items-center gap-2 text-[11.5px] font-semibold text-fg-muted">
          <span className="min-w-0 truncate">{title}</span>
          {badge}
        </p>
      ) : null}
      <Grid questions={main} state={state} currentId={currentId} dimmed={dimmed} onGo={onGo} />
      {reserve.length > 0 ? (
        <div className="rounded-xl border border-dashed border-border-strong p-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">Reservas</p>
          <Grid questions={reserve} state={state} currentId={currentId} dimmed={dimmed} onGo={onGo} />
          <p className="mt-2 text-[11px] leading-4 text-fg-subtle">Solo cuentan si se anula alguna pregunta de la parte.</p>
        </div>
      ) : null}
    </div>
  );
}

function PartRow({
  part,
  kind,
  answered,
  total,
  active,
  hint,
  onSelect,
}: {
  part: number;
  kind: TabKey;
  answered: number;
  total: number;
  active: boolean;
  hint?: string;
  onSelect: () => void;
}) {
  const ratio = total > 0 ? Math.min(1, answered / total) : 0;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active ? "true" : undefined}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition-colors",
        active ? "border-accent/40 bg-accent-soft" : "border-transparent hover:border-border hover:bg-surface-2",
      )}
    >
      <span
        className={cn("grid size-6 shrink-0 place-items-center rounded-full text-[11.5px] font-bold", active ? "bg-accent text-accent-fg" : "bg-surface-3 text-fg-muted")}
        aria-hidden
      >
        {part}
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("block truncate text-[12.5px] font-semibold", active ? "text-fg" : "text-fg-muted")}>
          {ordinalFem(part)} parte · {partName(kind === "case" ? "case" : "theory")}
        </span>
        <span className="mt-1 flex items-center gap-2">
          <span className={cn("h-1 flex-1 overflow-hidden rounded-full", active ? "bg-accent/20" : "bg-surface-3")} aria-hidden>
            <span className="block h-full rounded-full bg-accent" style={{ width: `${ratio * 100}%` }} />
          </span>
          <span className="shrink-0 text-[11px] font-semibold tabular-nums text-fg-muted">
            {formatInt(answered)}/{formatInt(total)}
          </span>
        </span>
        {hint ? <span className="mt-0.5 block truncate text-[11px] text-fg-subtle">{hint}</span> : null}
      </span>
    </button>
  );
}

export function QuestionNavigator({ paper, state, summary, onGo, onTab }: QuestionNavigatorProps) {
  const current = currentEntry(paper, state)?.question.id;
  const theory = theorySections(paper);
  const cases = caseSections(paper);
  const oneCase = showsOneCase(paper);
  const multiTheory = theory.length > 1;
  const twoParts = theory.length > 0 && cases.length > 0;
  const theoryPart = theory[0]?.part ?? 1;
  const casePart = cases[0]?.part ?? 2;
  const caseHint = oneCase ? (summary.chosenCase ? "Solo puntúa el supuesto elegido" : `Elige 1 de ${cases.length} supuestos`) : undefined;
  const showTheory = theory.length > 0 && (!twoParts || state.tab === "theory");
  const showCases = cases.length > 0 && (!twoParts || state.tab === "case");

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-5 py-4">
        <p className="text-[13px] font-semibold text-fg">Navegador</p>
        <p className="mt-0.5 text-xs text-fg-muted">
          {formatInt(summary.answered)} de {formatInt(summary.total)} respondidas{twoParts ? " · dos partes, un solo examen" : ""}
        </p>
      </div>
      {twoParts ? (
        <nav aria-label="Partes del examen" className="space-y-1 border-b border-border px-3 py-2.5">
          <PartRow
            part={theoryPart}
            kind="theory"
            answered={summary.perTab.theory.answered}
            total={summary.perTab.theory.total}
            active={state.tab === "theory"}
            onSelect={() => onTab("theory")}
          />
          <PartRow
            part={casePart}
            kind="case"
            answered={summary.perTab.case.answered}
            total={summary.perTab.case.total}
            active={state.tab === "case"}
            hint={caseHint}
            onSelect={() => onTab("case")}
          />
        </nav>
      ) : null}
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
        {showTheory ? (
          <section aria-label={`${ordinalFem(theoryPart)} parte · Cuestionario`} className="space-y-4">
            {theory.map((s) => (
              <SectionGroup key={s.id} title={multiTheory ? s.title : null} section={s} state={state} currentId={current} onGo={onGo} />
            ))}
          </section>
        ) : null}
        {showCases ? (
          <section aria-label={`${ordinalFem(casePart)} parte · Supuesto práctico`} className="space-y-5">
            {cases.map((s, i) => {
              const chosen = state.chosenCase === s.id;
              const other = oneCase && state.chosenCase !== null && !chosen;
              return (
                <SectionGroup
                  key={s.id}
                  title={oneCase || cases.length > 1 ? `Supuesto ${i + 1}${s.block ? ` · bloque ${s.block}` : ""}` : null}
                  badge={oneCase && chosen ? <Badge tone="success">Elegido</Badge> : other ? <Badge tone="neutral">No puntúa</Badge> : null}
                  section={s}
                  state={state}
                  currentId={current}
                  dimmed={other}
                  onGo={onGo}
                />
              );
            })}
          </section>
        ) : null}
      </div>
      <div className="space-y-2 border-t border-border px-5 py-4 text-xs text-fg-muted">
        <div className="grid grid-cols-2 gap-x-3 gap-y-2">
          <span className="flex items-center gap-2">
            <span className="size-3 rounded bg-accent" aria-hidden /> Respondida
          </span>
          <span className="flex items-center gap-2">
            <span className="size-3 rounded border border-border bg-surface-2" aria-hidden /> En blanco
          </span>
          <span className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-warning" aria-hidden /> Dudosa
          </span>
          <span className="flex items-center gap-2">
            <span className="size-3 rounded ring-2 ring-fg ring-offset-1 ring-offset-surface" aria-hidden /> Actual
          </span>
          {paper.feedback === "immediate" ? (
            <>
              <span className="flex items-center gap-2">
                <span className="size-3 rounded bg-success" aria-hidden /> Acertada
              </span>
              <span className="flex items-center gap-2">
                <span className="size-3 rounded bg-danger" aria-hidden /> Fallada
              </span>
            </>
          ) : null}
        </div>
        <p className="pt-1 text-[12px] tabular-nums text-fg">
          {plural(summary.answered, "respondida")} · {formatInt(summary.blank)} en blanco · {plural(summary.flagged.length, "dudosa")}
        </p>
      </div>
    </div>
  );
}
