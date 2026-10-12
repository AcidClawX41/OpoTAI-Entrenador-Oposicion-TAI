# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (C) 2026 Eric Valls Gramunt
# ruff: noqa: E501  (módulo de datos: URLs y textos literales de las fuentes)
"""Manifiesto de fuentes oficiales usadas por la investigación de OpoTAI.

Cada entrada: ``key`` (único), ``conv`` (convocatoria ``li-AAAA``/``pi-AAAA`` o ``general``),
``kind`` (``boe`` | ``inap`` | ``ine`` | ``page``), ``url``, ``path`` (relativa a
``data/raw/research/``) y ``title``. ``personal: True`` marca documentos con datos personales
(listas nominales): solo se descargan para contar o extraer cifras agregadas/anonimizadas y
**nunca** se copian a ficheros versionados.

Convención de ids: ``<li|pi>-<año de la resolución de convocatoria>``.
"""

from __future__ import annotations

SEDE = "https://sede.inap.gob.es"
SEDE_TAI = (
    SEDE + "/es/procedimientos-y-servicios/seleccion/procesos-selectivos-de-cuerpos-y-escalas-generales/"
    "cuerpo-de-tecnicos-auxiliares-de-informatica-de-la-administracion-del-estado"
)


def boe(conv: str, boe_id: str, title: str, personal: bool = False) -> dict:
    return {
        "key": boe_id,
        "conv": conv,
        "kind": "boe",
        "url": f"https://www.boe.es/diario_boe/xml.php?id={boe_id}",
        "path": f"boe/{boe_id}.xml",
        "title": title,
        "personal": personal,
    }


def inap(conv: str, key: str, path: str, title: str, personal: bool = False) -> dict:
    url = path if path.startswith("http") else SEDE + path
    return {
        "key": f"{conv}:{key}",
        "conv": conv,
        "kind": "inap",
        "url": url,
        "path": f"inap/{conv}/{key}.pdf",
        "title": title,
        "personal": personal,
    }


def page(conv: str, key: str, url: str, title: str) -> dict:
    return {"key": key, "conv": conv, "kind": "page", "url": url, "path": f"pages/{key}.html",
            "title": title, "personal": False}


SOURCES: list[dict] = [
    # ------------------------------------------------------------------ páginas del INAP (índices)
    page("li-2025", "sede-tai-li-2025", SEDE_TAI + "-ingreso-libre-convocatoria-2025", "Sede INAP · TAI LI 2025"),
    page("pi-2025", "sede-tai-pi-2025", SEDE_TAI + "-promocion-interna-convocatoria-2025", "Sede INAP · TAI PI 2025"),
    page("li-2024", "sede-tai-li-2024", SEDE_TAI + "/ctaiae-ingreso-libre-oferta-de-empleo-publico-2023-y-2024",
         "Sede INAP · TAI LI OEP 2023-2024"),
    page("pi-2024", "sede-tai-pi-2024", SEDE_TAI + "/ctaiae-promocion-interna-oferta-de-empleo-publico-2021-2024",
         "Sede INAP · TAI PI OEP 2021-2024"),
    page("li-2023", "sede-tai-li-2023", SEDE_TAI + "/ctaiae-ingreso-libre-oferta-de-empleo-publico-2020-2021-y-2022",
         "Sede INAP · TAI LI OEP 2020-2022"),
    page("pi-2023", "sede-tai-pi-2023",
         SEDE_TAI + "/ctaiae-promocion-interna-oferta-de-empleo-publico-2020-2021-y-2022",
         "Sede INAP · TAI PI OEP 2020-2022"),
    page("li-2021", "sede-tai-li-2021", SEDE_TAI + "/ctaiae-ingreso-libre-oferta-de-empleo-publico-2019",
         "Sede INAP · TAI LI OEP 2019"),
    page("pi-2021", "sede-tai-pi-2021", SEDE_TAI + "/ctaiae-promocion-interna-oferta-de-empleo-publico-2019",
         "Sede INAP · TAI PI OEP 2019"),
    page("li-2019", "sede-tai-li-2019", SEDE_TAI + "/ctaiae-ingreso-libre-oferta-de-empleo-publico-2018",
         "Sede INAP · TAI LI OEP 2018"),
    page("pi-2019", "sede-tai-pi-2019", SEDE_TAI + "/ctaiae-promocion-interna-oferta-de-empleo-publico-2018",
         "Sede INAP · TAI PI OEP 2018"),
    # ------------------------------------------------------------------ BOE · convocatorias
    boe("pi-2014", "BOE-A-2014-8961", "Orden HAP/1541/2014, de 30 de julio (convocatoria conjunta OEP 2014)"),
    boe("li-2015", "BOE-A-2015-11843", "Orden HAP/2294/2015, de 21 de octubre (convocatoria conjunta OEP 2015)"),
    boe("li-2016", "BOE-A-2016-6049", "Orden HAP/998/2016, de 17 de junio (convocatoria conjunta OEP 2016)"),
    boe("li-2018", "BOE-A-2018-1169", "Resolución de 25 de enero de 2018, SEFP (convocatoria OEP 2017)"),
    boe("li-2019", "BOE-A-2019-9062", "Resolución de 14 de junio de 2019, SEFP (convocatoria OEP 2018)"),
    boe("li-2021", "BOE-A-2021-8892", "Resolución de 26 de mayo de 2021, SEPTFP (convocatoria OEP 2019)"),
    boe("li-2023", "BOE-A-2023-2175", "Resolución de 20 de enero de 2023, SEFP (convocatoria OEP 2020-2022)"),
    boe("li-2024", "BOE-A-2024-14098", "Resolución de 9 de julio de 2024, SEFP (convocatoria OEP 2023-2024)"),
    boe("li-2025", "BOE-A-2025-26262", "Resolución de 18 de diciembre de 2025, SEFP (convocatoria OEP 2025)"),
    boe("general", "BOE-A-2026-9946", "Real Decreto 387/2026, de 6 de mayo: oferta de empleo público 2026"),
    boe("li-2025", "BOE-A-2026-6249",
        "Resolución de 12 de marzo de 2026, INAP: admitidos provisionales y fecha del ejercicio (23/05/2026)",
        personal=True),
    # ------------------------------------------------------------------ BOE · relaciones de aprobados (LI)
    boe("li-2015", "BOE-A-2016-7318", "Orden HAP/1281/2016: relación definitiva de aprobados TAI LI (OEP 2015)",
        personal=True),
    boe("li-2016", "BOE-A-2017-7916", "Orden HFP/647/2017: relación definitiva de aprobados TAI LI (OEP 2016)",
        personal=True),
    boe("li-2018", "BOE-A-2018-11387", "Orden TFP/863/2018: relación de aprobados TAI LI (OEP 2017)",
        personal=True),
    boe("li-2019", "BOE-A-2020-6135", "Resolución de 7 de junio de 2020: relación definitiva de aprobados TAI LI",
        personal=True),
    boe("li-2021", "BOE-A-2022-4417", "Resolución de 18 de marzo de 2022: relación definitiva de aprobados TAI LI",
        personal=True),
    boe("li-2023", "BOE-A-2024-4298", "Resolución de 23 de febrero de 2024: relación de aprobados TAI LI",
        personal=True),
    boe("li-2024", "BOE-A-2025-12232", "Resolución de 11 de junio de 2025: relación de aprobados TAI LI",
        personal=True),
    # ------------------------------------------------------------------ BOE · nombramientos (LI)
    boe("li-2015", "BOE-A-2016-12467", "Resolución de 27 de diciembre de 2016: nombramiento TAI LI (OEP 2015)",
        personal=True),
    boe("li-2016", "BOE-A-2018-991", "Resolución de 22 de enero de 2018: nombramiento TAI LI (OEP 2016)",
        personal=True),
    boe("li-2018", "BOE-A-2019-1553", "Resolución de 4 de febrero de 2019: nombramiento TAI LI (OEP 2017)",
        personal=True),
    boe("li-2019", "BOE-A-2020-16688", "Resolución de 18 de diciembre de 2020: nombramiento TAI LI (OEP 2018)",
        personal=True),
    boe("li-2019", "BOE-A-2021-12840", "Resolución de 9 de julio de 2021: modifica la de 18/12/2020 (recurso)",
        personal=True),
    boe("li-2021", "BOE-A-2022-9033", "Resolución de 31 de mayo de 2022: nombramiento TAI LI (OEP 2019)",
        personal=True),
    boe("li-2023", "BOE-A-2024-11491", "Resolución de 3 de junio de 2024: nombramiento TAI LI (OEP 2020-2022)",
        personal=True),
    boe("li-2024", "BOE-A-2025-25155", "Resolución de 4 de diciembre de 2025: nombramiento TAI LI (OEP 2023-2024)",
        personal=True),
    boe("li-2024", "BOE-A-2026-2737", "Resolución de 27 de enero de 2026: corrige errores de la de 4/12/2025 (LI)",
        personal=True),
    # ------------------------------------------------------------------ BOE · promoción interna
    boe("pi-2014", "BOE-A-2015-6595", "Orden HAP/1109/2015: relación definitiva de aprobados TAI PI (OEP 2014)",
        personal=True),
    boe("pi-2014", "BOE-A-2015-13098", "Resolución de 25 de noviembre de 2015: nombramiento TAI PI (OEP 2014)",
        personal=True),
    boe("pi-2019", "BOE-A-2020-3463", "Resolución de 9 de marzo de 2020: relación definitiva de aprobados TAI PI",
        personal=True),
    boe("pi-2019", "BOE-A-2020-15606", "Resolución de 2 de diciembre de 2020: nombramiento TAI PI", personal=True),
    boe("pi-2021", "BOE-A-2022-9472", "Resolución de 6 de junio de 2022: relación definitiva de aprobados TAI PI",
        personal=True),
    boe("pi-2021", "BOE-A-2022-13478", "Resolución de 3 de agosto de 2022: nombramiento TAI PI", personal=True),
    boe("pi-2023", "BOE-A-2024-10085", "Resolución de 8 de mayo de 2024: relación de aprobados TAI PI",
        personal=True),
    boe("pi-2023", "BOE-A-2025-889", "Resolución de 17 de enero de 2025: nombramiento TAI PI", personal=True),
    boe("pi-2024", "BOE-A-2025-14913", "Resolución de 15 de julio de 2025: relación de aprobados TAI PI",
        personal=True),
    boe("pi-2024", "BOE-A-2025-25154", "Resolución de 4 de diciembre de 2025: nombramiento TAI PI", personal=True),
    # ------------------------------------------------------------------ INAP · convocatoria 2025
    inap("li-2025", "criterios", "/sites/sede/files/public/2026-05/TAI%20LI%202025.pdf",
         "Criterios de corrección, valoración y superación TAI LI 2025 (CPS, 18/05/2026)"),
    inap("li-2025", "presentados",
         "/sites/sede/files/public/2026-06/2026_05_23_NotainformativaPRESENTADOS_SM6O28WIR9_154AB89SD658.pdf",
         "Nota informativa CPS: convocados y presentados provisionales al examen del 23/05/2026"),
    inap("li-2025", "cronograma-2025-12-19", "/sites/sede/files/public/2025-12/Cronograma%20CPS%202025_2025_12_19_1.pdf",
         "Cronograma orientativo CPS 2025 (19/12/2025)"),
    inap("li-2025", "cronograma-2026-07-27",
         "/sites/sede/files/public/2026-07/CronogramaCPS2025_2026_07_27_6BS0SFBILS_154AB89SD658.pdf",
         "Actualización del cronograma CPS 2025 (27/07/2026)"),
    inap("li-2025", "cronograma-2026-09-29", "/sites/sede/files/public/2026-09/Cronograma%20CPS%202025_2026_09_29.pdf",
         "Actualización del cronograma CPS 2025 (29/09/2026)"),
    inap("li-2025", "admitidos-definitivos",
         "/sites/sede/files/public/2026-05/report_RESOLUCION%20DEFINITIVA%20ADMITIDOS%20Y%20EXCLUIDOS%20CPS%20%281%29.pdf",
         "Resolución INAP: relación definitiva de admitidos y excluidos (convoca el ejercicio)"),
    inap("li-2025", "llamamiento-extraordinario",
         "/sites/sede/files/public/2026-07/report_RESOLUCION%20CONJUNTA%20EXTRAORDINARIOS.pdf",
         "Resolución: llamamiento extraordinario (24/07/2026)", personal=True),
    # ------------------------------------------------------------------ INAP · PI 2025
    inap("pi-2025", "criterios", "/sites/sede/files/public/2026-05/TAI%20PI%202025.pdf",
         "Criterios de corrección TAI PI 2025 (CPS, 18/05/2026)"),
    inap("pi-2025", "puntuaciones-minimas",
         "/sites/sede/files/public/2026-09/PUNTUACIONES%20MINIMAS%20EJER%20UNICO%20TAI%20PI.pdf",
         "Nota informativa de puntuaciones mínimas TAI PI 2025 (29/09/2026)"),
    inap("pi-2025", "formula-transformada",
         "/sites/sede/files/public/2026-09/Nota%20informativa%20F%C3%B3rmula%20Transformada%20%282%29.pdf",
         "Nota informativa: fórmula de transformación de puntuaciones directas (29/09/2026)"),
    inap("pi-2025", "resolucion-superan",
         "/sites/sede/files/public/2026-09/report_Resoluci%C3%B3n%20superan%20ejercicio%20%C3%BAnico%20TAI-P.pdf",
         "Resolución CPS: relación de personas que superan el ejercicio único TAI PI 2025"),
    inap("pi-2025", "superan-gen", "/sites/sede/files/public/2026-09/1-TAI-P-DM-SUP_GEN.pdf",
         "Superan el ejercicio único TAI PI 2025 · acceso general", personal=True),
    inap("pi-2025", "superan-crd", "/sites/sede/files/public/2026-09/1-TAI-P-DM-SUP_CRD.pdf",
         "Superan el ejercicio único TAI PI 2025 · cupo norma común 13", personal=True),
    # ------------------------------------------------------------------ INAP · LI 2024
    inap("li-2024", "criterios",
         "/documents/59312/2364268/TAI+LI+2024.pdf/22c390b8-b596-7cee-ec54-9635b085ad94",
         "Criterios de corrección TAI LI 2024 (CPS, 10/12/2024)"),
    inap("li-2024", "presentados",
         "/documents/59312/2364268/NOTA+CPS+DICIEMBRE+DATOS+PRESENTADOS.pdf/9f8d788b-11f6-5364-3347-f6ea77427b63",
         "Nota CPS: datos provisionales de presentados (diciembre 2024)"),
    inap("li-2024", "resolucion-superan",
         "/documents/59312/2364268/report_ResolucinsuperanprimerejercicioTAI-L_RMPXOCCWKJ_154AB89SD658.pdf/"
         "bfaceea9-06cb-1185-ba9f-b7dae5d1bc09",
         "Resolución CPS: relación de opositores que superan el ejercicio único TAI LI 2024"),
    inap("li-2024", "superan-gen",
         "/documents/59312/2364268/1-TAI-L-DM-SUP_GEN_59DH1ZAVDM_154AB89SD658.pdf/5dcc61e5-31fa-1842-118b-2859706c343e",
         "Superan el ejercicio único TAI LI 2024 · acceso general", personal=True),
    inap("li-2024", "superan-crd",
         "/documents/59312/2364268/1-TAI-L-DM-SUP_CRD_5VTIO1GM43_154AB89SD658.pdf/2a16a143-ffea-c5d8-a513-0f88705c3eff",
         "Superan el ejercicio único TAI LI 2024 · cupo discapacidad", personal=True),
    inap("li-2024", "puntuaciones-minimas",
         "/documents/59312/2364268/PUNTUACIONESMINIMASEJERUNICOTAIL_NNSVF2SJLX_154AB89SD658.pdf/"
         "22610a7c-da9d-a9bb-95fc-a480ebf8ac18",
         "Nota informativa de puntuaciones mínimas TAI LI 2024"),
    inap("li-2024", "formula-transformada",
         "/documents/59312/2364268/Nota+informativa+F%C3%B3rmula+Transformada.pdf/b9f32071-ea95-e408-85cf-7af976608917",
         "Nota informativa: fórmula de transformación (TAI LI 2024)"),
    inap("li-2024", "cronograma",
         "/documents/10136/1679185/CronogramaCPS2024_T13E4PK5FH_154AB89SD658.pdf/96509c65-e5f8-dca3-5d9c-a6bbadbab12b",
         "Cronograma orientativo CPS 2024"),
    inap("li-2024", "cronograma-modificacion",
         "/documents/59312/2364268/Cronograma+CPS+2024+MODIFICACION.pdf/67b14925-6548-6ca1-d047-e432cf27b63f",
         "Cronograma CPS 2024 (modificación)"),
    inap("li-2024", "admitidos-definitivos",
         "/documents/59312/2364380/report_RESOLUCION+DEFINITIVA+ADMITIDOS+Y+EXCLUIDOS+CPS.pdf/"
         "f7b0f2e8-edd8-225d-f83d-42f8ac71f120",
         "Resolución INAP: relación definitiva de admitidos y excluidos (OEP 2023-2024)"),
    # ------------------------------------------------------------------ INAP · PI 2024
    inap("pi-2024", "criterios",
         "/documents/59312/2364118/TAI+PI+2024.pdf/0ee5a809-a983-258b-aab2-38603947124d",
         "Criterios de corrección TAI PI 2024"),
    inap("pi-2024", "puntuaciones-minimas",
         "/documents/59312/2364118/PUNTUACIONES+MINIMAS+EJER+UNICO+TAI+PI.pdf/7ed869ab-b224-7b87-d1a2-aae153c7aa6d",
         "Nota informativa de puntuaciones mínimas TAI PI 2024"),
    inap("pi-2024", "formula-transformada",
         "/documents/59312/2364118/Nota+informativa+F%C3%B3rmula+Transformada.pdf/571ffebf-d403-cdfa-790d-cd37867b582b",
         "Nota informativa: fórmula de transformación (TAI PI 2024)"),
    inap("pi-2024", "resolucion-superan",
         "/documents/59312/2364118/report_ResolucinsuperanprimerejercicioTAI-P_IWE5ADFF2W_154AB89SD658.pdf/"
         "19ab38f4-ba54-2cdf-2480-773e969daed3",
         "Resolución CPS: superan el ejercicio único TAI PI 2024"),
    # ------------------------------------------------------------------ INAP · LI 2023 (OEP 2020-2022)
    inap("li-2023", "criterios",
         "/documents/59312/2194858/TAI+LI+2023.pdf/1fe7e36d-60d0-742d-a69c-f282ae32879a",
         "Criterios de corrección TAI LI (convocatoria 2023)"),
    inap("li-2023", "presentados-v1",
         "/documents/59312/2194801/Presentados+totales.pdf/21355738-dc03-e5fb-6b99-5025fe982b89",
         "Datos provisionales de presentados (v1)"),
    inap("li-2023", "presentados-v2",
         "/documents/59312/2194895/Presentadostotales_XNMRX57Z1Z_154AB89SD658.pdf/f51a2929-38bc-1067-fb1e-23cf1e767752",
         "Datos provisionales de presentados (v2)"),
    inap("li-2023", "presentados-v4",
         "/documents/59312/2194932/Presentados+totales+v4.pdf/7bcfb0f2-e18b-b7b3-f19c-e124558b6fe5",
         "Datos provisionales de presentados (v4)"),
    inap("li-2023", "resolucion-superan",
         "/documents/59312/2194858/Resoluci%C3%B3n+superan+primer+ejercicio+TAI-L.pdf/6edd1227-e651-b58f-e5de-379ab715d12c",
         "Resolución CPS: superan el ejercicio único TAI LI 2023"),
    inap("li-2023", "superan-gen",
         "/documents/59312/2194858/1-TAI-L-DM-SUP_GE_NBI96LOBCS_154AB89SD658.pdf/a3b6656f-e772-cfbd-b65a-3ca663d137a3",
         "Superan el ejercicio único TAI LI 2023 · acceso general", personal=True),
    inap("li-2023", "superan-crd",
         "/documents/59312/2194858/1-TAI-L-DM-SUP_CRD_Y9Z38R2EPO_154AB89SD658.pdf/55752764-c2a2-a83e-d534-d64bd7844f9c",
         "Superan el ejercicio único TAI LI 2023 · cupo discapacidad", personal=True),
    inap("li-2023", "puntuaciones-minimas",
         "/documents/59312/2194858/PUNTUACIONES+MINIMAS+EJER+UNICO+TAI+L.pdf/0b7a9b95-4624-d636-7e1f-ec501310b1ab",
         "Nota informativa de puntuaciones mínimas TAI LI 2023"),
    inap("li-2023", "formula-transformada",
         "/documents/59312/2194858/Nota+informativa+F%C3%B3rmula+Transformada.pdf/88def2c4-f096-269c-8957-4a21e07a05e6",
         "Nota informativa: fórmula de transformación (TAI LI 2023)"),
    inap("li-2023", "fecha-lugar",
         "/documents/59312/2194858/26-+ANEXO+XIII.pdf/f62e5eca-7dd2-e321-d408-0cca1bb4dad9",
         "Anexo XIII: fecha y lugar del ejercicio"),
    inap("li-2023", "cronograma-3",
         "/documents/59312/2194932/NOTA+DE+LA+COMISI%C3%93N+PERMANENTE+DE+SELECCI%C3%93N.CRONOGRAMA.3.pdf/"
         "fe4ea3c9-cf89-7660-2bb8-334f9fa8925b",
         "Nota CPS: cronograma (3)"),
    # ------------------------------------------------------------------ INAP · PI 2023
    inap("pi-2023", "criterios",
         "/documents/59312/2194876/TAI+PI+2023.pdf/f9c185d7-613c-3a80-45d5-11e3b3123677",
         "Criterios de corrección TAI PI (convocatoria 2023)"),
    inap("pi-2023", "criterios-correccion",
         "/documents/59312/2194876/TAI-P_CORRECCION+ERRORES+CRITERIOS+CORRECCION.pdf/6932b6e6-99ed-e4a4-c6ed-e3c4a5705a72",
         "Corrección de errores de los criterios TAI PI 2023"),
    inap("pi-2023", "puntuaciones-minimas",
         "/documents/59312/2194876/PUNTUACIONES+MINIMAS+EJER+UNICO+TAI+PI.pdf/adefad89-c6f0-16d5-7dab-cd6711d0ac24",
         "Nota informativa de puntuaciones mínimas TAI PI 2023"),
    inap("pi-2023", "resolucion-superan",
         "/documents/59312/2194876/Resoluci%C3%B3n+superan+primer+ejercicio+TAI-P.pdf/be5336a6-8ef6-b1c2-36b5-53608dd4295c",
         "Resolución CPS: superan el ejercicio único TAI PI 2023"),
    # ------------------------------------------------------------------ INAP · LI 2021 (OEP 2019)
    inap("li-2021", "criterios",
         "/documents/59312/1925662/2OEP2019TAI-LI_154AB89SD658.pdf/0def8107-8fdd-c394-8860-dd291cc31fca",
         "Criterios de corrección TAI LI OEP 2019"),
    inap("li-2021", "resolucion-superan",
         "/documents/59312/1925774/ResolucinsuperanprimerejercicioTAIL_154AB89SD658.pdf/94e561b2-358e-7bb8-3f17-fba442f8e80c",
         "Resolución CPS: superan el ejercicio único TAI LI OEP 2019"),
    inap("li-2021", "superan-gen",
         "/documents/59312/1925774/1-TAI-L-DM-SUP_GE_154AB89SD658.pdf/cf1565e4-ad34-d5e0-bca2-43b282282678",
         "Superan el ejercicio único TAI LI OEP 2019 · acceso general", personal=True),
    inap("li-2021", "puntuaciones-minimas",
         "/documents/59312/1925774/Puntuacionesminimasprimerejercicio2019TAIL_154AB89SD658.pdf/"
         "9186ee4e-faf8-e9c5-3152-403b71232c9a",
         "Nota informativa de puntuaciones mínimas TAI LI OEP 2019"),
    inap("li-2021", "formula-transformada",
         "/documents/59312/1925774/NotainformativaFrmulaTransformada_154AB89SD658.pdf/b21a0a6f-b3ee-8fea-8984-2348caba710c",
         "Nota informativa: fórmula de transformación (TAI LI OEP 2019)"),
    inap("li-2021", "admitidos-gen",
         "/documents/59312/1925774/TAI_L_GE_154AB89SD658.PDF/6b5ee73c-837e-e034-8141-dacceb0c6dd1",
         "Relación definitiva de admitidos TAI LI OEP 2019 · acceso general (solo se cuenta)", personal=True),
    inap("li-2021", "admitidos-crd",
         "/documents/59312/1925774/TAI_L_CRD_154AB89SD658.PDF/7ce0b4f1-ac7c-3326-3163-25f086428d29",
         "Relación definitiva de admitidos TAI LI OEP 2019 · cupo discapacidad (solo se cuenta)", personal=True),
    inap("li-2021", "fecha-lugar",
         "/documents/59312/1925662/ANEXOXLUGARCELEBRACIONPRIMEREJERCICIOOEP2019_154AB89SD658.pdf/"
         "cab522de-637d-f1e8-7c94-f0abbded1f94",
         "Anexo X: lugar y fecha de celebración (OEP 2019)"),
    # ------------------------------------------------------------------ INAP · PI 2021
    inap("pi-2021", "criterios",
         "/documents/59312/1925662/3OEP2019TAI-PI_154AB89SD658.pdf/c9c86cb8-ffab-9b0d-96f7-8ff10d7bd020",
         "Criterios de corrección TAI PI OEP 2019"),
    inap("pi-2021", "puntuaciones-minimas",
         "/documents/59312/1925806/Puntuacionesminimasprimerejercicio2019TAIPI_154AB89SD658.pdf/"
         "c0ff2a15-5bc7-3da5-db8e-a5ced6c35e47",
         "Nota informativa de puntuaciones mínimas TAI PI OEP 2019"),
    # ------------------------------------------------------------------ INAP · LI 2019 (OEP 2018)
    inap("li-2019", "criterios-1",
         "/documents/59312/1790179/7OEP2018TAILI_154AB89SD658.pdf/cdc80da6-8e02-a640-65c4-faa5917c9a28",
         "Criterios de corrección primer ejercicio TAI LI OEP 2018"),
    inap("li-2019", "criterios-2",
         "/documents/59312/1790179/CRITERIOS_2_TAILI_154AB89SD658.pdf/c44b7573-d587-4a0a-3eef-8d4cd346b266",
         "Criterios de corrección segundo ejercicio TAI LI OEP 2018"),
    inap("li-2019", "presentados",
         "/documents/59312/1790179/notainformativapresentados__154AB89SD658.pdf/4adcf8b4-69b9-195e-058a-931e3ae80ec6",
         "Nota informativa de presentados (primer ejercicio OEP 2018)"),
    inap("li-2019", "resolucion-superan-1",
         "/documents/59312/1790179/ResolucinsuperanprimerejercicioTAIL_154AB89SD658.pdf/a8191b9b-51e5-522a-ca09-e88be7487836",
         "Resolución CPS: superan el primer ejercicio TAI LI OEP 2018"),
    inap("li-2019", "superan-1-gen",
         "/documents/59312/1790179/1-TAI-L-DM-SUP_GE_154AB89SD658.pdf/632c6585-3797-e010-10da-78c52ed21859",
         "Superan el primer ejercicio TAI LI OEP 2018 · acceso general", personal=True),
    inap("li-2019", "puntuaciones-minimas-1",
         "/documents/59312/1790179/PuntminimasTAIL1ejer_154AB89SD658.pdf/ffe7336a-b035-156b-262f-fd1817af7636",
         "Nota informativa de puntuaciones mínimas primer ejercicio TAI LI OEP 2018"),
    inap("li-2019", "formula-transformada",
         "/documents/59312/1790179/Nota_Formula_154AB89SD658.pdf/60de1ebb-16e2-8d67-fe43-af298a24d9e6",
         "Nota informativa: fórmula de transformación (TAI LI OEP 2018)"),
    inap("li-2019", "resolucion-superan-2",
         "/documents/59312/1790179/2ejer_Reso_superan_TAILI_OEP2018__154AB89SD658.pdf/8630d1d0-bc53-6255-f7e2-f26aa888b6a4",
         "Resolución de 30 de abril de 2020: superan el segundo ejercicio TAI LI OEP 2018"),
    inap("li-2019", "puntuaciones-minimas-2",
         "/documents/59312/1790179/2ejer_Punt_minimas%25202018_TAILI_OEP2018__154AB89SD658.pdf/"
         "9929afed-090f-a586-a01e-c5fac4ef6ed0",
         "Nota informativa de puntuaciones mínimas segundo ejercicio TAI LI OEP 2018"),
    inap("li-2019", "fecha-lugar",
         "/documents/59312/1747284/LUGAR_DIA_HORA_EXAMEN.pdf/aabf689e-5098-67e3-bbbf-57aacbb817bc",
         "Lugar, día y hora del examen (OEP 2018)"),
    inap("li-2019", "nota-2-ejercicio",
         "/documents/59312/1790179/Nota_informativa_25_enero_154AB89SD658.pdf/d64ad80a-2501-6549-41ea-260992689e07",
         "Nota informativa (segundo ejercicio, 25 de enero)"),
    # ------------------------------------------------------------------ INAP · PI 2019 (OEP 2018)
    inap("pi-2019", "criterios",
         "/documents/59312/1777270/8OEP2018TAIPI_154AB89SD658.pdf/f4857b8c-0a2e-01a1-cd0c-70e920fe73f6",
         "Criterios de corrección TAI PI OEP 2018"),
    inap("pi-2019", "presentados",
         "/documents/59312/1777270/notainformativapresentados__154AB89SD658.pdf/6d836e52-d988-609b-7cd7-c74226bda6de",
         "Nota informativa de presentados TAI PI OEP 2018"),
    inap("pi-2019", "puntuaciones-minimas",
         "/documents/59312/1777270/PuntminimasTAIPIejerunico_154AB89SD658.pdf/f823a512-b2be-9bf1-4f68-e1073697436e",
         "Nota informativa de puntuaciones mínimas TAI PI OEP 2018"),
    # ------------------------------------------------------------------ INAP · memorias de la CPS
    inap("li-2019", "memoria-cps-oep2018",
         "https://www.inap.es/documents/10136/1712229/Memoria+CPS+OEP+2018.pdf/2bf66ef6-b34c-b843-4f3a-a666b25087e5",
         "CPS · Memoria ejecutiva de la OEP 2018 (convocatoria de 14/06/2019), abril de 2021"),
    inap("li-2021", "memoria-cps-oep2019",
         "https://www.inap.es/documents/10136/1712229/Memoria+CPS+2019%281%29.pdf/da7cb768-9c0a-db41-e6ce-a35a32d49cf2",
         "CPS · Memoria ejecutiva de la OEP 2019 (convocatoria de 26/05/2021), febrero de 2023"),
    inap("li-2023", "memoria-cps-oep2020-2022",
         "https://www.inap.es/sites/portal/files/public/2025-07/MemoriaCPS2022_2ZSS86J3TV_154AB89SD658.pdf",
         "CPS · Memoria de la OEP 2020, 2021 y 2022 (convocatoria de 20/01/2023)"),
    inap("li-2024", "memoria-cps-2024",
         "https://www.inap.es/sites/portal/files/public/2026-01/MemoriaCP2024.pdf",
         "CPS · Memoria de las OEP acumuladas 2021-2024 (convocatoria de 9/07/2024)"),
    # ------------------------------------------------------------------ INE
    {
        "key": "ine-pobmun",
        "conv": "general",
        "kind": "ine",
        "url": "https://www.ine.es/pob_xls/pobmun.zip",
        "path": "ine/pobmun.zip",
        "title": "INE · Cifras oficiales de población de los municipios españoles (Revisión del Padrón), serie",
        "personal": False,
    },
]


def by_key(key: str) -> dict:
    for s in SOURCES:
        if s["key"] == key:
            return s
    raise KeyError(key)


def by_conv(conv: str) -> list[dict]:
    return [s for s in SOURCES if s["conv"] == conv]
