# III.8 · Accesibilidad, diseño universal y usabilidad; seguridad en el puesto de usuario y en el desarrollo

Este tema reúne dos mundos que el programa coloca juntos: por un lado, la **accesibilidad**, el **diseño universal** y la **usabilidad** de los productos y servicios digitales (con su normativa: RD 1112/2018, WCAG, EN 301 549, Ley 11/2023); por otro, la **seguridad**: la **confidencialidad y disponibilidad de la información en los puestos de usuario** y los **conceptos de seguridad en el desarrollo** (ciclo de vida seguro, OWASP, SAST/DAST, XSS, CSRF, cabeceras y *cookies* seguras). En el examen aparece en el cuestionario y, cada vez más, en el supuesto del bloque III (atributos ARIA, encabezados, herramientas de validación, cabeceras HTTP de seguridad). La seguridad de redes y de los sistemas en general se estudia en IV.5 y IV.9; el ENS, en I.8.

## Accesibilidad

### Concepto

La **accesibilidad** es la condición que deben cumplir los entornos, productos y servicios para ser **comprensibles, utilizables y practicables por todas las personas** en condiciones de seguridad y comodidad y de la forma más autónoma posible. El **RD 1112/2018** la define, para la web, como «el conjunto de principios y técnicas que se deben respetar al diseñar, construir, mantener y actualizar los sitios web y las aplicaciones para dispositivos móviles para garantizar la igualdad y la no discriminación en el acceso de las personas usuarias, en particular de las personas con discapacidad y de las personas mayores».

Beneficia a personas con discapacidad **visual** (ceguera, baja visión, daltonismo), **auditiva**, **motriz**, **cognitiva** o del aprendizaje, a las **personas mayores** y a cualquiera en situaciones limitantes (pantalla al sol, sin altavoces, una sola mano, conexión lenta). Los usuarios emplean **productos de apoyo** o tecnologías de asistencia: **lectores de pantalla** (JAWS, NVDA, VoiceOver, TalkBack), magnificadores, líneas braille, reconocimiento de voz, teclados alternativos o conmutadores.

### Las pautas WCAG del W3C

Las **WCAG** (*Web Content Accessibility Guidelines*) son las **pautas de accesibilidad para el contenido web** de la **Iniciativa de Accesibilidad Web (WAI)** del **W3C** (pregunta de 2023).

| Versión | Año | Notas |
|---|---|---|
| WCAG 1.0 | 1999 | 14 pautas y puntos de verificación con prioridades 1, 2 y 3 |
| **WCAG 2.0** | 2008 | Cuatro principios; norma **ISO/IEC 40500:2012** |
| **WCAG 2.1** | 2018 | Añade 17 criterios (móviles, baja visión, cognitiva); la referencia de la **EN 301 549 V3.2.1** |
| **WCAG 2.2** | **5 de octubre de 2023** | Añade 9 criterios y elimina el 4.1.1 (Procesamiento); aprobada como **ISO/IEC 40500:2025** (octubre de 2025) |
| WCAG 3.0 | En desarrollo (borradores) | Nuevo modelo de evaluación; aún no es recomendación |

**Los cuatro principios (POUR)**, que el RD 1112/2018 define en su artículo 4:

| Principio | Definición del RD 1112/2018 | Pautas WCAG 2.2 |
|---|---|---|
| **Perceptible** (perceptibilidad) | La información y los componentes de la interfaz se presentan de modo que las personas puedan **percibirlos** | 1.1 **Alternativas textuales**; 1.2 **Medios tempodependientes** (subtítulos, audiodescripción); 1.3 **Adaptable** (presentar el contenido de otras formas sin perder información ni estructura); 1.4 **Distinguible** (facilitar **ver y oír** el contenido, incluida la **separación entre primer plano y fondo**: contraste, tamaño del texto, audio) |
| **Operable** (operabilidad) | Los **componentes y la navegación** de la interfaz **se pueden utilizar** por cualquier persona (pregunta de 2023) | 2.1 **Accesible por teclado**; 2.2 **Tiempo suficiente**; 2.3 **Convulsiones y reacciones físicas** (no más de tres destellos por segundo); 2.4 **Navegable**; 2.5 **Modalidades de entrada** (gestos, puntero, tamaño de los objetivos) |
| **Comprensible** (comprensibilidad) | La **información y el funcionamiento** de la interfaz son **comprensibles** | 3.1 **Legible** (idioma); 3.2 **Predecible** (pregunta de 2021); 3.3 **Ayuda a la entrada de datos** (errores, etiquetas) |
| **Robusto** (robustez) | El contenido puede ser **interpretado de forma fiable** por gran variedad de agentes de usuario, **incluidas las tecnologías de asistencia** | 4.1 **Compatible** (nombre, función y valor; mensajes de estado) |

- **Niveles de conformidad**: **A** (mínimo), **AA** (el exigido por la normativa europea y española) y **AAA** (máximo, no exigible de forma general). Cada pauta tiene **criterios de conformidad** comprobables (WCAG 2.2 tiene 86).
- **Novedades de WCAG 2.2**: foco no oculto (2.4.11, AA, y 2.4.12, AAA), apariencia del foco (2.4.13, AAA), movimientos de arrastre (2.5.7, AA), **tamaño del objetivo mínimo** de 24 × 24 píxeles CSS (2.5.8, AA), ayuda consistente (3.2.6, A), entrada redundante (3.3.7, A) y **autenticación accesible** sin pruebas cognitivas (3.3.8, AA, y 3.3.9, AAA).
- Criterios muy preguntados: **texto alternativo** en imágenes (1.1.1), **subtítulos** (1.2.2), **contraste** mínimo **4,5:1** para texto normal y **3:1** para texto grande (1.4.3, AA), redimensionar el texto al **200 %** (1.4.4), *reflow* a 320 píxeles (1.4.10), todo operable **por teclado** sin trampas (2.1.1 y 2.1.2), **saltar bloques** (2.4.1), títulos de página (2.4.2), **orden del foco** (2.4.3), **foco visible** (2.4.7), **idioma de la página** (3.1.1), **etiquetas** en los campos (3.3.2) y **nombre, función y valor** de los componentes (4.1.2).

### Otras pautas y especificaciones de la WAI

| Especificación | Para qué |
|---|---|
| **ATAG** 2.0 (*Authoring Tool Accessibility Guidelines*, 2015) | Requisitos que deben cumplir las **herramientas de autor** (editores, gestores de contenidos) para **ser accesibles y generar contenidos accesibles** (pregunta de 2024) |
| **UAAG** 2.0 (*User Agent Accessibility Guidelines*) | Cómo hacer accesibles los **agentes de usuario**: navegadores y reproductores |
| **WAI-ARIA** 1.2 (2023) | Atributos para dar **semántica accesible** a componentes dinámicos que HTML no expresa (*Accessible Rich Internet Applications*) |
| EARL | Lenguaje para expresar resultados de evaluación |

**WAI-ARIA** añade a los elementos **roles** (`role="dialog"`, `role="navigation"`, `role="tab"`…), **estados** y **propiedades** (`aria-*`) que leen las tecnologías de asistencia. Primera regla de ARIA: **si existe un elemento HTML nativo con la semántica necesaria, úsalo** (un `<button>` mejor que un `<div role="button">`).

| Atributo | Uso |
|---|---|
| **`aria-live`** (`polite` o `assertive`) | Marca una **región que se actualiza** dinámicamente para que el lector de pantalla anuncie los cambios (supuesto de 2024) |
| **`aria-expanded`** (`true`/`false`) | Indica si un menú desplegable, acordeón o árbol está **desplegado** (supuesto de 2026) |
| `aria-label`, `aria-labelledby` | Nombre accesible del elemento |
| `aria-describedby` | Descripción adicional (instrucciones, errores) |
| `aria-hidden="true"` | Oculta un elemento decorativo a las tecnologías de asistencia |
| `aria-checked`, `aria-selected`, `aria-pressed`, `aria-current` | Estados de casillas, opciones, botones conmutables y elemento actual |
| `aria-valuenow`, `aria-valuemin`, `aria-valuemax` | Valor de un deslizador o barra de progreso |
| `aria-required`, `aria-invalid` | Campos obligatorios o con error |
| `aria-controls`, `aria-flowto` | Relación con el elemento controlado; orden de lectura alternativo |

**Buenas prácticas de HTML accesible** (supuestos de 2026):

```html
<html lang="es">
<header>…</header>
<nav aria-label="Menú principal">…</nav>
<main>                                   <!-- estructura con elementos semánticos HTML5 -->
  <h1>Gestión de usuarios</h1>
  <section>
    <h2>Seleccione un usuario</h2>       <!-- sin saltar de h1 a h3 -->
    <img src="grafico.png" alt="Solicitudes por mes: crecen de 120 en enero a 340 en junio">
    <label for="dni">DNI</label>
    <input id="dni" name="dni" required aria-describedby="ayuda-dni">
    <p id="ayuda-dni">Ocho números y una letra.</p>
    <button aria-expanded="false" aria-controls="menu-acciones">Acciones</button>
    <ul id="menu-acciones" hidden>…</ul>
    <div aria-live="polite" id="estado"></div>
  </section>
</main>
```

- Estructurar con **elementos semánticos** (`<header>`, `<nav>`, `<main>`, `<section>`, `<footer>`), no con tablas de maquetación ni solo con `<div>` y CSS.
- **Jerarquía de encabezados** sin saltos (de `<h1>` a `<h3>` sin `<h2>` es un error de accesibilidad).
- Texto alternativo significativo (vacío, `alt=""`, si la imagen es decorativa); `<label>` asociado a cada campo; idioma del documento (`lang`); tablas de datos con `<th>` y `scope`; enlaces con texto descriptivo (no «pinche aquí»); no transmitir información **solo con el color**; contraste suficiente; foco visible y orden lógico; no bloquear el zum; subtítulos y transcripciones.

### Evaluación de la accesibilidad

- **Revisión automática** (detecta solo una parte de los problemas) más **revisión manual experta** (el RD 1112/2018 exige ambas) y, cuando sea posible, **pruebas con usuarios**.
- Herramientas automáticas: **QualWeb** (evaluador automático de las WCAG; supuesto de 2024), WAVE (WebAIM), axe (Deque), Lighthouse (Chrome), Pa11y, el analizador del **Observatorio de Accesibilidad Web** (OAW) de la Administración, TAW y HERA (históricas). Para documentos PDF: PAC (PDF Accessibility Checker). Comprobación de contraste: Colour Contrast Analyser.
- Pruebas manuales: navegar **solo con teclado**, con **lector de pantalla** (NVDA, JAWS, VoiceOver), con zum al 200-400 % y en modo de alto contraste.
- Metodología europea de seguimiento: revisiones **simplificadas** (muestras amplias, automáticas) y **en profundidad** (todos los requisitos).

### Normativa de accesibilidad

**Marco general**:

- **Convención de la ONU sobre los derechos de las personas con discapacidad** (2006; en vigor para España desde 2008): accesibilidad (art. 9) y diseño universal.
- **Real Decreto Legislativo 1/2013**, Ley General de derechos de las personas con discapacidad y de su inclusión social: define **accesibilidad universal**, **diseño universal o diseño para todas las personas** y **ajustes razonables**; obliga a la accesibilidad de las tecnologías y servicios de la sociedad de la información.
- **RD 1494/2007**: condiciones básicas de accesibilidad a las tecnologías, productos y servicios de la sociedad de la información y medios de comunicación social (sus arts. 5, 6 y 7 fueron derogados por el RD 1112/2018).
- **Ley 56/2007**, de medidas de impulso de la sociedad de la información: accesibilidad de las páginas de empresas que prestan servicios de especial trascendencia económica.
- **RD 193/2023**: condiciones básicas de accesibilidad y no discriminación en el acceso y uso de los bienes y servicios a disposición del público.

**Directiva (UE) 2016/2102** sobre la accesibilidad de los sitios web y aplicaciones móviles de los **organismos del sector público**, transpuesta por el **Real Decreto 1112/2018, de 7 de septiembre** (BOE de 19 de septiembre; en vigor el **20 de septiembre de 2018**). La Directiva define el **diseño universal** de modo que todas las personas puedan usar los productos en la mayor medida posible **sin adaptación ni diseño especializado**, **sin excluir los productos de apoyo** cuando se necesiten (pregunta de 2026). Puntos clave del RD:

| Artículo | Contenido |
|---|---|
| 2 | **Ámbito subjetivo**: todo el **sector público** (AGE, comunidades autónomas, entidades locales, sector público institucional, asociaciones) y la Administración de Justicia. Por disposición adicional, también webs con **financiación pública**, de **concesionarios de servicios públicos** y de centros educativos sostenidos con fondos públicos |
| 3.2 | **Contenido accesible**: información **textual y no textual**, **documentos y formularios descargables**, **multimedia pregrabado**, **interacción bidireccional**, tratamiento de formularios y **procesos de identificación, autenticación, firma y pago** (pregunta de 2026) |
| 3.3 y 3.4 | **Excluidos**: contenidos de los **prestadores del servicio público de radiodifusión**; ficheros ofimáticos y multimedia pregrabado publicados antes de su entrada en vigor; **multimedia en directo**; mapas (si la información esencial es accesible); **contenidos de terceros** no controlados; reproducciones de patrimonio; extranets e intranets anteriores al 23-9-2019 (hasta su revisión sustancial); archivos |
| 4 | Definiciones de los principios: **perceptibilidad, operabilidad, comprensibilidad y robustez** |
| 5 y 6 | Requisitos (contenidos perceptibles, operables, comprensibles y robustos) y **presunción de conformidad** si se cumple la **norma armonizada EN 301 549** |
| 7 | **Carga desproporcionada**: excepción motivada y limitada, evaluada por escrito y revisada **al menos una vez al año**; no la justifican la falta de prioridad, tiempo o conocimientos |
| 10 a 14 | **Mecanismo de comunicación** (sugerencias y quejas por medios electrónicos y además teléfono u oficina). **Solicitudes de información accesible y quejas**: respuesta en **20 días hábiles** (preguntas de 2021 y 2024). **Reclamación** ante la Unidad responsable: respuesta en **dos meses** (silencio desestimatorio); después, recursos administrativos |
| 15 | **Declaración de accesibilidad**: en formato accesible, enlazada desde **todas las páginas** con el enlace «Accesibilidad» y actualizada **al menos una vez al año** |
| 16 | **Unidad responsable de accesibilidad** en cada entidad (en la AGE, en el ámbito de cada **Subsecretaría**) |
| 17 | **Revisiones** de accesibilidad en diseño, antes de la puesta en funcionamiento y periódicas, **automáticas y manuales**. La **primera revisión**: **sitios web**, antes de **dos años**; **aplicaciones móviles**, antes de **tres años** desde la entrada en vigor (en 2021 se preguntó por la afirmación falsa de los «dos años» para las apps) |
| 18 a 20 | **Seguimiento e informes** a la Comisión Europea (primero el 23-12-2021 y luego **cada tres años**) por el ministerio competente en función pública y administración digital (hoy la Secretaría General de Administración Digital, con el **Observatorio de Accesibilidad Web**); **Red de Contactos de Accesibilidad Digital** |
| Disposición final 5.ª | Escalonamiento: sitios web nuevos, al año; publicados antes, a los dos años; **aplicaciones móviles, desde el 23 de junio de 2021** |

La STC 100/2019 declaró que varios apartados (procedimiento de quejas y reclamaciones, entre otros) no son legislación básica, por lo que las comunidades autónomas pueden regularlos.

**Norma armonizada EN 301 549** (ETSI, CEN y Cenelec; en España, **UNE-EN 301 549**): requisitos de accesibilidad de **productos y servicios TIC** (web, documentos, *software*, móviles, *hardware*, comunicaciones bidireccionales, documentación y soporte). La **V3.2.1 (2021)** incorpora las **WCAG 2.1 nivel AA** y es la que da hoy la presunción de conformidad; la **V4.1.1**, publicada en agosto-septiembre de **2026**, pasa a las **WCAG 2.2 A y AA** y se adapta a la Ley Europea de Accesibilidad, pero solo surtirá efecto de norma armonizada cuando se cite en el *Diario Oficial de la UE* (previsto para diciembre de 2026).

**Ley Europea de Accesibilidad** (*European Accessibility Act*, **Directiva (UE) 2019/882**), transpuesta por la **Ley 11/2023, de 8 de mayo**: requisitos de accesibilidad para **productos y servicios del sector privado** —ordenadores y sistemas operativos, terminales de pago, cajeros y máquinas de autoservicio, lectores electrónicos, *smartphones*, servicios de comunicaciones electrónicas, acceso a servicios audiovisuales, transporte, **banca para consumidores**, **comercio electrónico** y libros electrónicos— exigibles desde el **28 de junio de 2025**, con periodos transitorios para productos y contratos anteriores.

**Contratación pública**: la Ley 9/2017 obliga a incluir criterios de accesibilidad universal y diseño para todos en las prescripciones técnicas, y la EN 301 549 es la referencia para la compra de TIC accesibles.

## Diseño universal

El **diseño universal** o **diseño para todas las personas** es la actividad por la que se conciben o proyectan desde el origen entornos, procesos, bienes, productos, servicios, objetos, instrumentos, programas, dispositivos o herramientas de forma que puedan ser **utilizados por todas las personas, en la mayor extensión posible, sin necesidad de adaptación ni diseño especializado**, sin excluir los **productos de apoyo** para grupos concretos cuando los necesiten (RDL 1/2013, art. 2). Se diferencia de los **ajustes razonables**, que son adaptaciones para un caso particular cuando el diseño universal no basta.

**Los siete principios** (Ron Mace y el *Center for Universal Design*, Universidad Estatal de Carolina del Norte, 1997):

1. **Uso equitativo**: útil para personas con capacidades diversas.
2. **Uso flexible**: se adapta a preferencias y capacidades individuales.
3. **Uso simple e intuitivo**: fácil de entender sin experiencia ni conocimientos previos.
4. **Información perceptible**: comunica la información necesaria con eficacia, sean cuales sean las condiciones o capacidades sensoriales.
5. **Tolerancia al error**: minimiza los riesgos y las consecuencias de acciones involuntarias.
6. **Bajo esfuerzo físico**: se usa eficazmente y con un mínimo de fatiga.
7. **Tamaño y espacio para el acceso y el uso**.

> En 2024 se anuló la pregunta sobre los principios del diseño universal porque ninguna opción era correcta («seguridad», «información operable», «robustez», «alto esfuerzo físico»): la robustez es de las WCAG y el principio es el **bajo** esfuerzo físico.

## Usabilidad

### Concepto

La **usabilidad** es, según **ISO 9241-11:2018**, el «grado en que un producto, sistema o servicio puede ser utilizado por usuarios específicos para alcanzar objetivos específicos con **eficacia**, **eficiencia** y **satisfacción** en un **contexto de uso** especificado».

- **Eficacia**: exactitud y compleción con que se logran los objetivos.
- **Eficiencia**: recursos (tiempo, esfuerzo) empleados.
- **Satisfacción**: comodidad y actitud positiva del usuario.

Jakob Nielsen la descompone en cinco atributos: **facilidad de aprendizaje**, **eficiencia**, **facilidad de recuerdo** (memorabilidad), **pocos errores** (y recuperables) y **satisfacción**.

**UI y UX** (pregunta de 2021): **UI** (*User Interface*) es la **interfaz de usuario**, lo que se ve y con lo que se interactúa; **UX** (*User eXperience*) es la **experiencia de usuario** completa: percepciones y respuestas antes, durante y después del uso (ISO 9241-210). Accesibilidad, usabilidad y UX se solapan: un sitio puede cumplir WCAG y ser poco usable.

En el modelo de calidad del producto **ISO/IEC 25010**, la revisión de **2023** sustituyó la característica «usabilidad» por **capacidad de interacción** (con subcaracterísticas como reconocimiento de la adecuación, aprendizaje, operabilidad, protección frente a errores, compromiso del usuario, **inclusividad**, asistencia al usuario y autodescriptividad) y añadió la característica **seguridad física** (*safety*); el modelo tiene nueve características.

### Los 10 principios heurísticos de Jakob Nielsen

Son **10** (pregunta de 2023), publicados en 1994 y actualizados en 2020:

1. **Visibilidad del estado del sistema**: informar de lo que ocurre con realimentación a tiempo.
2. **Correspondencia entre el sistema y el mundo real**: lenguaje y convenciones del usuario.
3. **Control y libertad del usuario**: salidas de emergencia, deshacer y rehacer.
4. **Consistencia y estándares**.
5. **Prevención de errores**.
6. **Reconocimiento antes que recuerdo**: minimizar la carga de memoria (es falso «reconocimiento **después** que recuerdo», distractor de 2024).
7. **Flexibilidad y eficiencia de uso**: atajos para usuarios expertos.
8. **Diseño estético y minimalista**.
9. **Ayudar a reconocer, diagnosticar y recuperarse de los errores**.
10. **Ayuda y documentación**.

Otras referencias: las **ocho reglas de oro** de Ben Shneiderman y *No me hagas pensar* (Steve Krug).

### Métodos de diseño y evaluación

| Método | En qué consiste |
|---|---|
| **Diseño centrado en el usuario** (ISO 9241-210) | Ciclo iterativo: entender el contexto de uso, especificar requisitos, diseñar soluciones y **evaluar con usuarios** |
| **Evaluación heurística** | Varios expertos (3-5) revisan la interfaz frente a los principios de Nielsen |
| **Pruebas con usuarios** | Usuarios reales realizan tareas mientras se observa (con 5 usuarios aparece la mayoría de los problemas, según Nielsen); pensamiento en voz alta |
| Recorrido cognitivo | Se simula paso a paso cómo un usuario nuevo realizaría una tarea |
| *Card sorting* | Los usuarios agrupan contenidos para diseñar la **arquitectura de la información** |
| Pruebas A/B | Comparar dos versiones con usuarios reales y métricas |
| Cuestionarios | **SUS** (*System Usability Scale*, 10 preguntas) |
| Seguimiento ocular, analítica web, mapas de calor | Dónde miran y pulsan los usuarios |
| Prototipos | *Wireframes* (esquemas), *mockups* y prototipos navegables (Figma) |
| *Personas* y mapas de viaje | Arquetipos de usuario y recorrido completo por el servicio |

En la Administración, la usabilidad y la experiencia de usuario se apoyan en guías comunes de diseño y comunicación digital, en la identidad visual corporativa y en componentes compartidos, y la **Carta de Derechos Digitales** (2021) incluye la accesibilidad universal en el entorno digital y los derechos digitales en las relaciones con las Administraciones.

## Acceso y usabilidad de las tecnologías, productos y servicios de la sociedad de la información

La accesibilidad no se limita a la web: alcanza a **todo producto y servicio TIC**. La EN 301 549 cubre *hardware* (teclas, pantallas táctiles, terminales de autoservicio), *software* (aplicaciones de escritorio y móviles, documentos electrónicos), **comunicaciones bidireccionales de voz y vídeo** (texto en tiempo real, compatibilidad con audífonos) y la **documentación y servicios de soporte**. La normativa española exige accesibilidad en:

- Sitios web y apps del **sector público** (RD 1112/2018) y de los que reciben fondos públicos o gestionan servicios públicos.
- **Productos y servicios privados** del ámbito de la Ley 11/2023 (desde junio de 2025).
- **Servicios de confianza** (firma electrónica): el RD 1112/2018 modificó el art. 9 del RD 1494/2007 para exigir que los servicios y productos de confianza sean accesibles.
- **Medios audiovisuales** (subtitulado, audiodescripción y lengua de signos según la Ley General de Comunicación Audiovisual) y lenguas de signos (Ley 27/2007).
- Documentos electrónicos: PDF etiquetado (PDF/UA, ISO 14289), ofimática con estilos y texto alternativo.

## Confidencialidad y disponibilidad de la información en los puestos de usuario final

El **puesto de usuario** (PC, portátil, móvil) es el eslabón más expuesto: almacena información, accede a los sistemas corporativos y lo maneja una persona que puede equivocarse o ser engañada. Las dimensiones de seguridad son las del ENS: **confidencialidad**, **integridad**, **disponibilidad**, **autenticidad** y **trazabilidad**.

### Confidencialidad

| Medida | Detalle |
|---|---|
| **Puesto de trabajo despejado** (ENS mp.eq.1) | Mesas limpias: sin papeles ni soportes que no se estén usando; guardarlos bajo llave |
| **Bloqueo del puesto** (ENS mp.eq.2) | Bloqueo automático tras un tiempo de inactividad que exige volver a autenticarse (y, en nivel alto, cierre de las sesiones abiertas); bloquear manualmente al levantarse (`Windows + L`) |
| **Protección de portátiles** (ENS mp.eq.3) | Inventario y responsable de cada dispositivo, procedimiento ante pérdida o robo, mínimo acceso remoto y **cifrado del disco** (BitLocker, FileVault, LUKS) |
| **Control de acceso y autenticación** (ENS op.acc) | Cuentas personales, **mínimo privilegio** (sin permisos de administrador), contraseñas robustas y **autenticación multifactor** |
| **Soportes extraíbles** (ENS mp.si) | Etiquetado, **cifrado** de USB y discos, custodia, transporte seguro y **borrado seguro o destrucción** antes de reutilizar o desechar |
| Prevención de fugas | DLP (prevención de pérdida de datos), control de dispositivos USB, cifrado del correo y de ficheros, clasificación de la información, filtros de privacidad en pantalla |
| Antimalware | Antivirus y **EDR** en el puesto (en la AGE, las soluciones del CCN-CERT como **CLAUDIA** y microCLAUDIA) y actualizaciones al día |
| Teletrabajo y movilidad | **VPN**, escritorios virtuales, gestión de dispositivos móviles (**MDM**), no usar redes Wi-Fi públicas sin protección |
| Concienciación | Formación frente a *phishing* e ingeniería social |

**Autenticación multifactor (MFA)**: combina factores de **tipos distintos**: **algo que sabes** (contraseña, PIN), **algo que tienes** (*token*, móvil con OTP, tarjeta) y **algo que eres** (biometría). Dos factores biométricos (iris + huella) son del **mismo tipo**, por lo que **no** constituyen MFA según el CCN-CERT (pregunta de 2026); contraseña + OTP o tarjeta + reconocimiento facial, sí. El ENS exige un **segundo factor** a partir de determinados niveles (op.acc.6).

### Disponibilidad

- **Copias de seguridad** de la información de los usuarios: carpetas redirigidas o sincronizadas con el servidor o la nube corporativa, regla **3-2-1** (tema IV.2) y pruebas periódicas de restauración (ENS mp.info.6).
- Guardar la información en **unidades de red** o repositorios corporativos y no solo en el disco local.
- **Protección eléctrica** (SAI) y equipos de repuesto (maquetas o imágenes para reinstalar rápidamente).
- **Protección frente a *ransomware*** (*ransomware* cifra los datos y pide rescate): EDR, copias desconectadas o inmutables, mínimo privilegio y parches.
- **Gestión de actualizaciones** y de incidencias (centro de atención a usuarios), y soporte o control remoto de los puestos (tema IV.5).
- Alta disponibilidad de servicios: escritorios virtuales (VDI) y perfiles móviles que permiten trabajar desde otro puesto.

## Conceptos de seguridad en el desarrollo de los sistemas

### Seguridad en el ciclo de vida

La seguridad debe integrarse **desde el inicio** y en **todas las fases** del ciclo de vida (**S-SDLC**, *Secure Software Development Life Cycle*; «desplazar a la izquierda», *shift left*; **DevSecOps** cuando se automatiza en la integración y entrega continuas). Principios de la normativa: **seguridad desde el diseño y por defecto** (ENS y RGPD art. 25, **protección de datos desde el diseño y por defecto**).

| Fase | Actividades de seguridad |
|---|---|
| Requisitos | Requisitos de seguridad y privacidad (OWASP **ASVS**), análisis de riesgos, categorización ENS, evaluación de impacto (EIPD) |
| Diseño | **Modelado de amenazas** (**STRIDE**: suplantación, manipulación, repudio, revelación de información, denegación de servicio y elevación de privilegios), arquitectura segura, mínimo privilegio, defensa en profundidad |
| Implementación | **Programación segura**, revisión de código, análisis estático (**SAST**), análisis de dependencias (**SCA**), gestión de secretos |
| Pruebas | Análisis dinámico (**DAST**), **IAST**, *fuzzing*, **pruebas de penetración** |
| Despliegue | Configuración segura (bastionado), entornos separados, firma del código, cabeceras de seguridad |
| Operación | Parches, monitorización, registro de eventos, gestión de vulnerabilidades y de incidentes |

Marcos de referencia: **Microsoft SDL**, **OWASP SAMM** (modelo de madurez), BSIMM, **NIST SSDF** (SP 800-218) y las guías CCN-STIC.

**El ENS para el desarrollo** (RD 311/2022, anexo II):

- **mp.sw.1 Desarrollo de aplicaciones**: el desarrollo se hace en un **sistema separado del de producción** (sin herramientas ni datos de desarrollo en producción ni datos de producción en desarrollo); refuerzos de **mínimo privilegio**, **metodología de desarrollo seguro** (seguridad en todo el ciclo, programación segura, tratamiento de los datos de prueba e inspección del código), **seguridad desde el diseño** (identificación y autenticación, protección de la información y pistas de auditoría), **pruebas preferiblemente sin datos reales** y **lista de componentes software** de terceros (base del SBOM).
- **mp.sw.2 Aceptación y puesta en servicio**: antes de pasar a producción se comprueban los **criterios de aceptación de seguridad** y que no se deteriora la seguridad de otros componentes; pruebas en un **entorno aislado de preproducción** y, como refuerzo, **auditoría del código fuente**.

### Pruebas de seguridad de aplicaciones

| Técnica | Qué hace | Cuándo |
|---|---|---|
| **SAST** (*Static Application Security Testing*) | **Análisis estático del código fuente** (caja blanca) **sin ejecutarlo**, para encontrar vulnerabilidades **antes de producción** (pregunta de 2024) | Desarrollo e integración continua |
| **DAST** (*Dynamic Application Security Testing*) | Ataca la **aplicación en ejecución** desde fuera (caja negra): OWASP ZAP, Burp Suite | Pruebas y preproducción |
| **IAST** (*Interactive*) | Agentes dentro de la aplicación que observan su ejecución durante las pruebas | Pruebas |
| **SCA** (*Software Composition Analysis*) | Detecta **componentes de terceros vulnerables** o con licencias problemáticas; genera el **SBOM** (lista de materiales del *software*) | Continuo |
| RASP | Protección en tiempo de ejecución desde dentro de la aplicación | Producción |
| *Fuzzing* | Entradas aleatorias o malformadas para provocar fallos | Pruebas |
| Prueba de penetración | Ataque controlado por expertos | Antes de la puesta en servicio y periódicamente |

«S-SDLC» no significa *Secure Software Development Liability Control* (distractor de 2023). Herramientas: **SonarQube** (calidad y seguridad del código), Semgrep, OWASP Dependency-Check, Snyk, Trivy, OWASP ZAP, Burp Suite.

### OWASP

**OWASP** (*Open Worldwide Application Security Project*) es una fundación abierta que publica estándares y guías de seguridad de aplicaciones: el **Top 10**, **ASVS** (requisitos de verificación), la Guía de Pruebas (WSTG), **SAMM**, las *Cheat Sheets* y herramientas como ZAP y Dependency-Check.

**OWASP Top 10:2025** (publicado en noviembre de 2025; sustituye al de 2021):

| Puesto | Categoría | Ejemplos |
|---|---|---|
| A01 | **Control de acceso roto** (*Broken Access Control*) | Acceso a datos de otro usuario cambiando un identificador (IDOR), escalada de privilegios; ahora incluye **SSRF** |
| A02 | **Configuración de seguridad incorrecta** | Valores por defecto, mensajes de error detallados, servicios innecesarios |
| A03 | **Fallos en la cadena de suministro del software** (nueva, amplía «componentes vulnerables y obsoletos») | Dependencias vulnerables o maliciosas, sistemas de construcción comprometidos |
| A04 | **Fallos criptográficos** | Datos sensibles sin cifrar, algoritmos débiles, contraseñas sin *hash* adecuado |
| A05 | **Inyección** | **SQL**, comandos del sistema, LDAP y **XSS** |
| A06 | **Diseño inseguro** | Falta de modelado de amenazas y controles de diseño |
| A07 | **Fallos de autenticación** | Fuerza bruta, credenciales por defecto, sesiones mal gestionadas |
| A08 | **Fallos de integridad del software o de los datos** | Actualizaciones sin firma, deserialización insegura |
| A09 | **Fallos en el registro y la alerta de seguridad** | Ataques que no dejan rastro ni generan avisos |
| A10 | **Gestión incorrecta de condiciones excepcionales** (nueva) | Errores no controlados, fallos que dejan el sistema en estado inseguro |

Según OWASP, la **inyección** ocurre cuando **datos no confiables se envían a un intérprete como parte de un comando o consulta** (pregunta de 2021).

### Vulnerabilidades web más comunes y su prevención

| Ataque | Descripción | Prevención |
|---|---|---|
| **Inyección SQL** | El atacante introduce SQL en un campo (`100 OR 1=1`, `' OR '1'='1`) que se concatena en la consulta | **Consultas parametrizadas** (`PreparedStatement`), procedimientos seguros, **validación** de entradas y mínimo privilegio en la base de datos |
| **XSS** (*Cross-Site Scripting*) | Se inyecta *script* que se ejecuta en el navegador de otro usuario: **reflejado**, **almacenado** o **basado en DOM** | **Validar** las entradas y **escapar o codificar la salida según el contexto** (HTML, atributo, JavaScript, URL) antes de mostrarla (recomendación de OWASP; supuesto de 2026), `textContent` en lugar de `innerHTML`, **CSP**, *cookies* `HttpOnly` |
| **CSRF** (*Cross-Site Request Forgery*, falsificación de petición en sitios cruzados) | Fuerza al usuario a ejecutar **acciones no deseadas** en una aplicación en la que **está autenticado** (pregunta de 2023) | ***Tokens* anti-CSRF**, *cookies* **`SameSite`**, comprobar la cabecera `Origin`, reautenticación para operaciones críticas |
| SSRF | El servidor hace peticiones a destinos elegidos por el atacante (servicios internos) | Listas de destinos permitidos, segmentación de red |
| *Clickjacking* | La página se carga en un marco invisible para engañar los clics | `Content-Security-Policy: frame-ancestors` o `X-Frame-Options: DENY` |
| Recorrido de directorios | `../../etc/passwd` | Normalizar y validar rutas |
| Deserialización insegura y XXE | Objetos o entidades XML maliciosos | No deserializar datos no confiables; desactivar entidades externas |
| Rastreo MIME (*MIME sniffing*) | El navegador «adivina» el tipo de un fichero y ejecuta como *script* algo servido como texto | **`X-Content-Type-Options: nosniff`** (supuesto de 2026) |

**Principios de programación segura**:

- **Validar todas las entradas** en el servidor (listas de permitidos: tipo, longitud, formato, rango) y **no confiar nunca en el cliente**. La **validación y el saneamiento de las entradas** es la práctica que **previene directamente** la inyección SQL y el XSS (pregunta de 2026), junto con la codificación de la salida.
- **Codificar la salida** según el contexto y usar consultas parametrizadas.
- **Mínimo privilegio**, **defensa en profundidad**, **fallar de forma segura**, **valores seguros por defecto**, reducir la superficie de ataque, separación de funciones y no basar la seguridad en la oscuridad.
- **Gestión de errores** sin revelar información interna (trazas, versiones, consultas); **registro** de eventos de seguridad sin datos sensibles.
- **Contraseñas** almacenadas con funciones de *hash* lentas y con sal (**Argon2id**, bcrypt, scrypt, PBKDF2), nunca en claro ni con MD5 o SHA-1.
- **Criptografía** con algoritmos y parámetros autorizados por el CCN, TLS 1.2 como mínimo (recomendado 1.3) y gestión segura de claves y **secretos** (no en el código ni en el repositorio).
- **Gestión de dependencias** (actualizaciones, SCA, SBOM) y de la **sesión** (identificadores aleatorios, expiración, regenerar el identificador tras autenticarse).

### Cabeceras HTTP y *cookies* seguras

| Cabecera | Función |
|---|---|
| `Strict-Transport-Security` (**HSTS**) | Obliga al navegador a usar **siempre HTTPS** con ese dominio |
| `Content-Security-Policy` (**CSP**) | Lista de **orígenes permitidos** para *scripts*, estilos, imágenes y marcos; mitiga XSS e inyección de contenido |
| **`X-Content-Type-Options: nosniff`** | Impide el **rastreo MIME**: el navegador respeta el `Content-Type` declarado |
| `X-Frame-Options: DENY` o `SAMEORIGIN` | Impide cargar la página en marcos de otros sitios (*clickjacking*); hoy se prefiere `frame-ancestors` de CSP |
| `Referrer-Policy` | Controla qué URL de origen se envía |
| `Permissions-Policy` | Limita API del navegador (cámara, geolocalización) |
| `X-XSS-Protection` | Obsoleta: hoy se recomienda desactivarla (`0`) y usar CSP |
| **CORS** (`Access-Control-Allow-Origin`…) | El servidor indica **qué orígenes** pueden hacer **peticiones de origen cruzado** desde *scripts*; para aceptar solo las del *front-end* propio se configura CORS en el *back-end* (supuesto de 2024) |

| Atributo de `Set-Cookie` | Efecto |
|---|---|
| **`Secure`** | Solo se envía por **HTTPS** |
| **`HttpOnly`** | **No accesible desde JavaScript** (`document.cookie`): mitiga el robo de sesión por **XSS** (preguntas de 2023 y 2026) |
| **`SameSite`** (`Strict`, `Lax`, `None`) | El navegador solo envía la *cookie* en peticiones **originadas en el mismo sitio** (con `Lax`, también en navegación de nivel superior): mitiga **CSRF** (supuesto de 2023) |
| `Domain` y `Path` | Ámbito de la *cookie* |
| `Expires` / `Max-Age` | Caducidad (sin ellos es una *cookie* de sesión que se borra al cerrar el navegador) |
| Prefijos `__Host-` y `__Secure-` | Garantizan `Secure` y, en `__Host-`, ámbito restringido al propio host |

```http
Set-Cookie: __Host-sesion=7f3c9a…; Path=/; Secure; HttpOnly; SameSite=Strict
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'; frame-ancestors 'none'
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
```

```java
// Inyección SQL: MAL (concatenación) frente a BIEN (consulta parametrizada)
String malo = "SELECT * FROM opositor WHERE numero = " + entrada;   // entrada = "100 OR 1=1"
PreparedStatement ps = con.prepareStatement("SELECT * FROM opositor WHERE numero = ?");
ps.setLong(1, Long.parseLong(entrada));                              // validación + parámetro
```

## Normativa y estándares clave

| Norma o estándar | Qué regula | Puntos clave |
|---|---|---|
| **RD 1112/2018** (transpone la Directiva 2016/2102) | Accesibilidad de webs y apps del sector público | Principios POUR; EN 301 549; quejas en 20 días hábiles; reclamación en 2 meses; declaración anual; primera revisión: webs 2 años, apps 3 años; apps desde el 23-6-2021 |
| **Ley 11/2023** (transpone la Directiva 2019/882, Ley Europea de Accesibilidad) | Accesibilidad de productos y servicios privados | Exigible desde el 28-6-2025 |
| RDL 1/2013, RD 1494/2007, RD 193/2023, Ley 27/2007 | Derechos de las personas con discapacidad, sociedad de la información, bienes y servicios, lenguas de signos | Accesibilidad universal, diseño universal, ajustes razonables |
| **WCAG 2.2** (W3C, 2023) = **ISO/IEC 40500:2025** | Pautas de accesibilidad del contenido web | 4 principios, 13 pautas, niveles A, AA y AAA |
| **EN 301 549** (UNE-EN 301 549) | Requisitos de accesibilidad de productos y servicios TIC | V3.2.1 (WCAG 2.1 AA) armonizada; V4.1.1 (WCAG 2.2) publicada en 2026, pendiente de citarse en el DOUE |
| WAI-ARIA 1.2, ATAG 2.0, UAAG 2.0 | Componentes dinámicos, herramientas de autor, agentes de usuario | `aria-live`, `aria-expanded`… |
| ISO 9241-11:2018 e ISO 9241-210:2019 | Usabilidad y diseño centrado en el usuario | Eficacia, eficiencia y satisfacción |
| ISO/IEC 25010:2023 | Modelo de calidad del producto | «Capacidad de interacción» sustituye a «usabilidad» |
| **ENS** (RD 311/2022) | Seguridad de los sistemas de la Administración | mp.eq (puesto de trabajo), mp.si (soportes), op.acc (control de acceso), **mp.sw.1** y **mp.sw.2** (desarrollo y aceptación) |
| RGPD, art. 25 | Protección de datos desde el diseño y por defecto | — |
| **OWASP Top 10:2025**, ASVS, SAMM, WSTG | Seguridad de aplicaciones | Riesgos principales y verificación |
| NIST SP 800-218 (SSDF) y Microsoft SDL | Desarrollo seguro | Prácticas por fase |

## Lo que más cae en el examen

En los nueve exámenes analizados hay **40 preguntas** de este tema según nuestra clasificación: 26 de ingreso libre (3 en 2021, 7 en 2023, 6 en 2024, 5 en 2025 y 5 en el extraordinario) y 14 de promoción interna.

| Concepto | Preguntas | Exámenes |
|---|---|---|
| **Seguridad en el desarrollo**: SAST/DAST/SCA (qué no es), inyección según OWASP, SQL *injection*, XSS y su prevención, CSRF, validación de entradas, MFA, cabecera `nosniff`, CORS | 12 | LI 2021, 2023, 2024, 2025 y 2025‑ext; PI 2021, 2024 y 2025 |
| **Normativa de accesibilidad**: RD 1112/2018 (plazos de revisión, 20 días hábiles, contenido accesible del art. 3), Directiva 2016/2102 y diseño universal | 9 | LI 2021, 2023, 2024, 2025 y 2025‑ext; PI 2023 y 2025 |
| **Accesibilidad técnica**: WCAG (qué son, principios operable y comprensible, pauta distinguible), ATAG, ARIA (`aria-live`, `aria-expanded`), encabezados, HTML semántico, QualWeb | 11 | LI 2021, 2023, 2024, 2025 y 2025‑ext; PI 2021 y 2024 |
| ***Cookies*** **seguras**: `SameSite`, `HttpOnly` | 3 | LI 2023 y 2025‑ext; PI 2023 |
| **Usabilidad**: 10 principios de Nielsen, UI/UX, diseño universal (anulada) | 4 | LI 2024; PI 2021, 2023 y 2024 |
| Protocolo seguro de HTTP (anulada) | 1 | LI 2023 |

Patrón: plazos y contenido literal del **RD 1112/2018**, definiciones de los principios WCAG y de las pautas ATAG/UAAG, atributos ARIA en el supuesto, y terminología de seguridad web en inglés (CSRF, `SameSite`, `HttpOnly`, SAST).

## Trampas habituales

- **RD 1112/2018**: solicitudes de información accesible y quejas, **20 días hábiles** (no naturales ni 10); reclamación, **dos meses**; primera revisión de **webs a 2 años** y de **apps a 3 años**; apps obligadas desde el **23-6-2021**.
- El **contenido accesible** incluye documentos y formularios descargables, multimedia pregrabado y los procesos de **identificación, autenticación, firma y pago**; quedan **fuera** el multimedia en directo y los contenidos de los **prestadores públicos de radiodifusión**.
- **Diseño universal** no prohíbe los productos de apoyo: no los **excluye** cuando son necesarios.
- **Operable** = los componentes y la navegación se pueden usar; **perceptible** = se pueden percibir; **comprensible** = información y funcionamiento comprensibles; **robusto** = interpretable por los agentes de usuario y las tecnologías de asistencia.
- **Distinguible** (1.4) = facilitar ver y oír, separar primer plano y fondo; **adaptable** (1.3) = presentar de otras formas sin perder información; **predecible** pertenece a **comprensible**; **navegable**, a **operable**.
- **ATAG** = herramientas de **autor**; **UAAG** = **agentes de usuario**; **WCAG** = **contenido**; **WAI-ARIA** = aplicaciones dinámicas.
- **`aria-live`** anuncia actualizaciones; **`aria-expanded`**, el estado desplegado; `alt` es para imágenes y `tabindex="1"` no informa del estado (y los valores positivos de `tabindex` desaconsejan).
- **WCAG 2.2** es la versión vigente (2023) y es ISO/IEC 40500:2025; el nivel exigido es **AA**.
- **10** heurísticos de Nielsen; «reconocimiento **antes** que recuerdo».
- **SAST** = estático, sobre el código, sin ejecutar; **DAST** = dinámico, sobre la aplicación en ejecución; **SCA** = componentes de terceros.
- **CSRF** = *Cross-Site **Request** Forgery*; **XSS** = *Cross-Site Scripting*.
- **`HttpOnly`** impide el acceso desde JavaScript (no obliga a HTTPS: eso es **`Secure`**); **`SameSite`** limita el envío a peticiones del mismo sitio; `Domain` fija el ámbito.
- **Iris + huella** no es MFA (dos factores del mismo tipo).
- La prevención de inyecciones es **validar y sanear entradas** y **parametrizar/escapar**, no contraseñas complejas ni antivirus.
- **OWASP Top 10:2025** sustituye al de 2021: el XSS está dentro de **Inyección** (A05) y el SSRF dentro de **Control de acceso roto** (A01).

## Repaso rápido

- Accesibilidad: igualdad y no discriminación en el acceso, en particular de personas con discapacidad y mayores.
- WCAG (W3C/WAI): 1.0 (1999), 2.0 (2008), 2.1 (2018), **2.2 (2023, ISO/IEC 40500:2025)**; POUR; A, AA, AAA.
- Perceptible: alternativas textuales, multimedia, adaptable, distinguible. Operable: teclado, tiempo, convulsiones, navegable, modalidades de entrada. Comprensible: legible, predecible, ayuda a la entrada. Robusto: compatible.
- Contraste AA: 4,5:1 (texto normal) y 3:1 (texto grande).
- ATAG (autor), UAAG (agentes de usuario), WAI-ARIA (roles, estados y propiedades).
- RD 1112/2018: sector público; EN 301 549; 20 días hábiles; 2 meses; declaración anual con enlace «Accesibilidad»; Unidad responsable de accesibilidad; revisiones automáticas y manuales.
- Ley 11/2023 (Ley Europea de Accesibilidad): productos y servicios privados desde el 28-6-2025.
- Diseño universal: 7 principios (equitativo, flexible, simple e intuitivo, información perceptible, tolerancia al error, bajo esfuerzo físico, tamaño y espacio).
- Usabilidad (ISO 9241-11): eficacia, eficiencia y satisfacción en un contexto de uso; 10 heurísticos de Nielsen.
- Puesto de usuario: mesa limpia, bloqueo, cifrado de disco, mínimo privilegio, MFA, antimalware/EDR, copias, borrado seguro.
- MFA: algo que sabes + algo que tienes + algo que eres (factores de tipo distinto).
- S-SDLC, DevSecOps, seguridad desde el diseño; STRIDE; ENS mp.sw.1 (desarrollo) y mp.sw.2 (aceptación).
- SAST, DAST, IAST, SCA, *fuzzing*, pentest.
- OWASP Top 10:2025: control de acceso, configuración, cadena de suministro, criptografía, inyección, diseño inseguro, autenticación, integridad, registro y alertas, condiciones excepcionales.
- XSS → escapar la salida y CSP; SQLi → consultas parametrizadas; CSRF → *tokens* y `SameSite`.
- Cabeceras: HSTS, CSP, `nosniff`, `X-Frame-Options`, `Referrer-Policy`; *cookies* `Secure`, `HttpOnly`, `SameSite`.

## Fuentes

- Real Decreto 1112/2018, sobre accesibilidad de los sitios web y aplicaciones para dispositivos móviles del sector público (BOE-A-2018-12699): https://www.boe.es/buscar/act.php?id=BOE-A-2018-12699
- Directiva (UE) 2016/2102: https://eur-lex.europa.eu/eli/dir/2016/2102/oj
- Ley 11/2023, de trasposición de directivas en materia de accesibilidad de productos y servicios (BOE-A-2023-11022): https://www.boe.es/buscar/act.php?id=BOE-A-2023-11022
- Real Decreto Legislativo 1/2013, Ley General de derechos de las personas con discapacidad (BOE-A-2013-12632): https://www.boe.es/buscar/act.php?id=BOE-A-2013-12632
- Portal de Administración Electrónica, accesibilidad y Observatorio de Accesibilidad Web: https://administracionelectronica.gob.es/pae_Home/pae_Estrategias/pae_Accesibilidad.html
- W3C, *Web Content Accessibility Guidelines (WCAG) 2.2*: https://www.w3.org/TR/WCAG22/
- W3C WAI, WCAG 2.2 aprobada como ISO/IEC 40500:2025: https://www.w3.org/WAI/news/2025-10-21/wcag22-iso
- W3C, *WAI-ARIA 1.2*: https://www.w3.org/TR/wai-aria-1.2/
- W3C, *ATAG 2.0*: https://www.w3.org/TR/ATAG20/
- ETSI, EN 301 549 V3.2.1 (2021-03), requisitos de accesibilidad de productos y servicios TIC: https://www.etsi.org/deliver/etsi_en/301500_301599/301549/03.02.01_60/en_301549v030201p.pdf
- Nielsen Norman Group, *10 Usability Heuristics for User Interface Design*: https://www.nngroup.com/articles/ten-usability-heuristics/
- Real Decreto 311/2022, Esquema Nacional de Seguridad (BOE-A-2022-7191): https://www.boe.es/buscar/act.php?id=BOE-A-2022-7191
- OWASP Top 10:2025: https://top10.owasp.org/2025/0x00_2025-Introduction
- OWASP, *Cross Site Scripting Prevention Cheat Sheet*: https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html
- MDN, `Set-Cookie` (atributos `Secure`, `HttpOnly`, `SameSite`): https://developer.mozilla.org/es/docs/Web/HTTP/Headers/Set-Cookie
- NIST SP 800-218, *Secure Software Development Framework*: https://csrc.nist.gov/pubs/sp/800/218/final
