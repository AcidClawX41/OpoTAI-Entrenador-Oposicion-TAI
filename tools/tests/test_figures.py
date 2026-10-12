# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (C) 2026 Eric Valls Gramunt
"""Figuras: colocación según el orden de lectura, nombres estables, recorte ≥ 2× y transcripción."""

from __future__ import annotations

import io
from pathlib import Path

import pymupdf
import pytest
from PIL import Image, ImageDraw

from opotai.booklet import BookletConfig, parse_booklet
from opotai.figures import (
    ORIGINAL_LABEL,
    ORIGINAL_SCAN_LABEL,
    FigureError,
    FigureSource,
    QuestionFigures,
    check_figure_meta,
    check_svg,
    place_figures,
    stale_assets,
)
from opotai.pdfdoc import Figure
from opotai.report import bank_images
from opotai.textutil import plain_text

REG, BOLD = "helv", "hebo"
BANK = "tai-li-2099"


def _w(page, x, y, text, bold=False):
    page.insert_text((x, y), text, fontname=BOLD if bold else REG, fontsize=9)


def _png(w: int = 120, h: int = 60) -> bytes:
    """Imagen con un recuadro negro y margen blanco (para comprobar el recorte)."""
    img = Image.new("RGB", (w, h), (255, 255, 255))
    for x in range(10, w - 10):
        for y in (10, h - 11):
            img.putpixel((x, y), (0, 0, 0))
    for y in range(10, h - 10):
        for x in (10, w - 11):
            img.putpixel((x, y), (0, 0, 0))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


@pytest.fixture
def figures_pdf(tmp_path: Path) -> Path:
    doc = pymupdf.open()
    p = doc.new_page(width=595, height=842)
    png = _png()
    _w(p, 270, 40, "SUPUESTO I", bold=True)
    _w(p, 28, 60, "Enunciado antes de la figura:")
    p.insert_image(pymupdf.Rect(100, 70, 220, 130), stream=png)  # figura del enunciado
    _w(p, 28, 150, "Texto del enunciado tras la figura.")
    # Pregunta 1: figura en mitad del texto (en línea)
    _w(p, 28, 175, "1.", bold=True)
    _w(p, 50, 175, "Observe la figura:", bold=True)
    p.insert_image(pymupdf.Rect(100, 182, 220, 242), stream=png)
    _w(p, 50, 255, "¿Qué representa?", bold=True)
    for i, letter in enumerate("abcd"):
        _w(p, 50, 266 + 11 * i, f"{letter})")
        _w(p, 71, 266 + 11 * i, f"Respuesta {letter}")
    # Pregunta 2: figura al final del texto (media) y figura dentro de la opción b)
    _w(p, 28, 330, "2.", bold=True)
    _w(p, 50, 330, "Según el esquema siguiente:", bold=True)
    p.insert_image(pymupdf.Rect(100, 337, 220, 397), stream=png)
    _w(p, 50, 410, "a)")
    _w(p, 71, 410, "Uno")
    _w(p, 50, 421, "b)")
    p.insert_image(pymupdf.Rect(71, 425, 191, 485), stream=png)
    _w(p, 50, 497, "c)")
    _w(p, 71, 497, "Tres")
    _w(p, 50, 508, "d)")
    _w(p, 71, 508, "Cuatro")
    path = tmp_path / "cuadernillo.pdf"
    doc.save(path)
    return path


def _parse(path: Path):
    cfg = BookletConfig.from_dict(
        {"file": path.name, "markers": [{"pattern": "^SUPUESTO I$", "section": "p2-s1"}]}
    )
    return parse_booklet(cfg, {"p2-s1": "case"}, path)


def _bank_from(pb) -> tuple[dict, dict, dict]:
    sec = pb.sections["p2-s1"]
    doc = pb.doc
    questions, qfigs = [], {}
    for pq in sec.questions:
        qid = f"{BANK}-p2-s1-{pq.number:03d}"
        questions.append(
            {"id": qid, "number": pq.number, "text": pq.text, "options": list(pq.options), "media": []}
        )
        qfigs[qid] = QuestionFigures(
            section="p2-s1",
            number=pq.number,
            reserve=False,
            figures=[FigureSource(f, doc) for f in pq.figures],
            options=[[FigureSource(f, doc) for f in fl] for fl in pq.option_figures],
        )
    bank = {
        "id": BANK,
        "sections": [
            {
                "id": "p2-s1",
                "statement": pb.statement_markdown("p2-s1"),
                "media": [],
                "questions": questions,
                "reserve": [],
            }
        ],
    }
    secfigs = {"p2-s1": [FigureSource(f, doc) for f in sec.figures]}
    return bank, secfigs, qfigs


META = {
    "p2-s1-statement-1": {
        "alt": "Recuadro del enunciado",
        "transcription": ["| A | B |", "|---|---|", "| 1 | 2 |"],
    },
    "p2-s1-q001": {"alt": "Recuadro de la pregunta 1"},
    "p2-s1-q002": {"alt": "Esquema de la pregunta 2"},
    "p2-s1-q002-opt-b": {"alt": "Recuadro de la opción B"},
}


def test_reading_order_placeholders(figures_pdf: Path):
    pb = _parse(figures_pdf)
    st = pb.statement_markdown("p2-s1")
    assert st == "Enunciado antes de la figura:\n\n⟦FIG:0⟧\n\nTexto del enunciado tras la figura."
    q1, q2 = pb.sections["p2-s1"].questions
    assert q1.text == "Observe la figura:\n\n⟦FIG:0⟧\n\n¿Qué representa?"
    assert q1.options == ["Respuesta a", "Respuesta b", "Respuesta c", "Respuesta d"]
    assert q2.text == "Según el esquema siguiente:" and len(q2.figures) == 1
    assert q2.options[1] == "" and [len(f) for f in q2.option_figures] == [0, 1, 0, 0]
    # El texto sin marcadores es el del PDF (verificación independiente / A-B)
    assert (
        plain_text(st).split() == "Enunciado antes de la figura: Texto del enunciado tras la figura.".split()
    )


def test_place_figures_inline_media_and_options(figures_pdf: Path, tmp_path: Path):
    pb = _parse(figures_pdf)
    bank, secfigs, qfigs = _bank_from(pb)
    assets = tmp_path / "assets"
    (assets / BANK).mkdir(parents=True)
    (assets / BANK / "p2-s1-fig1.png").write_bytes(b"obsoleta")
    out = place_figures(bank, META, secfigs, qfigs, assets, write_assets=True)
    sec = bank["sections"][0]
    assert sec["statement"] == (
        "Enunciado antes de la figura:\n\n"
        f"![Recuadro del enunciado](assets/{BANK}/p2-s1-statement-1.png)\n\n"
        "| A | B |\n|---|---|\n| 1 | 2 |\n\nTexto del enunciado tras la figura."
    )
    q1, q2 = sec["questions"]
    assert q1["text"] == (
        "Observe la figura:\n\n"
        f"![Recuadro de la pregunta 1](assets/{BANK}/p2-s1-q001.png)\n\n¿Qué representa?"
    )
    assert q1["media"] == []
    assert q2["media"] == [{"path": f"assets/{BANK}/p2-s1-q002.png", "alt": "Esquema de la pregunta 2"}]
    assert q2["options"][1] == f"![Recuadro de la opción B](assets/{BANK}/p2-s1-q002-opt-b.png)"
    assert sorted(f.name for f in out.placed) == sorted(META)
    for f in out.placed:
        # ≥ 2× (120 pt de ancho → ≥ 240 px) y recorte ajustado: el margen blanco de la imagen
        # (10 px de 120 a escala) se reduce al margen fijo de 4 pt.
        assert f.info.dpi >= 144
        img = Image.open(assets / BANK / f"{f.name}.png")
        assert 0.6 * 120 * f.info.dpi / 72 < img.width < 120 * f.info.dpi / 72
    assert [p.name for p in stale_assets(BANK, assets, out)] == ["p2-s1-fig1.png"]


def test_place_figures_requires_metadata(figures_pdf: Path, tmp_path: Path):
    pb = _parse(figures_pdf)
    bank, secfigs, qfigs = _bank_from(pb)
    meta = {k: v for k, v in META.items() if k != "p2-s1-q002"}
    with pytest.raises(FigureError, match="p2-s1-q002"):
        place_figures(bank, meta, secfigs, qfigs, tmp_path, write_assets=False)
    bank, secfigs, qfigs = _bank_from(_parse(figures_pdf))
    with pytest.raises(FigureError, match="sin figura"):
        place_figures(
            bank, {**META, "p2-s1-q009": {"alt": "x"}}, secfigs, qfigs, tmp_path, write_assets=False
        )
    bank, secfigs, qfigs = _bank_from(_parse(figures_pdf))
    with pytest.raises(FigureError, match="corchetes"):
        place_figures(bank, {**META, "p2-s1-q001": {"alt": "a [b]"}}, secfigs, qfigs, tmp_path, False)


def test_check_mode_reports_missing_assets(figures_pdf: Path, tmp_path: Path):
    bank, secfigs, qfigs = _bank_from(_parse(figures_pdf))
    out = place_figures(bank, META, secfigs, qfigs, tmp_path / "vacío", write_assets=False)
    assert len(out.missing_assets) == 4


# --- Reconstrucciones vectoriales (``redraw``) ------------------------------------------------

SVG_OK = (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100" width="200" height="100">'
    '<rect x="1" y="1" width="198" height="98" rx="8" fill="#fff" stroke="#1f2937"/>'
    '<text x="100" y="55" font-size="14" text-anchor="middle">Tabla</text></svg>'
)


def _redraws(tmp_path: Path) -> Path:
    d = tmp_path / "redraws"
    (d / BANK).mkdir(parents=True)
    (d / BANK / "tabla.svg").write_text(SVG_OK, encoding="utf-8")
    (d / "tai-pi-2099").mkdir()
    (d / "tai-pi-2099" / "compartido.svg").write_text(SVG_OK, encoding="utf-8")
    return d


def test_redraw_goes_before_the_original(figures_pdf: Path, tmp_path: Path):
    redraws = _redraws(tmp_path)
    meta = {
        **META,
        "p2-s1-statement-1": {**META["p2-s1-statement-1"], "redraw": "tabla.svg"},
        "p2-s1-q002": {**META["p2-s1-q002"], "redraw": "tai-pi-2099/compartido.svg"},
    }
    assets = tmp_path / "assets"
    bank, secfigs, qfigs = _bank_from(_parse(figures_pdf))
    out = place_figures(bank, meta, secfigs, qfigs, assets, write_assets=True, redraws_dir=redraws)
    sec = bank["sections"][0]
    # PDF con capa de texto: «Original del cuadernillo» (no «escaneado»)
    assert sec["statement"] == (
        "Enunciado antes de la figura:\n\n"
        f"![Reconstrucción de OpoTAI: Recuadro del enunciado](assets/{BANK}/p2-s1-statement-1-redibujo.svg)"
        f"\n\n{ORIGINAL_LABEL}\n\n"
        f"![Recuadro del enunciado](assets/{BANK}/p2-s1-statement-1.png)\n\n"
        "| A | B |\n|---|---|\n| 1 | 2 |\n\nTexto del enunciado tras la figura."
    )
    q2 = sec["questions"][1]
    assert q2["media"] == [
        {
            "path": f"assets/{BANK}/p2-s1-q002-redibujo.svg",
            "alt": "Reconstrucción de OpoTAI: Esquema de la pregunta 2",
        },
        {"path": f"assets/{BANK}/p2-s1-q002.png", "alt": "Esquema de la pregunta 2"},
    ]
    assert (assets / BANK / "p2-s1-statement-1-redibujo.svg").read_text(encoding="utf-8") == SVG_OK
    assert {p.name: p.redraw for p in out.placed}["p2-s1-q001"] is None
    assert stale_assets(BANK, assets, out) == []
    # Una reconstrucción que ya no se usa es un fichero obsoleto.
    bank, secfigs, qfigs = _bank_from(_parse(figures_pdf))
    out = place_figures(bank, META, secfigs, qfigs, assets, write_assets=True, redraws_dir=redraws)
    assert [p.name for p in stale_assets(BANK, assets, out)] == [
        "p2-s1-q002-redibujo.svg",
        "p2-s1-statement-1-redibujo.svg",
    ]
    # Comprobación sin escribir: un SVG distinto en assets/ cuenta como pendiente.
    (assets / BANK / "p2-s1-q002-redibujo.svg").write_text(SVG_OK.replace("Tabla", "Otra"), encoding="utf-8")
    bank, secfigs, qfigs = _bank_from(_parse(figures_pdf))
    out = place_figures(bank, meta, secfigs, qfigs, assets, write_assets=False, redraws_dir=redraws)
    assert out.missing_assets == [f"assets/{BANK}/p2-s1-q002-redibujo.svg"]
    # El informe cuenta la pareja reconstrucción + original como una sola imagen.
    rows = bank_images(bank)
    assert [r[0].rsplit("/", 1)[-1] for r in rows] == [
        "p2-s1-statement-1.png",
        "p2-s1-q001.png",
        "p2-s1-q002-opt-b.png",
        "p2-s1-q002.png",
    ]
    assert rows[0][2] == (
        f"redibujo vectorial [`p2-s1-statement-1-redibujo.svg`](../../data/banks/assets/{BANK}/"
        "p2-s1-statement-1-redibujo.svg) + imagen (diagrama/esquema; descrito en el texto alternativo)"
    )
    assert rows[3][2].startswith("redibujo vectorial [`p2-s1-q002-redibujo.svg`]")
    assert rows[1][2] == "imagen (diagrama/esquema; descrito en el texto alternativo)"


@pytest.mark.parametrize(
    "svg, error",
    [
        (SVG_OK.replace("</svg>", "<script>alert(1)</script></svg>"), "script"),
        (SVG_OK.replace("</svg>", "<foreignObject/></svg>"), "foreignObject"),
        (SVG_OK.replace("</svg>", '<a href="https://example.org"><text>x</text></a></svg>'), "<a>"),
        (SVG_OK.replace("<rect ", '<rect filter="url(https://example.org/p.svg#x)" '), "url"),
        (SVG_OK.replace("<rect ", '<rect onclick="x()" '), "onclick"),
        (SVG_OK.replace("<text ", "<style>@import url(x.css);</style><text "), "@import"),
        (SVG_OK.replace(' viewBox="0 0 200 100"', ""), "viewBox"),
        (SVG_OK.replace(' width="200"', ""), "width"),
        (SVG_OK.replace('width="200"', 'width="100%"'), "width"),
        (SVG_OK.replace('font-size="14"', 'font-size="11"'), "11 px"),
        (SVG_OK.replace('font-size="14"', 'style="font-size: 12px"'), "12 px"),
        (SVG_OK.replace('<svg xmlns="http://www.w3.org/2000/svg"', "<svg"), "raíz"),
        ("<!DOCTYPE svg>" + SVG_OK, "DOCTYPE"),
        (SVG_OK[:-6], "mal formado"),
    ],
)
def test_check_svg_rejects_unsafe_or_unusable(svg: str, error: str):
    with pytest.raises(FigureError, match=error):
        check_svg(svg.encode("utf-8"), "prueba")


def test_check_svg_accepts_internal_references():
    svg = SVG_OK.replace(
        "<rect ",
        '<defs><marker id="m"><path d="M0 0L5 5"/></marker></defs><rect marker-end="url(#m)" ',
    )
    check_svg(svg.encode("utf-8"), "prueba")


@pytest.mark.parametrize(
    "meta, error",
    [
        ({"alt": "x", "redraw": "../fuera.svg"}, "redraw"),
        ({"alt": "x", "redraw": "/abs/x.svg"}, "redraw"),
        ({"alt": "x", "redraw": "x.png"}, "redraw"),
        ({"alt": "x", "enhance": True, "dpi": 300}, "dpi"),
        ({"alt": "x", "enhance": {"gamma": 9}}, "rango"),
        ({"alt": "x", "enhance": {"brillo": 1}}, "desconocidas"),
        ({"alt": "x", "erase": [[0, 0, 10, 10]]}, "erase"),
        ({"alt": "x", "enhance": True, "erase": [[10, 0, 0, 10]]}, "erase"),
        ({"alt": "x", "otra": 1}, "desconocidas"),
    ],
)
def test_figure_meta_validation(meta: dict, error: str):
    with pytest.raises(FigureError, match=error):
        check_figure_meta({"p2-s1-statement-1": meta})


def test_missing_redraw_source_is_an_error(figures_pdf: Path, tmp_path: Path):
    bank, secfigs, qfigs = _bank_from(_parse(figures_pdf))
    meta = {**META, "p2-s1-q001": {**META["p2-s1-q001"], "redraw": "no-existe.svg"}}
    with pytest.raises(FigureError, match="no existe la reconstrucción"):
        place_figures(bank, meta, secfigs, qfigs, tmp_path, False, redraws_dir=_redraws(tmp_path))


# --- Escaneos: resolución nativa y limpieza (``enhance``) ---------------------------------------

SCAN_W, SCAN_H = 400, 300  # píxeles de la página escaneada a 200 ppp (144 × 108 pt)


@pytest.fixture
def scan_pdf(tmp_path: Path) -> Path:
    """Página escaneada sin capa de texto: papel gris, recuadro gris, línea fina tenue y una mota."""
    img = Image.new("L", (SCAN_W, SCAN_H), 236)
    draw = ImageDraw.Draw(img)
    draw.rectangle((60, 60, 340, 240), outline=120, width=3)
    draw.line((60, 150, 340, 150), fill=205, width=1)
    img.putpixel((100, 100), 60)  # mota aislada dentro del recuadro
    draw.rectangle((0, 0, 399, 20), fill=40)  # texto vecino que invade el recorte por arriba
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    doc = pymupdf.open()
    page = doc.new_page(width=144, height=108)
    page.insert_image(page.rect, stream=buf.getvalue())
    path = tmp_path / "escaneo.pdf"
    doc.save(path)
    return path


def test_enhance_crops_scan_at_native_resolution(scan_pdf: Path, tmp_path: Path):
    doc = pymupdf.open(scan_pdf)
    px = 72 / 200  # pt por píxel del escaneo
    fig = Figure(page=0, x0=40 * px, y0=4 * px, x1=360 * px, y1=260 * px)
    redraws = _redraws(tmp_path)
    bank = {
        "id": BANK,
        "sections": [
            {
                "id": "p2-s1",
                "statement": "Antes\n\n⟦FIG:0⟧\n\nDespués",
                "media": [],
                "questions": [],
                "reserve": [],
            }
        ],
    }
    meta = {
        "p2-s1-statement-1": {
            "alt": "Recuadro escaneado",
            "enhance": True,
            "erase": [[0, 0, 144, 25 * px]],
            "redraw": "tabla.svg",
        }
    }
    assets = tmp_path / "assets"
    out = place_figures(
        bank, meta, {"p2-s1": [FigureSource(fig, doc)]}, {}, assets, True, redraws_dir=redraws
    )
    (placed,) = out.placed
    assert placed.enhanced and placed.info.dpi == 200
    # Página sin capa de texto: la línea dice «escaneado».
    assert (
        f"redibujo.svg)\n\n{ORIGINAL_SCAN_LABEL}\n\n![Recuadro escaneado]" in bank["sections"][0]["statement"]
    )
    img = Image.open(assets / BANK / "p2-s1-statement-1.png")
    assert img.mode == "L"
    # Sin remuestrear: el recuadro (281 px) más el margen de 4 pt (11 px) a cada lado; la franja
    # borrada («erase») no cuenta como contenido.
    assert img.size == (281 + 2 * 11, 181 + 2 * 11)

    def at(x: int, y: int) -> int:  # coordenadas del escaneo → recorte
        return img.getpixel((x - 60 + 11, y - 60 + 11))

    assert at(200, 200) == 255 and at(200, 90) == 255  # papel gris → blanco
    assert at(200, 61) < 40  # recuadro gris (120) → casi negro
    assert at(200, 150) < 190  # la línea fina y tenue (205) se conserva, más oscura
    assert at(100, 100) == 255  # mota aislada eliminada


def test_enhance_requires_a_scanned_image(figures_pdf: Path, tmp_path: Path):
    doc = pymupdf.open(figures_pdf)
    fig = Figure(page=0, x0=300, y0=600, x1=400, y1=700)  # zona sin imágenes
    bank = {
        "id": BANK,
        "sections": [{"id": "p2-s1", "statement": "⟦FIG:0⟧", "media": [], "questions": [], "reserve": []}],
    }
    meta = {"p2-s1-statement-1": {"alt": "x", "enhance": True}}
    with pytest.raises(FigureError, match="ninguna imagen escaneada"):
        place_figures(bank, meta, {"p2-s1": [FigureSource(fig, doc)]}, {}, tmp_path, True)
