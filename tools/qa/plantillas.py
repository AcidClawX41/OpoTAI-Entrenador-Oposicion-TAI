# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (C) 2026 Eric Valls Gramunt
"""Contraste independiente de las respuestas con la plantilla oficial.

Lee las plantillas por posiciones (PyMuPDF, palabras con coordenadas), reconstruye las columnas
(«Primera parte»/«Única», «Preguntas de reserva», «Supuesto I/II» o «Bloque III/IV») y compara
letra a letra (y las anuladas) con ``data/banks/oficiales/<bank>.json``. Usa la plantilla
definitiva o, si aún no se ha publicado, la provisional; si el examen tuvo varios ejercicios
(p. ej. 2019), combina las plantillas de todos. Es un segundo parser, distinto del usado para
generar los bancos, para detectar desfases o errores de lectura.

Uso: ``cd tools && uv run python qa/plantillas.py [--md ../docs/calidad/plantillas.md]``
Autor: Eric Valls Gramunt.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BANKS = ROOT / "data" / "banks" / "oficiales"
RAW = ROOT / "data" / "raw"
MANIFEST = ROOT / "tools" / "sources" / "examenes.json"

NUM_RE = re.compile(r"^(\d{1,3})\.?$")
ENTRY_RE = re.compile(r"^(\d{1,3})\.?\s+([A-Da-d]|ANULADA|Anulada|anulada)\b")
HEADERS = [
    (re.compile(r"^(primera parte|[úu]nica)\b"), "p1"),
    (re.compile(r"\bsupuesto\s+(ii|2)\b"), "case2"),
    (re.compile(r"\bsupuesto\s+(i|1)\b"), "case1"),
    # 2015 (promoción interna): una sola plantilla con «Bloque III/IV» (1.ª parte, a elegir) y
    # «Supuesto Bloque III/IV» (2.ª parte); los supuestos llevan su propia etiqueta.
    (re.compile(r"\bsupuesto\s+bloque\s+(iv|4)\b"), "caseIV"),
    (re.compile(r"\bsupuesto\s+bloque\s+(iii|3)\b"), "caseIII"),
    (re.compile(r"\bbloque\s+(iv|4)\b"), "IV"),
    (re.compile(r"\bbloque\s+(iii|3)\b"), "III"),
    # 2016: la 1.ª parte común se publica como «Bloque I» (1–20) y «Bloque II» (21–50).
    (re.compile(r"\bbloque\s+(ii|i|2|1)\b"), "p1"),
]


def plantilla_paths(bank_id: str, model: str | None) -> tuple[list[Path], str] | None:
    """Plantillas definitivas del modelo del banco (todas sus partes); si no hay, provisionales."""
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    for kind in ("plantilla_definitiva", "plantilla_provisional"):
        docs = [d for d in manifest["documents"] if d["bank_id"] == bank_id and d["kind"] == kind]
        if model:
            docs = [d for d in docs if (d.get("model") or model) == model] or docs
        files = [RAW / bank_id / d["file"] for d in docs if (RAW / bank_id / d["file"]).is_file()]
        if files:
            return files, kind.split("_")[1]
    return None


def column_bounds(xs: list[int], gap: int = 60) -> list[tuple[int, int]]:
    """Agrupa las posiciones x (ordenadas) de los números «N.» en columnas separadas por huecos."""
    bounds: list[tuple[int, int]] = []
    for x in xs:
        if bounds and x - bounds[-1][1] <= gap:
            bounds[-1] = (bounds[-1][0], x)
        else:
            bounds.append((x, x))
    return bounds


def column_of(x: float, bounds: list[tuple[int, int]]) -> int:
    """Índice de la columna a la que pertenece una palabra que empieza en ``x``."""
    for i, (start, _end) in enumerate(bounds):
        nxt = bounds[i + 1][0] if i + 1 < len(bounds) else 10_000
        if start - 40 <= x < nxt - 40:
            return i
    return 0


def read_lines(pdf: Path) -> list[tuple[int, int, float, str]]:
    """Devuelve (página, columna, y, texto) agrupando palabras en líneas por columna."""
    import pymupdf  # type: ignore

    out = []
    with pymupdf.open(str(pdf)) as doc:
        for pno, page in enumerate(doc):
            words = page.get_text("words")  # x0, y0, x1, y1, word, block, line, wno
            bounds = column_bounds(sorted({round(w[0]) for w in words if NUM_RE.match(w[4])}))
            if not bounds:
                continue
            lines: dict[tuple[int, int], list] = {}
            for w in words:
                key = (column_of(w[0], bounds), round(w[1] / 3))
                lines.setdefault(key, []).append(w)
            for (col, _), ws in lines.items():
                ws.sort(key=lambda w: w[0])
                out.append((pno, col, min(w[1] for w in ws), " ".join(w[4] for w in ws)))
    out.sort(key=lambda t: (t[0], t[1], t[2]))
    return out


def parse_plantilla(pdf: Path) -> dict[str, dict[int, str]]:
    """{"p1": {1: "B", …}, "p1-r": {…}, "case1"/"III": {…}, "case1-r"/"III-r": {…}, …}"""
    sections: dict[str, dict[int, str]] = {}
    current = None
    for _p, _c, _y, text in read_lines(pdf):
        t = text.strip()
        low = t.lower()
        header = next((label for rx, label in HEADERS if rx.search(low)), None)
        if header:
            current = header
            continue
        if "reserva" in low and current:
            current = current.split("-")[0] + "-r"
            continue
        m = ENTRY_RE.match(t)
        if m and current:
            num, ans = int(m.group(1)), m.group(2)
            sections.setdefault(current, {})[num] = "X" if ans.lower() == "anulada" else ans.upper()
    return sections


def section_labels(bank: dict, keys: list[dict[str, dict[int, str]]]) -> dict[str, str]:
    """Etiqueta de la plantilla que corresponde a cada sección del banco."""
    labels: dict[str, str] = {}
    cases = [s for s in bank["sections"] if s["kind"] == "case"]
    has = lambda label: any(label in k for k in keys)  # noqa: E731
    for i, sec in enumerate(bank["sections"]):
        if sec["kind"] == "theory":
            # 1.ª parte con bloque a elegir (2016): la alternativa se publica como «Bloque III/IV».
            labels[sec["id"]] = sec["block"] if sec.get("block") in ("III", "IV") else "p1"
        elif sec.get("block") in ("III", "IV") and has("case" + sec["block"]):
            labels[sec["id"]] = "case" + sec["block"]
        elif sec.get("block") in ("III", "IV") and has(sec["block"]):
            labels[sec["id"]] = sec["block"]
        else:
            labels[sec["id"]] = f"case{cases.index(sec) + 1}" if sec in cases else f"s{i}"
    return labels


def lookup(keys: list[dict[str, dict[int, str]]], label: str, kind: str) -> dict[int, str]:
    """Respuestas de `label`: la teoría se busca desde la primera plantilla (1.er ejercicio) y los
    supuestos desde la última (2.º ejercicio), porque «Bloque III/IV» aparece en ambas en 2016."""
    ordered = keys if kind == "theory" else list(reversed(keys))
    return next((k[label] for k in ordered if label in k), {})


def compare(bank: dict, keys: list[dict[str, dict[int, str]]]) -> list[str]:
    diffs = []
    labels = section_labels(bank, keys)
    for sec in bank["sections"]:
        label = labels[sec["id"]]
        for group, suffix in ((sec["questions"], ""), (sec.get("reserve", []), "-r")):
            official = lookup(keys, label + suffix, sec["kind"])
            for idx, q in enumerate(group, start=1):
                num = q["number"] if (sec["kind"] == "theory" and not suffix) else idx
                exp = official.get(num)
                got = "X" if q.get("annulled") else (q.get("answer") or "?")
                if exp is None:
                    diffs.append(f"{q['id']}: no aparece en la plantilla")
                elif exp != got and not (exp == "X" and q.get("annulled")):
                    diffs.append(f"{q['id']}: banco={got} plantilla={exp}")
    return diffs


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--md", type=Path)
    args = ap.parse_args()
    rows, details = [], []
    for path in sorted(BANKS.glob("*.json")):
        bank = json.loads(path.read_text(encoding="utf-8"))
        found = plantilla_paths(bank["id"], bank.get("model"))
        if not found:
            rows.append(f"| `{bank['id']}` | — | sin plantilla descargada |")
            continue
        pdfs, kind = found
        keys = [parse_plantilla(pdf) for pdf in pdfs]
        n = sum(len(v) for key in keys for v in key.values())
        diffs = compare(bank, keys)
        status = "✅ coincide" if not diffs else f"❌ {len(diffs)} diferencias"
        names = " + ".join(p.name for p in pdfs)
        rows.append(f"| `{bank['id']}` | {names} · {kind} ({n} respuestas leídas) | {status} |")
        if diffs:
            details += [f"## `{bank['id']}`", ""] + [f"- {d}" for d in diffs[:60]] + [""]
    header = [
        "# Respuestas frente a la plantilla oficial (definitiva o, si aún no existe, provisional)",
        "",
        "| Banco | Plantilla | Resultado |",
        "|---|---|---|",
    ]
    report = "\n".join(header + rows + [""] + details)
    if args.md:
        args.md.parent.mkdir(parents=True, exist_ok=True)
        args.md.write_text(report, encoding="utf-8")
    print(report)
    return 1 if details else 0


if __name__ == "__main__":
    sys.exit(main())
