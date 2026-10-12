# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (C) 2026 Eric Valls Gramunt
"""Lectura de cuadernillos de examen (PDF con capa de texto) a una estructura intermedia.

El lector recorre las filas visuales (``pdfdoc.Row``) en orden de lectura con una máquina de
estados configurable (ver ``exam_configs/*.json``):

* **Marcadores** (``markers``): filas que cambian de sección (``PRIMERA PARTE``, ``SUPUESTO I``)
  o activan la reserva (``Preguntas de reserva``).
* **Inicio de pregunta**: fila que empieza por ``N.`` en el margen izquierdo (``question_x_max``),
  opcionalmente en negrita, con ``N`` = siguiente número esperado en esa sección/reserva.
* **Opciones**: spans que empiezan por ``a)``…``d)`` (en orden) al principio de la fila o tras un
  hueco horizontal (opciones a dos columnas). Las líneas de continuación se asignan a la opción
  de su columna.
* **Enunciado del supuesto**: filas de una sección antes de su primera pregunta, agrupadas en
  párrafos por separación vertical, con la negrita convertida a ``**Markdown**``.
* **Figuras**: imágenes incrustadas (o regiones configuradas) que se recortan a PNG y se colocan
  según el orden de lectura: en línea en el enunciado del supuesto (marcador ``⟦FIG:n⟧``), en el
  texto de la pregunta, como ``media`` de la pregunta (tras su texto) o dentro de una opción.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path

from .pdfdoc import Figure, PageFilter, Row, Span, extract_elements, join_spans
from .textutil import (
    OPTION_LABEL_RE,
    QUESTION_NUMBER_RE,
    build_vocabulary,
    clean_inline,
    figure_placeholder,
    join_decision,
    join_lines,
    normalize_chars,
    wrap_markdown,
)

LETTERS = "abcd"
BULLET_RE = re.compile(r"^\s*([•●○◦▪■□►▶➢➤❖✓✔·\-–—]|o(?=\s))\s+")
# OCR: etiquetas de opción con lecturas erróneas habituales («e)» o «©)» por «c)», «a}»…).
OCR_LABEL_RE = re.compile(r"^\s*[\(\[]?([^\s\(\)\[\]\{\}]{1,2})[\)\}\]]\s*")
# Palabra suelta de 1-2 letras que el OCR ha leído en lugar de una etiqueta («Ad» por «c)»).
OCR_BARE_LABEL_RE = re.compile(r"^\s*([A-Za-z]{1,2})[.,;:]?\s*$")


@dataclass
class Marker:
    pattern: re.Pattern
    section: str | None = None
    reserve: bool | None = None


@dataclass
class BookletConfig:
    file: str
    markers: list[Marker]
    ignore: list[re.Pattern] = field(default_factory=list)
    top: float | None = None
    bottom: float | None = None
    skip_pages: set[int] = field(default_factory=set)  # 1-based
    start_section: str | None = None
    question_x_max: float = 45.0
    question_bold: bool | None = True
    label_gap: float = 8.0
    column_tolerance: float = 6.0
    para_gap: float = 2.5
    hyphenation: str = "auto"
    statement_bold: bool = True
    figures: list[dict] = field(default_factory=list)  # regiones vectoriales configuradas
    ignore_images: list[dict] = field(default_factory=list)  # [{"page": n, "index": i}]
    statement_sections: set[str] | None = None  # secciones que admiten enunciado (None = las "case")
    # Cuadernillo escaneado: el texto sale de la caché OCR (``ocr.py``) y la detección de
    # números de pregunta y etiquetas de opción tolera las lecturas erróneas típicas del OCR.
    ocr: bool = False
    row_tolerance: float = 2.5
    # OCR: correcciones de palabras sueltas que rompen la estructura (números de pregunta,
    # etiquetas): [{"page": 3, "old": "bs", "new": "1.", "y": 86.5}] ("y" opcional, ±4 pt).
    ocr_word_fixes: list[dict] = field(default_factory=list)
    # Regiones cuyo texto se descarta (p. ej. listados de código numerados que se transcriben a
    # mano en el enunciado): [{"page": 2, "rect": [x0, y0, x1, y1], "note": "…"}] (página 1-based).
    exclude: list[dict] = field(default_factory=list)

    @classmethod
    def from_dict(cls, d: dict) -> BookletConfig:
        ocr = bool(d.get("ocr", False))
        return cls(
            file=d["file"],
            markers=[
                Marker(re.compile(m["pattern"]), m.get("section"), m.get("reserve")) for m in d["markers"]
            ],
            ignore=[re.compile(p) for p in d.get("ignore", [])],
            top=d.get("top"),
            bottom=d.get("bottom"),
            skip_pages=set(d.get("skip_pages", [])),
            start_section=d.get("start_section"),
            question_x_max=d.get("question_x_max", 45.0),
            question_bold=d.get("question_bold", None if ocr else True),
            label_gap=d.get("label_gap", 8.0),
            column_tolerance=d.get("column_tolerance", 6.0),
            para_gap=d.get("para_gap", 2.5),
            hyphenation=d.get("hyphenation", "auto"),
            statement_bold=d.get("statement_bold", True),
            figures=d.get("figures", []),
            ignore_images=d.get("ignore_images", []),
            statement_sections=set(d["statement_sections"]) if "statement_sections" in d else None,
            ocr=ocr,
            row_tolerance=d.get("row_tolerance", 4.0 if ocr else 2.5),
            ocr_word_fixes=d.get("ocr_word_fixes", []),
            exclude=d.get("exclude", []),
        )


@dataclass
class OptionBuf:
    letter: str
    label_x0: float
    lines: list[tuple[float, str]] = field(default_factory=list)  # (x0, texto) por fila
    figures: list[Figure] = field(default_factory=list)


@dataclass
class QuestionBuf:
    section: str
    reserve: bool
    number: int
    page: int
    y0: float
    text_lines: list[tuple[float, str]] = field(default_factory=list)  # (x0, texto) por fila
    options: list[OptionBuf] = field(default_factory=list)
    last_row_options: list[OptionBuf] = field(default_factory=list)
    figures: list[Figure] = field(default_factory=list)
    _cur_line: dict[int, list[str]] = field(default_factory=dict)  # por fila: destino -> trozos

    def next_letter(self) -> str | None:
        n = len(self.options)
        return LETTERS[n] if n < len(LETTERS) else None


@dataclass
class StatementPara:
    segments: list[tuple[str, bool]] = field(default_factory=list)
    lines_text: list[str] = field(default_factory=list)
    bullet: bool = False
    x0: float = 0.0
    figure_index: int | None = None  # párrafo que es una figura (índice en ParsedSection.figures)


@dataclass
class ParsedQuestion:
    section: str
    reserve: bool
    number: int
    text: str
    options: list[str]
    figures: list[Figure]
    page: int
    # Filas originales (x0, texto), para reconstruir bloques de código con sangría.
    text_rows: list[tuple[float, str]] = field(default_factory=list)
    option_rows: list[list[tuple[float, str]]] = field(default_factory=list)
    option_figures: list[list[Figure]] = field(default_factory=list)  # figuras dentro de cada opción


@dataclass
class Interlude:
    """Texto del supuesto situado entre preguntas (contexto para las siguientes)."""

    reserve: bool
    before: int  # número de la pregunta que sigue al texto
    paras: list[StatementPara] = field(default_factory=list)


@dataclass
class ParsedSection:
    id: str
    statement_paras: list[StatementPara] = field(default_factory=list)
    interludes: list[Interlude] = field(default_factory=list)
    figures: list[Figure] = field(default_factory=list)
    questions: list[ParsedQuestion] = field(default_factory=list)
    reserve: list[ParsedQuestion] = field(default_factory=list)


@dataclass
class ParsedBooklet:
    sections: dict[str, ParsedSection]
    order: list[str]
    warnings: list[str]
    doc: object  # pymupdf.Document (para recortar figuras)
    vocabulary: set[str]
    hyphenation: str = "auto"

    def paras_markdown(self, paras: list[StatementPara]) -> str:
        mds = [
            m
            for m in (
                figure_placeholder(p.figure_index)
                if p.figure_index is not None
                else statement_para_markdown(p, self.vocabulary, self.hyphenation)
                for p in paras
            )
            if m
        ]
        out = []
        for i, md in enumerate(mds):
            if i > 0:
                out.append("\n" if (sec_bullet(mds[i - 1]) and sec_bullet(md)) else "\n\n")
            out.append(md)
        return "".join(out).strip()

    def statement_markdown(self, sid: str) -> str | None:
        """Enunciado completo: texto inicial + textos intercalados entre preguntas (marcados)."""
        sec = self.sections.get(sid)
        if not sec or not (sec.statement_paras or sec.interludes):
            return None
        parts = []
        main = self.paras_markdown(sec.statement_paras)
        if main:
            parts.append(main)
        for it in sec.interludes:
            body = self.paras_markdown(it.paras)
            if not body:
                continue
            where = f"la pregunta de reserva {it.before}" if it.reserve else f"la pregunta {it.before}"
            parts.append(f"*Texto que precede a {where}:*\n\n{body}")
        return "\n\n".join(parts).strip() or None


def sec_bullet(md: str) -> bool:
    return md.startswith("- ")


def statement_para_markdown(p: StatementPara, vocabulary: set[str], hyphenation: str = "auto") -> str:
    """Une las líneas de un párrafo de enunciado conservando la negrita como ``**…**``."""
    segs: list[tuple[str, bool]] = []
    for i, (text, bold) in enumerate(p.segments):
        if text != "\n":
            segs.append((text, bold))
            continue
        # salto de línea del PDF: espacio, o pegar (guion final)
        prev = "".join(t for t, _ in segs)
        nxt = next((t for t, _ in p.segments[i + 1 :] if t != "\n"), "")
        how = join_decision(prev, nxt, vocabulary, hyphenation)
        if how == "space":
            segs.append((" ", segs[-1][1] if segs else False))
        elif how == "drop_hyphen":
            segs = _drop_trailing_hyphen(segs)
        else:
            segs = _rstrip_segments(segs)
    md = wrap_markdown([(normalize_chars(t), b) for t, b in segs])
    md = clean_inline(md)
    if p.bullet:
        md = "- " + md
    return md


def _rstrip_segments(segs: list[tuple[str, bool]]) -> list[tuple[str, bool]]:
    while segs and not segs[-1][0].strip():
        segs = segs[:-1]
    if segs:
        t, b = segs[-1]
        segs[-1] = (t.rstrip(), b)
    return segs


def _drop_trailing_hyphen(segs: list[tuple[str, bool]]) -> list[tuple[str, bool]]:
    segs = _rstrip_segments(segs)
    if segs and segs[-1][0].endswith("-"):
        t, b = segs[-1]
        segs[-1] = (t[:-1], b)
    return segs


class BookletParser:
    def __init__(
        self,
        cfg: BookletConfig,
        sections_kind: dict[str, str],
        pdf_path: Path,
        spans_override: dict[int, list[Span]] | None = None,
    ):
        self.spans_override = spans_override
        self.cfg = cfg
        self.kinds = sections_kind
        self.pdf_path = pdf_path
        self.warnings: list[str] = []
        self.sections: dict[str, ParsedSection] = {}
        self.order: list[str] = []
        self.section: str | None = cfg.start_section
        self.reserve = False
        self.q: QuestionBuf | None = None
        self.last_stmt_row: Row | None = None
        self.last_stmt_target: object = None
        if self.section:
            self._ensure_section(self.section)

    # ------------------------------------------------------------------ utilidades
    def _ensure_section(self, sid: str) -> ParsedSection:
        if sid not in self.sections:
            self.sections[sid] = ParsedSection(id=sid)
            self.order.append(sid)
        return self.sections[sid]

    def _expected_number(self) -> int:
        sec = self._ensure_section(self.section) if self.section else None
        if sec is None:
            return 1
        lst = sec.reserve if self.reserve else sec.questions
        n = len(lst) + 1
        if self.q is not None and self.q.section == self.section and self.q.reserve == self.reserve:
            n = self.q.number + 1
        return n

    def _statement_allowed(self) -> bool:
        if self.section is None:
            return False
        if self.cfg.statement_sections is not None:
            return self.section in self.cfg.statement_sections
        return self.kinds.get(self.section) == "case"

    def _warn(self, msg: str) -> None:
        self.warnings.append(msg)

    # ------------------------------------------------------------------ bucle principal
    def parse(self) -> ParsedBooklet:
        exclude_rects: dict[int, list[tuple[float, float, float, float]]] = {}
        for ex in self.cfg.exclude:
            x0, y0, x1, y1 = ex["rect"]
            exclude_rects.setdefault(ex["page"] - 1, []).append((x0, y0, x1, y1))
        flt = PageFilter(
            top=self.cfg.top,
            bottom=self.cfg.bottom,
            ignore_patterns=self.cfg.ignore,
            exclude_rects=exclude_rects,
            skip_pages={p - 1 for p in self.cfg.skip_pages},
        )
        extra = []
        for f in self.cfg.figures:
            x0, y0, x1, y1 = f["rect"]
            extra.append(
                Figure(
                    page=f["page"] - 1,
                    x0=x0,
                    y0=y0,
                    x1=x1,
                    y1=y1,
                    name=f.get("name"),
                    alt=f.get("alt", ""),
                    attach=f.get("attach"),
                )
            )
        spans_override = self.spans_override
        if self.cfg.ocr and spans_override is None:
            from .ocr import load_spans

            spans_override = load_spans(self.pdf_path.parent.name, self.cfg.file, self.pdf_path)
            apply_ocr_word_fixes(spans_override, self.cfg.ocr_word_fixes)
        doc, elements, dropped = extract_elements(
            self.pdf_path,
            flt,
            extra_figures=extra,
            detect_images=not self.cfg.ocr,  # en un escaneo, toda la página es una imagen
            spans_override=spans_override,
            row_tolerance=self.cfg.row_tolerance,
        )
        for d in dropped:
            self._warn(f"fila descartada por estar fuera de [top, bottom]: {d}")
        ignore_imgs = {(d["page"] - 1, d["index"]) for d in self.cfg.ignore_images}
        img_counter: dict[int, int] = {}
        all_text: list[str] = []
        for el in elements:
            if isinstance(el, Row):
                all_text.append(el.text)
        self.vocabulary = build_vocabulary(all_text)
        for el in elements:
            if isinstance(el, Figure):
                idx = img_counter.get(el.page, 0) + 1
                img_counter[el.page] = idx
                if (el.page, idx) in ignore_imgs:
                    continue
                self._on_figure(el)
            else:
                self._on_row(el)
        self._close_question()
        return ParsedBooklet(
            sections=self.sections,
            order=self.order,
            warnings=self.warnings,
            doc=doc,
            vocabulary=self.vocabulary,
            hyphenation=self.cfg.hyphenation,
        )

    def _on_figure(self, fig: Figure) -> None:
        """Coloca la figura donde aparece en el orden de lectura.

        * Sin pregunta en curso (enunciado del supuesto o texto intercalado): figura en línea en
          ese punto del ``statement`` (marcador ``⟦FIG:n⟧``).
        * Dentro de una pregunta antes de sus opciones: en línea en el texto si le sigue más
          texto de la pregunta; si no, ``media`` de la pregunta (se muestra tras el enunciado).
        * Tras la etiqueta de una opción: en línea dentro de esa opción.
        * ``attach`` en la configuración fuerza el destino (``"section"`` o un id de pregunta).
        """
        if self.section is None:
            self._warn(f"figura en p{fig.page + 1} fuera de cualquier sección: se ignora")
            return
        sec = self._ensure_section(self.section)
        if fig.attach and fig.attach != "section":
            fig.extra["target"] = fig.attach
            sec.figures.append(fig)
            return
        if fig.attach != "section" and self.q is None and not self._statement_allowed():
            self._warn(
                f"figura en p{fig.page + 1} entre preguntas de una sección sin enunciado: se adjunta a "
                "la sección (configura «attach» si pertenece a una pregunta)"
            )
        if fig.attach == "section" or self.q is None:
            if self.q is not None:
                self._close_question()
            sec.figures.append(fig)
            para = StatementPara(figure_index=len(sec.figures) - 1)
            if sec.questions or sec.reserve:
                before = self._expected_number()
                if not sec.interludes or (sec.interludes[-1].reserve, sec.interludes[-1].before) != (
                    self.reserve,
                    before,
                ):
                    sec.interludes.append(Interlude(reserve=self.reserve, before=before))
                sec.interludes[-1].paras.append(para)
                self.last_stmt_target = sec.interludes[-1]
            else:
                sec.statement_paras.append(para)
                self.last_stmt_target = sec
            self.last_stmt_row = None
            return
        if self.q.options:
            if len(self.q.options) == len(LETTERS):
                self._warn(
                    f"figura en p{fig.page + 1} tras la opción d) de la pregunta {self.q.number}: se "
                    "coloca en esa opción (revisa; configura «attach» si pertenece a otra pregunta)"
                )
            self.q.options[-1].figures.append(fig)
        else:
            fig.extra["after_line"] = len(self.q.text_lines)
            self.q.figures.append(fig)

    def _on_row(self, row: Row) -> None:
        text = row.text.strip()
        if not text:
            return
        # 1) marcadores de sección/reserva
        for m in self.cfg.markers:
            if m.pattern.search(text):
                self._close_question()
                if m.section is not None:
                    self.section = m.section
                    self.reserve = bool(m.reserve) if m.reserve is not None else False
                    self._ensure_section(self.section)
                elif m.reserve is not None:
                    self.reserve = m.reserve
                self.last_stmt_row = None
                return
        # 2) inicio de pregunta
        qm = QUESTION_NUMBER_RE.match(text)
        first = row.visible_spans[0]
        if self.cfg.ocr and self._ocr_question_start(row, qm):
            return
        if qm and row.x0 <= self.cfg.question_x_max:
            number = int(qm.group(1))
            bold_ok = self.cfg.question_bold is None or first.bold == self.cfg.question_bold
            if self.section is not None and number == self._expected_number() and bold_ok:
                self._close_question()
                self.q = QuestionBuf(
                    section=self.section, reserve=self.reserve, number=number, page=row.page, y0=row.y0
                )
                self._feed_question_row(_strip_number(row.visible_spans))
                return
            in_statement = self.q is None and self._statement_allowed()
            if bold_ok and self.section is not None and not in_statement:
                self._warn(
                    f"p{row.page + 1}: fila con número {number} (esperado {self._expected_number()}) "
                    f"tratada como texto: {text[:80]!r}"
                )
        # 3) continuación de pregunta / opciones
        if self.q is not None:
            if (
                len(self.q.options) == len(LETTERS)
                and row.x0 <= self.cfg.question_x_max
                and self._statement_allowed()
            ):
                # Texto en el margen izquierdo tras una pregunta completa: contexto intercalado
                # del supuesto (p. ej. «En un momento determinado…» antes de la pregunta 4).
                self._close_question()
                self._feed_statement_row(row)
                return
            self._feed_question_row(row.visible_spans)
            return
        # 4) enunciado del supuesto
        if self._statement_allowed():
            self._feed_statement_row(row)
            return
        if self.section is not None:
            self._warn(f"p{row.page + 1}: texto fuera de pregunta ignorado: {text[:100]!r}")

    def _ocr_question_start(self, row: Row, qm: re.Match | None) -> bool:
        """OCR: número de pregunta mal leído («bs», «pS», «3:»…) en el margen izquierdo.

        Se acepta como la siguiente pregunta una fila cuyo primer token (≤ 4 caracteres) está en
        la columna de los números y va seguido de un hueco grande, si la pregunta anterior está
        completa. En los supuestos solo a partir de la primera pregunta (antes está el enunciado);
        el resto de casos se corrigen con ``ocr_word_fixes`` en la configuración.
        """
        spans = row.visible_spans
        if self.section is None or row.x0 > self.cfg.question_x_max or len(spans) < 2:
            return False
        expected = self._expected_number()
        if qm is not None and int(qm.group(1)) == expected:
            return False  # lectura correcta: camino normal
        tok = spans[0].text.strip()
        if len(tok) > 4 or spans[1].x0 - spans[0].x1 < self.cfg.label_gap:
            return False
        if self.q is not None and len(self.q.options) != len(LETTERS):
            return False
        sec = self._ensure_section(self.section)
        started = bool(sec.reserve if self.reserve else sec.questions) or (
            self.q is not None and self.q.section == self.section and self.q.reserve == self.reserve
        )
        if self._statement_allowed() and not started and not self.reserve:
            return False  # antes de la primera pregunta de un supuesto va su enunciado
        self._warn(f"p{row.page + 1}: número de pregunta leído por OCR como {tok!r}: se asume {expected}")
        self._close_question()
        self.q = QuestionBuf(
            section=self.section, reserve=self.reserve, number=expected, page=row.page, y0=row.y0
        )
        self._feed_question_row(spans[1:])
        return True

    # ------------------------------------------------------------------ preguntas
    def _feed_question_row(self, spans: list[Span]) -> None:
        q = self.q
        assert q is not None
        if not spans:
            return
        # Agrupar spans por destino en esta fila
        pieces: list[tuple[object, list[Span]]] = []  # destino -> spans
        target: object = None
        prev: Span | None = None
        labeled_this_row: list[OptionBuf] = []
        for s in spans:
            m = OPTION_LABEL_RE.match(s.text)
            letter = q.next_letter()
            is_label = (
                m is not None
                and letter is not None
                and m.group(1).lower() == letter
                and (prev is None or s.x0 - prev.x1 >= self.cfg.label_gap)
            )
            if not is_label and self.cfg.ocr and letter is not None:
                m = self._ocr_label(s, prev, letter)
                is_label = m is not None
            if is_label:
                opt = OptionBuf(letter=letter, label_x0=s.x0)
                q.options.append(opt)
                labeled_this_row.append(opt)
                target = opt
                rest = s.text[m.end() :]
                if rest.strip():
                    pieces.append((target, [_clone_span(s, rest)]))
                prev = s
                continue
            if target is None:
                target = self._continuation_target(s)
            # Cambio de columna dentro de una fila de continuación
            elif not labeled_this_row and isinstance(target, OptionBuf):
                t2 = self._continuation_target(s)
                if t2 is not target:
                    target = t2
            if pieces and pieces[-1][0] is target:
                pieces[-1][1].append(s)
            else:
                pieces.append((target, [s]))
            prev = s
        if labeled_this_row:
            q.last_row_options = labeled_this_row
        for tgt, sp in pieces:
            line = (sp[0].x0, join_spans(sp))
            if tgt == "text":
                q.text_lines.append(line)
            elif isinstance(tgt, OptionBuf):
                tgt.lines.append(line)

    def _ocr_label(self, s: Span, prev: Span | None, letter: str) -> re.Match | None:
        """OCR: etiqueta de opción mal leída («e)» por «c)», «a}»…) en la columna de etiquetas
        (inicio de fila alineado con la etiqueta a) o tras un hueco grande en la misma fila)."""
        m = OCR_LABEL_RE.match(s.text)
        q = self.q
        assert q is not None
        if m is None:
            # Etiqueta sin paréntesis («Ad», «c»): solo al principio de fila, exactamente en la
            # columna de la etiqueta a) y cuando la pregunta ya tiene opciones (antes de la a) esa
            # columna es la del enunciado).
            # En la segunda columna se acepta solo la letra esperada tras un hueco grande.
            m = OCR_BARE_LABEL_RE.match(s.text)
            if m is None or not q.options or len(q.options) >= 4:
                return None
            if prev is None:
                if abs(s.x0 - q.options[0].label_x0) > 3.0:
                    return None
            elif s.x0 - prev.x1 < 30.0 or m.group(1).lower() != letter:
                return None
        if prev is None:
            ref = q.options[0].label_x0 if q.options else (q.text_lines[0][0] if q.text_lines else None)
            if ref is None or abs(s.x0 - ref) > 6.0:
                return None
        elif s.x0 - prev.x1 < self.cfg.label_gap:
            return None
        if m.group(1).lower()[-1:] != letter:
            self._warn(
                f"p{q.page + 1}: pregunta {q.number}: etiqueta de opción leída por OCR como "
                f"{s.text.strip()[:4]!r}: se asume {letter})"
            )
        return m

    def _continuation_target(self, s: Span) -> object:
        q = self.q
        assert q is not None
        if not q.options:
            return "text"
        cols = q.last_row_options or [q.options[-1]]
        if len(cols) == 1:
            return cols[0]
        best = cols[0]
        for opt in cols:
            if opt.label_x0 - self.cfg.column_tolerance <= s.x0:
                best = opt
        return best

    def _close_question(self) -> None:
        q = self.q
        if q is None:
            return
        self.q = None
        sec = self._ensure_section(q.section)
        text = self._question_text(q)
        options = [
            clean_inline(join_lines([t for _, t in o.lines], self.vocabulary, self.cfg.hyphenation))
            for o in q.options
        ]
        pq = ParsedQuestion(
            section=q.section,
            reserve=q.reserve,
            number=q.number,
            text=text,
            options=options,
            figures=q.figures,
            page=q.page,
            text_rows=list(q.text_lines),
            option_rows=[list(o.lines) for o in q.options],
            option_figures=[list(o.figures) for o in q.options],
        )
        (sec.reserve if q.reserve else sec.questions).append(pq)

    def _question_text(self, q: QuestionBuf) -> str:
        """Texto de la pregunta; las figuras seguidas de más texto quedan en línea (``⟦FIG:i⟧``,
        con ``i`` = índice en ``figures``) y las del final se dejan para ``media``."""
        lines = [t for _, t in q.text_lines]

        def join(chunk: list[str]) -> str:
            return clean_inline(join_lines(chunk, self.vocabulary, self.cfg.hyphenation))

        parts: list[str] = []
        pos = 0
        cuts = sorted((f.extra.get("after_line", len(lines)), i) for i, f in enumerate(q.figures))
        for after, i in cuts:
            if after >= len(lines):
                continue
            if lines[pos:after]:
                parts.append(join(lines[pos:after]))
            parts.append(figure_placeholder(i))
            pos = after
        parts.append(join(lines[pos:]))
        return "\n\n".join(p for p in parts if p)

    # ------------------------------------------------------------------ enunciados
    def _feed_statement_row(self, row: Row) -> None:
        sec = self._ensure_section(self.section)
        if sec.questions or sec.reserve:
            before = self._expected_number()
            if not sec.interludes or (sec.interludes[-1].reserve, sec.interludes[-1].before) != (
                self.reserve,
                before,
            ):
                sec.interludes.append(Interlude(reserve=self.reserve, before=before))
            target = sec.interludes[-1]
            paras = target.paras
        else:
            target = sec
            paras = sec.statement_paras
        spans = row.visible_spans
        text = row.text
        bullet = bool(BULLET_RE.match(text))
        prev = self.last_stmt_row if self.last_stmt_target is target else None
        if prev is None or not paras:
            new_para = True
        elif row.page != prev.page:
            # Salto de página: el párrafo continúa salvo que el anterior acabe en punto/dos puntos.
            last = paras[-1]
            ends_sentence = bool(last.lines_text) and last.lines_text[-1].rstrip().endswith((".", ":", "?"))
            new_para = bullet or ends_sentence
        else:
            new_para = bullet or (row.y0 - prev.y1 > self.cfg.para_gap)
        if new_para:
            para = StatementPara(bullet=bullet, x0=row.x0)
            paras.append(para)
        else:
            para = paras[-1]
            para.segments.append(("\n", False))
        segs: list[tuple[str, bool]] = []
        prev_span: Span | None = None
        for s in spans:
            t = s.text
            if prev_span is not None and s.x0 - prev_span.x1 > 1.2 and not t.startswith(" "):
                if not (segs and segs[-1][0].endswith(" ")):
                    segs.append((" ", s.bold and self.cfg.statement_bold))
            segs.append((t, s.bold and self.cfg.statement_bold))
            prev_span = s
        if bullet and new_para:
            # quitar la viñeta del primer segmento
            first_text, first_bold = segs[0]
            m = BULLET_RE.match(first_text)
            if m:
                segs[0] = (first_text[m.end() :], first_bold)
            else:
                # viñeta en un span propio
                segs = segs[1:]
                while segs and not segs[0][0].strip():
                    segs = segs[1:]
        para.segments.extend(segs)
        para.lines_text.append(text)
        self.last_stmt_row = row
        self.last_stmt_target = target


def apply_ocr_word_fixes(pages: dict[int, list[Span]], fixes: list[dict]) -> None:
    """Corrige palabras concretas de la capa OCR (cada corrección debe aplicarse exactamente una vez).

    ``y`` y ``x`` (opcionales, en puntos) desambiguan palabras repetidas en la misma página.
    Con ``"old": null`` se **añade** una palabra nueva en (``x``, ``y``): sirve para cabeceras que
    el OCR no lee (texto blanco sobre fondo gris) y que el parser necesita como marcador.
    """
    for fx in fixes:
        spans = pages.setdefault(fx["page"] - 1, [])
        if fx["old"] is None:
            x, y, text = float(fx["x"]), float(fx["y"]), fx["new"]
            size = 10.0
            spans.append(
                Span(text, x, y, x + 6.0 * len(text), y + size, y + size, "ocr", size, False, False, False)
            )
            continue
        hits = [
            i
            for i, s in enumerate(spans)
            if s.text == fx["old"]
            and ("y" not in fx or abs(s.y0 - fx["y"]) <= 4.0)
            and ("x" not in fx or abs(s.x0 - fx["x"]) <= 4.0)
        ]
        if len(hits) != 1:
            raise ValueError(f"ocr_word_fixes {fx}: {len(hits)} coincidencias (debe haber exactamente una)")
        s = spans[hits[0]]
        if fx["new"]:
            s.text = fx["new"]
        else:
            del spans[hits[0]]


def _strip_number(spans: list[Span]) -> list[Span]:
    """Quita el número de pregunta (``12.``) del principio de la fila."""
    if not spans:
        return spans
    first = spans[0]
    m = QUESTION_NUMBER_RE.match(first.text)
    if m:
        rest = first.text[m.end() :]
        return ([_clone_span(first, rest)] if rest.strip() else []) + spans[1:]
    # número y punto en spans distintos ("12" + ". ")
    if len(spans) > 1 and first.text.strip().isdigit():
        m2 = re.match(r"^\s*[.)-]\s*", spans[1].text)
        if m2:
            rest = spans[1].text[m2.end() :]
            return ([_clone_span(spans[1], rest)] if rest.strip() else []) + spans[2:]
    return spans


def _clone_span(s: Span, text: str) -> Span:
    return Span(
        text=text,
        x0=s.x0,
        y0=s.y0,
        x1=s.x1,
        y1=s.y1,
        baseline=s.baseline,
        font=s.font,
        size=s.size,
        bold=s.bold,
        italic=s.italic,
        mono=s.mono,
        color=s.color,
    )


def parse_booklet(
    cfg: BookletConfig,
    kinds: dict[str, str],
    pdf_path: Path,
    spans_override: dict[int, list[Span]] | None = None,
) -> ParsedBooklet:
    return BookletParser(cfg, kinds, pdf_path, spans_override).parse()
