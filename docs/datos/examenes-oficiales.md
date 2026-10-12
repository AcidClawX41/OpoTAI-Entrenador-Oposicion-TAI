# Exámenes oficiales del TAI (`data/banks/oficiales/`)

> Proyecto **OpoTAI** · autor: **Eric Valls Gramunt**.
> Formato de los bancos: [`docs/CONTRATO-DATOS.md`](../CONTRATO-DATOS.md) (sección 1) y
> [`data/schema/bank.schema.json`](../../data/schema/bank.schema.json).

Transcripción fiel de los exámenes oficiales públicos del Cuerpo de Técnicos Auxiliares de
Informática de la Administración del Estado (TAI), tal como los publica el INAP (Comisión
Permanente de Selección), con la respuesta de la plantilla oficial. Todo se genera con
herramientas reproducibles en [`tools/`](../../tools/README.md): nada se edita a mano en los JSON.

Alcance (decisión del usuario): exámenes **celebrados de 2016 en adelante**, lo que incluye los de
la OEP 2015 (examinados en 2016). Los procesos de las OEP 2015, 2016 y 2017 ya no están en la sede
del INAP; se usan copias públicas de los **PDF oficiales sin alterar** (cuestionarios con su código
«15/TAI-LI», «15/TAI-PI», «16/TAI-LI», «17/TAI-LI», «17/TAI-PI» y plantillas del INAP) archivadas
en [baquedano.es](https://www.baquedano.es/grupo_C.html). De la OEP 2015 solo hay **plantillas
provisionales** públicas (`source.answer_key: "provisional"`). La excepción a «respuesta de la
plantilla oficial» es `tai-li-2018-ej2`: el INAP no publicó (o ya no es localizable) la plantilla de
ese ejercicio, así que sus respuestas son **propuestas por OpoTAI** (`source.answer_key: "propia"`),
razonadas en la anotación de cada pregunta y marcadas con `needs_review`.

## Bancos generados

La tabla se genera con `uv run python -m opotai.report --update-doc` (no editar a mano).

<!-- tabla-bancos:inicio -->
| Banco | Convocatoria | Acceso | Examen | Preguntas por sección (+reserva) | Anuladas | Plantilla | Figuras | Documentos oficiales |
|---|---|---|---|---|---|---|---|---|
| `tai-li-2025` | `li-2025` | Libre | 23/05/2026 | p1 80+5<br>p2-s1 20+5<br>p2-s2 20+5 | 0 | provisional | 1 | [cuadernillo](https://sede.inap.gob.es/sites/sede/files/public/2026-05/Cuestionario%20TAI-L-ModeloA.pdf) · [plantilla prov.](https://sede.inap.gob.es/sites/sede/files/public/2026-05/Plantilla%20respuestas%20TAI-L-A_act.pdf) |
| `tai-li-2025-ext` | `li-2025` | Libre | 24/07/2026 | p1 80+5<br>p2-s1 20+5<br>p2-s2 20+5 | 0 | provisional | 0 | [cuadernillo](https://sede.inap.gob.es/sites/sede/files/public/2026-07/cuestionario_TAI-L_ext_9QVS9NM8ER_154AB89SD658.pdf) · [plantilla prov.](https://sede.inap.gob.es/sites/sede/files/public/2026-07/Plantilla_respuestas_prov_TAI-L_ext_2Y6UHS3CF2_154AB89SD658.pdf) |
| `tai-pi-2025` | `pi-2025` | Promoción interna | 23/05/2026 | p1 50+5<br>p2-s1 12+3<br>p2-s2 12+3 | 1 | definitiva | 1 | [cuadernillo](https://sede.inap.gob.es/sites/sede/files/public/2026-05/Cuestionario%20TAI-P-ModeloA.pdf) · [plantilla def.](https://sede.inap.gob.es/sites/sede/files/public/2026-09/Plantilla%20respuestas%20Def%20TAI-P-A.pdf) · [plantilla prov.](https://sede.inap.gob.es/sites/sede/files/public/2026-05/Plantilla%20respuestas%20TAI-P-ModeloA.pdf) |
| `tai-li-2024` | `li-2024` | Libre | 14/12/2024 | p1 80+5<br>p2-s1 20+5<br>p2-s2 20+5 | 4 | definitiva | 1 | [cuadernillo](https://www.inap.es/documents/59312/2364268/Cuestionario_TAI_LI_2024_A_M8L91VL1CL_154AB89SD658.pdf/43a5d8c6-3f74-dbca-8452-c00408125ff8) · [plantilla def.](https://www.inap.es/documents/59312/2364268/Plantilla+Cuestionario_TAI_LI_2024_A_definitiva.pdf/927bb295-6199-2a83-20e1-8cf970aa177e) · [plantilla prov.](https://www.inap.es/documents/59312/2364268/Plantilla_Respuestas_PROV_TAI_LI_2024_A_6J5MFQ8OEN_154AB89SD658.pdf/542eb6eb-73d7-4612-06bf-ce245160fd5c) |
| `tai-pi-2024` | `pi-2024` | Promoción interna | 14/12/2024 | p1 50+5<br>p2-s1 12+3<br>p2-s2 12+3 | 0 | definitiva | 1 | [cuadernillo](https://www.inap.es/documents/59312/2364118/Cuestionario_TAI_PI_2024_A_3GZ5F829JV_154AB89SD658.pdf/1b2e81f9-779b-c97a-580e-0dd1da24ad18) · [plantilla def.](https://www.inap.es/documents/59312/2364118/Plantilla+Cuestionario_TAI_PI_2024_A_definitiva.pdf/31d14516-c3c6-9852-7d7c-94345641fb3e) · [plantilla prov.](https://www.inap.es/documents/59312/2364118/Plantilla_Respuestas_PROV_TAI_PI_2024_A_OIGFE7ZBA4_154AB89SD658.pdf/3ca3a976-2c9f-8975-395d-f3c9ca1ce1d0) |
| `tai-li-2023` | `li-2023` | Libre | 17/09/2023 | p1 80+5<br>p2-s1 20+5<br>p2-s2 20+5 | 6 | definitiva | 3 | [cuadernillo](https://www.inap.es/documents/59312/2194858/Cuestionario+TAI-L_2023.pdf/505d8c94-69a3-2971-b013-76c83e442ba1) · [plantilla def.](https://www.inap.es/documents/59312/2194858/PlantillaRespuestas+DEFINITIVA+TAI-L_oep2022.pdf/54977d89-8c20-cb49-d715-23cb72681c35) · [plantilla prov.](https://www.inap.es/documents/59312/2194858/PlantillaRespuestas+TAI-L_2023.pdf/0c2b4a46-bfa5-f165-dc95-7bbec8b675ef) |
| `tai-pi-2023` | `pi-2023` | Promoción interna | 17/09/2023 | p1 50+5<br>p2-s1 12+3<br>p2-s2 12+3 | 0 | definitiva | 3 | [cuadernillo](https://www.inap.es/documents/59312/2194876/Cuestionario+TAI-PI_2023.pdf/5de03cad-c8b3-7231-1aff-96afaa23d3f2) · [plantilla def.](https://www.inap.es/documents/59312/2194876/Plantilla+respuestas+DEFINITIVA+TAI-P_oep2022.pdf/3dd0da87-b08b-00e2-5cc1-35d8579b4136) · [plantilla prov.](https://www.inap.es/documents/59312/2194876/PlantillaRespuestas+TAI-PI_2023.pdf/662da569-0f2d-980e-9a22-3e1876635051) |
| `tai-li-2021` | `li-2021` | Libre | 06/11/2021 | p1 80+5<br>p2-s1 20+5<br>p2-s2 20+5 | 0 | definitiva | 1 | [cuadernillo](https://www.inap.es/documents/59312/1925774/cues_1er_ejer_TAI-L_oep19_154AB89SD658.pdf/ac7ec9d6-3ac6-4457-6687-6ecf53aa158e) · [plantilla def.](https://www.inap.es/documents/59312/1925774/Plantilla_definitivaTAI-LEjercicionico2019_154AB89SD658.pdf/3a177074-d70b-2fda-e9ec-38cc0942944d) · [plantilla prov.](https://www.inap.es/documents/59312/1925774/plant_prov_1er_ejer_TAI-L_oep19_154AB89SD658.pdf/674ea505-fc2c-68ab-1259-91b2aa264aae) |
| `tai-pi-2021` | `pi-2021` | Promoción interna | 06/11/2021 | p1 50+5<br>p2-s1 12+3<br>p2-s2 12+3 | 0 | definitiva | 1 | [cuadernillo](https://www.inap.es/documents/59312/1925806/cues_1er_ejer_TAI-P_oep19_154AB89SD658.pdf/69f68075-790a-96eb-fe71-68758f73f4de) · [plantilla def.](https://www.inap.es/documents/59312/1925806/Plantilla_definitivaTAI-PEjercicionico2019_154AB89SD658.pdf/7d5f23e1-b935-d873-bd2a-61cd84b65602) · [plantilla prov.](https://www.inap.es/documents/59312/1925806/plant_prov_1er_ejer_TAI-P_oep19_154AB89SD658.pdf/1ef5df0c-0769-0c4f-2061-749781551136) |
| `tai-li-2019` | `li-2019` | Libre | 19/10/2019 | p1 100+5<br>p2-s1 30+5<br>p2-s2 30+5 | 1 | definitiva | 1 | [cuadernillo](https://www.inap.es/documents/59312/1790179/07TAIL_154AB89SD658.pdf/4c0b46eb-c8ff-1c9c-0749-06aab6f0a9e1) · [plantilla def.](https://www.inap.es/documents/59312/1790179/Plantilla_defTAI-L1ejer_154AB89SD658.pdf/a546831b-fe61-6dd4-230b-5171c13b27df) · [plantilla prov.](https://www.inap.es/documents/59312/1790179/07-Plantilla_provisionalTAI-LPrimerejercicio2018_154AB89SD658.pdf/2cd08c6d-89b7-a0b5-3075-e11687c05f62) |
| `tai-pi-2019` | `pi-2019` | Promoción interna | 19/10/2019 | p1 50+5<br>p2-s1 12+3<br>p2-s2 12+3 | 1 | definitiva | 1 | [cuadernillo](https://www.inap.es/documents/59312/1777270/08TAIPI_154AB89SD658.pdf/5b93e5e5-86bc-a169-8128-d3f8f073d9f2) · [plantilla def.](https://www.inap.es/documents/59312/1777270/Plantilla_defTAI-Pejerunico_154AB89SD658.pdf/0120eadc-9877-2a4c-51dd-02b625d9ef79) · [plantilla prov.](https://www.inap.es/documents/59312/1777270/08-Plantilla_provisionalTAI-PEjercicionico2018_154AB89SD658.pdf/5d446263-1325-2a6c-2121-f3fd966c4bca) |
| `tai-li-2018` | `li-2018` | Libre | — | p1 100+3 | 0 | definitiva | 0 | [cuadernillo](https://www.baquedano.es/TAI_ejer_1_libre_AGE_2018.pdf) · [plantilla def.](https://www.baquedano.es/TAI_sol_1_libre_AGE_2018.pdf) |
| `tai-li-2018-ej2` | `li-2018` | Libre | — | p2-s1 30+3<br>p2-s2 30+3 | 0 | propia | 4 | [cuadernillo](https://www.baquedano.es/TAI_ejer_2_libre_AGE_2018.pdf) |
| `tai-pi-2018` | `pi-2018` | Promoción interna | — | p1 50+3<br>p2-s1 12+3<br>p2-s2 12+3 | 2 | definitiva | 1 | [cuadernillo](https://www.baquedano.es/TAI_ejer_1_promo_AGE_2018.pdf) · [plantilla def.](https://www.baquedano.es/TAI_sol_1_promo_AGE_2018.pdf) |
| `tai-li-2016` | `li-2016` | Libre | 25/02/2017 | p1 50+3<br>p1-b3 50+3<br>p1-b4 50+3<br>p2-s1 40+3<br>p2-s2 40+3 | 1 | definitiva | 1 | [cuadernillo](https://www.baquedano.es/TAI_ejer_1_libre_AGE_2017.pdf) · [plantilla def.](https://www.baquedano.es/TAI_sol_1_libre_AGE_2017.pdf) |
| `tai-li-2015` | `li-2015` | Libre | — | p1 50+0<br>p1-b3 50+3<br>p1-b4 50+3<br>p2-s1 40+3<br>p2-s2 40+3 | 0 | provisional | 2 | [cuadernillo](https://www.baquedano.es/TAI_ejer_1_libre_AGE_2016.pdf) · [plantilla prov.](https://www.baquedano.es/TAI_sol_provi_1_libre_AGE_2016.pdf) |
| `tai-pi-2015` | `pi-2015` | Promoción interna | — | p1 25+0<br>p1-b3 25+3<br>p1-b4 25+3<br>p2-s1 12+3<br>p2-s2 12+3 | 0 | provisional | 2 | [cuadernillo](https://www.baquedano.es/TAI_ejer_1_promo_AGE_2016.pdf) · [plantilla prov.](https://www.baquedano.es/TAI_sol_provi_1_promo_AGE_2016.pdf) |
<!-- tabla-bancos:fin -->

En total: **17 bancos, 2125 preguntas** (incluidas las de reserva), 24 imágenes.

### Imágenes

Salvo un diagrama de clases dentro del enunciado de una pregunta (`tai-li-2018-ej2-p2-s1-007`),
todas las figuras están en los enunciados de los supuestos. Cada una se muestra **en línea en el punto exacto del enunciado**
donde aparece en el cuadernillo (`![alt](assets/<banco>/<sección>-statement-<k>.png)`), recortada
ajustada al contenido a ≥ 2× (144–300 ppp) y con texto alternativo descriptivo. Los modelos de
datos y diagramas de clases se **reconstruyen** además en tablas Markdown (entidades/clases con
sus atributos y claves, y relaciones con sus cardinalidades rotuladas) justo debajo de la imagen.

**Reconstrucciones vectoriales.** Las figuras escaneadas (2015–2019) y los esquemas de red (2015 y
2023) tienen además un **redibujo SVG hecho a mano** (`figures.<nombre>.redraw`, fuente en
`tools/sources/redraws/<banco>/`), que se muestra **antes** del original:
`![Reconstrucción de OpoTAI: …](assets/<banco>/<figura>-redibujo.svg)`, la línea
*«Original escaneado del cuadernillo:»* (o *«Original del cuadernillo:»* en los PDF digitales), la
imagen original y la transcripción. Son fieles al original (mismos elementos, atributos, claves,
cardinalidades —incluidas las «¿?»—, notación y rótulos, con sus erratas; sin interpretaciones que
delaten respuestas) y el pipeline exige SVG autónomos y seguros (sin scripts, `foreignObject`,
enlaces ni recursos externos; `viewBox` con `width`/`height` como tamaño intrínseco, letra ≥ 13 px).
Los originales escaneados se recortan a la **resolución nativa** del escaneo (200 ppp, sin
remuestrear) con una limpieza fiel (`enhance`: niveles, gamma, motas aisladas y enfoque suave, sin
umbralizar) y, si el texto vecino invade el recorte, `erase` lo blanquea. La tabla se genera con
`uv run python -m opotai.report --update-doc`.

<!-- tabla-imagenes:inicio -->
| Banco | Imagen | Dónde se muestra | Reconstrucción |
|---|---|---|---|
| `tai-li-2025` | [`p2-s1-statement-1.png`](../../data/banks/assets/tai-li-2025/p2-s1-statement-1.png) | p2-s1 · enunciado del supuesto, en línea | transcripción en tablas Markdown tras la imagen |
| `tai-pi-2025` | [`p2-s1-statement-1.png`](../../data/banks/assets/tai-pi-2025/p2-s1-statement-1.png) | p2-s1 · enunciado del supuesto, en línea | transcripción en tablas Markdown tras la imagen |
| `tai-li-2024` | [`p2-s1-statement-1.png`](../../data/banks/assets/tai-li-2024/p2-s1-statement-1.png) | p2-s1 · enunciado del supuesto, en línea | transcripción en tablas Markdown tras la imagen |
| `tai-pi-2024` | [`p2-s2-statement-1.png`](../../data/banks/assets/tai-pi-2024/p2-s2-statement-1.png) | p2-s2 · enunciado del supuesto, en línea | transcripción en tablas Markdown tras la imagen |
| `tai-li-2023` | [`p2-s1-statement-1.png`](../../data/banks/assets/tai-li-2023/p2-s1-statement-1.png) | p2-s1 · enunciado del supuesto, en línea | transcripción en tablas Markdown tras la imagen |
| `tai-li-2023` | [`p2-s2-statement-1.png`](../../data/banks/assets/tai-li-2023/p2-s2-statement-1.png) | p2-s2 · enunciado del supuesto, en línea | redibujo vectorial [`p2-s2-statement-1-redibujo.svg`](../../data/banks/assets/tai-li-2023/p2-s2-statement-1-redibujo.svg) + imagen (diagrama/esquema; descrito en el texto alternativo) |
| `tai-li-2023` | [`p2-s2-statement-2.png`](../../data/banks/assets/tai-li-2023/p2-s2-statement-2.png) | p2-s2 · enunciado del supuesto, en línea | redibujo vectorial [`p2-s2-statement-2-redibujo.svg`](../../data/banks/assets/tai-li-2023/p2-s2-statement-2-redibujo.svg) + imagen (diagrama/esquema; descrito en el texto alternativo) |
| `tai-pi-2023` | [`p2-s1-statement-1.png`](../../data/banks/assets/tai-pi-2023/p2-s1-statement-1.png) | p2-s1 · enunciado del supuesto, en línea | transcripción en tablas Markdown tras la imagen |
| `tai-pi-2023` | [`p2-s2-statement-1.png`](../../data/banks/assets/tai-pi-2023/p2-s2-statement-1.png) | p2-s2 · enunciado del supuesto, en línea | redibujo vectorial [`p2-s2-statement-1-redibujo.svg`](../../data/banks/assets/tai-pi-2023/p2-s2-statement-1-redibujo.svg) + imagen (diagrama/esquema; descrito en el texto alternativo) |
| `tai-pi-2023` | [`p2-s2-statement-2.png`](../../data/banks/assets/tai-pi-2023/p2-s2-statement-2.png) | p2-s2 · enunciado del supuesto, en línea | redibujo vectorial [`p2-s2-statement-2-redibujo.svg`](../../data/banks/assets/tai-pi-2023/p2-s2-statement-2-redibujo.svg) + imagen (diagrama/esquema; descrito en el texto alternativo) |
| `tai-li-2021` | [`p2-s1-statement-1.png`](../../data/banks/assets/tai-li-2021/p2-s1-statement-1.png) | p2-s1 · enunciado del supuesto, en línea | transcripción en tablas Markdown tras la imagen |
| `tai-pi-2021` | [`p2-s1-statement-1.png`](../../data/banks/assets/tai-pi-2021/p2-s1-statement-1.png) | p2-s1 · enunciado del supuesto, en línea | transcripción en tablas Markdown tras la imagen |
| `tai-li-2019` | [`p2-s1-statement-1.png`](../../data/banks/assets/tai-li-2019/p2-s1-statement-1.png) | p2-s1 · enunciado del supuesto, en línea | redibujo vectorial [`p2-s1-statement-1-redibujo.svg`](../../data/banks/assets/tai-li-2019/p2-s1-statement-1-redibujo.svg) + transcripción en tablas Markdown tras la imagen |
| `tai-pi-2019` | [`p2-s1-statement-1.png`](../../data/banks/assets/tai-pi-2019/p2-s1-statement-1.png) | p2-s1 · enunciado del supuesto, en línea | redibujo vectorial [`p2-s1-statement-1-redibujo.svg`](../../data/banks/assets/tai-pi-2019/p2-s1-statement-1-redibujo.svg) + transcripción en tablas Markdown tras la imagen |
| `tai-li-2018-ej2` | [`p2-s1-statement-1.png`](../../data/banks/assets/tai-li-2018-ej2/p2-s1-statement-1.png) | p2-s1 · enunciado del supuesto, en línea | redibujo vectorial [`p2-s1-statement-1-redibujo.svg`](../../data/banks/assets/tai-li-2018-ej2/p2-s1-statement-1-redibujo.svg) + transcripción en tablas Markdown tras la imagen |
| `tai-li-2018-ej2` | [`p2-s1-statement-2.png`](../../data/banks/assets/tai-li-2018-ej2/p2-s1-statement-2.png) | p2-s1 · enunciado del supuesto, en línea | redibujo vectorial [`p2-s1-statement-2-redibujo.svg`](../../data/banks/assets/tai-li-2018-ej2/p2-s1-statement-2-redibujo.svg) + transcripción en tablas Markdown tras la imagen |
| `tai-li-2018-ej2` | [`p2-s1-statement-3.png`](../../data/banks/assets/tai-li-2018-ej2/p2-s1-statement-3.png) | p2-s1 · enunciado del supuesto, en línea | redibujo vectorial [`p2-s1-statement-3-redibujo.svg`](../../data/banks/assets/tai-li-2018-ej2/p2-s1-statement-3-redibujo.svg) + transcripción en tablas Markdown tras la imagen |
| `tai-li-2018-ej2` | [`p2-s1-q007.png`](../../data/banks/assets/tai-li-2018-ej2/p2-s1-q007.png) | p2-s1-007 · enunciado de la pregunta, en línea | redibujo vectorial [`p2-s1-q007-redibujo.svg`](../../data/banks/assets/tai-li-2018-ej2/p2-s1-q007-redibujo.svg) + transcripción en tablas Markdown tras la imagen |
| `tai-pi-2018` | [`p2-s1-statement-1.png`](../../data/banks/assets/tai-pi-2018/p2-s1-statement-1.png) | p2-s1 · enunciado del supuesto, en línea | redibujo vectorial [`p2-s1-statement-1-redibujo.svg`](../../data/banks/assets/tai-pi-2018/p2-s1-statement-1-redibujo.svg) + transcripción en tablas Markdown tras la imagen |
| `tai-li-2016` | [`p2-s1-statement-1.png`](../../data/banks/assets/tai-li-2016/p2-s1-statement-1.png) | p2-s1 · enunciado del supuesto, en línea | redibujo vectorial [`p2-s1-statement-1-redibujo.svg`](../../data/banks/assets/tai-li-2016/p2-s1-statement-1-redibujo.svg) + transcripción en tablas Markdown tras la imagen |
| `tai-li-2015` | [`p2-s1-statement-1.png`](../../data/banks/assets/tai-li-2015/p2-s1-statement-1.png) | p2-s1 · enunciado del supuesto, en línea | redibujo vectorial [`p2-s1-statement-1-redibujo.svg`](../../data/banks/assets/tai-li-2015/p2-s1-statement-1-redibujo.svg) + transcripción en tablas Markdown tras la imagen |
| `tai-li-2015` | [`p2-s2-statement-1.png`](../../data/banks/assets/tai-li-2015/p2-s2-statement-1.png) | p2-s2 · enunciado del supuesto, en línea | redibujo vectorial [`p2-s2-statement-1-redibujo.svg`](../../data/banks/assets/tai-li-2015/p2-s2-statement-1-redibujo.svg) + imagen (diagrama/esquema; descrito en el texto alternativo) |
| `tai-pi-2015` | [`p2-s1-statement-1.png`](../../data/banks/assets/tai-pi-2015/p2-s1-statement-1.png) | p2-s1 · enunciado del supuesto, en línea | redibujo vectorial [`p2-s1-statement-1-redibujo.svg`](../../data/banks/assets/tai-pi-2015/p2-s1-statement-1-redibujo.svg) + transcripción en tablas Markdown tras la imagen |
| `tai-pi-2015` | [`p2-s1-statement-2.png`](../../data/banks/assets/tai-pi-2015/p2-s1-statement-2.png) | p2-s1 · enunciado del supuesto, en línea | redibujo vectorial [`p2-s1-statement-2-redibujo.svg`](../../data/banks/assets/tai-pi-2015/p2-s1-statement-2-redibujo.svg) + transcripción en tablas Markdown tras la imagen |
<!-- tabla-imagenes:fin -->

El mecanismo es general: si una figura aparece dentro de una pregunta seguida de más texto, va
en línea en `text` (`p1-q012.png`); si cierra el enunciado de la pregunta, en su `media`; si está
tras la etiqueta de una opción, en línea en esa opción (`p1-q040-opt-b.png`). Una figura sin
`alt` en la configuración, o metadatos sin figura, detienen la generación.

### Identificadores y convocatorias

El año del identificador es el de la **resolución de convocatoria** (no el del examen ni el
rótulo del INAP). Coincide con los ids de `data/meta/convocatorias.json` y `data/meta/scoring.json`.

| Banco | Rótulo en la web del INAP | OEP | Resolución de convocatoria | Examen |
|---|---|---|---|---|
| `tai-li-2025`, `tai-pi-2025` | Convocatoria 2025 | 2025 | 18/12/2025 (BOE 22/12/2025) | 23/05/2026 |
| `tai-li-2025-ext` | Convocatoria 2025 · llamamiento extraordinario | 2025 | 18/12/2025 | 24/07/2026 |
| `tai-li-2024`, `tai-pi-2024` | Convocatoria 2024 | 2023-2024 (PI: 2021-2024) | 09/07/2024 (BOE 10/07/2024) | 14/12/2024 |
| `tai-li-2023`, `tai-pi-2023` | Convocatoria 2022 | 2020, 2021 y 2022 | 20/01/2023 (BOE 27/01/2023) | 17/09/2023 |
| `tai-li-2021`, `tai-pi-2021` | Convocatoria 2019 | 2019 | 26/05/2021 (BOE 28/05/2021) | 06/11/2021 |
| `tai-li-2019`, `tai-pi-2019` | Convocatoria 2018 | 2018 | 14/06/2019 (BOE 17/06/2019) | 19/10/2019 (libre: 2.º ejercicio el 25/01/2020) |
| `tai-li-2018`, `tai-li-2018-ej2`, `tai-pi-2018` | Convocatoria 2017 (página retirada) | 2017 | 25/01/2018 (BOE 29/01/2018) | 2018 (fecha no localizada) |
| `tai-li-2016` | Convocatoria 2016 (página retirada) | 2016 | Orden HAP/998/2016, de 17/06/2016 (BOE 22/06/2016) | 25/02/2017 (1.er ejercicio) |
| `tai-li-2015`, `tai-pi-2015` | Convocatoria 2015 (página retirada) | 2015 | Orden HAP/2294/2015, de 21/10/2015 (BOE 03/11/2015; corrección BOE 12/12/2015) | febrero de 2016 (libre: 2.º ejercicio en mayo de 2016); fechas exactas no localizadas |

Estructura común (ejercicio único): primera parte de 80 preguntas + 5 de reserva (promoción
interna: 50 + 5) y segunda parte con **dos supuestos a elegir uno**, de 20 + 5 preguntas
(promoción interna: 12 + 3). Excepción: `tai-li-2019` (OEP 2018) tenía **dos ejercicios** en días
distintos, un cuestionario de 100 + 5 (`p1`) y un supuesto a elegir entre dos de 30 + 5 (`p2-s1`,
`p2-s2`), con una plantilla por ejercicio; `tai-pi-2019` usa 50 + 5 y 12 + 3. Lo mismo en la OEP
2017 (`tai-li-2018`: cuestionario de 100 + 3; `tai-li-2018-ej2`: supuestos de 30 + 3; `tai-pi-2018`,
ejercicio único de 50 + 3 y supuestos de 12 + 3). En la OEP 2016 (`tai-li-2016`) el primer ejercicio
tenía **bloques a elegir**: 50 + 3 preguntas comunes de los bloques I y II (`p1`, `block: null`) y
50 + 3 del bloque III **o** del IV (`p1-b3` y `p1-b4`, `part: 1`, `block` "III"/"IV"; el validador
comprueba comunes + cada alternativa frente al esquema); el segundo ejercicio, dos cuestionarios
prácticos de 40 + 3 a elegir (`p2-s1`, `p2-s2`). La OEP 2015 sigue el mismo modelo, pero sin
reservas en los bloques I y II: `tai-li-2015` tiene `p1` 50 + 0, `p1-b3`/`p1-b4` 50 + 3 y dos
cuestionarios prácticos de 40 + 3; `tai-pi-2015` es un ejercicio único (90 min) con 25 + 0 comunes,
25 + 3 del bloque III o IV y dos supuestos de 12 + 3. Duración: 120 min (libre) / 90 min (promoción interna), según los
criterios de corrección o las normas específicas de cada convocatoria. Cada banco tiene las
secciones `p1` (`part: 1`, `theory`), `p2-s1` y `p2-s2` (`part: 2`, `case`, una por supuesto, con su
enunciado completo en `statement`).

Fuentes: páginas de cada proceso en la sede del INAP
([listado del cuerpo](https://sede.inap.gob.es/es/procedimientos-y-servicios/seleccion/procesos-selectivos-de-cuerpos-y-escalas-generales/cuerpo-de-tecnicos-auxiliares-de-informatica-de-la-administracion-del-estado)).
Para las OEP 2015, 2016 y 2017, copias públicas de los PDF oficiales en
[baquedano.es](https://www.baquedano.es/grupo_C.html) (comprobados por su cabecera, código de
cuestionario, formato y metadatos de escaneo; las plantillas son las del INAP con su rótulo
«PLANTILLA DEFINITIVA DE RESPUESTAS…» —en 2015, «PLANTILLA PROVISIONAL…»— y la OEP). Todas las URL y los SHA-256 de los PDF están en
[`tools/sources/examenes.json`](../../tools/sources/examenes.json) y en `source.documents` de cada banco.

## Incidencias por examen

- **`tai-li-2025`** — respuestas de la **plantilla provisional** (versión «actualizada» del
  INAP): a 11/10/2026 no se ha publicado la definitiva (`source.answer_key: "provisional"`);
  regenerar cuando se publique. El supuesto II intercala dos textos de contexto entre preguntas
  (antes de la 4 y de la 14), que se añaden al final del `statement` marcados con
  *«Texto que precede a la pregunta N»*. Muchas preguntas de código (Java, SQL, HTML/XML).
- **`tai-li-2025-ext`** — llamamiento extraordinario (24/07/2026) con cuadernillo propio y
  **plantilla provisional**. Un único modelo, por lo que no hay verificación cruzada A/B.
- **`tai-pi-2025`** — plantilla definitiva: la p1-007 cambia de A a D («MODIFICADA») y se anula
  la reserva 1 del supuesto I.
- **`tai-li-2024`** — 4 anuladas (p1-022, p1-051, p1-070, p2-s2-015). El cuadernillo A imprime un
  fragmento sobrante «de datos.» en la opción c de la p1-028 (el modelo B lo imprime en otra
  pregunta): se elimina con un parche documentado. Las comillas de la p2-s1-001 son dos
  apóstrofos (`''`) que se ven como `"` y se normalizan.
- **`tai-pi-2024`** — el orden de los supuestos está **invertido**: el Supuesto I es el de
  sistemas y comunicaciones (bloque IV) y el II el de desarrollo (bloque III).
- **`tai-li-2023`** — 6 anuladas (incluida la reserva 1 del supuesto I). 3 figuras (diagrama de
  clases, con los recuadros «SR>T»/«T>SR» en blanco que piden completar las preguntas, y los
  modelos de red A y B).
- **`tai-pi-2023`** — plantilla definitiva idéntica a la provisional; 3 figuras.
- **`tai-li-2021`, `tai-pi-2021`** — el diagrama de clases del supuesto I es vectorial: se
  recorta como imagen con una región configurada (su texto se excluye del enunciado y se
  reconstruye en tablas). Se omite la portada de instrucciones. Sin anuladas.
- **`tai-li-2019`, `tai-pi-2019`** — los cuadernillos publicados son **escaneos sin capa de
  texto**: se transcriben por **OCR** (ver «Cuadernillos escaneados») y se **revisaron página a
  página contra la imagen** (la totalidad de las 175 + 85 preguntas y los enunciados). Las
  correcciones están en `fixes/` (reglas globales para errores recurrentes como palabras pegadas
  y parches por pregunta con su nota); las opciones y fragmentos de código ilegibles para el OCR
  se transcribieron de la imagen. Los enunciados de los supuestos del bloque III se transcribieron
  de la imagen con su modelo Entidad-Relación recortado y reconstruido en tablas. Se pierde la
  negrita del original. Plantillas: libre, 1 anulada (p2-s1-006) y p2-s1-028 cambia de B a A en
  la definitiva; promoción interna, 1 anulada (p2-s1-011).

- **`tai-li-2018`** (OEP 2017, libre) — solo el **primer ejercicio** (100 + 3) con su plantilla
  definitiva; el segundo, sin plantilla pública, está en `tai-li-2018-ej2`. Cuadernillo escaneado:
  OCR de una pasada y **pasada ortográfica** (`opotai.spellcheck`) con corrección de erratas del
  OCR (palabras pegadas, «Ei» por «El», punto final leído como coma…) comprobadas contra la imagen.
- **`tai-li-2018-ej2`** (OEP 2017, libre, segundo ejercicio) — cuadernillo oficial completo
  (bloques III y IV, 30 + 3 cada uno) con **respuestas propuestas por OpoTAI** (`own_answer_key`
  en la configuración; `source.answer_key: "propia"`), cada una razonada en
  `data/anotaciones/tai-li-2018-ej2.json` (explicación y nota por opción) y con `needs_review`. 4
  figuras: modelo de tablas, diagrama de clases del patrón Proxy (dentro de la pregunta 7), modelo
  E/R con arco de exclusividad y diagrama de componentes; el listado Java («Funcionalidad 1 y 2»)
  se excluye del OCR y se transcribe como bloque de código.
- **`tai-pi-2018`** (OEP 2017, promoción interna) — anuladas la 20 y la 46 de la primera parte.
  Esquema `tai-pi-2018` y convocatoria `pi-2018` en `data/meta` (anexo VI de BOE-A-2018-1169:
  50 + 3 y supuesto de 12 + 3 del bloque III o IV, 90 min); fecha del examen no localizada.
- **`tai-li-2016`** (OEP 2016, libre) — dos ejercicios con bloques a elegir (ver «Identificadores
  y convocatorias»); 1 anulada (p2-s1-020). Escaneo de peor calidad: cabecera «BLOQUE III» añadida
  como palabra en la capa OCR (blanco sobre gris, ilegible), listados de código C#, Java y PHP del
  segundo ejercicio excluidos del OCR y transcritos a mano como bloques de código, tablas MySQL
  recortadas como figura y reconstruidas en tablas; numerosas opciones de código, SQL e IP
  transcritas de la imagen.
- **`tai-li-2015`** (OEP 2015, libre) — dos ejercicios (febrero y mayo de 2016) con la estructura de
  bloques a elegir de 2016, pero **sin reservas en los bloques I y II**. Respuestas de las
  **plantillas provisionales** (no se ha localizado la definitiva; ninguna anulada en la
  provisional). Escaneos de buena calidad (200 ppp): OCR de una pasada con las portadas y páginas
  en blanco fuera (`ocr_skip_pages`), cabeceras «BLOQUE III/IV» en recuadro añadidas como palabra
  (`ocr_word_fixes`), pasada ortográfica (palabras pegadas, «1P» por «IP», punto final leído como
  coma…) y todo el código del segundo ejercicio (SQL, Java, Javadoc, HTML, CSS, C#, JSON, jQuery,
  órdenes de Linux, iptables) transcrito de la imagen como código en línea o bloques. 2 figuras: el
  modelo de datos del Museo (reconstruido en tabla) y el esquema de red del supuesto IV; la consulta
  con los huecos `**P38**`–`**P40**` y la salida de `uname -a` van como bloques de código en el
  enunciado. La p1-018 trae **las opciones a) y d) idénticas** en el original (comprobado contra la
  imagen; se conservan, el validador lo avisa y lleva `needs_review`; la respuesta B no se ve
  afectada). Revisar (`needs_review`, la letra provisional manda): p1-017 (la b) también es
  contenido mínimo del art. 3.2 del RD 1671/2009), p1-032 («Diccionario» y «Mapa» son el mismo TAD sin
  orden), p1-b3-002 (la c) también parece cierta), p1-b3-015 (Java también es imperativo) y p2-s1-003
  (la c) también es válida en PostgreSQL).
- **`tai-pi-2015`** (OEP 2015, promoción interna) — ejercicio único (febrero de 2016) cuya primera
  parte también tiene bloques a elegir (25 comunes sin reserva + 25 + 3 del bloque III o IV) y dos
  supuestos de 12 + 3; **plantilla provisional** (sin anuladas). Esquema `tai-pi-2015` y
  convocatoria `pi-2015` en `data/meta` (anexo V de BOE-A-2015-11843: errores −1/4, 90 min; 43 plazas
  y 43 aprobados según BOE-A-2016-7615). 2 figuras en el supuesto III (diagrama de contexto y modelo
  de datos, reconstruidos); el listado XML se excluye del OCR y se transcribe como bloque de código.
  Revisar (`needs_review`): p2-s1-005 (la a) también es correcta con el modelo de datos dado),
  p1-b3-005 (en su formulación general, la 2FN exige la dependencia completa de toda clave
  candidata, así que la c) también es defendible) y p2-s2-003 (`chmod 644` sobre los ficheros no
  impide borrarlos: eso depende del permiso de escritura en el directorio). Explicaciones completas
  en `data/anotaciones/tai-pi-2015.json`.

Erratas del original **que se conservan** por ser transcripción literal (ejemplos): «Rrepara»
(`tai-li-2024-p1-056`), «Se pude implementar» (`tai-li-2024-p1-024`), «ifconifg»
(`tai-li-2023-p2-s2-001`), «aria-cheked» (`tai-li-2024-p2-s1-r2`), «panificación»
(`tai-li-2015-p1-043`), «MATCH FORBIDEN» (`tai-li-2015-p2-s1-006`).

## Años no disponibles o fuera de alcance

| Examen | Situación |
|---|---|
| OEP 2016, promoción interna (examen 25/02/2017) | **No disponible.** El proceso existió (Orden HAP/998/2016; aprobados en BOE 4/09/2017), pero la página de la sede se retiró, el gestor documental antiguo («alfresco») ya no sirve los PDF, la biblioteca `bci.inap.es` no lo tiene y no aparece ninguna copia pública del cuestionario ni de la plantilla (búsquedas web; el Internet Archive no es accesible desde este entorno y, en las comprobaciones previas, no conservaba los PDF). |
| OEP 2017, libre, plantilla del 2.º ejercicio | **No disponible**: hay cuadernillo pero no plantilla pública; se cubre con respuestas propias en `tai-li-2018-ej2`. |
| OEP 2015, plantillas definitivas (libre y promoción interna) | **No localizadas**: solo hay copias públicas de las provisionales, que son las que usan `tai-li-2015` y `tai-pi-2015` (regenerar si aparecen las definitivas). |
| OEP 2014 y anteriores (exámenes de 2015 o antes) | **Fuera de alcance** por decisión del usuario («como mucho del 2016 en adelante»; la OEP 2015 se examinó en 2016 y ya está incluida). Referencias localizadas por si se amplía: OEP 2008 y 2010 en `www.inap.es` y `bci.inap.es` (escaneados o con estructura antigua). En la OEP 2014 no hubo ingreso libre en TAI (solo promoción interna, Orden HAP/1541/2014). |
| OEP 2011–2014 | Fuera de alcance; además, sin documentos localizados en las fuentes oficiales. |

## Cómo regenerar todo

```bash
cd tools
uv sync
uv run python -m opotai.fetch_exams          # descarga a data/raw/<banco>/ y verifica SHA-256
uv run python -m opotai.ocr tai-li-2019      # solo para rehacer la caché OCR de un escaneo (ya versionada)
uv run python -m opotai.ocr tai-li-2016 --single-pass   # OCR rápido de una pasada (bancos 2015-2018)
uv run python -m opotai.spellcheck tai-li-2016          # pasada ortográfica tras el OCR (autoría)
uv run python -m opotai.parse_exam           # genera data/banks/oficiales/*.json y data/banks/assets/
uv run python -m opotai.validate             # valida todo data/ (añade --strict para tratar avisos como errores)
uv run python -m opotai.report --update-doc  # actualiza la tabla de este documento
uv run pytest
```

`parse_exam --check` comprueba sin escribir que la salida no cambiaría; `--dump` vuelca el texto
de un banco para revisarlo. Si el INAP sustituye un PDF, `fetch_exams` falla por SHA-256: hay que
revisar el documento nuevo y actualizar el manifiesto con `--record`.

### Cómo funciona

1. **Manifiesto** (`tools/sources/examenes.json`): cada documento con `bank_id`, `kind`, `title`,
   `url`, `file`, `sha256` y `bytes`. Los PDF se guardan en `data/raw/` (no versionado).
2. **Configuración por examen** (`tools/opotai/exam_configs/<banco>.json`): metadatos del banco,
   secciones esperadas (nº de preguntas y de reserva), cabeceras del cuadernillo
   (`PRIMERA PARTE`, `SUPUESTO I`, `Preguntas de reserva`…), pies de página a descartar, regiones
   de figuras vectoriales, textos alternativos de las figuras y la plantilla a usar.
3. **Extracción** (`booklet.py`): PyMuPDF con posiciones. Detecta el inicio de pregunta (`N.` en
   el margen, numeración consecutiva), las opciones `a)`…`d)` aunque estén a dos columnas,
   los enunciados de los supuestos (párrafos, listas y **negrita** como Markdown), el texto
   intercalado entre preguntas y las imágenes. Une las líneas partidas y quita los prefijos.
4. **Plantillas** (`answer_key.py`): lee las columnas `N. letra` / `ANULADA` / `MODIFICADA` por
   secciones. Las preguntas anuladas tienen `annulled: true` y `answer: null`.
5. **Parches** (`tools/opotai/fixes/<banco>.json`): correcciones reproducibles por id, siempre
   con una nota que las justifica y comprobadas al regenerar (una sustitución que no se aplica
   o un formato que altera el texto es un error). Se usan para dar formato de código
   (bloques con lenguaje a partir de las líneas originales, o código en línea), listas y erratas
   de maquetación demostrables.
6. **Markdown seguro**: las etiquetas HTML literales se convierten en código en línea
   (`` `<head>` ``) y las pseudoetiquetas se escapan (`a\<c y b>d`).
7. **Figuras** (`figures.py`): el lector deja un marcador en el punto de lectura de cada imagen;
   tras las verificaciones se recorta a PNG (≥ 2×, márgenes blancos fuera, ≤ ~300 KB) con nombre
   estable y se sustituye por `![alt](assets/…)` más la transcripción configurada
   (`figures.<nombre>.transcription` en la configuración del examen); con `redraw` se antepone el
   SVG redibujado y con `enhance` el escaneo se recorta a resolución nativa y se limpia (ver
   «Imágenes»). Las imágenes y redibujos que ya no produce un banco se borran.

### Cuadernillos escaneados (OCR)

Los cuadernillos sin capa de texto (`"ocr": true` en la configuración) se procesan así:

1. `uv run python -m opotai.ocr <banco>` (requiere `tesseract-ocr` y `tesseract-ocr-spa` del
   sistema) rasteriza cada página y la pasa por Tesseract en **dos pasadas** (300 y 400 ppp). Las
   palabras, con su posición, confianza y línea, se guardan en `tools/sources/ocr/<banco>/` (caché
   **versionada**: regenerar los bancos no necesita Tesseract y el resultado es estable).
2. El lector usa esa caché como capa de texto: endereza la página (la pendiente del escaneo
   desplaza la columna derecha de las opciones), separa líneas que Tesseract junta, descarta
   manchas de los márgenes y tolera números de pregunta y etiquetas de opción mal leídos
   («bs» por «1.», «Cc)» por «c)»), avisando de cada caso. Las lecturas que rompen la estructura
   se corrigen con `ocr_word_fixes` en la configuración (página, palabra leída y palabra correcta).
3. `uv run python -m opotai.ocr_review <banco> [--pages DIR]` vuelca cada pregunta marcando las
   palabras en las que las dos pasadas discrepan (`⟪palabra|alternativa⟫`), las de confianza baja
   y las desconocidas para el diccionario (`aspell -l es`, opcional) y para el resto de bancos
   (`⟪palabra?⟫`), y genera recortes de cada página para leerlos.
4. La revisión, **página a página contra la imagen**, se plasma en `fixes/<banco>.json`: un
   bloque `global` para errores recurrentes (palabras pegadas: «Elderecho» → «El derecho») y
   parches por pregunta con su nota (letras confundidas, opciones o código transcritos de la
   imagen, formato de código). Las comprobaciones puntuales de respuesta completan la
   verificación (no hay modelo B ni capa de texto para `pdftotext`).

Para los exámenes de 2015-2018 se siguió el procedimiento **rápido** que pidió el usuario: OCR de
**una sola pasada** (`--single-pass`, 300 ppp) y después una **pasada ortográfica**
(`uv run python -m opotai.spellcheck <banco>`: palabras que no reconocen `aspell -l es` ni el resto
de bancos, sin contar el código) seguida de la corrección de las erratas evidentes del OCR (I/l/1,
palabras pegadas, tildes, «¡» por «i», punto final leído como coma…) en `fixes/`, comprobando contra
la imagen solo los casos dudosos y transcribiendo de la imagen las opciones de código, SQL, rutas
e IP. Otras ayudas de configuración para escaneos: `ocr_word_fixes` con `"old": null` **añade** una
palabra (cabeceras blanco sobre gris que el OCR no lee), `x`/`y` desambiguan palabras repetidas, y
`exclude` descarta el texto de una región (listados de código numerados, cuyas líneas «1.», «2.»…
se confundirían con preguntas) para escribirlo a mano en el enunciado. Las etiquetas sin
paréntesis («Ad», «b») se aceptan en la columna de las etiquetas cuando la pregunta ya tiene
opciones. `ocr_skip_pages` (por cuadernillo) deja fuera de Tesseract las portadas, páginas en blanco
y contraportadas (quedan en la caché sin palabras). Tesseract se lanza con un solo hilo
(`OMP_THREAD_LIMIT=1`, salvo que el entorno fije otro valor): con varios cuadernillos en paralelo,
los hilos OpenMP compiten y una página pasa de ~1 s a varios minutos.

### Verificaciones automáticas en cada regeneración

- Recuentos por sección frente a la configuración y frente a la plantilla (sin huecos ni sobrantes).
- **Verificación cruzada A/B** (2024 y 2025): el modelo B tiene las mismas preguntas en otro
  orden; para cada pregunta se comprueba que el texto de la opción correcta según la plantilla A
  coincide con el de la plantilla B. Detecta desfases en el mapeo de respuestas.
- **Comprobaciones puntuales** (`spot_checks` en la configuración): 9–21 preguntas por banco de
  respuesta indiscutible (p. ej. `uname -r`, «Honeypot», cálculos de subredes) con la letra
  esperada anotada a mano.
- **Extracción independiente**: cada enunciado, opción y párrafo debe aparecer en el texto que
  extrae `pdftotext -raw` (poppler), un motor distinto de PyMuPDF (no aplicable a los escaneos,
  que se revisan contra la imagen).
- Aviso si se descarta por posición alguna fila que no sea cabecera/pie conocido.
- Esquema JSON y reglas del validador (ver abajo).

Además, en la generación se revisaron a mano los volcados completos (`--dump`) de todos los
bancos frente a los PDF, con especial atención a las preguntas con código, tablas y figuras.

### Validador (`uv run python -m opotai.validate`)

Valida contra `data/schema/*.schema.json` los bancos y, si existen, `meta/scoring.json`,
`convocatorias.json`, `temario.json`, `localidades.json` y `destinos/*.json`, y comprueba: ids
únicos y con patrón `<banco>-<sección>-<NNN>`/`-r<k>` coherente con `number`; 4 opciones no
vacías ni repetidas; `answer` no nulo salvo anuladas; nº de preguntas y supuestos frente al
esquema de puntuación; restos de PDF (paginación, cabeceras, guiones de partición, prefijos
`a)`, espacios dobles, caracteres de control o de uso privado); Markdown peligroso (HTML literal,
`` ` `` o `**` desparejados); preguntas duplicadas; **imágenes**: `media` y referencias en línea
`![…](assets/…)` de cualquier campo Markdown (enunciado, opciones, `statement`, explicación,
notas) existentes, con texto alternativo y ≤ ~300 KB, sin ficheros huérfanos en `assets/` ni
marcadores de figura sin resolver, y aviso si una pregunta o supuesto menciona una
figura/tabla/esquema («la siguiente figura», «el diagrama siguiente», «se muestra un esquema»…)
sin imagen, tabla Markdown ni bloque de código (en los supuestos cuenta lo que tenga el
enunciado); `topic` presente en el temario; `teoria/index.json` (esquema, ficheros y temas);
referencias cruzadas entre ficheros de `meta/`. Errores → código de salida 1; `--strict`
convierte los avisos en errores.

## Convenciones de transcripción

- Texto **literal**: solo se corrigen saltos de línea y particiones de palabra del PDF. Las
  erratas del original se conservan; las excepciones (fragmentos sobrantes de maquetación)
  están documentadas en los parches.
- Opciones sin prefijo `a)`; respuestas en mayúscula según la plantilla del modelo transcrito
  (siempre el **modelo A** cuando hay varios; nunca se mezclan modelos).
- Código: bloques con valla y lenguaje (`` ```java ``) cuando el original lo presenta en líneas
  aparte (con la sangría reconstruida a partir de la posición); código en línea cuando las cuatro
  opciones son órdenes o sentencias.
- Supuestos: enunciado completo en `statement` (Markdown, con la negrita del original); las
  figuras van en línea en su punto del enunciado (`assets/<banco>/p2-sN-statement-K.png`),
  seguidas de su transcripción en tablas cuando contienen datos tabulares.
- Bloque del supuesto (`III`/`IV`) asignado por su contenido (desarrollo → III; sistemas y
  comunicaciones → IV), de acuerdo con las normas de cada convocatoria.
- `topic`, `explanation`, `option_notes`, `references` y `tags` quedan vacíos para los agentes de
  contenido.

## Contenido de autor (explicaciones, temas…)

- `parse_exam` **conserva** al regenerar, por id de pregunta, `explanation`, `option_notes`,
  `topic`, `references`, `tags`, `outdated`, `outdated_note` y `needs_review` del fichero
  existente. Si cambia el texto o la respuesta de una pregunta con contenido de autor, avisa; si
  desaparece una pregunta con contenido de autor, aborta (salvo `--force`).
- Para añadir o modificar ese contenido se usa
  `uv run python -m opotai.annotate --input anotaciones.json [--dry-run]` (ver
  [`tools/README.md`](../../tools/README.md)): nunca toca texto, opciones ni respuesta, rechaza ids
  inexistentes y valida el resultado contra el esquema.
