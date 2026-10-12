# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (C) 2026 Eric Valls Gramunt
"""Auditoría independiente del contenido de OpoTAI.

Comprueba que los exámenes oficiales y la teoría están completos y bien integrados para la app:

- Estructura de cada banco frente a su esquema de puntuación (preguntas, reservas, supuestos).
- Respuestas: presentes salvo anuladas, y reparto A/B/C/D (un sesgo extremo delata desfases).
- Transcripción: restos de PDF, prefijos «a)» en opciones, opciones duplicadas o vacías.
- Imágenes: rutas de ``media`` y ``![alt](assets/…)`` existentes, tamaño/dimensiones razonables,
  y preguntas o supuestos que mencionan una figura/tabla/esquema sin imagen ni reconstrucción.
- Teoría: temas del temario con ``.md`` + metadatos e índice generado.

Uso: ``cd tools && uv run python qa/audit_contenido.py [--md ../docs/calidad/auditoria-contenido.md]``
Autor: Eric Valls Gramunt.
"""

from __future__ import annotations

import argparse
import collections
import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data"
BANKS = DATA / "banks"
LETTERS = ("A", "B", "C", "D")

# Referencias deícticas a algo visual o tabular («la siguiente figura», «observe…»). Se evitan
# palabras sueltas como «esquema» o «diagrama» porque suelen ser conceptos del temario
# (Esquema Nacional de Seguridad, diagrama de clases…), no figuras.
FIGURE_RE = re.compile(
    r"\b((el|la) siguiente (tabla|figura|imagen|esquema|diagrama|gr[aá]fico|"
    r"captura|c[oó]digo|fragmento|pantalla)|"
    r"(en|de|seg[uú]n) (la|el) (figura|imagen|esquema|diagrama|captura|tabla|gr[aá]fico) "
    r"(anterior|adjunt[ao]|siguiente|superior|inferior|de arriba)|"
    r"figura \d+|anexo gr[aá]fico|observe|"
    r"se (muestra|observa|presenta|adjunta) (a continuaci[oó]n|en la|abajo))",
    re.IGNORECASE,
)
INLINE_IMG_RE = re.compile(r"!\[[^\]]*\]\((assets/[^)\s]+)\)")
PDF_JUNK_RE = re.compile(
    r"(P[aá]gina \d+ de \d+|\bModelo [AB]\b\s*$|INSTITUTO NACIONAL DE ADMINISTRACI|"
    r"\w+- \w+|\s{3,})",
    re.IGNORECASE,
)
OPTION_PREFIX_RE = re.compile(r"^\s*[a-dA-D]\s*[\)\.]\s+")


@dataclass
class BankReport:
    bank_id: str
    title: str
    scheme: str | None
    sections: list[str] = field(default_factory=list)
    questions: int = 0
    reserves: int = 0
    annulled: int = 0
    missing_answer: list[str] = field(default_factory=list)
    answer_dist: collections.Counter = field(default_factory=collections.Counter)
    media: int = 0
    inline_images: int = 0
    image_questions: list[str] = field(default_factory=list)
    image_sections: list[str] = field(default_factory=list)
    missing_files: list[str] = field(default_factory=list)
    figure_without_image: list[str] = field(default_factory=list)
    junk: list[str] = field(default_factory=list)
    option_issues: list[str] = field(default_factory=list)
    structure_issues: list[str] = field(default_factory=list)
    explained: int = 0
    with_topic: int = 0


def load_json(path: Path):
    with path.open(encoding="utf-8") as fh:
        return json.load(fh)


def has_reconstruction(text: str) -> bool:
    """Tabla Markdown o bloque de código: cuenta como reconstrucción textual."""
    return "```" in text or bool(re.search(r"^\s*\|.+\|\s*$", text, re.MULTILINE))


# Código escrito en la propia frase tras «el siguiente código/fragmento…»: código en línea (`…`),
# una llamada con punto («console.log(», «System.out.print(») u operadores y signos de código.
INLINE_CODE_RE = re.compile(r"`[^`\n]+`|[\w$]+\.[\w$.]+\s*\(|[;{}]|[=!]==?")


def code_follows_mention(text: str) -> bool:
    """Falsa alarma: la pregunta anuncia «el siguiente código» y lo escribe a continuación en la
    misma frase, como en el cuadernillo (comprobado: tai-li-2016-p1-b3-030, bucle ``for`` en línea,
    y tai-pi-2024-p1-018, «console.log(10 === '10')»). No falta ninguna figura."""
    m = FIGURE_RE.search(text)
    if not m or not re.search(r"c[oó]digo|fragmento", m.group(0), re.IGNORECASE):
        return False
    return bool(INLINE_CODE_RE.search(text[m.end() :]))


def image_dims(path: Path) -> tuple[int, int] | None:
    try:
        import pymupdf  # type: ignore

        pix = pymupdf.Pixmap(str(path))
        return pix.width, pix.height
    except Exception:  # noqa: BLE001 — la auditoría no debe caerse por una imagen rara
        return None


def audit_bank(path: Path, schemes: dict) -> tuple[BankReport, list[str]]:
    bank = load_json(path)
    rep = BankReport(bank["id"], bank["title"], bank.get("scheme") or bank.get("scoring_scheme"))
    image_files: list[str] = []
    scheme = schemes.get(rep.scheme or "")
    parts_cfg = {p["part"]: p for p in scheme["parts"]} if scheme else {}

    # 1.ª parte con bloque a elegir (OEP 2015 y 2016: preguntas comunes + bloque III o IV): cada
    # aspirante responde las comunes más UNA alternativa, así que se comprueba esa suma.
    common: dict[int, int] = {}
    alternatives: dict[int, int] = {}
    for sec in bank["sections"]:
        if sec["kind"] == "theory":
            if sec.get("block"):
                alternatives[sec["part"]] = alternatives.get(sec["part"], 0) + 1
            else:
                common[sec["part"]] = common.get(sec["part"], 0) + len(sec["questions"])
    choosable = {part for part, n in alternatives.items() if n > 1}

    case_sections = 0
    for sec in bank["sections"]:
        qs, rs = sec["questions"], sec.get("reserve", [])
        rep.sections.append(f"{sec['id']}: {len(qs)}+{len(rs)}R")
        if sec["kind"] == "case":
            case_sections += 1
        cfg = parts_cfg.get(sec["part"])
        if sec["kind"] == "theory" and sec["part"] in choosable:
            if cfg and sec.get("block") and common.get(sec["part"], 0) + len(qs) != cfg["questions"]:
                total = common.get(sec["part"], 0) + len(qs)
                rep.structure_issues.append(
                    f"{sec['id']}: {total} preguntas con las comunes (esquema: {cfg['questions']})"
                )
        elif cfg and len(qs) != cfg["questions"]:
            rep.structure_issues.append(f"{sec['id']}: {len(qs)} preguntas (esquema: {cfg['questions']})")
        if cfg and cfg.get("reserve") is not None and len(rs) > cfg["reserve"]:
            rep.structure_issues.append(f"{sec['id']}: {len(rs)} reservas (esquema: {cfg['reserve']})")

        sec_texts = [sec.get("statement") or ""]
        sec_imgs = 0
        for m in sec.get("media", []) or []:
            rep.media += 1
            sec_imgs += 1
            image_files.append(m["path"])
        for ref in INLINE_IMG_RE.findall(sec.get("statement") or ""):
            rep.inline_images += 1
            sec_imgs += 1
            image_files.append(ref)
        if sec_imgs:
            rep.image_sections.append(f"{sec['id']} ({sec_imgs})")
        statement = sec.get("statement") or ""
        if statement and FIGURE_RE.search(statement):
            if not (sec.get("media") or INLINE_IMG_RE.search(statement) or has_reconstruction(statement)):
                rep.figure_without_image.append(f"{sec['id']} (enunciado del supuesto)")

        for is_res, q in [(False, q) for q in qs] + [(True, q) for q in rs]:
            rep.questions += 0 if is_res else 1
            rep.reserves += 1 if is_res else 0
            if q.get("annulled"):
                rep.annulled += 1
            if q.get("answer") in LETTERS:
                rep.answer_dist[q["answer"]] += 1
            elif not q.get("annulled"):
                rep.missing_answer.append(q["id"])
            if q.get("explanation"):
                rep.explained += 1
            if q.get("topic"):
                rep.with_topic += 1

            fields = [q["text"], *q["options"], q.get("explanation") or ""]
            refs = [r for f in fields for r in INLINE_IMG_RE.findall(f)]
            media = q.get("media", []) or []
            if refs or media:
                rep.image_questions.append(q["id"])
            rep.inline_images += len(refs)
            rep.media += len(media)
            image_files += refs + [m["path"] for m in media]

            visual_context = q["text"] + " " + " ".join(sec_texts)
            resolved = (
                refs
                or media
                or has_reconstruction(q["text"])
                or sec.get("media")
                or INLINE_IMG_RE.search(visual_context)
                or (sec["kind"] == "case" and statement)
            )
            if FIGURE_RE.search(q["text"]) and not resolved and not code_follows_mention(q["text"]):
                rep.figure_without_image.append(q["id"])

            for f in [q["text"], *q["options"]]:
                if PDF_JUNK_RE.search(f.replace("```", "")) and "```" not in f and "|" not in f:
                    rep.junk.append(q["id"])
                    break
            opts = [o.strip() for o in q["options"]]
            if len(set(o.lower() for o in opts)) < len(opts):
                rep.option_issues.append(f"{q['id']}: opciones duplicadas")
            if any(OPTION_PREFIX_RE.match(o) for o in opts):
                rep.option_issues.append(f"{q['id']}: prefijo «a)» en una opción")
            if any(len(o) == 0 for o in opts):
                rep.option_issues.append(f"{q['id']}: opción vacía")

    if cfg := parts_cfg.get(2):
        offered = cfg.get("cases_offered")
        if offered and case_sections and case_sections != offered:
            rep.structure_issues.append(f"{case_sections} supuestos (esquema: {offered})")

    for rel in sorted(set(image_files)):
        f = BANKS / rel
        if not f.is_file():
            rep.missing_files.append(rel)
    return rep, sorted(set(image_files))


def audit_images(paths: list[str]) -> list[str]:
    issues = []
    for rel in paths:
        f = BANKS / rel
        if not f.is_file():
            continue
        size = f.stat().st_size
        dims = image_dims(f)
        if size > 400_000:
            issues.append(f"{rel}: {size // 1024} KB (demasiado pesada)")
        if size < 600:
            issues.append(f"{rel}: {size} B (¿vacía?)")
        if dims and (dims[0] < 120 or dims[1] < 40):
            issues.append(f"{rel}: {dims[0]}×{dims[1]} px (demasiado pequeña para leerse)")
    return issues


def audit_theory() -> dict:
    temario = load_json(DATA / "meta" / "temario.json")
    topics = [t["id"] for b in temario["blocks"] for t in b["topics"]]
    teoria = DATA / "teoria"
    present, words = [], {}
    for tid in topics:
        md, meta = teoria / f"{tid}.md", teoria / "meta" / f"{tid}.json"
        if md.is_file() and meta.is_file():
            present.append(tid)
            words[tid] = len(md.read_text(encoding="utf-8").split())
    index = teoria / "index.json"
    indexed = [t["topic"] for t in load_json(index)["topics"]] if index.is_file() else []
    return {
        "total": len(topics),
        "present": present,
        "missing": [t for t in topics if t not in present],
        "indexed": indexed,
        "not_indexed": [t for t in present if t not in indexed],
        "words": words,
    }


def render(reports: list[BankReport], image_issues: list[str], theory: dict) -> str:
    out = ["# Auditoría de contenido de OpoTAI", ""]
    total_q = sum(r.questions + r.reserves for r in reports)
    total_img = sum(len(r.image_questions) for r in reports)
    total_sec_img = sum(len(r.image_sections) for r in reports)
    out += [
        f"- Bancos oficiales: **{len(reports)}** · preguntas (con reservas): **{total_q}**",
        f"- Preguntas con imagen propia: **{total_img}** · supuestos/secciones con figura: "
        f"**{total_sec_img}** · ficheros de imagen inexistentes: "
        f"**{sum(len(r.missing_files) for r in reports)}**",
        "- Posibles figuras sin imagen ni reconstrucción: "
        f"**{sum(len(r.figure_without_image) for r in reports)}**",
        f"- Teoría: **{len(theory['present'])}/{theory['total']}** temas escritos · "
        f"{len(theory['indexed'])} en el índice",
        "",
        "| Banco | Secciones | Anuladas | Sin respuesta | Reparto A/B/C/D | Preguntas con imagen | "
        "Figuras en supuestos | Explicadas | Con tema |",
        "|---|---|---|---|---|---|---|---|---|",
    ]
    for r in reports:
        n = r.questions + r.reserves
        dist = "/".join(str(r.answer_dist[x]) for x in LETTERS)
        out.append(
            f"| `{r.bank_id}` | {' · '.join(r.sections)} | {r.annulled} | {len(r.missing_answer)} | {dist} | "
            f"{len(r.image_questions)} | {', '.join(r.image_sections) or '—'} | {r.explained}/{n} | "
            f"{r.with_topic}/{n} |"
        )
    out.append("")
    for r in reports:
        problems = [
            ("Estructura", r.structure_issues),
            ("Sin respuesta", r.missing_answer),
            ("Ficheros de imagen inexistentes", r.missing_files),
            ("Mencionan figura/tabla sin imagen ni reconstrucción", r.figure_without_image),
            ("Posibles restos de PDF", r.junk),
            ("Opciones", r.option_issues),
        ]
        problems = [(t, v) for t, v in problems if v]
        if not problems:
            continue
        out += [f"## `{r.bank_id}`", ""]
        for title, items in problems:
            shown = ", ".join(f"`{i}`" for i in items[:40])
            more = f" … (+{len(items) - 40})" if len(items) > 40 else ""
            out.append(f"- **{title}** ({len(items)}): {shown}{more}")
        out.append("")
    if image_issues:
        out += ["## Imágenes", ""] + [f"- {i}" for i in image_issues] + [""]
    out += ["## Teoría", ""]
    if theory["missing"]:
        out.append(f"- Temas pendientes ({len(theory['missing'])}): {', '.join(theory['missing'])}")
    if theory["not_indexed"]:
        out.append(f"- Escritos pero fuera del índice: {', '.join(theory['not_indexed'])}")
    if theory["words"]:
        thin = [f"{t} ({w} palabras)" for t, w in theory["words"].items() if w < 1200]
        if thin:
            out.append(f"- Temas cortos (< 1.200 palabras): {', '.join(thin)}")
    out.append("")
    return "\n".join(out)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--md", type=Path, help="escribe el informe Markdown en esta ruta")
    args = ap.parse_args()

    scoring = load_json(DATA / "meta" / "scoring.json")
    schemes = {s["id"]: s for s in scoring["schemes"]}
    reports, all_images = [], []
    for path in sorted((BANKS / "oficiales").glob("*.json")):
        rep, imgs = audit_bank(path, schemes)
        reports.append(rep)
        all_images += imgs
    report = render(reports, audit_images(sorted(set(all_images))), audit_theory())
    if args.md:
        args.md.parent.mkdir(parents=True, exist_ok=True)
        args.md.write_text(report, encoding="utf-8")
    print(report)
    blocking = sum(len(r.missing_answer) + len(r.missing_files) + len(r.structure_issues) for r in reports)
    return 1 if blocking else 0


if __name__ == "__main__":
    sys.exit(main())
