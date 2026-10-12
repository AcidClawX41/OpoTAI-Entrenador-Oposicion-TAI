# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (C) 2026 Eric Valls Gramunt
# ruff: noqa: E501  (módulo de datos: URLs y textos literales de las fuentes)
"""Genera ``data/meta/scoring.json``, ``data/meta/convocatorias.json`` y ``data/meta/temario.json``.

Uso (desde ``tools/``; requiere ``fetch_sources.py`` y ``extract_aprobados.py``)::

    uv run python research/build_meta.py

Los datos curados (reglas de cada convocatoria, plazas, cortes…) están en este fichero con la
referencia de cada cifra; las listas de calificaciones (``grades_of_aptos``) se leen de
``data/raw/research/derived/aprobados-<conv>.json`` (generados por ``extract_aprobados.py``) y el
programa oficial se extrae literalmente del BOE (anexo V de BOE-A-2025-26262).
Ver ``docs/investigacion/convocatorias-y-puntuacion.md`` para la justificación de cada valor.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from common import DERIVED_DIR, META_DIR, RAW_DIR, RETRIEVED, boe_paragraphs, read_json, rel, write_json  # noqa: E402

SEDE = "https://sede.inap.gob.es"


def boe_url(boe_id: str) -> str:
    return f"https://www.boe.es/diario_boe/txt.php?id={boe_id}"


def link(title: str, url: str) -> dict:
    return {"title": title, "url": url}


# --------------------------------------------------------------------------- fuentes citadas

L = {
    # convocatorias (BOE)
    "conv-2015": link("Orden HAP/2294/2015, de 21 de octubre (BOE 3/11/2015), anexo TAI ingreso libre", boe_url("BOE-A-2015-11843")),
    "conv-2016": link("Orden HAP/998/2016, de 17 de junio (BOE 22/06/2016), anexo TAI ingreso libre", boe_url("BOE-A-2016-6049")),
    "conv-2018": link("Resolución de 25 de enero de 2018, SEFP (BOE 29/01/2018), anexo V TAI ingreso libre", boe_url("BOE-A-2018-1169")),
    "conv-2019": link("Resolución de 14 de junio de 2019, SEFP (BOE 17/06/2019), anexos V y VI (TAI)", boe_url("BOE-A-2019-9062")),
    "conv-2021": link("Resolución de 26 de mayo de 2021, SEPTFP (BOE 28/05/2021), anexos VII y VIII (TAI)", boe_url("BOE-A-2021-8892")),
    "conv-2023": link("Resolución de 20 de enero de 2023, SEFP (BOE 27/01/2023), anexos VI y VII (TAI)", boe_url("BOE-A-2023-2175")),
    "conv-2024": link("Resolución de 9 de julio de 2024, SEFP (BOE 10/07/2024), anexos V y VI (TAI)", boe_url("BOE-A-2024-14098")),
    "conv-2025": link("Resolución de 18 de diciembre de 2025, SEFP (BOE 22/12/2025), anexos V y VI (TAI)", boe_url("BOE-A-2025-26262")),
    "adm-2025": link("Resolución de 12 de marzo de 2026, INAP (BOE 17/03/2026): admitidos provisionales y fecha del ejercicio (23/05/2026)", boe_url("BOE-A-2026-6249")),
    "oep-2026": link("Real Decreto 387/2026, de 6 de mayo (BOE 7/05/2026): oferta de empleo público 2026", boe_url("BOE-A-2026-9946")),
    # relaciones de aprobados (BOE)
    "apr-2015": link("Orden HAP/1281/2016 (BOE 29/07/2016): relación definitiva de aprobados TAI LI OEP 2015", boe_url("BOE-A-2016-7318")),
    "apr-2016": link("Orden HFP/647/2017 (BOE 7/07/2017): relación definitiva de aprobados TAI LI OEP 2016", boe_url("BOE-A-2017-7916")),
    "apr-2018": link("Orden TFP/863/2018 (BOE 9/08/2018): relación de aprobados TAI LI OEP 2017", boe_url("BOE-A-2018-11387")),
    "apr-2019": link("Resolución de 7 de junio de 2020 (BOE 15/06/2020): relación definitiva de aprobados TAI LI", boe_url("BOE-A-2020-6135")),
    "apr-2021": link("Resolución de 18 de marzo de 2022 (BOE 21/03/2022): relación definitiva de aprobados TAI LI", boe_url("BOE-A-2022-4417")),
    "apr-2023": link("Resolución de 23 de febrero de 2024 (BOE 5/03/2024): relación de aprobados TAI LI", boe_url("BOE-A-2024-4298")),
    "apr-2024": link("Resolución de 11 de junio de 2025 (BOE 17/06/2025): relación de aprobados TAI LI", boe_url("BOE-A-2025-12232")),
    "apr-pi-2019": link("Resolución de 9 de marzo de 2020 (BOE 11/03/2020): relación definitiva de aprobados TAI PI", boe_url("BOE-A-2020-3463")),
    "apr-pi-2021": link("Resolución de 6 de junio de 2022 (BOE 9/06/2022): relación definitiva de aprobados TAI PI", boe_url("BOE-A-2022-9472")),
    "apr-pi-2023": link("Resolución de 8 de mayo de 2024 (BOE 20/05/2024): relación de aprobados TAI PI", boe_url("BOE-A-2024-10085")),
    "apr-pi-2024": link("Resolución de 15 de julio de 2025 (BOE 18/07/2025): relación de aprobados TAI PI", boe_url("BOE-A-2025-14913")),
    # nombramientos (BOE)
    "nom-2015": link("Resolución de 27 de diciembre de 2016 (BOE 29/12/2016): nombramiento TAI LI OEP 2015", boe_url("BOE-A-2016-12467")),
    "nom-2016": link("Resolución de 22 de enero de 2018 (BOE 26/01/2018): nombramiento TAI LI OEP 2016", boe_url("BOE-A-2018-991")),
    "nom-2018": link("Resolución de 4 de febrero de 2019 (BOE 6/02/2019): nombramiento TAI LI OEP 2017", boe_url("BOE-A-2019-1553")),
    "nom-2019": link("Resolución de 18 de diciembre de 2020 (BOE 22/12/2020): nombramiento TAI LI (destinos)", boe_url("BOE-A-2020-16688")),
    "nom-2021": link("Resolución de 31 de mayo de 2022 (BOE 2/06/2022): nombramiento TAI LI (destinos)", boe_url("BOE-A-2022-9033")),
    "nom-2023": link("Resolución de 3 de junio de 2024 (BOE 6/06/2024): nombramiento TAI LI (destinos)", boe_url("BOE-A-2024-11491")),
    "nom-2024": link("Resolución de 4 de diciembre de 2025 (BOE 10/12/2025): nombramiento TAI LI (destinos)", boe_url("BOE-A-2025-25155")),
    # INAP / CPS
    "crit-li-2025": link("CPS · Criterios de corrección, valoración y superación TAI LI 2025 (18/05/2026)",
                         SEDE + "/sites/sede/files/public/2026-05/TAI%20LI%202025.pdf"),
    "pres-2025": link("CPS · Nota informativa: convocados y presentados provisionales al examen del 23/05/2026",
                      SEDE + "/sites/sede/files/public/2026-06/2026_05_23_NotainformativaPRESENTADOS_SM6O28WIR9_154AB89SD658.pdf"),
    "crono-2025": link("CPS · Actualización del cronograma orientativo (29/09/2026)",
                       SEDE + "/sites/sede/files/public/2026-09/Cronograma%20CPS%202025_2026_09_29.pdf"),
    "crit-pi-2025": link("CPS · Criterios de corrección TAI PI 2025 (18/05/2026)", SEDE + "/sites/sede/files/public/2026-05/TAI%20PI%202025.pdf"),
    "min-pi-2025": link("CPS · Nota informativa de puntuaciones mínimas TAI PI 2025 (29/09/2026)",
                        SEDE + "/sites/sede/files/public/2026-09/PUNTUACIONES%20MINIMAS%20EJER%20UNICO%20TAI%20PI.pdf"),
    "formula-2025": link("CPS · Nota informativa: fórmula de transformación de puntuaciones directas (29/09/2026)",
                         SEDE + "/sites/sede/files/public/2026-09/Nota%20informativa%20F%C3%B3rmula%20Transformada%20%282%29.pdf"),
    "superan-pi-2025": link("CPS · Resolución: personas que superan el ejercicio único TAI PI 2025 (29/09/2026)",
                            SEDE + "/sites/sede/files/public/2026-09/report_Resoluci%C3%B3n%20superan%20ejercicio%20%C3%BAnico%20TAI-P.pdf"),
    "crit-li-2024": link("CPS · Criterios de corrección TAI LI 2024 (10/12/2024)",
                         SEDE + "/documents/59312/2364268/TAI+LI+2024.pdf/22c390b8-b596-7cee-ec54-9635b085ad94"),
    "min-li-2024": link("CPS · Nota informativa de puntuaciones mínimas TAI LI 2024 (24/03/2025)",
                        SEDE + "/documents/59312/2364268/PUNTUACIONESMINIMASEJERUNICOTAIL_NNSVF2SJLX_154AB89SD658.pdf/22610a7c-da9d-a9bb-95fc-a480ebf8ac18"),
    "pres-2024": link("CPS · Nota: datos provisionales de presentados (18/12/2024)",
                      SEDE + "/documents/59312/2364268/NOTA+CPS+DICIEMBRE+DATOS+PRESENTADOS.pdf/9f8d788b-11f6-5364-3347-f6ea77427b63"),
    "mem-2024": link("CPS · Memoria convocatoria 2024 (OEP acumuladas 2021-2024), tablas «Ejecución por Cuerpo/Escala» y evolución",
                     "https://www.inap.es/sites/portal/files/public/2026-01/MemoriaCP2024.pdf"),
    "crit-pi-2024": link("CPS · Criterios de corrección TAI PI 2024 (10/12/2024)",
                         SEDE + "/documents/59312/2364118/TAI+PI+2024.pdf/0ee5a809-a983-258b-aab2-38603947124d"),
    "min-pi-2024": link("CPS · Nota informativa de puntuaciones mínimas TAI PI 2024 (28/03/2025)",
                        SEDE + "/documents/59312/2364118/PUNTUACIONES+MINIMAS+EJER+UNICO+TAI+PI.pdf/7ed869ab-b224-7b87-d1a2-aae153c7aa6d"),
    "crit-li-2023": link("CPS · Criterios de corrección TAI LI (convocatoria 2023)",
                         SEDE + "/documents/59312/2194858/TAI+LI+2023.pdf/1fe7e36d-60d0-742d-a69c-f282ae32879a"),
    "min-li-2023": link("CPS · Nota informativa de puntuaciones mínimas TAI LI 2023 (18/12/2023)",
                        SEDE + "/documents/59312/2194858/PUNTUACIONES+MINIMAS+EJER+UNICO+TAI+L.pdf/0b7a9b95-4624-d636-7e1f-ec501310b1ab"),
    "pres-2023": link("CPS · Datos provisionales de presentados (v4), 16 y 17/09/2023",
                      SEDE + "/documents/59312/2194932/Presentados+totales+v4.pdf/7bcfb0f2-e18b-b7b3-f19c-e124558b6fe5"),
    "mem-2023": link("CPS · Memoria convocatoria 2023 (OEP 2020-2022), tabla «Ejecución por Cuerpo/Escala»",
                     "https://www.inap.es/sites/portal/files/public/2025-07/MemoriaCPS2022_2ZSS86J3TV_154AB89SD658.pdf"),
    "crit-pi-2023": link("CPS · Criterios de corrección TAI PI 2023 y su corrección de errores",
                         SEDE + "/documents/59312/2194876/TAI+PI+2023.pdf/f9c185d7-613c-3a80-45d5-11e3b3123677"),
    "min-pi-2023": link("CPS · Nota informativa de puntuaciones mínimas TAI PI 2023 (18/12/2023)",
                        SEDE + "/documents/59312/2194876/PUNTUACIONES+MINIMAS+EJER+UNICO+TAI+PI.pdf/adefad89-c6f0-16d5-7dab-cd6711d0ac24"),
    "crit-li-2021": link("CPS · Criterios de corrección TAI LI OEP 2019 (convocatoria 2021)",
                         SEDE + "/documents/59312/1925662/2OEP2019TAI-LI_154AB89SD658.pdf/0def8107-8fdd-c394-8860-dd291cc31fca"),
    "min-li-2021": link("CPS · Nota informativa de puntuaciones mínimas TAI LI OEP 2019 (24/01/2022)",
                        SEDE + "/documents/59312/1925774/Puntuacionesminimasprimerejercicio2019TAIL_154AB89SD658.pdf/9186ee4e-faf8-e9c5-3152-403b71232c9a"),
    "mem-2021": link("CPS · Memoria ejecutiva de la OEP 2019 (feb. 2023), pp. 3 y 72",
                     "https://www.inap.es/documents/10136/1712229/Memoria+CPS+2019%281%29.pdf/da7cb768-9c0a-db41-e6ce-a35a32d49cf2"),
    "crit-pi-2021": link("CPS · Criterios de corrección TAI PI OEP 2019",
                         SEDE + "/documents/59312/1925662/3OEP2019TAI-PI_154AB89SD658.pdf/c9c86cb8-ffab-9b0d-96f7-8ff10d7bd020"),
    "min-pi-2021": link("CPS · Nota informativa de puntuaciones mínimas TAI PI OEP 2019 (24/01/2022)",
                        SEDE + "/documents/59312/1925806/Puntuacionesminimasprimerejercicio2019TAIPI_154AB89SD658.pdf/c0ff2a15-5bc7-3da5-db8e-a5ced6c35e47"),
    "crit1-li-2019": link("CPS · Criterios de corrección del primer ejercicio TAI LI OEP 2018",
                          SEDE + "/documents/59312/1790179/7OEP2018TAILI_154AB89SD658.pdf/cdc80da6-8e02-a640-65c4-faa5917c9a28"),
    "crit2-li-2019": link("CPS · Criterios de corrección del segundo ejercicio TAI LI OEP 2018 (17/01/2020)",
                          SEDE + "/documents/59312/1790179/CRITERIOS_2_TAILI_154AB89SD658.pdf/c44b7573-d587-4a0a-3eef-8d4cd346b266"),
    "min1-li-2019": link("CPS · Puntuaciones mínimas del primer ejercicio TAI LI OEP 2018 (17/12/2019)",
                         SEDE + "/documents/59312/1790179/PuntminimasTAIL1ejer_154AB89SD658.pdf/ffe7336a-b035-156b-262f-fd1817af7636"),
    "min2-li-2019": link("CPS · Puntuaciones mínimas del segundo ejercicio TAI LI OEP 2018",
                         SEDE + "/documents/59312/1790179/2ejer_Punt_minimas%25202018_TAILI_OEP2018__154AB89SD658.pdf/9929afed-090f-a586-a01e-c5fac4ef6ed0"),
    "pres-2019": link("CPS · Nota informativa de admitidos y presentados OEP 2018",
                      SEDE + "/documents/59312/1790179/notainformativapresentados__154AB89SD658.pdf/4adcf8b4-69b9-195e-058a-931e3ae80ec6"),
    "fecha-2019": link("INAP · Anexo XI: lugar, día y hora de examen (19/10/2019)",
                       SEDE + "/documents/59312/1747284/LUGAR_DIA_HORA_EXAMEN.pdf/aabf689e-5098-67e3-bbbf-57aacbb817bc"),
    "sup2-2019": link("CPS · Resolución de 30/04/2020: superan el segundo ejercicio (celebrado el 25/01/2020)",
                      SEDE + "/documents/59312/1790179/2ejer_Reso_superan_TAILI_OEP2018__154AB89SD658.pdf/8630d1d0-bc53-6255-f7e2-f26aa888b6a4"),
    "mem-2019": link("CPS · Memoria ejecutiva de la OEP 2018 (abr. 2021), pp. 3, 68 y 120",
                     "https://www.inap.es/documents/10136/1712229/Memoria+CPS+OEP+2018.pdf/2bf66ef6-b34c-b843-4f3a-a666b25087e5"),
    "crit-pi-2019": link("CPS · Criterios de corrección TAI PI OEP 2018",
                         SEDE + "/documents/59312/1777270/8OEP2018TAIPI_154AB89SD658.pdf/f4857b8c-0a2e-01a1-cd0c-70e920fe73f6"),
    "min-pi-2019": link("CPS · Puntuaciones mínimas TAI PI OEP 2018 (17/12/2019)",
                        SEDE + "/documents/59312/1777270/PuntminimasTAIPIejerunico_154AB89SD658.pdf/f823a512-b2be-9bf1-4f68-e1073697436e"),
    "opositatest": link("Fuente secundaria (contraste): OpositaTest, «Nota de corte TAI AGE»",
                        "https://blog.opositatest.com/nota-corte-tai-age"),
}


# --------------------------------------------------------------------------- esquemas de puntuación


def part(n, title, kind, questions, reserve, value, divisor, offered=None, choose=None):
    return {
        "part": n, "title": title, "kind": kind, "questions": questions, "reserve": reserve,
        "value": value, "penalty_divisor": divisor, "cases_offered": offered, "cases_to_choose": choose,
    }


def unit(parts, max_grade, pass_grade, ratio, cutoff, note):
    return {"parts": parts, "max_grade": max_grade, "pass_grade": pass_grade, "min_direct_ratio": ratio,
            "cutoff_direct": cutoff, "cutoff_note": note}


SCHEMES = [
    {
        "id": "tai-li-2025", "title": "TAI ingreso libre · convocatoria 2025 (examen 23/05/2026)",
        "access": "libre", "convocatoria": "li-2025",
        "sources": [L["conv-2025"], L["crit-li-2025"], L["formula-2025"]],
        "duration_minutes": 120,
        "parts": [
            part(1, "Primera parte · Cuestionario", "theory", 80, 5, 1.0, 3),
            part(2, "Segunda parte · Supuesto práctico (bloque III o IV, a elegir)", "case", 20, 5, 1.0, 3, 2, 1),
        ],
        "grading": {"units": [
            unit([1], 50, 25, 0.30, None,
                 "Pendiente (resultados previstos a finales de octubre de 2026). Criterio CPS: apto con ≥ 50 % de la "
                 "directa máxima (40/80); si no se alcanzan 2.532 aptos (general) y 558 (norma común 13), la CPS puede "
                 "bajarlo hasta el 30 % (24/80). Con la distribución de 2024 lo más probable es el suelo de 24/80."),
            unit([2], 50, 25, 0.30, None,
                 "Pendiente. Criterio CPS: aptas las mejores directas de la 2.ª parte, entre quienes superan la 1.ª, hasta "
                 "844 (general) y 186 (norma común 13), con un mínimo del 30 % (6/20). Estimación OpoTAI para el turno "
                 "general: ≈ 7,7/20 (8 netas)."),
        ]},
        "notes": "Ejercicio único (anexo V, norma 2): todas las preguntas valen lo mismo y cada error resta 1/3; las "
                 "respuestas en blanco no penalizan. Cada parte se califica de 0 a 50 (mínimo 25) y la nota final es la "
                 "suma (0–100). La 2.ª parte solo se corrige si se supera la 1.ª y si se marca un único supuesto. "
                 "Transformación por tramos (nota CPS de 29/09/2026): d < M → E/2·d/M; d ≥ M → E/2·(1 + (d−M)/(N−M)). "
                 "Desempate: directa de la 2.ª parte, aciertos 2.ª, aciertos 1.ª, menos errores 2.ª, menos errores 1.ª. "
                 "Hubo un llamamiento extraordinario el 24/07/2026 con otro cuestionario y las mismas reglas.",
    },
    {
        "id": "tai-li-2024", "title": "TAI ingreso libre · convocatoria 2024 (examen 14/12/2024)",
        "access": "libre", "convocatoria": "li-2024",
        "sources": [L["conv-2024"], L["crit-li-2024"], L["min-li-2024"]],
        "duration_minutes": 120,
        "parts": [
            part(1, "Primera parte · Cuestionario", "theory", 80, 5, 1.0, 3),
            part(2, "Segunda parte · Supuesto práctico (bloque III o IV, a elegir)", "case", 20, 5, 4.0, 3, 2, 1),
        ],
        "grading": {"units": [
            unit([1, 2], 100, 50, 0.30, 48.0,
                 "48/160 directos (30 % de la máxima) = 50 puntos, acceso general y cupo de discapacidad (nota CPS "
                 "de 24/03/2025). Fue el suelo: aprobaron 1.756 para 1.879 plazas."),
        ]},
        "notes": "1.ª parte: A − E/3 (valor 1); 2.ª parte: 4·A − 4·E/3 (valor 4). Directa máxima 80 + 80 = 160. "
                 "Calificación conjunta 0–100 con mínimo 50; la CPS declaraba aptos los mejores hasta 1.712 + 167 "
                 "siempre que alcanzaran el 30 %. Empates: directa 2.ª parte, aciertos 2.ª, aciertos 1.ª, errores 2.ª, "
                 "errores 1.ª.",
    },
    {
        "id": "tai-li-2023", "title": "TAI ingreso libre · convocatoria 2023 (OEP 2020-2022, examen 17/09/2023)",
        "access": "libre", "convocatoria": "li-2023",
        "sources": [L["conv-2023"], L["crit-li-2023"], L["min-li-2023"]],
        "duration_minutes": 120,
        "parts": [
            part(1, "Primera parte · Cuestionario", "theory", 80, 5, 1.0, 3),
            part(2, "Segunda parte · Supuesto práctico (bloque III o IV, a elegir)", "case", 20, 5, 4.0, 3, 2, 1),
        ],
        "grading": {"units": [
            unit([1, 2], 100, 50, 0.30, 48.0,
                 "48/160 directos (30 %) = 50 puntos, acceso general y cupo de discapacidad (nota CPS de 18/12/2023). "
                 "Fue el suelo: aprobaron 1.858 para 1.902 plazas."),
        ]},
        "notes": "Mismas reglas que 2024: valor 1 en la 1.ª parte y 4 en la 2.ª, error −1/3, calificación conjunta "
                 "0–100 con mínimo 50 y suelo del 30 %. Aptos: mejores directas hasta 1.806 + 96.",
    },
    {
        "id": "tai-li-2021", "title": "TAI ingreso libre · convocatoria 2021 (OEP 2019, examen 6/11/2021)",
        "access": "libre", "convocatoria": "li-2021",
        "sources": [L["conv-2021"], L["crit-li-2021"], L["min-li-2021"]],
        "duration_minutes": 120,
        "parts": [
            part(1, "Primera parte · Cuestionario", "theory", 80, 5, 1.0, 3),
            part(2, "Segunda parte · Supuesto práctico (bloque III o IV, a elegir)", "case", 20, 5, 1.0, 3, 2, 1),
        ],
        "grading": {"units": [
            unit([1], 50, 25, 0.30, 25.0,
                 "25/80 (31,25 %) en acceso general; 24/80 (30 %) en el cupo de discapacidad (nota CPS de 24/01/2022). "
                 "Corte por ranking: aptos los mejores hasta 625 + 50."),
            unit([2], 50, 25, 0.30, 8.0,
                 "8/20 (40 %) en acceso general; 6/20 (30 %) en el cupo de discapacidad. Corte por ranking: mejores "
                 "hasta 432 + 28 entre quienes superan la 1.ª parte."),
        ]},
        "notes": "Primer ejercicio único TAI-LI (dos partes el mismo día). A − E/3 en ambas partes; cada parte 0–50 "
                 "(mínimo 25) y nota final = suma. Desempate: mayor nota en la 1.ª parte.",
    },
    {
        "id": "tai-li-2019", "title": "TAI ingreso libre · convocatoria 2019 (OEP 2018, dos ejercicios: 19/10/2019 y 25/01/2020)",
        "access": "libre", "convocatoria": "li-2019",
        "sources": [L["conv-2019"], L["crit1-li-2019"], L["crit2-li-2019"], L["min1-li-2019"], L["min2-li-2019"]],
        "duration_minutes": 160,
        "parts": [
            part(1, "Primer ejercicio · Cuestionario (90 min)", "theory", 100, 5, 1.0, 3),
            part(2, "Segundo ejercicio · Supuesto práctico (bloque III o IV, a elegir; 70 min)", "case", 30, 5, 1.0, 3, 2, 1),
        ],
        "grading": {"units": [
            unit([1], 50, 25, 0.30, 31.67,
                 "31,67/100 en el sistema general (corte por ranking: aptos los mejores hasta 547 + 37); 30/100 (suelo) "
                 "en el cupo de discapacidad (nota CPS de 17/12/2019)."),
            unit([2], 50, 25, 0.30, 13.0,
                 "13/30 en el sistema general (ranking: mejores hasta 363 + 22); 9/30 (suelo) en el cupo de "
                 "discapacidad (nota CPS)."),
        ]},
        "notes": "Dos ejercicios eliminatorios en días distintos (90 + 70 minutos; aquí se suman). A − E/3 en ambos; "
                 "cada ejercicio 0–50 (mínimo 25) y nota final = suma. Desempate: nota del primer ejercicio y luego "
                 "del segundo.",
    },
    {
        "id": "tai-li-2018", "title": "TAI ingreso libre · convocatoria 2018 (OEP 2017, dos ejercicios)",
        "access": "libre", "convocatoria": "li-2018",
        "sources": [L["conv-2018"], L["apr-2018"], L["opositatest"]],
        "duration_minutes": 160,
        "parts": [
            part(1, "Primer ejercicio · Cuestionario (90 min)", "theory", 100, 3, 1.0, 3),
            part(2, "Segundo ejercicio · Supuesto práctico (bloque III o IV, a elegir; 70 min)", "case", 30, 3, 1.0, 3, 2, 1),
        ],
        "grading": {"units": [
            unit([1], 50, 25, 0.30, 32.33,
                 "32,33/100 (sistema general). Inferido de las calificaciones de la relación de aprobados del BOE (método "
                 "validado con los cortes oficiales de 2019 y 2021) y coincidente con la fuente secundaria; cupo de "
                 "discapacidad 30/100 según la fuente secundaria."),
            unit([2], 50, 25, 0.30, 11.67,
                 "11,67/30 (sistema general), inferido de las calificaciones publicadas en el BOE; sin nota oficial "
                 "localizada."),
        ]},
        "notes": "Bases: 100 preguntas (+3 reserva) en 90 min y supuesto de 30 preguntas (+3) en 70 min; error −1/3; "
                 "cada ejercicio 0–50 con mínimo 25. Los criterios de la CPS de esta convocatoria ya no están "
                 "publicados en la sede del INAP.",
    },
    {
        "id": "tai-li-2016", "title": "TAI ingreso libre · convocatoria 2016 (OEP 2016, dos ejercicios)",
        "access": "libre", "convocatoria": "li-2016",
        "sources": [L["conv-2016"], L["apr-2016"], L["opositatest"]],
        "duration_minutes": 180,
        "parts": [
            part(1, "Primer ejercicio · Cuestionario (bloques I y II + bloque III o IV a elegir; 90 min)", "theory", 100, 6, 1.0, 3),
            part(2, "Segundo ejercicio · Supuesto práctico (bloque III o IV, a elegir; 90 min)", "case", 40, 3, 1.0, 3, 2, 1),
        ],
        "grading": {"units": [
            unit([1], 50, 25, 0.30, 52.67,
                 "52,67/100 (general), inferido de las calificaciones del BOE y coincidente con la fuente secundaria; "
                 "cupo de discapacidad 48/100 (fuente secundaria)."),
            unit([2], 50, 25, 0.30, 18.0, "18/40 (general), inferido de las calificaciones publicadas en el BOE."),
        ]},
        "notes": "Primer ejercicio: 20 preguntas del bloque I y 30 del II comunes + 50 del bloque III o IV a elegir "
                 "(3 reservas por mitad); se modela como una parte de 100 preguntas. Error −1/3. Las bases no fijaban un "
                 "suelo del 30 %: se usa 0,30 por coherencia (el corte real fue por ranking).",
    },
    {
        "id": "tai-li-2015", "title": "TAI ingreso libre · convocatoria 2015 (OEP 2015, dos ejercicios)",
        "access": "libre", "convocatoria": "li-2015",
        "sources": [L["conv-2015"], L["apr-2015"], L["opositatest"]],
        "duration_minutes": 180,
        "parts": [
            part(1, "Primer ejercicio · Cuestionario (bloques I y II + bloque III o IV a elegir; 90 min)", "theory", 100, 0, 1.0, 3),
            part(2, "Segundo ejercicio · Cuestionario práctico (bloque III o IV, a elegir; 90 min)", "case", 40, 0, 1.0, 3, 2, 1),
        ],
        "grading": {"units": [
            unit([1], 50, 25, 0.30, 61.67,
                 "61,67/100 (general; cupo de discapacidad 52,67) según fuente secundaria; no verificable con las "
                 "calificaciones del BOE (solo publica la nota total)."),
            unit([2], 50, 25, 0.30, None, "Desconocido."),
        ]},
        "notes": "Bases: 1.er ejercicio de 100 preguntas (20 bloque I + 30 bloque II + 50 del bloque III o IV a elegir), "
                 "reservas sin número fijado (se usa 0); 2.º ejercicio de 40 preguntas prácticas del bloque elegido. La "
                 "penalización −1/3 consta en las bases para el 1.er ejercicio; para el 2.º se asume la misma.",
    },
    {
        "id": "tai-pi-2025", "title": "TAI promoción interna · convocatoria 2025 (examen 23/05/2026)",
        "access": "promocion_interna", "convocatoria": "pi-2025",
        "sources": [L["conv-2025"], L["crit-pi-2025"], L["min-pi-2025"], L["formula-2025"]],
        "duration_minutes": 90,
        "parts": [
            part(1, "Primera parte · Cuestionario", "theory", 50, 5, 1.0, 4),
            part(2, "Segunda parte · Supuesto práctico (bloque III o IV, a elegir)", "case", 12, 3, 1.0, 4, 2, 1),
        ],
        "grading": {"units": [
            unit([1], 50, 25, 0.30, 15.0,
                 "15/50 (30 %), general y norma común 13 (nota CPS de 29/09/2026). El criterio inicial era el 50 % "
                 "salvo que no se alcanzaran 951 + 69 aptos."),
            unit([2], 50, 25, 0.30, 3.6, "3,60/12 (30 %), general y norma común 13 (nota CPS de 29/09/2026)."),
        ]},
        "notes": "Fase de oposición de un concurso-oposición: a la nota del ejercicio (0–100) se suma la fase de concurso. "
                 "Error −1/4 en ambas partes.",
    },
    {
        "id": "tai-pi-2024", "title": "TAI promoción interna · convocatoria 2024 (examen 14/12/2024)",
        "access": "promocion_interna", "convocatoria": "pi-2024",
        "sources": [L["conv-2024"], L["crit-pi-2024"], L["min-pi-2024"]],
        "duration_minutes": 90,
        "parts": [
            part(1, "Primera parte · Cuestionario", "theory", 50, 5, 1.0, 4),
            part(2, "Segunda parte · Supuesto práctico (bloque III o IV, a elegir)", "case", 12, 3, 4.0, 4, 2, 1),
        ],
        "grading": {"units": [
            unit([1, 2], 100, 50, 0.30, 29.4,
                 "29,40/98 directos (30 %) = 50 puntos, general y cupo de discapacidad (nota CPS de 28/03/2025)."),
        ]},
        "notes": "1.ª parte A − E/4 (valor 1); 2.ª parte 4·A − E (valor 4, error −1/4 del valor). Directa máxima 50 + 48 = 98.",
    },
    {
        "id": "tai-pi-2023", "title": "TAI promoción interna · convocatoria 2023 (examen 17/09/2023)",
        "access": "promocion_interna", "convocatoria": "pi-2023",
        "sources": [L["conv-2023"], L["crit-pi-2023"], L["min-pi-2023"]],
        "duration_minutes": 90,
        "parts": [
            part(1, "Primera parte · Cuestionario", "theory", 50, 5, 1.0, 4),
            part(2, "Segunda parte · Supuesto práctico (bloque III o IV, a elegir)", "case", 12, 3, 4.0, 4, 2, 1),
        ],
        "grading": {"units": [
            unit([1, 2], 100, 50, 0.30, 29.4,
                 "29,40/98 directos (30 %) = 50 puntos, general y cupo de discapacidad (nota CPS de 18/12/2023)."),
        ]},
        "notes": "Igual que 2024. La CPS corrigió sus criterios para calificar de forma conjunta (corrección de errores).",
    },
    {
        "id": "tai-pi-2021", "title": "TAI promoción interna · convocatoria 2021 (OEP 2019, examen 6/11/2021)",
        "access": "promocion_interna", "convocatoria": "pi-2021",
        "sources": [L["conv-2021"], L["crit-pi-2021"], L["min-pi-2021"]],
        "duration_minutes": 90,
        "parts": [
            part(1, "Primera parte · Cuestionario", "theory", 50, 5, 1.0, 4),
            part(2, "Segunda parte · Supuesto práctico (bloque III o IV, a elegir)", "case", 12, 3, 1.0, 4, 2, 1),
        ],
        "grading": {"units": [
            unit([1], 50, 25, 0.30, 15.0, "15/50 (30 %), general y cupo de discapacidad (nota CPS de 24/01/2022)."),
            unit([2], 50, 25, 0.30, 3.6, "3,6/12 (30 %), general y cupo de discapacidad."),
        ]},
        "notes": "A − E/4 en ambas partes; cada parte 0–50 (mínimo 25). Concurso-oposición.",
    },
    {
        "id": "tai-pi-2019", "title": "TAI promoción interna · convocatoria 2019 (OEP 2018, examen 19/10/2019)",
        "access": "promocion_interna", "convocatoria": "pi-2019",
        "sources": [L["conv-2019"], L["crit-pi-2019"], L["min-pi-2019"]],
        "duration_minutes": 90,
        "parts": [
            part(1, "Primera parte · Cuestionario", "theory", 50, 5, 1.0, 4),
            part(2, "Segunda parte · Supuesto práctico (bloque III o IV, a elegir)", "case", 12, 3, 1.0, 4, 2, 1),
        ],
        "grading": {"units": [
            unit([1], 50, 25, 0.30, 15.0, "15/50 (30 %), general y cupo de discapacidad (nota CPS de 17/12/2019)."),
            unit([2], 50, 25, 0.30, 3.6, "3,6/12 (30 %), general y cupo de discapacidad."),
        ]},
        "notes": "A − E/4 en ambas partes; cada parte 0–50 (mínimo 25). Concurso-oposición.",
    },
]


# --------------------------------------------------------------------------- convocatorias


def per_part_cutoff(parts: list[tuple[int, float | None, float]], basis: str) -> dict:
    return {
        "direct": None, "max_direct": None, "grade": 50.0, "basis": basis,
        "per_part": [{"part": p, "direct": d, "max_direct": m} for p, d, m in parts],
    }


def joint_cutoff(direct: float, max_direct: float, basis: str) -> dict:
    return {"direct": direct, "max_direct": max_direct, "grade": 50.0, "basis": basis, "per_part": None}


CONVOCATORIAS = [
    {
        "id": "li-2025", "access": "libre", "year": 2025, "oep": "2025 (y plazas de 2023 y 2024)",
        "title": "Convocatoria 2025 (OEP 2025 y plazas acumuladas de 2023-2024)",
        "resolution": "Resolución de 18 de diciembre de 2025, de la Secretaría de Estado de Función Pública",
        "boe_id": "BOE-A-2025-26262", "exam_date": "2026-05-23", "status": "examen_realizado",
        "scoring_scheme": "tai-li-2025",
        "plazas": {"general": 844, "discapacidad": 186, "total": 1030},
        "admitidos": 15073, "presentados": 8790, "aptos": None, "aprobados": None,
        "cutoff": {"direct": None, "max_direct": None, "grade": None, "basis": "unknown",
                   "per_part": [{"part": 1, "direct": None, "max_direct": 80.0},
                                {"part": 2, "direct": None, "max_direct": 20.0}]},
        "grades_key": None, "destinations_dataset": None,
        "sources": [L["conv-2025"], L["adm-2025"], L["crit-li-2025"], L["pres-2025"], L["crono-2025"], L["oep-2026"]],
        "notes": "Ejercicio celebrado el 23/05/2026 (llamamiento extraordinario el 24/07/2026). Admitidos = convocados "
                 "14.201 + 872 (norma común 13) y presentados provisionales 8.410 + 380 (+45 incidencias), según la nota "
                 "de la CPS. Resultados previstos para finales de octubre de 2026 (cronograma CPS de 29/09/2026): aún no "
                 "hay cortes ni aprobados. Plazas: 23 del RD 625/2023, 107 del RD 656/2024 y 900 del RD 651/2025. Las "
                 "plazas de promoción interna vacantes no se acumulan al turno libre (norma común 9.1) y las de "
                 "discapacidad desiertas no pasan al turno general (13.6). Estimación OpoTAI de cortes (turno general): "
                 "1.ª parte 24/80 (suelo del 30 %), 2.ª parte ≈ 7,7/20. Próxima convocatoria: la OEP 2026 (RD 387/2026) "
                 "autoriza 1.000 plazas TAI de ingreso libre (920 + 80) y 120 de promoción interna; a 11/10/2026 aún no "
                 "se ha convocado (debe publicarse en 2026, art. 3.4) y se esperan las mismas reglas que en 2025.",
    },
    {
        "id": "li-2024", "access": "libre", "year": 2024, "oep": "2023-2024 (y plazas desiertas de 2021-2022)",
        "title": "Convocatoria 2024 (OEP 2023-2024)",
        "resolution": "Resolución de 9 de julio de 2024, de la Secretaría de Estado de Función Pública",
        "boe_id": "BOE-A-2024-14098", "exam_date": "2024-12-14", "status": "finalizada",
        "scoring_scheme": "tai-li-2024",
        "plazas": {"general": 1712, "discapacidad": 167, "total": 1879},
        "admitidos": 9633, "presentados": 5261, "aptos": 1756, "aprobados": 1756,
        "cutoff": joint_cutoff(48.0, 160.0, "floor"),
        "grades_key": "li-2024", "destinations_dataset": "destinos/li-2024.json",
        "sources": [L["conv-2024"], L["crit-li-2024"], L["min-li-2024"], L["pres-2024"], L["mem-2024"], L["apr-2024"],
                    L["nom-2024"]],
        "notes": "Admitidos 9.104 + 529 y presentados 5.047 + 214 (memoria CPS 2024; la nota provisional de 18/12/2024 "
                 "daba 5.243). Superan el ejercicio 1.703 (general) + 53 (discapacidad) = 1.756, todos con plaza: el corte "
                 "fue el suelo del 30 % (48/160) y quedaron 123 plazas sin cubrir (cobertura 93,08 % según la memoria). "
                 "Hubo 7 renuncias: 1.749 nombramientos (BOE-A-2025-25155).",
    },
    {
        "id": "li-2023", "access": "libre", "year": 2023, "oep": "2020-2021-2022",
        "title": "Convocatoria 2023 (OEP 2020, 2021 y 2022)",
        "resolution": "Resolución de 20 de enero de 2023, de la Secretaría de Estado de Función Pública",
        "boe_id": "BOE-A-2023-2175", "exam_date": "2023-09-17", "status": "finalizada",
        "scoring_scheme": "tai-li-2023",
        "plazas": {"general": 1806, "discapacidad": 96, "total": 1902},
        "admitidos": 8151, "presentados": 4388, "aptos": 1858, "aprobados": 1858,
        "cutoff": joint_cutoff(48.0, 160.0, "floor"),
        "grades_key": "li-2023", "destinations_dataset": "destinos/li-2023.json",
        "sources": [L["conv-2023"], L["crit-li-2023"], L["min-li-2023"], L["pres-2023"], L["mem-2023"], L["apr-2023"],
                    L["nom-2023"]],
        "notes": "Admitidos 7.739 + 412 y presentados 4.203 + 185 (memoria CPS 2023; coincide con la nota v4). Superan "
                 "1.803 + 55 = 1.858 con el suelo de 48/160; 44 plazas sin cubrir. 1.855 nombramientos.",
    },
    {
        "id": "li-2021", "access": "libre", "year": 2021, "oep": "2019",
        "title": "Convocatoria 2021 (OEP 2019)",
        "resolution": "Resolución de 26 de mayo de 2021, de la Secretaría de Estado de Política Territorial y Función Pública",
        "boe_id": "BOE-A-2021-8892", "exam_date": "2021-11-06", "status": "finalizada",
        "scoring_scheme": "tai-li-2021",
        "plazas": {"general": 432, "discapacidad": 28, "total": 460},
        "admitidos": 5031, "presentados": 2638, "aptos": 472, "aprobados": 455,
        "cutoff": per_part_cutoff([(1, 25.0, 80.0), (2, 8.0, 20.0)], "rank"),
        "grades_key": "li-2021", "destinations_dataset": "destinos/li-2021.json",
        "sources": [L["conv-2021"], L["crit-li-2021"], L["min-li-2021"], L["mem-2021"], L["apr-2021"], L["nom-2021"]],
        "notes": "Solicitudes 5.291, admitidos 5.031, presentados 2.638, superan el ejercicio 472 y el proceso 455 "
                 "(memoria CPS OEP 2019, p. 72); aprobados 432 (general) + 23 (discapacidad). Cortes del turno general; "
                 "en discapacidad 24/80 y 6/20 (suelo). Primer año con ejercicio único de dos partes.",
    },
    {
        "id": "li-2019", "access": "libre", "year": 2019, "oep": "2018",
        "title": "Convocatoria 2019 (OEP 2018)",
        "resolution": "Resolución de 14 de junio de 2019, de la Secretaría de Estado de Función Pública",
        "boe_id": "BOE-A-2019-9062", "exam_date": "2019-10-19", "status": "finalizada",
        "scoring_scheme": "tai-li-2019",
        "plazas": {"general": 363, "discapacidad": 22, "total": 385},
        "admitidos": 5352, "presentados": 2384, "aptos": 381, "aprobados": 381,
        "cutoff": per_part_cutoff([(1, 31.67, 100.0), (2, 13.0, 30.0)], "rank"),
        "grades_key": "li-2019", "destinations_dataset": "destinos/li-2019.json",
        "sources": [L["conv-2019"], L["fecha-2019"], L["pres-2019"], L["crit1-li-2019"], L["min1-li-2019"],
                    L["crit2-li-2019"], L["min2-li-2019"], L["sup2-2019"], L["mem-2019"], L["apr-2019"], L["nom-2019"]],
        "notes": "Dos ejercicios: 19/10/2019 (cuestionario) y 25/01/2020 (supuesto). Admitidos 5.013 + 339 y presentados "
                 "2.274 + 110 al 1.er ejercicio (nota CPS; la memoria da 5.698 solicitudes y 5.352/5.362 admitidos); superan "
                 "el 1.er ejercicio 576, se presentan al 2.º 562 y lo superan 381 (memoria CPS OEP 2018, p. 68). Cortes "
                 "del sistema general; cupo de discapacidad 30/100 y 9/30 (suelo).",
    },
    {
        "id": "li-2018", "access": "libre", "year": 2018, "oep": "2017",
        "title": "Convocatoria 2018 (OEP 2017)",
        "resolution": "Resolución de 25 de enero de 2018, de la Secretaría de Estado de Función Pública",
        "boe_id": "BOE-A-2018-1169", "exam_date": None, "status": "finalizada",
        "scoring_scheme": "tai-li-2018",
        "plazas": {"general": 332, "discapacidad": 18, "total": 350},
        "admitidos": None, "presentados": None, "aptos": 349, "aprobados": 349,
        "cutoff": per_part_cutoff([(1, 32.33, 100.0), (2, 11.67, 30.0)], "rank"),
        "grades_key": "li-2018", "destinations_dataset": None,
        "sources": [L["conv-2018"], L["apr-2018"], L["nom-2018"], L["opositatest"]],
        "notes": "Cortes inferidos de las calificaciones del BOE (el de la 1.ª parte coincide con la fuente secundaria); "
                 "sin notas oficiales de presentados ni fechas localizadas. Destinos no extraídos (anexo del "
                 "nombramiento publicado como imagen).",
    },
    {
        "id": "li-2016", "access": "libre", "year": 2016, "oep": "2016",
        "title": "Convocatoria 2016 (OEP 2016)",
        "resolution": "Orden HAP/998/2016, de 17 de junio",
        "boe_id": "BOE-A-2016-6049", "exam_date": None, "status": "finalizada",
        "scoring_scheme": "tai-li-2016",
        "plazas": {"general": 142, "discapacidad": 8, "total": 150},
        "admitidos": None, "presentados": None, "aptos": 150, "aprobados": 150,
        "cutoff": per_part_cutoff([(1, 52.67, 100.0), (2, 18.0, 40.0)], "rank"),
        "grades_key": "li-2016", "destinations_dataset": None,
        "sources": [L["conv-2016"], L["apr-2016"], L["nom-2016"], L["opositatest"]],
        "notes": "Cortes inferidos de las calificaciones del BOE (1.ª parte coincidente con la fuente secundaria; "
                 "discapacidad 48/100 según esa fuente). Sin datos oficiales de presentados.",
    },
    {
        "id": "li-2015", "access": "libre", "year": 2015, "oep": "2015",
        "title": "Convocatoria 2015 (OEP 2015)",
        "resolution": "Orden HAP/2294/2015, de 21 de octubre",
        "boe_id": "BOE-A-2015-11843", "exam_date": None, "status": "finalizada",
        "scoring_scheme": "tai-li-2015",
        "plazas": {"general": 84, "discapacidad": 8, "total": 92},
        "admitidos": None, "presentados": None, "aptos": 92, "aprobados": 92,
        "cutoff": per_part_cutoff([(1, 61.67, 100.0), (2, None, 40.0)], "rank"),
        "grades_key": "li-2015", "destinations_dataset": None,
        "sources": [L["conv-2015"], L["apr-2015"], L["nom-2015"], L["opositatest"]],
        "notes": "Corte de la 1.ª parte según fuente secundaria (no verificable: el BOE solo publica la nota total). "
                 "En la OEP 2014 no se convocó TAI por ingreso libre (solo promoción interna, Orden HAP/1541/2014).",
    },
    {
        "id": "pi-2025", "access": "promocion_interna", "year": 2025, "oep": "2025 (y plazas de 2023 y 2024)",
        "title": "Promoción interna · convocatoria 2025",
        "resolution": "Resolución de 18 de diciembre de 2025, de la Secretaría de Estado de Función Pública",
        "boe_id": "BOE-A-2025-26262", "exam_date": "2026-05-23", "status": "examen_realizado",
        "scoring_scheme": "tai-pi-2025",
        "plazas": {"general": 317, "discapacidad": 23, "total": 340},
        "admitidos": 77, "presentados": 32, "aptos": 18, "aprobados": None,
        "cutoff": per_part_cutoff([(1, 15.0, 50.0), (2, 3.6, 12.0)], "floor"),
        "grades_key": None, "destinations_dataset": None,
        "sources": [L["conv-2025"], L["crit-pi-2025"], L["min-pi-2025"], L["superan-pi-2025"], L["pres-2025"]],
        "notes": "Convocados 70 + 7 y presentados provisionales 30 + 2. Superan el ejercicio único 17 (general) + 1 "
                 "(norma común 13) (CPS, 29/09/2026); fase de concurso en curso. Las vacantes no pasan al turno libre.",
    },
    {
        "id": "pi-2024", "access": "promocion_interna", "year": 2024, "oep": "2021-2024",
        "title": "Promoción interna · convocatoria 2024",
        "resolution": "Resolución de 9 de julio de 2024, de la Secretaría de Estado de Función Pública",
        "boe_id": "BOE-A-2024-14098", "exam_date": "2024-12-14", "status": "finalizada",
        "scoring_scheme": "tai-pi-2024",
        "plazas": {"general": 564, "discapacidad": 36, "total": 600},
        "admitidos": 93, "presentados": 56, "aptos": None, "aprobados": 24,
        "cutoff": joint_cutoff(29.4, 98.0, "floor"),
        "grades_key": None, "destinations_dataset": None,
        "sources": [L["conv-2024"], L["crit-pi-2024"], L["min-pi-2024"], L["mem-2024"], L["apr-pi-2024"]],
        "notes": "Admitidos 84 + 9, presentados 52 + 4, superan el proceso 23 + 1 (memoria CPS 2024); 24 aprobados en "
                 "el BOE. Nota final = oposición + concurso, por eso no se incluyen calificaciones.",
    },
    {
        "id": "pi-2023", "access": "promocion_interna", "year": 2023, "oep": "2020-2022",
        "title": "Promoción interna · convocatoria 2023",
        "resolution": "Resolución de 20 de enero de 2023, de la Secretaría de Estado de Función Pública",
        "boe_id": "BOE-A-2023-2175", "exam_date": "2023-09-17", "status": "finalizada",
        "scoring_scheme": "tai-pi-2023",
        "plazas": {"general": 426, "discapacidad": 24, "total": 450},
        "admitidos": 161, "presentados": 86, "aptos": None, "aprobados": 32,
        "cutoff": joint_cutoff(29.4, 98.0, "floor"),
        "grades_key": None, "destinations_dataset": None,
        "sources": [L["conv-2023"], L["crit-pi-2023"], L["min-pi-2023"], L["mem-2023"], L["apr-pi-2023"]],
        "notes": "Admitidos 148 + 13, presentados 81 + 5 y superan 30 + 2 (memoria CPS 2023).",
    },
    {
        "id": "pi-2021", "access": "promocion_interna", "year": 2021, "oep": "2019",
        "title": "Promoción interna · convocatoria 2021 (OEP 2019)",
        "resolution": "Resolución de 26 de mayo de 2021, de la Secretaría de Estado de Política Territorial y Función Pública",
        "boe_id": "BOE-A-2021-8892", "exam_date": "2021-11-06", "status": "finalizada",
        "scoring_scheme": "tai-pi-2021",
        "plazas": {"general": 100, "discapacidad": 5, "total": 105},
        "admitidos": 126, "presentados": 76, "aptos": 33, "aprobados": 30,
        "cutoff": per_part_cutoff([(1, 15.0, 50.0), (2, 3.6, 12.0)], "floor"),
        "grades_key": None, "destinations_dataset": None,
        "sources": [L["conv-2021"], L["crit-pi-2021"], L["min-pi-2021"], L["mem-2021"], L["apr-pi-2021"]],
        "notes": "Solicitudes 148, admitidos 126, presentados 76, superan el ejercicio 33 y el proceso 30 (memoria CPS "
                 "OEP 2019, pp. 3 y 123).",
    },
    {
        "id": "pi-2019", "access": "promocion_interna", "year": 2019, "oep": "2018",
        "title": "Promoción interna · convocatoria 2019 (OEP 2018)",
        "resolution": "Resolución de 14 de junio de 2019, de la Secretaría de Estado de Función Pública",
        "boe_id": "BOE-A-2019-9062", "exam_date": "2019-10-19", "status": "finalizada",
        "scoring_scheme": "tai-pi-2019",
        "plazas": {"general": 100, "discapacidad": 5, "total": 105},
        "admitidos": 204, "presentados": 101, "aptos": 22, "aprobados": 21,
        "cutoff": per_part_cutoff([(1, 15.0, 50.0), (2, 3.6, 12.0)], "floor"),
        "grades_key": None, "destinations_dataset": None,
        "sources": [L["conv-2019"], L["pres-2019"], L["crit-pi-2019"], L["min-pi-2019"], L["mem-2019"], L["apr-pi-2019"]],
        "notes": "Admitidos 193 + 11 y presentados 96 + 5 (nota CPS; la memoria da 220 solicitudes, 204 admitidos, 100 "
                 "presentados, 22 superan el ejercicio y 21 el proceso).",
    },
]


def grades(conv_key: str | None) -> dict | None:
    if not conv_key:
        return None
    d = read_json(DERIVED_DIR / f"aprobados-{conv_key}.json")
    rows = sorted(d["rows"], key=lambda r: (-r["total"], r["order"]))
    values = [r["total"] for r in rows]
    src = d["source"]
    out = {
        "source": f"{src['boe_id']} · {src['title']} (anexo I; calificación final T.P.S. de cada aprobado, sin datos "
                  f"personales; incluye acceso general y cupo de discapacidad)",
        "count": len(values),
        "values": values,
    }
    # Directas por parte (2023-2024): el modelo ordena con las reglas de la convocatoria objetivo
    # (en 2025, cada parte por separado) y no con la suma ponderada.
    if rows and all(len(r.get("parts") or []) == len(rows[0].get("parts") or []) > 0 for r in rows):
        if all("direct" in p for r in rows for p in r["parts"]):
            out["part_directs"] = [
                {"part": i + 1, "values": [r["parts"][i]["direct"] for r in rows]}
                for i in range(len(rows[0]["parts"]))
            ]
    return out


# --------------------------------------------------------------------------- temario

KEYWORDS = {
    "I.1": ["Constitución Española", "derechos fundamentales", "suspensión de derechos", "recurso de amparo", "Corona",
            "Rey", "refrendo"],
    "I.2": ["Cortes Generales", "Congreso de los Diputados", "Senado", "Tribunal Constitucional", "Defensor del Pueblo",
            "recurso de inconstitucionalidad"],
    "I.3": ["Gobierno", "Presidente del Gobierno", "Consejo de Ministros", "moción de censura", "cuestión de confianza",
            "Ley 50/1997"],
    "I.4": ["TREBEP", "Estatuto Básico del Empleado Público", "situaciones administrativas", "incompatibilidades",
            "régimen disciplinario", "Ley 19/2013", "transparencia", "Agenda 2030"],
    "I.5": ["Ley Orgánica 3/2007", "igualdad efectiva", "violencia de género", "Ley Orgánica 1/2004", "Ley 4/2023",
            "LGTBI", "discapacidad", "dependencia"],
    "I.6": ["firma electrónica", "eIDAS", "certificado electrónico", "DNI electrónico", "Ley 6/2020",
            "servicios de confianza", "Agenda Digital", "sociedad de la información"],
    "I.7": ["RGPD", "Ley Orgánica 3/2018", "LOPDGDD", "protección de datos", "delegado de protección de datos",
            "derechos digitales", "AEPD"],
    "I.8": ["Ley 39/2015", "Ley 40/2015", "registro electrónico", "notificaciones electrónicas",
            "Esquema Nacional de Seguridad", "Esquema Nacional de Interoperabilidad", "Normas Técnicas de Interoperabilidad",
            "Real Decreto 203/2021"],
    "I.9": ["sede electrónica", "Cl@ve", "Punto de Acceso General", "Carpeta Ciudadana", "SIR", "Notific@", "@firma",
            "Red SARA"],
    "II.1": ["arquitectura de Von Neumann", "CPU", "memoria RAM", "bus", "sistemas de numeración",
             "codificación de caracteres", "placa base"],
    "II.2": ["periféricos", "impresoras", "almacenamiento", "SSD", "USB", "monitores", "escáner", "conectividad"],
    "II.3": ["estructuras de datos", "pilas", "colas", "árboles", "grafos", "algoritmos de ordenación",
             "organización de ficheros", "formatos de ficheros"],
    "II.4": ["sistema operativo", "Windows", "Linux", "UNIX", "procesos", "gestión de memoria", "Android", "iOS"],
    "II.5": ["SGBD", "base de datos relacional", "NoSQL", "bases de datos orientadas a objetos", "transacciones", "ACID",
             "diccionario de datos"],
    "III.1": ["modelo entidad-relación", "modelo relacional", "normalización", "formas normales", "clave primaria",
              "clave foránea", "diseño lógico", "diseño físico"],
    "III.2": ["lenguajes de programación", "tipos de datos", "operadores", "estructuras de control", "bucles",
              "recursividad", "funciones y parámetros", "vectores"],
    "III.3": ["SQL", "SELECT", "JOIN", "GROUP BY", "procedimientos almacenados", "disparadores", "triggers", "DDL"],
    "III.4": ["orientación a objetos", "clases", "herencia", "polimorfismo", "sobrecarga", "patrones de diseño", "UML",
              "diagrama de clases"],
    "III.5": ["Java EE", "Jakarta EE", "JPA", "EJB", ".NET", "C#", "servlets", "persistencia"],
    "III.6": ["cliente/servidor", "arquitectura multicapa", "servicios web", "SOAP", "REST", "WSDL", "API"],
    "III.7": ["HTML", "CSS", "JavaScript", "XML", "DOM", "front-end", "back-end", "lenguajes de script"],
    "III.8": ["accesibilidad", "WCAG", "Real Decreto 1112/2018", "usabilidad", "diseño universal", "OWASP",
              "seguridad en el desarrollo"],
    "III.9": ["control de versiones", "Git", "metodologías ágiles", "Scrum", "Métrica v3", "pruebas unitarias",
              "integración continua", "repositorios"],
    "IV.1": ["administración de sistemas", "usuarios y permisos", "actualizaciones", "parches", "servicios", "shell",
             "registro de Windows"],
    "IV.2": ["copias de seguridad", "backup", "NAS", "SAN", "RAID", "virtualización", "hipervisor", "VDI"],
    "IV.3": ["SMTP", "POP3", "IMAP", "servidor de correo", "Docker", "Kubernetes", "contenedores", "microservicios"],
    "IV.4": ["LAN", "VLAN", "SNMP", "monitorización", "Active Directory", "LDAP", "gestión de dispositivos",
             "tráfico de red"],
    "IV.5": ["seguridad de la información", "criptografía", "cifrado simétrico", "cifrado asimétrico", "firma digital",
             "CPD", "SAI", "gestión de incidencias"],
    "IV.6": ["medios de transmisión", "fibra óptica", "conmutación", "router", "switch", "5G", "Wi-Fi",
             "redes de difusión"],
    "IV.7": ["modelo OSI", "TCP/IP", "IP", "TCP", "UDP", "direccionamiento IP", "subredes", "IPv6"],
    "IV.8": ["Internet", "HTTP", "HTTPS", "TLS", "SSL", "DNS", "URL", "servicios de Internet"],
    "IV.9": ["cortafuegos", "firewall", "DMZ", "VPN", "IPsec", "IDS/IPS", "proxy", "acceso remoto"],
    "IV.10": ["topologías de red", "Ethernet", "CSMA/CD", "IEEE 802", "hub", "puente", "conmutador",
              "métodos de acceso al medio"],
}


def parse_programa(boe_id: str = "BOE-A-2025-26262", anexo: str = "ANEXO V") -> list[dict]:
    """Extrae literalmente el programa (bloques y temas) del anexo indicado de la convocatoria."""
    paras = boe_paragraphs(RAW_DIR / "boe" / f"{boe_id}.xml")
    start = paras.index(anexo)
    end = paras.index("ANEXO VI", start)
    sect = paras[start:end]
    prog = next(i for i, p in enumerate(sect) if re.match(r"^\d+\. Programa\.?$", p))
    blocks: list[dict] = []
    for p in sect[prog + 1:]:
        mb = re.match(r"^(I|II|III|IV)\. (.+)$", p)
        mt = re.match(r"^(\d+)\. (.+)$", p)
        if mb:
            blocks.append({"id": mb.group(1), "title": mb.group(2).strip(), "topics": []})
        elif mt and blocks:
            n = int(mt.group(1))
            tid = f"{blocks[-1]['id']}.{n}"
            blocks[-1]["topics"].append({"id": tid, "number": n, "title": mt.group(2).strip(), "keywords": KEYWORDS[tid]})
        elif p.strip():
            raise ValueError(f"línea inesperada en el programa: {p[:80]!r}")
    for b in blocks:
        nums = [t["number"] for t in b["topics"]]
        if nums != list(range(1, len(nums) + 1)):
            raise ValueError(f"numeración no consecutiva en el bloque {b['id']}: {nums}")
    return blocks


# --------------------------------------------------------------------------- main


def main() -> int:
    scoring = {"schema_version": 1, "default_scheme": "tai-li-2025", "schemes": SCHEMES}
    write_json(META_DIR / "scoring.json", scoring)

    convs = []
    for c in CONVOCATORIAS:
        c = dict(c)
        key = c.pop("grades_key")
        c["grades_of_aptos"] = grades(key)
        order = ["id", "access", "year", "oep", "title", "resolution", "boe_id", "exam_date", "status", "scoring_scheme",
                 "plazas", "admitidos", "presentados", "aptos", "aprobados", "cutoff", "grades_of_aptos",
                 "destinations_dataset", "sources", "notes"]
        convs.append({k: c[k] for k in order})
    data = {"schema_version": 1, "updated": RETRIEVED, "target_convocatoria": "li-2025", "convocatorias": convs}
    write_json(META_DIR / "convocatorias.json", data)

    blocks = parse_programa()
    temario = {
        "schema_version": 1,
        "convocatoria": "li-2025",
        "source": {
            "title": "BOE-A-2025-26262 · Resolución de 18 de diciembre de 2025, SEFP, anexo V (TAI ingreso libre), "
                     "norma 3 «Programa»",
            "url": boe_url("BOE-A-2025-26262"),
        },
        "blocks": blocks,
    }
    write_json(META_DIR / "temario.json", temario)
    print(f"{len(SCHEMES)} esquemas → {rel(META_DIR / 'scoring.json')}")
    print(f"{len(convs)} convocatorias → {rel(META_DIR / 'convocatorias.json')}")
    print(f"temario: {[(b['id'], len(b['topics'])) for b in blocks]} → {rel(META_DIR / 'temario.json')}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
