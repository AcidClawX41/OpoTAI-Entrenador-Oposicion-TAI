# Arquitectura de OpoTAI

> **OpoTAI** — entrenador de escritorio para la oposición **TAI** (Cuerpo de Técnicos Auxiliares
> de Informática de la Administración del Estado). Autor: **Eric Valls Gramunt**.

## 1. Objetivos

1. Practicar con **exámenes oficiales reales** de convocatorias anteriores (1.ª parte + supuesto
   práctico) y con **simulacros** generados con el formato vigente.
2. Corregir **exactamente como el tribunal**: aciertos, penalización por error (⅓), blancos sin
   penalización, reservas que sustituyen anuladas, transformación de la puntuación directa a la
   calificación 0–100 con la nota de corte.
3. Explicar **por qué** cada respuesta incorrecta lo es, para memorizar conceptos y fallos.
4. Estimar la **nota real**, la **probabilidad de obtener plaza** y de poder elegir destino en
   **grandes ciudades, ciudades medias o pueblos**, con datos oficiales históricos.
5. App **multiplataforma** (Windows, Linux, macOS Apple Silicon), moderna, rápida y offline.

## 2. Visión general

```text
┌──────────────────────────── App de escritorio (Tauri 2) ────────────────────────────┐
│                                                                                      │
│  UI · React 19 + TypeScript + Tailwind 4          Núcleo · Rust                      │
│  ┌─────────────────────────────┐   invoke (IPC)   ┌──────────────────────────────┐   │
│  │ Perfiles · Inicio           │ ───────────────► │ app/src-tauri (comandos)     │   │
│  │ Simulacro / Examen          │ ◄─────────────── │   └─► tai-core::Engine        │   │
│  │ Resultados + predicción     │   JSON snake_case│        ├─ catalog (bancos)    │   │
│  │ Oficiales · Temas · Repaso  │                  │        ├─ builder (exámenes)  │   │
│  │ Estadísticas · Calculadora  │                  │        ├─ scoring (nota real) │   │
│  └─────────────────────────────┘                  │        ├─ prediction (plaza)  │   │
│                                                    │        ├─ stats · srs         │   │
│                                                    │        └─ storage (SQLite)    │   │
│                                                    └──────────────────────────────┘   │
│           datos embebidos: data/banks/**, data/meta/**  ·  progreso: SQLite local    │
└──────────────────────────────────────────────────────────────────────────────────────┘

Pipeline de datos (Python, fuera de la app):
 INAP/BOE (PDF) ──► tools/opotai/fetch_exams ──► parse_exam ──► data/banks/oficiales/*.json
                                    tools/research/* ──► data/meta/*.json (+ destinos anonimizados)
                                         tools/opotai/validate ──► CI
```

## 3. Decisiones técnicas

| Decisión | Alternativas | Motivo |
|---|---|---|
| **Tauri 2** (Rust + WebView) | Electron, egui/iced/Slint | Binarios pequeños (~10 MB), Rust nativo para la lógica, UI web moderna, instaladores para Windows/Linux/macOS desde CI. |
| **Núcleo en crate independiente `tai-core`** | Lógica en los comandos | Testeable sin GUI, reutilizable (CLI futura, WASM), separación dominio/presentación. |
| **React 19 + TypeScript + Tailwind 4** | Svelte, Vue | Ecosistema maduro (Recharts, Motion, Lucide), tipado estricto del contrato IPC. |
| **Datos embebidos (JSON) + SQLite de usuario** | Todo en SQLite / servidor | Los bancos son versionables y revisables en Git; el progreso es local y privado (offline). |
| **Python para el pipeline de datos** | Rust para todo | Mejores librerías de extracción de PDF (PyMuPDF, pdfplumber); no forma parte del binario. |
| **Contrato snake_case único** | camelCase en la UI | Evita capas de traducción y errores de mapeo entre serde y TypeScript. |

## 4. Estructura del repositorio

```text
├── crates/tai-core/        # dominio: modelos, puntuación, generador, estadísticas, predicción, SQLite
├── app/                    # aplicación de escritorio
│   ├── src/                # UI React (pantallas, componentes, api/ con contrato y mock)
│   └── src-tauri/          # binario Tauri: estado, comandos IPC, datos embebidos
├── data/
│   ├── schema/             # JSON Schema de todos los formatos
│   ├── banks/              # bancos de preguntas (oficiales y de práctica) + imágenes
│   └── meta/               # puntuación, convocatorias, temario, localidades, destinos
├── tools/                  # pipeline Python (uv): descarga, extracción, validación, investigación
├── docs/                   # arquitectura, contratos, investigación, datos
└── .github/workflows/      # CI (tests) y release (instaladores multiplataforma)
```

## 5. Flujo de un simulacro

1. La UI llama a `start_exam(profile_id, { type: "simulacro", … })`.
2. `builder` selecciona 80 preguntas estratificadas por bloque y 2 supuestos (bloques III y IV),
   crea el intento en SQLite y devuelve el `ExamPaper` **sin soluciones**.
3. Durante el examen la UI guarda progreso (`save_progress`) y gestiona temporizador, marcadas
   como dudosas y elección de supuesto.
4. `submit_exam` → `scoring` calcula la puntuación directa por parte, aplica el corte y la
   transformación oficial, `prediction` estima aprobado/plaza/destino, `stats` y `srs` actualizan el
   historial y el repaso de fallos.
5. La UI muestra la nota real, la predicción y la revisión pregunta a pregunta con explicaciones.

## 6. Calidad

- **Rust**: `cargo fmt`, `cargo clippy -D warnings`, tests unitarios (puntuación con casos
  oficiales, generador determinista con semilla, predicción, almacenamiento con SQLite temporal).
- **UI**: `tsc --noEmit`, Vitest + Testing Library en componentes clave; API simulada (`mock`) para
  desarrollar y probar en navegador sin Tauri.
- **Datos**: `tools/opotai/validate.py` (JSON Schema + coherencia) en CI.
- **Privacidad**: sin telemetría ni red; ningún dato personal de opositores en el repositorio.

## 7. Distribución

GitHub Actions con `tauri-apps/tauri-action`: instaladores `.msi`/`.exe` (Windows x64),
`.deb`/`.AppImage`/`.rpm` (Linux x64) y `.dmg` (macOS Apple Silicon, `aarch64-apple-darwin`).
