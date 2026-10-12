# OpoTAI · tools

Herramientas Python (gestionadas con `uv`) para descargar fuentes oficiales, extraer exámenes de PDF y validar los datos.

```bash
cd tools
uv sync
uv run python -m <modulo>
```

## Exámenes oficiales (`opotai`)

Genera `data/banks/oficiales/<banco>.json` a partir de los cuadernillos y plantillas del INAP.
Documentación completa (bancos, incidencias, convenciones): [`docs/datos/examenes-oficiales.md`](../docs/datos/examenes-oficiales.md).

```bash
uv run python -m opotai.fetch_exams                # descarga los PDF del manifiesto a data/raw/ y verifica SHA-256
uv run python -m opotai.parse_exam                 # regenera todos los bancos (o: parse_exam tai-li-2024 …)
uv run python -m opotai.parse_exam tai-li-2024 --dump   # vuelca el texto extraído para revisarlo
uv run python -m opotai.parse_exam --check         # no escribe; falla si la salida cambiaría
uv run python -m opotai.validate                   # valida todo data/ (--strict: avisos = errores)
uv run python -m opotai.report --update-doc        # actualiza las tablas (bancos e imágenes) de docs/datos/examenes-oficiales.md
uv run pytest                                      # tests de los ayudantes del parser, del validador y de annotate
```

| Fichero | Contenido |
|---|---|
| `sources/examenes.json` | Manifiesto de documentos: `bank_id`, `kind`, `title`, `url`, `file`, `sha256`, `bytes` (`fetch_exams --record` rellena los hashes de entradas nuevas). |
| `opotai/exam_configs/<banco>.json` | Metadatos del banco, secciones esperadas, cabeceras/pies del cuadernillo, regiones de figuras vectoriales (con `attach` para forzar su destino), regiones `exclude` cuyo texto se descarta (listados de código numerados que se escriben a mano en el enunciado), `figures` (por nombre estable: `alt`, `transcription`, `image`, `dpi`; `redraw` con la reconstrucción SVG fiel de `tools/sources/redraws/[<banco>/]<fichero>.svg` cuando el escaneo es borroso; `enhance` (`true` u objeto con `white`/`gamma`…) para recortar el escaneo a su resolución nativa con limpieza fiel, incompatible con `dpi`; y `erase`, lista de rectángulos `[x0, y0, x1, y1]` que se blanquean, solo junto a `enhance`), plantillas, verificación A/B y `spot_checks`. Excepcionalmente, `own_answer_key` (`{"p2-s1": {"questions": "ABCD…", "reserve": "…"}}`) da respuestas propias a un ejercicio sin plantilla oficial publicada; exige `source.answer_key: "propia"` y ninguna plantilla principal (caso `tai-li-2018-ej2`). |
| `opotai/fixes/<banco>.json` | Correcciones manuales reproducibles por id de pregunta (siempre con `note`): `replace`, `set` (con `same_text`), `options_code`, `options_block`, `text_code`, `text_block`; y un bloque `global` de sustituciones para todo el banco (errores recurrentes de OCR). |
| `opotai/booklet.py`, `answer_key.py`, `pdfdoc.py`, `textutil.py` | Extracción de cuadernillos y plantillas (PyMuPDF) y limpieza de texto. |
| `opotai/figures.py` | Imágenes: nombres estables (`p2-s1-statement-1.png`, `p1-q012.png`, `p1-q040-opt-b.png`), recorte ajustado a ≥ 2× y colocación en línea en el enunciado/texto/opción o en `media`, con su transcripción Markdown. |
| `opotai/crosscheck.py`, `verify.py` | Verificación con el modelo B y con `pdftotext` (poppler). |
| `opotai/ocr.py`, `ocr_review.py`, `spellcheck.py`, `sources/ocr/` | Cuadernillos escaneados: OCR con Tesseract (dos pasadas, o una con `--single-pass`; `--file` limita a un cuadernillo; caché versionada que usa el lector como capa de texto), volcado para la revisión manual con las palabras dudosas marcadas y recortes de página, y pasada ortográfica de un banco generado (`python -m opotai.spellcheck <banco>`: palabras desconocidas para `aspell -l es` y para el resto de bancos, fuera del código). En la configuración, `ocr_word_fixes` corrige palabras sueltas (con `x`/`y` para desambiguar, o `"old": null` para añadir una cabecera que el OCR no lee). Requiere `tesseract-ocr` + `tesseract-ocr-spa` (y `aspell-es` para la ortografía) solo para rehacer la caché o revisar. |
| `opotai/report.py` | Tablas de bancos e imágenes para la documentación. |

### Validador común

`uv run python -m opotai.validate` (lo usan todos los agentes) valida contra `data/schema/*.schema.json`
los bancos (`data/banks/**`) y, si existen, `meta/scoring.json`, `convocatorias.json`, `temario.json`,
`localidades.json` y `destinos/*.json`, y aplica reglas de calidad (ids, 4 opciones, respuestas,
recuentos frente al esquema de puntuación, restos de PDF, Markdown peligroso, duplicados, `topic` frente
al temario, referencias cruzadas) y `teoria/index.json`. Imágenes: `media` y referencias en línea
`![alt](assets/…)` de cualquier campo Markdown deben existir bajo `data/banks/` (con alt, ≤ ~300 KB),
avisa de ficheros de `assets/` sin referencias y de preguntas o supuestos que mencionan una
figura/tabla/esquema sin imagen, tabla ni bloque de código. Errores → código de salida 1.

### Diagramas de la teoría: `diagrams.py`

Los temas de `data/teoria/*.md` pueden llevar diagramas **SVG estáticos** (la app no carga Mermaid):

1. Escribe la fuente en `tools/sources/diagramas/<tema>/<nombre>.mmd` (Mermaid: flujos, secuencias,
   estados, clases) o `<nombre>.svg` (a mano: pilas de capas, RAID, jerarquías…). Nombre en
   minúsculas, cifras y guiones; tema como `IV.7`.
2. Genera: `uv run python -m opotai.diagrams [IV.7 | IV.7/osi-tcpip] [--force]` →
   `data/teoria/diagramas/<tema>-<nombre>.svg` (versionado). Solo rehace lo que ha cambiado (hash
   de la fuente en un comentario de la salida). Mermaid se renderiza con `npx` y
   `@mermaid-js/mermaid-cli` (versión fijada en `MERMAID_CLI`) usando el Chromium de
   `/opt/pw-browsers` o `PUPPETEER_EXECUTABLE_PATH` (nunca descarga navegadores).
3. Cítalo en el tema justo donde ayude, con un alt descriptivo y un pie en cursiva:
   `![Texto alternativo descriptivo](diagramas/<tema>-<nombre>.svg)` y debajo `*Figura: …*`.
4. `uv run python -m opotai.diagrams --check` (sin node ni Chromium; va en CI) comprueba que cada
   salida existe, está al día con su fuente, es segura (sin `<script>`, `on…=`, `foreignObject`,
   `href` externos, `@import` ni `data:`; con `viewBox`, `width`/`height` iguales a él, letra
   ≥ 13 px y ≤ 150 KB) y que toda imagen citada en la teoría existe. `opotai.validate` también
   revisa las imágenes de la teoría. Después de tocar un `.md`, ejecuta `opotai.build_theory`
   (el alt cuenta en los minutos de lectura).

**Editar un `.mmd` en Mermaid Live**: copia el fichero entero en <https://mermaid.live> (las líneas
`%%` son comentarios), ajústalo con la vista previa y pega el resultado de vuelta en el fichero. El
tema y la fuente de la app los pone la herramienta (`MERMAID_CONFIG`: tema `base`, Inter,
`htmlLabels: false`), así que no hace falta bloque `%%{init}%%`; usa `<br/>` para partir líneas.
Trucos y límites de Mermaid con esta configuración:

- **Negrita**: `<b>` sale como texto literal (sin HTML); usa cadenas Markdown
  ``A["`**GRUB 2**
  menú del núcleo`"]`` (salto de línea real dentro de las comillas invertidas). La herramienta rechaza
  un SVG con etiquetas HTML visibles.
- **Letra < 13 px**: Mermaid trae reglas pequeñas en su CSS (`div.mermaidTooltip` 12 px,
  `g.classGroup text` 10 px, `.edgeTerminals` 11 px) y `autonumber` escribe los números de las
  secuencias con `font-size="12px"`; la normalización sube todo a 13 px. Aun así, `autonumber` deja
  los números apretados en su círculo: mejor numerar a mano en el texto del mensaje («1. SYN»).
- **Formas *stadium*** `([…])`: se dibujan con trazados de unos 30 KB cada una; usa `(…)` (esquinas
  redondeadas) o `[…]` para no acercarte al límite de 150 KB.
- **Ancho**: `--check` avisa por encima de 975 px, porque a 900 px la letra de 13 px quedaría por
  debajo de 12 px. Acorta los rótulos, usa `<br/>`, cambia `LR`/`TB` o parte el diagrama.

**Aspecto**: ancho de diseño ≤ 900 px, letra ≥ 13 px (14–16 px en el texto principal), fuente
`Inter, system-ui, sans-serif`, texto `#1f2937` y secundario `#475569`, líneas `#64748b`, fondo de
hoja blanco (la app pone el marco claro también en tema oscuro). Gama por nivel, relleno/borde, en
el orden de las capas OSI (y para cualquier jerarquía de arriba abajo): 7 `#ede9fe`/`#7c3aed`,
6 `#e0e7ff`/`#4f46e5`, 5 `#dbeafe`/`#2563eb`, 4 `#cffafe`/`#0891b2`, 3 `#d1fae5`/`#059669`,
2 `#fef3c7`/`#d97706`, 1 `#ffe4e6`/`#e11d48`; neutros `#f8fafc`/`#cbd5e1`; notas `#fef9c3`/`#ca8a04`.

### Contenido de autor: `annotate.py`

Las explicaciones y la clasificación por temas no se escriben a mano en los bancos, sino con:

```bash
uv run python -m opotai.annotate --input anotaciones.json --dry-run   # comprueba sin escribir
uv run python -m opotai.annotate --input anotaciones.json             # aplica
```

`anotaciones.json` es una lista (o `{"annotations": [...]}`) de objetos con `id` obligatorio y, opcionalmente,
`explanation`, `option_notes` (4 elementos), `topic`, `references`, `tags`, `outdated`, `outdated_note` y
`needs_review`. Cada id se localiza en el banco que lo contiene; nunca se tocan texto, opciones ni respuesta;
se rechazan ids inexistentes o repetidos y campos desconocidos; `topic` se comprueba contra
`data/meta/temario.json`; el resultado se valida con el esquema antes de escribir (UTF-8, indentación 2,
sin escapar acentos). Si algo falla no se escribe nada.

Al regenerar un banco, `parse_exam` **conserva** esos campos por id de pregunta (avisa si cambian el texto
o la respuesta, y aborta si desaparece una pregunta con contenido de autor salvo `--force`).
