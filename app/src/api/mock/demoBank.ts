// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
/**
 * Banco de preguntas de EJEMPLO del modo demo (navegador).
 *
 * Preguntas de elaboración propia con el estilo y el temario del TAI (4 bloques),
 * con explicación, nota por opción y referencias. NO son preguntas oficiales:
 * la app de escritorio usa los bancos oficiales embebidos por el núcleo.
 * Autor: Eric Valls Gramunt.
 */
import type { Letter } from "../types";
import type { BankFile, BankMedia, BankQuestion } from "./bankTypes";

export const DEMO_BANK_ID = "demo-muestra";

interface QInput {
  topic: string;
  text: string;
  options: [string, string, string, string];
  answer: Letter;
  explanation: string;
  notes?: [string | null, string | null, string | null, string | null] | null;
  refs?: string[];
  media?: BankMedia[];
  annulled?: boolean;
  outdated?: string;
}

function build(prefix: string, items: QInput[], reserve = false): BankQuestion[] {
  return items.map((q, i) => ({
    id: `${prefix}-${reserve ? `r${i + 1}` : String(i + 1).padStart(3, "0")}`,
    number: i + 1,
    text: q.text,
    options: [...q.options],
    answer: q.answer,
    annulled: q.annulled ?? false,
    topic: q.topic,
    explanation: q.explanation,
    option_notes: q.notes ?? null,
    references: q.refs ?? [],
    tags: [],
    media: q.media ?? [],
    outdated: q.outdated !== undefined,
    outdated_note: q.outdated ?? null,
  }));
}

const NETWORK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 340" font-family="Inter, Arial, sans-serif">
<rect width="680" height="340" rx="18" fill="#ffffff"/>
<g stroke="#94a3b8" stroke-width="3" stroke-linecap="round">
<line x1="340" y1="78" x2="185" y2="160"/><line x1="340" y1="78" x2="495" y2="160"/>
<line x1="185" y1="178" x2="85" y2="262"/><line x1="185" y1="178" x2="185" y2="262"/><line x1="185" y1="178" x2="285" y2="262"/>
<line x1="495" y1="178" x2="435" y2="262"/><line x1="495" y1="178" x2="565" y2="262"/>
</g>
<circle cx="340" cy="62" r="32" fill="#4f46e5"/>
<path d="M322 56h28l-6-6M358 68h-28l6 6" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
<text x="392" y="56" font-size="15" font-weight="700" fill="#1e1b4b">R1</text>
<text x="392" y="74" font-size="11" fill="#475569">router</text>
<text x="196" y="112" font-size="12" fill="#334155" text-anchor="end">Gi0/0 · 10.0.1.1/24</text>
<text x="484" y="112" font-size="12" fill="#334155">Gi0/1 · 10.0.2.1/24</text>
<rect x="135" y="150" width="100" height="34" rx="9" fill="#0e7490"/>
<text x="185" y="172" font-size="14" font-weight="700" fill="#fff" text-anchor="middle">SW1</text>
<rect x="445" y="150" width="100" height="34" rx="9" fill="#0e7490"/>
<text x="495" y="172" font-size="14" font-weight="700" fill="#fff" text-anchor="middle">SW2</text>
<g font-size="12" font-weight="600" fill="#0f172a" text-anchor="middle">
<rect x="58" y="262" width="54" height="36" rx="6" fill="#f1f5f9" stroke="#64748b" stroke-width="2"/><text x="85" y="285">PC1</text>
<rect x="158" y="262" width="54" height="36" rx="6" fill="#f1f5f9" stroke="#64748b" stroke-width="2"/><text x="185" y="285">PC2</text>
<rect x="258" y="262" width="54" height="36" rx="6" fill="#f1f5f9" stroke="#64748b" stroke-width="2"/><text x="285" y="285">PC3</text>
<rect x="408" y="262" width="54" height="36" rx="6" fill="#f1f5f9" stroke="#64748b" stroke-width="2"/><text x="435" y="285">PC4</text>
<rect x="538" y="252" width="54" height="52" rx="6" fill="#e0e7ff" stroke="#4f46e5" stroke-width="2"/><text x="565" y="283">SRV</text>
</g>
<text x="185" y="326" font-size="12" fill="#475569" text-anchor="middle">Red 10.0.1.0/24</text>
<text x="500" y="326" font-size="12" fill="#475569" text-anchor="middle">Red 10.0.2.0/24</text>
</svg>`;

/** Codifica una imagen SVG como data URI base64 (como las que envía el núcleo). */
function svgDataUri(svg: string): string {
  const bytes = new TextEncoder().encode(svg);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return `data:image/svg+xml;base64,${btoa(bin)}`;
}

/** Diagrama E/R en notación «pata de gallo» entre OFICINA y CITA con los extremos indicados. */
function erDiagram(left: "one" | "many", right: "one" | "many" | "zero-one"): string {
  const mark = (side: "L" | "R", kind: "one" | "many" | "zero-one") => {
    const e = side === "L" ? 92 : 208; // borde de la entidad
    const d = side === "L" ? 1 : -1; // hacia el centro
    const line = (x1: number, y1: number, x2: number, y2: number) =>
      `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#1e293b" stroke-width="2.4" stroke-linecap="round"/>`;
    if (kind === "one") return line(e + d * 10, 27, e + d * 10, 45) + line(e + d * 17, 27, e + d * 17, 45);
    if (kind === "many")
      return line(e + d * 14, 36, e, 25) + line(e + d * 14, 36, e, 47) + line(e + d * 14, 36, e, 36) + line(e + d * 21, 27, e + d * 21, 45);
    return `<circle cx="${e + d * 22}" cy="36" r="5.5" fill="#ffffff" stroke="#1e293b" stroke-width="2.4"/>` + line(e + d * 10, 27, e + d * 10, 45);
  };
  return svgDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 72" width="300" height="72" font-family="Arial, Helvetica, sans-serif">
<rect width="300" height="72" rx="10" fill="#ffffff"/>
<line x1="92" y1="36" x2="208" y2="36" stroke="#1e293b" stroke-width="2.4"/>
<rect x="8" y="19" width="84" height="34" rx="7" fill="#eef2ff" stroke="#4f46e5" stroke-width="2"/>
<text x="50" y="41" font-size="12" font-weight="700" fill="#1e1b4b" text-anchor="middle">OFICINA</text>
<rect x="208" y="19" width="84" height="34" rx="7" fill="#ecfeff" stroke="#0e7490" stroke-width="2"/>
<text x="250" y="41" font-size="12" font-weight="700" fill="#083344" text-anchor="middle">CITA</text>
${mark("L", left)}${mark("R", right)}
</svg>`);
}

/**
 * Imágenes del banco de ejemplo, indexadas por su ruta `assets/…` (relativa a
 * data/banks/). El registro del mock las resuelve igual que el núcleo: rellena
 * `Media.data_url` y reescribe las referencias `![alt](assets/…)` del Markdown.
 */
export const DEMO_ASSETS: Record<string, string> = {
  "assets/demo-muestra/red-r1.svg": svgDataUri(NETWORK_SVG),
  "assets/demo-muestra/er-1-1.svg": erDiagram("one", "one"),
  "assets/demo-muestra/er-1-n.svg": erDiagram("one", "many"),
  "assets/demo-muestra/er-n-m.svg": erDiagram("many", "many"),
  "assets/demo-muestra/er-1-01.svg": erDiagram("one", "zero-one"),
};

export const NETWORK_DIAGRAM: BankMedia = {
  path: "assets/demo-muestra/red-r1.svg",
  alt: "Esquema: el router R1 conecta por Gi0/0 el switch SW1 (PC1, PC2 y PC3, red 10.0.1.0/24) y por Gi0/1 el switch SW2 (PC4 y el servidor SRV, red 10.0.2.0/24).",
  data_url: null,
};

const THEORY: QInput[] = [
  // ───────────── Bloque I ─────────────
  {
    topic: "I.1",
    text: "Según el artículo 1.3 de la Constitución Española, la forma política del Estado español es:",
    options: ["La República parlamentaria.", "La Monarquía parlamentaria.", "La Monarquía constitucional.", "El Estado autonómico."],
    answer: "B",
    explanation:
      "El art. 1.3 CE dice literalmente que «la forma política del Estado español es la **Monarquía parlamentaria**». El Rey es el Jefe del Estado, pero sus actos han de estar refrendados (art. 64) y carece de poderes ejecutivos propios.",
    notes: [
      "España no es una república: la Jefatura del Estado corresponde al Rey (art. 56 CE).",
      null,
      "«Monarquía constitucional» no es la expresión de la CE; en ese modelo el monarca conserva poderes efectivos.",
      "El Estado autonómico describe la organización territorial (Título VIII), no la forma política.",
    ],
    refs: ["Constitución Española, arts. 1.3, 56 y 64"],
  },
  {
    topic: "I.1",
    text: "¿Cuántos artículos tiene la Constitución Española de 1978?",
    options: ["159", "169", "179", "196"],
    answer: "B",
    explanation:
      "La CE consta de **169 artículos**, distribuidos en un Título Preliminar y diez títulos, más 4 disposiciones adicionales, 9 transitorias, 1 derogatoria y 1 final.",
    notes: [
      "El art. 159 regula la composición del Tribunal Constitucional; no es el total.",
      null,
      "No existe el art. 179: el último es el 169, que impide iniciar la reforma en tiempo de guerra o durante los estados excepcionales.",
      "Cifra incorrecta.",
    ],
    refs: ["Constitución Española"],
  },
  {
    topic: "I.2",
    text: "Según la Constitución, el Tribunal Constitucional se compone de:",
    options: [
      "9 miembros nombrados por el Rey.",
      "12 miembros nombrados por el Rey.",
      "15 miembros elegidos por las Cortes Generales.",
      "20 miembros elegidos por el Consejo General del Poder Judicial.",
    ],
    answer: "B",
    explanation:
      "Art. 159.1 CE: **12 miembros nombrados por el Rey**: 4 a propuesta del Congreso y 4 del Senado (por mayoría de tres quintos), 2 del Gobierno y 2 del CGPJ. Su mandato es de nueve años y se renuevan por terceras partes cada tres.",
    notes: [
      "Son 12; nueve años es la duración del mandato.",
      null,
      "Ni son 15 ni los proponen solo las Cortes: también el Gobierno y el CGPJ.",
      "Veinte es el número de vocales del CGPJ (art. 122.3 CE), no de magistrados del TC.",
    ],
    refs: ["Constitución Española, arts. 122.3 y 159"],
  },
  {
    topic: "I.3",
    text: "Según la Ley 40/2015, en los Ministerios son **órganos superiores**:",
    options: [
      "Los Ministros y los Secretarios de Estado.",
      "Los Subsecretarios y los Secretarios generales.",
      "Los Ministros, los Secretarios de Estado y los Subsecretarios.",
      "Los Directores generales y los Subdirectores generales.",
    ],
    answer: "A",
    explanation:
      "El art. 55.3 de la Ley 40/2015 distingue en los Ministerios entre **órganos superiores** (Ministros y Secretarios de Estado) y **órganos directivos** (Subsecretarios y Secretarios generales, Secretarios generales técnicos, Directores generales y Subdirectores generales).",
    notes: [
      null,
      "Subsecretarios y Secretarios generales son órganos directivos.",
      "Los Subsecretarios son órganos directivos, no superiores.",
      "Son órganos directivos.",
    ],
    refs: ["Ley 40/2015, art. 55"],
  },
  {
    topic: "I.4",
    text: "Según el texto refundido del Estatuto Básico del Empleado Público, ¿cuál de las siguientes **no** es una situación administrativa de los funcionarios de carrera?",
    options: ["Servicio activo.", "Servicios especiales.", "Excedencia.", "Comisión de servicios."],
    answer: "D",
    explanation:
      "El art. 85 del TREBEP enumera las situaciones administrativas: servicio activo, servicios especiales, servicio en otras Administraciones Públicas, excedencia y suspensión de funciones. La **comisión de servicios** es una forma de provisión de puestos de trabajo, no una situación administrativa.",
    notes: [
      "El servicio activo es la situación ordinaria del funcionario (art. 86).",
      "Los servicios especiales están en el art. 87 (p. ej., nombramiento como alto cargo).",
      "La excedencia, en sus distintas modalidades, se regula en el art. 89.",
      null,
    ],
    refs: ["Real Decreto Legislativo 5/2015 (TREBEP), arts. 85 a 90"],
  },
  {
    topic: "I.5",
    text: "¿Qué norma regula la igualdad efectiva de mujeres y hombres?",
    options: ["La Ley Orgánica 1/2004.", "La Ley Orgánica 3/2007.", "La Ley 39/2006.", "La Ley Orgánica 10/2022."],
    answer: "B",
    explanation:
      "La **LO 3/2007**, de 22 de marzo, para la igualdad efectiva de mujeres y hombres, introdujo, entre otros, los planes de igualdad y el principio de presencia equilibrada.",
    notes: [
      "La LO 1/2004 es la de Medidas de Protección Integral contra la Violencia de Género.",
      null,
      "La Ley 39/2006 regula la promoción de la autonomía personal y la atención a la dependencia.",
      "La LO 10/2022 es la de garantía integral de la libertad sexual.",
    ],
    refs: ["Ley Orgánica 3/2007, de 22 de marzo"],
  },
  {
    topic: "I.8",
    text: "Según la Ley 39/2015, salvo que una ley o el Derecho de la Unión Europea dispongan otro cómputo, cuando los plazos se señalen por días se entiende que estos son:",
    options: [
      "Naturales.",
      "Hábiles, excluyéndose los sábados, los domingos y los declarados festivos.",
      "Hábiles, excluyéndose únicamente los domingos y los declarados festivos.",
      "Naturales, salvo en el mes de agosto.",
    ],
    answer: "B",
    explanation:
      "El art. 30.2 de la Ley 39/2015 establece que los plazos por días son **hábiles**, excluyendo del cómputo **sábados, domingos y festivos**. Si un plazo se fija en días naturales, debe indicarse en las notificaciones.",
    notes: [
      "Solo son naturales si una ley o el Derecho de la UE lo establecen expresamente.",
      null,
      "Era la regla de la derogada Ley 30/1992: desde la Ley 39/2015 los sábados también son inhábiles.",
      "Agosto no es inhábil con carácter general en el procedimiento administrativo (sí en el judicial).",
    ],
    refs: ["Ley 39/2015, art. 30.2"],
  },
  {
    topic: "I.8",
    text: "Cuando las normas reguladoras de un procedimiento no fijen el plazo máximo para resolver y notificar, este será de:",
    options: ["Un mes.", "Tres meses.", "Seis meses.", "Diez días."],
    answer: "B",
    explanation:
      "Art. 21.3 de la Ley 39/2015: a falta de plazo específico, el plazo máximo es de **tres meses**. Además, una norma con rango inferior a ley no puede fijar un plazo superior a seis meses (art. 21.2).",
    notes: [
      "Un mes es, por ejemplo, el plazo del recurso de alzada contra actos expresos, no el plazo supletorio de resolución.",
      null,
      "Seis meses es el máximo que puede fijar una norma reglamentaria, no el plazo supletorio.",
      "Diez días es el plazo habitual de subsanación de solicitudes (art. 68).",
    ],
    refs: ["Ley 39/2015, arts. 21 y 68"],
  },
  {
    topic: "I.8",
    text: "¿Qué ley regula los órganos colegiados, los convenios y las relaciones interadministrativas?",
    options: [
      "La Ley 39/2015, del Procedimiento Administrativo Común de las Administraciones Públicas.",
      "La Ley 40/2015, de Régimen Jurídico del Sector Público.",
      "La Ley 19/2013, de transparencia, acceso a la información pública y buen gobierno.",
      "La Ley 11/2007, de acceso electrónico de los ciudadanos a los Servicios Públicos.",
    ],
    answer: "B",
    explanation:
      "La **Ley 40/2015** regula la organización y el funcionamiento del sector público: órganos administrativos (incluidos los colegiados), convenios, responsabilidad patrimonial y relaciones interadministrativas. La Ley 39/2015 regula la relación con los ciudadanos (procedimiento).",
    notes: [
      "La Ley 39/2015 regula el procedimiento administrativo común, no la organización interna.",
      null,
      "La Ley 19/2013 regula transparencia, acceso a la información y buen gobierno.",
      "La Ley 11/2007 fue derogada por las Leyes 39/2015 y 40/2015.",
    ],
    refs: ["Ley 40/2015"],
  },
  {
    topic: "I.6",
    text: "¿Qué agenda impulsó la transformación digital de España con un horizonte temporal hasta 2025?",
    options: ["La Agenda Digital para España (2013).", "España Digital 2025.", "El Plan Avanza 2.", "La Estrategia Europa 2020."],
    answer: "B",
    explanation:
      "**España Digital 2025** (julio de 2020) fijó ejes como la conectividad, la ciberseguridad, la transformación digital del sector público y las competencias digitales, alineados con el Plan de Recuperación.",
    notes: [
      "La Agenda Digital para España (2013) fue la estrategia anterior.",
      null,
      "El Plan Avanza 2 (2011-2015) es anterior.",
      "Europa 2020 era la estrategia de crecimiento de la UE, no una agenda española.",
    ],
    refs: ["España Digital 2025 (2020)", "España Digital 2026 (2022)"],
    outdated: "En 2022 esta agenda se actualizó como «España Digital 2026». Comprueba siempre la versión vigente del temario.",
  },
  {
    topic: "I.6",
    text: "Según el Reglamento (UE) 910/2014 (eIDAS), ¿qué firma electrónica tiene un efecto jurídico equivalente al de una firma manuscrita?",
    options: [
      "La firma electrónica simple.",
      "La firma electrónica avanzada.",
      "La firma electrónica cualificada.",
      "Cualquier firma basada en un certificado electrónico.",
    ],
    answer: "C",
    explanation:
      "El art. 25.2 de eIDAS reconoce a la **firma electrónica cualificada** (avanzada, creada con un dispositivo cualificado y basada en un certificado cualificado) un efecto jurídico equivalente al de la firma manuscrita.",
    notes: [
      "La firma simple puede tener efectos jurídicos, pero no equivalencia automática.",
      "La avanzada identifica de forma única al firmante, pero sin dispositivo y certificado cualificados no alcanza la equivalencia.",
      null,
      "Un certificado no cualificado no basta para la equivalencia legal.",
    ],
    refs: ["Reglamento (UE) 910/2014, arts. 3 y 25"],
  },
  {
    topic: "I.8",
    text: "¿Qué real decreto regula actualmente el Esquema Nacional de Seguridad?",
    options: ["El Real Decreto 3/2010.", "El Real Decreto 4/2010.", "El Real Decreto 311/2022.", "El Real Decreto 203/2021."],
    answer: "C",
    explanation:
      "El **RD 311/2022**, de 3 de mayo, regula el ENS vigente y derogó el RD 3/2010. Fija principios básicos, requisitos mínimos y medidas de seguridad según la categoría del sistema (básica, media o alta).",
    notes: [
      "El RD 3/2010 fue el primer ENS; está derogado.",
      "El RD 4/2010 regula el Esquema Nacional de Interoperabilidad (ENI).",
      null,
      "El RD 203/2021 aprueba el Reglamento de actuación y funcionamiento del sector público por medios electrónicos.",
    ],
    refs: ["Real Decreto 311/2022, de 3 de mayo"],
  },
  {
    topic: "I.7",
    text: "Según el RGPD, el responsable debe notificar una violación de la seguridad de los datos personales a la autoridad de control:",
    options: [
      "En las 24 horas siguientes a conocerla.",
      "En un plazo máximo de 48 horas.",
      "Sin dilación indebida y, de ser posible, a más tardar 72 horas después de haber tenido constancia de ella.",
      "En el plazo de siete días naturales.",
    ],
    answer: "C",
    explanation:
      "Art. 33 RGPD: notificación **sin dilación indebida y, si es posible, en 72 horas**; si se hace más tarde, hay que justificar el retraso. No es necesaria si es improbable que la violación suponga un riesgo para los derechos y libertades.",
    notes: [
      "24 horas no es el plazo del RGPD.",
      "48 horas no es el plazo previsto.",
      null,
      "Siete días no es el plazo del RGPD.",
    ],
    refs: ["Reglamento (UE) 2016/679 (RGPD), arts. 33 y 34"],
  },
  {
    topic: "I.7",
    text: "Según la LOPDGDD, el tratamiento de los datos de un menor basado en su propio consentimiento solo es posible si es mayor de:",
    options: ["13 años.", "14 años.", "16 años.", "18 años."],
    answer: "B",
    explanation:
      "El art. 7 de la LO 3/2018 fija los **14 años**. El RGPD (art. 8) establece 16 años con carácter general, pero permite a los Estados rebajarlo hasta 13; España optó por 14.",
    notes: [
      "13 años es el mínimo que permite el RGPD, pero España no lo eligió.",
      null,
      "16 años es la regla general del RGPD, desplazada por la LOPDGDD.",
      "No se exige la mayoría de edad para consentir el tratamiento.",
    ],
    refs: ["Ley Orgánica 3/2018 (LOPDGDD), art. 7", "RGPD, art. 8"],
  },
  {
    topic: "I.4",
    text: "Según la Ley 19/2013, ¿cuál es el plazo máximo para resolver y notificar una solicitud de acceso a la información pública?",
    options: ["15 días hábiles.", "Un mes, ampliable por otro mes.", "Dos meses improrrogables.", "Tres meses."],
    answer: "B",
    explanation:
      "Art. 20.1 de la Ley 19/2013: **un mes** desde la recepción por el órgano competente, **ampliable por otro mes** si el volumen o la complejidad lo justifican. El silencio es desestimatorio.",
    notes: [
      "Quince días es el plazo de alegaciones de los terceros afectados (art. 19.3).",
      null,
      "El plazo inicial es de un mes, aunque con la ampliación se pueda llegar a dos.",
      "Tres meses es el plazo supletorio de la Ley 39/2015.",
    ],
    refs: ["Ley 19/2013, arts. 19 y 20"],
  },
  {
    topic: "I.9",
    text: "¿Qué plataforma común permite a la ciudadanía identificarse ante las Administraciones públicas con claves concertadas (Cl@ve PIN, Cl@ve permanente) o con certificado electrónico?",
    options: ["Cl@ve.", "Notific@.", "SIR (Sistema de Interconexión de Registros).", "Carpeta Ciudadana."],
    answer: "A",
    explanation:
      "**Cl@ve** es el sistema común de identificación y firma de la Administración General del Estado: integra claves concertadas (Cl@ve PIN de un solo uso y Cl@ve permanente) y certificados electrónicos, previo registro de la persona usuaria.",
    notes: [
      null,
      "Notific@ es el servicio compartido para practicar notificaciones electrónicas.",
      "SIR interconecta las oficinas de registro de las distintas Administraciones.",
      "Carpeta Ciudadana permite consultar expedientes, notificaciones y datos que tienen las Administraciones, pero no es el sistema de identificación.",
    ],
    refs: ["Orden PRE/1838/2014 (Cl@ve)"],
  },
  // ───────────── Bloque II ─────────────
  {
    topic: "II.1",
    text: "¿Cuál es el valor decimal del número hexadecimal `2F`?",
    options: ["45", "47", "32", "215"],
    answer: "B",
    explanation: "En base 16 cada posición vale una potencia de 16: 2F₁₆ = 2 · 16 + 15 = **47** (la cifra F vale 15).",
    notes: ["Resulta de tomar F como 13.", null, "32 es 20₁₆; falta sumar F = 15.", "Resulta de concatenar 2 y 15 como si fueran cifras decimales."],
  },
  {
    topic: "II.1",
    text: "¿Cuántos bytes tiene un kibibyte (KiB)?",
    options: ["1.000", "1.024", "1.048", "8.192"],
    answer: "B",
    explanation: "Los prefijos binarios de la IEC usan potencias de 2: 1 KiB = 2¹⁰ = **1.024 bytes**. El kilobyte del SI (kB) son 1.000 bytes.",
    notes: ["1.000 bytes es un kilobyte (kB) del Sistema Internacional.", null, "Cifra sin sentido en ningún sistema.", "8.192 son los bits de un KiB (1.024 × 8)."],
    refs: ["IEC 80000-13"],
  },
  {
    topic: "II.1",
    text: "En complemento a dos con 8 bits, ¿qué rango de enteros se puede representar?",
    options: ["De 0 a 255.", "De −127 a 127.", "De −128 a 127.", "De −255 a 255."],
    answer: "C",
    explanation:
      "Con n bits en complemento a dos el rango es [−2ⁿ⁻¹, 2ⁿ⁻¹ − 1]; con 8 bits, de **−128 a 127**. Hay un único cero, por eso cabe un negativo más que positivos.",
    notes: [
      "Es el rango de 8 bits sin signo.",
      "Es el rango en signo-magnitud o complemento a uno, que tienen dos representaciones del cero.",
      null,
      "Harían falta 9 bits.",
    ],
  },
  {
    topic: "IV.2",
    text: "¿Qué nivel RAID distribuye la paridad entre todos los discos y necesita un mínimo de tres?",
    options: ["RAID 0", "RAID 1", "RAID 5", "RAID 10"],
    answer: "C",
    explanation: "**RAID 5** reparte datos y paridad entre todos los discos (mínimo 3) y tolera el fallo de uno; la capacidad útil es la de n − 1 discos.",
    notes: ["RAID 0 divide en bandas sin redundancia (mínimo 2).", "RAID 1 es un espejo (mínimo 2), sin paridad.", null, "RAID 10 combina espejos y bandas (mínimo 4), sin paridad."],
  },
  {
    topic: "II.3",
    text: "¿Qué estructura de datos sigue la política LIFO (el último en entrar es el primero en salir)?",
    options: ["La cola.", "La pila.", "El árbol binario de búsqueda.", "La tabla hash."],
    answer: "B",
    explanation: "En una **pila** (stack) solo se accede a la cima: *push* apila y *pop* desapila el último elemento introducido. Es, por ejemplo, la estructura de la pila de llamadas de un programa.",
    notes: [
      "La cola es FIFO: sale primero el que entró primero.",
      null,
      "Un ABB se recorre según el orden de las claves, no por orden de llegada.",
      "Una tabla hash accede por clave mediante una función de dispersión.",
    ],
  },
  {
    topic: "II.3",
    text: "¿Cuál es la complejidad temporal, en el peor caso, de la búsqueda binaria en un vector ordenado de *n* elementos?",
    options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
    answer: "B",
    explanation:
      "Cada comparación descarta la mitad del intervalo restante, así que como mucho se hacen ⌊log₂ n⌋ + 1 comparaciones: **O(log n)**. Requiere que el vector esté ordenado y admita acceso directo.",
    notes: ["O(1) sería el acceso directo a una posición conocida.", null, "O(n) es la búsqueda secuencial.", "O(n log n) es el coste de ordenaciones eficientes como mergesort."],
  },
  {
    topic: "II.4",
    text: "¿Cómo se denomina la situación en la que varios procesos esperan indefinidamente por recursos que retienen los otros?",
    options: ["Inanición (*starvation*).", "Interbloqueo (*deadlock*).", "Condición de carrera.", "Hiperpaginación (*thrashing*)."],
    answer: "B",
    explanation:
      "Un **interbloqueo** exige las cuatro condiciones de Coffman: exclusión mutua, retención y espera, no expropiación y espera circular. Basta con romper una de ellas para prevenirlo.",
    notes: [
      "En la inanición un proceso nunca obtiene el recurso porque otros se le adelantan, sin espera circular.",
      null,
      "Una condición de carrera es un resultado que depende del orden de ejecución de accesos concurrentes.",
      "La hiperpaginación es un exceso de fallos de página por falta de marcos de memoria.",
    ],
  },
  {
    topic: "II.4",
    text: "¿Qué algoritmo de planificación de la CPU asigna a cada proceso un *quantum* de tiempo de forma cíclica?",
    options: ["FCFS", "SJF", "Round Robin", "Prioridades no expropiativo"],
    answer: "C",
    explanation:
      "**Round Robin** es expropiativo: cada proceso dispone de un quantum y, si no termina, vuelve al final de la cola de listos. Un quantum muy grande lo convierte en FCFS y uno muy pequeño dispara los cambios de contexto.",
    notes: [
      "FCFS atiende por orden de llegada, sin expropiación.",
      "SJF elige el trabajo más corto; no reparte turnos fijos.",
      null,
      "Con prioridades no expropiativas el proceso conserva la CPU hasta bloquearse o terminar.",
    ],
  },
  {
    topic: "II.5",
    text: "¿Qué propiedad ACID garantiza que los cambios de una transacción confirmada persisten aunque falle el sistema?",
    options: ["Atomicidad.", "Consistencia.", "Aislamiento.", "Durabilidad."],
    answer: "D",
    explanation: "La **durabilidad** asegura que, tras el COMMIT, los cambios sobreviven a caídas; se implementa con el registro de transacciones (*log*) y la escritura en almacenamiento persistente.",
    notes: [
      "La atomicidad garantiza que la transacción se ejecuta entera o no se ejecuta.",
      "La consistencia preserva las reglas de integridad de la base de datos.",
      "El aislamiento evita interferencias entre transacciones concurrentes.",
      null,
    ],
  },
  // ───────────── Bloque III ─────────────
  {
    topic: "III.1",
    text: "En el modelo entidad/relación, ¿cómo se denomina la entidad cuya existencia depende de otra y que no puede identificarse solo con sus propios atributos?",
    options: ["Entidad fuerte.", "Entidad débil.", "Entidad asociativa.", "Superentidad."],
    answer: "B",
    explanation:
      "Una **entidad débil** depende de una entidad fuerte (en existencia y, a menudo, en identificación): su clave incluye la de la entidad de la que depende, como LÍNEA_FACTURA respecto de FACTURA.",
    notes: [
      "La entidad fuerte (regular) existe por sí misma y tiene clave propia.",
      null,
      "La entidad asociativa surge al tratar una relación como entidad.",
      "La superentidad es la entidad general de una jerarquía de generalización.",
    ],
  },
  {
    topic: "III.1",
    text: "En notación «pata de gallo» (*crow's foot*), ¿qué diagrama indica que cada **OFICINA** tiene una o varias **CITAS** y que cada cita pertenece a una única oficina?",
    options: [
      "![Diagrama: OFICINA y CITA unidas por una línea con doble raya en ambos extremos.](assets/demo-muestra/er-1-1.svg)",
      "![Diagrama: OFICINA con doble raya y CITA con una raya y pata de gallo.](assets/demo-muestra/er-1-n.svg)",
      "![Diagrama: raya y pata de gallo en ambos extremos de la línea.](assets/demo-muestra/er-n-m.svg)",
      "![Diagrama: OFICINA con doble raya y CITA con un círculo y una raya.](assets/demo-muestra/er-1-01.svg)",
    ],
    answer: "B",
    explanation:
      "La **pata de gallo** marca el lado *muchos* y la raya, el lado *uno*. `OFICINA ||——|< CITA` se lee: cada oficina tiene una o muchas citas y cada cita pertenece a una y solo una oficina (relación **1:N**).",
    notes: [
      "Doble raya en ambos extremos: relación 1:1 (cada oficina, una sola cita).",
      null,
      "Pata de gallo en los dos extremos: relación N:M, que exigiría una tabla intermedia.",
      "El círculo indica opcionalidad: cada oficina tendría como máximo una cita (0..1).",
    ],
    refs: ["Notación de Information Engineering (pata de gallo)"],
  },
  {
    topic: "III.1",
    text: "Una relación está en **segunda forma normal (2FN)** si está en 1FN y, además:",
    options: [
      "No presenta dependencias funcionales transitivas.",
      "Todo atributo no primo depende de forma completa de cada clave candidata.",
      "Todo determinante es clave candidata.",
      "No contiene dependencias multivaluadas.",
    ],
    answer: "B",
    explanation:
      "La 2FN elimina las **dependencias parciales**: ningún atributo no primo puede depender solo de una parte de una clave compuesta. Por eso solo puede incumplirse con claves compuestas.",
    notes: [
      "Eliminar las dependencias transitivas es la condición de la 3FN.",
      null,
      "Es la definición de la forma normal de Boyce-Codd (FNBC).",
      "La ausencia de dependencias multivaluadas corresponde a la 4FN.",
    ],
  },
  {
    topic: "III.2",
    text: "¿Qué programa traduce el código fuente completo a código objeto antes de su ejecución?",
    options: ["Un intérprete.", "Un compilador.", "Un enlazador (*linker*).", "Un depurador."],
    answer: "B",
    explanation:
      "El **compilador** analiza y traduce todo el programa de una vez y genera código objeto, que el enlazador combina después en un ejecutable. El intérprete traduce y ejecuta instrucción a instrucción.",
    notes: [
      "El intérprete ejecuta sentencia a sentencia sin generar un ejecutable previo.",
      null,
      "El enlazador une módulos objeto y bibliotecas; no traduce código fuente.",
      "El depurador ayuda a localizar errores durante la ejecución.",
    ],
  },
  {
    topic: "III.3",
    text: "En SQL, ¿qué cláusula filtra los grupos obtenidos con `GROUP BY` mediante una condición sobre funciones de agregado?",
    options: ["`WHERE`", "`HAVING`", "`ORDER BY`", "`DISTINCT`"],
    answer: "B",
    explanation:
      "`WHERE` filtra filas **antes** de agrupar y no admite agregados; `HAVING` filtra los grupos **después** de agrupar, por ejemplo `HAVING COUNT(*) > 5`.",
    notes: [
      "WHERE actúa antes del agrupamiento y no puede usar COUNT, SUM, etc.",
      null,
      "ORDER BY solo ordena el resultado.",
      "DISTINCT elimina filas duplicadas del resultado.",
    ],
    refs: ["ISO/IEC 9075 (SQL)"],
  },
  {
    topic: "III.3",
    text: "Dada la tabla `EMPLEADOS(id, nombre, departamento)`, ¿qué devuelve la siguiente consulta?\n\n```sql\nSELECT departamento, COUNT(*)\nFROM EMPLEADOS\nGROUP BY departamento;\n```",
    options: [
      "El número total de empleados de la organización.",
      "Una fila por departamento con su número de empleados.",
      "La lista de empleados ordenada por departamento.",
      "Un error, porque `COUNT(*)` exige una cláusula `HAVING`.",
    ],
    answer: "B",
    explanation:
      "`GROUP BY` forma un grupo por cada valor distinto de `departamento` y `COUNT(*)` cuenta las filas de cada grupo: el resultado tiene **una fila por departamento**.",
    notes: [
      "Sin GROUP BY, `SELECT COUNT(*) FROM EMPLEADOS` daría el total.",
      null,
      "La consulta agrupa; no lista ni ordena empleados.",
      "HAVING es opcional: solo hace falta para filtrar grupos.",
    ],
  },
  {
    topic: "III.3",
    text: "Dada la tabla `EMPLEADOS`:\n\n| id | nombre | dept |\n|---:|--------|------|\n| 1 | Ana | IT |\n| 2 | Luis | RRHH |\n| 3 | Marta | IT |\n| 4 | Jorge | NULL |\n\n¿Cuántas filas devuelve `SELECT DISTINCT dept FROM EMPLEADOS;`?",
    options: ["2", "3", "4", "1"],
    answer: "B",
    explanation:
      "`DISTINCT` elimina duplicados: IT aparece una vez, RRHH otra y `NULL` también forma una fila (a efectos de DISTINCT los nulos se consideran iguales entre sí). Resultado: **3 filas**.",
    notes: [
      "Sería así si DISTINCT descartase los NULL, pero no lo hace.",
      null,
      "Ese es el número de filas sin DISTINCT.",
      "Solo habría una fila si todos los departamentos coincidieran.",
    ],
  },
  {
    topic: "III.4",
    text: "En programación orientada a objetos, ¿cómo se llama la capacidad de que objetos de distintas clases respondan de forma diferente a un mismo mensaje?",
    options: ["Encapsulación.", "Herencia.", "Polimorfismo.", "Abstracción."],
    answer: "C",
    explanation:
      "El **polimorfismo** permite invocar un método sobre una referencia de tipo base y que se ejecute la implementación de la clase concreta (enlace dinámico), p. ej. `figura.area()` en un `Circulo` o un `Cuadrado`.",
    notes: [
      "La encapsulación oculta el estado interno tras una interfaz pública.",
      "La herencia reutiliza y especializa una clase existente; es la base del polimorfismo, pero no es lo mismo.",
      null,
      "La abstracción consiste en modelar solo las características esenciales.",
    ],
  },
  {
    topic: "III.2",
    text: "¿Qué muestra por pantalla el siguiente fragmento Java?\n\n```java\nint x = 5;\nint y = x++ + ++x;\nSystem.out.println(y);\n```",
    options: ["10", "11", "12", "13"],
    answer: "C",
    explanation:
      "`x++` devuelve 5 y deja x = 6; después `++x` incrementa x a 7 y devuelve 7. Por tanto, y = 5 + 7 = **12** (y x termina valiendo 7).",
    notes: [
      "Supone que ninguno de los operadores cambia el valor usado: 5 + 5.",
      "Sumaría 5 + 6, olvidando que `++x` incrementa antes de usar el valor.",
      null,
      "Sumaría 6 + 7, como si `x++` devolviera el valor ya incrementado.",
    ],
    refs: ["Java Language Specification, §15.14 y §15.15"],
  },
  {
    topic: "IV.8",
    text: "¿Qué código de estado HTTP indica que el servidor no encuentra el recurso solicitado?",
    options: ["200", "301", "404", "500"],
    answer: "C",
    explanation: "Los códigos 4xx son errores del cliente; **404 Not Found** indica que el servidor no encuentra el recurso solicitado.",
    notes: ["200 OK: la petición ha tenido éxito.", "301 Moved Permanently: redirección permanente.", null, "500 Internal Server Error: error del servidor."],
    refs: ["RFC 9110 (HTTP Semantics), §15"],
  },
  {
    topic: "III.7",
    text: "En HTML5, ¿qué elemento es el semánticamente adecuado para agrupar los enlaces de navegación principal?",
    options: ['`<div id="nav">`', "`<nav>`", "`<menu>`", "`<section>`"],
    answer: "B",
    explanation:
      "`<nav>` representa una sección con enlaces de navegación principales. Además de aportar semántica, los lectores de pantalla lo exponen como región (*landmark*) de navegación.",
    notes: [
      "Un `div` no aporta significado: solo un identificador.",
      null,
      "`<menu>` representa una lista de comandos o acciones, no la navegación del sitio.",
      "`<section>` agrupa contenido temático con encabezado, no navegación.",
    ],
    refs: ["HTML Living Standard, elemento nav"],
  },
  {
    topic: "III.8",
    text: "El Real Decreto 1112/2018, sobre accesibilidad de los sitios web y aplicaciones para dispositivos móviles del sector público, presume conformes los contenidos que cumplan:",
    options: ["La norma ISO/IEC 27001.", "La norma UNE-EN 301 549.", "La norma UNE 139803:2004.", "La norma ISO 9241-210."],
    answer: "B",
    explanation:
      "El RD 1112/2018 (que transpone la Directiva (UE) 2016/2102) remite a la norma armonizada **UNE-EN 301 549**, que incorpora los criterios de nivel A y AA de las WCAG 2.1.",
    notes: [
      "ISO/IEC 27001 trata de los sistemas de gestión de la seguridad de la información.",
      null,
      "La UNE 139803 fue la referencia española anterior a la armonización europea.",
      "ISO 9241-210 trata el diseño centrado en las personas; no fija requisitos legales de accesibilidad.",
    ],
    refs: ["Real Decreto 1112/2018", "UNE-EN 301 549"],
  },
  {
    topic: "III.9",
    text: "En Git, ¿qué orden integra en la rama actual los cambios de otra rama, creando si es necesario un *commit* de fusión?",
    options: ["`git fetch`", "`git merge`", "`git clone`", "`git stash`"],
    answer: "B",
    explanation:
      "`git merge <rama>` combina el historial de otra rama con la actual; si no es posible un avance rápido (*fast-forward*), crea un commit de fusión con dos padres.",
    notes: [
      "`git fetch` descarga objetos y referencias del remoto, pero no modifica la rama actual.",
      null,
      "`git clone` copia un repositorio completo.",
      "`git stash` guarda temporalmente cambios no confirmados.",
    ],
  },
  {
    topic: "III.9",
    text: "¿Qué tipo de prueba verifica de forma aislada el funcionamiento de un componente o módulo individual?",
    options: ["Prueba de integración.", "Prueba unitaria.", "Prueba de aceptación.", "Prueba de regresión."],
    answer: "B",
    explanation:
      "Las **pruebas unitarias** comprueban la unidad más pequeña (función, clase o módulo) aislada de sus dependencias, normalmente con dobles de prueba (*mocks* o *stubs*) y de forma automatizada.",
    notes: [
      "La de integración comprueba la interacción entre varios componentes.",
      null,
      "La de aceptación valida con el usuario que el sistema cumple los requisitos.",
      "La de regresión verifica que los cambios no han roto lo que ya funcionaba.",
    ],
  },
  // ───────────── Bloque IV ─────────────
  {
    topic: "IV.1",
    text: "En Linux, ¿qué permisos en notación octal corresponden a `rwxr-x---`?",
    options: ["750", "755", "640", "770"],
    answer: "A",
    explanation:
      "Cada terna se suma con r = 4, w = 2 y x = 1: propietario `rwx` = 7, grupo `r-x` = 5 y otros `---` = 0 → **750** (`chmod 750 fichero`).",
    notes: [null, "755 daría también lectura y ejecución a otros (`rwxr-xr-x`).", "640 es `rw-r-----` (sin ejecución).", "770 daría también escritura al grupo (`rwxrwx---`)."],
  },
  {
    topic: "IV.8",
    text: "¿Qué protocolo traduce nombres de dominio en direcciones IP?",
    options: ["DHCP", "DNS", "ARP", "SNMP"],
    answer: "B",
    explanation: "**DNS** es un sistema jerárquico y distribuido de resolución de nombres; usa el puerto 53 (UDP y, para respuestas grandes y transferencias de zona, TCP).",
    notes: [
      "DHCP asigna automáticamente la configuración IP a los equipos.",
      null,
      "ARP obtiene la dirección MAC asociada a una IPv4 en la red local.",
      "SNMP sirve para gestionar y monitorizar dispositivos de red.",
    ],
    refs: ["RFC 1034", "RFC 1035"],
  },
  {
    topic: "IV.3",
    text: "¿Cuál es el puerto estándar del protocolo SMTP?",
    options: ["25", "587", "110", "143"],
    answer: "A",
    annulled: true,
    explanation:
      "Pregunta **anulada** en la plantilla de muestra: el 25 es el puerto de SMTP entre servidores, pero el 587 es el puerto estándar de envío desde los clientes (*submission*), así que había dos respuestas defendibles. El 110 y el 143 son de POP3 e IMAP.",
    notes: null,
    refs: ["RFC 5321", "RFC 6409"],
  },
  {
    topic: "IV.2",
    text: "¿Qué tipo de copia de seguridad guarda los datos modificados desde la última copia **completa**?",
    options: ["Incremental.", "Diferencial.", "Completa.", "Espejo."],
    answer: "B",
    explanation:
      "La **diferencial** copia todo lo cambiado desde la última completa, así que para restaurar basta la completa más la última diferencial. La incremental copia lo cambiado desde la última copia de cualquier tipo: ocupa menos, pero restaurar exige todas las incrementales.",
    notes: [
      "La incremental toma como referencia la última copia de cualquier tipo, no la última completa.",
      null,
      "La completa copia todos los datos, hayan cambiado o no.",
      "Una copia espejo replica el estado actual sin conservar versiones.",
    ],
  },
  {
    topic: "IV.10",
    text: "¿Qué dispositivo de red segmenta los dominios de colisión trabajando con direcciones MAC?",
    options: ["El concentrador (*hub*).", "El conmutador (*switch*).", "El repetidor.", "La pasarela de aplicación."],
    answer: "B",
    explanation:
      "El **switch** opera en el nivel 2: aprende las direcciones MAC de cada puerto y reenvía las tramas solo al puerto de destino, de modo que cada puerto es un dominio de colisión. No separa dominios de difusión salvo con VLAN.",
    notes: [
      "El hub repite la señal por todos los puertos: un único dominio de colisión.",
      null,
      "El repetidor regenera la señal en el nivel físico.",
      "Una pasarela de aplicación trabaja en el nivel 7, no con direcciones MAC.",
    ],
  },
  {
    topic: "IV.10",
    text:
      "Observa el esquema de red:\n\n![Esquema: el router R1 conecta por Gi0/0 el switch SW1 (PC1, PC2 y PC3, red 10.0.1.0/24) y por Gi0/1 el switch SW2 (PC4 y el servidor SRV, red 10.0.2.0/24).](assets/demo-muestra/red-r1.svg)\n\nSin VLAN configuradas, ¿cuántos **dominios de difusión** (*broadcast*) hay?",
    options: ["1", "2", "3", "7"],
    answer: "B",
    media: [NETWORK_DIAGRAM],
    explanation:
      "Cada interfaz de un router delimita un dominio de difusión; los switches los extienden pero no los dividen (sin VLAN). R1 tiene dos interfaces con red (10.0.1.0/24 y 10.0.2.0/24): hay **2 dominios de difusión**.",
    notes: [
      "Sería así si todos los equipos colgaran de switches sin un router entre medias.",
      null,
      "No hay una tercera interfaz del router con red conectada.",
      "Siete es el número de dominios de colisión (un enlace por puerto de switch o router), no de difusión.",
    ],
  },
  {
    topic: "IV.7",
    text: "¿En qué capa del modelo OSI opera un router?",
    options: ["Enlace de datos (nivel 2).", "Red (nivel 3).", "Transporte (nivel 4).", "Sesión (nivel 5)."],
    answer: "B",
    explanation: "El router encamina paquetes entre redes según la dirección lógica (IP) de destino y su tabla de rutas: es un dispositivo de **nivel 3**.",
    notes: [
      "En el nivel 2 trabajan switches y puentes con direcciones MAC.",
      null,
      "El nivel 4 gestiona la comunicación extremo a extremo (TCP/UDP).",
      "El nivel 5 gestiona el diálogo entre aplicaciones.",
    ],
  },
  {
    topic: "IV.7",
    text: "¿Cuántas direcciones de host utilizables tiene una subred IPv4 con prefijo `/26`?",
    options: ["30", "62", "64", "126"],
    answer: "B",
    explanation: "Un /26 deja 32 − 26 = 6 bits de host: 2⁶ = 64 direcciones, menos la de red y la de difusión = **62 hosts**.",
    notes: ["30 hosts corresponde a un /27.", null, "64 es el total de direcciones, sin restar red y difusión.", "126 hosts corresponde a un /25."],
  },
  {
    topic: "IV.7",
    text: "¿Cuántos bits tiene una dirección IPv6?",
    options: ["32", "64", "128", "256"],
    answer: "C",
    explanation:
      "IPv6 usa direcciones de **128 bits**, escritas en 8 grupos de 4 dígitos hexadecimales separados por «:». Habitualmente los 64 bits de menor peso identifican la interfaz.",
    notes: [
      "32 bits es el tamaño de una dirección IPv4.",
      "64 bits es el tamaño habitual del identificador de interfaz, no de la dirección completa.",
      null,
      "256 bits no corresponde a ninguna versión de IP.",
    ],
    refs: ["RFC 8200", "RFC 4291"],
  },
  {
    topic: "IV.8",
    text: "¿Qué puerto TCP usa por defecto HTTPS?",
    options: ["80", "443", "8080", "22"],
    answer: "B",
    explanation: "HTTPS (HTTP sobre TLS) usa por defecto el puerto **443/TCP**; HTTP sin cifrar usa el 80.",
    notes: ["80 es el puerto de HTTP sin cifrar.", null, "8080 es un puerto alternativo habitual de servidores de aplicaciones y proxies.", "22 es el puerto de SSH."],
  },
  {
    topic: "IV.5",
    text: "¿Cuál de los siguientes es un algoritmo de cifrado **simétrico**?",
    options: ["RSA", "AES", "Diffie-Hellman", "ECDSA"],
    answer: "B",
    explanation: "**AES** (Rijndael) cifra en bloques de 128 bits con claves de 128, 192 o 256 bits; emisor y receptor comparten la misma clave secreta.",
    notes: [
      "RSA es asimétrico (par de claves pública y privada).",
      null,
      "Diffie-Hellman es un protocolo de acuerdo de claves, no un cifrado simétrico.",
      "ECDSA es un algoritmo de firma digital con curvas elípticas.",
    ],
    refs: ["FIPS 197"],
  },
  {
    topic: "IV.9",
    text: "¿Qué ataque busca dejar un servicio inaccesible saturándolo con peticiones desde múltiples equipos?",
    options: ["*Phishing*.", "Denegación de servicio distribuida (DDoS).", "Ataque de intermediario (*man-in-the-middle*).", "Inyección SQL."],
    answer: "B",
    explanation:
      "En un **DDoS** muchos equipos (a menudo una *botnet*) envían tráfico a la vez para agotar el ancho de banda o los recursos del servidor. Se mitiga con filtrado, limitación de tasa y servicios de limpieza de tráfico.",
    notes: [
      "El phishing engaña al usuario para obtener credenciales.",
      null,
      "El ataque de intermediario intercepta o altera las comunicaciones.",
      "La inyección SQL introduce código malicioso en consultas a la base de datos.",
    ],
  },
  {
    topic: "IV.6",
    text: "¿Qué estándar IEEE corresponde a Wi-Fi 6?",
    options: ["802.11ac", "802.11ax", "802.11n", "802.3ab"],
    answer: "B",
    explanation:
      "La Wi-Fi Alliance denomina Wi-Fi 4 a 802.11n, Wi-Fi 5 a 802.11ac y Wi-Fi 6/6E a **802.11ax**, que introduce OFDMA y mejora la eficiencia en entornos densos.",
    notes: ["802.11ac es Wi-Fi 5.", null, "802.11n es Wi-Fi 4.", "802.3ab es Gigabit Ethernet sobre par trenzado (1000BASE-T), no Wi-Fi."],
  },
];

const RESERVE: QInput[] = [
  {
    topic: "III.4",
    text: "¿Qué patrón de diseño garantiza que una clase tenga una única instancia y ofrece un punto de acceso global a ella?",
    options: ["Factory Method", "Singleton", "Observer", "Adapter"],
    answer: "B",
    explanation: "**Singleton** (patrón creacional del catálogo GoF) oculta el constructor y expone un método estático que devuelve siempre la misma instancia.",
    notes: [
      "Factory Method delega en subclases la creación de objetos.",
      null,
      "Observer notifica los cambios de estado a los objetos suscritos.",
      "Adapter traduce una interfaz a otra que espera el cliente.",
    ],
  },
  {
    topic: "IV.2",
    text: "En computación en la nube, ¿qué modelo de servicio ofrece máquinas virtuales, almacenamiento y redes, dejando al cliente la gestión del sistema operativo?",
    options: ["SaaS", "PaaS", "IaaS", "FaaS"],
    answer: "C",
    explanation:
      "En **IaaS** el proveedor gestiona el hardware y la virtualización, y el cliente administra el sistema operativo, el *middleware* y las aplicaciones. En PaaS el proveedor gestiona también la plataforma; en SaaS, la aplicación completa.",
    notes: [
      "En SaaS el cliente solo usa la aplicación final.",
      "En PaaS el proveedor gestiona también el sistema operativo y el entorno de ejecución.",
      null,
      "En FaaS (*serverless*) el cliente solo despliega funciones.",
    ],
    refs: ["NIST SP 800-145"],
  },
];

const CASE_1_STATEMENT = `La Subdirección General de Tecnologías de la Información de un ministerio va a desarrollar una aplicación web de **cita previa** para sus oficinas de atención al ciudadano. Tras el análisis se ha obtenido el siguiente modelo relacional (en negrita, la clave primaria):

| Tabla | Columnas |
|---|---|
| \`CIUDADANO\` | **dni**, nombre, email |
| \`OFICINA\` | **id_oficina**, nombre, provincia |
| \`CITA\` | **id_cita**, dni → CIUDADANO, id_oficina → OFICINA, fecha, hora, estado |

Cada oficina puede tener muchas citas y cada cita corresponde a una única oficina y a un único ciudadano. El estado de una cita puede ser \`PENDIENTE\`, \`ATENDIDA\` o \`ANULADA\`.

La validación del DNI en el servidor se ha implementado en Java así:

\`\`\`java
public static char letraDni(int numero) {
    String letras = "TRWAGMYFPDXBNJZSQVHLCKE";
    return letras.charAt(numero % 23);
}
\`\`\`

La aplicación expondrá además una API REST y deberá cumplir los requisitos de accesibilidad del sector público.`;

const CASE_1: QInput[] = [
  {
    topic: "III.1",
    text: "¿Qué cardinalidad tiene la relación entre `OFICINA` y `CITA`?",
    options: ["Uno a uno (1:1).", "Uno a muchos (1:N).", "Muchos a muchos (N:M).", "Ninguna: son tablas independientes."],
    answer: "B",
    explanation:
      "Una oficina tiene muchas citas y cada cita pertenece a una sola oficina: relación **1:N**, implementada con la clave ajena `id_oficina` en `CITA` (el lado N).",
    notes: [
      "En 1:1 cada oficina tendría como mucho una cita.",
      null,
      "N:M exigiría una tabla intermedia; aquí cada cita tiene una única oficina.",
      "Están relacionadas mediante la clave ajena `id_oficina`.",
    ],
  },
  {
    topic: "III.3",
    text: "¿Qué consulta obtiene, para cada oficina de la provincia de Teruel, su nombre y su número de citas?",
    options: [
      "`SELECT o.nombre, COUNT(*) FROM OFICINA o JOIN CITA c ON c.id_oficina = o.id_oficina WHERE o.provincia = 'Teruel' GROUP BY o.nombre;`",
      "`SELECT o.nombre, COUNT(*) FROM OFICINA o JOIN CITA c ON c.id_oficina = o.id_oficina WHERE o.provincia = 'Teruel';`",
      "`SELECT o.nombre, COUNT(*) FROM OFICINA o, CITA c WHERE o.provincia = 'Teruel' GROUP BY o.nombre;`",
      "`SELECT o.nombre, COUNT(*) FROM OFICINA o JOIN CITA c ON c.id_oficina = o.id_oficina GROUP BY o.nombre WHERE o.provincia = 'Teruel';`",
    ],
    answer: "A",
    explanation:
      "Hay que **combinar** las tablas por la clave ajena, **filtrar** con WHERE antes de agrupar y **agrupar** por oficina. Para mayor rigor se podría agrupar por `o.id_oficina, o.nombre`.",
    notes: [
      null,
      "Sin GROUP BY, mezclar una columna no agregada con COUNT(*) es un error en SQL estándar.",
      "Falta la condición de combinación: produce un producto cartesiano y cuenta todas las citas de todas las oficinas.",
      "WHERE debe ir antes de GROUP BY: la consulta es sintácticamente incorrecta.",
    ],
  },
  {
    topic: "III.1",
    text: "Para impedir que existan dos citas en la misma oficina, fecha y hora, la restricción más adecuada es:",
    options: [
      "`PRIMARY KEY (id_cita)`",
      "`UNIQUE (id_oficina, fecha, hora)`",
      "`CHECK (hora > '08:00')`",
      "`FOREIGN KEY (dni) REFERENCES CIUDADANO`",
    ],
    answer: "B",
    explanation:
      "Una restricción **UNIQUE compuesta** impide repetir la combinación oficina-fecha-hora sin cambiar la clave primaria subrogada `id_cita`.",
    notes: [
      "La clave primaria ya existe y no evita repetir oficina, fecha y hora.",
      null,
      "CHECK valida los valores de una fila, no la unicidad entre filas.",
      "Garantiza la integridad referencial con CIUDADANO, no la unicidad de la cita.",
    ],
  },
  {
    topic: "III.2",
    text: "Según el método `letraDni`, ¿qué letra corresponde al DNI número 12345678?",
    options: ["X", "Z", "S", "J"],
    answer: "B",
    explanation:
      "12.345.678 mod 23 = 14 (23 × 536.768 = 12.345.664 y 12.345.678 − 12.345.664 = 14). En la cadena, la posición 14 contando desde 0 es la **Z**.",
    notes: ["La X ocupa la posición 10.", null, "La S ocupa la posición 15: sería el error de contar desde 1.", "La J ocupa la posición 13."],
  },
  {
    topic: "III.6",
    text: "En la API REST, ¿qué método HTTP es el adecuado para anular (eliminar) la cita identificada por `/citas/42`?",
    options: ["GET", "POST", "DELETE", "HEAD"],
    answer: "C",
    explanation:
      "En REST, **DELETE** elimina el recurso identificado por la URI y es idempotente. Si la anulación solo cambiara el estado a `ANULADA`, también sería razonable un PATCH sobre el recurso.",
    notes: [
      "GET solo recupera la representación del recurso (operación segura).",
      "POST se usa para crear recursos o acciones no idempotentes.",
      null,
      "HEAD obtiene solo las cabeceras de la respuesta.",
    ],
    refs: ["RFC 9110, §9.3.5"],
  },
  {
    topic: "III.8",
    text: "El formulario de cita previa debe cumplir el RD 1112/2018. ¿Qué nivel de conformidad de las WCAG 2.1 se exige como mínimo?",
    options: ["A", "AA", "AAA", "Ninguno: los formularios están excluidos."],
    answer: "B",
    explanation:
      "La norma UNE-EN 301 549, a la que remite el RD 1112/2018, incorpora los criterios de nivel A y **AA** de las WCAG 2.1. El nivel AAA no se exige con carácter general.",
    notes: [
      "El nivel A es insuficiente: también hay que cumplir los criterios AA.",
      null,
      "El nivel AAA no es exigible con carácter general.",
      "Los formularios forman parte del contenido y deben ser accesibles.",
    ],
    refs: ["Real Decreto 1112/2018", "WCAG 2.1"],
  },
];

const CASE_2_STATEMENT = `La Delegación del Gobierno en una comunidad autónoma renueva su red local. Dispone del bloque **192.168.10.0/24** y quiere dividirlo con VLSM en cuatro subredes, una por VLAN:

| VLAN | Uso | Equipos |
|---:|---|---:|
| 10 | Wi-Fi de invitados | 100 |
| 20 | Atención al ciudadano | 50 |
| 30 | Administración | 25 |
| 40 | Servidores | 10 |

Las subredes se asignan **de mayor a menor tamaño**, empezando por la dirección más baja del bloque.

Los servidores son Linux y se hace una copia de seguridad cada noche. La política exige poder restaurar el estado de **cualquier día de la última semana** ocupando el menor espacio posible.`;

const CASE_2: QInput[] = [
  {
    topic: "IV.7",
    text: "¿Cuál es la subred más pequeña (prefijo más largo) que admite los 100 equipos de la VLAN 10?",
    options: ["/24", "/25", "/26", "/27"],
    answer: "B",
    explanation:
      "Hacen falta 100 hosts más la dirección de red y la de difusión: 2⁷ = 128 ≥ 102, así que bastan 7 bits de host → **/25** (126 hosts útiles). Un /26 solo admite 62.",
    notes: ["Un /24 admite 254 hosts: sirve, pero desperdicia el bloque entero.", null, "Un /26 solo admite 62 hosts.", "Un /27 solo admite 30 hosts."],
  },
  {
    topic: "IV.7",
    text: "Siguiendo el reparto indicado, la VLAN 20 recibe la subred `192.168.10.128/26`. ¿Cuál es su dirección de difusión?",
    options: ["192.168.10.127", "192.168.10.190", "192.168.10.191", "192.168.10.255"],
    answer: "C",
    explanation:
      "Un /26 abarca 64 direcciones: de .128 a .191. La primera (.128) es la de red y la última (**.191**) la de difusión; los hosts van de .129 a .190.",
    notes: [
      "192.168.10.127 es la difusión de la VLAN 10 (192.168.10.0/25).",
      "192.168.10.190 es el último host utilizable, no la difusión.",
      null,
      "192.168.10.255 sería la difusión de todo el /24.",
    ],
  },
  {
    topic: "IV.4",
    text: "¿Qué servicio conviene desplegar para que los equipos de cada VLAN obtengan su configuración IP automáticamente?",
    options: ["DNS.", "DHCP, con agente de retransmisión en el router.", "NAT.", "ICMP."],
    answer: "B",
    explanation:
      "**DHCP** asigna dirección, máscara, puerta de enlace y DNS. Como las peticiones DHCP son de difusión, si el servidor está en otra VLAN el router debe actuar como agente de retransmisión (*DHCP relay*).",
    notes: [
      "DNS resuelve nombres; no asigna direcciones.",
      null,
      "NAT traduce direcciones, por ejemplo hacia Internet.",
      "ICMP es un protocolo de control y diagnóstico (ping).",
    ],
  },
  {
    topic: "IV.4",
    text: "Para que los equipos de distintas VLAN puedan comunicarse entre sí hace falta:",
    options: [
      "Un concentrador (*hub*).",
      "Un dispositivo de nivel 3 (router o switch multicapa).",
      "Un punto de acceso inalámbrico.",
      "Un repetidor.",
    ],
    answer: "B",
    explanation:
      "Cada VLAN es un dominio de difusión y una subred distinta, así que el tráfico entre ellas se encamina en el **nivel 3**: router con subinterfaces (*router-on-a-stick*) o switch multicapa con interfaces SVI.",
    notes: [
      "Un hub trabaja en el nivel 1 y no entiende de VLAN.",
      null,
      "Un punto de acceso extiende la red inalámbrica, no encamina entre VLAN.",
      "Un repetidor solo regenera la señal.",
    ],
  },
  {
    topic: "IV.1",
    text: "En los servidores Linux, ¿qué orden muestra las interfaces de red y sus direcciones IP en las distribuciones actuales?",
    options: ["`ip addr`", "`netstat -r`", "`route print`", "`ipconfig /all`"],
    answer: "A",
    explanation: "`ip addr` (o `ip a`), de iproute2, sustituye al antiguo `ifconfig` para mostrar interfaces y direcciones.",
    notes: [
      null,
      "`netstat -r` muestra la tabla de rutas y está obsoleto en favor de `ip route`.",
      "`route print` es una orden de Windows.",
      "`ipconfig /all` es una orden de Windows.",
    ],
  },
  {
    topic: "IV.2",
    text: "¿Qué estrategia de copias cumple la política de restaurar cualquier día de la última semana ocupando el menor espacio?",
    options: [
      "Una copia completa cada noche.",
      "Una copia completa semanal e incrementales diarias.",
      "Una única copia completa mensual.",
      "Un RAID 1 en los servidores.",
    ],
    answer: "B",
    explanation:
      "Con una **completa semanal e incrementales diarias** se reconstruye cualquier día (completa + incrementales hasta ese día) y cada incremental solo guarda lo cambiado desde la copia anterior, que es lo que menos ocupa.",
    notes: [
      "Cumple la recuperación, pero ocupa siete veces el volumen completo.",
      null,
      "No permite recuperar el estado de cada día de la semana.",
      "RAID protege frente al fallo de un disco, pero no es una copia de seguridad: replica también borrados y corrupciones.",
    ],
  },
];

export const DEMO_BANK: BankFile = {
  schema_version: 1,
  id: DEMO_BANK_ID,
  kind: "official",
  title: "Examen de muestra · formato TAI (demo)",
  description:
    "Preguntas de elaboración propia con el formato del ejercicio oficial: cuestionario con reservas y dos supuestos prácticos a elegir. Solo para la demo en navegador.",
  access: "libre",
  year: 2026,
  convocatoria: null,
  exam_date: null,
  model: null,
  duration_minutes: 75,
  scoring_scheme: "demo-muestra",
  source: {
    publisher: "OpoTAI (elaboración propia)",
    documents: [],
    answer_key: "propia",
    retrieved: "2026-10-11",
    notes: "Modo demo",
  },
  sections: [
    {
      id: "p1",
      part: 1,
      kind: "theory",
      title: "Primera parte · Cuestionario",
      block: null,
      statement: null,
      media: [],
      questions: build(`${DEMO_BANK_ID}-p1`, THEORY),
      reserve: build(`${DEMO_BANK_ID}-p1`, RESERVE, true),
    },
    {
      id: "p2-s1",
      part: 2,
      kind: "case",
      title: "Supuesto 1 · Cita previa en las oficinas de un ministerio",
      block: "III",
      statement: CASE_1_STATEMENT,
      media: [],
      questions: build(`${DEMO_BANK_ID}-p2-s1`, CASE_1),
      reserve: [],
    },
    {
      id: "p2-s2",
      part: 2,
      kind: "case",
      title: "Supuesto 2 · Red de una Delegación del Gobierno",
      block: "IV",
      statement: CASE_2_STATEMENT,
      media: [],
      questions: build(`${DEMO_BANK_ID}-p2-s2`, CASE_2),
      reserve: [],
    },
  ],
};
