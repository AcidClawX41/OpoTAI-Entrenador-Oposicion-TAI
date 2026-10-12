// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
//! Catálogo de datos: bancos de preguntas, metadatos e imágenes.
//!
//! Se construye desde un **directorio** (`Catalog::load_dir`, p. ej. `data/`) o desde un
//! **mapa en memoria** ruta → bytes (`Catalog::from_files`, para los datos embebidos en el
//! binario). Las rutas son relativas a `data/` con separador `/`:
//! `banks/oficiales/tai-li-2024.json`, `banks/assets/tai-li-2024/q12.png`,
//! `meta/scoring.json`, `meta/destinos/li-2024.json`, `teoria/index.json`, `teoria/IV.7.md`…
//!
//! La carga nunca falla por datos defectuosos: los ficheros que no se pueden leer se omiten
//! y el problema queda en el [`ValidationReport`]. Si faltan ficheros de `data/meta`, se usan
//! los valores por defecto de [`crate::defaults`]; si falta `data/teoria`, no hay teoría.

mod media;
mod validate;

use std::borrow::Cow;
use std::collections::{BTreeMap, HashMap};
use std::path::Path;
use std::sync::Arc;

use serde::de::DeserializeOwned;

use crate::defaults;
use crate::error::{CoreError, CoreResult};
use crate::model::{
    Bank, BankKind, BlockId, Convocatoria, ConvocatoriasFile, DestinosFile, LocalidadesFile,
    Question, ScoringFile, ScoringScheme, Section, TemarioFile, TheoryEntry, TheoryIndexFile,
    TierDef,
};

pub use media::{mime_for, strip_images};
pub use validate::{Issue, IssueKind, Severity, ValidationReport};

/// Posición de una pregunta dentro del catálogo.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct QuestionLoc {
    pub bank: usize,
    pub section: usize,
    pub index: usize,
    pub is_reserve: bool,
}

/// Referencia resuelta a una pregunta con su banco y sección.
#[derive(Debug, Clone, Copy)]
pub struct QuestionRef<'a> {
    pub bank: &'a Bank,
    pub section: &'a Section,
    pub question: &'a Question,
    pub is_reserve: bool,
    pub loc: QuestionLoc,
}

impl QuestionRef<'_> {
    /// Bloque de la pregunta (tema o sección).
    pub fn block(&self) -> Option<crate::model::BlockId> {
        self.question.block(self.section)
    }
}

/// Qué ficheros de `data/meta` se han cargado (el resto usa valores por defecto).
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub struct MetaPresence {
    pub scoring: bool,
    pub convocatorias: bool,
    pub temario: bool,
    pub localidades: bool,
}

/// Datos de la aplicación ya indexados.
#[derive(Debug, Clone)]
pub struct Catalog {
    banks: Vec<Bank>,
    bank_index: HashMap<String, usize>,
    question_index: HashMap<String, QuestionLoc>,
    scoring: ScoringFile,
    convocatorias: ConvocatoriasFile,
    temario: Option<TemarioFile>,
    localidades: LocalidadesFile,
    destinos: Vec<(String, DestinosFile)>,
    assets: HashMap<String, Cow<'static, [u8]>>,
    /// Diagramas de la teoría (`teoria/diagramas/…`), por ruta relativa a `data/teoria/`.
    theory_assets: HashMap<String, Cow<'static, [u8]>>,
    /// Entradas del índice de teoría con su Markdown disponible (orden del temario).
    theory: Vec<(TheoryEntry, String)>,
    theory_updated: Option<String>,
    presence: MetaPresence,
    report: ValidationReport,
    /// Data URI ya codificados (compartidos entre clones).
    media_cache: Arc<media::MediaCache>,
}

impl Default for Catalog {
    fn default() -> Self {
        Self::from_files(Vec::<(String, Cow<'static, [u8]>)>::new())
    }
}

fn parse_json<T: DeserializeOwned>(
    path: &str,
    bytes: &[u8],
    report: &mut ValidationReport,
) -> Option<T> {
    match serde_json::from_slice::<T>(bytes) {
        Ok(v) => Some(v),
        Err(err) => {
            report.push(
                Severity::Error,
                IssueKind::Parse,
                path,
                format!("no se puede leer el JSON: {err}"),
            );
            None
        }
    }
}

impl Catalog {
    /// Catálogo vacío con los metadatos por defecto.
    pub fn empty() -> Self {
        Self::default()
    }

    /// Carga los datos de un directorio que contiene `banks/` y `meta/` (ambos opcionales).
    pub fn load_dir(root: impl AsRef<Path>) -> CoreResult<Self> {
        let root = root.as_ref();
        if !root.is_dir() {
            return Err(CoreError::data(format!(
                "no existe el directorio de datos {}",
                root.display()
            )));
        }
        let mut files: Vec<(String, Cow<'static, [u8]>)> = Vec::new();
        for sub in ["banks", "meta", "teoria"] {
            let dir = root.join(sub);
            if dir.is_dir() {
                collect_dir(&dir, sub, &mut files)?;
            }
        }
        Ok(Self::from_files(files))
    }

    /// Construye el catálogo desde un mapa ruta (relativa a `data/`) → contenido.
    pub fn from_files<I, P>(files: I) -> Self
    where
        I: IntoIterator<Item = (P, Cow<'static, [u8]>)>,
        P: Into<String>,
    {
        let mut report = ValidationReport::default();
        let mut sorted: BTreeMap<String, Cow<'static, [u8]>> = BTreeMap::new();
        for (path, bytes) in files {
            let path: String = path.into().replace('\\', "/");
            let path = path.trim_start_matches("./").to_string();
            sorted.insert(path, bytes);
        }

        let mut banks: Vec<(String, Bank)> = Vec::new();
        let mut assets = HashMap::new();
        let mut theory_assets = HashMap::new();
        let mut scoring = None;
        let mut convocatorias = None;
        let mut temario = None;
        let mut localidades = None;
        let mut destinos = Vec::new();
        let mut theory_index: Option<TheoryIndexFile> = None;
        let mut theory_files: HashMap<String, String> = HashMap::new();

        for (path, bytes) in sorted {
            let file_name = path.rsplit('/').next().unwrap_or_default();
            if file_name.starts_with('.') {
                continue;
            }
            if let Some(rel) = path.strip_prefix("banks/") {
                if rel.starts_with("assets/") {
                    assets.insert(rel.to_string(), bytes);
                } else if rel.ends_with(".json") {
                    if let Some(bank) = parse_json::<Bank>(&path, &bytes, &mut report) {
                        banks.push((path.clone(), bank));
                    }
                }
            } else if let Some(rel) = path.strip_prefix("meta/") {
                match rel {
                    "scoring.json" => scoring = parse_json(&path, &bytes, &mut report),
                    "convocatorias.json" => convocatorias = parse_json(&path, &bytes, &mut report),
                    "temario.json" => temario = parse_json(&path, &bytes, &mut report),
                    "localidades.json" => localidades = parse_json(&path, &bytes, &mut report),
                    _ if rel.starts_with("destinos/") && rel.ends_with(".json") => {
                        if let Some(d) = parse_json::<DestinosFile>(&path, &bytes, &mut report) {
                            destinos.push((rel.to_string(), d));
                        }
                    }
                    _ => {}
                }
            } else if let Some(rel) = path.strip_prefix("teoria/") {
                if rel == "index.json" {
                    theory_index = parse_json(&path, &bytes, &mut report);
                } else if rel.starts_with("diagramas/") {
                    theory_assets.insert(rel.to_string(), bytes);
                } else if rel.ends_with(".md") {
                    match String::from_utf8(bytes.into_owned()) {
                        Ok(text) => {
                            theory_files.insert(rel.to_string(), text);
                        }
                        Err(_) => report.push(
                            Severity::Error,
                            IssueKind::Parse,
                            &path,
                            "el fichero de teoría no está en UTF-8",
                        ),
                    }
                }
            }
        }
        let theory_updated = theory_index.as_ref().and_then(|t| t.updated.clone());
        let theory = collect_theory(theory_index, theory_files, &mut report);

        let presence = MetaPresence {
            scoring: scoring.is_some(),
            convocatorias: convocatorias.is_some(),
            temario: temario.is_some(),
            localidades: localidades.is_some(),
        };
        let mut scoring: ScoringFile = scoring.unwrap_or_else(defaults::scoring);
        // Garantiza que existen los esquemas internos aunque el fichero no los incluya.
        for scheme in defaults::scoring().schemes {
            if scoring.scheme(&scheme.id).is_none() {
                scoring.schemes.push(scheme);
            }
        }
        if scoring.scheme(&scoring.default_scheme).is_none() {
            report.push(
                Severity::Error,
                IssueKind::Reference,
                "meta/scoring.json",
                format!(
                    "el esquema por defecto «{}» no existe; se usa {}",
                    scoring.default_scheme,
                    defaults::DEFAULT_SCHEME
                ),
            );
            scoring.default_scheme = defaults::DEFAULT_SCHEME.to_string();
        }
        let convocatorias = convocatorias.unwrap_or_else(defaults::convocatorias);
        let mut localidades: LocalidadesFile = localidades.unwrap_or_else(defaults::localidades);
        if localidades.tiers.is_empty() {
            localidades.tiers = defaults::tiers();
        }
        localidades.tiers.sort_by_key(|t| t.order);

        let mut catalog = Catalog {
            banks: Vec::new(),
            bank_index: HashMap::new(),
            question_index: HashMap::new(),
            scoring,
            convocatorias,
            temario,
            localidades,
            destinos,
            assets,
            theory_assets,
            theory,
            theory_updated,
            presence,
            report,
            media_cache: Arc::default(),
        };
        catalog.index_banks(banks);
        validate::validate(&mut catalog);
        catalog
    }

    fn index_banks(&mut self, mut banks: Vec<(String, Bank)>) {
        // Orden estable: oficiales (más recientes primero) y después práctica.
        banks.sort_by(|(pa, a), (pb, b)| {
            let rank = |bank: &Bank| match bank.kind {
                BankKind::Official => 0,
                BankKind::Practice => 1,
            };
            rank(a)
                .cmp(&rank(b))
                .then_with(|| b.exam_date.cmp(&a.exam_date))
                .then_with(|| b.year.cmp(&a.year))
                .then_with(|| a.id.cmp(&b.id))
                .then_with(|| pa.cmp(pb))
        });
        for (path, bank) in banks {
            if self.bank_index.contains_key(&bank.id) {
                self.report.push(
                    Severity::Error,
                    IssueKind::Integrity,
                    &path,
                    format!(
                        "id de banco duplicado «{}»: se ignora este fichero",
                        bank.id
                    ),
                );
                continue;
            }
            let bank_idx = self.banks.len();
            for (s_idx, section) in bank.sections.iter().enumerate() {
                for (q_idx, (question, is_reserve)) in section.all_questions().enumerate() {
                    let index = if is_reserve {
                        q_idx - section.questions.len()
                    } else {
                        q_idx
                    };
                    let loc = QuestionLoc {
                        bank: bank_idx,
                        section: s_idx,
                        index,
                        is_reserve,
                    };
                    if self.question_index.contains_key(&question.id) {
                        self.report.push(
                            Severity::Error,
                            IssueKind::Integrity,
                            &path,
                            format!("id de pregunta duplicado «{}»", question.id),
                        );
                    } else {
                        self.question_index.insert(question.id.clone(), loc);
                    }
                }
            }
            self.bank_index.insert(bank.id.clone(), bank_idx);
            self.banks.push(bank);
        }
    }

    // ───────────────────────────── Accesores ─────────────────────────────

    /// Bancos en orden estable.
    pub fn banks(&self) -> &[Bank] {
        &self.banks
    }

    /// Banco por id.
    pub fn bank(&self, id: &str) -> Option<&Bank> {
        self.bank_index.get(id).map(|i| &self.banks[*i])
    }

    /// Banco con la otra parte del mismo examen oficial: otro banco oficial del mismo proceso
    /// (`convocatoria`) y acceso cuyas partes no se solapan con las de `bank` (p. ej. el 2.º
    /// ejercicio de 2018, publicado aparte por no tener plantilla oficial). Para el banco
    /// principal (el de la 1.ª parte) es el ejercicio que añade su réplica oficial; para el
    /// secundario, el principal.
    pub fn companion(&self, bank: &Bank) -> Option<&Bank> {
        fn parts(bank: &Bank) -> Vec<u32> {
            let mut parts: Vec<u32> = bank
                .sections
                .iter()
                .filter(|s| !s.questions.is_empty())
                .map(|s| s.part)
                .collect();
            parts.sort_unstable();
            parts.dedup();
            parts
        }
        if bank.kind != BankKind::Official {
            return None;
        }
        let convocatoria = bank.convocatoria.as_deref()?;
        let mine = parts(bank);
        if mine.is_empty() {
            return None;
        }
        self.banks.iter().find(|other| {
            other.id != bank.id
                && other.kind == BankKind::Official
                && other.access == bank.access
                && other.convocatoria.as_deref() == Some(convocatoria)
                && {
                    let theirs = parts(other);
                    !theirs.is_empty() && theirs.iter().all(|p| !mine.contains(p))
                }
        })
    }

    /// `true` si la réplica oficial de `bank` es un examen completo (1.ª parte con preguntas y al
    /// menos un supuesto), por sí mismo o con su ejercicio complementario ([`Self::companion`]).
    /// El banco secundario (sin 1.ª parte) no cuenta: su examen completo es el del principal.
    pub fn is_complete_official(&self, bank: &Bank) -> bool {
        fn has(bank: &Bank, kind: crate::model::SectionKind) -> bool {
            bank.sections
                .iter()
                .any(|s| s.kind == kind && !s.questions.is_empty())
        }
        use crate::model::SectionKind::{Case, Theory};
        if bank.kind != BankKind::Official || !has(bank, Theory) {
            return false;
        }
        has(bank, Case) || self.companion(bank).is_some_and(|c| has(c, Case))
    }

    /// Índice de un banco por id.
    pub fn bank_position(&self, id: &str) -> Option<usize> {
        self.bank_index.get(id).copied()
    }

    /// Resuelve una pregunta por id.
    pub fn question(&self, id: &str) -> Option<QuestionRef<'_>> {
        let loc = *self.question_index.get(id)?;
        self.question_at(loc)
    }

    /// Resuelve una posición.
    pub fn question_at(&self, loc: QuestionLoc) -> Option<QuestionRef<'_>> {
        let bank = self.banks.get(loc.bank)?;
        let section = bank.sections.get(loc.section)?;
        let list = if loc.is_reserve {
            &section.reserve
        } else {
            &section.questions
        };
        let question = list.get(loc.index)?;
        Some(QuestionRef {
            bank,
            section,
            question,
            is_reserve: loc.is_reserve,
            loc,
        })
    }

    /// Recorre todas las preguntas (titulares y reservas) en orden estable.
    pub fn all_questions(&self) -> impl Iterator<Item = QuestionRef<'_>> {
        self.banks.iter().enumerate().flat_map(move |(b, bank)| {
            bank.sections
                .iter()
                .enumerate()
                .flat_map(move |(s, section)| {
                    let main =
                        section
                            .questions
                            .iter()
                            .enumerate()
                            .map(move |(i, q)| QuestionRef {
                                bank,
                                section,
                                question: q,
                                is_reserve: false,
                                loc: QuestionLoc {
                                    bank: b,
                                    section: s,
                                    index: i,
                                    is_reserve: false,
                                },
                            });
                    let reserve =
                        section
                            .reserve
                            .iter()
                            .enumerate()
                            .map(move |(i, q)| QuestionRef {
                                bank,
                                section,
                                question: q,
                                is_reserve: true,
                                loc: QuestionLoc {
                                    bank: b,
                                    section: s,
                                    index: i,
                                    is_reserve: true,
                                },
                            });
                    main.chain(reserve)
                })
        })
    }

    /// Número total de preguntas (incluye reservas).
    pub fn question_count(&self) -> usize {
        self.question_index.len()
    }

    /// Esquemas de puntuación.
    pub fn scoring(&self) -> &ScoringFile {
        &self.scoring
    }

    /// Esquema por id.
    pub fn scheme(&self, id: &str) -> Option<&ScoringScheme> {
        self.scoring.scheme(id)
    }

    /// Esquema por defecto de los simulacros.
    pub fn default_scheme(&self) -> &ScoringScheme {
        self.scoring
            .scheme(&self.scoring.default_scheme)
            .or_else(|| self.scoring.schemes.first())
            .unwrap_or_else(|| default_scheme_fallback())
    }

    /// Histórico de convocatorias.
    pub fn convocatorias(&self) -> &ConvocatoriasFile {
        &self.convocatorias
    }

    /// Convocatoria por id.
    pub fn convocatoria(&self, id: &str) -> Option<&Convocatoria> {
        self.convocatorias.get(id)
    }

    /// Convocatoria objetivo de los datos (o la por defecto).
    pub fn target_convocatoria_id(&self) -> Option<&str> {
        self.convocatorias
            .target_convocatoria
            .as_deref()
            .filter(|id| self.convocatorias.get(id).is_some())
            .or_else(|| {
                self.convocatorias
                    .convocatorias
                    .iter()
                    .max_by_key(|c| (c.year, c.exam_date.clone()))
                    .map(|c| c.id.as_str())
            })
    }

    /// Temario vigente, si se ha cargado.
    pub fn temario(&self) -> Option<&TemarioFile> {
        self.temario.as_ref()
    }

    /// Localidades y tamaños.
    pub fn localidades(&self) -> &LocalidadesFile {
        &self.localidades
    }

    /// Tamaños de localidad ordenados.
    pub fn tiers(&self) -> &[TierDef] {
        &self.localidades.tiers
    }

    /// Datasets de destinos cargados (ruta relativa a `meta/` y contenido).
    pub fn destinos(&self) -> &[(String, DestinosFile)] {
        &self.destinos
    }

    /// Dataset de destinos de una convocatoria (por `destinations_dataset` o por su id).
    pub fn destinos_for(&self, conv: &Convocatoria) -> Option<&DestinosFile> {
        if let Some(path) = conv.destinations_dataset.as_deref() {
            let path = path.trim_start_matches("meta/");
            if let Some((_, d)) = self.destinos.iter().find(|(p, _)| p == path) {
                return Some(d);
            }
        }
        self.destinos
            .iter()
            .find(|(_, d)| d.convocatoria == conv.id)
            .map(|(_, d)| d)
    }

    /// Qué metadatos proceden de ficheros reales.
    pub fn presence(&self) -> MetaPresence {
        self.presence
    }

    /// Informe de validación.
    pub fn report(&self) -> &ValidationReport {
        &self.report
    }

    /// Temas con teoría disponible (índice + Markdown), en orden del temario.
    pub fn theory(&self) -> &[(TheoryEntry, String)] {
        &self.theory
    }

    /// Teoría de un tema.
    pub fn theory_for(&self, topic: &str) -> Option<&(TheoryEntry, String)> {
        self.theory.iter().find(|(e, _)| e.topic == topic)
    }

    /// Fecha de actualización del índice de teoría.
    pub fn theory_updated(&self) -> Option<&str> {
        self.theory_updated.as_deref()
    }

    /// Número de preguntas (titulares y reservas) clasificadas en un tema.
    pub fn topic_question_count(&self, topic: &str) -> usize {
        self.all_questions()
            .filter(|r| r.question.topic.as_deref() == Some(topic))
            .count()
    }

    /// Bytes de una imagen (`path` relativa a `data/banks/`).
    pub fn asset(&self, path: &str) -> Option<&[u8]> {
        self.assets.get(path).map(|b| b.as_ref())
    }

    /// Bytes de un diagrama de la teoría (`path` relativa a `data/teoria/`, p. ej.
    /// `diagramas/IV.7-osi-tcpip.svg`).
    pub fn theory_asset(&self, path: &str) -> Option<&[u8]> {
        self.theory_assets.get(path).map(|b| b.as_ref())
    }
}

/// Une el índice de teoría con sus ficheros Markdown (descarta entradas sin fichero o con
/// tema no válido) y ordena por bloque y número de tema.
fn collect_theory(
    index: Option<TheoryIndexFile>,
    mut files: HashMap<String, String>,
    report: &mut ValidationReport,
) -> Vec<(TheoryEntry, String)> {
    let Some(index) = index else {
        if !files.is_empty() {
            report.push(
                Severity::Warning,
                IssueKind::Reference,
                "teoria/index.json",
                "hay ficheros de teoría pero falta el índice",
            );
        }
        return Vec::new();
    };
    let mut out = Vec::new();
    for entry in index.topics {
        let path = format!("teoria/{}", entry.file);
        if BlockId::from_topic(&entry.topic).is_none() {
            report.push(
                Severity::Error,
                IssueKind::Integrity,
                &path,
                format!("tema no válido «{}»", entry.topic),
            );
            continue;
        }
        if out
            .iter()
            .any(|(e, _): &(TheoryEntry, String)| e.topic == entry.topic)
        {
            report.push(
                Severity::Error,
                IssueKind::Integrity,
                &path,
                format!("tema de teoría duplicado «{}»", entry.topic),
            );
            continue;
        }
        match files.remove(&entry.file) {
            Some(content) => out.push((entry, content)),
            None => report.push(
                Severity::Warning,
                IssueKind::Reference,
                &path,
                "el índice cita un fichero de teoría que no existe",
            ),
        }
    }
    out.sort_by_key(|(e, _)| {
        let block = BlockId::from_topic(&e.topic);
        let number: u32 = e
            .topic
            .split_once('.')
            .and_then(|(_, n)| n.parse().ok())
            .unwrap_or(u32::MAX);
        (block, number)
    });
    out
}

/// Esquema de emergencia si el fichero de puntuación no tiene ninguno (no debería ocurrir:
/// los esquemas internos siempre se añaden).
fn default_scheme_fallback() -> &'static ScoringScheme {
    use std::sync::OnceLock;
    static FALLBACK: OnceLock<ScoringScheme> = OnceLock::new();
    FALLBACK.get_or_init(defaults::scheme_li_2025)
}

fn collect_dir(
    dir: &Path,
    prefix: &str,
    out: &mut Vec<(String, Cow<'static, [u8]>)>,
) -> CoreResult<()> {
    let entries = std::fs::read_dir(dir)
        .map_err(|e| CoreError::data(format!("no se puede leer {}: {e}", dir.display())))?;
    let mut paths: Vec<_> = entries.filter_map(Result::ok).map(|e| e.path()).collect();
    paths.sort();
    for path in paths {
        let Some(name) = path.file_name().and_then(|n| n.to_str()) else {
            continue;
        };
        if name.starts_with('.') {
            continue;
        }
        let rel = format!("{prefix}/{name}");
        if path.is_dir() {
            collect_dir(&path, &rel, out)?;
        } else if path.is_file() {
            let bytes = std::fs::read(&path).map_err(|e| {
                CoreError::data(format!("no se puede leer {}: {e}", path.display()))
            })?;
            out.push((rel, Cow::Owned(bytes)));
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn empty_catalog_uses_defaults() {
        let catalog = Catalog::empty();
        assert!(catalog.banks().is_empty());
        assert_eq!(catalog.default_scheme().id, "tai-li-2025");
        assert!(catalog.scheme("tai-li-2024").is_some());
        assert_eq!(catalog.target_convocatoria_id(), Some("li-2025"));
        assert_eq!(catalog.tiers().len(), 3);
        assert!(!catalog.presence().scoring);
        assert!(!catalog.report().has_errors());
    }

    #[test]
    fn broken_files_are_reported_not_fatal() {
        let files = vec![
            (
                "banks/practica/roto.json",
                Cow::Borrowed(&b"{ no es json"[..]),
            ),
            ("meta/scoring.json", Cow::Borrowed(&b"[]"[..])),
        ];
        let catalog = Catalog::from_files(files);
        assert!(catalog.banks().is_empty());
        assert_eq!(catalog.report().parse_errors().count(), 2);
        // Sin scoring válido se usan los esquemas por defecto.
        assert_eq!(catalog.default_scheme().id, "tai-li-2025");
    }

    #[test]
    fn data_url_has_mime() {
        let files = vec![("banks/assets/x/img.png", Cow::Borrowed(&b"\x89PNG"[..]))];
        let catalog = Catalog::from_files(files);
        let url = catalog
            .media_data_url("assets/x/img.png")
            .expect("imagen embebida");
        assert!(url.starts_with("data:image/png;base64,"));
        assert!(catalog.media_data_url("assets/x/otra.png").is_none());
    }
}
