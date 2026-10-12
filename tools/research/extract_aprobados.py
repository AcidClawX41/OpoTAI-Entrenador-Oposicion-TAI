# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (C) 2026 Eric Valls Gramunt
"""Extrae, anonimizadas, las calificaciones de las relaciones oficiales de aprobados (BOE).

Uso (desde ``tools/``)::

    uv run python research/extract_aprobados.py          # todas las convocatorias conocidas
    uv run python research/extract_aprobados.py li-2024

Para cada convocatoria lee el anexo I de la «relación (definitiva) de aspirantes que han superado
el proceso selectivo» publicada en el BOE y guarda en ``data/raw/research/derived/aprobados-<conv>.json``
**solo** cifras: número de orden, calificación final (T.P.S., 0–100) y, si constan, puntuaciones
por parte (directas con aciertos/errores en 2023-2024; calificaciones 0–50 por parte o ejercicio
en 2016-2021). Se descartan DNI y nombres (columnas 0 y 1) sin escribirlos en ningún sitio.

Además cuenta (sin extraer nada más) las filas de las listas de la CPS que separan acceso general
y cupo de discapacidad, para conocer el reparto de aprobados entre ambos turnos.
"""

from __future__ import annotations

import re
import statistics
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from common import DERIVED_DIR, RAW_DIR, boe_metadata, boe_tables, es_number, pdf_text, rel, write_json  # noqa: E402

# convocatoria -> BOE con la relación de aprobados (ingreso libre)
APROBADOS_BOE = {
    "li-2015": "BOE-A-2016-7318",
    "li-2016": "BOE-A-2017-7916",
    "li-2018": "BOE-A-2018-11387",
    "li-2019": "BOE-A-2020-6135",
    "li-2021": "BOE-A-2022-4417",
    "li-2023": "BOE-A-2024-4298",
    "li-2024": "BOE-A-2025-12232",
}

# Listas de la CPS (sede INAP) de quienes superan el ejercicio único, por turno (solo se cuentan).
CPS_LISTS = {
    "li-2024": {"general": "inap/li-2024/superan-gen.pdf", "discapacidad": "inap/li-2024/superan-crd.pdf"},
    "li-2023": {"general": "inap/li-2023/superan-gen.pdf", "discapacidad": "inap/li-2023/superan-crd.pdf"},
    "li-2021": {
        "general": "inap/li-2021/superan-gen.pdf",
        "admitidos_general": "inap/li-2021/admitidos-gen.pdf",
        "admitidos_discapacidad": "inap/li-2021/admitidos-crd.pdf",
    },
    "pi-2025": {"general": "inap/pi-2025/superan-gen.pdf", "discapacidad": "inap/pi-2025/superan-crd.pdf"},
}

ORDER_RE = re.compile(r"^\d{1,6}$")
NUM_RE = re.compile(r"^-?\d{1,3}(?:\.\d{3})*(?:,\d+)?$|^-?\d+(?:,\d+)?$")
# NIF/DNI enmascarado o completo al inicio de cada fila de las listas de la CPS
NIF_RE = re.compile(r"^(?:\*{2,4}\d{3,4}\*{1,3}|\d{7,8}[A-Z]?|[XYZ]\d{7}[A-Z])$")


def parse_boe_aprobados(conv: str) -> dict:
    boe_id = APROBADOS_BOE[conv]
    path = RAW_DIR / "boe" / f"{boe_id}.xml"
    meta = boe_metadata(path)
    tables = boe_tables(path)
    table = next(t for t in tables if any("T.P.S." in " ".join(r) for r in t[:3]))
    rows = []
    layout = None
    for cells in table:
        if len(cells) < 4 or not ORDER_RE.match(cells[-1] or ""):
            continue  # cabeceras
        values = cells[2:]  # se descartan DNI (0) y nombre (1)
        if not all(NUM_RE.match(v) for v in values):
            raise ValueError(f"{conv}: fila con valores no numéricos: {len(values)} columnas")
        nums = [es_number(v) for v in values]
        n = len(nums)
        if layout is None:
            layout = n
        elif n != layout:
            raise ValueError(f"{conv}: número de columnas variable ({n} vs {layout})")
        order = int(nums[-1])
        total = nums[-2]
        row = {"order": order, "total": total}
        if n == 8:  # directas, aciertos y errores por parte (2023-2024)
            row["parts"] = [
                {"direct": nums[0], "correct": int(nums[1]), "wrong": int(nums[2])},
                {"direct": nums[3], "correct": int(nums[4]), "wrong": int(nums[5])},
            ]
        elif n == 4:  # calificaciones 0-50 por parte/ejercicio
            row["parts"] = [{"grade": nums[0]}, {"grade": nums[1]}]
        elif n != 2:
            raise ValueError(f"{conv}: formato de tabla inesperado ({n} columnas numéricas)")
        rows.append(row)
    rows.sort(key=lambda r: r["order"])
    orders = [r["order"] for r in rows]
    if orders != list(range(1, len(rows) + 1)):
        raise ValueError(f"{conv}: el número de orden no es consecutivo 1..{len(rows)}")
    totals = [r["total"] for r in rows]
    if any(b > a + 1e-9 for a, b in zip(totals, totals[1:], strict=False)):
        # el BOE ordena por calificación; si no, se avisa (desempates)
        print(f"  AVISO {conv}: calificaciones no estrictamente decrecientes por orden", file=sys.stderr)
    return {
        "convocatoria": conv,
        "source": {"boe_id": boe_id, "title": meta["title"], "url": meta["url_pdf"]},
        "count": len(rows),
        "layout": {8: "directas_por_parte", 4: "calificacion_por_parte", 2: "solo_total"}[layout],
        "rows": rows,
    }


def count_cps_list(path: Path) -> int:
    """Cuenta las filas (personas) de un listado de la CPS sin extraer datos personales."""
    text = pdf_text(path)
    n = sum(1 for tok in text.split() if NIF_RE.match(tok))
    m = re.search(r"N[ºo°]\s*Registros:\s*(\d+)", text)
    if m and int(m.group(1)) != n:
        print(f"  AVISO {rel(path)}: {n} NIF detectados pero el pie indica {m.group(1)} registros",
              file=sys.stderr)
    return n


def summarize(data: dict) -> str:
    totals = [r["total"] for r in data["rows"]]
    q = statistics.quantiles(totals, n=10) if len(totals) >= 10 else []
    return (
        f"{data['convocatoria']}: {data['count']} aprobados · máx {max(totals):.2f} "
        f"· mín {min(totals):.2f} · "
        f"mediana {statistics.median(totals):.2f} · deciles {[round(x, 2) for x in q]}"
    )


def main(argv: list[str] | None = None) -> int:
    convs = (argv if argv is not None else sys.argv[1:]) or list(APROBADOS_BOE)
    for conv in convs:
        if conv in APROBADOS_BOE:
            data = parse_boe_aprobados(conv)
            if conv in CPS_LISTS:
                data["cps_counts"] = {k: count_cps_list(RAW_DIR / v) for k, v in CPS_LISTS[conv].items()}
            out = DERIVED_DIR / f"aprobados-{conv}.json"
            write_json(out, data)
            print(summarize(data), "·", data.get("cps_counts", ""), "→", rel(out))
        elif conv in CPS_LISTS:
            counts = {k: count_cps_list(RAW_DIR / v) for k, v in CPS_LISTS[conv].items()}
            out = DERIVED_DIR / f"aprobados-{conv}.json"
            write_json(out, {"convocatoria": conv, "cps_counts": counts})
            print(conv, counts, "→", rel(out))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
