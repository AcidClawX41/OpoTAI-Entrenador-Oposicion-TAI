// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
/** 2.ª parte: tarjetas de supuestos, enunciado y vista dividida redimensionable. */
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { BookOpenText, CircleCheck, GripVertical, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import type { ExamPaper, PaperSection } from "@/api/types";
import { cn } from "@/lib/cn";
import { formatInt } from "@/lib/format";
import { stripMarkdown, truncate } from "@/lib/text";
import type { ExamState } from "@/lib/exam/model";
import { caseSections } from "@/lib/exam/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Markdown } from "@/components/ui/Markdown";
import { ZoomableImage } from "@/components/ui/ImageLightbox";

function answeredIn(state: ExamState, section: PaperSection): number {
  return section.questions.filter((q) => !q.is_reserve && (state.answers[q.id]?.choice ?? null) !== null).length;
}

/** Tarjetas para ver y elegir supuesto (solo cuando hay que elegir uno). */
export function CaseStrip({
  paper,
  state,
  onView,
  onChoose,
}: {
  paper: ExamPaper;
  state: ExamState;
  onView: (id: string) => void;
  onChoose: (id: string) => void;
}) {
  const cases = caseSections(paper);
  return (
    <div className="border-b border-border bg-panel/60 px-5 py-3">
      <div className="flex flex-wrap items-stretch gap-3">
        {cases.map((s, i) => {
          const viewing = state.viewedCase === s.id;
          const chosen = state.chosenCase === s.id;
          const n = answeredIn(state, s);
          const total = s.questions.filter((q) => !q.is_reserve).length;
          return (
            <div
              key={s.id}
              className={cn(
                "flex min-w-[260px] flex-1 items-center gap-3 rounded-xl border px-3.5 py-2.5 transition-colors",
                viewing ? "border-accent bg-accent-soft" : "border-border bg-surface hover:border-border-strong",
              )}
            >
              <button type="button" onClick={() => onView(s.id)} className="min-w-0 flex-1 text-left" aria-pressed={viewing}>
                <span className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold text-fg">Supuesto {i + 1}</span>
                  {s.block ? <Badge tone={s.block === "III" ? "accent" : "info"}>Bloque {s.block}</Badge> : null}
                  {chosen ? (
                    <Badge tone="success" icon={<CircleCheck />}>
                      Elegido
                    </Badge>
                  ) : null}
                </span>
                <span className="mt-0.5 block truncate text-xs text-fg-muted">
                  {s.title.replace(/^Supuesto\s+\S+\s*·\s*/i, "")} · {formatInt(n)}/{formatInt(total)} respondidas
                </span>
              </button>
              {!chosen ? (
                <Button size="xs" variant={viewing ? "primary" : "secondary"} onClick={() => onChoose(s.id)}>
                  Elegir
                </Button>
              ) : null}
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[11.5px] text-fg-subtle">
        Solo se corrige el supuesto elegido. Si respondes sin haber elegido, se elige automáticamente.
      </p>
    </div>
  );
}

/**
 * Pantalla de elección del supuesto (2.ª parte con supuestos a elegir y ninguno elegido todavía):
 * los dos supuestos en grande, con un extracto del enunciado, para leer o elegir.
 */
export function CaseChoice({
  paper,
  onPreview,
  onChoose,
}: {
  paper: ExamPaper;
  onPreview: (id: string) => void;
  onChoose: (id: string) => void;
}) {
  const cases = caseSections(paper);
  const part = cases[0]?.part ?? 2;
  // 2015/2016: la 1.ª parte tenía un bloque a elegir (III o IV) y las bases exigían hacer el
  // supuesto de ese mismo bloque. Si el examen lleva ese bloque, se avisa (no se impide).
  const theoryBlock = paper.sections.find((x) => x.kind === "theory" && (x.block === "III" || x.block === "IV"))?.block ?? null;
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-5xl px-6 py-8">
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-accent-text">Parte {part} · Supuesto práctico</p>
        <h2 className="mt-1.5 text-[24px] font-semibold tracking-tight text-fg">Elige uno de los {cases.length} supuestos</h2>
        <p className="mt-2 max-w-3xl text-[14.5px] leading-6 text-fg-muted">
          Es la segunda parte de este mismo examen: solo se corrige el supuesto que elijas y su puntuación cuenta junto a la del cuestionario. Puedes leer
          los enunciados antes de decidir; las respuestas del supuesto que no elijas no puntúan.
        </p>
        {theoryBlock ? (
          <p className="mt-3 max-w-3xl rounded-xl border border-warning/30 bg-warning-soft px-4 py-2.5 text-[13.5px] leading-6 text-fg">
            En esta convocatoria las bases exigían hacer el supuesto del <strong className="font-semibold">mismo bloque</strong> que elegiste en la
            1.ª parte: el <strong className="font-semibold">bloque {theoryBlock}</strong>. Puedes elegir el otro para practicar, pero no sería válido
            en el examen real.
          </p>
        ) : null}
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {cases.map((s, i) => {
            const total = s.questions.filter((q) => !q.is_reserve).length;
            const preview = s.statement ? truncate(stripMarkdown(s.statement), 420) : null;
            return (
              <article key={s.id} className="flex flex-col rounded-2xl border border-border bg-surface p-5 shadow-card" aria-labelledby={`supuesto-${s.id}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="grid size-7 place-items-center rounded-full bg-accent text-[13px] font-bold text-accent-fg" aria-hidden>
                    {i + 1}
                  </span>
                  <h3 id={`supuesto-${s.id}`} className="text-[16px] font-semibold tracking-tight text-fg">
                    Supuesto {i + 1}
                  </h3>
                  {s.block ? <Badge tone={s.block === "III" ? "accent" : "info"}>Bloque {s.block}</Badge> : null}
                  {theoryBlock && s.block === theoryBlock ? <Badge tone="success">Tu bloque</Badge> : null}
                  <span className="ml-auto text-xs font-medium tabular-nums text-fg-muted">{formatInt(total)} preguntas</span>
                </div>
                <p className="mt-2 text-[13.5px] font-medium leading-5 text-fg">{s.title.replace(/^Supuesto\s+\S+\s*·\s*/i, "")}</p>
                {preview ? <p className="mt-2.5 line-clamp-6 text-[13.5px] leading-6 text-fg-muted">{preview}</p> : null}
                <div className="mt-auto flex flex-wrap gap-2 pt-5">
                  <Button variant="primary" className="flex-1" leftIcon={<CircleCheck className="size-4" />} onClick={() => onChoose(s.id)}>
                    Elegir este supuesto
                  </Button>
                  <Button variant="secondary" leftIcon={<BookOpenText className="size-4" />} onClick={() => onPreview(s.id)}>
                    Leer enunciado y preguntas
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Enunciado del supuesto con sus imágenes. */
export function StatementPanel({ section, onCollapse }: { section: PaperSection; onCollapse?: () => void }) {
  const inline = section.statement ?? "";
  const media = section.media.filter((m) => m.data_url && !inline.includes(m.data_url));
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-border px-5 py-3">
        <p className="flex items-center gap-2 text-[13px] font-semibold text-fg">
          <BookOpenText className="size-4 text-accent-text" aria-hidden /> Enunciado del supuesto
        </p>
        {onCollapse ? (
          <button
            type="button"
            onClick={onCollapse}
            aria-label="Ocultar el enunciado"
            className="grid size-8 place-items-center rounded-lg text-fg-subtle hover:bg-surface-2 hover:text-fg"
          >
            <PanelLeftClose className="size-4" />
          </button>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        <h2 className="text-[17px] font-semibold leading-snug tracking-tight text-fg">{section.title}</h2>
        {section.statement ? (
          <Markdown className="mt-3 text-[14.5px] text-fg-muted [&_strong]:text-fg">{section.statement}</Markdown>
        ) : (
          <p className="mt-3 text-sm text-fg-muted">Este supuesto no tiene enunciado común.</p>
        )}
        {media.map((m) =>
          m.data_url ? <ZoomableImage key={m.path} src={m.data_url} alt={m.alt} className="mt-3" /> : null,
        )}
      </div>
    </div>
  );
}

/** ¿El enunciado del supuesto tiene figuras (en línea o como adjuntos)? */
export function sectionHasFigures(section: PaperSection): boolean {
  return section.media.length > 0 || /!\[[^\]]*\]\(/.test(section.statement ?? "");
}

/**
 * Vista dividida con separador arrastrable (ratón y teclado) y panel izquierdo plegable.
 * Con `wide` (enunciado con figuras) el panel empieza más ancho para que se lean sin ampliar;
 * si la persona ya ha movido el separador, se respeta su elección.
 */
export function SplitView({
  left,
  right,
  collapsed,
  onExpand,
  wide = false,
}: {
  left: ReactNode;
  right: ReactNode;
  collapsed: boolean;
  onExpand: () => void;
  wide?: boolean;
}) {
  const defaultRatio = wide ? 0.54 : 0.44;
  const [ratio, setRatioState] = useState(defaultRatio);
  const userMoved = useRef(false);
  const container = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  useEffect(() => {
    if (!userMoved.current) setRatioState(defaultRatio);
  }, [defaultRatio]);

  const setRatio = (next: number | ((r: number) => number)) => {
    userMoved.current = true;
    setRatioState(next);
  };
  const setFromX = (clientX: number) => {
    const rect = container.current?.getBoundingClientRect();
    if (!rect) return;
    setRatio(Math.min(0.64, Math.max(0.26, (clientX - rect.left) / rect.width)));
  };
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (dragging.current) setFromX(e.clientX);
  };
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    dragging.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowLeft") setRatio((r) => Math.max(0.26, r - 0.03));
    else if (e.key === "ArrowRight") setRatio((r) => Math.min(0.64, r + 0.03));
    else return;
    e.preventDefault();
    e.stopPropagation();
  };

  if (collapsed) {
    return (
      <div className="flex h-full min-h-0">
        <button
          type="button"
          onClick={onExpand}
          className="flex w-11 shrink-0 flex-col items-center gap-3 border-r border-border bg-panel/60 py-4 text-fg-muted hover:text-fg"
          aria-label="Mostrar el enunciado"
        >
          <PanelLeftOpen className="size-4" />
          <span className="text-xs font-medium [writing-mode:vertical-rl] rotate-180">Enunciado</span>
        </button>
        <div className="min-w-0 flex-1">{right}</div>
      </div>
    );
  }

  return (
    <div ref={container} className="flex h-full min-h-0">
      <div className="min-w-0 border-r border-border bg-panel/40" style={{ width: `${ratio * 100}%` }}>
        {left}
      </div>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Redimensionar el enunciado"
        aria-valuemin={26}
        aria-valuemax={64}
        aria-valuenow={Math.round(ratio * 100)}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onKeyDown={onKeyDown}
        className="group relative -ml-1.5 w-3 shrink-0 cursor-col-resize touch-none"
      >
        <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-transparent transition-colors group-hover:bg-accent group-focus-visible:bg-accent" />
        <span className="absolute left-1/2 top-1/2 grid h-8 w-4 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-md border border-border bg-surface text-fg-subtle shadow-card">
          <GripVertical className="size-3" />
        </span>
      </div>
      <div className="min-w-0 flex-1">{right}</div>
    </div>
  );
}
