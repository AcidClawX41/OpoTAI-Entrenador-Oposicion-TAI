# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (C) 2026 Eric Valls Gramunt
from opotai.textutil import (
    clean_inline,
    join_decision,
    join_lines,
    normalize_chars,
    normalize_for_match,
    protect_markdown,
    split_code,
    strip_option_label,
    wrap_markdown,
)


def test_join_lines_spaces_and_compounds():
    assert join_lines(["Primera línea", "segunda línea"]) == "Primera línea segunda línea"
    # guion de palabra compuesta: se conserva y se pega
    assert (
        join_lines(["arquitectura cliente-", "servidor"], hyphenation="keep")
        == "arquitectura cliente-servidor"
    )
    # partición silábica forzada
    assert join_lines(["la infor-", "mática"], hyphenation="remove") == "la informática"


def test_join_lines_auto_uses_vocabulary():
    vocab = {"informática"}
    assert join_lines(["la infor-", "mática"], vocabulary=vocab) == "la informática"
    # sin la palabra en el vocabulario se conserva el guion
    assert join_lines(["cliente-", "servidor"], vocabulary=vocab) == "cliente-servidor"
    # tras dígitos (normas ISO) se pega sin espacio
    assert join_decision("ISO/IEC 27001-", "2022") == "glue"
    assert join_decision("texto -", "otro") == "space"


def test_strip_option_label():
    assert strip_option_label("a) Derecho a la vida.") == ("A", "Derecho a la vida.")
    assert strip_option_label("(c) Algo") == ("C", "Algo")
    assert strip_option_label("Sin prefijo") == (None, "Sin prefijo")


def test_normalize_chars_and_clean():
    assert normalize_chars("eﬁciente y­bien") == "eficiente ybien"
    assert normalize_chars(" punto") == "• punto"
    assert clean_inline("  uno   dos \n tres ") == "uno dos tres"


def test_normalize_for_match_ignores_quotes_and_accents():
    assert normalize_for_match("“Árbol”  B-Tree") == normalize_for_match('"arbol" b tree')


def test_protect_markdown_wraps_html_and_is_idempotent():
    s = 'Elemento <head> y <input type="email" maxlength="100">; a<c y b>d; x<5 y z>3.'
    out = protect_markdown(s)
    assert out == 'Elemento `<head>` y `<input type="email" maxlength="100">`; a\\<c y b>d; x<5 y z>3.'
    assert protect_markdown(out) == out
    assert (
        protect_markdown("usa <b> y </p>; <?xml version='1.0'?>")
        == "usa `<b>` y `</p>`; `<?xml version='1.0'?>`"
    )
    code = "Texto\n\n```html\n<p>hola</p>\n```"
    assert protect_markdown(code) == code


def test_split_code():
    parts = split_code("a `b` c\n\n```\nx\n```\nd")
    assert ("`b`", True) in parts
    assert any(is_code and chunk.startswith("```") for chunk, is_code in parts)


def test_wrap_markdown_bold_runs():
    segs = [("El sistema, en su parte ", False), ("frontend", True), (", permitirá", False)]
    assert wrap_markdown(segs) == "El sistema, en su parte **frontend**, permitirá"
    # espacios dentro de la negrita salen fuera de los marcadores
    assert wrap_markdown([("a ", False), (" b ", True), ("c", False)]) == "a  **b** c"
    # negritas contiguas separadas por espacio se funden
    assert wrap_markdown([("x", True), (" ", False), ("y", True)]) == "**x y**"
