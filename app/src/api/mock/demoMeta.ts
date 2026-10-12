// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
/**
 * Metadatos del MODO DEMO (navegador sin Tauri).
 *
 * - Temario: programa oficial del TAI ingreso libre (BOE-A-2025-26262, anexo V),
 *   para que las preguntas de ejemplo usen los mismos temas que los datos reales.
 * - Esquemas: el vigente (`tai-li-2025`, calificación por partes 0–50 + 0–50) y el
 *   de 2024 (conjunto 0–100: A − E/3 y 4A − 4E/3, corte 48/160 → 50).
 * - Convocatorias, destinos y distribución de notas: SINTÉTICOS (orientativos).
 *   En `pnpm dev`, si existen, se usan los datos reales de `data/meta` (devData.ts).
 * La app de escritorio usa siempre los datos reales que embebe el núcleo.
 */
import type {
  ConvocatoriaSummary,
  LocalityInfo,
  ScoringScheme,
  Temario,
  TierId,
  TierInfo,
} from "../types";
import type { DestinationAvailability } from "./bankTypes";

type T = [id: string, title: string];

function block(id: "I" | "II" | "III" | "IV", title: string, topics: T[]) {
  return {
    id,
    title,
    topics: topics.map(([tid, ttitle]) => ({
      id: tid,
      block: id,
      number: Number(tid.split(".")[1]),
      title: ttitle,
      keywords: [] as string[],
    })),
  };
}

export const DEMO_TEMARIO: Temario = {
  convocatoria: "li-2025",
  source_title: "BOE-A-2025-26262 · Resolución de 18 de diciembre de 2025, SEFP, anexo V (TAI ingreso libre), programa",
  source_url: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2025-26262",
  blocks: [
    block("I", "Organización del Estado y Administración electrónica", [
      ["I.1", "La Constitución Española de 1978. Derechos y deberes fundamentales. Su garantía y suspensión. La Corona: funciones constitucionales del Rey."],
      ["I.2", "Las Cortes Generales: atribuciones del Congreso de los Diputados y del Senado. El Tribunal Constitucional: composición y atribuciones. El Defensor del Pueblo."],
      ["I.3", "El Gobierno: composición, nombramiento y cese. Las funciones del Gobierno. Relaciones entre el Gobierno y las Cortes Generales."],
      ["I.4", "El texto refundido del Estatuto Básico del Empleo Público y demás normativa de aplicación: derechos y deberes, formas de provisión de puestos, promoción interna y carrera profesional; situaciones administrativas, incompatibilidades y régimen sancionador. La Ley 19/2013, de 9 de diciembre, de transparencia, acceso a la información pública y buen gobierno. La Agenda 2030 y los Objetivos de Desarrollo Sostenible."],
      ["I.5", "Políticas de igualdad y contra la violencia de género. Políticas de igualdad de trato y no discriminación de las personas LGTBI. Discapacidad y dependencia: régimen jurídico."],
      ["I.6", "La sociedad de la información. Identidad y firma electrónica: régimen jurídico. El DNI electrónico. La Agenda Digital para España."],
      ["I.7", "La protección de datos personales y su régimen jurídico: principios, derechos y obligaciones. Derechos digitales."],
      ["I.8", "Acceso electrónico de los ciudadanos a los servicios públicos y normativa de desarrollo. La gestión electrónica de los procedimientos administrativos: registros, notificaciones y uso de medios electrónicos. Esquema Nacional de Seguridad y de Interoperabilidad. Normas técnicas de Interoperabilidad."],
      ["I.9", "Instrumentos para el acceso electrónico a las Administraciones públicas: sedes electrónicas, canales y puntos de acceso, identificación y autenticación. Infraestructuras y servicios comunes en materia de administración electrónica."],
    ]),
    block("II", "Tecnología básica", [
      ["II.1", "Informática básica. Representación y comunicación de la información: elementos constitutivos de un sistema de información. Características y funciones. Arquitectura de ordenadores. Componentes internos de los equipos microinformáticos."],
      ["II.2", "Periféricos: conectividad y administración. Elementos de impresión. Elementos de almacenamiento. Elementos de visualización y digitalización."],
      ["II.3", "Tipos abstractos y Estructuras de datos. Organizaciones de ficheros. Algoritmos. Formatos de información y ficheros."],
      ["II.4", "Sistemas operativos. Características y elementos constitutivos. Sistemas Windows. Sistemas Unix y Linux. Sistemas operativos para dispositivos móviles."],
      ["II.5", "Sistemas de gestión de bases de datos relacionales, orientados a objetos y NoSQL: características y componentes."],
    ]),
    block("III", "Desarrollo de sistemas", [
      ["III.1", "Modelado de datos, metodologías y reglas. Entidades, atributos y relaciones. Diseño de bases de datos. Diseño lógico y físico. El modelo lógico relacional. Normalización."],
      ["III.2", "Lenguajes de programación. Representación de tipos de datos. Operadores. Instrucciones condicionales. Bucles y recursividad. Procedimientos, funciones y parámetros. Vectores y registros. Estructura de un programa."],
      ["III.3", "Lenguajes de interrogación de bases de datos. Estándar ANSI SQL. Procedimientos almacenados. Eventos y disparadores."],
      ["III.4", "Diseño y programación orientada a objetos. Elementos y componentes software: objetos, clases, herencia, métodos, sobrecarga. Ventajas e inconvenientes. Patrones de diseño y lenguaje de modelado unificado (UML)."],
      ["III.5", "Arquitectura Java EE/Jakarta EE y plataforma.NET: componentes, persistencia y seguridad. Características, elementos, lenguajes y funciones en ambos entornos. Desarrollo de interfaces."],
      ["III.6", "Arquitectura de sistemas cliente/servidor y multicapas: componentes y operación. Arquitecturas de servicios web y protocolos asociados."],
      ["III.7", "Aplicaciones web. Desarrollo web front-end y en servidor, multiplataforma y multidispositivo. Lenguajes: HTML, XML y sus derivaciones. Navegadores y lenguajes de programación web. Lenguajes de script."],
      ["III.8", "Accesibilidad, diseño universal y usabilidad. Acceso y usabilidad de las tecnologías, productos y servicios relacionados con la sociedad de la información. Confidencialidad y disponibilidad de la información en puestos de usuario final. Conceptos de seguridad en el desarrollo de los sistemas."],
      ["III.9", "Repositorios: estructura y actualización. Generación de código y documentación. Metodologías de desarrollo. Pruebas. Programas para control de versiones. Plataformas de desarrollo colaborativo de software."],
    ]),
    block("IV", "Sistemas y comunicaciones", [
      ["IV.1", "Administración del Sistema operativo y software de base. Actualización, mantenimiento y reparación del sistema operativo."],
      ["IV.2", "Administración de bases de datos. Sistemas de almacenamiento y su virtualización. Políticas, sistemas y procedimientos de backup y su recuperación. Backup de sistemas físicos y virtuales. Virtualización de sistemas y virtualización de puestos de usuario."],
      ["IV.3", "Administración de servidores de correo electrónico sus protocolos. Administración de contenedores y microservicios."],
      ["IV.4", "Administración de redes de área local. Gestión de usuarios. Gestión de dispositivos. Monitorización y control de tráfico."],
      ["IV.5", "Conceptos de seguridad de los sistemas de información. Seguridad física. Seguridad lógica. Amenazas y vulnerabilidades. Técnicas criptográficas y protocolos seguros. Mecanismos de firma digital. Infraestructura física de un CPD: acondicionamiento y equipamiento. Sistemas de gestión de incidencias. Control remoto de puestos de usuario."],
      ["IV.6", "Comunicaciones. Medios de transmisión. Modos de comunicación. Equipos terminales y equipos de interconexión y conmutación. Redes de comunicaciones. Redes de conmutación y redes de difusión. Comunicaciones móviles e inalámbricas."],
      ["IV.7", "El modelo TCP/IP y el modelo de referencia de interconexión de sistemas abiertos (OSI) de ISO. Protocolos TCP/IP."],
      ["IV.8", "Internet: arquitectura de red. Origen, evolución y estado actual. Principales servicios. Protocolos HTTP, HTTPS y SSL/TLS."],
      ["IV.9", "Seguridad y protección en redes de comunicaciones. Seguridad perimetral. Acceso remoto seguro a redes. Redes privadas virtuales (VPN). Seguridad en el puesto del usuario."],
      ["IV.10", "Redes locales. Tipología. Técnicas de transmisión. Métodos de acceso. Dispositivos de interconexión."],
    ]),
  ],
};

const theory = (questions: number, reserve: number) =>
  ({ part: 1, title: "Primera parte · Cuestionario", kind: "theory", questions, reserve, value: 1, penalty_divisor: 3, cases_offered: null, cases_to_choose: null }) as const;
const casePart = (questions: number, reserve: number, value: number) =>
  ({ part: 2, title: "Segunda parte · Supuesto práctico (bloque III o IV, a elegir)", kind: "case", questions, reserve, value, penalty_divisor: 3, cases_offered: 2, cases_to_choose: 1 }) as const;

/** Esquema vigente (convocatoria 2025): cada parte se califica de 0 a 50 con 25 en el corte. */
export const SCHEME_2025: ScoringScheme = {
  id: "tai-li-2025",
  title: "TAI ingreso libre · convocatoria 2025",
  access: "libre",
  convocatoria: "li-2025",
  duration_minutes: 120,
  parts: [{ ...theory(80, 5) }, { ...casePart(20, 5, 1) }],
  grading: {
    units: [
      { parts: [1], max_grade: 50, pass_grade: 25, min_direct_ratio: 0.3, cutoff_direct: null, cutoff_note: "Corte pendiente de publicar; como mínimo el 30 % de la directa máxima (24/80)." },
      { parts: [2], max_grade: 50, pass_grade: 25, min_direct_ratio: 0.3, cutoff_direct: null, cutoff_note: "Corte pendiente de publicar; como mínimo el 30 % de la directa máxima (6/20)." },
    ],
  },
  notes: "Ejercicio único de 120 minutos: 80 preguntas (+5 de reserva) y un supuesto práctico de 20 preguntas a elegir entre dos. Cada parte se califica de 0 a 50 (25 para aprobar); los errores restan un tercio y las respuestas en blanco no penalizan.",
};

/** Esquema de 2024: calificación conjunta 0–100 con corte 48/160 → 50. */
export const SCHEME_2024: ScoringScheme = {
  id: "tai-li-2024",
  title: "TAI ingreso libre · convocatoria 2024",
  access: "libre",
  convocatoria: "li-2024",
  duration_minutes: 120,
  parts: [{ ...theory(80, 5) }, { ...casePart(20, 5, 4) }],
  grading: {
    units: [
      { parts: [1, 2], max_grade: 100, pass_grade: 50, min_direct_ratio: 0.3, cutoff_direct: 48, cutoff_note: "48/160 directos (30 % de la máxima) = 50 puntos." },
    ],
  },
  notes: "1.ª parte: aciertos − errores/3 (máx. 80). 2.ª parte: 4 × (aciertos − errores/3) (máx. 80). Nota conjunta 0–100.",
};

/** Esquema del examen de muestra del modo demo (reglas del vigente con menos preguntas). */
export const SCHEME_MUESTRA: ScoringScheme = {
  id: "demo-muestra",
  title: "Examen de muestra (demo)",
  access: "libre",
  convocatoria: null,
  duration_minutes: 75,
  parts: [{ ...theory(52, 2) }, { ...casePart(6, 0, 1) }],
  grading: {
    units: [
      { parts: [1], max_grade: 50, pass_grade: 25, min_direct_ratio: 0.3, cutoff_direct: null, cutoff_note: "30 % de la directa máxima de la parte." },
      { parts: [2], max_grade: 50, pass_grade: 25, min_direct_ratio: 0.3, cutoff_direct: null, cutoff_note: "30 % de la directa máxima de la parte." },
    ],
  },
  notes: "Examen de muestra con preguntas de elaboración propia. Solo para la demo en navegador.",
};

export const DEMO_SCHEMES: ScoringScheme[] = [SCHEME_2025, SCHEME_2024, SCHEME_MUESTRA];
export const DEMO_DEFAULT_SCHEME = SCHEME_2025.id;

const INAP_LI_2025 =
  "https://sede.inap.gob.es/es/procedimientos-y-servicios/seleccion/procesos-selectivos-de-cuerpos-y-escalas-generales/cuerpo-de-tecnicos-auxiliares-de-informatica-de-la-administracion-del-estado-ingreso-libre-convocatoria-2025";
const INAP_LI_2024 =
  "https://sede.inap.gob.es/es/procedimientos-y-servicios/seleccion/procesos-selectivos-de-cuerpos-y-escalas-generales/cuerpo-de-tecnicos-auxiliares-de-informatica-de-la-administracion-del-estado/ctaiae-ingreso-libre-oferta-de-empleo-publico-2023-y-2024";

export const DEMO_CONVOCATORIAS: ConvocatoriaSummary[] = [
  {
    id: "li-2025",
    access: "libre",
    year: 2025,
    title: "Convocatoria 2025 (demo)",
    exam_date: "2026-05-23",
    status: "examen_realizado",
    scoring_scheme: SCHEME_2025.id,
    plazas_total: 1030,
    presentados: 8790,
    aptos: null,
    cutoff_direct: null,
    cutoff_max_direct: null,
    cutoff_basis: "unknown",
    has_grades: false,
    has_destinations: false,
    sources: [{ title: "INAP · TAI ingreso libre, convocatoria 2025", url: INAP_LI_2025 }],
  },
  {
    id: "li-2024",
    access: "libre",
    year: 2024,
    title: "Convocatoria 2024 (referencia, datos de ejemplo)",
    exam_date: "2024-12-14",
    status: "finalizada",
    scoring_scheme: SCHEME_2024.id,
    plazas_total: 1879,
    presentados: 5261,
    aptos: 1756,
    cutoff_direct: 48,
    cutoff_max_direct: 160,
    cutoff_basis: "floor",
    has_grades: true,
    has_destinations: true,
    sources: [{ title: "INAP · TAI ingreso libre, OEP 2023 y 2024", url: INAP_LI_2024 }],
  },
];

export const DEMO_TARGET_CONVOCATORIA = "li-2025";
export const DEMO_REFERENCE_CONVOCATORIA = "li-2024";

export const DEMO_TIERS: TierInfo[] = [
  { id: "gran_ciudad", order: 1, label: "Grandes ciudades", description: "Municipios de 300.000 habitantes o más" },
  {
    id: "ciudad_media",
    order: 2,
    label: "Capitales y ciudades medias",
    description: "Capitales de provincia y municipios de 50.000 habitantes o más",
  },
  { id: "pueblo", order: 3, label: "Pueblos y zonas menos pobladas", description: "Resto de municipios" },
];

type Loc = [name: string, province: string, population: number, capital: boolean, tier: TierId, share: number, avail: number];

/**
 * [nombre, provincia, población aprox., capital, tier, cuota sintética de plazas,
 * disponibilidad sintética (último puesto relativo con el que aún se eligió)].
 * Imita el patrón real: Madrid concentra ~76 % de las plazas y nunca se agota; el resto de
 * grandes ciudades tiene pocas plazas y se agotan antes (Sevilla muy pronto, Barcelona más tarde).
 */
const LOCALITIES: Loc[] = [
  ["Madrid", "Madrid", 3_507_000, true, "gran_ciudad", 0.76, 1],
  ["Barcelona", "Barcelona", 1_732_000, true, "gran_ciudad", 0.016, 0.62],
  ["València", "Valencia", 841_000, true, "gran_ciudad", 0.012, 0.38],
  ["Sevilla", "Sevilla", 688_000, true, "gran_ciudad", 0.007, 0.13],
  ["Zaragoza", "Zaragoza", 691_000, true, "gran_ciudad", 0.008, 0.3],
  ["Málaga", "Málaga", 595_000, true, "gran_ciudad", 0.003, 0.05],
  ["Murcia", "Murcia", 476_000, true, "gran_ciudad", 0.006, 0.25],
  ["Palma", "Illes Balears", 440_000, true, "gran_ciudad", 0.007, 0.5],
  ["Las Palmas de Gran Canaria", "Las Palmas", 382_000, true, "gran_ciudad", 0.004, 0.5],
  ["Bilbao", "Bizkaia", 347_000, true, "gran_ciudad", 0.002, 0.1],
  ["Alacant/Alicante", "Alicante", 361_000, true, "gran_ciudad", 0.002, 0.08],
  ["Córdoba", "Córdoba", 323_000, true, "gran_ciudad", 0.003, 0.15],
  ["Valladolid", "Valladolid", 301_000, true, "gran_ciudad", 0.006, 0.35],
  ["Vigo", "Pontevedra", 297_000, false, "ciudad_media", 0.001, 0.08],
  ["Gijón", "Asturias", 268_000, false, "ciudad_media", 0.001, 0.12],
  ["A Coruña", "A Coruña", 249_000, true, "ciudad_media", 0.003, 0.1],
  ["Vitoria-Gasteiz", "Araba/Álava", 257_000, true, "ciudad_media", 0.002, 0.15],
  ["Granada", "Granada", 231_000, true, "ciudad_media", 0.004, 0.09],
  ["Oviedo", "Asturias", 220_000, true, "ciudad_media", 0.003, 0.16],
  ["Alcalá de Henares", "Madrid", 197_000, false, "ciudad_media", 0.004, 0.62],
  ["Getafe", "Madrid", 188_000, false, "ciudad_media", 0.004, 0.7],
  ["Pamplona/Iruña", "Navarra", 205_000, true, "ciudad_media", 0.002, 0.11],
  ["Almería", "Almería", 201_000, true, "ciudad_media", 0.002, 0.22],
  ["Santa Cruz de Tenerife", "Santa Cruz de Tenerife", 209_000, true, "ciudad_media", 0.004, 0.4],
  ["Burgos", "Burgos", 174_000, true, "ciudad_media", 0.003, 0.3],
  ["Santander", "Cantabria", 173_000, true, "ciudad_media", 0.003, 0.14],
  ["Castelló de la Plana", "Castellón", 177_000, true, "ciudad_media", 0.002, 0.25],
  ["Albacete", "Albacete", 174_000, true, "ciudad_media", 0.003, 0.36],
  ["Logroño", "La Rioja", 152_000, true, "ciudad_media", 0.002, 0.24],
  ["Badajoz", "Badajoz", 150_000, true, "ciudad_media", 0.003, 0.34],
  ["Salamanca", "Salamanca", 145_000, true, "ciudad_media", 0.004, 0.2],
  ["Huelva", "Huelva", 142_000, true, "ciudad_media", 0.002, 0.31],
  ["Tarragona", "Tarragona", 138_000, true, "ciudad_media", 0.002, 0.33],
  ["Lleida", "Lleida", 143_000, true, "ciudad_media", 0.002, 0.38],
  ["León", "León", 122_000, true, "ciudad_media", 0.004, 0.22],
  ["Cádiz", "Cádiz", 111_000, true, "ciudad_media", 0.002, 0.15],
  ["Jaén", "Jaén", 111_000, true, "ciudad_media", 0.003, 0.26],
  ["Girona", "Girona", 105_000, true, "ciudad_media", 0.001, 0.28],
  ["Ourense", "Ourense", 104_000, true, "ciudad_media", 0.002, 0.3],
  ["Lugo", "Lugo", 98_000, true, "ciudad_media", 0.002, 0.33],
  ["Cáceres", "Cáceres", 96_000, true, "ciudad_media", 0.003, 0.3],
  ["Guadalajara", "Guadalajara", 90_000, true, "ciudad_media", 0.006, 0.66],
  ["Toledo", "Toledo", 86_000, true, "ciudad_media", 0.008, 0.55],
  ["Pontevedra", "Pontevedra", 83_000, true, "ciudad_media", 0.002, 0.2],
  ["Ciudad Real", "Ciudad Real", 75_000, true, "ciudad_media", 0.003, 0.4],
  ["Palencia", "Palencia", 77_000, true, "ciudad_media", 0.002, 0.42],
  ["Ceuta", "Ceuta", 83_000, false, "ciudad_media", 0.002, 0.8],
  ["Melilla", "Melilla", 86_000, false, "ciudad_media", 0.002, 0.85],
  ["Mérida", "Badajoz", 60_000, false, "ciudad_media", 0.005, 0.45],
  ["Zamora", "Zamora", 59_000, true, "ciudad_media", 0.002, 0.46],
  ["Ávila", "Ávila", 58_000, true, "ciudad_media", 0.002, 0.5],
  ["Segovia", "Segovia", 51_000, true, "ciudad_media", 0.002, 0.44],
  ["Huesca", "Huesca", 54_000, true, "ciudad_media", 0.001, 0.48],
  ["Cuenca", "Cuenca", 53_000, true, "ciudad_media", 0.002, 0.52],
  ["Soria", "Soria", 40_000, true, "ciudad_media", 0.001, 0.6],
  ["Teruel", "Teruel", 36_000, true, "ciudad_media", 0.001, 0.64],
  ["Plasencia", "Cáceres", 39_000, false, "pueblo", 0.001, 0.6],
  ["Don Benito", "Badajoz", 38_000, false, "pueblo", 0.001, 0.7],
  ["Miranda de Ebro", "Burgos", 35_000, false, "pueblo", 0.001, 0.66],
  ["Ronda", "Málaga", 34_000, false, "pueblo", 0.001, 0.5],
  ["Aranda de Duero", "Burgos", 33_000, false, "pueblo", 0.001, 0.72],
  ["Tortosa", "Tarragona", 33_000, false, "pueblo", 0.001, 0.64],
  ["Alcázar de San Juan", "Ciudad Real", 31_000, false, "pueblo", 0.001, 0.78],
  ["Calatayud", "Zaragoza", 20_000, false, "pueblo", 0.001, 0.82],
  ["San Lorenzo de El Escorial", "Madrid", 18_000, false, "pueblo", 0.002, 0.6],
  ["Navalmoral de la Mata", "Cáceres", 17_000, false, "pueblo", 0.001, 0.86],
  ["Jaca", "Huesca", 13_000, false, "pueblo", 0.001, 0.74],
];

export const DEMO_LOCALITIES: LocalityInfo[] = LOCALITIES.map(([name, province, population, capital, tier, share]) => ({
  name,
  province,
  population,
  is_provincial_capital: capital,
  tier,
  share_of_plazas: share,
}));

export const DEMO_DESTINATIONS: DestinationAvailability[] = LOCALITIES.map(([name, , , , , , avail]) => ({
  locality: name,
  last_order_ratio: avail,
}));

/**
 * Distribución sintética de la puntuación directa (como ratio 0–1) de los aptos
 * de la convocatoria de referencia, ordenada de mejor a peor.
 */
export function referenceAptoRatios(count = 1756, floor = 0.3): number[] {
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    const u = (i + 0.5) / count;
    out.push(floor + (0.9 - floor) * Math.pow(1 - u, 1.8));
  }
  return out;
}
