// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
use std::path::Path;
use std::process::Command;

/// Carpetas de `data/` que se embeben en el binario con `include_dir!`.
const EMBEDDED: [&str; 3] = ["../../data/banks", "../../data/meta", "../../data/teoria"];

/// Commit corto de compilación: `OPOTAI_GIT_COMMIT` si viene definida (CI) o
/// `git rev-parse --short HEAD`. Sin git disponible no se define (la app muestra «sin commit»).
fn git_commit() -> Option<String> {
    if let Ok(value) = std::env::var("OPOTAI_GIT_COMMIT") {
        let value = value.trim().to_string();
        if !value.is_empty() {
            return Some(value);
        }
    }
    let output = Command::new("git")
        .args(["rev-parse", "--short", "HEAD"])
        .output()
        .ok()?;
    if !output.status.success() {
        return None;
    }
    let commit = String::from_utf8(output.stdout).ok()?.trim().to_string();
    (!commit.is_empty()).then_some(commit)
}

/// Recompila al cambiar de commit (HEAD y la rama a la que apunta), si existen.
fn watch_git_head() {
    let git = Path::new("../../.git");
    let head = git.join("HEAD");
    if !head.is_file() {
        return;
    }
    println!("cargo:rerun-if-changed={}", head.display());
    if let Ok(content) = std::fs::read_to_string(&head) {
        if let Some(reference) = content.trim().strip_prefix("ref: ") {
            let file = git.join(reference);
            if file.is_file() {
                println!("cargo:rerun-if-changed={}", file.display());
            }
        }
    }
    let packed = git.join("packed-refs");
    if packed.is_file() {
        println!("cargo:rerun-if-changed={}", packed.display());
    }
}

fn main() {
    for dir in EMBEDDED {
        // `include_dir!` exige que la carpeta exista; en un clon sin datos (p. ej. sin teoría
        // todavía) se crea vacía y la aplicación arranca igual con el catálogo vacío.
        if !Path::new(dir).exists() {
            if let Err(err) = std::fs::create_dir_all(dir) {
                println!("cargo:warning=no se puede crear {dir}: {err}");
            }
        }
        // Recompila si cambian los datos embebidos (bancos, metadatos y teoría).
        println!("cargo:rerun-if-changed={dir}");
    }

    println!("cargo:rerun-if-env-changed=OPOTAI_GIT_COMMIT");
    watch_git_head();
    if let Some(commit) = git_commit() {
        println!("cargo:rustc-env=OPOTAI_GIT_COMMIT={commit}");
    }

    tauri_build::build()
}
