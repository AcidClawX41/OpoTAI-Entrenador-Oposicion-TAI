# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (C) 2026 Eric Valls Gramunt
"""Vuelca a texto plano los documentos descargados (PDF del INAP y XML del BOE).

Uso (desde ``tools/``)::

    uv run python research/dump_texts.py            # todos los del manifiesto
    uv run python research/dump_texts.py --conv li-2019

Escribe ``data/raw/research/text/<ruta>.txt`` (no versionado) para poder revisar y citar las
cifras que se transcriben en ``build_meta.py``. Los documentos marcados como ``personal`` se
vuelcan igualmente (solo en ``data/raw``) porque contienen las cifras agregadas que se necesitan;
su contenido nominal nunca se copia a ficheros versionados.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from common import RAW_DIR, boe_text, pdf_text, rel  # noqa: E402

from sources import SOURCES  # noqa: E402


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--conv")
    args = ap.parse_args(argv)
    n = 0
    for src in SOURCES:
        if args.conv and src["conv"] != args.conv:
            continue
        path = RAW_DIR / src["path"]
        if not path.exists():
            print(f"falta {rel(path)} (ejecuta fetch_sources.py)", file=sys.stderr)
            continue
        if src["kind"] == "boe":
            text = boe_text(path)
        elif src["kind"] == "inap":
            text = pdf_text(path)
        else:
            continue
        out = RAW_DIR / "text" / (src["path"] + ".txt")
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(text, encoding="utf-8")
        n += 1
    print(f"{n} textos en {rel(RAW_DIR / 'text')}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
