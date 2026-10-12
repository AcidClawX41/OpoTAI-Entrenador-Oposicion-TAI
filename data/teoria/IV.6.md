# IV.6 · Comunicaciones: medios de transmisión, equipos, redes de conmutación y difusión, comunicaciones móviles e inalámbricas

Este tema da la base física y conceptual de las redes: qué es un **sistema de comunicación** y qué limita su capacidad, los **medios de transmisión** guiados (par trenzado, coaxial, fibra) y no guiados (radio, microondas, satélite), los **modos de comunicación** (símplex, dúplex, síncrono, multipunto), los **equipos terminales y de interconexión y conmutación** (módems, conmutadores, *routers*, pasarelas, centralitas), los tipos de **redes de comunicaciones** y la diferencia entre **redes de conmutación y de difusión**, y las **comunicaciones móviles e inalámbricas** (del GSM al 5G, Wi‑Fi de 802.11b a Wi‑Fi 7, Bluetooth, LPWAN). En el examen caen sobre todo los estándares Wi‑Fi y su seguridad, Bluetooth, categorías de cable, perturbaciones de la señal, equipos por nivel OSI y conceptos de conmutación.

## Comunicaciones: conceptos básicos

### Sistema de comunicación

Todo sistema de comunicación tiene una **fuente** de información, un **transmisor** que adapta la señal al medio, un **canal o medio de transmisión**, un **receptor** y un **destino**; en el canal se añaden **ruido** e interferencias. La información viaja como **señal** analógica (continua) o digital (valores discretos), caracterizada por su **amplitud**, **frecuencia** (Hz), **fase** y **longitud de onda**.

| Magnitud | Unidad | Significado |
|---|---|---|
| **Ancho de banda** | Hz | Rango de frecuencias que deja pasar el medio o que ocupa la señal |
| **Velocidad de transmisión** | bit/s | Bits enviados por segundo |
| **Velocidad de modulación** | baudios | Cambios de símbolo por segundo; bit/s = baudios × bits por símbolo |
| Relación señal/ruido (S/N) | dB | 10 · log₁₀(S/N) |
| Tasa de error (BER) | — | Bits erróneos / bits transmitidos |

### Límites de capacidad

- **Nyquist** (canal sin ruido): C = 2 · B · log₂ M, donde M es el número de niveles de la señal.
- **Shannon** (canal con ruido): C = B · log₂ (1 + S/N), con S/N en proporción (no en dB).

```text
Ejemplo Nyquist: B = 3 000 Hz, M = 16 niveles → C = 2 × 3 000 × 4 = 24 000 bit/s
Ejemplo Shannon: canal telefónico B = 3 100 Hz, S/N = 30 dB → S/N = 10^(30/10) = 1 000
                 C = 3 100 × log2(1 001) ≈ 3 100 × 9,97 ≈ 30 900 bit/s ≈ 31 kbit/s
```

Por eso un módem telefónico analógico no podía superar unos 33,6 kbit/s en ambos sentidos (los 56 kbit/s de V.90/V.92 aprovechan que un extremo es digital).

### Perturbaciones de la señal

| Perturbación | Qué es | Remedio |
|---|---|---|
| **Atenuación** | **Pérdida de energía** de la señal a medida que se propaga; crece con la distancia y la frecuencia | Amplificadores y repetidores; respetar longitudes máximas |
| **Distorsión de retardo** | Las distintas frecuencias llegan en tiempos diferentes y la señal se deforma | Ecualización |
| **Ruido térmico** | Agitación de los electrones; presente siempre | Mejorar S/N |
| Ruido impulsivo e interferencias | Picos producidos por motores, descargas, otros emisores | Apantallamiento, filtrado, códigos correctores |
| **Diafonía** (*crosstalk*) | **La señal de un par induce corrientes en los pares vecinos** (NEXT en el extremo cercano, FEXT en el lejano) | Trenzado, apantallamiento, categorías superiores |
| Desajuste de impedancia | Reflexiones (pérdida de retorno) en conectores o tramos mal adaptados | Componentes de la misma categoría bien instalados |
| *Jitter* | Variación del retardo entre paquetes o de la temporización | Búferes, QoS |
| Eco | Reflexión de la señal hacia el emisor | Canceladores de eco |

### Modulación, digitalización y codificación

- **Modulación analógica**: AM, FM y PM. **Digital**: ASK, FSK, PSK y **QAM** (amplitud y fase a la vez: 64, 256, 1024 o 4096-QAM en Wi‑Fi 7); **OFDM** reparte los datos en muchas subportadoras ortogonales (Wi‑Fi, 4G, 5G, DSL, TDT).
- **PCM** (digitalización de la voz): muestreo (teorema de Nyquist: frecuencia de muestreo ≥ 2 × frecuencia máxima), cuantificación y codificación. Voz telefónica: 8 000 muestras/s × 8 bits = **64 kbit/s** (G.711).
- **Codificación de línea**: NRZ, **Manchester** (Ethernet de 10 Mbit/s), 4B/5B, 8B/10B, 64B/66B, PAM-5 (Gigabit Ethernet sobre cobre).

### Multiplexación

| Técnica | Cómo comparte el medio | Ejemplos |
|---|---|---|
| **FDM** | Cada canal en una banda de frecuencias | Radio FM, 1G |
| **TDM** | Cada canal en intervalos de tiempo (síncrona o estadística) | E1 de 2,048 Mbit/s con 32 intervalos, GSM |
| **WDM** (CWDM, DWDM) | Cada canal en una longitud de onda distinta de la fibra | Redes troncales ópticas |
| **CDMA** | Todos transmiten a la vez en **la misma banda**; cada señal se multiplica por un **código o secuencia de bits (*chips*)** distinto que permite separarla | 3G (W-CDMA), GPS |
| **OFDMA** | Subportadoras repartidas entre usuarios | 4G, 5G, Wi‑Fi 6 y 7 |
| SDM / MIMO | Varios flujos espaciales con varias antenas | Wi‑Fi 4 en adelante, 4G y 5G |

## Medios de transmisión

### Medios guiados

**Par trenzado**: pares de cobre trenzados para reducir la diafonía y las interferencias. Tipos según el apantallamiento (nomenclatura de ISO/IEC 11801: pantalla global / pantalla por par):

| Tipo | Apantallamiento |
|---|---|
| **UTP** (U/UTP) | **Ninguno** |
| **FTP** (F/UTP) | Lámina global alrededor de todos los pares |
| **STP** (U/FTP o S/FTP) | Pantalla en cada par (y en S/FTP, además, malla global) |

| Categoría (TIA-568) | Clase ISO | Frecuencia | Uso típico |
|---|---|---|---|
| Cat 5e | D | 100 MHz | 1000BASE-T (1 Gbit/s) a 100 m |
| Cat 6 | E | 250 MHz | 1 Gbit/s; 10GBASE-T solo hasta unos 55 m |
| **Cat 6A** | EA | 500 MHz | **10GBASE-T (10 Gbit/s) a 100 m**; mínimo recomendado para puntos de acceso Wi‑Fi actuales |
| Cat 7 / 7A | F / FA | 600 / 1 000 MHz | Solo ISO (no TIA), siempre apantallados |
| **Cat 8** | 8.1 / 8.2 | 2 000 MHz | **25GBASE-T y 40GBASE-T** hasta **30 m** (centros de datos) |

Conector **RJ45** (8P8C) con esquemas de cableado T568A o T568B. **PoE** alimenta dispositivos por el mismo cable: 802.3af (15,4 W), 802.3at o PoE+ (30 W) y 802.3bt (hasta 90 W).

**Cable coaxial**: conductor central, dieléctrico, malla y cubierta; buena inmunidad al ruido. Hoy se usa en televisión, CCTV analógico y redes de cable HFC (DOCSIS 3.1 y 4.0); las Ethernet coaxiales (10BASE5 y 10BASE2) son historia.

**Fibra óptica**: transmite **luz** por un **núcleo** de vidrio rodeado de un **revestimiento** de índice de refracción menor (reflexión total interna).

| | Multimodo (OM1 a OM5) | Monomodo (OS1, OS2) |
|---|---|---|
| Núcleo | 50 o 62,5 µm | ~9 µm |
| Fuente de luz | LED o VCSEL; 850 nm | Láser; 1 310 y 1 550 nm |
| Distancias | Cortas (cientos de metros) | Largas (decenas o cientos de km) |
| Limitación | Dispersión modal | Dispersión cromática |
| Uso | Dentro de edificios y CPD | Campus, metropolitanas, operadores, FTTH |

Ventajas de la fibra: enorme ancho de banda, baja atenuación, **inmunidad a interferencias electromagnéticas**, difícil de interceptar, ligera; inconvenientes: coste de terminación, fragilidad, empalmes por fusión. Conectores LC, SC, ST y MPO/MTP. La **fibra óptica plástica (POF)**, de **polimetilmetacrilato** recubierto de polímeros fluorados, tiene un **núcleo mucho mayor** (en torno a 1 mm) que la de vidrio, es muy flexible y fácil de instalar en tubos antiguos, pero atenúa más y solo sirve para distancias cortas (hogar, automoción).

### Medios no guiados

| Medio | Características | Usos |
|---|---|---|
| **Radio** | Omnidireccional, atraviesa obstáculos | Wi‑Fi, telefonía móvil, radiodifusión, TETRA |
| **Microondas terrestres** | Muy direccionales, necesitan visión directa | Radioenlaces punto a punto |
| **Satélite** | GEO a 35 786 km (unos 250 ms solo de ida), MEO (navegación: GPS, Galileo), **LEO** (constelaciones de baja latencia como Starlink u OneWeb) | Zonas aisladas, respaldo, emergencias |
| Infrarrojos | Corto alcance, visión directa | Mandos, IrDA |
| Luz visible (Li-Fi) | IEEE 802.11bb (2023) | Entornos sin radiofrecuencia |

La **atenuación en el aire crece con la frecuencia**: a igual potencia, **5 GHz alcanza menos que 2,4 GHz** (y 6 GHz menos aún), aunque ofrece más canales y menos interferencias. El espectro es un bien público: lo reparte internacionalmente el Reglamento de Radiocomunicaciones de la **UIT** y en España el **Cuadro Nacional de Atribución de Frecuencias** (CNAF); las bandas ISM de 2,4 y 5 GHz y la de 6 GHz (5 945 a 6 425 MHz en la UE) son de uso común sin licencia.

## Modos de comunicación

| Criterio | Modos |
|---|---|
| **Sentido** | **Símplex** (un solo sentido: radiodifusión), **semidúplex** (*half-duplex*: ambos sentidos alternativamente: *walkie-talkie*, Wi‑Fi, hubs) y **dúplex** (*full-duplex*: ambos a la vez: teléfono, Ethernet conmutada) |
| Sincronización | **Asíncrona** (cada carácter con bits de inicio y parada) o **síncrona** (bloques con reloj común o recuperado) |
| Nº de bits a la vez | Serie (uno tras otro) o paralelo (varios hilos) |
| Destinatarios | ***Unicast*** (uno), ***multicast*** (grupo), ***broadcast*** (todos), ***anycast*** (el más cercano de un grupo) |
| Conexión | Orientada a conexión (se establece antes: TCP, circuitos virtuales) o sin conexión (UDP, IP) |
| Configuración | Punto a punto o multipunto |
| Señal | **Banda base** (la señal digital directamente sobre el medio: Ethernet) o **banda ancha** (moduladas sobre portadoras: cable, DSL) |

## Equipos terminales y equipos de interconexión y conmutación

### Equipos terminales

En la terminología clásica se distingue el **ETD** (equipo terminal de datos, *DTE*: ordenador, terminal, impresora) del **ETCD** (equipo de terminación del circuito de datos, *DCE*: **módem**, unidad de servicio de datos, ONT de fibra), que adapta la señal a la red. Módems actuales: ADSL y VDSL, cable (DOCSIS), **ONT** de FTTH, *routers* 4G/5G. Terminales de voz: teléfonos analógicos, digitales e IP, softphones, terminales TETRA.

### Equipos de interconexión por nivel OSI

| Nivel | Equipo | Qué hace |
|---|---|---|
| 1 Físico | **Repetidor**, **concentrador** (*hub*), conversor de medios | Regenera y propaga bits; el *hub* repite por todos los puertos (un único dominio de colisión) |
| 2 Enlace | **Puente** (*bridge*), **conmutador** (*switch*), punto de acceso | Reenvía tramas según la **dirección MAC** (tabla de direcciones); cada puerto es un dominio de colisión; VLAN |
| 3 Red | ***Router*** (encaminador), conmutador de capa 3 | Encamina **paquetes IP** entre redes según su tabla de rutas; **separa dominios de difusión** |
| 4 a 7 | Cortafuegos, balanceadores, *proxies* | Filtran o distribuyen según puertos y contenido |
| Varios (hasta 7) | **Pasarela** (*gateway*) | **Interconecta redes de arquitecturas o protocolos distintos traduciendo entre ellos** (por ejemplo, un CCTV sobre coaxial con la red Ethernet, voz analógica con VoIP) |

| Equipo | Dominio de colisión | Dominio de difusión |
|---|---|---|
| *Hub* | Uno para todos los puertos | Uno |
| *Switch* | Uno por puerto | Uno (por VLAN) |
| *Router* | Uno por interfaz | **Uno por interfaz** |

![Un router con dos interfaces: en una, un hub con tres PC forma un único dominio de colisión, enlace con el router incluido; en la otra, un switch con cuatro PC tiene un dominio de colisión por puerto, cuatro para los PC y uno para el enlace con el router. En total hay seis dominios de colisión y dos de difusión, uno por interfaz del router](diagramas/IV.6-dominios.svg)

*Figura: el hub no separa nada, el switch separa dominios de colisión y el router, además, dominios de difusión.*

Métodos de conmutación de los *switches*: **almacenamiento y reenvío** (recibe la trama entera y comprueba el CRC), **corte** (*cut-through*, reenvía tras leer la MAC de destino) y **libre de fragmentos** (lee los primeros 64 bytes).

### Conmutación de voz

- **Centralitas** (PBX, PABX) e **IP-PBX** (Asterisk, centralitas en la nube); *softswitches* y controladores de frontera de sesión (SBC) para conectar con los operadores.
- **SIP** (RFC 3261; puertos 5060 y 5061 con TLS) para la señalización; **RTP/RTCP** (RFC 3550) para el audio y el vídeo; códecs G.711 (64 kbit/s), G.729 (8 kbit/s), Opus.
- **H.323** (UIT‑T) es el marco de **sistemas de comunicación multimedia basados en paquetes**; dentro de él, **H.225.0** hace la señalización de llamada y la paquetización de los medios, y **H.245** es el **protocolo de control para comunicación multimedia** (intercambio de capacidades y apertura de canales lógicos). H.248/Megaco y MGCP controlan pasarelas de medios.

## Redes de comunicaciones

### Clasificación

| Criterio | Tipos |
|---|---|
| Alcance | **PAN** (personal: Bluetooth), **LAN** (local: edificio), CAN (campus), **MAN** (metropolitana), **WAN** (amplia: países), Internet |
| Técnica de transmisión | **Conmutación** (punto a punto a través de nodos) o **difusión** (medio compartido) |
| Titularidad | Públicas (operadores) o privadas (corporativas) |
| Topología | Bus, anillo, estrella, malla, árbol (tema IV.10) |
| Medio | Cableadas o inalámbricas |

### Redes de operadores y de transporte

| Red | Características |
|---|---|
| RTC (red telefónica conmutada) | Conmutación de circuitos analógica y luego digital |
| **RDSI** (ISDN) | Digital de extremo a extremo: acceso básico **2B+D** (2 × 64 + 16 kbit/s) y primario 30B+D sobre E1 |
| X.25 | Conmutación de paquetes con circuitos virtuales y control de errores en cada salto |
| Frame Relay | Circuitos virtuales (DLCI) sin corrección de errores en los nodos; caudal comprometido (CIR) |
| **ATM** | Celdas fijas de **53 bytes** (5 de cabecera y 48 de datos); circuitos virtuales (VPI/VCI) con calidad de servicio |
| PDH y **SDH** | Jerarquías de multiplexación: E1 = 2,048 Mbit/s; STM-1 = 155,52 Mbit/s, STM-4, STM-16, STM-64 |
| **MPLS** | Reenvío por **etiquetas** en el núcleo del operador; VPN de nivel 3 (L3VPN) y de nivel 2 |
| **VPLS** | VPN de nivel 2 multipunto sobre MPLS que **une redes Ethernet dispersas geográficamente haciendo que compartan un mismo dominio de difusión** |
| Metro Ethernet | Servicios E-Line (punto a punto), E-LAN (multipunto) y E-Tree |
| **SD-WAN** | Red WAN definida por *software* que combina MPLS, Internet y 4G/5G con control centralizado |
| DWDM y fibra oscura | Capacidad masiva en troncales |

**Redes de acceso**: xDSL sobre el par de cobre (ADSL2+, VDSL2), HFC con DOCSIS, **FTTH** con redes ópticas pasivas (**GPON**, ITU‑T G.984: 2,5 Gbit/s de bajada y 1,25 de subida; **XGS-PON**: 10/10 Gbit/s; 50G-PON), acceso fijo inalámbrico 4G/5G y satélite. En la Administración, la **Red SARA** interconecta las redes de las Administraciones Públicas españolas y enlaza con la red transeuropea de la UE.

## Redes de conmutación y redes de difusión

### Redes de conmutación

Los datos atraviesan **nodos intermedios** que deciden por dónde reenviarlos.

| | **Conmutación de circuitos** | Conmutación de mensajes | **Conmutación de paquetes** |
|---|---|---|---|
| Camino | **Dedicado y exclusivo** (físico o lógico) durante toda la comunicación | Mensaje completo de nodo en nodo | Datos troceados en paquetes |
| Fases | Establecimiento, transferencia y liberación | Almacenamiento y reenvío | Almacenamiento y reenvío de cada paquete |
| Recursos | Reservados aunque no se transmita | Compartidos | **Compartidos**: mejor aprovechamiento |
| Retardo | Constante tras el establecimiento | Muy alto | Variable (colas) |
| Ejemplos | Telefonía clásica, RDSI | Telegrafía, histórico | X.25, Frame Relay, ATM, IP |

La conmutación de paquetes tiene dos variantes: **datagramas** (cada paquete se encamina por separado y puede seguir una **ruta distinta** y llegar desordenado: IP) y **circuitos virtuales** (se establece una ruta y todos los paquetes la siguen: X.25, Frame Relay, ATM, MPLS).

**Ejercicio resuelto.** Un mensaje de 1 Mbit atraviesa tres enlaces de 1 Mbit/s (dos nodos intermedios), sin contar la propagación:

```text
Conmutación de mensajes: cada nodo recibe el mensaje entero antes de reenviarlo
   3 enlaces × (1 000 000 bit / 1 000 000 bit/s) = 3 s
Conmutación de paquetes: 1 000 paquetes de 1 000 bits que avanzan en paralelo por los enlaces
   tiempo = (nº de paquetes + nº de enlaces − 1) × tiempo por paquete = (1 000 + 3 − 1) × 1 ms ≈ 1,002 s
Conmutación de circuitos: tiempo de establecimiento + 1 s de transmisión
```

### Redes de difusión

Todas las estaciones comparten **un único medio**: lo que una transmite lo reciben todas, y la **dirección de destino** indica a quién va dirigido; por eso necesitan un **control de acceso al medio** (CSMA/CD en la Ethernet clásica, CSMA/CA en Wi‑Fi, paso de testigo, tema IV.10). Ejemplos: Ethernet con *hub* o bus, **Wi‑Fi**, redes por **satélite**, radiodifusión de radio y televisión (TDT), redes de cable. Las WAN suelen ser de conmutación y las LAN tradicionales, de difusión.

## Comunicaciones móviles e inalámbricas

### Telefonía móvil celular

El territorio se divide en **células**, cada una servida por una estación base; las frecuencias se **reutilizan** en células no adyacentes, el terminal cambia de célula sin cortar (**traspaso** o *handover*) y puede usar redes de otros operadores (**itinerancia**).

| Generación | Tecnologías | Acceso al medio | Características |
|---|---|---|---|
| 1G (años 80) | NMT, TACS (en España, MoviLine) | FDMA | Analógica, solo voz |
| **2G** (1991) | **GSM** (900 y 1 800 MHz); GPRS (2,5G) y EDGE (2,75G) | **TDMA + FDMA** | Digital, SMS, tarjeta SIM; datos por paquetes con GPRS |
| **3G** (2001) | **UMTS** (W-CDMA), HSPA | **CDMA** | Datos móviles de banda ancha |
| **4G** (2009) | **LTE**, LTE-Advanced | **OFDMA** (bajada) y SC-FDMA (subida) | Todo IP, voz sobre LTE (VoLTE) |
| **5G** (2019) | **5G NR** (3GPP Release 15, IMT-2020); 5G-Advanced (Release 18, 2024) | OFDMA | Tres escenarios: **eMBB** (banda ancha mejorada), **URLLC** (baja latencia y alta fiabilidad) y **mMTC** (IoT masivo); bandas de 700 MHz, **3,5 GHz** y 26 GHz; núcleo independiente (SA) frente a no autónomo (NSA); *network slicing* y computación en el borde |
| 6G | IMT-2030 | — | En estudio en 3GPP; se espera hacia 2030 |

Las especificaciones las elabora el **3GPP** (GSM, UMTS, LTE, 5G) y los requisitos de cada generación los fija la **UIT** (IMT-2000, IMT-Advanced, IMT-2020). Para las emergencias se usan redes de **radio móvil profesional** como **TETRA** (ETSI); en España, el **SIRDEE** de las Fuerzas y Cuerpos de Seguridad del Estado, con evolución hacia servicios de misión crítica sobre LTE y 5G.

### Redes de área local inalámbricas (IEEE 802.11)

La norma **IEEE 802.11** se refiere a las **redes inalámbricas de área local** (WLAN); la marca Wi‑Fi y sus certificaciones son de la Wi‑Fi Alliance.

| Norma | Nombre comercial | Año | Bandas | Velocidad máxima teórica | Novedades |
|---|---|---|---|---|---|
| 802.11b | — | 1999 | 2,4 GHz | 11 Mbit/s | DSSS |
| 802.11a | — | 1999 | 5 GHz | 54 Mbit/s | OFDM |
| 802.11g | — | 2003 | 2,4 GHz | 54 Mbit/s | OFDM en 2,4 GHz |
| 802.11n | **Wi‑Fi 4** | 2009 | 2,4 y 5 GHz | 600 Mbit/s | **MIMO**, canales de 40 MHz |
| 802.11ac | **Wi‑Fi 5** | 2013 | 5 GHz | ~6,9 Gbit/s | Canales de 160 MHz, 256-QAM, MU-MIMO de bajada |
| **802.11ax** | **Wi‑Fi 6** y **6E** | 2019-2021 | 2,4 y 5 GHz (6E añade **6 GHz**) | ~9,6 Gbit/s | **OFDMA**, 1024-QAM, MU-MIMO en ambos sentidos, TWT (ahorro de batería), coloreado de BSS |
| **802.11be** | **Wi‑Fi 7** | Certificación en 2024; norma aprobada en 2024 y publicada en 2025 | **2,4, 5 y 6 GHz** | ~46 Gbit/s | Canales de **320 MHz**, **4096-QAM**, **MLO** (operación multienlace simultánea en varias bandas) |
| 802.11bn | Wi‑Fi 8 | En desarrollo | — | — | Ultra alta fiabilidad |

Otras: 802.11ad/ay (60 GHz), 802.11ah (HaLow, IoT por debajo de 1 GHz), 802.11p (vehículos), 802.11bb (luz), 802.11e (QoS), 802.11i (seguridad), 802.11r/k/v (itinerancia rápida), 802.11s (malla), 802.11w (protección de tramas de gestión).

**Arquitectura**: modo **infraestructura** (estaciones asociadas a un **punto de acceso**: BSS; varios puntos de acceso con el mismo SSID conectados por un sistema de distribución forman un ESS) y modo ***ad hoc*** (IBSS, sin punto de acceso). El **SSID** es el nombre de la red y el **BSSID**, la MAC del punto de acceso. En 2,4 GHz los canales **1, 6 y 11** no se solapan; la banda la comparten también Bluetooth, hornos de microondas y otros dispositivos, lo que produce **interferencias**.

| Seguridad | Cifrado | Situación |
|---|---|---|
| **WEP** (1997) | RC4 con claves de 40 o 104 bits | **Roto**: se rompe en minutos |
| WPA (2003) | TKIP | Transitorio, obsoleto |
| **WPA2** (802.11i, 2004) | **AES-CCMP**; modos Personal (PSK) y Empresa (802.1X) | Vulnerable a diccionario fuera de línea en PSK y al ataque **KRACK** (2017) sobre el saludo de cuatro vías |
| **WPA3** (2018) | **SAE** (sustituye a la clave compartida; resistente a diccionario fuera de línea y con secreto hacia adelante); modo Empresa de 192 bits; **OWE** para redes abiertas; tramas de gestión protegidas obligatorias | **Recomendado**; obligatorio en 6 GHz |

**WPS** (*Wi‑Fi Protected Setup*) facilita la conexión de dispositivos con cuatro métodos: **PIN**, **PBC** (pulsar un botón), **NFC** y **USB** (este último en desuso); el método PIN es vulnerable a fuerza bruta, por lo que se recomienda desactivar WPS.

### Redes de área personal e IoT

**Bluetooth** (Bluetooth SIG; originalmente IEEE 802.15.1) trabaja en la banda ISM de **2,4 GHz**:

- **Clásico** (BR/EDR): 79 canales de 1 MHz con **salto de frecuencia** (FHSS); una **piconet** tiene un maestro y hasta 7 esclavos activos, y una ***scatternet*** es un **grupo de piconets** interconectadas (un dispositivo participa en varias).
- **Bluetooth Low Energy** (desde la versión 4.0, 2010): **40 canales de 2 MHz**, **3 de anuncio principales** (37, 38 y 39) y 37 de datos. La versión **5.0** (2016) añadió el modo de 2 Mbit/s, el **largo alcance** (PHY codificado) y la **publicidad extendida** (*extended advertising*), que anuncia en los canales principales y traslada los datos a canales secundarios, de modo que **usa los 40 canales**. La 5.2 trajo LE Audio y Auracast; la **6.0** (2024), la medición de distancia precisa (*Channel Sounding*), y desde 2025 hay versiones semestrales (6.1, 6.2).
- Clases de potencia: clase 1 (~100 m), clase 2 (~10 m), clase 3 (~1 m).

| Tecnología | Alcance | Características |
|---|---|---|
| **Zigbee** | Decenas de metros, en malla | IEEE 802.15.4; 250 kbit/s en 2,4 GHz; domótica |
| Thread y Matter | Ídem | 802.15.4 con IPv6; Matter (2022) unifica la domótica |
| **NFC** | ~4 cm | 13,56 MHz; pagos, DNI electrónico, emparejamiento |
| RFID | cm a metros | Etiquetas pasivas para inventario |
| UWB | Metros | Localización precisa (IEEE 802.15.4z) |

**LPWAN** (*Low-Power Wide-Area Network*): redes de **largo alcance (kilómetros) y muy bajo consumo** para sensores IoT con poco tráfico: **LoRaWAN** y **Sigfox** (bandas libres de 868 MHz en Europa) y **NB-IoT** y **LTE-M** (estándares 3GPP en bandas con licencia). **Bluetooth LE no es LPWAN**: es de corto alcance.

## Normativa y estándares clave

| Organismo o norma | Qué regula | Puntos clave |
|---|---|---|
| **UIT** (ITU) | Agencia de la **ONU especializada en telecomunicaciones** (desde 1865) | UIT‑T (normalización), UIT‑R (espectro, Reglamento de Radiocomunicaciones, IMT) y UIT‑D (desarrollo) |
| **IEEE 802** | Redes LAN, MAN y PAN | 802.3 Ethernet, **802.11 WLAN**, 802.15 WPAN, 802.1 puentes y VLAN |
| **3GPP** y ETSI | Telefonía móvil y estándares europeos | GSM, UMTS, LTE, 5G; TETRA, DECT |
| Wi‑Fi Alliance y Bluetooth SIG | Certificación e interoperabilidad | Wi‑Fi 6/6E/7, WPA3; especificaciones Bluetooth |
| **TIA-568** e **ISO/IEC 11801** (EN 50173) | Cableado estructurado | Categorías 5e, 6, 6A y 8; clases D a FA |
| UIT‑T G.984, G.9807.1 | Redes ópticas pasivas | GPON, XGS-PON |
| UIT‑T H.323, H.225.0 y H.245; IETF SIP | Comunicaciones multimedia y VoIP | Señalización y control |
| **Ley 11/2022**, General de Telecomunicaciones | Marco español | Transpone el Código Europeo de Comunicaciones Electrónicas (Directiva (UE) 2018/1972) |
| CNAF | Atribución de frecuencias en España | Bandas de uso común y con licencia |

## Lo que más cae en el examen

En los nueve exámenes analizados hay **28 preguntas** de este tema: 19 de ingreso libre (4 en 2021, 5 en 2023, 4 en 2024, 2 en 2025 y 4 en el extraordinario de 2026) y 9 de promoción interna.

| Bloque | Preguntas | Exámenes |
|---|---|---|
| **Inalámbricas y móviles**: Wi‑Fi 6 = 802.11ax (×3), WEP frente a WPA2 (×2), 802.11 = WLAN (×2), 802.11be en 2,4, 5 y 6 GHz (×2), métodos WPS, *scatternet*, LPWAN, CDMA, canales de Bluetooth LE (×2) | 15 | LI 2021, 2023, 2024, 2025 y 2025‑ext; PI 2021, 2023, 2024 y 2025 |
| **Equipos y redes**: *router* en el nivel 3, pasarela (×2), UIT, VPLS, H.245, conmutación de circuitos | 7 | LI 2023, 2024, 2025 y 2025‑ext; PI 2024 |
| **Medios y perturbaciones**: Cat 8 para 30 Gbit/s, Cat de 10 Gbit/s (anulada), UTP sin apantallar, POF, diafonía, atenuación | 6 | LI 2021, 2023 y 2024; PI 2023, 2024 y 2025 |

Patrón: correspondencias entre norma y nombre comercial (Wi‑Fi 4/5/6/7), afirmaciones falsas sobre seguridad Wi‑Fi y alcance de las bandas, definiciones literales de normas de la UIT y siglas (LPWAN, VPLS, POF). La pregunta de 2024 sobre la categoría con «tope» de 10 000 Mbit/s se anuló: la Cat 6 ya admite 10 Gbit/s a distancias cortas, la 6A a 100 m y la Cat 8 llega a 40 Gbit/s.

## Trampas habituales

- **Wi‑Fi 4 = 802.11n**, **Wi‑Fi 5 = 802.11ac**, **Wi‑Fi 6/6E = 802.11ax**, **Wi‑Fi 7 = 802.11be** (2,4, 5 y 6 GHz); 802.11ac solo usa 5 GHz.
- **WEP es el menos seguro**; WPA3 mejora WPA2 tras KRACK; **5 GHz tiene menor alcance** que 2,4 GHz; 2,4 GHz interfiere con Bluetooth.
- WPS: **PIN, PBC, NFC y USB**.
- **Scatternet** = grupo de piconets (no una MAN ni una red Wi‑Fi).
- Bluetooth LE: **40 canales** (3 de anuncio + 37 de datos); la publicidad extendida los usa todos.
- **LPWAN**: LoRaWAN, Sigfox, NB-IoT, LTE-M; **no** Bluetooth LE.
- **CDMA** separa por códigos (*chips*) en la misma banda; FDMA por frecuencias; TDMA por tiempo; OFDMA por subportadoras.
- **UTP** no tiene apantallamiento; FTP y STP sí.
- **Cat 8** para 25 y 40 Gbit/s a 30 m; **Cat 6A** para 10 Gbit/s a 100 m.
- **Atenuación** = pérdida de energía; **diafonía** = un par induce señal en otro; *jitter* = variación del retardo.
- POF: núcleo **mayor** que la fibra de vidrio.
- **Router** = nivel 3; *switch* y *bridge* = nivel 2; *hub* y repetidor = nivel 1; **pasarela** = conversión entre redes de protocolos distintos.
- **Conmutación de circuitos** = camino dedicado y exclusivo; compartir el ancho de banda, rutas distintas por paquete o almacenar y reenviar son rasgos de la conmutación de paquetes.
- **VPLS** = LAN Ethernet extendida sobre MPLS con un mismo dominio de difusión (no es MPLS en sí, ni IPsec, ni BGP).
- **H.245** = protocolo de control para comunicación multimedia; H.323 = sistemas multimedia por paquetes; H.225.0 = señalización y paquetización.
- La **UIT** es la agencia de la ONU para las telecomunicaciones (no la ISO, ni el ETSI, ni el IEEE).

## Repaso rápido

- Sistema de comunicación: fuente, transmisor, canal, receptor, destino y ruido.
- Nyquist C = 2B·log₂M; Shannon C = B·log₂(1 + S/N); bit/s = baudios × bits por símbolo.
- Perturbaciones: atenuación, distorsión de retardo, ruido, diafonía (NEXT, FEXT), *jitter*.
- Modulaciones ASK, FSK, PSK, QAM, OFDM; PCM a 64 kbit/s.
- Multiplexación FDM, TDM, WDM, CDMA, OFDMA, MIMO.
- Par trenzado UTP, FTP, STP; categorías 5e, 6, 6A (10G a 100 m), 8 (40G a 30 m); PoE hasta 90 W.
- Fibra multimodo (OM, corta) y monomodo (OS, larga); POF de plástico con núcleo grande.
- Medios no guiados: radio, microondas, satélite GEO/MEO/LEO, infrarrojos, luz.
- Modos: símplex, semidúplex, dúplex; síncrono y asíncrono; *unicast*, *multicast*, *broadcast*, *anycast*.
- ETD y ETCD; equipos por nivel: repetidor y *hub* (1), *bridge* y *switch* (2), *router* (3), pasarela (traducción).
- VoIP: SIP, RTP; H.323 con H.225.0 y H.245.
- Redes: PAN, LAN, MAN, WAN; RDSI 2B+D, ATM con celdas de 53 bytes, SDH STM-1 155,52 Mbit/s, MPLS, VPLS, SD-WAN; GPON y XGS-PON; Red SARA.
- Conmutación de circuitos (dedicada), mensajes y paquetes (datagramas y circuitos virtuales); difusión con medio compartido.
- Móviles: 1G FDMA, 2G GSM TDMA, 3G UMTS CDMA, 4G LTE OFDMA, 5G NR (eMBB, URLLC, mMTC); TETRA y SIRDEE.
- Wi‑Fi: 802.11n/ac/ax/be = Wi‑Fi 4/5/6/7; WEP, WPA, WPA2 (KRACK), WPA3 (SAE); WPS.
- Bluetooth: 2,4 GHz, piconet y *scatternet*; BLE con 40 canales; 5.0 publicidad extendida; 6.0 *Channel Sounding*.
- IoT: Zigbee, Thread, Matter, NFC, RFID, UWB; LPWAN: LoRaWAN, Sigfox, NB-IoT, LTE-M.

## Fuentes

- UIT, acerca de la Unión Internacional de Telecomunicaciones: https://www.itu.int/es/about/Pages/default.aspx
- UIT‑T H.245, *Control protocol for multimedia communication*: https://www.itu.int/rec/T-REC-H.245
- UIT‑T H.323, *Packet-based multimedia communications systems*: https://www.itu.int/rec/T-REC-H.323
- UIT‑T G.984.1 (GPON): https://www.itu.int/rec/T-REC-G.984.1
- IEEE 802.11 Working Group: https://www.ieee802.org/11/
- IEEE 802.3 Ethernet Working Group: https://www.ieee802.org/3/
- Wi‑Fi Alliance, Wi‑Fi 7: https://www.wi-fi.org/discover-wi-fi/wi-fi-certified-7
- Wi‑Fi Alliance, seguridad (WPA3): https://www.wi-fi.org/discover-wi-fi/security
- Bluetooth SIG, especificaciones: https://www.bluetooth.com/specifications/specs/
- 3GPP, 5G: https://www.3gpp.org/technologies/5g-system-overview
- RFC 4761, VPLS con BGP: https://www.rfc-editor.org/rfc/rfc4761
- RFC 3261, SIP: https://www.rfc-editor.org/rfc/rfc3261
- LoRa Alliance, LoRaWAN: https://lora-alliance.org/about-lorawan/
- Ley 11/2022, General de Telecomunicaciones (BOE-A-2022-10757): https://www.boe.es/buscar/act.php?id=BOE-A-2022-10757
- Ministerio para la Transformación Digital, CNAF: https://avancedigital.mineco.gob.es/espectro/Paginas/cnaf.aspx
- PAe, Red SARA: https://administracionelectronica.gob.es/ctt/redsara
