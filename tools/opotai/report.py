# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (C) 2026 Eric Valls Gramunt
"""Resumen de los bancos oficiales en Markdown (tabla para ``docs/datos/examenes-oficiales.md``).

Uso::

    cd tools
    uv run python -m opotai.report                # imprime la tabla
    uv run python -m opotai.report --update-doc   # la reescribe en el documento, entre marcadores

Los marcadores en el documento son ``<!-- tabla-bancos:inicio -->``/``<!-- tabla-bancos:fin -->``
(tabla de bancos) y ``<!-- tabla-imagenes:inicio -->``/``<!-- tabla-imagenes:fin -->`` (imágenes de
cada banco, dónde se muestran y cómo se reconstruyen: transcripción y, si la hay, reconstrucción
vectorial ``…-redibujo.svg``).
"""

from __future__ import annotations

import argparse
import re
from pathlib import Path

from .bankio import load_json
from .paths import OFFICIAL_BANKS_DIR, REPO_ROOT
from .textutil import IMAGE_MD_RE

DOC = REPO_ROOT / "docs" / "datos" / "examenes-oficiales.md"
START = "<!-- tabla-bancos:inicio -->"
END = "<!-- tabla-bancos:fin -->"
IMG_START = "<!-- tabla-imagenes:inicio -->"
IMG_END = "<!-- tabla-imagenes:fin -->"
ACCESS = {"libre": "Libre", "promocion_interna": "Promoción interna"}


def _fmt_date(d: str | None) -> str:
    if not d:
        return "—"
    y, m, dd = d.split("-")
    return f"{dd}/{m}/{y}"


def _doc_link(bank: dict, kinds: tuple[str, ...], label: str) -> str | None:
    for d in bank["source"]["documents"]:
        if d["kind"] in kinds:
            return f"[{label}]({d['url']})"
    return None


def bank_rows(banks_dir: Path = OFFICIAL_BANKS_DIR) -> list[str]:
    rows = []
    for path in sorted(banks_dir.glob("*.json"), key=lambda p: _sort_key(p.stem)):
        b = load_json(path)
        secs = []
        annulled = 0
        figures = 0
        for s in b["sections"]:
            secs.append(f"{s['id']} {len(s['questions'])}+{len(s.get('reserve', []))}")
            for q in s["questions"] + s.get("reserve", []):
                annulled += bool(q.get("annulled"))
        figures = len(bank_images(b))
        links = [
            _doc_link(b, ("cuadernillo",), "cuadernillo"),
            _doc_link(b, ("plantilla_definitiva",), "plantilla def."),
            _doc_link(b, ("plantilla_provisional",), "plantilla prov."),
        ]
        rows.append(
            "| `{id}` | {conv} | {acc} | {date} | {secs} | {ann} | {key} | {fig} | {links} |".format(
                id=b["id"],
                conv=f"`{b['convocatoria']}`" if b.get("convocatoria") else "—",
                acc=ACCESS.get(b.get("access"), "—"),
                date=_fmt_date(b.get("exam_date")),
                secs="<br>".join(secs),
                ann=annulled,
                key=b["source"]["answer_key"],
                fig=figures,
                links=" · ".join(x for x in links if x),
            )
        )
    return rows


def _sort_key(bank_id: str) -> tuple:
    m = re.match(r"tai-(li|pi)-(\d{4})(.*)", bank_id)
    if not m:
        return (9999, bank_id)
    return (-int(m.group(2)), m.group(1), m.group(3))


REDRAW_SUFFIX = "-redibujo.svg"  # reconstrucción vectorial de una figura (ver ``figures.py``)


def _with_redraw(redraw: str | None, recon: str) -> str:
    if not redraw:
        return recon
    name = redraw.rsplit("/", 1)[-1]
    return f"redibujo vectorial [`{name}`](../../data/banks/{redraw}) + {recon}"


def bank_images(bank: dict) -> list[tuple[str, str, str]]:
    """Imágenes del banco: (ruta, dónde se muestra, reconstrucción).

    Una reconstrucción vectorial (``…-redibujo.svg``) no cuenta como imagen aparte: se anota en
    la columna «Reconstrucción» de la imagen original que la sigue.
    """
    out: list[tuple[str, str, str]] = []

    def inline(text: str | None, where: str) -> None:
        redraw = None
        for m in IMAGE_MD_RE.finditer(text or ""):
            if m.group(2).endswith(REDRAW_SUFFIX):
                if redraw:  # reconstrucción sin original (``image: false``)
                    out.append((redraw, where, "redibujo vectorial (sin imagen original)"))
                redraw = m.group(2)
                continue
            rest = text[m.end() :].lstrip()
            recon = (
                "transcripción en tablas Markdown tras la imagen"
                if rest.startswith("*Transcripción")
                else "imagen (diagrama/esquema; descrito en el texto alternativo)"
            )
            out.append((m.group(2), where, _with_redraw(redraw, recon)))
            redraw = None
        if redraw:
            out.append((redraw, where, "redibujo vectorial (sin imagen original)"))

    def media(items: list[dict], where: str) -> None:
        redraw = None
        for m in items or []:
            if m["path"].endswith(REDRAW_SUFFIX):
                redraw = m["path"]
                continue
            out.append((m["path"], where, _with_redraw(redraw, "imagen (`media`)")))
            redraw = None

    for s in bank["sections"]:
        inline(s.get("statement"), f"{s['id']} · enunciado del supuesto, en línea")
        media(s.get("media", []), f"{s['id']} · `media` de la sección")
        for q in s["questions"] + s.get("reserve", []):
            qs = q["id"].removeprefix(bank["id"] + "-")
            inline(q.get("text"), f"{qs} · enunciado de la pregunta, en línea")
            for i, o in enumerate(q.get("options", [])):
                inline(o, f"{qs} · opción {'ABCD'[i]}, en línea")
            media(q.get("media", []), f"{qs} · `media` de la pregunta")
    return out


def image_table(banks_dir: Path = OFFICIAL_BANKS_DIR) -> str:
    rows = [
        "| Banco | Imagen | Dónde se muestra | Reconstrucción |",
        "|---|---|---|---|",
    ]
    for path in sorted(banks_dir.glob("*.json"), key=lambda p: _sort_key(p.stem)):
        b = load_json(path)
        for img, where, recon in bank_images(b):
            name = img.rsplit("/", 1)[-1]
            rows.append(f"| `{b['id']}` | [`{name}`](../../data/banks/{img}) | {where} | {recon} |")
    if len(rows) == 2:
        rows.append("| — | — | — | — |")
    return "\n".join(rows)


def table() -> str:
    head = (
        "| Banco | Convocatoria | Acceso | Examen | Preguntas por sección (+reserva) | Anuladas "
        "| Plantilla | Figuras | Documentos oficiales |\n"
        "|---|---|---|---|---|---|---|---|---|"
    )
    return head + "\n" + "\n".join(bank_rows())


def _replace_between(text: str, start: str, end: str, body: str, doc: Path) -> str:
    if start not in text or end not in text:
        raise SystemExit(f"{doc}: faltan los marcadores {start} / {end}")
    return re.sub(
        re.escape(start) + r".*?" + re.escape(end), lambda _m: f"{start}\n{body}\n{end}", text, flags=re.S
    )


def update_doc(doc: Path = DOC) -> bool:
    text = doc.read_text(encoding="utf-8")
    new = _replace_between(text, START, END, table(), doc)
    new = _replace_between(new, IMG_START, IMG_END, image_table(), doc)
    if new != text:
        doc.write_text(new, encoding="utf-8")
        return True
    return False


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--update-doc", action="store_true", help=f"reescribir la tabla en {DOC.name}")
    args = ap.parse_args(argv)
    if args.update_doc:
        changed = update_doc()
        print("documento actualizado" if changed else "documento sin cambios")
    else:
        print(table())
        print()
        print(image_table())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
