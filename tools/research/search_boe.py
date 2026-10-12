# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (C) 2026 Eric Valls Gramunt
"""Busca en el BOE resoluciones del Cuerpo de Técnicos Auxiliares de Informática (AGE).

Uso (desde ``tools/``)::

    uv run python research/search_boe.py                       # año en curso
    uv run python research/search_boe.py --desde 2026-01-01 --hasta 2026-12-31
    uv run python research/search_boe.py --texto "oferta de empleo público" --desde 2026-01-01

Sirve para localizar las resoluciones que alimentan ``data/meta``. Por ejemplo, la relación de
aprobados y el nombramiento con destinos de la convocatoria 2025, cuando se publiquen, se añaden a
``sources.py`` y ``extract_destinos.py``. Usa el buscador público del BOE
(https://www.boe.es/buscar/boe.php) con búsqueda en títulos e imprime identificador, fecha y
título. El HTML de resultados se guarda en ``data/raw/research/boe/search/`` (no versionado).
"""

from __future__ import annotations

import argparse
import re
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import httpx  # noqa: E402
from bs4 import BeautifulSoup  # noqa: E402
from common import RAW_DIR, USER_AGENT  # noqa: E402

DEFAULT_TEXT = "Cuerpo de Técnicos Auxiliares de Informática de la Administración del Estado"


def search(text: str, desde: str, hasta: str) -> list[dict]:
    params = {
        "campo[0]": "ORIS", "dato[0][1]": "1", "dato[0][2]": "2", "dato[0][3]": "3", "dato[0][4]": "4",
        "dato[0][5]": "5", "dato[0][T]": "T", "operador[0]": "and",
        "campo[1]": "TITULOS", "dato[1]": text, "operador[1]": "and",
        "campo[2]": "DEM", "dato[2]": "", "operador[2]": "and",
        "campo[3]": "DOC", "dato[3]": "", "operador[3]": "and",
        "campo[4]": "NBOS", "dato[4]": "", "operador[4]": "and",
        "campo[5]": "NOF", "dato[5]": "", "operador[6]": "and",
        "campo[6]": "FPU", "dato[6][0]": desde, "dato[6][1]": hasta,
        "page_hits": "200", "sort_field[0]": "FPU", "sort_order[0]": "desc",
        "sort_field[1]": "ORI", "sort_order[1]": "asc", "sort_field[2]": "REF", "sort_order[2]": "asc",
        "accion": "Buscar",
    }
    with httpx.Client(timeout=60, follow_redirects=True, headers={"User-Agent": USER_AGENT}) as client:
        resp = client.get("https://www.boe.es/buscar/boe.php", params=params)
        resp.raise_for_status()
    out_dir = RAW_DIR / "boe" / "search"
    out_dir.mkdir(parents=True, exist_ok=True)
    safe = re.sub(r"[^a-z0-9]+", "-", text.lower())[:40].strip("-")
    (out_dir / f"{safe}_{desde}_{hasta}.html").write_text(resp.text, encoding="utf-8")
    soup = BeautifulSoup(resp.text, "lxml")
    results = []
    for li in soup.select("li.resultado-busqueda"):
        ids = re.findall(r"BOE-A-\d{4}-\d+", str(li))
        txt = " ".join(li.get_text(" ").split())
        m = re.search(r"BOE \d+ de (\d{2}/\d{2}/\d{4})", txt)
        title = re.sub(r"\s*Ir al documento.*$", "", txt)
        sections = r"Autoridades y personal|Otras disposiciones|Disposiciones generales"
        title = re.sub(rf"^.*?(?:{sections})\s*", "", title)
        results.append({"boe_id": ids[0] if ids else None, "date": m.group(1) if m else None, "title": title})
    return results


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--texto", default=DEFAULT_TEXT)
    ap.add_argument("--desde", default=f"{date.today().year}-01-01")
    ap.add_argument("--hasta", default=date.today().isoformat())
    args = ap.parse_args(argv)
    res = search(args.texto, args.desde, args.hasta)
    print(f"{len(res)} resultados para «{args.texto}» ({args.desde} – {args.hasta}):")
    for r in res:
        if "universidad" in r["title"].lower():
            continue  # escalas TAI de universidades: no son el cuerpo de la AGE
        print(f"  {r['boe_id']} · {r['date']} · {r['title'][:220]}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
