// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
//! OpoTAI · capa de escritorio (Tauri 2).
//!
//! Capa fina sobre [`tai_core::Engine`]: cada comando IPC del contrato
//! (`docs/CONTRATO-API.md`) se traduce a un método del motor. Toda la lógica vive en
//! `crates/tai-core`.
//!
//! - Datos **embebidos** en el binario con `include_dir!` (`data/banks`, `data/meta`,
//!   `data/teoria`).
//! - Progreso del usuario en `app_data_dir()/opotai.sqlite3`.
//! - Los comandos son `async` y ejecutan el motor en un hilo de bloqueo, así que nunca
//!   bloquean el hilo principal ni la interfaz.
//!
//! Autor: Eric Valls Gramunt.

use std::borrow::Cow;
use std::sync::{Arc, Mutex, PoisonError};

use include_dir::{Dir, DirEntry, include_dir};
use tai_core::api::{
    ActiveAttempt, AnswerFeedback, AppInfo, AttemptResult, AttemptSummary, CalculatorResult,
    CatalogInfo, DestinationSimulation, ExamPaper, ExamSpec, Letter, LocalityInfo,
    ManualGradeInput, Profile, ProfileStats, ProgressPayload, RandomDraw, ReviewSummary, Settings,
    TheorySummary, TheoryTopic,
};
use tai_core::{ApiError, Catalog, CoreResult, Database, Engine, EngineOptions};
use tauri::{Manager, State};

/// Bancos de preguntas e imágenes.
static BANKS: Dir<'static> = include_dir!("$CARGO_MANIFEST_DIR/../../data/banks");
/// Metadatos (puntuación, convocatorias, temario, localidades, destinos).
static META: Dir<'static> = include_dir!("$CARGO_MANIFEST_DIR/../../data/meta");
/// Teoría por tema.
static TEORIA: Dir<'static> = include_dir!("$CARGO_MANIFEST_DIR/../../data/teoria");

/// Recorre un directorio embebido y añade sus ficheros con rutas relativas a `data/`.
fn collect(dir: &'static Dir<'static>, prefix: &str, out: &mut Vec<(String, Cow<'static, [u8]>)>) {
    for entry in dir.entries() {
        match entry {
            DirEntry::Dir(sub) => collect(sub, prefix, out),
            DirEntry::File(file) => {
                let rel = file.path().to_string_lossy().replace('\\', "/");
                out.push((format!("{prefix}/{rel}"), Cow::Borrowed(file.contents())));
            }
        }
    }
}

/// Ficheros embebidos (sin copiar: los bytes están en el binario).
fn embedded_files() -> Vec<(String, Cow<'static, [u8]>)> {
    let mut files = Vec::new();
    collect(&BANKS, "banks", &mut files);
    collect(&META, "meta", &mut files);
    collect(&TEORIA, "teoria", &mut files);
    files
}

/// Estado compartido: el motor protegido por un mutex.
struct AppState {
    engine: Arc<Mutex<Engine>>,
}

/// Ejecuta `f` con el motor en un hilo de bloqueo.
async fn with_engine<T, F>(state: &AppState, f: F) -> Result<T, ApiError>
where
    T: Send + 'static,
    F: FnOnce(&mut Engine) -> CoreResult<T> + Send + 'static,
{
    let engine = Arc::clone(&state.engine);
    tauri::async_runtime::spawn_blocking(move || {
        let mut guard = engine.lock().unwrap_or_else(PoisonError::into_inner);
        f(&mut guard).map_err(ApiError::from)
    })
    .await
    .map_err(|e| ApiError::internal(format!("La operación no se ha podido completar: {e}")))?
}

// ───────────────────────────── Información y catálogo ─────────────────────────────

#[tauri::command(rename_all = "snake_case")]
async fn get_app_info(state: State<'_, AppState>) -> Result<AppInfo, ApiError> {
    with_engine(&state, |e| Ok(e.get_app_info())).await
}

#[tauri::command(rename_all = "snake_case")]
async fn get_license_text(state: State<'_, AppState>) -> Result<String, ApiError> {
    with_engine(&state, |e| Ok(e.get_license_text())).await
}

#[tauri::command(rename_all = "snake_case")]
async fn get_catalog(state: State<'_, AppState>) -> Result<CatalogInfo, ApiError> {
    with_engine(&state, |e| Ok(e.get_catalog())).await
}

#[tauri::command(rename_all = "snake_case")]
async fn list_localities(state: State<'_, AppState>) -> Result<Vec<LocalityInfo>, ApiError> {
    with_engine(&state, |e| Ok(e.list_localities())).await
}

#[tauri::command(rename_all = "snake_case")]
async fn get_theory_index(state: State<'_, AppState>) -> Result<Vec<TheorySummary>, ApiError> {
    with_engine(&state, |e| Ok(e.get_theory_index())).await
}

#[tauri::command(rename_all = "snake_case")]
async fn get_theory(state: State<'_, AppState>, topic_id: String) -> Result<TheoryTopic, ApiError> {
    with_engine(&state, move |e| e.get_theory(&topic_id)).await
}

// ───────────────────────────── Perfiles y ajustes ─────────────────────────────

#[tauri::command(rename_all = "snake_case")]
async fn list_profiles(state: State<'_, AppState>) -> Result<Vec<Profile>, ApiError> {
    with_engine(&state, |e| e.list_profiles()).await
}

#[tauri::command(rename_all = "snake_case")]
async fn create_profile(
    state: State<'_, AppState>,
    name: String,
    color: String,
    avatar: Option<String>,
) -> Result<Profile, ApiError> {
    with_engine(&state, move |e| e.create_profile(&name, &color, avatar)).await
}

#[tauri::command(rename_all = "snake_case")]
async fn update_profile(
    state: State<'_, AppState>,
    profile_id: String,
    name: String,
    color: String,
    avatar: Option<String>,
) -> Result<Profile, ApiError> {
    with_engine(&state, move |e| {
        e.update_profile(&profile_id, &name, &color, avatar)
    })
    .await
}

#[tauri::command(rename_all = "snake_case")]
async fn delete_profile(state: State<'_, AppState>, profile_id: String) -> Result<(), ApiError> {
    with_engine(&state, move |e| e.delete_profile(&profile_id)).await
}

#[tauri::command(rename_all = "snake_case")]
async fn touch_profile(
    state: State<'_, AppState>,
    profile_id: String,
) -> Result<Profile, ApiError> {
    with_engine(&state, move |e| e.touch_profile(&profile_id)).await
}

#[tauri::command(rename_all = "snake_case")]
async fn get_settings(
    state: State<'_, AppState>,
    profile_id: String,
) -> Result<Settings, ApiError> {
    with_engine(&state, move |e| e.get_settings(&profile_id)).await
}

#[tauri::command(rename_all = "snake_case")]
async fn update_settings(
    state: State<'_, AppState>,
    profile_id: String,
    settings: Settings,
) -> Result<Settings, ApiError> {
    with_engine(&state, move |e| e.update_settings(&profile_id, settings)).await
}

// ───────────────────────────── Exámenes ─────────────────────────────

#[tauri::command(rename_all = "snake_case")]
async fn start_exam(
    state: State<'_, AppState>,
    profile_id: String,
    spec: ExamSpec,
) -> Result<ExamPaper, ApiError> {
    with_engine(&state, move |e| e.start_exam(&profile_id, spec)).await
}

#[tauri::command(rename_all = "snake_case")]
async fn draw_random_exam(
    state: State<'_, AppState>,
    profile_id: String,
) -> Result<RandomDraw, ApiError> {
    with_engine(&state, move |e| e.draw_random_exam(&profile_id)).await
}

#[tauri::command(rename_all = "snake_case")]
async fn get_active_attempt(
    state: State<'_, AppState>,
    profile_id: String,
) -> Result<Option<ActiveAttempt>, ApiError> {
    with_engine(&state, move |e| e.get_active_attempt(&profile_id)).await
}

#[tauri::command(rename_all = "snake_case")]
async fn save_progress(
    state: State<'_, AppState>,
    progress: ProgressPayload,
) -> Result<(), ApiError> {
    with_engine(&state, move |e| e.save_progress(&progress)).await
}

#[tauri::command(rename_all = "snake_case")]
async fn check_answer(
    state: State<'_, AppState>,
    attempt_id: String,
    question_id: String,
    choice: Option<Letter>,
) -> Result<AnswerFeedback, ApiError> {
    with_engine(&state, move |e| {
        e.check_answer(&attempt_id, &question_id, choice)
    })
    .await
}

#[tauri::command(rename_all = "snake_case")]
async fn submit_exam(
    state: State<'_, AppState>,
    progress: ProgressPayload,
) -> Result<AttemptResult, ApiError> {
    with_engine(&state, move |e| e.submit_exam(&progress)).await
}

#[tauri::command(rename_all = "snake_case")]
async fn abandon_exam(state: State<'_, AppState>, attempt_id: String) -> Result<(), ApiError> {
    with_engine(&state, move |e| e.abandon_exam(&attempt_id)).await
}

#[tauri::command(rename_all = "snake_case")]
async fn list_attempts(
    state: State<'_, AppState>,
    profile_id: String,
    limit: Option<u32>,
) -> Result<Vec<AttemptSummary>, ApiError> {
    with_engine(&state, move |e| e.list_attempts(&profile_id, limit)).await
}

#[tauri::command(rename_all = "snake_case")]
async fn get_attempt_result(
    state: State<'_, AppState>,
    attempt_id: String,
) -> Result<AttemptResult, ApiError> {
    with_engine(&state, move |e| e.get_attempt_result(&attempt_id)).await
}

#[tauri::command(rename_all = "snake_case")]
async fn delete_attempt(state: State<'_, AppState>, attempt_id: String) -> Result<(), ApiError> {
    with_engine(&state, move |e| e.delete_attempt(&attempt_id)).await
}

// ───────────────────────────── Estadísticas, repaso y calculadora ─────────────────────────────

#[tauri::command(rename_all = "snake_case")]
async fn get_stats(
    state: State<'_, AppState>,
    profile_id: String,
) -> Result<ProfileStats, ApiError> {
    with_engine(&state, move |e| e.get_stats(&profile_id)).await
}

#[tauri::command(rename_all = "snake_case")]
async fn get_review_summary(
    state: State<'_, AppState>,
    profile_id: String,
) -> Result<ReviewSummary, ApiError> {
    with_engine(&state, move |e| e.get_review_summary(&profile_id)).await
}

#[tauri::command(rename_all = "snake_case")]
async fn calculate_grade(
    state: State<'_, AppState>,
    profile_id: Option<String>,
    input: ManualGradeInput,
) -> Result<CalculatorResult, ApiError> {
    with_engine(&state, move |e| {
        e.calculate_grade(profile_id.as_deref(), &input)
    })
    .await
}

#[tauri::command(rename_all = "snake_case")]
async fn simulate_destinations(
    state: State<'_, AppState>,
    profile_id: Option<String>,
    attempt_id: Option<String>,
    input: Option<ManualGradeInput>,
) -> Result<DestinationSimulation, ApiError> {
    with_engine(&state, move |e| {
        e.simulate_destinations(profile_id.as_deref(), attempt_id.as_deref(), input.as_ref())
    })
    .await
}

// ───────────────────────────── Arranque ─────────────────────────────

/// Abre la base de datos del usuario; si falla, usa una en memoria para que la app arranque
/// (el progreso no se guardaría y `AppInfo.db_path` lo indica como `:memory:`).
fn open_database(app: &tauri::App) -> Database {
    let path = app
        .path()
        .app_data_dir()
        .map(|dir| dir.join("opotai.sqlite3"));
    match path {
        Ok(path) => match Database::open(&path) {
            Ok(db) => {
                log::info!("base de datos: {}", path.display());
                return db;
            }
            Err(err) => log::error!("no se puede abrir {}: {err}", path.display()),
        },
        Err(err) => log::error!("no se puede resolver el directorio de datos: {err}"),
    }
    match Database::open_in_memory() {
        Ok(db) => {
            log::warn!("se usa una base de datos en memoria: el progreso no se guardará");
            db
        }
        Err(err) => {
            // Sin SQLite no hay nada que hacer: se informa y se aborta el arranque.
            log::error!("no se puede crear la base de datos en memoria: {err}");
            std::process::exit(1);
        }
    }
}

/// Arranca la aplicación.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let log_plugin = tauri_plugin_log::Builder::new()
        .clear_targets()
        .targets([
            tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Stdout),
            tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::LogDir {
                file_name: Some("opotai".into()),
            }),
        ])
        .level(if cfg!(debug_assertions) {
            log::LevelFilter::Debug
        } else {
            log::LevelFilter::Info
        })
        .max_file_size(2 * 1024 * 1024)
        .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepOne)
        .build();

    let result = tauri::Builder::default()
        .plugin(log_plugin)
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let started = std::time::Instant::now();
            let catalog = Catalog::from_files(embedded_files());
            let report = catalog.report();
            log::info!(
                "catálogo: {} bancos, {} preguntas, {} temas de teoría ({} errores, {} avisos) en {} ms",
                catalog.banks().len(),
                catalog.question_count(),
                catalog.theory().len(),
                report.errors().count(),
                report.warnings().count(),
                started.elapsed().as_millis()
            );
            for issue in report.warnings() {
                log::debug!("datos: {} · {}", issue.path, issue.message);
            }
            let db = open_database(app);
            let options = EngineOptions::system().with_git_commit(option_env!("OPOTAI_GIT_COMMIT"));
            log::info!(
                "OpoTAI {} ({}) · {}",
                tai_core::VERSION,
                options.git_commit.as_deref().unwrap_or("sin commit"),
                tai_core::LICENSE
            );
            app.manage(AppState {
                engine: Arc::new(Mutex::new(Engine::with_options(catalog, db, options))),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_app_info,
            get_license_text,
            get_catalog,
            list_localities,
            get_theory_index,
            get_theory,
            list_profiles,
            create_profile,
            update_profile,
            delete_profile,
            touch_profile,
            get_settings,
            update_settings,
            start_exam,
            draw_random_exam,
            get_active_attempt,
            save_progress,
            check_answer,
            submit_exam,
            abandon_exam,
            list_attempts,
            get_attempt_result,
            delete_attempt,
            get_stats,
            get_review_summary,
            calculate_grade,
            simulate_destinations,
        ])
        .run(tauri::generate_context!());
    if let Err(err) = result {
        log::error!("error al ejecutar OpoTAI: {err}");
        eprintln!("Error al ejecutar OpoTAI: {err}");
        std::process::exit(1);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn git_commit_has_no_spaces_when_known() {
        if let Some(commit) = option_env!("OPOTAI_GIT_COMMIT") {
            assert!(!commit.is_empty() && !commit.contains(char::is_whitespace));
        }
    }

    #[test]
    fn embedded_data_loads() {
        let files = embedded_files();
        let catalog = Catalog::from_files(files);
        assert_eq!(catalog.report().parse_errors().count(), 0);
        assert!(!catalog.default_scheme().parts.is_empty());
    }
}
