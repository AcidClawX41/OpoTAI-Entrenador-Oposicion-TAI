# Contrato de la API interna (IPC Tauri) de OpoTAI (v1)

> Tipos: [`app/src/api/types.ts`](../app/src/api/types.ts) (fuente de verdad).
> Implementación: `crates/tai-core` (lógica, fachada `Engine`) + `app/src-tauri` (comandos finos).
> Autor: Eric Valls Gramunt.

## Reglas generales

- Todos los comandos usan `#[tauri::command(rename_all = "snake_case")]`, así que desde JS los
  argumentos se pasan en snake_case: `invoke("start_exam", { profile_id, spec })`.
- Devuelven `Result<T, ApiError>`; `ApiError` se serializa como `{ code, message }` con mensaje
  en castellano. La promesa de `invoke` se rechaza con ese objeto.
- Serialización serde por defecto (snake_case), `Option` → `null` (nunca se omiten claves),
  uniones discriminadas con `type`.
- Las respuestas correctas y explicaciones **no** viajan en `ExamPaper`: solo en
  `AnswerFeedback` (modo inmediato) y en `AttemptResult` tras entregar.
- Los datos (bancos y `data/meta`) van **embebidos** en el binario; el progreso del usuario se
  guarda en SQLite en el directorio de datos de la app (`app_data_dir/opotai.sqlite3`).
- **Imágenes**: el núcleo rellena `Media.data_url` (data URI base64) y además **reescribe** las
  referencias en línea `![alt](assets/…)` de cualquier campo Markdown (`text`, `options`,
  `statement`, `explanation`, `option_notes`) a `data:image/…;base64,…` antes de enviarlas. La UI
  permite `data:image/*` en su renderizador Markdown (urlTransform propio), muestra las imágenes
  adaptadas al ancho, con zoom (lightbox) y en todas las vistas: examen, feedback inmediato,
  revisión de resultados, supuestos y teoría.

## Comandos

| Comando | Argumentos | Devuelve | Notas |
|---|---|---|---|
| `get_app_info` | — | `AppInfo` | Incluye versión, commit, copyright y licencia (SPDX y nombre). |
| `get_license_text` | — | `string` | Texto íntegro de la licencia (fichero `LICENSE` del repositorio embebido en el binario). |
| `get_catalog` | — | `CatalogInfo` | Bancos, temario, esquemas, convocatorias y tiers en una llamada. |
| `list_localities` | — | `LocalityInfo[]` | Para elegir localidades preferidas. |
| `list_profiles` | — | `Profile[]` | Orden: último activo primero. |
| `create_profile` | `name, color, avatar` | `Profile` | `name` 1–40 caracteres, único (sin distinguir mayúsculas). `avatar`: emoji (≤ 16 caracteres), imagen propia de cualquier proporción `data:image/png\|jpeg\|webp\|gif;base64,…` de ≤ 2 MB con la firma real del formato (no se admite SVG) o `null`. |
| `update_profile` | `profile_id, name, color, avatar` | `Profile` | Mismas reglas que `create_profile`. |
| `delete_profile` | `profile_id` | `null` | Borra en cascada intentos y estadísticas. |
| `touch_profile` | `profile_id` | `Profile` | Marca el perfil como activo (al seleccionarlo). |
| `get_settings` | `profile_id` | `Settings` | Valores por defecto si no hay guardados. |
| `update_settings` | `profile_id, settings` | `Settings` | Valida rangos (ratio 0–1, ≤ 3 localidades). |
| `start_exam` | `profile_id, spec: ExamSpec` | `ExamPaper` | Crea un intento `in_progress`. Si el perfil ya tenía uno en curso, se marca como abandonado. |
| `get_active_attempt` | `profile_id` | `ActiveAttempt \| null` | Para reanudar tras cerrar la app. |
| `save_progress` | `progress: ProgressPayload` | `null` | Persistencia periódica (la UI lo llama cada ~10 s y al cambiar respuesta). |
| `check_answer` | `attempt_id, question_id, choice` | `AnswerFeedback` | Solo si `feedback = "immediate"`; registra la respuesta (no se puede cambiar después). |
| `submit_exam` | `progress: ProgressPayload` | `AttemptResult` | Corrige, guarda resultado y estadísticas por pregunta, actualiza repaso. |
| `abandon_exam` | `attempt_id` | `null` | |
| `list_attempts` | `profile_id, limit` | `AttemptSummary[]` | Más reciente primero; `limit` null = 50. |
| `get_attempt_result` | `attempt_id` | `AttemptResult` | Recalcula la revisión con el banco actual (explicaciones nuevas incluidas). |
| `delete_attempt` | `attempt_id` | `null` | |
| `get_stats` | `profile_id` | `ProfileStats` | |
| `get_review_summary` | `profile_id` | `ReviewSummary` | |
| `calculate_grade` | `profile_id \| null, input: ManualGradeInput` | `CalculatorResult` | Calculadora de nota + predicción (usa ajustes del perfil si se da). |
| `draw_random_exam` | `profile_id` | `RandomDraw` | **Simulacro sorpresa** al abrir la app: el núcleo sortea (aleatoriedad del SO, sin semilla) entre exámenes oficiales completos y simulacros numerados; el usuario no elige. |
| `get_theory_index` | — | `TheorySummary[]` | Temas con teoría (orden del temario). Vacío si no hay datos. |
| `get_theory` | `topic_id` | `TheoryTopic` | Markdown completo de un tema. `not_found` si no existe. |

## Semántica del generador de exámenes (`start_exam`)

- **official**: secciones en el orden del banco. Con `include_reserve`, las reservas se añaden al
  final de su sección (`display_number` "R1"…). Si el esquema tiene supuestos a elegir,
  `requires_case_choice = true`. Las preguntas anuladas se muestran igualmente (como en el
  examen real) y se excluyen al corregir, sustituidas por reservas por orden.
- **simulacro**: esquema `scheme_id` o `default_scheme`. Parte 1: `part1_questions` (o las del
  esquema) preguntas no anuladas de las secciones `theory` de todos los bancos, estratificadas por
  bloque según el reparto de la 1.ª parte del examen oficial más reciente con temas asignados
  (si no hay temas, muestreo uniforme), evitando duplicados y priorizando no vistas si
  `prefer_unseen`. Parte 2 (si `include_case`): `cases_offered` supuestos (uno de bloque III y otro
  de bloque IV si existen; preferir no vistos) con sus preguntas (sin reservas);
  `requires_case_choice = true`. Solo entran supuestos con tantas preguntas como pide el esquema
  (20 en ingreso libre, 12 en promoción interna…) para que la nota sea comparable; lo mismo en los
  simulacros numerados. Duración: la del esquema salvo `duration_minutes`.
  Preguntas `outdated` se evitan salvo que falten. `freestyle = true` («Simulacro Freestyle») solo
  cambia título y subtítulo: formato real completo con preguntas de todas las convocatorias.
- **practice**: filtro por bloques/temas/bancos y `source` (`unseen`, `failed` = falladas alguna vez,
  `flagged` = marcadas como dudosas), `count` preguntas al azar (semilla opcional). Si
  `include_cases`, admite preguntas sueltas de supuestos mostrando su enunciado.
- **review**: preguntas del repaso espaciado con vencimiento ≤ hoy (las más antiguas primero),
  completando con falladas en seguimiento hasta `count`.
- **case**: un supuesto concreto (enunciado + preguntas, sin reservas).
- **numbered**: «Simulacro OpoTAI n.º N» (N = 1…30). Formato completo del esquema por defecto
  (p. ej. 80 preguntas + 2 supuestos a elegir), composición **fija** para cada N: semilla derivada
  de N, preferencia por preguntas oficiales no anuladas ni desactualizadas, estratificación por
  bloque, sin repetir preguntas dentro del simulacro y repartiendo supuestos distintos entre
  números consecutivos.
- **random** / `draw_random_exam`: bolsa = bancos oficiales completos (1.ª parte + supuestos) +
  simulacros numerados. Se sortea uniformemente entre los que el perfil **no ha terminado**; si ya
  los hizo todos, entre los terminados hace más tiempo. `start_exam` con `type: "random"` hace el
  sorteo y arranca directamente; la UI normalmente llama antes a `draw_random_exam` para mostrar
  la presentación y después `start_exam(draw.spec)`. `ExamPaper.drawn = true` en ambos casos.
- `feedback` en `official`, `simulacro`, `numbered` y `random`: `"end"` (como el examen real) o
  `"immediate"` (modo estudio: `check_answer` tras cada respuesta, que queda bloqueada).
- **Tiempo** («examen real» frente a «aprendizaje»): `official.timed`, `case.timed`,
  `numbered.timed` y `random.timed` (estos dos, `true` por defecto) activan el cronómetro con la
  duración oficial del esquema o del banco; con `false` el examen no tiene límite
  (`ExamPaper.duration_minutes = null`) y la interfaz muestra el tiempo transcurrido. En
  `simulacro`, `duration_minutes: 0` equivale a sin límite. `draw_random_exam` describe el sorteo
  con el cronómetro oficial (`RandomDraw.duration_minutes`); la interfaz puede arrancar el mismo
  `draw.spec` con `timed: false` (y `feedback: "immediate"`) sin perder `drawn`, porque la marca
  de sorteo solo compara la identidad del examen (`official:<banco>` o `numbered:<n>`). Al agotarse
  el tiempo, la interfaz entrega el examen automáticamente.
- **Examen publicado en dos bancos**: si un banco oficial no trae todas las partes y otro banco
  oficial del mismo proceso (`convocatoria`) y acceso trae las que faltan (p. ej. 2018 libre:
  `tai-li-2018`, 1.er ejercicio con plantilla oficial, y `tai-li-2018-ej2`, 2.º ejercicio sin
  plantilla pública y con respuestas propuestas), la réplica `official` del banco principal (el
  de la 1.ª parte) incluye también las secciones del otro, con el esquema completo de la
  convocatoria y la suma de las duraciones; entra en el sorteo. `BankSummary.companion_bank_id`
  enlaza ambos bancos y `BankSummary.complete_exam` indica si la réplica de ese banco es el examen
  completo (el secundario puede hacerse suelto, pero no se sortea).
- **Estructura del examen**: los exámenes completos (`official` de un banco completo, `simulacro`
  con `include_case`, `numbered` y el sorteo) tienen dos partes que se califican por separado con
  la escala y el mínimo oficiales de cada una (`GradeResult.parts`): la 1.ª parte (cuestionario) y
  la 2.ª parte (supuesto práctico a elegir). La nota final es la suma si se superan ambas.

Para `practice`, `review` y `case` se puntúa con un esquema derivado: mismo valor y penalización que
la parte equivalente del esquema de referencia (en `case`, el del examen del que procede el supuesto,
p. ej. −1/4 en promoción interna; en `practice` y `review`, el de la convocatoria objetivo del perfil o, si no tiene, el esquema por defecto) y una unidad 0–10
con aprobado en 5 y corte en el 50 % de la directa máxima (equivale a «nota sobre 10 con
penalización»). Sin predicción.

## Corrección (`tai-core::scoring`)

Fórmulas en `docs/CONTRATO-DATOS.md` §2. Detalles:

- Respuesta a pregunta anulada → `annulled`, no cuenta. En réplica oficial, la k-ésima anulada de
  una sección se sustituye por la k-ésima reserva no anulada de esa sección; las reservas no
  usadas son `not_counted`.
- Supuestos: solo cuenta el elegido (`chosen_case`). Si no se eligió y solo hay respuestas en un
  supuesto, se elige ese automáticamente (nota en `GradeResult.notes`); si hay respuestas en varios
  y ninguno elegido, la 2.ª parte cuenta como en blanco (como en el examen real) con una nota.
- Corte por unidad: `cutoff_override_ratio` del usuario → `user`; corte oficial del esquema →
  `official` (escalado a la N del examen); si no hay, estimación de la convocatoria objetivo →
  `estimated`; y como mínimo `min_direct_ratio · N` → `floor`.

## Modelo de predicción (`tai-core::prediction`)

Entrada: recuentos por parte (aciertos, errores, blancos) del intento o de la calculadora, la
convocatoria objetivo (esquema, plazas, corte si ya es oficial) y la convocatoria de referencia
más reciente con datos (`grades_of_aptos`, presentados, aptos, destinos).

Monte Carlo determinista (K = 4000, semilla derivada de la entrada para resultados estables):

1. **Rendimiento**: por parte, fracción contestada `f = (A+E)/n` y precisión
   `a ~ Beta(A+1, E+1)`. En el examen objetivo: contestadas = round(f·Q), aciertos ~
   Binomial(contestadas, a). Si falta una parte (simulacro sin supuesto), se usa la otra y se indica
   en `assumptions`.
2. **Corte**: si la convocatoria objetivo tiene corte oficial → fijo. Si no: ratio en el puesto
   k = plazas de la objetivo dentro de la distribución de la referencia (notas de aptos
   convertidas a ratio de directa: `D = M + (g−50)/50·(N−M)`), con `max(suelo, ·)` y ruido
   Normal(0, 0,03) truncado al suelo. Si la objetivo tiene más plazas que aptos tuvo la referencia,
   el corte es el suelo. Con calificación por partes, el mismo criterio por parte.
3. **Aprobado**: todas las unidades ≥ corte. **Puesto**: `#(ratios referencia > ratio usuario) + 1`
   escalado por presentados objetivo/referencia (1 si se desconoce). **Plaza**: aprobado y
   puesto ≤ plazas.
4. **Destinos**: posición relativa `q = puesto/plazas` → índice `j = ceil(q · total_ref)` en el
   dataset de destinos de la referencia; un tier/localidad está disponible si existe alguna
   adjudicación de ese tier/localidad con `order ≥ j`. Probabilidad = media sobre las muestras
   (0 si no hay plaza). `share_of_plazas` = reparto histórico.
5. **Salida**: `p_pass`, `p_plaza`, cuantiles del puesto (p10/p50/p90), percentil, nota esperada,
   tiers, 8 ciudades con más plazas, localidades preferidas, veredicto, razonamiento y supuestos.
   `data_quality`: `real` si hay notas de aptos y destinos; `partial` si falta alguno;
   `synthetic` si no hay datos y se usan valores por defecto documentados.

## Ajustes por defecto

`theme: "system"`, `accent: "#7c3aed"`, `default_feedback: "immediate"`, `exam_feedback: "end"`,
`sound_enabled: true`, `sound_volume: 0.6`, `random_exam_on_startup: true`, `show_timer: true`,
`confirm_before_submit: true`, `keyboard_shortcuts: true`, `target_convocatoria: null`,
`cutoff_override_ratio: null`, `preferred_localities: []`, `exam_date: null`.

## Sonido (solo interfaz)

Efectos minimalistas sintetizados con Web Audio (sin ficheros): acierto (dos notas suaves
ascendentes), fallo (tono grave corto), navegación (clic muy breve y bajo) y, en simulacros con
corrección al final, un «tic» neutro al marcar (no revela si es correcta). **Nunca** suena al dejar
una pregunta en blanco. Respeta `sound_enabled` y `sound_volume`.

## Persistencia (SQLite, migraciones con `PRAGMA user_version`)

- `profiles(id, name, color, avatar, created_at, last_active_at, settings_json)`
- `attempts(id, profile_id, mode, title, spec_json, paper_json, status, started_at, finished_at,
  elapsed_seconds, chosen_case, total_grade, max_grade, passed, correct, wrong, blank, p_plaza,
  result_json)` — `paper_json` guarda la estructura (ids), no el texto, para poder recalcular.
- `attempt_answers(attempt_id, question_id, choice, flagged, PRIMARY KEY(attempt_id, question_id))`
- `question_stats(profile_id, question_id, seen, correct, wrong, blank, last_answered_at,
  last_result, srs_box, srs_due_at, flagged, PRIMARY KEY(profile_id, question_id))`

Repaso espaciado tipo Leitner: un fallo pone la pregunta en la caja 1 (vence ya); cada acierto
posterior la sube de caja con intervalos 1, 3, 7 y 15 días; en la caja 5 se considera dominada.
