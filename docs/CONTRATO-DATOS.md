# Contrato de datos de OpoTAI (v1)

> Proyecto: **OpoTAI** — entrenador de tests y simulacros para la oposición TAI (AGE).
> Autor: **Eric Valls Gramunt**.
>
> Este documento es la **fuente de verdad** de los formatos de datos. Lo usan el núcleo en
> Rust (`crates/tai-core`), las herramientas Python (`tools/`) y la interfaz (`app/`).
> Los JSON Schema equivalentes están en [`data/schema/`](../data/schema/).

## Convenciones generales

- Codificación **UTF-8**, JSON con indentación de 2 espacios, claves en `snake_case`.
- Los textos visibles (enunciados, opciones, explicaciones, supuestos) son **Markdown
  (CommonMark + tablas GFM)**. El código se escribe en bloques con triple tilde invertida
  indicando lenguaje cuando se sepa (```sql, ```java, ```bash…).
- Letras de respuesta: siempre `"A" | "B" | "C" | "D"` (mayúsculas). Las opciones se guardan
  **sin** el prefijo `a)`/`b)` del cuadernillo.
- Bloques del temario: `"I" | "II" | "III" | "IV"`. Temas: `"<bloque>.<n>"`, p. ej. `"IV.7"`.
- Fechas: `YYYY-MM-DD`.
- Nunca se almacenan datos personales (nombres, DNI…) de opositores. Las listas oficiales de
  aprobados o nombramientos solo se usan **agregadas o anonimizadas** (número de orden, nota,
  destino).

## Estructura de directorios

```text
data/
├── schema/                 # JSON Schema de cada formato
├── banks/
│   ├── oficiales/          # exámenes oficiales transcritos (un fichero por examen/modelo)
│   ├── practica/           # preguntas de elaboración propia, por tema
│   └── assets/<bank-id>/   # imágenes referenciadas por preguntas o supuestos
├── meta/
│   ├── scoring.json        # esquemas de puntuación por convocatoria
│   ├── convocatorias.json  # histórico: plazas, presentados, aptos, notas de corte…
│   ├── temario.json        # programa oficial vigente (bloques y temas)
│   ├── localidades.json    # clasificación de localidades por tamaño (tiers)
│   └── destinos/<conv>.json# destinos adjudicados anonimizados (orden → localidad)
├── teoria/                 # teoría por tema: index.json + <topic-id>.md
└── raw/                    # PDFs descargados (NO se versiona; ver tools/)
```

## 1. Banco de preguntas — `data/banks/**/<bank-id>.json`

```jsonc
{
  "schema_version": 1,
  "id": "tai-li-2024",                     // único, kebab-case. Oficiales: tai-<li|pi>-<año>[-<modelo>]
  "kind": "official",                      // "official" | "practice"
  "title": "TAI · Ingreso libre · Convocatoria 2024 (examen 14/12/2024)",
  "description": null,
  "access": "libre",                       // "libre" | "promocion_interna" | null (práctica)
  "year": 2024,                            // año de la convocatoria (resolución), null en práctica
  "convocatoria": "li-2024",               // id en meta/convocatorias.json, o null
  "exam_date": "2024-12-14",
  "model": "A",                            // modelo de cuadernillo si existe, o null
  "duration_minutes": 120,
  "scoring_scheme": "tai-li-2024",         // id en meta/scoring.json, o null
  "source": {
    "publisher": "INAP · Comisión Permanente de Selección",
    "documents": [
      { "kind": "cuadernillo", "title": "Cuestionario ejercicio único", "url": "https://…", "sha256": "…" },
      { "kind": "plantilla_definitiva", "title": "Plantilla definitiva", "url": "https://…", "sha256": "…" }
    ],
    "answer_key": "definitiva",            // "definitiva" | "provisional" | "propia"
    "retrieved": "2026-10-11",
    "notes": null
  },
  "sections": [ /* Section */ ]
}
```

`source.documents[].kind` ∈ `cuadernillo | plantilla_provisional | plantilla_definitiva | criterios | otro`.

### Section

```jsonc
{
  "id": "p1",                 // único dentro del banco: "p1", "p2-s1", "p2-s2"…
  "part": 1,                  // parte del ejercicio: 1 = cuestionario, 2 = supuesto práctico
  "kind": "theory",           // "theory" | "case"
  "title": "Primera parte · Cuestionario",
  "block": null,              // en supuestos: "III" o "IV" (si se conoce)
  "statement": null,          // en supuestos: enunciado completo en Markdown
  "media": [],                // imágenes del enunciado: [{ "path": "assets/tai-li-2024/s1.png", "alt": "…" }]
  "questions": [ /* Question */ ],
  "reserve": [ /* Question: preguntas de reserva de esta sección */ ]
}
```

- La **segunda parte** se representa con una sección `kind: "case"` por cada supuesto ofrecido
  (`part: 2`). El esquema de puntuación indica cuántos se eligen (`cases_to_choose`).
- Las rutas de `media` son relativas a `data/banks/`.

### Question

```jsonc
{
  "id": "tai-li-2024-p1-001",       // único global: <bank-id>-<section-id>-<NNN>; reserva: …-r1, …-r2
  "number": 1,                      // numeración impresa en el cuadernillo
  "text": "¿Cuál de los siguientes…?",
  "options": ["…", "…", "…", "…"],  // exactamente 4 en TAI (A, B, C, D)
  "answer": "B",                    // letra correcta según plantilla; null si anulada sin respuesta
  "annulled": false,                // anulada en la plantilla definitiva
  "topic": "IV.7",                  // tema del temario vigente (meta/temario.json) o null
  "explanation": "…",               // explicación breve en castellano (Markdown) o null
  "option_notes": null,             // opcional: [nota A, nota B, nota C, nota D] (null por opción sin nota)
  "references": [],                 // p. ej. ["Ley 39/2015, art. 30", "RFC 791"]
  "tags": [],
  "media": [],
  "outdated": false,                // la normativa/tecnología ha cambiado desde el examen
  "outdated_note": null,
  "needs_review": false             // marcar si la transcripción o la explicación tienen dudas
}
```

**Imágenes (figuras, diagramas, capturas, tablas escaneadas)**

- `media` (en `Section` y `Question`): imágenes que se muestran **debajo** del enunciado.
- Imágenes **en línea** dentro de `text`, de una opción concreta (`options[i]`), del `statement`
  de un supuesto o de una explicación: sintaxis Markdown `![texto alternativo](assets/<bank-id>/<fichero>.png)`.
  Úsala cuando la imagen pertenece a una opción (A–D) o a un punto concreto del enunciado.
- Recorte ajustado al contenido, legible (renderizado a ≥ 2× desde el PDF), PNG (JPEG solo para
  fotografías), ≤ ~300 KB, nombre estable: `p1-q012.png`, `p2-s1-statement-1.png`, `p1-q040-opt-b.png`.
- **Reconstrucción**: si la imagen contiene datos tabulares o código, transcríbelos además como tabla
  Markdown o bloque de código (para que se lean con nitidez y escalen); conserva la imagen solo si la
  disposición visual aporta (diagramas, esquemas de red, capturas de interfaz).
- `alt` siempre descriptivo en castellano (accesibilidad).

**Reglas de calidad**

1. La transcripción de preguntas oficiales debe ser **literal** (corrigiendo solo guiones de
   partición de línea y saltos de línea del PDF).
2. `answer` sale de la **plantilla definitiva** (o provisional si no hay otra, indicándolo en
   `source.answer_key`).
3. Las explicaciones son de **elaboración propia**: 2–6 frases que expliquen por qué la correcta
   lo es y el concepto clave a memorizar; `option_notes` explica por qué fallan las demás.
   Si la plantilla oficial parece discutible, se respeta y se comenta en la explicación.

## 2. Esquemas de puntuación — `data/meta/scoring.json`

```jsonc
{
  "schema_version": 1,
  "default_scheme": "tai-li-2025",          // esquema por defecto de los simulacros
  "schemes": [
    {
      "id": "tai-li-2024",
      "title": "TAI ingreso libre · convocatoria 2024",
      "access": "libre",
      "convocatoria": "li-2024",
      "sources": [{ "title": "Criterios de corrección CPS (10/12/2024)", "url": "https://…" }],
      "duration_minutes": 120,
      "parts": [
        { "part": 1, "title": "Cuestionario", "kind": "theory", "questions": 80, "reserve": 5,
          "value": 1.0, "penalty_divisor": 3, "cases_offered": null, "cases_to_choose": null },
        { "part": 2, "title": "Supuesto práctico", "kind": "case", "questions": 20, "reserve": 5,
          "value": 4.0, "penalty_divisor": 3, "cases_offered": 2, "cases_to_choose": 1 }
      ],
      "grading": {
        "units": [
          { "parts": [1, 2], "max_grade": 100, "pass_grade": 50, "min_direct_ratio": 0.30,
            "cutoff_direct": 48.0, "cutoff_note": "30 % de la puntuación directa máxima (160)" }
        ]
      },
      "notes": null
    }
  ]
}
```

- `questions` en un supuesto = preguntas **por supuesto**.
- `penalty_divisor`: cada error resta `value / penalty_divisor` (3 → un tercio). `null` = sin penalización.
- `grading.units`: unidades de calificación. Una unidad con `parts: [1, 2]` = calificación
  conjunta (convocatoria 2024). Dos unidades `[1]` y `[2]` = cada parte se califica por separado
  (p. ej. 0–50 con mínimo 25 cada una).

### Fórmulas (implementadas en `tai-core::scoring`)

Para cada parte `p` con `A` aciertos y `E` errores contabilizados (excluye anuladas y en blanco):

```text
directa_p = value_p · A − value_p · E / penalty_divisor_p
```

Para cada unidad `u`:

```text
D = Σ directa_p (p ∈ u)                     N = Σ value_p · preguntas_contabilizadas_p
M = cutoff_direct (oficial) · N / N_oficial  (si se conoce)
    si no: corte estimado/usuario; nunca inferior a min_direct_ratio · N
Si D ≥ M:  nota = pass + (max − pass) · (D − M) / (N − M)        → APTO
Si 0 ≤ D < M: nota = pass · D / M                              → NO APTO (proporcional, orientativo)
Si D < 0:  nota = 0
Nota total = Σ nota_u ; Apto = todas las unidades aptas.
```

Las **preguntas anuladas** no se contabilizan y se sustituyen, por orden, por las de reserva
(solo en la réplica de examen oficial, que es como lo hace el tribunal).

## 3. Histórico de convocatorias — `data/meta/convocatorias.json`

```jsonc
{
  "schema_version": 1,
  "updated": "2026-10-11",
  "target_convocatoria": "li-2025",        // convocatoria objetivo para las predicciones
  "convocatorias": [
    {
      "id": "li-2024",                     // <li|pi>-<año>
      "access": "libre",
      "year": 2024,
      "oep": "2023-2024",
      "title": "Convocatoria 2024 (OEP 2023-2024)",
      "resolution": "Resolución de 9 de julio de 2024, de la SEFP",
      "boe_id": "BOE-A-2024-…",
      "exam_date": "2024-12-14",
      "status": "finalizada",               // "convocada" | "examen_realizado" | "finalizada"
      "scoring_scheme": "tai-li-2024",
      "plazas": { "general": 1712, "discapacidad": 167, "total": 1879 },
      "admitidos": null, "presentados": null, "aptos": null, "aprobados": null,
      "cutoff": { "direct": 48.0, "max_direct": 160.0, "grade": 50.0, "basis": "floor", "per_part": null },
      "grades_of_aptos": null,              // { "source": "…", "count": n, "values": [notas 0-100 desc], "part_directs": [{ "part": 1, "values": [directas, mismo orden] }] (opcional) }
      "destinations_dataset": null,         // p. ej. "destinos/li-2024.json"
      "sources": [{ "title": "…", "url": "…" }],
      "notes": null
    }
  ]
}
```

`cutoff.basis`: `"floor"` (el corte fue el mínimo reglamentario, p. ej. 30 %), `"rank"` (el corte
lo marcó el número de plazas/aptos), `"unknown"`. `cutoff.per_part` se usa cuando cada parte
tiene su propio corte: `[{ "part": 1, "direct": 24.0, "max_direct": 80.0 }, …]`.

## 4. Temario — `data/meta/temario.json`

```jsonc
{
  "schema_version": 1,
  "convocatoria": "li-2025",
  "source": { "title": "BOE-A-2025-26262, Anexo V", "url": "https://www.boe.es/…" },
  "blocks": [
    { "id": "I", "title": "Administración electrónica y transparencia",
      "topics": [ { "id": "I.1", "number": 1, "title": "Texto oficial del tema…", "keywords": ["firma electrónica"] } ] }
  ]
}
```

## 5. Destinos adjudicados — `data/meta/destinos/<conv-id>.json`

```jsonc
{
  "schema_version": 1,
  "convocatoria": "li-2024",
  "source": { "title": "Resolución … por la que se nombran funcionarios de carrera…", "boe_id": "BOE-A-…", "url": "…" },
  "anonymized": true,
  "total": 1500,
  "notes": null,
  "assignments": [
    { "order": 1, "organism": "Agencia Estatal de Administración Tributaria", "unit": null,
      "province": "Madrid", "locality": "Madrid" }
  ]
}
```

`order` = número de orden del proceso selectivo (1 = mejor nota). Sin nombres ni DNI.

## 6. Localidades — `data/meta/localidades.json`

```jsonc
{
  "schema_version": 1,
  "source": { "title": "INE · Cifras oficiales de población (Padrón)", "url": "…" },
  "population_year": 2024,
  "tiers": [
    { "id": "gran_ciudad",  "order": 1, "label": "Grandes ciudades", "description": "Municipios ≥ 300.000 habitantes" },
    { "id": "ciudad_media", "order": 2, "label": "Capitales y ciudades medias", "description": "Capitales de provincia y municipios ≥ 50.000 hab." },
    { "id": "pueblo",       "order": 3, "label": "Pueblos y zonas menos pobladas", "description": "Resto de municipios" }
  ],
  "localities": [
    { "name": "Madrid", "province": "Madrid", "population": 3416771, "is_provincial_capital": true, "tier": "gran_ciudad" }
  ]
}
```

## 7. Teoría — `data/teoria/index.json` + `data/teoria/<topic-id>.md`

Un fichero Markdown por tema del temario (`data/teoria/IV.7.md`), sus metadatos de autor en
`data/teoria/meta/IV.7.json` (`{ "topic", "summary", "key_points", "sources", "updated" }`) y un
índice **generado** con `cd tools && uv run python -m opotai.build_theory` (título oficial desde
`data/meta/temario.json`; minutos de lectura a ~170 palabras/minuto). Así varios autores pueden
trabajar en temas distintos sin editar el mismo fichero. Índice resultante:

```jsonc
{
  "schema_version": 1,
  "updated": "2026-10-11",
  "topics": [
    {
      "topic": "IV.7",
      "file": "IV.7.md",
      "title": "Título oficial del tema",
      "summary": "Una o dos frases.",
      "reading_minutes": 14,
      "key_points": ["Idea clave 1", "Idea clave 2"],
      "sources": [{ "title": "RFC 791", "url": "https://www.rfc-editor.org/rfc/rfc791" }],
      "updated": "2026-10-11"
    }
  ]
}
```

Contenido del Markdown (castellano, elaboración propia, sin copiar temarios de academias):
`# Título`, introducción, apartados con los conceptos que el programa enumera, tablas y
esquemas de repaso, normativa con artículos clave, **«Lo que más cae»** (según las preguntas
oficiales clasificadas en el tema), **«Trampas habituales»** y referencias. Se valida con
`data/schema/teoria.schema.json`.
