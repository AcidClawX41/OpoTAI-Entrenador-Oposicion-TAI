// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "motion/react";
import { Briefcase, CirclePlay, FileText, ScrollText, X } from "lucide-react";
import type { BankSummary, BlockId, SectionSummary } from "@/api/types";
import { formatDate, formatInt } from "@/lib/format";
import { ACCESS_LABEL, bankShortLabel, caseShortTitle } from "@/lib/labels";
import { RUN_MODE_FEEDBACK, readStoredRunMode, storeRunMode, withRunMode, type ExamRunMode } from "@/lib/examMode";
import { stripMarkdown, truncate } from "@/lib/text";
import { useExamLauncher } from "@/hooks/useExamLauncher";
import { useSession } from "@/store/session";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Segmented } from "@/components/ui/controls";
import { EmptyState, PageHeader } from "@/components/ui/display";
import { Markdown } from "@/components/ui/Markdown";
import { ExamModeChooser } from "@/components/exam/ExamModeChooser";

/** El núcleo puede incluir el enunciado en el resumen de la sección (vista previa). */
type CaseSection = SectionSummary & { statement?: string | null };

interface CaseEntry {
  bank: BankSummary;
  section: CaseSection;
}

const BLOCK_STYLE: Record<BlockId, { tone: "accent" | "warning" | "info" | "success"; text: string }> = {
  I: { tone: "info", text: "Bloque I" },
  II: { tone: "success", text: "Bloque II" },
  III: { tone: "accent", text: "Bloque III · Desarrollo de sistemas" },
  IV: { tone: "warning", text: "Bloque IV · Sistemas y comunicaciones" },
};

function CaseCard({ entry, onStart, onRead, busy }: { entry: CaseEntry; onStart: () => void; onRead: () => void; busy: boolean }) {
  const { bank, section } = entry;
  const preview = section.statement ? truncate(stripMarkdown(section.statement), 300) : null;
  const block = section.block ? BLOCK_STYLE[section.block] : null;
  return (
    <article className="group flex h-full flex-col rounded-2xl border border-border bg-surface p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-pop">
      <div className="flex flex-wrap items-center gap-1.5">
        {block ? <Badge tone={block.tone}>{block.text}</Badge> : null}
        {bank.access ? <Badge tone="neutral">{ACCESS_LABEL[bank.access]}</Badge> : bank.kind === "practice" ? <Badge tone="neutral">Práctica</Badge> : null}
      </div>
      <h3 className="mt-3 text-[17px] font-semibold tracking-tight text-fg">
        {bankShortLabel(bank)} <span className="text-fg-subtle">·</span> {caseShortTitle(section.title)}
      </h3>
      <p className="mt-1 text-xs text-fg-subtle">
        {bank.exam_date ? `Examen del ${formatDate(bank.exam_date)}` : bank.title} · {formatInt(section.question_count)} preguntas
        {section.reserve_count ? ` + ${formatInt(section.reserve_count)} de reserva` : ""}
      </p>
      {preview ? (
        <p className="mt-3 line-clamp-4 text-[13.5px] leading-6 text-fg-muted">{preview}</p>
      ) : (
        <p className="mt-3 text-[13.5px] leading-6 text-fg-subtle">El enunciado se muestra al empezar.</p>
      )}
      <div className="mt-auto flex flex-wrap gap-2 pt-5">
        <Button variant="primary" size="sm" className="flex-1" loading={busy} leftIcon={<CirclePlay className="size-3.5" />} onClick={onStart}>
          Practicar el supuesto
        </Button>
        {section.statement ? (
          <Button size="sm" variant="ghost" leftIcon={<ScrollText className="size-3.5" />} onClick={onRead}>
            Leer enunciado
          </Button>
        ) : null}
      </div>
    </article>
  );
}

export default function CasesPage() {
  const catalog = useSession((s) => s.catalog);
  const profileId = useSession((s) => s.profile?.id ?? "");
  const [params, setParams] = useSearchParams();
  const bankFilter = params.get("banco");
  const { launch, busy, dialog } = useExamLauncher();
  const [block, setBlock] = useState<"all" | BlockId>("all");
  const [access, setAccess] = useState<"all" | "libre" | "promocion_interna">("all");
  const modeKey = `opotai:modo-supuestos:${profileId}`;
  const [mode, setModeState] = useState<ExamRunMode>(() => readStoredRunMode(modeKey, "learning"));
  const setMode = (next: ExamRunMode) => {
    setModeState(next);
    storeRunMode(modeKey, next);
  };
  const [reading, setReading] = useState<CaseEntry | null>(null);

  const all = useMemo<CaseEntry[]>(() => {
    const banks = [...(catalog?.banks ?? [])].sort(
      (a, b) =>
        Number(a.kind === "practice") - Number(b.kind === "practice") ||
        (b.year ?? 0) - (a.year ?? 0) ||
        (a.access ?? "").localeCompare(b.access ?? "") ||
        a.id.localeCompare(b.id),
    );
    return banks.flatMap((bank) => bank.sections.filter((s) => s.kind === "case").map((section) => ({ bank, section: section as CaseSection })));
  }, [catalog]);

  const filteredBank = bankFilter ? catalog?.banks.find((b) => b.id === bankFilter) : undefined;
  const entries = all.filter(
    (e) =>
      (!bankFilter || e.bank.id === bankFilter) &&
      (block === "all" || e.section.block === block) &&
      (access === "all" || e.bank.access === access || (e.bank.access === null && access === "libre")),
  );
  const start = (e: CaseEntry) =>
    void launch(withRunMode({ type: "case", bank_id: e.bank.id, section_id: e.section.id, feedback: RUN_MODE_FEEDBACK[mode], timed: mode === "real" }, mode));

  return (
    <div className="@container">
      <PageHeader
        title="Supuestos prácticos"
        description="La 2.ª parte del examen: un caso real con preguntas de desarrollo de sistemas (bloque III) o de sistemas y comunicaciones (bloque IV). Aquí lo practicas suelto; en los simulacros y exámenes oficiales eliges uno de los dos y puntúa junto al cuestionario."
      />

      <ExamModeChooser
        value={mode}
        onChange={setMode}
        durationMinutes={null}
        timerLabel="Cronómetro proporcional al del examen oficial"
        heading="¿Cómo quieres practicarlo?"
        className="mb-5"
      />

      <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-3 rounded-2xl border border-border bg-surface p-3 shadow-card">
        <Segmented
          label="Bloque"
          value={block}
          onChange={setBlock}
          options={[
            { value: "all", label: "Todos" },
            { value: "III", label: "Bloque III" },
            { value: "IV", label: "Bloque IV" },
          ]}
        />
        <Segmented
          label="Turno"
          value={access}
          onChange={setAccess}
          options={[
            { value: "all", label: "Ambos turnos" },
            { value: "libre", label: "Ingreso libre" },
            { value: "promocion_interna", label: "Promoción interna" },
          ]}
        />
        {filteredBank ? (
          <span className="inline-flex h-8 items-center gap-1 rounded-full border border-accent/30 bg-accent-soft pl-3 pr-1 text-[13px] font-medium text-accent-text">
            {bankShortLabel(filteredBank)}
            <button
              type="button"
              aria-label="Quitar el filtro de convocatoria"
              onClick={() => {
                params.delete("banco");
                setParams(params, { replace: true });
              }}
              className="grid size-6 place-items-center rounded-full hover:bg-accent/20"
            >
              <X className="size-3.5" />
            </button>
          </span>
        ) : null}
      </div>

      {entries.length === 0 ? (
        <EmptyState
          icon={<Briefcase />}
          title={all.length === 0 ? "Todavía no hay supuestos prácticos" : "Ningún supuesto con estos filtros"}
          description={all.length === 0 ? "Cuando el núcleo incluya exámenes con segunda parte aparecerán aquí." : "Prueba con otro bloque o turno."}
        />
      ) : (
        <>
          <p className="mb-3 text-xs text-fg-muted">
            {formatInt(entries.length)} {entries.length === 1 ? "supuesto" : "supuestos"}
          </p>
          <div className="grid gap-4 @3xl:grid-cols-2 @6xl:grid-cols-3">
            {entries.map((e, i) => (
              <motion.div
                key={`${e.bank.id}-${e.section.id}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i, 9) * 0.03, duration: 0.3 }}
              >
                <CaseCard entry={e} busy={busy} onStart={() => start(e)} onRead={() => setReading(e)} />
              </motion.div>
            ))}
          </div>
        </>
      )}

      <Dialog
        open={reading !== null}
        onClose={() => setReading(null)}
        size="xl"
        icon={<FileText />}
        eyebrow={reading ? bankShortLabel(reading.bank) : undefined}
        title={reading ? caseShortTitle(reading.section.title) : ""}
        description={reading ? `${formatInt(reading.section.question_count)} preguntas · ${reading.section.block ? BLOCK_STYLE[reading.section.block].text : "Supuesto práctico"}` : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setReading(null)}>
              Cerrar
            </Button>
            <Button
              variant="primary"
              loading={busy}
              leftIcon={<CirclePlay className="size-4" />}
              onClick={() => {
                if (!reading) return;
                const entry = reading;
                setReading(null);
                start(entry);
              }}
            >
              Practicar el supuesto
            </Button>
          </>
        }
      >
        {reading?.section.statement ? <Markdown className="text-[14.5px] text-fg-muted [&_strong]:text-fg">{reading.section.statement}</Markdown> : null}
      </Dialog>
      {dialog}
    </div>
  );
}
