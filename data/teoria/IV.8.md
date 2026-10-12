# IV.8 · Internet: arquitectura, origen y evolución, servicios y protocolos HTTP, HTTPS y SSL/TLS

**Internet** es la red de redes que une a unos **6 000 millones de personas** (tres cuartas partes de la población mundial, según la UIT en 2025) y sobre la que hoy se presta casi cualquier servicio, también los de la Administración electrónica. Este tema explica **cómo está construida** (sistemas autónomos, proveedores, puntos neutros, DNS, organismos de gobierno y estándares), **de dónde viene** (de ARPANET en 1969 a la web, la nube y el Internet móvil) y **cómo está en 2026**; repasa sus **principales servicios** (web, correo, DNS, transferencia de ficheros, acceso remoto, mensajería, voz y vídeo…) y se detiene en los protocolos que el título nombra: **HTTP** (mensajes, métodos, códigos de estado, cabeceras, *cookies*, caché, versiones 1.1, 2 y 3), **HTTPS** (certificados, HSTS, configuración segura) y **SSL/TLS** (versiones, *handshake* de TLS 1.2 y 1.3, suites de cifrado, ataques y criptografía poscuántica). En el examen caen sobre todo **códigos de estado HTTP**, **puertos**, **TLS 1.3** y las **recomendaciones del CCN**. El modelo TCP/IP, IP, TCP, UDP y los registros DNS están en el tema IV.7; el correo, en IV.3; la seguridad de redes, cortafuegos y VPN, en IV.9.

## Internet: concepto y arquitectura de red

### Qué es Internet

Internet es un **conjunto mundial de redes autónomas interconectadas** que usan la **familia de protocolos TCP/IP** y un **espacio de direcciones IP único y global**, y que ofrecen servicios de comunicación a cualquier equipo conectado. Ninguna entidad la posee ni la controla entera: cada red (de un operador, una universidad, una empresa o una Administración) se gestiona de forma independiente y se conecta con las demás mediante acuerdos.

Hay que distinguir:

- **Internet** (con mayúscula): la red pública global.
- **Intranet**: red privada de una organización que usa las mismas tecnologías (TCP/IP, web) para sus usuarios internos.
- **Extranet**: parte de la intranet abierta, de forma controlada, a terceros autorizados (proveedores, otras Administraciones).
- **La web** (*World Wide Web*): **uno de los servicios** de Internet (documentos hipertexto enlazados y servidos por HTTP), no un sinónimo de Internet.

### Principios de diseño

| Principio | Significado |
|---|---|
| **Conmutación de paquetes** | Los datos se trocean en datagramas que se encaminan de forma independiente; los recursos se comparten (tema IV.6) |
| **Mejor esfuerzo** (*best effort*) | IP no garantiza entrega, orden ni plazos; la fiabilidad la añaden los extremos (TCP, QUIC) |
| **Extremo a extremo** (*end-to-end*) | La inteligencia está en los equipos finales; la red se limita a transportar paquetes |
| **Reloj de arena** (*hourglass*) | **IP es la «cintura estrecha»**: muchas tecnologías de acceso debajo (Ethernet, Wi‑Fi, 5G, fibra) y muchas aplicaciones encima, todas sobre un único protocolo de red |
| **Descentralización** | No hay un centro único: si cae un nodo, el tráfico se desvía por otros caminos |
| **Estándares abiertos** | Las especificaciones (RFC) son públicas y gratuitas; lema del IETF: «consenso aproximado y código que funciona» |
| **Principio de robustez** | «Sé conservador en lo que envías y liberal en lo que aceptas» (RFC 761/1122), hoy matizado por motivos de seguridad |

### Estructura: redes de acceso, proveedores y puntos neutros

Internet tiene una estructura **jerárquica y mallada a la vez**:

```text
                    ┌──────────── Proveedores de nivel 1 (tránsito mundial, peering entre ellos) ────────────┐
                    │        Lumen, Arelion, NTT, Telxius (Telefónica), Cogent, GTT, Orange…                  │
                    └───────▲──────────────────────▲─────────────────────────────▲───────────────────────────┘
                            │ tránsito (pago)      │                             │
                  ┌─────────┴───────┐     ┌────────┴────────┐       ┌────────────┴───────────┐
                  │ Proveedores de  │◀───▶│ Punto neutro    │◀────▶ │ CDN y nubes            │
                  │ nivel 2         │     │ (IXP: ESpanix,  │peering│ (Akamai, Cloudflare,   │
                  │ (regionales)    │     │ DE-CIX Madrid…) │       │ Google, AWS, Microsoft)│
                  └─────────▲───────┘     └────────▲────────┘       └────────────────────────┘
                            │                      │
                  ┌─────────┴──────────────────────┴───────┐
                  │ Proveedores de acceso (nivel 3, ISP)    │  FTTH, cable, xDSL, 4G/5G, satélite
                  └─────────▲──────────────────────────────┘
                            │
             Hogares, empresas, Administraciones (redes de cliente, intranets, Red SARA)
```

| Elemento | Qué es |
|---|---|
| **Sistema autónomo** (AS) | Conjunto de redes bajo **una misma administración y política de encaminamiento**, identificado por un **número de sistema autónomo** (ASN, de 16 bits y hoy de **32 bits**, RFC 6793). Dentro se usan protocolos interiores (OSPF, IS-IS); **entre sistemas autónomos, BGP‑4** (tema IV.7) |
| **Proveedor de servicios de Internet** (ISP) | Da acceso a clientes (nivel 3), agrega tráfico regional (nivel 2) o forma el núcleo mundial (**nivel 1**: llega a toda Internet **sin pagar tránsito**, solo con *peering*) |
| **Tránsito** | Contrato por el que un proveedor **paga** a otro para llegar a todo Internet |
| ***Peering*** | Intercambio de tráfico **entre iguales**, normalmente sin pago, de las redes de cada uno y sus clientes |
| **Punto neutro** (IXP, *Internet Exchange Point*) | Infraestructura (conmutadores Ethernet en un centro de datos) donde **muchas redes se interconectan para hacer *peering***: abarata, reduce la latencia y mantiene local el tráfico local. En España: **ESpanix** (Madrid, desde 1997), DE-CIX Madrid, CATNIX (Barcelona) y otros regionales |
| **CDN** (red de distribución de contenidos) | Servidores repartidos por el mundo que guardan copias del contenido **cerca del usuario** (Akamai, Cloudflare, Fastly, CloudFront); hoy sirven buena parte del tráfico web y absorben ataques DDoS |
| **Centros de datos y nubes** | Alojan servicios; los grandes proveedores (*hiperescala*) tienen redes troncales propias |
| **Cables submarinos y troncales de fibra** | Transportan casi todo el tráfico intercontinental (no los satélites) |
| **Redes de acceso** | FTTH (GPON, XGS-PON), cable (DOCSIS), xDSL, 4G/5G, acceso fijo inalámbrico, satélite de **órbita baja** (Starlink, OneWeb) (tema IV.6) |

### Direcciones y nombres

- **Direcciones IP**: las reparte la **IANA** a los cinco **registros regionales** (RIR): **RIPE NCC** (Europa, Oriente Medio y Asia central), ARIN (Norteamérica), APNIC (Asia-Pacífico), LACNIC (Latinoamérica y Caribe) y AFRINIC (África); estos, a los **registros locales** (LIR, normalmente operadores) y estos, a los clientes. El conjunto libre de IPv4 de la IANA se **agotó el 3 de febrero de 2011** y el del RIPE NCC en **noviembre de 2019**; de ahí el uso masivo de NAT y CGN y la migración a **IPv6** (tema IV.7).
- **Nombres de dominio**: el **DNS** es una base de datos **jerárquica y distribuida**. En la cima está la **zona raíz** («.»), servida por **13 identidades de servidores raíz** (letras **A a M**, nombres `a.root-servers.net` … `m.root-servers.net`) que gestionan **12 organizaciones** y que, gracias a *anycast*, se replican en **más de 2 000 instancias** por todo el mundo (2 047 en octubre de 2026).
- **Dominios de primer nivel** (TLD): **genéricos** (gTLD: `.com`, `.org`, `.net`, `.info` y más de mil «nuevos gTLD» desde 2013, como `.madrid` o `.bcn`), **patrocinados** (`.edu`, `.gov`, `.int`, `.museum`), **geográficos o de país** (ccTLD de dos letras según ISO 3166: `.es`, `.fr`, `.eu`) e **internacionalizados** (IDN, con caracteres no ASCII). Existe además `.arpa` para infraestructura (resolución inversa: `in-addr.arpa`, `ip6.arpa`).
- El **`.es`** fue delegado el **14 de abril de 1988** y lo gestiona **Red.es** (entidad pública adscrita al ministerio competente en transformación digital). Los registros se hacen a través de **agentes registradores** acreditados.

### Gobernanza y organismos

Internet se gobierna con un **modelo de múltiples partes interesadas** (*multistakeholder*): gobiernos, empresas, comunidad técnica, académica y sociedad civil.

| Organismo | Qué hace |
|---|---|
| **ISOC** (*Internet Society*, 1992) | Asociación sin ánimo de lucro que promueve el desarrollo abierto de Internet; **paraguas organizativo y jurídico del IETF** |
| **IETF** (*Internet Engineering Task Force*, 1986) | **Crea los estándares técnicos de Internet** (TCP/IP, HTTP, TLS, DNS…) en grupos de trabajo abiertos; los publica como **RFC** |
| **IESG** | Dirección técnica del IETF: aprueba que un documento sea estándar |
| **IAB** (*Internet Architecture Board*) | Supervisa la **arquitectura** de Internet y el proceso de estándares, y vela por las relaciones con la IANA y con el editor de las RFC (*RFC Editor*) |
| **IRTF** | Investigación a largo plazo (por ejemplo, criptografía, en el grupo CFRG) |
| **IANA** (operada por **PTI**, filial de ICANN) | **Coordina los identificadores únicos**: zona raíz del DNS, bloques de direcciones IP y ASN que entrega a los RIR, y registros de parámetros de protocolos (**puertos**, códigos, suites TLS) |
| **ICANN** (1998) | Organización sin ánimo de lucro que **coordina el sistema de nombres de dominio y los identificadores únicos**: políticas de gTLD, acreditación de registradores. Desde el **1 de octubre de 2016** la supervisión de las funciones IANA dejó de depender del Gobierno de EE. UU. (transición a la comunidad global) |
| **RIR** (RIPE NCC, ARIN, APNIC, LACNIC, AFRINIC) | Asignan direcciones IP y ASN en su región |
| **W3C** (*World Wide Web Consortium*, 1994) | Estándares de la **web**: CSS, WCAG, XML, WebAuthn, recomendaciones de HTML en colaboración con el **WHATWG** (que mantiene el estándar vivo de HTML, DOM, Fetch y URL) |
| **UIT** (ITU) | Agencia de la **ONU** especializada en telecomunicaciones (espectro, normas UIT‑T); no fija los protocolos de Internet |
| **IGF** (Foro para la Gobernanza de Internet, 2006) | Foro de diálogo de la ONU, sin capacidad normativa, nacido de la Cumbre Mundial sobre la Sociedad de la Información (Túnez, 2005) |
| En España | **Red.es** (`.es`), **CNMC** (regulador de los mercados de telecomunicaciones), el ministerio competente en telecomunicaciones y la **Ley 11/2022 General de Telecomunicaciones**, **INCIBE** (ciberseguridad de ciudadanos y empresas), **CCN-CERT** (sector público), **RedIRIS** (red académica) y la **Red SARA** (interconexión de las Administraciones) |

**Las RFC.** Los documentos del IETF empiezan como ***Internet-Drafts*** (borradores, caducan a los seis meses) y, si se aprueban, se publican como **RFC** (*Request for Comments*), con número correlativo e **inmutables** (una RFC nunca se modifica: se publica otra que la **actualiza** o la **deja obsoleta**). Categorías: **vía de estándares** (*Standards Track*), con dos niveles de madurez desde la RFC 6410 (2011): **Proposed Standard** e **Internet Standard** (que recibe además un número **STD**); **mejores prácticas** (**BCP**); informativas; experimentales; e históricas. La numeración superó la **RFC 10000** en 2026.

### Modelos de comunicación

- **Cliente-servidor**: el cliente pide y el servidor, con dirección conocida, responde (web, correo, DNS).
- **Entre iguales** (*peer-to-peer*, P2P): todos los nodos son a la vez clientes y servidores (BitTorrent, algunas llamadas WebRTC, blockchain).
- **Publicación/suscripción**: los productores publican en un intermediario (*broker*) y los consumidores se suscriben a temas (MQTT en IoT).
- **Computación en la nube y en el borde** (*edge*): servicios bajo demanda en centros de datos remotos o cerca del usuario (IaaS, PaaS, SaaS; tema II.2 y IV.2).

## Origen y evolución de Internet

### Antecedentes

A principios de los sesenta, **Paul Baran** (RAND) propuso una red de comunicaciones **distribuida** capaz de sobrevivir a la destrucción de nodos, **Donald Davies** (NPL, Reino Unido) acuñó el término **paquete** y **Leonard Kleinrock** (MIT, UCLA) desarrolló la teoría de colas aplicada a la conmutación de paquetes. La agencia de proyectos de investigación avanzada del Departamento de Defensa de EE. UU. (**ARPA**, luego DARPA), creada en 1958, financió **ARPANET** para compartir recursos de computación entre universidades y centros de investigación.

### Cronología

| Año | Hito |
|---|---|
| **1969** | **ARPANET**: el **29 de octubre** se envía el primer mensaje entre la **UCLA** y el **SRI** (Stanford); en diciembre ya hay **cuatro nodos** (UCLA, SRI, UC Santa Bárbara y Universidad de Utah), conectados mediante IMP (*Interface Message Processors*). En abril se había publicado la **RFC 1** |
| 1970-1972 | Protocolo **NCP**; **Ray Tomlinson** envía el primer **correo electrónico** entre máquinas y elige la **@** (1971); demostración pública de ARPANET (1972); Telnet y FTP |
| **1974** | **Vint Cerf y Bob Kahn** publican el diseño de **TCP** («padres de Internet»); TCP se divide luego en TCP e IP (1978) |
| 1981 | RFC 791 (IP) y RFC 793 (TCP) |
| **1983** | **1 de enero**: ARPANET abandona NCP y adopta **TCP/IP** (*flag day*); la parte militar se separa (MILNET); **DNS** (Paul Mockapetris, RFC 882 y 883; hoy RFC 1034 y 1035) |
| 1984-1985 | Primeros TLD (`.com`, `.edu`, `.gov`, `.org`, `.net`, `.mil`); primer dominio `.com` registrado (1985) |
| **1986** | **NSFNET**, troncal de la Fundación Nacional de la Ciencia de EE. UU. (56 kbit/s, luego T1 y T3); primera reunión del **IETF** |
| 1988 | **Gusano de Morris** (primer gran incidente de seguridad; nace el CERT/CC); delegación del **`.es`** y creación de **RedIRIS** |
| **1989-1991** | **Tim Berners-Lee**, en el **CERN**, propone (marzo de 1989) un sistema de información con **hipertexto**: crea **HTML, HTTP y las URL**, el primer servidor y el primer navegador (1990); la web se abre al público en 1991. ARPANET se desmantela (1990) |
| **1993** | El CERN libera la web al **dominio público** (30 de abril); navegador gráfico **Mosaic** (NCSA) |
| 1994-1995 | **Netscape Navigator** y **SSL**; se crea el **W3C**; **NSFNET deja de ser la troncal** (1995) y el tráfico pasa a redes **comerciales**: nace la Internet comercial |
| 1996-1999 | HTTP/1.0 (1996) y **HTTP/1.1** (1997-1999); **ICANN** (1998); **TLS 1.0** (1999); Wi‑Fi 802.11b (1999); auge de las «puntocom» |
| 2000-2009 | Estallido de la burbuja (2000); ADSL de banda ancha; **Web 2.0** (participativa, redes sociales, 2004); **iPhone** (2007) e Internet móvil; HTML5 en desarrollo; computación en la nube (AWS, 2006) |
| **2011-2016** | **Agotamiento de IPv4 en la IANA** (2011); lanzamiento mundial de IPv6 (6‑6‑2012); revelaciones de Snowden (2013) y cifrado generalizado; **HTTP/2** (2015); Let's Encrypt (certificados gratuitos y automáticos, 2015-2016); **transición de la IANA** (2016) |
| **2018-2022** | **TLS 1.3** (RFC 8446, 2018); RGPD; 5G comercial (2019); pandemia y teletrabajo masivo (2020); **QUIC** (RFC 9000, 2021); **HTTP/3** y reorganización de HTTP en las RFC 9110 a 9114 (2022) |
| **2024-2026** | Criptografía **poscuántica** en los navegadores (ML-KEM, FIPS 203, 2024); la UIT cifra en **6 000 millones** los usuarios (2025); IPv6 supera por primera vez el **50 %** del tráfico hacia Google (un día de marzo de 2026); nuevas RFC: **ECH** (RFC 9849), método **QUERY** de HTTP (RFC 10008), **TLS 1.3 revisado** (RFC 9846) e **intercambio híbrido poscuántico** (RFC 10024); Chrome 154 (octubre de 2026) activa por defecto **«Usar siempre conexiones seguras»** |

### Evolución de la web

| Etapa | Rasgos |
|---|---|
| **Web 1.0** (1991-2003) | Páginas **estáticas** de solo lectura, pocos autores y muchos lectores; directorios y primeros buscadores |
| **Web 2.0** (término popularizado por Tim O'Reilly en 2004) | Web **participativa y social**: blogs, wikis, redes sociales, contenido generado por usuarios, AJAX, APIs abiertas |
| **Web semántica** (a veces llamada Web 3.0) | Datos con significado procesable por máquinas: **RDF**, **OWL**, SPARQL, datos enlazados y datos abiertos |
| **Web3** | Propuesta descentralizada basada en *blockchain*, criptoactivos y contratos inteligentes |
| **Web móvil, nube e IA** | Aplicaciones móviles y PWA, SaaS, contenidos personalizados, asistentes y agentes de inteligencia artificial que consumen y generan contenido |

### Internet en España

- **1985**: primera conexión española a Internet en la **ETSI de Telecomunicación de la UPM** (correo electrónico a través de EUnet; en 2025 se celebraron sus 40 años).
- **1988**: nace **RedIRIS**, la red académica y de investigación (hoy gestionada por Red.es), y se delega el dominio **`.es`**; en **1990** RedIRIS consigue conectividad IP con el resto de Internet.
- **1992-1995**: primeros proveedores comerciales (**Goya Servicios Telemáticos**, 1992), Servicom e **Infovía** de Telefónica (1995).
- **1997**: punto neutro **ESpanix**. **2002**: Ley 34/2002 de servicios de la sociedad de la información y del comercio electrónico (**LSSI**).
- Desde 2010: despliegue masivo de **fibra hasta el hogar** (España está entre los países europeos con mayor cobertura FTTH), 4G y 5G, y servicios de Administración electrónica sobre Internet (sedes electrónicas, Cl@ve, Carpeta Ciudadana) y la **Red SARA** entre Administraciones.

## Estado actual de Internet (2026)

| Indicador | Situación |
|---|---|
| **Usuarios** | Unos **6 000 millones** (≈ 74 % de la población mundial) y **2 200 millones sin conexión** (UIT, *Facts and Figures* 2025); brecha urbana (85 %) frente a rural (58 %) |
| **Acceso** | Mayoritariamente **móvil**; FTTH, 5G y satélites de órbita baja amplían la banda ancha |
| **IPv6** | En torno a la **mitad** del tráfico de los usuarios hacia Google (50,1 % el 28‑3‑2026), con grandes diferencias por país: Francia o India superan el 70 % y **España ronda el 10 %** |
| **Cifrado** | **HTTPS es la norma**: más del 95 % del tráfico web de Chrome va cifrado; **TLS 1.3** predomina y más de la mitad del tráfico humano que atiende Cloudflare usa ya **intercambio de claves poscuántico híbrido** (52 % en diciembre de 2025) |
| **Protocolos web** | **HTTP/2** generalizado y **HTTP/3** sobre QUIC en torno al **41 % de los sitios** (W3Techs, octubre de 2026) |
| **Concentración** | Gran parte del tráfico pasa por pocas **CDN y nubes**; las caídas de un proveedor afectan a miles de servicios |
| **Tráfico** | Dominado por el **vídeo**; crecimiento de los ***bots*** **y rastreadores de IA** |
| **DNS** | Resolución cifrada (**DoH**, **DoT**, **DoQ**), DNSSEC y registros HTTPS/SVCB |
| **Seguridad** | Ataques DDoS récord (por encima de 20 Tbit/s en 2025), *ransomware*, ataques a la cadena de suministro; regulación europea: **NIS2**, **DSA** y **DMA**, Reglamento de Ciberresiliencia; hoja de ruta de la UE para migrar a criptografía poscuántica (empezar en 2026, sistemas de alto riesgo antes de 2031 y el resto en 2035) |
| **Internet de las cosas** | Miles de millones de dispositivos (sensores, contadores, vehículos) con protocolos ligeros (MQTT, CoAP) y redes LPWAN (tema IV.6) |

## Principales servicios de Internet

Todos los servicios de Internet son **protocolos de la capa de aplicación** del modelo TCP/IP que se apoyan en TCP, UDP o QUIC y se identifican por **puertos** asignados por la IANA (bien conocidos 0-1023, registrados 1024-49151, dinámicos 49152-65535).

| Servicio | Protocolos | Puertos por defecto | Notas |
|---|---|---|---|
| **Web** | **HTTP**, **HTTPS** | **TCP 80** y **TCP 443** (HTTP/3: **UDP 443**) | Navegación, aplicaciones web y API; 8080 y 8443 son puertos alternativos habituales, no estándar |
| **Correo electrónico** | SMTP, POP3, IMAP (tema IV.3) | 25 (entre servidores), 587 (envío con STARTTLS), 465 (SMTPS), 110/995, 143/993 | Arquitectura MUA-MSA-MTA-MDA |
| **Resolución de nombres** | **DNS**, DoT, DoH, DoQ | UDP y TCP 53; DoT TCP 853; DoH TCP/UDP 443; DoQ UDP 853 | Traduce nombres en direcciones |
| **Transferencia de ficheros** | **FTP**, FTPS, **SFTP**, TFTP, SCP, WebDAV, HTTP | FTP 21 (control) y 20 (datos en modo activo); FTPS implícito 990; SFTP y SCP 22; TFTP UDP 69 | Ver detalle de FTP más abajo |
| **Acceso remoto** | Telnet, **SSH**, RDP, VNC | 23, **22**, 3389, 5900 | Telnet viaja **en claro**: sustituido por SSH |
| **Noticias** (Usenet) | NNTP (RFC 3977) | 119 (NNTPS 563) | Grupos jerárquicos (`comp.*`, `sci.*`, `es.*`); hoy residual |
| **Mensajería y charla** | IRC, **XMPP**, Matrix, protocolos propietarios (WhatsApp, Signal, Telegram) | IRC 6667 (6697 con TLS), XMPP 5222 (cliente) y 5269 (servidor) | Cifrado de extremo a extremo con el protocolo Signal o MLS (RFC 9420) |
| **Voz y vídeo** | **SIP**, RTP/SRTP, **WebRTC**, H.323 | SIP 5060 (5061 con TLS) | Telefonía IP y videoconferencia; WebRTC funciona en el navegador sin complementos |
| ***Streaming*** | **HLS**, **MPEG-DASH** (sobre HTTP), RTMP, RTSP, SRT | 443, RTMP 1935, RTSP 554 | El vídeo adaptativo trocea el contenido en segmentos de varias calidades |
| **Entre iguales** (P2P) | BitTorrent, IPFS | Variables | Rastreadores (*trackers*), DHT y enlaces *magnet* |
| **Hora** | **NTP** (RFC 5905), NTS (RFC 8915) | UDP 123 | En España la hora oficial la mantiene el Real Instituto y Observatorio de la Armada (ROA) |
| **Directorio** | LDAP | 389 (LDAPS 636) | Directorios corporativos (tema IV.4) |
| **Ficheros en red** | SMB, NFS, WebDAV | 445, 2049, 443 | Uso interno; SMB no debe exponerse a Internet |
| **Servicios web y API** | REST/JSON, SOAP, GraphQL, gRPC (sobre HTTP/2), WebSocket | 443 | Integración entre aplicaciones (tema III.6) |
| **Internet de las cosas** | MQTT, CoAP, AMQP | MQTT 1883 (8883 con TLS), CoAP UDP 5683 (5684 con DTLS), AMQP 5672 | Mensajes ligeros publicación/suscripción |
| **Nube** | IaaS, PaaS, SaaS sobre HTTPS | 443 | Ofimática, correo, almacenamiento, cómputo |
| Históricos | Gopher, WAIS, Archie, Finger, Whois | 70, 210, —, 79, 43 | Gopher (1991) fue el gran rival de la web; Whois sigue en uso (sustituido por RDAP sobre HTTPS) |

Sobre Internet se prestan además los grandes **servicios finales**: buscadores, comercio electrónico, banca, redes sociales, formación en línea y **Administración electrónica** (Punto de Acceso General, sedes electrónicas, Cl@ve, Carpeta Ciudadana, notificaciones en la DEHú, Registro Electrónico General; temas del bloque I).

### La web (WWW)

La web es un **sistema de documentos y aplicaciones de hipertexto** distribuidos por Internet. Se apoya en tres pilares que creó Berners-Lee: un **lenguaje** para los documentos (**HTML**, junto con CSS y JavaScript), un **sistema de identificación** de recursos (**URI/URL**) y un **protocolo** de transferencia (**HTTP**). Sus componentes:

- **Cliente**: el **navegador** (Chrome, Edge, Firefox, Safari), con su motor de renderizado (Blink, Gecko, WebKit) y de JavaScript (tema III.7); también aplicaciones y robots (*crawlers*).
- **Servidor web**: Nginx, Apache HTTP Server, IIS, LiteSpeed, Caddy; delante suelen ir **proxies inversos**, balanceadores y CDN (administración en el tema IV.1).
- **Servidores de aplicaciones y bases de datos** detrás (arquitecturas multicapa, tema III.6).

### DNS como servicio de Internet

El **DNS** (RFC 1034 y 1035) es el servicio que **traduce nombres de dominio legibles en direcciones IP** (y otros datos: servidores de correo, alias, claves). No traduce IP en MAC (eso es ARP) ni elige rutas (eso es el encaminamiento). Resolución típica de `www.sede.organismo.es`:

![Diagrama de secuencia de la resolución DNS de www.sede.organismo.es: el cliente mira su caché y el fichero hosts y hace una consulta recursiva al resolvedor; este pregunta al servidor raíz, que le remite a los NS de .es; al del TLD .es, que le remite a los NS de organismo.es; y al autoritativo, que da el registro A o AAAA; el resolvedor devuelve la IP al cliente y la guarda en caché durante el TTL](diagramas/IV.8-resolucion-dns.svg)

*Figura: resolución de un nombre; el resolvedor puede ser del ISP, de la organización o público.*

El cliente hace una consulta **recursiva** (pide la respuesta final) y el resolvedor, consultas **iterativas** (recibe referencias). Los tipos de registro (A, AAAA, CNAME, MX, NS, PTR, TXT, SRV, CAA…) están en el tema IV.7; aquí interesan el **SOA** y los nuevos registros web.

**Registro SOA** (*Start of Authority*): uno por zona, al principio; contiene la **información básica de la zona y de su administración**:

```dns
organismo.es.  3600  IN  SOA  ns1.organismo.es. hostmaster.organismo.es. (
                    2026101101 ; SERIAL  número de serie (suele ser AAAAMMDDnn): si aumenta, los secundarios transfieren la zona
                    7200       ; REFRESH cada cuánto comprueban los secundarios si hay cambios
                    900        ; RETRY   reintento si falla la comprobación
                    1209600    ; EXPIRE  si no contactan con el primario en este tiempo, dejan de responder por la zona
                    3600 )     ; MINIMUM TTL de las respuestas negativas (caché de «no existe», RFC 2308)
```

- **MNAME** (`ns1.organismo.es.`): servidor **primario** de la zona.
- **RNAME** (`hostmaster.organismo.es.`): **correo electrónico del responsable** de la zona, con el primer punto en lugar de la arroba (`hostmaster@organismo.es`).

**Seguridad y modernización del DNS**: **DNSSEC** firma las zonas (registros DNSKEY, RRSIG, DS) para garantizar **autenticidad e integridad**, pero **no cifra**; **DoT** (DNS sobre TLS, RFC 7858, puerto 853), **DoH** (DNS sobre HTTPS, RFC 8484) y **DoQ** (DNS sobre QUIC, RFC 9250) **cifran** la consulta entre cliente y resolvedor; los registros **SVCB/HTTPS** (RFC 9460) anuncian en el DNS que un servicio admite HTTP/3, sus parámetros y las claves de ECH.

```bash
dig www.administracion.gob.es A +short       # dirección IPv4
dig organismo.es SOA                          # registro SOA
dig +trace www.organismo.es                   # resolución paso a paso desde la raíz
dig -x 203.0.113.10                           # resolución inversa (PTR)
dig @9.9.9.9 +https www.organismo.es          # consulta por DoH (versiones recientes de dig)
nslookup -type=mx organismo.es                # Windows y Linux
Resolve-DnsName organismo.es -Type SOA        # PowerShell
ipconfig /flushdns                            # vaciar la caché DNS de Windows
resolvectl flush-caches                       # vaciar la caché de systemd-resolved
```

### Transferencia de ficheros: FTP y sus alternativas

**FTP** (*File Transfer Protocol*, RFC 959, 1985) usa **dos conexiones TCP**: una de **control** (puerto **21**), por la que viajan órdenes y respuestas en texto, y otra de **datos** para cada transferencia o listado. Usuario y contraseña viajan **en claro**; existe el acceso **anónimo** (usuario `anonymous`).

| Modo | Quién abre la conexión de datos | Cómo |
|---|---|---|
| **Activo** (PORT) | **El servidor**, desde su puerto **20**, hacia el puerto que indica el cliente | El cliente envía `PORT ip,puerto`; falla con cortafuegos y NAT en el lado del cliente |
| **Pasivo** (PASV, EPSV) | **El cliente**, hacia un puerto alto que anuncia el servidor | El servidor responde `227 Entering Passive Mode`; en el cortafuegos del servidor hay que abrir el rango de puertos pasivos (o usar el asistente de conexiones FTP del cortafuegos) |

| Concepto | Valores |
|---|---|
| **Tipos de representación** (orden `TYPE`) | **ASCII** (`A`, por defecto: **texto plano**, convierte los finales de línea entre sistemas), EBCDIC (`E`), **imagen o binario** (`I`: copia **byte a byte**; para **todo lo que no sea texto**: imágenes, audio, ejecutables, comprimidos, documentos ofimáticos) y local (`L`) |
| Estructuras (`STRU`) | Fichero, registro y página |
| Modos de transmisión (`MODE`) | Flujo (por defecto), bloque y comprimido |
| Órdenes | `USER`, `PASS`, `CWD`, `PWD`, `LIST`, `NLST`, `RETR` (descargar), `STOR` (subir), `DELE`, `MKD`, `RMD`, `RNFR`/`RNTO`, `TYPE`, `PASV`, `PORT`, `QUIT`; extensiones `EPSV`/`EPRT` (IPv6), `FEAT`, `MLSD`, `AUTH TLS` |
| Respuestas (tres cifras) | 1xx preliminar, 2xx correcta, 3xx intermedia, 4xx error transitorio, 5xx error permanente: **220** servicio listo, **331** usuario correcto, falta la contraseña, **230** sesión iniciada, **227** modo pasivo, **150** abriendo la conexión de datos, **226** transferencia completada, **530** no autenticado, **550** fichero no disponible |

El cliente de línea de órdenes `ftp` (Linux y Windows) tiene sus propias órdenes, que traduce a las del protocolo: `open`, `user`, `ls`/`dir`, `cd` (en el servidor) y `lcd` (en local), **`get`** (descargar un fichero, `RETR`), **`put`** (subir, `STOR`), **`mget`** y **`mput`** (varios ficheros con comodines), `ascii` y `binary` (tipo de transferencia), `passive`, `delete`, `mkdir` y `bye`/`quit`.

Si un fichero binario se transfiere en modo ASCII **puede corromperse** (se alteran los bytes que coinciden con finales de línea); una página HTML es texto, pero sus imágenes son binarias.

| Alternativa | Qué es | Puerto |
|---|---|---|
| **FTPS** | FTP protegido con **TLS**: **explícito** (FTPES: conexión al 21 y orden `AUTH TLS`, RFC 4217; el recomendado) o **implícito** (TLS desde el primer byte, puerto **990**; obsoleto) | 21 o 990 + puertos de datos |
| **SFTP** | ***SSH File Transfer Protocol***: subsistema de **SSH**, **no** es FTP sobre SSH; **una sola conexión** para órdenes y datos, con órdenes para manipular directorios y atributos | **22** |
| SCP | Copia por SSH (en OpenSSH moderno, `scp` usa por debajo el protocolo SFTP) | 22 |
| **TFTP** | *Trivial FTP* (RFC 1350): **UDP**, sin autenticación ni listado; arranque por red (PXE) y configuraciones de equipos de red | UDP 69 |
| HTTPS y WebDAV | Descarga y publicación de ficheros por la web | 443 |

```bash
sftp usuario@biblioteca.organismo.es        # sesión interactiva: ls, cd, get, put, mkdir, bye
scp informe.pdf usuario@servidor:/srv/docs/  # copia puntual
curl -O https://www.organismo.es/datos.csv  # descarga por HTTPS
lftp -e "set ftp:ssl-force true; mirror /pub ./pub; bye" ftp.organismo.es   # FTPES con réplica de directorio
```

### Proxies y cachés web

Un **proxy** (servidor intermediario) recibe las peticiones de los clientes y las reenvía en su nombre.

| Tipo | Posición y función |
|---|---|
| **Proxy de reenvío** (*forward*, explícito) | Junto a los **clientes**: el navegador se configura (manualmente, con un fichero **PAC** o con WPAD) para salir por él; filtra contenidos, autentica a los usuarios, registra la navegación y hace **caché** |
| **Proxy transparente** (de interceptación) | El tráfico se desvía hacia el proxy **con NAT o encaminamiento**, **sin configurar el navegador**; el usuario no lo percibe |
| **Proxy inverso** (*reverse*) | Junto a los **servidores**: publica uno o varios servidores internos, termina TLS, **balancea la carga**, comprime, hace caché y puede incorporar un **WAF** (Nginx, HAProxy, Apache `mod_proxy`, Traefik, Varnish) |
| **Proxy‑caché** | Guarda copias de los objetos (según las cabeceras de caché de HTTP) para **ahorrar ancho de banda y acelerar** la navegación: **Squid** (puerto por defecto **3128**), Varnish (acelerador delante de servidores web) |
| SOCKS (RFC 1928) | Proxy genérico de nivel de sesión para cualquier protocolo TCP o UDP (SOCKS5, puerto 1080; `ssh -D` crea uno) |
| CDN | Red de proxies inversos y cachés distribuida mundialmente |

Las peticiones HTTPS atraviesan un proxy explícito con el método **`CONNECT`** (túnel cifrado de extremo a extremo); para inspeccionar su contenido, el proxy debe **romper el canal TLS** (inspección TLS) con una CA propia instalada en los puestos, lo que el ENS admite en el refuerzo **[mp.s.3.r1.2]** de la **protección de la navegación web**, siempre que se documente qué se analiza y registra.

```squid
# /etc/squid/squid.conf (extracto)
http_port 3128
acl red_interna src 10.0.0.0/8
acl SSL_ports port 443
acl CONNECT method CONNECT
http_access deny CONNECT !SSL_ports        # túneles solo hacia 443
http_access allow red_interna
http_access deny all
cache_dir ufs /var/spool/squid 20000 16 256  # 20 GB de caché en disco
```

## El protocolo HTTP

### Características

**HTTP** (*Hypertext Transfer Protocol*) es el protocolo de **aplicación** de la web. Desde 2022 se especifica en una familia de RFC que separa la **semántica**, común a todas las versiones (**RFC 9110**), la **caché** (RFC 9111) y la **sintaxis** de cada versión: **HTTP/1.1** (RFC 9112), **HTTP/2** (RFC 9113) y **HTTP/3** (RFC 9114).

- Modelo **cliente-servidor** de **petición y respuesta**: el cliente (*user agent*) envía una petición y el servidor de origen devuelve una respuesta.
- **Sin estado** (*stateless*): cada petición es independiente; el estado de la sesión se mantiene con ***cookies*** o *tokens*.
- Los **recursos** se identifican con **URI** y se transfieren **representaciones** con un **tipo de medio** (MIME: `text/html`, `application/json`, `image/png`).
- **Extensible** mediante cabeceras, métodos y códigos de estado.
- Admite **intermediarios**: *proxies*, pasarelas (*gateways*) y túneles, y **cachés**.
- Puertos por defecto (IANA): **80** para `http` y **443** para `https`.
- HTTP/1.x es **textual**; HTTP/2 y HTTP/3 son **binarios**, con la misma semántica.

### URI y URL

Un **URI** (*Uniform Resource Identifier*, RFC 3986) identifica un recurso; un **URL** es un URI que además indica **cómo acceder** a él (esquema y ubicación); un **URN** lo nombra de forma persistente sin ubicarlo (`urn:isbn:9788400000000`). Los navegadores aplican el **URL Standard** del WHATWG.

```text
  https://usuario@sede.organismo.es:8443/tramites/solicitud.html?id=42&lang=es#paso2
  └─┬─┘   └──┬──┘ └───────┬───────┘ └┬─┘└──────────┬──────────┘ └──────┬─────┘ └─┬─┘
 esquema  usuario      host       puerto          ruta               consulta  fragmento
          └──────────── autoridad ──────┘
```

- El **esquema** y el **host** no distinguen mayúsculas; la **ruta** sí puede distinguirlas (depende del servidor).
- Si no se indica puerto, se usa el del esquema (80 o 443).
- El **fragmento** (`#paso2`) **no se envía al servidor**: lo usa el navegador.
- **Codificación porcentual**: los caracteres no permitidos se escriben como `%` y su valor hexadecimal en UTF‑8 (espacio = `%20`, `ñ` = `%C3%B1`).
- Los **nombres de dominio internacionalizados** se convierten a ASCII con **Punycode**: `españa.es` → `xn--espaa-rta.es`.
- URL **absoluta** (con esquema y host) frente a **relativa** (`../img/logo.png`), que se resuelve respecto a la del documento.

### Versiones de HTTP

| Versión | Año y especificación | Transporte | Novedades |
|---|---|---|---|
| **HTTP/0.9** | 1991 | TCP | Solo `GET`, sin cabeceras ni códigos; solo HTML |
| **HTTP/1.0** | 1996, RFC 1945 (informativa) | TCP | **Cabeceras**, **códigos de estado**, `POST` y `HEAD`, tipos MIME; **una conexión TCP por petición** |
| **HTTP/1.1** | 1997 (RFC 2068), 1999 (**RFC 2616**), 2014 (RFC 7230-7235), 2022 (**RFC 9112**) | TCP | **Conexiones persistentes** por defecto, cabecera **`Host` obligatoria** (varios sitios en una IP: *hosts* virtuales), *pipelining*, codificación ***chunked***, `Cache-Control` y `ETag`, negociación de contenido, peticiones parciales (`Range`), `PUT`, `DELETE`, `OPTIONS`, `TRACE`, `CONNECT` |
| **HTTP/2** | 2015 (**RFC 7540**), 2022 (**RFC 9113**) | TCP (en la práctica, con TLS) | **Protocolo binario** de tramas, **multiplexación** de flujos en **una sola conexión**, compresión de cabeceras **HPACK** (RFC 7541), control de flujo por flujo, *server push* (hoy abandonado); nace de **SPDY** (Google, 2009) |
| **HTTP/3** | 2022, **RFC 9114** | **QUIC sobre UDP** | Flujos independientes **sin bloqueo de cabeza de línea**, **TLS 1.3 integrado**, conexión en 1‑RTT o 0‑RTT, **migración de conexión**, compresión **QPACK** (RFC 9204) |

### Mensajes HTTP/1.1

Un mensaje tiene una **línea de inicio**, **campos de cabecera** (`Nombre: valor`, sin distinguir mayúsculas en el nombre), una **línea en blanco** (CRLF) y un **cuerpo** opcional.

```http
GET /tramites/estado?expediente=2026-0042 HTTP/1.1
Host: sede.organismo.es
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/141.0
Accept: text/html,application/xhtml+xml;q=0.9,*/*;q=0.8
Accept-Language: es-ES,es;q=0.9
Accept-Encoding: gzip, br, zstd
Cookie: sesion=7f3c9a
If-None-Match: "a1b2c3"
Connection: keep-alive

```

```http
HTTP/1.1 200 OK
Date: Sun, 11 Oct 2026 10:00:00 GMT
Server: nginx
Content-Type: text/html; charset=utf-8
Content-Length: 5120
Content-Encoding: br
Cache-Control: private, no-cache
ETag: "d4e5f6"
Strict-Transport-Security: max-age=31536000; includeSubDomains
Set-Cookie: sesion=9e8d7c; Path=/; Secure; HttpOnly; SameSite=Lax

<!doctype html>…
```

- **Línea de petición**: **método**, **destino** (ruta y consulta) y **versión**.
- **Línea de estado**: versión, **código de estado** de tres cifras y frase explicativa (*reason phrase*, informativa).
- En **HTTP/2 y HTTP/3** la semántica es la misma, pero los datos viajan en **tramas binarias**, los nombres de cabecera van en **minúsculas** y la línea de inicio se sustituye por **pseudocabeceras**: `:method`, `:scheme`, `:authority` (equivale a `Host`), `:path` y `:status`.

### Métodos

Un método es **seguro** si no pretende modificar nada en el servidor (solo lectura) e **idempotente** si repetir la misma petición produce el mismo efecto que hacerla una vez (todo método seguro es idempotente). Los idempotentes se pueden **reintentar** automáticamente.

| Método | Seguro | Idempotente | Cacheable | Uso |
|---|---|---|---|---|
| **GET** | Sí | Sí | Sí | **Obtener** una representación; los parámetros van en la URL |
| **HEAD** | Sí | Sí | Sí | Como GET pero **solo cabeceras** (comprobar existencia, tamaño, fecha) |
| **POST** | No | **No** | Raramente | **Enviar datos** para que el recurso los procese (formularios, crear elementos en una colección) |
| **PUT** | No | **Sí** | No | **Crear o reemplazar** el recurso en la URI indicada |
| **DELETE** | No | Sí | No | **Borrar** el recurso |
| **PATCH** (RFC 5789) | No | No (en general) | No | **Modificación parcial** |
| **OPTIONS** | Sí | Sí | No | Métodos y opciones admitidos; **petición previa (*preflight*) de CORS** |
| **TRACE** | Sí | Sí | No | Eco de la petición para diagnóstico; **debe desactivarse** (`TraceEnable off` en Apache) |
| **CONNECT** | No | No | No | Abrir un **túnel** a través de un proxy (HTTPS por un proxy explícito) |
| **QUERY** (RFC 10008, 2026) | Sí | Sí | Sí | Consulta **con cuerpo** (como POST) pero **segura e idempotente** (como GET): búsquedas complejas |

### Códigos de estado

El primer dígito indica la **clase** (RFC 9110):

| Clase | Significado | Códigos |
|---|---|---|
| **1xx** | **Informativa**: petición recibida, el proceso continúa | **100** Continue, **101 Switching Protocols** (paso a WebSocket), **103** Early Hints (sugerencias de precarga, RFC 8297) |
| **2xx** | **Éxito**: petición recibida, entendida y aceptada | **200 OK**, **201 Created** (con `Location` del nuevo recurso), **202 Accepted** (se procesará después), 203 Non-Authoritative Information, **204 No Content**, 205 Reset Content, **206 Partial Content** (respuesta a `Range`), **207 Multi-Status** (WebDAV: varios estados en un cuerpo XML) |
| **3xx** | **Redirección**: el cliente debe hacer **algo más** para completar la petición | 300 Multiple Choices, **301 Moved Permanently**, **302 Found** (temporal), **303 See Other** (tras un POST, ir con GET a otra URI), **304 Not Modified** (la copia en caché sigue valiendo), **307 Temporary Redirect** y **308 Permanent Redirect** (como 302 y 301 pero **conservando el método y el cuerpo**) |
| **4xx** | **Error del cliente**: sintaxis incorrecta o petición que no se puede atender | **400** Bad Request, **401 Unauthorized** (**falta autenticación** o no es válida; se acompaña de `WWW-Authenticate`), 402 Payment Required (reservado), **403 Forbidden** (el servidor **entiende la petición pero se niega**: **sin autorización** aunque se esté autenticado), **404 Not Found**, **405 Method Not Allowed** (el método existe pero **no está permitido** en ese recurso; cabecera `Allow`), 406 Not Acceptable, **407 Proxy Authentication Required**, **408 Request Timeout**, 409 Conflict, **410 Gone** (eliminado de forma permanente), 411 Length Required, 412 Precondition Failed, 413 Content Too Large, 414 URI Too Long, 415 Unsupported Media Type, 416 Range Not Satisfiable, 417 Expectation Failed, 418 (sin uso; procede de una broma de 1998), 421 Misdirected Request, 422 Unprocessable Content, 425 Too Early (petición en 0‑RTT), 426 Upgrade Required, 428 Precondition Required, **429 Too Many Requests** (límite de peticiones), 431 Request Header Fields Too Large, **451 Unavailable For Legal Reasons** |
| **5xx** | **Error del servidor**: falló al atender una petición aparentemente válida | **500 Internal Server Error**, **501 Not Implemented** (el servidor **no admite la funcionalidad**, por ejemplo un método que no conoce), **502 Bad Gateway** (la pasarela o proxy recibió una respuesta **inválida** del servidor de destino), **503 Service Unavailable** (**servicio no disponible** temporalmente por sobrecarga o mantenimiento; puede llevar `Retry-After`), **504 Gateway Timeout** (el servidor de destino **no respondió a tiempo**), 505 HTTP Version Not Supported, 511 Network Authentication Required (portales cautivos) |

**WebDAV** (RFC 4918), la extensión de HTTP para editar y gestionar ficheros en el servidor (métodos `PROPFIND`, `PROPPATCH`, `MKCOL`, `COPY`, `MOVE`, `LOCK`, `UNLOCK`), añade **207 Multi-Status**, 423 Locked, 424 Failed Dependency y 507 Insufficient Storage.

Parejas que se confunden:

| Pareja | Diferencia |
|---|---|
| **401** frente a **403** | 401: **no te has identificado** (o las credenciales no valen); 403: **sé quién eres pero no tienes permiso** |
| 401 frente a **407** | 407 pide autenticarse **ante el proxy** (`Proxy-Authenticate`) |
| **404** frente a **410** | 410 afirma que el recurso **ya no existe y no volverá** |
| **405** frente a **501** | 405: método conocido pero **no permitido en ese recurso**; 501: el servidor **no implementa** ese método o funcionalidad |
| **301/302** frente a **308/307** | Los primeros permiten que el cliente cambie POST por GET; 307 y 308 **conservan el método** |
| **502**, **503** y **504** | 502: respuesta **inválida** del servidor interno; 503: el servicio **no está disponible**; 504: el servidor interno **no respondió a tiempo** |
| **304** | No es un error: indica que la **caché** puede usar su copia |

### Cabeceras

| Grupo | Cabeceras principales |
|---|---|
| **De petición** | **`Host`** (obligatoria en HTTP/1.1), `User-Agent`, `Accept`, `Accept-Language`, `Accept-Encoding`, **`Authorization`**, **`Cookie`**, `Referer` (así, con una sola «r»), `Origin`, `If-None-Match`, `If-Modified-Since`, `Range`, `Upgrade`, `Proxy-Authorization`, `Forwarded`/`X-Forwarded-For` (IP original del cliente tras un proxy) |
| **De respuesta** | `Server`, **`Location`** (destino de una redirección o recurso creado), **`Set-Cookie`**, **`WWW-Authenticate`**, `Proxy-Authenticate`, `Retry-After`, `Allow`, `Vary`, **`Alt-Svc`** (anuncia HTTP/3) |
| **De representación** | **`Content-Type`** (tipo de medio y juego de caracteres), `Content-Length`, **`Content-Encoding`** (compresión: `gzip`, `br`, `zstd`), `Content-Language`, `Content-Disposition` (`attachment; filename="informe.pdf"` fuerza la descarga), `Transfer-Encoding: chunked` (solo HTTP/1.1) |
| **De caché y validación** | **`Cache-Control`**, `Expires`, `Age`, **`ETag`**, **`Last-Modified`** |
| **De seguridad** (tema III.8) | **`Strict-Transport-Security`** (HSTS), **`Content-Security-Policy`**, `X-Content-Type-Options: nosniff`, `X-Frame-Options` o `frame-ancestors`, `Referrer-Policy`, `Permissions-Policy` y las de **CORS** (`Access-Control-Allow-Origin`, `-Methods`, `-Headers`, `-Credentials`) |

### Gestión del estado: *cookies*

HTTP no guarda estado, así que el servidor envía una ***cookie*** con **`Set-Cookie`** y el navegador la devuelve en cada petición posterior a ese sitio en la cabecera **`Cookie`** (RFC 6265; su revisión, conocida como 6265bis, está en la fase final de publicación).

| Atributo | Efecto |
|---|---|
| `Expires` / `Max-Age` | Fecha de caducidad o segundos de vida: *cookie* **persistente**; sin ellos es **de sesión** (se borra al cerrar el navegador) |
| `Domain` | Dominios a los que se envía (si se indica, incluye los **subdominios**); sin él, solo el host que la creó |
| `Path` | Rutas a las que se envía |
| **`Secure`** | Solo se envía por **HTTPS** |
| **`HttpOnly`** | **No accesible desde JavaScript** (`document.cookie`): mitiga el robo de la sesión por **XSS** |
| **`SameSite`** | `Strict` (solo en peticiones del mismo sitio), `Lax` (también al navegar desde otro sitio con enlaces de nivel superior; Chrome y Edge lo aplican por defecto) o `None` (siempre; exige `Secure`): mitiga **CSRF** |
| `Partitioned` | *Cookie* de terceros aislada por sitio de primer nivel (CHIPS) |
| Prefijos `__Secure-` y `__Host-` | Obligan a `Secure` (y `__Host-` además a `Path=/` y sin `Domain`) |

Las *cookies* **propias** son del sitio visitado; las **de terceros**, de otros dominios incrustados (publicidad, analítica); Safari y Firefox bloquean por defecto el rastreo con *cookies* de terceros. En España, el **art. 22.2 de la LSSI** exige **información y consentimiento** para las *cookies* que no sean técnicas o estrictamente necesarias (guía de la AEPD).

### Caché

La caché (RFC 9111) guarda respuestas para reutilizarlas: **privada** (del navegador) o **compartida** (proxy, CDN).

| Directiva o cabecera | Significado |
|---|---|
| `Cache-Control: max-age=3600` | **Fresca** durante 3 600 s; `s-maxage` solo para cachés compartidas; `Expires` es la forma antigua con fecha absoluta |
| `no-cache` | Puede guardarse, pero hay que **revalidarla** con el servidor **antes de cada uso** |
| **`no-store`** | **No guardar nada** (datos sensibles) |
| `private` / `public` | Solo caché del navegador / también cachés compartidas |
| `must-revalidate`, `immutable`, `stale-while-revalidate` | Revalidar al caducar / no cambiará nunca / servir la copia caducada mientras se revalida en segundo plano |
| **`ETag`** + **`If-None-Match`** | Validación por **etiqueta de versión** |
| **`Last-Modified`** + **`If-Modified-Since`** | Validación por **fecha** |
| **304 Not Modified** | Respuesta a una petición condicional cuando la copia sigue siendo válida: **sin cuerpo** |
| `Vary: Accept-Encoding` | Guardar variantes distintas según esas cabeceras de la petición |

### Autenticación HTTP

El marco es de **desafío y respuesta**: el servidor contesta **401** con `WWW-Authenticate: <esquema>` y el cliente repite la petición con `Authorization`; ante un proxy, **407**, `Proxy-Authenticate` y `Proxy-Authorization`.

| Esquema | Funcionamiento |
|---|---|
| **Basic** (RFC 7617) | Envía `usuario:contraseña` codificado en **Base64**, que **no es cifrado** (`dXN1YXJpbzpjbGF2ZQ==` es `usuario:clave`): **solo sobre HTTPS** |
| Digest (RFC 7616) | Envía un resumen (*hash*) de la contraseña con un valor de un solo uso; hoy apenas se usa |
| **Bearer** (RFC 6750) | Presenta un ***token*** de acceso (OAuth 2.0, a menudo un JWT): `Authorization: Bearer eyJ…` |
| **Negotiate** (RFC 4559) | Kerberos/SPNEGO: autenticación integrada de Windows en intranets |
| Certificado de cliente (TLS mutuo) | La autenticación se hace en TLS, no en HTTP (certificados de la FNMT, DNIe) |

Las aplicaciones web suelen usar en su lugar **formularios con *cookie* de sesión** y federación de identidades (**SAML 2.0**, en el que se basa Cl@ve; **OpenID Connect**), además de **WebAuthn**/claves de acceso (*passkeys*).

### Negociación de contenido, compresión y peticiones parciales

- El cliente expresa preferencias con `Accept`, `Accept-Language` y `Accept-Encoding` y **pesos** `q` (de 0 a 1); el servidor elige y lo indica con `Content-Type`, `Content-Language`, `Content-Encoding` y `Vary`.
- **Compresión**: `gzip`, `deflate`, **Brotli** (`br`, RFC 7932) y **Zstandard** (`zstd`, RFC 8878).
- **Peticiones parciales**: `Range: bytes=0-1048575` → **206 Partial Content**; reanudar descargas y saltar dentro de un vídeo.

### Conexiones en HTTP/1.1

- **Persistentes** por defecto (`Connection: keep-alive`); `Connection: close` la cierra tras la respuesta.
- ***Pipelining***: enviar varias peticiones sin esperar respuesta; las respuestas deben llegar **en orden** (bloqueo de cabeza de línea), por lo que los navegadores no lo usan y abren hasta unas **seis conexiones TCP por servidor**.
- **`Transfer-Encoding: chunked`**: enviar el cuerpo en trozos cuando no se conoce su longitud.
- **`Upgrade`**: cambiar de protocolo en la misma conexión; el caso típico es **WebSocket** (RFC 6455): `Upgrade: websocket` → **101 Switching Protocols**, y desde ahí un canal **bidireccional** (`ws://`, `wss://` con TLS).

### HTTP/2

- **Capa de tramas binarias**: cada mensaje se divide en **tramas** (`HEADERS`, `DATA`, `SETTINGS`, `WINDOW_UPDATE`, `RST_STREAM`, `PING`, `GOAWAY`, `PUSH_PROMISE`, `CONTINUATION`, `PRIORITY`) asociadas a un **flujo** (*stream*) numerado; los flujos que abre el cliente son impares.
- **Multiplexación**: muchas peticiones y respuestas **simultáneas e intercaladas** en **una sola conexión TCP**, sin el límite de seis conexiones ni el *pipelining*.
- **HPACK**: compresión de cabeceras con una tabla estática (61 entradas), una tabla dinámica y codificación Huffman, diseñada para resistir el ataque CRIME.
- **Control de flujo** por flujo y por conexión; **prioridades** (el esquema original se abandonó y la RFC 9218 define la cabecera `Priority`).
- ***Server push*** (`PUSH_PROMISE`): el servidor enviaba recursos antes de que se pidieran; **los navegadores lo han retirado** (Chrome en 2022) en favor de **103 Early Hints** y de la precarga.
- **Negociación**: con TLS mediante **ALPN** con el identificador **`h2`**; en claro, **`h2c`** (los navegadores solo usan HTTP/2 sobre TLS; el paso a h2c con `Upgrade` quedó obsoleto en la RFC 9113).
- **Limitación**: si se pierde un segmento TCP, **todos los flujos esperan** a la retransmisión (bloqueo de cabeza de línea en TCP). Ataques específicos: **Rapid Reset** (CVE-2023-44487, 2023), con el que se lanzaron DDoS récord abriendo y cancelando flujos.

### HTTP/3 y QUIC

**QUIC** (RFC 9000, 9001 y 9002 de 2021; versión 2 en la RFC 9369) es un **protocolo de transporte sobre UDP**, nacido en Google, que integra **TLS 1.3** (RFC 9001) y ofrece:

- **Establecimiento rápido**: transporte y criptografía en **un solo viaje de ida y vuelta (1‑RTT)** y **0‑RTT** al reanudar con un servidor conocido.
- **Flujos independientes**: la pérdida de un paquete solo detiene el flujo afectado (**sin bloqueo de cabeza de línea**).
- **Cifrado siempre**, incluida buena parte de las cabeceras de transporte.
- **Migración de conexión** mediante **identificadores de conexión**: la descarga continúa al pasar del Wi‑Fi al 5G aunque cambie la IP.
- Implementación en **espacio de usuario**, lo que permite evolucionar el control de congestión sin cambiar el núcleo.

**HTTP/3** (RFC 9114, 2022) lleva la semántica de HTTP sobre QUIC, con **QPACK** (RFC 9204) para las cabeceras. El cliente lo **descubre** por la cabecera **`Alt-Svc: h3=":443"; ma=86400`** (RFC 7838) recibida en una respuesta HTTP/1.1 o HTTP/2, o por el registro DNS **HTTPS** con `alpn="h3"`; si **UDP 443** está bloqueado, el navegador **vuelve a TCP** (HTTP/2). Por eso muchas organizaciones bloquean QUIC en el cortafuegos para obligar al tráfico a pasar por el proxy que lo inspecciona.

```text
   HTTP/1.1            HTTP/2               HTTP/3
 ┌───────────┐      ┌───────────┐       ┌───────────┐
 │ HTTP/1.1  │      │  HTTP/2   │       │  HTTP/3   │
 ├───────────┤      ├───────────┤       ├───────────┤
 │ TLS (opc.)│      │    TLS    │       │   QUIC    │ ← incluye TLS 1.3,
 ├───────────┤      ├───────────┤       │           │   flujos y fiabilidad
 │    TCP    │      │    TCP    │       ├───────────┤
 ├───────────┤      ├───────────┤       │    UDP    │
 │    IP     │      │    IP     │       ├───────────┤
 └───────────┘      └───────────┘       │    IP     │
                                        └───────────┘
```

| Aspecto | HTTP/1.1 | HTTP/2 | HTTP/3 |
|---|---|---|---|
| Formato | Texto | Binario | Binario |
| Transporte | TCP | TCP | **QUIC/UDP** |
| Peticiones simultáneas | Varias conexiones | **Multiplexación** en una conexión | Multiplexación sin bloqueo de cabeza de línea |
| Cabeceras | Sin comprimir | **HPACK** | **QPACK** |
| Cifrado | Opcional | De hecho obligatorio en navegadores | **Siempre** (TLS 1.3) |
| Identificador ALPN | `http/1.1` | `h2` (`h2c` en claro) | `h3` |

### Herramientas para probar HTTP

```bash
curl -I https://www.organismo.es                        # solo cabeceras (HEAD)
curl -v -o /dev/null https://www.organismo.es           # detalle: DNS, TLS, petición y respuesta
curl -L http://www.organismo.es                         # seguir redirecciones (301, 302, 307, 308)
curl -s -o /dev/null -w "%{http_code} %{http_version} %{time_total}\n" https://www.organismo.es
curl --http2 -sI https://www.organismo.es | head -1     # HTTP/2 200
curl --http3-only -sI https://www.organismo.es          # solo si curl se compiló con HTTP/3
curl -X POST -H "Content-Type: application/json" -d '{"expediente":"2026-0042"}' https://api.organismo.es/v1/consultas
curl -u usuario https://intranet.organismo.es/informes/  # autenticación Basic (pide la contraseña)
```

```powershell
Invoke-WebRequest -Uri https://www.organismo.es -Method Head | Select-Object StatusCode, Headers
(Invoke-WebRequest https://www.organismo.es).StatusCode
Invoke-RestMethod -Uri https://api.organismo.es/v1/estado      # convierte el JSON en objetos
Test-NetConnection www.organismo.es -Port 443                 # ¿está abierto el 443?
```

En el navegador, las **herramientas de desarrollo** (F12, pestaña Red) muestran cada petición, sus cabeceras, el código de estado y la columna **Protocolo** (`http/1.1`, `h2`, `h3`).

### Ejercicios resueltos

1. **Un usuario autenticado en la intranet recibe un error al abrir `/admin`.** Si el servidor sabe quién es pero no le deja pasar, la respuesta es **403 Forbidden**; si no hubiera iniciado sesión sería **401** con `WWW-Authenticate`.
2. **Tras migrar unos servicios, las llamadas `PUT` devuelven 405.** El recurso existe, pero ese **método no está permitido** en él; la cabecera `Allow` dice cuáles sí (por ejemplo, `Allow: GET, POST`).
3. **El proxy inverso delante de Tomcat devuelve 502, 503 o 504.** 502: Tomcat respondió algo inválido o cortó la conexión; 504: Tomcat **no respondió a tiempo**; 503: el servicio está en **mantenimiento** o saturado (por ejemplo, todos los servidores del balanceador están marcados como caídos).
4. **La web cambia de dominio para siempre.** Redirección **301** (o **308** si hay que conservar POST) con `Location: https://nuevo.organismo.es/…`; una redirección temporal sería 302 o 307.
5. **El navegador pide una imagen que ya tiene con `If-None-Match: "a1b2"` y el servidor contesta sin cuerpo.** Es **304 Not Modified**: la copia en caché sigue siendo válida.
6. **Una API devuelve 429 con `Retry-After: 60`.** Se ha superado el **límite de peticiones**; el cliente debe esperar 60 segundos.

## HTTPS

### Concepto

**HTTPS** es **HTTP sobre TLS**: la misma semántica de HTTP, pero los mensajes viajan dentro de un canal **TLS** que se establece antes del primer byte de HTTP. El esquema `https` se definió en la RFC 2818 (2000) y hoy en la **RFC 9110**; su puerto por defecto es el **TCP 443** (y UDP 443 con HTTP/3, donde TLS 1.3 va integrado en QUIC).

| Proporciona | No proporciona |
|---|---|
| **Confidencialidad** de las URL completas, cabeceras, *cookies* y contenidos | Ocultar las **direcciones IP**, los tamaños y tiempos del tráfico ni, sin ECH, el **nombre del servidor** (SNI) |
| **Integridad**: cualquier alteración en tránsito se detecta | Garantía de que el sitio sea **legítimo**: las webs de *phishing* también tienen certificado |
| **Autenticación del servidor** (y opcionalmente del cliente) mediante **certificados X.509** | Protección frente a vulnerabilidades de la aplicación (XSS, inyección) o un servidor comprometido |

### Cómo se establece una conexión HTTPS

1. El navegador **resuelve el nombre** (A/AAAA y, si existe, el registro HTTPS con ALPN y claves ECH).
2. Abre la conexión **TCP al 443** (o QUIC por UDP 443).
3. **Saludo TLS** (*handshake*): el cliente envía `ClientHello` con el nombre del servidor (**SNI**), los protocolos de aplicación que acepta (**ALPN**: `h2`, `http/1.1`) y sus claves efímeras; el servidor responde con su parte del intercambio de claves y su **cadena de certificados**.
4. El navegador **valida el certificado**: que encadene con una **raíz de confianza** de su almacén, que el **nombre** coincida con uno de los nombres alternativos (SAN), que esté **en vigor**, que **no esté revocado** y que figure en los registros de **Transparencia de Certificados**; y comprueba con la **clave pública** del certificado la firma con la que el servidor demuestra poseer la **clave privada**.
5. Ambos derivan las **claves de sesión simétricas** (por Diffie-Hellman efímero) y, desde ese momento, las peticiones y respuestas HTTP viajan **cifradas y autenticadas** (AES-GCM o ChaCha20-Poly1305).

![Diagrama de secuencia de una conexión HTTPS con TLS 1.3: tras la conexión TCP al puerto 443, el navegador envía ClientHello con SNI, ALPN y su clave efímera; el servidor responde ServerHello y, ya cifrados, EncryptedExtensions, Certificate, CertificateVerify y Finished; el navegador valida el certificado y envía Finished; después la petición GET y la respuesta 200 viajan cifradas con clave simétrica](diagramas/IV.8-https-tls13.svg)

*Figura: saludo TLS 1.3 completo en un solo viaje de ida y vuelta antes de enviar HTTP.*

El navegador solo necesita la **clave pública** del servidor, que va en el certificado; la **clave privada nunca sale del servidor** y **no forma parte del certificado**. Los datos no se cifran con la clave pública sino con las **claves simétricas** acordadas en el saludo: la criptografía asimétrica sirve para autenticar y para acordar las claves (en el TLS antiguo con transporte de claves RSA, el cliente cifraba con la clave pública del servidor el secreto inicial).

### Certificados de servidor

Un certificado es un documento electrónico, firmado por una **autoridad de certificación** (CA), que **vincula una clave pública con una identidad** (un nombre de dominio y, según el tipo, una organización). Formato **X.509 v3** (RFC 5280):

| Campo | Contenido |
|---|---|
| Versión y número de serie | v3; serie única dentro de la CA |
| Algoritmo de firma | Por ejemplo, `ecdsa-with-SHA256` o `sha256WithRSAEncryption` |
| **Emisor** (*issuer*) | La **CA** que lo emite |
| **Validez** | Fechas de inicio y fin (`notBefore`, `notAfter`) |
| **Sujeto** (*subject*) | Titular (CN, organización, país) |
| **Clave pública del sujeto** | Algoritmo (RSA, ECDSA) y clave |
| **Extensiones** | **Nombres alternativos del sujeto (SAN)**, que son los que comprueban los navegadores; usos de la clave y uso extendido `serverAuth`; restricciones básicas; puntos de distribución de la CRL; acceso a la información de la autoridad (OCSP y certificado del emisor); políticas; marcas de Transparencia de Certificados (SCT) |
| **Firma de la CA** | Garantiza la autenticidad e integridad del certificado |

**No contiene la clave privada**, que se genera y guarda en el servidor (o en un HSM).

| Clasificación | Tipos |
|---|---|
| Por validación | **DV** (de dominio: solo se comprueba el control del dominio, automatizable; Let's Encrypt), **OV** (de organización), **EV** (validación extendida; los navegadores dejaron de destacarlo en la barra en 2019) y, en la UE, el **certificado cualificado de autenticación de sitio web** (**QWAC**, eIDAS), como los de **sede electrónica** que emite la FNMT |
| Por nombres | **Un dominio**, **multidominio** (varios SAN) y **comodín** (*wildcard*: `*.organismo.es` cubre `sede.organismo.es` pero no `a.b.organismo.es` ni `organismo.es`) |

- **Cadena de confianza**: raíz (autofirmada, incluida en los **almacenes de confianza** de Microsoft, Apple, Mozilla y Chrome) → **CA intermedia** → certificado final. El servidor debe enviar el final **y los intermedios** (no hace falta la raíz). Un certificado **autofirmado** provoca un aviso de seguridad; el CCN exige certificados **emitidos por una CA**.
- **Revocación**: listas **CRL** y consulta en línea **OCSP** (RFC 6960), con ***OCSP stapling*** (el servidor adjunta en el saludo la respuesta OCSP firmada). Tendencia actual: **Let's Encrypt dejó de incluir OCSP en 2025** y los navegadores usan CRL agregadas (CRLSets en Chrome, CRLite en Firefox).
- **Transparencia de Certificados** (CT, RFC 6962 y 9162): las CA registran cada certificado en **registros públicos de solo adición**; los navegadores exigen las pruebas (SCT) y cualquiera puede detectar emisiones fraudulentas (crt.sh).
- **Registro DNS CAA** (RFC 8659): indica **qué CA pueden emitir** certificados para el dominio.
- **Vida máxima** (CA/Browser Forum): 398 días desde 2020, **200 días desde el 15‑3‑2026**, 100 días desde marzo de 2027 y **47 días desde marzo de 2029**; obliga a **automatizar** la renovación con **ACME** (RFC 8555: Let's Encrypt, `certbot`, `acme.sh`, Caddy, cert-manager en Kubernetes).

```bash
# Clave ECDSA P-256 y solicitud de certificado (CSR) con nombres alternativos (-nodes en OpenSSL 1.1)
openssl req -new -newkey ec -pkeyopt ec_paramgen_curve:prime256v1 -noenc \
  -keyout sede.key -out sede.csr \
  -subj "/C=ES/O=Organismo/CN=sede.organismo.es" \
  -addext "subjectAltName=DNS:sede.organismo.es,DNS:www.sede.organismo.es"
openssl x509 -in sede.crt -noout -subject -issuer -dates -ext subjectAltName   # revisar un certificado
openssl s_client -connect sede.organismo.es:443 -servername sede.organismo.es -tls1_3 </dev/null
openssl s_client -connect sede.organismo.es:443 -servername sede.organismo.es </dev/null 2>/dev/null \
  | openssl x509 -noout -enddate                                              # ¿cuándo caduca?
nmap --script ssl-enum-ciphers -p 443 sede.organismo.es                       # versiones y suites ofrecidas
certbot --nginx -d sede.organismo.es                                          # emitir y renovar por ACME
```

### HSTS y redirección de HTTP a HTTPS

Si el usuario escribe `organismo.es` o sigue un enlace `http://`, la primera petición viaja en claro y un atacante en medio puede impedir el salto a HTTPS (**SSL stripping**). Las defensas:

- **Redirección permanente** del puerto 80 al 443 (**301**). Es la recomendación del **CCN**: **mantener el TCP/80 abierto solo para redirigir automáticamente a HTTPS**, sin servir contenido en claro.
- **HSTS** (*HTTP Strict Transport Security*, RFC 6797): la cabecera `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`, recibida **por HTTPS**, obliga al navegador a usar **solo HTTPS** con ese dominio durante `max-age` segundos (convierte internamente `http://` en `https://`) y **no deja saltarse** los errores de certificado. `includeSubDomains` la extiende a los subdominios.
- **Lista de precarga HSTS** (*preload*): los navegadores incorporan de fábrica los dominios inscritos (requisitos: certificado válido, redirección a HTTPS, todos los subdominios en HTTPS y `max-age` de al menos un año con `includeSubDomains` y `preload`), lo que protege incluso la **primera visita**.
- **Navegadores**: Chrome 154 (octubre de 2026) activa por defecto **«Usar siempre conexiones seguras»** para los sitios públicos: intenta HTTPS y avisa antes de cargar un sitio público que solo funcione con HTTP.

**Contenido mixto**: una página HTTPS que carga recursos por HTTP. Los navegadores **bloquean** el activo (*scripts*, marcos, peticiones de *script*) y **actualizan a HTTPS** o bloquean el pasivo (imágenes, audio, vídeo); la directiva CSP `upgrade-insecure-requests` ayuda a migrar.

### Configuración segura de un servidor HTTPS

```apache
# Apache 2.4 con mod_ssl, mod_headers y mod_http2
<VirtualHost *:80>
    ServerName sede.organismo.es
    Redirect permanent / https://sede.organismo.es/          # 301 a HTTPS
</VirtualHost>

<VirtualHost *:443>
    ServerName sede.organismo.es
    Protocols h2 http/1.1
    SSLEngine on
    SSLCertificateFile    /etc/pki/tls/certs/sede-cadena.crt # certificado + intermedias (SSLCertificateChainFile está obsoleta)
    SSLCertificateKeyFile /etc/pki/tls/private/sede.key      # clave privada, legible solo por root
    SSLProtocol -all +TLSv1.2 +TLSv1.3                       # nada por debajo de TLS 1.2
    SSLCipherSuite ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384
    SSLUseStapling on
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
</VirtualHost>

# Fuera de los VirtualHost (configuración global)
SSLStaplingCache  shmcb:/run/httpd/ssl_stapling(32768)
SSLSessionCache   shmcb:/run/httpd/sslcache(512000)
SSLSessionCacheTimeout 300        # segundos que una sesión TLS permanece en la caché de sesiones
TraceEnable off
ServerTokens Prod                 # no revelar versiones en la cabecera Server
```

```nginx
# Nginx 1.25 o posterior
server {
    listen 80;
    server_name sede.organismo.es;
    return 301 https://$host$request_uri;
}
server {
    listen 443 ssl;
    listen 443 quic reuseport;                    # HTTP/3
    http2 on;
    server_name sede.organismo.es;
    ssl_certificate     /etc/pki/tls/certs/sede-cadena.crt;
    ssl_certificate_key /etc/pki/tls/private/sede.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_stapling on;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Alt-Svc 'h3=":443"; ma=86400';     # anuncia HTTP/3
}
```

En **IIS** el certificado se asocia al sitio con un **enlace** (*binding*) `https` en el puerto 443 y las versiones de TLS se controlan en Schannel (registro de Windows o directivas); Microsoft ha declarado obsoletos TLS 1.0 y 1.1 y los desactiva por defecto en las versiones nuevas de Windows. Para comprobar el resultado: **SSL Labs** (calificación de A+ a F), `testssl.sh`, `nmap --script ssl-enum-ciphers` y el generador de configuraciones de Mozilla (perfiles *moderno*, solo TLS 1.3; *intermedio*, TLS 1.2 y 1.3; y *antiguo*).

## Protocolos SSL y TLS

### Origen y versiones

**SSL** (*Secure Sockets Layer*) lo creó **Netscape** a mediados de los noventa para proteger el comercio en la web. Cuando el **IETF** lo estandarizó en 1999 lo renombró **TLS** (*Transport Layer Security*). Todas las versiones de SSL y TLS 1.0/1.1 están hoy **prohibidas u obsoletas**; aun así, por costumbre se sigue hablando de «certificados SSL» o «VPN SSL» aunque el protocolo sea TLS.

| Versión | Año | Especificación | Situación |
|---|---|---|---|
| SSL 1.0 | 1994 | Nunca publicada | Defectuosa |
| **SSL 2.0** | 1995 | Netscape | **Prohibida** (RFC 6176, 2011); ataque DROWN |
| **SSL 3.0** | 1996 | RFC 6101 (histórica) | **Obsoleta** (RFC 7568, 2015) tras el ataque **POODLE** |
| **TLS 1.0** | 1999 | RFC 2246 | **Obsoleta** (**RFC 8996**, 2021); ataque BEAST |
| **TLS 1.1** | 2006 | RFC 4346 | **Obsoleta** (RFC 8996, 2021) |
| **TLS 1.2** | 2008 | **RFC 5246** | **Admitida** con suites ECDHE y AEAD (mínimo exigido por el CCN y por la BCP 195, RFC 9325) |
| **TLS 1.3** | 2018 | **RFC 8446**, revisada en la **RFC 9846** (julio de 2026; mismo protocolo) | **Versión vigente y recomendada** |

Los navegadores desactivaron TLS 1.0 y 1.1 en **2020**. DTLS (la variante para UDP) sigue la misma evolución: DTLS 1.2 (RFC 6347) y **DTLS 1.3** (RFC 9147).

### Posición en la pila y servicios de seguridad

TLS se sitúa **entre la capa de transporte (TCP) y la de aplicación**: en el modelo TCP/IP forma parte de la capa de aplicación (por encima de TCP) y en OSI suele asignarse a las capas de **sesión y presentación**. Es independiente del protocolo de aplicación, por lo que protege HTTP, SMTP, IMAP, LDAP, FTP, SIP o MQTT. Ofrece:

- **Confidencialidad**: cifrado **simétrico** de los datos (AES, ChaCha20).
- **Integridad y autenticidad de los mensajes**: HMAC o, mejor, cifrado autenticado **AEAD**.
- **Autenticación** de los extremos con **certificados X.509** (normalmente solo el servidor; también el cliente en el **TLS mutuo**).
- **Secreto perfecto hacia adelante** (*forward secrecy*): con Diffie-Hellman **efímero**, el robo posterior de la clave privada no permite descifrar el tráfico grabado.
- **Protección frente a la reproducción** mediante números de secuencia, y frente a ataques de **degradación** de versión.

### Subprotocolos

| Subprotocolo | Función |
|---|---|
| **Registro** (*Record*) | Capa inferior: **fragmenta** los datos en registros de hasta 16 KB, los **protege** (cifra y autentica con las claves acordadas) y los transmite; transporta a los demás subprotocolos |
| **Saludo** (*Handshake*) | **Negocia** versión, suite y parámetros, **autentica** a las partes y **establece las claves** |
| **Alerta** (*Alert*) | Avisos y errores, con nivel *warning* o *fatal* (un error fatal cierra la conexión): `close_notify`, `handshake_failure`, `bad_certificate`, `certificate_expired`, `unknown_ca`, `protocol_version`, `decrypt_error`… |
| **Cambio de especificación de cifrado** (*ChangeCipherSpec*) | Hasta TLS 1.2, un único mensaje que indica que se empieza a usar lo negociado; **TLS 1.3 lo elimina** (solo se envía uno ficticio por compatibilidad con equipos intermedios) |
| Datos de aplicación | El tráfico protegido (HTTP, SMTP…) |

Se suele describir TLS como **dos capas**: la del **protocolo de registro** (abajo) y la de los **protocolos de saludo** (con alerta y *ChangeCipherSpec*) por encima. TLS necesita un transporte **fiable** (TCP); para UDP existe **DTLS**. Proporciona **confidencialidad e integridad**. No hay que confundir sus componentes con los de **IPsec** (IKE, AH y ESP; tema IV.9).

La extensión *Heartbeat* (RFC 6520) se hizo famosa por **Heartbleed** (2014), un fallo de **OpenSSL** que dejaba leer memoria del servidor, incluidas claves privadas.

### Suites de cifrado

En **TLS 1.2** una suite combina **cuatro** algoritmos:

```text
TLS _ ECDHE _ RSA _ WITH _ AES_128_GCM _ SHA256
      │       │            │             └─ función hash (PRF; HMAC en suites no AEAD)
      │       │            └─ cifrado simétrico y modo (AEAD: GCM)
      │       └─ autenticación del servidor (tipo de clave del certificado)
      └─ intercambio de claves (Diffie-Hellman efímero de curva elíptica → secreto hacia adelante)
```

| Componente | Recomendado | Evitar o prohibido |
|---|---|---|
| Intercambio de claves | **ECDHE**, DHE con grupos de al menos 3072 bits | **RSA** estático (sin secreto hacia adelante, ataque ROBOT), DH estático, suites anónimas (`anon`), de exportación |
| Autenticación | **ECDSA** (P-256, P-384) o **RSA** de al menos 2048 bits (3072 para alcanzar 128 bits de fortaleza) | DSA, claves RSA de 1024 bits |
| Cifrado | **AES-GCM**, AES-CCM, **ChaCha20-Poly1305** (AEAD) | **RC4** (prohibido, RFC 7465), 3DES (Sweet32), DES, NULL; CBC desaconsejado |
| Hash | SHA-256, SHA-384 | **MD5**, SHA-1 |

Las suites que recomienda el CCN para **TLS 1.2** son las **ECDHE-ECDSA** y **ECDHE-RSA** con AES-128-GCM-SHA256 o AES-256-GCM-SHA384 y las **DHE-RSA** con esos mismos cifrados. En **TLS 1.3** la suite solo indica el **cifrado AEAD y el hash** (el intercambio de claves y la firma se negocian aparte) y hay **cinco**: `TLS_AES_128_GCM_SHA256`, `TLS_AES_256_GCM_SHA384`, `TLS_CHACHA20_POLY1305_SHA256`, `TLS_AES_128_CCM_SHA256` y `TLS_AES_128_CCM_8_SHA256`; según el CCN, cualquiera tiene la fortaleza que exige el ENS.

### El saludo de TLS 1.2

```text
Cliente                                                    Servidor
ClientHello  ─────────────────────────────────────────▶   (versión máxima, aleatorio, suites, extensiones: SNI, ALPN…)
             ◀─────────────────────────────────────────   ServerHello (versión y suite elegidas, aleatorio)
                                                          Certificate (cadena del servidor)
                                                          ServerKeyExchange (parámetros ECDHE firmados)
                                                          [CertificateRequest] (si pide certificado al cliente)
                                                          ServerHelloDone
[Certificate]
ClientKeyExchange (parte ECDHE del cliente)
[CertificateVerify]
ChangeCipherSpec
Finished     ─────────────────────────────────────────▶
             ◀─────────────────────────────────────────   ChangeCipherSpec, Finished
Datos ◀════════════════════════════════════════════════▶  Datos            → dos viajes de ida y vuelta (2-RTT)
```

Del secreto previo (*pre-master secret*) y los dos aleatorios se obtiene el **secreto maestro** y de él las claves de sesión. La sesión puede **reanudarse** con un identificador de sesión o un *ticket* (saludo abreviado). TLS 1.2 permite la **renegociación** (el servidor la pide con `HelloRequest`), que tuvo un fallo grave en 2009 corregido por la RFC 5746.

### El saludo de TLS 1.3

```text
Cliente                                                    Servidor
ClientHello
 + supported_versions, key_share (claves efímeras),
 + signature_algorithms, server_name (SNI), ALPN ───────▶
                                                           ServerHello + key_share
                                                           {EncryptedExtensions}
                                                           {CertificateRequest}*
                                                           {Certificate}
                                                           {CertificateVerify}   (firma del saludo con la clave privada)
                                              ◀─────────── {Finished}
{Certificate}*  {CertificateVerify}*  {Finished} ────────▶
[Datos de aplicación] ◀════════════════════════════════▶  [Datos de aplicación]  → un viaje de ida y vuelta (1-RTT)

{ } cifrado con las claves del saludo · [ ] cifrado con las claves de tráfico · * solo con autenticación del cliente
```

- **Siempre lo inicia el cliente** con `ClientHello`. Si el servidor **acepta** los parámetros, responde con **`ServerHello`**; si no admite el grupo de claves que el cliente propuso, envía **`HelloRetryRequest`** (un `ServerHello` especial) y el cliente repite el `ClientHello` (2-RTT); si no hay acuerdo posible, aborta con una **alerta** (`handshake_failure`).
- Tras el `ServerHello` **todo va cifrado**, incluido el certificado.
- **Reanudación y 0‑RTT**: tras el saludo, el servidor puede enviar **`NewSessionTicket`**; en la siguiente conexión el cliente usa esa clave precompartida (PSK) y puede mandar **datos tempranos** (*early data*) en el primer vuelo, a costa de que se puedan **reproducir** y no tengan secreto hacia adelante, por lo que solo deben usarse para peticiones idempotentes (el servidor puede responder **425 Too Early**).
- Mensajes tras el saludo: `NewSessionTicket`, **`KeyUpdate`** (renovar las claves) y autenticación del cliente posterior al saludo.
- **Protección frente a degradación**: si un servidor TLS 1.3 tiene que negociar TLS 1.2 o inferior, marca los últimos ocho bytes de su aleatorio con un valor fijo («DOWNGRD») que el cliente comprueba.
- Por compatibilidad con cortafuegos antiguos, el `ClientHello` se presenta como TLS 1.2 y la versión real va en la extensión **`supported_versions`**.

### TLS 1.2 frente a TLS 1.3

| Aspecto | TLS 1.2 | **TLS 1.3** |
|---|---|---|
| Saludo completo | 2-RTT | **1-RTT** (y **0‑RTT** al reanudar) |
| Intercambio de claves | RSA, DH estático, DHE, ECDHE | **Solo (EC)DHE efímero y PSK**: secreto hacia adelante **siempre** |
| Cifrado | CBC, RC4, 3DES, GCM… | **Solo AEAD**: AES-GCM, AES-CCM, ChaCha20-Poly1305 |
| Derivación de claves | PRF con MD5/SHA-1 o SHA-256 | **HKDF** con SHA-256 o SHA-384 |
| Certificado del servidor | Viaja **en claro** | **Cifrado** |
| Compresión | Permitida (ataque CRIME) | **Eliminada** |
| Renegociación (`HelloRequest`) | Sí | **Eliminada** (se usan `KeyUpdate` y la autenticación posterior) |
| Firmas | RSA PKCS#1 v1.5, DSA, ECDSA | **RSA-PSS**, ECDSA, **EdDSA** (Ed25519); DSA eliminado |
| Mensajes que desaparecen | — | `HelloRequest`, `ServerKeyExchange`, `ClientKeyExchange`, `ServerHelloDone`, `ChangeCipherSpec` |
| Mensajes nuevos | — | `HelloRetryRequest`, `EncryptedExtensions`, `KeyUpdate`, `EndOfEarlyData` |
| Suites | Decenas de combinaciones | **Cinco** |

### Extensiones y variantes importantes

- **SNI** (*Server Name Indication*, RFC 6066): el cliente indica en el `ClientHello` el **nombre del servidor** al que quiere conectar, para que un servidor con **una sola IP** y varios sitios HTTPS elija el **certificado** correcto. Viaja **en claro**, por lo que permite saber a qué sitio se conecta alguien (y filtrar por nombre).
- **ECH** (*Encrypted Client Hello*, **RFC 9849**, 2026): cifra el `ClientHello` interior (con el SNI real) con una clave pública que el servidor publica en su **registro DNS HTTPS**; desde fuera solo se ve un nombre genérico del proveedor.
- **ALPN** (RFC 7301): negocia el **protocolo de aplicación** dentro del saludo (`h2`, `http/1.1`, `h3`).
- *OCSP stapling* (extensión `status_request`), `supported_groups` y `key_share` (grupos y claves para el intercambio), `signature_algorithms`, `pre_shared_key` y `early_data`; en TLS 1.2, *Extended Master Secret* (RFC 7627) y la renegociación segura (RFC 5746).
- **TLS mutuo** (mTLS): el servidor envía `CertificateRequest` y el cliente se autentica con **su certificado** (DNIe, certificados de la FNMT, tarjetas de empleado público, certificados de componente entre servicios). El CCN lo recomienda donde sea posible.
- **DTLS** (RFC 6347 y 9147): TLS sobre **UDP** que tolera pérdidas y desorden; se usa en WebRTC (DTLS-SRTP), VoIP, VPN TLS (canal de datos) y CoAP. **QUIC** usa el saludo de TLS 1.3 pero con su propia protección de paquetes (RFC 9001).

### TLS implícito y STARTTLS

| Protocolo | TLS **implícito** (puerto dedicado, TLS desde el primer byte) | **STARTTLS** (se empieza en claro y se pide TLS en el mismo puerto) |
|---|---|---|
| HTTP | **HTTPS 443** | — |
| SMTP (envío) | **465** | **587** (y 25 entre servidores) |
| IMAP | **993** | 143 |
| POP3 | **995** | 110 |
| LDAP | **636** | 389 |
| FTP | 990 (obsoleto) | 21 (`AUTH TLS`) |
| Otros | SIP 5061, DoT 853, NNTP 563, IRC 6697, MQTT 8883, *syslog* 6514 | XMPP 5222 |

STARTTLS es vulnerable a que un atacante en medio **elimine la oferta de TLS** (*STARTTLS stripping*); la RFC 8314 recomienda el **TLS implícito** para enviar y leer correo, y entre servidores de correo se usan MTA-STS o DANE (tema IV.3).

### Ataques y vulnerabilidades históricas

| Año | Nombre | Qué explotaba | Defensa |
|---|---|---|---|
| 2009 | ***SSL stripping*** | El salto de HTTP a HTTPS | **HSTS** |
| 2009 | Renegociación | La renegociación de TLS ≤ 1.2 | RFC 5746 |
| 2011 | **BEAST** | CBC en **TLS 1.0** | TLS 1.2, AEAD |
| 2011 | DigiNotar | Una CA comprometida emitió certificados falsos | Transparencia de Certificados, retirar la CA |
| 2012 | **CRIME** | **Compresión TLS** | Desactivar la compresión (TLS 1.3 la elimina) |
| 2013 | **BREACH** | Compresión HTTP de respuestas con secretos | No comprimir secretos, enmascarar *tokens* |
| 2013 | Lucky Thirteen; sesgos de RC4 | Tiempos de CBC; debilidad de RC4 | AEAD; prohibir RC4 |
| 2014 | **Heartbleed** | Fallo de **OpenSSL** en *Heartbeat* | Parchear, revocar y reemitir certificados |
| 2014 | **POODLE** | Relleno CBC de **SSL 3.0** | Desactivar SSL 3.0 |
| 2015 | FREAK y **Logjam** | Suites de **exportación** y DH débil | Eliminar exportación; grupos DH grandes o ECDHE |
| 2016 | **DROWN** | **SSLv2** activo con la misma clave | Desactivar SSLv2 en todos los servidores |
| 2016 | Sweet32 | Cifrados de bloque de 64 bits (**3DES**) | AES |
| 2017 | ROBOT | Intercambio de claves **RSA** (Bleichenbacher) | ECDHE; TLS 1.3 |
| 2020-2021 | Raccoon, ALPACA | DH en TLS ≤ 1.2; confusión entre protocolos con el mismo certificado | ECDHE; comprobar ALPN y SNI |

### Criptografía poscuántica en TLS

Un ordenador cuántico suficientemente grande rompería con el algoritmo de **Shor** RSA, Diffie-Hellman y las curvas elípticas. Como el tráfico cifrado hoy puede **guardarse y descifrarse en el futuro** (*harvest now, decrypt later*), lo primero que se ha protegido es el **intercambio de claves**:

- El NIST publicó en agosto de 2024 **ML-KEM** (FIPS 203, encapsulación de claves), **ML-DSA** (FIPS 204) y **SLH-DSA** (FIPS 205, firmas) (tema IV.5).
- **Intercambio híbrido** en TLS 1.3: **X25519MLKEM768** combina X25519 (clásico) con ML-KEM-768 (poscuántico) y es seguro mientras **cualquiera de los dos** lo sea. Lo usan por defecto Chrome y Edge, Firefox, los sistemas de Apple desde iOS/macOS 26, **OpenSSL 3.5** (abril de 2025) y las grandes CDN; el IETF lo estandarizó en la **RFC 10024** (agosto de 2026). A finales de 2025 ya protegía **más de la mitad** del tráfico humano que atiende Cloudflare.
- La **autenticación** poscuántica (certificados con ML-DSA) llega más tarde por el tamaño de claves y firmas.
- **TLS 1.2 no recibirá algoritmos poscuánticos**: otra razón para migrar a TLS 1.3. La hoja de ruta de la UE pide inventariar la criptografía y empezar la transición en 2026.

### Recomendaciones del CCN y del ENS

El informe **CCN-PYTEC n.º 8, *Requisitos de seguridad para TLS*** (2020) y la guía **CCN-STIC-807** (*Criptología de empleo en el ENS*) fijan:

- **Usar TLS 1.2 o superior y deshabilitar cualquier versión inferior** (requisito 1); **TLS 1.3 es la versión recomendada**. Es decir: **mínimo 1.2, recomendada 1.3**.
- Intercambio de claves **DHE o ECDHE** (secreto hacia adelante); no usar claves precompartidas salvo con entropía suficiente; grupos DH de al menos 112 bits de fortaleza (128 en categoría ALTA): no usar `ffdhe2048`.
- Cifrado **AES en modos AEAD** (GCM, CCM) y hash **SHA-2**; MD5 nunca; SHA-1 solo de forma transitoria en HMAC.
- Certificados **X.509 v3 RSA o ECDSA emitidos por una CA** (no autofirmados), con validación completa de la **cadena** y de la **revocación** (CRL u OCSP), uso extendido `serverAuth`/`clientAuth` y **rechazo de la conexión** si la validación falla; se recomienda la **autenticación mutua**.
- Productos cualificados del **CPSTIC** para las VPN TLS en sistemas del ENS.

En el **ENS** (Real Decreto 311/2022) se aplican las medidas **[mp.com.2] Protección de la confidencialidad** (cifrar cuando la comunicación sale del dominio de seguridad, con algoritmos autorizados por el CCN), **[mp.com.3] Protección de la integridad y de la autenticidad** (autenticar el otro extremo antes de intercambiar información y prevenir la alteración en tránsito y el secuestro de sesión), **[mp.s.2] Protección de servicios y aplicaciones web** (manipulación de URL y *cookies*, inyección de código, XSS y, en categoría ALTA, protección de *proxies* y cachés), **[mp.s.3] Protección de la navegación web** y **[mp.s.4] Protección frente a la denegación de servicio**.

## Normativa y estándares clave

| Norma o estándar | Qué regula | Puntos clave |
|---|---|---|
| **RFC 9110** (2022) | Semántica de HTTP | Métodos, **códigos de estado**, cabeceras, esquemas `http` y `https`; sustituye a las RFC 7230-7235 y 2818 |
| RFC 9111 / **9112** / **9113** / **9114** | Caché / HTTP/1.1 / **HTTP/2** / **HTTP/3** | HTTP/2 antes en la RFC 7540 (2015); HTTP/1.1 antes en la RFC 2616 (1999) |
| RFC 7541 y 9204 | HPACK y QPACK | Compresión de cabeceras de HTTP/2 y HTTP/3 |
| **RFC 9000**, 9001, 9002 | **QUIC** | Transporte sobre UDP con TLS 1.3 integrado |
| RFC 3986 | Sintaxis de los URI | Esquema, autoridad, ruta, consulta y fragmento |
| RFC 6265 (revisión 6265bis en curso) | *Cookies* | `Secure`, `HttpOnly`, `SameSite` |
| **RFC 6797** | **HSTS** | `Strict-Transport-Security`, `max-age`, `includeSubDomains`, precarga |
| RFC 10008 (2026) | Método **QUERY** | Consulta segura e idempotente con cuerpo |
| **RFC 8446** (2018) → **RFC 9846** (2026) | **TLS 1.3** | 1-RTT, solo AEAD y (EC)DHE, cinco suites; `ClientHello`, `ServerHello`, `HelloRetryRequest` |
| RFC 5246 | TLS 1.2 | Aún admitido con ECDHE y AEAD |
| **RFC 8996** (2021) | Obsolescencia de TLS 1.0 y 1.1 | Junto con RFC 6176 (SSLv2) y RFC 7568 (SSLv3) |
| RFC 9325 (BCP 195) | Uso seguro de TLS y DTLS | TLS 1.2 obligatorio, TLS 1.3 recomendado |
| RFC 6066, 7301, **9849** | SNI, ALPN, **ECH** | Nombre del servidor, protocolo de aplicación, ocultación del SNI |
| RFC 10024 (2026) | Intercambio híbrido poscuántico en TLS 1.3 | X25519MLKEM768 |
| RFC 5280, 6960, 6962/9162, 8659, 8555 | Certificados X.509, OCSP, Transparencia de Certificados, CAA, ACME | Validación y automatización |
| RFC 959, 4217 | FTP y FTP sobre TLS | Puertos 21/20, modos activo y pasivo, tipos ASCII y binario |
| RFC 1034 y 1035; 7858, 8484, 9250; 9460 | DNS; DoT, DoH, DoQ; registros SVCB/HTTPS | SOA, resolución recursiva e iterativa |
| **Real Decreto 311/2022** (ENS) | Seguridad del sector público | [mp.com.2], [mp.com.3], [mp.s.2], [mp.s.3], [mp.s.4] |
| **CCN-STIC-807** e informe **CCN-PYTEC n.º 8** | Criptología de empleo en el ENS; requisitos para TLS | **TLS 1.2 como mínimo**, 1.3 recomendada; ECDHE, AES-GCM, SHA-2; certificados de CA |
| Ley 34/2002 (**LSSI**), art. 22.2 | Servicios de la sociedad de la información | Consentimiento informado para *cookies* no técnicas |
| Ley 11/2022 General de Telecomunicaciones | Mercado y redes de telecomunicaciones | Marco español de las redes y servicios |
| Reglamento (UE) 910/2014 (eIDAS), modificado por el 2024/1183 | Identificación electrónica y servicios de confianza | Certificados cualificados de autenticación de sitio web (QWAC) |
| CA/Browser Forum, *Baseline Requirements* | Certificados TLS públicos | Vida máxima de 200 días desde el 15‑3‑2026 (47 en 2029) |

## Lo que más cae en el examen

En los exámenes analizados (TAI 2016-2025, ingreso libre y promoción interna) hay **40 preguntas** de este tema: **24 de ingreso libre** (4 en 2016, 2 en 2018, 2 en 2019, 3 en 2021, 4 en 2023, 5 en 2024, 2 en la convocatoria de 2025, examinada en mayo de 2026, y 2 en su llamamiento extraordinario de julio de 2026, citado como «2025‑ext») y **16 de promoción interna** (4 en 2018, 4 en 2019, 1 en 2021, 3 en 2023, 2 en 2024 y 2 en 2025). Hay otras relacionadas en temas vecinos: cabeceras de seguridad y *cookies* (III.8), proxy transparente y Squid (IV.9).

| Bloque | Preguntas | Exámenes |
|---|---|---|
| **TLS**: capas de TLS 1.2 (registro y saludo), última versión estable (1.3), mensajes del saludo de TLS 1.3 (`HelloRequest` no existe; lo inicia el cliente; tras `ClientHello` el servidor responde `ServerHello`), ventaja de TLS 1.3 (**1-RTT**), versión **mínima 1.2 y recomendada 1.3 según el CCN** (×2) y protocolo de seguridad de HTTP (anulada) | 9 | LI 2016, 2019, 2021, 2023, 2024, 2025 y 2025‑ext; PI 2019 y 2024 |
| **Códigos de estado HTTP**: 207 Multi-Status, 408 Request Timeout, 301 permanente, **405** método no permitido, 503 servicio no disponible, **403** sin autorización, **4xx** errores del cliente (×2), **3xx** redirecciones | 9 | LI 2016, 2018, 2021, 2024 y 2025; PI 2018, 2019, 2024 y 2025 |
| **DNS**: registro **SOA** (×3, una por el correo del administrador de la zona), función del DNS y `nslookup` | 5 | LI 2021; PI 2018 (×2), 2021 y 2025 |
| **Certificados y HTTPS**: el navegador necesita la **clave pública** (×2); el certificado **no contiene la clave privada** | 3 | LI 2023; PI 2023 |
| **HSTS y seguridad web**: nombre de **HSTS**, redirección del 80 a HTTPS según el CCN, atributo `HttpOnly` | 3 | LI 2018, 2024 y 2025‑ext |
| **Puertos y versiones**: 80 y 443 (×2); HTTP/2 binario, `h2` y `h2c` | 3 | LI 2016 y 2019; PI 2019 |
| **FTP**: órdenes `get`, `put`, `mget`, `mput`; tipo ASCII para texto plano | 2 | LI 2016 y 2024 |
| **Proxy‑caché Squid** en un supuesto | 2 | LI 2023; PI 2023 |
| **Apache**: `VirtualHost`; `SSLCertificateFile` y `SSLCertificateKeyFile`; `SSLSessionCacheTimeout` | 3 | LI 2023; PI 2018 y 2019 |
| Organismos: qué es el **IETF** | 1 | LI 2024 |

Patrón: preguntas cortas de **memoria exacta** (código, puerto, versión, RFC, nombre de mensaje) en el cuestionario, y en el supuesto práctico decisiones de **administración** (proxy, Apache, TLS y CCN). Desde 2021 TLS 1.3 aparece **todos los años**.

## Trampas habituales

- **401** = falta autenticación; **403** = autenticado o no, **no tiene autorización**; 407 = autenticación ante el **proxy**.
- **4xx = error del cliente**, **5xx = error del servidor**; **3xx = redirecciones** (el cliente debe hacer algo más); 2xx = éxito; 1xx = informativos.
- **503** = servicio no disponible; 500 = error interno; 501 = no implementado; 502 = respuesta inválida de la pasarela; 504 = la pasarela no recibió respuesta a tiempo; **408** = *Request Timeout* (el **cliente** tardó demasiado); 405 = método no permitido.
- **301** permanente, **302** temporal, 304 no modificado (caché); 307/308 conservan el método; **207 Multi-Status** es de WebDAV; 401 es *Unauthorized* y 403 *Forbidden* (no al revés); 502 es *Bad Gateway* (no 500).
- Puertos por defecto de la IANA: **HTTP 80 y HTTPS 443** (8080, 8000 y 8443 no son los estándar); HTTP/3 usa **UDP** 443.
- **HTTP/2 es binario**; `h2` = HTTP/2 **sobre TLS** y `h2c` = **en claro**; su RFC fue la **7540** (hoy 9113), no la 7543.
- La última versión de TLS es la **1.3** (no existe TLS 1.4; SSL 3.0 es anterior a TLS 1.0).
- TLS 1.3 negocia con **`ClientHello`**, **`ServerHello`** y **`HelloRetryRequest`**; **`HelloRequest`** era de TLS 1.2 (renegociación) y **no existe** en 1.3.
- El saludo lo **inicia siempre el cliente**; si el servidor acepta los parámetros, contesta **`ServerHello`** (no `ack`, `reset` ni `end`).
- La ventaja clave de TLS 1.3 es el saludo en **1-RTT** (menos latencia); sigue usando **certificados**.
- El certificado contiene la **clave pública** y la firma de la CA, **nunca la clave privada**; el navegador **solo necesita la clave pública** del sitio.
- **CCN**: TLS **mínimo 1.2, recomendado 1.3**; el puerto **80** se mantiene **solo para redirigir a HTTPS**.
- **STARTTLS** no es un protocolo de seguridad sino una orden para pasar a TLS en el mismo puerto; **WPA2** es seguridad Wi‑Fi; el protocolo que protege HTTP es **TLS** (SSL es su antecesor).
- **SOA** = datos básicos de la zona (primario, **correo del responsable**, serie, tiempos); no confundir con NS, MX, PTR o AAAA.
- El DNS traduce **nombres en direcciones IP**; ARP traduce **IP en MAC**; el encaminamiento elige rutas.
- **IETF** = crea los estándares de Internet; **ICANN** = coordina el DNS y los identificadores; **IANA** = gestiona la raíz del DNS, las direcciones y los registros de protocolos; **IGF** = foro de gobernanza de la ONU; **UIT** = telecomunicaciones de la ONU.
- `get`, `put`, `mget` y `mput` son órdenes del cliente **FTP** (no de Telnet ni SSL).
- TLS 1.2 funciona en **dos capas** (registro y saludo), da **confidencialidad e integridad** y va sobre **TCP** (sobre UDP es DTLS); **IKE, AH y ESP son de IPsec**.
- FTP: **ASCII para texto plano**; **binario para todo lo demás** (también las imágenes de una página web); no existe un tipo «multimedia».
- **Squid** es el proxy‑caché; InfluxDB (base de datos de series temporales), Grafana (paneles) y Checkmk (monitorización) no lo son.
- **Proxy transparente** = el cliente **no se configura** (el tráfico se desvía con NAT); proxy inverso = delante de los servidores.
- Apache: **`VirtualHost`** para varios dominios; **`SSLCertificateFile`** y **`SSLCertificateKeyFile`** para el certificado y la clave; **`SSLSessionCacheTimeout`** para la vida de las sesiones en caché.
- ***Cookies***: **`HttpOnly`** = no accesible desde JavaScript (XSS); **`Secure`** = solo por HTTPS; **`SameSite`** = no se envía en peticiones de otros sitios (CSRF); `Domain` = ámbito.
- La política que obliga a usar HTTPS se llama **HSTS** (no SHTS ni AHTS).
- **SNI viaja en claro** (ECH lo cifra); **DNSSEC firma pero no cifra**.
- La web **no es** Internet: es uno de sus servicios.

## Repaso rápido

- Internet: red de redes TCP/IP con direcciones únicas; sistemas autónomos unidos con **BGP**; proveedores de nivel 1, 2 y 3; **tránsito** (pago) y ***peering***; **puntos neutros** (ESpanix); CDN.
- DNS: raíz con **13 identidades (A-M)**, 12 operadores y más de 2 000 instancias; TLD genéricos y de país; `.es` (1988) gestionado por **Red.es**.
- Organismos: **ISOC**, **IETF** (RFC), IAB, IESG, IRTF, **IANA/PTI**, **ICANN** (1998; transición de 2016), RIR (RIPE NCC), **W3C**, WHATWG, UIT, IGF.
- Historia: ARPANET **1969**; TCP/IP en ARPANET el **1‑1‑1983**; DNS 1983; NSFNET 1986; web de **Berners-Lee** (CERN, 1989-1991); Mosaic 1993; Internet comercial 1995; España: UPM 1985, RedIRIS 1988.
- Estado en 2026: **6 000 millones** de usuarios; IPv6 en torno al 50 % hacia Google (España ≈ 10 %); HTTPS > 95 %; HTTP/3 ≈ 41 % de los sitios; TLS 1.3 y claves híbridas poscuánticas.
- Servicios: web 80/443, correo 25/587/465/993/995, DNS 53, FTP 21/20, SFTP 22, TFTP UDP 69, Telnet 23, SSH 22, NNTP 119, NTP UDP 123, LDAP 389/636, RDP 3389.
- FTP: control 21 y datos 20; **activo** (el servidor abre la conexión de datos) y **pasivo** (la abre el cliente); tipos **ASCII** y **binario**; FTPS (TLS) ≠ SFTP (SSH).
- Proxies: de reenvío, **transparente**, **inverso**, **caché (Squid 3128)**, SOCKS; `CONNECT` para HTTPS.
- HTTP: cliente-servidor, **sin estado**, RFC 9110; HTTP/1.1 con `Host` obligatorio y conexiones persistentes; **HTTP/2 binario y multiplexado** (HPACK, `h2`/`h2c`); **HTTP/3 sobre QUIC/UDP** (QPACK, sin bloqueo de cabeza de línea, 0‑RTT, migración).
- Métodos: GET, HEAD, OPTIONS y TRACE seguros; PUT y DELETE idempotentes; POST y PATCH ni lo uno ni lo otro; QUERY (2026) seguro e idempotente con cuerpo.
- Códigos: 1xx informativos, **2xx éxito**, **3xx redirección**, **4xx error del cliente**, **5xx error del servidor**; 200, 201, 204, 301, 302, 304, 307, 308, 400, **401**, **403**, 404, 405, 408, 429, 500, 502, **503**, 504.
- *Cookies*: `Set-Cookie`/`Cookie`; atributos `Secure`, `HttpOnly`, `SameSite`, `Domain`, `Path`, `Max-Age`; LSSI art. 22.2.
- Caché: `Cache-Control` (`max-age`, `no-cache`, `no-store`), `ETag`/`If-None-Match`, `Last-Modified`/`If-Modified-Since` → 304.
- HTTPS = HTTP sobre TLS, puerto **443**; certificado X.509 v3 con **clave pública** (nunca la privada); DV/OV/EV/QWAC; cadena, CRL/OCSP, Transparencia de Certificados, CAA, ACME; vida máxima de 200 días desde marzo de 2026.
- **HSTS** (RFC 6797) y redirección **301** del puerto 80 (recomendación del CCN); Chrome 154 avisa antes de abrir sitios solo HTTP.
- SSL 2.0/3.0 y TLS 1.0/1.1 **prohibidos**; **TLS 1.2 mínimo** y **TLS 1.3 recomendado** (RFC 8446, revisada en la 9846).
- TLS: subprotocolos de registro, saludo, alerta y *ChangeCipherSpec*; suites `TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256` (1.2) y cinco suites AEAD en 1.3.
- TLS 1.3: **1-RTT**, 0‑RTT al reanudar, solo (EC)DHE y AEAD, certificado cifrado, sin compresión ni renegociación; mensajes `ClientHello`, `ServerHello`, `HelloRetryRequest`, `EncryptedExtensions`, `Certificate`, `CertificateVerify`, `Finished`.
- Extensiones: **SNI** (en claro), **ECH** (RFC 9849), **ALPN**; TLS mutuo; DTLS para UDP; STARTTLS frente a TLS implícito.
- Ataques: SSL stripping, BEAST, CRIME, BREACH, **Heartbleed**, **POODLE**, FREAK, Logjam, DROWN, Sweet32, ROBOT.
- Poscuántica: ML-KEM (FIPS 203); híbrido **X25519MLKEM768** (RFC 10024) ya mayoritario en la web.

## Fuentes

- RFC 9110, *HTTP Semantics*: https://www.rfc-editor.org/rfc/rfc9110
- RFC 9114, *HTTP/3*: https://www.rfc-editor.org/rfc/rfc9114
- RFC 9000, *QUIC: A UDP-Based Multiplexed and Secure Transport*: https://www.rfc-editor.org/rfc/rfc9000
- RFC 3986, *Uniform Resource Identifier (URI): Generic Syntax*: https://www.rfc-editor.org/rfc/rfc3986
- RFC 6265, *HTTP State Management Mechanism* (*cookies*): https://www.rfc-editor.org/rfc/rfc6265
- RFC 6797, *HTTP Strict Transport Security (HSTS)*: https://www.rfc-editor.org/rfc/rfc6797
- RFC 10008, *The HTTP QUERY Method*: https://www.rfc-editor.org/rfc/rfc10008
- RFC 9846, *The Transport Layer Security (TLS) Protocol Version 1.3* (sustituye a la RFC 8446): https://www.rfc-editor.org/rfc/rfc9846
- RFC 8996, *Deprecating TLS 1.0 and TLS 1.1*: https://www.rfc-editor.org/rfc/rfc8996
- RFC 9325, *Recommendations for Secure Use of TLS and DTLS* (BCP 195): https://www.rfc-editor.org/rfc/rfc9325
- RFC 9849, *TLS Encrypted Client Hello*: https://www.rfc-editor.org/rfc/rfc9849
- RFC 10024, *Post-Quantum Traditional (PQ/T) Hybrid Key Agreement Mechanisms for TLS 1.3*: https://www.rfc-editor.org/rfc/rfc10024
- RFC 6962, *Certificate Transparency*: https://www.rfc-editor.org/rfc/rfc6962
- RFC 8555, *Automatic Certificate Management Environment (ACME)*: https://www.rfc-editor.org/rfc/rfc8555
- RFC 959, *File Transfer Protocol*: https://www.rfc-editor.org/rfc/rfc959
- CCN, Informe CCN-PYTEC n.º 8, *Requisitos de seguridad para TLS* (noviembre de 2020): https://www.ccn.cni.es/index.php/es/docman/documentos-publicos/boletines-pytec/378-pildorapytec-nov2020-seguridad-tls/file
- CCN-STIC-807, *Criptología de empleo en el Esquema Nacional de Seguridad*: https://www.ccn-cert.cni.es/es/series-ccn-stic/800-guia-esquema-nacional-de-seguridad/513-ccn-stic-807-criptologia-de-empleo-en-el-ens/file?format=html
- Real Decreto 311/2022, Esquema Nacional de Seguridad (texto consolidado): https://www.boe.es/eli/es/rd/2022/05/03/311/con
- Ley 34/2002, de servicios de la sociedad de la información (LSSI): https://www.boe.es/buscar/act.php?id=BOE-A-2002-13758
- IANA, base de datos de la zona raíz (`.es`): https://www.iana.org/domains/root/db/es.html
- Root Server Technical Operations Association: https://root-servers.org/
- UIT, *Facts and Figures 2025*: https://www.itu.int/en/mediacentre/Pages/PR-2025-11-17-facts-and-figures.aspx
- APNIC Blog, *Google hits 50% IPv6* (2026): https://blog.apnic.net/2026/04/28/google-hits-50-ipv6/
- W3Techs, uso de HTTP/3: https://w3techs.com/technologies/details/ce-http3
- Cloudflare, *Radar 2025 Year in Review*: https://blog.cloudflare.com/radar-2025-year-in-review/
- Google Security Blog, *HTTPS by default* (octubre de 2025): https://security.googleblog.com/2025/10/https-by-default.html
- Let's Encrypt, *Ending OCSP Support in 2025*: https://letsencrypt.org/2024/12/05/ending-ocsp/
- CA/Browser Forum, *Baseline Requirements*: https://cabforum.org/working-groups/server/baseline-requirements/
- NIST FIPS 203, ML-KEM: https://csrc.nist.gov/pubs/fips/203/final
- Mozilla, generador de configuraciones TLS: https://ssl-config.mozilla.org/
- Lista de precarga HSTS: https://hstspreload.org/
- MDN, códigos de estado de respuesta HTTP: https://developer.mozilla.org/es/docs/Web/HTTP/Reference/Status
- UPM, 40 años de Internet en España: https://iptc.upm.es/spain-marks-40-years-of-internet-with-commemorative-event-at-upm/
