# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (C) 2026 Eric Valls Gramunt
"""Diagramas de la teoría: seguridad del SVG, normalización de Mermaid y referencias."""

from __future__ import annotations

import pytest

from opotai import diagrams
from opotai.diagrams import DiagramError, check_diagram_svg, check_theory_images

GOOD = (
    b'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60" width="200" height="60">'
    b'<text x="10" y="30" font-size="15">Capas</text></svg>'
)


def test_safe_svg_passes():
    check_diagram_svg(GOOD, "ok.svg")


@pytest.mark.parametrize(
    "bad",
    [
        GOOD.replace(b"</svg>", b"<script>alert(1)</script></svg>"),
        GOOD.replace(b"<text", b'<text onclick="x()"'),
        GOOD.replace(b"</svg>", b"<foreignObject><div/></foreignObject></svg>"),
        GOOD.replace(b"</svg>", b'<use href="https://ejemplo.es/a.svg#x"/></svg>'),
        GOOD.replace(b"</svg>", b"<style>@import url(x.css);</style></svg>"),
        GOOD.replace(b' width="200" height="60"', b""),
        GOOD.replace(b'font-size="15"', b'font-size="9"'),
        GOOD.replace(b"</svg>", b"<!--" + b"x" * 160_000 + b"--></svg>"),
        GOOD.replace(b">Capas<", b">&lt;b&gt;Capas&lt;/b&gt;<"),
    ],
)
def test_unsafe_svg_is_rejected(bad: bytes):
    with pytest.raises(DiagramError):
        check_diagram_svg(bad, "malo.svg")


def test_normalize_mermaid_sets_intrinsic_size():
    raw = (
        b'<svg id="my-svg" width="100%" xmlns="http://www.w3.org/2000/svg" '
        b'xmlns:xlink="http://www.w3.org/1999/xlink" style="max-width: 450.5px;" '
        b'viewBox="-50 -10 450.5 259.2"><text font-size="16" x="0" y="0">A</text></svg>'
    )
    out = diagrams._normalize_mermaid(raw, "d-IV-7-x").decode()
    assert 'viewBox="-50 -10 451 260"' in out
    assert 'width="451"' in out and 'height="260"' in out
    assert "max-width" not in out and "xmlns:xlink" not in out
    assert 'id="d-IV-7-x"' in out
    check_diagram_svg(out.encode(), "normalizado.svg")


def test_theory_image_references(tmp_path):
    (tmp_path / "diagramas").mkdir()
    (tmp_path / "diagramas" / "IV.7-capas.svg").write_bytes(GOOD)
    (tmp_path / "IV.7.md").write_text(
        "# IV.7\n\n![Capas OSI frente a TCP/IP](diagramas/IV.7-capas.svg)\n\n"
        "![Falta este diagrama](diagramas/IV.7-no.svg)\n\n![corto](diagramas/IV.7-capas.svg)\n\n"
        "![Imagen externa no permitida](https://ejemplo.es/a.png)\n\n"
        "```text\n![En código no cuenta](diagramas/IV.7-zz.svg)\n```\n",
        encoding="utf-8",
    )
    errors, _warnings, used = check_theory_images(tmp_path)
    assert used == {"IV.7-capas.svg", "IV.7-no.svg"}
    joined = "\n".join(errors)
    assert "no existe teoria/diagramas/IV.7-no.svg" in joined
    assert "texto alternativo" in joined
    assert "https://ejemplo.es/a.png" in joined
    assert "IV.7-zz" not in joined
    assert len(errors) == 3


def test_sources_follow_naming(tmp_path):
    (tmp_path / "IV.7").mkdir()
    (tmp_path / "IV.7" / "osi-tcpip.svg").write_bytes(GOOD)
    (tmp_path / "IV.7" / "tcp.mmd").write_text("sequenceDiagram\n  A->>B: SYN\n", encoding="utf-8")
    found = diagrams.discover(tmp_path)
    assert [(s.out_name, s.kind) for s in found] == [
        ("IV.7-osi-tcpip.svg", "svg"),
        ("IV.7-tcp.svg", "mermaid"),
    ]
    (tmp_path / "IV.7" / "Mal Nombre.svg").write_bytes(GOOD)
    with pytest.raises(DiagramError):
        diagrams.discover(tmp_path)


def test_repository_diagrams_are_safe_and_referenced():
    """Las salidas versionadas son seguras y las imágenes de la teoría existen (como --check)."""
    errors, _warnings, _used = diagrams.check_theory_images()
    assert errors == []
    for svg in sorted(diagrams.OUT_DIR.glob("*.svg")):
        check_diagram_svg(svg.read_bytes(), svg.name)
