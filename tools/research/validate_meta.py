# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (C) 2026 Eric Valls Gramunt
"""Valida ``data/meta/**`` contra ``data/schema/*.schema.json`` y comprueba su coherencia.

Uso (desde ``tools/``)::

    uv run python research/validate_meta.py

Comprueba, además del JSON Schema: referencias cruzadas (esquemas ↔ convocatorias ↔ destinos ↔
localidades), sumas de plazas, orden y rango de ``grades_of_aptos``, unicidad de números de orden,
tiers coherentes con la población y ausencia de patrones de datos personales (DNI/NIF).
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import jsonschema  # noqa: E402
from common import META_DIR, SCHEMA_DIR, rel  # noqa: E402

errors: list[str] = []


def err(msg: str) -> None:
    errors.append(msg)


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def validate(path: Path, schema_name: str):
    schema = load(SCHEMA_DIR / schema_name)
    data = load(path)
    validator = jsonschema.Draft202012Validator(schema)
    for e in sorted(validator.iter_errors(data), key=lambda e: list(e.path)):
        err(f"{rel(path)}: {'/'.join(map(str, e.path))}: {e.message[:200]}")
    return data


PERSONAL_RE = re.compile(
    r"\*{2,4}\d{3,4}\*{1,3}"  # DNI/NIF enmascarado del BOE (***1234**)
    r"|\b\d{8}[A-HJ-NP-TV-Z]\b"  # DNI completo
    r"|\b[XYZ]\d{7}[A-Z]\b"  # NIE
    r"|Apellidos y nombre"
)


def main() -> int:
    scoring = validate(META_DIR / "scoring.json", "scoring.schema.json")
    convs = validate(META_DIR / "convocatorias.json", "convocatorias.schema.json")
    temario = validate(META_DIR / "temario.json", "temario.schema.json")
    locs = validate(META_DIR / "localidades.json", "localidades.schema.json")
    destinos = {
        p.stem: validate(p, "destinos.schema.json") for p in sorted((META_DIR / "destinos").glob("*.json"))
    }

    # --- scoring
    ids = [s["id"] for s in scoring["schemes"]]
    if len(ids) != len(set(ids)):
        err("scoring: ids de esquema duplicados")
    if scoring["default_scheme"] not in ids:
        err("scoring: default_scheme inexistente")
    conv_ids = {c["id"] for c in convs["convocatorias"]}
    for s in scoring["schemes"]:
        if s.get("convocatoria") and s["convocatoria"] not in conv_ids:
            err(f"scoring/{s['id']}: convocatoria {s['convocatoria']} no está en convocatorias.json")
        parts = {p["part"] for p in s["parts"]}
        covered = [p for u in s["grading"]["units"] for p in u["parts"]]
        if sorted(covered) != sorted(parts):
            err(f"scoring/{s['id']}: las unidades no cubren exactamente las partes {sorted(parts)}")
        for p in s["parts"]:
            if p["kind"] == "case" and not p.get("cases_offered"):
                err(f"scoring/{s['id']}: la parte {p['part']} es un supuesto sin cases_offered")
        for u in s["grading"]["units"]:
            n = sum(p["value"] * p["questions"] for p in s["parts"] if p["part"] in u["parts"])
            c = u.get("cutoff_direct")
            if c is not None and not (u["min_direct_ratio"] * n - 1e-6 <= c <= n):
                err(f"scoring/{s['id']}: corte {c} fuera de [{u['min_direct_ratio'] * n}, {n}]")

    # --- convocatorias
    if convs["target_convocatoria"] not in conv_ids:
        err("convocatorias: target_convocatoria inexistente")
    for c in convs["convocatorias"]:
        cid = c["id"]
        if c["scoring_scheme"] and c["scoring_scheme"] not in ids:
            err(f"convocatorias/{cid}: scoring_scheme {c['scoring_scheme']} inexistente")
        pl = c["plazas"]
        if None not in pl.values() and pl["general"] + pl["discapacidad"] != pl["total"]:
            err(f"convocatorias/{cid}: plazas general + discapacidad ≠ total")
        g = c["grades_of_aptos"]
        if g:
            v = g["values"]
            if g["count"] != len(v):
                err(f"convocatorias/{cid}: count {g['count']} ≠ {len(v)} valores")
            if any(b > a for a, b in zip(v, v[1:], strict=False)):
                err(f"convocatorias/{cid}: grades_of_aptos no está ordenado de mayor a menor")
            for pd in g.get("part_directs") or []:
                if len(pd["values"]) != len(v):
                    err(f"convocatorias/{cid}: part_directs de la parte {pd['part']} con {len(pd['values'])} ≠ {len(v)}")
            if c["aprobados"] is not None and c["aprobados"] != len(v):
                err(f"convocatorias/{cid}: aprobados {c['aprobados']} ≠ {len(v)} notas")
        ds = c["destinations_dataset"]
        if ds:
            stem = Path(ds).stem
            if stem not in destinos:
                err(f"convocatorias/{cid}: no existe {ds}")
            elif destinos[stem]["convocatoria"] != cid:
                err(f"convocatorias/{cid}: {ds} declara otra convocatoria")
        if c["status"] == "finalizada" and c["aprobados"] is None:
            err(f"convocatorias/{cid}: finalizada sin aprobados")

    # --- temario
    tids = [t["id"] for b in temario["blocks"] for t in b["topics"]]
    if len(tids) != len(set(tids)):
        err("temario: ids de tema duplicados")
    for b in temario["blocks"]:
        for t in b["topics"]:
            if not t["id"].startswith(b["id"] + "."):
                err(f"temario: {t['id']} no pertenece al bloque {b['id']}")
            if not 3 <= len(t.get("keywords", [])) <= 8:
                err(f"temario: {t['id']} debe tener 3–8 keywords")

    # --- localidades
    keys = [(x["province"], x["name"]) for x in locs["localities"]]
    if len(keys) != len(set(keys)):
        err("localidades: duplicados (provincia, nombre)")
    for x in locs["localities"]:
        pop, cap = x["population"], x["is_provincial_capital"]
        if pop is None:
            continue
        expected = "gran_ciudad" if pop >= 300_000 else ("ciudad_media" if cap or pop >= 50_000 else "pueblo")
        if x["tier"] != expected:
            err(f"localidades: {x['name']} tier {x['tier']} ≠ {expected}")
    if sum(1 for x in locs["localities"] if x["is_provincial_capital"]) != 50:
        err("localidades: debe haber 50 capitales de provincia")
    for city in ("Ceuta", "Melilla"):
        if (city, city) not in set(keys):
            err(f"localidades: falta {city}")

    # --- destinos
    key_set = set(keys)
    for stem, d in destinos.items():
        a = d["assignments"]
        if d["total"] != len(a):
            err(f"destinos/{stem}: total {d['total']} ≠ {len(a)} filas")
        orders = [x["order"] for x in a]
        if len(orders) != len(set(orders)):
            err(f"destinos/{stem}: números de orden duplicados")
        if orders != sorted(orders):
            err(f"destinos/{stem}: no está ordenado por número de orden")
        missing = {(x["province"], x["locality"]) for x in a} - key_set
        if missing:
            err(f"destinos/{stem}: localidades sin entrada en localidades.json: {sorted(missing)[:5]}")
        conv = next((c for c in convs["convocatorias"] if c["id"] == d["convocatoria"]), None)
        if conv and conv["aprobados"] is not None and max(orders) > conv["aprobados"]:
            err(f"destinos/{stem}: NOPS máximo {max(orders)} > aprobados {conv['aprobados']}")

    # --- privacidad
    for path in sorted(META_DIR.rglob("*.json")):
        text = path.read_text(encoding="utf-8")
        m = PERSONAL_RE.search(text)
        if m:
            err(f"{rel(path)}: posible dato personal: {m.group(0)!r}")

    n_files = 4 + len(destinos)
    if errors:
        print(f"{len(errors)} errores en {n_files} ficheros:")
        for e in errors:
            print("  -", e)
        return 1
    totals = ", ".join(f"{k}={v['total']}" for k, v in destinos.items())
    print(f"OK: {n_files} ficheros de data/meta válidos y coherentes "
          f"({len(scoring['schemes'])} esquemas, {len(convs['convocatorias'])} convocatorias, "
          f"{len(tids)} temas, {len(locs['localities'])} localidades, destinos {totals})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
