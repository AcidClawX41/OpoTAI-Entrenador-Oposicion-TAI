# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (C) 2026 Eric Valls Gramunt
"""Comprueba que cada pregunta y opción transcrita está literalmente en el cuadernillo oficial.

Para cada banco oficial localiza su cuadernillo en ``data/raw/<bank-id>/`` (según
``tools/sources/examenes.json``), extrae el texto con PyMuPDF y busca cada enunciado y cada opción
tras normalizar (minúsculas, sin acentos, sin signos ni espacios: así da igual la partición de
líneas o los guiones de corte). Las diferencias suelen ser errores de transcripción o
reconstrucciones deliberadas (tablas/código en Markdown); el informe distingue ambos casos.

Uso: ``cd tools && uv run python qa/fidelidad_pdf.py [--md ../docs/calidad/fidelidad-pdf.md]``
Autor: Eric Valls Gramunt.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BANKS = ROOT / "data" / "banks" / "oficiales"
RAW = ROOT / "data" / "raw"
MANIFEST = ROOT / "tools" / "sources" / "examenes.json"

# Marcas de Markdown que no están en el PDF: imágenes, etiqueta de lenguaje de los bloques de código
# (solo tras ``` al inicio de línea), comillas invertidas, negritas y marcadores de lista.
MD_NOISE = re.compile(
    r"!\[[^\]]*\]\([^)]*\)|^\s*```[a-z0-9+-]*\s*$|`|\*\*|__|^\s*[-*]\s+|^\s*\d+\.\s+", re.MULTILINE
)
QUOTES = str.maketrans({"‘": "'", "’": "'", "“": '"', "”": '"', "«": '"', "»": '"', "–": "-", "—": "-"})


def norm(text: str, markdown: bool = True) -> str:
    """Normaliza para comparar. ``markdown=False`` para el texto del PDF: ahí un «422.» a principio
    de línea es contenido, no un marcador de lista."""
    if markdown:
        text = MD_NOISE.sub(" ", text)
    text = text.translate(QUOTES).lower()
    text = unicodedata.normalize("NFKD", text)
    text = "".join(c for c in text if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]", "", text)


def pdf_text(path: Path) -> tuple[str, bool]:
    """Texto del PDF y si procede de OCR.

    Si el cuadernillo está escaneado (sin capa de texto), se hace un OCR propio con Tesseract
    (castellano, 300 ppp), independiente del usado para transcribir el banco, y se guarda en
    caché junto al PDF (``<pdf>.ocr.txt``, dentro de ``data/raw/``, que no se versiona).
    """
    import pymupdf  # type: ignore

    with pymupdf.open(str(path)) as doc:
        text = "\n".join(page.get_text() for page in doc)
        if len(text.strip()) >= 100 * doc.page_count:
            return text, False
        cache = path.with_suffix(".ocr.txt")
        if cache.is_file() and cache.stat().st_mtime >= path.stat().st_mtime:
            return cache.read_text(encoding="utf-8"), True
        parts = []
        for page in doc:
            textpage = page.get_textpage_ocr(language="spa", dpi=300, full=True)
            parts.append(page.get_text(textpage=textpage))
        text = "\n".join(parts)
        cache.write_text(text, encoding="utf-8")
        return text, True


def words(text: str) -> list[str]:
    """Palabras normalizadas de 4+ caracteres (las cortas son ruido habitual del OCR)."""
    text = MD_NOISE.sub(" ", text).translate(QUOTES).lower()
    text = unicodedata.normalize("NFKD", text)
    text = "".join(c for c in text if not unicodedata.combining(c))
    return [w for w in re.findall(r"[a-z0-9]+", text) if len(w) >= 4]


def ocr_fold(text: str) -> str:
    """Pliega las confusiones típicas de Tesseract (I/l/1, 0/o) para comparar con el OCR."""
    return text.translate(str.maketrans({"l": "i", "1": "i", "0": "o"}))


def fuzzy_in(word: str, haystack: str) -> bool:
    """¿Aparece la palabra en el OCR, admitiendo un carácter sustituido o insertado (≥ 5 letras)?"""
    w = ocr_fold(word)
    if w in haystack:
        return True
    if len(w) < 5:
        return False
    patterns = [w[:i] + "." + w[i + 1 :] for i in range(len(w))]  # sustitución
    patterns += [w[:i] + "." + w[i:] for i in range(1, len(w))]  # inserción
    return any(re.search(p, haystack) for p in patterns)


def coverage(text: str, haystack: str) -> float:
    """Fracción de palabras del texto presentes en el OCR (tolerante a espacios perdidos y al ruido
    típico del reconocimiento). ``haystack`` debe venir plegado con :func:`ocr_fold`."""
    ws = words(text)
    return 1.0 if not ws else sum(1 for w in ws if fuzzy_in(w, haystack)) / len(ws)


def booklets(bank_id: str) -> list[Path]:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    files = [
        RAW / bank_id / d["file"]
        for d in manifest["documents"]
        if d["bank_id"] == bank_id and d["kind"] == "cuadernillo"
    ]
    return [f for f in files if f.is_file()]


def check_bank(bank_path: Path) -> dict:
    bank = json.loads(bank_path.read_text(encoding="utf-8"))
    pdfs = booklets(bank["id"])
    if not pdfs:
        return {"bank": bank["id"], "skipped": "sin cuadernillo descargado en data/raw"}
    texts = [pdf_text(p) for p in pdfs]
    haystack = norm(" ".join(t for t, _ in texts), markdown=False)
    ocr = any(flag for _, flag in texts)
    result = {
        "bank": bank["id"],
        "questions": 0,
        "text_miss": [],
        "option_miss": [],
        "reconstructed": [],
        "mode": "OCR propio (cobertura de palabras)" if ocr else "texto literal",
    }
    folded = ocr_fold(haystack)
    for sec in bank["sections"]:
        for q in sec["questions"] + sec.get("reserve", []):
            result["questions"] += 1
            if ocr:
                # Cuadernillo escaneado: el OCR tiene ruido, así que se exige que casi todas las
                # palabras del enunciado (≥ 90 %) y de cada opción (≥ 80 %) estén en el OCR.
                if coverage(q["text"], folded) < 0.9:
                    result["text_miss"].append(q["id"])
                for letter, opt in zip("ABCD", q["options"], strict=False):
                    if coverage(opt, folded) < 0.8:
                        result["option_miss"].append(f"{q['id']}:{letter}")
                continue
            reconstructed = "```" in q["text"] or "|" in q["text"] or any("```" in o for o in q["options"])
            body = norm(q["text"])
            # Enunciados largos: se comprueban inicio y final (las tablas/listas intermedias pueden
            # haberse reconstruido en Markdown y cambiar el orden de lectura).
            probes = [body] if len(body) <= 160 else [body[:120], body[-60:]]
            if any(p and p not in haystack for p in probes):
                (result["reconstructed"] if reconstructed else result["text_miss"]).append(q["id"])
            for letter, opt in zip("ABCD", q["options"], strict=False):
                o = norm(opt)
                if len(o) >= 4 and o not in haystack:
                    target = result["reconstructed"] if "```" in opt or "|" in opt else result["option_miss"]
                    target.append(f"{q['id']}:{letter}")
    return result


def render(results: list[dict]) -> str:
    out = [
        "# Fidelidad de la transcripción frente a los cuadernillos oficiales",
        "",
        "| Banco | Comprobación | Preguntas | Enunciados no localizados | Opciones no localizadas "
        "| Reconstrucciones Markdown |",
        "|---|---|---|---|---|---|",
    ]
    for r in results:
        if "skipped" in r:
            out.append(f"| `{r['bank']}` | — | — | {r['skipped']} | | |")
            continue
        out.append(
            f"| `{r['bank']}` | {r['mode']} | {r['questions']} | {len(r['text_miss'])} | "
            f"{len(r['option_miss'])} | {len(r['reconstructed'])} |"
        )
    out.append("")
    for r in results:
        if "skipped" in r or not (r["text_miss"] or r["option_miss"]):
            continue
        out.append(f"## `{r['bank']}`")
        if r["text_miss"]:
            out.append(f"- Enunciados: {', '.join(f'`{x}`' for x in r['text_miss'])}")
        if r["option_miss"]:
            out.append(f"- Opciones: {', '.join(f'`{x}`' for x in r['option_miss'])}")
        out.append("")
    return "\n".join(out)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--md", type=Path)
    args = ap.parse_args()
    results = [check_bank(p) for p in sorted(BANKS.glob("*.json"))]
    report = render(results)
    if args.md:
        args.md.parent.mkdir(parents=True, exist_ok=True)
        args.md.write_text(report, encoding="utf-8")
    print(report)
    return 0


if __name__ == "__main__":
    sys.exit(main())
