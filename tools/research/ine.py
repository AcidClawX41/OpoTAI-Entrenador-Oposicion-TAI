# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (C) 2026 Eric Valls Gramunt
"""Padrón municipal del INE (cifras oficiales de población) y normalización de topónimos.

Fuente: INE, «Cifras oficiales de población resultantes de la Revisión del Padrón municipal»,
fichero ``pobmun<AA>.xlsx`` dentro de https://www.ine.es/pob_xls/pobmun.zip (lo descarga
``fetch_sources.py``). El año más reciente disponible a 2026-10-11 es 1 de enero de 2025
(``pobmun25.xlsx``, publicado en diciembre de 2025).

Nombre canónico de un municipio = nombre oficial del INE con el artículo antepuesto
("Palmas de Gran Canaria, Las" → "Las Palmas de Gran Canaria"; "Coruña, A" → "A Coruña").
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from common import RAW_DIR, norm_key, normalize_province, unpostpone_article

POP_YEAR = 2025
POBMUN = RAW_DIR / "ine" / "pobmun" / f"pobmun{POP_YEAR % 100:02d}.xlsx"
INE_URL = (
    "https://www.ine.es/dyngs/INEbase/es/operacion.htm?c=Estadistica_C&cid=1254736177011"
    "&menu=resultados&idp=1254734710990"
)
INE_FILE_URL = "https://www.ine.es/pob_xls/pobmun.zip"

# Capital de cada provincia (nombre canónico INE) + ciudades autónomas.
CAPITALS = {
    "Álava": "Vitoria-Gasteiz", "Albacete": "Albacete", "Alicante": "Alacant/Alicante", "Almería": "Almería",
    "Asturias": "Oviedo", "Ávila": "Ávila", "Badajoz": "Badajoz", "Illes Balears": "Palma",
    "Barcelona": "Barcelona", "Burgos": "Burgos", "Cáceres": "Cáceres", "Cádiz": "Cádiz",
    "Cantabria": "Santander", "Castellón": "Castelló de la Plana/Castellón de la Plana",
    "Ciudad Real": "Ciudad Real",
    "Córdoba": "Córdoba", "A Coruña": "A Coruña", "Cuenca": "Cuenca", "Girona": "Girona",
    "Granada": "Granada", "Guadalajara": "Guadalajara", "Gipuzkoa": "Donostia/San Sebastián",
    "Huelva": "Huelva", "Huesca": "Huesca", "Jaén": "Jaén", "León": "León", "Lleida": "Lleida",
    "Lugo": "Lugo", "Madrid": "Madrid", "Málaga": "Málaga", "Murcia": "Murcia", "Navarra": "Pamplona/Iruña",
    "Ourense": "Ourense", "Palencia": "Palencia", "Las Palmas": "Las Palmas de Gran Canaria",
    "Pontevedra": "Pontevedra", "La Rioja": "Logroño", "Salamanca": "Salamanca",
    "Santa Cruz de Tenerife": "Santa Cruz de Tenerife", "Segovia": "Segovia", "Sevilla": "Sevilla",
    "Soria": "Soria", "Tarragona": "Tarragona", "Teruel": "Teruel", "Toledo": "Toledo",
    "Valencia": "València", "Valladolid": "Valladolid", "Bizkaia": "Bilbao", "Zamora": "Zamora",
    "Zaragoza": "Zaragoza",
}
AUTONOMOUS_CITIES = {"Ceuta": "Ceuta", "Melilla": "Melilla"}

# Topónimos del BOE que no son municipios o no casan automáticamente con el INE:
# (provincia, clave normalizada del BOE) -> (nombre canónico INE, nota)
LOCALITY_ALIASES: dict[tuple[str, str], tuple[str, str | None]] = {
    ("Illes Balears", "palma de mallorca"): ("Palma", None),
    ("Santa Cruz de Tenerife", "la laguna"): ("San Cristóbal de La Laguna", None),
    ("Santa Cruz de Tenerife", "laguna la"): ("San Cristóbal de La Laguna", None),
    # truncado en el BOE ("CASTELLON DE LA PLANA/CASTELLO DE LA PLA")
    ("Castellón", "castellon de la pla"): ("Castelló de la Plana/Castellón de la Plana", None),
    ("Illes Balears", "mahon"): ("Maó", None),
    ("Madrid", "cantoblanco"): (
        "Madrid",
        "«Cantoblanco» (campus/barrio) se asigna al municipio de Madrid",
    ),
    ("Castellón", "torre de la sal"): (
        "Cabanes",
        "«Torre de la Sal» (núcleo de Ribera de Cabanes, sede del IATS-CSIC) se asigna al municipio "
        "de Cabanes",
    ),
}


@dataclass(frozen=True)
class Municipality:
    province: str
    name: str  # canónico
    name_ine: str
    population: int
    code: str  # CPRO+CMUN


def _full_variants(name: str) -> set[str]:
    return {v for v in (norm_key(name), norm_key(unpostpone_article(name))) if v}


def _part_variants(name: str) -> set[str]:
    out = set()
    for part in re.split(r"\s*/\s*|\s+-\s+|-", name):
        if part.strip():
            out.add(norm_key(part))
            out.add(norm_key(unpostpone_article(part.strip())))
    return {v for v in out if v}


@lru_cache(maxsize=1)
def load_municipalities(path: Path = POBMUN) -> list[Municipality]:
    import openpyxl

    if not path.exists():
        raise SystemExit(f"falta {path}; ejecuta research/fetch_sources.py")
    wb = openpyxl.load_workbook(path, read_only=True)
    ws = wb.worksheets[0]
    out = []
    header_seen = False
    for row in ws.iter_rows(values_only=True):
        if not header_seen:
            header_seen = row[0] == "CPRO"
            continue
        if not row or row[0] is None or row[4] is None:
            continue
        cpro, prov, cmun, name, pop = row[0], row[1], row[2], row[3], row[4]
        out.append(
            Municipality(
                province=normalize_province(str(prov)),
                name=unpostpone_article(str(name).strip()),
                name_ine=str(name).strip(),
                population=int(pop),
                code=f"{cpro}{cmun}",
            )
        )
    wb.close()
    return out


@lru_cache(maxsize=2)
def _index(parts: bool) -> dict[str, dict[str, list[Municipality]]]:
    """Índice provincia → clave → municipios. ``parts`` indexa también cada parte de los nombres
    compuestos o bilingües ("Alicante/Alacant", "Maó-Mahón"); se consulta solo si no hay
    coincidencia con el nombre completo (evita confundir "Málaga" con "Vélez-Málaga")."""
    idx: dict[str, dict[str, list[Municipality]]] = {}
    for m in load_municipalities():
        prov = idx.setdefault(m.province, {})
        keys = _full_variants(m.name_ine) | _full_variants(m.name)
        if parts:
            keys |= _part_variants(m.name_ine) | _part_variants(m.name)
        for v in keys:
            prov.setdefault(v, []).append(m)
    return idx


def find_municipality(province: str, raw_locality: str) -> tuple[Municipality, str | None]:
    """Devuelve el municipio INE para un topónimo del BOE y, si procede, una nota de asignación."""
    loc = raw_locality.strip().rstrip(".").strip()
    candidates = [norm_key(loc), norm_key(unpostpone_article(loc))]
    candidates += [norm_key(p) for p in re.split(r"\s*/\s*|\s+-\s*|\s*-\s+", loc) if p.strip()]
    for key in candidates:
        if (province, key) in LOCALITY_ALIASES:
            target, note = LOCALITY_ALIASES[(province, key)]
            return by_name(province, target), note
    for parts in (False, True):
        idx = _index(parts).get(province, {})
        for key in candidates:
            found = idx.get(key)
            if found:
                if len({m.code for m in found}) > 1:
                    raise ValueError(
                        f"topónimo ambiguo en {province}: {raw_locality!r} → {[m.name for m in found]}"
                    )
                return found[0], None
    raise KeyError(f"no se encuentra el municipio {raw_locality!r} en la provincia {province}")


def by_name(province: str, canonical: str) -> Municipality:
    for m in load_municipalities():
        if m.province == province and m.name == canonical:
            return m
    raise KeyError(f"{canonical!r} no está en {province}")


def capitals() -> list[tuple[Municipality, bool]]:
    """Capitales de provincia (True) y ciudades autónomas (False)."""
    out = [(by_name(p, c), True) for p, c in CAPITALS.items()]
    out += [(by_name(p, c), False) for p, c in AUTONOMOUS_CITIES.items()]
    return out
