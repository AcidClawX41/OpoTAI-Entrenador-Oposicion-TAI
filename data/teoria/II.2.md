# II.2 · Periféricos: conectividad, impresión, almacenamiento, visualización y digitalización

Los **periféricos** son los dispositivos que se conectan a la unidad central para **introducir, mostrar, almacenar o comunicar** información. Este tema estudia:

- cómo se **conectan y administran**: interfaces, USB, Thunderbolt, controladores…;
- los **elementos de impresión**: tecnologías, lenguajes y protocolos de impresión, impresión 3D;
- los **elementos de almacenamiento**: discos duros, SSD, RAID, almacenamiento óptico y en cinta, redes de almacenamiento;
- los **elementos de visualización y digitalización**: monitores, interfaces de vídeo, escáneres y conceptos de imagen digital.

Es un tema muy **cambiante**. El tribunal pregunta por velocidades y versiones concretas: USB4, Thunderbolt 3, HDMI 2.1, USB‑PD. Conviene conocer las cifras vigentes en 2026 y también las que se daban por buenas en exámenes anteriores. Entre 2018 y 2025 han caído **31 preguntas**, incluidas 3 de reserva y 1 anulada.

## 1. Periféricos: concepto, clasificación, conectividad y administración

### 1.1 Concepto y clasificación

**Por la dirección de la información**:

- **de entrada**: teclado, ratón, escáner, micrófono, cámara, lector de códigos o de tarjetas, tableta digitalizadora;
- **de salida**: monitor, impresora, altavoces, proyector;
- **de entrada/salida o mixtos**: pantalla táctil, impresora multifunción;
- **de almacenamiento**: discos, unidades ópticas, cintas, memorias USB y tarjetas;
- **de comunicación**: tarjetas de red, módems, adaptadores inalámbricos.

**Por la conexión**: **internos**, en ranuras o conectores de la placa, o **externos**; **cableados** o **inalámbricos**.

**La cadena de conexión** tiene tres piezas que no deben confundirse:

- el **dispositivo** (la unidad de E/S), con su parte **mecánica** y su parte **electrónica**;
- la **controladora**, adaptador o interfaz *hardware*, que traduce entre el bus del sistema y el dispositivo;
- el **controlador** o ***driver***, el *software* del sistema operativo que gobierna a la controladora.

> Pregunta de LI 2024, **anulada**: «Un controlador de dispositivo periférico…». Las opciones mezclaban el sentido *hardware* y el *software* del término.

### 1.2 Interfaces y conectores

| Interfaz | Tipo | Características |
|---|---|---|
| **Serie RS‑232** | Serie, asíncrona | Histórica, por el conector DB‑9 o DB‑25; aún se usa en equipos industriales y de red como puerto de consola |
| **Paralelo IEEE 1284** | Paralelo | Histórica, para impresoras |
| **PS/2** | Serie | Histórica, para teclado y ratón |
| **USB** | Serie | Universal; véase el apartado 1.3 |
| **FireWire (IEEE 1394)** | Serie | 400 Mbit/s (1394a) y 800 Mbit/s (1394b). Se usaba con **videocámaras digitales y discos externos** (LI 2019); hoy está en desuso |
| **Thunderbolt** | Serie (PCIe + DisplayPort por el mismo cable) | Véase el apartado 1.4 |
| **eSATA** | Serie | **SATA externo** para discos. **No** es una salida de audio |
| **Lightning** | Conector propietario de **Apple** (2012) para carga y datos (LI 2023) | Sustituido por **USB‑C** desde el iPhone 15 (2023) |
| **Inalámbricas** | Radio u óptica | **Bluetooth** (corto alcance; perfiles HID, audio…), **Wi‑Fi**, **NFC** (pocos centímetros) e **infrarrojos (IrDA)**, ya en desuso |

### 1.3 USB (Universal Serial Bus)

- Es un bus **serie**, con arquitectura **anfitrión‑dispositivo** (*host/device*) y en **estrella escalonada** mediante concentradores (*hubs*).
  - Admite hasta **127 dispositivos** por controladora, porque las direcciones son de 7 bits.
  - Permite la **conexión en caliente** (*hot‑plug*) y el **Plug and Play**.
  - Los dispositivos se agrupan en **clases** con controladores genéricos: **HID** (teclado y ratón), **almacenamiento masivo**, audio, vídeo, **impresoras**, comunicaciones…

| Especificación | Denominación comercial (USB‑IF) | Velocidad máxima | Año |
|---|---|---|---|
| USB 1.0 / 1.1 | *Low Speed* / *Full Speed* | 1,5 / 12 Mbit/s | 1996 / 1998 |
| **USB 2.0** | *High Speed* | **480 Mbit/s** | 2000 |
| USB 3.0 = USB 3.1 Gen 1 = **USB 3.2 Gen 1** | SuperSpeed USB **5Gbps** | 5 Gbit/s | 2008 |
| USB 3.1 Gen 2 = **USB 3.2 Gen 2** | SuperSpeed USB **10Gbps** | 10 Gbit/s | 2013 |
| **USB 3.2 Gen 2x2** | SuperSpeed USB **20Gbps** | **20 Gbit/s**, con dos carriles y solo con USB‑C | 2017 |
| **USB4** (versión 1.0) | USB4 **40Gbps** | **40 Gbit/s** | 2019 |
| **USB4 versión 2.0** | USB4 **80Gbps** | **80 Gbit/s** con cables certificados de 80 Gbps; hasta 120 Gbit/s en un sentido en modo asimétrico | 2022 |

- **USB4** se basa en el **protocolo Thunderbolt aportado por Intel**. Reparte dinámicamente el enlace entre datos y vídeo (DisplayPort, PCIe) y es **compatible hacia atrás** con USB 3.2, USB 2.0 y Thunderbolt 3.
- **Las respuestas de examen** cambian con el tiempo:
  - en 2021 la velocidad máxima del USB4 era **40 Gbit/s** (LI y PI 2021);
  - hoy, con USB4 v2.0, es **80 Gbit/s**;
  - USB 3.2 **aumenta la velocidad** sobre la versión anterior y llega a **20 Gbit/s** (PI 2019 y LI 2023), no a 40.
- **Conectores**:
  - **Tipo A**, en el anfitrión;
  - **Tipo B**, en dispositivos como las impresoras;
  - **Mini‑USB** y **Micro‑USB**;
  - **USB tipo C**: **reversible**, de 24 contactos, que admite datos, vídeo (*DisplayPort Alt Mode*) y alimentación.

  > **USB‑C es un conector, no una versión**. Un puerto USB‑C puede ser USB 2.0, 3.2 o USB4. «USB tipo C es lo mismo que USB 3.1» era la afirmación **incorrecta** de LI 2023. USB 3.1 Gen 1 y Gen 2 se diferencian solo en la **velocidad**.

**USB Power Delivery (USB PD)**: protocolo de negociación de la **alimentación** por USB‑C.

- Hasta la revisión 3.0, el máximo era **100 W**: 20 V × 5 A. Fue la respuesta de LI 2018.
- La **revisión 3.1** (2021) introduce el **rango de potencia extendido (EPR)**, con 28, 36 y 48 V, y llega a **240 W**. Exige cables USB‑C certificados para 240 W.

### 1.4 Thunderbolt

Lo desarrolló **Intel**, con Apple. Transporta **PCI Express y DisplayPort** por un mismo cable y permite **encadenar** dispositivos.

| Versión | Conector | Velocidad |
|---|---|---|
| Thunderbolt 1 (2011) y 2 (2013) | Mini DisplayPort | 10 / 20 Gbit/s |
| **Thunderbolt 3** (2015) | **USB‑C** | **40 Gbit/s** (LI 2019) |
| Thunderbolt 4 (2020) | USB‑C | 40 Gbit/s, con requisitos mínimos más estrictos |
| **Thunderbolt 5** (2023) | USB‑C | **80 Gbit/s en cada sentido**; hasta **120 Gbit/s** de transmisión con *Bandwidth Boost* (y 40 de recepción); carga de hasta **240 W** |

**Thunderbolt** es una tecnología de interfaz *hardware*, que fue la respuesta de LI 2021. *Thunderbird* es un cliente de correo.

### 1.5 El cargador común de la UE (USB‑C obligatorio)

- La **Directiva (UE) 2022/2380** modifica la directiva de equipos radioeléctricos y la ha transpuesto en España el **RD 442/2024**, que modifica el RD 188/2016. Obliga a que, si se cargan por cable, una serie de dispositivos:
  - lleven un **receptáculo USB tipo C** (norma **EN IEC 62680‑1‑3**);
  - usen **USB Power Delivery** si cargan a más de **5 V, 3 A o 15 W**.
- Los dispositivos afectados son teléfonos móviles, tabletas, cámaras digitales, auriculares, videoconsolas y altavoces portátiles, lectores de libros electrónicos, **teclados, ratones**, navegadores portátiles, auriculares internos y **ordenadores portátiles**.
- Debe ofrecerse la posibilidad de **comprar el equipo sin cargador**, indicándolo con un **pictograma**.
- **Aplicación**: desde el **28‑12‑2024**, y para los **portátiles**, desde el **28‑4‑2026**.

### 1.6 Administración de periféricos

**Controladores** (*drivers*):

- son *software* del sistema operativo, normalmente en **modo núcleo**, que traduce las peticiones genéricas en órdenes de la controladora concreta;
- hay controladores **genéricos o de clase** (USB HID, almacenamiento masivo, impresión sin controlador) y **específicos del fabricante**;
- deben estar **firmados** y **actualizados**, porque son una vía de ataque frecuente.

**Plug and Play (PnP)** y **ACPI**: detección y configuración automáticas de los recursos y gestión de energía.

**Recursos del sistema**:

- **interrupciones (IRQ)**;
- **canales DMA**;
- **direcciones de E/S** y de memoria mapeada.

Hoy se asignan automáticamente; en PCIe, con interrupciones por mensaje (MSI).

**Herramientas**:

- **Windows**: el **Administrador de dispositivos** (`devmgmt.msc`), «Dispositivos e impresoras», `pnputil` y las directivas de grupo para controlar dispositivos extraíbles;
- **Linux**: `lsusb`, `lspci`, `lsblk`, `dmesg`, el subsistema **udev** y los ficheros de dispositivo en `/dev`.

**Gestión en la organización**:

- **inventario** de equipos y periféricos;
- **actualización de firmware**;
- **gestión de consumibles**;
- **impresión gestionada**;
- **control de soportes extraíbles**: bloqueo de USB y cifrado.

En la Administración, el **ENS** prevé medidas como mp.eq.4 (otros dispositivos conectados a la red) y el grupo **mp.si** (marcado, criptografía, custodia, transporte y **borrado y destrucción** de soportes). Véase el tema I.8.

## 2. Elementos de impresión

### 2.1 Tecnologías de impresión

| Tecnología | Funcionamiento | Uso típico |
|---|---|---|
| **Matricial (de impacto)** | Agujas que golpean una cinta entintada | Formularios **autocopiativos** y logística |
| **Inyección de tinta** | Gotas de tinta sobre el papel. **Térmica**: una burbuja de vapor expulsa la gota. **Piezoeléctrica**: un cristal que se deforma. **Gota a demanda** (oficina y hogar) o **chorro continuo** (industrial, marcado) | Doméstica, fotográfica, gran formato (*plotters*) |
| **Láser / LED** (electrofotografía) | Se carga un **tambor** fotoconductor; el láser o los LED «dibujan» la imagen; se adhiere el **tóner** (polvo); se transfiere al papel y el **fusor** lo fija con calor y presión | Oficina; alto volumen y bajo coste por página |
| **Térmica directa** | Papel termosensible que se oscurece con el calor | Tiques y etiquetas |
| **Transferencia térmica** | Una cinta (*ribbon*) se funde sobre el soporte | Etiquetas duraderas, códigos de barras |
| **Sublimación de tinta** | El colorante pasa a gas y penetra en el soporte | Fotografía, tarjetas plásticas |

**Parámetros de una impresora**:

- **resolución** en **ppp** (puntos por pulgada, *dpi*);
- **velocidad** en **ppm** (páginas por minuto) y tiempo de primera página;
- **ciclo de trabajo** mensual;
- **memoria**;
- **dúplex** (impresión a doble cara);
- **coste por página**;
- **conectividad**: USB, Ethernet, Wi‑Fi.

Las **multifunción** (MFP) imprimen, escanean, copian y envían por fax o correo.

**Modelos de color**:

- la impresión es **sustractiva** y usa **CMYK**: cian, magenta, amarillo y negro (*key*);
- la pantalla es **aditiva** y usa **RGB**.

### 2.2 Lenguajes de descripción de página y protocolos de impresión

**Lenguajes de descripción de página (PDL)**:

- **PostScript** (Adobe);
- **PCL** (HP);
- **PDF**, con impresión directa;
- XPS.

El controlador traduce el documento al PDL de la impresora. Las impresoras «GDI» o *host‑based* dependen del procesador del equipo.

**Protocolos de impresión en red**:

| Protocolo | Puerto | Notas |
|---|---|---|
| **IPP** (*Internet Printing Protocol*) | **631** (TCP) | Conjunto de **estándares abiertos** que definen un **protocolo de impresión en red de alto nivel**: trabajos, estado y atributos, sobre **HTTP** (RFC 8010 y 8011). Fue la respuesta de LI 2025. Es la base de la **impresión sin controlador**: IPP Everywhere, AirPrint, Mopria. Su versión segura es **IPPS**, sobre TLS |
| **LPD/LPR** | 515 | Protocolo clásico de UNIX (RFC 1179) |
| **RAW / JetDirect** | 9100 | Envío directo del flujo de datos a la impresora |
| **SMB** | 445 | Impresoras compartidas en redes Windows |

**Administración de la impresión**:

- el **gestor de colas** (*spooler*) almacena los trabajos y los envía en orden: el **servicio de cola de impresión** de Windows y **CUPS** (*Common UNIX Printing System*, basado en IPP) en Linux y macOS;
- los **servidores de impresión** centralizan controladores, colas, cuotas y auditoría;
- la **impresión segura** (*pull printing*) retiene el trabajo hasta que el usuario se identifica en el dispositivo con PIN o tarjeta.

### 2.3 Impresión 3D (fabricación aditiva)

- La **fabricación aditiva** construye objetos **capa a capa** a partir de un modelo digital: STL, 3MF u OBJ, convertido en instrucciones (G‑code) por un *slicer*.
- La norma **ISO/ASTM 52900** clasifica los procesos en **siete categorías**:
  1. **extrusión de material**: FDM o FFF, filamento termoplástico;
  2. **fotopolimerización en cuba**: SLA o DLP, resina curada con luz;
  3. **fusión de lecho de polvo**: SLS, SLM o DMLS, polvo sinterizado o fundido con láser;
  4. **inyección de material** (*material jetting*);
  5. **inyección de aglutinante** (*binder jetting*): un aglutinante une las partículas de polvo. Fue la respuesta de PI 2018;
  6. **deposición de energía dirigida**;
  7. **laminación de hojas**.

> Distractores de PI 2018: el **chorro continuo**, la **inyección térmica** y la **gota a demanda** son técnicas de impresión 2D de **inyección de tinta**.

## 3. Elementos de almacenamiento

### 3.1 Clasificación

**Por la tecnología**:

- **magnética**: disco duro, cinta;
- **electrónica o de estado sólido**: SSD, memorias USB, tarjetas SD;
- **óptica**: CD, DVD, Blu‑ray.

**Por el acceso**:

- **directo o aleatorio**: discos;
- **secuencial**: cinta.

**Por su uso**:

- **primario**: memoria principal;
- **secundario**: discos;
- **terciario o de archivo**: cintas, bibliotecas, almacenamiento óptico de archivo.

### 3.2 Disco duro (HDD)

**Estructura física**:

- **platos** con dos **caras** magnetizables, que giran a velocidad constante: 5.400, 7.200, 10.000 o 15.000 rpm;
- **cabezales** de lectura y escritura en un **brazo actuador** que «vuelan» sobre la superficie.

**Geometría lógica**:

| Elemento | Definición |
|---|---|
| **Cara** | Cada uno de los **lados de un plato** |
| **Pista** | **Circunferencia** concéntrica dentro de una cara |
| **Sector** | **Porción de una pista**: la unidad mínima de lectura y escritura del disco, de **512 bytes** o **4.096 bytes** en el «formato avanzado» |
| **Cilindro** | Conjunto de las pistas que ocupan la **misma posición** en todas las caras |
| **Clúster** (unidad de asignación) | **Grupo de sectores contiguos** que el **sistema de ficheros** asigna como unidad |

> «Sector es cada uno de los lados de un plato» es **falso**, porque eso es una **cara**. Fue la respuesta de LI y PI 2018.

**Direccionamiento**: el antiguo **CHS** (cilindro, cabeza, sector) se ha sustituido por el **LBA** (dirección lógica de bloque).

**Tiempos**:

- **tiempo de búsqueda** (*seek time*): mover el cabezal a la **pista o cilindro** deseado;
- **latencia rotacional**: esperar a que el **sector** deseado pase bajo el cabezal. En promedio es **media vuelta**: a 7.200 rpm, 60/7.200/2 ≈ **4,17 ms**. Fue la respuesta de LI 2025‑ext, frente a los distractores que describían el tiempo de búsqueda;
- **tiempo de transferencia**.

Tiempo de acceso = búsqueda + latencia + transferencia.

**Tecnologías de grabación**:

- **perpendicular** (PMR/CMR);
- **solapada** (**SMR**): más densidad, pero escrituras aleatorias lentas;
- **asistida por calor** (**HAMR**) o por microondas;
- **discos rellenos de helio**: menos rozamiento y más platos.

**Comparación con los SSD**:

- el HDD es **más lento**, tiene **partes móviles**, es sensible a golpes y es más ruidoso;
- tiene **menor coste por gigabyte**: el SSD tiene una **relación precio/capacidad más alta**, que fue la respuesta de PI 2018.

### 3.3 Unidad de estado sólido (SSD)

**SSD** = *Solid State Drive*: dispositivo de almacenamiento en **memoria no volátil**, **flash NAND**, **sin partes móviles**. Fue la respuesta de LI 2021, LI 2025 y PI 2025.

**Componentes**:

- chips de **NAND flash**, hoy apilados en vertical (**3D NAND**);
- una **controladora**, que gestiona la traducción de direcciones (FTL), la **nivelación del desgaste** (*wear leveling*), la recolección de basura, la **ECC** y el cifrado;
- a menudo, una caché DRAM.

**Tipos de celda** según los bits por celda:

| Tipo | Bits por celda | Características |
|---|---|---|
| **SLC** | 1 | La más rápida y duradera, y la más cara |
| **MLC** | 2 | — |
| **TLC** | 3 | La más extendida |
| **QLC** | 4 | Más capacidad y menos durabilidad |

A más bits, más capacidad y menos velocidad y durabilidad.

**Características**:

- **acceso casi instantáneo**: latencias de microsegundos frente a milisegundos;
- **resistencia a golpes**, silencio y bajo consumo;
- **durabilidad limitada** en escrituras, que se mide en **TBW** (terabytes escritos) o **DWPD** (escrituras completas por día);
- el sistema operativo envía la orden **TRIM** para avisar de los bloques libres.

**Interfaces y protocolos**:

- **SATA**: limitada a unos **600 MB/s**;
- **SAS**: entornos de servidor;
- **NVMe** (*Non‑Volatile Memory Express*): protocolo diseñado para flash sobre **PCI Express**, con miles de colas paralelas y latencia mínima.

**Formatos**:

- **2,5 pulgadas**;
- **M.2**: tarjeta de 22 mm de ancho y longitudes 2242, 2260 o **2280**, que puede ser **SATA o NVMe**. Fue la respuesta de LI 2024, frente a los inventados «HHP», «MMVe» y «MMD»;
- **U.2** y **E1.S**, en servidores;
- tarjeta PCIe.

**Interfaz no válida para SSD**: **DVI**, que es una interfaz de **vídeo**. Sí lo son **SAS, SATA y PCIe** (LI 2019).

### 3.4 Interfaces de almacenamiento

| Interfaz | Tipo | Velocidad |
|---|---|---|
| **ATA / IDE (PATA)** | **Paralelo**, histórico | Hasta 133 MB/s |
| **SATA** (*Serial ATA*) | **Serie**, la respuesta de LI 2023 | 1,5, 3 y **6 Gbit/s** (SATA III) |
| **SCSI** | Paralelo (clásico) | Servidores, histórico |
| **SAS** (*Serial Attached SCSI*), la respuesta de la reserva de PI 2021 | Serie | 12 y 22,5 Gbit/s («24G»); admite discos SATA |
| **NVMe sobre PCIe** | Serie | Según la generación PCIe y el número de carriles (x4 en SSD) |
| **Fibre Channel / iSCSI / NVMe‑oF** | Redes de almacenamiento | Acceso a bloques remotos (SAN) |

> **DLT** es un formato de **cinta**, no una interfaz de disco.

### 3.5 RAID (*Redundant Array of Independent Disks*)

| Nivel | Técnica | Mínimo de discos | Tolera | Capacidad útil |
|---|---|---|---|---|
| **RAID 0** | **Reparto** (*striping*) sin redundancia | 2 | **0 fallos** | n discos |
| **RAID 1** | **Espejo** (*mirroring*): duplicado síncrono | 2 | n − 1 (en un espejo de 2, 1 fallo) | 1 disco |
| RAID 2 | Reparto a nivel de **bit** con código Hamming | — | Obsoleto | — |
| RAID 3 | Reparto a nivel de **byte** con **paridad dedicada** | 3 | 1 | n − 1 |
| **RAID 4** | Reparto por **bloques** con **un** disco de **paridad dedicado** | 3 | 1 | n − 1 |
| **RAID 5** | Reparto por bloques con **paridad distribuida** | **3** | **1 fallo** (LI 2025) | n − 1 |
| **RAID 6** | Reparto con **doble paridad distribuida** | **4** | **2 fallos simultáneos** | n − 2 |
| **RAID 10 (1+0)** | **Espejos** y, sobre ellos, **reparto** | **4** | Al menos 1, y hasta uno por espejo | n/2 |
| RAID 01 (0+1) | Reparto y, sobre él, espejo | 4 | Menos robusto que el 10 | n/2 |

- **Afirmaciones incorrectas** que han caído:
  - «RAID 4 con **dos** discos de paridad dedicados» es falso: tiene **uno** (LI 2023);
  - «RAID 6 funciona con un **mínimo de tres** discos y tolera **un solo** fallo» es falso: necesita **4** y tolera **2** (LI 2025‑ext).
- El RAID puede ser por **hardware**, con una controladora dedicada, o por **software**, gestionado por el sistema operativo.
- Un **disco de reserva** (*hot spare*) entra automáticamente al fallar otro.
- **El RAID no es una copia de seguridad**: protege frente al **fallo del disco**, no frente al borrado, el *ransomware* o un desastre.

### 3.6 Almacenamiento óptico, en cinta y extraíble

**Óptico**: se lee con láser. Cuanto **menor es la longitud de onda**, mayor es la densidad.

| Soporte | Capacidad | Láser |
|---|---|---|
| CD | Unos 700 MB | Infrarrojo, 780 nm |
| DVD | 4,7 GB (una capa) y 8,5 GB (doble capa) | Rojo, 650 nm |
| Blu‑ray | 25 GB por capa (50 GB en doble capa; BDXL de 100 o 128 GB) | Azul‑violeta, 405 nm |

Variantes: ‑ROM (solo lectura), ±R (una escritura) y ±RW o RE (regrabable).

**Cinta magnética LTO** (*Linear Tape‑Open*):

- es **secuencial**, de **bajo coste por TB** y **gran durabilidad**;
- se usa para **copias de seguridad** y archivo a largo plazo, en bibliotecas robotizadas;
- es un soporte **desconectable**, útil frente al *ransomware*;
- **LTO‑9** tiene **18 TB nativos**, y **LTO‑10** (2025), **30 TB nativos** (75 TB comprimidos).

**Flash extraíble**:

- **memorias USB**;
- **tarjetas SD**: SD hasta 2 GB, **SDHC** hasta 32 GB, **SDXC** hasta 2 TB y **SDUC** hasta 128 TB, con clases de velocidad;
- microSD.

### 3.7 Almacenamiento en red

- **DAS** (*Direct Attached Storage*): conectado directamente al servidor.
- **NAS** (*Network Attached Storage*): servidor de ficheros en red. Acceso **a nivel de fichero** mediante **NFS** o **SMB/CIFS**.
- **SAN** (*Storage Area Network*): red dedicada con acceso **a nivel de bloque** mediante **Fibre Channel**, **iSCSI** o NVMe‑oF. Los servidores ven los volúmenes (LUN) como discos locales.
- **Almacenamiento de objetos**: acceso por API HTTP, con el modelo **S3**. Es habitual en la nube.

## 4. Elementos de visualización

### 4.1 Tecnologías de pantalla

**LCD** (cristal líquido): necesita **retroiluminación**, hoy LED. Tipos de **panel**:

- **TN** (*Twisted Nematic*): rápido y barato, con peores ángulos y color;
- **IPS** (*In‑Plane Switching*): **mejor color y ángulos de visión**. Fue la respuesta de la reserva de LI 2024;
- **VA** (*Vertical Alignment*): **mayor contraste**.

> «VN», «TA» o «PSI» no son tipos de panel.

**Mini‑LED**: retroiluminación LCD con muchas zonas (cientos o miles) de **atenuación local**.

**OLED**: cada píxel **emite su propia luz**. Tiene **negros perfectos**, contraste infinito y respuesta muy rápida, con riesgo de **marcado** (*burn‑in*). Una variante es el QD‑OLED.

**MicroLED**: autoemisivo inorgánico, todavía caro.

**Tinta electrónica** (*e‑ink*): refleja la luz y solo consume al cambiar la imagen. Se usa en lectores de libros.

**Proyectores**:

- tecnologías **DLP** (microespejos), **LCD** y **LCoS**;
- el brillo se mide en **lúmenes ANSI**.

### 4.2 Parámetros de un monitor

- **Tamaño**: la **diagonal**, en **pulgadas**. **Formato**: 16:9, 16:10 o 21:9.
- **Resolución**:

| Nombre | Píxeles |
|---|---|
| HD (720p) | 1280 × 720 |
| **Full HD** (1080p) | **1920 × 1080** |
| **WQHD / QHD** (1440p) | **2560 × 1440** |
| **4K UHD** | **3840 × 2160** |
| 4K DCI (cine) | 4096 × 2160 |
| **8K UHD** | **7680 × 4320** |

> En la reserva de LI 2024 la única correcta era **WQHD 2560 × 1440**. «HD 1920 × 1080» es Full HD, no HD. 8K UHD es 7680 × **4320**, no × 3840.

- **Densidad**: píxeles por pulgada (**ppi**).
- **Frecuencia de refresco**: en **Hz**, 60, 120, 144 o 240. La **frecuencia variable** (VRR: FreeSync, G‑Sync, HDMI VRR) elimina el desgarro de la imagen.
- **Tiempo de respuesta**: en **ms**, gris a gris.
- **Brillo**: en **cd/m²** (*nits*).
- **Contraste**: estático o dinámico. **HDR**: HDR10, HDR10+, Dolby Vision o HLG.
- **Profundidad de color**:
  - **8 bits por canal**: 16,7 millones de colores;
  - **10 bits**: unos 1.070 millones.
- **Gama de color**: sRGB, DCI‑P3, Adobe RGB o Rec. 2020.

### 4.3 Interfaces de vídeo

| Interfaz | Señal | Ancho de banda |
|---|---|---|
| **VGA** (DE‑15) | **Analógica** | — (en desuso) |
| **DVI** | DVI‑A analógica, **DVI‑D digital**, DVI‑I ambas | Hasta unos 8 Gbit/s en enlace doble |
| **HDMI** | **Digital**: vídeo, audio y control (CEC); protección HDCP | **1.4**: 10,2 Gbit/s · **2.0**: 18 Gbit/s · **2.1**: **48 Gbit/s** (cable *Ultra High Speed*; LI 2025) · **2.2** (2025): **96 Gbit/s** (cable *Ultra96*) |
| **DisplayPort** (VESA) | Digital; transmite por paquetes y permite encadenar monitores (MST) | **1.4**: 32,4 Gbit/s · **2.1**: hasta **80 Gbit/s** (UHBR20) |
| **USB‑C** (*DisplayPort Alt Mode*) / **Thunderbolt** | Digital | Según la versión |

> **HDMI no es analógico** (LI 2019). La **conexión por cable** a la tele o al proyector se hace hoy por HDMI. «P.Link» no es un estándar.

## 5. Elementos de digitalización

### 5.1 Conceptos de digitalización

**Digitalizar** es convertir una señal **analógica** (imagen, sonido) en **digital** mediante dos operaciones:

- **muestreo**: tomar valores a intervalos regulares. El **teorema de Nyquist‑Shannon** exige muestrear a **más del doble** de la frecuencia máxima de la señal. Por eso el audio de CD usa 44,1 kHz;
- **cuantificación**: asignar a cada muestra un valor de entre 2ⁿ niveles, con n bits.

**Imagen digital**: matriz de **píxeles**.

- **Resolución**: número de píxeles, o **densidad** en **ppp** (puntos por pulgada) o **ppi** (píxeles por pulgada). La **resolución de un escáner** se mide así, y fue la respuesta de PI 2024.
- **Profundidad de color**: **bits por píxel**. Con **1 bit** hay **2 colores** (blanco y negro), y fue la respuesta de LI 2019. Con 8 bits hay 256 niveles de gris o colores indexados; con **24 bits**, unos **16,7 millones** de colores (8 por canal RGB).

  > No hay que confundir resolución con profundidad: la profundidad **no** es «la capacidad de reproducir tonos grises».

- **Tamaño del fichero sin comprimir**: ancho × alto × bits por píxel / 8.

  > **A más píxeles, más resolución y ficheros más grandes**, no más pequeños (PI 2024).

**Modelos de color**:

| Modelo | Componentes |
|---|---|
| **RGB** | Rojo, verde, azul; aditivo, para pantallas |
| **CMYK** | **Cian, magenta, amarillo y negro (*key*)**; sustractivo, para impresión. No es «CRYK» con rojo (LI 2019) |
| **HSB / HSV** | **Tono** (*hue*), **saturación** y **brillo** o valor; no «compresión» (LI 2019) |
| HSL | Tono, saturación y luminosidad |
| CIELAB | Modelo independiente del dispositivo |
| YCbCr | Luminancia y crominancia; vídeo y JPEG |

### 5.2 Escáneres y otros dispositivos de captura

**Tipos de escáner**:

- **plano** (*flatbed*);
- **con alimentador automático** (ADF) y **de alimentación de hojas** (*sheet‑fed*), para producción documental, a menudo **dúplex**;
- **de tambor**: máxima calidad, con fotomultiplicadores;
- **de mano**;
- **cenital o de libros**: para documentos encuadernados y patrimonio.

**Sensores**:

- **CCD**: más calidad y profundidad de campo;
- **CIS** (*Contact Image Sensor*): más compacto y barato.

**Resolución óptica e interpolada**: la **óptica** es la real del sensor; la **interpolada** se calcula por *software* y no añade detalle.

**Reconocimiento**:

- **OCR**: reconocimiento óptico de caracteres impresos;
- **ICR**: caracteres manuscritos;
- **OMR**: marcas, como las de las plantillas de examen;
- **HTR**: texto manuscrito con inteligencia artificial;
- **códigos de barras y QR**.

**Interfaces de *software***: **TWAIN**, **WIA** (Windows), **SANE** (Linux) y el escaneo sin controlador (eSCL).

**Otros dispositivos de captura**: cámaras digitales (sensores **CMOS**), cámaras de documentos, tabletas digitalizadoras y lectores de tarjetas o de DNI electrónico.

**Formatos de salida**:

- **TIFF** (sin pérdida, archivo);
- **PNG**;
- **JPEG** (con pérdida);
- **PDF y PDF/A**, que admiten imágenes, también de documentos escaneados.

> «Solo TIFF y JPEG sirven para guardar una imagen digitalizada» es **falso** (PI 2024). En la Administración, la **NTI de digitalización** exige al menos **200 ppp** y formatos del catálogo de estándares (véase el tema I.8).

## Normativa y estándares clave

| Norma o estándar | Qué regula | Puntos clave |
|---|---|---|
| **USB‑IF**: USB 2.0, USB 3.2, **USB4 (v2.0)**, **USB PD 3.1** e **IEC 62680** | Bus USB y alimentación | 480 Mbit/s; 5, 10 y 20 Gbit/s; USB4 de **40 y 80 Gbit/s**; PD de hasta **100 W y, con EPR, 240 W** |
| **Directiva (UE) 2022/2380** y **RD 442/2024** (modifica el RD 188/2016) | Cargador común | USB‑C (EN IEC 62680‑1‑3) y USB PD si se superan 15 W; desde el 28‑12‑2024, y para los portátiles desde el 28‑4‑2026 |
| **Thunderbolt** (Intel) | Interfaz PCIe y DisplayPort | TB3 y TB4: 40 Gbit/s; **TB5: 80 / 120 Gbit/s**, 240 W |
| **HDMI** (HDMI Forum) y **DisplayPort** (VESA) | Vídeo digital | HDMI 2.1: **48 Gbit/s**; HDMI 2.2: 96 Gbit/s; DP 2.1: 80 Gbit/s |
| **SATA**, **SAS**, **NVMe**, **M.2** | Almacenamiento | SATA III a 6 Gbit/s; SAS a 12 y 22,5 Gbit/s; NVMe sobre PCIe; M.2 2280 |
| **IPP** (RFC 8010 y 8011) | Impresión en red | Puerto 631; base de la impresión sin controlador |
| **ISO/ASTM 52900** | Fabricación aditiva | 7 categorías, entre ellas la inyección de aglutinante |
| **LTO** | Cinta | LTO‑9: 18 TB; LTO‑10: 30 TB nativos |

## Lo que más cae en el examen

**31 preguntas** entre 2018 y 2025: 23 en ingreso libre y 8 en promoción interna, incluidas 3 de reserva y 1 anulada. Predominan las **cifras y definiciones**:

| Concepto | Preguntas | Exámenes |
|---|---|---|
| **SSD**: memoria no volátil sin partes móviles; relación precio/capacidad más alta que el HDD | 4 | PI 2018, LI 2021, LI 2025, PI 2025 |
| **RAID**: RAID 4 con un disco de paridad, RAID 6 con 4 discos y 2 fallos, RAID 5 tolera 1 fallo | 3 | LI 2023, LI 2025‑ext, LI 2025 |
| **USB**: USB4 a 40 Gbit/s (2021); USB 3.2 hasta 20 Gbit/s; USB‑C no es una versión | 4 | PI 2019, LI 2021, PI 2021, LI 2023 |
| **Geometría del disco duro** (el sector no es una cara) | 2 | LI 2018, PI 2018 |
| **Thunderbolt**: es una interfaz; TB3 a 40 Gbit/s | 2 | LI 2019, LI 2021 |
| **Digitalización**: 1 bit = 2 colores; HSB; CMYK; resolución del escáner en ppp/ppi | 2 | LI 2019, PI 2024 |
| **Interfaces de almacenamiento**: SATA es serie; DVI no vale para SSD; M.2; SAS | 4 | LI 2019, LI 2023, LI 2024, PI 2021 (reserva) |
| **USB‑PD**: 100 W (hoy 240 W con PD 3.1) | 1 | LI 2018 |
| **HDMI 2.1**: 48 Gbit/s | 1 | LI 2025 |
| **IPP**: protocolo de impresión en red de alto nivel | 1 | LI 2025 |
| **Latencia rotacional** | 1 | LI 2025‑ext |
| **Impresión 3D**: inyección de aglutinante | 1 | PI 2018 |
| **Conexiones**: FireWire para videocámaras y discos; HDMI no es analógico | 1 | LI 2019 |
| **Lightning** (Apple) | 1 | LI 2023 |
| **Pantallas**: resolución WQHD; panel IPS | 2 (reserva) | LI 2024 |
| Controlador de dispositivo (anulada) | 1 | LI 2024 |

## Trampas habituales

- **Cifras que han cambiado**:
  - **USB4**: 40 Gbit/s en la v1 (respuesta de 2021) y **80 Gbit/s** en la v2.0;
  - **USB PD**: **100 W** hasta la revisión 3.0 (respuesta de 2018) y **240 W** con la 3.1 (EPR);
  - **HDMI**: 2.1 a **48** Gbit/s y 2.2 a **96**;
  - **Thunderbolt**: 3 y 4 a **40** Gbit/s y 5 a **80/120**.

  Hay que leer bien a qué versión se refiere la pregunta.
- **USB‑C es un conector**, no una velocidad. USB 3.0 = 3.1 Gen 1 = 3.2 Gen 1 (5 Gbit/s); 3.1 Gen 2 = 3.2 Gen 2 (10 Gbit/s); **3.2 Gen 2x2 = 20 Gbit/s**. USB 2.0 = **480 Mbit/s**.
- **Thunderbolt** (interfaz) frente a *Thunderbird* (correo). **Lightning** (Apple) frente a «iUSB» o «iFirewire», que no existen.
- **Geometría del disco**: **cara** = lado del plato; **pista** = circunferencia; **sector** = porción de pista; **cilindro** = pistas alineadas; **clúster** = grupo de sectores (sistema de ficheros).
- **Latencia rotacional**: espera a que llegue el **sector**, que en promedio es media vuelta. **Tiempo de búsqueda**: mover el cabezal a la **pista o cilindro**.
- **RAID 5**: mínimo **3** discos y tolera **1** fallo. **RAID 6**: mínimo **4** y tolera **2**. **RAID 10**: mínimo **4**. **RAID 0** no tolera fallos. **RAID 4** tiene **una** paridad dedicada. El RAID **no sustituye** a la copia de seguridad.
- **SSD**: «Solid State **Drive**», con **memoria no volátil**, no volátil ni de discos magnéticos. Tiene un **precio por GB más alto** que el HDD y **es más rápido** en lectura y escritura.
- **SATA es serie**; **ATA/IDE** y el **SCSI** clásico son **paralelos**; **SAS** = *Serial Attached **SCSI***. **DLT** es una cinta.
- **M.2** es un **formato** (factor de forma) que puede ir por SATA o por NVMe. **NVMe** es el **protocolo**; **PCIe**, el **bus**.
- **DVI** y **HDMI** son de vídeo y no valen para SSD. **eSATA** es para discos externos, no para audio.
- **Resoluciones**: **HD** = 1280 × 720; **Full HD** = 1920 × 1080; **WQHD** = 2560 × 1440; **4K UHD** = 3840 × 2160; **8K UHD** = 7680 × 4320.
- **Paneles LCD**: TN, **IPS** y **VA**. Los «VN», «TA» o «PSI» son inventados.
- **Digitalización**:
  - la resolución se mide en **ppp/ppi**; la profundidad, en **bits por píxel**: 1 bit = 2 colores;
  - **HSB** = tono, saturación y **brillo**;
  - **CMYK** = cian, **magenta**, amarillo y **negro**;
  - a más resolución, **ficheros mayores**.
- **Impresión 3D** (aditiva: aglutinante, extrusión, polvo, resina…) frente a **inyección de tinta 2D** (térmica, piezoeléctrica, gota a demanda, chorro continuo).
- **IPP**: protocolo de **impresión en red** (puerto 631), no un formato de fichero ni un conector.
- **Controlador** (*driver*, *software*) frente a **controladora** (*hardware*).

## Repaso rápido

- Periféricos de entrada, salida, entrada/salida, almacenamiento y comunicación. Cadena: dispositivo → controladora → controlador (*driver*).
- USB: 1.1 (12 Mbit/s), 2.0 (480 Mbit/s), 3.2 Gen 1, 2 y 2x2 (5, 10 y 20 Gbit/s), USB4 (40 Gbit/s) y USB4 v2.0 (80 Gbit/s). Hasta 127 dispositivos; clases HID y de almacenamiento masivo.
- USB‑C es un conector reversible. USB PD llega a 100 W, o a 240 W con la 3.1 EPR. El USB‑C es obligatorio en la UE desde el 28‑12‑2024, y en los portátiles desde el 28‑4‑2026 (RD 442/2024).
- Thunderbolt: el 3 y el 4 a 40 Gbit/s por USB‑C; el 5 a 80 Gbit/s, 120 con *Bandwidth Boost*, y 240 W.
- Administración: controladores firmados, PnP y ACPI, IRQ, DMA y E/S, Administrador de dispositivos, `lsusb`, `lspci` y udev; control de soportes (ENS mp.si).
- Impresoras: matricial, inyección (térmica o piezoeléctrica; gota a demanda o chorro continuo), láser (tambor, tóner, fusor), térmica y sublimación. Parámetros: ppp, ppm, ciclo de trabajo y coste por página.
- PDL: PostScript, PCL y PDF. Protocolos: IPP (631), LPD (515), RAW (9100) y SMB. Gestor de colas y CUPS.
- Impresión 3D (ISO/ASTM 52900): extrusión, cuba, lecho de polvo, inyección de material, inyección de aglutinante, energía dirigida y laminación.
- HDD: platos, caras, pistas, sectores (512 B o 4 KiB), cilindros y clústeres. Búsqueda + latencia (media vuelta) + transferencia. CMR, SMR y HAMR.
- SSD: NAND (SLC, MLC, TLC, QLC), controladora, nivelación del desgaste, TRIM y TBW. Interfaces SATA, SAS y NVMe/PCIe; formatos M.2, 2,5" y U.2.
- RAID: 0 (sin redundancia), 1 (espejo), 5 (mínimo 3, tolera 1), 6 (mínimo 4, tolera 2), 10 (mínimo 4).
- Óptico: CD (700 MB), DVD (4,7 GB) y Blu‑ray (25 GB por capa, láser de 405 nm). Cinta LTO‑9 (18 TB) y LTO‑10 (30 TB). Tarjetas SD, SDHC, SDXC y SDUC.
- DAS, NAS (fichero: NFS y SMB), SAN (bloque: FC e iSCSI) y almacenamiento de objetos (S3).
- Pantallas: LCD (TN, IPS, VA), Mini‑LED, OLED y *e‑ink*. Resoluciones de HD a 8K. Refresco en Hz, respuesta en ms, brillo en nits, HDR.
- Vídeo: VGA (analógico), DVI, HDMI (2.1 a 48 Gbit/s y 2.2 a 96) y DisplayPort (2.1 a 80 Gbit/s).
- Digitalización: muestreo (Nyquist) y cuantificación; ppp o ppi; profundidad (1 bit = 2 colores, 24 bits ≈ 16,7 M); RGB, CMYK y HSB; escáneres CCD y CIS; OCR, ICR y OMR; TWAIN.

## Fuentes

- [USB‑IF: USB4 (hasta 80 Gbps)](https://www.usb.org/usb4)
- [USB‑IF: USB Power Delivery (hasta 240 W)](https://www.usb.org/usb-charger-pd)
- [Directiva (UE) 2022/2380, cargador común (EUR-Lex)](https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX:32022L2380)
- [Real Decreto 188/2016, modificado por el RD 442/2024 (BOE)](https://www.boe.es/buscar/act.php?id=BOE-A-2016-4444)
- [Intel: Thunderbolt 5, resumen técnico (2023)](https://intel.com/content/dam/www/central-libraries/us/en/documents/2023-09/thunderbolt-5-technology-brief.pdf)
- [HDMI Forum: especificación HDMI 2.2](https://www.hdmi.org/spec/hdmi2)
- [VESA: actualización de DisplayPort 2.1 y cables DP80](https://www.displayport.org/pr/vesa-to-update-displayport-2-1-with-new-active-cable-specification-for-up-to-3x-longer-dp80-cables/)
- [RFC 8011, Internet Printing Protocol/1.1: modelo y semántica (IETF)](https://www.rfc-editor.org/rfc/rfc8011)
- [LTO Program: presentación de la generación 10 (nota de prensa)](https://www.businesswire.com/news/home/20250813251001/en/The-LTO-Program-Introduces-Generation-10-of-Leading-Tape-Technology-Delivering-Unparalleled-Media-Density)
