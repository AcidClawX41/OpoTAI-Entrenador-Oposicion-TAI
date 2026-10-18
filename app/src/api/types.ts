// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
/**
 * OpoTAI · Contrato IPC entre la interfaz (TypeScript) y el núcleo (Rust).
 *
 * FUENTE DE VERDAD de los tipos que viajan por `invoke`. El núcleo Rust
 * (`crates/tai-core/src/api.rs`) los serializa EXACTAMENTE con esta forma:
 *   - claves en snake_case (serde por defecto),
 *   - enums simples como strings snake_case,
 *   - uniones discriminadas con el campo `type` (serde `#[serde(tag = "type")]`),
 *   - `null` para opcionales (Option<T> en Rust; nunca se omiten las claves).
 *
 * Los comandos y su semántica se describen en `docs/CONTRATO-API.md`.
 * Autor: Eric Valls Gramunt.
 */

// ───────────────────────────── Primitivos ─────────────────────────────

export type Letter = "A" | "B" | "C" | "D";
export type BlockId = "I" | "II" | "III" | "IV";
export type Access = "libre" | "promocion_interna";
export type BankKind = "official" | "practice";
export type SectionKind = "theory" | "case";
export type FeedbackMode = "immediate" | "end";
export type ExamMode = "official" | "simulacro" | "practice" | "review" | "case";
export type QuestionSource = "all" | "unseen" | "failed" | "flagged";
export type TierId = "gran_ciudad" | "ciudad_media" | "pueblo";
/** Fecha/hora ISO 8601 en UTC, p. ej. "2026-10-11T08:30:00Z". */
export type IsoDateTime = string;

/** Error que devuelven los comandos (la promesa de `invoke` se rechaza con este objeto). */
export interface ApiError {
  code:
    | "not_found"
    | "invalid_input"
    | "conflict"
    | "storage"
    | "data"
    | "internal";
  message: string; // mensaje en castellano apto para mostrar al usuario
}

// ───────────────────────────── Información y catálogo ─────────────────────────────

export interface AppInfo {
  name: string; // "OpoTAI"
  version: string; // versión semántica de la app (Cargo.toml del workspace), p. ej. "1.0.0"
  git_commit: string | null; // commit corto con el que se compiló, si se conoce
  author: string; // "Eric Valls Gramunt"
  copyright: string; // "© 2026 Eric Valls Gramunt"
  license: string; // identificador SPDX: "GPL-3.0-or-later"
  license_name: string; // "GNU General Public License v3.0 o posterior"
  repository: string;
  data_updated: string | null; // fecha de los metadatos (convocatorias.json → updated)
  banks: number;
  questions: number; // preguntas totales (incluye reservas)
  questions_with_explanation: number;
  official_exams: number;
  theory_topics: number; // temas con teoría disponible
  db_path: string; // ruta del fichero SQLite del usuario
}

export interface Media {
  path: string; // relativa a data/banks/, p. ej. "assets/tai-li-2024/q12.png"
  alt: string;
  /** Imagen lista para <img src>: data URI (base64) que rellena el núcleo. */
  data_url: string | null;
}

export interface Topic {
  id: string; // "IV.7"
  block: BlockId;
  number: number;
  title: string;
  keywords: string[];
}

export interface Block {
  id: BlockId;
  title: string;
  topics: Topic[];
}

export interface Temario {
  convocatoria: string;
  source_title: string;
  source_url: string;
  blocks: Block[];
}

export interface SectionSummary {
  id: string;
  part: number;
  kind: SectionKind;
  title: string;
  block: BlockId | null;
  question_count: number;
  reserve_count: number;
  /** Enunciado del supuesto (Markdown) con las figuras sustituidas por un rótulo; null en teoría. */
  statement: string | null;
}

export interface BankSummary {
  id: string;
  kind: BankKind;
  title: string;
  description: string | null;
  access: Access | null;
  year: number | null;
  convocatoria: string | null;
  exam_date: string | null; // YYYY-MM-DD
  duration_minutes: number | null;
  scoring_scheme: string | null;
  question_count: number; // sin reservas
  reserve_count: number;
  annulled_count: number;
  explained_count: number;
  case_count: number; // supuestos prácticos
  sections: SectionSummary[];
  source_urls: string[];
  answer_key: "definitiva" | "provisional" | "propia";
  /** Banco con la otra parte del mismo examen oficial (p. ej. el 2.º ejercicio de 2018, publicado
   *  aparte): en el principal, el ejercicio que añade su réplica oficial; en el secundario, el
   *  principal cuya réplica completa lo incluye. */
  companion_bank_id: string | null;
  /** La réplica oficial de este banco es el examen completo (1.ª parte + supuesto práctico), por sí
   *  mismo o con companion_bank_id. */
  complete_exam: boolean;
}

export interface ScoringPart {
  part: number;
  title: string;
  kind: SectionKind;
  questions: number; // por supuesto si kind = "case"
  reserve: number;
  value: number;
  penalty_divisor: number | null; // 3 → cada error resta value/3
  cases_offered: number | null;
  cases_to_choose: number | null;
}

export interface GradingUnit {
  parts: number[];
  max_grade: number;
  pass_grade: number;
  min_direct_ratio: number;
  cutoff_direct: number | null;
  cutoff_note: string | null;
}

export interface ScoringScheme {
  id: string;
  title: string;
  access: Access;
  convocatoria: string | null;
  duration_minutes: number;
  parts: ScoringPart[];
  grading: { units: GradingUnit[] };
  notes: string | null;
}

export interface ConvocatoriaSummary {
  id: string; // "li-2024"
  access: Access;
  year: number;
  title: string;
  exam_date: string | null;
  status: "convocada" | "examen_realizado" | "finalizada";
  scoring_scheme: string | null;
  plazas_total: number | null;
  presentados: number | null;
  aptos: number | null;
  cutoff_direct: number | null;
  cutoff_max_direct: number | null;
  cutoff_basis: "floor" | "rank" | "unknown" | null;
  has_grades: boolean;
  has_destinations: boolean;
  sources: { title: string; url: string }[];
}

export interface TierInfo {
  id: TierId;
  order: number;
  label: string;
  description: string;
}

export interface LocalityInfo {
  name: string;
  province: string;
  population: number | null;
  is_provincial_capital: boolean;
  tier: TierId;
  /** Fracción de plazas adjudicadas en esta localidad en la convocatoria de referencia (0–1). */
  share_of_plazas: number | null;
}

export interface CatalogInfo {
  banks: BankSummary[];
  temario: Temario | null;
  schemes: ScoringScheme[];
  default_scheme: string;
  convocatorias: ConvocatoriaSummary[];
  target_convocatoria: string | null;
  tiers: TierInfo[];
}

// ───────────────────────────── Perfiles y ajustes ─────────────────────────────

export interface Profile {
  id: string; // uuid
  name: string;
  color: string; // "#7c3aed"
  /** Emoji (≤ 16 caracteres), imagen propia de cualquier proporción como data URL
   *  `data:image/png|jpeg|webp|gif;base64,…` (≤ 2 MB: la interfaz la reduce a 1024 px de lado
   *  mayor y la recodifica, lo que elimina los metadatos EXIF; un GIF animado se guarda tal cual)
   *  o null (se muestran iniciales). Se guarda solo en local. */
  avatar: string | null;
  created_at: IsoDateTime;
  last_active_at: IsoDateTime | null;
}

export interface Settings {
  theme: "system" | "light" | "dark";
  accent: string; // color hex del acento
  default_feedback: FeedbackMode; // corrección en tests de práctica
  /** Corrección en simulacros y exámenes oficiales: "end" = como el examen real (por defecto),
   *  "immediate" = modo estudio (acierto/fallo y explicación tras cada respuesta). */
  exam_feedback: FeedbackMode;
  /** Efectos de sonido minimalistas (acierto, fallo, navegación). Nunca suena al dejar en blanco. */
  sound_enabled: boolean;
  sound_volume: number; // 0–1
  /** Al abrir la app se asigna un simulacro aleatorio que el usuario no puede elegir. */
  random_exam_on_startup: boolean;
  show_timer: boolean;
  confirm_before_submit: boolean;
  keyboard_shortcuts: boolean;
  /** Convocatoria objetivo para la predicción; null = la de los datos (target_convocatoria). */
  target_convocatoria: string | null;
  /** Corte personalizado (0–1, ratio de la puntuación directa máxima); null = estimación automática. */
  cutoff_override_ratio: number | null;
  /** Hasta 3 localidades preferidas (nombres de LocalityInfo.name). */
  preferred_localities: string[];
  /** Fecha prevista del examen (YYYY-MM-DD) para la cuenta atrás; null = sin fecha. */
  exam_date: string | null;
}

// ───────────────────────────── Generación de exámenes ─────────────────────────────

export type ExamSpec =
  | {
      /** Réplica exacta de un examen oficial. */
      type: "official";
      bank_id: string;
      include_reserve: boolean; // true = como el examen real (las reservas sustituyen anuladas)
      timed: boolean; // usar la duración oficial
      feedback: FeedbackMode; // "end" = como el examen real
      /** 1.ª parte con bloque a elegir (p. ej. 2016: comunes + bloque III o IV); null = el primero. */
      theory_block?: BlockId | null;
    }
  | {
      /** Simulacro con el formato de un esquema oficial (por defecto el de la convocatoria objetivo). */
      type: "simulacro";
      scheme_id: string | null; // null = default_scheme
      part1_questions: number | null; // null = las del esquema (p. ej. 80)
      include_case: boolean; // incluir la segunda parte (supuesto práctico a elegir)
      duration_minutes: number | null; // null = la del esquema; 0 = sin límite
      prefer_unseen: boolean;
      seed: number | null;
      feedback: FeedbackMode;
      /** «Simulacro Freestyle»: formato real completo con preguntas al azar de todas las
       *  convocatorias (ingreso libre y promoción interna, cualquier año). Por defecto `false`. */
      freestyle?: boolean;
    }
  | {
      /** Simulacro numerado («Simulacro OpoTAI n.º N»): composición fija y determinista
       *  (formato completo del esquema por defecto, preferentemente con preguntas oficiales). */
      type: "numbered";
      number: number; // 1..numbered_simulacros (ver RandomDraw.pool_size)
      feedback: FeedbackMode;
      /** true (por defecto) = cronómetro con la duración oficial («examen real»);
       *  false = sin límite de tiempo («aprendizaje»). */
      timed?: boolean;
    }
  | {
      /** Simulacro sorpresa: el NÚCLEO elige al azar (el usuario no puede elegir) entre los exámenes
       *  oficiales completos y los simulacros numerados, priorizando los que el perfil no ha hecho.
       *  Equivale a draw_random_exam + start_exam. */
      type: "random";
      feedback: FeedbackMode;
      /** true (por defecto) = el examen sorteado lleva el cronómetro oficial; false = sin límite. */
      timed?: boolean;
    }
  | {
      /** Test de práctica filtrado por bloques/temas/bancos. */
      type: "practice";
      blocks: BlockId[]; // vacío = todos
      topics: string[]; // vacío = todos
      bank_ids: string[]; // vacío = todos
      include_cases: boolean; // admitir preguntas de supuestos prácticos
      source: QuestionSource;
      count: number;
      feedback: FeedbackMode;
      duration_minutes: number | null; // null/0 = sin límite
      seed: number | null;
    }
  | {
      /** Repaso espaciado de preguntas falladas. */
      type: "review";
      count: number;
      feedback: FeedbackMode;
    }
  | {
      /** Practicar un supuesto práctico concreto. */
      type: "case";
      bank_id: string;
      section_id: string;
      feedback: FeedbackMode;
      timed: boolean;
    };

export interface PaperQuestion {
  id: string;
  number: number; // número original en su examen
  display_number: string; // número en este examen: "1".."80", "R1".. para reservas
  text: string; // Markdown
  options: string[]; // 4 opciones Markdown (A..D)
  is_reserve: boolean;
  topic: string | null;
  block: BlockId | null;
  media: Media[];
  source_label: string; // p. ej. "Oficial TAI-LI 2024 · 1.ª parte · n.º 12"
}

export interface PaperSection {
  id: string; // id único en el examen (p. ej. "p1", "p2-tai-li-2024-p2-s1")
  part: number;
  kind: SectionKind;
  title: string;
  block: BlockId | null;
  statement: string | null; // enunciado del supuesto (Markdown)
  media: Media[];
  questions: PaperQuestion[];
}

export interface ExamPaper {
  attempt_id: string;
  profile_id: string;
  mode: ExamMode;
  title: string;
  subtitle: string | null;
  scheme: ScoringScheme; // esquema con el que se puntúa este examen
  duration_minutes: number | null; // null = sin límite
  feedback: FeedbackMode;
  requires_case_choice: boolean; // hay que elegir supuesto en la 2.ª parte
  cases_to_choose: number;
  sections: PaperSection[];
  started_at: IsoDateTime;
  total_questions: number; // puntuables, sin reservas ni supuestos no elegidos
  drawn: boolean; // true si procede del sorteo aleatorio (simulacro sorpresa)
}

/** Resultado del sorteo del simulacro sorpresa (lo decide el núcleo, no el usuario). */
export interface RandomDraw {
  spec: ExamSpec; // spec concreta (official o numbered) para pasar a start_exam
  kind: "official" | "numbered";
  title: string; // "Examen oficial · TAI ingreso libre 2023" | "Simulacro OpoTAI n.º 7"
  subtitle: string | null; // "80 preguntas + supuesto práctico · 120 min"
  description: string; // texto breve para la pantalla de presentación
  question_count: number;
  case_count: number;
  duration_minutes: number | null;
  already_done: boolean; // el perfil ya lo había hecho (todos hechos → se repite el menos reciente)
  pool_size: number; // nº de exámenes en el sorteo
}

export interface AnswerState {
  question_id: string;
  choice: Letter | null;
  flagged: boolean; // marcada como dudosa
}

export interface ProgressPayload {
  attempt_id: string;
  answers: AnswerState[];
  chosen_case: string | null; // PaperSection.id del supuesto elegido
  elapsed_seconds: number;
}

export interface ActiveAttempt {
  paper: ExamPaper;
  progress: ProgressPayload;
}

/** Respuesta inmediata en modo feedback = "immediate". */
export interface AnswerFeedback {
  question_id: string;
  chosen: Letter | null;
  correct: Letter | null;
  is_correct: boolean;
  annulled: boolean;
  explanation: string | null;
  option_notes: (string | null)[] | null;
  references: string[];
}

// ───────────────────────────── Resultados ─────────────────────────────

export type ItemStatus = "correct" | "wrong" | "blank" | "annulled" | "not_counted";

export interface ReviewItem {
  question_id: string;
  section_id: string;
  part: number;
  display_number: string;
  text: string;
  options: string[];
  chosen: Letter | null;
  correct: Letter | null;
  status: ItemStatus;
  is_reserve: boolean;
  flagged: boolean;
  explanation: string | null;
  option_notes: (string | null)[] | null;
  references: string[];
  topic: string | null;
  block: BlockId | null;
  media: Media[];
  source_label: string;
  outdated: boolean;
  outdated_note: string | null;
}

export interface PartScore {
  part: number;
  title: string;
  counted: number; // preguntas contabilizadas
  correct: number;
  wrong: number;
  blank: number;
  annulled: number;
  value: number;
  penalty_divisor: number | null;
  penalty_points: number; // puntos restados por errores
  direct: number; // puntuación directa
  max_direct: number;
}

export interface UnitGrade {
  parts: number[];
  direct: number;
  max_direct: number;
  cutoff_direct: number;
  cutoff_source: "official" | "estimated" | "user" | "floor";
  grade: number;
  pass_grade: number;
  max_grade: number;
  passed: boolean;
  margin_direct: number; // direct − cutoff (negativo si no llega)
  /** Parte eliminada: no se corrige porque no se superó la anterior (cuenta 0). */
  ungraded?: boolean;
  /** Si `ungraded`: nota que le habría correspondido por su directa (orientativa, no cuenta). */
  would_be_grade?: number | null;
}

export interface GradeResult {
  scheme_id: string;
  parts: PartScore[];
  units: UnitGrade[];
  total_grade: number;
  max_grade: number;
  passed: boolean;
  /** Notas legibles: supuesto no elegido, reservas aplicadas, etc. */
  notes: string[];
}

export interface BlockStat {
  key: string; // "I" | "IV.7" | "sin_clasificar"
  block: BlockId | null;
  topic: string | null;
  label: string;
  total: number;
  correct: number;
  wrong: number;
  blank: number;
  accuracy: number; // correct / total (0–1)
  net_ratio: number; // (correct − wrong/d) / total con d = 3 (libre) o 4 (interna); puede ser negativo
}

export interface TierProbability {
  tier: TierId;
  label: string;
  description: string;
  probability: number; // 0–1
  share_of_plazas: number | null; // reparto histórico de plazas (0–1)
}

export interface CityProbability {
  locality: string;
  province: string;
  tier: TierId;
  probability: number; // 0–1: probabilidad de que queden plazas allí al elegir
  share_of_plazas: number; // 0–1
}

/** Cuantiles del puesto o número de orden estimado. */
export interface RankEstimate {
  p10: number;
  p50: number;
  p90: number;
}

/** Calidad de los datos usados en una estimación. */
export type DataQuality = "real" | "partial" | "synthetic";

export interface Prediction {
  target_convocatoria: string;
  target_label: string; // "Convocatoria 2025 · 1.030 plazas"
  plazas: number | null;
  observed_grade: number; // nota del intento (0–100)
  expected_grade: number; // mediana simulada en el examen objetivo
  p_pass: number; // probabilidad de superar el corte (0–1)
  p_plaza: number; // probabilidad de obtener plaza (0–1)
  cutoff_ratio: number; // corte estimado como ratio de la directa máxima
  estimated_rank: RankEstimate | null;
  estimated_percentile: number | null; // 0–1 entre presentados (1 = el mejor)
  tiers: TierProbability[]; // ordenados por TierInfo.order
  /** Madrid concentra ~76–88 % de las plazas y casi nunca se agota, así que «gran ciudad» sale alta
   *  para cualquiera con plaza: esta cifra (0–1) indica si quedarían plazas en grandes ciudades
   *  DISTINTAS de Madrid (Barcelona, València, Sevilla…). null si no hay datos de destinos. */
  p_big_city_outside_madrid: number | null;
  top_cities: CityProbability[]; // principales ciudades por volumen de plazas
  preferred: CityProbability[]; // localidades preferidas del usuario
  verdict: string; // resumen corto en castellano
  reasoning: string[]; // pasos del razonamiento
  assumptions: string[]; // supuestos del modelo
  data_quality: DataQuality;
}

/** Enunciado de un supuesto práctico de un intento (para revisar el resultado más tarde). */
export interface CaseStatement {
  section_id: string;
  title: string;
  statement: string; // Markdown con imágenes en data URI
  media: Media[];
}

export interface AttemptResult {
  attempt_id: string;
  profile_id: string;
  mode: ExamMode;
  title: string;
  started_at: IsoDateTime;
  finished_at: IsoDateTime;
  elapsed_seconds: number;
  duration_minutes: number | null;
  chosen_case: string | null;
  grade: GradeResult;
  by_block: BlockStat[];
  by_topic: BlockStat[];
  review: ReviewItem[];
  prediction: Prediction | null; // en simulacros y exámenes oficiales completos
  /** Especificación con la que se generó (para «Repetir este examen»). */
  spec: ExamSpec | null;
  /** Enunciados de los supuestos del intento (el elegido o, si no había que elegir, todos). */
  cases: CaseStatement[];
}

export interface AttemptSummary {
  attempt_id: string;
  mode: ExamMode;
  title: string;
  status: "in_progress" | "finished";
  started_at: IsoDateTime;
  finished_at: IsoDateTime | null;
  elapsed_seconds: number;
  total_grade: number | null;
  max_grade: number | null;
  passed: boolean | null;
  correct: number;
  wrong: number;
  blank: number;
  p_plaza: number | null;
}

// ───────────────────────────── Estadísticas y repaso ─────────────────────────────

export interface GradePoint {
  attempt_id: string;
  date: IsoDateTime;
  mode: ExamMode;
  title: string;
  grade: number;
  max_grade: number;
  passed: boolean;
}

export interface ActivityDay {
  date: string; // YYYY-MM-DD
  answered: number;
}

export interface ProfileStats {
  profile_id: string;
  attempts_finished: number;
  simulacros_finished: number;
  questions_answered: number;
  distinct_questions_seen: number;
  correct: number;
  wrong: number;
  blank: number;
  accuracy: number; // 0–1
  average_grade: number | null; // media de simulacros/oficiales (0–100)
  best_grade: number | null;
  last_grade: number | null;
  streak_days: number;
  study_seconds: number;
  grade_history: GradePoint[]; // cronológico
  activity: ActivityDay[]; // últimos 120 días
  by_block: BlockStat[];
  by_topic: BlockStat[];
  weakest_topics: BlockStat[]; // hasta 5, con mínimo de respuestas
  review_due: number;
  /** Predicción con la media ponderada de los últimos simulacros (null si no hay). */
  readiness: Prediction | null;
}

export interface ReviewSummary {
  due: number; // pendientes hoy
  learning: number; // falladas en seguimiento
  mastered: number; // superadas varias veces seguidas
  total_failed: number; // preguntas distintas falladas alguna vez
  by_block: { block: BlockId | null; due: number; learning: number }[];
}

// ───────────────────────────── Teoría ─────────────────────────────

export interface TheorySummary {
  topic: string; // "IV.7"
  block: BlockId;
  title: string; // título oficial del tema
  summary: string; // 1–2 frases
  reading_minutes: number;
  key_points: string[]; // ideas clave para memorizar
  question_count: number; // preguntas del banco clasificadas en este tema
  updated: string | null; // YYYY-MM-DD
}

export interface TheoryTopic extends TheorySummary {
  content: string; // Markdown completo del tema
  sources: { title: string; url: string }[];
}

// ───────────────────────────── Calculadora ─────────────────────────────

export interface ManualPartInput {
  part: number;
  correct: number;
  wrong: number;
  blank: number;
}

export interface ManualGradeInput {
  scheme_id: string;
  parts: ManualPartInput[];
  /** Corte personalizado por unidad (ratio 0–1); null = oficial/estimado. */
  cutoff_override_ratio: number | null;
}

export interface CalculatorResult {
  grade: GradeResult;
  prediction: Prediction;
}

// ───────────────────────────── Simulador de destinos ─────────────────────────────

/** "projection": convocatoria objetivo con el último reparto; "historical": réplica real. */
export type ScenarioKind = "projection" | "historical";

/** Plazas de una provincia en un escenario (mapa). Probabilidades condicionadas a tener plaza. */
export interface ProvinceAvailability {
  province: string; // tal y como figura en el BOE ("Illes Balears", "Bizkaia"…)
  posts: number; // plazas adjudicadas en total en esa convocatoria
  available_posts: number; // media de plazas aún libres al llegar tu turno
  p_available: number; // prob. de que quede al menos una al elegir
  p_likely: number; // prob. de acabar allí (lo que eligieron los números de orden cercanos)
  last_order: number; // último número de orden que obtuvo plaza allí
}

export interface LocalityAvailability {
  locality: string;
  province: string;
  tier: TierId;
  posts: number;
  available_posts: number;
  p_available: number;
  p_likely: number;
  last_order: number;
}

/** Tipo de plaza: ámbito del organismo de destino ("Agencia Tributaria", "Defensa"…). */
export interface CategoryAvailability {
  category: string;
  posts: number;
  available_posts: number;
  p_likely: number;
}

/** Destino concreto que eligieron personas con un número de orden cercano al tuyo. */
export interface LikelyDestination {
  locality: string;
  province: string;
  category: string;
  organism: string | null; // texto del BOE (abreviado)
  unit: string | null; // centro directivo (texto del BOE)
  probability: number;
}

export interface DestinationScenario {
  id: string; // "proyeccion" | id de convocatoria ("li-2024")
  kind: ScenarioKind;
  label: string;
  dataset: string; // convocatoria cuyos destinos se usan
  year: number;
  aprobados: number; // personas con destino (plazas objetivo en la proyección)
  posts_total: number; // adjudicaciones con destino del conjunto de datos
  p_pass: number;
  p_plaza: number; // prob. de obtener plaza (y elegir destino)
  equivalent_grade: number | null; // mediana de la nota con la escala de esa convocatoria
  rank: RankEstimate | null; // número de orden (condicionado a obtener plaza)
  available_posts: number; // media de plazas libres al elegir
  available_share: number; // 0–1
  provinces: ProvinceAvailability[]; // por plazas (desc)
  localities: LocalityAvailability[]; // por plazas (desc)
  categories: CategoryAvailability[]; // por probabilidad (desc)
  likely: LikelyDestination[]; // top 12
  preferred: LocalityAvailability[]; // localidades preferidas (Ajustes)
  summary: string;
}

/** `simulate_destinations`: «con tu nota, ¿qué destinos te habrían quedado y cuál elegirías?». */
export interface DestinationSimulation {
  observed_grade: number;
  target_convocatoria: string;
  target_label: string;
  scenarios: DestinationScenario[]; // [0] proyección; después convocatorias, de reciente a antigua
  neighbour_window: number;
  assumptions: string[];
  data_quality: DataQuality;
}
