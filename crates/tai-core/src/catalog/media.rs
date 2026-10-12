// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
//! Imágenes de los bancos y diagramas de la teoría: data URI (base64) con caché por ruta y
//! reescritura de las referencias en línea `![alt](assets/…)` de los campos Markdown (y, en la
//! teoría, `![alt](diagramas/…)`, relativas a `data/teoria/`).
//!
//! - `Media.data_url` = `data:<mime>;base64,…` con el MIME según la extensión
//!   (png, jpg/jpeg, gif, webp, svg).
//! - Las referencias `![alt](assets/<banco>/<fichero>)` (con título opcional) se sustituyen por
//!   el data URI. Si el fichero no existe se deja la referencia tal cual y se registra un aviso
//!   (una sola vez por ruta).
//! - Cada imagen se codifica una sola vez: la caché guarda el data URI por ruta.

use std::collections::{HashMap, HashSet};
use std::sync::{Arc, RwLock};

use base64::Engine as _;

use super::Catalog;
use crate::model::Media;

/// Caché de data URI por ruta (compartida entre clones del catálogo).
#[derive(Debug, Default)]
pub(super) struct MediaCache {
    urls: RwLock<HashMap<String, Arc<str>>>,
    warned: RwLock<HashSet<String>>,
}

/// MIME de una imagen por su extensión.
pub fn mime_for(path: &str) -> &'static str {
    let ext = path
        .rsplit('.')
        .next()
        .unwrap_or_default()
        .to_ascii_lowercase();
    match ext.as_str() {
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "svg" => "image/svg+xml",
        "webp" => "image/webp",
        "bmp" => "image/bmp",
        _ => "application/octet-stream",
    }
}

/// Normaliza una ruta de imagen relativa a `data/banks/` (`./assets/…` → `assets/…`).
fn normalize_asset_path(path: &str) -> &str {
    path.trim().trim_start_matches("./")
}

impl Catalog {
    fn warn_missing(&self, path: &str) {
        let mut warned = self
            .media_cache
            .warned
            .write()
            .unwrap_or_else(|p| p.into_inner());
        if warned.insert(path.to_string()) {
            log::warn!("imagen no encontrada en los datos embebidos: {path}");
        }
    }

    /// Data URI (cacheado) de `key`; `bytes` da el contenido si aún no está en la caché.
    fn cached_data_url<'a>(
        &'a self,
        key: &str,
        bytes: impl FnOnce() -> Option<&'a [u8]>,
    ) -> Option<Arc<str>> {
        {
            let urls = self
                .media_cache
                .urls
                .read()
                .unwrap_or_else(|p| p.into_inner());
            if let Some(url) = urls.get(key) {
                return Some(Arc::clone(url));
            }
        }
        let Some(bytes) = bytes() else {
            self.warn_missing(key);
            return None;
        };
        let encoded = base64::engine::general_purpose::STANDARD.encode(bytes);
        let url: Arc<str> = Arc::from(format!("data:{};base64,{encoded}", mime_for(key)));
        let mut urls = self
            .media_cache
            .urls
            .write()
            .unwrap_or_else(|p| p.into_inner());
        urls.insert(key.to_string(), Arc::clone(&url));
        Some(url)
    }

    /// Data URI (cacheado) de una imagen o `None` si no está disponible.
    pub fn media_data_url_shared(&self, path: &str) -> Option<Arc<str>> {
        let path = normalize_asset_path(path);
        self.cached_data_url(path, || self.asset(path))
    }

    /// Data URI (cacheado) de un diagrama de la teoría (`diagramas/…`, relativa a
    /// `data/teoria/`) o `None` si no existe.
    pub fn theory_data_url_shared(&self, path: &str) -> Option<Arc<str>> {
        let path = normalize_asset_path(path);
        if !path.starts_with("diagramas/") || path.split('/').any(|seg| seg == "..") {
            return None;
        }
        let key = format!("teoria/{path}");
        self.cached_data_url(&key, || self.theory_asset(path))
    }

    /// Data URI de una imagen (`path` relativa a `data/banks/`).
    pub fn media_data_url(&self, path: &str) -> Option<String> {
        self.media_data_url_shared(path).map(|u| u.to_string())
    }

    /// Copia de una lista de imágenes con el `data_url` relleno.
    pub fn resolve_media(&self, media: &[Media]) -> Vec<Media> {
        media
            .iter()
            .map(|m| Media {
                path: m.path.clone(),
                alt: m.alt.clone(),
                data_url: self.media_data_url(&m.path),
            })
            .collect()
    }

    /// Reescribe las imágenes en línea `![alt](assets/…)` de un texto Markdown a data URI.
    pub fn rewrite_markdown(&self, text: &str) -> String {
        rewrite_images(text, |url| {
            url.starts_with("assets/")
                .then(|| self.media_data_url_shared(url))
                .flatten()
        })
    }

    /// Reescritura del Markdown de la teoría: además de `![alt](assets/…)` (imágenes de los
    /// bancos), resuelve los diagramas `![alt](diagramas/…)` de `data/teoria/diagramas/`.
    pub fn rewrite_theory_markdown(&self, text: &str) -> String {
        rewrite_images(text, |url| {
            if url.starts_with("assets/") {
                self.media_data_url_shared(url)
            } else if url.starts_with("diagramas/") {
                self.theory_data_url_shared(url)
            } else {
                None
            }
        })
    }

    /// Reescritura de un campo opcional.
    pub fn rewrite_opt(&self, text: Option<&str>) -> Option<String> {
        text.map(|t| self.rewrite_markdown(t))
    }

    /// Reescritura de una lista de textos (opciones).
    pub fn rewrite_all(&self, texts: &[String]) -> Vec<String> {
        texts.iter().map(|t| self.rewrite_markdown(t)).collect()
    }

    /// Reescritura de las notas por opción.
    pub fn rewrite_notes(
        &self,
        notes: Option<&Vec<Option<String>>>,
    ) -> Option<Vec<Option<String>>> {
        notes.map(|list| {
            list.iter()
                .map(|n| n.as_deref().map(|t| self.rewrite_markdown(t)))
                .collect()
        })
    }
}

/// Sustituye la URL de cada imagen en línea por lo que devuelva `resolve` (si devuelve algo).
fn rewrite_images(text: &str, resolve: impl Fn(&str) -> Option<Arc<str>>) -> String {
    if !text.contains("](") {
        return text.to_string();
    }
    let mut out = String::with_capacity(text.len());
    let mut rest = text;
    while let Some(start) = rest.find("![") {
        let (before, candidate) = rest.split_at(start);
        out.push_str(before);
        match parse_image(candidate) {
            Some(img) => {
                match resolve(img.url) {
                    Some(data_url) => {
                        out.push_str(&candidate[..img.url_start]);
                        out.push_str(&data_url);
                        out.push_str(&candidate[img.url_end..img.end]);
                    }
                    None => out.push_str(&candidate[..img.end]),
                }
                rest = &candidate[img.end..];
            }
            None => {
                out.push_str("![");
                rest = &candidate[2..];
            }
        }
    }
    out.push_str(rest);
    out
}

/// Sustituye las imágenes en línea por un rótulo «[Figura: …]» (vistas previas ligeras, sin
/// incrustar las imágenes).
pub fn strip_images(text: &str) -> String {
    if !text.contains("![") {
        return text.to_string();
    }
    let mut out = String::with_capacity(text.len());
    let mut rest = text;
    while let Some(start) = rest.find("![") {
        let (before, candidate) = rest.split_at(start);
        out.push_str(before);
        match parse_image(candidate) {
            Some(img) => {
                let alt = candidate
                    .get(2..img.url_start.saturating_sub(2))
                    .unwrap_or("")
                    .trim();
                let short = alt.split([':', '.']).next().unwrap_or(alt).trim();
                if short.is_empty() {
                    out.push_str("*[Figura]*");
                } else {
                    out.push_str(&format!("*[Figura: {short}]*"));
                }
                rest = &candidate[img.end..];
            }
            None => {
                out.push_str("![");
                rest = &candidate[2..];
            }
        }
    }
    out.push_str(rest);
    out
}

/// Imagen Markdown localizada dentro de un texto que empieza por `![`.
struct InlineImage<'a> {
    url: &'a str,
    /// Posición (en bytes) del inicio y fin de la URL.
    url_start: usize,
    url_end: usize,
    /// Fin de la construcción completa (tras el `)`).
    end: usize,
}

/// Reconoce `![alt](url)` o `![alt](url "título")` al principio de `s`.
fn parse_image(s: &str) -> Option<InlineImage<'_>> {
    let after_bang = s.strip_prefix("![")?;
    // Texto alternativo con corchetes equilibrados (sin saltos de párrafo).
    let mut depth = 1usize;
    let mut alt_end = None;
    for (i, ch) in after_bang.char_indices() {
        match ch {
            '[' => depth += 1,
            ']' => {
                depth -= 1;
                if depth == 0 {
                    alt_end = Some(i);
                    break;
                }
            }
            '\n' if after_bang[..i].ends_with('\n') => return None,
            _ => {}
        }
    }
    let alt_end = alt_end?;
    let after_alt = &after_bang[alt_end + 1..];
    let inner = after_alt.strip_prefix('(')?;
    let close = inner.find(')')?;
    let inside = &inner[..close];
    let leading = inside.len() - inside.trim_start().len();
    let url_part = inside.trim_start();
    let url_len = url_part
        .find(|c: char| c.is_whitespace())
        .unwrap_or(url_part.len());
    let url = &url_part[..url_len];
    if url.is_empty() {
        return None;
    }
    let base = 2 + alt_end + 1 + 1; // "![" + alt + "]" + "("
    let url_start = base + leading;
    Some(InlineImage {
        url,
        url_start,
        url_end: url_start + url_len,
        end: base + close + 1,
    })
}

#[cfg(test)]
mod tests {
    use std::borrow::Cow;

    use super::*;

    fn catalog() -> Catalog {
        Catalog::from_files(vec![(
            "banks/assets/b/fig.png",
            Cow::Borrowed(&b"\x89PNG\r\n"[..]),
        )])
    }

    #[test]
    fn rewrites_inline_images_and_keeps_missing_ones() {
        let c = catalog();
        let text = "Mira ![esquema](assets/b/fig.png \"Figura 1\") y ![otra](assets/b/no.png).";
        let out = c.rewrite_markdown(text);
        assert!(out.starts_with("Mira ![esquema](data:image/png;base64,"));
        assert!(out.contains("\"Figura 1\")"));
        assert!(out.ends_with(" y ![otra](assets/b/no.png)."));
        // Sin imágenes no cambia nada.
        assert_eq!(
            c.rewrite_markdown("[enlace](https://x) ![a"),
            "[enlace](https://x) ![a"
        );
        // Imágenes externas no se tocan.
        assert_eq!(
            c.rewrite_markdown("![x](https://example.org/a.png)"),
            "![x](https://example.org/a.png)"
        );
    }

    #[test]
    fn data_urls_are_cached() {
        let c = catalog();
        let a = c.media_data_url_shared("assets/b/fig.png").expect("imagen");
        let b = c
            .media_data_url_shared("./assets/b/fig.png")
            .expect("imagen");
        assert!(Arc::ptr_eq(&a, &b));
        assert!(a.starts_with("data:image/png;base64,"));
        assert_eq!(mime_for("x.JPG"), "image/jpeg");
        assert_eq!(mime_for("x.webp"), "image/webp");
        assert_eq!(mime_for("x.svg"), "image/svg+xml");
    }

    #[test]
    fn nested_alt_brackets() {
        let c = catalog();
        let out = c.rewrite_markdown("![tabla [A]](assets/b/fig.png)");
        assert!(out.starts_with("![tabla [A]](data:image/png;base64,"));
        assert!(out.ends_with(')'));
    }

    #[test]
    fn theory_diagrams_resolve_only_in_theory() {
        let c = Catalog::from_files(vec![
            ("banks/assets/b/fig.png", Cow::Borrowed(&b"\x89PNG\r\n"[..])),
            (
                "teoria/diagramas/IV.7-capas.svg",
                Cow::Borrowed(&b"<svg xmlns='http://www.w3.org/2000/svg'/>"[..]),
            ),
        ]);
        let text =
            "![Capas](diagramas/IV.7-capas.svg)\n\n![b](assets/b/fig.png) ![n](diagramas/no.svg)";
        let out = c.rewrite_theory_markdown(text);
        assert!(out.starts_with("![Capas](data:image/svg+xml;base64,"));
        assert!(out.contains("![b](data:image/png;base64,"));
        assert!(out.ends_with("![n](diagramas/no.svg)"));
        // Los campos de los bancos no resuelven diagramas de la teoría.
        assert_eq!(
            c.rewrite_markdown("![Capas](diagramas/IV.7-capas.svg)"),
            "![Capas](diagramas/IV.7-capas.svg)"
        );
        // Ni rutas fuera de `diagramas/` ni con `..`.
        assert!(c.theory_data_url_shared("diagramas/../IV.7.md").is_none());
        assert!(c.theory_data_url_shared("IV.7.md").is_none());
        // Un diagrama no es una imagen de banco.
        assert!(c.asset("diagramas/IV.7-capas.svg").is_none());
    }
}
