# II.1 · Informática básica, representación de la información y arquitectura de ordenadores

Este tema abre el bloque técnico. Reúne:

- los **conceptos básicos de la informática**;
- la **representación de la información**: sistemas de numeración, enteros, coma flotante, caracteres y unidades;
- su **comunicación**;
- los **elementos de un sistema de información**;
- la **arquitectura de ordenadores**: Von Neumann, Harvard, CPU, ciclo de instrucción, CISC y RISC, paralelismo y jerarquía de memoria;
- los **componentes internos** de un equipo microinformático: placa base, procesador, memoria, buses, firmware y expansión.

Es un tema de **conceptos estables**, pero el tribunal exige **precisión técnica**. Por ejemplo, distingue el kilobyte (10³ bytes) del kibibyte (2¹⁰ bytes), el registro de instrucción del contador de programa o la caché L1 de la L3. Entre 2018 y 2025 han caído **27 preguntas**, incluidas 3 de reserva.

## 1. Informática básica: conceptos fundamentales

- **Informática**: ciencia del **tratamiento automático de la información** mediante ordenadores. La palabra procede del francés *informatique* (información + automática).
- **Dato e información**:
  - el **dato** es la representación simbólica (números, caracteres, señales) de un hecho;
  - la **información** es el dato **procesado e interpretado** en un contexto, que reduce la incertidumbre de quien lo recibe.
- **Ordenador**: máquina electrónica **programable** que recibe datos (**entrada**), los **almacena**, los **procesa** según las instrucciones de un **programa** y entrega resultados (**salida**).
- **Hardware y software**:
  - el **hardware** son los componentes físicos;
  - el **software** son los programas y datos. Puede ser **de sistema** (sistema operativo, controladores, utilidades), **de programación** (compiladores, intérpretes, entornos) o **de aplicación**.
  - El **firmware** es software grabado en memoria no volátil del propio hardware, por ejemplo la BIOS o UEFI.
- **Programa**: secuencia ordenada de **instrucciones** que la máquina ejecuta.
  - El **código máquina** es binario y específico de cada arquitectura.
  - El **ensamblador** es su representación simbólica (mnemónicos).
  - Los **lenguajes de alto nivel** se **compilan** o se **interpretan**.
- **Generaciones de ordenadores**, por la tecnología de conmutación:
  1. válvulas de vacío;
  2. transistores;
  3. circuitos integrados;
  4. microprocesadores (desde 1971, con el Intel 4004);
  5. paralelismo e inteligencia artificial, según la clasificación más extendida.
- **Ley de Moore** (1965, revisada en 1975): el número de transistores por circuito integrado se **duplica aproximadamente cada dos años**.

## 2. Representación de la información

### 2.1 Unidades de información

- **Bit** (*binary digit*): unidad mínima. Toma el valor **0 o 1**.
- **Nibble** (o cuarteto): **4 bits**. Es justo un dígito hexadecimal y fue la respuesta de PI 2023.
- **Byte**: **8 bits**. En normas internacionales se usa también **octeto** para evitar ambigüedades históricas.
- **Palabra**: número de bits que la CPU maneja de una vez: 16, 32 o 64. Suele coincidir con el tamaño de los registros de propósito general.

**Múltiplos**: hay **dos sistemas** y no deben confundirse.

| Prefijo SI (decimal) | Valor | Prefijo IEC (binario) | Valor |
|---|---|---|---|
| kilo (**k**) | 10³ = 1.000 | **kibi (Ki)** | 2¹⁰ = 1.024 |
| mega (M) | 10⁶ | **mebi (Mi)** | 2²⁰ = 1.048.576 |
| giga (G) | 10⁹ | **gibi (Gi)** | 2³⁰ |
| tera (T) | 10¹² | **tebi (Ti)** | 2⁴⁰ |
| peta (P) | 10¹⁵ | **pebi (Pi)** | 2⁵⁰ |
| exa (E) | 10¹⁸ | **exbi (Ei)** | 2⁶⁰ |
| zetta (Z) | 10²¹ | **zebi (Zi)** | 2⁷⁰ |
| yotta (Y) | 10²⁴ | **yobi (Yi)** | 2⁸⁰ |
| **ronna (R)** | 10²⁷ | — | — |
| **quetta (Q)** | 10³⁰ | — | — |

- Los prefijos **binarios** los aprobó la **IEC en diciembre de 1998** (enmienda a la IEC 60027‑2). Hoy los recoge la **IEC 80000‑13**.
  - **No forman parte del SI**.
  - Se forman con las dos primeras letras del prefijo SI más «bi», y el símbolo añade una «i».
  - Por coherencia, el símbolo de kibi es **Ki**, con mayúscula. El kilo del SI es **k**, minúscula.
- **Ronna y quetta**, con sus submúltiplos **ronto (10⁻²⁷) y quecto (10⁻³⁰)**, se incorporaron al SI en **2022**. Por eso la unidad «mayor» ya no es el yottabyte, que fue la respuesta de LI 2019, sino el **quettabyte**.
- **Usos reales**:
  - los fabricantes de **discos** usan prefijos **decimales**: un disco de 1 TB tiene 10¹² bytes, que son unas **931 GiB**;
  - la **memoria RAM** se fabrica en potencias de dos, y por tradición se etiqueta en «GB» con valor binario;
  - las **velocidades de transmisión** son siempre **decimales**: 1 Gbit/s = 10⁹ bit/s;
  - Windows muestra valores binarios con símbolos del SI («GB»). Por eso un disco «pierde» capacidad aparente.
- **Bit frente a byte**: **b** minúscula es bit y **B** mayúscula es byte. 100 Mbit/s equivalen a **12,5 MB/s**.

### 2.2 Sistemas de numeración

Un sistema **posicional de base b** usa b símbolos. Cada dígito pesa una potencia de b según su posición:

- **Decimal** (base 10).
- **Binario** (base 2): 0 y 1.
- **Octal** (base 8): de 0 a 7. Cada dígito equivale a **3 bits**.
- **Hexadecimal** (base 16): de **0 a 9 y de A a F**, donde A = 10 y F = 15. Cada dígito equivale a **4 bits** (un nibble).

**Conversiones**:

- **De base b a decimal**: suma de cada dígito por su peso. Por ejemplo, 1C9₁₆ = 1·256 + 12·16 + 9 = **457**, que fue la respuesta de LI 2018.
- **De decimal a base b**: divisiones sucesivas entre b, leyendo los restos al revés. Por ejemplo, 450₁₀ = **111000010₂** = **702₈** = **1C2₁₆**, la respuesta de la reserva de PI 2024. Los distractores 764₈ y 1F4₁₆ valen **500**, y 407₈ vale 263.
- **Entre binario, octal y hexadecimal**: agrupando bits de 3 en 3 (octal) o de 4 en 4 (hexadecimal) desde la derecha. Por ejemplo, 1101 0110₂ = **D6₁₆**.
- **Fracciones**: multiplicaciones sucesivas por la base. Muchas fracciones decimales no tienen representación binaria finita. Por ejemplo, 0,1₁₀ es periódica en binario, y de ahí los errores de redondeo en coma flotante.

> Pregunta típica: qué palabra es un número hexadecimal válido. Solo valen las letras **A–F**: «ACCEDA» sí lo es, que fue la respuesta de LI 2024; «BECADAS» (S), «CEGADA» (G) y «EBOCA» (O) no.

### 2.3 Representación de números enteros

Con **n bits**:

| Representación | Rango | Observaciones |
|---|---|---|
| **Sin signo** | 0 … 2ⁿ − 1 | 8 bits: 0 a 255 |
| **Signo y magnitud** | −(2ⁿ⁻¹ − 1) … +(2ⁿ⁻¹ − 1) | El bit de mayor peso es el signo; hay **dos ceros** (+0 y −0) |
| **Complemento a uno (C1)** | −(2ⁿ⁻¹ − 1) … +(2ⁿ⁻¹ − 1) | El negativo se obtiene **invirtiendo** todos los bits; también hay **dos ceros** |
| **Complemento a dos (C2)** | **−2ⁿ⁻¹ … +(2ⁿ⁻¹ − 1)** | El negativo se obtiene invirtiendo y **sumando 1**; **un solo cero**; la resta es una suma. Es la que usan los ordenadores. 8 bits: −128 a 127 |
| **Exceso a K** (sesgada) | −K … 2ⁿ − 1 − K | Se almacena el valor + K; se usa en los **exponentes** de coma flotante |

- **Ejemplo en C2** (8 bits): +5 = 0000 0101, así que −5 = 1111 1010 + 1 = **1111 1011** (FB₁₆).
- **Desbordamiento** (*overflow*): el resultado no cabe en n bits. En C2 se detecta cuando el acarreo que entra en el bit de signo es distinto del que sale. Por ejemplo, al sumar dos positivos sale un negativo.
- **BCD** (*Binary Coded Decimal*): cada **dígito decimal** se codifica en **4 bits** (de 0000 a 1001; las combinaciones de 1010 a 1111 no se usan).
  - En el BCD **empaquetado** caben dos dígitos por byte, y en el formato decimal de IBM el último nibble lleva el signo.
  - Se usa en aplicaciones financieras porque evita los errores de conversión decimal‑binario.
- **Orden de los bytes** (*endianness*):
  - **big‑endian**: primero el byte más significativo; es el orden de red de los protocolos de Internet;
  - **little‑endian**: primero el menos significativo; lo usan **x86** y la mayoría de sistemas **ARM** actuales.

### 2.4 Coma flotante: IEEE 754

- El número se representa como **(−1)^s · M · 2^E**, con **signo**, **exponente** (en exceso o sesgo) y **mantisa** o significando. En la forma **normalizada** el significando es **1,f** y el «1» es **implícito**: el bit oculto no se almacena.
- La norma vigente es **IEEE 754‑2019** (*Standard for Floating‑Point Arithmetic*), adoptada también como ISO/IEC 60559. Sustituye a la de **2008**, que fue la que citó PI 2024. Define formatos **binarios y decimales**, las operaciones, el redondeo y las excepciones.

| Formato | Bits | Signo | Exponente | Fracción | Sesgo | Precisión aproximada |
|---|---|---|---|---|---|---|
| **binary16** (media precisión) | 16 | 1 | 5 | 10 | 15 | ≈ 3 dígitos decimales |
| **binary32** (**simple**) | **32** | 1 | **8** | **23** | **127** | ≈ 7 dígitos; hasta ≈ 3,4·10³⁸ |
| **binary64** (**doble**) | **64** | 1 | **11** | **52** | **1023** | ≈ 15–16 dígitos; hasta ≈ 1,8·10³⁰⁸ |
| **binary128** (cuádruple) | 128 | 1 | 15 | 112 | 16383 | ≈ 34 dígitos |

- **Valores especiales**:
  - exponente con **todos los bits a 1** y fracción 0: **±infinito**;
  - exponente con todos los bits a 1 y fracción distinta de 0: **NaN** (*Not a Number*);
  - exponente **0** y fracción 0: **±0**;
  - exponente 0 y fracción distinta de 0: números **subnormales** (desnormalizados), que permiten un subdesbordamiento gradual.
- **Ejemplo** en simple precisión: 5,75 = 101,11₂ = 1,0111₂ · 2².
  - Signo 0.
  - Exponente 2 + 127 = 129 = 1000 0001.
  - Fracción 0111 0…0.
  - Resultado: **40B8 0000₁₆**. El 1,0 es 3F80 0000₁₆.
- **Doble precisión** = **aproximación de 64 bits** de un número real. Era la respuesta de PI 2024; los distractores eran 32 bits, decimal empaquetado y entero de 4 bytes.

### 2.5 Representación de caracteres

| Código | Bits | Características |
|---|---|---|
| **ASCII** (ANSI X3.4, 1963‑1968; equivale a ISO 646) | **7** (128 códigos) | Del 0 al 31 y el 127 son **caracteres de control**; el **32** es el espacio; del **48 al 57**, los dígitos del 0 al 9; del **65 al 90**, la A a la Z; del **97 al 122**, la a a la z. Las mayúsculas y las minúsculas difieren solo en el bit de valor 32 |
| **ASCII extendido** y páginas de códigos | 8 (256) | Variantes incompatibles entre sí, como CP437 o **Windows‑1252** |
| **ISO/IEC 8859‑1** (Latin‑1) / **8859‑15** (Latin‑9) | 8 | Alfabetos de Europa occidental (ñ, á, ç…). La 8859‑15 añade el **€** |
| **EBCDIC** (IBM) | 8 | Grandes sistemas IBM; no es compatible con ASCII |
| **Unicode** / ISO/IEC 10646 | — | **Repertorio universal**: cada carácter tiene un **punto de código** entre **U+0000 y U+10FFFF**. Son **17 planos** de 65.536 puntos, 1.114.112 en total; el plano 0 es el **BMP**. La versión vigente es **Unicode 18.0** (16‑9‑2026), con **172.808 caracteres** |

**Formas de codificación de Unicode**:

- **UTF‑8**: longitud **variable de 1 a 4 bytes** (RFC 3629).
  - Es **compatible con ASCII**: los caracteres del 0 al 127 ocupan 1 byte idéntico.
  - Ejemplos: «A» = 41; «ñ» = C3 B1 (2 bytes); «€» = E2 82 AC (3 bytes); un emoji fuera del BMP ocupa **4 bytes**.
  - Es la codificación dominante en la web y en los formatos JSON y CSV modernos.
- **UTF‑16**: **2 o 4 bytes**. Fuera del BMP usa **pares sustitutos** (*surrogates*). Lo usan internamente Windows, Java y JavaScript.
- **UTF‑32**: **4 bytes fijos** por carácter.
- **BOM** (*Byte Order Mark*, U+FEFF): marca opcional al inicio del fichero que indica la codificación o el orden de los bytes.

### 2.6 Lógica binaria y álgebra de Boole

| a | b | NOT a | AND | OR | **XOR** | NAND | NOR | **XNOR** |
|---|---|---|---|---|---|---|---|---|
| 0 | 0 | 1 | 0 | 0 | 0 | 1 | 1 | 1 |
| 0 | 1 | 1 | 0 | 1 | **1** | 1 | **0** | **0** |
| 1 | 0 | 0 | 0 | 1 | 1 | 1 | 0 | 0 |
| 1 | 1 | 0 | 1 | 1 | **0** | **0** | 0 | **1** |

- **XOR** vale 1 cuando las entradas son **distintas**; **XNOR**, cuando son **iguales**.
- **NAND** y **NOR** son **puertas universales**: con cualquiera de ellas se construye cualquier función lógica.
- **Leyes de De Morgan**: ¬(a·b) = ¬a + ¬b, y ¬(a + b) = ¬a · ¬b.
- Ejemplos de examen:
  - con a = 0 y b = 1, «a NOR b = 1» es **falso**, porque vale 0 (LI 2019);
  - con a = b = 1, la única correcta es «a XNOR b = 1» (PI 2019).
- Los circuitos son:
  - **combinacionales**, cuya salida depende solo de las entradas: sumadores, multiplexores, decodificadores;
  - **secuenciales**, que tienen memoria: biestables (*flip‑flops*), registros y contadores.

### 2.7 Detección y corrección de errores

- **Paridad**: un bit añadido hace par o impar el número de unos. **Detecta** errores de un bit, pero no los corrige.
- **Suma de comprobación** (*checksum*) y **CRC**: detectan errores en bloques. El CRC se usa en redes, almacenamiento y ficheros ZIP o PNG.
- **Código de Hamming**: **corrige** errores de un bit y detecta los dobles (SECDED). Es la base de la **memoria ECC** de los servidores.

## 3. Comunicación de la información

- **Modelo de Shannon** (1948): fuente → **emisor** (codificador) → **canal**, afectado por el **ruido** → **receptor** (decodificador) → destino. Para que haya comunicación, emisor y receptor deben compartir el **código**.
- **Cantidad de información**: un suceso de probabilidad p aporta −log₂ p bits. La **entropía** es la información media de una fuente.
- **Velocidad de transmisión**:
  - se mide en **bit/s**, con prefijos decimales;
  - la **velocidad de modulación** se mide en **baudios**, símbolos por segundo;
  - si cada símbolo lleva n bits, bit/s = baudios · n.
- **Capacidad de un canal con ruido** (Shannon‑Hartley): C = B · log₂(1 + S/N).
- **Ancho de banda** del canal (B): intervalo de frecuencias que deja pasar.
- **Tipos de transmisión**:
  - **serie** (un bit tras otro) o **paralelo** (varios a la vez);
  - **símplex**, **semidúplex** (*half‑duplex*) o **dúplex** (*full‑duplex*);
  - **síncrona** o **asíncrona**.

  Los buses modernos son casi siempre **serie**: PCIe, SATA, USB.
- **Codificación de canal**: añade redundancia para detectar o corregir errores, como en el apartado anterior. Ejemplos son la codificación 8b/10b de SATA y las primeras generaciones de PCIe, o la 128b/130b de PCIe 3.0 a 5.0.

## 4. Elementos constitutivos de un sistema de información: características y funciones

- **Sistema de información**: conjunto **organizado** de elementos que **recogen (o capturan), almacenan, procesan y distribuyen** información para apoyar las **operaciones, el control y la toma de decisiones** de una organización.
- Un **sistema informático** es la parte tecnológica (hardware, software y comunicaciones). Un sistema de información puede existir sin ordenadores, pero hoy casi siempre se apoya en ellos.
- **Elementos constitutivos**:
  - **personas**: usuarios finales y personal técnico, como analistas, programadores y administradores;
  - **datos e información**: la materia prima y el producto;
  - **procedimientos y actividades**: normas y métodos de trabajo, incluidos los de seguridad;
  - **recursos tecnológicos**: **hardware**, **software** (de base y de aplicación) y **redes y comunicaciones**.
- **Funciones** (el ciclo del tratamiento de la información):
  1. **entrada** o captura;
  2. **almacenamiento**;
  3. **procesamiento** (cálculo, clasificación, agregación);
  4. **salida** o distribución;
  5. **retroalimentación** y control, que permite corregir el funcionamiento.
- **Características** deseables de la información y del sistema:
  - **exactitud** o fiabilidad;
  - **oportunidad**, es decir, estar disponible cuando se necesita;
  - **relevancia**;
  - **integridad** (completitud);
  - **economía**;
  - **seguridad**, que en la Administración se concreta en las dimensiones del ENS: confidencialidad, integridad, trazabilidad, autenticidad y disponibilidad.

  Un sistema de información tiene también **objetivo**, **límites** con su entorno y **subsistemas** interrelacionados.
- **Tipos según el nivel de la organización**:
  - **transaccionales u operativos** (TPS): registran las operaciones diarias;
  - **de información para la gestión** (MIS);
  - **de apoyo a la decisión** (DSS) y **para directivos** (EIS);
  - **sistemas integrados** como **ERP** (planificación de recursos), **CRM** (relación con clientes) o **SCM** (cadena de suministro);
  - **inteligencia de negocio** (BI) y almacenes de datos (*data warehouse*).

## 5. Arquitectura de ordenadores

### 5.1 Arquitectura de Von Neumann y arquitectura Harvard

- **Von Neumann** (descrita en 1945, en el borrador del informe sobre la EDVAC):
  - el concepto de **programa almacenado**: instrucciones y datos comparten la **misma memoria** y el **mismo bus**;
  - unidades: **CPU** (unidad de control, ALU y registros), **memoria principal**, **unidades de entrada/salida** y **buses** que las conectan;
  - ejecución **secuencial** de instrucciones;
  - su limitación es el **cuello de botella de Von Neumann**: instrucciones y datos compiten por el mismo bus.
- **Harvard**:
  - **memorias y buses separados** para **instrucciones** y para **datos**, que pueden leerse a la vez;
  - es típica de **microcontroladores** y procesadores de señal (DSP);
  - fue la respuesta de una pregunta de reserva de LI y PI 2021.
- **Harvard modificada**: los procesadores actuales son Von Neumann hacia la memoria principal, pero tienen **cachés L1 separadas** de instrucciones y datos.

![Comparación de arquitecturas: en Von Neumann la CPU (unidad de control, ALU y registros), la memoria principal con instrucciones y datos juntos y la entrada/salida comparten un único bus del sistema de datos, direcciones y control; en Harvard hay una memoria de instrucciones y otra de datos, cada una con su propio bus hacia la CPU](diagramas/II.1-von-neumann.svg)

*Figura: un bus compartido (Von Neumann) frente a dos memorias y dos buses (Harvard).*

### 5.2 La unidad central de proceso (CPU)

**Unidad de control (UC)**: busca las instrucciones en memoria, las **decodifica** y genera las **señales de control** que coordinan al resto. Puede ser:

- **cableada** (*hardwired*), típica de RISC;
- **microprogramada**, típica de CISC.

**Unidad aritmético‑lógica (ALU)**: realiza las operaciones **aritméticas** (suma, resta…) y **lógicas** (AND, OR, NOT, comparaciones, desplazamientos). **Forma parte de la CPU**, que fue la respuesta de LI 2023. Existe además una **FPU** para la coma flotante.

**Registros** (la memoria más rápida, dentro de la CPU):

| Registro | Contenido |
|---|---|
| **Contador de programa (PC)** | **Dirección** de la **siguiente instrucción** que se va a ejecutar (LI 2018) |
| **Registro de instrucción (IR)** | La **instrucción que se está ejecutando** (LI 2025‑ext) |
| **Registro de dirección de memoria (MAR)** | Dirección de la posición a la que se accede |
| **Registro de datos de memoria (MDR o MBR)** | Dato leído o que se va a escribir |
| **Acumulador** y registros de propósito general | Operandos y resultados |
| **Registro de estado** (*flags*) | Indicadores de cero (Z), acarreo (C), signo (N) y desbordamiento (V), entre otros |
| **Puntero de pila (SP)** | Cima de la pila: llamadas a subrutinas e interrupciones |

**Ciclo de instrucción**:

1. **Búsqueda** (*fetch*): el PC pasa al MAR; la memoria devuelve la instrucción al MDR, de ahí pasa al IR, y el PC se incrementa.
2. **Decodificación**.
3. **Búsqueda de operandos**.
4. **Ejecución** en la ALU.
5. **Escritura** del resultado.
6. **Comprobación de interrupciones**.

**Tipos de instrucciones**:

- **transferencia** de datos;
- **aritméticas**;
- **lógicas**;
- **desplazamiento y rotación**;
- **control de flujo o de salto**: **condicionales**, **incondicionales** y **llamada y retorno de subrutinas**;
- **entrada/salida**;
- **control** del sistema.

> Los **desplazamientos** no son instrucciones de salto: fue la respuesta de PI 2018.

**Modos de direccionamiento**: **inmediato** (el operando está en la instrucción), **directo**, **indirecto**, **por registro**, **indexado** y **relativo** al PC.

### 5.3 CISC y RISC

| | **CISC** (*Complex Instruction Set Computer*) | **RISC** (*Reduced Instruction Set Computer*) |
|---|---|---|
| Juego de instrucciones | **Amplio y complejo**, de longitud **variable** | **Reducido y simple**, de longitud **fija** |
| Modos de direccionamiento | Muchos | Pocos |
| Acceso a memoria | Muchas instrucciones operan sobre memoria | Arquitectura ***load/store***: solo cargar y almacenar acceden a memoria |
| Unidad de control | **Microprogramada**, rasgo esencial (LI 2023) | **Cableada**; las instrucciones se implementan directamente en hardware |
| Registros | Pocos | **Muchos** |
| Ciclos por instrucción | Varios | Aproximadamente **1**, gracias a la **segmentación** |
| Ejemplos | **x86** (Intel y AMD) y x86‑64 | **ARM**, **RISC‑V**, MIPS, PowerPC, SPARC |

- **ARM** es una arquitectura **RISC** avanzada, que fue la respuesta de LI 2021. Domina en **móviles y tabletas** por su **bajo consumo**, y hoy también está presente en portátiles y servidores. ARM no fabrica: **licencia** su arquitectura y sus diseños.
- **RISC‑V** es un juego de instrucciones RISC **abierto y libre de licencias**.
- Los x86 actuales **traducen internamente** sus instrucciones CISC a **microoperaciones** de tipo RISC, de modo que la frontera es hoy menos nítida.

### 5.4 Paralelismo y rendimiento

**Paralelismo a nivel de instrucción**:

- **Segmentación** (*pipeline*): varias instrucciones en distintas etapas a la vez. Sufre **riesgos** (*hazards*):
  - **estructurales**;
  - **de datos**;
  - **de control**, por los saltos, que se mitigan con la **predicción de saltos**.
- **Superescalar**: varias unidades de ejecución que lanzan varias instrucciones por ciclo.
- **Ejecución fuera de orden** y **especulativa**.
- **VLIW**: el compilador agrupa instrucciones paralelas.

**Paralelismo a nivel de hilo y de proceso**:

- **multinúcleo**: varios núcleos en un chip;
- **SMT** (*Simultaneous Multithreading*; en Intel, *Hyper‑Threading*): un núcleo ejecuta varios hilos;
- **multiprocesadores** y **clústeres**.

**Taxonomía de Flynn** (Michael J. Flynn, 1966): clasifica las arquitecturas **según el número de flujos de instrucciones y de datos**. Se preguntó en LI y PI 2024.

| Clase | Flujos | Ejemplo |
|---|---|---|
| **SISD** | 1 instrucción, 1 dato | Monoprocesador clásico de Von Neumann |
| **SIMD** | 1 instrucción, varios datos | Procesadores **vectoriales**, **GPU**, extensiones SSE, AVX o NEON |
| **MISD** | Varias instrucciones, 1 dato | Poco común: sistemas tolerantes a fallos, sistólicos |
| **MIMD** | Varias instrucciones, varios datos | **Multinúcleo**, multiprocesadores y clústeres |

Los sistemas MIMD pueden ser de **memoria compartida**, con acceso uniforme (UMA o SMP) o no uniforme (**NUMA**), o de **memoria distribuida**, con paso de mensajes.

**Medidas de rendimiento**:

- **frecuencia de reloj** (Hz, ciclos por segundo);
- **CPI** (ciclos por instrucción) e **IPC** (instrucciones por ciclo);
- **MIPS**: millones de instrucciones por segundo;
- **FLOPS**: **operaciones de coma flotante por segundo**. Es la unidad de potencia de cálculo y fue la respuesta de LI 2018 y PI 2023.

  Los superordenadores más potentes superan desde 2022 el **exaFLOPS** (10¹⁸).

- **Tiempo de CPU** = número de instrucciones × CPI × duración del ciclo.
- **Ley de Amdahl**: la mejora global está limitada por la fracción que no se acelera. La aceleración es 1 / ((1 − p) + p/n), donde p es la fracción paralelizable y n el número de procesadores.

### 5.5 Jerarquía de memoria

Ordenada de **más rápida, cara y pequeña** a **más lenta, barata y grande**:

**registros → caché L1 → L2 → L3 → memoria principal (RAM) → almacenamiento secundario (SSD, HDD) → almacenamiento terciario (cinta, óptico)**

Fue la respuesta de PI 2019.

![Pirámide de la jerarquía de memoria con siete niveles de arriba abajo: registros, cachés L1, L2 y L3, memoria principal DRAM, almacenamiento secundario SSD y HDD y almacenamiento terciario de cinta y óptico; hacia arriba es más rápida, cara por bit y pequeña, y hacia abajo más lenta, barata y grande](diagramas/II.1-jerarquia-memoria.svg)

*Figura: jerarquía de memoria con el tamaño típico de cada nivel.*

- Se basa en el **principio de localidad**:
  - **temporal**: lo usado recientemente se volverá a usar;
  - **espacial**: se usará lo que está cerca.

**Memoria caché**: memoria **SRAM** rápida entre la CPU y la RAM.

| Nivel | Ubicación | Características |
|---|---|---|
| **L1** | **Dentro de cada núcleo**, separada en instrucciones y datos | **La más rápida y la más pequeña**, decenas de KiB (LI 2025) |
| **L2** | Normalmente por núcleo | Algo más lenta y mayor, de cientos de KiB a pocos MiB |
| **L3** | **Compartida** por los núcleos del chip | Más lenta y mucho mayor, varios MiB o más |

- **Correspondencia**:
  - **directa**: cada bloque solo puede ir a una línea;
  - **totalmente asociativa**: a cualquier línea;
  - **asociativa por conjuntos**: a cualquier línea de un conjunto.
- **Reemplazo**: LRU, FIFO o aleatorio.
- **Escritura**:
  - ***write‑through***: se escribe a la vez en la caché y en la memoria;
  - ***write‑back***: se escribe en memoria al expulsar el bloque.
- **Acierto y fallo** (*hit/miss*): tiempo medio de acceso = tiempo de acierto + tasa de fallos × penalización por fallo.

**Memoria principal (RAM)**: **volátil**, pierde el contenido sin alimentación (PI 2021).

- La **DRAM** guarda cada bit en un **condensador**, necesita **refresco** periódico, es densa y barata, y se usa como **memoria principal**.
- La **SRAM** usa **biestables** (unos 6 transistores por bit), no necesita refresco, es rápida y cara, y se usa como **caché**.
- **SDRAM DDR**: transfiere en **ambos flancos** del reloj.
  - Generaciones: **DDR, DDR2, DDR3, DDR4 y DDR5**. Cada una es incompatible física y eléctricamente con las demás.
  - **DDR5** la publicó JEDEC (norma JESD79‑5) en **julio de 2020**. Arrancó en **4.800 MT/s**, divide cada módulo en **dos subcanales independientes** e incorpora **ECC en el propio chip** (*on‑die*).
  - La velocidad se expresa en **MT/s** (megatransferencias por segundo).
- **Doble o cuádruple canal**: varios módulos accedidos en paralelo.
- **ECC**: módulos con corrección de errores, propios de servidores.
- **Formatos de módulo**: **DIMM** para sobremesa y **SO‑DIMM** para portátiles. En los portátiles finos la memoria suele ir **soldada**, por ejemplo la LPDDR.

**Memoria virtual**: la **MMU** (*Memory Management Unit*) traduce **direcciones lógicas a físicas** mediante **paginación**. Usa una **TLB**, la caché de traducciones. Permite usar el disco como extensión de la RAM. Se estudia con los sistemas operativos (tema II.4).

**Memorias de solo lectura y no volátiles**:

| Tipo | Programación y borrado |
|---|---|
| **ROM** (de máscara) | Grabada en fábrica; no se modifica |
| **PROM** | Programable **una sola vez** por el usuario |
| **EPROM** | Borrable con **luz ultravioleta** (no infrarroja) y reprogramable |
| **EEPROM** | Borrable y reprogramable **eléctricamente**, byte a byte (LI 2018) |
| **Flash** | Variante de EEPROM que se borra **por bloques**; es la base de los SSD, las memorias USB y el firmware |

### 5.6 Buses y entrada/salida

- El **bus del sistema** **transfiere datos, direcciones y señales de control** entre la **CPU, la memoria y los periféricos**. Fue la respuesta de LI y PI 2025.
  - **Bus de datos**: su anchura determina los bits transferidos a la vez.
  - **Bus de direcciones**: con n líneas se direccionan **2ⁿ posiciones**. Con 32 bits, 4 GiB.
  - **Bus de control**: lectura y escritura, reloj, interrupciones, *reset*.
- Los buses **paralelos compartidos** clásicos se han sustituido por **enlaces serie punto a punto**: **PCI Express**, los enlaces entre procesador y chipset, y los buses internos entre núcleos.
- **Técnicas de E/S**:
  - **programada** o por sondeo (*polling*): la CPU espera;
  - **por interrupciones**: el periférico avisa;
  - **DMA** (*Direct Memory Access*): un controlador transfiere bloques entre el periférico y la memoria **sin intervención de la CPU**, que solo recibe una interrupción al final.

## 6. Componentes internos de los equipos microinformáticos

### 6.1 Placa base

- Es el circuito impreso principal que **interconecta** todos los componentes.
- **Formatos** más comunes:
  - **ATX** (305 × 244 mm);
  - **microATX** (244 × 244 mm);
  - **Mini‑ITX** (170 × 170 mm).
- **Elementos de la placa base**:
  - **zócalo (*socket*) del procesador**: **LGA**, con los pines en la placa (típico de Intel y AMD AM5), **PGA**, con los pines en el procesador, o **BGA**, soldado, en portátiles;
  - **chipset**: gestiona la comunicación entre el procesador y el resto. Antes se dividía en **puente norte** (memoria y gráficos, hoy integrados en la CPU) y **puente sur** (E/S). Hoy es un único chip, que Intel llama **PCH**;
  - **ranuras de memoria** (DIMM);
  - **ranuras de expansión PCI Express** y conectores **M.2**;
  - conectores **SATA** y de alimentación (ATX de 24 pines y EPS de 12 V para la CPU);
  - **firmware** (BIOS o UEFI) en memoria flash;
  - **pila de botón**, que alimenta el **reloj de tiempo real (RTC)** y la configuración guardada en la memoria **CMOS**;
  - **reloj** o generador de frecuencias;
  - **reguladores de tensión (VRM)**;
  - controladores integrados de **red**, **sonido** y **USB**;
  - **TPM**, el módulo de plataforma segura.

> Distractor de LI 2019: el «chip EAC» no es un componente de la placa base. El zócalo, el chipset y el reloj sí lo son.

### 6.2 Procesador

- **Núcleos e hilos**: hoy son habituales los **diseños híbridos**, con núcleos de alto rendimiento y núcleos eficientes.
- **Frecuencia base y turbo**, **caché L1, L2 y L3** y **TDP** (potencia térmica de diseño), que determina la refrigeración necesaria: disipador, ventilador o refrigeración líquida.
- **Gráficos integrados (iGPU)** y, cada vez más, **NPU** (unidad de procesamiento neuronal) para inteligencia artificial.
- **Arquitecturas**: **x86‑64** (AMD64 o Intel 64) en PC y servidores, y **ARM** en móviles, en los Mac con Apple Silicon y en parte de los portátiles con Windows y de los servidores.

### 6.3 Firmware: BIOS y UEFI

- La **BIOS** (*Basic Input/Output System*) es el firmware clásico.
  - Ejecuta el **POST** (autodiagnóstico de arranque).
  - Inicializa el hardware.
  - Carga el gestor de arranque desde el **MBR**.
  - Tiene limitaciones: modo de 16 bits y discos de hasta 2 TiB con MBR.
- La **UEFI** (*Unified Extensible Firmware Interface*) es su sustituta.
  - Arranca desde particiones **GPT**, que admite discos de más de 2 TiB.
  - Ofrece **arranque seguro (*Secure Boot*)**, que solo carga cargadores firmados.
  - Tiene una interfaz gráfica y controladores propios.
  - Puede emular la BIOS mediante el **CSM** (módulo de compatibilidad).
- El **TPM 2.0** es un chip criptográfico o firmware que guarda claves y mide la integridad del arranque. Lo usan BitLocker y la credencial de Windows Hello, y **Windows 11** lo exige junto con UEFI con Secure Boot.

### 6.4 Buses y conexiones de expansión internas

**PCI Express (PCIe)** es un bus **serie, punto a punto**, con **carriles** (*lanes*): x1, x4, x8 y x16. Las tarjetas gráficas usan x16 y los SSD NVMe, x4.

| Generación | Velocidad por carril | Codificación | Ancho de banda aproximado x16 (por sentido) |
|---|---|---|---|
| 3.0 | 8 GT/s | 128b/130b | ≈ 16 GB/s |
| 4.0 | 16 GT/s | 128b/130b | ≈ 32 GB/s |
| 5.0 | 32 GT/s | 128b/130b | ≈ 64 GB/s |
| 6.0 | 64 GT/s | **PAM4** y FLIT | ≈ 128 GB/s |
| 7.0 (2025) | **128 GT/s** | PAM4 y FLIT | ≈ 256 GB/s (512 GB/s bidireccional) |
| 8.0 (anunciada en 2025, prevista para 2028) | 256 GT/s | — | ≈ 1 TB/s bidireccional |

Cada generación **duplica** la anterior y es **compatible hacia atrás**.

**Otras conexiones internas**:

- **SATA**: almacenamiento, con 1,5, 3 o 6 Gbit/s; SATA III da unos 600 MB/s útiles.
- **M.2**: formato de tarjeta para SSD, **SATA o NVMe sobre PCIe**, y para Wi‑Fi.
- **U.2**: SSD NVMe de servidor.

Se estudian con los periféricos (tema II.2).

### 6.5 Otros componentes internos

- **Fuente de alimentación (PSU)**: convierte la corriente alterna en continua de 12, 5 y 3,3 V. Su eficiencia se certifica con el sello **80 PLUS**.
- **Tarjeta gráfica (GPU)**: procesador masivamente paralelo, de tipo SIMD, con memoria propia (VRAM, GDDR). También se usa para inteligencia artificial y cálculo científico.
- **Almacenamiento interno**: SSD y HDD (tema II.2).
- **Tarjetas de red, de sonido y de captura**, integradas o en ranura.
- **Refrigeración**: disipadores, ventiladores, pasta térmica y refrigeración líquida.

## Normativa y estándares clave

| Norma o estándar | Qué regula | Puntos clave |
|---|---|---|
| **Sistema Internacional de Unidades** (BIPM; resolución de la 27.ª CGPM, 2022) | Prefijos decimales | De kilo (k) a **quetta (Q, 10³⁰)**; **ronna (R, 10²⁷)** y quetta desde 2022 |
| **IEC 80000‑13** (antes IEC 60027‑2, 1998‑2000) | Prefijos binarios | **kibi (Ki) = 2¹⁰** … **yobi (Yi) = 2⁸⁰**; no son unidades SI |
| **IEEE 754‑2019** (ISO/IEC 60559) | Aritmética en coma flotante | Simple (32 bits: 1+8+23; sesgo 127), doble (64 bits: 1+11+52; sesgo 1023); ±∞, NaN y subnormales |
| **ASCII** (ANSI X3.4) e **ISO/IEC 8859** | Codificación de caracteres de 7 y 8 bits | ASCII de 128 caracteres; Latin‑1 y Latin‑9 (€) |
| **Unicode 18.0** / ISO/IEC 10646 y **RFC 3629** (UTF‑8) | Juego universal de caracteres | De U+0000 a U+10FFFF (17 planos); UTF‑8 de 1 a 4 bytes, compatible con ASCII |
| **JEDEC JESD79‑5** (DDR5, 2020) | Memoria SDRAM | 4.800 MT/s iniciales; dos subcanales por módulo; ECC *on‑die* |
| **PCI Express** (PCI‑SIG) | Bus de expansión serie | 8 GT/s (3.0) → 128 GT/s (7.0, 2025) → 256 GT/s (8.0, prevista para 2028) |
| **UEFI** (UEFI Forum) y **TPM 2.0** (ISO/IEC 11889) | Firmware y raíz de confianza | GPT, Secure Boot; requisito de Windows 11 |

## Lo que más cae en el examen

**27 preguntas** entre 2018 y 2025: 16 en ingreso libre y 11 en promoción interna, incluidas 3 de reserva. Son preguntas **conceptuales y breves**:

| Concepto | Preguntas | Exámenes |
|---|---|---|
| **Registros de la CPU**: el contador de programa guarda la dirección de la siguiente instrucción; el registro de instrucción, la instrucción en curso | 2 | LI 2018, LI 2025‑ext |
| **Unidad de potencia**: FLOPS (operaciones de coma flotante por segundo) | 2 | LI 2018, PI 2023 |
| **Taxonomía de Flynn**: flujos de instrucciones y datos | 2 | LI 2024, PI 2024 |
| **Arquitectura Harvard**: memorias separadas de datos e instrucciones | 2 (reserva) | LI 2021, PI 2021 |
| **Bus del sistema**: datos, direcciones y control entre CPU, memoria y periféricos | 2 | LI 2025, PI 2025 |
| **Puertas lógicas** (XOR, XNOR, NOR, NAND) | 2 | LI 2019, PI 2019 |
| **Conversión de bases** (1C9₁₆ = 457; 450₁₀ = 111000010₂) | 2 | LI 2018, PI 2024 (reserva) |
| **Hexadecimal válido** (solo A–F) | 1 | LI 2024 |
| **Nibble** = 4 bits | 1 | PI 2023 |
| **Unidad de almacenamiento mayor** (yottabyte entre las opciones; hoy existen ronna y quetta) | 1 | LI 2019 |
| **IEEE 754**: doble precisión = 64 bits | 1 | PI 2024 |
| **ARM** = arquitectura RISC | 1 | LI 2021 |
| **CISC**: la microprogramación es esencial | 1 | LI 2023 |
| **ALU** forma parte de la CPU | 1 | LI 2023 |
| **Caché L1**: en el núcleo, la más rápida y la más pequeña | 1 | LI 2025 |
| **Jerarquía de memoria**: registros > caché > RAM > disco | 1 | PI 2019 |
| **Memoria volátil**: DRAM | 1 | PI 2021 |
| **Tipos de ROM**: EEPROM se borra eléctricamente; EPROM con ultravioleta | 1 | LI 2018 |
| **Instrucciones de salto** (los desplazamientos no lo son) | 1 | PI 2018 |
| **Componentes de la placa base** (el «chip EAC» no existe) | 1 | LI 2019 |

## Trampas habituales

- **k frente a Ki**: 1 kB = **1.000** bytes (SI) y 1 KiB = **1.024** bytes (IEC). Los prefijos binarios **no son del SI**. El símbolo del kilo es **k minúscula**; el de kibi, **Ki**.
- **Unidad mayor**: desde 2022 existen **ronna (10²⁷)** y **quetta (10³⁰)**. Si no aparecen entre las opciones, la mayor sigue siendo **yotta**.
- **b frente a B**: Mbit/s frente a MB/s. Hay que dividir entre 8.
- **Nibble** = 4 bits: es el término que espera el tribunal, frente a «half‑byte» o «quartet» como distractores. **Byte** = 8 bits. **Palabra** = depende de la arquitectura.
- **Contador de programa (PC)**: guarda la **dirección** de la **siguiente** instrucción, no la instrucción. **Registro de instrucción (IR)**: guarda la **instrucción en curso**.
- **ALU**: está en la **CPU**, no en la memoria ni en un bus.
- **CISC**: es el modelo **microprogramado**, con instrucciones complejas. «Instrucciones implementadas directamente en hardware», «juego reducido» y «propio de móviles por su bajo consumo» describen **RISC/ARM**.
- **Harvard**: tiene **dos** memorias (instrucciones y datos), no tres. **No** es un tipo de Von Neumann.
- **Flynn** clasifica **arquitecturas paralelas por flujos de instrucciones y datos**. No es una clasificación de patrones de diseño, de técnicas de IA ni de *drivers* JDBC.
- **FLOPS**: operaciones de **coma flotante** por segundo, no instrucciones por segundo (eso son los MIPS) ni la frecuencia (Hz).
- **Caché L1**: en el núcleo, la más rápida y la más pequeña. La **L3** es la mayor y es **compartida**.
- **DRAM** es volátil y necesita refresco; **SRAM** es volátil y no lo necesita. La **flash** y la **EEPROM** **no** son volátiles.
- **EPROM** se borra con **ultravioleta**, no con infrarrojos. **PROM** se programa **una sola vez**. **EEPROM** se borra **eléctricamente**. La «EPPROM» no existe.
- **Complemento a dos**: el rango es **asimétrico**: de −128 a +127 con 8 bits, con un único cero. Signo y magnitud y C1 tienen **dos ceros**.
- **IEEE 754**: simple = **32** bits (8 de exponente); doble = **64** bits (**11** de exponente y 52 de fracción). El bit oculto **no se almacena**. **NaN** no es igual ni siquiera a sí mismo.
- **ASCII es de 7 bits** (128 caracteres), no de 8. **UTF‑8** usa de **1 a 4** bytes (no hasta 6) y es compatible con ASCII.
- **Hexadecimal**: solo hay dígitos del 0 al 9 y letras de la A a la F. Hay que agrupar de 4 en 4 bits (en octal, de 3 en 3).
- **Bus de direcciones**: n líneas direccionan 2ⁿ posiciones. 32 bits son 4 GiB, no 4 GB decimales.
- **DMA**: transfiere **sin la CPU**. No hay que confundirla con las interrupciones.
- **PCIe**: es serie y por carriles, y cada generación duplica la anterior. La 7.0 llega a **128 GT/s** por carril.

## Repaso rápido

- Bit, nibble (4 bits), byte (8 bits), palabra (según la arquitectura).
- SI decimal (k, M, G… hasta quetta, 10³⁰) frente a IEC binario (Ki, Mi, Gi… hasta Yi, 2⁸⁰). Discos y redes usan decimal; la RAM, binario.
- Bases: binaria, octal (3 bits), hexadecimal (4 bits, dígitos A–F). 1C9₁₆ = 457; 450₁₀ = 111000010₂ = 702₈ = 1C2₁₆.
- Enteros: el C2 es el estándar, con rango de −2ⁿ⁻¹ a 2ⁿ⁻¹ − 1 y un solo cero. El BCD codifica cada dígito en 4 bits.
- IEEE 754‑2019: simple (32 bits; 1/8/23; sesgo 127) y doble (64 bits; 1/11/52; sesgo 1023); ±∞, NaN y subnormales.
- Caracteres: ASCII (7 bits), Latin‑1 y Latin‑9 (8 bits), EBCDIC (IBM) y Unicode 18.0 (hasta U+10FFFF), con UTF‑8, UTF‑16 y UTF‑32.
- Boole: XOR (distintos → 1), XNOR (iguales → 1), NAND y NOR universales, leyes de De Morgan.
- Errores: la paridad detecta; Hamming corrige un bit (memoria ECC); el CRC detecta errores en bloques.
- Shannon: emisor, canal, ruido y receptor; bit/s = baudios × bits por símbolo; C = B·log₂(1 + S/N).
- Sistema de información: personas, datos, procedimientos y tecnología; funciones de entrada, almacenamiento, proceso, salida y control.
- Von Neumann: programa almacenado y memoria única, con su cuello de botella. Harvard: memorias separadas de instrucciones y datos.
- CPU: UC (cableada o microprogramada), ALU y registros (PC, IR, MAR, MDR, estado, SP); ciclo de búsqueda, decodificación y ejecución.
- CISC (x86, microprogramado, instrucciones variables) frente a RISC (ARM, RISC‑V; *load/store*, longitud fija, segmentación).
- Flynn: SISD, SIMD (GPU, vectoriales), MISD y MIMD (multinúcleo). Amdahl limita la aceleración.
- Rendimiento: Hz, CPI e IPC, MIPS y FLOPS (superordenadores a escala exa).
- Jerarquía: registros → L1 → L2 → L3 → RAM → SSD/HDD → cinta. La caché es SRAM; la RAM, DRAM (DDR5 desde 2020).
- ROM, PROM (una vez), EPROM (ultravioleta), EEPROM (eléctrica) y flash (por bloques).
- Bus del sistema: datos, direcciones y control. E/S programada, por interrupciones o por DMA.
- Placa base: zócalo (LGA, PGA, BGA), chipset (PCH), DIMM, PCIe y M.2, UEFI con GPT y Secure Boot, CMOS con su pila, TPM 2.0. PCIe 7.0 llega a 128 GT/s por carril.

## Fuentes

- [BIPM: prefijos del Sistema Internacional (incluye ronna y quetta)](https://www.bipm.org/en/measurement-units/si-prefixes)
- [NIST: prefijos para múltiplos binarios (IEC)](https://physics.nist.gov/cuu/Units/binary.html)
- [IEEE 754‑2019, Standard for Floating‑Point Arithmetic (IEEE SA)](https://standards.ieee.org/ieee/754/6210/)
- [Unicode 18.0.0 (Unicode Consortium)](https://www.unicode.org/versions/Unicode18.0.0/)
- [RFC 3629, UTF‑8 (IETF)](https://www.rfc-editor.org/rfc/rfc3629)
- [JEDEC publica la norma DDR5 (JESD79‑5)](https://www.jedec.org/news/pressreleases/jedec-publishes-new-ddr5-standard-advancing-next-generation-high-performance)
- [PCI‑SIG anuncia la especificación PCI Express 8.0 (nota de prensa, agosto de 2025)](https://www.businesswire.com/news/home/20250805675479/en/PCI-SIG-Announces-PCI-Express-8.0-Specification-to-Reach-256.0-GTs)
- [UEFI Forum: especificaciones](https://uefi.org/specifications)
