# tai-core · núcleo de OpoTAI

Lógica de dominio de **OpoTAI** (entrenador de la oposición TAI de la AGE), sin dependencias de
Tauri: la capa de escritorio (`app/src-tauri`) solo traduce cada comando IPC a un método de
[`Engine`](src/engine/mod.rs). Autor del proyecto: **Eric Valls Gramunt**.

Contratos: [`docs/CONTRATO-DATOS.md`](../../docs/CONTRATO-DATOS.md),
[`docs/CONTRATO-API.md`](../../docs/CONTRATO-API.md) y
[`app/src/api/types.ts`](../../app/src/api/types.ts) (fuente de verdad de los DTO).

## Módulos

| Módulo | Contenido |
|---|---|
| `model` | Structs serde de `data/banks` (bancos, secciones, preguntas, imágenes) y `data/meta` (puntuación, convocatorias, temario, localidades, destinos) y `data/teoria`. Deserialización tolerante (`#[serde(default)]`). |
| `defaults` | Valores por defecto **documentados** si falta algún fichero de `data/meta` (esquemas `tai-li-2024`, `tai-li-2025`, `tai-pi-2024`, convocatorias `li-2025`/`li-2024`/`pi-2024`, tamaños de localidad, distribución sintética). |
| `catalog` | Carga desde un directorio (`Catalog::load_dir`) o un mapa ruta → bytes (`Catalog::from_files`, datos embebidos). Índices por id, informe de validación (ids duplicados, 4 opciones, respuestas nulas, referencias…), imágenes como data URI con caché y reescritura de `![alt](assets/…)` en Markdown, teoría. Nunca falla por datos defectuosos: los omite y lo anota. |
| `scoring` | Puntuación por parte y unidad, cortes (`user` → `official` → `estimated` → `floor`), transformación oficial, partes eliminatorias y esquema derivado 0–10 para práctica. |
| `builder` | Generación de exámenes: `official`, `simulacro`, `numbered`, `practice`, `review`, `case` (RNG `ChaCha8` con semilla; nunca incluye respuestas). |
| `paper` | Estructura guardada del examen (`paper_json`: ids, no textos) y conversión a `ExamPaper`. |
| `attempt` | Evaluación de un intento: reservas por anuladas, supuesto elegido, revisión y respuesta inmediata. |
| `srs` / `history` | Repaso espaciado Leitner (cajas 1–5, intervalos 0/1/3/7/15 días) e historial por pregunta. |
| `stats` | Desglose por bloque y tema, historial de notas, actividad de 120 días y racha. |
| `prediction` | Monte Carlo de aprobado, plaza y destino (K = 4.000, determinista). |
| `storage` | SQLite (`rusqlite` embebido), migraciones con `PRAGMA user_version`, claves foráneas en cascada, WAL. |
| `api` | DTO idénticos a `types.ts` (snake_case, `null` explícito, uniones con `type`). |
| `engine` | Fachada `Engine` con un método por comando del contrato; errores `CoreError` → `ApiError { code, message }` en castellano. |

## Puntuación

Para cada parte `p` con `A` aciertos y `E` errores contabilizados (sin anuladas ni blancos):

```text
directa_p = value_p · A − value_p · E / penalty_divisor_p
```

Por unidad de calificación `u`: `D = Σ directa_p`, `N = Σ value_p · preguntas_contabilizadas_p`,
`M = corte · N` y

```text
D ≥ M      → nota = pass + (max − pass) · (D − M) / (N − M)    (APTO)
0 ≤ D < M  → nota = pass · D / M                              (NO APTO, orientativa)
D < 0      → nota = 0
```

- **Corte**: corte personalizado del usuario (`user`) → corte oficial del esquema o de la
  convocatoria reescalado a la `N` del examen (`official`) → estimación de la convocatoria
  objetivo (`estimated`) → mínimo reglamentario `min_direct_ratio · N` (`floor`). Nunca por
  debajo del mínimo (se avisa en `GradeResult.notes` si el corte del usuario era inferior).
- **Calificación por partes** (varias unidades, p. ej. TAI-LI 2025: cada parte 0–50 con mínimo
  25): las partes son **eliminatorias**; si no se supera una, las siguientes no se corrigen
  (nota 0) y se anota. Con `pass = E/2` y `max = E` coincide con la fórmula por tramos de la CPS.
- **Reservas** (réplica oficial): la k-ésima anulada de una sección se sustituye por la k-ésima
  reserva no anulada; el resto de reservas son `not_counted`.
- **Supuesto**: solo cuenta el elegido; sin elección y con respuestas en uno solo, se corrige ese;
  con respuestas en varios, la 2.ª parte cuenta en blanco (como en el examen real).
- **Práctica, repaso y supuesto suelto**: esquema derivado (mismo valor y penalización que la
  parte equivalente del esquema por defecto) con una unidad 0–10, aprobado 5 y corte del 50 %.

Ejemplos verificados en los tests: TAI-LI 2024 con 60/15/5 y 14/3/3 → directas 55 + 52 = 107 →
`50 + 50 · 59/112 = 76,34`; TAI-PI 2024 (penalización 1/4, corte 29,40 sobre 98).

## Generación de exámenes

- **official**: secciones del banco; con `include_reserve`, reservas al final (`R1`…); supuesto a
  elegir si el banco ofrece más de los que se eligen. Duración oficial si `timed`.
- **simulacro**: 1.ª parte con preguntas no anuladas de todos los bancos (también **reservas** y
  el **llamamiento extraordinario**), estratificada por bloque según el examen oficial más
  reciente con temas (uniforme si no hay), sin duplicados (mismo enunciado y opciones), no vistas
  primero si `prefer_unseen` y desactualizadas solo si faltan. 2.ª parte: un supuesto del bloque
  III y otro del IV (anuladas sustituidas por sus reservas para mantener 20 preguntas). Sin
  supuesto, el esquema se limita a la 1.ª parte.
- **numbered** («Simulacro OpoTAI n.º N», N = 1…30): formato completo del esquema por defecto y
  composición **fija**: cada cubo (bloque × preferencia oficial vigente → práctica vigente →
  desactualizada) se baraja una vez con semilla fija y el n.º N toma una ventana cíclica que
  empieza en `(N − 1) · cuota`, así los números consecutivos no comparten preguntas mientras haya
  banco y los supuestos rotan; el orden de presentación usa una semilla derivada de N.
- **practice**: filtro por bloques **o** temas (unión), bancos y origen (`unseen`, `failed`,
  `flagged`); con `include_cases`, preguntas de supuestos agrupadas con su enunciado.
- **review**: vencidas hoy (las más antiguas primero) y, si faltan, falladas en seguimiento.
- **case**: un supuesto concreto; con `timed`, tiempo proporcional a su peso en el examen (≥ 30 min).
- **random** / `draw_random_exam`: bolsa = oficiales completos + numerados; sorteo con
  aleatoriedad del SO, uniforme entre los no terminados (si están todos, el terminado hace más
  tiempo). `drawn = true` si `start_exam` recibe `type: "random"` o el examen recién sorteado
  (el motor recuerda el último sorteo de cada perfil durante 12 h y lo consume en el siguiente
  `start_exam`).

## Corrección inmediata

En cualquier examen con `feedback = "immediate"` (también oficial, simulacro y numerado),
`check_answer` devuelve la solución y **bloquea** la respuesta (columna `checked` de
`attempt_answers`): `save_progress` y `submit_exam` ya no pueden cambiarla.

## Repaso espaciado (Leitner)

Un error pone la pregunta en la caja 1 (vence ya); cada acierto la sube con intervalos 1, 3, 7 y
15 días; en la caja 5 está dominada y sigue apareciendo cada 15 días. Un blanco en una pregunta
en repaso la devuelve a la caja 1; fuera del repaso no la añade. «Vence hoy» = antes del final
del día local.

## Predicción

1. **Rendimiento**: por parte, `f = (A+E)/n` y precisión `a ~ Beta(A+1, E+1)`; en el examen
   objetivo, contestadas `round(f·Q)` y aciertos `~ Binomial`. Si falta una parte se usa la otra.
2. **Referencia**: la convocatoria más reciente del mismo acceso con notas de aptos (en los datos
   reales, `li-2024`), convertidas a ratio de directa `D = M + (g − 50)/50 · (N − M)`; por debajo
   del último apto se supone un reparto uniforme. Sin notas: normal ajustada a presentados/aptos;
   sin nada: Normal(0,25; 0,15) sintética.
3. **Corte**: oficial si existe (o el del usuario). Si no, el ratio del puesto
   `k_ref = plazas · presentados_ref / presentados_obj` (2025: 1.030 · 5.261 / 8.790 ≈ 616),
   nunca bajo el suelo, con ruido Normal(0; 0,03) truncado. Con calificación por partes, la 1.ª
   parte se estima en el suelo (filtro amplio) y las demás por ranking (2025 → 0,30 y ≈ 0,40).
4. **Puesto** `#(ratios > usuario) + 1` escalado por presentados; **plaza** si aprueba y
   puesto ≤ plazas.
5. **Destinos** (dataset más reciente, `li-2024`): `j = ceil(puesto/plazas · total)`; una zona o
   ciudad está disponible si hubo una adjudicación allí con orden ≥ `j`. Se informa además de
   `p_big_city_outside_madrid` (Madrid concentra el 76–88 % y no se agota).
6. La semilla se deriva de la entrada del modelo (objetivo, esquema y datos de referencia) y cada
   muestra usa subflujos propios: mismo dato → mismo resultado, y respuesta casi monótona a los
   aciertos. `data_quality`: `real` (notas + destinos), `partial` o `synthetic`.

## Almacenamiento

`profiles`, `attempts`, `attempt_answers` (con `checked`) y `question_stats`, con migraciones
por `PRAGMA user_version`, `ON DELETE CASCADE` y transacción en la entrega. `paper_json` guarda
ids para recalcular la revisión con el banco actual; `result_json` guarda el resultado sin la
revisión (respaldo y predicción de preparación).

## Tests

```bash
cargo fmt --all --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace
```

- Unitarios en cada módulo (fórmulas, Leitner, muestreo, formato, imágenes…).
- Integración con **fixtures sintéticos** (`tests/fixtures/data`: un examen oficial con dos
  supuestos, reservas y anuladas, uno incompleto, un banco de práctica, metadatos, destinos,
  teoría y PNG diminutos): `scoring`, `builder`, `engine`, `prediction`, `storage`.
- `tests/contract.rs`: analiza `app/src/api/types.ts` y compara **recursivamente** las claves de
  todos los DTO serializados (incluida cada variante de `ExamSpec`).
- `tests/real_data.rs`: carga `data/` real si existe (se omite si no hay bancos), genera y corrige
  cada examen oficial, un simulacro, un numerado y un sorteo, y comprueba que el modelo reproduce
  los cortes estimados de 2025 de la investigación.
