# III.6 · Arquitecturas cliente/servidor y multicapa; servicios web y sus protocolos

Este tema explica **cómo se reparten las aplicaciones entre máquinas**: el modelo **cliente/servidor**, su evolución a arquitecturas de **dos, tres y n capas**, el *middleware* que las comunica y, sobre todo, los **servicios web**: la arquitectura orientada a servicios (SOA) con **SOAP, WSDL y UDDI** y sus especificaciones WS-\*, el estilo **REST** con HTTP, JSON y OpenAPI, y otros enfoques actuales (GraphQL, gRPC, mensajería, microservicios). En el examen cae en el cuestionario (características de REST, versión de SOAP, WSDL, UDDI, códigos y métodos HTTP) y en el supuesto (documentar una API, generar un cliente desde un WSDL, autenticación con JWT, código de estado de una respuesta). La administración de contenedores y microservicios es del tema IV.3, y HTTP y TLS en detalle, de IV.8.

## Arquitectura cliente/servidor

### Concepto y características

En el modelo **cliente/servidor** un proceso **cliente** solicita servicios y otro proceso **servidor** los presta, normalmente en máquinas distintas comunicadas por red con un protocolo de **petición-respuesta**.

| Cliente | Servidor |
|---|---|
| Inicia la comunicación (**activo**) | Espera peticiones (**pasivo**, escucha en un puerto) |
| Interactúa con el usuario (presentación) | Gestiona recursos compartidos (datos, impresión, cálculo) |
| Puede ser **ligero** (*thin*: navegador, solo presentación) o **pesado** (*fat*: presentación y lógica) | Atiende a **muchos clientes concurrentes** |

Características: **reparto de funciones**, **recursos compartidos y centralizados**, **transparencia de ubicación**, **escalabilidad** (horizontal: añadir servidores; vertical: servidores más potentes), **independencia de plataforma** entre cliente y servidor, **mantenimiento centralizado** y **seguridad** concentrada en el servidor. Inconvenientes: el servidor puede ser **cuello de botella** y **punto único de fallo**, y depende de la red. Frente a él, el modelo **entre iguales** (*peer-to-peer*) hace que cada nodo sea a la vez cliente y servidor.

### Componentes

Un sistema cliente/servidor tiene tres grandes componentes lógicos:

- **Presentación** (interfaz de usuario).
- **Lógica de negocio** o de aplicación (reglas y procesos).
- **Gestión de datos** (almacenamiento y acceso).

Y tres componentes físicos: el **cliente**, el **servidor** y la **red**, unidos por el ***middleware***: el *software* intermedio que oculta la red y la heterogeneidad (protocolos, sistemas operativos, formatos).

| Tipo de *middleware* | Ejemplos |
|---|---|
| Llamada a procedimiento remoto (RPC) | ONC RPC (RFC 5531), DCE RPC, **gRPC** |
| Objetos distribuidos | **CORBA** (OMG, protocolo IIOP), **Java RMI**, DCOM |
| Orientado a mensajes (MOM) | **Jakarta Messaging** (JMS), IBM MQ, RabbitMQ (AMQP), Apache Kafka, MQTT |
| Acceso a datos | **ODBC**, **JDBC**, ADO.NET |
| Monitores de transacciones | CICS, Tuxedo |
| Servicios web | SOAP, REST |

### Funcionamiento: sockets y modelos de servidor

La comunicación cliente/servidor se apoya en los **sockets** (extremos de comunicación identificados por **dirección IP + protocolo + puerto**):

1. El servidor crea un socket, lo asocia a un **puerto conocido** (`bind`; por ejemplo 443 para HTTPS o 5432 para PostgreSQL) y queda **escuchando** (`listen`).
2. El cliente crea un socket con un **puerto efímero** y se **conecta** (`connect`); con TCP se hace el saludo en tres pasos.
3. El servidor **acepta** la conexión (`accept`), que le devuelve un socket dedicado a ese cliente.
4. Ambos intercambian **peticiones y respuestas** (`send`/`recv`) según el protocolo de aplicación y cierran la conexión (`close`), o la reutilizan (conexiones persistentes de HTTP/1.1 y multiplexación de HTTP/2 y HTTP/3).

Modelos de servidor:

| Modelo | Funcionamiento | Ejemplo |
|---|---|---|
| **Iterativo** | Atiende a un cliente detrás de otro | Servicios muy simples |
| **Concurrente por procesos** | Crea un proceso hijo por conexión | Apache httpd con el módulo *prefork* |
| **Concurrente por hilos** (con *pool* de hilos) | Un hilo por petición, reutilizados | Tomcat, servidores Java EE; hilos virtuales de Java 21 |
| **Dirigido por eventos** (asíncrono, no bloqueante) | Pocos hilos con un bucle de eventos que atiende miles de conexiones | **Nginx**, Node.js, Kestrel |

Conexiones **con estado** (el servidor recuerda la sesión: FTP, sesiones de base de datos) frente a **sin estado** (cada petición es independiente: HTTP, que añade el estado con *cookies* o *tokens*).

### Modelos de reparto de Gartner

El Gartner Group clasificó las arquitecturas cliente/servidor según por dónde se corta la aplicación entre cliente y servidor:

| Modelo | En el cliente | En el servidor |
|---|---|---|
| **Presentación distribuida** | Parte de la presentación | Resto de la presentación, lógica y datos |
| **Presentación remota** | Toda la presentación | Lógica y datos |
| **Lógica distribuida** (proceso distribuido) | Presentación y parte de la lógica | Resto de la lógica y datos |
| **Gestión de datos remota** | Presentación y lógica | Datos (cliente pesado frente a servidor de base de datos) |
| **Base de datos distribuida** | Presentación, lógica y parte de los datos | Resto de los datos |

## Arquitecturas multicapa

### Capas lógicas y niveles físicos

Conviene distinguir **capas** (*layers*: separación **lógica** del código) de **niveles** (*tiers*: separación **física** en máquinas o procesos).

| Arquitectura | Reparto | Ventajas e inconvenientes |
|---|---|---|
| **Dos niveles** (cliente/servidor clásico) | Cliente con presentación y lógica (cliente pesado); servidor de base de datos | Sencilla, pero poco escalable, difícil de mantener y de desplegar en muchos puestos |
| **Tres niveles** | **Presentación** (navegador o cliente), **lógica de negocio** (servidor de aplicaciones) y **datos** (SGBD) | Separa responsabilidades, cliente ligero, mejor seguridad y escalabilidad |
| **N niveles** | Se añaden más: servidor web, servidor de aplicaciones, servicios, caché, colas, integración… | Máxima flexibilidad y escalabilidad, a cambio de complejidad y **más comunicaciones** |

**Ventajas de las arquitecturas multinivel**: **flexibilidad y modularidad**, **escalabilidad** (añadir recursos en el nivel que lo necesite), **extensibilidad** (nuevas funciones sin afectar a los clientes), **mantenibilidad**, **reutilización** de la lógica por varios clientes, **seguridad** (los datos no se exponen directamente) y **disponibilidad** (balanceo y redundancia por nivel). **Inconvenientes**: más complejidad de desarrollo, pruebas y despliegue, **más latencia y más tráfico de red** entre niveles, y más puntos de fallo. Por eso es **falso** que tengan «menor coste de comunicaciones» (2023).

![Comparación de arquitecturas: en dos niveles, un cliente pesado con presentación y lógica habla por SQL con el servidor de base de datos; en tres, el navegador presenta, el servidor de aplicaciones ejecuta la lógica y el servidor de base de datos guarda los datos; en n niveles se encadenan navegador, CDN y cortafuegos, balanceador, servidor web, servidor de aplicaciones, cachés y colas y servidores de bases de datos](diagramas/III.6-niveles-arquitectura.svg)

*Figura: capas lógicas (colores) repartidas en niveles físicos en arquitecturas de dos, tres y n niveles.*

### Componentes de una arquitectura web de n niveles

```text
 Navegador / app móvil
        │ HTTPS
 [CDN] ─▶ Cortafuegos / WAF ─▶ Balanceador de carga (L4/L7) ─▶ Proxy inverso
        ─▶ Servidores web (Apache httpd, Nginx, IIS: contenido estático, TLS)
        ─▶ Servidores de aplicaciones (Tomcat, WildFly, Kestrel: lógica de negocio, API)
        ─▶ Caché (Redis) · Colas de mensajes (RabbitMQ, Kafka)
        ─▶ Servidores de bases de datos (Oracle, PostgreSQL, SQL Server) y almacenamiento
```

**Operación**: el cliente envía una petición HTTPS; el balanceador la reparte entre las instancias (*round robin*, menor carga, afinidad de sesión); el servidor web sirve el contenido estático o reenvía al de aplicaciones; este ejecuta la lógica, consulta caché y base de datos y devuelve la respuesta. Para **escalar horizontalmente**, los servicios deben ser **sin estado** (*stateless*) y guardar la sesión fuera (caché distribuida, *token*).

### Sistemas distribuidos

Un **sistema distribuido** es un conjunto de ordenadores independientes que el usuario percibe como un único sistema coherente. Características: **compartición de recursos**, **apertura**, **concurrencia**, **escalabilidad** (aumentar la capacidad añadiendo máquinas; pregunta de 2024), **tolerancia a fallos** y **transparencia**:

| Transparencia | Oculta… |
|---|---|
| De acceso | Diferencias en cómo se accede a recursos locales y remotos |
| De ubicación | Dónde está el recurso |
| De migración y reubicación | Que el recurso se mueva |
| De replicación | Que haya varias copias |
| De concurrencia | Que otros usuarios compartan el recurso |
| De fallos | Los fallos y su recuperación |

El **teorema CAP** (Brewer) afirma que, ante una **partición de red**, un sistema distribuido tiene que elegir entre **consistencia** y **disponibilidad**; de ahí los modelos **BASE** (*basically available, soft state, eventual consistency*) de muchas bases NoSQL frente a las transacciones **ACID**.

### Evolución: SOA, microservicios y *serverless*

| Estilo | Características |
|---|---|
| **Monolito** | Una única aplicación desplegable; sencillo al principio, difícil de escalar y evolucionar por partes |
| **SOA** (arquitectura orientada a servicios) | Servicios de negocio reutilizables, contratos formales (WSDL), a menudo unidos por un **bus de servicios empresarial** (ESB) |
| **Microservicios** | Servicios **pequeños, independientes**, desplegables por separado, cada uno con sus datos, comunicados por API ligeras (REST, gRPC) o mensajería; composición por **orquestación** (un coordinador central) o **coreografía** (eventos); se despliegan en contenedores (tema IV.3) |
| ***Serverless*** (FaaS) | Funciones ejecutadas bajo demanda por el proveedor de nube (AWS Lambda, Azure Functions) |
| **Dirigida por eventos** (EDA) | Productores y consumidores desacoplados mediante eventos (publicación-suscripción) |

Patrones asociados: **API Gateway** (punto de entrada único: enrutamiento, autenticación, limitación de peticiones), *Backend for Frontend* (BFF), *service mesh*, CQRS, *circuit breaker* y *saga* (transacciones distribuidas compensables).

## Arquitecturas de servicios web

### Qué es un servicio web

Según el W3C, un **servicio web** es un sistema de software diseñado para permitir la **interacción entre máquinas a través de una red**, con una interfaz descrita en un formato procesable por máquina. Permite la **interoperabilidad** entre aplicaciones de distintas plataformas y lenguajes (Java, .NET, PHP…) usando protocolos y formatos estándar (HTTP, XML, JSON).

### SOA: roles y operaciones

La **arquitectura orientada a servicios** se basa en tres roles más el propio **servicio** (supuesto de 2024, sobre la Plataforma de Intermediación de Datos):

```text
                 Registro de servicios (UDDI)
                 ▲ 1. publicar        │ 2. buscar
                 │                    ▼
     Proveedor del servicio ◀──── 3. enlazar/invocar ──── Consumidor del servicio
          (WSDL)                    (mensajes SOAP)
```

- **Proveedor**: implementa el servicio y **publica** su descripción.
- **Registro** (*broker*): directorio donde se **publican y buscan** servicios.
- **Consumidor** (solicitante): **busca**, se **enlaza** e **invoca** el servicio.

Principios de diseño SOA: contrato estandarizado, **bajo acoplamiento**, abstracción, **reutilización**, autonomía, **sin estado**, descubrimiento y **composición** (orquestación con BPEL o coreografía).

### La pila clásica: SOAP, WSDL y UDDI

| Estándar | Organismo y versión vigente | Función |
|---|---|---|
| **XML** y **XML Schema** (XSD) | W3C | Formato de los mensajes y definición de tipos |
| **SOAP** | W3C, **SOAP 1.2** (2003; 2.ª ed. 2007) | **Protocolo de mensajería** basado en XML |
| **WSDL** | W3C: WSDL 1.1 (nota, 2001) y **WSDL 2.0** (recomendación, 2007) | **Describir** el servicio: qué operaciones ofrece, con qué mensajes, cómo y dónde se invoca |
| **UDDI** | OASIS, UDDI 3.0.2 | **Registro**: publicar y descubrir servicios |
| **WSIL** (*WS-Inspection Language*) | IBM y Microsoft (2001) | **Método alternativo de descubrimiento**, descentralizado: documentos de inspección publicados en el propio sitio del proveedor |

**SOAP** (la sigla original era *Simple Object Access Protocol*; desde la versión 1.2 es solo un nombre). La **última versión es la 1.2**: no existen SOAP 2.0 ni 2.1 (pregunta de 2026). Un mensaje SOAP es un documento **XML** (no JSON ni YAML) con:

```xml
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
  <soap:Header>
    <!-- información adicional: seguridad (WS-Security), direccionamiento, transacciones -->
  </soap:Header>
  <soap:Body>
    <consultarEstado xmlns="urn:notifica">
      <idNotificacion>123</idNotificacion>
    </consultarEstado>
    <!-- en caso de error: <soap:Fault> con Code, Reason, Detail -->
  </soap:Body>
</soap:Envelope>
```

- **Envelope** (sobre, obligatorio), **Header** (cabecera, opcional) y **Body** (cuerpo, obligatorio); los errores van en un elemento **Fault**.
- Es **independiente del transporte**, aunque casi siempre viaja sobre **HTTP** (`POST`); también SMTP o JMS.
- Estilos de mensaje: **document/literal** (el recomendado y el exigido por el perfil WS-I) y RPC/encoded (antiguo).
- Diferencias de versión: SOAP 1.1 usa el tipo `text/xml` y la cabecera `SOAPAction`; SOAP 1.2, el tipo `application/soap+xml`.
- Los adjuntos binarios se envían optimizados con **MTOM** y **XOP** (*XML-binary Optimized Packaging*, W3C 2005): los datos binarios se sacan del XML a partes MIME referenciadas con `xop:Include`, formando un **paquete XOP** (*XOP Package*; pregunta de 2023).

**WSDL 2.0** es «un lenguaje XML para **describir servicios web**» que permite describirlos a partir de un **modelo abstracto** de lo que ofrece el servicio y luego concretar cómo y dónde se accede (pregunta de 2026). Estructura:

| Parte | WSDL 1.1 | WSDL 2.0 | Qué define |
|---|---|---|---|
| Abstracta | `types` | `types` | Tipos de datos (XSD) |
| Abstracta | `message` | (eliminado: se usan los tipos) | Mensajes de entrada y salida |
| Abstracta | **`portType`** | **`interface`** | Conjunto de **operaciones** |
| Concreta | `binding` | `binding` | Protocolo y formato (SOAP, HTTP) |
| Concreta | `service` con `port` | `service` con **`endpoint`** | **Dirección** (URL) del servicio |

**Generación de código en Java** (supuestos de 2024 y 2026):

| Herramienta | Qué hace |
|---|---|
| **`wsimport`** (JAX-WS) | Genera las clases **cliente** a partir de un **WSDL**: `wsimport -p notificaciones notifica.wsdl` (`-p` paquete, `-d` directorio, `-keep` conserva el fuente) |
| `wsgen` (JAX-WS) | Genera artefactos a partir de una clase de servicio Java (en sentido contrario) |
| `xjc` (JAXB) | Genera clases a partir de un **XSD** |
| `schemagen` (JAXB) | Genera un XSD a partir de clases |
| **Apache CXF** (`wsdl2java`), Apache Axis2 | *Frameworks* para crear servicios y **generar clientes** SOAP (y REST) |

En .NET: WCF (en .NET Framework), CoreWCF y `dotnet-svcutil` para generar clientes.

### Especificaciones WS-\*

| Especificación | Organismo | Para qué |
|---|---|---|
| **WS-Security** | OASIS | **Firma** (XML Signature) y **cifrado** (XML Encryption) de mensajes SOAP y *tokens* de seguridad (usuario/contraseña, X.509, SAML). Es lo que se usa para **firmar las peticiones SOAP** (supuesto de 2024, integración con GEISER) |
| **WS-SecureConversation** | OASIS | **Establecer y compartir contextos de seguridad** y derivar claves de sesión para intercambios largos (pregunta de 2023) |
| WS-Trust | OASIS | Emitir, renovar y validar *tokens* de seguridad (STS) |
| WS-Federation | OASIS | Federación de identidades entre dominios |
| **WS-Policy** | W3C | Expresar **requisitos y capacidades** (políticas) de un servicio |
| **WS-Addressing** | W3C | Información de **direccionamiento** en la cabecera, independiente del transporte |
| WS-ReliableMessaging | OASIS | Entrega **fiable** de mensajes (una vez, en orden) |
| WS-AtomicTransaction / WS-Coordination | OASIS | **Transacciones** distribuidas |
| **WS-BPEL** | OASIS | **Orquestación** de servicios en procesos de negocio |
| **WS-I Basic Profile** | WS-I (integrado en OASIS) | Reglas de **interoperabilidad** entre implementaciones |

**SAML 2.0** (OASIS) es el estándar XML de intercambio de **aserciones de autenticación y autorización** que usan **Cl@ve** y el nodo **eIDAS**.

### REST

**REST** (*Representational State Transfer*) **no es un protocolo ni un estándar**, sino un **estilo arquitectónico** (un conjunto de principios) definido por **Roy Fielding** en su tesis doctoral del año **2000**. Se ajusta bien a las aplicaciones móviles y a los servicios web ligeros (pregunta de 2026). Sus **restricciones**:

1. **Cliente-servidor**: separación de responsabilidades.
2. **Sin estado** (*stateless*): cada petición contiene toda la información necesaria; **el servidor no guarda el estado del cliente entre peticiones** (preguntas de 2021 y 2024).
3. **Cacheable**: las respuestas indican si pueden almacenarse en caché.
4. **Interfaz uniforme**: identificación de **recursos** mediante **URI**, manipulación mediante **representaciones** (JSON, XML, HTML…), mensajes **autodescriptivos** y **HATEOAS** (hipermedia como motor del estado de la aplicación: las respuestas incluyen enlaces a las acciones posibles).
5. **Sistema en capas**: el cliente no sabe si habla con el servidor final o con un intermediario (proxy, caché, balanceador).
6. **Código bajo demanda** (opcional): el servidor puede enviar código ejecutable (JavaScript).

REST está **orientado a recursos** (no a operaciones como RPC) y usa **los métodos HTTP de forma explícita**; admite **varios formatos** (JSON, XML…) y **no usa UDDI** (eso es de SOAP; distractor de 2021). **URI** significa *Uniform Resource Identifier* (no «Unique»), por lo que se anuló una pregunta de 2023 con dos afirmaciones falsas.

**Diseño de una API REST**:

| Operación | Método y URI | Respuesta típica |
|---|---|---|
| Listar alumnos | `GET /alumnos?provincia=Madrid&page=2` | **200 OK** |
| Consultar uno | `GET /alumnos/42` | **200 OK** o **404 Not Found** |
| Crear | `POST /alumnos` (cuerpo JSON) | **201 Created** con cabecera `Location: /alumnos/43` (supuesto de 2026) |
| Reemplazar | `PUT /alumnos/42` | 200 OK o **204 No Content** |
| Modificar parcialmente | `PATCH /alumnos/42` | 200 OK o 204 No Content |
| Borrar | `DELETE /alumnos/42` | **204 No Content** |

Buenas prácticas: **sustantivos en plural** y no verbos en las URI, jerarquías (`/alumnos/42/matriculas`), filtros, orden y paginación con parámetros, **versionado** (`/v1/…` o cabecera), códigos de estado correctos, **HTTPS** siempre y documentación con **OpenAPI**. El **modelo de madurez de Richardson** mide lo «REST» que es una API: nivel 0 (un único punto de entrada, estilo RPC), 1 (recursos), 2 (verbos HTTP y códigos) y 3 (hipermedia, HATEOAS).

### Métodos y códigos de estado HTTP (RFC 9110)

| Método | **Seguro** (no modifica) | **Idempotente** (repetirlo da el mismo efecto) | Uso |
|---|---|---|---|
| `GET` | Sí | Sí | Obtener |
| `HEAD` | Sí | Sí | Como GET, solo cabeceras |
| `OPTIONS` | Sí | Sí | Opciones admitidas (preflight de CORS) |
| `POST` | No | **No** | Crear o procesar |
| **`PUT`** | **No** | **Sí** | Crear o **reemplazar** en una URI conocida (pregunta de 2026: idempotente pero no seguro) |
| `DELETE` | No | Sí | Borrar |
| `PATCH` (RFC 5789) | No | No (en general) | Modificación parcial |
| `CONNECT` | No | No | Túnel (proxy) |

| Clase | Significado | Códigos frecuentes |
|---|---|---|
| **1xx** | Informativos | 100 Continue, 101 Switching Protocols (WebSocket) |
| **2xx** | **Éxito** | **200 OK**, **201 Created**, 202 Accepted (aceptada, se procesará después), **204 No Content** |
| **3xx** | **Redirección** | 301 Moved Permanently, 302 Found, 304 Not Modified, 307 y 308 |
| **4xx** | **Error del cliente** | **400** Bad Request, **401** Unauthorized (falta autenticación), **403** Forbidden (autenticado pero sin permiso), **404** Not Found, 405 Method Not Allowed, 409 Conflict, 415 Unsupported Media Type, 422 Unprocessable Content, 425 Too Early, **429 Too Many Requests** (límite de peticiones, *rate limiting*; supuesto de 2026) |
| **5xx** | **Error del servidor** | **500** Internal Server Error, 501, **502** Bad Gateway, **503** Service Unavailable, 504 Gateway Timeout |

### Formatos y documentación de API

- **JSON** (RFC 8259): objetos (pares nombre/valor **no ordenados**), *arrays*, cadenas, números, `true`, `false` y `null`; el validador estructural es **JSON Schema**. Ligero y nativo en JavaScript; el más usado en REST.
- **XML** con **XSD**: el formato de SOAP; más verboso, con espacios de nombres, validación fuerte y firma XML.
- Otros: YAML (configuración y OpenAPI), Protocol Buffers (gRPC, binario).
- **OpenAPI** (antes Swagger; **OpenAPI 3.2.0**, septiembre de 2025, de la OpenAPI Initiative/Linux Foundation): describe las API REST en **YAML o JSON** (supuesto de 2026); herramientas Swagger UI y Swagger Editor, generación de clientes y servidores.
- **RAML** (YAML) y API Blueprint (Markdown) son alternativas para documentar REST; **WSDL** documenta SOAP. **«REST» no es un formato de documentación** (supuesto de 2024).

```yaml
openapi: 3.1.0
info: { title: API de alumnos, version: 1.0.0 }
paths:
  /alumnos/{id}:
    get:
      summary: Obtiene un alumno
      parameters:
        - { name: id, in: path, required: true, schema: { type: integer } }
      responses:
        '200': { description: Alumno encontrado }
        '404': { description: No existe }
      security: [ { bearerAuth: [] } ]
components:
  securitySchemes:
    bearerAuth: { type: http, scheme: bearer, bearerFormat: JWT }
```

### Seguridad de los servicios web

| Mecanismo | Uso |
|---|---|
| **TLS** (HTTPS) | Confidencialidad e integridad en el transporte; autenticación mutua con certificados (mTLS) entre sistemas |
| **WS-Security** | Seguridad **a nivel de mensaje** en SOAP (firma y cifrado XML), que se mantiene a través de intermediarios |
| **Claves de API** | Identificar la aplicación cliente (no al usuario) |
| **OAuth 2.0** (RFC 6749) | **Autorización delegada**: un servidor de autorización emite *access tokens* para que un cliente acceda a una API |
| ***Bearer tokens*** (RFC 6750) | Cabecera `Authorization: Bearer <token>` |
| **JWT** (*JSON Web Token*, RFC 7519) | *Token* autocontenido `cabecera.carga.firma` en Base64URL, firmado (JWS) o cifrado (JWE). La cabecera `Authorization: Bearer eyJhbG…` del supuesto de 2026 indica autenticación con **JWT** |
| **OpenID Connect** | Capa de **autenticación** sobre OAuth 2.0 (*ID token* en formato JWT) |
| **SAML 2.0** | Federación de identidades en XML (Cl@ve, eIDAS) |
| **CORS** | El servidor indica qué **orígenes** pueden llamar a la API desde JavaScript del navegador (tema III.8) |
| **Limitación de peticiones** (*rate limiting*) | Protege frente a abusos y denegación de servicio; respuesta **429** |
| **API Gateway** | Centraliza autenticación, cuotas, registro y versionado |

### Otras tecnologías de integración

| Tecnología | Características |
|---|---|
| **GraphQL** (Facebook, 2015; GraphQL Foundation) | Lenguaje de consulta para API: el cliente pide **exactamente los campos** que necesita en una única petición a un punto de acceso |
| **gRPC** (Google) | RPC de alto rendimiento sobre **HTTP/2** con **Protocol Buffers** (binario); *streaming* bidireccional; habitual entre microservicios |
| **WebSocket** (RFC 6455) | Canal **bidireccional y persistente** sobre TCP iniciado con un *handshake* HTTP; tiempo real |
| *Server-Sent Events* | El servidor envía eventos al navegador por HTTP (unidireccional) |
| *Webhooks* | El servidor llama a una URL del cliente cuando ocurre un evento |
| **Mensajería**: AMQP 1.0 (OASIS; ISO/IEC 19464), MQTT 5.0 (OASIS; IoT), Kafka | Comunicación **asíncrona** y desacoplada: colas (punto a punto) y temas (publicación-suscripción) |
| **ESB** (bus de servicios empresarial) | Integración centralizada: enrutamiento, transformación y orquestación de mensajes (Mule, WSO2, Apache Camel) |

### Comparativa SOAP frente a REST

| Aspecto | SOAP | REST |
|---|---|---|
| Naturaleza | **Protocolo** (W3C) | **Estilo arquitectónico** |
| Formato | Solo **XML** | **JSON** (sobre todo), XML, texto… |
| Orientación | **Operaciones** (RPC/documento) | **Recursos** (URI) y verbos HTTP |
| Contrato | **WSDL** (formal, generación de código) | **OpenAPI** (opcional) |
| Descubrimiento | **UDDI**, WSIL | Documentación, hipermedia |
| Transporte | HTTP, SMTP, JMS… | **HTTP** |
| Estado | Puede mantener estado (WS-\*) | **Sin estado** |
| Seguridad | **WS-Security** (mensaje) + TLS | TLS + OAuth 2.0/JWT |
| Transacciones y fiabilidad | WS-AtomicTransaction, WS-ReliableMessaging | No estándar (patrones como *saga*) |
| Caché | No | Sí (HTTP) |
| Uso | Integraciones empresariales y de la Administración (PID, SCSP, Notific@, GEISER…) | API públicas, móviles, *front-ends* JavaScript, microservicios |

### Pruebas de servicios web

- **Postman** e Insomnia: peticiones HTTP manuales o automatizadas. Para enviar un **JSON** en el cuerpo se elige el tipo **`raw`** (con JSON) (supuesto de 2026); otros tipos son `form-data`, `x-www-form-urlencoded`, `binary` y `GraphQL`.
- **SoapUI** (pruebas SOAP y REST), `curl`, colecciones automatizadas en integración continua.
- Simulación de servicios (*mocks*) y pruebas de contrato.

```bash
curl -X POST https://api.ejemplo.gob.es/v1/alumnos \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer $TOKEN" \
     -d '{"dni":"12345678Z","nombre":"Emilia"}' -i      # espera HTTP/1.1 201 Created
```

### Servicios web en la Administración

La interoperabilidad entre Administraciones se apoya en servicios web: la **Plataforma de Intermediación de Datos** (PID, sustitución de certificados en papel con el protocolo **SCSP**, basado en SOAP y WS-Security), **Notific@**, **GEISER** (registro), **Cl@ve** (SAML 2.0) y la **Red SARA**. La **NTI de Protocolos de intermediación de datos** prevé que los intercambios se implementen mediante **servicios web**.

## Normativa y estándares clave

| Estándar | Qué regula | Puntos clave |
|---|---|---|
| W3C **SOAP 1.2** (2003, 2.ª ed. 2007) | Mensajería XML | Envelope, Header, Body, Fault; `application/soap+xml` |
| W3C **WSDL 2.0** (2007) y WSDL 1.1 (2001) | Descripción de servicios | `interface` (antes `portType`), `binding`, `service`/`endpoint` |
| OASIS **UDDI 3.0.2** | Registro de servicios | Publicar y buscar |
| W3C XOP y MTOM (2005) | Optimización de binarios en SOAP | Paquete XOP, `xop:Include` |
| OASIS **WS-Security 1.1**, WS-SecureConversation, WS-Trust | Seguridad de mensajes SOAP | Firma y cifrado XML, contextos de seguridad |
| **RFC 9110** (HTTP Semantics, 2022) | Métodos, códigos y cabeceras HTTP | Métodos seguros e idempotentes |
| RFC 6585 | Códigos HTTP adicionales | **429** Too Many Requests |
| **RFC 8259** | JSON | Tipos: objeto, *array*, número, cadena, `true`, `false`, `null` |
| **OpenAPI 3.2.0** (2025) | Descripción de API REST | YAML o JSON |
| RFC 6749, 6750 y **7519** | OAuth 2.0, *Bearer tokens* y **JWT** | Autorización delegada con *tokens* |
| OASIS **SAML 2.0** | Aserciones de identidad | Cl@ve, eIDAS |
| RFC 6455 | WebSocket | Comunicación bidireccional |
| Fielding (2000) | Estilo REST | Restricciones: cliente-servidor, sin estado, caché, interfaz uniforme, capas, código bajo demanda |
| NTI de Protocolos de intermediación de datos (ENI) | Intercambio de datos entre Administraciones | Servicios web, PID, SCSP |

## Lo que más cae en el examen

En los nueve exámenes analizados hay **31 preguntas** de este tema según nuestra clasificación: 21 de ingreso libre (1 en 2021, 4 en 2023, 6 en 2024, 3 en 2025 y 7 en el extraordinario) y 10 de promoción interna. Va en aumento: el examen extraordinario de julio de 2026 tuvo siete.

| Concepto | Preguntas | Exámenes |
|---|---|---|
| **REST**: sin estado, orientado a recursos, no usa UDDI, estilo arquitectónico; métodos idempotentes (`PUT`); códigos **201** y **429**; JWT; Postman `raw` | 12 | LI 2021, 2023, 2024, 2025 y 2025‑ext; PI 2024 y 2025 |
| **SOAP y WSDL**: última versión 1.2, mensajes XML, WSDL 2.0, `wsimport`, Apache CXF, XOP | 8 | LI 2023, 2024, 2025 y 2025‑ext; PI 2023 y 2025 |
| **Descubrimiento y SOA**: UDDI, WSIL, componentes de SOA (registro), estándares de servicios web (HEVC no lo es) | 5 | LI 2023 y 2024; PI 2021 y 2023 |
| **Documentación de API**: OpenAPI en YAML/JSON, RAML, WSDL; «REST» no documenta | 3 | LI 2024 y 2025‑ext; PI 2024 |
| **Seguridad WS-\***: WS-Security (firma de peticiones SOAP), WS-SecureConversation | 2 | LI 2023 y 2024; PI 2024 |
| **Cliente/servidor y sistemas distribuidos**: ventajas de la arquitectura multinivel, escalabilidad | 2 | LI 2024; PI 2023 |

## Trampas habituales

- **REST no es un protocolo** ni un estándar del W3C: es un **estilo arquitectónico** (Fielding, 2000).
- **Sin estado**: el servidor **no** guarda el estado del cliente entre peticiones; cada petición es autosuficiente.
- **REST no usa UDDI ni WSDL** (son de SOAP); REST admite JSON **y** XML; su interfaz es **HTTP** (no FTP).
- **URI** = *Uniform* Resource Identifier (no *Unique*).
- **SOAP**: última versión **1.2**; mensajes **XML**; elementos Envelope, Header, Body y Fault.
- **WSDL** describe; **UDDI** registra; **SOAP** transporta; **WSIL** es descubrimiento alternativo, descentralizado.
- **WSDL 2.0**: `portType` pasa a llamarse `interface` y `port`, `endpoint`; WSDL no es un protocolo de mensajería (eso es SOAP) ni define verbos HTTP.
- **`wsimport`** genera el cliente desde un WSDL; `xjc`, desde un XSD; `wsgen`, desde una clase Java.
- **WS-Security** firma y cifra mensajes SOAP; **WS-SecureConversation** establece contextos de seguridad compartidos; **WS-Policy** expresa políticas; **WS-Addressing**, direccionamiento.
- **Idempotente ≠ seguro**: `PUT` y `DELETE` son idempotentes pero no seguros; `GET` es ambas cosas; `POST` ninguna.
- **201 Created** al crear (con `Location`); **204** sin contenido; **401** sin autenticar frente a **403** sin permiso; **429** por límite de peticiones; **503** servicio no disponible.
- Componentes SOA: servicio, **proveedor**, **consumidor** y **registro** (no «orquestador», «depurador» ni «comparador»).
- Las arquitecturas multinivel **no** reducen las comunicaciones: las aumentan.
- **OpenAPI** se escribe en **YAML o JSON** (no XML ni HTML).
- `Authorization: Bearer eyJ…` → **JWT** (las tres partes separadas por puntos empiezan por `eyJ`, que es `{"` en Base64).

## Repaso rápido

- Cliente/servidor: el cliente pide (activo), el servidor atiende (pasivo); *middleware* en medio.
- Gartner: presentación distribuida, presentación remota, lógica distribuida, gestión de datos remota y base de datos distribuida.
- Capas lógicas (*layers*) frente a niveles físicos (*tiers*); tres niveles: presentación, negocio y datos.
- Multinivel: flexibilidad, escalabilidad, extensibilidad y seguridad, a cambio de complejidad y más tráfico.
- Sistemas distribuidos: transparencia, escalabilidad, tolerancia a fallos; teorema CAP.
- SOA: proveedor, consumidor y registro (publicar, buscar, enlazar); ESB; microservicios.
- SOAP 1.2 (W3C): XML, Envelope/Header/Body/Fault, independiente del transporte.
- WSDL 2.0: describe el servicio (interface, binding, service/endpoint). UDDI: registro (OASIS). WSIL: descubrimiento alternativo.
- MTOM/XOP: adjuntos binarios en SOAP.
- WS-Security, WS-SecureConversation, WS-Trust, WS-Policy, WS-Addressing, WS-ReliableMessaging, WS-BPEL, WS-I.
- REST: cliente-servidor, sin estado, caché, interfaz uniforme (URI, representaciones, HATEOAS), capas, código bajo demanda.
- Métodos: GET/HEAD/OPTIONS seguros; PUT/DELETE idempotentes; POST ni seguro ni idempotente.
- Códigos: 2xx éxito, 3xx redirección, 4xx error del cliente, 5xx error del servidor; 201, 204, 401, 403, 404, 429, 503.
- OpenAPI 3.2.0 (YAML/JSON), RAML; JSON (RFC 8259).
- OAuth 2.0 autoriza; OpenID Connect autentica; JWT = cabecera.carga.firma; SAML 2.0 en Cl@ve.
- GraphQL (el cliente elige campos), gRPC (HTTP/2 + Protocol Buffers), WebSocket (bidireccional).

## Fuentes

- W3C, *SOAP Version 1.2 Part 1: Messaging Framework (Second Edition)*: https://www.w3.org/TR/soap12-part1/
- W3C, *Web Services Description Language (WSDL) Version 2.0 Part 1: Core Language*: https://www.w3.org/TR/wsdl20/
- W3C, *XML-binary Optimized Packaging (XOP)*: https://www.w3.org/TR/xop10/
- W3C, *Web Services Architecture* (nota de 2004): https://www.w3.org/TR/ws-arch/
- OASIS, *UDDI Version 3.0.2*: https://www.oasis-open.org/committees/uddi-spec/doc/spec/v3/uddi-v3.0.2-20041019.htm
- OASIS, *Web Services Security* (WSS): https://www.oasis-open.org/committees/tc_home.php?wg_abbrev=wss
- OASIS, *WS-SecureConversation 1.4*: https://docs.oasis-open.org/ws-sx/ws-secureconversation/v1.4/ws-secureconversation.html
- R. T. Fielding (2000), *Architectural Styles and the Design of Network-based Software Architectures*: https://ics.uci.edu/~fielding/pubs/dissertation/top.htm
- RFC 9110, *HTTP Semantics*: https://www.rfc-editor.org/rfc/rfc9110
- RFC 6585, *Additional HTTP Status Codes* (429): https://www.rfc-editor.org/rfc/rfc6585
- RFC 8259, *JSON*: https://www.rfc-editor.org/rfc/rfc8259
- RFC 7519, *JSON Web Token*: https://www.rfc-editor.org/rfc/rfc7519
- RFC 6749, *OAuth 2.0*: https://www.rfc-editor.org/rfc/rfc6749
- OpenAPI Initiative, *OpenAPI Specification*: https://spec.openapis.org/oas/latest.html
- Jakarta XML Web Services (herramientas `wsimport` y `wsgen`): https://jakarta.ee/specifications/xml-web-services/
- Apache CXF: https://cxf.apache.org/
