// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
/**
 * Motor del backend simulado: implementa TODOS los comandos de
 * `docs/CONTRATO-API.md` sobre `localStorage` (modo demo en navegador).
 * Es la única lógica de negocio de la interfaz y solo existe para la demo:
 * en la app de escritorio todo lo hace el núcleo en Rust.
 */
import type {
  DestinationSimulation,
  ActiveAttempt,
  AnswerFeedback,
  AnswerState,
  AppInfo,
  AttemptResult,
  AttemptSummary,
  BlockId,
  BlockStat,
  CalculatorResult,
  CatalogInfo,
  ExamPaper,
  ExamSpec,
  FeedbackMode,
  ItemStatus,
  Letter,
  LocalityInfo,
  ManualGradeInput,
  PartScore,
  Prediction,
  Profile,
  ProfileStats,
  ProgressPayload,
  RandomDraw,
  ReviewItem,
  ReviewSummary,
  ScoringScheme,
  SectionKind,
  Settings,
  TheorySummary,
  TheoryTopic,
} from "../types";
import { OpoApiError } from "../errors";
import { COPYRIGHT_LINE, LICENSE_NAME, LICENSE_SPDX, LICENSE_URL } from "@/content/legal";
import { APP_VERSION } from "@/lib/version";
import { toLocalDateKey } from "@/lib/format";
import type { DevData, DevTheory } from "./devData";
import { DEMO_BANK_ID } from "./demoBank";
import { DEMO_THEORY } from "./demoTheory";
import { buildPredictionData, type PredictionData } from "./predictionData";
import { simulateDestinationsMock, type MockCall } from "./destinations";
import { predict, type PartPerformance } from "./prediction";
import { Registry, type IndexedQuestion } from "./registry";
import { hashString, mulberry32, shuffle, type Rng } from "./rng";
import { derivedScheme, gradeUnits, penaltyDivisorOf, round, scoreExam, type GradableSection } from "./scoring";
import {
  loadDb,
  saveDb,
  uuid,
  type MockDb,
  type PaperSkeleton,
  type PartTally,
  type QuestionStat,
  type SkeletonSection,
  type StoredAttempt,
} from "./store";

const LETTERS: Letter[] = ["A", "B", "C", "D"];
const BLOCKS: BlockId[] = ["I", "II", "III", "IV"];
const DAY_MS = 86_400_000;
const SRS_INTERVAL_DAYS: Record<number, number> = { 2: 1, 3: 3, 4: 7, 5: 15 };
const WEAK_TOPIC_MIN_ANSWERS = 4;
const ACTIVITY_DAYS = 120;
const READINESS_ATTEMPTS = 5;
/** Simulacros numerados disponibles en el contrato (n.º 1…30). */
export const NUMBERED_MAX = 30;
/** Simulacros numerados que entran en el sorteo del modo demo. */
export const DEMO_DRAW_NUMBERED = 2;

// ───────────────────────────── Reloj (permite fechar el historial de ejemplo) ─────────────────────────────

let clock: (() => Date) | null = null;
export function setClock(fn: (() => Date) | null): void {
  clock = fn;
}
function now(): Date {
  return clock ? clock() : new Date();
}
function nowIso(): string {
  return now().toISOString();
}

/** Tamaño máximo de una imagen de avatar propia (como en el núcleo): 2 MB. */
const MAX_AVATAR_IMAGE_BYTES = 2 * 1024 * 1024;

function fail(code: OpoApiError["code"], message: string): never {
  throw new OpoApiError(code, message);
}

/** Ajustes por defecto (docs/CONTRATO-API.md, «Ajustes por defecto»). */
export const DEFAULT_SETTINGS: Settings = {
  theme: "system",
  accent: "#7c3aed",
  default_feedback: "immediate",
  exam_feedback: "end",
  sound_enabled: true,
  sound_volume: 0.6,
  random_exam_on_startup: true,
  show_timer: true,
  confirm_before_submit: true,
  keyboard_shortcuts: true,
  target_convocatoria: null,
  cutoff_override_ratio: null,
  preferred_localities: [],
  exam_date: null,
};

type PoolKey = string;

function poolKeyOf(spec: ExamSpec): PoolKey | null {
  if (spec.type === "official") return `official:${spec.bank_id}`;
  if (spec.type === "numbered") return `numbered:${spec.number}`;
  return null;
}

export class MockEngine {
  private readonly predictionData: PredictionData;
  private readonly theory: DevTheory[] | null;
  private readonly dataUpdated: string;
  private readonly licenseText: string | null;
  private readonly destinationCalls: MockCall[];

  constructor(
    readonly registry: Registry,
    private db: MockDb = loadDb(),
    dev: DevData | null = null,
  ) {
    this.predictionData = buildPredictionData(dev);
    this.theory = dev && dev.theory.length > 0 ? dev.theory : null;
    this.dataUpdated = dev?.updated ?? "2026-10-11";
    this.licenseText = dev?.license ?? null;
    this.destinationCalls = Object.entries(dev?.assignments ?? {})
      .filter(([id]) => id.startsWith("li-") && (dev?.grades[id]?.length ?? 0) > 0)
      .map(([id, assignments]) => {
        const year = Number(id.split("-").pop()) || 0;
        const grades = [...(dev?.grades[id] ?? [])].sort((a, b) => b - a);
        return { id, year, label: `Ingreso libre ${year}`, grades, assignments };
      })
      .sort((a, b) => b.year - a.year);
  }

  static create(dev: DevData | null): MockEngine {
    return new MockEngine(new Registry(dev), loadDb(), dev);
  }

  private persist(): void {
    saveDb(this.db);
  }

  reload(): void {
    this.db = loadDb();
  }

  // ───────────────────────────── Información y catálogo ─────────────────────────────

  getAppInfo(): AppInfo {
    const all = this.registry.allQuestions();
    return {
      name: "OpoTAI",
      version: APP_VERSION,
      git_commit: null,
      author: "Eric Valls Gramunt",
      copyright: COPYRIGHT_LINE,
      license: LICENSE_SPDX,
      license_name: LICENSE_NAME,
      repository: "https://github.com/AcidClawX41/Programa-Oposiciones-TAI",
      data_updated: this.dataUpdated,
      banks: this.registry.banks.length,
      questions: all.length,
      questions_with_explanation: all.filter((q) => q.question.explanation).length,
      official_exams: this.registry.banks.filter((b) => b.kind === "official").length,
      theory_topics: this.theory ? this.theory.length : DEMO_THEORY.length,
      db_path: "localStorage del navegador (modo demo)",
    };
  }

  getCatalog(): CatalogInfo {
    return {
      banks: this.registry.banks.map((b) => this.registry.bankSummary(b)),
      temario: this.registry.temario,
      schemes: this.registry.schemes,
      default_scheme: this.registry.defaultScheme,
      convocatorias: this.predictionData.convocatorias,
      target_convocatoria: this.predictionData.target,
      tiers: this.predictionData.tiers,
    };
  }

  listLocalities(): LocalityInfo[] {
    return this.predictionData.localities;
  }

  // ───────────────────────────── Perfiles y ajustes ─────────────────────────────

  listProfiles(): Profile[] {
    return [...this.db.profiles].sort((a, b) => {
      const ka = a.last_active_at ?? a.created_at;
      const kb = b.last_active_at ?? b.created_at;
      return kb.localeCompare(ka);
    });
  }

  private profile(id: string): Profile {
    const p = this.db.profiles.find((x) => x.id === id);
    if (!p) fail("not_found", "No existe ese perfil.");
    return p;
  }

  private validateProfile(name: string, color: string, exceptId: string | null): string {
    const trimmed = (name ?? "").trim();
    if (trimmed.length < 1 || trimmed.length > 40) fail("invalid_input", "El nombre debe tener entre 1 y 40 caracteres.");
    if (!/^#[0-9a-f]{6}$/i.test(color ?? "")) fail("invalid_input", "El color debe ser un hexadecimal (#rrggbb).");
    const clash = this.db.profiles.some(
      (p) => p.id !== exceptId && p.name.trim().toLocaleLowerCase("es") === trimmed.toLocaleLowerCase("es"),
    );
    if (clash) fail("conflict", `Ya existe un perfil llamado «${trimmed}».`);
    return trimmed;
  }

  /** Avatar: emoji (≤ 16 caracteres) o imagen propia de cualquier proporción
   *  `data:image/png|jpeg|webp|gif;base64,…` (≤ 2 MB), con las mismas reglas que el núcleo. */
  private validateAvatar(avatar: string | null): string | null {
    const a = avatar?.trim() ?? "";
    if (!a) return null;
    if (a.startsWith("data:")) {
      const m = /^data:image\/(png|jpeg|webp|gif);base64,([A-Za-z0-9+/=]+)$/.exec(a);
      const bytes = m ? Math.floor((m[2]!.length * 3) / 4) : Infinity;
      if (!m || bytes > MAX_AVATAR_IMAGE_BYTES)
        fail("invalid_input", "La imagen del avatar no es válida: usa una imagen PNG, JPEG, WebP o GIF de hasta 2 MB.");
      return a;
    }
    if ([...a].length > 16) fail("invalid_input", "El avatar es demasiado largo.");
    return a;
  }

  createProfile(name: string, color: string, avatar: string | null): Profile {
    const clean = this.validateProfile(name, color, null);
    const profile: Profile = {
      id: uuid(),
      name: clean,
      color,
      avatar: this.validateAvatar(avatar),
      created_at: nowIso(),
      last_active_at: nowIso(),
    };
    this.db.profiles.push(profile);
    this.db.settings[profile.id] = { ...DEFAULT_SETTINGS };
    this.persist();
    return profile;
  }

  updateProfile(profileId: string, name: string, color: string, avatar: string | null): Profile {
    const p = this.profile(profileId);
    p.name = this.validateProfile(name, color, profileId);
    p.color = color;
    p.avatar = this.validateAvatar(avatar);
    this.persist();
    return { ...p };
  }

  deleteProfile(profileId: string): null {
    this.profile(profileId);
    this.db.profiles = this.db.profiles.filter((p) => p.id !== profileId);
    delete this.db.settings[profileId];
    delete this.db.stats[profileId];
    delete this.db.draws[profileId];
    this.db.attempts = this.db.attempts.filter((a) => a.profile_id !== profileId);
    this.persist();
    return null;
  }

  touchProfile(profileId: string): Profile {
    const p = this.profile(profileId);
    p.last_active_at = nowIso();
    this.persist();
    return { ...p };
  }

  getSettings(profileId: string): Settings {
    this.profile(profileId);
    return this.settingsOf(profileId);
  }

  updateSettings(profileId: string, settings: Settings): Settings {
    this.profile(profileId);
    const s = { ...DEFAULT_SETTINGS, ...settings };
    if (!["system", "light", "dark"].includes(s.theme)) fail("invalid_input", "Tema no válido.");
    if (!/^#[0-9a-f]{6}$/i.test(s.accent)) fail("invalid_input", "El color de acento debe ser hexadecimal (#rrggbb).");
    if (!["immediate", "end"].includes(s.default_feedback) || !["immediate", "end"].includes(s.exam_feedback))
      fail("invalid_input", "Modo de corrección no válido.");
    if (!(s.sound_volume >= 0 && s.sound_volume <= 1)) fail("invalid_input", "El volumen debe estar entre 0 y 1.");
    if (s.cutoff_override_ratio !== null && (s.cutoff_override_ratio < 0 || s.cutoff_override_ratio > 1))
      fail("invalid_input", "El corte personalizado debe estar entre 0 y 1.");
    if (s.preferred_localities.length > 3) fail("invalid_input", "Puedes elegir como máximo 3 localidades preferidas.");
    if (s.exam_date !== null && !/^\d{4}-\d{2}-\d{2}$/.test(s.exam_date))
      fail("invalid_input", "La fecha del examen debe tener el formato AAAA-MM-DD.");
    this.db.settings[profileId] = s;
    this.persist();
    return { ...s };
  }

  private settingsOf(profileId: string): Settings {
    return { ...DEFAULT_SETTINGS, ...(this.db.settings[profileId] ?? {}) };
  }

  /** Esquema de la convocatoria objetivo del perfil, si la tiene (como `Engine::target_scheme`). */
  private targetScheme(profileId: string): ScoringScheme | null {
    const target = this.settingsOf(profileId).target_convocatoria;
    if (!target) return null;
    const conv = this.predictionData.convocatorias.find((c) => c.id === target);
    return conv?.scoring_scheme ? (this.registry.scheme(conv.scoring_scheme) ?? null) : null;
  }

  // ───────────────────────────── Generación de exámenes ─────────────────────────────

  private stats(profileId: string): Record<string, QuestionStat> {
    let s = this.db.stats[profileId];
    if (!s) {
      s = {};
      this.db.stats[profileId] = s;
    }
    return s;
  }

  startExam(profileId: string, input: ExamSpec): ExamPaper {
    this.profile(profileId);
    let spec = input;
    let drawn = false;
    if (spec.type === "random") {
      spec = this.drawSpec(profileId, spec.feedback, spec.timed ?? true).spec;
      drawn = true;
    } else {
      const key = poolKeyOf(spec);
      if (key && this.db.draws[profileId] === key) drawn = true;
    }
    if (drawn) delete this.db.draws[profileId];
    for (const a of this.db.attempts)
      if (a.profile_id === profileId && a.status === "in_progress") a.status = "abandoned";

    const rng = mulberry32(
      ("seed" in spec && spec.seed !== null && spec.seed !== undefined ? spec.seed : hashString(nowIso() + Math.random())) >>> 0,
    );
    const skeleton = this.buildSkeleton(profileId, spec, rng);
    skeleton.drawn = drawn;
    const attempt: StoredAttempt = {
      id: uuid(),
      profile_id: profileId,
      mode: this.modeOf(spec),
      spec,
      skeleton,
      status: "in_progress",
      started_at: nowIso(),
      finished_at: null,
      elapsed_seconds: 0,
      answers: [],
      chosen_case: null,
      checked: {},
      summary: null,
    };
    this.db.attempts.push(attempt);
    this.persist();
    return this.hydrate(attempt);
  }

  private modeOf(spec: ExamSpec): StoredAttempt["mode"] {
    switch (spec.type) {
      case "numbered":
      case "random":
        return "simulacro";
      default:
        return spec.type;
    }
  }

  private buildSkeleton(profileId: string, spec: ExamSpec, rng: Rng): PaperSkeleton {
    switch (spec.type) {
      case "official":
        return this.buildOfficial(spec);
      case "simulacro":
        return this.buildSimulacro(profileId, spec, rng);
      case "numbered":
        return this.buildNumbered(spec.number, spec.feedback, spec.timed ?? true);
      case "practice":
        return this.buildPractice(profileId, spec, rng);
      case "review":
        return this.buildReview(profileId, spec);
      case "case":
        return this.buildCase(spec);
      default:
        return fail("invalid_input", "Tipo de examen desconocido.");
    }
  }

  private buildOfficial(spec: Extract<ExamSpec, { type: "official" }>): PaperSkeleton {
    const bank = this.registry.bank(spec.bank_id);
    if (!bank) fail("not_found", "No se encuentra ese examen oficial.");
    const scheme = this.registry.scheme(bank.scoring_scheme) ?? this.registry.scheme(null);
    if (!scheme) fail("data", "Falta el esquema de puntuación.");
    let theoryNo = 0;
    // Examen publicado en dos bancos (p. ej. 2018): la réplica del banco de la 1.ª parte añade el
    // otro ejercicio, como el núcleo.
    const companion = bank.sections.some((s) => s.kind === "theory" && s.questions.length > 0) ? this.registry.companion(bank) : undefined;
    const examSections = [
      ...bank.sections.map((s) => ({ source: bank, s })),
      ...(companion ? companion.sections.map((s) => ({ source: companion, s })) : []),
    ].sort((x, y) => x.s.part - y.s.part);
    // 1.ª parte con bloque a elegir (como el núcleo): comunes + la alternativa elegida.
    const alternatives = examSections.filter(({ s }) => s.kind === "theory" && s.block !== null).map(({ s }) => s.block);
    const chosen = alternatives.length > 1 ? (alternatives.find((b) => b === spec.theory_block) ?? alternatives[0]) : null;
    const included = examSections.filter(({ s }) => !(chosen && s.kind === "theory" && s.block !== null && s.block !== chosen));
    const sections: SkeletonSection[] = included.map(({ source, s }) => {
      const main = s.questions.map((q) => ({
        id: q.id,
        display_number: String(s.kind === "theory" ? ++theoryNo : q.number),
        is_reserve: false,
      }));
      const reserves = spec.include_reserve
        ? s.reserve.map((q, i) => ({ id: q.id, display_number: `R${i + 1}`, is_reserve: true }))
        : [];
      // Los ids de sección son locales a cada banco: si el complementario repite uno, se distingue.
      const id = source.id !== bank.id && bank.sections.some((x) => x.id === s.id) ? `${source.id}:${s.id}` : s.id;
      return {
        id,
        part: s.part,
        kind: s.kind,
        title: s.title,
        block: s.block,
        source: { bank_id: source.id, section_id: s.id },
        questions: [...main, ...reserves],
      };
    });
    const caseSections = sections.filter((s) => s.kind === "case");
    const casePart = scheme.parts.find((p) => p.kind === "case");
    const requiresChoice = caseSections.length > (casePart?.cases_to_choose ?? 1);
    // Duración: la suma de los dos ejercicios si el examen está repartido (90 + 70 en 2018).
    const durations = [bank, ...(companion ? [companion] : [])].map((b) => b.duration_minutes);
    const examDuration = durations.every((d) => d !== null) ? durations.reduce<number>((n, d) => n + (d ?? 0), 0) : null;
    const theoryCount = sections
      .filter((s) => s.kind === "theory")
      .reduce((n, s) => n + s.questions.filter((q) => !q.is_reserve).length, 0);
    const caseCount = requiresChoice
      ? (caseSections[0]?.questions.filter((q) => !q.is_reserve).length ?? 0)
      : caseSections.reduce((n, s) => n + s.questions.filter((q) => !q.is_reserve).length, 0);
    return {
      title: bank.title,
      subtitle: `${spec.timed ? "Cronometrado" : "Sin límite de tiempo"} · ${spec.include_reserve ? "con preguntas de reserva" : "sin reservas"}`,
      scheme,
      duration_minutes: spec.timed ? (examDuration ?? scheme.duration_minutes) : null,
      feedback: spec.feedback,
      requires_case_choice: requiresChoice,
      cases_to_choose: casePart?.cases_to_choose ?? 1,
      use_reserves: spec.include_reserve,
      with_prediction: theoryCount > 0,
      total_questions: theoryCount + caseCount,
      drawn: false,
      pool_key: `official:${bank.id}`,
      sections,
    };
  }

  private orderByNovelty(entries: IndexedQuestion[], profileId: string | null, rng: Rng, preferUnseen: boolean): IndexedQuestion[] {
    const stats = profileId ? this.stats(profileId) : {};
    const shuffled = shuffle(entries, rng);
    if (!preferUnseen) return shuffled;
    return shuffled
      .map((e, i) => ({ e, i, seen: stats[e.question.id]?.seen ?? 0 }))
      .sort((a, b) => a.seen - b.seen || a.i - b.i)
      .map((x) => x.e);
  }

  private blockProportions(): Record<BlockId, number> {
    const official = this.registry.banks
      .filter((b) => b.kind === "official" && b.id !== DEMO_BANK_ID)
      .sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
    for (const bank of official) {
      const theory = bank.sections.filter((s) => s.kind === "theory").flatMap((s) => s.questions);
      const counts: Record<BlockId, number> = { I: 0, II: 0, III: 0, IV: 0 };
      let total = 0;
      for (const q of theory) {
        const b = q.topic?.split(".")[0] as BlockId | undefined;
        if (b && b in counts) {
          counts[b]++;
          total++;
        }
      }
      if (total > 0) return { I: counts.I / total, II: counts.II / total, III: counts.III / total, IV: counts.IV / total };
    }
    return { I: 0.25, II: 0.15, III: 0.27, IV: 0.33 };
  }

  /** Compone las secciones de un examen completo (1.ª parte estratificada + supuestos). */
  private composeFull(opts: {
    profileId: string | null;
    scheme: ScoringScheme;
    wanted: number;
    includeCase: boolean;
    preferUnseen: boolean;
    preferOfficial: boolean;
    caseOffset: number;
    rng: Rng;
  }): { sections: SkeletonSection[]; theoryCount: number; caseCount: number } {
    const { scheme, wanted, rng } = opts;
    const casePart = scheme.parts.find((p) => p.kind === "case");
    const pool = this.registry
      .allQuestions()
      .filter((e) => e.section.kind === "theory" && !e.question.annulled && e.question.answer !== null);
    const rankOfficial = (list: IndexedQuestion[]) =>
      opts.preferOfficial
        ? [...list].sort((a, b) => Number(b.bank.kind === "official") - Number(a.bank.kind === "official"))
        : list;
    const fresh = pool.filter((e) => !e.question.outdated);
    const outdated = pool.filter((e) => e.question.outdated);

    const props = this.blockProportions();
    const byBlock = new Map<BlockId | null, IndexedQuestion[]>();
    for (const e of rankOfficial(this.orderByNovelty(fresh, opts.profileId, rng, opts.preferUnseen))) {
      const b = this.registry.blockOf(e);
      const list = byBlock.get(b) ?? [];
      list.push(e);
      byBlock.set(b, list);
    }
    const selected: IndexedQuestion[] = [];
    const taken = new Set<string>();
    const raw = BLOCKS.map((b) => ({ b, exact: wanted * props[b] }));
    const alloc = new Map<BlockId, number>(raw.map((r) => [r.b, Math.floor(r.exact)]));
    let rest = wanted - [...alloc.values()].reduce((s, n) => s + n, 0);
    for (const r of [...raw].sort((x, y) => y.exact - Math.floor(y.exact) - (x.exact - Math.floor(x.exact)))) {
      if (rest <= 0) break;
      alloc.set(r.b, (alloc.get(r.b) ?? 0) + 1);
      rest--;
    }
    for (const b of BLOCKS) {
      for (const e of (byBlock.get(b) ?? []).slice(0, alloc.get(b) ?? 0)) {
        selected.push(e);
        taken.add(e.question.id);
      }
    }
    const leftovers = [
      ...rankOfficial(this.orderByNovelty(fresh, opts.profileId, rng, opts.preferUnseen)),
      ...this.orderByNovelty(outdated, opts.profileId, rng, opts.preferUnseen),
    ];
    for (const e of leftovers) {
      if (selected.length >= wanted) break;
      if (taken.has(e.question.id)) continue;
      selected.push(e);
      taken.add(e.question.id);
    }
    const blockRank = (e: IndexedQuestion) => {
      const b = this.registry.blockOf(e);
      return b ? BLOCKS.indexOf(b) : 9;
    };
    selected.sort((a, b) => blockRank(a) - blockRank(b));

    const sections: SkeletonSection[] = [
      {
        id: "p1",
        part: 1,
        kind: "theory",
        title: "Primera parte · Cuestionario",
        block: null,
        source: null,
        questions: selected.map((e, i) => ({ id: e.question.id, display_number: String(i + 1), is_reserve: false })),
      },
    ];

    if (opts.includeCase && casePart) {
      const offered = casePart.cases_offered ?? 2;
      const stats = opts.profileId ? this.stats(opts.profileId) : {};
      const any = this.registry.banks.flatMap((bank) =>
        bank.sections.filter((s) => s.kind === "case" && s.questions.length > 0).map((s) => ({ bank, s })),
      );
      // Mismo criterio que el núcleo: solo supuestos del tamaño del esquema (si hay suficientes),
      // para que la nota sea comparable (20 en libre, 12 en interna…).
      const fitting = any.filter((c) => c.s.questions.length === casePart.questions);
      const all = fitting.length >= offered ? fitting : any;
      // Rotación determinista (simulacros numerados) o aleatoria.
      const rotated = all.length ? [...all.slice(opts.caseOffset % all.length), ...all.slice(0, opts.caseOffset % all.length)] : [];
      const cases = (opts.caseOffset > 0 ? rotated : shuffle(all, rng)).map((c) => ({
        ...c,
        seen: c.s.questions.reduce((n, q) => n + (stats[q.id]?.seen ?? 0), 0),
      }));
      if (opts.preferUnseen) cases.sort((a, b) => a.seen - b.seen);
      const chosen: typeof cases = [];
      for (const block of ["III", "IV"] as const) {
        const c = cases.find((x) => x.s.block === block && !chosen.includes(x));
        if (c && chosen.length < offered) chosen.push(c);
      }
      for (const c of cases) if (chosen.length < offered && !chosen.includes(c)) chosen.push(c);
      chosen.sort((a, b) => (a.s.block ?? "").localeCompare(b.s.block ?? ""));
      chosen.forEach((c, k) =>
        sections.push({
          id: `p2-${c.bank.id}-${c.s.id}`,
          part: 2,
          kind: "case",
          title: `Supuesto ${k + 1} · ${caseHeading(c.s.title, this.registry.bankLabel(c.bank))}`,
          block: c.s.block,
          source: { bank_id: c.bank.id, section_id: c.s.id },
          questions: c.s.questions
            .slice(0, casePart.questions)
            .map((q, i) => ({ id: q.id, display_number: String(i + 1), is_reserve: false })),
        }),
      );
    }
    const caseSections = sections.filter((s) => s.kind === "case");
    return { sections, theoryCount: selected.length, caseCount: caseSections[0]?.questions.length ?? 0 };
  }

  private buildSimulacro(profileId: string, spec: Extract<ExamSpec, { type: "simulacro" }>, rng: Rng): PaperSkeleton {
    const scheme = this.registry.scheme(spec.scheme_id);
    if (!scheme) fail("not_found", "No se encuentra ese esquema de puntuación.");
    const theoryPart = scheme.parts.find((p) => p.kind === "theory");
    const wanted = Math.max(1, spec.part1_questions ?? theoryPart?.questions ?? 80);
    const { sections, theoryCount, caseCount } = this.composeFull({
      profileId,
      scheme,
      wanted,
      includeCase: spec.include_case,
      preferUnseen: spec.prefer_unseen,
      preferOfficial: false,
      caseOffset: 0,
      rng,
    });
    const caseSections = sections.filter((s) => s.kind === "case");
    const duration = spec.duration_minutes === 0 ? null : (spec.duration_minutes ?? scheme.duration_minutes ?? null);
    return {
      title: spec.freestyle
        ? "Simulacro Freestyle"
        : wanted < (theoryPart?.questions ?? 80) || !spec.include_case
          ? "Simulacro rápido"
          : "Simulacro",
      subtitle: `${theoryCount} preguntas${caseSections.length ? " + supuesto práctico" : ""} · ${duration ? `${duration} min` : "sin límite de tiempo"}`,
      scheme,
      duration_minutes: duration,
      feedback: spec.feedback,
      requires_case_choice: caseSections.length > 1,
      cases_to_choose: 1,
      use_reserves: false,
      with_prediction: true,
      total_questions: theoryCount + caseCount,
      drawn: false,
      pool_key: null,
      sections,
    };
  }

  private buildNumbered(number: number, feedback: FeedbackMode, timed = true): PaperSkeleton {
    if (!Number.isInteger(number) || number < 1 || number > NUMBERED_MAX)
      fail("invalid_input", `Los simulacros numerados van del 1 al ${NUMBERED_MAX}.`);
    const scheme = this.registry.scheme(null);
    if (!scheme) fail("data", "Falta el esquema por defecto.");
    const theoryPart = scheme.parts.find((p) => p.kind === "theory");
    const { sections, theoryCount, caseCount } = this.composeFull({
      profileId: null,
      scheme,
      wanted: theoryPart?.questions ?? 80,
      includeCase: true,
      preferUnseen: false,
      preferOfficial: true,
      caseOffset: number,
      rng: mulberry32(hashString(`opotai-numbered-${number}`)),
    });
    const caseSections = sections.filter((s) => s.kind === "case");
    return {
      title: `Simulacro OpoTAI n.º ${number}`,
      subtitle: `${theoryCount} preguntas${caseSections.length ? " + supuesto práctico" : ""} · ${timed ? `${scheme.duration_minutes} min` : "sin límite de tiempo"}`,
      scheme,
      duration_minutes: timed ? scheme.duration_minutes : null,
      feedback,
      requires_case_choice: caseSections.length > 1,
      cases_to_choose: 1,
      use_reserves: false,
      with_prediction: true,
      total_questions: theoryCount + caseCount,
      drawn: false,
      pool_key: `numbered:${number}`,
      sections,
    };
  }

  /** Agrupa preguntas sueltas en secciones de teoría y de supuestos (con su enunciado). */
  private sectionsFor(entries: IndexedQuestion[], theoryTitle: string): SkeletonSection[] {
    const theory = entries.filter((e) => e.section.kind === "theory");
    const sections: SkeletonSection[] = [];
    if (theory.length > 0)
      sections.push({
        id: "p1",
        part: 1,
        kind: "theory",
        title: theoryTitle,
        block: null,
        source: null,
        questions: theory.map((e, i) => ({ id: e.question.id, display_number: String(i + 1), is_reserve: false })),
      });
    const groups = new Map<string, IndexedQuestion[]>();
    for (const e of entries.filter((x) => x.section.kind === "case")) {
      const key = `${e.bank.id}::${e.section.id}`;
      const list = groups.get(key) ?? [];
      list.push(e);
      groups.set(key, list);
    }
    let n = theory.length;
    for (const [key, list] of groups) {
      const first = list[0];
      if (!first) continue;
      sections.push({
        id: `p2-${key.replace("::", "-")}`,
        part: 2,
        kind: "case",
        title: first.section.title,
        block: first.section.block,
        source: { bank_id: first.bank.id, section_id: first.section.id },
        questions: list.map((e) => ({ id: e.question.id, display_number: String(++n), is_reserve: false })),
      });
    }
    return sections;
  }

  private derived(base: ScoringScheme, sections: SkeletonSection[], id: string, title: string): ScoringScheme {
    const kinds = [...new Set(sections.map((s) => s.kind))] as SectionKind[];
    const counts: Partial<Record<SectionKind, number>> = {};
    for (const s of sections) counts[s.kind] = (counts[s.kind] ?? 0) + s.questions.length;
    return derivedScheme(base, kinds, id, title, counts);
  }

  private buildPractice(profileId: string, spec: Extract<ExamSpec, { type: "practice" }>, rng: Rng): PaperSkeleton {
    const stats = this.stats(profileId);
    const pool = this.registry.allQuestions().filter((e) => {
      const q = e.question;
      if (q.annulled || q.answer === null) return false;
      if (e.section.kind === "case" && !spec.include_cases) return false;
      if (spec.bank_ids.length && !spec.bank_ids.includes(e.bank.id)) return false;
      const block = this.registry.blockOf(e);
      const inBlocks = spec.blocks.length > 0 && block !== null && spec.blocks.includes(block);
      const inTopics = spec.topics.length > 0 && q.topic !== null && spec.topics.includes(q.topic);
      if ((spec.blocks.length > 0 || spec.topics.length > 0) && !inBlocks && !inTopics) return false;
      const st = stats[q.id];
      if (spec.source === "unseen" && (st?.seen ?? 0) > 0) return false;
      if (spec.source === "failed" && (st?.wrong ?? 0) === 0) return false;
      if (spec.source === "flagged" && !st?.flagged) return false;
      return true;
    });
    if (pool.length === 0)
      fail(
        "invalid_input",
        spec.source === "all"
          ? "No hay preguntas que cumplan los filtros elegidos."
          : "No hay preguntas con ese origen en los temas elegidos. Prueba con «Todas».",
      );
    const picked = shuffle(pool, rng).slice(0, Math.max(1, spec.count));
    const sections = this.sectionsFor(picked, "Práctica por temas");
    // Valor y resta de la convocatoria objetivo del perfil, como el núcleo.
    const base = this.targetScheme(profileId) ?? this.registry.scheme(null);
    if (!base) fail("data", "Falta el esquema por defecto.");
    const blocks = [...new Set(picked.map((e) => this.registry.blockOf(e)).filter(Boolean))] as BlockId[];
    const scope =
      spec.topics.length > 0 && spec.topics.length <= 3
        ? `${spec.topics.length === 1 ? "Tema" : "Temas"} ${spec.topics.join(", ")}`
        : blocks.length > 0 && blocks.length < 4
          ? `Bloque${blocks.length > 1 ? "s" : ""} ${blocks.sort((a, b) => BLOCKS.indexOf(a) - BLOCKS.indexOf(b)).join(", ")}`
          : "Todo el temario";
    return {
      title: "Práctica por temas",
      subtitle: `${picked.length} preguntas · ${scope}`,
      scheme: this.derived(base, sections, "practica", "Práctica · nota sobre 10 con penalización"),
      duration_minutes: spec.duration_minutes ? spec.duration_minutes : null,
      feedback: spec.feedback,
      requires_case_choice: false,
      cases_to_choose: 1,
      use_reserves: false,
      with_prediction: false,
      total_questions: picked.length,
      drawn: false,
      pool_key: null,
      sections,
    };
  }

  private buildReview(profileId: string, spec: Extract<ExamSpec, { type: "review" }>): PaperSkeleton {
    const stats = this.stats(profileId);
    const t = now().getTime();
    const tracked = Object.entries(stats)
      .filter(([id, s]) => s.srs_box >= 1 && s.srs_box <= 4 && this.registry.get(id))
      .map(([id, s]) => ({ id, s, due: s.srs_due_at ? Date.parse(s.srs_due_at) : 0 }));
    const due = tracked.filter((x) => x.due <= t).sort((a, b) => a.due - b.due);
    const later = tracked.filter((x) => x.due > t).sort((a, b) => a.due - b.due);
    const ids = [...due, ...later].slice(0, Math.max(1, spec.count)).map((x) => x.id);
    if (ids.length === 0) fail("invalid_input", "No tienes preguntas pendientes de repaso. ¡Buen trabajo!");
    const entries = ids.map((id) => this.registry.get(id)).filter((e): e is IndexedQuestion => Boolean(e));
    const sections = this.sectionsFor(entries, "Repaso de fallos");
    // Valor y resta de la convocatoria objetivo del perfil, como el núcleo.
    const base = this.targetScheme(profileId) ?? this.registry.scheme(null);
    if (!base) fail("data", "Falta el esquema por defecto.");
    return {
      title: "Repaso de fallos",
      subtitle: `${entries.length} preguntas · ${due.length > 0 ? `${Math.min(due.length, entries.length)} pendientes hoy` : "adelantando repasos"}`,
      scheme: this.derived(base, sections, "repaso", "Repaso · nota sobre 10 con penalización"),
      duration_minutes: null,
      feedback: spec.feedback,
      requires_case_choice: false,
      cases_to_choose: 1,
      use_reserves: false,
      with_prediction: false,
      total_questions: entries.length,
      drawn: false,
      pool_key: null,
      sections,
    };
  }

  private buildCase(spec: Extract<ExamSpec, { type: "case" }>): PaperSkeleton {
    const bank = this.registry.bank(spec.bank_id);
    const section = bank?.sections.find((s) => s.id === spec.section_id && s.kind === "case");
    if (!bank || !section) fail("not_found", "No se encuentra ese supuesto práctico.");
    const sections: SkeletonSection[] = [
      {
        id: `p2-${bank.id}-${section.id}`,
        part: 2,
        kind: "case",
        title: section.title,
        block: section.block,
        source: { bank_id: bank.id, section_id: section.id },
        questions: section.questions.map((q, i) => ({ id: q.id, display_number: String(i + 1), is_reserve: false })),
      },
    ];
    const base = this.registry.scheme(bank.scoring_scheme) ?? this.registry.scheme(null);
    if (!base) fail("data", "Falta el esquema por defecto.");
    const n = section.questions.length;
    return {
      title: section.title,
      subtitle: `${this.registry.bankLabel(bank)} · ${n} preguntas`,
      scheme: this.derived(base, sections, "supuesto", "Supuesto práctico · nota sobre 10 con penalización"),
      duration_minutes: spec.timed ? Math.max(10, Math.round(n * 2.5)) : null,
      feedback: spec.feedback,
      requires_case_choice: false,
      cases_to_choose: 1,
      use_reserves: false,
      with_prediction: false,
      total_questions: n,
      drawn: false,
      pool_key: null,
      sections,
    };
  }

  private hydrate(att: StoredAttempt): ExamPaper {
    const sk = att.skeleton;
    return {
      attempt_id: att.id,
      profile_id: att.profile_id,
      mode: att.mode,
      title: sk.title,
      subtitle: sk.subtitle,
      scheme: sk.scheme,
      duration_minutes: sk.duration_minutes,
      feedback: sk.feedback,
      requires_case_choice: sk.requires_case_choice,
      cases_to_choose: sk.cases_to_choose,
      sections: sk.sections.map((s) => {
        const src = s.source ? this.registry.section(s.source.bank_id, s.source.section_id) : undefined;
        return {
          id: s.id,
          part: s.part,
          kind: s.kind,
          title: s.title,
          block: s.block,
          statement: s.kind === "case" ? (src?.statement ?? null) : null,
          media: s.kind === "case" ? (src?.media ?? []).map((m) => this.registry.media(m)) : [],
          questions: s.questions.map((q) => this.registry.paperQuestion(q)).filter((q): q is NonNullable<typeof q> => q !== null),
        };
      }),
      started_at: att.started_at,
      total_questions: sk.total_questions,
      drawn: Boolean(sk.drawn),
    };
  }

  // ───────────────────────────── Simulacro sorpresa ─────────────────────────────

  private poolKeys(): PoolKey[] {
    const official = this.registry.banks
      .filter((b) => this.registry.isCompleteOfficial(b))
      .map((b) => `official:${b.id}`);
    const numbered = Array.from({ length: DEMO_DRAW_NUMBERED }, (_, i) => `numbered:${i + 1}`);
    return [...official, ...numbered];
  }

  private specFor(key: PoolKey, feedback: FeedbackMode, timed = true): ExamSpec {
    const [kind, id] = key.split(":") as [string, string];
    if (kind === "official") return { type: "official", bank_id: id, include_reserve: true, timed, feedback };
    return { type: "numbered", number: Number(id), feedback, timed };
  }

  private drawSpec(
    profileId: string,
    feedback: FeedbackMode,
    timed = true,
  ): { key: PoolKey; spec: ExamSpec; alreadyDone: boolean; poolSize: number } {
    const keys = this.poolKeys();
    if (keys.length === 0) fail("data", "No hay exámenes disponibles para el sorteo.");
    const lastDone = new Map<PoolKey, string>();
    for (const a of this.db.attempts) {
      if (a.profile_id !== profileId || a.status !== "finished" || !a.skeleton.pool_key) continue;
      const prev = lastDone.get(a.skeleton.pool_key);
      const at = a.finished_at ?? a.started_at;
      if (!prev || at > prev) lastDone.set(a.skeleton.pool_key, at);
    }
    const pending = keys.filter((k) => !lastDone.has(k));
    let key: PoolKey;
    if (pending.length > 0) key = pending[Math.floor(Math.random() * pending.length)] ?? keys[0]!;
    else {
      const sorted = [...keys].sort((a, b) => (lastDone.get(a) ?? "").localeCompare(lastDone.get(b) ?? ""));
      const oldest = sorted.slice(0, Math.max(1, Math.ceil(sorted.length / 2)));
      key = oldest[Math.floor(Math.random() * oldest.length)] ?? sorted[0]!;
    }
    return { key, spec: this.specFor(key, feedback, timed), alreadyDone: pending.length === 0, poolSize: keys.length };
  }

  drawRandomExam(profileId: string): RandomDraw {
    this.profile(profileId);
    const settings = this.settingsOf(profileId);
    const { key, spec, alreadyDone, poolSize } = this.drawSpec(profileId, settings.exam_feedback);
    this.db.draws[profileId] = key;
    this.persist();
    const preview = this.buildSkeleton(profileId, spec, mulberry32(1));
    const theory = preview.sections.filter((s) => s.kind === "theory");
    const cases = preview.sections.filter((s) => s.kind === "case");
    const questionCount = theory.reduce((n, s) => n + s.questions.filter((q) => !q.is_reserve).length, 0);
    const reserveCount = theory.reduce((n, s) => n + s.questions.filter((q) => q.is_reserve).length, 0);
    const caseQuestions = cases[0]?.questions.filter((q) => !q.is_reserve).length ?? 0;
    const isOfficial = spec.type === "official";
    const bank = isOfficial ? this.registry.bank(spec.bank_id) : undefined;
    return {
      spec,
      kind: isOfficial ? "official" : "numbered",
      title: isOfficial ? `Examen oficial · ${bank?.title ?? "TAI"}` : preview.title,
      subtitle: `${questionCount} preguntas${cases.length ? ` + supuesto práctico (${caseQuestions} preguntas, elige 1 de ${cases.length})` : ""} · ${preview.duration_minutes ? `${preview.duration_minutes} min` : "sin límite"}`,
      description: isOfficial
        ? bank?.id === DEMO_BANK_ID
          ? `Examen de muestra con el formato oficial: cuestionario${reserveCount ? ` con ${reserveCount} preguntas de reserva` : ""} y dos supuestos prácticos para elegir uno. Preguntas de elaboración propia (modo demo).`
          : "Réplica exacta del examen oficial, con sus preguntas de reserva y el supuesto práctico a elegir. Se corrige como lo hizo el tribunal."
        : "Simulacro con el formato completo del examen vigente y una composición fija: si lo repites, tendrás las mismas preguntas para medir tu progreso.",
      question_count: questionCount,
      case_count: cases.length,
      duration_minutes: preview.duration_minutes,
      already_done: alreadyDone,
      pool_size: poolSize,
    };
  }

  // ───────────────────────────── Intentos ─────────────────────────────

  private attempt(id: string): StoredAttempt {
    const a = this.db.attempts.find((x) => x.id === id);
    if (!a) fail("not_found", "No se encuentra ese intento.");
    return a;
  }

  getActiveAttempt(profileId: string): ActiveAttempt | null {
    const a = this.db.attempts
      .filter((x) => x.profile_id === profileId && x.status === "in_progress")
      .sort((x, y) => y.started_at.localeCompare(x.started_at))[0];
    if (!a) return null;
    return {
      paper: this.hydrate(a),
      progress: { attempt_id: a.id, answers: a.answers, chosen_case: a.chosen_case, elapsed_seconds: a.elapsed_seconds },
    };
  }

  private applyProgress(a: StoredAttempt, progress: ProgressPayload): void {
    const valid = new Set(a.skeleton.sections.flatMap((s) => s.questions.map((q) => q.id)));
    const answers: AnswerState[] = [];
    for (const ans of progress.answers ?? []) {
      if (!valid.has(ans.question_id)) continue;
      const locked = Object.prototype.hasOwnProperty.call(a.checked, ans.question_id);
      const choice = locked ? (a.checked[ans.question_id] ?? null) : ans.choice && LETTERS.includes(ans.choice) ? ans.choice : null;
      answers.push({ question_id: ans.question_id, choice, flagged: Boolean(ans.flagged) });
    }
    for (const [qid, choice] of Object.entries(a.checked))
      if (!answers.some((x) => x.question_id === qid)) answers.push({ question_id: qid, choice, flagged: false });
    a.answers = answers;
    const caseIds = new Set(a.skeleton.sections.filter((s) => s.kind === "case").map((s) => s.id));
    a.chosen_case = progress.chosen_case && caseIds.has(progress.chosen_case) ? progress.chosen_case : null;
    a.elapsed_seconds = Math.max(0, Math.round(progress.elapsed_seconds ?? 0));
  }

  saveProgress(progress: ProgressPayload): null {
    const a = this.attempt(progress.attempt_id);
    if (a.status !== "in_progress") fail("conflict", "Este examen ya no está en curso.");
    this.applyProgress(a, progress);
    this.persist();
    return null;
  }

  checkAnswer(attemptId: string, questionId: string, choice: Letter | null): AnswerFeedback {
    const a = this.attempt(attemptId);
    if (a.status !== "in_progress") fail("conflict", "Este examen ya no está en curso.");
    if (a.skeleton.feedback !== "immediate") fail("conflict", "Este examen se corrige al final.");
    if (!a.skeleton.sections.some((s) => s.questions.some((q) => q.id === questionId)))
      fail("not_found", "La pregunta no pertenece a este examen.");
    const entry = this.registry.get(questionId);
    if (!entry) fail("not_found", "No se encuentra la pregunta.");
    let chosen: Letter | null = choice && LETTERS.includes(choice) ? choice : null;
    if (Object.prototype.hasOwnProperty.call(a.checked, questionId)) chosen = a.checked[questionId] ?? null;
    else {
      a.checked[questionId] = chosen;
      const existing = a.answers.find((x) => x.question_id === questionId);
      if (existing) existing.choice = chosen;
      else a.answers.push({ question_id: questionId, choice: chosen, flagged: false });
      // En un supuesto a elegir, responder sin supuesto elegido lo selecciona.
      const section = a.skeleton.sections.find((s) => s.questions.some((q) => q.id === questionId));
      if (a.skeleton.requires_case_choice && section?.kind === "case" && !a.chosen_case && chosen) a.chosen_case = section.id;
      this.persist();
    }
    const q = entry.question;
    return {
      question_id: questionId,
      chosen,
      correct: q.answer,
      is_correct: !q.annulled && chosen !== null && chosen === q.answer,
      annulled: q.annulled,
      explanation: q.explanation,
      option_notes: q.option_notes,
      references: q.references,
    };
  }

  abandonExam(attemptId: string): null {
    const a = this.attempt(attemptId);
    if (a.status === "in_progress") a.status = "abandoned";
    this.persist();
    return null;
  }

  // ───────────────────────────── Corrección y resultados ─────────────────────────────

  private gradable(a: StoredAttempt): GradableSection[] {
    const answers = new Map(a.answers.map((x) => [x.question_id, x]));
    return a.skeleton.sections.map((s) => ({
      id: s.id,
      part: s.part,
      kind: s.kind,
      title: s.title,
      items: s.questions
        .map((sq) => {
          const e = this.registry.get(sq.id);
          if (!e) return null;
          return {
            question_id: sq.id,
            is_reserve: sq.is_reserve,
            answer: e.question.answer,
            annulled: e.question.annulled,
            chosen: answers.get(sq.id)?.choice ?? null,
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null),
    }));
  }

  /** Desglose por bloque y tema; el rendimiento neto resta `1/divisor` por error (3 libre, 4 interna). */
  private blockStats(items: { questionId: string; status: ItemStatus }[], divisor: number): { byBlock: BlockStat[]; byTopic: BlockStat[] } {
    const blocks = new Map<string, BlockStat>();
    const topics = new Map<string, BlockStat>();
    const bump = (map: Map<string, BlockStat>, key: string, init: () => BlockStat, status: ItemStatus) => {
      let s = map.get(key);
      if (!s) {
        s = init();
        map.set(key, s);
      }
      s.total++;
      if (status === "correct") s.correct++;
      else if (status === "wrong") s.wrong++;
      else s.blank++;
    };
    for (const { questionId, status } of items) {
      if (status !== "correct" && status !== "wrong" && status !== "blank") continue;
      const e = this.registry.get(questionId);
      if (!e) continue;
      const block = this.registry.blockOf(e);
      const topic = e.question.topic;
      bump(blocks, block ?? "sin_clasificar", () => this.emptyStat(block ?? "sin_clasificar", block, null), status);
      if (topic) bump(topics, topic, () => this.emptyStat(topic, block, topic), status);
    }
    const finish = (s: BlockStat): BlockStat => ({
      ...s,
      accuracy: s.total ? s.correct / s.total : 0,
      net_ratio: s.total ? (s.correct - s.wrong / divisor) / s.total : 0,
    });
    const order = (s: BlockStat) => (s.block ? BLOCKS.indexOf(s.block) : 9);
    return {
      byBlock: [...blocks.values()].map(finish).sort((a, b) => order(a) - order(b)),
      byTopic: [...topics.values()].map(finish).sort((a, b) => order(a) - order(b) || topicNumber(a.topic) - topicNumber(b.topic)),
    };
  }

  private emptyStat(key: string, block: BlockId | null, topic: string | null): BlockStat {
    const label = topic
      ? `${topic} · ${this.registry.topicTitle(topic) ?? "Tema sin título"}`
      : block
        ? `Bloque ${block} · ${this.registry.blockTitle(block)}`
        : "Sin clasificar";
    return { key, block, topic, label, total: 0, correct: 0, wrong: 0, blank: 0, accuracy: 0, net_ratio: 0 };
  }

  predictionFor(performance: PartPerformance[], observedGrade: number, settings: Settings | null, override: number | null): Prediction {
    const data = this.predictionData;
    const target =
      data.convocatorias.find((c) => c.id === (settings?.target_convocatoria ?? data.target)) ??
      data.convocatorias.find((c) => c.id === data.target) ??
      data.convocatorias[0];
    if (!target) fail("data", "Faltan datos de convocatorias para la predicción.");
    const ref = data.referenceFor(target.id);
    const targetScheme = this.registry.scheme(target.scoring_scheme) ?? this.registry.scheme(null);
    if (!targetScheme) fail("data", "Falta el esquema de la convocatoria objetivo.");
    return predict(performance, {
      targetScheme,
      target,
      reference: ref.conv,
      referenceRatios: ref.ratios,
      tiers: data.tiers,
      localities: data.localities,
      destinations: ref.destinations,
      preferred: settings?.preferred_localities ?? [],
      cutoffOverrideRatio: override,
      observedGrade,
      dataQuality: data.real ? (ref.realGrades && ref.destinations ? "real" : "partial") : "synthetic",
      syntheticNote: !data.real,
    });
  }

  private computeResult(a: StoredAttempt): AttemptResult {
    const settings = this.settingsOf(a.profile_id);
    const full = a.mode === "official" || a.mode === "simulacro";
    const scored = scoreExam({
      scheme: a.skeleton.scheme,
      sections: this.gradable(a),
      chosen_case: a.chosen_case,
      requires_case_choice: a.skeleton.requires_case_choice,
      use_reserves: a.skeleton.use_reserves,
      cutoff_override_ratio: full ? settings.cutoff_override_ratio : null,
    });
    const answers = new Map(a.answers.map((x) => [x.question_id, x]));
    const review: ReviewItem[] = [];
    const counted: { questionId: string; status: ItemStatus }[] = [];
    for (const s of a.skeleton.sections) {
      for (const sq of s.questions) {
        const e = this.registry.get(sq.id);
        if (!e) continue;
        const status = scored.statuses[sq.id] ?? "not_counted";
        const ans = answers.get(sq.id);
        counted.push({ questionId: sq.id, status });
        if (status === "not_counted" && !ans?.choice) continue;
        const q = e.question;
        review.push({
          question_id: q.id,
          section_id: s.id,
          part: s.part,
          display_number: sq.display_number,
          text: q.text,
          options: q.options,
          chosen: ans?.choice ?? null,
          correct: q.answer,
          status,
          is_reserve: sq.is_reserve,
          flagged: ans?.flagged ?? false,
          explanation: q.explanation,
          option_notes: q.option_notes,
          references: q.references,
          topic: q.topic,
          block: this.registry.blockOf(e),
          media: q.media.map((m) => this.registry.media(m)),
          source_label: this.registry.sourceLabel(e),
          outdated: q.outdated,
          outdated_note: q.outdated_note,
        });
      }
    }
    const { byBlock, byTopic } = this.blockStats(counted, penaltyDivisorOf(a.skeleton.scheme));
    const grade = scored.grade;
    let prediction: Prediction | null = null;
    if (full && a.skeleton.with_prediction) {
      const perf = this.performanceOf(grade.parts, a.skeleton.scheme);
      const observed = grade.max_grade > 0 ? (grade.total_grade / grade.max_grade) * 100 : 0;
      prediction = this.predictionFor(perf, observed, settings, settings.cutoff_override_ratio);
    }
    return {
      attempt_id: a.id,
      profile_id: a.profile_id,
      mode: a.mode,
      title: a.skeleton.title,
      started_at: a.started_at,
      finished_at: a.finished_at ?? nowIso(),
      elapsed_seconds: a.elapsed_seconds,
      duration_minutes: a.skeleton.duration_minutes,
      chosen_case: scored.effective_case,
      grade,
      by_block: byBlock,
      by_topic: byTopic,
      review,
      prediction,
      spec: a.spec,
      cases: a.skeleton.sections
        .filter((s) => s.kind === "case" && (!a.skeleton.requires_case_choice || !scored.effective_case || s.id === scored.effective_case))
        .flatMap((s) => {
          const src = s.source ? this.registry.section(s.source.bank_id, s.source.section_id) : undefined;
          return src?.statement
            ? [{ section_id: s.id, title: s.title, statement: src.statement, media: (src.media ?? []).map((m) => this.registry.media(m)) }]
            : [];
        }),
    };
  }

  private performanceOf(parts: PartScore[], scheme: ScoringScheme): PartPerformance[] {
    return parts.map((p) => ({
      kind: scheme.parts.find((x) => x.part === p.part)?.kind ?? (p.part === 1 ? "theory" : "case"),
      correct: p.correct,
      wrong: p.wrong,
      blank: p.blank,
    }));
  }

  private updateStats(a: StoredAttempt, result: AttemptResult): void {
    const stats = this.stats(a.profile_id);
    const at = a.finished_at ?? nowIso();
    const t = Date.parse(at);
    const answers = new Map(a.answers.map((x) => [x.question_id, x]));
    for (const item of result.review) {
      const e = this.registry.get(item.question_id);
      if (!e || e.question.annulled) continue;
      if (item.status === "not_counted" && !item.chosen) continue;
      const s: QuestionStat = stats[item.question_id] ?? {
        seen: 0,
        correct: 0,
        wrong: 0,
        blank: 0,
        last_answered_at: null,
        last_result: null,
        srs_box: 0,
        srs_due_at: null,
        flagged: false,
      };
      const outcome: "correct" | "wrong" | "blank" =
        item.chosen === null ? "blank" : item.chosen === item.correct ? "correct" : "wrong";
      s.seen++;
      s[outcome]++;
      s.last_result = outcome;
      s.last_answered_at = at;
      s.flagged = answers.get(item.question_id)?.flagged ?? false;
      if (outcome === "wrong") {
        s.srs_box = 1;
        s.srs_due_at = at;
      } else if (outcome === "correct" && s.srs_box >= 1 && s.srs_box < 5) {
        s.srs_box++;
        s.srs_due_at = new Date(t + (SRS_INTERVAL_DAYS[s.srs_box] ?? 1) * DAY_MS).toISOString();
      }
      stats[item.question_id] = s;
    }
  }

  submitExam(progress: ProgressPayload): AttemptResult {
    const a = this.attempt(progress.attempt_id);
    if (a.status !== "in_progress") fail("conflict", "Este examen ya se entregó o se abandonó.");
    this.applyProgress(a, progress);
    a.finished_at = nowIso();
    const result = this.computeResult(a);
    a.chosen_case = result.chosen_case;
    a.status = "finished";
    const tallies: PartTally[] = result.grade.parts.map((p) => ({
      part: p.part,
      kind: a.skeleton.scheme.parts.find((x) => x.part === p.part)?.kind ?? (p.part === 1 ? "theory" : "case"),
      correct: p.correct,
      wrong: p.wrong,
      blank: p.blank,
    }));
    a.summary = {
      total_grade: result.grade.total_grade,
      max_grade: result.grade.max_grade,
      passed: result.grade.passed,
      correct: tallies.reduce((n, p) => n + p.correct, 0),
      wrong: tallies.reduce((n, p) => n + p.wrong, 0),
      blank: tallies.reduce((n, p) => n + p.blank, 0),
      p_plaza: result.prediction?.p_plaza ?? null,
      parts: tallies,
    };
    this.updateStats(a, result);
    this.persist();
    return result;
  }

  listAttempts(profileId: string, limit: number | null): AttemptSummary[] {
    return this.db.attempts
      .filter((a) => a.profile_id === profileId && a.status !== "abandoned")
      .sort((a, b) => (b.finished_at ?? b.started_at).localeCompare(a.finished_at ?? a.started_at))
      .slice(0, limit ?? 50)
      .map((a) => ({
        attempt_id: a.id,
        mode: a.mode,
        title: a.skeleton.title,
        status: a.status === "finished" ? "finished" : "in_progress",
        started_at: a.started_at,
        finished_at: a.finished_at,
        elapsed_seconds: a.elapsed_seconds,
        total_grade: a.summary?.total_grade ?? null,
        max_grade: a.summary?.max_grade ?? null,
        passed: a.summary?.passed ?? null,
        correct: a.summary?.correct ?? 0,
        wrong: a.summary?.wrong ?? 0,
        blank: a.summary?.blank ?? 0,
        p_plaza: a.summary?.p_plaza ?? null,
      }));
  }

  getAttemptResult(attemptId: string): AttemptResult {
    const a = this.attempt(attemptId);
    if (a.status !== "finished") fail("conflict", "Este intento aún no se ha entregado.");
    return this.computeResult(a);
  }

  deleteAttempt(attemptId: string): null {
    this.attempt(attemptId);
    this.db.attempts = this.db.attempts.filter((a) => a.id !== attemptId);
    this.persist();
    return null;
  }

  // ───────────────────────────── Estadísticas y repaso ─────────────────────────────

  getStats(profileId: string): ProfileStats {
    this.profile(profileId);
    const finished = this.db.attempts
      .filter((a) => a.profile_id === profileId && a.status === "finished" && a.summary)
      .sort((a, b) => (a.finished_at ?? "").localeCompare(b.finished_at ?? ""));
    const full = finished.filter((a) => a.mode === "simulacro" || a.mode === "official");
    const norm = (a: StoredAttempt) =>
      a.summary && a.summary.max_grade > 0 ? (a.summary.total_grade / a.summary.max_grade) * 100 : 0;
    const correct = finished.reduce((n, a) => n + (a.summary?.correct ?? 0), 0);
    const wrong = finished.reduce((n, a) => n + (a.summary?.wrong ?? 0), 0);
    const blank = finished.reduce((n, a) => n + (a.summary?.blank ?? 0), 0);

    const activityMap = new Map<string, number>();
    for (const a of finished) {
      if (!a.finished_at || !a.summary) continue;
      const key = toLocalDateKey(new Date(a.finished_at));
      activityMap.set(key, (activityMap.get(key) ?? 0) + a.summary.correct + a.summary.wrong);
    }
    const today = now();
    const activity: { date: string; answered: number }[] = [];
    for (let i = ACTIVITY_DAYS - 1; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
      const key = toLocalDateKey(d);
      activity.push({ date: key, answered: activityMap.get(key) ?? 0 });
    }
    let streak = 0;
    for (let i = activity.length - 1; i >= 0; i--) {
      const day = activity[i];
      if (!day) break;
      if (day.answered > 0) streak++;
      else if (i === activity.length - 1) continue;
      else break;
    }

    const stats = this.stats(profileId);
    const items: { questionId: string; status: ItemStatus }[] = [];
    for (const [qid, s] of Object.entries(stats)) {
      for (let i = 0; i < s.correct; i++) items.push({ questionId: qid, status: "correct" });
      for (let i = 0; i < s.wrong; i++) items.push({ questionId: qid, status: "wrong" });
      for (let i = 0; i < s.blank; i++) items.push({ questionId: qid, status: "blank" });
    }
    const { byBlock, byTopic } = this.blockStats(items, penaltyDivisorOf(this.targetScheme(profileId) ?? this.registry.scheme(null)));
    const weakest = byTopic
      .filter((s) => s.total >= WEAK_TOPIC_MIN_ANSWERS)
      .sort((a, b) => a.net_ratio - b.net_ratio || a.accuracy - b.accuracy)
      .slice(0, 5);
    const t = today.getTime();
    const reviewDue = Object.values(stats).filter(
      (s) => s.srs_box >= 1 && s.srs_box <= 4 && (!s.srs_due_at || Date.parse(s.srs_due_at) <= t),
    ).length;

    let readiness: Prediction | null = null;
    const recent = full.slice(-READINESS_ATTEMPTS);
    if (recent.length > 0) {
      const agg = new Map<SectionKind, PartPerformance>();
      let wSum = 0;
      let gSum = 0;
      recent.forEach((a, i) => {
        const w = i + 1;
        wSum += w;
        gSum += w * norm(a);
        for (const p of a.summary?.parts ?? []) {
          const cur = agg.get(p.kind) ?? { kind: p.kind, correct: 0, wrong: 0, blank: 0 };
          cur.correct += w * p.correct;
          cur.wrong += w * p.wrong;
          cur.blank += w * p.blank;
          agg.set(p.kind, cur);
        }
      });
      const perf = [...agg.values()].map((p) => ({
        kind: p.kind,
        correct: Math.round(p.correct / wSum),
        wrong: Math.round(p.wrong / wSum),
        blank: Math.round(p.blank / wSum),
      }));
      const settings = this.settingsOf(profileId);
      readiness = this.predictionFor(perf, gSum / wSum, settings, settings.cutoff_override_ratio);
    }

    const grades = full.map(norm);
    return {
      profile_id: profileId,
      attempts_finished: finished.length,
      simulacros_finished: full.length,
      questions_answered: correct + wrong,
      distinct_questions_seen: Object.values(stats).filter((s) => s.seen > 0).length,
      correct,
      wrong,
      blank,
      accuracy: correct + wrong > 0 ? correct / (correct + wrong) : 0,
      average_grade: grades.length ? round(grades.reduce((s, g) => s + g, 0) / grades.length, 2) : null,
      best_grade: grades.length ? round(Math.max(...grades), 2) : null,
      last_grade: grades.length ? round(grades[grades.length - 1] ?? 0, 2) : null,
      streak_days: streak,
      study_seconds: finished.reduce((n, a) => n + a.elapsed_seconds, 0),
      grade_history: finished.map((a) => ({
        attempt_id: a.id,
        date: a.finished_at ?? a.started_at,
        mode: a.mode,
        title: a.skeleton.title,
        grade: a.summary?.total_grade ?? 0,
        max_grade: a.summary?.max_grade ?? 100,
        passed: a.summary?.passed ?? false,
      })),
      activity,
      by_block: byBlock,
      by_topic: byTopic,
      weakest_topics: weakest,
      review_due: reviewDue,
      readiness,
    };
  }

  getReviewSummary(profileId: string): ReviewSummary {
    this.profile(profileId);
    const stats = this.stats(profileId);
    const t = now().getTime();
    let due = 0;
    let learning = 0;
    let mastered = 0;
    let failed = 0;
    const byBlock = new Map<BlockId | null, { due: number; learning: number }>();
    for (const [qid, s] of Object.entries(stats)) {
      if (s.wrong > 0) failed++;
      if (s.srs_box === 5) mastered++;
      if (s.srs_box >= 1 && s.srs_box <= 4) {
        learning++;
        const isDue = !s.srs_due_at || Date.parse(s.srs_due_at) <= t;
        if (isDue) due++;
        const e = this.registry.get(qid);
        const block = e ? this.registry.blockOf(e) : null;
        const cur = byBlock.get(block) ?? { due: 0, learning: 0 };
        cur.learning++;
        if (isDue) cur.due++;
        byBlock.set(block, cur);
      }
    }
    return {
      due,
      learning,
      mastered,
      total_failed: failed,
      by_block: [...byBlock.entries()]
        .sort((a, b) => (a[0] ? BLOCKS.indexOf(a[0]) : 9) - (b[0] ? BLOCKS.indexOf(b[0]) : 9))
        .map(([block, v]) => ({ block, ...v })),
    };
  }

  // ───────────────────────────── Teoría ─────────────────────────────

  private theoryEntries(): DevTheory[] {
    if (this.theory) return this.theory;
    return DEMO_THEORY.map((t) => ({ ...t, title: null, reading_minutes: null }));
  }

  private theorySummary(t: DevTheory): TheorySummary {
    const words = t.content.split(/\s+/).filter(Boolean).length;
    return {
      topic: t.topic,
      block: t.block,
      title: t.title ?? this.registry.topicTitle(t.topic) ?? t.topic,
      summary: t.summary,
      reading_minutes: t.reading_minutes ?? Math.max(1, Math.round(words / 170)),
      key_points: t.key_points,
      question_count: this.registry.allQuestions().filter((e) => e.question.topic === t.topic).length,
      updated: t.updated,
    };
  }

  getTheoryIndex(): TheorySummary[] {
    const order = (topic: string) => {
      const [b, n] = topic.split(".");
      return BLOCKS.indexOf((b ?? "I") as BlockId) * 100 + Number(n ?? 0);
    };
    return [...this.theoryEntries()].sort((a, b) => order(a.topic) - order(b.topic)).map((t) => this.theorySummary(t));
  }

  getTheory(topicId: string): TheoryTopic {
    const t = this.theoryEntries().find((x) => x.topic === topicId);
    if (!t) fail("not_found", "Todavía no hay teoría para ese tema.");
    return { ...this.theorySummary(t), content: t.content, sources: t.sources };
  }

  // ───────────────────────────── Licencia ─────────────────────────────

  simulateDestinations(
    profileId: string | null,
    attemptId: string | null,
    input: ManualGradeInput | null,
  ): DestinationSimulation {
    let observed: number;
    let prediction: Prediction | null;
    let owner = profileId;
    if (attemptId) {
      const r = this.getAttemptResult(attemptId);
      owner = r.profile_id;
      observed = r.grade.max_grade > 0 ? (r.grade.total_grade / r.grade.max_grade) * 100 : 0;
      prediction = r.prediction;
      if (!prediction) {
        const scheme = this.registry.scheme(null);
        if (!scheme) fail("data", "Falta el esquema por defecto.");
        prediction = this.calculateGrade(owner, {
          scheme_id: scheme.id,
          parts: r.grade.parts.map((p) => ({ part: p.part, correct: p.correct, wrong: p.wrong, blank: p.blank })),
          cutoff_override_ratio: null,
        }).prediction;
      }
    } else if (input) {
      const res = this.calculateGrade(profileId, input);
      observed = res.grade.max_grade > 0 ? (res.grade.total_grade / res.grade.max_grade) * 100 : 0;
      prediction = res.prediction;
    } else {
      return fail("invalid_input", "Indica un examen entregado o una nota para simular los destinos.");
    }
    const preferred = owner ? this.settingsOf(owner).preferred_localities : [];
    return simulateDestinationsMock(observed, prediction, this.destinationCalls, preferred);
  }

  getLicenseText(): string {
    if (this.licenseText) return this.licenseText;
    return [
      "GNU GENERAL PUBLIC LICENSE",
      "Version 3, 29 June 2007",
      "",
      "Copyright (C) 2007 Free Software Foundation, Inc. <https://fsf.org/>",
      "Everyone is permitted to copy and distribute verbatim copies of this license document, but changing it is not allowed.",
      "",
      "[Modo demo] La app de escritorio incluye aquí el texto íntegro de la licencia (fichero LICENSE del repositorio).",
      `Puedes leerlo en ${LICENSE_URL}`,
    ].join("\n");
  }

  // ───────────────────────────── Calculadora ─────────────────────────────

  calculateGrade(profileId: string | null, input: ManualGradeInput): CalculatorResult {
    const scheme = this.registry.scheme(input.scheme_id);
    if (!scheme) fail("not_found", "No se encuentra ese esquema de puntuación.");
    const override = input.cutoff_override_ratio;
    if (override !== null && (override < 0 || override > 1)) fail("invalid_input", "El corte debe estar entre 0 y 1.");
    const parts: PartScore[] = scheme.parts.map((def) => {
      const inp = input.parts.find((p) => p.part === def.part) ?? { part: def.part, correct: 0, wrong: 0, blank: 0 };
      const n = def.questions * (def.kind === "case" ? (def.cases_to_choose ?? 1) : 1);
      const c = Math.max(0, Math.floor(inp.correct));
      const w = Math.max(0, Math.floor(inp.wrong));
      if (c + w > n) fail("invalid_input", `En la parte ${def.part}, aciertos y fallos (${c + w}) superan las ${n} preguntas.`);
      const penalty = def.penalty_divisor ? (def.value * w) / def.penalty_divisor : 0;
      return {
        part: def.part,
        title: def.title,
        counted: n,
        correct: c,
        wrong: w,
        blank: n - c - w,
        annulled: 0,
        value: def.value,
        penalty_divisor: def.penalty_divisor,
        penalty_points: round(penalty),
        direct: round(def.value * c - penalty),
        max_direct: round(def.value * n),
      };
    });
    const graded = gradeUnits(scheme, parts, override);
    const grade = {
      scheme_id: scheme.id,
      parts,
      units: graded.units,
      total_grade: graded.total,
      max_grade: graded.max,
      passed: graded.passed,
      notes: graded.notes,
    };
    const settings = profileId && this.db.profiles.some((p) => p.id === profileId) ? this.settingsOf(profileId) : null;
    const observed = graded.max > 0 ? (graded.total / graded.max) * 100 : 0;
    const prediction = this.predictionFor(this.performanceOf(parts, scheme), observed, settings, override);
    return { grade, prediction };
  }

  // ───────────────────────────── Despacho de comandos ─────────────────────────────

  dispatch(command: string, args: Record<string, unknown> = {}): unknown {
    const str = (k: string) => args[k] as string;
    switch (command) {
      case "get_app_info":
        return this.getAppInfo();
      case "get_catalog":
        return this.getCatalog();
      case "list_localities":
        return this.listLocalities();
      case "list_profiles":
        return this.listProfiles();
      case "create_profile":
        return this.createProfile(str("name"), str("color"), (args.avatar as string | null) ?? null);
      case "update_profile":
        return this.updateProfile(str("profile_id"), str("name"), str("color"), (args.avatar as string | null) ?? null);
      case "delete_profile":
        return this.deleteProfile(str("profile_id"));
      case "touch_profile":
        return this.touchProfile(str("profile_id"));
      case "get_settings":
        return this.getSettings(str("profile_id"));
      case "update_settings":
        return this.updateSettings(str("profile_id"), args.settings as Settings);
      case "start_exam":
        return this.startExam(str("profile_id"), args.spec as ExamSpec);
      case "get_active_attempt":
        return this.getActiveAttempt(str("profile_id"));
      case "save_progress":
        return this.saveProgress(args.progress as ProgressPayload);
      case "check_answer":
        return this.checkAnswer(str("attempt_id"), str("question_id"), (args.choice as Letter | null) ?? null);
      case "submit_exam":
        return this.submitExam(args.progress as ProgressPayload);
      case "abandon_exam":
        return this.abandonExam(str("attempt_id"));
      case "list_attempts":
        return this.listAttempts(str("profile_id"), (args.limit as number | null) ?? null);
      case "get_attempt_result":
        return this.getAttemptResult(str("attempt_id"));
      case "delete_attempt":
        return this.deleteAttempt(str("attempt_id"));
      case "get_stats":
        return this.getStats(str("profile_id"));
      case "get_review_summary":
        return this.getReviewSummary(str("profile_id"));
      case "calculate_grade":
        return this.calculateGrade((args.profile_id as string | null) ?? null, args.input as ManualGradeInput);
      case "simulate_destinations":
        return this.simulateDestinations(
          (args.profile_id as string | null) ?? null,
          (args.attempt_id as string | null) ?? null,
          (args.input as ManualGradeInput | null) ?? null,
        );
      case "draw_random_exam":
        return this.drawRandomExam(str("profile_id"));
      case "get_theory_index":
        return this.getTheoryIndex();
      case "get_theory":
        return this.getTheory(str("topic_id"));
      case "get_license_text":
        return this.getLicenseText();
      default:
        return fail("not_found", `Comando desconocido en el modo demo: «${command}».`);
    }
  }
}

/** Título descriptivo de un supuesto («Cita previa…»); si el banco no lo tiene, su etiqueta. */
function caseHeading(title: string, fallback: string): string {
  const rest = title.replace(/^(?:(?:primera|segunda)\s+parte\s*·\s*)?(?:supuesto\s+[\wIVX]+)?\s*(?:·\s*)?/i, "").trim();
  return rest || fallback;
}

function topicNumber(topic: string | null): number {
  if (!topic) return 0;
  return Number(topic.split(".")[1] ?? 0);
}
