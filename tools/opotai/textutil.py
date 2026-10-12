# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (C) 2026 Eric Valls Gramunt
"""Utilidades de limpieza de texto extraído de PDF (independientes de PyMuPDF)."""

from __future__ import annotations

import re
import unicodedata
from collections.abc import Iterable

OPTION_LABEL_RE = re.compile(r"^\s*\(?([a-dA-D])\)\s*")
QUESTION_NUMBER_RE = re.compile(r"^\s*(\d{1,3})\s*[.)-]\s*")

_LIGATURES = {
    "ﬀ": "ff",
    "ﬁ": "fi",
    "ﬂ": "fl",
    "ﬃ": "ffi",
    "ﬄ": "ffl",
    "ﬅ": "st",
    "ﬆ": "st",
}
# Caracteres de fuentes Symbol/Wingdings que aparecen como viñetas en Word.
_BULLETS = {"": "•", "": "▪", "": "➢", "": "❖", "": "✓", "": "-"}
_SPACES = {" ": " ", " ": " ", " ": " ", " ": " ", " ": " ", "​": "", "﻿": ""}

LOWER_START_RE = re.compile(r"^[a-záéíóúüñç]")
WORD_CHARS = "A-Za-zÁÉÍÓÚÜÑáéíóúüñÇç"
HYPHEN_END_RE = re.compile(rf"([{WORD_CHARS}]+)-$")
WORD_START_RE = re.compile(rf"^([{WORD_CHARS}]+)")


def normalize_chars(text: str) -> str:
    """Normaliza caracteres problemáticos sin alterar el contenido (NFC, ligaduras, espacios raros)."""
    text = unicodedata.normalize("NFC", text)
    for table in (_LIGATURES, _BULLETS, _SPACES):
        for k, v in table.items():
            if k in text:
                text = text.replace(k, v)
    text = text.replace("­", "")  # guion blando
    text = text.replace("\t", " ")
    # Otros caracteres de uso privado: se eliminan (no son texto real).
    text = "".join(ch for ch in text if not ("" <= ch <= ""))
    return text


def collapse_spaces(text: str) -> str:
    """Colapsa espacios múltiples (no toca saltos de línea) y recorta extremos."""
    text = re.sub(r"[ ]{2,}", " ", text)
    text = re.sub(r" *\n *", "\n", text)
    return text.strip()


def clean_inline(text: str) -> str:
    """Limpieza estándar para enunciados y opciones (una sola línea lógica)."""
    return collapse_spaces(normalize_chars(text).replace("\n", " "))


def strip_option_label(text: str) -> tuple[str | None, str]:
    """Quita el prefijo ``a)``/``(b)`` de una opción. Devuelve (letra, resto)."""
    m = OPTION_LABEL_RE.match(text)
    if not m:
        return None, text
    return m.group(1).upper(), text[m.end() :]


def join_decision(prev: str, nxt: str, vocabulary: set[str] | None = None, hyphenation: str = "auto") -> str:
    """Cómo unir el final de una línea con el principio de la siguiente.

    Devuelve ``"space"`` (separar con espacio), ``"glue"`` (pegar conservando el guion final) o
    ``"drop_hyphen"`` (pegar quitando el guion final: partición silábica).

    * ``hyphenation="keep"``: una línea que acaba en ``-`` se pega y conserva el guion
      (palabras compuestas: ``cliente-servidor``).
    * ``"remove"``: se quita el guion (``infor-`` + ``mática``).
    * ``"auto"``: se quita solo si la palabra unida aparece en ``vocabulary`` y la variante con
      guion no; en caso contrario se conserva.
    """
    prev = prev.rstrip()
    nxt = nxt.lstrip()
    if not prev or not nxt:
        return "space"
    m = HYPHEN_END_RE.search(prev)
    if m and LOWER_START_RE.match(nxt):
        nm = WORD_START_RE.match(nxt)
        tail = nm.group(1) if nm else ""
        return "drop_hyphen" if _remove_hyphen(m.group(1), tail, vocabulary, hyphenation) else "glue"
    if prev.endswith("-") and not prev.endswith(" -") and not prev.endswith("--"):
        # guion tras dígito/símbolo (p. ej. "ISO/IEC 27001-" + "2022"): sin espacio
        return "glue"
    return "space"


def join_lines(lines: Iterable[str], vocabulary: set[str] | None = None, hyphenation: str = "auto") -> str:
    """Une líneas de un mismo párrafo (ver :func:`join_decision`)."""
    out = ""
    for raw in lines:
        line = raw.strip()
        if not line:
            continue
        if not out:
            out = line
            continue
        how = join_decision(out, line, vocabulary, hyphenation)
        if how == "drop_hyphen":
            out = out[:-1] + line
        elif how == "glue":
            out = out + line
        else:
            out = out + " " + line
    return out


def _remove_hyphen(head: str, tail: str, vocabulary: set[str] | None, mode: str) -> bool:
    if mode == "keep":
        return False
    if mode == "remove":
        return True
    if not vocabulary or not tail:
        return False
    joined = (head + tail).lower()
    hyph = (head + "-" + tail).lower()
    return joined in vocabulary and hyph not in vocabulary


def build_vocabulary(texts: Iterable[str]) -> set[str]:
    vocab: set[str] = set()
    for t in texts:
        for w in re.findall(rf"[{WORD_CHARS}][{WORD_CHARS}-]*[{WORD_CHARS}]", t):
            vocab.add(w.lower())
    return vocab


# Marcador provisional de figura que deja el lector de cuadernillos (``booklet``) en el punto
# exacto del texto donde aparece; ``parse_exam`` lo sustituye por la imagen en Markdown.
FIGURE_PLACEHOLDER_RE = re.compile(r"⟦FIG:(\d+)⟧")
# Imagen Markdown en línea: ``![alt](ruta)`` o ``![alt](ruta "título")`` (alt con corchetes
# equilibrados de un nivel).
IMAGE_MD_RE = re.compile(r"!\[((?:[^\[\]\n]|\[[^\[\]\n]*\])*)\]\(\s*([^\s)]*)(?:\s+\"[^\"]*\")?\s*\)")


def figure_placeholder(index: int) -> str:
    """Marcador de la figura ``index``; ``parse_exam`` lo sustituye por la imagen."""
    return f"⟦FIG:{index}⟧"


def strip_figure_refs(md: str) -> str:
    """Quita marcadores de figura e imágenes en línea (no son texto del PDF)."""
    return IMAGE_MD_RE.sub(" ", FIGURE_PLACEHOLDER_RE.sub(" ", md))


def plain_text(md: str) -> str:
    """Quita el marcado Markdown añadido por las herramientas (vallas de código, `, **, \\<, marcas,
    imágenes y marcadores de figura)."""
    s = strip_figure_refs(md)
    s = re.sub(r"```[A-Za-z0-9+#-]*", " ", s)
    s = s.replace("\\<", "<")
    return s.replace("`", "").replace("**", "")


def normalize_for_match(text: str) -> str:
    """Clave de comparación aproximada (para cruzar modelos A/B o detectar duplicados)."""
    t = normalize_chars(text).lower()
    t = unicodedata.normalize("NFKD", t)
    t = "".join(ch for ch in t if not unicodedata.combining(ch))
    t = re.sub(r"[“”«»\"'`´‘’]", "", t)
    t = re.sub(r"[^a-z0-9]+", " ", t)
    return t.strip()


FENCE_RE = re.compile(r"(?ms)^```.*?^```[ \t]*$")
CODE_SPAN_RE = re.compile(r"(`+)(?:(?!\1).)+?\1", re.S)
HTML_TAG_RE = re.compile(
    r"(?<!\\)(?:<!--.*?-->|<\?.*?\?>|<![A-Za-z][^<>]*>|</?([A-Za-z][A-Za-z0-9:-]*)(?:\s+[^<>]*?)?\s*/?>)",
    re.S,
)


def split_code(text: str) -> list[tuple[str, bool]]:
    """Divide un Markdown en trozos (texto, es_código) respetando bloques y código en línea."""
    out: list[tuple[str, bool]] = []
    pos = 0
    for m in FENCE_RE.finditer(text):
        if m.start() > pos:
            out.extend(_split_inline_code(text[pos : m.start()]))
        out.append((m.group(0), True))
        pos = m.end()
    if pos < len(text):
        out.extend(_split_inline_code(text[pos:]))
    return out


def _split_inline_code(text: str) -> list[tuple[str, bool]]:
    out: list[tuple[str, bool]] = []
    pos = 0
    for m in CODE_SPAN_RE.finditer(text):
        if m.start() > pos:
            out.append((text[pos : m.start()], False))
        out.append((m.group(0), True))
        pos = m.end()
    if pos < len(text):
        out.append((text[pos:], False))
    return out


def _protect_tag(m: re.Match) -> str:
    tag = m.group(0)
    name = m.group(1) or ""
    bare = tag[1:-1].strip("/ ") == name  # sin atributos: <p>, </b>
    looks_html = (
        tag.startswith(("<!", "</", "<?")) or tag.endswith("/>") or "=" in tag or len(name) >= 2 or bare
    )
    if looks_html:
        return "`" + tag + "`"  # etiqueta real (<head>, <input …>): código en línea
    return "\\" + tag  # pseudoetiqueta (a<c y b>d): se escapa el «<»


def protect_markdown(text: str) -> str:
    """Evita que etiquetas HTML literales (``<head>``, ``<input …>``) se interpreten como HTML.

    Las etiquetas reales se envuelven en código en línea y las pseudoetiquetas de una letra
    (``a<c y b>d``) se escapan con ``\\<``. Es idempotente (no toca lo que ya es código).
    """
    if "<" not in text:
        return text
    parts = []
    for chunk, is_code in split_code(text):
        if is_code:
            parts.append(chunk)
            continue
        parts.append(HTML_TAG_RE.sub(_protect_tag, chunk))
    return "".join(parts)


def wrap_markdown(segments: list[tuple[str, bool]]) -> str:
    """Convierte segmentos (texto, negrita) en Markdown con ``**`` sin dejar espacios dentro."""
    merged: list[list] = []
    for text, bold in segments:
        if not text:
            continue
        if merged and merged[-1][1] == bold:
            merged[-1][0] += text
        else:
            merged.append([text, bold])
    out = []
    for text, bold in merged:
        if not bold or not text.strip():
            out.append(text)
            continue
        lead = text[: len(text) - len(text.lstrip())]
        trail = text[len(text.rstrip()) :]
        core = text.strip()
        out.append(f"{lead}**{core}**{trail}")
    md = "".join(out)
    # "**a** **b**" -> "**a b**"
    md = re.sub(r"\*\*(\s+)\*\*", r"\1", md)
    return md
