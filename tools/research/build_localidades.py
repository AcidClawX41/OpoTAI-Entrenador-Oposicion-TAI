# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (C) 2026 Eric Valls Gramunt
"""Genera ``data/meta/localidades.json``: localidades de los datasets de destinos + capitales.

Uso (desde ``tools/``, después de ``extract_destinos.py``)::

    uv run python research/build_localidades.py

Incluye todas las localidades que aparecen en ``data/meta/destinos/*.json``, las 50 capitales de
provincia y las ciudades autónomas de Ceuta y Melilla, con la población del padrón del INE
(Revisión del Padrón municipal a 1 de enero de 2025) y su tier:

- ``gran_ciudad``: municipio con ≥ 300.000 habitantes.
- ``ciudad_media``: capital de provincia o municipio con ≥ 50.000 habitantes.
- ``pueblo``: resto.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from common import DESTINOS_DIR, META_DIR, read_json, rel, write_json  # noqa: E402
from ine import INE_FILE_URL, POP_YEAR, by_name, capitals  # noqa: E402

GRAN_CIUDAD = 300_000
CIUDAD_MEDIA = 50_000

TIERS = [
    {"id": "gran_ciudad", "order": 1, "label": "Grandes ciudades",
     "description": "Municipios con 300.000 habitantes o más (padrón INE a 1/1/2025)."},
    {"id": "ciudad_media", "order": 2, "label": "Capitales y ciudades medias",
     "description": "Capitales de provincia y municipios con 50.000 habitantes o más "
                    "(incluye Ceuta y Melilla)."},
    {"id": "pueblo", "order": 3, "label": "Pueblos y zonas menos pobladas",
     "description": "Resto de municipios (menos de 50.000 habitantes y no capitales de provincia)."},
]


def tier_for(population: int, is_capital: bool) -> str:
    if population >= GRAN_CIUDAD:
        return "gran_ciudad"
    if is_capital or population >= CIUDAD_MEDIA:
        return "ciudad_media"
    return "pueblo"


def main() -> int:
    caps = {(m.province, m.name): is_cap for m, is_cap in capitals()}
    seen: dict[tuple[str, str], dict] = {}
    for m, is_cap in capitals():
        seen[(m.province, m.name)] = {"muni": m, "capital": is_cap}
    for path in sorted(DESTINOS_DIR.glob("*.json")):
        for a in read_json(path)["assignments"]:
            key = (a["province"], a["locality"])
            if key not in seen:
                seen[key] = {"muni": by_name(*key), "capital": caps.get(key, False)}
    localities = []
    for (province, name), info in seen.items():
        m = info["muni"]
        localities.append(
            {
                "name": name,
                "province": province,
                "population": m.population,
                "is_provincial_capital": bool(info["capital"]),
                "tier": tier_for(m.population, bool(info["capital"])),
            }
        )
    localities.sort(key=lambda x: (-x["population"], x["name"]))
    data = {
        "schema_version": 1,
        "source": {
            "title": f"INE · Cifras oficiales de población de los municipios españoles: Revisión del Padrón "
                     f"municipal a 1 de enero de {POP_YEAR} (fichero pobmun{POP_YEAR % 100:02d}.xlsx)",
            "url": INE_FILE_URL,
        },
        "population_year": POP_YEAR,
        "tiers": TIERS,
        "localities": localities,
    }
    out = META_DIR / "localidades.json"
    write_json(out, data)
    counts = {t["id"]: sum(1 for x in localities if x["tier"] == t["id"]) for t in TIERS}
    print(f"{len(localities)} localidades → {rel(out)} · {counts}")
    print("grandes ciudades:", [x["name"] for x in localities if x["tier"] == "gran_ciudad"])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
