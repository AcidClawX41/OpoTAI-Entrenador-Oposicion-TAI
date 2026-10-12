// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
/**
 * OpoTAI · información legal: versión, licencia, derechos de autor y licencias de terceros.
 *
 * La pantalla «Acerca de» presenta estos textos junto con `AppInfo` (versión real del binario,
 * commit, copyright y licencia que devuelve el núcleo) y el texto íntegro de la licencia
 * (`get_license_text`).
 *
 * Autor: Eric Valls Gramunt.
 */

export const LICENSE_SPDX = "GPL-3.0-or-later";
export const LICENSE_NAME = "GNU General Public License v3.0 o posterior";
export const LICENSE_SHORT = "GPL-3.0";
export const LICENSE_URL = "https://www.gnu.org/licenses/gpl-3.0.html";
/** Año de la primera publicación (inicio del aviso de derechos de autor). */
export const COPYRIGHT_FIRST_YEAR = 2026;
export const COPYRIGHT_HOLDER = "Eric Valls Gramunt";

/** «2026» el primer año y «2026–2027» a partir del siguiente (mismo criterio que el núcleo). */
export function copyrightYears(currentYear: number = new Date().getFullYear()): string {
  return currentYear > COPYRIGHT_FIRST_YEAR ? `${COPYRIGHT_FIRST_YEAR}–${currentYear}` : `${COPYRIGHT_FIRST_YEAR}`;
}

/** Años del aviso según la fecha del equipo al abrir la app. */
export const COPYRIGHT_YEAR = copyrightYears();
export const COPYRIGHT_LINE = `© ${COPYRIGHT_YEAR} ${COPYRIGHT_HOLDER}`;

/** Aviso de licencia recomendado por la GPL para programas interactivos (traducción no oficial). */
export const GPL_NOTICE: string[] = [
  `OpoTAI · Entrenador de tests y simulacros para la oposición TAI. Copyright © ${COPYRIGHT_YEAR} ${COPYRIGHT_HOLDER}.`,
  "Este programa es software libre: puedes redistribuirlo y/o modificarlo bajo los términos de la " +
    "Licencia Pública General GNU (GNU GPL) publicada por la Free Software Foundation, ya sea la versión 3 " +
    "de la Licencia o, a tu elección, cualquier versión posterior.",
  "Este programa se distribuye con la esperanza de que sea útil, pero SIN NINGUNA GARANTÍA; ni siquiera la " +
    "garantía implícita de COMERCIABILIDAD o IDONEIDAD PARA UN PROPÓSITO PARTICULAR. Consulta la Licencia " +
    "Pública General GNU para más detalles.",
  "Junto con este programa se incluye una copia de la Licencia Pública General GNU (texto oficial en inglés). " +
    "También puedes consultarla en https://www.gnu.org/licenses/.",
];

/** Origen de los contenidos y aviso de independencia. */
export const CONTENT_NOTICE: string[] = [
  "Las preguntas oficiales proceden de los cuestionarios y plantillas publicados por el INAP (Comisión " +
    "Permanente de Selección) y se reproducen con fines educativos citando su fuente. Las bases, plazas, " +
    "aprobados y destinos proceden del Boletín Oficial del Estado, y la población de municipios, del INE.",
  "Las explicaciones, la teoría y el modelo de estimación de plaza son de elaboración propia y pueden contener " +
    "errores: comprueba siempre la normativa y la convocatoria vigentes.",
  "OpoTAI es un proyecto educativo independiente, sin relación con el INAP ni con ninguna Administración.",
];

export interface ThirdPartyNotice {
  name: string;
  license: string;
  url: string;
  use: string;
}

/** Componentes de terceros incluidos en la aplicación distribuida y sus licencias. */
export const THIRD_PARTY: ThirdPartyNotice[] = [
  { name: "Tauri", license: "MIT o Apache-2.0", url: "https://tauri.app", use: "Aplicación de escritorio" },
  { name: "Rust · serde, rand, chrono, uuid, thiserror, base64", license: "MIT o Apache-2.0", url: "https://crates.io", use: "Núcleo" },
  { name: "rusqlite", license: "MIT", url: "https://github.com/rusqlite/rusqlite", use: "Base de datos local" },
  { name: "SQLite", license: "Dominio público", url: "https://sqlite.org/copyright.html", use: "Base de datos local" },
  { name: "include_dir", license: "MIT", url: "https://crates.io/crates/include_dir", use: "Datos embebidos" },
  { name: "React", license: "MIT", url: "https://react.dev", use: "Interfaz" },
  { name: "React Router", license: "MIT", url: "https://reactrouter.com", use: "Navegación" },
  { name: "Tailwind CSS", license: "MIT", url: "https://tailwindcss.com", use: "Estilos" },
  { name: "Recharts", license: "MIT", url: "https://recharts.org", use: "Gráficos" },
  { name: "Motion", license: "MIT", url: "https://motion.dev", use: "Animaciones" },
  { name: "Zustand", license: "MIT", url: "https://zustand.docs.pmnd.rs", use: "Estado de la interfaz" },
  { name: "react-markdown · remark-gfm", license: "MIT", url: "https://github.com/remarkjs/react-markdown", use: "Markdown" },
  { name: "Lucide", license: "ISC", url: "https://lucide.dev", use: "Iconos" },
  { name: "Simple Icons", license: "CC0-1.0", url: "https://simpleicons.org", use: "Logotipos de PayPal, Ko-fi y GitHub Sponsors" },
  { name: "Inter", license: "SIL Open Font License 1.1", url: "https://rsms.me/inter/", use: "Tipografía" },
];
