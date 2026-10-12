# II.4 · Sistemas operativos: características y elementos constitutivos, Windows, Unix y Linux, y sistemas para dispositivos móviles

El **sistema operativo** es el programa que hace utilizable el *hardware*: reparte el procesador entre los programas, gestiona la memoria, guarda los datos en ficheros, controla los dispositivos y protege a unos usuarios de otros. Este tema explica primero los **conceptos generales** (funciones, tipos, núcleo, llamadas al sistema, **procesos e hilos**, **planificación**, sincronización e interbloqueos, **memoria virtual**, sistemas de ficheros, entrada/salida y protección), con ejercicios resueltos como los del examen; después recorre las grandes familias: **Windows** (arquitectura NT, registro, NTFS y ReFS, 64 bits, Windows Server y Active Directory), **Unix y Linux** (historia, núcleo, distribuciones, permisos, procesos y órdenes básicas, macOS) y los **sistemas para dispositivos móviles** (**Android** e **iOS/iPadOS**, con sus arquitecturas, versiones, desarrollo y modelo de seguridad). La administración diaria de Windows y Linux (servicios, paquetes, almacenamiento, red, registros) está en el tema IV.1; la arquitectura de ordenadores, BIOS y UEFI en II.1.

## Concepto, objetivos y funciones

Un **sistema operativo** (SO) es el **software de base** que **gestiona los recursos del *hardware*** (procesador, memoria, almacenamiento, dispositivos) y **ofrece servicios** a los programas y a los usuarios, actuando como **intermediario** entre ellos y la máquina. Se puede ver de dos formas complementarias:

- Como **máquina extendida** (visión descendente): oculta los detalles del *hardware* y ofrece abstracciones más cómodas (ficheros en lugar de sectores, procesos en lugar de interrupciones, *sockets* en lugar de tarjetas de red).
- Como **gestor de recursos** (visión ascendente): reparte de forma ordenada, eficiente y segura los recursos entre los programas que compiten por ellos.

Objetivos: **comodidad** para el usuario y el programador, **eficiencia** en el uso del *hardware*, **capacidad de evolución** (incorporar nuevos dispositivos y funciones) y **protección y seguridad**.

| Función | Qué hace |
|---|---|
| **Gestión de procesos** | Crear, planificar (**administrar la CPU con un algoritmo de planificación**), sincronizar, comunicar y terminar procesos e hilos |
| **Gestión de memoria** | Asignar y proteger la memoria principal; memoria virtual |
| **Gestión de ficheros** | Organizar los datos en ficheros y directorios sobre los dispositivos de almacenamiento |
| **Gestión de entrada/salida** | Controlar los dispositivos mediante controladores, **interrupciones**, DMA y búferes; **ejecutar las rutinas de tratamiento de interrupciones** cuando se activa una señal |
| **Seguridad y protección** | Identificar y autenticar a los usuarios, **controlar sus autorizaciones** de uso, aislar los procesos |
| Comunicaciones | Pila de protocolos de red, comunicación entre procesos |
| Interfaz de usuario | Intérprete de órdenes (CLI) e interfaz gráfica (GUI) |
| Contabilidad, registro y errores | Medir el uso de recursos, registrar eventos, detectar y tratar errores |

El SO es **software**: no es «el conjunto de *software* y *hardware* necesario para que funcione el ordenador» (eso sería el sistema informático completo).

### Evolución

| Época | Sistemas |
|---|---|
| Años 40 y 50 | Sin SO: el programador manejaba la máquina directamente; después, **procesamiento por lotes** (*batch*) con monitores residentes |
| Años 60 | **Multiprogramación** (varios programas en memoria para aprovechar las esperas de E/S) y **tiempo compartido** (CTSS, **Multics**); OS/360 de IBM |
| **1969-1970** | **Unix** en los Laboratorios Bell (Thompson y Ritchie), reescrito en **C** en 1973 |
| Años 80 | Ordenadores personales: **MS-DOS** (1981), Mac OS (1984), Windows 1.0 (1985); sistemas en red |
| Años 90 | **Linux** (1991), **Windows NT** (1993), Windows 95; sistemas distribuidos y de servidor |
| Años 2000 | Virtualización, Mac OS X sobre Unix (2001), **iOS** (2007) y **Android** (2008) |
| 2010-2026 | Nube, contenedores, dispositivos móviles mayoritarios, seguridad basada en *hardware* (TPM, enclaves), IA integrada en el sistema |

## Clasificación de los sistemas operativos

| Criterio | Tipos |
|---|---|
| **Número de usuarios** | **Monousuario** (MS-DOS, sistemas de un puesto) o **multiusuario** (Unix, Linux, Windows Server) |
| **Número de tareas** | **Monotarea** (MS-DOS) o **multitarea**: **cooperativa** (el programa cede la CPU: Windows 3.x, Mac OS clásico) o **apropiativa** (*preemptive*: el SO quita la CPU al programa, todos los actuales) |
| **Número de procesadores** | Monoprocesador o **multiprocesador**: simétrico (**SMP**, todos los procesadores ejecutan el SO y los programas) o asimétrico (AMP) |
| **Tiempo de respuesta** | **Por lotes** (sin interacción), **de tiempo compartido** (interactivos) y **de tiempo real**: **estrictos** (*hard*: cumplir el plazo es obligatorio: control industrial, aviónica; VxWorks, QNX, FreeRTOS, Zephyr) o **flexibles** (*soft*: multimedia) |
| **Distribución** | **De red** (cada equipo con su SO, que comparte recursos) o **distribuidos** (un único sistema lógico sobre varios equipos) |
| **Uso** | De escritorio, de servidor, **móviles**, **empotrados** e IoT, de *mainframe* (z/OS), de supercomputación |
| **Licencia** | **Propietarios** (Windows, macOS, iOS) o **libres y de código abierto** (Linux, FreeBSD, AOSP) |
| **Estructura del núcleo** | Monolítico, por capas, micronúcleo, híbrido, exonúcleo (tabla de arquitecturas) |

## Elementos constitutivos

| Elemento | Descripción |
|---|---|
| **Núcleo** (*kernel*) | Parte **central** del SO que se ejecuta en **modo privilegiado**: **controla los procesos, la memoria y los dispositivos**, recibe las peticiones de servicio de los procesos (llamadas al sistema) y las comunica con el *hardware*, gestiona las interrupciones y permite la **multitarea**. **No es el núcleo** (*core*) **del procesador** |
| **Llamadas al sistema** | Interfaz por la que los programas piden servicios al núcleo (`fork`, `exec`, `open`, `read`, `write`, `mmap` en POSIX; la API Win32, como `CreateProcess` o `ReadFile`, en Windows); provocan el paso a **modo núcleo** |
| **Interrupciones y excepciones** | Señales que detienen la ejecución para atender un suceso: de **hardware** (fin de E/S, reloj), de **software** (traps, llamadas al sistema) y **excepciones** (división por cero, fallo de página). El **vector de interrupciones** apunta a la **rutina de tratamiento** de cada una |
| **Controladores de dispositivo** (*drivers*) | Código que maneja cada tipo de dispositivo concreto |
| **Sistema de ficheros** | Organización lógica del almacenamiento |
| **Intérprete de órdenes** (*shell*) e **interfaz gráfica** | Interfaz con el usuario (bash, PowerShell, el escritorio) |
| **Bibliotecas del sistema** | Envuelven las llamadas al sistema (libc en Unix; `ntdll.dll` y `kernel32.dll` en Windows) |
| **Servicios o demonios** | Procesos en segundo plano (red, impresión, registros) |
| **Utilidades del sistema** | Programas de administración (gestores de ficheros, editores, herramientas de diagnóstico) |
| **Cargador de arranque** | Carga el núcleo al encender el equipo (GRUB, Windows Boot Manager) |

**Modos de ejecución**: el procesador distingue el **modo núcleo** (supervisor, privilegiado: todas las instrucciones y toda la memoria) y el **modo usuario** (restringido). En x86 hay cuatro **anillos** de protección (0 a 3): el núcleo usa el **anillo 0** y las aplicaciones el **3**. Un programa de usuario solo accede al *hardware* a través del núcleo.

### Arquitecturas del núcleo

| Arquitectura | Idea | Ventajas e inconvenientes | Ejemplos |
|---|---|---|---|
| **Monolítica** | Todo el SO (procesos, memoria, ficheros, *drivers*, red) en un único programa en modo núcleo | **Rápida**; un fallo de un componente puede tumbar todo el sistema | **Linux** y los Unix clásicos (con **módulos cargables** en tiempo de ejecución), MS-DOS |
| **Por capas** | Niveles jerárquicos: cada capa usa solo los servicios de la inferior | Ordenada y verificable; poco eficiente | THE (Dijkstra), anillos de Multics |
| **Micronúcleo** (*microkernel*) | El núcleo mínimo (comunicación entre procesos, planificación básica, memoria) y el resto como **servidores en modo usuario** | **Robustez y seguridad** (un fallo de un servidor no tumba el núcleo); más lento por los mensajes | **Mach**, MINIX 3, **QNX**, **L4** y seL4, Zircon (Fuchsia) |
| **Híbrida** | Micronúcleo modificado que mantiene muchos servicios en modo núcleo por rendimiento | Compromiso | **Windows NT** (Windows 10, 11, Server), **XNU** de macOS e iOS (Mach + BSD) |
| Exonúcleo y *unikernel* | Núcleo que solo multiplexa el *hardware* / aplicación compilada junto con un SO mínimo | Muy especializados | Investigación, nube |

### Arranque del sistema

```text
Encendido → firmware (BIOS o UEFI: autoprueba POST, Secure Boot)
         → cargador de arranque (GRUB 2 en Linux; Windows Boot Manager y winload.efi en Windows)
         → núcleo (descomprime, detecta hardware, monta la raíz; initramfs en Linux)
         → primer proceso de usuario: init / systemd (PID 1) en Linux; smss.exe → wininit.exe y winlogon.exe en Windows
         → servicios y demonios → pantalla de inicio de sesión
```

El proceso **`init`** (hoy **systemd** en casi todas las distribuciones) es el **primer proceso** que lanza el núcleo, con **PID 1**: arranca los servicios del sistema y adopta a los procesos huérfanos; no es «el proceso de arranque de un usuario».

## Gestión de procesos

### Proceso, programa y bloque de control

Un **programa** es un fichero ejecutable (algo **pasivo**); un **proceso** es un **programa en ejecución** (algo **activo**), con su código, sus datos, su pila, su montículo (*heap*), el estado de los registros y los recursos que tiene asignados. Un mismo programa puede dar lugar a varios procesos.

El SO representa cada proceso con un **bloque de control de proceso** (**BCP**, en inglés **PCB**, *Process Control Block*), la **estructura de datos que contiene toda la información sobre el proceso**:

| Información del BCP | Ejemplos |
|---|---|
| Identificación | **PID** (identificador del proceso), **PPID** (del proceso padre), **UID** y **GID** (usuario y grupo propietarios) |
| Estado | Nuevo, listo, en ejecución, bloqueado, terminado |
| Contexto de CPU | Contador de programa, registros, palabra de estado |
| Planificación | Prioridad, tiempo de CPU consumido, colas a las que pertenece |
| Memoria | Tablas de páginas o de segmentos, límites |
| Recursos y E/S | Ficheros abiertos, dispositivos asignados |
| Contabilidad | Tiempos, límites |

En Linux la estructura se llama `task_struct` y la información de cada proceso se ve en `/proc/<PID>/`; los hilos tienen su propio **TID** (no existe un «TPID»).

### Estados de un proceso

![Diagrama de estados de un proceso: nuevo pasa a listo al ser admitido; listo pasa a en ejecución cuando el planificador le da la CPU; en ejecución vuelve a listo por expropiación al acabar el quantum, pasa a bloqueado al esperar una E/S o un evento, o a terminado al finalizar; bloqueado vuelve a listo cuando termina la E/S o llega el evento](diagramas/II.4-estados-proceso.svg)

*Figura: modelo de cinco estados; de bloqueado nunca se pasa directamente a ejecución.*

- **Listo** (preparado): espera solo a que le den la CPU. **En ejecución**: tiene la CPU (uno por núcleo). **Bloqueado** (en espera): espera un suceso (fin de E/S, señal); aunque le dieran la CPU no podría avanzar.
- En el modelo de **siete estados** se añaden **listo suspendido** y **bloqueado suspendido**, para procesos llevados a disco (*swapping*) por falta de memoria.
- **Cambio de contexto**: guardar el contexto del proceso que sale en su BCP y cargar el del que entra; es tiempo perdido (sobrecarga), por eso el *quantum* no puede ser muy pequeño.

### Creación y terminación

En Unix un proceso crea otro con **`fork()`**, que **duplica** al proceso que la invoca: el **hijo** es una **copia** del padre (con memoria compartida en modo **copia en escritura**). `fork()` **devuelve al padre el PID del hijo** y **devuelve 0 al hijo** (que obtiene el PID de su padre con `getppid()`, no como valor de retorno de `fork`); si falla, devuelve −1. Después el hijo suele llamar a **`exec()`** para cargar otro programa, y el padre espera su fin con **`wait()`**. En Windows, `CreateProcess` crea el proceso y carga el programa en una sola llamada.

```c
pid_t pid = fork();
if (pid == 0) {                 /* hijo */
    execlp("ls", "ls", "-l", NULL);
} else if (pid > 0) {           /* padre: pid es el identificador del hijo */
    waitpid(pid, NULL, 0);
} else {
    perror("fork");             /* error */
}
```

| Tipo de proceso | Descripción |
|---|---|
| **Zombi** (*zombie*) | **Ha terminado pero sigue en la tabla de procesos** porque su padre aún no ha recogido su estado con `wait()`; en `ps` aparece con estado `Z` o `<defunct>` |
| **Huérfano** | Su padre terminó antes que él; lo **adopta `init`/systemd** (PID 1) |
| **Demonio** (*daemon*) | Proceso en **segundo plano**, sin terminal, que presta un servicio (`sshd`, `crond`); en Windows, los **servicios** |

### Hilos

Un **hilo** (*thread*) es la **unidad básica de ejecución dentro de un proceso**: los hilos de un proceso **comparten** su código, datos y ficheros abiertos, pero cada uno tiene su propia pila, registros y contador de programa. Permiten que **un proceso ejecute varias tareas de forma simultánea o concurrente** (un servidor que atiende a varios clientes, una interfaz que no se bloquea mientras calcula) y aprovechan los procesadores multinúcleo; crearlos y cambiar entre ellos cuesta mucho menos que con procesos.

- **Hilos de usuario** (gestionados por una biblioteca, invisibles para el núcleo: si uno se bloquea, se bloquean todos) e **hilos de núcleo** (el núcleo los planifica por separado).
- Modelos: **muchos a uno**, **uno a uno** (Linux con NPTL, Windows) y **muchos a muchos**. En Linux, procesos e hilos son «tareas» creadas con `clone()`; en Windows el proceso es un contenedor de recursos y lo que se planifica son los hilos.

### Planificación

| Planificador | Decide | Frecuencia |
|---|---|---|
| **A largo plazo** (de trabajos, *long-term*) | Qué trabajos **se admiten** en el sistema (grado de multiprogramación) | Baja; típico de sistemas por lotes |
| **A medio plazo** (*mid-term*) | Qué procesos se **suspenden y se llevan a disco** o se reactivan (*swapping*) | Media |
| **A corto plazo** (de CPU, *short-term*) | **Qué proceso listo entra en el procesador** para ejecutarse; el **despachador** (*dispatcher*) hace el cambio de contexto | **Muy alta** (milisegundos) |

Criterios: **utilización de la CPU** y **productividad** (procesos terminados por unidad de tiempo), que interesa maximizar; **tiempo de retorno** (desde que llega hasta que termina), **tiempo de espera** (en la cola de listos) y **tiempo de respuesta** (hasta la primera respuesta), que interesa minimizar. La planificación es **expropiativa** (*preemptive*: el SO puede quitar la CPU) o **no expropiativa** (el proceso la conserva hasta que termina o se bloquea).

| Algoritmo | Funcionamiento | Expropiativo | Características |
|---|---|---|---|
| **FCFS** (*First Come, First Served*, FIFO) | Por **orden de llegada** | No | Sencillo; **efecto convoy** (los cortos esperan tras un largo) |
| **SJF** (*Shortest Job First*) | Primero el de **ráfaga de CPU más corta** | No | **Óptimo en tiempo medio de espera**; hay que estimar las ráfagas; puede causar inanición de los largos |
| **SRTF** (*Shortest Remaining Time First*) | SJF expropiativo: si llega uno con menos tiempo restante, expulsa al actual | Sí | Aún mejor tiempo medio |
| **Por prioridades** | Primero el de **mayor prioridad** | Puede serlo o no | **Inanición** de los de baja prioridad, que se evita con **envejecimiento** (*aging*: subir la prioridad con el tiempo de espera) |
| **Round Robin** (turno rotatorio) | Cada proceso recibe un **quantum** (cuanto) de tiempo de CPU; al agotarlo vuelve al **final de la cola** de listos | **Sí** | Base del **tiempo compartido**; quantum grande ≈ FCFS; quantum muy pequeño = mucha sobrecarga |
| **Colas multinivel** | Varias colas (sistema, interactivos, lotes), cada una con su algoritmo y prioridad | Según la cola | Clasificación fija |
| **Colas multinivel con realimentación** | Los procesos **cambian de cola** según su comportamiento (los que gastan mucha CPU bajan de prioridad) | Sí | La base de los planificadores reales |
| Tiempo real: **EDF** y **RMS** | Primero el de plazo más próximo / prioridad fija según la frecuencia | Sí | Sistemas de tiempo real |

**Ejercicio 1.** Tres procesos llegan a la vez con ráfagas P1 = 24, P2 = 3 y P3 = 3 ms:

```text
FCFS (P1, P2, P3):   P1 0-24 | P2 24-27 | P3 27-30   esperas 0, 24, 27 → media 17 ms
SJF (P2, P3, P1):    P2 0-3  | P3 3-6   | P1 6-30    esperas 6, 0, 3   → media 3 ms
Round Robin q = 4:   P1 0-4 | P2 4-7 | P3 7-10 | P1 10-30     esperas P1 6, P2 4, P3 7 → media 5,67 ms
```

**Ejercicio 2 (SRTF).** Llegadas y ráfagas: P1 (0, 8), P2 (1, 4), P3 (2, 9), P4 (3, 5). Secuencia: P1 0-1, **P2 1-5** (expulsa a P1, que aún necesita 7), P4 5-10, P1 10-17, P3 17-26. Esperas: P1 9, P2 0, P3 15, P4 2 → **media 6,5 ms**.

**Planificadores reales**:

- **Windows**: planificación **expropiativa por prioridades** de los **hilos**, con **32 niveles** (0, el hilo de páginas a cero; **1 a 15**, prioridades **variables** con aumentos temporales para los hilos interactivos o que vuelven de E/S; **16 a 31**, **tiempo real**) y *quantum* dentro de cada nivel (Round Robin entre iguales).
- **Linux**: clases de planificación de **tiempo real** (`SCHED_FIFO`, `SCHED_RR`, `SCHED_DEADLINE`) y **normal** (`SCHED_OTHER`, `SCHED_BATCH`, `SCHED_IDLE`). Para la normal se usó el **CFS** (*Completely Fair Scheduler*, 2007), sustituido en el núcleo **6.6** (2023) por **EEVDF**; la prioridad de usuario es el valor ***nice*** (de **−20**, máxima, a **19**, mínima), que se fija con `nice` al lanzar un proceso y se cambia en ejecución con **`renice`**. Desde el núcleo 6.12, `sched_ext` permite cargar planificadores escritos en eBPF.

Ningún sistema usa un «algoritmo de agrupación»: los algoritmos de planificación son FCFS, SJF, SRTF, prioridades, Round Robin y colas multinivel.

### Comunicación y sincronización entre procesos

Mecanismos de **comunicación entre procesos** (IPC): **tuberías** (*pipes*, `|`) y tuberías con nombre (FIFO), **colas de mensajes**, **memoria compartida**, **semáforos**, **señales** (Unix: `SIGTERM`, `SIGKILL`…; tema IV.1), ***sockets*** y, en Windows, ALPC, *named pipes* y COM; en Android, **Binder**.

Cuando varios procesos o hilos acceden a datos compartidos aparece la **condición de carrera** (el resultado depende del orden de ejecución). El fragmento de código que accede al recurso compartido es la **sección crítica**, y una solución correcta debe garantizar **exclusión mutua** (solo uno dentro), **progreso** y **espera limitada**.

| Mecanismo | Descripción |
|---|---|
| Instrucciones atómicas | *Test-and-set*, *compare-and-swap*: base de los cerrojos (*spinlocks*) |
| **Semáforo** (Dijkstra, 1965) | Contador entero con dos operaciones atómicas: **P** o `wait` (decrementa y bloquea si queda negativo) y **V** o `signal` (incrementa y despierta a un proceso en espera). **Binario** (0/1) o **contador** |
| ***Mutex*** | Cerrojo de exclusión mutua que solo puede liberar quien lo adquirió |
| **Monitor** (Hoare, Brinch Hansen) | Construcción de alto nivel que encapsula datos y procedimientos con exclusión mutua automática y **variables de condición** (`wait`/`signal`); `synchronized` en Java |
| Paso de mensajes | `send` y `receive`, síncronos o asíncronos |

Problemas clásicos: **productor-consumidor** (búfer limitado), **lectores-escritores** y **filósofos comensales**.

### Interbloqueo

Un **interbloqueo** (*deadlock*) es una situación en la que un conjunto de procesos espera indefinidamente porque **cada uno retiene un recurso que necesita otro** del conjunto. Se produce solo si se dan a la vez las **cuatro condiciones de Coffman**:

1. **Exclusión mutua**: los recursos no se pueden compartir.
2. **Retención y espera**: un proceso retiene recursos mientras espera otros.
3. **No expropiación**: no se puede quitar un recurso a quien lo tiene.
4. **Espera circular**: existe un ciclo de procesos que esperan unos por otros.

| Estrategia | Cómo |
|---|---|
| **Prevención** | Romper alguna condición: pedir todos los recursos de golpe, permitir expropiar, **ordenar los recursos** para evitar la espera circular |
| **Evitación** | Conceder un recurso solo si el sistema queda en **estado seguro**: **algoritmo del banquero** (Dijkstra) |
| **Detección y recuperación** | Buscar ciclos en el grafo de asignación y romperlos (abortar procesos, expropiar recursos) |
| **Ignorarlo** («algoritmo del avestruz») | Lo que hacen en la práctica los SO de propósito general |

**Ejemplo del banquero** (un tipo de recurso, 12 unidades): P0 tiene 5 y puede necesitar hasta 10; P1 tiene 2 (máximo 4); P2 tiene 2 (máximo 9) → disponibles 3. El estado es **seguro**: P1 puede terminar (necesita 2 más) y libera 4 → 5 disponibles; P0 puede terminar (necesita 5) → 10; P2 puede terminar (necesita 7) → secuencia segura **⟨P1, P0, P2⟩**. Si se diera una unidad más a P2, quedaría en estado inseguro.

La **inanición** (*starvation*) es distinta: un proceso nunca obtiene el recurso porque siempre se favorece a otros (se evita con envejecimiento).

## Gestión de memoria

### Objetivos y conceptos

El gestor de memoria debe permitir la **reubicación** (cargar un programa en cualquier zona), la **protección** (que un proceso no acceda a la memoria de otro ni a la del núcleo), la **compartición** controlada (bibliotecas, memoria compartida) y una buena **organización** lógica y física. Los programas usan **direcciones lógicas** (virtuales) que la **MMU** (unidad de gestión de memoria) traduce en tiempo de ejecución a **direcciones físicas**.

| Técnica | Descripción | Problema |
|---|---|---|
| Particiones **fijas** | Memoria dividida en zonas de tamaño fijo | **Fragmentación interna** (se desperdicia el resto de la partición) |
| Particiones **variables** | Cada proceso recibe exactamente lo que pide; se elige el hueco con **primer ajuste**, **mejor ajuste**, **peor ajuste** o siguiente ajuste | **Fragmentación externa** (huecos pequeños dispersos), que se corrige con **compactación** |
| Sistema de colegas (*buddy*) y *slab* | Bloques de potencias de 2 / cachés de objetos del núcleo | Usados por el núcleo Linux |
| **Paginación** | Memoria lógica dividida en **páginas** y física en **marcos** del **mismo tamaño** (4 KB habitualmente; páginas grandes de 2 MB o 1 GB); una **tabla de páginas** por proceso traduce página → marco | Sin fragmentación externa; algo de interna en la última página; las tablas ocupan memoria (tablas **multinivel**, de 4 o 5 niveles en x86-64) |
| **Segmentación** | Memoria lógica dividida en **segmentos** de tamaño variable con significado lógico (código, datos, pila); tabla de segmentos con base y límite | Fragmentación externa |
| Segmentación paginada | Segmentos divididos en páginas | Combina ventajas |

La **TLB** (*Translation Lookaside Buffer*) es una caché de traducciones recientes que evita consultar la tabla de páginas en cada acceso (tema II.1).

![Traducción de una dirección lógica con paginación: la página p = 3 se busca en la TLB y, si falla, en la tabla de páginas del proceso, que la sitúa en el marco 7 con el bit de validez a 1; la dirección física es el marco 7 con el mismo desplazamiento d; una entrada con validez 0 provoca un fallo de página](diagramas/II.4-paginacion.svg)

*Figura: la MMU sustituye el número de página por el de marco y conserva el desplazamiento.*

### Memoria virtual

La **memoria virtual** permite ejecutar procesos **mayores que la memoria física** y tener más procesos cargados, manteniendo en RAM solo las páginas en uso y el resto en disco (**área de intercambio**: partición o fichero *swap* en Linux, **`pagefile.sys`** en Windows):

- **Paginación bajo demanda**: una página solo se carga cuando se accede a ella; si no está en memoria se produce un **fallo de página** y el SO la trae del disco (si no hay marcos libres, primero elige una **víctima**). La **prepaginación** (*prepaging*) carga por adelantado páginas que probablemente se usarán.
- **Copia en escritura** (*copy-on-write*): padre e hijo comparten páginas tras `fork()` hasta que uno escribe.
- **Hiperpaginación** (*thrashing*): el sistema pasa más tiempo trayendo y llevando páginas que ejecutando, porque los procesos no tienen marcos suficientes para su **conjunto de trabajo** (*working set*); se resuelve reduciendo el grado de multiprogramación.

| Algoritmo de reemplazo | Víctima | Notas |
|---|---|---|
| **FIFO** | La página que **lleva más tiempo** en memoria | Sencillo; sufre la **anomalía de Belady** (más marcos pueden dar más fallos) |
| **Óptimo** (OPT, de Belady) | La que **tardará más en usarse** | Mínimo de fallos; **irrealizable** (exige conocer el futuro), sirve de referencia |
| **LRU** (*Least Recently Used*) | La **usada hace más tiempo** | Buena aproximación al óptimo; costoso de implementar exactamente |
| **Reloj** o **segunda oportunidad** | FIFO que salta las páginas con el **bit de referencia** activo (y lo pone a 0) | Aproximación práctica a LRU |
| NRU, LFU, conjunto de trabajo | No usada recientemente (bits de referencia y modificación); menos frecuentemente usada; páginas fuera de la ventana de trabajo | |

**Ejercicio.** Cadena de referencias 7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2, 1, 2, 0, 1, 7, 0, 1 con **3 marcos**: **FIFO = 15 fallos**, **LRU = 12**, **óptimo = 9**. Con la cadena 1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5, FIFO da **9 fallos con 3 marcos y 10 con 4** (anomalía de Belady); LRU y el óptimo no la sufren.

Ni la segmentación ni la paginación ni la prepaginación permiten que un proceso ejecute varias tareas a la vez: eso lo hacen los **hilos**.

## Gestión de ficheros

Un **fichero** es una colección de información con **nombre** guardada en almacenamiento secundario; tiene **atributos** (nombre, tipo, tamaño, propietario, permisos, fechas) y admite operaciones (crear, abrir, leer, escribir, posicionarse, cerrar, borrar). Los métodos de acceso (secuencial, directo, indexado) y las organizaciones de ficheros se estudian en el tema II.3.

- **Directorios**: de un nivel, de dos niveles, en **árbol** (jerárquico, el habitual) y en **grafo acíclico** (compartir ficheros con **enlaces**: **duros**, otra entrada que apunta al mismo i-nodo, y **simbólicos**, un fichero que contiene una ruta). Rutas **absolutas** (desde la raíz) y **relativas**.
- **Asignación del espacio**: **contigua** (rápida, pero fragmentación externa; CD y DVD), **enlazada** (cada bloque apunta al siguiente; **FAT** guarda esos enlaces en una tabla) e **indexada** (un bloque índice con las direcciones de los bloques de datos: los **i-nodos** de Unix, con punteros directos e indirectos simples, dobles y triples; **ext4** usa además **extensiones**, rangos de bloques contiguos).
- Gestión del **espacio libre**: mapas de bits o listas de bloques libres.
- **Diario** (*journaling*): se anotan los cambios de metadatos antes de hacerlos para recuperarse rápido tras un corte (NTFS, ext3/ext4, XFS); los sistemas de **copia en escritura** (Btrfs, ZFS, ReFS, APFS) nunca sobrescriben datos en su sitio y permiten instantáneas y sumas de comprobación.
- **Montaje**: en Unix todos los sistemas de ficheros cuelgan de un **único árbol** a partir de `/`; en Windows cada volumen tiene una **letra de unidad** (`C:`) o un punto de montaje. Linux ofrece una capa común, el **VFS** (sistema de ficheros virtual).

Un **i-nodo** guarda los atributos (tipo, permisos, propietario, tamaño, fechas, contador de enlaces) y los punteros a los bloques, pero **no el nombre**, que está en la entrada del directorio.

| Sistema de ficheros | SO | Características |
|---|---|---|
| **FAT32** | Todos (memorias USB) | Sin permisos ni diario; **ficheros de hasta 4 GB** |
| **exFAT** | Todos | Para memorias flash grandes; sin el límite de 4 GB |
| **NTFS** | Windows | **ACL**, diario, cifrado EFS, compresión, cuotas, enlaces, flujos alternativos; tabla maestra de ficheros (MFT) |
| **ReFS** (*Resilient File System*) | Windows Server | **Sistema de archivos resiliente**: sumas de comprobación (*integrity streams*), reparación en línea con Espacios de almacenamiento, clonación de bloques; ficheros y volúmenes de hasta **35 PB** según la documentación actual de Microsoft (el examen de 2018 daba **18 EB** como tamaño máximo de archivo, el límite teórico de 2^64 bytes); no admite cuotas ni arranque |
| **ext4** | Linux | Diario, extensiones; ficheros de hasta 16 TiB y volúmenes de hasta 1 EiB |
| **XFS** | Linux (por defecto en RHEL) | Alto rendimiento con ficheros grandes |
| **Btrfs** | Linux (Fedora, SUSE) | Copia en escritura, instantáneas, subvolúmenes, RAID integrado |
| **ZFS** | Solaris, FreeBSD, Linux | Gestor de volúmenes y sistema de ficheros con integridad de extremo a extremo |
| **APFS** | macOS, iOS (desde 2017) | Copia en escritura, cifrado nativo, instantáneas |
| F2FS | Android | Optimizado para memoria flash |
| ISO 9660 y UDF | Discos ópticos | |

## Gestión de entrada/salida

Los dispositivos se clasifican en **de bloques** (discos: acceso por bloques direccionables), **de caracteres** (teclado, terminales, puertos serie: flujo de bytes) y **de red**. Cada dispositivo tiene un **controlador** *hardware* y un **controlador de dispositivo** (*driver*) en el SO.

| Técnica de E/S | Funcionamiento |
|---|---|
| **E/S programada** (sondeo, *polling*) | La CPU **pregunta continuamente** al dispositivo si ha terminado: desperdicia CPU |
| **E/S por interrupciones** | El dispositivo **avisa con una interrupción** al terminar; la CPU hace otra cosa mientras |
| **DMA** (acceso directo a memoria) | Un controlador DMA **transfiere bloques entre el dispositivo y la memoria sin pasar por la CPU**, que solo recibe una interrupción al final |

Otras técnicas: **búferes** (*buffering*, adaptar velocidades y tamaños), **caché** de disco, **spooling** (cola en disco para dispositivos no compartibles, como las impresoras) y **planificación del disco** para reducir los desplazamientos del cabezal en los discos magnéticos:

| Algoritmo | Orden de servicio |
|---|---|
| **FCFS** | Por orden de llegada |
| **SSTF** (*Shortest Seek Time First*) | La petición **más cercana** al cabezal (puede causar inanición) |
| **SCAN** (ascensor) | Recorre el disco en un sentido **hasta el extremo** atendiendo peticiones y luego vuelve |
| **C-SCAN** | Solo atiende en un sentido; al llegar al final **salta al principio** (tiempos de espera más uniformes) |
| **LOOK** y **C-LOOK** | Como SCAN y C-SCAN, pero solo **hasta la última petición** de cada sentido |

**Ejercicio** (cabezal en el cilindro 53; peticiones 98, 183, 37, 122, 14, 124, 65, 67; cilindros 0 a 199): **FCFS** recorre **640** cilindros; **SSTF** (65, 67, 37, 14, 98, 122, 124, 183) **236**; **SCAN** hacia el 0 (37, 14, 0, 65, 67, 98, 122, 124, 183) **236**; **LOOK** hacia el 0 (sin llegar al 0) **208**. En los SSD no hay cabezal: Linux usa los planificadores `none`, `mq-deadline`, BFQ o Kyber.

## Seguridad y protección

- **Protección**: mecanismos que controlan el acceso de procesos y usuarios a los recursos. Modelo de la **matriz de acceso** (sujetos × objetos), implementada por columnas como **listas de control de acceso** (**ACL**, NTFS, `setfacl`) o por filas como **capacidades**. Modos núcleo y usuario, protección de memoria y temporizador.
- **Control de acceso**: **discrecional** (DAC: decide el propietario, permisos Unix y ACL), **obligatorio** (MAC: etiquetas y política del sistema, **SELinux**, AppArmor) y **basado en roles** (RBAC).
- **Autenticación** de usuarios (contraseñas, MFA, biometría), **mínimo privilegio** (cuentas sin privilegios, `sudo`, Control de cuentas de usuario), **auditoría** y registros, **actualizaciones** de seguridad, **cifrado** de disco (BitLocker, FileVault, LUKS) y **arranque seguro** (Secure Boot, TPM). Detalle de seguridad del puesto en el tema IV.9.

## Sistemas Windows

### Historia y versiones

| Línea | Versiones e hitos |
|---|---|
| **MS-DOS** (1981) | Sistema de línea de órdenes, monousuario y monotarea, para el IBM PC |
| **Windows 1.0 a 3.x** (1985-1992) | Entorno gráfico **sobre MS-DOS** con **multitarea cooperativa** |
| **Windows 9x** (95, 98, Me; 1995-2000) | Híbridos de 16 y 32 bits apoyados aún en MS-DOS; Windows 95 introdujo el menú Inicio y la barra de tareas |
| **Windows NT** (NT 3.1 en 1993, NT 4.0 en 1996) | **Nuevo núcleo de 32 bits**, portable, multiusuario, con multitarea apropiativa, **NTFS** y seguridad, diseñado por David Cutler |
| **Windows 2000 y XP** (2001) | XP lleva la tecnología NT al gran público y acaba con la línea 9x |
| Windows Vista (2007), 7 (2009), 8 y 8.1 (2012-2013) | Vista introdujo el **Control de cuentas de usuario (UAC)** y **BitLocker** |
| **Windows 10** (2015) | «Windows como servicio» con actualizaciones de características periódicas; **fin de soporte el 14‑10‑2025** (solo actualizaciones de seguridad extendidas, ESU) |
| **Windows 11** (2021) | Exige **TPM 2.0**, **arranque seguro** (UEFI) y procesadores recientes; versiones **24H2** (2024), **25H2** (30‑9‑2025) y **26H1** (2026, solo para equipos nuevos); **LTSC 2024** para entornos estables |
| **Windows Server** | NT Server, 2000, 2003, 2008/R2, 2012/R2, 2016, 2019, 2022 y **Windows Server 2025** (noviembre de 2024: parcheo en caliente con Azure Arc, SMB sobre QUIC, mejoras de Active Directory) |

Ediciones de Windows 11: **Home**, **Pro**, **Enterprise**, **Education** e IoT Enterprise. Cada versión anual recibe **24 meses** de soporte en Home y Pro y **36 meses** en Enterprise y Education; las actualizaciones de calidad se publican el **segundo martes** de cada mes. Windows Server se publica en ediciones **Standard** y **Datacenter**, con instalación **Server Core** (sin escritorio, menos superficie de ataque) o con experiencia de escritorio, y diez años de soporte (cinco principales y cinco extendidos).

### Arquitectura de Windows NT

Windows NT (en el que se basan Windows 10, 11 y Server) tiene un **núcleo híbrido**: un diseño de inspiración micronúcleo en el que, por rendimiento, casi todos los servicios se ejecutan en **modo núcleo**.

```text
MODO USUARIO   Aplicaciones (Win32, .NET, UWP)  │ Servicios (svchost.exe)  │ Procesos del sistema (smss, csrss,
               ─────────────────────────────────┴──────────────────────────┤ wininit, winlogon, lsass, services)
               Subsistemas de entorno (Win32: csrss.exe) · DLL de subsistema (kernel32, user32) · ntdll.dll (API nativa)
───────────────────────────────────────────── llamadas al sistema ─────────────────────────────────────────────
MODO NÚCLEO    EJECUTIVO: administradores de E/S, objetos, procesos e hilos, memoria virtual, caché, configuración
               (registro), energía y Plug and Play; monitor de referencias de seguridad; llamadas a procedimiento locales (ALPC)
               NÚCLEO (kernel): planificación de hilos, interrupciones, sincronización     ← ntoskrnl.exe
               Controladores de dispositivo · win32k.sys (ventanas y gráficos)
               HAL (capa de abstracción del hardware, hal.dll)
HARDWARE       (con el hipervisor y la seguridad basada en virtualización, VBS, por encima en los equipos actuales)
```

| Proceso | Función |
|---|---|
| `System` (PID 4) | Hilos del núcleo |
| `smss.exe` | **Administrador de sesiones**: primer proceso de usuario; crea las sesiones y arranca `csrss` y `wininit`/`winlogon` |
| `csrss.exe` | Subsistema cliente/servidor de Win32 (consola, creación de procesos y apagado) |
| `wininit.exe` | Arranca `services.exe` y `lsass.exe` |
| `winlogon.exe` | Inicio y cierre de sesión interactivos, secuencia **Ctrl+Alt+Supr** |
| `lsass.exe` | **Autoridad de seguridad local**: autentica a los usuarios, crea los **tokens de acceso**, aplica la directiva de seguridad |
| `services.exe` | **Administrador de control de servicios** (SCM) |
| `svchost.exe` | Alojamiento de servicios compartidos |
| `explorer.exe` | *Shell* gráfico (escritorio, barra de tareas, explorador de archivos) |

### Configuración: registro y ficheros .ini

El **registro** es la base de datos jerárquica de configuración del sistema y de las aplicaciones (desde Windows 95 y NT), con cinco claves raíz: **HKEY_LOCAL_MACHINE** (HKLM, configuración del equipo), **HKEY_CURRENT_USER** (HKCU, del usuario actual), HKEY_USERS (de todos los perfiles cargados), HKEY_CLASSES_ROOT (asociaciones de ficheros y COM) y HKEY_CURRENT_CONFIG (perfil de *hardware*). Se guarda en ficheros llamados *hives* (`SAM`, `SECURITY`, `SOFTWARE`, `SYSTEM` en `%SystemRoot%\System32\config` y `NTUSER.DAT` en cada perfil) y se edita con `regedit`, `reg` o PowerShell (detalle en el tema IV.1). Antes del registro, Windows y sus programas guardaban la configuración de inicialización en ficheros de texto **`.ini`** (`win.ini`, `system.ini`), formato que siguen usando muchas aplicaciones (`desktop.ini`).

Extensiones habituales: `.exe` (ejecutable), `.dll` (biblioteca de enlace dinámico), `.sys` (controlador), `.msi` (paquete de Windows Installer), `.bat`/`.cmd` (procesos por lotes), `.ps1` (PowerShell), `.reg` (exportación del registro), `.lnk` (acceso directo).

### Sistemas de ficheros

**NTFS** es el sistema de ficheros de Windows: permisos con **ACL**, diario, cifrado de ficheros (**EFS**), compresión, cuotas, enlaces y puntos de unión, **instantáneas de volumen** (VSS) y flujos de datos alternativos; Microsoft da como límite 256 TB de fichero y volumen. **ReFS** (*Resilient File System*, desde Windows Server 2012) prioriza la **integridad y la disponibilidad**: sumas de comprobación, reparación en línea, clonación de bloques para máquinas virtuales y un límite de **35 PB**; no admite cuotas ni arranque. **FAT32** y **exFAT** se usan en soportes extraíbles.

### Seguridad

- Cada usuario, grupo y equipo se identifica con un **SID** (identificador de seguridad; el administrador integrado termina en **-500**); al iniciar sesión, `lsass` crea un **token de acceso** con los SID y privilegios del usuario, que el **monitor de referencias de seguridad** compara con la **DACL** de cada objeto (la **SACL** define qué se audita).
- **Control de cuentas de usuario** (UAC): incluso los administradores trabajan con un token sin privilegios y confirman la elevación.
- **BitLocker**: **característica de protección de la información** que **cifra volúmenes completos** para mitigar el acceso no autorizado a los datos (por ejemplo, si se roba el equipo), normalmente con el **TPM**; la clave de recuperación de 48 dígitos se custodia en Active Directory o Entra ID.
- **Microsoft Defender** (antivirus, cortafuegos, SmartScreen), **Windows Hello** (biometría y PIN ligados al TPM), **seguridad basada en virtualización** (VBS, HVCI y **Credential Guard**, que aísla las credenciales), **Smart App Control** y **App Control for Business**, **Windows LAPS** y actualizaciones mensuales.

### Windows de 64 bits

Windows de 64 bits (x64 y ARM64) ejecuta las aplicaciones de 32 bits mediante el subsistema **WOW64** (*Windows 32-bit on Windows 64-bit*):

- Un proceso de **64 bits no puede cargar una DLL de 32 bits** y un proceso de **32 bits no puede cargar una DLL de 64 bits**; para usar una DLL de otra arquitectura se encapsula en un servidor COM fuera de proceso.
- Sí se admiten **llamadas a procedimiento remoto (RPC) entre procesos de 64 y de 32 bits, tanto en el mismo equipo como entre equipos distintos**.
- Los binarios de **64 bits** están en `C:\Windows\System32` y los de **32 bits** en `C:\Windows\SysWOW64` (aunque los nombres sugieran lo contrario); las aplicaciones de 32 bits se instalan en `Program Files (x86)` y el registro se redirige a `Wow6432Node`.
- En los equipos **ARM64**, Windows 11 emula también aplicaciones x64.

### Administración

Herramientas gráficas (consolas MMC como `compmgmt.msc`, `services.msc`, `eventvwr.msc`, `gpedit.msc`, `diskmgmt.msc`; Administrador de tareas; Configuración), **CMD** y **PowerShell** (*cmdlets* con la forma **Verbo-Sustantivo**: `Get-Process`, `Stop-Service`, `Get-ChildItem`; Windows PowerShell 5.1 viene con el sistema y PowerShell 7 es multiplataforma), el gestor de paquetes **winget**, **Windows Terminal** y el **Subsistema de Windows para Linux** (**WSL 2**, que ejecuta un núcleo Linux real en una máquina virtual ligera: `wsl --install`). Las órdenes de administración están en el tema IV.1.

### Windows Server y Active Directory

Windows Server añade **roles** (servicios de dominio de Active Directory, DNS, DHCP, servicios de archivos y almacenamiento, **Hyper-V**, IIS, Escritorio remoto, WSUS, servicios de certificados) y **características** (clústeres de conmutación por error, BitLocker, copias de seguridad), que se instalan con el Administrador del servidor, **Windows Admin Center** o `Install-WindowsFeature`.

**Active Directory Domain Services (AD DS)** es el **servicio de directorio** de Windows Server: **almacena información sobre los objetos de la red** (usuarios, grupos, equipos, impresoras, carpetas compartidas) y **facilita a administradores y usuarios su búsqueda y uso**. Se organiza en **bosques**, **árboles**, **dominios** y **unidades organizativas** (en ese orden jerárquico), lo sirven los **controladores de dominio** y se apoya en **LDAP**, **Kerberos**, **DNS** y las **directivas de grupo** (GPO). Su equivalente en la nube es **Microsoft Entra ID** (antes Azure AD). Detalle en el tema IV.4.

## Sistemas Unix y Linux

### Unix: origen, familias y estándares

**Unix** nació en **1969** en los **Laboratorios Bell** de AT&T (Ken Thompson y Dennis Ritchie) y en **1973** se reescribió en **lenguaje C**, lo que lo hizo **portable** a otras máquinas; su código se licenció a universidades y empresas y dio lugar a dos grandes ramas: **BSD** (*Berkeley Software Distribution*, Universidad de California, desde 1977: *sockets* y TCP/IP, el editor `vi`) y **System V** (AT&T, 1983). Para unificar las variantes se crearon **POSIX** (IEEE **1003**, desde 1988; edición vigente **POSIX.1-2024**), que define la interfaz de programación, el *shell* y las utilidades, y la ***Single UNIX Specification*** de **The Open Group**, propietario de la marca **UNIX**, que certifica los sistemas conformes (macOS tiene la certificación UNIX 03).

| Sistemas Unix y derivados vigentes | Notas |
|---|---|
| **Oracle Solaris 11.4** | Origen SunOS/System V; ZFS, zonas; actualizaciones mediante SRU |
| **IBM AIX 7.3** | Servidores IBM Power |
| HP-UX | Servidores Itanium de HPE, en retirada |
| **FreeBSD**, **OpenBSD**, NetBSD | Descendientes libres de BSD: rendimiento y red, seguridad, portabilidad |
| **macOS** | Unix certificado basado en Darwin (ver más abajo) |

**Principios de Unix**: sistema **multiusuario y multitarea**; **todo es un fichero** (también los dispositivos, en `/dev`); árbol de directorios **único**; programas **pequeños** que hacen una sola cosa bien y se **combinan con tuberías**; configuración en **ficheros de texto**; el *shell* es un programa más; permisos de propietario, grupo y otros.

### Linux

**Linux** es un **núcleo** tipo Unix creado por **Linus Torvalds**, estudiante finlandés, que lo anunció el **25 de agosto de 1991** inspirándose en MINIX; se distribuye con licencia **GPL versión 2**. Unido a las herramientas del **proyecto GNU** (iniciado por Richard Stallman en 1983: compilador GCC, biblioteca C, *shell* bash, utilidades), forma el sistema **GNU/Linux**. Hoy domina los servidores, la nube, la supercomputación (todos los superordenadores del TOP500), los sistemas empotrados y, a través de Android, los móviles.

- **Núcleo monolítico modular**: los controladores y sistemas de ficheros se cargan como **módulos** en caliente (`lsmod`, `modprobe`); apropiativo, multiprocesador simétrico y portable (x86-64, ARM64, RISC-V, POWER, s390x).
- **Versiones**: 1.0 (1994), 2.6 (2003), 3.0 (2011), 4.0 (2015), 5.0 (2019), 6.0 (2022) y **7.0 (12 de abril de 2026)**; el cambio de número es convencional (Torvalds lo sube cuando la cifra secundaria se hace grande). Sale una versión nueva cada nueve o diez semanas; en octubre de 2026 la estable es la **7.2** y las de **soporte a largo plazo** (LTS) incluyen la 6.18, 6.12, 6.6 y 6.1. Novedades recientes: código en **Rust** desde la 6.1, planificador **EEVDF** desde la 6.6, **tiempo real** (PREEMPT_RT) integrado y `sched_ext` desde la 6.12. La versión en uso se consulta con `uname -r`.

### Distribuciones

Una **distribución** reúne el núcleo, las herramientas GNU, un **sistema de paquetes**, un instalador, un sistema de inicio (hoy **systemd**), entornos gráficos (GNOME, KDE Plasma, Xfce sobre **Wayland** o X11) y aplicaciones.

| Familia | Paquetes y herramientas | Distribuciones (situación en 2026) |
|---|---|---|
| **Debian** | `.deb`, `dpkg`, **`apt`** | **Debian 13 «trixie»** (9‑8‑2025), 12 «bookworm»; **Ubuntu** (Canonical: LTS cada dos años en abril, **24.04** y **26.04 LTS**), **Linux Mint**, **Trisquel** (basada en Ubuntu y formada solo por *software* libre), Kali, Raspberry Pi OS, distribuciones educativas autonómicas como LliureX o MAX |
| **Red Hat** | `.rpm`, `rpm`, **`dnf`** (antes `yum`) | **RHEL 10** (mayo de 2025), **Fedora** (comunitaria y precursora), CentOS Stream, AlmaLinux, Rocky Linux, Oracle Linux; CentOS Linux 7 terminó el 30‑6‑2024 |
| **SUSE** | `.rpm`, **`zypper`**, YaST | SUSE Linux Enterprise 16 (2025), **openSUSE** Leap y Tumbleweed |
| **Arch** | `pacman`; actualización continua (*rolling release*) | **Arch Linux**, Manjaro, EndeavourOS |
| Otras | Varios | Slackware (la más antigua en activo, 1993), Gentoo (compila desde el código), Alpine (ligera, contenedores), NixOS |
| Formatos universales | Flatpak, Snap, AppImage | Aplicaciones independientes de la distribución |

Las versiones de **Debian** llevan nombres de personajes de *Toy Story*: 7 «wheezy», 8 «jessie», **9 «stretch»**, **10 «buster»** (estable en 2019), 11 «bullseye», 12 «bookworm», **13 «trixie»** (estable actual) y 14 «forky» (en pruebas); la rama inestable es siempre «sid». PCLinuxOS (de origen Mandriva) y Ututo (basada en Gentoo) no derivan de Ubuntu; «Kilimanjaro» no es ninguna distribución.

### Usuarios, grupos y permisos

- Usuarios en **`/etc/passwd`** (`nombre:x:UID:GID:comentario:directorio:shell`), contraseñas cifradas en **`/etc/shadow`** y grupos en `/etc/group`. El **UID** identifica al usuario y el **GID** al grupo; el **administrador** es **`root`** (UID **0**); las cuentas de sistema suelen tener UID menores de 1000. `sudo` permite ejecutar órdenes con privilegios.
- `ls -l` muestra **10 caracteres**: el **tipo** y tres tríos de permisos (**propietario**, **grupo**, **otros**). Tipos: `-` fichero normal, `d` directorio, `l` enlace simbólico, **`c` dispositivo de caracteres**, **`b` dispositivo de bloques**, `s` *socket*, `p` tubería con nombre.
- Permisos **r** (lectura, **4**), **w** (escritura, **2**) y **x** (ejecución, **1**); en octal, una cifra por trío. Bits especiales SUID, SGID y *sticky*, `umask` y ACL en el tema IV.1.

| Orden | Resultado |
|---|---|
| `chmod 640 fich` | `rw-r-----`: **lectura y escritura** para el propietario, **lectura** para el grupo y **nada** para el resto |
| `chmod 416 fich` | `r----xrw-`: **lectura** para el propietario, **ejecución** para el grupo, **lectura y escritura** para los otros |
| `chmod 754 fich` | `rwxr-xr--`: el grupo puede **leer y ejecutar**; los otros, solo leer |
| `chmod u=rwx,g=rx,o= fich` | Notación simbólica equivalente a 750 |
| `chown ana:compras fich` | Cambia el propietario y el grupo |
| `getfacl fich` | Muestra por cada fichero su **nombre, propietario y grupo** y las entradas de su ACL |

**`chmod`** cambia los **permisos de acceso** de un fichero o directorio (no el propietario, que se cambia con `chown`, ni crea enlaces, que es `ln -s`).

### Procesos y órdenes básicas

`ps -ef` lista todos los procesos con las columnas **UID** (usuario **propietario**), **PID**, **PPID** (proceso padre), C (uso de CPU), STIME (hora de inicio), TTY, TIME (tiempo de CPU acumulado) y CMD (orden). `ps aux` añade %CPU, %MEM y **STAT** (estado: R en ejecución, S durmiendo, D espera no interrumpible, T detenido, **Z zombi**). En `ps -ef | grep $USER`, el *shell* sustituye `$USER` por el nombre del **usuario actual**, así que muestra los procesos de ese usuario.

| Orden | Función |
|---|---|
| `pwd` | Muestra el **directorio de trabajo actual** |
| `cd`, `ls`, `mkdir`, `rmdir`, `cp`, `rm`, `touch` | Navegar y gestionar ficheros |
| **`mv origen destino`** | **Mover o renombrar**: `mv PAGOS RECIBOS` renombra PAGOS como RECIBOS |
| `cat` / **`tac`** | Concatenar y mostrar ficheros / lo mismo **en orden inverso** (de la última línea a la primera) |
| `less`, `head` / **`tail`** | Paginar / las primeras / **las últimas líneas** de un fichero (`tail -f` sigue un registro en directo) |
| **`grep`** | Buscar un patrón: `grep -c Autor libro.txt` **cuenta las líneas** que lo contienen; `-n` numera, `-i` ignora mayúsculas, `-v` invierte, `-r` recursivo |
| `find`, `wc`, `sort`, `uniq`, `cut`, `sed`, `awk` | Buscar ficheros, contar, ordenar, filtrar y transformar texto |
| **`du`** / **`df`** | **Espacio usado por un directorio y sus subdirectorios** (`du -sh /var/log`) / espacio libre de cada sistema de ficheros montado |
| **`tar`** | Archivar: `c` crear, **`t` listar el contenido**, `x` extraer, `v` detallar, `f` fichero, `z` gzip: `tar tvf fichero.tar` lista, `tar xzvf copia.tar.gz` extrae |
| `ps`, `top`, `kill`, `nice`, **`renice`**, `nohup` | Procesos; `renice` cambia la prioridad de un proceso **en ejecución** (`nice` la fija al lanzarlo) |
| `man`, `which`, `file`, `whoami`, `id`, `passwd`, `su`, `sudo`, `ln -s`, `ssh`, `history` | Ayuda, localización y tipo de ficheros, identidad, contraseña, cambio de usuario, enlaces, acceso remoto |

El *shell* permite **redirecciones** (`>` sobrescribe, `>>` añade, `<` entrada, `2>` errores, `2>&1`), **tuberías** (`|`), **variables** (`$USER`, `$HOME`, `$PATH`), comodines (`*`, `?`, `[ ]`), ejecución en segundo plano (`&`), sustitución de órdenes (`$( )`) y **guiones** que empiezan por `#!/bin/bash`; el código de salida de la última orden está en `$?`.

```bash
ps -ef | grep "$USER"                       # procesos del usuario actual
du -sh /var/*  | sort -h | tail -5          # los cinco directorios que más ocupan en /var
grep -c "ERROR" /var/log/app.log            # número de líneas con ERROR
tar czvf /backup/etc-$(date +%F).tar.gz /etc   # copia comprimida de /etc con la fecha
find /home -type f -size +500M -mtime -7    # ficheros de más de 500 MB modificados en la última semana
```

**El editor `vi`/`vim`** tiene un **modo de órdenes** (normal), un **modo de inserción** y un modo de línea de órdenes (`:`): `i` inserta antes del cursor y `a` después; `o` abre una línea; **`x`** borra un carácter; **`dd`** **borra la línea** en la que está el cursor; `yy` copia la línea y `p` pega; `u` deshace; `/texto` busca; `:w` guarda, `:q` sale, `:wq` (o `ZZ`) guarda y sale y `:q!` sale sin guardar.

### macOS

**macOS** (Mac OS X desde 2001, OS X desde 2012 y macOS desde 2016) se basa en **Darwin**, un sistema de código abierto con el núcleo híbrido **XNU** (micronúcleo **Mach** + partes de **BSD** + el marco de controladores I/O Kit), y es un **Unix certificado**. Usa **APFS**, el sistema de inicio **launchd**, la interfaz Aqua y, desde Catalina, **zsh** como *shell* por defecto; la seguridad se apoya en **Gatekeeper** (solo aplicaciones firmadas y notarizadas), la **protección de la integridad del sistema** (SIP), **FileVault** (cifrado completo del disco), XProtect y el **Secure Enclave**. Desde 2020 funciona sobre procesadores **Apple silicon** (ARM), con Rosetta 2 para aplicaciones x86.

| Versión | Año | Versión | Año |
|---|---|---|---|
| 10.12 **Sierra** (primer «macOS») | 2016 | 13 **Ventura** | 2022 |
| 10.13 High Sierra (APFS) | 2017 | 14 Sonoma | 2023 |
| 10.15 Catalina (sin aplicaciones de 32 bits) | 2019 | 15 Sequoia | 2024 |
| 11 Big Sur (Apple silicon) | 2020 | **26 Tahoe** (numeración por año) | 2025 |
| 12 **Monterey** | 2021 | **27** | Septiembre de 2026 |

## Sistemas operativos para dispositivos móviles

### Características

Un SO móvil gestiona **teléfonos inteligentes, tabletas, relojes y otros dispositivos portátiles**, con requisitos propios: **consumo de energía** (gestión agresiva de la batería y de los procesos en segundo plano), **memoria y almacenamiento limitados** (el sistema puede cerrar aplicaciones inactivas), **interfaz táctil** y por voz, **sensores** (GPS, acelerómetro, cámara, biometría), **conectividad** permanente (4G/5G, Wi‑Fi, Bluetooth, NFC), distribución de aplicaciones por **tiendas**, actualizaciones por el aire (OTA) y un **modelo de seguridad** estricto: cada aplicación en su **caja de arena** (*sandbox*), **permisos** concedidos por el usuario, firma de código, arranque verificado, cifrado del almacenamiento y *hardware* seguro (TEE, Secure Enclave, chips como Titan M o StrongBox).

En septiembre de 2026, **Android** tenía alrededor del **69 %** del mercado mundial de móviles e **iOS** el **31 %** (StatCounter); el resto (HarmonyOS en China, KaiOS) es marginal fuera de sus nichos.

### Android

**Android** lo desarrolló Android Inc., comprada por **Google** en 2005; se presentó en 2007 con la Open Handset Alliance y el primer teléfono salió en 2008. Su base es el proyecto de código abierto **AOSP** (licencia Apache 2.0), sobre el que los fabricantes añaden sus capas y Google sus servicios (Google Play, Play Services).

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Aplicaciones del sistema y de usuario (Teléfono, Contactos, Chrome, apps)      │
├──────────────────────────────────────────────────────────────────────────────┤
│ Marco de aplicaciones en Java/Kotlin (Activity Manager, Package Manager,       │
│ Window Manager, Content Providers, Notification Manager, View System…)         │
├───────────────────────────────────────┬──────────────────────────────────────┤
│ Bibliotecas nativas C/C++ (libc Bionic,│ Android Runtime (ART): ejecuta el     │
│ OpenGL ES/Vulkan, SQLite, WebView…)    │ bytecode DEX con compilación AOT/JIT  │
├───────────────────────────────────────┴──────────────────────────────────────┤
│ HAL: capa de abstracción del hardware (cámara, audio, Wi‑Fi, sensores…)        │
├──────────────────────────────────────────────────────────────────────────────┤
│ Núcleo de LINUX (con Binder para la comunicación entre procesos; GKI)          │
└──────────────────────────────────────────────────────────────────────────────┘
```

- **Núcleo**: Android se basa en el **núcleo de Linux** (no en Mach, NT ni L4), con añadidos como **Binder** (comunicación entre procesos); desde Android 12 los fabricantes usan la **imagen de núcleo genérica** (GKI).
- **HAL**: interfaces estándar para el *hardware*; **Project Treble** (Android 8) separó la implementación del fabricante del sistema para acelerar las actualizaciones, y **Mainline** (Android 10) actualiza módulos del sistema desde Google Play. Por ejemplo, desde Android 14 el marco Wi‑Fi tiene **tres HAL**: la **HAL del fabricante** (*Vendor HAL*), la **del suplicante** (*Supplicant HAL*, para `wpa_supplicant`) y la **de Hostapd** (*Hostapd HAL*, para el punto de acceso).
- **Entorno de ejecución**: las aplicaciones se escriben en **Kotlin** (lenguaje preferido por Google desde 2019) o Java y se compilan a **bytecode DEX**, guardado en ficheros **`.dex`** (*Dalvik Executable*). Hasta Android 4.4 lo ejecutaba la máquina virtual **Dalvik** (compilación JIT); desde **Android 5.0** lo hace **ART** (*Android Runtime*), que compila por adelantado (AOT) guiado por perfiles.
- **Paquetes**: las aplicaciones se distribuyen como **`.apk`** (*Android Package*: un ZIP firmado con el código DEX, los recursos y el manifiesto `AndroidManifest.xml`); para publicar en Google Play se sube un **Android App Bundle** (`.aab`, obligatorio para las aplicaciones nuevas desde 2021), a partir del cual Play genera APK optimizados para cada dispositivo.
- **Componentes** de una aplicación: **actividades** (pantallas), **servicios** (tareas en segundo plano), **receptores de difusión** y **proveedores de contenido**, comunicados mediante **intents**.
- **Desarrollo**: **Android Studio** con el **SDK**; interfaz con Jetpack Compose; el **NDK** (*Native Development Kit*) permite escribir **partes de la aplicación en C y C++**, genera **bibliotecas binarias para cada arquitectura** de procesador que se invocan desde Java o Kotlin mediante **JNI**, se recomienda para tareas de **cálculo intensivo** (juegos, simulaciones, procesado de señal) y **permite reutilizar bibliotecas** existentes de C/C++.

| Versión | Nombre | Año | Novedad destacada |
|---|---|---|---|
| 1.5 / 1.6 | Cupcake / Donut | 2009 | Primeras versiones con nombre de postre |
| 2.0-2.1 / 2.2 / 2.3 | Eclair / Froyo / Gingerbread | 2009-2010 | |
| **3.x** | **Honeycomb** | 2011 | **Exclusiva para tabletas** |
| 4.0 | Ice Cream Sandwich | 2011 | Une móviles y tabletas |
| **4.1-4.3** | **Jelly Bean** | 2012 | Project Butter (fluidez) |
| 4.4 | KitKat | 2013 | ART en pruebas |
| 5.x | Lollipop | 2014 | **ART** por defecto, Material Design, SELinux obligatorio |
| 6.0 | Marshmallow | 2015 | **Permisos en tiempo de ejecución** |
| 7.x / 8.x | Nougat / Oreo | 2016-2017 | Multiventana / **Project Treble** |
| **9** | **Pie** | 2018 | Gestos; último nombre público de postre |
| 10 a 15 | (Q, R, S, Tiramisu, Upside Down Cake, Vanilla Ice Cream) | 2019-2024 | Desde Android 10 se usan solo números; Mainline, Material You (12), Espacio privado (15) |
| 16 | (Baklava) | Junio de 2025 | Lanzamiento adelantado al segundo trimestre |
| **17** | (Cinnamon Bun) | **16 de junio de 2026** | Versión vigente |

**Capas de personalización** de los fabricantes: **One UI** (Samsung), **HyperOS** (Xiaomi, sucesora de **MIUI**), **OriginOS** y Funtouch (vivo), ColorOS (OPPO), OxygenOS (OnePlus), la del Pixel; y **variantes** de AOSP sin servicios de Google: LineageOS, GrapheneOS, /e/OS. Android también se usa en relojes (**Wear OS**), televisores (Google TV) y automóviles (**Android Automotive**). PenPoint OS, en cambio, fue un sistema para ordenadores de lápiz de principios de los noventa.

**Seguridad de Android**: cada aplicación se ejecuta con **su propio usuario Linux** (caja de arena), **SELinux** en modo obligatorio, permisos que el usuario concede y revoca, **arranque verificado**, cifrado basado en ficheros, Google Play Protect, boletines de seguridad mensuales y perfil de trabajo para separar los datos corporativos. Desde el **30 de septiembre de 2026**, en Brasil, Indonesia, Singapur y Tailandia los dispositivos Android certificados solo instalan aplicaciones de **desarrolladores verificados** (también fuera de Google Play, con un procedimiento avanzado para las no registradas); Google prevé extenderlo a todo el mundo en 2027.

### iOS e iPadOS

**iOS** (iPhone OS hasta 2010) se presentó con el **iPhone en 2007**; **iPadOS** se separó en 2019 para las tabletas. Comparte con macOS el núcleo **XNU** (Darwin) y se organiza en capas: **Core OS** (núcleo, seguridad, controladores), **Core Services** (servicios básicos, datos), **Media** (gráficos, audio, vídeo) y **Cocoa Touch** (interfaz: UIKit). En 2025 Apple unificó la numeración por año: **iOS 26** (septiembre de 2025) y **iOS 27** (14 de septiembre de 2026, con el nuevo Siri basado en IA).

- **Desarrollo**: el IDE **Xcode** (para todas las plataformas de Apple: iOS, iPadOS, macOS, watchOS, tvOS y visionOS; con **Xcode Cloud** para integración continua y TestFlight para pruebas); el lenguaje **Swift** (2014), **de código abierto con licencia Apache 2.0** desde 2015 y utilizable también en macOS, Linux, Windows y servidores; antes, Objective-C. **SwiftUI** (2019) es un *framework* declarativo para crear interfaces en **cualquier dispositivo de Apple**; UIKit es el clásico de iOS. Los SDK son específicos de cada plataforma (iOS SDK, macOS SDK…).
- **Distribución**: solo a través de la **App Store**, con revisión previa; en la UE, por la Ley de Mercados Digitales, iOS admite desde 2024 tiendas alternativas y la distribución web. **Jailbreak** es eliminar las restricciones del sistema para instalar *software* no autorizado, y ***sideloading***, instalar aplicaciones desde fuera de la tienda oficial.
- **Seguridad**: **caja de arena** (*sandboxing*: **cada aplicación solo accede a sus propios recursos y datos** y a lo que el usuario autoriza), firma de código obligatoria, **Secure Enclave**, protección de datos por clases con cifrado por fichero, arranque seguro, Transparencia en el seguimiento de apps, Modo de aislamiento (*Lockdown Mode*) frente a ataques dirigidos y Protección de datos avanzada en iCloud.

### Otros sistemas móviles

| Sistema | Situación |
|---|---|
| **HarmonyOS** (Huawei) | Desde HarmonyOS NEXT (2024) **sin compatibilidad con aplicaciones Android**; **HarmonyOS 6** (octubre de 2025); base libre OpenHarmony |
| **KaiOS** | Para teléfonos básicos con 4G (deriva de Firefox OS) |
| **Tizen** (Samsung, Linux Foundation) | Televisores y electrodomésticos; antes relojes |
| Sailfish OS (Jolla) y Ubuntu Touch | Herederos de **MeeGo** (Nokia e Intel, 2010) y del proyecto móvil de Canonical |
| **Históricos** | **Symbian** (Nokia), **BlackBerry OS**, **Windows Phone** y Windows 10 Mobile (sin soporte desde 2020), **webOS** (Palm, hoy en televisores LG), Firefox OS, Bada |
| Relojes y vehículos | **watchOS**, **Wear OS**, Android Automotive, CarPlay y Android Auto |

**Kotlin** y **Swift** son lenguajes de programación, no sistemas operativos; Knoppix, Ubuntu y SUSE son distribuciones Linux de escritorio.

### Gestión de dispositivos móviles en las organizaciones

Los dispositivos corporativos se administran con soluciones **MDM/UEM** (Microsoft Intune, Workspace ONE): inscripción automática (**Android Enterprise**, **Apple Business Manager**), perfiles de configuración, **separación del perfil de trabajo**, cifrado y código de bloqueo obligatorios, distribución de aplicaciones, actualizaciones y **borrado remoto**; el CCN publica guías de configuración segura para Android e iOS (temas IV.4 y IV.9).

## Normativa y estándares clave

| Norma o estándar | Qué regula | Puntos clave |
|---|---|---|
| **POSIX** (IEEE 1003.1, ISO/IEC 9945; edición **POSIX.1-2024**) | Interfaz portable de los sistemas tipo Unix | Llamadas al sistema (`fork`, `exec`, señales), *shell* y utilidades |
| ***Single UNIX Specification*** (The Open Group) | Certificación de la marca UNIX | macOS, AIX y Solaris certificados |
| **FHS 3.0** (Linux Foundation) | Jerarquía de directorios de Linux | `/bin`, `/boot`, `/etc`, `/home`, `/var`, `/dev`, `/proc` |
| Licencia **GPL v2** / **Apache 2.0** | Núcleo Linux / AOSP y Swift | *Software* libre y de código abierto |
| Especificación **UEFI** y Secure Boot | Firmware y arranque | Requisito de Windows 11 junto con TPM 2.0 |
| Directiva del ciclo de vida de Microsoft | Soporte de Windows | 24/36 meses por versión de Windows 11; Windows 10 sin soporte desde el 14‑10‑2025; Windows Server con 5 + 5 años |
| Android CDD (documento de definición de compatibilidad) | Requisitos para que un dispositivo sea Android certificado | Base de Google Play y de la verificación de desarrolladores |
| Real Decreto 311/2022 (ENS), [op.exp.2], [op.exp.3] y [op.exp.4] | Configuración de seguridad, su gestión y el mantenimiento y actualizaciones | Bastionado según guías **CCN-STIC** (serie 500 para Windows y otras series para Linux y móviles) y parches al día |

## Lo que más cae en el examen

Es uno de los temas con más preguntas del bloque II: **59** entre 2016 y 2025, **41 de ingreso libre** (8 en 2016, 7 en 2018, 6 en 2019, 2 en 2021, 5 en 2023, 4 en 2024, 2 en la convocatoria de 2025 y 7 en su llamamiento extraordinario) y **18 de promoción interna** (4 en 2018, 5 en 2019, 3 en 2021 y 2 en 2023, 2024 y 2025).

| Bloque | Preguntas | Exámenes |
|---|---|---|
| **Linux: órdenes, permisos y directorios**: `chmod` (416, 640, función de la orden), permisos `rwxr-xr--`, tipo `c` de dispositivo, `getfacl`, `du`, `tar tvf`, `grep -c`, `mv` para renombrar, `tac`, `tail`, `pwd`, `renice`, `ps -ef` (columna UID; con `grep $USER`), `dd` en `vi`, directorios `/bin`, `/boot` y `/etc` (×2) | 21 | LI 2016, 2018, 2019, 2021 y 2025‑ext; PI 2018, 2019, 2021 y 2025 |
| **Sistemas móviles**: Android (`.apk`, `.dex`, núcleo **Linux** (×2), Honeycomb para tabletas, Jelly Bean 4.1, **Pie = 9** (×2), NDK (×2), HAL de Wi‑Fi, capas de personalización), iOS (*sandboxing*, Xcode y **SwiftUI**, **Swift** de código abierto), qué es un SO móvil (MeeGo sí, Kotlin no) | 17 | LI 2016, 2018, 2019, 2023, 2024, 2025 y 2025‑ext; PI 2018, 2019, 2024 y 2025 |
| **Conceptos**: funciones del SO, **núcleo** (×2), `fork()`, `init`, identificadores de proceso (no existe TPID), **planificador a corto plazo**, algoritmos de planificación y **Round Robin** con *quantum*, **BCP**, **hilos**, proceso **zombi** | 12 | LI 2018, 2019, 2023, 2024 y 2025‑ext; PI 2021 y 2023 |
| **Windows**: **ReFS**, **BitLocker**, DLL y RPC en Windows de 64 bits, ficheros **`.ini`**, **AD DS** | 5 | LI 2018, 2019, 2023 y 2025‑ext; PI 2019 |
| **Distribuciones y versiones**: Debian 10 «buster» y 9 «stretch», distribución basada en Ubuntu (**Trisquel**), cuál no es distribución, macOS más reciente | 4 | LI 2016, 2019 y 2023 |

Patrón: órdenes y permisos de Linux con opciones parecidas, versiones y nombres en clave (Android, Debian, macOS: ojo con la fecha del examen), siglas de desarrollo móvil (NDK, JNI, `.dex`, SwiftUI) y definiciones de conceptos clásicos (BCP, planificadores, zombi, hilos).

## Trampas habituales

- El **núcleo** controla procesos, memoria y dispositivos y gestiona la multitarea; **no es el núcleo del procesador** ni gestiona la interfaz gráfica.
- El SO es *software*; **no** es «el conjunto de *software* y *hardware*» del ordenador. Sí son funciones suyas planificar la CPU, controlar las autorizaciones y tratar las interrupciones.
- `fork()` devuelve **al padre el PID del hijo** y **al hijo 0** (no el PID del padre); el hijo es una copia del padre.
- **`init`/systemd** es el primer proceso del sistema (PID 1), no el arranque de un usuario; **UID** = usuario, **GID** = grupo, **root** = administrador.
- Identificadores de un proceso: **PID**, **PPID**, **UID**, GID; el de un hilo es **TID** («TPID» no existe).
- **Planificador a corto plazo** = qué proceso entra en la CPU; a medio plazo = suspensión e intercambio; a largo plazo = admisión.
- **Round Robin** asigna un **quantum**; FCFS = orden de llegada; SJF = ráfaga más corta; no existe un «algoritmo de agrupación».
- **BCP/PCB** = estructura con la información del proceso (no la tabla de páginas, el vector de interrupciones ni el descriptor de segmento).
- **Zombi** = terminado pero aún en la tabla de procesos; **huérfano** = sin padre (lo adopta init); **demonio** = en segundo plano.
- Concurrencia dentro de un proceso = **hilos** (no segmentación, paginación ni prepaginación).
- Interbloqueo: **cuatro** condiciones (exclusión mutua, retención y espera, no expropiación, espera circular); el **banquero** es de **evitación**.
- FIFO sufre la **anomalía de Belady**; el **óptimo** no es realizable; LRU sí se aproxima en la práctica.
- **`chmod 640`** = `rw-r-----`; **`chmod 416`** = propietario `r`, grupo `x`, otros `rw`; en `rwxr-xr--` el grupo **lee y ejecuta**.
- En `ls -l`, **`c`** = dispositivo de **caracteres**, `b` = de bloques, `d` = directorio, `l` = enlace.
- **`du`** = espacio de un directorio y sus subdirectorios; **`df`** = espacio libre de los sistemas de ficheros; `quota` = cuotas.
- **`tar t`** lista, **`x`** extrae, **`c`** crea; `a` no es una operación válida de `tar`.
- **`grep -c patrón fichero`** cuenta líneas (el patrón va **antes** del fichero); `-n` numera.
- **`mv`** renombra (`mv PAGOS RECIBOS`: el nombre antiguo primero); `rm` borra.
- **`tac`** muestra al revés; **`tail`** las últimas líneas; **`pwd`** el directorio actual (no cambia la contraseña: eso es `passwd`); **`renice`** cambia la prioridad de un proceso en ejecución (`nice` al lanzarlo).
- En `vi`, **`dd`** borra la línea, `x` un carácter, `i` y `a` insertan.
- `ps -ef`: la columna del **propietario** es **UID**; PID es el proceso, PPID el padre y CMD la orden.
- `/bin` = **ejecutables y utilidades** del sistema; **`/etc` = configuración**; `/boot` = **arranque**; `/root` = directorio de root; `/dev` = dispositivos; `/proc` = procesos.
- **ReFS** = *Resilient File System* (no «repetible»), de Windows Server; no es de macOS (que usa APFS).
- Windows de 64 bits: un proceso de 64 bits **no carga** DLL de 32 y viceversa, pero **RPC entre 32 y 64 bits funciona en el mismo equipo y entre equipos**; los binarios de 32 bits están en **SysWOW64**.
- **BitLocker** cifra volúmenes para proteger la información (no desfragmenta ni da acceso remoto).
- **AD DS** almacena información de los objetos de la red y facilita su búsqueda y uso (no es un dispositivo ni una herramienta de monitorización).
- Configuración de inicialización clásica de Windows: ficheros **`.ini`**.
- Android: núcleo **Linux**; paquetes **`.apk`** (y `.aab` para Play); ejecutables **`.dex`**; **Honeycomb (3.x)** solo tabletas; **Jelly Bean = 4.1-4.3**; **Pie = 9**; el **NDK** sí permite reutilizar bibliotecas C/C++; Wi‑Fi tiene las HAL de fabricante, suplicante y **Hostapd**.
- iOS: ***sandboxing*** = cada aplicación solo accede a lo suyo (*jailbreaking* y *sideloading* son otra cosa); **Xcode** sirve para todas las plataformas de Apple; **SwiftUI** para cualquier dispositivo Apple; **Swift** es de código abierto (Apache 2.0) y no solo para iOS.
- **Kotlin** no es un SO; **MeeGo**, **Tizen**, Android e iOS sí; PenPoint OS no es una capa de Android (One UI, MIUI/HyperOS y OriginOS sí).
- Versiones «más recientes»: dependen de la fecha del examen (en 2023, macOS **Ventura**; en 2026, macOS 27; Debian estable en 2019, **10 «buster»**; hoy **13 «trixie»**).

## Repaso rápido

- SO = gestor de recursos y máquina extendida; funciones: procesos, memoria, ficheros, E/S, seguridad, red, interfaz, contabilidad.
- Tipos: monousuario/multiusuario, monotarea/multitarea (cooperativa o apropiativa), monoprocesador/SMP, lotes, tiempo compartido, tiempo real (estricto o flexible), de red o distribuidos, móviles y empotrados.
- Elementos: núcleo (modo privilegiado, anillo 0), llamadas al sistema, interrupciones, *drivers*, sistema de ficheros, *shell*, bibliotecas, servicios, cargador.
- Núcleos: monolítico (Linux, modular), micronúcleo (Mach, QNX, L4, MINIX 3), híbrido (Windows NT, XNU).
- Proceso = programa en ejecución con su BCP; estados nuevo, listo, ejecución, bloqueado, terminado; `fork`/`exec`/`wait`; zombi, huérfano, demonio; hilos.
- Planificadores a largo, medio y corto plazo; FCFS, SJF, SRTF, prioridades (envejecimiento), Round Robin (quantum), colas multinivel con realimentación; Windows 32 prioridades; Linux CFS → EEVDF, `nice` de −20 a 19.
- Sincronización: sección crítica, semáforos (P/V), *mutex*, monitores; interbloqueo con 4 condiciones de Coffman; prevención, evitación (banquero), detección.
- Memoria: particiones, fragmentación interna/externa, paginación (TLB, tablas multinivel), segmentación, memoria virtual, fallo de página, FIFO/óptimo/LRU/reloj, Belady, hiperpaginación.
- Ficheros: directorios en árbol, enlaces duro y simbólico, asignación contigua/enlazada (FAT)/indexada (i-nodos), diario; FAT32, exFAT, NTFS, ReFS, ext4, XFS, Btrfs, ZFS, APFS.
- E/S: programada, por interrupciones, DMA; búferes, caché, *spooling*; FCFS, SSTF, SCAN, C-SCAN, LOOK.
- Windows: NT (1993) → XP → 7 → 10 (fin 14‑10‑2025) → 11 (TPM 2.0; 24H2, 25H2, 26H1); Server 2025; HAL, núcleo y ejecutivo; `lsass`, `winlogon`, `services`; registro (HKLM, HKCU); NTFS y ReFS; SID, tokens, UAC, BitLocker; WOW64; PowerShell, WSL 2; AD DS.
- Unix: Bell Labs 1969, C 1973, BSD y System V, POSIX.1-2024; Linux: Torvalds 1991, GPLv2, GNU/Linux, núcleo 7.0 (abril de 2026), LTS 6.18; distribuciones Debian 13, Ubuntu 26.04 LTS, RHEL 10, SUSE, Arch.
- Linux práctico: `/etc/passwd`, UID 0 = root; permisos rwx (4, 2, 1); tipos `- d l c b s p`; `ps -ef` (UID, PID, PPID, CMD); `du`, `df`, `tar`, `grep -c`, `mv`, `tac`, `tail`, `renice`, `pwd`; `vi` (`dd`, `x`, `:wq`).
- macOS: Darwin/XNU, Unix certificado, APFS, Gatekeeper, SIP, FileVault; Ventura 13 (2022) … Tahoe 26 (2025), 27 (2026).
- Android: núcleo Linux, HAL, ART (antes Dalvik), `.dex`, `.apk`/`.aab`, Kotlin, NDK con JNI; Honeycomb tabletas, Jelly Bean 4.1, Pie 9, Android 17 (junio de 2026); caja de arena por UID y SELinux; verificación de desarrolladores desde septiembre de 2026.
- iOS: XNU, capas Core OS, Core Services, Media y Cocoa Touch; Xcode, Swift (Apache 2.0), SwiftUI; App Store y tiendas alternativas en la UE; *sandboxing*, Secure Enclave; iOS 27 (14‑9‑2026); cuota mundial ≈ 31 % frente al 69 % de Android.

## Fuentes

- IEEE/The Open Group, POSIX.1-2024 (IEEE Std 1003.1-2024): https://pubs.opengroup.org/onlinepubs/9799919799/
- Linux Foundation, *Filesystem Hierarchy Standard* 3.0: https://refspecs.linuxfoundation.org/FHS_3.0/fhs/index.html
- The Linux Kernel Archives (versiones estable y de soporte largo): https://www.kernel.org/
- Debian, versiones de Debian: https://www.debian.org/releases/
- Red Hat Enterprise Linux, ciclo de vida: https://access.redhat.com/support/policy/updates/errata
- Microsoft, ciclo de vida de Windows 11: https://learn.microsoft.com/es-es/lifecycle/products/windows-11-enterprise-and-education
- Microsoft, información sobre versiones de Windows 11: https://learn.microsoft.com/en-us/windows/release-health/windows11-release-information
- Microsoft, *Process Interoperability* (procesos de 32 y 64 bits): https://learn.microsoft.com/en-us/windows/win32/winprog64/process-interoperability
- Microsoft, *Resilient File System (ReFS) overview*: https://learn.microsoft.com/en-us/windows-server/storage/refs/refs-overview
- Microsoft, *Active Directory Domain Services overview*: https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/get-started/virtual-dc/active-directory-domain-services-overview
- Android Open Source Project, arquitectura de Android: https://source.android.com/docs/core/architecture
- Android Open Source Project, HAL de Wi‑Fi: https://source.android.com/docs/core/connect/wifi-hal
- Android Developers, NDK: https://developer.android.com/ndk/guides
- Android Developers, verificación de desarrolladores: https://developer.android.com/developer-verification/guides
- Apple, *Platform Security Guide*: https://support.apple.com/guide/security/welcome/web
- Apple Newsroom, actualizaciones de iOS 27 y macOS 27 (14‑9‑2026): https://www.apple.com/newsroom/2026/09/major-updates-for-apples-software-platforms-are-now-available/
- Swift.org (lenguaje de código abierto): https://www.swift.org/
- StatCounter, cuota de mercado de sistemas operativos móviles: https://gs.statcounter.com/os-market-share/mobile/worldwide
