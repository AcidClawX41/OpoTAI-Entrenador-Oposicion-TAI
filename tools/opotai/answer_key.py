# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (C) 2026 Eric Valls Gramunt
"""Lectura de plantillas de respuestas (provisionales o definitivas) en PDF.

Las plantillas del INAP son listas ``N. letra`` repartidas en columnas, con cabeceras
("Primera parte", "Preguntas de reserva", "Supuesto I"…). El lector:

1. extrae palabras con posición (PyMuPDF);
2. reconoce entradas (número + letra/``ANULADA``) y cabeceras configuradas;
3. agrupa por columnas (según la x) y las lee de arriba abajo, de izquierda a derecha;
4. asigna cada entrada a la sección/reserva vigente según las cabeceras.

Resultado: ``{section_id: {"questions": {n: Entry}, "reserve": {n: Entry}}}``.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path

import pymupdf

NUMBER_RE = re.compile(r"^(\d{1,3})[.)]?$")
LETTER_RE = re.compile(r"^([a-dA-D])[.)]?$")
ANNULLED_RE = re.compile(r"^(anulada|anulado|nula)[.]?$", re.I)
MODIFIED_RE = re.compile(r"^(modificada|modificado|cambiada|rectificada)[.]?$", re.I)


@dataclass
class Entry:
    number: int
    answer: str | None  # "A".."D" o None si anulada
    annulled: bool = False
    modified: bool = False  # marcada como modificada respecto a la provisional
    raw: str = ""


@dataclass
class KeyMarker:
    pattern: re.Pattern
    section: str | None = None
    reserve: bool | None = None


@dataclass
class AnswerKey:
    sections: dict[str, dict[str, dict[int, Entry]]] = field(default_factory=dict)
    order: list[str] = field(default_factory=list)

    def get(self, section: str, reserve: bool, number: int) -> Entry | None:
        return self.sections.get(section, {}).get("reserve" if reserve else "questions", {}).get(number)

    def counts(self) -> dict[str, tuple[int, int]]:
        return {
            sid: (len(v.get("questions", {})), len(v.get("reserve", {}))) for sid, v in self.sections.items()
        }

    def merge(self, other: AnswerKey, label: str = "") -> None:
        """Une otra plantilla con secciones distintas (p. ej. una por ejercicio)."""
        overlap = set(self.sections) & set(other.sections)
        if overlap:
            raise ValueError(f"plantillas con secciones repetidas {sorted(overlap)} {label}".strip())
        self.sections.update(other.sections)
        self.order.extend(other.order)


@dataclass
class _Item:
    page: int
    x0: float
    y0: float
    kind: str  # "entry" | "header"
    entry: Entry | None = None
    marker: KeyMarker | None = None
    text: str = ""


def _words(page: pymupdf.Page) -> list[tuple[float, float, float, float, str]]:
    return [(w[0], w[1], w[2], w[3], w[4]) for w in page.get_text("words")]


def _rows(words, tol: float = 3.0):
    rows: list[list] = []
    for w in sorted(words, key=lambda w: ((w[1] + w[3]) / 2, w[0])):
        cy = (w[1] + w[3]) / 2
        if rows:
            r = rows[-1]
            rcy = sum((x[1] + x[3]) / 2 for x in r) / len(r)
            if abs(cy - rcy) <= tol:
                r.append(w)
                continue
        rows.append([w])
    for r in rows:
        r.sort(key=lambda w: w[0])
    return rows


def _split_segments(row, gap: float = 25.0):
    """Divide una fila en segmentos separados por huecos grandes (columnas)."""
    segs: list[list] = []
    for w in row:
        if segs and w[0] - segs[-1][-1][2] <= gap:
            segs[-1].append(w)
        else:
            segs.append([w])
    return segs


def read_answer_key(
    pdf_path: Path,
    markers: list[KeyMarker],
    column_gap: float = 60.0,
    segment_gap: float = 25.0,
    pages: list[int] | None = None,
) -> AnswerKey:
    doc = pymupdf.open(pdf_path)
    items: list[_Item] = []
    page_nums = pages if pages is not None else list(range(len(doc)))
    for pno in page_nums:
        page = doc[pno]
        for row in _rows(_words(page)):
            for seg in _split_segments(row, segment_gap):
                text = " ".join(w[4] for w in seg).strip()
                marker = next((m for m in markers if m.pattern.search(text)), None)
                if marker is not None:
                    items.append(_Item(pno, seg[0][0], seg[0][1], "header", marker=marker, text=text))
                    continue
                entry = _parse_entry([w[4] for w in seg])
                if entry is not None:
                    items.append(_Item(pno, seg[0][0], seg[0][1], "entry", entry=entry, text=text))
    # Columnas por página: agrupar x0 con un umbral de separación.
    key = AnswerKey()
    ordered: list[_Item] = []
    for pno in page_nums:
        pitems = [it for it in items if it.page == pno]
        if not pitems:
            continue
        xs = sorted({round(it.x0, 1) for it in pitems})
        cols: list[list[float]] = []
        for x in xs:
            if cols and x - cols[-1][-1] <= column_gap:
                cols[-1].append(x)
            else:
                cols.append([x])

        def col_of(it: _Item, cols=cols) -> int:
            for i, c in enumerate(cols):
                if c[0] - 0.5 <= round(it.x0, 1) <= c[-1] + 0.5:
                    return i
            return len(cols)

        ordered.extend(sorted(pitems, key=lambda it: (col_of(it), it.y0)))
    section: str | None = None
    reserve = False
    for it in ordered:
        if it.kind == "header":
            m = it.marker
            if m.section is not None:
                section = m.section
                reserve = bool(m.reserve) if m.reserve is not None else False
                if section not in key.sections:
                    key.sections[section] = {"questions": {}, "reserve": {}}
                    key.order.append(section)
            elif m.reserve is not None:
                reserve = m.reserve
            continue
        if section is None:
            raise ValueError(f"{pdf_path.name}: entrada {it.text!r} antes de cualquier cabecera de sección")
        bucket = key.sections[section]["reserve" if reserve else "questions"]
        e = it.entry
        if e.number in bucket:
            raise ValueError(
                f"{pdf_path.name}: número repetido {e.number} en {section}"
                f"{' (reserva)' if reserve else ''}: {bucket[e.number].raw!r} / {it.text!r}"
            )
        bucket[e.number] = e
    # Comprobación de continuidad 1..N en cada bloque
    for sid, parts in key.sections.items():
        for name, bucket in parts.items():
            nums = sorted(bucket)
            if nums and nums != list(range(1, len(nums) + 1)):
                missing = sorted(set(range(1, max(nums) + 1)) - set(nums))
                raise ValueError(f"{pdf_path.name}: {sid}/{name} numeración no continua; faltan {missing}")
    return key


def _parse_entry(tokens: list[str]) -> Entry | None:
    if len(tokens) < 2:
        return None
    m = NUMBER_RE.match(tokens[0])
    if not m:
        return None
    number = int(m.group(1))
    rest = tokens[1:]
    answer = None
    annulled = False
    modified = False
    lm = LETTER_RE.match(rest[0])
    if lm:
        answer = lm.group(1).upper()
    elif ANNULLED_RE.match(rest[0]):
        annulled = True
    else:
        return None
    for extra in rest[1:]:
        if MODIFIED_RE.match(extra):
            modified = True
        elif ANNULLED_RE.match(extra):
            annulled = True
        else:
            return None  # texto no reconocido: no es una entrada de plantilla
    return Entry(number=number, answer=answer, annulled=annulled, modified=modified, raw=" ".join(tokens))


def compile_markers(spec: list[dict]) -> list[KeyMarker]:
    return [
        KeyMarker(pattern=re.compile(m["pattern"]), section=m.get("section"), reserve=m.get("reserve"))
        for m in spec
    ]
