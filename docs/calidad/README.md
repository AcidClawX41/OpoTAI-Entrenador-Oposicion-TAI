# Control de calidad del contenido

Verificaciones **independientes** (herramientas distintas de las que generan los datos) para
garantizar que los exámenes oficiales y la teoría se trasladan a la app sin errores.

| Comprobación | Herramienta | Qué garantiza | Informe |
|---|---|---|---|
| Validación de esquema y coherencia | `tools/opotai/validate.py` | JSON válidos, ids únicos, 4 opciones, respuestas, rutas de imágenes | salida de consola / CI |
| Auditoría de contenido | `tools/qa/audit_contenido.py` | estructura frente al esquema oficial (80+5, 20+5…), anuladas, reparto A/B/C/D, figuras sin imagen, restos de PDF, opciones duplicadas, cobertura de teoría | [auditoria-contenido.md](auditoria-contenido.md) |
| Fidelidad de la transcripción | `tools/qa/fidelidad_pdf.py` | cada enunciado y cada opción aparece literalmente en el cuadernillo oficial del INAP | [fidelidad-pdf.md](fidelidad-pdf.md) |
| Respuestas oficiales | `tools/qa/plantillas.py` | cada respuesta (y cada anulada) coincide con la plantilla definitiva, o la provisional si aún no hay definitiva | [plantillas.md](plantillas.md) |

```bash
cd tools
uv run python -m opotai.fetch_exams          # descarga los PDF oficiales a data/raw (verifica sha256)
uv run python -m opotai.validate
uv run python qa/audit_contenido.py --md ../docs/calidad/auditoria-contenido.md
uv run python qa/fidelidad_pdf.py   --md ../docs/calidad/fidelidad-pdf.md
uv run python qa/plantillas.py      --md ../docs/calidad/plantillas.md
```

## Resultado a 11/10/2026 (15 exámenes, 1.772 preguntas con reservas)

- **Alcance**: exámenes oficiales de TAI de 2016 en adelante (ingreso libre y promoción interna).
  De la OEP 2016 de promoción interna no hay copia pública del cuadernillo ni de la plantilla.
- **Transcripción**: 1.772/1.772 enunciados verificados. En los 9 exámenes con PDF digital
  (2021–2025), cada enunciado y opción aparece literalmente en el cuadernillo oficial. Los de
  2016, 2018 y 2019 son **escaneados**: se verifican con un OCR propio (Tesseract, independiente
  del usado para transcribirlos) por cobertura de palabras. Los 9 avisos residuales se revisaron:
  son ruido del OCR en términos cortos (`lpqx`/`lprm` leídos como «Ipax»/«!prm» —comprobado sobre
  la imagen de la página—, `JNDI`, `Jaql`, `CRLF injection`, una línea de opciones no leída en
  2019) y una figura de 2018 descrita en texto.
- **Respuestas**: los 14 exámenes con plantilla oficial coinciden al 100 % (incluidas las dos
  plantillas de los ejercicios de 2016 y 2019); 2025 y su llamamiento extraordinario con la
  provisional porque el INAP aún no ha publicado la definitiva. El 2.º ejercicio de 2018 no tiene
  plantilla pública: sus respuestas son **propuestas por OpoTAI**, marcadas para revisión, y la
  app lo indica («Respuestas propuestas (sin plantilla oficial)»).
- **Estructura**: todas las secciones cuadran con el esquema oficial de su convocatoria; las
  anuladas están identificadas y se sustituyen por reservas al corregir, como hace el tribunal. En
  2016 la 1.ª parte tenía bloque a elegir (comunes + III o IV): la réplica deja elegirlo.
- **Imágenes**: 20 figuras (esquemas de red, modelos entidad-relación, diagramas UML…), recortadas
  a alta resolución y sin referencias rotas.
