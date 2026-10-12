// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
/**
 * Teoría de EJEMPLO del modo demo: tres temas breves (elaboración propia) para
 * enseñar la sección «Teoría». La app de escritorio usa la teoría del núcleo.
 */
import type { BlockId } from "../types";

export interface DemoTheory {
  topic: string;
  block: BlockId;
  summary: string;
  key_points: string[];
  content: string;
  sources: { title: string; url: string }[];
  updated: string;
}

export const DEMO_THEORY: DemoTheory[] = [
  {
    topic: "I.8",
    block: "I",
    summary:
      "Qué regula cada ley, cómo se computan los plazos, cuánto tiene la Administración para resolver y qué recursos caben.",
    key_points: [
      "Ley 39/2015: relación con los ciudadanos (procedimiento). Ley 40/2015: organización y funcionamiento del sector público.",
      "Plazos por días: hábiles, excluidos sábados, domingos y festivos (art. 30).",
      "Sin plazo específico, el máximo para resolver y notificar es de 3 meses (art. 21.3).",
      "Alzada y reposición se interponen en 1 mes contra actos expresos.",
      "Si el último día del plazo es inhábil, se prorroga al primer día hábil siguiente.",
    ],
    updated: "2026-10-11",
    sources: [
      { title: "Ley 39/2015 (texto consolidado, BOE)", url: "https://www.boe.es/buscar/act.php?id=BOE-A-2015-10565" },
      { title: "Ley 40/2015 (texto consolidado, BOE)", url: "https://www.boe.es/buscar/act.php?id=BOE-A-2015-10566" },
    ],
    content: `## 1. Dos leyes, dos ámbitos

| | Ley 39/2015 (LPACAP) | Ley 40/2015 (LRJSP) |
|---|---|---|
| Ámbito | Relaciones *ad extra*: Administración ↔ ciudadanos | Funcionamiento interno y relaciones entre Administraciones |
| Contenido | Interesados, actos, plazos, procedimiento y recursos | Órganos (también colegiados), sector público institucional, convenios y responsabilidad patrimonial |

## 2. Cómputo de plazos (art. 30)

- **Horas**: son hábiles todas las de un día hábil y se cuentan de hora en hora; no pueden superar las 24 horas (si lo hacen, se expresan en días).
- **Días**: hábiles, excluidos los **sábados, domingos y festivos**.
- **Meses o años**: de fecha a fecha desde el día siguiente a la notificación o publicación; si en el mes de vencimiento no hay día equivalente, vence el último día del mes.
- Si el último día es inhábil, el plazo se prorroga al **primer día hábil siguiente**.

> Truco de examen: «días» sin más en la Ley 39/2015 son **hábiles**; los naturales deben indicarse de forma expresa.

## 3. Obligación de resolver (art. 21)

1. La Administración está obligada a dictar resolución expresa y a notificarla.
2. El plazo máximo es el que fije la norma del procedimiento, que no puede superar **seis meses** salvo que lo establezca una ley o el Derecho de la Unión Europea.
3. Si la norma no fija plazo, es de **tres meses**.

## 4. Recursos administrativos

| Recurso | Contra | Plazo (acto expreso) | Plazo para resolver |
|---|---|---|---|
| Alzada | Actos que no ponen fin a la vía administrativa | 1 mes | 3 meses |
| Potestativo de reposición | Actos que ponen fin a la vía administrativa | 1 mes | 1 mes |
| Extraordinario de revisión | Actos firmes, por causas tasadas | 4 años o 3 meses, según la causa | 3 meses |
`,
  },
  {
    topic: "III.3",
    block: "III",
    summary: "Orden lógico de evaluación de SELECT, agregaciones con GROUP BY y HAVING, combinaciones y subconsultas.",
    key_points: [
      "Orden lógico: FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY.",
      "WHERE filtra filas (sin agregados); HAVING filtra grupos (con agregados).",
      "COUNT(*) cuenta filas; COUNT(columna) ignora los NULL.",
      "INNER JOIN devuelve solo coincidencias; LEFT JOIN conserva todas las filas de la izquierda.",
      "Con NULL se compara con IS NULL o IS NOT NULL, nunca con «=».",
    ],
    updated: "2026-10-11",
    sources: [
      { title: "PostgreSQL · Documentación de SELECT", url: "https://www.postgresql.org/docs/current/sql-select.html" },
    ],
    content: `## 1. Orden lógico de una consulta

\`\`\`sql
SELECT   departamento, COUNT(*) AS empleados   -- 5
FROM     EMPLEADOS                             -- 1
WHERE    activo = 1                            -- 2
GROUP BY departamento                          -- 3
HAVING   COUNT(*) > 5                          -- 4
ORDER BY empleados DESC;                       -- 6
\`\`\`

> Por eso un alias definido en \`SELECT\` no se puede usar en \`WHERE\`, pero sí en \`ORDER BY\`.

## 2. Funciones de agregado y valores nulos

| Función | Qué hace | Con NULL |
|---|---|---|
| \`COUNT(*)\` | Cuenta filas | Las cuenta |
| \`COUNT(col)\` | Cuenta valores | Los ignora |
| \`SUM\`, \`AVG\` | Suma y media | Los ignoran |
| \`MIN\`, \`MAX\` | Mínimo y máximo | Los ignoran |

## 3. Combinaciones (JOIN)

- \`INNER JOIN\`: solo las filas con pareja en ambas tablas.
- \`LEFT [OUTER] JOIN\`: todas las filas de la izquierda; las columnas de la derecha quedan a \`NULL\` si no hay pareja.
- \`CROSS JOIN\` (o tablas separadas por comas sin condición): producto cartesiano.

## 4. Subconsultas

\`\`\`sql
-- Empleados que cobran más que la media de su departamento
SELECT e.nombre
FROM EMPLEADOS e
WHERE e.salario > (SELECT AVG(salario)
                   FROM EMPLEADOS
                   WHERE departamento = e.departamento);
\`\`\`

\`IN\`, \`EXISTS\`, \`ANY\` y \`ALL\` comparan con conjuntos de filas; \`EXISTS\` solo comprueba si la subconsulta devuelve alguna fila.
`,
  },
  {
    topic: "IV.7",
    block: "IV",
    summary: "Capas OSI y TCP/IP, cálculo de subredes IPv4 (red, difusión y hosts) y lo esencial de IPv6.",
    key_points: [
      "OSI tiene 7 capas; TCP/IP las agrupa en 4: acceso a la red, Internet, transporte y aplicación.",
      "Hosts útiles de una subred IPv4: 2^(32 − prefijo) − 2.",
      "La dirección de red es la primera del bloque y la de difusión, la última.",
      "Rangos privados (RFC 1918): 10.0.0.0/8, 172.16.0.0/12 y 192.168.0.0/16.",
      "IPv6 usa 128 bits y no tiene difusión: usa multidifusión.",
    ],
    updated: "2026-10-11",
    sources: [
      { title: "RFC 791 · Internet Protocol (IPv4)", url: "https://www.rfc-editor.org/rfc/rfc791" },
      { title: "RFC 1918 · Direcciones privadas", url: "https://www.rfc-editor.org/rfc/rfc1918" },
      { title: "RFC 8200 · IPv6", url: "https://www.rfc-editor.org/rfc/rfc8200" },
    ],
    content: `## 1. Modelos de referencia

| Nivel OSI | Nombre | Ejemplos | Capa TCP/IP |
|---:|---|---|---|
| 7 | Aplicación | HTTP, DNS, SMTP | Aplicación |
| 6 | Presentación | Codificación y cifrado | Aplicación |
| 5 | Sesión | Control del diálogo | Aplicación |
| 4 | Transporte | TCP, UDP | Transporte |
| 3 | Red | IP, ICMP | Internet |
| 2 | Enlace de datos | Ethernet, 802.11 | Acceso a la red |
| 1 | Física | Cable, fibra, radio | Acceso a la red |

> El **router** trabaja en el nivel 3 y separa dominios de difusión; el **switch** trabaja en el nivel 2 y separa dominios de colisión.

## 2. Subredes IPv4 paso a paso

Para \`192.168.10.130/26\`:

1. Bits de host: 32 − 26 = 6, así que los bloques son de 2⁶ = **64** direcciones.
2. Los bloques empiezan en .0, .64, .128 y .192: la dirección cae en el bloque **.128**.
3. Red **192.168.10.128**, difusión **192.168.10.191** y hosts de .129 a .190 (**62** útiles).

| Prefijo | Máscara | Direcciones | Hosts útiles |
|---|---|---:|---:|
| /24 | 255.255.255.0 | 256 | 254 |
| /25 | 255.255.255.128 | 128 | 126 |
| /26 | 255.255.255.192 | 64 | 62 |
| /27 | 255.255.255.224 | 32 | 30 |
| /28 | 255.255.255.240 | 16 | 14 |
| /30 | 255.255.255.252 | 4 | 2 |

\`\`\`bash
# Ver direcciones y rutas en Linux
ip addr show
ip route
\`\`\`

## 3. IPv6 en lo esencial

- 128 bits en 8 grupos de 16 bits en hexadecimal: \`2001:0db8:0000:0000:0000:ff00:0042:8329\` se abrevia como \`2001:db8::ff00:42:8329\` (se omiten los ceros a la izquierda y una única secuencia de grupos a cero se sustituye por \`::\`).
- Tipos: unidifusión (global \`2000::/3\` y de enlace local \`fe80::/10\`), multidifusión (\`ff00::/8\`) y anycast. **No existe la difusión.**
- Con la autoconfiguración sin estado (SLAAC) un equipo puede configurarse sin servidor DHCP, y el descubrimiento de vecinos (NDP, sobre ICMPv6) sustituye a ARP.
`,
  },
];
