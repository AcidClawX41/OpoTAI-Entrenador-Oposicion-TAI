# Historial de versiones

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y
[versionado semántico](https://semver.org/lang/es/). La versión se gestiona con
`tools/qa/version.py` (Cargo, Tauri e interfaz siempre coinciden).

© 2026 Eric Valls Gramunt · Licencia GPL-3.0-or-later.

## [1.0.0] · 2026-10-12

Primera versión de **OpoTAI**, entrenador de escritorio para la oposición TAI (AGE).

### Añadido
- **Simulacro Freestyle**: el examen real completo (80 preguntas + supuesto, con o sin cronómetro y
  la corrección oficial) con una batería al azar de ingreso libre y promoción interna de cualquier
  año. En «Practicar por temas», práctica libre al azar y filtro por convocatoria.
- Exámenes oficiales del TAI de las convocatorias 2015 a 2025 (examinados de 2016 a 2026; ingreso
  libre y promoción interna, incluido el llamamiento extraordinario de 2025; 16 exámenes en 17
  cuadernillos y 2.125 preguntas) con plantilla oficial (provisional en 2015), preguntas de reserva y figuras de los
  supuestos prácticos; en 2015 y 2016, 1.ª parte con bloque III o IV a elegir; 2018 libre como
  examen completo aunque sus dos ejercicios se publicaran por separado.
- Figuras de los cuadernillos escaneados recortadas a su resolución nativa y limpiadas, con
  reconstrucción vectorial (SVG) de los diagramas borrosos y transcripción en tablas.
- Teoría de los 33 temas del programa oficial vigente.
- Diagramas explicativos en la teoría (SVG estáticos generados desde Mermaid o dibujados a mano,
  sobre hoja clara y con zoom), p. ej. capas OSI frente a TCP/IP o la conexión TCP.
- Simulacros con el formato vigente (1.ª parte de 80 preguntas + 2.ª parte con un supuesto
  práctico de 20 a elegir entre dos, 120 minutos), simulacro sorpresa al abrir la app y
  simulacros numerados de composición fija. Cada parte se califica por separado con su escala y
  su mínimo oficiales.
- Dos modos para cada examen completo: **aprendizaje** (sin límite de tiempo, corrección y
  explicación en cada pregunta) y **examen real** (cronómetro con el tiempo oficial y entrega
  automática al agotarse).
- Simulador de destinos tras el examen: número de orden estimado, plazas libres a tu turno y
  destino más probable con datos reales del BOE (2019–2024), sobre un mapa 2.5D de España con las
  capitales de provincia y de comunidad autónoma.
- Privacidad: cada persona usa su nombre o un alias; los datos se guardan solo en el equipo, sin
  cuentas, servidores ni telemetría, y se pueden borrar desde la app.
- Corrección idéntica a la oficial: penalización de un tercio, blancos sin penalización, reservas
  que sustituyen anuladas y transformación de la puntuación directa a la calificación con el corte.
- Explicaciones de los fallos, repaso espaciado, estadísticas por bloque y tema, calculadora de nota.
- Estimación de la probabilidad de aprobar, de obtener plaza y de destino (grandes ciudades,
  ciudades medias o pueblos) con datos oficiales de convocatorias anteriores.
- Perfiles para estudiar en grupo (con alias y avatar propio), efectos de sonido minimalistas.
- Sección de apoyo al proyecto (PayPal, Ko-fi, GitHub Sponsors) y tarjeta «Sobre el autor».
- Control de calidad independiente del contenido (fidelidad frente a los PDF oficiales y
  contraste con las plantillas).
- Instaladores para Windows (.msi, -setup.exe y .exe portable), Linux (.deb, .rpm, .AppImage) y
  macOS Apple Silicon (.dmg).
