# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (C) 2026 Eric Valls Gramunt
"""Pruebas de extremo a extremo con PDFs sintéticos generados con PyMuPDF."""

from __future__ import annotations

from pathlib import Path

import pymupdf
import pytest

from opotai.answer_key import compile_markers, read_answer_key
from opotai.booklet import BookletConfig, parse_booklet

REG = "helv"  # Helvetica
BOLD = "hebo"  # Helvetica-Bold


def _write(page, x, y, text, bold=False, size=9):
    page.insert_text((x, y), text, fontname=BOLD if bold else REG, fontsize=size)


@pytest.fixture
def booklet_pdf(tmp_path: Path) -> Path:
    doc = pymupdf.open()
    p = doc.new_page(width=595, height=842)
    y = 40
    _write(p, 260, y, "PRIMERA PARTE", bold=True)
    y += 18
    # Pregunta 1: opciones en una columna, enunciado en dos líneas con partición
    _write(p, 28, y, "1.", bold=True)
    _write(p, 50, y, "¿Cuál de las siguientes afirmaciones sobre la infor-", bold=True)
    y += 11
    _write(p, 50, y, "mática es correcta?", bold=True)
    for letter, txt in zip(
        "abcd", ["Primera opción", "Segunda opción que ocupa", "Tercera", "Cuarta"], strict=True
    ):
        y += 11
        _write(p, 50, y, f"{letter})")
        _write(p, 71, y, txt)
        if letter == "b":
            y += 11
            _write(p, 71, y, "dos líneas.")
    # Pregunta 2: opciones a dos columnas
    y += 18
    _write(p, 28, y, "2.", bold=True)
    _write(p, 50, y, "Código HTTP de recurso no encontrado:", bold=True)
    y += 11
    _write(p, 50, y, "a)")
    _write(p, 71, y, "200")
    _write(p, 347, y, "b)")
    _write(p, 383, y, "404")
    y += 11
    _write(p, 50, y, "c)")
    _write(p, 71, y, "500")
    _write(p, 347, y, "d)")
    _write(p, 383, y, "302")
    y += 18
    _write(p, 50, y, "Preguntas de reserva", bold=True)
    y += 14
    _write(p, 28, y, "1.", bold=True)
    _write(p, 50, y, "Pregunta de reserva:", bold=True)
    for letter in "abcd":
        y += 11
        _write(p, 50, y, f"{letter})")
        _write(p, 71, y, f"Respuesta {letter.upper()}")
    _write(p, 245, 800, "2099 - TAI-L – MODELO A")
    _write(p, 506, 800, "Página 1 de 2")
    p2 = doc.new_page(width=595, height=842)
    y = 40
    _write(p2, 270, y, "SUPUESTO I", bold=True)
    y += 20
    _write(p2, 28, y, "El organismo usa la red ")
    _write(p2, 128, y, "10.9.0.0/16", bold=True)
    _write(p2, 182, y, " para sus equipos.")
    y += 11
    _write(p2, 28, y, "Segunda línea del mismo párrafo.")
    y += 20
    _write(p2, 28, y, "Nuevo párrafo del enunciado.")
    y += 20
    _write(p2, 28, y, "1.", bold=True)
    _write(p2, 50, y, "¿Cuántos hosts admite una /20?", bold=True)
    for letter, txt in zip("abcd", ["4094", "4096", "65534", "254"], strict=True):
        y += 11
        _write(p2, 50, y, f"{letter})")
        _write(p2, 71, y, txt)
    _write(p2, 245, 800, "2099 - TAI-L – MODELO A")
    _write(p2, 506, 800, "Página 2 de 2")
    path = tmp_path / "cuadernillo.pdf"
    doc.save(path)
    return path


def _cfg(path: Path) -> BookletConfig:
    return BookletConfig.from_dict(
        {
            "file": path.name,
            "bottom": 790,
            "ignore": [],
            "markers": [
                {"pattern": "^PRIMERA PARTE$", "section": "p1"},
                {"pattern": "^SUPUESTO I$", "section": "p2-s1"},
                {"pattern": "^Preguntas de reserva$", "reserve": True},
            ],
            "hyphenation": "remove",
        }
    )


def test_booklet_parsing(booklet_pdf: Path):
    pb = parse_booklet(_cfg(booklet_pdf), {"p1": "theory", "p2-s1": "case"}, booklet_pdf)
    p1 = pb.sections["p1"]
    assert [q.number for q in p1.questions] == [1, 2]
    q1 = p1.questions[0]
    assert q1.text == "¿Cuál de las siguientes afirmaciones sobre la informática es correcta?"
    assert q1.options == ["Primera opción", "Segunda opción que ocupa dos líneas.", "Tercera", "Cuarta"]
    q2 = p1.questions[1]
    assert q2.options == ["200", "404", "500", "302"]
    assert len(p1.reserve) == 1 and p1.reserve[0].options[3] == "Respuesta D"
    s1 = pb.sections["p2-s1"]
    assert s1.questions[0].options[0] == "4094"
    st = pb.statement_markdown("p2-s1")
    assert st == (
        "El organismo usa la red **10.9.0.0/16** para sus equipos. Segunda línea del mismo párrafo."
        "\n\nNuevo párrafo del enunciado."
    )
    # pie de página descartado por "bottom"
    assert all("Página" not in q.text for q in p1.questions)


@pytest.fixture
def key_pdf(tmp_path: Path) -> Path:
    doc = pymupdf.open()
    p = doc.new_page(width=595, height=842)
    _write(p, 28, 60, "Primera parte")
    answers = ["b", "c", "ANULADA", "d"]
    y = 72
    for i, a in enumerate(answers, 1):
        _write(p, 28, y, f"{i}.")
        _write(p, 46, y, a)
        y += 11
    _write(p, 230, 60, "Preguntas de reserva")
    _write(p, 230, 72, "1.")
    _write(p, 248, 72, "a")
    _write(p, 430, 60, "Supuesto I")
    _write(p, 430, 72, "1.")
    _write(p, 448, 72, "c")
    _write(p, 470, 72, "MODIFICADA")
    _write(p, 430, 83, "2.")
    _write(p, 448, 83, "a")
    path = tmp_path / "plantilla.pdf"
    doc.save(path)
    return path


def test_answer_key(key_pdf: Path):
    markers = compile_markers(
        [
            {"pattern": "(?i)^primera parte$", "section": "p1"},
            {"pattern": "(?i)^supuesto i$", "section": "p2-s1"},
            {"pattern": "(?i)^(preguntas de )?reserva$", "reserve": True},
        ]
    )
    key = read_answer_key(key_pdf, markers)
    assert key.counts() == {"p1": (4, 1), "p2-s1": (2, 0)}
    assert key.get("p1", False, 1).answer == "B"
    e3 = key.get("p1", False, 3)
    assert e3.annulled and e3.answer is None
    assert key.get("p1", True, 1).answer == "A"
    e = key.get("p2-s1", False, 1)
    assert e.answer == "C" and e.modified
