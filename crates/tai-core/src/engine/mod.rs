// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
//! Fachada del núcleo: un método por comando IPC del contrato (`docs/CONTRATO-API.md`).
//!
//! La capa Tauri solo traduce cada comando a uno de estos métodos; aquí vive toda la lógica,
//! testeable sin interfaz.

mod catalog_info;
mod draw;
mod exams;
mod insights;

use std::collections::HashMap;
use std::fmt;
use std::sync::{Arc, Mutex};

use chrono::{DateTime, Datelike, FixedOffset, Local, Offset, Utc};

use crate::api::{AppInfo, Profile, Settings, TheorySummary, TheoryTopic};
use crate::catalog::Catalog;
use crate::error::{CoreError, CoreResult};
use crate::model::{Access, BlockId};
use crate::prediction::{DestinationContext, PredictionContext};
use crate::storage::{Database, profiles};
use crate::util::{is_avatar_image, is_hex_color, is_iso_date, iso, normalize_key};
use crate::{APP_NAME, AUTHOR, LICENSE, LICENSE_NAME, LICENSE_TEXT, REPOSITORY, VERSION};

pub use draw::PendingDraw;

/// Fuente de la hora actual (inyectable en tests).
pub trait Clock: Send + Sync + fmt::Debug {
    /// Instante actual en UTC.
    fn now(&self) -> DateTime<Utc>;
}

/// Reloj del sistema.
#[derive(Debug, Default, Clone, Copy)]
pub struct SystemClock;

impl Clock for SystemClock {
    fn now(&self) -> DateTime<Utc> {
        Utc::now()
    }
}

/// Reloj fijo y ajustable (tests).
#[derive(Debug)]
pub struct FixedClock {
    now: Mutex<DateTime<Utc>>,
}

impl FixedClock {
    /// Reloj parado en `now`.
    pub fn new(now: DateTime<Utc>) -> Self {
        Self {
            now: Mutex::new(now),
        }
    }

    /// Cambia la hora.
    pub fn set(&self, now: DateTime<Utc>) {
        let mut guard = self.now.lock().unwrap_or_else(|p| p.into_inner());
        *guard = now;
    }

    /// Avanza la hora.
    pub fn advance(&self, by: chrono::Duration) {
        let mut guard = self.now.lock().unwrap_or_else(|p| p.into_inner());
        *guard += by;
    }
}

impl Clock for FixedClock {
    fn now(&self) -> DateTime<Utc> {
        *self.now.lock().unwrap_or_else(|p| p.into_inner())
    }
}

/// Opciones del motor.
#[derive(Debug, Clone)]
pub struct EngineOptions {
    pub clock: Arc<dyn Clock>,
    /// Desfase horario local para fechas de actividad, rachas y vencimientos del repaso.
    pub utc_offset: FixedOffset,
    /// Commit corto con el que se compiló la aplicación (lo aporta la capa de escritorio).
    pub git_commit: Option<String>,
}

impl EngineOptions {
    /// Reloj del sistema y zona horaria local actual.
    pub fn system() -> Self {
        Self {
            clock: Arc::new(SystemClock),
            utc_offset: Local::now().offset().fix(),
            git_commit: None,
        }
    }

    /// Reloj dado y UTC (tests deterministas).
    pub fn with_clock(clock: Arc<dyn Clock>) -> Self {
        Self {
            clock,
            utc_offset: Utc.fix(),
            git_commit: None,
        }
    }

    /// Indica el commit de compilación (vacío → sin commit).
    pub fn with_git_commit(mut self, commit: Option<&str>) -> Self {
        self.git_commit = commit
            .map(str::trim)
            .filter(|c| !c.is_empty())
            .map(str::to_string);
        self
    }
}

/// Motor de OpoTAI: catálogo embebido + base de datos del usuario.
#[derive(Debug)]
pub struct Engine {
    catalog: Catalog,
    db: Database,
    options: EngineOptions,
    predictions: HashMap<String, Arc<PredictionContext>>,
    destinations: HashMap<Access, Arc<DestinationContext>>,
    pending_draws: HashMap<String, PendingDraw>,
}

/// Longitud máxima del nombre de perfil.
const MAX_NAME_CHARS: usize = 40;
/// Longitud máxima del avatar de texto (un emoji puede ocupar varios caracteres). El avatar
/// también puede ser una imagen propia (`data:image/…;base64,…`, ver [`is_avatar_image`]).
const MAX_AVATAR_CHARS: usize = 16;
/// Máximo de localidades preferidas.
const MAX_PREFERRED: usize = 3;

impl Engine {
    /// Crea el motor con reloj del sistema.
    pub fn new(catalog: Catalog, db: Database) -> Self {
        Self::with_options(catalog, db, EngineOptions::system())
    }

    /// Crea el motor con opciones explícitas.
    pub fn with_options(catalog: Catalog, db: Database, options: EngineOptions) -> Self {
        for issue in catalog.report().errors() {
            log::warn!("datos: {} · {}", issue.path, issue.message);
        }
        Self {
            catalog,
            db,
            options,
            predictions: HashMap::new(),
            destinations: HashMap::new(),
            pending_draws: HashMap::new(),
        }
    }

    /// Catálogo cargado.
    pub fn catalog(&self) -> &Catalog {
        &self.catalog
    }

    /// Base de datos.
    pub fn database(&self) -> &Database {
        &self.db
    }

    fn now(&self) -> DateTime<Utc> {
        self.options.clock.now()
    }

    /// Datos del simulador de destinos (cacheados) para un tipo de acceso.
    pub(crate) fn destination_context(&mut self, access: Access) -> Arc<DestinationContext> {
        if let Some(ctx) = self.destinations.get(&access) {
            return Arc::clone(ctx);
        }
        let ctx = Arc::new(DestinationContext::build(&self.catalog, access));
        self.destinations.insert(access, Arc::clone(&ctx));
        ctx
    }

    /// Contexto de predicción (cacheado) para una convocatoria objetivo.
    pub(crate) fn prediction_context(&mut self, target: Option<&str>) -> Arc<PredictionContext> {
        let key = target.unwrap_or_default().to_string();
        if let Some(ctx) = self.predictions.get(&key) {
            return Arc::clone(ctx);
        }
        let ctx = Arc::new(PredictionContext::build(&self.catalog, target));
        self.predictions.insert(key, Arc::clone(&ctx));
        ctx
    }

    // ───────────────────────────── Información ─────────────────────────────

    /// `get_app_info`.
    pub fn get_app_info(&self) -> AppInfo {
        let banks = self.catalog.banks();
        let questions = self.catalog.all_questions();
        let (mut total, mut explained) = (0u32, 0u32);
        for r in questions {
            total += 1;
            if r.question.has_explanation() {
                explained += 1;
            }
        }
        AppInfo {
            name: APP_NAME.to_string(),
            version: VERSION.to_string(),
            git_commit: self.options.git_commit.clone(),
            author: AUTHOR.to_string(),
            copyright: crate::copyright_line(self.now().with_timezone(&Local).year()),
            license: LICENSE.to_string(),
            license_name: LICENSE_NAME.to_string(),
            repository: REPOSITORY.to_string(),
            data_updated: if self.catalog.presence().convocatorias {
                self.catalog.convocatorias().updated.clone()
            } else {
                None
            },
            banks: banks.len() as u32,
            questions: total,
            questions_with_explanation: explained,
            official_exams: banks
                .iter()
                .filter(|b| b.kind == crate::model::BankKind::Official)
                .count() as u32,
            theory_topics: self.catalog.theory().len() as u32,
            db_path: self
                .db
                .path()
                .map(|p| p.display().to_string())
                .unwrap_or_else(|| ":memory:".to_string()),
        }
    }

    /// `get_license_text`: texto íntegro de la licencia (GPL-3.0-or-later).
    pub fn get_license_text(&self) -> String {
        LICENSE_TEXT.to_string()
    }

    // ───────────────────────────── Teoría ─────────────────────────────

    fn theory_summary(&self, entry: &crate::model::TheoryEntry) -> Option<TheorySummary> {
        let block = BlockId::from_topic(&entry.topic)?;
        Some(TheorySummary {
            topic: entry.topic.clone(),
            block,
            title: entry.title.clone(),
            summary: entry.summary.clone(),
            reading_minutes: entry.reading_minutes.max(1),
            key_points: entry.key_points.clone(),
            question_count: self.catalog.topic_question_count(&entry.topic) as u32,
            updated: entry
                .updated
                .clone()
                .or_else(|| self.catalog.theory_updated().map(str::to_string)),
        })
    }

    /// `get_theory_index`: temas con teoría en orden del temario (vacío si no hay datos).
    pub fn get_theory_index(&self) -> Vec<TheorySummary> {
        self.catalog
            .theory()
            .iter()
            .filter_map(|(entry, _)| self.theory_summary(entry))
            .collect()
    }

    /// `get_theory`: Markdown completo de un tema.
    pub fn get_theory(&self, topic_id: &str) -> CoreResult<TheoryTopic> {
        let (entry, content) = self.catalog.theory_for(topic_id.trim()).ok_or_else(|| {
            CoreError::not_found(format!("No hay teoría disponible del tema «{topic_id}»."))
        })?;
        let s = self
            .theory_summary(entry)
            .ok_or_else(|| CoreError::data(format!("Tema de teoría no válido «{topic_id}».")))?;
        Ok(TheoryTopic {
            topic: s.topic,
            block: s.block,
            title: s.title,
            summary: s.summary,
            reading_minutes: s.reading_minutes,
            key_points: s.key_points,
            question_count: s.question_count,
            updated: s.updated,
            // Las imágenes `![alt](assets/…)` y los diagramas `![alt](diagramas/…)` de la teoría
            // se sirven como data URI.
            content: self.catalog.rewrite_theory_markdown(content),
            sources: entry.sources.clone(),
        })
    }

    // ───────────────────────────── Perfiles ─────────────────────────────

    fn profile_row(&self, profile_id: &str) -> CoreResult<profiles::ProfileRow> {
        profiles::get(self.db.conn(), profile_id)?
            .ok_or_else(|| CoreError::not_found("No existe el perfil."))
    }

    fn validate_profile_fields(
        &self,
        name: &str,
        color: &str,
        avatar: Option<String>,
        exclude: Option<&str>,
    ) -> CoreResult<(String, String, Option<String>)> {
        let name = name.trim().to_string();
        let len = name.chars().count();
        if len == 0 || len > MAX_NAME_CHARS {
            return Err(CoreError::invalid(format!(
                "El nombre debe tener entre 1 y {MAX_NAME_CHARS} caracteres."
            )));
        }
        if profiles::name_taken(self.db.conn(), &name, exclude)? {
            return Err(CoreError::conflict(format!(
                "Ya existe un perfil llamado «{name}»."
            )));
        }
        let color = color.trim().to_string();
        if !is_hex_color(&color) {
            return Err(CoreError::invalid(
                "El color debe ser hexadecimal, por ejemplo #7c3aed.",
            ));
        }
        let avatar = avatar
            .map(|a| a.trim().to_string())
            .filter(|a| !a.is_empty());
        if let Some(a) = avatar.as_deref() {
            if a.starts_with("data:") {
                if !is_avatar_image(a) {
                    return Err(CoreError::invalid(
                        "La imagen del avatar no es válida: usa una imagen PNG, JPEG, WebP o GIF \
                         de hasta 2 MB.",
                    ));
                }
            } else if a.chars().count() > MAX_AVATAR_CHARS {
                return Err(CoreError::invalid("El avatar es demasiado largo."));
            }
        }
        Ok((name, color, avatar))
    }

    fn to_profile(row: profiles::ProfileRow) -> Profile {
        Profile {
            id: row.id,
            name: row.name,
            color: row.color,
            avatar: row.avatar,
            created_at: row.created_at,
            last_active_at: row.last_active_at,
        }
    }

    /// `list_profiles`: último activo primero.
    pub fn list_profiles(&self) -> CoreResult<Vec<Profile>> {
        Ok(profiles::list(self.db.conn())?
            .into_iter()
            .map(Self::to_profile)
            .collect())
    }

    /// `create_profile`.
    pub fn create_profile(
        &mut self,
        name: &str,
        color: &str,
        avatar: Option<String>,
    ) -> CoreResult<Profile> {
        let (name, color, avatar) = self.validate_profile_fields(name, color, avatar, None)?;
        let row = profiles::ProfileRow {
            id: uuid::Uuid::new_v4().to_string(),
            name,
            color,
            avatar,
            created_at: iso(self.now()),
            last_active_at: None,
            settings_json: None,
        };
        profiles::insert(self.db.conn(), &row)?;
        Ok(Self::to_profile(row))
    }

    /// `update_profile`.
    pub fn update_profile(
        &mut self,
        profile_id: &str,
        name: &str,
        color: &str,
        avatar: Option<String>,
    ) -> CoreResult<Profile> {
        self.profile_row(profile_id)?;
        let (name, color, avatar) =
            self.validate_profile_fields(name, color, avatar, Some(profile_id))?;
        profiles::update(self.db.conn(), profile_id, &name, &color, avatar.as_deref())?;
        Ok(Self::to_profile(self.profile_row(profile_id)?))
    }

    /// `delete_profile`: borra en cascada intentos y estadísticas.
    pub fn delete_profile(&mut self, profile_id: &str) -> CoreResult<()> {
        if profiles::delete(self.db.conn(), profile_id)? == 0 {
            return Err(CoreError::not_found("No existe el perfil."));
        }
        self.pending_draws.remove(profile_id);
        Ok(())
    }

    /// `touch_profile`: marca el perfil como activo.
    pub fn touch_profile(&mut self, profile_id: &str) -> CoreResult<Profile> {
        if profiles::touch(self.db.conn(), profile_id, &iso(self.now()))? == 0 {
            return Err(CoreError::not_found("No existe el perfil."));
        }
        Ok(Self::to_profile(self.profile_row(profile_id)?))
    }

    // ───────────────────────────── Ajustes ─────────────────────────────

    /// Esquema de la convocatoria objetivo del perfil (si la tiene y existe en los datos).
    pub(crate) fn target_scheme(&self, profile_id: &str) -> Option<&crate::model::ScoringScheme> {
        let target = self.get_settings(profile_id).ok()?.target_convocatoria?;
        let scheme_id = self.catalog.convocatoria(&target)?.scoring_scheme.clone()?;
        self.catalog.scheme(&scheme_id)
    }

    /// `get_settings`: valores por defecto si no hay guardados (o para campos nuevos).
    pub fn get_settings(&self, profile_id: &str) -> CoreResult<Settings> {
        let row = self.profile_row(profile_id)?;
        Ok(match row.settings_json.as_deref() {
            Some(json) => serde_json::from_str(json).unwrap_or_else(|err| {
                log::warn!("ajustes ilegibles del perfil {profile_id}: {err}");
                Settings::default()
            }),
            None => Settings::default(),
        })
    }

    fn normalize_settings(&self, mut s: Settings) -> CoreResult<Settings> {
        s.accent = s.accent.trim().to_string();
        if !is_hex_color(&s.accent) {
            return Err(CoreError::invalid(
                "El color de acento debe ser hexadecimal, por ejemplo #7c3aed.",
            ));
        }
        if !s.sound_volume.is_finite() || !(0.0..=1.0).contains(&s.sound_volume) {
            return Err(CoreError::invalid("El volumen debe estar entre 0 y 1."));
        }
        if let Some(r) = s.cutoff_override_ratio {
            if !r.is_finite() || !(0.0..=1.0).contains(&r) {
                return Err(CoreError::invalid(
                    "El corte personalizado debe estar entre 0 y 1.",
                ));
            }
        }
        s.target_convocatoria = s
            .target_convocatoria
            .map(|t| t.trim().to_string())
            .filter(|t| !t.is_empty());
        if let Some(target) = s.target_convocatoria.as_deref() {
            if self.catalog.convocatoria(target).is_none() {
                return Err(CoreError::invalid(format!(
                    "La convocatoria «{target}» no existe."
                )));
            }
        }
        s.exam_date = s
            .exam_date
            .map(|d| d.trim().to_string())
            .filter(|d| !d.is_empty());
        if s.exam_date.as_deref().is_some_and(|d| !is_iso_date(d)) {
            return Err(CoreError::invalid(
                "La fecha del examen debe tener el formato AAAA-MM-DD.",
            ));
        }
        let mut preferred: Vec<String> = Vec::new();
        for name in s.preferred_localities.iter().map(|n| n.trim()) {
            if !name.is_empty()
                && !preferred
                    .iter()
                    .any(|p| normalize_key(p) == normalize_key(name))
            {
                preferred.push(name.to_string());
            }
        }
        if preferred.len() > MAX_PREFERRED {
            return Err(CoreError::invalid(format!(
                "Puedes elegir como máximo {MAX_PREFERRED} localidades preferidas."
            )));
        }
        s.preferred_localities = preferred;
        Ok(s)
    }

    /// `update_settings`: valida rangos y guarda.
    pub fn update_settings(
        &mut self,
        profile_id: &str,
        settings: Settings,
    ) -> CoreResult<Settings> {
        self.profile_row(profile_id)?;
        let settings = self.normalize_settings(settings)?;
        let json = serde_json::to_string(&settings)
            .map_err(|e| CoreError::internal(format!("no se pueden guardar los ajustes: {e}")))?;
        profiles::set_settings(self.db.conn(), profile_id, &json)?;
        Ok(settings)
    }
}
