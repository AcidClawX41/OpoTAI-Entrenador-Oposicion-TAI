// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
/**
 * Registro de datos del backend simulado: bancos (ejemplo + reales en
 * desarrollo), temario, esquemas e índices de búsqueda por pregunta.
 * Al construirse resuelve las imágenes `assets/…` de todos los campos Markdown
 * y de `Media.data_url`, igual que hace el núcleo antes de enviarlas.
 */
import type {
  BankSummary,
  BlockId,
  Media,
  PaperQuestion,
  ScoringScheme,
  SectionSummary,
  Temario,
} from "../types";
import { ordinalFem } from "@/lib/format";
import { rewriteAssetRefs } from "./assets";
import type { BankFile, BankMedia, BankQuestion, BankSection } from "./bankTypes";
import { DEMO_ASSETS, DEMO_BANK, DEMO_BANK_ID } from "./demoBank";
import { DEMO_DEFAULT_SCHEME, DEMO_SCHEMES, DEMO_TEMARIO } from "./demoMeta";
import { DEV_DATA_ENDPOINT, type DevData } from "./devData";
import type { SkeletonQuestion } from "./store";

export interface IndexedQuestion {
  question: BankQuestion;
  bank: BankFile;
  section: BankSection;
  isReserve: boolean;
  /** Posición (1-based) entre las reservas de la sección, si es reserva. */
  reserveIndex: number;
  /** Número del supuesto dentro del banco (1, 2…) si la sección es de supuesto. */
  caseNumber: number | null;
}

/** Sección de resumen ampliada con el enunciado (vista previa de supuestos). */
export type SectionSummaryWithStatement = SectionSummary & { statement: string | null };

export class Registry {
  readonly banks: BankFile[];
  readonly temario: Temario;
  readonly schemes: ScoringScheme[];
  readonly defaultScheme: string;
  readonly realData: boolean;
  private readonly index = new Map<string, IndexedQuestion>();

  constructor(dev: DevData | null) {
    const realBanks = dev?.banks ?? [];
    this.realData = realBanks.length > 0;
    const resolve = (path: string): string | null =>
      DEMO_ASSETS[path] ?? (dev ? `${DEV_DATA_ENDPOINT}/asset/${path}` : null);

    // Con exámenes oficiales reales, el banco de ejemplo pasa a ser de práctica.
    const demo: BankFile = realBanks.some((b) => b.kind === "official")
      ? { ...DEMO_BANK, kind: "practice", title: "Preguntas de ejemplo (demo)" }
      : DEMO_BANK;
    this.banks = [...realBanks, demo].map((b) => prepareBank(b, resolve));
    this.temario = dev?.temario ?? DEMO_TEMARIO;

    const schemes: ScoringScheme[] = [...(dev?.schemes ?? [])];
    for (const s of DEMO_SCHEMES) if (!schemes.some((x) => x.id === s.id)) schemes.push(s);
    this.schemes = schemes;
    const def = dev?.default_scheme;
    this.defaultScheme = def && schemes.some((s) => s.id === def) ? def : DEMO_DEFAULT_SCHEME;

    for (const bank of this.banks) {
      let caseNo = 0;
      for (const section of bank.sections) {
        const cn = section.kind === "case" ? ++caseNo : null;
        section.questions.forEach((q) =>
          this.index.set(q.id, { question: q, bank, section, isReserve: false, reserveIndex: 0, caseNumber: cn }),
        );
        section.reserve.forEach((q, i) =>
          this.index.set(q.id, { question: q, bank, section, isReserve: true, reserveIndex: i + 1, caseNumber: cn }),
        );
      }
    }
  }

  get(questionId: string): IndexedQuestion | undefined {
    return this.index.get(questionId);
  }

  bank(id: string): BankFile | undefined {
    return this.banks.find((b) => b.id === id);
  }

  /**
   * Banco con la otra parte del mismo examen oficial (como `Catalog::companion` del núcleo):
   * otro banco oficial del mismo proceso y acceso cuyas partes no se solapan con las de `bank`
   * (p. ej. el 2.º ejercicio de 2018, publicado aparte).
   */
  companion(bank: BankFile): BankFile | undefined {
    const parts = (b: BankFile) => [...new Set(b.sections.filter((s) => s.questions.length > 0).map((s) => s.part))];
    if (bank.kind !== "official" || !bank.convocatoria) return undefined;
    const mine = parts(bank);
    if (mine.length === 0) return undefined;
    return this.banks.find((other) => {
      if (other.id === bank.id || other.kind !== "official" || other.access !== bank.access || other.convocatoria !== bank.convocatoria)
        return false;
      const theirs = parts(other);
      return theirs.length > 0 && theirs.every((p) => !mine.includes(p));
    });
  }

  /** Réplica de examen completo (1.ª parte y algún supuesto, por sí mismo o con su complementario). */
  isCompleteOfficial(bank: BankFile): boolean {
    const has = (b: BankFile, kind: "theory" | "case") => b.sections.some((s) => s.kind === kind && s.questions.length > 0);
    if (bank.kind !== "official" || !has(bank, "theory")) return false;
    if (has(bank, "case")) return true;
    const other = this.companion(bank);
    return Boolean(other && has(other, "case"));
  }

  section(bankId: string, sectionId: string): BankSection | undefined {
    return this.bank(bankId)?.sections.find((s) => s.id === sectionId);
  }

  scheme(id: string | null | undefined): ScoringScheme | undefined {
    return this.schemes.find((s) => s.id === (id ?? this.defaultScheme));
  }

  allQuestions(): IndexedQuestion[] {
    return [...this.index.values()];
  }

  topicTitle(topicId: string | null): string | null {
    if (!topicId) return null;
    for (const b of this.temario.blocks) {
      const t = b.topics.find((x) => x.id === topicId);
      if (t) return t.title;
    }
    return null;
  }

  blockTitle(block: BlockId): string {
    return this.temario.blocks.find((b) => b.id === block)?.title ?? `Bloque ${block}`;
  }

  blockOf(entry: IndexedQuestion): BlockId | null {
    const topic = entry.question.topic;
    if (topic) {
      const prefix = topic.split(".")[0];
      if (prefix === "I" || prefix === "II" || prefix === "III" || prefix === "IV") return prefix;
    }
    return entry.section.block;
  }

  bankLabel(bank: BankFile): string {
    if (bank.id === DEMO_BANK_ID) return bank.kind === "official" ? "Muestra (demo)" : "Ejemplo (demo)";
    if (bank.kind === "official" && bank.year)
      return `Oficial TAI-${bank.access === "promocion_interna" ? "PI" : "LI"} ${bank.year}${bank.id.endsWith("-ext") ? " (extraordinario)" : ""}`;
    return bank.title;
  }

  sourceLabel(entry: IndexedQuestion): string {
    const label = this.bankLabel(entry.bank);
    const where =
      entry.section.kind === "case" ? `supuesto ${entry.caseNumber ?? 1}` : `${ordinalFem(entry.section.part)} parte`;
    const num = entry.isReserve ? `reserva ${entry.reserveIndex}` : `n.º ${entry.question.number}`;
    return `${label} · ${where} · ${num}`;
  }

  media(m: BankMedia): Media {
    return { path: m.path, alt: m.alt, data_url: m.data_url ?? null };
  }

  paperQuestion(sq: SkeletonQuestion): PaperQuestion | null {
    const entry = this.get(sq.id);
    if (!entry) return null;
    const q = entry.question;
    return {
      id: q.id,
      number: q.number,
      display_number: sq.display_number,
      text: q.text,
      options: q.options,
      is_reserve: sq.is_reserve,
      topic: q.topic,
      block: this.blockOf(entry),
      media: q.media.map((m) => this.media(m)),
      source_label: this.sourceLabel(entry),
    };
  }

  bankSummary(bank: BankFile): BankSummary {
    const all = bank.sections.flatMap((s) => [...s.questions, ...s.reserve]);
    const sections: SectionSummaryWithStatement[] = bank.sections.map((s) => ({
      id: s.id,
      part: s.part,
      kind: s.kind,
      title: s.title,
      block: s.block,
      question_count: s.questions.length,
      reserve_count: s.reserve.length,
      statement: s.statement,
    }));
    return {
      id: bank.id,
      kind: bank.kind,
      title: bank.title,
      description: bank.description,
      access: bank.access,
      year: bank.year,
      convocatoria: bank.convocatoria,
      exam_date: bank.exam_date,
      duration_minutes: bank.duration_minutes,
      scoring_scheme: bank.scoring_scheme,
      question_count: bank.sections.reduce((n, s) => n + s.questions.length, 0),
      reserve_count: bank.sections.reduce((n, s) => n + s.reserve.length, 0),
      annulled_count: all.filter((q) => q.annulled).length,
      explained_count: all.filter((q) => q.explanation && q.explanation.trim().length > 0).length,
      case_count: bank.sections.filter((s) => s.kind === "case").length,
      sections,
      source_urls: bank.source.documents
        .filter((d) => d.kind === "cuadernillo" || d.kind.startsWith("plantilla") || d.kind === "criterios")
        .map((d) => d.url)
        .filter(Boolean),
      answer_key: bank.source.answer_key,
      companion_bank_id: this.companion(bank)?.id ?? null,
      complete_exam: this.isCompleteOfficial(bank),
    };
  }
}

/** Copia un banco resolviendo imágenes en Markdown y en `media`. */
function prepareBank(bank: BankFile, resolve: (path: string) => string | null): BankFile {
  const md = (s: string | null): string | null => (s === null ? null : rewriteAssetRefs(s, resolve));
  const media = (list: BankMedia[] | undefined): BankMedia[] =>
    (list ?? []).map((m) => ({ ...m, data_url: m.data_url ?? resolve(m.path) }));
  const question = (q: BankQuestion): BankQuestion => ({
    ...q,
    text: md(q.text) ?? "",
    options: q.options.map((o) => md(o) ?? ""),
    explanation: md(q.explanation),
    option_notes: q.option_notes ? q.option_notes.map((n) => md(n)) : null,
    references: q.references ?? [],
    media: media(q.media),
    outdated: Boolean(q.outdated),
    outdated_note: q.outdated_note ?? null,
  });
  return {
    ...bank,
    sections: bank.sections.map((s) => ({
      ...s,
      statement: md(s.statement ?? null),
      media: media(s.media),
      questions: (s.questions ?? []).map(question),
      reserve: (s.reserve ?? []).map(question),
    })),
  };
}
