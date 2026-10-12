# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (C) 2026 Eric Valls Gramunt
"""Genera ``data/meta/destinos/<conv>.json`` a partir de las resoluciones de nombramiento (BOE).

Uso (desde ``tools/``)::

    uv run python research/extract_destinos.py            # todas las promociones configuradas
    uv run python research/extract_destinos.py li-2024

Fuente: anexo de la «Resolución … por la que se nombra personal funcionario de carrera, por el
sistema general de acceso libre, en el Cuerpo de Técnicos Auxiliares de Informática de la
Administración del Estado», que relaciona a las personas nombradas por **número de orden del
proceso selectivo (NOPS)** con el destino adjudicado.

Anonimización: de cada fila solo se conservan NOPS (``order``), Ministerio (``organism``), Centro
directivo/OO. AA. (``unit``), provincia y localidad. Se descartan documento de identidad/NRP,
nombre y apellidos, centro de destino, puesto, código de puesto, nivel y complemento (ninguno se
escribe en disco). La localidad se normaliza al municipio del padrón del INE (ver ``ine.py``).
"""

from __future__ import annotations

import collections
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from common import DESTINOS_DIR, RAW_DIR, boe_metadata, boe_tables, normalize_province, rel, write_json  # noqa: E402
from ine import find_municipality  # noqa: E402

NOMBRAMIENTOS = {
    "li-2024": {
        "boe": "BOE-A-2025-25155",
        "corrections": ["BOE-A-2026-2737"],  # solo corrige apellidos: sin efecto en los datos anonimizados
        "extra": [],
        "aprobados_boe": "BOE-A-2025-12232",
    },
    "li-2023": {
        "boe": "BOE-A-2024-11491", "corrections": [], "extra": [], "aprobados_boe": "BOE-A-2024-4298",
    },
    "li-2021": {"boe": "BOE-A-2022-9033", "corrections": [], "extra": [], "aprobados_boe": "BOE-A-2022-4417"},
    "li-2019": {
        "boe": "BOE-A-2020-16688",
        "corrections": [],
        "extra": ["BOE-A-2021-12840"],  # nombramiento posterior (estimación de recurso) del NOPS 263
        "aprobados_boe": "BOE-A-2020-6135",
    },
}


def clean(text: str) -> str | None:
    t = " ".join(text.split()).strip().rstrip(".").strip()
    return t or None


def column_index(header: list[str]) -> dict[str, int]:
    idx = {}
    for i, h in enumerate(header):
        k = h.lower()
        if k.startswith("nops"):
            idx["order"] = i
        elif k.startswith("ministerio"):
            idx["organism"] = i
        elif k.startswith("centro directivo"):
            idx["unit"] = i
        elif k.startswith("provincia"):
            idx["province"] = i
        elif k.startswith("localidad"):
            idx["locality"] = i
    missing = {"order", "organism", "unit", "province", "locality"} - set(idx)
    if missing:
        raise ValueError(f"cabecera inesperada, faltan {missing}: {header}")
    return idx


def parse_main_table(boe_id: str) -> list[dict]:
    tables = boe_tables(RAW_DIR / "boe" / f"{boe_id}.xml")
    table = next(t for t in tables if t and t[0] and t[0][0].strip().upper().startswith("NOPS"))
    idx = column_index(table[0])
    rows = []
    for cells in table[1:]:
        if len(cells) != len(table[0]) or not cells[idx["order"]].strip().isdigit():
            continue  # pie de tabla (índice de abreviaturas)
        rows.append({k: cells[i] for k, i in idx.items()})
    return rows


def parse_extra(boe_id: str) -> list[dict]:
    """Nombramientos sueltos posteriores (tablas partidas en dos: datos + destino)."""
    tables = boe_tables(RAW_DIR / "boe" / f"{boe_id}.xml")
    if len(tables) < 2:
        raise ValueError(f"{boe_id}: formato inesperado")
    head, data = tables[0], tables[1]
    h1 = [h.lower() for h in head[0]]
    h2 = [h.lower() for h in data[0]]
    r1, r2 = head[1], data[1]
    # el NOPS figura en el texto ("con el número de orden de proceso selectivo N")
    import re

    from common import boe_paragraphs

    text = " ".join(boe_paragraphs(RAW_DIR / "boe" / f"{boe_id}.xml"))
    m = re.search(r"número de orden de proceso selectivo (\d+)", text)
    if not m:
        raise ValueError(f"{boe_id}: no se encuentra el NOPS")
    return [
        {
            "order": m.group(1),
            "organism": r1[h1.index("ministerio")],
            "unit": r1[[i for i, h in enumerate(h1) if h.startswith("centro directivo")][0]],
            "province": r2[h2.index("provincia")],
            "locality": r2[h2.index("localidad")],
        }
    ]


def build(conv: str) -> dict:
    cfg = NOMBRAMIENTOS[conv]
    raw = parse_main_table(cfg["boe"])
    extra = [r for b in cfg["extra"] for r in parse_extra(b)]
    notes_extra: set[str] = set()
    assignments = []
    for r in raw + extra:
        province = normalize_province(r["province"].rstrip("."))
        muni, note = find_municipality(province, r["locality"])
        if note:
            notes_extra.add(note)
        assignments.append(
            {
                "order": int(r["order"]),
                "organism": clean(r["organism"]),
                "unit": clean(r["unit"]),
                "province": muni.province,
                "locality": muni.name,
            }
        )
    assignments.sort(key=lambda a: a["order"])
    orders = [a["order"] for a in assignments]
    dups = [k for k, v in collections.Counter(orders).items() if v > 1]
    if dups:
        raise ValueError(f"{conv}: NOPS duplicados {dups[:10]}")
    max_order = max(orders)
    missing = sorted(set(range(1, max_order + 1)) - set(orders))
    meta = boe_metadata(RAW_DIR / "boe" / f"{cfg['boe']}.xml")
    madrid = sum(1 for a in assignments if a["locality"] == "Madrid")
    notes = [
        f"{len(assignments)} nombramientos con destino; NOPS máximo {max_order} (relación de aprobados: "
        f"{cfg['aprobados_boe']}). Faltan {len(missing)} números de orden (personas que renunciaron o no "
        f"fueron nombradas): {missing}.",
        "Anonimizado: solo NOPS, ministerio, centro directivo, provincia y localidad (municipio INE). "
        "Los textos de ministerio y centro directivo se conservan tal como figuran en el BOE (abreviados).",
        f"Madrid capital: {madrid} destinos ({madrid / len(assignments):.1%}).",
        "Algunas personas del cupo de discapacidad pudieron elegir destino alterando el orden de prelación "
        "(art. 9 del RD 2271/2004); conservan su NOPS.",
    ]
    if cfg["corrections"]:
        notes.append(
            "Correcciones posteriores consultadas: " + ", ".join(cfg["corrections"])
            + " (solo afectan a apellidos; sin efecto en estos datos)."
        )
    if cfg["extra"]:
        notes.append(
            "Incluye nombramientos posteriores publicados en " + ", ".join(cfg["extra"])
            + " (estimación de recurso; destino adjudicado después de la elección general)."
        )
    notes.extend(n.rstrip(".") + "." for n in sorted(notes_extra))
    return {
        "schema_version": 1,
        "convocatoria": conv,
        "source": {
            "title": meta["title"],
            "url": meta["url_pdf"] or f"https://www.boe.es/diario_boe/txt.php?id={cfg['boe']}",
            "boe_id": cfg["boe"],
        },
        "anonymized": True,
        "total": len(assignments),
        "notes": " ".join(notes),
        "assignments": assignments,
    }


def main(argv: list[str] | None = None) -> int:
    convs = (argv if argv is not None else sys.argv[1:]) or list(NOMBRAMIENTOS)
    for conv in convs:
        data = build(conv)
        out = DESTINOS_DIR / f"{conv}.json"
        write_json(out, data)
        by_loc = collections.Counter(a["locality"] for a in data["assignments"])
        print(f"{conv}: {data['total']} destinos → {rel(out)} · top: {by_loc.most_common(6)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
