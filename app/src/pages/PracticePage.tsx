// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { BookOpen, ChevronDown, CirclePlay, Layers, ListFilter, Search, Shuffle, SlidersHorizontal, X } from "lucide-react";
import { api } from "@/api/client";
import type { Access, Block, BlockStat, FeedbackMode, QuestionSource, Temario, TheorySummary } from "@/api/types";
import { cn } from "@/lib/cn";
import { formatInt, formatPercent } from "@/lib/format";
import { ACCESS_LABEL, shortTitle } from "@/lib/labels";
import { blockState, parseSelectionParams, selectionLabel, selectionToFilters, toggleBlock, toggleTopic } from "@/lib/practiceSelection";
import { practiceSpec } from "@/lib/specs";
import { normalizeSearch } from "@/lib/text";
import { useApi } from "@/hooks/useApi";
import { useExamLauncher } from "@/hooks/useExamLauncher";
import { useSession } from "@/store/session";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Checkbox, Field, Segmented, Slider, Switch, TextInput } from "@/components/ui/controls";
import { EmptyState, PageHeader } from "@/components/ui/display";
import { Progress } from "@/components/ui/misc";
import { Tooltip } from "@/components/ui/overlays";
import { FeedbackChooser } from "@/components/exam/FeedbackChooser";

const BLOCK_TONE = { I: "info", II: "success", III: "accent", IV: "warning" } as const;

function AccuracyChip({ stat }: { stat: BlockStat | undefined }) {
  if (!stat || stat.total === 0) return <span className="w-28 shrink-0 text-right text-[11px] text-fg-subtle">sin responder</span>;
  const tone = stat.accuracy >= 0.6 ? "success" : stat.accuracy >= 0.4 ? "warning" : "danger";
  return (
    <Tooltip content={`${formatInt(stat.correct)} aciertos de ${formatInt(stat.total)} respuestas`} className="shrink-0">
      <span className="flex w-28 items-center justify-end gap-2" tabIndex={0}>
        <Progress value={stat.accuracy} tone={tone} size="xs" className="w-12" label={`Acierto ${formatPercent(stat.accuracy)}`} />
        <span className="w-9 text-right text-xs font-semibold tabular-nums text-fg">{formatPercent(stat.accuracy)}</span>
      </span>
    </Tooltip>
  );
}

interface BlockSectionProps {
  block: Block;
  selection: Set<string>;
  onSelection: (next: Set<string>) => void;
  query: string;
  topicStats: Map<string, BlockStat>;
  blockStat: BlockStat | undefined;
  theory: Map<string, TheorySummary>;
}

function BlockSection({ block, selection, onSelection, query, topicStats, blockStat, theory }: BlockSectionProps) {
  const [open, setOpen] = useState(true);
  const state = blockState(block, selection);
  const q = normalizeSearch(query);
  const topics = q
    ? block.topics.filter((t) => normalizeSearch(`${t.id} ${t.title} ${t.keywords.join(" ")}`).includes(q))
    : block.topics;
  if (q && topics.length === 0) return null;
  const selected = block.topics.filter((t) => selection.has(t.id)).length;
  const expanded = open || Boolean(q);
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-3 border-b border-border bg-surface-2/40 px-4 py-3">
        <Checkbox
          checked={state}
          onChange={(on) => onSelection(toggleBlock(block, selection, on))}
          className="min-w-0 flex-1"
          label={
            <span className="flex min-w-0 items-center gap-2.5">
              <Badge tone={BLOCK_TONE[block.id]} className="font-semibold">
                Bloque {block.id}
              </Badge>
              <span className="truncate text-sm font-semibold text-fg">{block.title}</span>
            </span>
          }
        />
        <span className="hidden text-xs tabular-nums text-fg-muted @2xl:inline">
          {selected > 0 ? `${formatInt(selected)} de ${formatInt(block.topics.length)}` : `${formatInt(block.topics.length)} temas`}
        </span>
        <AccuracyChip stat={blockStat} />
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={expanded}
          aria-label={expanded ? `Plegar el bloque ${block.id}` : `Desplegar el bloque ${block.id}`}
          className="grid size-7 place-items-center rounded-lg text-fg-subtle transition-colors hover:bg-surface-3 hover:text-fg"
        >
          <ChevronDown className={cn("size-4 transition-transform", expanded && "rotate-180")} />
        </button>
      </div>
      {expanded ? (
        <ul className="divide-y divide-border">
          {topics.map((t) => {
            const th = theory.get(t.id);
            return (
              <li key={t.id} className={cn("flex items-center gap-3 px-4 py-2.5 transition-colors", selection.has(t.id) && "bg-accent-soft/40")}>
                <Checkbox
                  checked={selection.has(t.id)}
                  onChange={() => onSelection(toggleTopic(t.id, selection))}
                  className="min-w-0 flex-1"
                  label={
                    <Tooltip content={t.title} className="flex min-w-0 max-w-full" side="top" delay={500}>
                      <span className="flex min-w-0 items-baseline gap-2.5">
                        <span className="w-10 shrink-0 text-[13px] font-semibold tabular-nums text-fg">{t.id}</span>
                        <span className="truncate text-[13px] text-fg-muted">{shortTitle(t.title, 110)}</span>
                      </span>
                    </Tooltip>
                  }
                />
                {th ? (
                  <Tooltip content="Leer la teoría del tema">
                    <Link
                      to={`/teoria/${encodeURIComponent(t.id)}`}
                      aria-label={`Teoría del tema ${t.id}`}
                      className="grid size-7 shrink-0 place-items-center rounded-lg text-fg-subtle transition-colors hover:bg-surface-3 hover:text-accent-text"
                    >
                      <BookOpen className="size-3.5" />
                    </Link>
                  </Tooltip>
                ) : (
                  <span className="size-7 shrink-0" aria-hidden />
                )}
                <AccuracyChip stat={topicStats.get(t.id)} />
              </li>
            );
          })}
        </ul>
      ) : null}
    </Card>
  );
}

function SelectedChips({ temario, selection, onSelection }: { temario: Temario; selection: Set<string>; onSelection: (s: Set<string>) => void }) {
  const { blocks, topics } = selectionToFilters(temario, selection);
  if (blocks.length === 0 && topics.length === 0) return <p className="text-[13px] text-fg-muted">Preguntas de todo el temario.</p>;
  const chips = [
    ...blocks.map((b) => ({ id: `b-${b}`, label: `Bloque ${b}`, remove: () => onSelection(toggleBlock(temario.blocks.find((x) => x.id === b)!, selection, false)) })),
    ...topics.map((t) => ({ id: `t-${t}`, label: t, remove: () => onSelection(toggleTopic(t, selection)) })),
  ];
  const visible = chips.slice(0, 10);
  return (
    <div className="flex flex-wrap gap-1.5">
      {visible.map((c) => (
        <span key={c.id} className="inline-flex h-7 items-center gap-1 rounded-full border border-accent/30 bg-accent-soft pl-2.5 pr-1 text-xs font-medium text-accent-text">
          {c.label}
          <button type="button" onClick={c.remove} aria-label={`Quitar ${c.label}`} className="grid size-5 place-items-center rounded-full hover:bg-accent/20">
            <X className="size-3" />
          </button>
        </span>
      ))}
      {chips.length > visible.length ? <span className="inline-flex h-7 items-center px-1 text-xs text-fg-muted">+{chips.length - visible.length}</span> : null}
    </div>
  );
}

export default function PracticePage() {
  const catalog = useSession((s) => s.catalog);
  const settings = useSession((s) => s.settings);
  const profile = useSession((s) => s.profile)!;
  const [params] = useSearchParams();
  const temario = catalog?.temario ?? null;
  const { launch, busy, dialog } = useExamLauncher();
  const stats = useApi(() => api.getStats(profile.id), [profile.id]);
  const theoryIndex = useApi(() => api.getTheoryIndex(), []);

  const [selection, setSelection] = useState<Set<string>>(() => parseSelectionParams(temario, params));
  const [query, setQuery] = useState("");
  const [count, setCount] = useState(20);
  const [source, setSource] = useState<QuestionSource>("all");
  const [banks, setBanks] = useState<"all" | "official" | "practice">(() => (params.get("bancos") === "oficiales" ? "official" : "all"));
  const [access, setAccess] = useState<"all" | Access>("all");
  const [includeCases, setIncludeCases] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackMode | null>(null);
  const [timed, setTimed] = useState(false);
  const [minutes, setMinutes] = useState<number | null>(null);

  // Si cambian los parámetros de la URL (p. ej. desde la teoría), se aplica la nueva preselección.
  const paramKey = params.toString();
  useEffect(() => {
    if (paramKey) setSelection(parseSelectionParams(temario, new URLSearchParams(paramKey)));
  }, [paramKey, temario]);

  const topicStats = useMemo(() => new Map((stats.data?.by_topic ?? []).map((s) => [s.topic ?? s.key, s])), [stats.data]);
  const blockStats = useMemo(() => new Map((stats.data?.by_block ?? []).map((s) => [s.block ?? s.key, s])), [stats.data]);
  const theory = useMemo(() => new Map((theoryIndex.data ?? []).map((t) => [t.topic, t])), [theoryIndex.data]);

  const officialIds = (catalog?.banks ?? []).filter((b) => b.kind === "official").map((b) => b.id);
  const practiceIds = (catalog?.banks ?? []).filter((b) => b.kind === "practice").map((b) => b.id);
  const hasBothAccesses = new Set((catalog?.banks ?? []).map((b) => b.access).filter(Boolean)).size > 1;
  /** Bancos según el tipo (oficiales/práctica) y la convocatoria (libre/interna); vacío = todos. */
  const bankIdsFor = (kind: "all" | "official" | "practice", acc: "all" | Access): string[] => {
    if (kind === "all" && acc === "all") return [];
    return (catalog?.banks ?? [])
      .filter((b) => kind === "all" || b.kind === kind)
      .filter((b) => acc === "all" || b.access === acc)
      .map((b) => b.id);
  };
  const fb = feedback ?? settings?.default_feedback ?? "immediate";
  const suggested = Math.max(5, Math.round((count * 1.25) / 5) * 5);
  const duration = minutes ?? suggested;

  if (!temario) {
    return (
      <>
        <PageHeader title="Practicar por temas" />
        <EmptyState icon={<Layers />} title="El temario no está disponible" description="Faltan los datos del temario en el núcleo." />
      </>
    );
  }

  const start = () => {
    const { blocks, topics } = selectionToFilters(temario, selection);
    void launch(
      practiceSpec({
        blocks,
        topics,
        bankIds: bankIdsFor(banks, access),
        count,
        feedback: fb,
        source,
        includeCases,
        durationMinutes: timed ? duration : null,
      }),
    );
  };

  /** Práctica libre: preguntas al azar de todo el temario y de todas las convocatorias elegidas. */
  const startFree = () =>
    void launch(
      practiceSpec({
        blocks: [],
        topics: [],
        bankIds: bankIdsFor("all", access),
        count,
        feedback: "immediate",
        source: "all",
        includeCases: false,
        durationMinutes: null,
      }),
    );

  const totalTopics = temario.blocks.reduce((n, b) => n + b.topics.length, 0);

  return (
    <div className="@container">
      <PageHeader
        title="Practicar por temas"
        description="Elige bloques o temas concretos del temario oficial y crea un test a tu medida, o practica de forma libre con preguntas al azar de ingreso libre y promoción interna."
        actions={
          <Button variant="soft" leftIcon={<Shuffle className="size-4" />} loading={busy} onClick={startFree}>
            Práctica libre al azar · {formatInt(count)} preguntas
          </Button>
        }
      />
      <div className="grid items-start gap-5 @5xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-60 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
              <TextInput
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar un tema: «LOPDGDD», «IV.7», «redes»…"
                aria-label="Buscar temas"
                className="pl-9"
              />
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelection(new Set(temario.blocks.flatMap((b) => b.topics.map((t) => t.id))))}
              disabled={selection.size === totalTopics}
            >
              Seleccionar todo
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelection(new Set())} disabled={selection.size === 0}>
              Ninguno
            </Button>
          </div>
          <div className="@container space-y-4">
            {temario.blocks.map((b) => (
              <BlockSection
                key={b.id}
                block={b}
                selection={selection}
                onSelection={setSelection}
                query={query}
                topicStats={topicStats}
                blockStat={blockStats.get(b.id)}
                theory={theory}
              />
            ))}
          </div>
          <p className="text-xs text-fg-subtle">
            {temario.source_title} ·{" "}
            <span className="tabular-nums">
              {formatInt(temario.blocks.length)} bloques, {formatInt(totalTopics)} temas
            </span>
          </p>
        </div>

        <Card className="@5xl:sticky @5xl:top-6">
          <CardHeader title="Tu test" description={selectionLabel(temario, selection)} icon={<SlidersHorizontal />} />
          <div className="space-y-5 p-5">
            <SelectedChips temario={temario} selection={selection} onSelection={setSelection} />

            <div>
              <div className="mb-2 flex items-baseline justify-between">
                <span className="text-[13px] font-medium text-fg">Número de preguntas</span>
                <span className="text-sm font-semibold tabular-nums text-fg">{formatInt(count)}</span>
              </div>
              <Slider label="Número de preguntas" min={5} max={100} step={5} value={count} onChange={setCount} valueText={`${count} preguntas`} />
            </div>

            <Field label="Qué preguntas">
              <Segmented
                label="Qué preguntas"
                fullWidth
                size="sm"
                value={source}
                onChange={setSource}
                options={[
                  { value: "all", label: "Todas" },
                  { value: "unseen", label: "No vistas" },
                  { value: "failed", label: "Falladas" },
                  { value: "flagged", label: "Dudosas" },
                ]}
              />
            </Field>

            {officialIds.length > 0 && practiceIds.length > 0 ? (
              <Field label="De qué bancos">
                <Segmented
                  label="De qué bancos"
                  fullWidth
                  size="sm"
                  value={banks}
                  onChange={setBanks}
                  options={[
                    { value: "all", label: "Todos" },
                    { value: "official", label: "Oficiales" },
                    { value: "practice", label: "Práctica" },
                  ]}
                />
              </Field>
            ) : null}

            {hasBothAccesses ? (
              <Field label="De qué convocatorias">
                <Segmented
                  label="De qué convocatorias"
                  fullWidth
                  size="sm"
                  value={access}
                  onChange={setAccess}
                  options={[
                    { value: "all", label: "Todas" },
                    { value: "libre", label: ACCESS_LABEL.libre },
                    { value: "promocion_interna", label: ACCESS_LABEL.promocion_interna },
                  ]}
                />
              </Field>
            ) : null}

            <Switch
              checked={includeCases}
              onChange={setIncludeCases}
              label="Incluir preguntas de supuestos"
              description="Preguntas de la segunda parte (bloques III y IV) sin su enunciado completo"
            />

            <FeedbackChooser value={fb} onChange={setFeedback} context="practice" />

            <div className="space-y-3">
              <Switch checked={timed} onChange={setTimed} label="Con tiempo" description={timed ? `${formatInt(duration)} min · sin pausa` : "Sin límite de tiempo"} />
              {timed ? (
                <Slider label="Minutos" min={5} max={120} step={5} value={duration} onChange={setMinutes} valueText={`${duration} minutos`} />
              ) : null}
            </div>

            <Button variant="primary" size="lg" className="w-full" loading={busy} leftIcon={<CirclePlay className="size-4.5" />} onClick={start}>
              Empezar test · {formatInt(count)} preguntas
            </Button>
            <p className="flex items-start gap-2 text-xs leading-5 text-fg-muted">
              <ListFilter className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              Si hay menos preguntas que cumplan los filtros, el test usará todas las disponibles.
            </p>
          </div>
        </Card>
      </div>
      {dialog}
    </div>
  );
}
