# IV.9 · Seguridad en redes: protección, seguridad perimetral, acceso remoto, VPN y puesto de usuario

Una red de la Administración transporta datos personales, expedientes y servicios críticos, y está conectada a Internet, a la Red SARA y a miles de puestos y dispositivos. Protegerla exige **varias líneas de defensa**: asegurar la propia **infraestructura de red** (conmutadores, *routers*, Wi‑Fi) y las **comunicaciones** (cifrado), controlar el **perímetro** (cortafuegos, DMZ, proxies, IDS/IPS), permitir el **acceso remoto** solo de forma autenticada y cifrada (**VPN**, escritorio remoto, confianza cero) y bastionar el **puesto del usuario**, que es donde empiezan la mayoría de los incidentes (*phishing*, *ransomware*). Este tema recorre esos cinco frentes con el marco del **Esquema Nacional de Seguridad** (Real Decreto 311/2022) y las guías del **CCN**, y con las órdenes que se piden en los supuestos prácticos (`iptables`, `firewall-cmd`, `netsh advfirewall`, `sysctl`). Los conceptos generales de seguridad, criptografía, *malware* e ingeniería social están en el tema IV.5; TLS y HTTPS en IV.8; la administración de VLAN y 802.1X en IV.4.

## Seguridad y protección en redes de comunicaciones

### Objetivos y principios

La seguridad de una red busca preservar las **dimensiones de seguridad** del ENS sobre la información que transporta y sobre el propio servicio: **disponibilidad** (que la red funcione), **integridad** (que nada se altere en tránsito), **confidencialidad** (que nadie no autorizado lea el tráfico), **autenticidad** (saber quién está al otro lado) y **trazabilidad** (poder reconstruir quién hizo qué).

| Principio | Aplicación en redes |
|---|---|
| **Líneas de defensa** (ENS, art. 9) o **defensa en profundidad** | Varias capas de medidas organizativas, físicas y lógicas: si una cae, las siguientes contienen el ataque (perímetro, segmentación, cifrado, puesto, monitorización) |
| **Mínimo privilegio** (ENS, art. 20) | Cada usuario, equipo o flujo solo puede hacer lo **estrictamente necesario**: reglas de cortafuegos de «denegar por defecto», accesos remotos limitados |
| **Segmentación** (medida **[mp.com.4]**) | Separar los flujos: como mínimo, segmentos de **usuarios, servicios y administración**, y la red **inalámbrica** en un segmento propio |
| **Perímetro seguro** (medida **[mp.com.1]**) | Un sistema de protección perimetral **separa la red interna del exterior**; **todo el tráfico lo atraviesa** y todo flujo debe estar **autorizado previamente** |
| **Seguridad por defecto y mínima funcionalidad** | Desactivar servicios, puertos y protocolos que no se usen (Telnet, SNMPv1/v2c, SMBv1) |
| **Vigilancia continua** (ENS, art. 10) | Monitorizar, detectar y responder: IDS/IPS, SIEM, sondas del CCN-CERT |
| **Confianza cero** (*zero trust*) | No confiar en nada por estar «dentro»: verificar identidad, dispositivo y contexto en **cada acceso** (NIST SP 800-207) |

### Ataques contra las redes, por capas

| Capa | Ataque | En qué consiste | Contramedidas |
|---|---|---|---|
| Física | Pinchazo, conexión a una toma libre, robo de equipos | Acceso físico al cableado o a la electrónica | Armarios cerrados, puertos sin uso desactivados, **802.1X**, CCTV |
| Enlace (2) | ***MAC flooding*** | Inundar el conmutador con MAC falsas hasta llenar su tabla CAM: pasa a reenviar como un *hub* y se puede espiar el tráfico | ***Port security*** (límite de MAC por puerto) |
| Enlace | ***MAC spoofing*** | **Suplantar una dirección MAC** autorizada (para saltarse un filtrado por MAC o un portal cautivo); se cambia con órdenes del sistema (`ip link set dev eth0 address …`, propiedades del adaptador en Windows) | 802.1X con certificados, NAC |
| Enlace | ***ARP spoofing* / envenenamiento ARP** | Responder ARP falsas para que el tráfico de otro equipo pase por el atacante (*man in the middle*) | ***Dynamic ARP Inspection*** (DAI), entradas estáticas en equipos críticos, cifrado |
| Enlace | ***DHCP spoofing* y agotamiento** | Servidor DHCP falso que entrega su propia puerta de enlace o DNS; agotar las direcciones del legítimo | ***DHCP snooping*** (puertos de confianza) |
| Enlace | ***VLAN hopping*** | Saltar a otra VLAN negociando un troncal (*switch spoofing*, DTP) o con **doble etiquetado** 802.1Q | Desactivar DTP (`switchport nonegotiate`), puertos de acceso fijos, VLAN nativa sin uso |
| Enlace | Manipulación de STP | Anunciarse como puente raíz para desviar el tráfico | **BPDU Guard**, *Root Guard* |
| Red (3) | ***IP spoofing*** | **Falsear la IP de origen** (base de ataques de reflexión y de DoS) | **Filtrado de entrada** (BCP 38, RFC 2827), **filtrado de ruta inversa** (uRPF; en Linux `rp_filter`) |
| Red | ***Smurf*** | **Eco ICMP** a una dirección de **difusión** con la IP de la víctima como origen: todas las máquinas responden a la víctima | No reenviar difusiones dirigidas, ignorar ecos a difusión |
| Red | ***Fraggle*** | Como *Smurf*, pero con **eco UDP** (puerto 7) o *chargen* (19) a una dirección de difusión | Igual; desactivar servicios UDP simples |
| Red | *Ping of death*, *Teardrop* | Paquetes ICMP sobredimensionados; fragmentos solapados que bloqueaban la pila | Parches (históricos) |
| Red | Secuestro de prefijos BGP | Anunciar en Internet prefijos ajenos | **RPKI** (validación del origen de rutas) |
| Transporte (4) | ***SYN flood*** | Abrir miles de conexiones a medias (solo SYN) para agotar la memoria del servidor | ***SYN cookies*** (`net.ipv4.tcp_syncookies=1`), protección anti-DDoS |
| Transporte | **Escaneo de puertos** | Averiguar **qué servicios** ofrece un sistema (`nmap`) como paso previo a un ataque | Cortafuegos, IDS, cerrar lo innecesario |
| Transporte | Secuestro de sesión, *replay* | Inyectarse en una conexión o reenviar mensajes capturados | Cifrado y autenticación (TLS, IPsec), números de secuencia aleatorios |
| Aplicación (7) | ***DNS spoofing* / envenenamiento de caché** | Respuestas DNS falsas que llevan a la víctima a otra IP (ataque de Kaminsky, 2008) | **DNSSEC**, puertos de origen aleatorios, resolvedores protegidos |
| Aplicación | ***Pharming*** | Alterar la **resolución de nombres** (fichero *hosts* o caché DNS) para llevar al usuario a una **web falsa** aunque escriba bien la dirección | DNSSEC, protección del fichero *hosts*, EDR, HTTPS con HSTS |
| Aplicación | **Amplificación** (DNS, NTP, *memcached*, CLDAP) | Pequeñas consultas con origen falseado que generan grandes respuestas hacia la víctima | No tener resolvedores abiertos, limitar respuestas (RRL), filtrado de entrada |
| Varias | **DoS / DDoS** | Agotar ancho de banda, conexiones o recursos; el distribuido llega **desde muchos orígenes** (*botnets*) | Capacidad sobrada, CDN y centros de limpieza (*scrubbing*), limitación de tasa, **[mp.s.4]** |
| Varias | ***Sniffing*** | **Capturar el tráfico** (Wireshark, `tcpdump`) para leer datos en claro | Cifrado de extremo a extremo, conmutación, segmentación |

El ENS clasifica como **ataques activos** la alteración de la información en tránsito, la inyección de información espuria y el **secuestro de la sesión** por un tercero, y exige prevenirlos y detectarlos (**[mp.com.3]**).

### Seguridad de las redes inalámbricas

Las ondas de radio **atraviesan las paredes**: cualquiera en el alcance puede escuchar o intentar conectarse. Riesgos propios:

| Amenaza | Descripción |
|---|---|
| **Escucha** (*eavesdropping*) | Capturar **de forma pasiva** el tráfico inalámbrico, a veces con antenas de gran alcance; si no hay cifrado o es débil (WEP), se lee todo |
| **Punto de acceso no autorizado** (*rogue AP*) | Un empleado conecta su propio punto de acceso a la red corporativa y abre una puerta trasera |
| **Gemelo malvado** (*evil twin*) | Punto de acceso falso con el mismo SSID que el legítimo para capturar credenciales (*man in the middle*) |
| **Desautenticación** | Enviar tramas de gestión falsas para expulsar a los clientes (DoS) o forzar su reconexión y capturar el saludo |
| Inundación de asociaciones | Saturar el punto de acceso con peticiones de asociación para que no atienda a los legítimos |
| **Suplantación de MAC** | Saltarse un filtrado de MAC permitidas (que, por eso, **no es una medida de seguridad suficiente**) |
| **WPS** | El método **PIN** se rompe por fuerza bruta (métodos: PIN, botón PBC, NFC y USB); conviene **desactivar WPS** |
| **KRACK** (*Key Reinstallation Attack*, 2017) | Contra el **saludo de cuatro vías de WPA2**: fuerza a **reinstalar la misma clave** y a **reutilizar *nonces*** ya usados, lo que permite descifrar o inyectar tramas; se corrigió con parches |
| Dragonblood (2019), FragAttacks (2021) | Fallos en las primeras implementaciones de SAE (WPA3) y en la fragmentación y agregación de tramas |

Contramedidas: **WPA3** (SAE en modo personal; **WPA3-Enterprise** con **802.1X** y un servidor **RADIUS** que admita **EAP-TLS**), **tramas de gestión protegidas** (802.11w), red de **invitados aislada** con **portal cautivo** (página web que **gestiona el acceso de los usuarios a la red**, normalmente inalámbrica: aceptar condiciones, identificarse o pagar), **WIPS** para detectar puntos de acceso no autorizados, segmento propio para la Wi‑Fi (**[mp.com.4.2]**), ajuste de potencia y la guía **CCN-STIC-816** (*Seguridad en redes inalámbricas*). En Windows se puede impedir la conexión a redes concretas:

```bat
netsh wlan add filter permission=block ssid="SSID_WiFi" networktype=infrastructure
netsh wlan add filter permission=denyall networktype=adhoc     :: ninguna red ad hoc
netsh wlan show filters
```

### Protección de la infraestructura de red

**Conmutadores** (tema IV.4): desactivar los puertos sin uso y llevarlos a una VLAN aislada; **port security**; ***DHCP snooping***, ***Dynamic ARP Inspection*** e ***IP Source Guard***; **BPDU Guard** y *Root Guard*; control de tormentas de difusión; VLAN separadas para usuarios, servidores, gestión, voz, Wi‑Fi e invitados; VLAN nativa sin uso; **802.1X** con asignación dinámica de VLAN y **NAC** que comprueba la postura del equipo.

***Routers* y cortafuegos**: listas de control de acceso, filtrado de direcciones falsas y privadas en el borde (**BCP 38**, uRPF), protección del plano de control, gestión solo por **SSH y HTTPS** desde una **red de administración** (mejor **fuera de banda**), **AAA** centralizado con TACACS+ o RADIUS, **SNMPv3**, NTP autenticado, registro centralizado (*syslog*), copias de la configuración y actualización del *firmware*. Guía de referencia: **CCN-STIC-811** (*Interconexión en el ENS*) y la **ITS de Interconexión de Sistemas de Información**.

**Cifrado de enlaces**: **MACsec** (IEEE 802.1AE) protege la capa 2 salto a salto entre conmutadores o entre equipo y conmutador; **IPsec**, **WireGuard** o **TLS** protegen el tráfico que sale del dominio de seguridad (**[mp.com.2]**: redes privadas virtuales cifradas cuando la comunicación discurra por redes fuera del propio dominio de seguridad).

**Bastionado de la pila de red en Linux** (`/etc/sysctl.d/90-red.conf`, aplicar con `sysctl --system`):

```ini
net.ipv4.conf.all.rp_filter = 1                 # filtrado de ruta inversa estricto: descarta IP de origen falsas (IP spoofing)
net.ipv4.conf.default.rp_filter = 1
net.ipv4.tcp_syncookies = 1                     # resistencia a SYN flood
net.ipv4.icmp_echo_ignore_broadcasts = 1        # no responder a ecos a difusión (Smurf)
net.ipv4.conf.all.accept_redirects = 0          # ignorar redirecciones ICMP
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.all.accept_source_route = 0       # sin encaminamiento de origen
net.ipv4.conf.all.log_martians = 1              # registrar paquetes con direcciones imposibles
net.ipv4.ip_forward = 0                         # no encaminar si el equipo no es un router
net.ipv6.conf.all.accept_ra = 0                 # no aceptar anuncios de router en servidores con IPv6 estática
```

`rp_filter = 1` (estricto) descarta un paquete si la **ruta de vuelta** hacia su IP de origen no sale por la misma interfaz por la que entró; `2` es el modo laxo (basta con que haya alguna ruta). Activar `ip_forward` convierte el equipo en *router* (lo contrario de lo que se busca) y desactivar `tcp_syncookies` lo hace más vulnerable.

## Seguridad perimetral

### El perímetro y su evolución

El **perímetro** es la frontera entre la red propia (zona de confianza) y las externas (Internet, otras organizaciones, la red de invitados). La **seguridad perimetral** concentra en esa frontera los controles que deciden **qué tráfico entra y sale**: cortafuegos, DMZ, proxies, pasarelas de correo, IDS/IPS, protección anti-DDoS y concentradores VPN. El ENS lo exige en **[mp.com.1] Perímetro seguro**: un sistema de protección perimetral que separe la red interna del exterior, por el que pase **todo** el tráfico y en el que **todo flujo esté autorizado previamente**.

El modelo clásico de «castillo y foso» (todo lo de dentro es de confianza) ha quedado corto: hay usuarios en casa y en movilidad, aplicaciones en la nube y atacantes que, una vez dentro (por un correo con *malware*), se **mueven lateralmente**. Por eso hoy se combina el perímetro con **segmentación interna** (y **microsegmentación** en los centros de datos), **monitorización** del tráfico interno y modelos de **confianza cero** que aplican controles en cada acceso (ver el apartado de acceso remoto).

### Cortafuegos

Un **cortafuegos** (*firewall*) es un sistema, *hardware* o *software*, que **controla el tráfico entre redes o hacia un equipo aplicando una política de seguridad**: permite, deniega o registra cada paquete o conexión según sus reglas. Se diseñan con **denegación por defecto** (*default deny*: todo lo no permitido expresamente está prohibido) y las reglas se evalúan **en orden**: se aplica la **primera que coincide** y al final hay una **regla implícita de denegación**.

| Tipo | Nivel | Cómo decide | Notas |
|---|---|---|---|
| **Filtrado de paquetes sin estado** (*stateless*, ACL de un *router*) | 3-4 | Mira cada paquete **aislado**: IP de origen y destino, protocolo, puertos, interfaz | Rápido y simple, pero **no guarda información de las sesiones**: hay que abrir a mano el tráfico de vuelta |
| **Inspección de estado** (*stateful*) | 3-4 | **Guarda una tabla de conexiones** (sesiones) y deja pasar automáticamente las respuestas de las conexiones establecidas | Base de casi todos los cortafuegos actuales (`iptables`/`nftables` con *conntrack*, Windows Defender Firewall) |
| **Pasarela de aplicación** (*proxy* de aplicación, ALG) | 7 | El cortafuegos **termina la conexión** y abre otra en nombre del cliente, entendiendo el protocolo (HTTP, SMTP, FTP) | Inspección completa del contenido; más lento; protocolos concretos |
| Pasarela de circuito | 5 | Retransmite conexiones TCP sin mirar el contenido (SOCKS) | Oculta la red interna |
| **Inspección profunda de paquetes** (**DPI**) | 7 | Analiza **el contenido completo del paquete**, no solo las cabeceras | Detecta aplicaciones, *malware* o fugas aunque usen puertos estándar |
| **Cortafuegos de nueva generación** (**NGFW**) | 3-7 | *Stateful* + DPI + **identificación de aplicaciones y usuarios** + **IPS** + filtrado web + inspección TLS + antimalware; **incluyen NAT y VPN** | Palo Alto, Fortinet, Check Point, Cisco, Sophos; en la nube, **FWaaS** |
| **UTM** (gestión unificada de amenazas) | 3-7 | Todo en uno para entornos pequeños (cortafuegos, VPN, antivirus, antispam, filtrado web) | Pymes, sedes y **SOHO** (oficina pequeña u oficina doméstica) |
| **WAF** (*Web Application Firewall*) | 7 | **Filtra y monitoriza el tráfico HTTP/HTTPS hacia las aplicaciones web**: inyección SQL, XSS, explotación de vulnerabilidades (reglas OWASP CRS) | Delante de los servidores web; ModSecurity, Coraza, WAF de las CDN |
| **Cortafuegos de *host*** (personal) | 3-7 | Protege **un solo equipo** | Windows Defender Firewall, `firewalld`, `ufw`, `pf` |
| Cortafuegos virtual o distribuido | 3-7 | Reglas aplicadas en el hipervisor o en el *pod* | **Microsegmentación** (VMware NSX, *Network Policies* de Kubernetes) |

Buenas prácticas en la política de reglas: **mínimo privilegio** (orígenes, destinos y puertos concretos, nada de «any-any»), reglas **más específicas primero**, **registro** de lo denegado y de lo crítico, **revisión periódica** y eliminación de reglas obsoletas, filtrado también **de salida** (que los servidores no puedan navegar libremente ni los puestos hablar SMTP directamente con Internet), **antisuplantación** en el borde (descartar en la interfaz externa paquetes con origen en direcciones privadas o propias), y alta disponibilidad (**clúster** activo-pasivo).

| N.º | Origen | Destino | Servicio | Acción | Comentario |
|---|---|---|---|---|---|
| 1 | Internet | Servidor web DMZ 172.19.50.10 | TCP 80, 443; UDP 443 | Permitir | Publicación web (80 solo para redirigir a HTTPS) |
| 2 | Internet | Pasarela de correo DMZ | TCP 25 | Permitir | Correo entrante |
| 3 | Servidor web DMZ | BD interna 10.30.20.30 | TCP 3306 | Permitir | Solo la aplicación accede a la base de datos |
| 4 | Red de usuarios | Proxy DMZ | TCP 3128 | Permitir | Navegación a través del proxy |
| 5 | Red de administración | Todas | TCP 22, 3389 | Permitir | Gestión solo desde la red de administración |
| 6 | DMZ | Red interna | Cualquiera | **Denegar y registrar** | Un servidor comprometido no puede saltar dentro |
| 7 | Cualquiera | Cualquiera | Cualquiera | **Denegar** | Regla final (denegación implícita) |

### Arquitecturas perimetrales

| Arquitectura | Descripción |
|---|---|
| ***Router* de filtrado** (*screening router*) | Un *router* con listas de acceso entre la red interna e Internet; protección mínima |
| ***Host* con doble conexión** (*dual-homed host*) | Equipo con **dos interfaces** (externa e interna) **sin encaminamiento entre ellas**: el tráfico solo pasa a través de sus *proxies* de aplicación |
| ***Host* protegido** (*screened host*) | *Router* de filtrado + un **bastión** (*bastion host*: equipo muy bastionado y expuesto, único accesible desde fuera) en la red interna |
| **Subred protegida** (*screened subnet*) o **DMZ** | **Zona desmilitarizada** entre un cortafuegos (o *router*) exterior y otro interior: los servidores que dan servicio al exterior (web, correo, DNS público, proxy inverso, concentrador VPN) quedan **aislados**, de modo que si se comprometen **no comprometen directamente la red interna** |
| **Cortafuegos de tres patas** | Un solo cortafuegos con tres interfaces: exterior, interior y DMZ (más barato; un único punto de fallo) |
| **Cortafuegos en serie** (*back to back*) | Dos cortafuegos, a menudo de **fabricantes distintos**, con la DMZ entre ellos: un fallo de un producto no abre toda la red |
| **Varias DMZ** | Zonas separadas por función o nivel de exposición (publicación web, correo, accesos remotos, proveedores, servicios de gestión) |

![Arquitectura perimetral: Internet, cortafuegos externo con filtrado, anti-DDoS e IPS, una DMZ con proxy inverso o WAF, pasarela de correo y DNS público, una DMZ dedicada para el concentrador VPN con sus propios enlaces a los dos cortafuegos, un cortafuegos interno idealmente de otro fabricante y la red interna segmentada en VLAN de usuarios, servidores, administración y Wi-Fi de invitados](diagramas/IV.9-dmz.svg)

*Figura: subred protegida entre dos cortafuegos en serie, con la VPN en su propia DMZ.*

La guía **CCN-STIC-836** recomienda situar el **concentrador VPN en una DMZ dedicada**, aislada del resto de servidores de la DMZ, protegido por el cortafuegos y no expuesto directamente a Internet, y controlando el tráfico que va del concentrador a la red interna.

### Proxies y pasarelas de contenidos

Además del cortafuegos, el perímetro incluye intermediarios de aplicación (detalle en el tema IV.8):

- **Proxy de navegación** o **pasarela web segura** (SWG): autentica a los usuarios, filtra categorías y destinos, analiza descargas, registra la navegación y puede **inspeccionar TLS**; puede ser **explícito** o **transparente** (combinado con **NAT** o encaminamiento para que las conexiones pasen por él **sin configurar el navegador**). El de referencia en Linux es **Squid**. Es la medida **[mp.s.3] Protección de la navegación web** del ENS.
- **Proxy inverso y WAF** delante de los servidores publicados (**[mp.s.2]**).
- **Pasarela de correo**: antispam, antimalware, *sandbox* de adjuntos, SPF, DKIM y DMARC (tema IV.3; **[mp.s.1]**).
- **DNS protector**: resolvedores que bloquean dominios maliciosos.

### Sistemas de detección y prevención de intrusiones (IDS/IPS)

Un **IDS** (*Intrusion Detection System*) **analiza el tráfico o la actividad de un equipo para detectar ataques y genera alertas**; un **IPS** (*Intrusion Prevention System*) se sitúa **en línea** y además **bloquea** lo que detecta. El ENS exige herramientas de detección o prevención de intrusiones (**[op.mon.1]**), basadas en reglas en categoría MEDIA y con procedimientos de respuesta en ALTA.

| Clasificación (NIST SP 800-94) | Qué vigila | Ejemplos |
|---|---|---|
| **NIDS / NIPS** (de red) | El tráfico de un segmento (puerto espejo o *tap*; en línea si es IPS) | **Snort**, **Suricata** (libre, de código abierto, de la OISF), Zeek |
| **WIDS / WIPS** (inalámbricos) | El espectro y las tramas Wi‑Fi: puntos de acceso no autorizados, gemelos malvados, ataques de desautenticación | Funciones de las controladoras Wi‑Fi |
| **NBA** (*Network Behavior Analysis*, análisis del comportamiento de la red) | **Flujos** (NetFlow, IPFIX) para detectar **tráfico inusual**: DoS, gusanos, escaneos, exfiltración | Sistemas NDR |
| **HIDS / HIPS** (de *host*) | Registros, ficheros, procesos y llamadas al sistema de **un equipo** | **OSSEC**, **Wazuh**, AIDE y Tripwire (integridad de ficheros) |

| Método de detección | Ventaja | Inconveniente |
|---|---|---|
| **Firmas** (patrones de ataques conocidos, «uso indebido») | Pocos falsos positivos, alertas claras | No detecta ataques nuevos (día cero); hay que actualizar las firmas |
| **Anomalías** (desviación de un comportamiento normal aprendido) | Puede detectar ataques desconocidos | Más **falsos positivos**; requiere aprendizaje |
| Análisis de protocolo con estado | Detecta usos anómalos de un protocolo | Consume recursos |

Conceptos: **falso positivo** (alerta sin ataque real) y **falso negativo** (ataque no detectado, el más peligroso). El tráfico cifrado limita la visibilidad de un NIDS: por eso los IDS se colocan **tras el punto de descifrado** (proxy, concentrador VPN) o se complementan con **EDR** en los equipos.

```bash
suricata -c /etc/suricata/suricata.yaml -i eth1     # NIDS escuchando en la interfaz espejo
suricata-update                                      # actualizar las reglas (firmas)
tail -f /var/log/suricata/fast.log                   # alertas
```

### Señuelos, sumideros DNS y monitorización

- ***Honeypot*** (señuelo, «tarro de miel»): sistema **atractivo para los atacantes**, sin uso legítimo, que sirve para **detectar y estudiar sus técnicas** y así prevenirlas o defenderse en el futuro; cualquier acceso a él es sospechoso. Una ***honeynet*** es una red de señuelos; los ***honeytokens*** son datos o credenciales trampa.
- ***DNS sinkholing*** (sumidero DNS): el resolvedor responde a los dominios maliciosos (de mando y control, de *phishing*) con una **IP controlada** por la organización, de modo que el tráfico hacia ellos **se redirige para analizarlo**, detectar equipos infectados y cortar la comunicación con el atacante. No confundir con *DNS spoofing* o el envenenamiento, que son ataques.
- **SIEM** (*Security Information and Event Management*): **recoge y correlaciona** registros de cortafuegos, IDS, servidores, directorio y EDR; genera alertas y conserva evidencias. **SOAR** automatiza la respuesta; un **SOC** (centro de operaciones de seguridad) los opera de forma continua. **NDR** analiza el tráfico con técnicas de comportamiento y **XDR** correlaciona los datos de puesto, red, correo y nube.

**Soluciones y servicios del CCN-CERT** relacionados con la red (las de gestión de incidentes y *malware* están en el tema IV.5):

| Herramienta | Función |
|---|---|
| **SAT INET** | **Sistema de Alerta Temprana** de Internet: una **sonda** en la red del organismo analiza el tráfico entre la red interna e Internet (y las DMZ) y envía los eventos al **sistema central** del CCN-CERT, que los correlaciona; la conexión va siempre por un **túnel cifrado que se inicia desde la sonda hacia el sistema central** |
| SAT SARA y **SAT ICS** | Alerta temprana en la **Red SARA** y en **sistemas de control industrial** |
| **EMMA** | **Visibilidad y control sobre la red**: monitorización de la infraestructura, control de acceso de dispositivos, segmentación y VPN |
| **CARMEN** | **Defensa frente a ataques avanzados (APT)**: analiza el tráfico de red (navegación, DNS, correo) para detectar compromisos, movimiento lateral y exfiltración |
| **GLORIA** | **Gestor de *logs*** y correlación compleja de eventos para responder ante incidentes y amenazas (basado en SIEM) |
| **MÓNICA** | **Gestión de eventos e información de seguridad** (SIEM) con análisis de comportamiento (UEBA) y respuesta automática (SOAR), integrada con LUCIA |
| **ELSA** | **Exposición local y superficie de ataque**: inventario y vigilancia de los activos del organismo expuestos en Internet |
| **CLAUDIA** y **microCLAUDIA** | Detección de amenazas complejas en el **puesto de usuario** (integrada con CARMEN) y «vacunas» contra *ransomware* |

### Protección frente a la denegación de servicio

La medida **[mp.s.4]** del ENS pide **dimensionar** el sistema con holgura, **desplegar tecnologías** frente a ataques conocidos y, en nivel ALTO, un sistema de **detección y tratamiento** de DoS/DDoS con procedimientos de reacción que incluyan la **comunicación con el proveedor de comunicaciones**; también, evitar que los propios equipos ataquen a terceros. Técnicas: limpieza de tráfico en el operador o en un servicio anti-DDoS, **CDN** y *anycast*, limitación de tasa, SYN cookies, listas de bloqueo, desvío a «agujero negro» (RTBH) del tráfico de la IP atacada como último recurso. Guía: **CCN-STIC-820** (*Protección contra denegación de servicio*).

### Configuración de cortafuegos en Linux

**iptables** (Netfilter): **tablas** `filter` (por defecto), `nat`, `mangle` y `raw`; **cadenas** `INPUT` (al equipo), `OUTPUT` (desde el equipo), `FORWARD` (lo que atraviesa), `PREROUTING` y `POSTROUTING` (NAT); **objetivos** `ACCEPT`, `DROP` (descarta en silencio), `REJECT` (descarta y avisa), `LOG`, `DNAT`, `SNAT`, `MASQUERADE`.

```bash
iptables -L -n -v --line-numbers                         # listar reglas con contadores y números
iptables -F                                              # --flush: borrar TODAS las reglas de la tabla (filter)
iptables -t nat -F                                       # borrar las de la tabla nat
iptables -P INPUT DROP                                   # política por defecto: denegar
iptables -A INPUT -i lo -j ACCEPT                        # -A añade al final de la cadena
iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT   # respuestas (con estado)
iptables -A INPUT -p tcp -s 10.30.99.0/24 --dport 22 -j ACCEPT           # SSH solo desde la red de administración
iptables -A INPUT -i eth1 -p tcp --dport 443 -j DROP     # bloquear HTTPS en la interfaz eth1
iptables -I INPUT 1 -s 203.0.113.66 -j DROP              # -I inserta al principio (se evalúa antes)
iptables -D INPUT 4                                      # borrar la regla número 4
iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE     # NAT de salida (PAT)
iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 443 -j DNAT --to-destination 172.19.50.10:443   # publicar un servidor
iptables-save > /etc/iptables/rules.v4                   # guardar (iptables-restore para cargar)
```

**nftables** sustituye a iptables en las distribuciones actuales (RHEL 8 y posteriores, Debian 10 y posteriores; las órdenes `iptables` suelen ser hoy una capa de compatibilidad sobre nftables):

```bash
nft add table inet filtro
nft add chain inet filtro entrada '{ type filter hook input priority 0; policy drop; }'
nft add rule inet filtro entrada ct state established,related accept
nft add rule inet filtro entrada iif lo accept
nft add rule inet filtro entrada tcp dport { 22, 443 } accept
nft list ruleset
```

**firewalld** (RHEL, Fedora, SUSE) organiza las reglas en **zonas** (`public`, `internal`, `dmz`, `trusted`, `drop`, `block`…) asignadas a interfaces u orígenes; los cambios son **en tiempo de ejecución** salvo que se use **`--permanent`**, que solo los guarda en la configuración hasta un **`--reload`**:

```bash
firewall-cmd --state
firewall-cmd --get-active-zones                          # zonas activas y sus interfaces
firewall-cmd --zone=public --list-services               # servicios permitidos en la zona (¿está https?)
firewall-cmd --zone=public --list-all                    # todo: servicios, puertos, reglas enriquecidas
firewall-cmd --permanent --zone=public --add-service=https
firewall-cmd --permanent --zone=public --add-port=8443/tcp
firewall-cmd --permanent --zone=public --add-rich-rule='rule family="ipv4" source address="172.19.50.0/27" port protocol="tcp" port="3306" accept'
firewall-cmd --reload                                    # aplicar lo permanente
firewall-cmd --runtime-to-permanent                      # guardar lo hecho en caliente
```

En una **regla enriquecida** (*rich rule*) el origen se indica con **`source address=`**, el puerto con **`port protocol="tcp" port="3306"`** y la acción al final (`accept`, `reject`, `drop`).

**ufw** (Ubuntu): `ufw enable`, `ufw allow 22/tcp`, `ufw allow from 10.30.99.0/24 to any port 22`, `ufw deny 23`, `ufw status verbose`. Otras capas clásicas: **TCP Wrappers** (`/etc/hosts.allow` y `/etc/hosts.deny`), que permitían o denegaban por *host* el acceso a servicios enlazados con *libwrap*; están obsoletos (RHEL 8 los eliminó), pero el examen los ha preguntado.

### Configuración del cortafuegos de Windows

El **Firewall de Windows Defender** es un cortafuegos de *host* con estado con tres **perfiles**: **dominio**, **privado** y **público**. Se administra con la consola `wf.msc`, con directivas de grupo o Intune, con **`netsh advfirewall`** y con PowerShell:

```bat
netsh advfirewall show currentprofile                    :: estado del perfil activo
netsh advfirewall show allprofiles
netsh advfirewall set allprofiles state on               :: activar en todos los perfiles
netsh advfirewall set currentprofile state on            :: activar en el perfil actual
netsh advfirewall firewall add rule name="Inventariado" dir=in action=allow protocol=TCP localport=4433
netsh advfirewall firewall show rule name="Inventariado"
netsh advfirewall firewall delete rule name="Inventariado"
netsh advfirewall reset                                  :: volver a la configuración por defecto
```

```powershell
Get-NetFirewallProfile | Select-Object Name, Enabled, DefaultInboundAction
Set-NetFirewallProfile -Profile Domain,Private,Public -Enabled True
New-NetFirewallRule -DisplayName "Puerto8443" -Direction Inbound -Protocol TCP -LocalPort 8443 -Action Allow
Get-NetFirewallRule -DisplayName "Puerto8443" | Get-NetFirewallPortFilter
Remove-NetFirewallRule -DisplayName "Puerto8443"
```

La sintaxis exacta importa: **`add rule`** (no `create` ni `new`), **`action=allow`** (no `permit`), **`set … state on`** (no `enable`) y **`show currentprofile`** (no `get`). La orden antigua `netsh firewall` está obsoleta.

### Ejercicios resueltos

1. **Bloquear el HTTPS que llega por `eth1` a un servidor con Struts vulnerable.** `iptables -A INPUT -i eth1 -p tcp --dport 443 -j DROP` (puerto estándar de HTTPS 443, interfaz `eth1`, objetivo `DROP`; no existen los objetivos `DISABLE` ni `FAIL`).
2. **Borrar todas las reglas de iptables.** `iptables --flush` (`-F`); por tablas (`-t nat -F`) si hay NAT.
3. **¿Está permitido HTTPS en la zona pública de `web01`?** `firewall-cmd --zone=public --list-services` y buscar `https`.
4. **Permitir de forma persistente MySQL (3306/TCP) solo desde la DMZ 172.19.50.0/27 en la zona `public`.** `firewall-cmd --permanent --zone=public --add-rich-rule='rule family="ipv4" source address="172.19.50.0/27" port protocol="tcp" port="3306" accept'` y, cuando toque, `firewall-cmd --reload`.
5. **Abrir en los Windows el puerto 4433/TCP para el inventario.** `netsh advfirewall firewall add rule name="Inventariado" dir=in action=allow protocol=TCP localport=4433`.
6. **Administrar con SSH y copiar con SCP entre subredes.** Ambos usan el **TCP 22** (SCP y SFTP van sobre SSH); FTP usa el 21 y TFTP el UDP 69.
7. **Mitigar la suplantación de IP en RHEL.** `net.ipv4.conf.all.rp_filter=1` (filtrado de ruta inversa) en un fichero de `/etc/sysctl.d/` y `sysctl --system`.

## Acceso remoto seguro a redes

### Escenarios y requisitos

El **acceso remoto** permite usar los recursos de la red interna desde fuera de ella: **teletrabajo** (en la Administración, regulado en el art. 47 bis del TREBEP), **administración remota** de servidores y equipos de red, **soporte de proveedores** y conexión de **sedes**. Es una de las vías de entrada preferidas por los atacantes (concentradores VPN sin parchear, RDP expuesto, credenciales robadas), por lo que el ENS le dedica requisitos explícitos:

- **[op.acc.6.r9] Acceso remoto** (en todos los niveles): debe estar **autorizado** por la autoridad correspondiente, el **tráfico debe ir cifrado**, si no se usa de forma constante debe estar **inhabilitado** y activarse solo cuando sea necesario, y deben quedar **registros de auditoría** de las conexiones; se aplica además la ITS de Interconexión de sistemas de información.
- **[op.acc.6.r8] Doble factor para el acceso desde o a través de zonas no controladas** (Internet es el ejemplo de zona no controlada): contraseña más **otro factor** (dispositivo u OTP: refuerzo R2), o **certificado cualificado** protegido con PIN o biometría (R3), mejor en **soporte físico** (R4).
- **[mp.eq.3.3]**: cuando un portátil se conecta por redes que no controla la organización, se limitan la información y los servicios accesibles **a los mínimos imprescindibles**, con autorización previa; y se evita que el portátil guarde claves de acceso remoto que no sean imprescindibles.
- **[mp.com.2]** y **[mp.com.3]**: **VPN cifradas** cuando la comunicación sale del dominio de seguridad, con algoritmos autorizados por el CCN y autenticación del otro extremo.

### Tecnologías de acceso remoto

| Tecnología | Cómo funciona | Uso y riesgos |
|---|---|---|
| Acceso telefónico (RAS) | Módem y PPP con autenticación PAP o CHAP contra un servidor RADIUS | **Histórico** |
| **VPN de acceso remoto** | Cliente en el equipo que crea un túnel cifrado (IPsec/IKEv2, TLS, WireGuard) con el concentrador de la organización | La más extendida para el **teletrabajo**; el equipo queda «dentro» de la red |
| **Portal web o VPN TLS sin cliente** | El usuario entra con el navegador en un **portal** que publica aplicaciones concretas (proxy inverso) | Acceso a aplicaciones web desde cualquier equipo |
| **Escritorio remoto** (**RDP**, TCP/UDP 3389) | Se controla un equipo o servidor de la organización; los datos no salen | Con **NLA** y detrás de una **puerta de enlace de Escritorio remoto** (RD Gateway, sobre HTTPS) o de una VPN; **nunca expuesto directamente a Internet** (uno de los vectores de *ransomware* más explotados) |
| **VDI** y escritorios en la nube | El usuario se conecta a un escritorio virtual en el CPD o en la nube (tema IV.2) | Los datos permanecen en el centro de datos |
| **SSH** (TCP 22) | Acceso cifrado a la línea de órdenes; túneles y reenvío de puertos | Administración; autenticación con **claves** y doble factor |
| **Bastión o servidor de salto** (*jump host*) | Punto único y vigilado desde el que los administradores acceden a los sistemas internos | Con **PAM** (gestión de accesos privilegiados): credenciales custodiadas, sesiones grabadas, aprobación previa |
| **ZTNA** (acceso a la red de confianza cero) | Un intermediario concede acceso **aplicación a aplicación**, verificando usuario, dispositivo y contexto en cada sesión | Sustituto moderno de la VPN para muchos usos |
| Herramientas de soporte remoto | TeamViewer, AnyDesk, asistencia rápida de Windows, Intune Remote Help (tema IV.5) | Solo las **autorizadas**; los atacantes también las usan |

### Autenticación, autorización y registro (AAA)

Los protocolos **AAA** descomponen el control de acceso en tres procesos: **autenticación** (*Authentication*, quién eres), **autorización** (*Authorization*, qué puedes hacer) y **contabilización** o registro (*Accounting*, qué has hecho y durante cuánto tiempo).

| Protocolo | Transporte | Características |
|---|---|---|
| **RADIUS** (RFC 2865 y 2866) | **UDP 1812** (autenticación) y **1813** (contabilización) | Estándar abierto; combina autenticación y autorización; **solo cifra la contraseña**; lo usan VPN, Wi‑Fi y **802.1X**; servidores: FreeRADIUS, NPS de Windows |
| **TACACS+** (RFC 8907) | **TCP 49** | De origen Cisco; **separa las tres A** y **cifra todo el cuerpo** del mensaje; preferido para **administrar equipos de red** (autorización orden a orden) |
| **Diameter** (RFC 6733) | TCP o SCTP 3868 | Sucesor de RADIUS en redes de operadores (4G/5G) |
| **Kerberos** | TCP/UDP 88 | Autenticación con tiques dentro del dominio (Active Directory) |

**IEEE 802.1X** es el **control de acceso a la red basado en puertos**: el **solicitante** (equipo) se autentica ante el **autenticador** (conmutador o punto de acceso) mediante **EAP sobre LAN** (EAPoL), y el autenticador consulta al **servidor de autenticación** (RADIUS). Métodos EAP: **EAP-TLS** (certificados en ambos extremos, el más robusto), PEAP y EAP-TTLS (túnel TLS con contraseña). Hasta que el equipo se autentica, el puerto solo deja pasar EAPoL. Los **NAC** (*Network Access Control*) añaden la comprobación de **postura** (parches, antivirus, cifrado) y llevan al equipo que no cumple a una VLAN de **cuarentena**.

**Autenticación multifactor (MFA)**: combina factores **de tipos distintos**: algo que **se sabe** (contraseña, PIN), algo que **se tiene** (tarjeta criptográfica, llave FIDO2, móvil con una aplicación de códigos OTP o notificaciones) y algo que **se es** (huella, rostro). Recibir un **código por SMS** además de la contraseña es un **doble factor de autenticación**, aunque débil (duplicado de SIM, interceptación): son preferibles las llaves **FIDO2/WebAuthn**, las claves de acceso (*passkeys*), los certificados en tarjeta y las aplicaciones de autenticación con **comparación de números** frente a la «fatiga de MFA» (bombardeo de notificaciones). Dos factores del mismo tipo (iris + huella) **no** son multifactor.

### Buenas prácticas para el acceso remoto

Recomendaciones del CCN-CERT (guía **CCN-STIC-836**, informe **BP/18** de teletrabajo) y del ENS:

- **Política de acceso remoto** con autorización expresa, por usuario y por recurso; **política de uso aceptable** de la VPN.
- **Mínimo privilegio**: los privilegios del teletrabajador **no** tienen por qué ser los mismos que en local; se limitan a los recursos imprescindibles (**[mp.eq.3.3]**).
- **Canal cifrado** que **termine en un cortafuegos** o concentrador situado en una **DMZ dedicada**, nunca directamente en la red interna.
- **Doble factor** obligatorio; certificados en lugar de claves precompartidas.
- **Registro** de las conexiones (quién, desde dónde, cuándo, cuánto tiempo) y **monitorización** del tráfico de la VPN.
- **Equipos corporativos** bastionados y gestionados, con **comprobación de postura** antes de conectar (parches, antivirus, cifrado); evitar equipos personales o limitarlos a VDI o portales.
- **Sin túnel dividido** (*split tunneling*): todo el tráfico del equipo pasa por la VPN y por los controles corporativos.
- **Tiempo máximo de sesión** y desconexión por inactividad; desactivar el acceso remoto que no se use.
- **Parchear con prioridad** los concentradores VPN y pasarelas de acceso (Fortinet, Ivanti, Citrix, Cisco o Palo Alto han tenido vulnerabilidades críticas explotadas de forma masiva entre 2019 y 2025) y vigilar los avisos del CCN-CERT.
- **No publicar RDP, SSH, SMB ni las consolas de administración en Internet**.

### SSH y escritorio remoto seguros

```bash
# /etc/ssh/sshd_config (extracto de bastionado; aplicar con: sshd -t && systemctl reload sshd)
PermitRootLogin no                 # nada de entrar como root
PasswordAuthentication no          # solo claves (o claves + segundo factor)
PubkeyAuthentication yes
AllowGroups admins-ssh             # solo este grupo
MaxAuthTries 3
LoginGraceTime 30
X11Forwarding no
ClientAliveInterval 300            # cerrar sesiones inactivas
```

```bash
ssh-keygen -t ed25519 -C "admin@organismo"              # par de claves
ssh-copy-id -i ~/.ssh/id_ed25519.pub admin@srv01        # instalar la pública en el servidor
ssh -J bastion.organismo.es admin@srv01.interno         # saltar a través del bastión (ProxyJump)
ssh -L 8443:intranet.interno:443 admin@bastion          # túnel local: localhost:8443 → intranet:443
ssh -D 1080 admin@bastion                               # proxy SOCKS dinámico
```

En **RDP**: autenticación a nivel de red (**NLA**), cifrado TLS, **RD Gateway** con MFA, limitar quién puede conectarse (grupo «Usuarios de escritorio remoto»), bloqueo de cuentas por intentos fallidos y registro de los eventos de inicio de sesión.

### Confianza cero, ZTNA y SASE

**Confianza cero** (*zero trust*, NIST **SP 800-207**, 2020) parte de que **no hay red de confianza**: cada solicitud de acceso a un recurso se **autentica y autoriza de forma explícita**, con el mínimo privilegio y según el contexto (identidad, estado del dispositivo, ubicación, riesgo), y se vigila continuamente. Sus componentes lógicos son el **motor de políticas** (decide), el **administrador de políticas** (ordena abrir o cerrar la sesión) y el **punto de aplicación de políticas** (PEP), que se interpone entre el sujeto y el recurso.

| | VPN tradicional | **ZTNA** |
|---|---|---|
| Qué se concede | Acceso a **la red** (a menudo a segmentos enteros) | Acceso a **aplicaciones concretas** |
| Confianza | Una vez dentro, se confía | Se verifica **cada sesión** (identidad, dispositivo, contexto) |
| Exposición | El concentrador está publicado en Internet | Las aplicaciones quedan ocultas tras un intermediario; conexiones salientes |
| Movimiento lateral | Posible | Muy limitado |

**SASE** (*Secure Access Service Edge*, término de Gartner de 2019) une en un servicio en la nube las funciones de red (**SD-WAN**) y de seguridad: el **SSE** (*Security Service Edge*), formado por **ZTNA**, pasarela web segura (**SWG**), **CASB** (control del uso de aplicaciones en la nube) y cortafuegos como servicio (**FWaaS**). La guía CCN-STIC-836 trata también las **VPN en la nube** (*VPN as a Service*), que dan un punto único de acceso al centro de datos, a Internet y a la nube con visibilidad de todo el tráfico.

## Redes privadas virtuales (VPN)

### Concepto y propiedades

Una **red privada virtual** (VPN, *Virtual Private Network*) establece una **conexión virtual segura**, llamada **túnel**, construida **sobre una red física insegura** (normalmente Internet): los paquetes originales se **encapsulan** dentro de otros y se **cifran y autentican**, de modo que la red pública se usa como si fuera un enlace privado. Los extremos son **servidores, pasarelas o concentradores VPN** (que encapsulan, cifran, descifran y desencapsulan) y, en el acceso remoto, el **cliente VPN** del equipo del usuario.

Según la guía **CCN-STIC-836** (*Seguridad en redes privadas virtuales*, actualizada en 2022), una VPN aporta:

| Propiedad | Mecanismo |
|---|---|
| **Confidencialidad** | **Cifrado simétrico** de los datos con algoritmos como **AES** (las funciones *hash* no cifran; una buena gestión de usuarios tampoco garantiza la confidencialidad) |
| **Integridad y autenticidad** de los datos | Códigos de autenticación de mensajes (**MAC**, HMAC) o cifrado autenticado (AEAD) |
| **Autenticación mutua** de los extremos | Certificados X.509 de una CA reconocida por ambos (o claves precompartidas, menos recomendables) |
| **Protección frente a reenvíos** | Números de secuencia |
| Protección frente al análisis de tráfico | En modo túnel se ocultan las direcciones internas |
| **Control de acceso** | Filtrado del tráfico permitido por el túnel |
| Comprobación del estado del equipo (*host check*), funciones de proxy e integración con el resto de la seguridad | En los concentradores de acceso remoto |

Una VPN **reduce pero no elimina** el riesgo: depende de la fortaleza de la implementación y de las claves, y conviene **monitorizar** el tráfico que circula por ella.

### Tipos de VPN

| Criterio | Tipos |
|---|---|
| **Escenario** | **De sitio a sitio** (*site-to-site*: une redes de dos sedes con una pasarela en cada extremo; los equipos no necesitan *software*), **de acceso remoto** (un equipo de usuario con su cliente VPN contra el concentrador de la organización) y **de equipo a equipo** (*host-to-host*: protege el tráfico extremo a extremo entre dos máquinas, por ejemplo para administrar un servidor de la DMZ) |
| **Quién la presta** | **VPN de confianza** (*trusted*, del operador: circuitos **MPLS** L3VPN o VPLS separan el tráfico de cada cliente en su red, **sin cifrado**; tema IV.6), **VPN segura** (*secure*: cifrada con IPsec, TLS o WireGuard sobre cualquier red) e **híbrida** |
| **Nivel de la pila** | De **aplicación**, de **transporte**, de **red** y de **enlace** (tabla siguiente) |
| Despliegue | En un **equipo dedicado** (*appliance*, opción más segura), en un cortafuegos o *router* con funciones VPN, en un servidor de propósito general o **como servicio en la nube** (VPNaaS) |

| Nivel | Protocolos | Características según el CCN |
|---|---|---|
| **Aplicación** | **Túneles SSH**, protocolos seguros propios de cada aplicación | Protegen solo esa aplicación; no protegen las cabeceras IP; complejas de mantener: **solo para administradores** dentro de la organización |
| **Transporte** | **TLS** (VPN SSL/TLS), OpenVPN, SSTP | **El protocolo más empleado por las VPN de nivel de transporte es TLS**; acceso a aplicaciones (a menudo web y desde el navegador), autenticación robusta, **compatibles con NAT**, control de acceso granular y función de proxy; no protegen las cabeceras IP |
| **Red** | **IPsec**, **WireGuard** | Protegen **datos y cabeceras IP** y cualquier aplicación; IPsec es complejo y tiene **problemas con NAT**; si hace falta compatibilidad con NAT se recomienda **WireGuard** |
| **Enlace** | **MACsec** (IEEE 802.1AE); históricamente **PPTP, L2F y L2TP** | Sirven para cualquier protocolo de red, no solo IP; se recomienda **MACsec** y **evitar PPTP, L2F o L2TP**, que son vulnerables |

### Protocolos de túnel

| Protocolo | Nivel | Especificación y puertos | Cifrado y situación |
|---|---|---|---|
| **GRE** | 3 | RFC 2784; protocolo IP **47** | Solo encapsula, **no cifra** (se usa «GRE sobre IPsec») |
| **PPTP** (*Point-to-Point Tunneling Protocol*) | 2 | **RFC 2637** (1999); control por **TCP 1723** y datos por **GRE** | Encapsula PPP; cifrado **MPPE** (RC4) con autenticación MS-CHAPv2: es el **más débil**, **roto**; **no usar** |
| **L2F** (*Layer 2 Forwarding*) | 2 | Cisco, RFC 2341 | Histórico, sin cifrado |
| **L2TP** (*Layer 2 Tunneling Protocol*) | 2 | **RFC 2661** (L2TPv2) y RFC 3931 (L2TPv3); **UDP 1701** | **No cifra**: se combina con IPsec (**L2TP/IPsec**, RFC 3193) |
| **SSTP** (*Secure Socket Tunneling Protocol*) | 4 | Microsoft; PPP sobre **HTTPS (TCP 443)** | TLS; atraviesa cortafuegos y proxies |
| **IPsec** con IKEv2 | 3 | RFC 4301-4303 y 7296; UDP 500 y 4500, protocolos IP 50 (ESP) y 51 (AH) | Estándar del IETF; sitio a sitio y acceso remoto |
| **VPN TLS** (SSL VPN) | 4-7 | TLS 1.2/1.3 sobre TCP 443 (datos a veces por DTLS) | Portal o túnel; productos comerciales (Fortinet, Palo Alto, Cisco, Ivanti, Check Point) |
| **OpenVPN** | 4 (túnel de capa 2 o 3) | Protocolo **propio** basado en TLS; **UDP 1194** por defecto | Código abierto; **no es compatible con IPsec, IKE, PPTP ni L2TP** |
| **WireGuard** | 3 | UDP (51820 por convención) | Criptografía moderna fija; en el núcleo de Linux desde la versión **5.6** (2020) |
| **MACsec** | 2 | **IEEE 802.1AE** (vigente 802.1AE-2018), claves con MKA (802.1X) | AES-GCM salto a salto en Ethernet |

Las siglas también caen: **L2TP** = *Layer 2 Tunneling Protocol*; **IKEv2** = *Internet Key Exchange version 2*; **ESP** = *Encapsulating Security Payload*; **AH** = *Authentication Header*; **SSTP** = *Secure Socket Tunneling Protocol*. Para proporcionar cifrado, una VPN puede usar **PPTP/MPPE**, **IPsec** o **L2TP/IPsec** (no existen protocolos como «KSEC» o «P2TP»).

### IPsec

**IPsec** (*IP Security*, arquitectura en la RFC 4301) es un **conjunto de protocolos que protegen las comunicaciones en la capa IP**, para IPv4 e IPv6. Lo forman **dos protocolos de seguridad** y **un protocolo de gestión de claves**:

| | **AH** (*Authentication Header*, RFC 4302) | **ESP** (*Encapsulating Security Payload*, RFC 4303) |
|---|---|---|
| Protocolo IP | **51** | **50** |
| **Confidencialidad (cifrado)** | **No** | **Sí** (AES-GCM, AES-CBC) |
| Integridad y autenticación del origen | Sí, **de todo el paquete, incluida la cabecera IP** | Sí, de la carga (no de la cabecera IP exterior) |
| Antirreenvío | Sí | Sí |
| Con NAT | **Incompatible** (NAT cambia campos autenticados) | Funciona con **NAT-T** (encapsulado en UDP 4500) |
| Recomendación del CCN | **No se recomienda**; si no hace falta confidencialidad, mejor ESP sin cifrado | **Recomendado**, preferiblemente con algoritmos **AEAD** como AES-GCM |

**Modos**:

```text
Paquete original:            [ IP orig. | TCP | Datos ]

Modo TRANSPORTE (ESP):       [ IP orig. | ESP | TCP | Datos | ESP trailer | ICV ]
                                          └──── cifrado ────────────┘
   → protege la carga; la cabecera IP original queda visible; típico de equipo a equipo

Modo TÚNEL (ESP):            [ IP nueva | ESP | IP orig. | TCP | Datos | ESP trailer | ICV ]
                                              └────────── cifrado ──────────────┘
   → todo el paquete original viaja cifrado dentro de otro; típico de sitio a sitio y acceso remoto
```

El **modo túnel** es **más seguro** (oculta las direcciones internas) y el CCN lo recomienda **siempre que sea posible**; las pasarelas deben implementarlo.

**Asociaciones de seguridad (SA)**: cada SA es un acuerdo **unidireccional** (hay **dos por conexión**, una por sentido) que fija protocolo, modo, algoritmos, claves y vida útil, y se identifica por el **SPI** (*Security Parameter Index*). Las SA activas se guardan en la **SAD** y la **SPD** (base de datos de políticas) decide qué tráfico se protege, se descarta o pasa sin proteger.

**IKE** (*Internet Key Exchange*) autentica a los extremos y **negocia, crea y renueva las SA** por **UDP 500** (y **UDP 4500** cuando hay NAT):

| | IKEv1 (RFC 2409, con ISAKMP) | **IKEv2** (**RFC 7296**) |
|---|---|---|
| Fases | Fase 1 (**modo principal**, 6 mensajes, o **modo agresivo**, 3 mensajes que exponen la identidad y facilitan atacar las claves precompartidas) y fase 2 (**modo rápido**) | **IKE_SA_INIT** (algoritmos, *nonces* y Diffie-Hellman) e **IKE_AUTH** (identidades, certificados y primera SA hija): **4 mensajes**; después **CREATE_CHILD_SA** (nuevas SA y renovación de claves) e **INFORMATIONAL** (errores y notificaciones) |
| NAT, movilidad, EAP | Extensiones | **Integrados**: NAT-T, **MOBIKE** (RFC 4555: cambiar de red sin cortar el túnel), autenticación EAP de usuarios |
| Situación | **Casi en desuso** | **Recomendado** por el CCN |

Recomendaciones de la CCN-STIC-836 para IPsec: **IKEv2**, **ESP en modo túnel** con **AEAD** (AES-GCM), autenticación con **certificados** de una PKI en lugar de claves precompartidas (que cualquiera que las conozca puede usar y son vulnerables a diccionario), grupos **Diffie-Hellman de al menos 128 bits** de fortaleza (MODP de 3072 bits, curvas de 256 bits o más; preferiblemente **Brainpool**, grupos 28 a 30), **secreto perfecto hacia adelante** (**PFS**) activado, vida de las SA hijas **inferior a 4 horas** y de la SA de IKE **inferior a 24 horas**, y gestión **automática** de las SA con IKE (no manual).

```ini
# strongSwan (/etc/swanctl/conf.d/sedes.conf): VPN de sitio a sitio IKEv2 con certificados
connections {
  sede-central {
    version = 2
    local_addrs = 198.51.100.1
    remote_addrs = 203.0.113.1
    proposals = aes256gcm16-prfsha384-ecp384      # IKE: AES-256-GCM, PRF SHA-384, grupo DH 20
    local {
      auth = pubkey
      certs = sede-a.pem
      id = sede-a.organismo.es
    }
    remote {
      auth = pubkey
      id = sede-b.organismo.es
    }
    children {
      lan-lan {
        local_ts = 10.10.0.0/16
        remote_ts = 10.20.0.0/16
        esp_proposals = aes256gcm16-ecp384        # ESP con AEAD y PFS
        mode = tunnel
        start_action = start
      }
    }
  }
}
# swanctl --load-all   (cargar)      swanctl --list-sas   (ver las SA establecidas)
```

En el cortafuegos, una VPN IPsec necesita permitir **UDP 500**, **UDP 4500** y el **protocolo IP 50** (ESP).

### VPN TLS

Las **VPN TLS** (llamadas aún **VPN SSL**) trabajan en el **nivel de transporte** con TLS 1.2 o 1.3 por el puerto 443, lo que les permite atravesar NAT, proxies y casi cualquier cortafuegos. Dos modalidades:

- **Portal** (sin cliente): el usuario entra con el **navegador** en un portal web del concentrador, que actúa como **proxy inverso** y publica solo determinadas aplicaciones, tras autenticar y autorizar al usuario.
- **Túnel** (con cliente): un cliente o complemento crea un túnel de **capa 3** que da acceso a la red interna; muchos productos llevan los datos por **DTLS** sobre UDP para mejorar el rendimiento.

```ini
# OpenVPN 2.6, servidor (/etc/openvpn/server/teletrabajo.conf, extracto)
port 1194
proto udp
dev tun
ca ca.crt
cert servidor.crt
key servidor.key
dh none                              # solo intercambio de claves ECDHE
tls-version-min 1.2
data-ciphers AES-256-GCM:AES-128-GCM
server 10.8.0.0 255.255.255.0        # direcciones para los clientes
push "redirect-gateway def1"         # todo el tráfico por la VPN (sin túnel dividido)
```

### WireGuard

**WireGuard** es un **túnel de red seguro que opera en la capa de red y se implementa como una interfaz virtual de red en el núcleo de Linux** (incluido desde la versión 5.6). Pretende sustituir a IPsec y a las VPN TLS siendo más sencillo y rápido: unas 4 000 líneas de código, **criptografía fija y moderna** (intercambio con el marco **Noise**, **Curve25519**, **ChaCha20-Poly1305**, **BLAKE2s**, HKDF), saludo en **1-RTT**, claves que se renuevan cada pocos minutos (**PFS**), **solo UDP**, no responde a paquetes no autenticados y **asocia cada clave pública con las IP que puede usar** (*cryptokey routing*). No gestiona por sí mismo la distribución de claves ni el direccionamiento, y registra muy poco.

```ini
# /etc/wireguard/wg0.conf del portátil (claves con: wg genkey | tee privada.key | wg pubkey > publica.key)
[Interface]
Address = 10.99.0.2/32
PrivateKey = <clave privada del portátil>
DNS = 10.30.0.53

[Peer]
PublicKey = <clave pública del concentrador>
Endpoint = vpn.organismo.es:51820
AllowedIPs = 0.0.0.0/0, ::/0         # todo el tráfico por el túnel
PersistentKeepalive = 25
# wg-quick up wg0     wg show
```

### MACsec

**MACsec** (IEEE **802.1AE**, *MAC Security*) **cifra y autentica las tramas Ethernet** en la **capa de enlace**, **salto a salto** (entre un equipo y su conmutador o entre conmutadores), con **AES-GCM** de 128 o 256 bits y claves acordadas con **MKA** (definido en IEEE 802.1X). Protege cualquier protocolo de red (no solo IP), por ejemplo enlaces entre edificios o centros de datos, pero exige equipos compatibles y añade una cabecera que reduce la MTU útil.

### Comparativa y recomendaciones

| | IPsec (IKEv2) | VPN TLS / OpenVPN | WireGuard | MACsec |
|---|---|---|---|---|
| Capa | Red | Transporte | Red | Enlace |
| Protege cabeceras IP | Sí (modo túnel) | No | Sí | Toda la trama |
| NAT | Con NAT-T | Sin problemas | Sin problemas | No aplica (capa 2) |
| Facilidad | Compleja | Media | **Muy sencilla** | Requiere *hardware* compatible |
| Uso típico | Sitio a sitio, acceso remoto | Acceso remoto y portales | Acceso remoto y sitio a sitio | Enlaces dedicados en LAN/MAN |

Resumen de la **CCN-STIC-836**: elegir productos de la familia **Redes Privadas Virtuales IPsec o TLS** del **CPSTIC** (catálogo de productos y servicios de seguridad TIC del CCN) según la categoría del ENS y seguir su procedimiento de empleo seguro; ubicar el concentrador en una **DMZ dedicada**; **no permitir el túnel dividido**; usar algoritmos y longitudes de clave autorizados (**CCN-STIC-807**); **IKEv2**, **ESP**, **modo túnel**, certificados y PFS en IPsec; **WireGuard** cuando haga falta atravesar NAT en el nivel de red; **MACsec** en el nivel de enlace (nunca PPTP, L2F ni L2TP sin IPsec); políticas de VPN y de uso aceptable, doble factor para los administradores, cierre de sesiones inactivas, alta disponibilidad y monitorización.

## Seguridad en el puesto del usuario

### Por qué el puesto es el eslabón crítico

El **puesto de usuario** (ordenador de sobremesa o portátil, y cada vez más el móvil) es el punto donde se lee el correo, se navega, se conectan memorias USB y se introducen credenciales: por eso es **la vía de entrada más frecuente** de los incidentes (*phishing* que instala *malware*, robo de credenciales, *ransomware* que después se extiende por la red). Protegerlo combina **medidas técnicas** (bastionado, parches, antimalware y EDR, control de aplicaciones, cifrado), **medidas organizativas** (normativa de uso, mínimo privilegio, gestión centralizada) y la **concienciación** del usuario.

### Amenazas dirigidas al puesto

| Amenaza | Descripción |
|---|---|
| ***Phishing*** y variantes | Mensajes que suplantan a una entidad legítima para robar credenciales o instalar *malware*: *spear phishing* (dirigido), *whaling* (a directivos), ***smishing*** (SMS o mensajería), ***vishing*** (**llamadas telefónicas** de voz), *quishing* (códigos QR) |
| ***Pharming*** | **Alteración de la resolución de nombres** (fichero `hosts` del equipo o caché DNS envenenada) para **redirigir al usuario a una web falsa aunque escriba la dirección correcta** |
| Descargas involuntarias (*drive-by*) y *malvertising* | Páginas o anuncios que explotan vulnerabilidades del navegador o sus complementos |
| ***Clickjacking*** (secuestro de clics) | Una página aparentemente inocente superpone un marco invisible de otro sitio: **las pulsaciones del ratón se redirigen** a otro sitio y el usuario hace sin saberlo algo que no quería (se evita en el servidor con `frame-ancestors` o `X-Frame-Options`) |
| Documentos con macros o enlaces maliciosos | Adjuntos de Office, PDF, ficheros comprimidos o accesos directos que descargan *malware* |
| *Malware* y ***ransomware*** | Troyanos, *infostealers* que roban contraseñas y *cookies* de sesión, *keyloggers*, cifrado de datos con extorsión (tipos en el tema IV.5) |
| Dispositivos USB maliciosos | Memorias infectadas o dispositivos que se hacen pasar por teclados (*BadUSB*) |
| Robo o pérdida del portátil | Acceso a los datos si el disco no está cifrado |
| Ingeniería social directa | Falsos técnicos de soporte, fatiga de MFA, suplantación por voz o vídeo generados con IA |
| *Software* sin soporte o sin parches | Sistemas fuera de soporte (Windows 10 dejó de recibir actualizaciones gratuitas el **14‑10‑2025**, salvo el programa de actualizaciones extendidas), navegadores o Java antiguos |
| *Shadow IT* | Aplicaciones o servicios en la nube no autorizados por los que salen datos |

### Medidas de protección del puesto

| Medida | En la práctica | ENS |
|---|---|---|
| **Configuración segura** (bastionado) | Aplicar perfiles de seguridad: guías **CCN-STIC** de la serie 500/600 (por ejemplo, **CCN-STIC-599AB25**, *perfilado de seguridad para Windows 11*), líneas base de Microsoft o de CIS; desactivar servicios y protocolos innecesarios (SMBv1, LLMNR, PowerShell 2.0); comprobar el cumplimiento con **CLARA** | [op.exp.2], [op.exp.3], art. 20 |
| **Actualizaciones** | Parches del sistema, navegador, ofimática y *firmware* con WSUS, Windows Update for Business, Intune o los repositorios de la distribución; retirar lo que está fuera de soporte | [op.exp.4] |
| **Mínimo privilegio** | El usuario trabaja **sin derechos de administrador**; Control de cuentas de usuario (UAC); contraseña de administrador local **única y rotada** con **Windows LAPS**; elevación solo con PAM o con cuentas separadas | art. 20, [op.acc.4] |
| **Protección frente a código dañino** | Antimalware en tiempo real en **todos** los equipos, firmas actualizadas, análisis de lo que llega de fuentes externas y de los dispositivos extraíbles; **EDR** (*Endpoint Detection and Response*) en categoría ALTA; soluciones del CCN-CERT **CLAUDIA** (amenazas complejas) y **microCLAUDIA** (vacunas contra *ransomware*) | [op.exp.6] (+R4 EDR) |
| **Control de aplicaciones** (lista blanca) | Solo se ejecuta lo autorizado: **AppLocker**, **App Control for Business** (antes WDAC), Gatekeeper en macOS, `fapolicyd` en RHEL; bloqueo de macros de Office procedentes de Internet (comportamiento por defecto desde 2022) | [op.exp.6.r3] |
| **Cortafuegos personal** | Firewall de Windows Defender en los tres perfiles, entradas denegadas por defecto; `ufw` o `firewalld` en Linux | [mp.com.1], [mp.com.4] |
| **Cifrado del disco** | **BitLocker** (con TPM y, mejor, PIN; la **clave de recuperación** de 48 dígitos se custodia en Active Directory o Entra ID y es imprescindible para recuperar o restaurar un equipo cifrado), **FileVault** en macOS, **LUKS** en Linux | [mp.eq.3.r1], [mp.si.2] |
| **Bloqueo del puesto** | Bloqueo por **inactividad** con nueva autenticación y, en nivel ALTO, cierre de las sesiones abiertas | [mp.eq.2] |
| **Puesto despejado** | Sin papeles ni soportes a la vista; material guardado bajo llave | [mp.eq.1] |
| **Portátiles** | Inventario con responsable, procedimiento ante pérdida o robo, acceso remoto limitado a lo imprescindible, cifrado y uso en entornos protegidos | [mp.eq.3] |
| **Otros dispositivos** | Impresoras multifunción, IoT, dispositivos de invitados y BYOD con configuración segura, borrado de su almacenamiento y control de su conexión a la red | [mp.eq.4] |
| **Control de dispositivos** | Bloquear o limitar el almacenamiento USB por directiva; analizarlo al conectarlo | [mp.si], [op.exp.6] |
| **Navegador y correo** | Navegador actualizado y gestionado (extensiones permitidas, SmartScreen o Navegación segura), proxy y filtrado web, pasarela antispam y *sandbox* de adjuntos | [mp.s.1], [mp.s.3] |
| **Autenticación robusta** | Windows Hello for Business, tarjeta criptográfica (DNIe, tarjeta de empleado público), MFA y claves de acceso | [op.acc.6] |
| **Arranque seguro y protección de credenciales** | UEFI **Secure Boot** y **TPM 2.0** (requisitos de Windows 11), seguridad basada en virtualización, **Credential Guard** y protección de LSA | [op.exp.2] |
| **Copias de seguridad** | Datos en carpetas de red o en la nube corporativa con versiones; copias protegidas frente a *ransomware* | [mp.info.6] |
| **Registro y monitorización** | Eventos de seguridad, Sysmon y telemetría del EDR enviados al SIEM | [op.exp.8], [op.mon] |
| **Gestión centralizada** | Inventario y configuración con directivas de grupo, Intune/MDM o herramientas de gestión de puestos (tema IV.4) | [op.exp.1] |
| **Concienciación y formación** | Campañas periódicas y simulaciones de *phishing*; plataforma **Ángeles** del CCN-CERT; normativa de uso conocida y aceptada por el usuario | [mp.per.2], [mp.per.3], [mp.per.4] |

En **macOS**, el cifrado completo del disco lo da **FileVault**, y **Gatekeeper** solo deja ejecutar aplicaciones firmadas y notarizadas (XProtect es su antimalware integrado). **AppLocker** se aplicaba por directiva de grupo solo en las ediciones **Enterprise** y Education de Windows 10 (respuesta oficial del examen de 2016); desde una actualización de 2023 (KB5024351) Windows 10 2004 o posterior y Windows 11 permiten aplicarlo en todas las ediciones, y Microsoft recomienda ya **App Control for Business**.

La supervisión de los puestos debe respetar el derecho a la **intimidad en el uso de dispositivos digitales en el ámbito laboral** (art. 87 de la LOPDGDD): el organismo fija criterios de uso y debe **informar** a los empleados de los controles.

```powershell
manage-bde -status C:                                  # estado del cifrado BitLocker
manage-bde -protectors -get C:                         # protectores: TPM, contraseña de recuperación (48 dígitos)
Get-BitLockerVolume | Select-Object MountPoint, VolumeStatus, ProtectionStatus
Get-MpComputerStatus | Select-Object AMRunningMode, RealTimeProtectionEnabled, AntivirusSignatureLastUpdated
Update-MpSignature                                     # actualizar las firmas de Microsoft Defender
Start-MpScan -ScanType QuickScan
Get-AppLockerPolicy -Effective -Xml                    # política de AppLocker en vigor
Get-LapsADPassword -Identity PC-0123 -AsPlainText      # contraseña LAPS del administrador local
gpresult /r                                            # directivas de grupo aplicadas
whoami /groups                                         # ¿pertenece el usuario a Administradores?
```

```bash
sudo cryptsetup luksFormat --type luks2 /dev/nvme0n1p3      # cifrar una partición (Linux)
lsblk -f                                                    # FSTYPE crypto_LUKS = cifrada
sudo ufw default deny incoming && sudo ufw enable           # cortafuegos personal (Ubuntu)
sudo systemctl enable --now dnf-automatic.timer             # parches automáticos (RHEL; unattended-upgrades en Debian)
fdesetup status                                             # macOS: ¿está activo FileVault?
spctl --status                                              # macOS: ¿está activo Gatekeeper?
```

**Dispositivos móviles** (tema II.4): gestión con **MDM/UEM** (perfiles, cifrado obligatorio, borrado remoto, aplicaciones solo de tiendas aprobadas), separación de datos personales y corporativos (perfil de trabajo de Android, apps gestionadas en iOS) y actualizaciones al día; el CCN ofrece guías específicas y la solución **CCNDroid** para Android.

## Normativa y estándares clave

| Norma o estándar | Qué regula | Puntos clave |
|---|---|---|
| **Real Decreto 311/2022** (ENS) | Seguridad del sector público | Arts. 9 (**líneas de defensa**), 10 (vigilancia continua) y 20 (**mínimo privilegio**); medidas **[mp.com.1]** perímetro seguro, **[mp.com.2]** confidencialidad (VPN cifradas fuera del dominio), **[mp.com.3]** integridad y autenticidad, **[mp.com.4]** segmentación (usuarios, servicios, administración; Wi‑Fi aparte), **[op.acc.6]** autenticación (R8 doble factor desde zonas no controladas, R9 acceso remoto), **[op.exp.6]** código dañino (R3 lista blanca, R4 EDR), **[op.mon.1]** detección de intrusión, **[mp.eq.1-4]** puesto de trabajo, **[mp.s.1-4]** correo, web, navegación y DoS |
| **CCN-STIC-836** (2022) | Seguridad en redes privadas virtuales | Tipos y niveles de VPN; IKEv2, ESP, modo túnel, PFS; WireGuard; MACsec; DMZ dedicada; sin túnel dividido |
| CCN-STIC-807, CCN-STIC-811, CCN-STIC-816, CCN-STIC-820 | Criptología; interconexión en el ENS; redes inalámbricas; protección contra DoS | Algoritmos autorizados; requisitos de los puntos de interconexión |
| CCN-STIC-599AB25 y serie 500/600 | Perfilado de seguridad de Windows 11 y otros productos | Bastionado del puesto y de servidores |
| CCN-CERT **BP/18** | Recomendaciones para el teletrabajo | Acceso remoto seguro, doble factor, registro |
| **NIST SP 800-41** Rev. 1 | Cortafuegos y política de cortafuegos | Tipos de cortafuegos y arquitecturas |
| **NIST SP 800-94** | Sistemas de detección y prevención de intrusiones | NIDS, WIDS, **NBA**, HIDS; firmas y anomalías |
| **NIST SP 800-207** | Arquitectura de confianza cero | Motor, administrador y punto de aplicación de políticas |
| NIST SP 800-77 Rev. 1 | VPN IPsec | Guía de despliegue |
| **RFC 4301, 4302, 4303 y 7296** | IPsec: arquitectura, **AH**, **ESP** e **IKEv2** | AH protocolo 51 sin cifrado; ESP protocolo 50 con cifrado; IKE en UDP 500/4500 |
| RFC 2637, 2661, 3193, 2784 | **PPTP**, **L2TP**, L2TP/IPsec, GRE | Túneles; PPTP y L2TP solos no son seguros |
| RFC 2827 (BCP 38) | Filtrado de entrada | Contra la suplantación de IP |
| RFC 2865/2866, RFC 8907, RFC 6733 | RADIUS, TACACS+, Diameter | AAA |
| **IEEE 802.1X**, **802.1AE** (MACsec), 802.11i/WPA3 | Control de acceso por puerto; seguridad de enlace; Wi‑Fi | EAP-TLS, MKA, SAE |
| ISO/IEC 27001:2022 (controles 8.20 a 8.23) e ISO/IEC 27033 | Seguridad de las redes, de sus servicios, segregación y filtrado web; serie de seguridad de redes | Marco internacional |
| LOPDGDD (Ley Orgánica 3/2018), art. 87 | Intimidad en el uso de dispositivos digitales en el trabajo | Criterios de uso e información al empleado |
| TREBEP, art. 47 bis | Teletrabajo en las Administraciones públicas | Marco del trabajo a distancia de los empleados públicos |
| Directiva (UE) 2022/2555 (**NIS2**) | Ciberseguridad de entidades esenciales e importantes | Gestión de riesgos, notificación de incidentes |

## Lo que más cae en el examen

Es uno de los temas con **más preguntas** del bloque IV: **66** en los exámenes de 2016 a 2025, **45 de ingreso libre** (7 en 2016, 4 en 2018 contando el segundo ejercicio, 6 en 2019, 6 en 2021, 7 en 2023, 4 en 2024, 6 en la convocatoria de 2025 y 5 en su llamamiento extraordinario) y **21 de promoción interna** (2 en 2018, 2 en 2019, 3 en 2021, 8 en 2023, 2 en 2024 y 4 en 2025). Muchas son de **supuesto práctico**, con órdenes concretas.

| Bloque | Preguntas | Exámenes |
|---|---|---|
| **Cortafuegos y perímetro**: órdenes de `netsh advfirewall` (activar en todos los perfiles o en el actual, ver el perfil activo, `add rule … action=allow`) (×6), `firewall-cmd` (servicios de la zona, regla enriquecida con `source address`) (×3), `iptables` (bloquear el 443 en `eth1`, `--flush`) (×2), `rp_filter` contra el *IP spoofing* (×2), `/etc/hosts.allow`; conceptos: *stateless*, *stateful*, DPI y NGFW, **WAF**, **DMZ** (×2), SOHO, cortafuegos de capa de red; puerto 22 de SSH y SCP (×3) | 23 | LI 2016, 2018, 2019, 2021, 2023, 2025 y 2025‑ext; PI 2019, 2021 y 2025 |
| **VPN y acceso remoto**: IPsec (AH, ESP, IKE) frente a PPTP y OpenVPN, siglas (L2TP, IKEv2, ESP, SSTP), confidencialidad con AES, VPN de nivel de enlace (PPTP, L2F, L2TP), protocolos con cifrado, **doble factor** por SMS (×2), **RFC 2637 de PPTP** (×2), **WireGuard**, **MACsec = IEEE 802.1AE**, ESP da confidencialidad, recomendaciones de acceso remoto, **AAA**, **CCN-STIC-836**, **TLS** en las VPN de transporte | 16 | LI 2019, 2021, 2023 y 2025‑ext; PI 2018 y 2023 |
| **Puesto de usuario**: AppLocker en Windows 10 Enterprise, **FileVault**, clave de **BitLocker** para restaurar (×2), *clickjacking*, ***vishing*** (×2), ***pharming***, **mínimo privilegio** del ENS | 9 | LI 2016, 2019, 2021, 2024 y 2025; PI 2021, 2024 y 2025 |
| **Detección y vigilancia**: **Suricata**, ***DNS sinkholing***, IPS de tipo **NBA**, ***honeypot***, **EMMA** (×2), **SAT INET** (túnel iniciado por la sonda), **OSSEC** (HIDS) | 8 | LI 2016, 2018, 2021, 2024 y 2025‑ext; PI 2023 y 2024 |
| **Redes inalámbricas**: *eavesdropping*, *MAC spoofing*, **portal cautivo**, métodos de **WPS**, **KRACK**, WPA3-Enterprise con RADIUS/EAP-TLS, `netsh wlan add filter` | 7 | LI 2018, 2023 y 2024; PI 2018 y 2023 |
| **Proxies**: proxy **transparente** (con NAT, sin configurar el navegador) y **Squid** | 2 | LI 2016 |
| Ataques de red: **Fraggle** (eco UDP a difusión) | 1 | PI 2019 |

Patrón: en el **supuesto**, órdenes exactas de cortafuegos de Windows y Linux con opciones parecidas (`create`/`add`, `permit`/`allow`, `enable`/`state on`, `address`/`source address`), puertos y decisiones de arquitectura (DMZ, WAF, IPS, VPN con doble factor); en el **cuestionario**, siglas y definiciones (tipos de IDS, protocolos VPN, ataques con nombre en inglés y herramientas del CCN).

## Trampas habituales

- `netsh advfirewall`: **`set allprofiles state on`** o **`set currentprofile state on`** (no `enable`, `on` a secas ni `online`); **`show currentprofile`** (no `get`); reglas con **`firewall add rule`** y **`action=allow`** (no `create`, `new` ni `permit`).
- `iptables -A INPUT -i eth1 -p tcp --dport 443 -j DROP`: los objetivos válidos son `ACCEPT`, `DROP`, `REJECT`, `LOG`… (no `DISABLE` ni `FAIL`); borrar todas las reglas es **`iptables --flush`** (`-F`).
- `firewall-cmd --zone=public --list-services` muestra los servicios permitidos (`--list-ports` solo los puertos sueltos); las reglas enriquecidas usan **`source address=`** y `port protocol="tcp" port="3306"`; `--permanent` no aplica hasta `--reload`.
- **`rp_filter=1`** mitiga el *IP spoofing*; `ip_forward` convierte el equipo en *router*; desactivar `tcp_syncookies` empeora la protección frente a SYN flood.
- Los cortafuegos ***stateless*** **no** guardan las sesiones; los ***stateful*** **sí**; **DPI** inspecciona **el contenido completo** del paquete; los **NGFW sí incluyen NAT y VPN**.
- Para filtrar el tráfico HTTP hacia los servidores web: **WAF**; para aislar los servidores publicados: **DMZ** (no una VPN ni un IDS en modo promiscuo).
- Tipos de IPS: **NBA** analiza el comportamiento de la red (DoS, *malware*), **WIPS** el inalámbrico, **HIPS** un equipo; «DIPS» no es una categoría.
- ***Honeypot*** = señuelo para estudiar a los atacantes (no es un IDS, IPS ni SIEM); ***DNS sinkholing*** = redirigir dominios maliciosos a una IP controlada (no es *spoofing* ni envenenamiento).
- **EMMA** = visibilidad y control de la red; **CARMEN** = APT en el tráfico; **CLAUDIA** = puesto; **LUCIA** = incidentes; **GLORIA** y **MÓNICA** = SIEM; **OLVIDO** = borrado seguro; **SAT INET**: el túnel cifrado **lo inicia la sonda** hacia el sistema central.
- **IPsec** = **AH y ESP** (no «ESK») + **IKE**; **ESP** da **confidencialidad**; AH solo integridad y autenticación (y choca con NAT); IKEv2 = *Internet Key Exchange* (no «Extended»); ESP = *Encapsulating* (no «Enhanced»); SSTP = *Secure Socket Tunneling Protocol*.
- **PPTP** es el cifrado **más débil** (no el más fuerte); **OpenVPN no es compatible** con IPsec, IKE, PPTP ni L2TP; IPsec trabaja en la capa 3 y OpenVPN sobre TLS (no los tres en la capa 2).
- VPN de **nivel de enlace**: PPTP, **L2F** y L2TP (no existe «P2TP»); hoy se recomienda **MACsec** (**IEEE 802.1AE**, no 802.1AP, AF ni AZ).
- **RFC 2637 = PPTP**; RFC 2661 = L2TP; RFC 1661 = PPP.
- VPN de **transporte** = **TLS**; de red = IPsec y **WireGuard** (túnel de capa 3 implementado como interfaz virtual en el núcleo de Linux); de aplicación = SSH.
- La **confidencialidad** de una VPN la da un **cifrado como AES** (no las funciones *hash* ni la gestión de usuarios).
- Contraseña + código por SMS = **doble factor**; AAA = **autenticación, autorización y contabilización** (*accounting*), no «aislamiento», «seguridad» ni «control».
- En el acceso remoto **no** se dan los mismos privilegios que en local; el canal va cifrado y termina en un cortafuegos, con doble factor y registro.
- **CCN-STIC-836** = VPN; 812 = aplicaciones web; 814 = correo; 816 = inalámbricas; 807 = criptología.
- *Eavesdropping* = escucha **pasiva**; *MAC spoofing* = **suplantar una MAC** (no se hace con `ipconfig`, y Windows sí lo permite); **KRACK** reinstala **la misma** clave y reutiliza *nonces*; WPS admite **PIN, PBC, NFC y USB**; un **portal cautivo** gestiona el acceso de los usuarios a una red, normalmente inalámbrica.
- **WPA3-Enterprise** necesita **RADIUS** o una solución con **EAP-TLS**, no una contraseña de 64, 128 o 192 bits.
- ***Vishing*** = llamadas; *smishing* = SMS; ***pharming*** = manipular el DNS o el fichero *hosts*; *phishing* = correo; *keylogger* = registra pulsaciones.
- ***Clickjacking*** = secuestrar los clics hacia otro sitio (no es ejecución de órdenes, recorrido de directorios ni DoS); **Fraggle** = eco **UDP** a difusión (*Smurf* es con ICMP).
- macOS: **FileVault** cifra el disco; **Gatekeeper** controla qué aplicaciones se ejecutan. Para restaurar un equipo cifrado con BitLocker hace falta la **clave de recuperación de BitLocker**.
- **Proxy transparente** = combinado con NAT, **sin configurar el navegador**; **Squid** es el proxy HTTP (WSUS son actualizaciones, Cacti gráficas de red, Xalan un procesador XSLT).
- Mínimo privilegio (ENS) = **solo los permisos estrictamente necesarios** para las funciones de cada usuario.

## Repaso rápido

- Líneas de defensa (art. 9 ENS), mínimo privilegio (art. 20), segmentación [mp.com.4] (usuarios, servicios, administración; Wi‑Fi aparte), perímetro seguro [mp.com.1] (todo el tráfico lo atraviesa y todo flujo se autoriza).
- Ataques por capas: MAC flooding, ARP spoofing, DHCP spoofing, VLAN hopping, IP spoofing, Smurf (ICMP) y Fraggle (UDP), SYN flood, escaneo, DNS spoofing, *pharming*, amplificación, DDoS; contramedidas: port security, DAI, DHCP snooping, BCP 38/`rp_filter`, SYN cookies, DNSSEC.
- Wi‑Fi: escucha, punto de acceso no autorizado, gemelo malvado, desautenticación, KRACK, WPS; WPA3, 802.1X/EAP-TLS, WIPS, portal cautivo para invitados.
- Cortafuegos: sin estado, con estado, pasarela de aplicación, DPI, **NGFW**, UTM, **WAF**, de *host*; denegar por defecto, primera coincidencia, regla implícita final.
- Arquitecturas: *router* de filtrado, *dual-homed host*, *screened host* con bastión, **subred protegida (DMZ)**, tres patas, dos cortafuegos de fabricantes distintos; concentrador VPN en DMZ dedicada.
- IDS/IPS (NIST SP 800-94): NIDS (Snort, **Suricata**), WIDS, **NBA**, HIDS (**OSSEC**, Wazuh); firmas frente a anomalías; falsos positivos y negativos; [op.mon.1].
- *Honeypot*, *DNS sinkhole*, SIEM, SOAR, SOC, NDR, XDR; CCN-CERT: SAT INET, SAT SARA, SAT ICS, **EMMA**, **CARMEN**, GLORIA, MÓNICA, ELSA, CLAUDIA.
- Órdenes: `iptables -A/-I/-D/-F/-P`, `nft`, `firewall-cmd --zone --list-services --add-service --add-rich-rule --permanent --reload`, `ufw`, `netsh advfirewall set allprofiles state on`, `netsh advfirewall firewall add rule … action=allow`, `New-NetFirewallRule`.
- Acceso remoto (ENS [op.acc.6.r9]): autorizado, cifrado, desactivado si no se usa, registrado; doble factor desde zonas no controladas (R8); mínimo privilegio; sin túnel dividido.
- AAA: autenticación, autorización, contabilización; RADIUS (UDP 1812/1813), TACACS+ (TCP 49), Diameter; 802.1X (solicitante, autenticador, servidor) con EAP-TLS; NAC.
- Confianza cero (NIST SP 800-207), ZTNA frente a VPN, SASE = SD-WAN + SSE (ZTNA, SWG, CASB, FWaaS).
- VPN: túnel cifrado sobre red insegura; de sitio a sitio, de acceso remoto y de equipo a equipo; niveles: aplicación (SSH), transporte (**TLS**), red (**IPsec**, **WireGuard**), enlace (**MACsec**; no PPTP, L2F, L2TP).
- IPsec: **AH** (51, sin cifrado) y **ESP** (50, con cifrado); modos **transporte** y **túnel**; SA unidireccionales con SPI; **IKEv2** (RFC 7296) con IKE_SA_INIT, IKE_AUTH, CREATE_CHILD_SA e INFORMATIONAL; UDP 500 y 4500 (NAT-T); PFS.
- PPTP (RFC 2637, TCP 1723 + GRE, débil), L2TP (RFC 2661, UDP 1701, sin cifrado → L2TP/IPsec), SSTP (TCP 443), OpenVPN (UDP 1194), WireGuard (Linux 5.6, ChaCha20-Poly1305, Curve25519).
- Puesto: bastionado (CCN-STIC-599AB25), parches, sin privilegios de administrador (LAPS), antimalware y EDR ([op.exp.6]), lista blanca (AppLocker, App Control), cortafuegos personal, cifrado (BitLocker, FileVault, LUKS), bloqueo ([mp.eq.2]), portátiles ([mp.eq.3]), USB, navegador y correo, concienciación.
- Amenazas al usuario: *phishing*, *spear phishing*, *whaling*, *smishing*, ***vishing***, *quishing*, ***pharming***, *clickjacking*, *ransomware*, USB maliciosos.

## Fuentes

- Real Decreto 311/2022, Esquema Nacional de Seguridad (texto consolidado): https://www.boe.es/eli/es/rd/2022/05/03/311/con
- CCN-STIC-836, *Seguridad en redes privadas virtuales (VPN)* (2022): https://www.ccn-cert.cni.es/es/pdf/guias/series-ccn-stic/800-guia-esquema-nacional-de-seguridad/2299-ccn-stic-836-seguridad-en-vpn-en-el-marco-del-ens/file.html
- CCN-CERT, Soluciones de ciberseguridad (EMMA, CARMEN, CLAUDIA, GLORIA, MÓNICA, ELSA…): https://www.ccn-cert.cni.es/es/soluciones-seguridad.html
- CCN-CERT, Sistema de Alerta Temprana SAT INET: https://www.ccn-cert.cni.es/es/gestion-de-incidentes/sistema-de-alerta-temprana-sat/sat-inet.html
- CCN-CERT BP/18, *Recomendaciones de seguridad para situaciones de teletrabajo y refuerzo en vigilancia*: https://angeles.ccn-cert.cni.es/es/recursos-formativos/37-bp-18-recomendaciones-de-seguridad-para-situaciones-de-teletrabajo-y-refuerzo-en-vigilancia
- NIST SP 800-41 Rev. 1, *Guidelines on Firewalls and Firewall Policy*: https://csrc.nist.gov/pubs/sp/800/41/r1/final
- NIST SP 800-94, *Guide to Intrusion Detection and Prevention Systems*: https://csrc.nist.gov/pubs/sp/800/94/final
- NIST SP 800-207, *Zero Trust Architecture*: https://csrc.nist.gov/pubs/sp/800/207/final
- NIST SP 800-77 Rev. 1, *Guide to IPsec VPNs*: https://csrc.nist.gov/pubs/sp/800/77/r1/final
- RFC 4301, *Security Architecture for the Internet Protocol*: https://www.rfc-editor.org/rfc/rfc4301
- RFC 4303, *IP Encapsulating Security Payload (ESP)*: https://www.rfc-editor.org/rfc/rfc4303
- RFC 7296, *Internet Key Exchange Protocol Version 2 (IKEv2)*: https://www.rfc-editor.org/rfc/rfc7296
- RFC 2637, *Point-to-Point Tunneling Protocol (PPTP)*: https://www.rfc-editor.org/rfc/rfc2637
- RFC 2661, *Layer Two Tunneling Protocol (L2TP)*: https://www.rfc-editor.org/rfc/rfc2661
- RFC 2827 (BCP 38), *Network Ingress Filtering*: https://www.rfc-editor.org/rfc/rfc2827
- RFC 2865, RADIUS: https://www.rfc-editor.org/rfc/rfc2865
- RFC 8907, TACACS+: https://www.rfc-editor.org/rfc/rfc8907
- WireGuard, *Next Generation Kernel Network Tunnel*: https://www.wireguard.com/papers/wireguard.pdf
- IEEE 802.1AE, *MAC Security (MACsec)*: https://standards.ieee.org/ieee/802.1AE/7103/
- firewalld, documentación: https://firewalld.org/documentation/
- Microsoft, contextos de `netsh`: https://learn.microsoft.com/en-us/windows-server/networking/technologies/netsh/netsh-contexts
- Microsoft, requisitos para usar AppLocker: https://learn.microsoft.com/en-us/windows/security/application-security/application-control/app-control-for-business/applocker/requirements-to-use-applocker
- Ley Orgánica 3/2018 (LOPDGDD): https://www.boe.es/buscar/act.php?id=BOE-A-2018-16673
