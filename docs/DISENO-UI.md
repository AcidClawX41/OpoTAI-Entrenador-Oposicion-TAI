# OpoTAI · Diseño de la interfaz

Interfaz de escritorio de **OpoTAI v1.0.0** (Tauri 2 + React 19 + TypeScript + Tailwind CSS 4).
Autor: **Eric Valls Gramunt** · Licencia GPL-3.0-or-later.

La interfaz es solo una **capa de presentación**: toda la lógica de negocio (generación de
exámenes, corrección, notas, cortes, predicción, repaso espaciado) vive en el núcleo Rust y se
consume por IPC con el contrato de `app/src/api/types.ts`. En el navegador (`pnpm dev`) un backend
simulado (`app/src/api/mock/`) implementa todos los comandos para el **modo demo**.

Capturas (1440×900, tema oscuro salvo las `*-claro`) en [`docs/capturas/`](capturas/).

---

## 1. Arquitectura de `app/src`

| Carpeta | Contenido |
|---|---|
| `api/` | `client.ts` (envoltorios tipados de `invoke`, argumentos en snake_case, errores normalizados a `ApiError`), `errors.ts`, `types.ts` (contrato, **no se modifica**) y `mock/` (backend del modo demo). |
| `app/` | `router.tsx` (`createHashRouter`), `Root` (arranque y perfil obligatorio), `ThemeController` (tema, acento y sonido), `RouteError`. |
| `pages/` | Una pantalla por ruta (ver §4). `StatsPage` se carga de forma perezosa (Recharts va en su propio fragmento). |
| `components/ui/` | Sistema de diseño propio: `Button`, `Badge`, `Card`, `Dialog`, `Tabs`, `controls` (Switch, Checkbox, Select, NumberField, Slider, Segmented, Field, TextInput), `overlays` (Tooltip, Popover, Collapsible), `display` (PageHeader, Stat, Meter, EmptyState, Avatar, Logo), `misc` (Kbd, Spinner, Skeleton, Progress), `Markdown`, `ImageLightbox`, `RadialGauge`, `Toaster`. |
| `components/exam/` | Examen inmersivo: `QuestionCard`, `OptionList`, `Explanation`, `QuestionNavigator`, `CasePanels`, `TimerPill`, `ExamDialogs`, `SchemeSummary`, `FeedbackChooser`. |
| `components/results/` | `GradeSummary` (nota real, una o varias unidades), `PartsTable`, `BlockBreakdown`, `ReviewList`. |
| `components/prediction/` | `PredictionPanel` («Tus posibilidades») y piezas (`TierMeters`, `RankRange`). |
| `components/charts/` | `GradeChart` (Recharts), `ActivityCalendar`, `Sparkline`. |
| `components/stats/` | `TopicHeatmap`/`TopicTable`, `AttemptHistory`. |
| `components/settings/` | `AboutSection` y `LicenseDialog`. |
| `components/support/` | `SupportCorner` (botón «☕ Invítame a un café o dona» y entrada «Apoyar el proyecto») y `SupportDialog` (donaciones + «Sobre el autor»). |
| `components/layout/` | `AppShell`, `Sidebar` (plegable < 1200 px), `ProfileSwitcher`, `Splash`. |
| `lib/` | Módulos puros y testeados: `format` (Intl es-ES), `time`, `labels`, `specs`, `exam/*` (reducer, navegación, resumen del examen), `sfx` + `examSounds`, `heat` (escalas y calendario), `calculator`, `practiceSelection`, `highlight`, `color`, `text`, `version`. |
| `store/` | zustand: `session` (perfiles, ajustes, catálogo, sorteo), `exam` (examen en curso + caché de resultados), `ui` (barra lateral, visor de imágenes, apoyo, diálogos), `toast`. |
| `content/` | Textos del coordinador (`support.ts`, `legal.ts`), que la interfaz solo presenta. |

`localStorage` solo se usa dentro de `api/mock/` (con try/catch). La app no carga recursos remotos:
la tipografía Inter va empaquetada (`@fontsource-variable/inter`) y los enlaces externos se abren en
el navegador del sistema (`@tauri-apps/plugin-opener`).

## 2. Sistema de diseño

- **Tokens** como variables CSS `--app-*` en `index.css` (tema claro en `:root`, oscuro en
  `[data-theme="dark"]`), expuestos a Tailwind con `@theme inline` (`bg-surface`, `text-fg-muted`,
  `border-border`, `bg-accent/10`, `text-success-text`, `shadow-card`…).
- **Neutros** zinc; **acento** configurable (violeta por defecto, presets índigo, azul, verde azulado,
  rosa y naranja, o color libre): `ThemeController` escribe `--app-accent` y el texto legible encima;
  el resto de matices se derivan con `color-mix()`.
- **Semánticos**: esmeralda (acierto/APTO), rosa (fallo/NO APTO), ámbar (aviso, dudosas, repaso),
  cielo (información).
- **Tema**: sistema / claro / oscuro por perfil.
- **Tipografía**: Inter variable; cifras tabulares (`tabular-nums`) en notas, temporizador y tablas;
  monoespaciada del sistema para código.
- **Movimiento**: `motion` con `MotionConfig reducedMotion="user"`; transiciones cortas (150–350 ms).
- **Diseño adaptable**: consultas de contenedor (`@container`, `@3xl:`, `@5xl:`) para que cada
  tarjeta se adapte a su ancho real; barra lateral plegable por debajo de 1200 px.
- **Accesibilidad**: navegación por teclado completa, `radiogroup`/`radio` en opciones, `tablist`,
  diálogos con trampa de foco y Escape, avisos `aria-live` del temporizador, enlace «Saltar al
  contenido», textos alternativos en imágenes y gráficos (`role="img"` + resumen).
- **Gráficos**: una sola serie en el acento, umbral del aprobado (50) como línea discontinua; mapa de
  temas con escala **divergente rosa ↔ azul cielo** (legible con daltonismo rojo-verde, 50 % neutro);
  barras apiladas aciertos/fallos/blancos.

## 3. Componentes destacados

- **Markdown seguro** (`components/ui/Markdown.tsx`): CommonMark + tablas GFM, sin HTML crudo.
  `urlTransform` propio que **solo** admite `data:image/*` como origen de imágenes (las que envía el
  núcleo en base64); `javascript:` y otros `data:` se bloquean. Tablas con desplazamiento horizontal,
  código en monoespaciada con resaltado ligero.
- **Imágenes** (`ImageLightbox`): fondo blanco (diagramas legibles en oscuro), `alt`, visor a pantalla
  completa con zoom. En las opciones de respuesta la opción sigue siendo pulsable entera y el zoom va
  en un botón aparte (no se anidan elementos interactivos). El modo demo resuelve `assets/…` vía
  `/__opotai/dev-data/asset/…` solo en desarrollo.
- **RadialGauge**: arco de 270° con marca del aprobado/corte.
- **GradeSummary**: «Nota real» (directa transformada como el tribunal: el corte equivale a 50, o a
  25 en cada parte en los esquemas por partes), APTO/NO APTO, margen respecto al corte y aciertos
  aproximados que faltan; con **dos unidades** (TAI-LI 2025, dos partes de 0–50) muestra dos
  indicadores y la nota final.
- **PredictionPanel**: P(aprobar), P(plaza), nota esperada, corte estimado, puesto ≈ p50 (p10–p90)
  con barra frente a las plazas, destinos por tamaño de localidad, línea «Grandes ciudades sin contar
  Madrid (Barcelona, València, Sevilla…): X %» (oculta si es `null`), ciudades principales,
  localidades preferidas, veredicto y «¿Cómo se calcula?» (razonamiento, supuestos, calidad de datos y
  aviso de estimación orientativa).
- **SupportCorner / SupportDialog**: triángulo fijo abajo a la derecha (`clip-path`, recorta también la
  zona clicable) que abre el diálogo con PayPal, Ko-fi y GitHub Sponsors (logos blancos que toman el
  color de marca al pasar el ratón) y la tarjeta «Sobre el autor» con monograma «in» propio y enlace
  a LinkedIn. Textos y enlaces salen de `content/support.ts` sin cambios.
- **AboutSection** («Acerca de»): versión de `get_app_info` (`v1.0.0`; en el modo demo se lee de
  `app/package.json` con `__APP_VERSION__`), commit de compilación, licencia GPL-3.0-or-later con su
  texto íntegro (`get_license_text`), «© 2026 Eric Valls Gramunt», avisos de `content/legal.ts`,
  componentes de terceros, código fuente, LinkedIn y «Apoyar el proyecto». Enlazada desde el pie de
  la barra lateral («OpoTAI v1.0.0 · © 2026 Eric Valls Gramunt» → `/ajustes/acerca-de`); la pantalla
  de perfiles muestra «v1.0.0 · GPL-3.0 · © 2026 Eric Valls Gramunt».

## 4. Pantallas

| Ruta | Pantalla |
|---|---|
| `/perfiles` | Bienvenida y selección/gestión de perfiles; en navegador, «Explorar con datos de ejemplo». |
| `/sorteo` | **Simulacro sorpresa**: el núcleo sortea (`draw_random_exam`) un examen oficial o un simulacro numerado; solo «Comenzar simulacro» o «Ahora no», sin volver a sortear. Un sorteo por perfil y arranque; banner «Simulacro pendiente» en el inicio y la barra lateral. |
| `/inicio` | Probabilidad de plaza, evolución, KPIs, temas débiles, accesos rápidos, examen sin terminar y cuenta atrás. |
| `/simulacro` | Formato oficial vigente, simulacro completo o rápido, temporizador, preguntas no vistas y modo de corrección. |
| `/examen/:id` | Examen inmersivo: pestañas 1.ª/2.ª parte, supuesto a elegir con enunciado en vista dividida, navegador de preguntas, dudosas, temporizador con avisos (10 y 2 min), autoguardado, corrección al final o inmediata («modo estudio»), insignia de sorteo. |
| `/resultados/:id` | Nota real y APTO/NO APTO, desglose por partes, «Tus posibilidades», bloques y temas (con «Practicar tus temas más flojos») y revisión con filtros Falladas (por defecto) / En blanco / Dudosas / Correctas / Todas, «Por qué», «Has marcado B: …», referencias y aviso de normativa desactualizada. |
| `/oficiales` | Convocatorias anteriores con plantilla, reservas, anuladas, fuente oficial y última nota. |
| `/temas` | Árbol de bloques y temas con acierto por tema, búsqueda, selección múltiple (`?temas=I.1,IV.7`, `?bloque=III`, `?bancos=oficiales`), origen de preguntas, bancos, supuestos, corrección y tiempo. |
| `/supuestos` | Supuestos por bloque (III/IV) y turno, `?banco=` para filtrar, vista previa del enunciado y lectura completa. |
| `/repaso` | Repaso espaciado (cajas Leitner: hoy, 1, 3, 7 y 15 días), pendientes por bloque. |
| `/estadisticas` | KPIs, evolución de la nota (corte 50), acierto por bloques, mapa/tabla de temas, actividad de 120 días e historial (abrir/eliminar). |
| `/calculadora` | Esquema, aciertos/fallos/blancos por parte con validación, corte automático o personalizado, nota en vivo y la misma tarjeta de posibilidades. |
| `/teoria`, `/teoria/:tema` | Índice por bloques y tema completo con «Ideas clave», índice lateral, fuentes, «Practicar este tema» y «Ver preguntas oficiales»; si falta, «La teoría se está preparando». |
| `/ajustes/:seccion` | Apariencia, Examen y sonido, Objetivo (convocatoria, fecha, corte, hasta 3 localidades), Perfil, Datos y fuentes, Acerca de. |

## 5. Atajos de teclado (examen)

`1`–`4` o `A`–`D` responder · `0` dejar en blanco · `←` `→` navegar · `F` marcar como dudosa ·
`Ctrl`+`↵` entregar. Se pueden desactivar en Ajustes.

## 6. Sonido

Efectos sintetizados con Web Audio (`lib/sfx.ts`, sin ficheros): acierto, fallo, navegación, «tic»
neutro al marcar en exámenes corregidos al final, y apto/no apto al entregar. El contexto de audio se
crea tras la primera interacción; respeta `sound_enabled` y `sound_volume` (interruptor, deslizador
y «Probar» en Ajustes) y **nunca suena al dejar una pregunta en blanco** (`lib/examSounds.ts`).

## 7. Calidad

- `pnpm typecheck`, `pnpm test` (Vitest + Testing Library: reducer y lógica pura, puntuación del mock,
  sonido con `AudioContext` simulado, sorteo, apoyo y LinkedIn, «Acerca de» y licencia, opciones,
  Markdown seguro) y `pnpm build`.
- Capturas reproducibles: con `pnpm dev` en marcha, `node scripts/screenshots.mjs` (Chromium headless
  de `playwright-core`); `--only inicio,examen` para un subconjunto.
