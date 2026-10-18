<div align="center">

<img src="docs/capturas/v1/social-preview.png" width="100%" alt="OpoTAI · Entrenador para la oposición TAI" />

# OpoTAI

**Entrena la oposición TAI como el día del examen.**

Aplicación de escritorio **gratuita y de código abierto** para preparar la oposición de
**Técnicos Auxiliares de Informática de la Administración del Estado (TAI · AGE)**: exámenes
oficiales reales corregidos como lo hace el tribunal, una explicación para cada fallo, la teoría
de los 33 temas y una estimación, con datos oficiales, de tu nota, tus posibilidades de plaza y
el destino que podrías elegir.

Desarrollada por **[Eric Valls Gramunt](https://www.linkedin.com/in/eric-valls-gramunt-9238b3b7)**.

[![Descargar](https://img.shields.io/badge/⬇️_Descargar-Windows_·_Linux_·_macOS-7c3aed?style=for-the-badge)](../../releases/latest)

![Windows](https://img.shields.io/badge/Windows-10%2F11_x64-0078D4?logo=windows&logoColor=white)
![Linux](https://img.shields.io/badge/Linux-x64-FCC624?logo=linux&logoColor=black)
![macOS](https://img.shields.io/badge/macOS-Apple_Silicon-000000?logo=apple&logoColor=white)
![Licencia](https://img.shields.io/badge/licencia-GPL--3.0-blue)
![Sin conexión](https://img.shields.io/badge/funciona-sin_conexión-2ea44f)

<img src="docs/video/opotai-demo.gif" width="900" alt="Demostración de OpoTAI: resultados, mapa de destinos y teoría" />

▶️ **[Ver el vídeo de presentación (40 s)](docs/video/opotai-demo.mp4)** · 🖼️ **[Capturas](#️-capturas)**

</div>

> **🆕 Novedades de la 1.0.1:** el supuesto se muestra «Sin corregir» (con su nota orientativa) cuando
> no se supera la 1.ª parte, y el **Bloque I se ha revisado pregunta a pregunta contra el BOE**
> (24 explicaciones corregidas o actualizadas). Detalles en el [CHANGELOG](CHANGELOG.md).

---

## Índice

- [Descargar e instalar](#️-descargar-e-instalar)
- [Qué ofrece](#-qué-ofrece)
- [Capturas](#️-capturas)
- [Exámenes incluidos](#-exámenes-incluidos)
- [Cómo corrige y cómo estima tu plaza](#-cómo-corrige-y-cómo-estima-tu-plaza)
- [Privacidad](#-privacidad)
- [Preguntas frecuentes](#-preguntas-frecuentes)
- [Para desarrolladores](#️-para-desarrolladores)
- [Apoya el proyecto](#-apoya-el-proyecto)
- [Aviso y licencia](#️-aviso)

## ⬇️ Descargar e instalar

Descarga la última versión desde **[Releases](../../releases/latest)** y elige el fichero de tu
sistema:

| Sistema | Fichero recomendado | Otras opciones | La primera vez |
|---|---|---|---|
| **Windows 10/11** (x64) | `OpoTAI_x.y.z_x64-setup.exe` | `.msi` (instalador) · `.exe` portable (sin instalar) | La app no lleva firma comercial: si SmartScreen avisa, pulsa **Más información → Ejecutar de todas formas**. |
| **Linux** (x64) | `.deb` (Ubuntu, Debian, Mint) | `.rpm` (Fedora, openSUSE) · `.AppImage` (portable) | El `.AppImage` necesita FUSE 2: en Ubuntu 24.04 o posterior, `sudo apt install libfuse2t64`. |
| **macOS** (Apple Silicon: M1, M2, M3, M4…) | `.dmg` | — | Arrastra OpoTAI a Aplicaciones y ábrela. Si macOS la bloquea: **Ajustes del Sistema → Privacidad y seguridad → Abrir igualmente** (en macOS 14 o anterior también vale clic derecho → Abrir). |

No necesita conexión a Internet ni crear cuentas: todos los exámenes, la teoría y los datos
oficiales van incluidos en la app.

## ✨ Qué ofrece

### 📝 Exámenes oficiales reales

- **16 exámenes oficiales** de las convocatorias **2015 a 2025** (examinados entre 2016 y 2026),
  de **ingreso libre y promoción interna**, incluido el llamamiento extraordinario de 2025:
  **2.125 preguntas**, todas con su **explicación**, con sus **preguntas de reserva** y las
  **figuras** de los supuestos.
- Transcritos de los cuadernillos oficiales y **contrastados automáticamente** con la plantilla
  del tribunal y con el propio PDF ([control de calidad](docs/calidad/README.md)).
- Las figuras de los cuadernillos escaneados (modelos de datos, diagramas UML, esquemas de red) se
  muestran **reconstruidas en vectorial**, nítidas a cualquier zoom, junto al original.

### ⏱️ Simulacros como el día del examen

- **Examen en dos partes**, como el real: **1.ª parte** (cuestionario de teoría) y **2.ª parte**
  (**supuesto práctico** a elegir entre dos, de los bloques III y IV). Cada parte se califica con
  su escala y su mínimo oficiales; para aprobar hay que superar las dos.
- **Dos modos** para cada examen:
  - **Aprendizaje**: sin límite de tiempo, con la corrección y la explicación en cada pregunta.
  - **Examen real**: cronómetro con el tiempo oficial (de 90 a 180 minutos según la convocatoria),
    avisos a 10 y 1 minuto y entrega automática al agotarse.
- **Simulacro sorpresa** al abrir la app: OpoTAI sortea un examen oficial o uno de los
  **30 simulacros numerados** de composición fija, priorizando los que aún no has hecho.
- **Simulacro Freestyle**: el examen real completo (80 preguntas + supuesto de 20, con o sin
  cronómetro y la corrección oficial) con una **batería al azar de ingreso libre y promoción
  interna de cualquier año**, para repasar de forma general.
- **Simulacros a medida** con el formato vigente o el de cualquier convocatoria anterior, completos
  o en versión rápida, con preguntas repartidas por bloques como en el examen real.

### ✅ Corrección idéntica a la oficial

- Cada acierto suma, cada error resta lo que fijan las bases de esa convocatoria (⅓ o ¼) y las
  respuestas en blanco no puntúan.
- Las **reservas sustituyen a las preguntas anuladas** por el tribunal, en orden.
- La puntuación directa se transforma a la **calificación oficial** de cada parte con la nota de
  corte, como en las bases.

### 💡 Una explicación para cada fallo

- Por qué la respuesta correcta lo es, **por qué falla cada opción** y el artículo, norma o
  estándar de referencia.
- Aviso cuando una respuesta ha quedado **desactualizada** por cambios normativos o técnicos
  (por ejemplo, Ley 30/1992 → Leyes 39 y 40/2015, LOPD → RGPD + LOPDGDD, ENS 2010 → 2022).
- Cada pregunta está clasificada en su **tema del temario**.

### 🎯 Tu nota real, tus posibilidades de plaza y tu destino

- **Probabilidad de aprobar y de obtener plaza** en la próxima convocatoria (modelo Monte Carlo
  con las notas de corte y los aprobados reales de convocatorias anteriores).
- **🗺️ Simulador de destinos** con un **mapa 2.5D de España** con las capitales de provincia y
  de comunidad autónoma: con tu nota, OpoTAI repite las convocatorias de 2019, 2021, 2023 y 2024
  con sus notas y destinos reales publicados en el BOE. Te dice tu **número de orden**, qué
  plazas **seguían libres al llegar tu turno** (por provincia, localidad y tipo de organismo) y
  dónde eligieron las personas con un número de orden como el tuyo. Zoom, vista 2.5D o plana.

### 📚 Teoría, práctica y progreso

- **Teoría de los 33 temas** del programa oficial vigente, con nivel de manual y **42 diagramas**
  (capas OSI y TCP/IP, RAID, cifrado, UML, E/R y normalización, Scrum, poderes del Estado…):
  esquemas, tablas, ejemplos y supuestos resueltos, normativa clave, lo que más cae en el examen,
  trampas habituales y repaso rápido.
- **Práctica por temas y bloques** (o **libre al azar**, filtrando por ingreso libre o promoción
  interna), **supuestos prácticos** sueltos y **repaso espaciado de fallos** (sistema de cajas).
- **Estadísticas**: evolución de tu nota, precisión por bloque y tema, temas débiles y actividad.
- **Calculadora de nota** para cualquier convocatoria, con su simulador de destinos.

### 👥 Para ti y para tu grupo de estudio

- **Perfiles** con nombre o alias y avatar (un emoji o **tu propia imagen**), cada uno con su
  progreso. Ideal para estudiar en grupo en el mismo ordenador.
- Tema **claro y oscuro**, **sonidos** discretos (desactivables) y **atajos de teclado**.
- **Sin conexión, sin cuentas y sin telemetría**: tus datos no salen de tu equipo.

## 🖼️ Capturas

| Inicio | Examen real con cronómetro |
|---|---|
| ![Inicio](docs/capturas/v1/inicio.png) | ![Examen real](docs/capturas/v1/examen-real.png) |
| **Modo aprendizaje: explicación al momento** | **Supuesto práctico con figura reconstruida** |
| ![Modo aprendizaje](docs/capturas/v1/examen-aprendizaje.png) | ![Supuesto con figura](docs/capturas/v1/supuesto-figura.png) |
| **Resultados y probabilidad de plaza** | **Simulador de destinos (mapa 2.5D)** |
| ![Resultados](docs/capturas/v1/resultados.png) | ![Simulador de destinos](docs/capturas/v1/destinos.png) |

<details>
<summary><b>Más capturas</b> (sorteo, revisión, teoría, estadísticas, perfil, privacidad…)</summary>

| Simulacro sorpresa: estructura y modo | Revisión con explicaciones |
|---|---|
| ![Simulacro sorpresa](docs/capturas/v1/sorteo.png) | ![Revisión](docs/capturas/v1/resultados-revision.png) |
| **Teoría de los 33 temas** | **Un tema por dentro** |
| ![Teoría](docs/capturas/v1/teoria.png) | ![Tema de teoría](docs/capturas/v1/teoria-tema.png) |
| **Estadísticas** | **Exámenes oficiales** |
| ![Estadísticas](docs/capturas/v1/estadisticas.png) | ![Exámenes oficiales](docs/capturas/v1/oficiales.png) |
| **Perfil con alias y avatar propio** | **Privacidad y datos** |
| ![Perfil](docs/capturas/v1/perfil.png) | ![Privacidad](docs/capturas/v1/privacidad.png) |
| **Vista plana del mapa en tema claro** | **Invítame a un café** |
| ![Mapa plano](docs/capturas/v1/destinos-plano-claro.png) | ![Donaciones](docs/capturas/v1/donaciones.png) |
| **Diagramas en la teoría** | |
| ![Diagrama de un tema de teoría](docs/capturas/v1/teoria-diagrama.png) | |

</details>

Más capturas en [`docs/capturas/v1/`](docs/capturas/v1/).

## 📋 Exámenes incluidos

| Convocatoria (OEP) | Examen | Acceso | Estructura | Preguntas (con reservas) | Plantilla |
|---|---|---|---|---|---|
| 2025 | 23/05/2026 | Libre | 80 + supuesto de 20 (1 de 2) | 135 | provisional |
| 2025 (llamamiento extraordinario) | 24/07/2026 | Libre | 80 + supuesto de 20 (1 de 2) | 135 | provisional |
| 2025 | 23/05/2026 | Promoción interna | 50 + supuesto de 12 (1 de 2) | 85 | definitiva |
| 2024 | 14/12/2024 | Libre | 80 + supuesto de 20 (1 de 2) | 135 | definitiva |
| 2024 | 14/12/2024 | Promoción interna | 50 + supuesto de 12 (1 de 2) | 85 | definitiva |
| 2023 (OEP 2020–2022) | 17/09/2023 | Libre | 80 + supuesto de 20 (1 de 2) | 135 | definitiva |
| 2023 | 17/09/2023 | Promoción interna | 50 + supuesto de 12 (1 de 2) | 85 | definitiva |
| 2021 (OEP 2019) | 06/11/2021 | Libre | 80 + supuesto de 20 (1 de 2) | 135 | definitiva |
| 2021 (OEP 2019) | 06/11/2021 | Promoción interna | 50 + supuesto de 12 (1 de 2) | 85 | definitiva |
| 2019 (OEP 2018) | 19/10/2019 | Libre | 100 + supuesto de 30 (1 de 2) | 175 | definitiva |
| 2019 (OEP 2018) | 19/10/2019 | Promoción interna | 50 + supuesto de 12 (1 de 2) | 85 | definitiva |
| 2018 (OEP 2017) | 2018 | Libre | 100 + supuesto de 30 (1 de 2), en dos ejercicios | 169 | definitiva (2.º ejercicio: respuestas propuestas) |
| 2018 (OEP 2017) | 2018 | Promoción interna | 50 + supuesto de 12 (1 de 2) | 83 | definitiva |
| 2016 | 25/02/2017 | Libre | 50 comunes + 50 del bloque III o IV + supuesto de 40 | 245 | definitiva |
| 2015 | 2016 | Libre | 50 comunes + 50 del bloque III o IV + supuesto de 40 | 242 | provisional |
| 2015 | 2016 | Promoción interna | 25 comunes + 25 del bloque III o IV + supuesto de 12 | 111 | provisional |

Fuera de alcance o no disponibles: los procesos anteriores a la OEP 2015 y la promoción interna de
la OEP 2016 (sin copia pública). Detalle en [`docs/datos/examenes-oficiales.md`](docs/datos/examenes-oficiales.md).

## 🧮 Cómo corrige y cómo estima tu plaza

- **Puntuación directa** de cada parte = aciertos × valor − errores × penalización (las respuestas
  en blanco no cuentan). Las preguntas anuladas se sustituyen por reservas.
- **Calificación**: la directa se transforma a la escala oficial de cada parte (0–50 o 0–100) con
  la nota de corte de esa convocatoria, tal y como establecen las bases. Hay que superar el mínimo
  de cada parte.
- **Probabilidad de aprobar y de plaza**: simulación Monte Carlo con la incertidumbre de la nota de
  corte y la distribución real de notas de convocatorias anteriores.
- **Destino**: con tu nota se calcula el número de orden que habrías tenido en cada convocatoria
  pasada y se reproduce la elección de destinos por orden (art. 26 del RD 364/1995) con los
  destinos publicados en el BOE. Es una **estimación orientativa**, no una garantía.

Metodología completa en [`docs/investigacion/`](docs/investigacion/).

## 🔒 Privacidad

OpoTAI funciona **sin conexión**: no tiene cuentas, servidores, publicidad, analítica ni
telemetría. Cada perfil guarda su alias, sus ajustes y su progreso **solo en tu equipo** (base de
datos local SQLite) y puedes borrarlo desde la app cuando quieras. Si usas una imagen como avatar,
se guarda reducida y **sin metadatos** (EXIF). La app no pide ningún dato personal sensible.
Detalles en [`docs/PRIVACIDAD.md`](docs/PRIVACIDAD.md).

## ❓ Preguntas frecuentes

**¿Es una aplicación oficial?**
No. Es un proyecto educativo independiente, sin relación con el INAP ni con la Administración.
Las preguntas proceden de documentos públicos oficiales y las explicaciones son de elaboración
propia.

**¿Necesito Internet?**
No. Todo va incluido en la app. Solo los enlaces externos (por ejemplo, las donaciones) abren tu
navegador.

**He encontrado una errata o una explicación discutible.**
Ábrela como *issue* en este repositorio indicando el examen y el número de pregunta. Las
preguntas dudosas están marcadas internamente para revisarlas.

**¿Se actualizará con nuevas convocatorias?**
Sí: cada examen nuevo se incorporará en una nueva versión, con su plantilla y sus explicaciones.

**¿Dónde están mis datos y cómo los borro?**
En la carpeta de datos de la aplicación de tu usuario (la ruta exacta aparece en *Ajustes →
Privacidad y datos*). Puedes borrar un perfil desde la app o desinstalar y borrar esa carpeta.

**Windows o macOS dicen que la app no es de confianza.**
La app no lleva un certificado de firma comercial (cuestan dinero cada año). Sigue los pasos de
la tabla de [descargas](#️-descargar-e-instalar): es seguro y el código está aquí para revisarlo.

## 🛠️ Para desarrolladores

```text
Interfaz · React 19 + TypeScript + Tailwind 4 ──invoke──► Tauri 2 (Rust) ──► tai-core (Rust)
                                                                              ├─ scoring    · nota oficial
                                                                              ├─ builder    · exámenes y simulacros
                                                                              ├─ prediction · plaza y destino
                                                                              ├─ stats/srs  · progreso y repaso
                                                                              └─ storage    · SQLite
Pipeline de datos · Python (uv): PDF oficiales → OCR y parseo → JSON validado → datos embebidos
```

| Capa | Tecnología |
|---|---|
| Núcleo de dominio (puntuación, generador, predicción, estadísticas, SQLite) | Rust (`crates/tai-core`) |
| Aplicación de escritorio | Tauri 2 (Rust) |
| Interfaz | React 19, TypeScript, Tailwind CSS 4, Motion |
| Pipeline y control de calidad de los datos | Python (PyMuPDF, Tesseract, JSON Schema) |
| Instaladores | GitHub Actions + tauri-action (Windows, Linux y macOS Apple Silicon) |

Requisitos: Rust estable, Node 22 + pnpm y, en Linux, WebKitGTK
(`libwebkit2gtk-4.1-dev libayatana-appindicator3-dev librsvg2-dev`).

```bash
cd app && pnpm install
pnpm tauri dev                 # app de escritorio en modo desarrollo
pnpm dev                       # solo la interfaz en el navegador (datos de ejemplo)

cargo test --workspace         # núcleo y app (incluye pruebas con los datos reales)
pnpm --dir app test            # interfaz
cd tools && uv run python -m opotai.validate && uv run python qa/audit_contenido.py   # datos

cd app && pnpm tauri build     # instaladores locales
```

Documentación técnica: [arquitectura](docs/ARQUITECTURA.md) · [contrato de datos](docs/CONTRATO-DATOS.md)
· [API interna](docs/CONTRATO-API.md) · [diseño de la interfaz](docs/DISENO-UI.md)
· [exámenes y pipeline](docs/datos/examenes-oficiales.md) · [lanzamiento](docs/LANZAMIENTO.md)
· [historial de versiones](CHANGELOG.md).

## ☕ Apoya el proyecto

OpoTAI es gratuito, sin anuncios y de código abierto. Si te ayuda a preparar el TAI, puedes
invitarme a un café o hacer una donación para que siga incorporando cada nueva convocatoria y
ampliando las explicaciones y la teoría:

[![PayPal](https://img.shields.io/badge/PayPal-donar-002991?logo=paypal&logoColor=white)](https://www.paypal.com/paypalme/EricValls)
[![Ko-fi](https://img.shields.io/badge/Ko--fi-invítame_a_un_café-FF6433?logo=kofi&logoColor=white)](https://ko-fi.com/ericdev)
[![GitHub Sponsors](https://img.shields.io/badge/GitHub_Sponsors-apoyar-EA4AAA?logo=githubsponsors&logoColor=white)](https://github.com/sponsors/AcidClawX41)

Compartirla con otros opositores o dejar una ⭐ en el repositorio también ayuda muchísimo.

**Sobre el autor:** soy Eric Valls Gramunt, técnico de soporte IT (ASIR y SMR). Si quieres
proponer una mejora o contactar conmigo, escríbeme por
[LinkedIn](https://www.linkedin.com/in/eric-valls-gramunt-9238b3b7).

## ⚖️ Aviso

Proyecto **educativo y no oficial**, sin relación con el INAP ni con la Administración General del
Estado. Las preguntas oficiales proceden de documentos públicos del INAP y del BOE; las
explicaciones, la teoría y las reconstrucciones de figuras son de elaboración propia y pueden
contener errores. La estimación de plaza y destino es **orientativa** y se basa en datos
históricos: no garantiza ningún resultado. Comprueba siempre la convocatoria vigente en el BOE.
Los nombres y logotipos de terceros (PayPal, Ko-fi, GitHub, LinkedIn) pertenecen a sus titulares.

## 📄 Licencia

© 2026 **Eric Valls Gramunt** · Distribuido bajo la licencia [GPL-3.0](LICENSE).
