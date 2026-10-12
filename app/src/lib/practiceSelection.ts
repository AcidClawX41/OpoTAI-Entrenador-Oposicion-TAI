// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
/**
 * Selección jerárquica de bloques y temas para «Practicar por temas» (pura y testeable).
 * Un bloque completo viaja como `blocks` (incluye preguntas del bloque sin tema asignado);
 * un bloque parcial, como lista de `topics`.
 */
import type { Block, BlockId, Temario } from "@/api/types";

export type TopicSelection = ReadonlySet<string>;

export function blockState(block: Block, selection: TopicSelection): boolean | "mixed" {
  const n = block.topics.filter((t) => selection.has(t.id)).length;
  if (n === 0) return false;
  return n === block.topics.length ? true : "mixed";
}

export function toggleBlock(block: Block, selection: TopicSelection, on: boolean): Set<string> {
  const next = new Set(selection);
  for (const t of block.topics) {
    if (on) next.add(t.id);
    else next.delete(t.id);
  }
  return next;
}

export function toggleTopic(topicId: string, selection: TopicSelection): Set<string> {
  const next = new Set(selection);
  if (next.has(topicId)) next.delete(topicId);
  else next.add(topicId);
  return next;
}

/** Filtros para `ExamSpec.practice`: vacío = todo el temario. */
export function selectionToFilters(temario: Temario | null, selection: TopicSelection): { blocks: BlockId[]; topics: string[] } {
  if (!temario || selection.size === 0) return { blocks: [], topics: [] };
  const all = temario.blocks.every((b) => blockState(b, selection) === true);
  if (all) return { blocks: [], topics: [] };
  const blocks: BlockId[] = [];
  const topics: string[] = [];
  for (const b of temario.blocks) {
    const state = blockState(b, selection);
    if (state === true) blocks.push(b.id);
    else if (state === "mixed") for (const t of b.topics) if (selection.has(t.id)) topics.push(t.id);
  }
  return { blocks, topics };
}

/** Lee `?temas=I.1,IV.7` o `?bloque=III` y devuelve los temas válidos del temario. */
export function parseSelectionParams(temario: Temario | null, params: URLSearchParams): Set<string> {
  const out = new Set<string>();
  if (!temario) return out;
  const known = new Map(temario.blocks.flatMap((b) => b.topics.map((t) => [t.id.toUpperCase(), t.id] as const)));
  const raw = [params.get("temas"), params.get("topics")].filter(Boolean).join(",");
  for (const part of raw.split(",")) {
    const id = known.get(part.trim().toUpperCase());
    if (id) out.add(id);
  }
  const blockParam = (params.get("bloque") ?? "").toUpperCase();
  for (const b of temario.blocks) if (blockParam.split(",").includes(b.id)) for (const t of b.topics) out.add(t.id);
  return out;
}

/** Texto corto de la selección: «Todo el temario», «Bloque II», «3 temas de 2 bloques». */
export function selectionLabel(temario: Temario | null, selection: TopicSelection): string {
  if (!temario || selection.size === 0) return "Todo el temario";
  const { blocks, topics } = selectionToFilters(temario, selection);
  if (blocks.length === 0 && topics.length === 0) return "Todo el temario";
  const parts: string[] = [];
  if (blocks.length > 0) parts.push(blocks.length === 1 ? `Bloque ${blocks[0]}` : `Bloques ${blocks.join(", ")}`);
  if (topics.length > 0) {
    const blockCount = new Set(topics.map((t) => t.split(".")[0])).size;
    parts.push(
      topics.length <= 3
        ? `${topics.length === 1 ? "tema" : "temas"} ${topics.join(", ")}`
        : `${topics.length} temas${blockCount > 1 ? ` de ${blockCount} bloques` : ""}`,
    );
  }
  const text = parts.join(" y ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}
