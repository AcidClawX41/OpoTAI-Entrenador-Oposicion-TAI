// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
/**
 * Tipos internos del backend simulado. Reproducen el formato de los bancos de
 * `docs/CONTRATO-DATOS.md` (§1) para que los bancos reales de
 * `data/banks/oficiales/*.json` se puedan cargar tal cual en desarrollo.
 */
import type { Access, BankKind, BlockId, Letter, SectionKind } from "../types";

export interface BankMedia {
  path: string;
  alt: string;
  /** Solo en el mock: imagen embebida (data URI). */
  data_url?: string | null;
}

export interface BankQuestion {
  id: string;
  number: number;
  text: string;
  options: string[];
  answer: Letter | null;
  annulled: boolean;
  topic: string | null;
  explanation: string | null;
  option_notes: (string | null)[] | null;
  references: string[];
  tags?: string[];
  media: BankMedia[];
  outdated: boolean;
  outdated_note: string | null;
  needs_review?: boolean;
}

export interface BankSection {
  id: string;
  part: number;
  kind: SectionKind;
  title: string;
  block: BlockId | null;
  statement: string | null;
  media: BankMedia[];
  questions: BankQuestion[];
  reserve: BankQuestion[];
}

export interface BankDocument {
  kind: string;
  title: string;
  url: string;
  sha256?: string | null;
}

export interface BankFile {
  schema_version?: number;
  id: string;
  kind: BankKind;
  title: string;
  description: string | null;
  access: Access | null;
  year: number | null;
  convocatoria: string | null;
  exam_date: string | null;
  model?: string | null;
  duration_minutes: number | null;
  scoring_scheme: string | null;
  source: {
    publisher?: string;
    documents: BankDocument[];
    answer_key: "definitiva" | "provisional" | "propia";
    retrieved?: string;
    notes?: string | null;
  };
  sections: BankSection[];
}

/** Disponibilidad sintética de cada localidad en los destinos de referencia. */
export interface DestinationAvailability {
  locality: string;
  /** Último número de orden relativo (0–1) con el que aún se eligió esta localidad. */
  last_order_ratio: number;
}
