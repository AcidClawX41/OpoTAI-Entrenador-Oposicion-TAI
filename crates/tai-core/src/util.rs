// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
//! Utilidades pequeñas: formato de números en castellano, normalización de textos,
//! hash estable y fechas ISO 8601.

use chrono::{DateTime, FixedOffset, NaiveDate, SecondsFormat, Utc};

/// Tolerancia para comparar puntuaciones (las penalizaciones generan tercios).
pub const EPS: f64 = 1e-9;

/// Formatea un entero con separador de miles español: `1030` → `"1.030"`.
pub fn fmt_int(n: u64) -> String {
    let digits = n.to_string();
    let mut out = String::with_capacity(digits.len() + digits.len() / 3);
    for (i, ch) in digits.chars().enumerate() {
        if i > 0 && (digits.len() - i) % 3 == 0 {
            out.push('.');
        }
        out.push(ch);
    }
    out
}

/// Formatea un número real con coma decimal: `fmt_dec(76.339, 2)` → `"76,34"`.
pub fn fmt_dec(x: f64, decimals: usize) -> String {
    if !x.is_finite() {
        return "—".to_string();
    }
    let s = format!("{:.*}", decimals, x.abs());
    let (int_part, frac_part) = match s.split_once('.') {
        Some((i, f)) => (i.to_string(), Some(f.to_string())),
        None => (s.clone(), None),
    };
    let int_value: u64 = int_part.parse().unwrap_or(0);
    let mut out = String::new();
    // Evita "-0,00".
    let rounded_is_zero = s.chars().all(|c| c == '0' || c == '.');
    if x < 0.0 && !rounded_is_zero {
        out.push('-');
    }
    out.push_str(&fmt_int(int_value));
    if let Some(frac) = frac_part {
        out.push(',');
        out.push_str(&frac);
    }
    out
}

/// Formatea una probabilidad 0–1 como porcentaje entero: `0.784` → `"78 %"`.
pub fn fmt_pct(p: f64) -> String {
    let pct = (p.clamp(0.0, 1.0) * 100.0).round();
    format!("{} %", pct as u64)
}

/// Convierte `YYYY-MM-DD` en `DD/MM/YYYY` (devuelve la entrada si no es una fecha).
pub fn fmt_date_es(iso: &str) -> String {
    match NaiveDate::parse_from_str(iso, "%Y-%m-%d") {
        Ok(d) => d.format("%d/%m/%Y").to_string(),
        Err(_) => iso.to_string(),
    }
}

/// Clave de comparación de textos: minúsculas, sin tildes y con espacios colapsados.
pub fn normalize_key(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    let mut last_space = true;
    for ch in s.chars().flat_map(char::to_lowercase) {
        let folded = match ch {
            'á' | 'à' | 'ä' | 'â' => 'a',
            'é' | 'è' | 'ë' | 'ê' => 'e',
            'í' | 'ì' | 'ï' | 'î' => 'i',
            'ó' | 'ò' | 'ö' | 'ô' => 'o',
            'ú' | 'ù' | 'ü' | 'û' => 'u',
            'ñ' => 'n',
            'ç' => 'c',
            c => c,
        };
        if folded.is_whitespace() {
            if !last_space {
                out.push(' ');
                last_space = true;
            }
        } else {
            out.push(folded);
            last_space = false;
        }
    }
    if out.ends_with(' ') {
        out.pop();
    }
    out
}

/// Hash FNV-1a de 64 bits, estable entre versiones y plataformas (semillas deterministas).
#[derive(Debug, Clone, Copy)]
pub struct StableHasher(u64);

impl Default for StableHasher {
    fn default() -> Self {
        Self(0xcbf2_9ce4_8422_2325)
    }
}

impl StableHasher {
    /// Nuevo hasher.
    pub fn new() -> Self {
        Self::default()
    }

    /// Añade bytes.
    pub fn bytes(mut self, data: &[u8]) -> Self {
        for b in data {
            self.0 ^= u64::from(*b);
            self.0 = self.0.wrapping_mul(0x0100_0000_01b3);
        }
        self
    }

    /// Añade un texto (con separador para evitar colisiones por concatenación).
    pub fn str(self, s: &str) -> Self {
        self.bytes(s.as_bytes()).bytes(&[0xff])
    }

    /// Añade un entero.
    pub fn u64(self, v: u64) -> Self {
        self.bytes(&v.to_le_bytes())
    }

    /// Añade un real (por su representación binaria).
    pub fn f64(self, v: f64) -> Self {
        self.u64(v.to_bits())
    }

    /// Resultado.
    pub fn finish(self) -> u64 {
        self.0
    }
}

/// Mezcla SplitMix64: deriva subsemillas independientes a partir de una semilla base.
pub fn mix_seed(base: u64, a: u64, b: u64) -> u64 {
    let mut z = base
        ^ a.wrapping_mul(0x9e37_79b9_7f4a_7c15)
        ^ b.wrapping_mul(0xc2b2_ae3d_27d4_eb4f).rotate_left(17);
    z = (z ^ (z >> 30)).wrapping_mul(0xbf58_476d_1ce4_e5b9);
    z = (z ^ (z >> 27)).wrapping_mul(0x94d0_49bb_1331_11eb);
    z ^ (z >> 31)
}

/// Fecha/hora en ISO 8601 UTC con segundos: `2026-10-11T08:30:00Z`.
pub fn iso(dt: DateTime<Utc>) -> String {
    dt.to_rfc3339_opts(SecondsFormat::Secs, true)
}

/// Interpreta una fecha/hora ISO 8601 (cualquier zona) como UTC.
pub fn parse_iso(s: &str) -> Option<DateTime<Utc>> {
    DateTime::parse_from_rfc3339(s)
        .ok()
        .map(|d| d.with_timezone(&Utc))
}

/// Fecha local (según el desfase indicado) de un instante UTC.
pub fn local_date(dt: DateTime<Utc>, offset: FixedOffset) -> NaiveDate {
    dt.with_timezone(&offset).date_naive()
}

/// Primer instante (UTC) del día local siguiente a `dt`: límite de «vence hoy».
pub fn end_of_local_day(dt: DateTime<Utc>, offset: FixedOffset) -> DateTime<Utc> {
    let next = local_date(dt, offset)
        .succ_opt()
        .unwrap_or_else(|| local_date(dt, offset));
    next.and_hms_opt(0, 0, 0)
        .and_then(|naive| naive.and_local_timezone(offset).single())
        .map(|d| d.with_timezone(&Utc))
        .unwrap_or(dt)
}

/// Valida un color hexadecimal `#rgb` o `#rrggbb`.
pub fn is_hex_color(s: &str) -> bool {
    let Some(hex) = s.strip_prefix('#') else {
        return false;
    };
    (hex.len() == 3 || hex.len() == 6) && hex.chars().all(|c| c.is_ascii_hexdigit())
}

/// Tamaño máximo de una imagen de avatar propia (bytes, ya decodificada): 2 MB. La interfaz la
/// guarda optimizada (lado mayor ≤ 1024 px, recodificada sin metadatos), así que suele ocupar
/// mucho menos; un GIF animado se guarda tal cual para no perder la animación.
pub const MAX_AVATAR_IMAGE_BYTES: usize = 2 * 1024 * 1024;

/// Valida un avatar de imagen propia: `data:image/png|jpeg|webp|gif;base64,…` con contenido real
/// de ese formato (firma del fichero) y como mucho [`MAX_AVATAR_IMAGE_BYTES`]. Cualquier
/// proporción (cuadrada, vertical, horizontal). No se admite SVG (puede llevar código) ni otros
/// formatos.
pub fn is_avatar_image(s: &str) -> bool {
    use base64::Engine as _;
    let Some(rest) = s.strip_prefix("data:image/") else {
        return false;
    };
    let Some((mime, data)) = rest.split_once(";base64,") else {
        return false;
    };
    // Cota previa sobre el texto (base64 ocupa 4/3) para no decodificar cadenas enormes.
    if data.len() > MAX_AVATAR_IMAGE_BYTES / 3 * 4 + 4 {
        return false;
    }
    let Ok(bytes) = base64::engine::general_purpose::STANDARD.decode(data) else {
        return false;
    };
    if bytes.is_empty() || bytes.len() > MAX_AVATAR_IMAGE_BYTES {
        return false;
    }
    match mime {
        "png" => bytes.starts_with(&[0x89, b'P', b'N', b'G', 0x0D, 0x0A, 0x1A, 0x0A]),
        "jpeg" => bytes.starts_with(&[0xFF, 0xD8, 0xFF]),
        "webp" => bytes.len() > 12 && &bytes[..4] == b"RIFF" && &bytes[8..12] == b"WEBP",
        "gif" => bytes.starts_with(b"GIF87a") || bytes.starts_with(b"GIF89a"),
        _ => false,
    }
}

/// Valida una fecha `YYYY-MM-DD`.
pub fn is_iso_date(s: &str) -> bool {
    s.len() == 10 && NaiveDate::parse_from_str(s, "%Y-%m-%d").is_ok()
}

/// Ordinal femenino abreviado de una parte: `1` → `"1.ª"`.
pub fn ordinal_part(part: u32) -> String {
    format!("{part}.ª")
}

/// Cuantil (0–1) de una muestra ya ordenada ascendentemente (interpolación lineal).
pub fn quantile_sorted(sorted: &[f64], q: f64) -> f64 {
    if sorted.is_empty() {
        return 0.0;
    }
    let q = q.clamp(0.0, 1.0);
    let pos = q * (sorted.len() - 1) as f64;
    let lo = pos.floor() as usize;
    let hi = pos.ceil() as usize;
    let frac = pos - lo as f64;
    sorted[lo] + (sorted[hi] - sorted[lo]) * frac
}

/// División segura: 0 si el denominador es 0 (evita `NaN`, que serde serializaría como `null`).
pub fn ratio(num: f64, den: f64) -> f64 {
    if den.abs() < EPS { 0.0 } else { num / den }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn spanish_number_format() {
        assert_eq!(fmt_int(0), "0");
        assert_eq!(fmt_int(999), "999");
        assert_eq!(fmt_int(1030), "1.030");
        assert_eq!(fmt_int(1_234_567), "1.234.567");
        assert_eq!(fmt_dec(76.339_285, 2), "76,34");
        assert_eq!(fmt_dec(-1.5, 1), "-1,5");
        assert_eq!(fmt_dec(-0.001, 2), "0,00");
        assert_eq!(fmt_dec(1234.5, 1), "1.234,5");
        assert_eq!(fmt_pct(0.784), "78 %");
        assert_eq!(fmt_date_es("2024-12-14"), "14/12/2024");
    }

    #[test]
    fn normalization_folds_accents_and_spaces() {
        assert_eq!(normalize_key("  Málaga   CAPITAL "), "malaga capital");
        assert_eq!(normalize_key("A Coruña"), "a coruna");
    }

    #[test]
    fn stable_hash_is_deterministic() {
        let a = StableHasher::new().str("li-2025").u64(1030).finish();
        let b = StableHasher::new().str("li-2025").u64(1030).finish();
        let c = StableHasher::new().str("li-2024").u64(1030).finish();
        assert_eq!(a, b);
        assert_ne!(a, c);
        assert_ne!(mix_seed(a, 1, 2), mix_seed(a, 2, 1));
    }

    #[test]
    fn end_of_day_respects_offset() {
        let offset = FixedOffset::east_opt(2 * 3600).expect("offset");
        let dt = parse_iso("2026-10-11T21:30:00Z").expect("fecha");
        // 21:30 UTC = 23:30 en UTC+2 → fin del día local = 22:00 UTC.
        assert_eq!(iso(end_of_local_day(dt, offset)), "2026-10-11T22:00:00Z");
        assert_eq!(local_date(dt, offset).to_string(), "2026-10-11");
    }

    #[test]
    fn quantiles() {
        let v = [1.0, 2.0, 3.0, 4.0, 5.0];
        assert_eq!(quantile_sorted(&v, 0.5), 3.0);
        assert_eq!(quantile_sorted(&v, 0.0), 1.0);
        assert_eq!(quantile_sorted(&v, 1.0), 5.0);
        assert_eq!(ratio(1.0, 0.0), 0.0);
    }
}
