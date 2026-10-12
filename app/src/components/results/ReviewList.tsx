// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
/**
 * Revisión pregunta a pregunta tras entregar: filtros (falladas por defecto, en
 * blanco, dudosas, correctas, todas), opciones con la corrección y caja «Por qué».
 */
import { useEffect, useMemo, useState } from "react";
import { CircleCheck, CircleMinus, CircleX, Flag, ListChecks, MinusCircle, ScrollText } from "lucide-react";
import type { ItemStatus, Media, ReviewItem, Temario } from "@/api/types";
import { cn } from "@/lib/cn";
import { formatInt, ordinalFem } from "@/lib/format";
import { caseShortTitle, shortTitle, topicTitle } from "@/lib/labels";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/controls";
import { EmptyState } from "@/components/ui/display";
import { Markdown } from "@/components/ui/Markdown";
import { ZoomableImage } from "@/components/ui/ImageLightbox";
import { Collapsible, Tooltip } from "@/components/ui/overlays";
import { Explanation } from "@/components/exam/Explanation";
import { OptionList } from "@/components/exam/OptionList";

export type ReviewFilter = "wrong" | "blank" | "flagged" | "correct" | "all";

export function matchesFilter(item: ReviewItem, filter: ReviewFilter): boolean {
  switch (filter) {
    case "wrong":
      return item.status === "wrong";
    case "blank":
      return item.status === "blank";
    case "flagged":
      return item.flagged;
    case "correct":
      return item.status === "correct";
    default:
      return true;
  }
}

/** Filtro inicial: las falladas; si no hay ninguna, todas. */
export function defaultFilter(items: ReviewItem[]): ReviewFilter {
  return items.some((i) => i.status === "wrong") ? "wrong" : "all";
}

const STATUS: Record<ItemStatus, { label: string; tone: BadgeTone; icon: typeof CircleCheck }> = {
  correct: { label: "Correcta", tone: "success", icon: CircleCheck },
  wrong: { label: "Fallada", tone: "danger", icon: CircleX },
  blank: { label: "En blanco", tone: "neutral", icon: CircleMinus },
  annulled: { label: "Anulada", tone: "warning", icon: MinusCircle },
  not_counted: { label: "No computa", tone: "neutral", icon: MinusCircle },
};

const BLOCK_TONE: Record<string, BadgeTone> = { I: "info", II: "success", III: "accent", IV: "warning" };

export interface CaseStatement {
  title: string;
  statement: string;
  media: Media[];
}

function ReviewCard({ item, temario, statement }: { item: ReviewItem; temario: Temario | null; statement?: CaseStatement }) {
  const status = STATUS[item.status];
  const Icon = status.icon;
  const fullTopic = topicTitle(temario, item.topic);
  const media = item.media.filter((m) => m.data_url && !item.text.includes(m.data_url));
  return (
    <article aria-labelledby={`rv-${item.question_id}`} className="rounded-2xl border border-border bg-surface shadow-card">
      <header className="flex flex-wrap items-start gap-3 border-b border-border px-5 py-3.5">
        <span
          className={cn(
            "mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg [&_svg]:size-4",
            item.status === "correct" && "bg-success-soft text-success-text",
            item.status === "wrong" && "bg-danger-soft text-danger-text",
            (item.status === "blank" || item.status === "not_counted") && "bg-surface-3 text-fg-muted",
            item.status === "annulled" && "bg-warning-soft text-warning-text",
          )}
          aria-hidden
        >
          <Icon />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 id={`rv-${item.question_id}`} className="text-[14.5px] font-semibold text-fg">
              {item.is_reserve ? `Reserva ${item.display_number}` : `Pregunta ${item.display_number}`}
              <span className="font-normal text-fg-subtle"> · {ordinalFem(item.part)} parte</span>
            </h3>
            <Badge tone={status.tone}>{status.label}</Badge>
            {item.flagged ? (
              <Badge tone="warning" icon={<Flag className="fill-current" />}>
                Dudosa
              </Badge>
            ) : null}
            {item.block ? <Badge tone={BLOCK_TONE[item.block] ?? "neutral"}>Bloque {item.block}</Badge> : null}
            {item.topic ? (
              <Tooltip content={fullTopic ?? item.topic} className="min-w-0 max-w-[340px]">
                <Badge tone="neutral" className="max-w-full">
                  {item.topic}
                  {fullTopic ? ` · ${shortTitle(fullTopic, 40)}` : ""}
                </Badge>
              </Tooltip>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-fg-subtle">{item.source_label}</p>
        </div>
      </header>
      <div className="px-5 py-4">
        {statement ? (
          <Collapsible className="mb-4" title={`Enunciado · ${statement.title}`} icon={<ScrollText className="text-fg-subtle" />}>
            <Markdown className="text-[14px] text-fg-muted [&_strong]:text-fg">{statement.statement}</Markdown>
            {statement.media
              .filter((m) => m.data_url && !statement.statement.includes(m.data_url))
              .map((m) => (m.data_url ? <ZoomableImage key={m.path} src={m.data_url} alt={m.alt} /> : null))}
          </Collapsible>
        ) : null}
        <Markdown className="text-[15.5px] leading-[1.65] text-fg">{item.text}</Markdown>
        {media.map((m) => (m.data_url ? <ZoomableImage key={m.path} src={m.data_url} alt={m.alt} className="mt-2" /> : null))}
        <div className="mt-4">
          <OptionList
            questionId={`rv-${item.question_id}`}
            options={item.options}
            choice={item.chosen}
            onSelect={() => undefined}
            reveal={{ correct: item.correct, chosen: item.chosen, annulled: item.status === "annulled" }}
          />
        </div>
        <Explanation
          className="mt-4"
          tone="neutral"
          chosen={item.chosen}
          correct={item.correct}
          annulled={item.status === "annulled"}
          explanation={item.explanation}
          optionNotes={item.option_notes}
          references={item.references}
          outdated={item.outdated}
          outdatedNote={item.outdated_note}
        />
      </div>
    </article>
  );
}

const PAGE = 12;

interface ReviewListProps {
  items: ReviewItem[];
  temario: Temario | null;
  /** Enunciados de los supuestos (si se conocen) por id de sección. */
  statements?: Record<string, CaseStatement>;
  /** Nombre de cada parte («Cuestionario», «Supuesto práctico») por número de parte. */
  partNames?: Record<number, string>;
}

function defaultPartName(part: number): string {
  return part === 1 ? "Cuestionario" : part === 2 ? "Supuesto práctico" : "";
}

/** Separador de parte en la revisión: nombre, recuento y, en el supuesto, cuál se eligió. */
function PartDivider({ part, name, items, caseTitle }: { part: number; name: string; items: ReviewItem[]; caseTitle?: string | null }) {
  const correct = items.filter((i) => i.status === "correct").length;
  const wrong = items.filter((i) => i.status === "wrong").length;
  const blank = items.filter((i) => i.status === "blank").length;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border border-border bg-surface-2/60 px-4 py-3">
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent text-[13px] font-bold text-accent-fg" aria-hidden>
        {part}
      </span>
      <h3 className="text-[15px] font-semibold tracking-tight text-fg">
        {ordinalFem(part)} parte{name ? ` · ${name}` : ""}
        {caseTitle ? <span className="font-normal text-fg-muted"> · {caseTitle}</span> : null}
      </h3>
      <p className="ml-auto text-xs tabular-nums text-fg-muted">
        <span className="font-semibold text-success-text">{formatInt(correct)}</span> aciertos ·{" "}
        <span className="font-semibold text-danger-text">{formatInt(wrong)}</span> errores · {formatInt(blank)} en blanco
      </p>
    </div>
  );
}

export function ReviewList({ items, temario, statements, partNames }: ReviewListProps) {
  const nameOf = (part: number) => partNames?.[part] ?? defaultPartName(part);
  const [filter, setFilter] = useState<ReviewFilter>(() => defaultFilter(items));
  const parts = useMemo(() => [...new Set(items.map((i) => i.part))].sort((a, b) => a - b), [items]);
  const [part, setPart] = useState<string>("all");
  const [visible, setVisible] = useState(PAGE);

  const inPart = useMemo(() => (part === "all" ? items : items.filter((i) => String(i.part) === part)), [items, part]);
  const counts = useMemo(
    () => ({
      wrong: inPart.filter((i) => matchesFilter(i, "wrong")).length,
      blank: inPart.filter((i) => matchesFilter(i, "blank")).length,
      flagged: inPart.filter((i) => matchesFilter(i, "flagged")).length,
      correct: inPart.filter((i) => matchesFilter(i, "correct")).length,
      all: inPart.length,
    }),
    [inPart],
  );
  // Orden estable por partes: 1.ª parte · Cuestionario y después 2.ª parte · Supuesto práctico.
  const shown = useMemo(() => inPart.filter((i) => matchesFilter(i, filter)).sort((a, b) => a.part - b.part), [inPart, filter]);

  useEffect(() => setVisible(PAGE), [filter, part]);

  const empty: Record<ReviewFilter, string> = {
    wrong: "No has fallado ninguna pregunta. ¡Enhorabuena!",
    blank: "No has dejado ninguna pregunta en blanco.",
    flagged: "No marcaste ninguna pregunta como dudosa.",
    correct: "Ninguna respuesta correcta en esta selección.",
    all: "No hay preguntas que revisar.",
  };

  return (
    <section aria-labelledby="revision" className="@container">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="revision" className="flex items-center gap-2 text-lg font-semibold tracking-tight text-fg">
            <ListChecks className="size-5 text-accent-text" aria-hidden />
            Revisión de preguntas
          </h2>
          <p className="mt-0.5 text-[13px] text-fg-muted">
            Cada pregunta con la respuesta correcta y la explicación{parts.length > 1 ? ", separadas por partes del examen" : ""}.
          </p>
        </div>
        {parts.length > 1 ? (
          <Segmented
            size="sm"
            label="Parte"
            value={part}
            onChange={setPart}
            options={[
              { value: "all", label: "Las dos partes" },
              ...parts.map((p) => ({ value: String(p), label: `${ordinalFem(p)} parte${nameOf(p) ? ` · ${nameOf(p)}` : ""}` })),
            ]}
          />
        ) : null}
      </div>
      <div className="mb-5 overflow-x-auto pb-1">
        <Segmented
          label="Filtrar preguntas"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "wrong", label: `Falladas · ${formatInt(counts.wrong)}`, icon: <CircleX /> },
            { value: "blank", label: `En blanco · ${formatInt(counts.blank)}`, icon: <CircleMinus /> },
            { value: "flagged", label: `Dudosas · ${formatInt(counts.flagged)}`, icon: <Flag /> },
            { value: "correct", label: `Correctas · ${formatInt(counts.correct)}`, icon: <CircleCheck /> },
            { value: "all", label: `Todas · ${formatInt(counts.all)}` },
          ]}
        />
      </div>

      {shown.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-strong">
          <EmptyState compact icon={<ListChecks />} title={empty[filter]} />
        </div>
      ) : (
        <div className="space-y-4">
          {shown.slice(0, visible).map((item, i, arr) => {
            const newPart = parts.length > 1 && (i === 0 || arr[i - 1]?.part !== item.part);
            const partItems = newPart ? items.filter((x) => x.part === item.part) : [];
            const caseTitle = newPart ? (statements?.[item.section_id]?.title ?? null) : null;
            return (
              <div key={`${item.section_id}-${item.question_id}`} className={cn(newPart && i > 0 && "pt-4")}>
                {newPart ? (
                  <div className="mb-4">
                    <PartDivider part={item.part} name={nameOf(item.part)} items={partItems} caseTitle={caseTitle ? caseShortTitle(caseTitle) : null} />
                  </div>
                ) : null}
                <ReviewCard item={item} temario={temario} statement={statements?.[item.section_id]} />
              </div>
            );
          })}
          {shown.length > visible ? (
            <div className="flex justify-center pt-2">
              <Button onClick={() => setVisible((v) => v + PAGE)}>
                Mostrar {formatInt(Math.min(PAGE, shown.length - visible))} más · quedan {formatInt(shown.length - visible)}
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
