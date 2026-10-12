# IV.10 · Redes locales: tipología, técnicas de transmisión, métodos de acceso y dispositivos de interconexión

La **red de área local** (LAN) es la red de un edificio, una planta o un campus: la que une los puestos, servidores, impresoras, teléfonos IP y puntos de acceso de una oficina. Hoy casi todas las LAN cableadas son **Ethernet conmutada** (IEEE 802.3) y las inalámbricas, **Wi‑Fi** (IEEE 802.11), pero el temario y el examen siguen preguntando por su historia: **topologías** (bus, anillo, estrella, árbol, malla), **técnicas de transmisión** (banda base y banda ancha, codificación, trama Ethernet, velocidades y medios), **métodos de acceso al medio** (ALOHA, CSMA/CD, CSMA/CA, paso de testigo, sondeo, reserva) y **dispositivos de interconexión** (repetidores, concentradores, puentes, conmutadores, *routers* y pasarelas), con sus dominios de colisión y de difusión, **STP** y **VLAN**. Los medios de transmisión y las normas Wi‑Fi se estudian en el tema IV.6, la configuración de conmutadores y VLAN en IV.4 y el direccionamiento IP en IV.7.

## Redes de área local: concepto y modelo de referencia IEEE 802

### Concepto y características

Una **LAN** es una red de comunicaciones de datos que interconecta equipos dentro de un **área geográfica limitada** (una sala, un edificio o un campus), normalmente **de propiedad privada** y gestionada por la propia organización. Sus rasgos clásicos:

- **Alcance reducido** (de metros a pocos kilómetros) y **alta velocidad** (hoy de 1 a 10 Gbit/s en el puesto y de 25 a 400 Gbit/s en los enlaces troncales y centros de datos).
- **Baja tasa de errores** y **retardos pequeños**.
- Medio tradicionalmente **compartido** (red de **difusión**: lo que transmite una estación lo reciben todas), lo que obliga a un **método de acceso al medio**; la Ethernet conmutada actual ha convertido cada enlace en **punto a punto y dúplex**.
- **Topología** sencilla y bien definida, y equipos homogéneos.
- **Compartición de recursos**: ficheros, impresoras, aplicaciones, acceso a Internet, telefonía IP.

Componentes: **tarjetas de red** (NIC, con su dirección MAC), **medio de transmisión** (par trenzado, fibra, radio), **cableado estructurado**, **dispositivos de interconexión** (conmutadores, *routers*, puntos de acceso), **protocolos** (Ethernet, IP) y el *software* de red de los sistemas operativos (servicios de directorio, compartición).

Según la relación entre los equipos, una LAN puede ser **entre iguales** (*peer-to-peer*, grupo de trabajo: cada equipo comparte sus recursos y se administra por separado, para pocos puestos) o **cliente-servidor** (dominio: servidores dedicados y administración centralizada, por ejemplo con Active Directory). Otros nombres: **SOHO** (*Small Office, Home Office*, oficina pequeña u oficina doméstica), **CAN** (red de campus), **WLAN** (LAN inalámbrica), **VLAN** (LAN virtual) y **POLAN** (*Passive Optical LAN*, LAN óptica pasiva: lleva la tecnología **PON**, como GPON, al edificio, con un OLT central, divisores ópticos pasivos y terminales ONT junto a los usuarios, **sin conmutadores intermedios** en las plantas).

### El modelo de referencia IEEE 802

El comité **IEEE 802** (su primera reunión fue en febrero de 1980; el número era simplemente el siguiente libre en la numeración de proyectos del IEEE) normaliza las redes locales y metropolitanas. Su modelo de referencia cubre las **dos capas inferiores de OSI** y divide la **capa de enlace** en dos subcapas:

```text
        OSI                         IEEE 802
 ┌──────────────────┐      ┌──────────────────────────────────────────┐
 │ 3 Red            │      │ (IP y protocolos superiores)              │
 ├──────────────────┤      ├──────────────────────────────────────────┤
 │                  │      │ LLC  Control de enlace lógico (802.2)     │ ← independiente del medio
 │ 2 Enlace         │      ├──────────────────────────────────────────┤
 │                  │      │ MAC  Control de acceso al medio           │ ← 802.3, 802.11… dependiente del medio
 ├──────────────────┤      ├──────────────────────────────────────────┤
 │ 1 Física         │      │ Física (PHY): codificación, señal, medio  │
 └──────────────────┘      └──────────────────────────────────────────┘
```

| Subcapa | Funciones |
|---|---|
| **LLC** (*Logical Link Control*, IEEE 802.2) | Ofrece a la capa de red una interfaz **independiente del medio físico y del método de acceso**: **multiplexación** de protocolos superiores mediante puntos de acceso al servicio (DSAP y SSAP), **control de flujo** y de errores y secuenciación de tramas en los servicios que lo usan. Tres tipos de servicio: **sin conexión y sin confirmación** (tipo 1, el habitual), **orientado a conexión** (tipo 2) y **sin conexión con confirmación** (tipo 3) |
| **MAC** (*Medium Access Control*) | **Dependiente del medio**: **control de acceso al medio compartido** (CSMA/CD, CSMA/CA, testigo), **direccionamiento físico** (direcciones MAC de 48 bits), **delimitación de tramas** y **detección de errores** con la secuencia de comprobación (FCS, CRC-32) |
| **Física** (PHY) | Codificación de línea, sincronización, niveles de señal, conectores y medios |

En el examen de 2025 se dio como respuesta que la subcapa que se encarga de la sincronización de tramas, el control de flujo y la detección de errores **independientemente del medio físico** es la **LLC**: la clave es «independiente del medio» (la MAC depende del medio).

### Grupos de trabajo IEEE 802

| Grupo | Ámbito | Situación |
|---|---|---|
| **802.1** | **Protocolos de LAN de nivel superior**: arquitectura, puentes y conmutación (**802.1D**), **VLAN (802.1Q)**, prioridades (802.1p), **STP/RSTP/MSTP**, **802.1X** (control de acceso por puerto), **802.1AE** (MACsec), **802.1AX** (agregación de enlaces), LLDP (802.1AB), redes sensibles al tiempo (TSN) | Activo |
| 802.2 | **LLC** | Inactivo |
| **802.3** | **Ethernet**: **métodos de acceso y transmisión** (MAC con CSMA/CD y capas físicas de 1 Mbit/s a 800 Gbit/s), PoE | Activo |
| 802.4 | *Token Bus* (bus con paso de testigo) | Disuelto |
| **802.5** | ***Token Ring*** (anillo con paso de testigo) | Disuelto |
| **802.6** | **Redes metropolitanas: DQDB** (*Distributed Queue Dual Bus*, doble bus de colas distribuidas) | Disuelto |
| 802.7 y 802.8 | Grupos asesores de banda ancha y de fibra óptica | Disueltos |
| 802.9 | LAN de servicios integrados (voz y datos) | Disuelto |
| 802.10 | Seguridad interoperable en LAN (SILS) | Disuelto |
| **802.11** | **Redes de área local inalámbricas (WLAN, Wi‑Fi)** | Activo |
| 802.12 | *Demand Priority* (100VG-AnyLAN) | Disuelto |
| 802.14 | Módems de cable | Disuelto |
| **802.15** | Redes inalámbricas de área personal: **Bluetooth (802.15.1)**, **802.15.4** (base de Zigbee y Thread), UWB (802.15.4z); hoy *Wireless Specialty Networks* | Activo |
| 802.16 | Acceso inalámbrico de banda ancha (**WiMAX**) | En hibernación |
| 802.17 | Anillo de paquetes resiliente (RPR) | Disuelto |
| 802.18 | Grupo asesor de regulación radioeléctrica | Activo |
| **802.19** | **Coexistencia inalámbrica** | Activo |
| 802.20, 802.21, 802.22 | Acceso móvil de banda ancha; traspaso independiente del medio; redes inalámbricas regionales en espacios blancos de TV | Inactivos |
| 802.24 | Aplicaciones verticales (red eléctrica inteligente, IoT) | Activo |

## Tipología de las redes locales

### Topologías

La **topología física** es la disposición real del cableado y los equipos; la **lógica**, el camino que sigue la información. No siempre coinciden: una Ethernet con concentrador era una **estrella física** y un **bus lógico**, y Token Ring usaba una **estrella física** (cableada a una unidad de acceso multiestación, MAU) con un **anillo lógico**.

| Topología | Descripción | Ventajas | Inconvenientes | Ejemplos |
|---|---|---|---|---|
| **Bus** | Todas las estaciones se conectan a un **único medio compartido** (cable troncal); en los extremos hay **terminadores** (resistencias de 50 Ω en el coaxial) que **absorben la señal y evitan las reflexiones** que causarían interferencias | Barata, poco cable | Un corte del troncal deja sin servicio el segmento; difícil de diagnosticar; colisiones | Ethernet 10BASE5 y 10BASE2 (coaxial), *Token Bus*, buses de campo (CAN) |
| **Anillo** | Cada estación se une a sus **dos vecinas** mediante **enlaces punto a punto** y la información **circula en un solo sentido**, de estación en estación (que la regeneran), hasta volver al origen | Acceso ordenado y determinista (testigo); sin colisiones | Un fallo de un nodo o enlace corta el anillo (salvo **doble anillo**); añadir nodos interrumpe | **Token Ring** (802.5), **FDDI** (doble anillo contrarrotatorio), anillos SDH y RPR |
| **Estrella** | Todos los nodos se conectan **directamente a un nodo central** (concentrador, conmutador, centralita) | Fácil de instalar, ampliar y diagnosticar; un cable dañado solo afecta a un equipo | El nodo central es un **punto único de fallo** y un posible cuello de botella; más cable | **Ethernet** con par trenzado (10BASE-T en adelante), Wi‑Fi en modo infraestructura |
| **Árbol** (estrella extendida o jerárquica) | Estrellas conectadas jerárquicamente | Escalable; refleja la estructura del edificio | Dependencia de los niveles superiores | Cableado de campus: núcleo, distribución y acceso |
| **Malla** | Nodos unidos por **varios caminos**: **completa** (todos con todos) o **parcial** | **Redundancia** y tolerancia a fallos; varios caminos | Cara y compleja: una malla completa de *n* nodos necesita **n(n − 1)/2 enlaces** y *n* − 1 interfaces por nodo | Troncales WAN, centros de datos (*leaf-spine*), redes Wi‑Fi en malla (802.11s) |
| **Híbrida** | Combinación de las anteriores | Se adapta a cada zona | Más compleja | La mayoría de las redes reales |
| Inalámbrica | **Infraestructura** (estaciones asociadas a un punto de acceso) o ***ad hoc*** (sin punto de acceso) | Movilidad | Medio compartido y abierto (tema IV.6) | IEEE 802.11 |

![Seis topologías dibujadas con nodos y enlaces: bus con un cable troncal y terminadores en los extremos; anillo de seis estaciones con el sentido de circulación; estrella con un nodo central; árbol con un conmutador raíz, dos de distribución y estaciones de acceso; malla completa de cinco nodos con diez enlaces; y malla parcial con algunos caminos redundantes](diagramas/IV.10-topologias.svg)

*Figura: topologías físicas básicas de una red local.*

**Ejemplo**: una malla completa entre 6 sedes requiere 6 × 5 / 2 = **15 enlaces** y 5 puertos por sede; con 10 sedes, 45 enlaces. Por eso se prefieren las mallas parciales o las estrellas dobles.

Las redes de los **centros de datos** usan hoy la arquitectura ***leaf-spine***: cada conmutador de acceso (*leaf*) se une a todos los de la capa troncal (*spine*), de modo que entre dos servidores siempre hay el mismo número de saltos; los campus usan el modelo jerárquico de **tres capas** (núcleo, distribución y acceso) o el de dos capas con núcleo colapsado.

### Otras clasificaciones

| Criterio | Tipos |
|---|---|
| **Técnica de transmisión** | De **difusión** (medio compartido: bus, anillo, radio) o **punto a punto** (enlaces dedicados: Ethernet conmutada) |
| **Señal** | **Banda base** (Ethernet: «BASE») o **banda ancha** (portadoras moduladas: «BROAD», redes de cable) |
| **Método de acceso** | De **contienda** (CSMA/CD, CSMA/CA) o **controlado** (testigo, sondeo, reserva) |
| **Medio** | Cableadas (cobre, fibra) o inalámbricas |
| **Relación entre equipos** | Entre iguales o cliente-servidor |
| **Alcance** | PAN, LAN, CAN, MAN, WAN (tema IV.6) |
| **Virtualización** | Físicas o **virtuales** (VLAN 802.1Q; VXLAN en centros de datos) |

### Cableado estructurado

El **cableado estructurado** es un sistema de cableado **genérico, normalizado y modular**, independiente de las aplicaciones, que permite conectar voz, datos, vídeo y control con el mismo tendido. Normas: **ISO/IEC 11801** (internacional), **EN 50173** (europea) y **ANSI/TIA-568** (EE. UU.), con TIA-569 (canalizaciones), TIA-606 (etiquetado) y TIA-607 (puesta a tierra).

| Subsistema | Une |
|---|---|
| **Troncal de campus** | Los edificios entre sí (normalmente fibra) |
| **Troncal de edificio** (vertical) | El repartidor principal con los repartidores de planta (fibra o cobre) |
| **Horizontal** | El repartidor de planta (armario o *rack* con paneles de parcheo y conmutadores) con las **tomas** de los puestos |
| Área de trabajo | La toma con el equipo, mediante el latiguillo |

- En el subsistema horizontal de par trenzado el **canal** mide como máximo **100 m**: **90 m de enlace permanente** más un total de **10 m de latiguillos**.
- Conector **RJ45** (8P8C) con esquema **T568A** o **T568B** (este último: blanco-naranja, naranja, blanco-verde, azul, blanco-azul, verde, blanco-marrón, marrón). Un cable **directo** lleva el mismo esquema en ambos extremos; uno **cruzado**, T568A en un extremo y T568B en el otro (hoy innecesario gracias a **Auto-MDI/MDIX**).
- Categorías de cable y fibras (Cat 5e a Cat 8, OM3/OM4/OM5, OS2) en el tema IV.6. Recomendación actual: **Cat 6A** para los puestos y los puntos de acceso Wi‑Fi (10 Gbit/s y PoE de alta potencia) y fibra en los troncales.

## Técnicas de transmisión

### Banda base y banda ancha

| | **Banda base** (*baseband*) | **Banda ancha** (*broadband*) |
|---|---|---|
| Señal | **Digital**, inyectada directamente en el medio (codificación de línea) | **Analógica modulada** sobre portadoras |
| Uso del ancho de banda | La señal **ocupa todo** el ancho de banda del medio: **un solo canal** | El ancho de banda se divide en **varios canales** por multiplexación en frecuencia (FDM) |
| Sentido | Bidireccional en el mismo medio | A menudo unidireccional por canal (bandas de subida y de bajada) |
| Distancias | Cortas (repetidores para ampliarlas) | Mayores (amplificadores) |
| Ejemplos | **Ethernet** (el «BASE» de 10BASE-T, 1000BASE-SX…), Token Ring | 10BROAD36 (Ethernet sobre coaxial de televisión, histórico), redes de cable HFC (DOCSIS), ADSL |

Hoy, por extensión, «banda ancha» también significa simplemente **acceso de alta velocidad**; en este tema conserva su sentido técnico.

### Modos y formas de transmisión

- **Símplex** (un solo sentido), **semidúplex** (*half-duplex*: los dos sentidos, pero **no a la vez**; la Ethernet con concentradores, que por eso necesita CSMA/CD; la radio Wi‑Fi) y **dúplex** (*full-duplex*: a la vez; la Ethernet conmutada, **sin colisiones**).
- **Serie** (bit a bit por un canal: todas las LAN) o **paralelo**.
- **Asíncrona** (cada carácter con bits de arranque y parada) o **síncrona** (bloques con reloj recuperado de la señal o un preámbulo: las LAN).
- Por el destinatario: **unidifusión** (*unicast*, a un equipo), **multidifusión** (*multicast*, a un grupo), **difusión** (*broadcast*, a todos los del segmento: MAC `FF:FF:FF:FF:FF:FF`) y, en IP, *anycast* (al más cercano de un grupo).
- **Multiplexación** para compartir un medio: en frecuencia (FDM), en tiempo (TDM), en longitud de onda en fibra (**WDM**: CWDM, DWDM; también en los transceptores bidireccionales de una sola fibra) y por códigos o subportadoras en radio (CDMA, OFDM, OFDMA).
- En las redes inalámbricas, técnicas de **espectro ensanchado** y modulación multiportadora: **DSSS** (802.11b), FHSS (Bluetooth), **OFDM** (802.11a/g/n/ac) y **OFDMA** (Wi‑Fi 6 y 7), con **MIMO** (tema IV.6).

### Codificación de línea en Ethernet

La **codificación de línea** convierte los bits en señales adecuadas al medio, asegurando **transiciones suficientes para sincronizar el reloj** y una componente continua nula; los códigos de bloque (*mB/nB*) añaden bits para garantizar transiciones y detectar errores.

| Variante | Codificación | Comentario |
|---|---|---|
| 10BASE-T (10 Mbit/s) | **Manchester** | Transición **en mitad de cada bit** (en 802.3, subida = 1 y bajada = 0): autosincronizante, pero duplica la frecuencia; Token Ring usaba **Manchester diferencial** |
| 100BASE-TX | **4B/5B** + **MLT-3** | 4B/5B: cada 4 bits se envían como 5 (eficiencia del 80 %; también en FDDI) |
| 100BASE-FX | 4B/5B + NRZI | Fibra |
| **1000BASE-X** (SX, LX) | **8B/10B** | También en Fibre Channel |
| **1000BASE-T** | **PAM-5** por los **4 pares** a la vez, en ambos sentidos (cancelación de eco) | 250 Mbit/s por par |
| 2,5G/5G/10GBASE-T | PAM-16 (DSQ128) con LDPC | 10GBASE-T a 100 m en Cat 6A |
| **10GBASE-R** (SR, LR, ER) | **64B/66B** | Eficiencia del 97 % |
| 25G a 100G por carril | 64B/66B (NRZ) o 256B/257B con FEC; **PAM-4** desde 50 Gbit/s por carril | PAM-4 codifica 2 bits por símbolo |

### La trama Ethernet

```text
 7 bytes     1      6            6           (4)            2             46 a 1500          4
┌─────────┬─────┬───────────┬───────────┬──────────────┬─────────────┬──────────────────┬────────┐
│Preámbulo│ SFD │ MAC       │ MAC       │ Etiqueta     │ EtherType o │ Datos (carga)    │  FCS   │
│10101010…│     │ destino   │ origen    │ 802.1Q (opc.)│ longitud    │ + relleno        │ CRC-32 │
└─────────┴─────┴───────────┴───────────┴──────────────┴─────────────┴──────────────────┴────────┘
                └──────────── trama: de 64 a 1518 bytes (1522 con etiqueta VLAN) ─────────────────┘
```

- **Preámbulo** (7 bytes `10101010`) y **delimitador de inicio** (SFD, `10101011`): sincronización del receptor.
- **Direcciones MAC** de destino y origen (6 bytes cada una).
- **EtherType o longitud**: si el valor es **0x0600 (1536) o mayor** es un **EtherType** que indica el protocolo transportado (Ethernet II/DIX: **0x0800 IPv4**, **0x86DD IPv6**, **0x0806 ARP**, 0x8100 etiqueta VLAN, 0x88CC LLDP, 0x888E 802.1X); si es **1500 o menor** es la **longitud** del formato IEEE 802.3, seguida de la cabecera LLC.
- **Datos**: de **46 a 1500 bytes** (la **MTU** estándar es **1500**); si hay menos, se **rellena** hasta 46.
- **FCS**: CRC de 32 bits para **detectar** errores (la trama errónea se descarta; Ethernet no corrige ni retransmite).
- **Tamaño mínimo de 64 bytes** (necesario para detectar colisiones en semidúplex) y máximo de 1518 (1522 con 802.1Q); entre tramas, un **hueco de 96 tiempos de bit**.
- Las **tramas jumbo** (*jumbo frames*), no normalizadas por 802.3 pero admitidas por casi todos los equipos, llevan hasta unos **9000 bytes** de carga útil: menos cabeceras y menos interrupciones en redes de almacenamiento (iSCSI, NFS) y virtualización; **todos** los equipos del camino deben admitirlas.

**Eficiencia**: con 1500 bytes de datos, por cada trama se transmiten 1500 + 18 (cabecera y FCS) + 8 (preámbulo y SFD) + 12 (hueco) = 1538 bytes → 1500/1538 ≈ **97,5 %** del caudal nominal; con datos de 46 bytes cae al 54,8 %.

**Dirección MAC** (EUI-48): **48 bits** escritos en hexadecimal (`3C:52:82:1A:9F:07`). Los **24 primeros** forman el **OUI**, el identificador del fabricante asignado por el IEEE; los 24 siguientes los asigna el fabricante. En el primer octeto, el bit menos significativo (**I/G**) indica dirección individual (0) o de **grupo** (1, *multicast*), y el siguiente (**U/L**), si es universal o **administrada localmente** (las MAC aleatorias de privacidad de móviles y portátiles). `FF:FF:FF:FF:FF:FF` es la **difusión**; `01:00:5E:…` corresponde a *multicast* IPv4 y `33:33:…` a *multicast* IPv6.

### Etiqueta 802.1Q (VLAN)

Entre la MAC de origen y el EtherType se inserta una **etiqueta de 4 bytes**:

| Campo | Bits | Función |
|---|---|---|
| **TPID** (*Tag Protocol Identifier*) | 16 | Vale **0x8100** e indica que la trama lleva etiqueta |
| **PCP** (*Priority Code Point*) | **3** | **Prioridad** de la trama: **8 niveles** (0 a 7) de clase de servicio (**CoS**, IEEE 802.1p) |
| **DEI** (antes **CFI**, *Canonical Format Indicator*) | 1 | Trama elegible para descarte en congestión |
| **VID** (*VLAN Identifier*) | **12** | Número de VLAN: 4096 valores, **4094 utilizables** (0 y 4095 reservados) |

La **doble etiqueta** (QinQ, **802.1ad**, TPID 0x88A8) permite a un operador transportar las VLAN de varios clientes. En los centros de datos, **VXLAN** (RFC 7348) encapsula tramas Ethernet en UDP (puerto 4789) con un identificador de 24 bits (16 millones de segmentos).

### Capas físicas Ethernet

Nomenclatura IEEE: **velocidad + tipo de señal + medio o alcance**: en **10BASE-T**, 10 Mbit/s en **banda base** sobre par trenzado (*twisted pair*); la letra final indica el medio (T, par trenzado; F, fibra; 2 y 5, coaxial de unos 200 y 500 m) o el alcance en fibra (S, *short*, corto, multimodo de 850 nm; L, *long*, largo, 1310 nm; E, *extended*, 1550 nm; Z, aún mayor, no normalizado).

| Norma | Velocidad | Medio | Alcance | Notas |
|---|---|---|---|---|
| 10BASE5 / 10BASE2 (802.3, 1983/1985) | 10 Mbit/s | Coaxial grueso / fino | 500 m / 185 m por segmento | **Bus** con terminadores; históricos |
| **10BASE-T** (802.3i, 1990) | 10 Mbit/s | Par trenzado Cat 3, 2 pares | 100 m | Estrella con concentrador |
| **100BASE-TX** (802.3u, 1995, *Fast Ethernet*) | 100 Mbit/s | Cat 5, 2 pares | 100 m | Autonegociación |
| 100BASE-FX | 100 Mbit/s | Fibra multimodo | 2 km en dúplex | |
| **1000BASE-SX** (802.3z, 1998) | 1 Gbit/s | **Solo fibra multimodo**, 850 nm | 220 a 550 m | Corto alcance |
| **1000BASE-LX** | 1 Gbit/s | Monomodo (1310 nm) o multimodo | 5 km (monomodo), 550 m (multimodo) | |
| 1000BASE-ZX | 1 Gbit/s | Monomodo, 1550 nm | ~70 km | Extensión de los fabricantes, no IEEE |
| **1000BASE-T** (802.3ab, 1999) | 1 Gbit/s | **Cat 5e**, **4 pares** | 100 m | El estándar de los puestos |
| 2.5GBASE-T y 5GBASE-T (802.3bz, 2016) | 2,5 y 5 Gbit/s | Cat 5e y Cat 6 | 100 m | Para puntos de acceso Wi‑Fi 6/7 |
| **10GBASE-T** (802.3an, 2006) | 10 Gbit/s | **Cat 6A** (Cat 6 hasta 55 m) | 100 m | |
| **10GBASE-SR / LR / ER** (802.3ae, 2002) | 10 Gbit/s | Multimodo / monomodo | 300 m (OM3) o 400 m (OM4) / 10 km / 40 km | Transceptores SFP+ |
| 25GBASE-SR (802.3by, 2016) | 25 Gbit/s | Multimodo OM4 | 100 m | SFP28 |
| 25G/40GBASE-T (802.3bq, 2016) | 25 y 40 Gbit/s | **Cat 8** | 30 m | Centros de datos |
| **40GBASE-SR4** (802.3ba, 2010) | 40 Gbit/s (**4 × 10**) | Multimodo con conector MPO | 100 m (OM3), 150 m (OM4) | **QSFP+** |
| 100GBASE-SR4 / LR4 (802.3ba, 802.3bm) | 100 Gbit/s (4 × 25) | Multimodo / monomodo (WDM) | 100 m / 10 km | QSFP28 |
| 200G y 400G (802.3bs, 2017; 802.3cm…) | 200 y 400 Gbit/s | Fibra | De 100 m a 10 km o más | QSFP-DD, OSFP; PAM-4 |
| 800G (802.3df, 2024) y **1,6T** (802.3dj, en aprobación final en 2026) | 800 Gbit/s y 1,6 Tbit/s | Fibra y cobre de corto alcance | | Carriles de 100 y 200 Gbit/s |
| Ethernet de un solo par (802.3cg y otras) | 10 Mbit/s a 10 Gbit/s | Un par trenzado | 10BASE-T1L hasta 1 km | Industria y automoción |

**Transceptores enchufables**: **SFP** (1 Gbit/s), **SFP+** (10), SFP28 (25), SFP56 (50), **QSFP+** (**40 Gbit/s**, cuatro carriles de 10), **QSFP28** (100, cuatro de 25), QSFP56 (200), **QSFP-DD** y **OSFP** (400 y 800). Otras funciones de la capa física: **autonegociación** de velocidad y dúplex (un fallo deja un extremo en dúplex y el otro en semidúplex: colisiones tardías y errores), **Auto-MDI/MDIX**, Ethernet de **bajo consumo** (802.3az) y los **LED** de enlace, cuyo color suele indicar la velocidad (en muchos equipos, verde para 1 Gbit/s y **naranja o ámbar para una velocidad inferior**, por ejemplo una tarjeta que solo negocia 100 Mbit/s; depende del fabricante).

### Alimentación a través de Ethernet (PoE)

| Norma | Nombre y tipo | Potencia en el equipo de alimentación (PSE) | Potencia en el dispositivo (PD) | Pares |
|---|---|---|---|---|
| **802.3af** (2003) | PoE, tipo 1 | 15,4 W | **12,95 W** | 2 |
| **802.3at** (2009) | PoE+, tipo 2 | 30 W | **25,5 W** | 2 |
| **802.3bt** (2018) | PoE++, tipo 3 | 60 W | **51 W** | 4 |
| **802.3bt** (2018) | PoE++, tipo 4 | 90 W | **71,3 W** | 4 |

Alimenta teléfonos IP, puntos de acceso, cámaras, sensores o pantallas por el mismo cable de datos y permite **encenderlos y apagarlos de forma remota** activando o desactivando el puerto del conmutador; un equipo de unos 70 W necesita **802.3bt tipo 4**. Hay que dimensionar el **presupuesto de potencia** del conmutador.

```bash
ethtool eth0                         # velocidad, dúplex, autonegociación y «Link detected»
ethtool -S eth0 | grep -i -E "err|drop|coll"   # contadores de errores y colisiones
ip link set dev eth0 mtu 9000        # activar tramas jumbo (todos los equipos del camino deben admitirlas)
ip -d link show eth0                 # detalles, MTU y dirección MAC
tcpdump -e -n -i eth0                # ver las cabeceras Ethernet (MAC origen/destino, EtherType, VLAN)
```

```powershell
Get-NetAdapter | Format-Table Name, Status, LinkSpeed, MacAddress
Get-NetAdapterAdvancedProperty -Name "Ethernet" -DisplayName "Jumbo Packet"
getmac /v                            # direcciones MAC de los adaptadores
```

## Métodos de acceso al medio

### El problema y su clasificación

Cuando varias estaciones comparten **un mismo medio** (bus, anillo, radio), solo una puede transmitir a la vez sin que las señales se mezclen. El **método de acceso al medio** (o control de acceso al medio, función de la subcapa **MAC**) decide **quién transmite y cuándo**.

| Familia | Idea | Técnicas |
|---|---|---|
| **Contienda** (acceso aleatorio) | Las estaciones **compiten**: transmiten cuando lo necesitan y resuelven las **colisiones** | **ALOHA** (puro y ranurado), **CSMA** (1-persistente, no persistente, p-persistente), **CSMA/CD** (Ethernet), **CSMA/CA** (Wi‑Fi) |
| **Controlado** por **rotación** (turno) | El derecho a transmitir pasa por turno de una estación a otra | **Paso de testigo** en anillo (**Token Ring**, FDDI) o en bus (*Token Bus*), **sondeo** (*polling*) |
| Controlado por **reserva** | Antes de transmitir, la estación **reserva** su turno o sus ranuras de tiempo; después transmite sin colisiones | **R-ALOHA** (ALOHA con reserva), TDMA con asignación por demanda, **DQDB** (802.6, cola distribuida), planificación por el punto de acceso en Wi‑Fi 6 |
| **Particionado** del canal (multiplexación) | Cada estación recibe una parte fija o asignada del canal | **FDMA** (frecuencia), **TDMA** (tiempo), **CDMA** (códigos), **OFDMA** (subportadoras), SDMA (espacio, haces MIMO) |
| Prioridad por demanda | El concentrador concede el turno según peticiones y prioridades | 802.12 (100VG-AnyLAN), histórico |

Las técnicas de contienda son **sencillas y eficientes con poca carga**, pero con mucha carga las colisiones disparan los retardos y **no son deterministas**; las de testigo, sondeo y reserva **garantizan un tiempo máximo de espera** (útiles en tiempo real e industria) a costa de más complejidad y de una sobrecarga fija aunque la red esté vacía.

### ALOHA

Desarrollado en la **Universidad de Hawái** (ALOHAnet, 1971) para comunicar islas por radio, es el origen de los métodos de contienda.

- **ALOHA puro**: cada estación **transmite cuando quiere**; si no recibe confirmación (colisión), espera un tiempo **aleatorio** y retransmite. Una trama es vulnerable durante **dos** tiempos de trama. Caudal: **S = G·e^(−2G)**, con un máximo de **1/(2e) ≈ 18,4 %** cuando la carga ofrecida es G = 0,5.
- **ALOHA ranurado** (*slotted*): el tiempo se divide en **ranuras** del tamaño de una trama y solo se puede empezar a transmitir al **principio de una ranura**: la vulnerabilidad se reduce a la mitad. Caudal: **S = G·e^(−G)**, máximo **1/e ≈ 36,8 %** con G = 1.
- **R-ALOHA** (con reserva): una estación que transmite con éxito en una ranura **la conserva** en los ciclos siguientes.

### CSMA: escuchar antes de transmitir

En **CSMA** (*Carrier Sense Multiple Access*, acceso múltiple con **detección de portadora**) cada estación **escucha el medio antes de transmitir** y solo lo hace si está libre. Sigue habiendo colisiones porque una señal tarda en propagarse: dos estaciones pueden ver el medio libre a la vez. Variantes según qué se hace si el medio está ocupado:

| Variante | Comportamiento con el medio ocupado | Resultado |
|---|---|---|
| **1-persistente** | Sigue escuchando y transmite **en cuanto queda libre** (probabilidad 1) | Bajo retardo, pero colisiones seguras si dos esperaban (la usa Ethernet) |
| **No persistente** | Espera un **tiempo aleatorio** y vuelve a escuchar | Menos colisiones, más retardo |
| **p-persistente** (canal ranurado) | Cuando queda libre, transmite con probabilidad **p** o espera a la siguiente ranura con probabilidad 1 − p | Compromiso |

### CSMA/CD (Ethernet)

**CSMA/CD** = **acceso múltiple con detección de portadora y detección de colisiones** (*Carrier Sense Multiple Access with Collision Detection*). Es el método de la **Ethernet clásica en semidúplex** (IEEE 802.3):

1. La estación con datos **escucha** el medio; si está ocupado, espera a que quede libre (1-persistente) más el **hueco entre tramas** (96 tiempos de bit).
2. **Transmite** y, mientras lo hace, **sigue escuchando** para detectar una colisión (la señal del medio no coincide con la que envía).
3. Si detecta una **colisión**, **deja de transmitir** y envía una **señal de atasco** (*jam*, 32 bits) para que todas la detecten.
4. Espera un tiempo aleatorio según el **retroceso exponencial binario truncado**: tras la colisión *n*-ésima elige al azar *k* entre 0 y 2^min(n, 10) − 1 y espera *k* × el **tiempo de ranura** (512 tiempos de bit); tras **16 intentos** fallidos descarta la trama e informa del error.

Para que una estación detecte siempre la colisión **antes de terminar de transmitir**, la trama debe durar al menos el **doble del tiempo de propagación** de extremo a extremo (ida y vuelta): de ahí la **trama mínima de 64 bytes** (512 bits = el tiempo de ranura; 51,2 µs a 10 Mbit/s) y el **diámetro máximo** del dominio de colisión. **Ejercicio**: a 10 Mbit/s, 512 bits tardan 51,2 µs; si se multiplicara la velocidad por 10 manteniendo los 64 bytes, el tiempo de ranura bajaría a 5,12 µs y el diámetro máximo se reduciría unas diez veces (por eso Fast Ethernet con concentradores apenas llegaba a unos 200 m entre extremos).

La regla clásica **5-4-3** de la Ethernet de 10 Mbit/s limitaba un dominio de colisión a **5 segmentos**, **4 repetidores** y **3 segmentos con estaciones**. Un **dominio de colisión** es el conjunto de equipos cuyas transmisiones pueden colisionar entre sí (todos los conectados a un mismo bus o concentrador).

Con **conmutadores** y enlaces **dúplex**, cada puerto es un enlace punto a punto con pares separados para cada sentido: **no hay colisiones y CSMA/CD no se usa** (la norma lo mantiene solo para el semidúplex). Desde 10 Gbit/s Ethernet funciona **solo en dúplex**.

### CSMA/CA (Wi‑Fi)

En una red inalámbrica una estación **no puede detectar colisiones** mientras transmite (su propia señal ahoga la de las demás y la radio es semidúplex) y puede haber **terminales ocultos** (A y C oyen al punto de acceso, pero no se oyen entre sí). Por eso **IEEE 802.11** usa **CSMA/CA** (*Collision Avoidance*, **evitación** de colisiones) en su función de coordinación distribuida (**DCF**):

1. **Detección de portadora física** (¿hay energía en el canal?) y **virtual** mediante el **NAV** (*Network Allocation Vector*): cada trama anuncia cuánto tiempo ocupará el medio y las demás estaciones lo respetan.
2. Si el medio está libre durante un **DIFS**, se espera además un **retroceso aleatorio** dentro de una **ventana de contienda** (que se duplica tras cada fallo, de CWmin a CWmax) y entonces se transmite.
3. El receptor confirma cada trama de unidifusión con un **ACK** tras un **SIFS** (el intervalo más corto, que da prioridad a la respuesta); sin ACK, se supone colisión y se retransmite.
4. Opcionalmente, **RTS/CTS** (*Request to Send* / *Clear to Send*): el emisor **reserva** el medio con una trama corta y el punto de acceso responde CTS, que oyen también los terminales ocultos.

Intervalos entre tramas, de menor a mayor: **SIFS** < PIFS < **DIFS** < EIFS (y AIFS en la QoS de 802.11e). Además de DCF existen **PCF** (coordinación puntual: el punto de acceso **sondea** a las estaciones; opcional y casi no implementado), **HCF** con **EDCA** (802.11e/WMM: cuatro categorías de acceso con prioridad: voz, vídeo, mejor esfuerzo y fondo) y, en **Wi‑Fi 6 y 7**, la planificación por el punto de acceso con **OFDMA** (reparte subportadoras entre varios clientes en la misma transmisión).

### Paso de testigo

Un **testigo** (*token*) es una trama especial que **circula** entre las estaciones: **solo quien lo tiene puede transmitir**, durante un tiempo máximo (**tiempo de retención del testigo**), y después lo pasa a la siguiente. No hay colisiones y el **tiempo de espera está acotado** (determinismo).

| Red | Características |
|---|---|
| **Token Ring** (IBM; **IEEE 802.5**, 1985) | **Anillo lógico** sobre estrella física (MAU), 4 y 16 Mbit/s, Manchester diferencial; bits de **prioridad y reserva** en el testigo; una estación **monitor activo** vigila el testigo y elimina las tramas huérfanas; la trama recorre el anillo y la **retira el emisor** |
| **FDDI** (ANSI/ISO 9314) | **100 Mbit/s** sobre **fibra**, **doble anillo contrarrotatorio** (si se corta un tramo, los anillos se unen y siguen funcionando), hasta unos 100 km de anillo; testigo temporizado; 4B/5B con NRZI; se usó como troncal de campus en los noventa (CDDI sobre cobre) |
| ***Token Bus*** (**IEEE 802.4**) | **Anillo lógico** sobre un **bus físico**: el testigo se pasa por orden de dirección; se usó en automatización industrial (MAP) |
| ARCNET | Paso de testigo a 2,5 Mbit/s, muy usado en los ochenta y en control industrial |

### Sondeo y reserva

- **Sondeo** (*polling*): una estación **primaria** (maestra) pregunta por turno a las **secundarias** si tienen algo que enviar; solo transmite la sondeada. Variantes: **por lista** (*roll-call*) y **por concentrador** (*hub polling*: el turno pasa de una secundaria a la siguiente). Lo usan Bluetooth (el maestro de la piconet), la PCF de 802.11, HDLC en modo de respuesta normal y muchos buses industriales.
- **Reserva**: el tiempo se divide en ciclos con una **fase de reserva** (ranuras cortas en las que cada estación pide turno) y una **fase de transmisión** sin colisiones. Ejemplos: R-ALOHA, TDMA con asignación dinámica y **DQDB** (*Distributed Queue Dual Bus*, IEEE **802.6**): **dos buses unidireccionales** de sentidos opuestos con ranuras generadas en la cabecera de cada bus; cada estación anota en el bus contrario sus **peticiones** y lleva un contador de las peticiones pendientes de las estaciones anteriores, formando una **cola distribuida**: transmite cuando le toca, sin colisiones. Fue la base del servicio SMDS de las redes metropolitanas y está en desuso.

### Comparativa

| | ALOHA | CSMA/CD | CSMA/CA | Paso de testigo | Sondeo | Reserva (DQDB, TDMA) |
|---|---|---|---|---|---|---|
| Colisiones | Sí, muchas | Sí, se detectan y se aborta | Se **evitan** (pueden darse) | No | No | No |
| Eficiencia con poca carga | Alta | **Muy alta** | Alta | Media (hay que esperar el testigo) | Media | Media |
| Eficiencia con mucha carga | Muy baja (18 % o 37 %) | Baja | Media | **Alta** | Alta | Alta |
| Determinismo | No | No | No | **Sí** | Sí | Sí |
| Ejemplos | Satélite, radio | **Ethernet semidúplex (802.3)** | **Wi‑Fi (802.11)** | **Token Ring (802.5)**, FDDI, Token Bus (802.4) | Bluetooth, PCF | **802.6**, GSM (TDMA) |

## Dispositivos de interconexión

### Por niveles

| Dispositivo | Nivel OSI | Qué hace | Dominios |
|---|---|---|---|
| **Tarjeta de red** (NIC) | 1-2 | Conecta el equipo al medio; tiene la **dirección MAC**; descarga funciones de la CPU (sumas de comprobación, segmentación) | — |
| **Repetidor** | 1 (físico) | **Regenera y amplifica** la señal para ampliar la distancia; no entiende de tramas ni filtra | Un único dominio de colisión |
| **Concentrador** (*hub*) | 1 | **Repetidor multipuerto**: lo que entra por un puerto **sale por todos los demás**; ancho de banda **compartido** y semidúplex | **Un dominio de colisión** para todos los puertos y uno de difusión |
| **Conversor de medios** (*media converter*) | 1 | Pasa de cobre a fibra (o entre tipos de fibra) | — |
| **Puente** (*bridge*) | 2 (enlace) | Une **segmentos** de LAN y **filtra** por **dirección MAC**: **el tráfico local sigue siendo local** y solo cruza lo destinado al otro segmento | Separa dominios de **colisión**; mantiene **un** dominio de difusión |
| **Conmutador** (*switch*) | 2 | **Puente multipuerto** con conmutación por *hardware* (ASIC): **ancho de banda dedicado y dúplex** en cada puerto (**microsegmentación**), VLAN, STP, QoS, PoE, agregación de enlaces, puertos espejo | **Un dominio de colisión por puerto**; **un único dominio de difusión** (o uno por VLAN) |
| **Punto de acceso** inalámbrico | 2 | **Puente** entre 802.11 y 802.3; se gestionan en conjunto con una **controladora** física o en la nube | Un dominio de difusión por SSID/VLAN |
| **Conmutador de nivel 3** (multinivel) | 2-3 | Conmuta en el nivel 2 y **encamina entre VLAN** por *hardware* (interfaces virtuales SVI) | Separa dominios de difusión entre VLAN |
| ***Router*** (encaminador) | 3 (red) | Interconecta **redes distintas** y **encamina paquetes IP** según su **tabla de encaminamiento** (rutas estáticas o aprendidas por OSPF, BGP…); NAT, listas de acceso, interfaces WAN | **Separa dominios de difusión** (uno por interfaz) |
| ***Brouter*** | 2-3 | Encamina lo encaminable y hace de puente con lo demás | Histórico |
| **Pasarela** (*gateway*) | 4-7 | Interconecta redes de **arquitecturas o protocolos distintos traduciendo** entre ellos (pasarela de voz analógica a VoIP, pasarelas IoT, pasarelas de correo o de aplicaciones) | — |
| Cortafuegos, balanceador, proxy | 3-7 | Filtran o reparten según puertos y contenidos (tema IV.9) | — |

La expresión «puerta de enlace» (*default gateway*) de la configuración IP designa, en realidad, el ***router*** por el que un equipo sale de su red.

### Funcionamiento de puentes y conmutadores

Un puente **transparente** (IEEE **802.1D**) es invisible para las estaciones y funciona con cinco operaciones:

1. **Aprendizaje**: anota en la **tabla de direcciones MAC** (tabla CAM) la **MAC de origen** de cada trama y el puerto por el que llegó.
2. **Filtrado**: si la MAC de destino está en el **mismo puerto** por el que llegó la trama, la descarta (el tráfico local sigue siendo local).
3. **Reenvío**: si la MAC de destino está asociada a otro puerto, envía la trama **solo por ese puerto**.
4. **Inundación**: si el destino es **desconocido**, de **difusión** o ***multicast*** (salvo con *IGMP snooping*), la reenvía por **todos los puertos** menos el de entrada.
5. **Envejecimiento**: borra las entradas no usadas tras un tiempo (por defecto **300 s**).

Otros tipos de puente: de **encaminamiento desde el origen** (*source routing*, Token Ring: la ruta la indica la estación emisora), de **traducción** (entre MAC distintas, como un punto de acceso Wi‑Fi) y **remotos** (unidos por un enlace WAN).

| Método de conmutación | Cómo reenvía | Latencia | Errores |
|---|---|---|---|
| **Almacenamiento y reenvío** (*store-and-forward*) | Recibe **la trama completa** y **comprueba el CRC** antes de reenviarla | La mayor (depende del tamaño) | **Descarta** las tramas erróneas; permite velocidades distintas en los puertos |
| **Corte** (*cut-through*) | Reenvía en cuanto lee la **MAC de destino** (primeros 6 bytes tras el preámbulo) | La menor y constante | Propaga tramas erróneas y fragmentos |
| **Libre de fragmentos** (*fragment-free*) | Espera a recibir los **primeros 64 bytes** (lo que dura una colisión) | Intermedia | Elimina los fragmentos de colisión, no todos los errores |

**Conmutadores gestionables**: VLAN, STP, agregación de enlaces, *port security*, 802.1X, QoS, puertos espejo (SPAN) para análisis, *IGMP snooping*, LLDP (802.1AB) para descubrir vecinos, apilamiento (*stacking*) y gestión por SSH, SNMP o API. Los **no gestionables** solo conmutan.

### Dominios de colisión y de difusión

- **Dominio de colisión**: conjunto de equipos cuyas transmisiones **pueden colisionar**; los separan los **puentes, conmutadores y *routers*** (no los repetidores ni los concentradores).
- **Dominio de difusión**: conjunto de equipos que **reciben las tramas de difusión** de cualquiera de ellos (ARP, DHCP); solo los separan los ***routers*** (y las **VLAN**, que crean uno por VLAN).

**Ejercicio resuelto.** Un *router* con dos interfaces. En la primera, un conmutador de 24 puertos con 10 PC y un concentrador con 4 PC conectado a uno de sus puertos. En la segunda, otro conmutador con 8 PC.

```text
Dominios de difusión: uno por interfaz del router → 2
Dominios de colisión:
  - Conmutador 1: un dominio por cada puerto usado: 10 (PC) + 1 (el concentrador con sus 4 PC) + 1 (enlace al router) = 12
  - Conmutador 2: 8 (PC) + 1 (enlace al router) = 9
  Total = 21  (con enlaces dúplex no hay colisiones reales, pero cada puerto sigue contando como dominio)
```

Si los 10 PC del primer conmutador se repartieran en dos VLAN, habría un dominio de difusión más.

### Bucles y protocolo de árbol de expansión (STP)

Los enlaces redundantes entre conmutadores mejoran la disponibilidad, pero en el nivel 2 crean **bucles**: como las tramas Ethernet **no tienen TTL**, una difusión gira sin fin (**tormenta de difusión**), las tablas MAC se vuelven inestables y llegan tramas duplicadas. El **protocolo de árbol de expansión** (**STP**, *Spanning Tree Protocol*, creado por Radia Perlman en 1985 y normalizado en **IEEE 802.1D**) bloquea los enlaces sobrantes hasta formar un **árbol sin bucles** y los reactiva si falla un enlace activo.

Los conmutadores intercambian **BPDU** (*Bridge Protocol Data Units*, unidades de datos del protocolo de puente), por defecto cada **2 s** (*hello*), y siguen estos pasos:

1. **Elección del puente raíz**: el de **menor identificador de puente** (*Bridge ID* = **prioridad**, 32768 por defecto y configurable en múltiplos de 4096, + **dirección MAC**); a igual prioridad gana la **MAC más baja**.
2. **Puerto raíz** en cada conmutador no raíz: el de **menor coste** acumulado hasta la raíz (costes de 802.1D-1998: 10 Mbit/s = 100, 100 Mbit/s = 19, 1 Gbit/s = 4, 10 Gbit/s = 2; la versión de 2004 usa valores largos: 1 Gbit/s = 20 000).
3. **Puerto designado** en cada segmento: el del conmutador con menor coste hacia la raíz (todos los puertos de la raíz son designados).
4. El resto de puertos quedan **bloqueados** (no reenvían datos, pero siguen escuchando BPDU).

Estados de un puerto en STP clásico: **bloqueo** → **escucha** → **aprendizaje** → **reenvío** (y deshabilitado); con los temporizadores por defecto (*max age* 20 s, *forward delay* 15 s) la convergencia tarda **de 30 a 50 s**.

| Versión | Norma | Mejoras |
|---|---|---|
| **STP** | 802.1D (1990, 1998) | Original; un único árbol para todas las VLAN |
| **RSTP** (*Rapid STP*) | **IEEE 802.1w** (2001), integrado en 802.1D-2004 | Convergencia en **segundos o menos**: roles **raíz, designado, alternativo y de respaldo**; estados **descarte, aprendizaje y reenvío**; puertos **de borde** (equipos finales) que pasan a reenvío de inmediato; negociación propuesta/acuerdo |
| **MSTP** (*Multiple STP*) | **IEEE 802.1s** (2002), integrado en **802.1Q** | **Varias instancias** de árbol, cada una con un grupo de VLAN: reparte la carga por los enlaces redundantes |
| PVST+ y Rapid PVST+ | Cisco (propietarios) | Un árbol **por VLAN** |
| SPB y TRILL | IEEE 802.1aq (2012) y RFC 6325 | Sustitutos de STP con encaminamiento de estado de enlace en el nivel 2 (todos los enlaces activos) |

Protecciones: **PortFast**/puerto de borde en los puertos de equipos, **BPDU Guard** (apaga el puerto si recibe BPDU), **Root Guard** (impide que otro conmutador se convierta en raíz) y **Loop Guard**.

**Ejercicio.** Tres conmutadores: SW1 (prioridad 32768, MAC 00:1A:…:01), SW2 (prioridad 4096, MAC 00:1A:…:FF) y SW3 (prioridad 32768, MAC 00:0B:…:10). El **raíz es SW2**, porque su **prioridad** es la menor (la MAC solo desempata a igual prioridad). Entre SW1 y SW3, de igual prioridad, tendría preferencia SW3 por tener la MAC más baja.

### VLAN

Una **VLAN** (red de área local virtual, **IEEE 802.1Q**) divide un conmutador o un conjunto de ellos en **dominios de difusión independientes**, como si fueran LAN separadas, sin cambiar el cableado: separa usuarios, servidores, voz, gestión, Wi‑Fi o invitados (segmentación que exige el ENS en [mp.com.4]), reduce las difusiones y facilita la administración.

- **Asignación**: **por puerto** (estática, la más común), por **dirección MAC**, por protocolo o **dinámica** (el servidor RADIUS asigna la VLAN tras la autenticación 802.1X).
- **Puerto de acceso**: pertenece a **una** VLAN y las tramas salen **sin etiqueta**. **Puerto troncal**: transporta **varias** VLAN con la **etiqueta 802.1Q** (TPID, **PCP**, DEI y **VID**); las tramas de la **VLAN nativa** viajan sin etiqueta.
- **Comunicación entre VLAN**: siempre a través del **nivel 3**: un ***router* con subinterfaces** en un troncal (*router-on-a-stick*) o un **conmutador de nivel 3** con interfaces SVI. Configuración en el tema IV.4.

### Agregación de enlaces y redundancia

- **Agregación de enlaces** (**IEEE 802.1AX**, antes 802.3ad; protocolo **LACP**): agrupa varios puertos físicos en un enlace lógico (EtherChannel, *bond*, *team*) que **suma capacidad** y **tolera la caída** de uno de ellos; el reparto se hace por flujos (*hash* de direcciones y puertos).
- **Redundancia de la puerta de enlace**: **VRRP** (RFC 5798) o HSRP (Cisco) comparten una IP virtual entre dos *routers* o conmutadores de nivel 3.
- **Apilamiento** y **agregación entre chasis** (MLAG, vPC) para eliminar puntos únicos de fallo sin depender de STP.

```text
! Cisco IOS: diagnóstico básico de la capa 2
show interfaces status                    ! velocidad, dúplex y VLAN de cada puerto
show mac address-table dynamic            ! direcciones aprendidas y su puerto
show spanning-tree vlan 10                ! raíz, roles y estados de los puertos
spanning-tree mode rapid-pvst             ! activar RSTP por VLAN
spanning-tree vlan 10 priority 4096       ! forzar este conmutador como raíz de la VLAN 10
interface range gi1/0/47 - 48
 channel-group 1 mode active              ! agregación LACP
show etherchannel summary
```

```bash
# Linux: puente y VLAN por software (por ejemplo, en un servidor de virtualización)
ip link add name br0 type bridge
ip link set dev eth1 master br0           # añadir la interfaz al puente
ip link set dev br0 up
bridge fdb show br br0                    # tabla de direcciones MAC aprendidas
ip link add link eth0 name eth0.10 type vlan id 10   # subinterfaz etiquetada en la VLAN 10
```

### Ejercicios resueltos de supuesto

1. **¿Qué equipo usa tablas de encaminamiento?** El ***router*** (el conmutador usa una tabla de direcciones MAC; el concentrador y el conversor de medios no tienen tablas).
2. **¿Qué equipo segmenta los dominios de colisión pero mantiene un único dominio de difusión?** El **conmutador** (y el puente); el *router* separa también la difusión; el concentrador no separa nada.
3. **¿Qué equipo filtra para que el tráfico local siga siendo local permitiendo la conectividad con otros segmentos?** Es la definición clásica del **puente** (el conmutador es un puente multipuerto).
4. **Gigabit a 1 km entre edificios con fibra multimodo.** 1000BASE-SX solo llega a 550 m: hace falta **1000BASE-LX** con fibra **monomodo** (5 km) o un tendido de fibra multimodo más corto; para 10 Gbit/s a 10 km, **10GBASE-LR**.
5. **Enlazar dos conmutadores a 40 Gbit/s dentro del CPD.** Transceptores **QSFP+** con **40GBASE-SR4** sobre fibra multimodo OM4 (hasta 150 m) o cables directos de cobre (DAC) en distancias de pocos metros.
6. **Un PC recién conectado enciende el LED de enlace en naranja en una red Gigabit.** Suele indicar que el enlace ha negociado una **velocidad inferior** (100 o 10 Mbit/s): tarjeta antigua, cable de categoría insuficiente o con pares dañados, o fallo de autonegociación; se comprueba con `ethtool` o `Get-NetAdapter`.
7. **Cámara de 70 W que debe encenderse a distancia.** Alimentarla por **PoE 802.3bt tipo 4** (hasta 71,3 W en el dispositivo) y encender o apagar el puerto desde el conmutador.
8. **¿Cuántas prioridades permite la etiqueta 802.1Q y en qué campo?** **Ocho** (0 a 7), en el campo **PCP** de 3 bits; el VID de 12 bits identifica la VLAN.

## Normativa y estándares clave

| Norma o estándar | Qué regula | Puntos clave |
|---|---|---|
| **IEEE 802** (ISO/IEC 8802) | Familia de normas de LAN y MAN | Capa física y de enlace dividida en **LLC** y **MAC** |
| IEEE 802.2 | LLC | Servicios tipo 1, 2 y 3; SAP |
| **IEEE 802.3-2022** (ISO/IEC 8802-3) | **Ethernet**: MAC con **CSMA/CD** y capas físicas | Trama de 64 a 1518 bytes; enmiendas 802.3u (100 Mbit/s), 802.3z y 802.3ab (1 Gbit/s), 802.3ae y 802.3an (10 Gbit/s), 802.3ba (40/100), 802.3bz (2,5/5G), 802.3bs (200/400), 802.3df (800G), 802.3dj (1,6T) |
| **IEEE 802.3af / at / bt** | **PoE**, PoE+ y PoE++ | 12,95 W, 25,5 W, 51 W y 71,3 W en el dispositivo |
| **IEEE 802.1D** | Puentes MAC y **STP** | Aprendizaje, filtrado y reenvío; BPDU; raíz por menor *Bridge ID* |
| **IEEE 802.1w** / 802.1s | **RSTP** / MSTP | Convergencia rápida / varias instancias |
| **IEEE 802.1Q-2022** | **VLAN** y puentes con VLAN | Etiqueta de 4 bytes: TPID 0x8100, **PCP** (3 bits, 8 prioridades), DEI, **VID** (12 bits); integra 802.1p, 802.1s y 802.1ad |
| IEEE 802.1AX-2020 | Agregación de enlaces (LACP) | Antes 802.3ad |
| IEEE 802.1X, 802.1AE, 802.1AB | Control de acceso por puerto, MACsec, LLDP | Seguridad y descubrimiento (temas IV.4 y IV.9) |
| IEEE 802.5 / 802.4 / **802.6** | **Token Ring** / *Token Bus* / **DQDB** | Históricos: paso de testigo y cola distribuida |
| **IEEE 802.11** | **WLAN** (Wi‑Fi) con CSMA/CA | Normas y seguridad en el tema IV.6 |
| ISO/IEC 9314 (ANSI X3T9.5) | **FDDI** | 100 Mbit/s, doble anillo de fibra |
| **ISO/IEC 11801**, EN 50173, ANSI/TIA-568 | **Cableado estructurado** | Canal de 100 m (90 + 10), categorías y clases, subsistemas |
| RFC 7348 y RFC 5798 | VXLAN y VRRP | Redes superpuestas de centro de datos y redundancia de la puerta de enlace |
| Real Decreto 311/2022 (ENS), **[mp.com.4]** | Segmentación de las redes | VLAN para usuarios, servicios y administración; Wi‑Fi en segmento propio |

## Lo que más cae en el examen

En los exámenes de 2016 a 2025 hay **22 preguntas** de este tema (una anulada): **17 de ingreso libre** (2 en 2016, 3 en 2019, 1 en 2021, 3 en 2023, 4 en 2024, 2 en la convocatoria de 2025 y 2 en su llamamiento extraordinario) y **5 de promoción interna** (3 en 2023 y 2 en 2025). Desde 2023 aparecen en todos los exámenes de ingreso libre. Hay más preguntas de redes locales en los temas IV.4 (configuración de VLAN, *port security*, 802.1X) y IV.6 (equipos y medios).

| Bloque | Preguntas | Exámenes |
|---|---|---|
| **Ethernet y transmisión**: **1000BASE-SX** solo sobre multimodo, **PoE 802.3bt** para unos 70 W, **trama jumbo de 9000 bytes**, LED naranja = velocidad inferior, qué regula **IEEE 802.3** (métodos de acceso y transmisión de Ethernet), **QSFP+ = 40 Gbit/s**, campo **PCP** de 802.1Q (8 prioridades) | 7 | LI 2019, 2021, 2024, 2025 y 2025‑ext |
| **Dispositivos y STP**: el ***router*** usa tablas de encaminamiento; el **conmutador** separa dominios de colisión pero no de difusión; equipo que mantiene local el tráfico local (anulada); STP usa **BPDU**; **RSTP = 802.1w** | 5 | LI 2019, 2023 y 2024; PI 2025 |
| **Tipología**: **estrella** (nodo central), **terminadores** del bus (absorben la señal y evitan reflexiones), **anillo** (enlaces punto a punto entre vecinos en un solo sentido), **SOHO**, **POLAN** | 5 | LI 2023, 2024 y 2025; PI 2023 |
| **Modelo y grupos IEEE 802**: **DQDB = 802.6**, **802.11 = WLAN**, subcapa **LLC** | 3 | LI 2016; PI 2023 y 2025 |
| **Métodos de acceso**: técnica de reserva, significado de **CSMA/CD** | 2 | LI 2016 y 2023 |

Patrón: definiciones cortas con siglas y números de norma (802.x, nombres de capas físicas, transceptores, campos de cabecera) y, en el supuesto, decisiones prácticas (qué PoE, qué fibra, qué significa un LED o qué equipo separa dominios).

## Trampas habituales

- **CSMA/CD** = acceso múltiple con **detección de portadora** y **detección de colisiones**; **CSMA/CA** = **evitación** de colisiones (Wi‑Fi). Ethernet conmutada en dúplex **no** usa CSMA/CD.
- Técnicas de **contienda**: ALOHA y CSMA; de **rotación**: paso de testigo y sondeo; de **reserva**: R-ALOHA, TDMA dinámico, DQDB (en el examen de 2016 la plantilla dio por buena «GSMA», que no es una técnica conocida).
- **DQDB = IEEE 802.6** (red metropolitana de doble bus); 802.3 = Ethernet; 802.5 = Token Ring; 802.4 = Token Bus; 802.10 = seguridad; **802.11 = WLAN**; **802.1 = protocolos de nivel superior** (puentes, VLAN, STP); 802.15 = WPAN; **802.19 = coexistencia inalámbrica**.
- **IEEE 802.3** regula los **métodos de acceso y la transmisión de Ethernet** (no Wi‑Fi, ni Bluetooth, ni redes móviles).
- La subcapa **LLC** es la **independiente del medio**; la **MAC** depende del medio y controla el acceso.
- **Estrella** = todos a un nodo central; **anillo** = enlaces punto a punto entre vecinos en **un sentido**; **bus** = medio compartido con **terminadores** que **absorben la señal** para evitar reflexiones (no amplifican, ni asignan IP, ni cifran); **árbol** = jerarquía de estrellas; malla completa = n(n − 1)/2 enlaces.
- **SOHO** = *Small Office, Home Office*; **POLAN** = LAN óptica **pasiva** sin equipos activos intermedios.
- **1000BASE-SX** = **multimodo** (850 nm); 1000BASE-LX = 1310 nm, monomodo o multimodo; 1000BASE-ZX = largo alcance no normalizado; **1000BASE-T** = cobre Cat 5e, 4 pares.
- **QSFP+ = 40 Gbit/s** (4 × 10); QSFP28 = 100; SFP+ = 10; SFP = 1.
- **Trama jumbo ≈ 9000 bytes** de carga; la MTU estándar es **1500**; trama mínima **64 bytes**, máxima **1518** (1522 con VLAN).
- **PoE**: 802.3af ≈ 13 W, **802.3at** (PoE+) ≈ 25,5 W, **802.3bt** (PoE++) hasta ≈ 71 W; «802.3ct» y «802.3dt» no son normas de PoE.
- Etiqueta 802.1Q: **PCP** (3 bits) = **8 prioridades** (CoS); **VID** (12 bits) = VLAN; TPID = 0x8100; DEI/CFI = 1 bit.
- STP intercambia **BPDU** (no «SPDU» ni «TPDU»); **RSTP = 802.1w**, STP = 802.1D, MSTP = 802.1s, VLAN = 802.1Q, SPB = 802.1aq; raíz = **menor prioridad** y, a igualdad, menor MAC.
- ***Router*** = tablas de **encaminamiento** y separa dominios de **difusión**; **conmutador/puente** = tabla de **MAC** y separa dominios de **colisión**; **concentrador** = no separa nada; **pasarela** = traduce entre arquitecturas distintas.
- Almacenamiento y reenvío **comprueba el CRC**; corte reenvía tras la MAC de destino; libre de fragmentos espera **64 bytes**.
- LED naranja en una red Gigabit suele indicar **menor velocidad negociada**, no una VLAN mal configurada ni un cable coaxial.

## Repaso rápido

- LAN: área limitada, alta velocidad, pocos errores, privada; entre iguales o cliente-servidor; SOHO, CAN, WLAN, VLAN, POLAN.
- IEEE 802: física + **MAC** (dependiente del medio) + **LLC** (802.2, independiente); grupos activos 802.1, 802.3, 802.11, 802.15, 802.18, 802.19 y 802.24.
- Topologías: bus (terminadores), anillo (unidireccional, Token Ring, FDDI de doble anillo), estrella (nodo central), árbol, malla (n(n − 1)/2 enlaces), híbrida; física frente a lógica.
- Cableado estructurado (ISO/IEC 11801, TIA-568): campus, troncal de edificio, horizontal; canal de 100 m (90 + 10); T568A/T568B; Cat 6A recomendada.
- Banda base (Ethernet) frente a banda ancha (FDM, cable); símplex, semidúplex, dúplex; *unicast*, *multicast*, *broadcast*.
- Codificación: Manchester (10 Mbit/s), 4B/5B + MLT-3 (100BASE-TX), 8B/10B (1000BASE-X), PAM-5 (1000BASE-T), 64B/66B (10GBASE-R), PAM-4 (≥ 50G por carril).
- Trama Ethernet: preámbulo + SFD, MAC destino y origen (48 bits, OUI de 24), EtherType (0x0800 IPv4, 0x86DD IPv6, 0x0806 ARP) o longitud, 46-1500 bytes, FCS CRC-32; jumbo ≈ 9000.
- 802.1Q: TPID 0x8100, PCP (8 prioridades), DEI, VID (4094 VLAN); QinQ 802.1ad; VXLAN.
- Capas físicas: 10BASE-T, 100BASE-TX, 1000BASE-SX/LX/T, 2.5/5GBASE-T, 10GBASE-T/SR/LR/ER, 25G, 40GBASE-SR4 (QSFP+), 100G (QSFP28), 400G, 800G, 1,6T.
- PoE: af 12,95 W, at 25,5 W, bt 51 y 71,3 W (en el dispositivo).
- Acceso: ALOHA (18,4 %), ALOHA ranurado (36,8 %), CSMA 1-persistente, no persistente y p-persistente; **CSMA/CD** (escuchar, transmitir, detectar, atasco, retroceso exponencial, 16 intentos, ranura de 512 bits); **CSMA/CA** (DIFS, retroceso, ACK tras SIFS, RTS/CTS, NAV); testigo (Token Ring 802.5, FDDI, Token Bus 802.4); sondeo; reserva (DQDB 802.6).
- Dispositivos: repetidor y concentrador (nivel 1), puente y conmutador (nivel 2: aprende MAC, filtra, reenvía, inunda; 300 s), conmutador de nivel 3, *router* (nivel 3), pasarela (traducción).
- Dominios: colisión (los separan puentes, conmutadores y *routers*), difusión (solo *routers* y VLAN).
- STP 802.1D: BPDU, puente raíz (menor *Bridge ID*), puertos raíz, designados y bloqueados; 30-50 s; RSTP 802.1w; MSTP 802.1s; BPDU Guard, PortFast.
- VLAN: por puerto, MAC o dinámica; acceso y troncal; VLAN nativa; enrutamiento entre VLAN con *router-on-a-stick* o SVI; LACP 802.1AX; VRRP.

## Fuentes

- IEEE 802 LAN/MAN Standards Committee: https://www.ieee802.org/
- IEEE 802.3 Ethernet Working Group: https://www.ieee802.org/3/
- IEEE 802.3-2022, *Standard for Ethernet*: https://standards.ieee.org/ieee/802.3/10422/
- IEEE 802.3bt-2018, *Power over Ethernet over 4 pairs*: https://standards.ieee.org/ieee/802.3bt/6749/
- IEEE P802.3dj, Ethernet de 200 Gbit/s a 1,6 Tbit/s: https://www.ieee802.org/3/dj/
- IEEE 802.1 Working Group (puentes, VLAN, TSN): https://1.ieee802.org/
- IEEE 802.1Q-2022, *Bridges and Bridged Networks*: https://standards.ieee.org/ieee/802.1Q/10323/
- IEEE 802.1AX-2020, *Link Aggregation*: https://standards.ieee.org/ieee/802.1AX/6768/
- IEEE 802.11 Wireless LAN Working Group: https://www.ieee802.org/11/
- Cisco, *Understanding Rapid Spanning Tree Protocol (802.1w)*: https://www.cisco.com/c/en/us/support/docs/lan-switching/spanning-tree-protocol/24062-146.html
- RFC 7348, VXLAN: https://www.rfc-editor.org/rfc/rfc7348
- RFC 5798, VRRP versión 3: https://www.rfc-editor.org/rfc/rfc5798
- ISO/IEC 11801-1, cableado genérico: https://www.iso.org/standard/66182.html
- Real Decreto 311/2022, Esquema Nacional de Seguridad: https://www.boe.es/eli/es/rd/2022/05/03/311/con
