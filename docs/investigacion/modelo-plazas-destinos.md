# Modelo de predicción: aprobar, obtener plaza y elegir destino

> Investigación para **OpoTAI** (autor del proyecto: Eric Valls Gramunt). Datos consultados el
> **11/10/2026**.
> - **Implementación.** La hace `crates/tai-core` (`prediction`); el algoritmo está en
>   `docs/CONTRATO-API.md` §«Modelo de predicción».
> - **Este documento** justifica con datos ese modelo, da las cifras de referencia y propone
>   valores por defecto donde faltan datos.
> - **Fuentes y cifras de convocatorias:** `convocatorias-y-puntuacion.md`.
> - **Cálculos reproducibles:** `tools/research/analyze.py` → `data/raw/research/derived/analysis.json`.

## 0. Datos disponibles

| Fichero | Contenido | Uso en el modelo |
|---|---|---|
| `meta/convocatorias.json` → `li-2025` | Convocatoria **objetivo**: 1.030 plazas (844 + 186), 15.073 admitidos, 8.790 presentados (provisional). Cortes y aptos: **pendientes** (previstos para finales de octubre de 2026). | Plazas, presentados y esquema por partes. |
| `meta/convocatorias.json` → `li-2024` | **Referencia** más reciente y completa: 1.879 plazas, 5.261 presentados, 1.756 aptos/aprobados, corte 48/160 (suelo). Incluye `grades_of_aptos` (1.756 notas). | Distribución de notas y escala de puestos. |
| `meta/convocatorias.json` → `li-2023`, `li-2021`, `li-2019` | Notas de aprobados (1.858, 455 y 381), presentados y cortes. | Contraste o sensibilidad. `li-2021` tiene la misma calificación por partes que 2025. |
| `meta/destinos/li-2024.json` | 1.749 destinos (NOPS 1–1.756; faltan 7 renuncias). | Destinos de la referencia. |
| `meta/destinos/li-2023.json` | 1.855 destinos (NOPS 1–1.858). | Sensibilidad. |
| `meta/destinos/li-2021.json` · `li-2019.json` | 454 y 381 destinos. | Histórico (promociones pequeñas). |
| `meta/localidades.json` | 87 localidades con población INE a 1/1/2025 y tier: 13 grandes ciudades, 63 medias y 11 pueblos. | Clasificar destinos. |

**Fuentes de los destinos.** Proceden de las resoluciones de nombramiento del BOE:

- li-2024: [BOE-A-2025-25155](https://www.boe.es/diario_boe/txt.php?id=BOE-A-2025-25155)
- li-2023: [BOE-A-2024-11491](https://www.boe.es/diario_boe/txt.php?id=BOE-A-2024-11491)
- li-2021: [BOE-A-2022-9033](https://www.boe.es/diario_boe/txt.php?id=BOE-A-2022-9033)
- li-2019: [BOE-A-2020-16688](https://www.boe.es/diario_boe/txt.php?id=BOE-A-2020-16688), más el NOPS
  263 de [BOE-A-2021-12840](https://www.boe.es/diario_boe/txt.php?id=BOE-A-2021-12840)

**Anonimización.** De cada fila solo se guarda el número de orden del proceso selectivo (NOPS),
el ministerio, el centro directivo, la provincia y el municipio (normalizado al padrón del INE,
[pobmun.zip](https://www.ine.es/pob_xls/pobmun.zip)). Las correcciones de errores de
[BOE-A-2026-2737](https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-2737) solo afectan a
apellidos.

## 1. Probabilidad de aprobar

**Modelo.** La directa del usuario, como ratio sobre la máxima, se trata como incierta. El
contrato usa Beta(A+1, E+1) para la precisión, más una binomial para las preguntas contestadas.
Es equivalente a una Normal con la σ del error muestral del intento: σ ≈ √(r(1−r)/n).

**Corte de la convocatoria objetivo:** `corte = max(suelo 30 %, corte por ranking estimado)`, con
ruido N(0; 0,03). Con datos:

1. **Los cortes del turno general se mueven entre el suelo y unos 10 puntos por encima.**

   | Año | Base | Corte |
   |---|---|---|
   | 2019 | ranking | 31,7 % (1.er ejercicio) y 43,3 % (2.º) |
   | 2021 | ranking | 31,3 % (1.ª parte) y 40 % (2.ª) |
   | 2023 y 2024 | suelo | 30 % |
   | 2016 (inferido) | ranking | 52,7 % (1.ª parte) |
   | 2018 (inferido) | ranking | 32,3 % (1.ª parte) |

   Con el mismo modelo, la variación del corte por ranking entre años comparables es de 1–4 puntos
   porcentuales (1.ª parte: 32,3 %, 31,7 % y 31,3 % en 2018, 2019 y 2021; 2.ª parte: 38,9 %, 43,3 %
   y 40 %). De ahí el ruido N(0; 0,03).
2. **La selectividad de 2025 la fijan las plazas y los presentados.** Hay 1.030 plazas para 8.790
   presentados: **como mucho aprobará el 11,7 %**, frente al 33,4 % de 2024 y el 42,3 % de 2023.
3. **Escalado por presentados (recomendado).** El puesto equivalente en la distribución de
   referencia es k_ref = plazas_obj · presentados_ref / presentados_obj.
   - Un aspirante del turno general compite por las **844** plazas generales: en ingreso libre
     las del cupo de discapacidad que quedan desiertas no se acumulan al turno general (base 5.4
     de las convocatorias de [2021](https://www.boe.es/diario_boe/txt.php?id=BOE-A-2021-8892) y
     [2024](https://www.boe.es/diario_boe/txt.php?id=BOE-A-2024-14098)). Por tanto
     k_ref = 844 · 5.261 / 8.790 ≈ **505**, y el núcleo estima la 2.ª parte en ≈ 0,41 (8,3/20).
   - Con las 1.030 plazas totales saldría k_ref ≈ 616 (aprobado n.º 616 de 2024: 57,14, ratio
     0,40). Ese era el criterio anterior y sobrestimaba la probabilidad de plaza del turno
     general.
   - Sin escalar (k = 1.030) saldría 53,72 (ratio 0,35), un corte demasiado blando.

**Valores para `li-2025`, por partes** (simulación de las reglas de 2025 sobre la cohorte de
2024, `analyze.py`):

| Parte | Regla CPS [criterios](https://sede.inap.gob.es/sites/sede/files/public/2026-05/TAI%20LI%202025.pdf) | Estimación (turno general) | Por qué |
|---|---|---|---|
| 1.ª (80 preg.) | Apto con ≥ 50 % (40/80); si no hay 2.532 + 558 aptos, puede bajar hasta el 30 % | **0,30 → 24/80** (posible 24–26) | En 2024 solo 191 aprobados (10,9 %) llegaron a 40/80. El objetivo de 3.090 aptos equivale a unos 1.849 en la cohorte de 2024, y allí 1.288 aprobados tenían ≥ 24. |
| 2.ª (20 preg.) | Mejores hasta 844 + 186 entre quienes superan la 1.ª; mínimo 30 % | **≈ 0,38 → 7,7/20** (rango 7–9) | Puesto 616 de 2024 ordenando por la directa del supuesto entre quienes tienen ≥ 24/80. Es coherente con el 8/20 de 2021 (17 % de aprobados). |
| Cupo de discapacidad | Igual, con 186 plazas | **Suelo en ambas partes (24/80 y 6/20)** | 186 plazas para 380 presentados. |

**Aplicación en el núcleo.**

- El contrato aplica a cada parte «el mismo criterio» que a la calificación conjunta. Si se toma
  el ratio conjunto de 2024 (0,40), el resultado es correcto para la 2.ª parte (8/20), pero
  **demasiado exigente para la 1.ª** (32/80 frente a ≈ 24/80).
- Por eso se propone una **regla por defecto**: en la convocatoria `li-2025`, unidad de la parte
  1, usar el suelo `min_direct_ratio` (0,30) como corte estimado; en la parte 2, usar el corte por
  ranking.
- Cuando la CPS publique los cortes reales, bastará con rellenar `cutoff_direct` en
  `scoring.json` y `cutoff` en `convocatorias.json`. El modelo pasará a usar los oficiales.

**Aprobar frente a obtener plaza.**

- En 2023–2024, aprobar el ejercicio era obtener plaza: el corte fue el suelo y hubo menos aptos
  que plazas.
- En 2021 y 2025 la 2.ª parte se resuelve por ranking hasta el número de plazas. En 2021 hubo 472
  aptos para 455 plazas cubiertas, por empates en el corte
  ([memoria OEP 2019](https://www.inap.es/documents/10136/1712229/Memoria+CPS+2019%281%29.pdf/da7cb768-9c0a-db41-e6ce-a35a32d49cf2)).
- Por tanto, en 2025 se espera que `P(aprobar) ≈ P(plaza)`. La única diferencia la crean los
  empates en el corte de la 2.ª parte, que se resuelven por la suma de notas.

## 2. Puesto estimado

Puesto = #(ratios de referencia > ratio del usuario) + 1, multiplicado por presentados_obj /
presentados_ref = 8.790 / 5.261 = **1,671**.

Las notas de referencia (`grades_of_aptos`) solo cubren a los aptos: el tercio superior de los
presentados en 2024. Un usuario por debajo del último apto queda en un puesto > 1.756 · 1,671 ≈
2.934, es decir, fuera de plaza con holgura.

**Cuantiles de nota de los aprobados** (para mostrar el percentil):

| Referencia | p10 | p25 | mediana | p75 | p90 |
|---|---|---|---|---|---|
| li-2024 | 50,59 | 51,93 | 54,91 | 58,93 | 63,39 |
| li-2023 | 51,19 | 53,27 | 57,14 | 62,20 | 67,86 |

En la simulación de 2025 sobre la cohorte de 2024, la nota final de los que obtendrían plaza
tendría p10 52,1, mediana 57,5 y p90 65,2. Estas notas aún no son comparables con datos reales.

## 3. Destinos

### 3.1 Reparto de plazas por tier

| Promoción | Destinos | Madrid capital | Comunidad de Madrid | Gran ciudad | Ciudad media | Pueblo |
|---|---|---|---|---|---|---|
| li-2024 | 1.749 | 1.330 (76,0 %) | 1.352 (77,3 %) | 1.468 (83,9 %) | 276 (15,8 %) | 5 (0,3 %) |
| li-2023 | 1.855 | 1.512 (81,5 %) | 1.539 (83,0 %) | 1.624 (87,5 %) | 220 (11,9 %) | 11 (0,6 %) |
| li-2021 | 454 | 398 (87,7 %) | 398 (87,7 %) | 416 (91,6 %) | 37 (8,1 %) | 1 (0,2 %) |
| li-2019 | 381 | 330 (86,6 %) | 331 (86,9 %) | 351 (92,1 %) | 30 (7,9 %) | 0 |

- **Madrid absorbe entre el 76 % y el 88 % de los destinos** y es siempre el último en agotarse.
  Por tanto, **«gran ciudad» está disponible para cualquiera que obtenga plaza**. Para que el
  resultado informe, conviene mostrar además «gran ciudad distinta de Madrid» y las ciudades
  concretas.
- La tendencia es descentralizadora: los destinos fuera de la Comunidad de Madrid pasan del 12–13
  % (2019–2021) al 17 % (2023) y al **23 % (2024)**.
- Los destinos en «pueblo» (municipios de menos de 50.000 habitantes que no son capitales) son
  testimoniales: 0–11 por promoción. Por ejemplo, Leioa, Esporles (CSIC), Maó, Plasencia, Dénia o
  Cabanes (Torre de la Sal).
- Para «zonas menos pobladas» es más útil mirar las capitales pequeñas: Soria, Teruel, Cuenca,
  Zamora, Segovia, Palencia, Ávila o Huesca. Son «ciudad media» y aparecen en la tabla de §3.3.

### 3.2 Disponibilidad según la posición relativa

La posición relativa es q = puesto / plazas, y j = ⌈q · NOPS máximo⌉. Un destino está
disponible si alguien con NOPS ≥ j lo obtuvo: en la oferta todas las plazas se adjudican, así que
el último NOPS de una ciudad marca cuándo se agotó.

**Destinos que quedan al llegar al puesto relativo q** (entre paréntesis, Madrid capital):

| q | li-2024: gran ciudad | ≠ Madrid | media | pueblo | li-2023: gran ciudad | ≠ Madrid | media | pueblo |
|---|---|---|---|---|---|---|---|---|
| 10 % | 1.359 (1.264) | 95 | 210 | 5 | 1.495 (1.423) | 72 | 165 | 10 |
| 25 % | 1.194 (1.138) | 56 | 115 | 4 | 1.302 (1.275) | 27 | 85 | 5 |
| 50 % | 838 (816) | 22 | 36 | 2 | 906 (895) | 11 | 21 | 2 |
| 60 % | 677 (666) | 11 | 21 | 2 | 729 (723) | 6 | 14 | 0 |
| 70 % | 515 (512) | 3 | 8 | 1 | 551 (549) | 2 | 6 | 0 |
| 80 % | 345 (343) | 2 | 6 | 0 | 369 (368) | 1 | 3 | 0 |
| 85 % | 262 (262) | 0 | 1 | 0 | 277 (277) | 0 | 2 | 0 |
| 90 % | 175 (175) | 0 | 0 | 0 | 186 (186) | 0 | 0 | 0 |

**Último NOPS con destino en cada tier**, con su posición relativa:

| Promoción | Gran ciudad ≠ Madrid | Ciudad media | Pueblo |
|---|---|---|---|
| li-2024 | 1.447 (82 %) | 1.570 (89 %) | 1.297 (74 %) |
| li-2023 | 1.546 (83 %) | 1.619 (87 %) | 1.031 (55 %) |
| li-2021 | 254 (56 %) | 285 (63 %) | 117 (26 %) |
| li-2019 | 289 (76 %) | 282 (74 %) | — |

En las promociones pequeñas (2019–2021), por encima del 75 % de la lista solo quedaba Madrid.

### 3.3 Ciudades: plazas y último NOPS con destino

Formato de cada celda: plazas · último NOPS (posición relativa).

| Localidad (tier) | li-2019 | li-2021 | li-2023 | li-2024 |
|---|---|---|---|---|
| Madrid (gran) | 330 · 381 (100 %) | 398 · 455 (100 %) | 1.512 · 1.858 (100 %) | 1.330 · 1.756 (100 %) |
| Barcelona (gran) | 5 · 273 (72 %) | 2 · 196 (43 %) | 20 · 970 (52 %) | 27 · 1.193 (68 %) |
| València (gran) | 2 · 42 (11 %) | 1 · 37 (8 %) | 12 · 452 (24 %) | 20 · 662 (38 %) |
| Sevilla (gran) | 4 · 36 (9 %) | 2 · 20 (4 %) | 17 · 334 (18 %) | 11 · 228 (13 %) |
| Zaragoza (gran) | — | 1 · 10 (2 %) | 10 · 561 (30 %) | 14 · 801 (46 %) |
| Málaga (gran) | — | 1 · 9 (2 %) | 3 · 411 (22 %) | 7 · 334 (19 %) |
| Murcia (gran) | — | 2 · 28 (6 %) | 10 · 324 (17 %) | 11 · 1.074 (61 %) |
| Palma (gran) | 2 · 289 (76 %) | 3 · 254 (56 %) | 12 · 1.546 (83 %) | 12 · 1.447 (82 %) |
| Las Palmas de G. C. (gran) | 3 · 235 (62 %) | — | 6 · 450 (24 %) | 8 · 498 (28 %) |
| Alacant/Alicante (gran) | 2 · 56 (15 %) | 1 · 3 (1 %) | 3 · 188 (10 %) | 7 · 431 (24 %) |
| Bilbao (gran) | 2 · 140 (37 %) | 1 · 101 (22 %) | 7 · 1.072 (58 %) | 9 · 1.033 (59 %) |
| Valladolid (gran) | 1 · 44 (12 %) | 2 · 66 (14 %) | 10 · 356 (19 %) | 11 · 540 (31 %) |
| Pozuelo de Alarcón (media) | — | — | 21 · 1.586 (85 %) | 16 · 1.463 (83 %) |
| Toledo (media) | 1 · 20 (5 %) | 2 · 56 (12 %) | 10 · 428 (23 %) | 10 · 557 (32 %) |
| Granada (media) | 1 · 4 (1 %) | 1 · 8 (2 %) | 5 · 148 (8 %) | 8 · 358 (20 %) |
| Vitoria-Gasteiz (media) | 1 · 89 (23 %) | — | 9 · 1.011 (54 %) | 9 · 1.126 (64 %) |
| Santa Cruz de Tenerife (media) | 3 · 199 (52 %) | 1 · 61 (13 %) | 6 · 735 (40 %) | 7 · 772 (44 %) |
| A Coruña (media) | — | — | 5 · 301 (16 %) | 8 · 1.570 (89 %) |
| Cádiz (media) | — | 1 · 12 (3 %) | 3 · 136 (7 %) | 9 · 1.428 (81 %) |
| Soria (media) | — | 1 · 52 (11 %) | 2 · 331 (18 %) | 9 · 973 (55 %) |
| Segovia (media) | — | — | 3 · 544 (29 %) | 8 · 811 (46 %) |
| Zamora (media) | — | — | 2 · 510 (27 %) | 8 · 571 (32 %) |
| Cuenca (media) | — | — | 3 · 522 (28 %) | 7 · 584 (33 %) |
| Ceuta / Melilla (media) | — / 1 · 223 | 2 · 139 / 2 · 285 | 5 · 728 / 6 · 782 | 3 · 521 / 4 · 562 |

**Lectura.**

- **Las grandes ciudades del sur y del este se agotan pronto.** Sevilla se agota en el 13–18 % de
  la lista, Alicante en el 10–24 %, Málaga en el 19–22 %, València en el 24–38 % y Granada en el
  8–20 %.
- **Barcelona, Bilbao y Palma aguantan hasta el 52–83 %.**
- **Las 50 provincias, Ceuta y Melilla** tienen al menos un destino en 2023–2024, aunque cada
  capital suele tener solo entre 2 y 10 destinos por promoción.
- La lista completa (87 localidades) está en `analysis.json → destinos.<conv>.cities`.

### 3.4 Cálculo propuesto de P(destino)

Para cada muestra del Monte Carlo del puesto p:

1. Se calcula q = p / plazas_obj y j = ⌈q · NOPS_máx_ref⌉, con li-2024 como referencia (NOPS
   máximo 1.756).
2. El tier o la ciudad X está disponible si existe una adjudicación de X con `order ≥ j`.

`P(X)` es la media de ese indicador sobre las muestras, contando 0 si no hay plaza.

**Sensibilidad.** Repetir el cálculo con li-2023. Las curvas son muy parecidas: ≤ 2 puntos de
diferencia en el último NOPS de «gran ciudad ≠ Madrid» y «ciudad media». La excepción es «pueblo»,
que con tan pocas plazas oscila entre el 55 % y el 74 %.

## 4. Valores por defecto propuestos (cuando faltan datos)

| Dato que falta | Valor por defecto | Justificación |
|---|---|---|
| Corte oficial de `li-2025` | Parte 1: **0,30** (suelo). Parte 2: corte por ranking con k escalado (≈ 0,38–0,40). Ruido N(0; 0,03). | §1. Las reglas de la CPS de 2025 y la distribución de 2024 dan este resultado, el mismo que en promoción interna 2025 (cortes en el suelo). |
| Notas de aptos de la objetivo | `grades_of_aptos` de **li-2024** (respaldo li-2023) | Es la más reciente, tiene el mismo formato de examen (80 + 20) y la misma población. |
| Presentados de la objetivo | 8.790 (provisional de la CPS). Si no existiera: admitidos × 0,55 | Entre 2021 y 2024 la participación fue del 52–55 %; en 2025, del 58 %. |
| Destinos de la objetivo | **li-2024** (respaldo li-2023) | Es la oferta más reciente y la de mayor descentralización. |
| Población de una localidad no listada | Tier por población del INE: ≥ 300.000 hab. gran ciudad; capital o ≥ 50.000 ciudad media; resto pueblo | Es la regla de `localidades.json`. |
| Sin ninguna convocatoria de referencia (`data_quality = synthetic`) | Corte = suelo (0,30 de cada unidad). Puesto por percentil de una **Normal(0,25; 0,15)** del ratio de directa conjunta de los presentados. Destinos: 78 % Madrid, 7 % otras grandes ciudades, 14 % ciudad media y 1 % pueblo. | La Normal se ajusta a la cola superior observada: 2024 da μ = 0,23 y σ = 0,14; 2023 da μ = 0,27 y σ = 0,16 (`grades_of_aptos` + presentados). El reparto de destinos es la media de 2023–2024. Debe marcarse claramente como sintético. |

## 5. Limitaciones

- **Resultados de 2025 pendientes.** Los cortes reales pueden diferir de la estimación si la
  dificultad del examen de 2025 fue distinta a la de 2024. Los presentados de 2025 son
  provisionales.
- **Solo hay datos de los aptos.** No hay distribución de notas de los no aptos (≈ 2/3 de los
  presentados en 2024). Por debajo del último apto, el puesto solo se puede acotar.
- **Mezcla de turnos.** La relación de aprobados mezcla el turno general y el cupo de
  discapacidad, que tiene otro corte y otras plazas.
  - El modelo simula el turno general: compite por las plazas generales (844 en 2025). Las del
    cupo no se le acumulan en ingreso libre (sí en promoción interna, donde cuentan todas).
  - La distribución de referencia incluye a las personas del cupo (53 de los 1.756 aptos de
    2024), así que el puesto del turno general sale ligeramente prudente.
  - Una persona del cupo tendría una probabilidad mucho mayor (186 plazas para 380
    presentados); se puede añadir un ajuste si el perfil lo indica.
- **Orden de elección.**
  - Algunas personas del cupo de discapacidad eligen destino alterando el orden (art. 9 RD
    2271/2004).
  - Las renuncias dejan huecos en el NOPS (7 en 2024).
  - Se asume que la oferta de destinos tiene tantos puestos como aprobados. Si sobraron puestos,
    la disponibilidad real fue algo mayor que la estimada.
- **La oferta de destinos cambia cada año.** La cuota de Madrid ha bajado del 88 % al 76 %, y el
  reparto de 2025 se publicará con la oferta de destinos tras los resultados. Usar el dataset más
  reciente reduce este sesgo, pero no lo elimina.
- **Normalización de topónimos.** Se usa el municipio del padrón del INE. «Cantoblanco» se
  asigna a Madrid y «Torre de la Sal» a Cabanes (Castellón); los nombres bilingües siguen al INE
  (p. ej. «Alacant/Alicante», «València», «Maó»).
- **Destinos anteriores a 2019 no extraídos.** Los anexos de nombramiento de 2016, 2018 y 2019
  (BOE-A-2016-12467, BOE-A-2018-991 y BOE-A-2019-1553) se publicaron como imagen. Para modelar la
  promoción actual (más de 1.000 plazas) aportarían poco, porque eran de 92–350 plazas.

## Reproducibilidad

```bash
cd tools
uv run python research/fetch_sources.py && uv run python research/extract_aprobados.py
uv run python research/extract_destinos.py && uv run python research/build_localidades.py
uv run python research/build_meta.py && uv run python research/analyze.py
uv run python research/validate_meta.py
```
