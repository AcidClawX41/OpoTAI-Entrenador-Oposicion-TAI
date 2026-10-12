# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (C) 2026 Eric Valls Gramunt
"""Utilidades compartidas por los scripts de investigación (``tools/research``).

Los scripts se ejecutan desde ``tools/``::

    cd tools
    uv run python research/<script>.py

Todo lo descargado se guarda en ``data/raw/research/`` (no versionado). Los documentos
descargados son datos no confiables: solo se leen (XML del BOE con ``lxml`` sin resolver
entidades ni acceder a la red, PDF con PyMuPDF) y nunca se ejecutan.
"""

from __future__ import annotations

import hashlib
import json
import re
import unicodedata
from pathlib import Path

RESEARCH_DIR = Path(__file__).resolve().parent
TOOLS_DIR = RESEARCH_DIR.parent
REPO_ROOT = TOOLS_DIR.parent
DATA_DIR = REPO_ROOT / "data"
SCHEMA_DIR = DATA_DIR / "schema"
META_DIR = DATA_DIR / "meta"
DESTINOS_DIR = META_DIR / "destinos"
RAW_DIR = DATA_DIR / "raw" / "research"
DERIVED_DIR = RAW_DIR / "derived"

USER_AGENT = "OpoTAI-research/0.1 (public official sources: BOE, INAP, INE)"
RETRIEVED = "2026-10-11"


# --------------------------------------------------------------------------- utilidades varias


def rel(path: Path) -> str:
    try:
        return str(Path(path).resolve().relative_to(REPO_ROOT))
    except ValueError:
        return str(path)


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 16), b""):
            h.update(chunk)
    return h.hexdigest()


def write_json(path: Path, data: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def read_json(path: Path) -> object:
    return json.loads(path.read_text(encoding="utf-8"))


def es_number(text: str) -> float:
    """Convierte un número con formato español ("1.234,56", "69,33", "64") en float."""
    t = text.strip().replace(" ", "").replace(" ", "")
    if "," in t:
        t = t.replace(".", "").replace(",", ".")
    return float(t)


def strip_accents(text: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", text) if unicodedata.category(c) != "Mn")


def norm_key(text: str) -> str:
    """Clave de comparación: sin tildes, minúsculas, solo letras/números separados por un espacio."""
    t = strip_accents(text).lower()
    t = re.sub(r"[^a-z0-9ñ]+", " ", t)
    return " ".join(t.split())


# --------------------------------------------------------------------------- BOE (XML)


def _parse_xml(path: Path):
    from lxml import etree

    parser = etree.XMLParser(resolve_entities=False, no_network=True, huge_tree=True)
    return etree.parse(str(path), parser).getroot()


def boe_metadata(path: Path) -> dict:
    root = _parse_xml(path)
    meta = root.find("metadatos")
    get = lambda tag: (meta.findtext(tag) or "").strip() if meta is not None else ""  # noqa: E731
    return {
        "id": get("identificador"),
        "title": get("titulo"),
        "date_published": get("fecha_publicacion"),
        "date_disposition": get("fecha_disposicion"),
        "url_pdf": get("url_pdf"),
    }


def _cell_text(el) -> str:
    return " ".join("".join(el.itertext()).split())


def boe_paragraphs(path: Path) -> list[str]:
    """Párrafos de texto (``<p>``) del cuerpo del documento, en orden."""
    texto = _parse_xml(path).find("texto")
    return [_cell_text(p) for p in texto.iter("p")]


def boe_tables(path: Path) -> list[list[list[str]]]:
    """Tablas del cuerpo del documento como listas de filas de celdas de texto."""
    texto = _parse_xml(path).find("texto")
    tables = []
    for tb in texto.iter("table"):
        rows = []
        for tr in tb.iter("tr"):
            rows.append([_cell_text(c) for c in tr if c.tag in ("td", "th")])
        tables.append(rows)
    return tables


def boe_text(path: Path) -> str:
    """Texto plano del cuerpo: párrafos y filas de tabla (celdas separadas por " | ")."""
    texto = _parse_xml(path).find("texto")
    out = []
    for el in texto.iter():
        if el.tag == "p":
            out.append(_cell_text(el))
        elif el.tag == "tr":
            out.append(" | ".join(_cell_text(c) for c in el if c.tag in ("td", "th")))
    return "\n".join(out)


# --------------------------------------------------------------------------- PDF


def pdf_text(path: Path) -> str:
    import pymupdf

    with pymupdf.open(str(path)) as doc:
        return "\n".join(page.get_text() for page in doc)


# --------------------------------------------------------------------------- nombres geográficos

# Nombre de provincia normalizado (forma castellana usada en el proyecto) a partir de la clave
# ``norm_key`` de las variantes que aparecen en BOE e INE.
PROVINCES = [
    "Álava", "Albacete", "Alicante", "Almería", "Asturias", "Ávila", "Badajoz", "Illes Balears",
    "Barcelona", "Burgos", "Cáceres", "Cádiz", "Cantabria", "Castellón", "Ciudad Real", "Córdoba",
    "A Coruña", "Cuenca", "Girona", "Granada", "Guadalajara", "Gipuzkoa", "Huelva", "Huesca",
    "Jaén", "León", "Lleida", "Lugo", "Madrid", "Málaga", "Murcia", "Navarra", "Ourense",
    "Palencia", "Las Palmas", "Pontevedra", "La Rioja", "Salamanca", "Santa Cruz de Tenerife",
    "Segovia", "Sevilla", "Soria", "Tarragona", "Teruel", "Toledo", "Valencia", "Valladolid",
    "Bizkaia", "Zamora", "Zaragoza", "Ceuta", "Melilla",
]

_PROVINCE_ALIASES = {
    "araba alava": "Álava", "alava": "Álava", "araba": "Álava", "alava araba": "Álava",
    "alicante alacant": "Alicante", "alacant": "Alicante",
    "balears illes": "Illes Balears", "illes balears": "Illes Balears", "baleares": "Illes Balears",
    "islas baleares": "Illes Balears", "baleares illes": "Illes Balears",
    "castellon castello": "Castellón", "castello": "Castellón", "castellon de la plana": "Castellón",
    "coruna a": "A Coruña", "a coruna": "A Coruña", "la coruna": "A Coruña", "coruna la": "A Coruña",
    "coruna": "A Coruña",
    "gerona": "Girona", "lerida": "Lleida", "orense": "Ourense",
    "guipuzcoa": "Gipuzkoa", "gipuzkoa guipuzcoa": "Gipuzkoa",
    "vizcaya": "Bizkaia", "bizkaia vizcaya": "Bizkaia",
    "palmas las": "Las Palmas", "las palmas": "Las Palmas", "palmas": "Las Palmas",
    "rioja la": "La Rioja", "la rioja": "La Rioja", "rioja": "La Rioja",
    "valencia valencia": "Valencia", "valencia": "Valencia",
    "santa cruz de tenerife": "Santa Cruz de Tenerife", "s c tenerife": "Santa Cruz de Tenerife",
    "sta cruz de tenerife": "Santa Cruz de Tenerife", "santa cruz tenerife": "Santa Cruz de Tenerife",
    "asturias asturies": "Asturias", "asturies": "Asturias",
    "navarra nafarroa": "Navarra", "nafarroa": "Navarra",
    "ceuta ciudad autonoma": "Ceuta", "melilla ciudad autonoma": "Melilla",
}


def normalize_province(raw: str) -> str:
    key = norm_key(raw)
    if key in _PROVINCE_ALIASES:
        return _PROVINCE_ALIASES[key]
    for p in PROVINCES:
        if norm_key(p) == key:
            return p
    raise KeyError(f"provincia desconocida: {raw!r}")


# Artículos pospuestos del INE/BOE: "Palmas de Gran Canaria (Las)" -> "Las Palmas de Gran Canaria".
_ARTICLE_RE = re.compile(r"^(?P<base>.+?)\s*\((?P<art>[^)]+)\)\s*$")
_ARTICLE_COMMA_RE = re.compile(r"^(?P<base>.+?),\s*(?P<art>el|la|los|las|l'|o|a|os|as|es|sa|ses|s')$", re.I)


def unpostpone_article(name: str) -> str:
    m = _ARTICLE_RE.match(name) or _ARTICLE_COMMA_RE.match(name)
    if not m:
        return name
    base, art = m.group("base").strip(), m.group("art").strip()
    if art.lower().endswith("'"):
        return f"{art}{base}"
    return f"{art} {base}"


def smart_title(text: str) -> str:
    """Capitaliza un topónimo en mayúsculas del BOE ("SAN SEBASTIAN DE LOS REYES")."""
    small = {"de", "del", "la", "las", "el", "los", "y", "i", "e", "d", "l", "o", "a", "en", "sa", "ses"}
    words = re.split(r"(\s+|-|/|')", text.lower())
    out = []
    first = True
    for w in words:
        if not w or w.isspace() or w in "-/'":
            out.append(w)
            continue
        out.append(w if (w in small and not first) else w[:1].upper() + w[1:])
        first = False
    return "".join(out)
