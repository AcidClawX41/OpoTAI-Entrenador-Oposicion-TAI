# III.7 · Aplicaciones web: front-end, servidor, multiplataforma, HTML/XML, navegadores y lenguajes de script

Es el tema **más preguntado del bloque III**: el supuesto práctico casi siempre incluye varias preguntas de HTML, CSS, JavaScript, XML o JSON, y en el cuestionario aparecen navegadores, *frameworks* y lenguajes de servidor. El programa pide: las **aplicaciones web**; el **desarrollo *front-end* y en servidor**, **multiplataforma y multidispositivo**; los **lenguajes HTML, XML y sus derivaciones**; los **navegadores y lenguajes de programación web**, y los **lenguajes de script**. La accesibilidad y la seguridad web se estudian en III.8; los servicios REST y SOAP, en III.6; HTTP y TLS, en IV.8.

## Aplicaciones web

### Concepto y características

Una **aplicación web** es un programa al que se accede con un **navegador** a través de la red (HTTP/HTTPS). La parte que se ejecuta en el navegador es el ***front-end*** (cliente: HTML, CSS y JavaScript) y la que se ejecuta en el servidor, el ***back-end*** (lógica de negocio, acceso a datos, API). Quien domina ambas es un desarrollador *full stack*.

| Ventajas | Inconvenientes |
|---|---|
| No requiere instalación: basta un navegador (**multiplataforma**) | Depende de la **conexión** (salvo PWA con modo sin conexión) |
| Actualización **centralizada** en el servidor | Diferencias entre navegadores (compatibilidad) |
| Acceso desde cualquier lugar y dispositivo | Superficie de ataque expuesta en Internet (XSS, CSRF, inyección: tema III.8) |
| Menores costes de despliegue y soporte | Menor acceso al hardware que una aplicación nativa |

### Tipos de aplicación y de renderizado

| Modelo | Funcionamiento |
|---|---|
| Sitio **estático** | Páginas HTML fijas servidas tal cual |
| Aplicación de **varias páginas** (MPA) | Cada acción pide al servidor una página nueva generada dinámicamente (JSP, PHP, Razor, Django) |
| **SPA** (*Single Page Application*) | Una única página que JavaScript actualiza sin recargar, pidiendo datos JSON a una API (Angular, React, Vue) |
| **CSR** (*Client-Side Rendering*) | El navegador construye la página con JavaScript |
| **SSR** (*Server-Side Rendering*) | El **servidor genera el HTML** de cada petición y lo envía ya renderizado: mejor tiempo de primera carga y posicionamiento; adecuado para formularios extensos con muchas consultas (supuesto de 2024). Después el JavaScript «hidrata» la página para hacerla interactiva |
| **SSG** (generación estática) | El HTML se genera en tiempo de compilación (*JAMstack*) |
| **PWA** (*Progressive Web App*) | Aplicación web **instalable**, con funcionamiento **sin conexión** y notificaciones *push*, gracias a un **manifiesto** y un ***service worker***; exige HTTPS |

Técnicas de comunicación con el servidor: **AJAX** (*Asynchronous JavaScript and XML*: peticiones en segundo plano con `XMLHttpRequest` o la API **`fetch`**, sin recargar la página), *Server-Sent Events* (el servidor envía eventos), **WebSocket** (canal bidireccional) y *polling*. AJAX, SSE y WebSocket **no** renderizan en el servidor (distractores de 2024).

## Desarrollo *front-end*

### HTML: estructura y contenido

HTML (*HyperText Markup Language*) define la **estructura y el significado** del contenido mediante **elementos** con etiquetas de apertura y cierre y **atributos**.

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>EducaData</title>
  <link rel="stylesheet" href="estilos.css">
  <script src="app.js" defer></script>
</head>
<body>
  <header><h1>Proceso selectivo TAI</h1></header>
  <nav><a href="/convocatorias">Convocatorias</a></nav>
  <main>
    <section id="alumnos"></section>
  </main>
  <footer>© Ministerio</footer>
</body>
</html>
```

- La declaración **`<!DOCTYPE html>`** va en la **primera línea, antes del elemento raíz `<html>`** (pregunta de 2026); activa el modo estándar del navegador.
- `<head>` contiene metadatos (`<meta charset>`, `<meta name="viewport">`, `<title>`, enlaces a CSS y *scripts*); `<body>`, el contenido visible.
- Elementos **de bloque** (ocupan todo el ancho: `<div>`, `<p>`, `<h1>`–`<h6>`, `<ul>`, `<table>`, `<form>`) y **en línea** (`<span>`, `<a>`, `<strong>`, `<em>`, `<img>`).

| Grupo | Elementos y atributos clave |
|---|---|
| Texto | `<h1>`…`<h6>` (jerarquía de encabezados, sin saltos de nivel), `<p>`, `<strong>`, `<em>`, `<br>`, `<blockquote>`, `<code>` |
| Enlaces e imágenes | **`<a href="…">`** (hipervínculo; `target="_blank"`), `<img src="…" alt="…">` (el `alt` es obligatorio para la accesibilidad) |
| Listas | `<ul>` (no ordenada), `<ol>` (ordenada), `<li>`, `<dl>`/`<dt>`/`<dd>`; una **lista anidada** va **dentro de un `<li>`**: `<ul><li>Opositor<ul><li>Nota 1</li><li>Nota 2</li></ul></li></ul>` |
| Tablas | `<table>`, `<caption>`, `<thead>`, `<tbody>`, `<tfoot>`, `<tr>`, **`<th>` (celda de encabezado; supuesto de 2021)**, `<td>`, atributos `colspan`, `rowspan` y `scope` |
| Formularios | `<form action="…" method="get/post">`, `<label for="…">`, `<input>`, `<select>`/`<option>`, `<textarea>`, `<button>`, `<fieldset>`/`<legend>` |
| Multimedia | `<video>` y `<audio>` (con `controls` y varios `<source>`), `<track>` (subtítulos), `<picture>`, `<canvas>`, `<svg>`, `<iframe>` |
| Semánticos (HTML5) | `<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<aside>`, `<footer>`, `<figure>`, `<figcaption>`, `<details>`/`<summary>`, `<mark>`, `<time>`, `<dialog>` |
| Atributos globales | `id`, `class`, `style`, `title`, `lang`, **`hidden`** (oculta el elemento; p. ej. una zona hasta que el usuario inicia sesión), `data-*`, `tabindex`, `aria-*` |

**Formularios y validación nativa**:

```html
<form action="/inscripcion" method="post">
  <label for="nombre">Nombre</label>
  <input type="text" id="nombre" name="username" required>        <!-- obligatorio -->
  <label for="email">Correo</label>
  <input type="email" id="email" name="email" maxlength="100">    <!-- máximo 100 caracteres -->
  <input type="number" name="nota" min="0" max="10" step="0.01">
  <input type="tel" name="tel" pattern="[6-9][0-9]{8}">
  <button type="submit">Enviar</button>
</form>
```

- `required` hace **obligatorio** el campo (supuesto de 2021); **`maxlength`** limita el número de caracteres (supuesto de 2024; `size` solo cambia el ancho visible y `max` es para valores numéricos o fechas).
- Tipos de `<input>` de HTML5: `email`, `url`, `tel`, `number`, `range`, `date`, `time`, `datetime-local`, `month`, `week`, `color`, `search`, además de `text`, `password`, `checkbox`, `radio`, `file`, `hidden` y `submit`.
- La validación del navegador **no sustituye** a la del servidor.

**Vídeo con varias fuentes**: el navegador reproduce la **primera fuente cuyo formato soporte** y solo muestra el texto alternativo si no admite el elemento:

```html
<video width="320" height="240" controls>
  <source src="movie.mp4" type="video/mp4">
  <source src="movie.ogg" type="video/ogg">
  Su navegador no soporta vídeo.
</video>
```

**Eventos** (atributos o, mejor, `addEventListener`): `onclick`, **`onmouseover`** (el puntero **entra** sobre el elemento; pregunta de 2024), `onmouseout` (sale), `onmousedown`/`onmouseup`, `onkeydown`, `onchange`, `oninput`, `onsubmit`, `onfocus`, `onblur`, `onload`.

**API de HTML5**: Canvas, Web Storage (`localStorage` y `sessionStorage`), IndexedDB, Geolocation, *Drag and Drop*, History, Web Workers, WebSocket, Fetch, File, Notifications y Service Workers.

### CSS: presentación

**CSS** (*Cascading Style Sheets*) define la **presentación y los estilos** (pregunta de 2023); se aplica con hojas externas (`<link>`), en `<style>` o con el atributo `style`. Ya no hay versiones monolíticas: tras CSS 2.1, «CSS3» es un conjunto de **módulos** con niveles propios (no existe un «CSS4» único).

**Selectores**:

| Selector | Selecciona | Ejemplo |
|---|---|---|
| De tipo | Todos los elementos de esa etiqueta | `p` |
| De clase | Elementos con esa clase | `.aviso` |
| De identificador | El elemento con ese `id` | `#principal` |
| Atributo | Elementos con un atributo o valor | `input[type="email"]` |
| Pseudoclase | Un estado | `a:hover`, `input:required`, `li:first-child`, `:focus` |
| Pseudoelemento | Una parte del elemento | `p::first-line`, `::before` |
| Descendiente (espacio) | Elementos dentro de otro a cualquier nivel | `li a` |
| **Hijo directo (`>`)** | Hijos inmediatos | **`li > a { color: green; }`** (supuesto de 2021) |
| Hermano adyacente (`+`) / general (`~`) | El siguiente hermano / los siguientes | `h2 + p`, `h2 ~ p` |

**Cascada y especificidad**: cuando varias reglas chocan gana la de mayor **especificidad**, que se calcula como un triple **(a, b, c)**: **a** = número de **identificadores**; **b** = **clases, atributos y pseudoclases**; **c** = **tipos de elemento y pseudoelementos**. A igual especificidad, gana la última. Los estilos en línea superan a las hojas y `!important` a todo lo demás.

> `input:required` → 0 identificadores, 1 pseudoclase y 1 tipo = **0-1-1** (supuesto de 2024). `#menu li.activo a` → **1-1-2**.

**Modelo de caja**: cada elemento es una caja con **contenido**, **relleno** (`padding`), **borde** (`border`) y **margen** (`margin`); `box-sizing: border-box` incluye relleno y borde en el ancho. `border-radius` redondea las esquinas de la caja y `box-shadow` añade sombra a la caja (no al texto, que se sombrea con `text-shadow`), como en el supuesto de 2026.

**Maquetación**: `display` (`block`, `inline`, `inline-block`, `none`, **`flex`**, **`grid`**), `position` (`static`, `relative`, `absolute`, `fixed`, `sticky`).

```css
div#principal { display: flex; justify-content: space-between; align-items: center; gap: 1rem; }  /* Flexbox: una dimensión */
.rejilla { display: grid; grid-template-columns: repeat(3, 1fr); }                                  /* Grid: dos dimensiones */

:root { --color-principal: #00508c; }               /* variables (propiedades personalizadas) */
h1 { color: var(--color-principal); font-size: 2rem; }

@media (max-width: 600px) {                          /* consulta de medios: diseño adaptable */
  .rejilla { grid-template-columns: 1fr; }
}
```

**Unidades**:

| Absolutas | Relativas |
|---|---|
| `px`, `cm`, `mm`, **`Q`** (cuartos de milímetro), `in`, `pt`, `pc` | `%`, `em` (tamaño de letra del elemento), `rem` (del elemento raíz), `ex` (altura de la x), `ch` (ancho del 0), `vw`/`vh` (1 % del ancho/alto de la ventana), `vmin`, `vmax`, `lh` |

`Q` es **absoluta** (pregunta de 2024 en los dos turnos).

**Herramientas**: **preprocesadores** **Sass/SCSS, Less y Stylus** (variables, anidamiento, *mixins*, que se compilan a CSS; pregunta de 2021), posprocesadores (PostCSS, Autoprefixer), *frameworks* CSS (**Bootstrap**: rejilla adaptable y **componentes** con comportamiento JavaScript; Tailwind CSS; Bulma) y **sistemas de diseño** (**Material Design**, de **Google**: pautas, componentes y herramientas de interfaz; Fluent, de Microsoft).

### JavaScript

**JavaScript** (Brendan Eich, Netscape, 1995) es el lenguaje de programación que los navegadores ejecutan **de forma nativa**; su estándar es **ECMAScript** (ECMA-262; desde 2015 una edición anual: la vigente es **ECMAScript 2026**, aprobada el 30 de junio de 2026). No forma parte de la plataforma Java ni se parece a Java más que en la sintaxis.

**Características**: interpretado con compilación JIT, **imperativo y dinámico**, **débilmente tipado**, **basado en prototipos**, con **funciones de primera clase** (se pueden asignar, pasar y devolver como cualquier valor; es **falso** que sean «de segunda clase», 2021), multiparadigma (imperativo, funcional, orientado a objetos y a eventos), **monohilo con bucle de eventos** y asíncrono (*callbacks*, promesas, `async`/`await`).

| Concepto | Detalle |
|---|---|
| Tipos | Primitivos: `string`, `number`, `bigint`, `boolean`, **`undefined`**, `null`, `symbol`; y `object` (incluye *arrays* y funciones). Una variable declarada sin valor vale **`undefined`** |
| Declaraciones | `var` (ámbito de función, *hoisting*), **`let`** (**ámbito de bloque**, reasignable) y `const` (bloque, no reasignable) |
| Igualdad | **`==`** compara **con conversión de tipos** (`123 == '123'` es `true`); **`===`** es estricta, valor y tipo (`10 === '10'` es `false`) |
| Curiosidades | `typeof null` es `"object"`; `NaN !== NaN`; **`isNaN("hola")`** es `true`; `"5" + 1` es `"51"` y `"5" - 1` es `4` |
| ES2015 (ES6) | `let`/`const`, funciones flecha, clases, módulos (`import`/`export`), promesas, plantillas de texto, desestructuración, **operador de propagación** (`...`), parámetros por defecto |
| Posteriores | `async`/`await` (ES2017), `?.` y `??` (ES2020), `await` de nivel superior y campos privados `#` (ES2022) |

**DOM** (*Document Object Model*, estándar vivo del WHATWG): representación del documento como **árbol de nodos** que JavaScript puede leer y modificar.

```javascript
// Obtener el texto "Primer ejercicio TAI" de <h1 id="titulo">…</h1>  (supuesto de 2021)
var titulo = document.getElementById("titulo").firstChild.nodeValue;   // o .textContent

const boton = document.querySelector("#enviar");           // primer elemento que cumple el selector CSS
boton.addEventListener("click", (e) => {
  e.preventDefault();
  document.querySelectorAll("li.pendiente").forEach(li => li.classList.add("visto"));
  const p = document.createElement("p");
  p.textContent = "Enviado";                               // textContent, no innerHTML (evita XSS)
  document.body.appendChild(p);
});
```

**Llamadas a API con `fetch`** (supuesto de 2026) y JSON:

```javascript
fetch("http://localhost:8080/alumnos")
  .then(response => response.json())        // convierte el cuerpo JSON
  .then(data => console.log(data))
  .catch(err => console.error(err));

async function cargar() {                    // misma llamada con async/await
  const resp = await fetch("/api/alumnos", { headers: { Accept: "application/json" } });
  if (!resp.ok) throw new Error(resp.status);
  return await resp.json();
}

const obj = JSON.parse('{"nombre": "Juana", "apellido": "Ruiz"}');   // cadena JSON → objeto
const txt = JSON.stringify(obj);                                      // objeto → cadena JSON
```

**Operador de propagación** (supuesto de 2026, en TypeScript):

```typescript
const menuAdministrador = ["Usuarios", "Permisos"];
const menuGestor = ["Notificaciones", "Usuarios", "Asientos registrales"];
const menu = [...menuAdministrador, ...menuGestor];
// nuevo array con el contenido de ambos (mantiene el duplicado "Usuarios")
const sinDuplicados = [...new Set(menu)];
```

**Expresiones regulares** (`/patrón/indicadores`): clases de caracteres `[…]` (**un solo** carácter de los indicados), cuantificadores `*` (0 o más), `+` (1 o más), `?` (0 o 1), `{n}`, `{n,m}`; anclas `^` y `$`; grupos `( )` y alternativa `|`; `\d` (dígito), `\w`, `\s`.

> Supuesto de 2026: el patrón `[\+34|34]*[ -]*(3)[0-9]{8}` usa mal una **clase de caracteres** (`[\+34|34]` significa «un carácter entre `+`, `3`, `4` y `|`», no «+34 o 34») y no está anclado, así que basta con encontrar un `3` seguido de ocho dígitos en algún punto: de las opciones solo lo cumple `+34641992011`. Un patrón correcto para un móvil español sería `^(\+34|0034)?[ -]?[6-9][0-9]{8}$`.

**Almacenamiento en el navegador**: *cookies* (viajan en cada petición; atributos `Secure`, `HttpOnly`, `SameSite`), `localStorage` (persistente), `sessionStorage` (por pestaña) e IndexedDB (base de datos).

**TypeScript** (Microsoft, 2012) es un **superconjunto de JavaScript con tipado estático** (tipos, interfaces, genéricos, enumerados) que se **transpila** a JavaScript (`tsc`); es el lenguaje de Angular.

### *Frameworks* y bibliotecas *front-end*

| Herramienta | Qué es |
|---|---|
| **Angular** (Google) | *Framework* completo en TypeScript: componentes, plantillas, servicios, inyección de dependencias, enrutador, RxJS y *signals*; pruebas en ficheros **`.spec.ts`** |
| **React** (Meta) | **Biblioteca** de código abierto para construir **interfaces de usuario** con componentes, JSX y DOM virtual (Next.js para SSR) |
| **Vue.js** | *Framework* progresivo con componentes de un solo fichero (`.vue`) (Nuxt para SSR) |
| Svelte | Compila los componentes a JavaScript sin DOM virtual |
| **jQuery** | **Biblioteca** JavaScript (no un lenguaje: distractor de 2026) para manipular el DOM, eventos y AJAX |
| **Bootstrap** | *Framework* CSS con **componentes** HTML, CSS y JavaScript para la parte dinámica y adaptable del *front-end* |
| **Node.js** y **npm** | Entorno de ejecución de JavaScript **en el servidor** basado en el motor **V8** de Chrome (escrito en C++, no en Java); npm gestiona paquetes (`package.json`) |
| Vite, Webpack, Babel | Empaquetadores y transpilador |
| ESLint, **Prettier** | Analizador estático y **formateador** de código (supuesto de 2026) |
| **Jest**, Jasmine, Karma, Cypress, Playwright | **Pruebas** de código JavaScript (unitarias y de extremo a extremo) |

**Enlace de datos en Angular** (supuesto de 2026):

| Sintaxis | Tipo |
|---|---|
| `{{ propiedad }}` | **Interpolación** (componente → vista) |
| `[value]="propiedad"` | Enlace de **propiedad** (componente → vista) |
| `(click)="metodo()"` | Enlace de **evento** (vista → componente) |
| **`[(ngModel)]="email"`** | Enlace **bidireccional** («banana en una caja»; requiere `FormsModule`) |
| `{{ fechaHora \| date: 'dd/MM/yyyy HH:mm' }}` | ***Pipe*** de transformación: `dd` día, `MM` mes, `yyyy` año, `HH` hora de 0 a 23 y `mm` minutos (`hh` es de 1 a 12; `DD` y `YYYY` no son válidos) |

```typescript
@Component({
  selector: 'app-alumnos',
  standalone: true,
  imports: [FormsModule, DatePipe],
  template: `
    <input type="text" [(ngModel)]="email" />
    <p>Fecha y hora: {{ fechaHora | date: 'dd/MM/yyyy HH:mm' }}</p>
    @for (a of alumnos; track a.id) { <li>{{ a.nombre }}</li> }
  `
})
export class AlumnosComponent {
  email = '';
  fechaHora = new Date();
  alumnos: Alumno[] = [];
}
```

## Desarrollo en servidor (*back-end*)

El servidor recibe las peticiones HTTP, aplica la lógica de negocio, accede a los datos y devuelve HTML (renderizado en servidor) o datos JSON (API). Lenguajes y *frameworks* habituales:

| Lenguaje | *Frameworks* | Notas |
|---|---|---|
| Java | Jakarta EE (Servlet, Faces, REST), **Spring Boot** | Tema III.5 |
| C# | **ASP.NET Core** (MVC, Razor Pages, Web API, Blazor) | Tema III.5 |
| **PHP** (8.5, noviembre de 2025) | Laravel, Symfony; CMS WordPress, Drupal | Variables superglobales `$_GET`, `$_POST`, `$_COOKIE`, `$_SERVER` y **`$_SESSION`** (datos de la sesión del usuario tras `session_start()`; supuesto de 2023) |
| **Python** | **Django** (completo, patrón MTV, ORM y panel de administración), Flask, FastAPI | Django es el *framework* web; Keras y NumPy son bibliotecas de cálculo y aprendizaje automático, y pip el gestor de paquetes |
| JavaScript / TypeScript | **Node.js** con Express o NestJS | Mismo lenguaje en cliente y servidor |
| Ruby | **Ruby on Rails** | *Framework* web basado en el patrón **MVC** (2004), con «convención sobre configuración» y DRY |
| **Go** | Gin, Echo, biblioteca estándar `net/http` | Lenguaje compilado de Google muy usado en *back-end*, microservicios y herramientas de nube (Docker, Kubernetes) |

```php
<?php
session_start();                                   // inicia o reanuda la sesión
$_SESSION['usuario'] = $usuarioValidado;           // guarda datos de la sesión
$nombre = htmlspecialchars($_POST['nombre'] ?? '', ENT_QUOTES, 'UTF-8');   // escapar salida
?>
```

**Estado en HTTP**: el protocolo **no tiene estado**; las aplicaciones lo mantienen con ***cookies*** de sesión (identificador de sesión), **sesiones en el servidor** o ***tokens*** (JWT). Atributos de seguridad de las *cookies* (tema III.8): `Secure` (solo HTTPS), **`HttpOnly`** (inaccesible para JavaScript) y **`SameSite`** (solo se envía en peticiones del mismo sitio).

**Servidores web**: Apache HTTP Server (módulos, `VirtualHost`, `.htaccess`), **Nginx** (asíncrono, proxy inverso), IIS (Windows); servidores de aplicaciones: Tomcat, WildFly, Kestrel. Plantillas de servidor: JSP, Thymeleaf, Razor, Twig, Jinja2.

## Desarrollo multiplataforma y multidispositivo

### Diseño web adaptable (*responsive*)

El **diseño responsivo** (*Responsive Web Design*, Ethan Marcotte, 2010) **adapta el contenido a los distintos dispositivos** y tamaños de pantalla (supuesto de 2021) con tres técnicas: **rejillas fluidas** (anchuras en porcentaje o `fr`), **imágenes flexibles** (`max-width: 100%`, `<picture>`, `srcset`) y **consultas de medios** (`@media`). Se complementa con la etiqueta `<meta name="viewport" content="width=device-width, initial-scale=1">` y el enfoque ***mobile first*** (diseñar primero para móvil y ampliar). El diseño **adaptativo** (*adaptive*), en cambio, sirve diseños fijos distintos según el dispositivo.

### Aplicaciones móviles

| Enfoque | Tecnologías | Características |
|---|---|---|
| **Nativas** | iOS: **Swift** y **SwiftUI** con Xcode; Android: **Kotlin** (o Java) con Android SDK y Jetpack Compose | Máximo rendimiento y acceso al hardware; un desarrollo por plataforma |
| **Multiplataforma** | **Flutter** (Dart), **React Native**, **.NET MAUI**, Kotlin Multiplatform | Un código para varias plataformas con interfaz nativa o propia |
| **Híbridas** | Ionic, Capacitor, Apache Cordova | Aplicación web dentro de un **WebView** empaquetada como nativa |
| **PWA** | HTML, CSS, JavaScript, *service worker* y manifiesto | Instalable desde el navegador; sin tienda de aplicaciones |

- **Swift** (Apple, 2014) es de **código abierto (licencia Apache 2.0)** y **no** es exclusivo de iOS: sirve para macOS, watchOS, tvOS, visionOS, Linux, Windows y servidor (pregunta de 2024). **SwiftUI** es el *framework* declarativo para crear interfaces en **cualquier dispositivo Apple**; Xcode es el IDE de Apple para todas sus plataformas, y Xcode Cloud, su servicio de integración continua (supuesto de 2024).
- Las **notificaciones nativas** en móviles se implementan con **notificaciones *push*** (*mobile push*): Apple Push Notification service (APNs) y Firebase Cloud Messaging (FCM) para Android (supuesto de 2023). Un WebView solo muestra contenido web dentro de la aplicación.
- *Web Components* (Custom Elements, Shadow DOM, plantillas) permiten crear componentes reutilizables en cualquier *framework*.

## Lenguajes de marcas: HTML, XML y sus derivaciones

### De SGML a HTML y XML

**SGML** (ISO 8879:1986) es el **metalenguaje** del que derivan **HTML** (una aplicación concreta de SGML con etiquetas fijas) y **XML** (un subconjunto simplificado de SGML para definir lenguajes propios).

| Versión | Año | Notas |
|---|---|---|
| HTML (Tim Berners-Lee, CERN) | 1991 | Primera web |
| HTML 2.0 (RFC 1866) | 1995 | Primera norma |
| HTML 3.2 / **4.01** (W3C) | 1997 / 1999 | Tablas, *frames*, CSS; versiones *Strict*, *Transitional* y *Frameset* |
| **XHTML 1.0 / 1.1** (W3C) | 2000 / 2001 | HTML reformulado como **XML** |
| **HTML5** (W3C) | 2014 (5.1 en 2016, 5.2 en 2017) | Semántica, multimedia, formularios y API |
| **HTML Living Standard** (WHATWG) | Desde 2019 | Acuerdo W3C–WHATWG de mayo de 2019: el **estándar vivo del WHATWG es la única especificación de HTML** (y del DOM) |

**Novedades de HTML5**: elementos semánticos (`<header>`, `<footer>`, `<nav>`, `<section>`, `<article>`, `<aside>`, `<main>`, `<figure>`, `<figcaption>`), `<details>` y `<summary>`, `<mark>`, `<time>`, `<progress>`, `<meter>`, `<output>`, `<datalist>`, multimedia (`<video>`, `<audio>`, `<source>`, `<track>`, `<canvas>`), nuevos tipos de `<input>` y atributos (`required`, `placeholder`, `pattern`, `autofocus`), el `DOCTYPE` simplificado y las API. Se eliminaron elementos de presentación como `<font>`, `<center>`, `<big>`, `<strike>`, `<frame>`, `<frameset>` y `<applet>`. `<caption>` (título de tabla) existe desde HTML 3.2.

> En la pregunta de promoción interna de 2021 sobre etiquetas que **no** eran novedad de HTML5, la plantilla definitiva dio por buena la pareja `<details>` y `<mark>`, aunque ambas aparecen como elementos nuevos en HTML5; la única pareja con una etiqueta anterior era `<caption>` y `<nav>`. Aprende bien la lista de novedades.

### XHTML

**XHTML** es HTML con la **sintaxis estricta de XML**. Restricciones frente a HTML:

| Regla de XHTML | En HTML |
|---|---|
| Todos los elementos se **cierran**, también los vacíos (`<br />`, `<img … />`): «para elementos vacíos se requieren etiquetas finales» (2023) | Elementos vacíos sin cierre y algunos cierres opcionales |
| Nombres de elementos y atributos en **minúsculas** | Indiferente |
| Valores de atributos **siempre entre comillas** | Comillas opcionales en algunos casos |
| **Sin minimización** de atributos: `checked="checked"` | `checked` |
| Anidamiento correcto y **un único elemento raíz** `<html>` con espacio de nombres | Más permisivo |
| **`<head>` y `<body>` obligatorios** (2024) | Pueden omitirse sus etiquetas |

Hoy existe la **sintaxis XML de HTML** («XHTML5»), servida con el tipo `application/xhtml+xml`.

### XML

**XML** (*eXtensible Markup Language*; W3C, **XML 1.0** de 1998, quinta edición de 2008; también XML 1.1) es un metalenguaje para **definir lenguajes de marcas** y **intercambiar datos estructurados** independientes de la plataforma.

**Documento bien formado** (cumple la sintaxis XML):

- **Un único elemento raíz**, cuyas etiquetas de apertura y cierre no están dentro de ningún otro elemento (pregunta de 2026).
- Toda etiqueta abierta se **cierra** (`<a>…</a>` o vacía `<a/>`), con **anidamiento correcto**.
- Distingue **mayúsculas y minúsculas** (`<Nota1>` no cierra con `</nota1>`).
- Los valores de los **atributos van entre comillas** (`<alumno id_alumno="10">`; no `id_alumno=10` ni `id_alumno:"10"`).
- Caracteres especiales escapados: `&lt;` (<), `&gt;` (>), `&amp;` (&), `&quot;` y `&apos;`; o secciones `<![CDATA[ … ]]>`.
- **Comentarios** con `<!-- comentario -->` (sin `--` en su interior; pregunta de 2021).
- Prólogo opcional (recomendado) `<?xml version="1.0" encoding="UTF-8"?>` al principio.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!-- Listado de alumnos -->
<alumnos xmlns="urn:educadata">
  <alumno id_alumno="10">
    <nombre>Juan Pérez</nombre>
    <nota>7.5</nota>
  </alumno>
</alumnos>
```

> Supuesto de 2021: `<Opositor>Winston Churchill<Nota1/>95<Nota2/>65</Opositor>` **está bien formado** (dos elementos vacíos y texto mezclado); los demás tenían cierres con distinta capitalización, mal anidados o vacíos (`</>`).

**Documento válido**: bien formado **y conforme a un esquema**:

| Lenguaje de esquema | Características |
|---|---|
| **DTD** (*Document Type Definition*) | Heredado de SGML; sintaxis propia (`<!ELEMENT>`, `<!ATTLIST>`, `<!ENTITY>`); valida estructura pero casi no tiene **tipos de datos** ni espacios de nombres |
| **XML Schema (XSD)** (W3C, 1.0 de 2001 y 1.1 de 2012) | Escrito en XML; **tipos de datos** (`xs:string`, `xs:integer`, `xs:date`…), **tipos personalizados** (`simpleType`, `complexType`), **restricciones** sobre valores de elementos y atributos (`minInclusive`, `maxLength`, `pattern`, `enumeration`), espacios de nombres, cardinalidades y reutilización con `import`/`include` (supuesto de 2024) |
| RELAX NG (ISO/IEC 19757-2) y Schematron (19757-3) | Alternativas: sintaxis compacta y reglas basadas en XPath |

```xml
<xs:element name="nota">
  <xs:simpleType>
    <xs:restriction base="xs:decimal">
      <xs:minInclusive value="0"/>
      <xs:maxInclusive value="10"/>
    </xs:restriction>
  </xs:simpleType>
</xs:element>
```

**Espacios de nombres** (`xmlns`) evitan conflictos entre vocabularios. **Procesamiento**: analizadores **DOM** (árbol en memoria), **SAX** (eventos) y **StAX** (bajo demanda); **XPath** (3.1) para seleccionar nodos (`/alumnos/alumno[@id_alumno='10']/nombre`); **XSLT** (3.0) para **transformar** XML en otro XML, HTML o texto; **XQuery** (3.1) para consultar; **XSL-FO** para maquetar (PDF); XLink, XPointer y XInclude.

**Lenguajes derivados de XML**: XHTML, **SVG** (gráficos vectoriales), **MathML**, **RSS** y **Atom** (sindicación), **SOAP**, **WSDL** y **SAML**, **XBRL** (información financiera), **UBL** (*Universal Business Language*, documentos comerciales), **Facturae** (factura electrónica española), **ODF** (ISO/IEC 26300) y **OOXML** (ISO/IEC 29500), XAdES (firma electrónica), XAML, KML y GML (geografía), DocBook, RDF/XML, BPMN y descriptores como **`pom.xml`** de Maven o `web.xml`.

### JSON y otros formatos

**JSON** (RFC 8259 y ECMA-404) representa datos con **objetos** `{ }` (pares **nombre/valor no ordenados**, con nombres **entre comillas dobles**), **arrays** `[ ]`, **cadenas** (comillas dobles), **números**, `true`, `false` y `null`. No admite comentarios, comillas simples ni comas finales.

```json
{"nombre": "Juana", "apellido": "Ruiz", "notas": [27, 36, 12], "apto": true, "telefono": null}
```

| | XML | JSON |
|---|---|---|
| Sintaxis | Etiquetas de apertura y cierre, atributos | Pares clave-valor, *arrays* |
| Tamaño | Más verboso | Más compacto |
| Tipos | Todo es texto (tipos mediante XSD) | Cadena, número, booleano, nulo, objeto, *array* |
| Validación | DTD, XSD | JSON Schema |
| Espacios de nombres, comentarios | Sí | No |
| Uso típico | SOAP, documentos, firma, Administración (Facturae, SCSP) | API REST, configuración, *front-end* |

Otros: **YAML** (configuración, OpenAPI, Kubernetes; basado en sangría), **Markdown** (texto con formato ligero), CSV (RFC 4180).

## Navegadores y lenguajes de programación web

### Arquitectura de un navegador

Un navegador tiene: **interfaz de usuario**; **motor del navegador** (coordina); **motor de renderizado** (interpreta HTML y CSS y dibuja la página); **motor de JavaScript**; **red** (HTTP, caché); *backend* de interfaz; y **almacenamiento** (*cookies*, `localStorage`, IndexedDB). Los navegadores modernos son **multiproceso** (cada sitio en un proceso aislado).

**Proceso de renderizado**: HTML → **DOM**; CSS → **CSSOM**; ambos → árbol de renderizado → **diseño** (*layout* o *reflow*) → **pintado** → composición. El JavaScript puede bloquear el análisis (por eso se usan `defer` y `async`).

![Diagrama de flujo del renderizado en el navegador: el HTML se analiza en el DOM y el CSS en el CSSOM; un script sin defer ni async bloquea el análisis del HTML, y el JavaScript lee y modifica el DOM y cambia estilos del CSSOM; DOM y CSSOM forman el árbol de renderizado, solo con lo visible, que pasa por el diseño (layout o reflow: tamaño y posición), el pintado de cada capa y la composición en pantalla](diagramas/III.7-renderizado.svg)

*Figura: ruta crítica de renderizado, del HTML y el CSS a los píxeles, y dónde interviene el JavaScript.*

| Navegador | Motor de renderizado | Motor de JavaScript |
|---|---|---|
| Google Chrome / Chromium | **Blink** | **V8** |
| Microsoft Edge (desde 2020) | Blink | V8 |
| Opera, Brave, Vivaldi, Samsung Internet | Blink | V8 |
| **Mozilla Firefox** | **Gecko** (Mozilla Foundation; pregunta de 2023) | **SpiderMonkey** |
| Apple Safari | **WebKit** | JavaScriptCore |
| Internet Explorer (retirado el 15 de junio de 2022) | Trident | Chakra (JScript) |
| Edge antiguo (2015-2020) | EdgeHTML | Chakra |

Firefox y Edge son **navegadores**, no motores. Otros proyectos: Servo (Rust) y Ladybird.

**Organismos de normalización web**: **W3C** (*World Wide Web Consortium*, Tim Berners-Lee, 1994: CSS, accesibilidad, XML, SVG), **WHATWG** (HTML, DOM, Fetch, URL), **Ecma TC39** (ECMAScript), **IETF** (HTTP, TLS, URI) y Khronos (WebGL).

**Conceptos de compatibilidad**: herramientas de desarrollo del navegador (F12), *polyfills* (código que añade una funcionalidad a navegadores antiguos), **mejora progresiva** (partir de lo básico y añadir capas) frente a **degradación elegante**, cadena de agente de usuario, **política del mismo origen** y **CORS** (tema III.8).

### Lenguajes de programación web

| Lado | Lenguajes |
|---|---|
| **Cliente** (se ejecutan en el navegador) | **JavaScript** (único lenguaje de programación nativo de los navegadores, junto con **WebAssembly**), TypeScript (transpilado a JavaScript). Históricos y abandonados: *applets* de Java, Flash/ActionScript (fin de soporte el 31-12-2020), VBScript (solo Internet Explorer), Silverlight |
| **Servidor** | Java, C#, PHP, Python, JavaScript/TypeScript (Node.js), Ruby, **Go**, Kotlin, Rust |
| Marcado y estilo (no son lenguajes de programación) | HTML, CSS, XML |

**WebAssembly** (W3C, recomendación desde **2019**; versión **3.0** en septiembre de 2025) es un formato binario portable que los navegadores ejecutan a velocidad casi nativa, compilado desde C, C++, Rust, Go o C#. Para que una funcionalidad interactiva funcione **de forma nativa** en Chrome, Edge y Firefox hay que usar **JavaScript (ECMAScript)**, no Python, SQL ni Java (supuesto de 2026). **Sass** y **XML** no son lenguajes de *back-end*; **Go** sí (2023).

## Lenguajes de script

Un **lenguaje de script** es un lenguaje normalmente **interpretado** (o con JIT), de **alto nivel** y **tipado dinámico**, pensado para **automatizar tareas**, **unir componentes** (*glue code*) o **extender** aplicaciones, sin paso explícito de compilación y con desarrollo rápido.

| Ámbito | Lenguajes | Usos |
|---|---|---|
| Web en cliente | **JavaScript**, TypeScript | Interactividad, SPA |
| Web en servidor | **PHP**, **Python**, **Ruby**, Perl, JavaScript (Node.js) | Páginas dinámicas, API |
| Sistema operativo (*shell*) | **Bash**, sh, zsh (Unix/Linux); **PowerShell** (Windows y multiplataforma, orientado a **objetos**); `cmd` y ficheros `.bat`; VBScript y WSH (Microsoft anunció en 2023 la retirada progresiva de VBScript) | Administración y automatización (tema IV.1) |
| Integrados en aplicaciones | **Lua** (videojuegos, Nginx/OpenResty, Redis), VBA (macros de Office), Groovy (Jenkins), AppleScript, Tcl | Extensión y personalización |
| Proceso de texto y datos | Perl, awk, sed; **Python** y **R** (ciencia de datos) | Informes, transformación de ficheros |

**Python** destaca en el examen: bloques por **sangría**, tipado dinámico y fuerte, gestor de paquetes **pip** (repositorio PyPI), entornos virtuales (`venv`); *frameworks* web **Django**, Flask y FastAPI; bibliotecas científicas NumPy y pandas; y de aprendizaje automático **scikit-learn**, **TensorFlow** (Google; `import tensorflow as tf`), **Keras** (API de alto nivel para redes neuronales) y PyTorch (Meta).

```bash
#!/bin/bash
# Bash: copia de seguridad diaria de la configuración
fecha=$(date +%F)
tar -czf "/backup/config_${fecha}.tar.gz" /srv/app/config/ && echo "Copia ${fecha} correcta"
```

```powershell
# PowerShell: servicios en ejecución (la tubería pasa objetos, no texto)
Get-Service | Where-Object { $_.Status -eq "Running" } | Select-Object Name
```

## Normativa y estándares clave

| Estándar | Qué regula | Puntos clave |
|---|---|---|
| **HTML Living Standard** (WHATWG) | HTML y API del navegador | Única especificación de HTML desde el acuerdo W3C–WHATWG de 2019; `<!DOCTYPE html>` |
| DOM Living Standard (WHATWG) | Modelo de objetos del documento | Árbol de nodos, eventos |
| CSS (módulos del W3C) | Presentación | Selectores, cascada y especificidad, caja, Flexbox, Grid, *media queries* |
| **ECMA-262**, 17.ª edición (**ECMAScript 2026**) | JavaScript | Una edición al año desde ES2015 |
| **XML 1.0** (5.ª ed., 2008) y XML Schema 1.1 (2012) | XML y su validación | Bien formado frente a válido; tipos y restricciones |
| XPath 3.1, XQuery 3.1 y XSLT 3.0 (W3C, 2017) | Navegación, consulta y transformación de XML | — |
| **RFC 8259** y ECMA-404 | JSON | Objeto, *array*, cadena, número, `true`, `false`, `null` |
| WebAssembly (W3C, 2019; 3.0 en 2025) | Código binario en el navegador | Cuarto lenguaje nativo de la web |
| RFC 6265 | *Cookies* | `Secure`, `HttpOnly`; `SameSite` en su revisión |
| Web App Manifest y Service Workers (W3C) | PWA | Instalación y funcionamiento sin conexión |
| WCAG 2.2 y UNE-EN 301 549 (tema III.8) | Accesibilidad | Obligatoria en el sector público (RD 1112/2018) |

## Lo que más cae en el examen

Es el tema con más preguntas de todo el temario según nuestra clasificación: **65** en los nueve exámenes analizados (45 de ingreso libre: 14 en 2021, 9 en 2023, 7 en 2024, 7 en 2025 y 8 en el extraordinario; y 20 de promoción interna). La mayoría están en el **supuesto del bloque III**.

| Concepto | Preguntas | Exámenes |
|---|---|---|
| **HTML**: `<th>`, listas anidadas, `required`, `maxlength`, vídeo con varias fuentes, `hidden`, `onmouseover`, `<a>`, `DOCTYPE`, estructura HTML5, novedades de HTML5 | 15 | Todos los años |
| **XML, XHTML y JSON**: comentarios, documento bien formado, raíz única, atributos entre comillas, reglas de XHTML, XSD, JSON válido, `JSON.parse` | 12 | LI 2021, 2023, 2024 y 2025; PI 2021, 2023, 2024 y 2025 |
| **JavaScript y TypeScript**: características (funciones de primera clase), DOM, `==` y `===`, `isNaN`, `fetch`, ECMAScript nativo en los navegadores, propagación `...`, expresión regular | 11 | LI 2021, 2025 y 2025‑ext; PI 2021, 2024 y 2025 |
| **CSS**: selector `li > a`, `display: flex`, especificidad `0-1-1`, unidad `Q` absoluta, preprocesadores, `border-radius` y `box-shadow`, para qué sirve CSS | 10 | LI 2021, 2023, 2024 y 2025‑ext; PI 2021, 2023 y 2024 |
| ***Frameworks***: Ruby on Rails (MVC), Django, Angular (`[(ngModel)]`, *pipe* `date`), Bootstrap, Material Design, jQuery, JDBC no es de JavaScript | 8 | LI 2021, 2023 y 2025‑ext |
| **Multiplataforma y renderizado**: SSR, diseño responsivo, *mobile push*, Swift y SwiftUI | 5 | LI 2023 y 2024; PI 2021 y 2024 |
| **Navegadores y servidor**: Gecko, Go en *back-end*, `$_SESSION` de PHP | 4 | LI 2023; PI 2023 |

Patrón: fragmentos de código con cuatro variantes casi iguales (cierres mal capitalizados en XML, `max` en lugar de `maxlength`, `[ngModel]` en lugar de `[(ngModel)]`, `DD/MM/YYYY` en lugar de `dd/MM/yyyy`) y preguntas de «qué es» con distractores de otra categoría (JDBC como *framework* JavaScript, jQuery como lenguaje, Firefox como motor).

## Trampas habituales

- **`<!DOCTYPE html>`** va antes de `<html>`, no dentro de `<head>` ni de `<body>`.
- **`maxlength`** limita caracteres de texto; `max` es el valor máximo numérico o de fecha; `size`, el ancho visible.
- **`<th>`** es la celda de encabezado; `<thead>` agrupa filas de encabezado; `<caption>` es el título de la tabla.
- Lista anidada: el `<ul>` interior va **dentro del `<li>`**, no entre dos `<li>`.
- **Especificidad**: identificadores (a) > clases, atributos y pseudoclases (b) > elementos y pseudoelementos (c); `input:required` = 0-1-1.
- **`li > a`** = hijos directos; **`li a`** = cualquier descendiente; `li + a`, hermano adyacente.
- **`Q`** es absoluta (cuarto de milímetro); `em`, `rem`, `ex`, `ch`, `vw`, `vh` son relativas.
- **XML** distingue mayúsculas; un solo elemento raíz; atributos entre comillas; comentarios `<!-- -->`.
- **XHTML** exige cerrar todos los elementos (también los vacíos), minúsculas, comillas y `<head>`.
- **XSD** sí define tipos personalizados, restricciones, espacios de nombres e importación de otros esquemas; la DTD apenas tiene tipos.
- **JavaScript**: funciones de **primera** clase, débilmente tipado, basado en prototipos; `==` convierte tipos (`123 == '123'` es verdadero), `===` no; `let` tiene ámbito de bloque; no es parte de Java.
- **jQuery** es una biblioteca, **Bootstrap** un *framework* CSS con componentes, **React** una biblioteca de interfaces, **Angular** un *framework*, **Node.js** un entorno de ejecución sobre V8; **JDBC** es Java (acceso a bases de datos).
- **Gecko** es el motor de Firefox; **Blink**, el de Chrome y Edge; **WebKit**, el de Safari.
- **Angular**: bidireccional = `[(ngModel)]`; *pipe* `date` con `'dd/MM/yyyy HH:mm'` entre comillas y dentro de `{{ }}`.
- **SSR** renderiza en el servidor; AJAX, WebSocket y *Server-Sent Events* no.
- **Swift** no es exclusivo de iOS; SwiftUI sirve para todos los dispositivos de Apple.
- **Sass, Less y Stylus** son preprocesadores CSS; **Postman** sí prueba servicios REST; Node.js no está hecho con Java.

## Repaso rápido

- Aplicación web: *front-end* (HTML, CSS, JavaScript) + *back-end* (lógica, datos, API).
- MPA, SPA, CSR, SSR (HTML generado en el servidor), SSG y PWA (manifiesto + *service worker*).
- HTML Living Standard (WHATWG) desde 2019; HTML5 (W3C, 2014); XHTML = HTML con reglas de XML.
- HTML5: elementos semánticos, multimedia, nuevos `input`, `required`, `placeholder`, `pattern`, API (Canvas, Storage, Geolocation, Workers).
- CSS: selectores, especificidad (a, b, c), modelo de caja, Flexbox (una dimensión) y Grid (dos), *media queries*.
- Unidades absolutas: `px`, `cm`, `mm`, `Q`, `in`, `pt`, `pc`; relativas: `%`, `em`, `rem`, `ex`, `ch`, `vw`, `vh`.
- JavaScript = ECMAScript (ECMA-262, edición 2026); tipos primitivos y `object`; `var`/`let`/`const`; `==` y `===`.
- DOM: `getElementById`, `querySelector`, `textContent`, `addEventListener`; `fetch` + `response.json()`; `JSON.parse` y `JSON.stringify`.
- TypeScript: JavaScript con tipos que se transpila; Angular: `{{ }}`, `[ ]`, `( )`, `[( )]`, *pipes*.
- Back-end: PHP (`$_SESSION`), Python (Django), Ruby on Rails (MVC), Node.js, Go, Java, C#.
- Responsivo: rejillas fluidas, imágenes flexibles y *media queries*; *viewport*; *mobile first*.
- Móvil: nativo (Swift/SwiftUI, Kotlin), multiplataforma (Flutter, React Native, MAUI), híbrido (WebView), PWA; *push*: APNs y FCM.
- XML: bien formado (sintaxis) frente a válido (DTD o XSD); XPath, XSLT, XQuery; SAX, DOM, StAX.
- Derivados de XML: XHTML, SVG, MathML, RSS, Atom, SOAP, WSDL, SAML, XBRL, UBL, Facturae, ODF, OOXML.
- JSON (RFC 8259): objetos, *arrays*, cadenas con comillas dobles, números, `true`, `false`, `null`.
- Motores: Blink/V8 (Chrome, Edge), Gecko/SpiderMonkey (Firefox), WebKit/JavaScriptCore (Safari).
- Lenguajes de script: JavaScript, PHP, Python, Ruby, Perl, Bash, PowerShell, Lua.

## Fuentes

- WHATWG, *HTML Living Standard*: https://html.spec.whatwg.org/multipage/
- WHATWG, *DOM Living Standard*: https://dom.spec.whatwg.org/
- W3C y WHATWG, memorando de entendimiento sobre HTML y DOM (2019): https://www.w3.org/2019/04/WHATWG-W3C-MOU.html
- W3C, CSS *Selectors Level 4* (especificidad): https://www.w3.org/TR/selectors-4/#specificity-rules
- W3C, *CSS Values and Units Module Level 4* (unidades): https://www.w3.org/TR/css-values-4/
- Ecma International, ECMA-262 (ECMAScript): https://262.ecma-international.org/
- MDN Web Docs (Mozilla), referencia de HTML, CSS y JavaScript: https://developer.mozilla.org/es/docs/Web
- W3C, *Extensible Markup Language (XML) 1.0 (Fifth Edition)*: https://www.w3.org/TR/xml/
- W3C, *XML Schema Definition Language (XSD) 1.1 Part 1: Structures*: https://www.w3.org/TR/xmlschema11-1/
- W3C, *XHTML 1.0* (diferencias con HTML 4): https://www.w3.org/TR/xhtml1/
- RFC 8259, JSON: https://www.rfc-editor.org/rfc/rfc8259
- W3C, *WebAssembly Core Specification*: https://www.w3.org/TR/wasm-core-2/
- Angular, documentación (enlace de datos y *pipes*): https://angular.dev/guide/templates
- PHP, manual (sesiones y `$_SESSION`): https://www.php.net/manual/es/reserved.variables.session.php
- Swift.org (licencia y plataformas): https://www.swift.org/about/
