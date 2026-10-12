// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
/**
 * OpoTAI · contenido de la sección «Invítame a un café o haz una donación».
 *
 * Textos, enlaces y logotipos de las plataformas de donación. La interfaz (SupportCorner +
 * SupportDialog) solo los presenta. Logotipos: Simple Icons 16.35.0 (licencia CC0-1.0),
 * https://simpleicons.org — marcas de sus respectivos titulares, usadas solo para enlazar.
 *
 * Autor: Eric Valls Gramunt.
 */

export interface DonationPlatform {
  id: "paypal" | "kofi" | "github";
  name: string;
  /** Llamada a la acción del botón («Donar con PayPal»). */
  cta: string;
  /** Llamada a la acción breve bajo el nombre. */
  tagline: string;
  url: string;
  /** URL legible que se muestra en pequeño bajo el botón. */
  display: string;
  /** Color de marca (hex) del logotipo. */
  brandColor: string;
  /** Degradado del botón (de → a): tonos de la marca con contraste AA para texto blanco. */
  buttonColors: [string, string];
  /** Trazado SVG del logotipo (viewBox 0 0 24 24). */
  iconPath: string;
}

export interface SupportSection {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
  note?: string;
}

export const SUPPORT_AUTHOR = "Eric Valls Gramunt";
export const SUPPORT_REPO_URL = "https://github.com/AcidClawX41/Programa-Oposiciones-TAI";

/** Texto del botón de apoyo (pastilla flotante y barra lateral), precedido del emoji. */
export const SUPPORT_PILL_LABEL = "Invítame a un café o dona";
export const SUPPORT_PILL_EMOJI = "☕";
/** Entrada de la barra lateral (sección App). */
export const SUPPORT_NAV_LABEL = "Apoyar el proyecto";
/** Etiqueta accesible de los botones que abren el diálogo de apoyo. */
export const SUPPORT_CORNER_ARIA = "Invítame a un café o haz una donación";

export const SUPPORT_EYEBROW = "Apoya OpoTAI";
export const SUPPORT_TITLE = "¿Me invitas a un café? ☕";
export const SUPPORT_LEAD =
  "OpoTAI es gratuito, sin anuncios y de código abierto. Si te está ayudando a preparar el TAI, " +
  "un pequeño gesto me permite seguir mejorándolo para ti y para quienes vienen detrás.";
/** Línea bajo los botones de donación. */
export const SUPPORT_OTHER_WAYS =
  "¿Ahora no puedes? Compartir OpoTAI con otros opositores o dejar una ⭐ en GitHub también ayuda muchísimo.";

export const SUPPORT_SECTIONS: SupportSection[] = [
  {
    title: "Por qué existe",
    paragraphs: [
      "OpoTAI nació para preparar la oposición de Técnico Auxiliar de Informática de la Administración " +
        "del Estado junto a un amigo: queríamos entrenar con exámenes reales, corregidos exactamente como " +
        "lo hace el tribunal, entender cada fallo y saber de verdad en qué punto estábamos.",
      "Lo he convertido en una herramienta abierta para que cualquier opositor u opositora del mismo " +
        "proceso pueda aprovecharla, estudie por su cuenta o en grupo.",
    ],
  },
  {
    title: "Cómo funciona",
    bullets: [
      "Exámenes oficiales de convocatorias anteriores con su plantilla oficial, incluidas las preguntas de reserva.",
      "Simulacros con el formato vigente —80 preguntas y un supuesto práctico a elegir entre dos—, en modo examen real (120 minutos) o en modo aprendizaje, sin límite y con la explicación de cada pregunta.",
      "Corrección idéntica a la oficial: cada error resta un tercio, las respuestas en blanco no restan y las reservas sustituyen a las anuladas.",
      "Una explicación para cada fallo, para que memorices el concepto, y repaso espaciado de lo que se te resiste.",
      "Tu nota real y una estimación de tus posibilidades de plaza y de destino, con datos de convocatorias anteriores.",
      "Teoría del temario oficial, estadísticas y perfiles para estudiar con amigos. Funciona sin conexión y tus datos no salen de tu equipo.",
    ],
  },
  {
    title: "Cómo está hecho",
    paragraphs: [
      "El núcleo está escrito en Rust: corrección oficial, generación de simulacros, estadísticas y el modelo " +
        "de probabilidad de plaza. Se distribuye como aplicación de escritorio con Tauri 2 para Windows, Linux y " +
        "macOS, con una interfaz en React, TypeScript y Tailwind CSS.",
      "Las herramientas de datos, en Python, extraen los documentos oficiales y verifican automáticamente cada " +
        "pregunta y cada respuesta contra el original. El código es libre (GPL-3.0) y está publicado en GitHub.",
    ],
  },
  {
    title: "De dónde sale la información",
    bullets: [
      "INAP · Comisión Permanente de Selección: cuestionarios, plantillas de respuestas y criterios de corrección.",
      "Boletín Oficial del Estado: bases de cada convocatoria, temario, plazas, aprobados y destinos adjudicados (usados solo de forma anónima y agregada).",
      "INE: población de los municipios, para clasificar los destinos por tamaño.",
      "Normativa consolidada y estándares técnicos (BOE, EUR-Lex, RFC, W3C, ISO) para la teoría y las explicaciones.",
    ],
    note:
      "Proyecto educativo independiente, sin relación con el INAP. Comprueba siempre la convocatoria vigente en el BOE.",
  },
  {
    title: "A qué destino tu apoyo",
    paragraphs: [
      "A horas de trabajo: incorporar cada nueva convocatoria en cuanto se publica, revisar y ampliar " +
        "explicaciones y teoría, y mantener la app gratis para todo el mundo.",
      "Si ahora no puedes donar, compartirla con otros opositores o dejar una estrella en GitHub también " +
        "ayuda muchísimo. ⭐",
    ],
  },
];

export const DONATION_PLATFORMS: DonationPlatform[] = [
  {
    id: "paypal",
    name: "PayPal",
    cta: "Donar con PayPal",
    tagline: "Donación puntual, rápida y segura",
    url: "https://www.paypal.com/paypalme/EricValls",
    display: "paypal.me/EricValls",
    brandColor: "#002991",
    buttonColors: ["#0070e0", "#003087"],
    iconPath: "M15.607 4.653H8.941L6.645 19.251H1.82L4.862 0h7.995c3.754 0 6.375 2.294 6.473 5.513-.648-.478-2.105-.86-3.722-.86m6.57 5.546c0 3.41-3.01 6.853-6.958 6.853h-2.493L11.595 24H6.74l1.845-11.538h3.592c4.208 0 7.346-3.634 7.153-6.949a5.24 5.24 0 0 1 2.848 4.686M9.653 5.546h6.408c.907 0 1.942.222 2.363.541-.195 2.741-2.655 5.483-6.441 5.483H8.714Z",
  },
  {
    id: "kofi",
    name: "Ko-fi",
    cta: "Invitar en Ko-fi",
    tagline: "Invítame a un café",
    url: "https://ko-fi.com/ericdev",
    display: "ko-fi.com/ericdev",
    brandColor: "#FF6433",
    buttonColors: ["#d63d1e", "#a62a12"],
    iconPath: "M11.351 2.715c-2.7 0-4.986.025-6.83.26C2.078 3.285 0 5.154 0 8.61c0 3.506.182 6.13 1.585 8.493 1.584 2.701 4.233 4.182 7.662 4.182h.83c4.209 0 6.494-2.234 7.637-4a9.5 9.5 0 0 0 1.091-2.338C21.792 14.688 24 12.22 24 9.208v-.415c0-3.247-2.13-5.507-5.792-5.87-1.558-.156-2.65-.208-6.857-.208m0 1.947c4.208 0 5.09.052 6.571.182 2.624.311 4.13 1.584 4.13 4v.39c0 2.156-1.792 3.844-3.87 3.844h-.935l-.156.649c-.208 1.013-.597 1.818-1.039 2.546-.909 1.428-2.545 3.064-5.922 3.064h-.805c-2.571 0-4.831-.883-6.078-3.195-1.09-2-1.298-4.155-1.298-7.506 0-2.181.857-3.402 3.012-3.714 1.533-.233 3.559-.26 6.39-.26m6.547 2.287c-.416 0-.65.234-.65.546v2.935c0 .311.234.545.65.545 1.324 0 2.051-.754 2.051-2s-.727-2.026-2.052-2.026m-10.39.182c-1.818 0-3.013 1.48-3.013 3.142 0 1.533.858 2.857 1.949 3.897.727.701 1.87 1.429 2.649 1.896a1.47 1.47 0 0 0 1.507 0c.78-.467 1.922-1.195 2.623-1.896 1.117-1.039 1.974-2.364 1.974-3.897 0-1.662-1.247-3.142-3.039-3.142-1.065 0-1.792.545-2.338 1.298-.493-.753-1.246-1.298-2.312-1.298",
  },
  {
    id: "github",
    name: "GitHub Sponsors",
    cta: "Patrocinar en GitHub",
    tagline: "Apoyo mensual o puntual al proyecto",
    url: "https://github.com/sponsors/AcidClawX41",
    display: "github.com/sponsors/AcidClawX41",
    brandColor: "#EA4AAA",
    buttonColors: ["#bf3989", "#8c2163"],
    iconPath: "M17.625 1.499c-2.32 0-4.354 1.203-5.625 3.03-1.271-1.827-3.305-3.03-5.625-3.03C3.129 1.499 0 4.253 0 8.249c0 4.275 3.068 7.847 5.828 10.227a33.14 33.14 0 0 0 5.616 3.876l.028.017.008.003-.001.003c.163.085.342.126.521.125.179.001.358-.041.521-.125l-.001-.003.008-.003.028-.017a33.14 33.14 0 0 0 5.616-3.876C20.932 16.096 24 12.524 24 8.249c0-3.996-3.129-6.75-6.375-6.75zm-.919 15.275a30.766 30.766 0 0 1-4.703 3.316l-.004-.002-.004.002a30.955 30.955 0 0 1-4.703-3.316c-2.677-2.307-5.047-5.298-5.047-8.523 0-2.754 2.121-4.5 4.125-4.5 2.06 0 3.914 1.479 4.544 3.684.143.495.596.797 1.086.796.49.001.943-.302 1.085-.796.63-2.205 2.484-3.684 4.544-3.684 2.004 0 4.125 1.746 4.125 4.5 0 3.225-2.37 6.216-5.048 8.523z",
  },
];

export const SUPPORT_THANKS = "Gracias por estar aquí y mucho ánimo con el TAI.";

// ───────────────────────────── Sobre el autor (tarjeta final del diálogo) ─────────────────────────────

export interface AuthorCertification {
  name: string;
  issuer: string;
  year: string;
}

export interface AuthorEducation {
  title: string;
  school: string;
  period: string;
}

export interface AuthorProfile {
  eyebrow: string;
  name: string;
  /** Iniciales para el avatar (no se incluye foto). */
  initials: string;
  headline: string;
  bio: string[];
  /** Aptitudes técnicas. */
  skills: string[];
  /** Competencias personales (soft skills). */
  softSkills: string[];
  education: AuthorEducation[];
  certifications: AuthorCertification[];
  linkedin: {
    url: string;
    /** Texto del botón. */
    label: string;
    /** URL visible bajo el botón. */
    display: string;
    /** Azul corporativo de LinkedIn para el hover y el monograma «in». */
    brandColor: string;
  };
}

/** Perfil profesional público del autor (fuente: su perfil de LinkedIn). */
export const AUTHOR_PROFILE: AuthorProfile = {
  eyebrow: "Sobre el autor",
  name: "Eric Valls Gramunt",
  initials: "EV",
  headline: "Técnico de soporte de IT con especialidad en reparación de equipos y backups de seguridad",
  bio: [
    "Soy técnico informático y me considero un amante de la tecnología en general, tanto de la nueva como de " +
      "la de siempre. Me dedico al soporte IT: atención Helpdesk y CAU, diagnóstico y reparación de equipos, " +
      "copias de seguridad, Active Directory y administración de sistemas, redes y bases de datos.",
    "Me he formado como Técnico Superior en Administración de Sistemas Informáticos en Red (ASIR) y como " +
      "Técnico en Sistemas Microinformáticos y Redes (SMR), y sigo certificándome en redes, ciberseguridad y " +
      "bases de datos. OpoTAI es mi forma de unir lo que hago cada día con la preparación de la oposición. Si " +
      "quieres proponerme una mejora para la app o contactar conmigo, escríbeme por LinkedIn.",
  ],
  skills: [
    "Soporte IT · Helpdesk / CAU",
    "Reparación y mantenimiento de equipos",
    "Copias de seguridad",
    "Directorio activo",
    "Red Hat Enterprise Linux",
    "Gestión de servicios de TI",
    "Redes Cisco y seguridad de redes",
    "Ciberseguridad y respuesta a incidentes",
    "Bases de datos · PostgreSQL · MongoDB",
    "Rust · TypeScript · Python",
  ],
  softSkills: [
    "Atención al usuario",
    "Resolución de problemas",
    "Comunicación",
    "Trabajo en equipo",
    "Aprendizaje continuo",
  ],
  education: [
    {
      title: "Técnico Superior en Administración de Sistemas Informáticos en Red (ASIR)",
      school: "iLERNA",
      period: "2024 – 2026",
    },
    {
      title: "Técnico en Sistemas Microinformáticos y Redes (SMR)",
      school: "IES Castellbisbal",
      period: "2013 – 2016",
    },
  ],
  certifications: [
    { name: "ACTIC · Certificado medio de competencias digitales", issuer: "Generalitat de Catalunya", year: "2026" },
    { name: "Cisco Certified Support Technician Networking (CCST)", issuer: "Cisco Networking Academy", year: "2025" },
    { name: "Cisco Certified Support Technician Cybersecurity (CCST)", issuer: "Cisco Networking Academy", year: "2025" },
    { name: "IT Specialist · Databases", issuer: "Pearson VUE", year: "2025" },
    { name: "PostgreSQL for Everybody", issuer: "University of Michigan", year: "2025" },
    { name: "Database Architecture, Scale, and NoSQL with Elasticsearch", issuer: "edX", year: "2025" },
    { name: "JSON and Natural Language Processing in PostgreSQL", issuer: "edX", year: "2024" },
    { name: "Design Databases With PostgreSQL Skill Path", issuer: "Codecademy", year: "2024" },
    { name: "Intermediate PostgreSQL", issuer: "edX", year: "2024" },
    { name: "Database Design and Basic SQL in PostgreSQL", issuer: "edX", year: "2024" },
  ],
  linkedin: {
    url: "https://www.linkedin.com/in/eric-valls-gramunt-9238b3b7",
    label: "Ver mi perfil de LinkedIn",
    display: "linkedin.com/in/eric-valls-gramunt-9238b3b7",
    brandColor: "#0A66C2",
  },
};
