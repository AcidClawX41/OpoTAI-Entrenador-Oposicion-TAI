# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (C) 2026 Eric Valls Gramunt
"""OCR: enderezado, filas, lectura tolerante de números/etiquetas y parches globales (sin Tesseract)."""

from __future__ import annotations

from pathlib import Path

import pymupdf
import pytest

from opotai.answer_key import AnswerKey
from opotai.booklet import BookletConfig, apply_ocr_word_fixes, parse_booklet
from opotai.fixes import FixError, apply_global_replace
from opotai.ocr import page_skew, page_spans_from_words
from opotai.pdfdoc import group_rows

SLOPE = 0.01  # 1 pt cada 100 pt: la columna derecha queda ~2,5 pt más abajo


def _line(words: list[tuple[float, str]], y: float, key: str, conf: int = 95) -> list[list]:
    """Palabras de una línea de Tesseract con la pendiente del escaneo aplicada."""
    out = []
    for x, text in words:
        x1 = x + 6.0 * len(text)
        dy = SLOPE * (x - 297.5)
        out.append([x, round(y - 7 + dy, 1), round(x1, 1), round(y + dy, 1), text, conf, key])
    return out


def _page_words() -> list[list]:
    w: list[list] = []
    w += _line([(30, "bs"), (60, "¿Cuál"), (95, "es"), (115, "la"), (130, "respuesta?")], 100, "1.1.1")
    # opciones a dos columnas en la misma línea de Tesseract
    w += _line([(60, "a)"), (80, "uno"), (320, "b)"), (340, "dos")], 112, "1.1.2")
    w += _line([(60, "Cc)"), (80, "tres"), (320, "d)"), (340, "cuatro")], 124, "1.1.3")
    w += _line([(30, "2."), (60, "Otra"), (95, "pregunta"), (160, "más")], 140, "1.1.4")
    w += _line([(60, "a)"), (80, "A"), (320, "b)"), (340, "B")], 152, "1.1.5")
    w += _line([(60, "c)"), (80, "C"), (320, "d)"), (340, "D")], 164, "1.1.6")
    # líneas largas para estimar la pendiente
    for i, y in enumerate((300, 320, 340)):
        w += _line([(60 + 70 * k, f"palabra{k}") for k in range(7)], y, f"1.2.{i}")
    # ruido: barra en el margen izquierdo y marca en el borde derecho
    w.append([12.0, 200.0, 14.0, 208.0, "|", 40, "1.3.1"])
    w.append([580.0, 200.0, 582.0, 208.0, "Ñ", 10, "1.3.2"])
    return w


def test_page_skew_and_spans():
    words = _page_words()
    assert page_skew(words) == pytest.approx(SLOPE, abs=0.002)
    spans = page_spans_from_words(words, 595.0)
    texts = [s.text for s in spans]
    assert "|" not in texts and "Ñ" not in texts  # ruido de márgenes descartado
    rows = group_rows(spans, 0, 4.0)
    # tras enderezar, «b) dos» está en la misma fila que «a) uno»
    row_texts = [r.text for r in rows]
    assert "a) uno b) dos" in row_texts
    assert "Cc) tres d) cuatro" in row_texts


def test_page_spans_split_merged_tesseract_line():
    words = [
        [30.0, 93.0, 42.0, 100.0, "7.", 95, "1.1.1"],
        [60.0, 93.0, 90.0, 100.0, "Primera", 95, "1.1.1"],
        [60.0, 104.0, 90.0, 111.0, "segunda", 95, "1.1.1"],  # misma «línea» pero otra fila visual
    ]
    rows = group_rows(page_spans_from_words(words, 595.0), 0, 4.0)
    assert [r.text for r in rows] == ["7. Primera", "segunda"]


@pytest.fixture
def blank_pdf(tmp_path: Path) -> Path:
    doc = pymupdf.open()
    doc.new_page(width=595, height=842)
    path = tmp_path / "escaneo.pdf"
    doc.save(path)
    return path


def test_ocr_tolerant_numbers_and_labels(blank_pdf: Path):
    spans = {0: page_spans_from_words(_page_words()[:25], 595.0)}
    cfg = BookletConfig.from_dict(
        {"file": blank_pdf.name, "ocr": True, "start_section": "p1", "markers": [], "question_x_max": 45}
    )
    assert cfg.question_bold is None and cfg.row_tolerance == 4.0
    pb = parse_booklet(cfg, {"p1": "theory"}, blank_pdf, spans_override=spans)
    qs = pb.sections["p1"].questions
    assert [q.number for q in qs] == [1, 2]
    assert qs[0].text == "¿Cuál es la respuesta?"
    assert qs[0].options == ["uno", "dos", "tres", "cuatro"]
    assert qs[1].options == ["A", "B", "C", "D"]
    assert any("leído por OCR como 'bs'" in w for w in pb.warnings)


def test_ocr_word_fixes_apply_exactly_once():
    spans = {0: page_spans_from_words(_page_words()[:25], 595.0)}
    apply_ocr_word_fixes(spans, [{"page": 1, "old": "Cc)", "new": "c)"}])
    assert any(s.text == "c)" for s in spans[0])
    with pytest.raises(ValueError, match="exactamente una"):
        apply_ocr_word_fixes(spans, [{"page": 1, "old": "a)", "new": "a)"}])  # dos apariciones
    # «x» e «y» desambiguan palabras repetidas
    ys = sorted(s.y0 for s in spans[0] if s.text == "a)")
    apply_ocr_word_fixes(spans, [{"page": 1, "old": "a)", "new": "A)", "x": 60.0, "y": ys[1]}])
    assert sorted((s.y0, s.text) for s in spans[0] if s.text in ("a)", "A)"))[1][1] == "A)"
    with pytest.raises(ValueError, match="exactamente una"):
        apply_ocr_word_fixes(spans, [{"page": 1, "old": "b)", "new": "b)", "x": 320.0}])  # dos filas
    # «old»: null añade una palabra (cabecera que el OCR no ha leído)
    apply_ocr_word_fixes(spans, [{"page": 1, "old": None, "new": "BLOQUE III", "x": 250.0, "y": 60.0}])
    assert any(s.text == "BLOQUE III" and s.y0 == 60.0 for s in spans[0])


def _bank(texts: list[str]) -> dict:
    return {
        "sections": [
            {
                "statement": "Elderecho del enunciado",
                "questions": [{"text": t, "options": ["Elderecho a", "b", "c", "d"]} for t in texts],
                "reserve": [],
            }
        ]
    }


def test_global_replace_word_boundaries_and_counts():
    bank = _bank(["Elderecho y Elderechos", "nada"])
    apply_global_replace(bank, [{"old": "Elderecho", "new": "El derecho", "word": True, "count": 4}])
    sec = bank["sections"][0]
    assert sec["statement"] == "El derecho del enunciado"
    assert sec["questions"][0]["text"] == "El derecho y Elderechos"  # «Elderechos» no es la palabra
    assert sec["questions"][1]["options"][0] == "El derecho a"
    with pytest.raises(FixError, match="no se aplica"):
        apply_global_replace(_bank(["x"]), [{"old": "inexistente", "new": "y"}])
    with pytest.raises(FixError, match="esperadas 9"):
        apply_global_replace(_bank(["x"]), [{"old": "Elderecho", "new": "El derecho", "count": 9}])


def test_answer_keys_merge_by_exercise():
    a = AnswerKey(sections={"p1": {"questions": {}, "reserve": {}}}, order=["p1"])
    b = AnswerKey(sections={"p2-s1": {"questions": {}, "reserve": {}}}, order=["p2-s1"])
    a.merge(b)
    assert a.order == ["p1", "p2-s1"]
    with pytest.raises(ValueError, match="repetidas"):
        a.merge(AnswerKey(sections={"p1": {"questions": {}, "reserve": {}}}, order=["p1"]))


def test_ocr_pdf_skips_configured_pages(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    """«ocr_skip_pages»: las portadas y páginas en blanco no pasan por Tesseract (caché sin palabras)."""
    from opotai import ocr

    doc = pymupdf.open()
    for _ in range(3):
        doc.new_page(width=595, height=842)
    pdf = tmp_path / "escaneo.pdf"
    doc.save(pdf)
    calls: list[str] = []

    def fake_words(png, dpi, lang, psm, tessdata):
        calls.append(png.name)
        return [[60.0, 93.0, 90.0, 100.0, "Texto", 95, "1.1.1"]]

    monkeypatch.setattr(ocr, "tesseract_version", lambda: "tesseract 5.3.0")
    monkeypatch.setattr(ocr, "find_tessdata", lambda lang: tmp_path)
    monkeypatch.setattr(ocr, "_tesseract_words", fake_words)
    data = ocr.ocr_pdf(pdf, dpis=(300,), skip_pages=frozenset({1, 3}))
    assert calls == ["p2-300.png"]
    assert data["skipped_pages"] == [1, 3]
    assert [len(p["words"]) for p in data["passes"][0]["pages"]] == [0, 1, 0]
    # sin páginas omitidas, la caché no cambia de formato (no aparece «skipped_pages»)
    calls.clear()
    full = ocr.ocr_pdf(pdf, dpis=(300,))
    assert "skipped_pages" not in full and len(calls) == 3
    assert list(full) == ["source_file", "source_sha256", "engine", "lang", "passes"]
    ocr._dump_cache(data)  # el volcado acepta la clave nueva


def test_tesseract_runs_single_threaded(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    """Tesseract se lanza con OMP_THREAD_LIMIT=1 (salvo que ya venga fijado en el entorno)."""
    import subprocess

    from opotai import ocr

    seen: dict = {}

    def fake_run(cmd, capture_output, text, check, env):
        seen.update(env)
        return subprocess.CompletedProcess(cmd, 0, stdout="level\tpage\n", stderr="")

    monkeypatch.delenv("OMP_THREAD_LIMIT", raising=False)
    monkeypatch.setattr(ocr.subprocess, "run", fake_run)
    assert ocr._tesseract_words(tmp_path / "p.png", 300, "spa", 6, tmp_path) == []
    assert seen["OMP_THREAD_LIMIT"] == "1"
    monkeypatch.setenv("OMP_THREAD_LIMIT", "4")
    ocr._tesseract_words(tmp_path / "p.png", 300, "spa", 6, tmp_path)
    assert seen["OMP_THREAD_LIMIT"] == "4"
