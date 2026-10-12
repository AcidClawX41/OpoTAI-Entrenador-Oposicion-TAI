# II.5 · Sistemas de gestión de bases de datos: relacionales, orientados a objetos y NoSQL

Este tema estudia el **software que gestiona las bases de datos**: qué es un sistema de gestión de bases de datos (SGBD), qué funciones cumple y de qué **componentes** se compone. Después repasa sus tres grandes familias:

- los **SGBD relacionales** (SGBDR), basados en el modelo de Codd y en SQL, que siguen dominando la gestión administrativa;
- los **SGBD orientados a objetos** (SGBDOO) y su variante de compromiso, los **objeto-relacionales** (SGBDOR);
- los **SGBD NoSQL** (clave-valor, documentales, de familias de columnas y de grafos), nacidos para la escala de Internet y los grandes volúmenes de datos.

El tema se apoya en otros tres. El **diseño** (modelo E-R, paso a tablas y normalización) y el detalle del **modelo relacional** están en el tema III.1. El **lenguaje SQL**, las transacciones vistas desde el programador, los procedimientos y los disparadores están en el III.3. La **administración** (instancias, usuarios, puertos, copias, alta disponibilidad) está en el IV.2. Aquí se explica **cómo es por dentro** un SGBD y **en qué se diferencian** las familias, que es lo que pregunta el tribunal.

En el examen han caído **26 preguntas** entre 2016 y 2025: 23 en ingreso libre y 3 en promoción interna, incluidas 2 de reserva y 1 anulada. Dominan cuatro bloques: las **reglas y objetivos de Codd**, los **conceptos de las bases de datos orientadas a objetos** (OID, constructores de colección, OQL, características obligatorias), la **clasificación de los NoSQL** (qué producto es de qué tipo, Cypher, Neo4j) y algunos **componentes de productos concretos** (espacios de tablas de Oracle, Machine Learning Services de SQL Server).

## 1. Base de datos y sistema de gestión de bases de datos

### 1.1 Conceptos

- **Base de datos (BD)**: colección de datos **relacionados** entre sí, **integrados** (con la mínima redundancia), almacenados con un **esquema** que los describe y **compartidos** por varios usuarios y aplicaciones.
- **Sistema de gestión de bases de datos (SGBD)**: conjunto de programas que permite **definir, construir, manipular, proteger y compartir** bases de datos. Se sitúa entre los datos físicos y los usuarios o aplicaciones y les oculta los detalles de almacenamiento. En inglés, *DBMS* (*Database Management System*).
- **Sistema de base de datos**: la base de datos más el SGBD, las aplicaciones y las personas que lo usan y administran.
- **Diccionario de datos o catálogo**: la «base de datos sobre la base de datos». Guarda los **metadatos**: tablas, columnas, tipos, restricciones, índices, vistas, usuarios, privilegios y estadísticas.
- **Esquema** frente a **instancia**: el esquema es la descripción, estable en el tiempo (la *intensión*); la instancia u ocurrencia es el contenido en un momento dado (la *extensión*).

### 1.2 Del sistema de ficheros al SGBD

Antes de los SGBD cada aplicación tenía **sus propios ficheros** (tema II.3). Eso provocaba problemas que el enfoque de bases de datos resuelve:

| Problema de los ficheros independientes | Cómo lo resuelve el SGBD |
|---|---|
| **Redundancia** e **inconsistencia**: el mismo dato repetido en varios ficheros y con valores distintos | Datos **integrados** con redundancia mínima y **controlada** |
| **Dependencia** entre programas y datos: cambiar el formato de un fichero obliga a cambiar los programas | **Independencia física y lógica** gracias a los niveles de esquema |
| Dificultad para obtener información no prevista | **Lenguajes de consulta** declarativos (SQL) |
| Integridad dispersa en el código de cada programa | **Restricciones** declaradas una vez en el catálogo |
| Accesos concurrentes que se pisan | **Control de concurrencia** y transacciones |
| Pérdida de datos tras un fallo | **Recuperación** con el registro de transacciones y las copias |
| Seguridad por fichero, poco granular | **Autorización** por usuario, rol, objeto y operación |

**Inconvenientes** del SGBD: complejidad, coste de licencias, *hardware* y personal especializado, sobrecarga para aplicaciones muy simples y mayor impacto de un fallo, porque todo depende del mismo sistema.

### 1.3 Objetivos y funciones de un SGBD

Un SGBD completo ofrece estos **servicios**:

1. **Almacenamiento, recuperación y actualización** de los datos, ocultando su organización física.
2. **Catálogo accesible** por los usuarios, con la descripción de los datos (metadatos).
3. **Transacciones**: conjuntos de operaciones que se ejecutan como una unidad, todas o ninguna.
4. **Control de concurrencia**: muchos usuarios a la vez sin resultados incorrectos.
5. **Recuperación** ante fallos de transacción, de sistema o de disco.
6. **Autorización** (seguridad): solo los usuarios autorizados acceden a cada dato.
7. **Integridad**: los datos cumplen las restricciones definidas.
8. **Comunicación de datos**: acceso remoto por la red mediante protocolos e interfaces cliente.
9. **Independencia de los datos** respecto de los programas.
10. **Utilidades**: carga y descarga masiva, copias, reorganización, estadísticas y monitorización.

### 1.4 Evolución: generaciones de SGBD

| Época | Modelo | Hitos y productos |
|---|---|---|
| Años sesenta | **En red** y **jerárquico** (navegacionales) | **IDS** de Charles Bachman en General Electric, considerado el primer SGBD; **IMS** de IBM (jerárquico, nacido para el programa Apolo); informe **CODASYL DBTG** de 1971 (modelo en red: registros y conjuntos) |
| 1970 | **Relacional** | Artículo de **E. F. Codd** (IBM, 1970); prototipos **System R** (IBM, origen de SQL) e **Ingres** (Berkeley, Stonebraker); **Oracle** (1979) es el primer SGBDR comercial con SQL; **DB2** (1983) |
| Años ochenta y noventa | **Orientado a objetos** y **objeto-relacional** | GemStone, O2, ObjectStore, Versant; *Manifiesto de bases de datos orientadas a objetos* (1989); estándar **ODMG** (1993-2000); Postgres e Illustra; **SQL:1999** incorpora los tipos de objeto |
| 2000-2010 | Almacenes de datos, columnares y en memoria; primeros **NoSQL** | Artículos de Google **Bigtable** (2006) y Amazon **Dynamo** (2007); Cassandra (2008), MongoDB y Redis (2009); el término **NoSQL** se populariza en 2009 |
| Años 2010 | **NewSQL**, nube y **multimodelo** | Google **Spanner** (2012), CockroachDB, TiDB; bases de datos como servicio (Amazon RDS y Aurora, Azure SQL Database) |
| Años 2020 | **Convergencia**: relacional + JSON + grafos + vectores | SQL:2023 (tipo `JSON` y grafos de propiedades), **GQL** (ISO/IEC 39075:2024), búsqueda vectorial para IA en Oracle 26ai, SQL Server 2025, PostgreSQL (pgvector), MySQL 9 y MariaDB |

### 1.5 La arquitectura ANSI/SPARC

El comité **ANSI/X3/SPARC** (1975-1978) separó la descripción de la base de datos en **tres niveles de esquema**. Se desarrolla en el tema III.1; para este tema basta con recordar:

| Nivel | Qué describe | Quién lo usa |
|---|---|---|
| **Externo** | Las **vistas** de cada usuario o aplicación: solo la parte que le interesa | Usuarios y programadores |
| **Conceptual** (a veces llamado **lógico**) | La estructura **global** de toda la base de datos: entidades, atributos, relaciones y restricciones | Diseñador y administrador |
| **Interno** (o **físico**) | Cómo se almacenan los datos: ficheros, registros, índices y métodos de acceso | SGBD y administrador |

![Arquitectura ANSI/SPARC: usuarios y aplicaciones acceden a vistas del nivel externo, que se corresponden con el esquema conceptual (estructura global de entidades, atributos, relaciones y restricciones), y este con el esquema interno (ficheros, registros, índices y métodos de acceso) sobre la base de datos almacenada; la correspondencia externo/conceptual da la independencia lógica y la conceptual/interno, la física](diagramas/II.5-ansi-sparc.svg)

*Figura: los tres niveles de esquema y las dos independencias que proporcionan.*

- La correspondencia **externo/conceptual** da la **independencia lógica**: se puede cambiar el esquema conceptual (por ejemplo, añadir una tabla o una columna) sin cambiar las vistas ni los programas.
- La correspondencia **conceptual/interno** da la **independencia física**: se puede cambiar el almacenamiento (un índice, una partición, otro disco) sin cambiar el esquema conceptual.
- No existe un nivel «contextual». El nivel **interno no** se llama «lógico». Por esas dos afirmaciones falsas se **anuló** una pregunta de 2023.

### 1.6 Lenguajes e interfaces

| Lenguaje | Para qué | Ejemplos en SQL |
|---|---|---|
| **LDD / DDL** (definición) | Crear, modificar y borrar estructuras del esquema | `CREATE`, `ALTER`, `DROP`, `TRUNCATE` |
| **LMD / DML** (manipulación) | Consultar y modificar los datos | `SELECT`, `INSERT`, `UPDATE`, `DELETE`, `MERGE` |
| **LCD / DCL** (control) | Conceder y retirar permisos | `GRANT`, `REVOKE` |
| Control de transacciones (TCL) | Delimitar transacciones | `COMMIT`, `ROLLBACK`, `SAVEPOINT` |
| Definición del almacenamiento (SDL) | Nivel interno: ficheros y espacios | `CREATE TABLESPACE` (Oracle), `CREATE INDEX` |

- Un LMD es **procedimental o navegacional** cuando el programador indica **cómo** recorrer los datos registro a registro, como en los modelos jerárquico y en red. Es **declarativo o no procedimental** cuando indica **qué** datos quiere y el SGBD decide cómo obtenerlos, como SQL.
- **QBE** (*Query By Example*, IBM, años setenta) es un lenguaje gráfico basado en el **cálculo relacional de dominios**; QUEL, el lenguaje de Ingres, se basaba en el cálculo de tuplas.
- Interfaces: clientes de línea de órdenes (SQL\*Plus, `sqlcmd`, `mysql`, `psql`), consolas gráficas, **SQL incrustado** en un lenguaje anfitrión con precompilador, y **API** de acceso: **ODBC** (basada en la parte CLI del estándar SQL), **JDBC** (Java), ADO.NET (.NET) y las interfaces nativas (OCI de Oracle).

**Usuarios** de un sistema de base de datos: el **administrador de la base de datos** (DBA: esquema físico, seguridad, rendimiento, copias), los **diseñadores**, los **programadores de aplicaciones** y los **usuarios finales**, que pueden ser esporádicos, paramétricos (usan transacciones predefinidas, como un cajero), sofisticados (escriben sus propias consultas) o autónomos (bases de datos personales).

### 1.7 Clasificación de los SGBD

| Criterio | Tipos |
|---|---|
| **Modelo de datos** | Jerárquico, en red, **relacional**, **orientado a objetos**, **objeto-relacional**, **NoSQL** (clave-valor, documental, familias de columnas, grafos), XML nativo, **multimodelo** |
| Número de usuarios | Monousuario o multiusuario |
| Distribución | **Centralizado** o **distribuido** (homogéneo, si todos los nodos usan el mismo SGBD, o heterogéneo; federado cuando los nodos son autónomos) |
| Tipo de carga | **OLTP** (muchas transacciones cortas), **OLAP** (consultas analíticas sobre almacenes de datos) o **HTAP** (ambas a la vez) |
| Ubicación de los datos | En disco o **en memoria** (SAP HANA, Oracle TimesTen, Redis) |
| Despliegue | En instalaciones propias, **en la nube** como servicio (DBaaS: Amazon RDS y Aurora, Azure SQL Database, Google Cloud SQL y AlloyDB, Oracle Autonomous Database) o **embebido** en la aplicación (SQLite, H2, Berkeley DB, DuckDB) |
| Licencia | Propietario (Oracle, SQL Server, Db2) o de código abierto (PostgreSQL, MySQL Community, MariaDB, SQLite, que es de dominio público) |

## 2. Componentes de un SGBD

### 2.1 Arquitectura funcional

Los libros de referencia dividen un SGBD en dos grandes módulos, el **procesador de consultas** y el **gestor de almacenamiento**, que trabajan sobre unas **estructuras en disco**:

```text
  Usuarios y aplicaciones (SQL interactivo, programas con JDBC/ODBC, herramientas)
                                 │
  ┌──────────────────────── PROCESADOR DE CONSULTAS ─────────────────────────┐
  │  Intérprete del LDD        Precompilador del LMD incrustado              │
  │  Compilador del LMD: análisis ─► comprobación con el catálogo ─►         │
  │                      OPTIMIZADOR (plan de ejecución)                     │
  │  Motor de evaluación / ejecución de consultas                            │
  └──────────────────────────────────┬───────────────────────────────────────┘
  ┌──────────────────────── GESTOR DE ALMACENAMIENTO ────────────────────────┐
  │  Gestor de autorización e integridad                                     │
  │  Gestor de transacciones = control de concurrencia (bloqueos, MVCC)      │
  │                            + recuperación (registro, puntos de control)  │
  │  Gestor de memoria intermedia (búfer o caché de páginas)                 │
  │  Gestor de ficheros (espacio en disco)                                   │
  └──────────────────────────────────┬───────────────────────────────────────┘
  ESTRUCTURAS EN DISCO: ficheros de datos · índices · diccionario de datos
                        · estadísticas · registro de transacciones (log)
```

| Componente | Función |
|---|---|
| **Intérprete o compilador del LDD** | Procesa las sentencias de definición y anota los metadatos en el **catálogo** |
| **Precompilador** | Extrae las sentencias SQL incrustadas en un programa (C, COBOL) y las sustituye por llamadas a funciones |
| **Compilador del LMD** | Analiza la consulta (sintaxis y semántica, comprobando nombres y permisos en el catálogo), la traduce a una expresión de **álgebra relacional** y la pasa al optimizador |
| **Optimizador de consultas** | Elige el **plan de ejecución** más barato entre los equivalentes: orden de las combinaciones, uso de índices, algoritmos (bucles anidados, *hash join*, *merge join*) |
| **Motor de evaluación** | Ejecuta el plan y devuelve el resultado |
| **Gestor de autorización e integridad** | Comprueba permisos y restricciones en cada operación |
| **Gestor de transacciones** | Garantiza las propiedades **ACID**: el **control de concurrencia** ordena las operaciones simultáneas y el **gestor de recuperación** restaura un estado coherente tras un fallo |
| **Gestor de memoria intermedia** (*buffer manager*) | Mantiene en memoria las páginas o bloques más usados y decide cuáles escribir o descartar (políticas como LRU) |
| **Gestor de ficheros** | Reserva espacio en disco y gestiona las estructuras de almacenamiento |
| **Diccionario de datos** | Metadatos consultables: `INFORMATION_SCHEMA` (estándar), vistas `DBA_`, `ALL_` y `USER_` de Oracle, `sys.*` de SQL Server, `pg_catalog` de PostgreSQL |
| **Registro de transacciones** (*log*, diario) | Anota cada cambio antes de aplicarlo, para poder **deshacer** (*undo*) y **rehacer** (*redo*) |

### 2.2 Procesamiento y optimización de consultas

Una consulta SQL pasa por cuatro fases:

1. **Análisis** léxico, sintáctico y semántico: se comprueba que la sentencia es correcta y que existen las tablas y columnas.
2. **Traducción** a un árbol de **álgebra relacional**: selección, proyección, combinación, etc. (tema III.1).
3. **Optimización**:
   - **heurística o basada en reglas**: aplica transformaciones que casi siempre mejoran, como hacer las **selecciones y proyecciones cuanto antes** o combinar primero las tablas más filtradas;
   - **basada en costes** (CBO): estima el coste de cada plan con las **estadísticas** del catálogo (número de filas, valores distintos, histogramas) y elige el menor. Es la que usan hoy todos los grandes SGBD; Oracle dejó de admitir su optimizador por reglas en la versión 10g. Por eso las estadísticas desactualizadas provocan planes malos.
4. **Ejecución** del plan elegido.

El plan se consulta con `EXPLAIN`:

```sql
-- PostgreSQL y MySQL: plan estimado y, con ANALYZE, ejecución real con tiempos
EXPLAIN ANALYZE
SELECT o.nombre, COUNT(*)
FROM   opositor o JOIN solicitud s ON s.dni = o.dni
WHERE  s.cod_conv = 'TAI-2026'
GROUP  BY o.nombre;

-- Oracle
EXPLAIN PLAN FOR SELECT * FROM solicitud WHERE cod_conv = 'TAI-2026';
SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY);

-- SQL Server: plan estimado en XML sin ejecutar la consulta
SET SHOWPLAN_XML ON;
```

**Índices**: estructuras auxiliares que aceleran el acceso a cambio de espacio y de un coste extra en cada escritura.

| Tipo | Características y uso |
|---|---|
| **Árbol B+** | El índice por defecto en todos los SGBDR: ordenado y equilibrado; sirve para igualdades, rangos y `ORDER BY` |
| ***Hash*** | Solo igualdades; muy rápido para búsquedas por clave exacta |
| **Mapa de bits** (*bitmap*) | Columnas con **pocos valores distintos** en almacenes de datos (Oracle); poco adecuado para OLTP con muchas escrituras |
| **Agrupado** (*clustered*) frente a no agrupado | En el agrupado las filas se guardan **físicamente ordenadas** por la clave del índice: solo puede haber **uno** por tabla (índice agrupado de SQL Server, clave primaria de InnoDB, tablas organizadas por índice de Oracle) |
| Basado en función | Indexa una expresión, como `UPPER(apellido)` |
| Columnar (*columnstore*) | Guarda por columnas y comprime; acelera consultas analíticas |
| Especializados | Texto completo; espaciales (árbol R); GiST, GIN, SP-GiST y BRIN de PostgreSQL; **vectoriales** (HNSW, IVF, DiskANN) para búsquedas por similitud |

### 2.3 Transacciones: propiedades ACID

Una **transacción** es una secuencia de operaciones que forma una **unidad lógica de trabajo**. Termina con `COMMIT` (confirmar) o `ROLLBACK` (deshacer). El SGBD garantiza las propiedades **ACID**, acrónimo que acuñaron Härder y Reuter en 1983:

| Propiedad | Significado | Componente que la garantiza |
|---|---|---|
| **A**tomicidad | Se ejecutan **todas** las operaciones o **ninguna** | Gestor de recuperación (deshacer con el *log*) |
| **C**onsistencia (coherencia) | La transacción lleva la base de datos de un estado **válido** a otro válido, sin violar restricciones | Gestor de integridad y el propio programador |
| A**i**slamiento (*isolation*) | Las transacciones concurrentes no interfieren: el resultado equivale a ejecutarlas **en serie** (según el nivel de aislamiento) | Control de concurrencia |
| **D**urabilidad (persistencia) | Lo confirmado **sobrevive** a cualquier fallo posterior | Gestor de recuperación (*log* en almacenamiento estable y copias) |

> ACID = **Atomicidad, Consistencia, aIslamiento y Durabilidad** (LI 2023). La «D» nunca es «disponibilidad» ni «distribución». En un examen de 2015 la durabilidad aparecía como **persistencia**, que es su sinónimo.

**Estados de una transacción**: activa → parcialmente confirmada (tras la última operación) → **confirmada**; o bien activa → **fallida** → **abortada** (se deshace y se puede reiniciar o cancelar).

### 2.4 Recuperación

- **Tipos de fallo**: de **transacción** (error lógico, interbloqueo), de **sistema** (caída del servidor con pérdida de la memoria, pero no del disco) y de **soporte** (rotura del disco).
- **Registro de transacciones** (*log*, diario o bitácora): anota para cada cambio la transacción, el dato, el **valor anterior** (para deshacer) y el **valor nuevo** (para rehacer).
- **Regla del registro anticipado** (**WAL**, *write-ahead logging*): el registro de un cambio se escribe en almacenamiento estable **antes** que la página de datos modificada, y una transacción no se da por confirmada hasta que **todos sus registros** están en disco. PostgreSQL llama a su registro precisamente **WAL**; Oracle lo llama ***redo log*** y SQL Server, ***transaction log*** (fichero `.ldf`).
- **Puntos de control** (*checkpoints*): cada cierto tiempo se escriben en disco las páginas modificadas y se anota en el registro. Tras una caída solo hay que procesar el registro **desde el último punto de control**.
- **Tras una caída del sistema**: se **rehacen** (*redo*) las transacciones confirmadas cuyos cambios quizá no llegaron al disco y se **deshacen** (*undo*) las que no se confirmaron. El algoritmo **ARIES** (IBM, 1992), base de muchos SGBD, lo hace en tres fases: análisis, rehacer y deshacer.
- **Tras un fallo de soporte**: se restaura la última **copia de seguridad** y se aplican los registros **archivados** hasta el momento deseado: recuperación a un instante o PITR (tema IV.2).

### 2.5 Control de concurrencia

Sin control, las transacciones simultáneas provocan **anomalías**: actualización perdida, lectura sucia, lectura no repetible y lectura fantasma (tema III.3). El objetivo es que toda ejecución concurrente sea **serializable**, es decir, equivalente a alguna ejecución en serie.

**Bloqueos** (*locks*):

| Solicitado \ Concedido | Compartido (S, lectura) | Exclusivo (X, escritura) |
|---|---|---|
| **Compartido (S)** | Compatible | Espera |
| **Exclusivo (X)** | Espera | Espera |

- **Granularidad**: fila, página, tabla o base de datos. Los bloqueos **de intención** (IS, IX, SIX) se ponen en los niveles superiores para avisar de que hay bloqueos más finos debajo. SQL Server practica el **escalado de bloqueos**: convierte muchos bloqueos de fila en uno de tabla.
- **Bloqueo en dos fases (2PL)**: cada transacción tiene una fase de **crecimiento**, en la que solo adquiere bloqueos, y otra de **decrecimiento**, en la que solo los libera. Garantiza la **serializabilidad**. La variante **estricta** mantiene los bloqueos exclusivos **hasta el `COMMIT`** y evita los *rollbacks* en cascada.
- **Interbloqueo** (*deadlock*): dos o más transacciones esperan cada una un recurso bloqueado por otra. Se **detecta** con un **grafo de espera** (un ciclo es un interbloqueo) y se resuelve abortando una **víctima**. También se puede **prevenir** con marcas de tiempo (esquemas *wait-die* y *wound-wait*) o limitar con tiempos de espera.
- **Ordenación por marcas de tiempo** y **control optimista** (validación al final, útil cuando hay pocos conflictos): alternativas sin bloqueos.
- **Control multiversión (MVCC)**: cada escritura crea una **nueva versión** de la fila y cada lector ve una **instantánea** coherente. **Los lectores no bloquean a los escritores ni los escritores a los lectores**. Lo usan Oracle (con los segmentos de *undo*), PostgreSQL, InnoDB de MySQL y MariaDB, y SQL Server en sus modos de instantánea (`READ_COMMITTED_SNAPSHOT` y `SNAPSHOT`).

**Niveles de aislamiento** de SQL (detalle en el tema III.3):

| Nivel | Lectura sucia | Lectura no repetible | Fantasma | Por defecto en |
|---|---|---|---|---|
| `READ UNCOMMITTED` | Posible | Posible | Posible | — |
| `READ COMMITTED` | Evita | Posible | Posible | **Oracle, SQL Server, PostgreSQL** |
| `REPEATABLE READ` | Evita | Evita | Posible | **MySQL y MariaDB (InnoDB)** |
| `SERIALIZABLE` | Evita | Evita | Evita | — |

### 2.6 Arquitecturas de despliegue y bases de datos distribuidas

- **Centralizada**: SGBD y datos en un único equipo.
- **Cliente/servidor**: el servidor de base de datos atiende peticiones de clientes; en **tres capas** se interpone un servidor de aplicaciones (tema III.6).
- **Paralela**, según lo que comparten los nodos:
  - **memoria compartida**;
  - **disco compartido**, como Oracle RAC, donde varias instancias abren la misma base de datos;
  - **nada compartido** (*shared-nothing*): cada nodo con su CPU, memoria y disco. Escala mejor y es la arquitectura de Teradata, de la mayoría de los NoSQL y de los SQL distribuidos.
- **Distribuida**: los datos están repartidos en varios nodos conectados por red, pero el usuario los ve como **una sola base de datos**. Elementos clave:
  - **fragmentación**: **horizontal** (por filas, por ejemplo una partición por comunidad autónoma), **vertical** (por columnas) o mixta;
  - **replicación**: copias del mismo fragmento en varios nodos, **síncrona** o **asíncrona**;
  - **transparencias**: de localización, de fragmentación y de replicación;
  - **compromiso en dos fases** (**2PC**): el **coordinador** pide a los participantes que se preparen (fase de **votación**) y, si todos responden que sí, ordena confirmar (fase de **decisión**). Si uno vota no, se aborta en todos. Su punto débil es que bloquea si cae el coordinador. Lo implementa el estándar **XA** de X/Open.
- C. J. Date resumió en **12 reglas** (1987) lo que debe cumplir un SGBD distribuido: autonomía local, no depender de un sitio central, operación continua, independencia de la localización, de la fragmentación y de la replicación, consultas y transacciones distribuidas e independencia del *hardware*, del sistema operativo, de la red y del SGBD.

## 3. SGBD relacionales

### 3.1 Características

Un **SGBD relacional** (SGBDR, en inglés *RDBMS*) gestiona los datos según el **modelo relacional** que **Edgar F. Codd** (IBM) publicó en 1970. Sus rasgos esenciales, que el tema III.1 desarrolla:

- **Una sola estructura**: la **relación** o **tabla**. Toda la información, incluido el catálogo, se representa como **valores en tablas**. No hay punteros visibles: las relaciones entre tablas se expresan con **valores comunes** (claves primarias y ajenas).
- **Terminología**: relación (tabla), **tupla** (fila), **atributo** (columna), **dominio** (conjunto de valores válidos de un atributo; el atributo «toma sus valores» de un dominio), **grado** (número de atributos) y **cardinalidad** (número de tuplas).
- **Claves**: superclave (identifica cada tupla), clave candidata (superclave mínima), **clave primaria** (la candidata elegida) y **clave ajena o foránea** (atributo que **referencia la clave primaria de otra tabla**, o de la misma).
- **Integridad**: de entidad (la clave primaria no puede ser nula) y referencial (toda clave ajena no nula existe en la tabla referenciada), además de las restricciones de dominio y de usuario (`NOT NULL`, `UNIQUE`, `CHECK`).
- **Lenguaje declarativo** basado en el **álgebra** y el **cálculo relacional**: **SQL**, normalizado por ANSI (1986) e ISO (1987) y hoy en su edición **ISO/IEC 9075:2023**. Opera sobre **conjuntos** de filas, no fila a fila.
- **Transacciones ACID**, control de concurrencia y recuperación.
- **Esquema rígido** definido antes de cargar datos (*schema-on-write*) y **normalización** para evitar redundancias.
- **Escalado** tradicionalmente **vertical** (un servidor más potente); el escalado horizontal exige réplicas, particionado o productos de SQL distribuido.

**Objetivos que Codd perseguía** con su modelo, según la presentación clásica de los manuales españoles:

| Objetivo | Qué significa |
|---|---|
| **Independencia física** | Cambiar cómo se almacenan los datos no afecta a su manipulación lógica ni a los programas |
| **Independencia lógica** | Añadir, borrar o modificar objetos de la base de datos no afecta a los programas ni a los usuarios que no los usan |
| **Flexibilidad** | Presentar a cada usuario los datos de la forma que más le convenga (vistas) |
| **Uniformidad** | Todas las estructuras lógicas tienen el mismo aspecto: **tablas** |
| **Sencillez** | Lo anterior, junto con lenguajes sencillos, hace el modelo fácil de entender y usar |

> La «**independencia conceptual**» **no** es un objetivo de Codd (LI 2016). Tampoco existe la «independencia contextual».

**Diferencia con los modelos anteriores**: en los modelos jerárquico y en red las relaciones se implementan con **punteros físicos** y el programador **navega** registro a registro; en el relacional, con **valores**, y el acceso es **asociativo** (por contenido) y declarativo.

### 3.2 Las reglas de Codd

En 1985, ante productos que se anunciaban como relacionales sin serlo, Codd publicó **12 reglas**, más una **regla 0** o fundamental, que debe cumplir un SGBD para considerarse relacional. Son lo más preguntado de este tema: los distractores **inventan** reglas o **invierten** el sentido de una existente.

| N.º | Regla | Idea clave |
|---|---|---|
| 0 | **Fundamental** | El sistema gestiona la base de datos **exclusivamente** mediante sus capacidades relacionales |
| 1 | **Información** | Toda la información se representa de una sola forma: **valores en tablas** |
| 2 | **Acceso garantizado** | Todo dato es accesible combinando **nombre de tabla + valor de clave primaria + nombre de columna** |
| 3 | **Tratamiento sistemático de los valores nulos** | Existe una representación de la información **desconocida o no aplicable**, distinta de cualquier valor normal (ni cero ni cadena vacía) e independiente del tipo de datos |
| 4 | **Catálogo dinámico en línea basado en el modelo relacional** | La descripción de la base de datos se guarda en **tablas** que los usuarios autorizados consultan con el mismo lenguaje |
| 5 | **Sublenguaje de datos completo** | Al menos un lenguaje con sintaxis lineal que permita definir datos y vistas, manipularlos, definir la integridad, autorizar y delimitar transacciones |
| 6 | **Actualización de vistas** | Toda vista **teóricamente actualizable** debe poder actualizarse por el sistema |
| 7 | **Inserción, actualización y borrado de alto nivel** | Las operaciones de modificación trabajan sobre **conjuntos** de filas, no solo sobre filas sueltas |
| 8 | **Independencia física** de los datos | Los cambios en el almacenamiento o en los métodos de acceso no afectan a los programas |
| 9 | **Independencia lógica** de los datos | Los cambios en las tablas que no pierden información no afectan a los programas |
| 10 | **Independencia de la integridad** | Las restricciones se definen con el sublenguaje relacional y se guardan **en el catálogo**, no en los programas |
| 11 | **Independencia de la distribución** | Que la base de datos esté **distribuida** en varios servidores **no** afecta a los usuarios ni a los programas |
| 12 | **No subversión** | Si hay una interfaz de **bajo nivel** (registro a registro), **no** puede usarse para **saltarse** las reglas de integridad o de seguridad |

Reglas **falsas** que han aparecido como distractores: «cardinalidad de las entidades» (LI 2019), «**dependencia** de la distribución» (LI 2021), «integridad de paridad» (PI 2018) e «inserción, actualización y supresión **de bajo nivel**» (PI 2021).

### 3.3 Arquitectura de los principales productos

#### Oracle Database

Oracle distingue la **instancia** (memoria y procesos) de la **base de datos** (ficheros). Desde la versión 21c es obligatoria la arquitectura **multiinquilino**: una base de datos contenedora (**CDB**) aloja una o varias bases de datos conectables (**PDB**).

- **Instancia**:
  - **SGA** (*System Global Area*), memoria compartida: caché de búferes de datos, *shared pool* (caché de biblioteca con el SQL analizado y caché del diccionario) y búfer de *redo*;
  - **PGA**, memoria privada de cada proceso servidor;
  - **procesos en segundo plano**: DBW*n* (escribe los bloques modificados en los ficheros de datos), **LGWR** (escribe el búfer de *redo* en el *redo log*), CKPT (puntos de control), SMON (recuperación de la instancia), PMON (limpieza de procesos caídos) y ARC*n* (archiva el *redo*).
- **Estructuras físicas**:
  - **ficheros de datos** (*datafiles*);
  - **ficheros de control**, que registran la estructura física de la base de datos y se multiplexan;
  - ficheros de ***redo log*** en línea, organizados en grupos que se reutilizan de forma circular, y ***redo* archivado**;
  - fichero de parámetros (SPFILE) y fichero de contraseñas.
- **Estructuras lógicas**, de menor a mayor (pregunta de LI 2019):

| Estructura | Definición |
|---|---|
| **Bloque de datos** | La unidad **mínima** de almacenamiento y de entrada/salida de Oracle; su tamaño lo fija `DB_BLOCK_SIZE` (8 KB por defecto) |
| **Extensión** (*extent*) | Conjunto de bloques **contiguos** que se reservan de una vez |
| **Segmento** | Conjunto de extensiones que almacena **un objeto**: el segmento de una tabla, de un índice, de *undo* o temporal |
| **Espacio de tablas** (*tablespace*) | **Unidad lógica** de almacenamiento que agrupa segmentos. Se compone de **uno o varios ficheros de datos**, y **cada fichero de datos pertenece a un único espacio de tablas** |

Espacios de tablas habituales: SYSTEM (diccionario), SYSAUX (componentes auxiliares), UNDO, TEMP y USERS.

> En Oracle un **esquema** es el conjunto de objetos de un **usuario** y se llama como él. El *tablespace* es **lógico**; el *datafile*, **físico**. El segmento **no** es la unidad mínima (lo es el bloque) y la extensión **no** tiene nada que ver con los índices multinivel.

```sql
CREATE TABLESPACE ts_expedientes
  DATAFILE '/u02/oradata/CDB1/pdb1/expedientes01.dbf' SIZE 2G
  AUTOEXTEND ON NEXT 256M MAXSIZE 20G;

-- Espacio ocupado por segmento en el esquema actual
SELECT segment_name, segment_type, tablespace_name, ROUND(bytes/1024/1024) AS mb
FROM   user_segments
ORDER  BY bytes DESC;
```

#### Microsoft SQL Server

SQL Server es una **plataforma de datos** con varios servicios que se eligen en la instalación:

| Componente | Función |
|---|---|
| **Motor de base de datos** (*Database Engine*) | El servicio **principal** para **almacenar, procesar y proteger** los datos: tablas, transacciones, seguridad, alta disponibilidad (Always On) |
| **Agente SQL Server** | Planifica y ejecuta **trabajos** (copias, mantenimiento) y alertas |
| **Integration Services (SSIS)** | Integración y transformación de datos (**ETL**) |
| **Analysis Services (SSAS)** | Modelos analíticos multidimensionales y tabulares (**OLAP**) |
| **Reporting Services** | Informes. Desde SQL Server 2025 los informes en local se **consolidan en Power BI Report Server** |
| **Machine Learning Services** | Ejecuta ***scripts* de Python y R** dentro de la base de datos, **con los datos relacionales**, sin sacarlos del servidor, mediante el procedimiento `sp_execute_external_script` (desde SQL Server 2017; en 2016 se llamaba R Services) |
| **Replicación** | Copia y **distribuye datos y objetos** de una base de datos a otra y los **sincroniza** para mantener la coherencia: instantánea, transaccional, de mezcla y punto a punto |
| **Data Quality Services (DQS)** | Producto de **calidad de datos basado en conocimiento**. **Retirado en SQL Server 2025**, como Master Data Services (MDS) |
| PolyBase | Consulta datos externos (otros SGBD, ficheros Parquet o CSV) con T-SQL |

> En LI 2023 cayó qué es **Machine Learning Services** (ejecutar Python y R con datos relacionales), y los distractores eran las definiciones de replicación, DQS y el motor de base de datos. En la reserva se preguntó por **RevoScaleR**, el paquete R de Microsoft para **transformación y manipulación de datos, resúmenes estadísticos, visualización y muchas formas de modelado**, con procesamiento en paralelo. Su equivalente en Python es **revoscalepy**. Otros paquetes solo existen de SQL Server 2016 a 2019: MicrosoftML y microsoftml (algoritmos de aprendizaje automático para texto e imagen), olapR (consultas MDX a cubos de Analysis Services) y sqlrutils (empaquetar *scripts* R como procedimientos T-SQL). Desde SQL Server 2022 los entornos de R y Python **no** se instalan con el programa de instalación: se instalan aparte.

Estructura física: cada base de datos tiene al menos un fichero de datos primario (**`.mdf`**), opcionalmente secundarios (**`.ndf`**) agrupados en **grupos de ficheros**, y un registro de transacciones (**`.ldf`**). Bases de datos del sistema: **master** (configuración de la instancia), **model** (plantilla de las nuevas), **msdb** (trabajos del Agente e historial de copias) y **tempdb** (objetos temporales; se recrea en cada arranque). El lenguaje procedimental es **Transact-SQL** (T-SQL).

#### MySQL y MariaDB

- Arquitectura en capas: conexiones, capa SQL (analizador y optimizador) y **motores de almacenamiento enchufables** (*pluggable storage engines*), elegibles **por tabla**.
- **InnoDB**, motor por defecto desde MySQL 5.5: transacciones **ACID**, **bloqueo por fila**, **MVCC**, claves ajenas y tabla **agrupada por la clave primaria**.
- **MyISAM**, el antiguo: **bloqueo de tabla** y **sin transacciones** ni claves ajenas. Otros motores: MEMORY, CSV, ARCHIVE y NDB (MySQL Cluster). MariaDB añade Aria, ColumnStore (columnar) y Spider (particionado entre servidores), entre otros.
- **MariaDB** es la bifurcación comunitaria que Michael Widenius, autor original de MySQL, creó en 2009 ante la compra de Sun Microsystems, y con ella de MySQL, por Oracle. Mantiene una compatibilidad amplia, pero ya no total.

```sql
SHOW ENGINES;                                   -- motores disponibles
CREATE TABLE registro_acceso (
  id    BIGINT AUTO_INCREMENT PRIMARY KEY,
  login VARCHAR(50) NOT NULL,
  ts    TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB;
```

#### PostgreSQL

- SGBD **objeto-relacional** de código abierto, heredero de Postgres (Stonebraker, Berkeley, 1986), con licencia PostgreSQL de tipo BSD.
- Arquitectura de **un proceso por conexión**, `shared_buffers` como caché y **WAL** como registro.
- **MVCC** puro: las versiones antiguas de las filas se eliminan con **`VACUUM`**, que normalmente ejecuta el proceso *autovacuum*.
- Muy **extensible**: tipos, operadores, funciones en varios lenguajes (PL/pgSQL, PL/Python…), métodos de índice (GiST, GIN, BRIN) y **extensiones** como PostGIS (datos geográficos), pgvector (vectores) o TimescaleDB (series temporales). Tipos avanzados: `JSONB`, *arrays*, rangos, `UUID`.
- **PostgreSQL 18** (septiembre de 2025) trajo, entre otras novedades, un subsistema de **entrada/salida asíncrona**, la función `uuidv7()`, columnas generadas **virtuales** por defecto, autenticación **OAuth** y el *skip scan* en índices B-tree multicolumna. En otoño de 2026 la versión 19 está en fase beta e incorpora las consultas de grafos **SQL/PGQ**.

### 3.4 Productos relacionales en 2026

| SGBD | Fabricante y licencia | Versiones de referencia | Rasgos distintivos |
|---|---|---|---|
| **Oracle Database** | Oracle, propietario | **Oracle AI Database 26ai** (octubre de 2025; en local para Linux desde enero de 2026; sucede a 23ai como versión de soporte prolongado) y 19c | PL/SQL, RAC (clúster de disco compartido), Data Guard, multiinquilino CDB/PDB, búsqueda vectorial, vistas de **dualidad JSON-relacional**, grafos de propiedades SQL |
| **SQL Server** | Microsoft, propietario | **SQL Server 2025** (versión 17.x, noviembre de 2025) y 2022 | T-SQL; Windows y Linux; Always On; tipos nativos `VECTOR` y `JSON`; expresiones regulares; ediciones Enterprise, Standard, Express (bases de datos de hasta 50 GB) y Developer |
| **MySQL** | Oracle; Community con licencia GPL y Enterprise comercial | **8.4 LTS** y **9.7 LTS** (abril de 2026); la 8.0 terminó en abril de 2026 | Motores enchufables (InnoDB); replicación, Group Replication e InnoDB Cluster; tipo `VECTOR` desde la 9.0 |
| **MariaDB** | MariaDB Foundation y MariaDB plc; GPL | **12.3 LTS** (2026) | Bifurcación de MySQL; Galera Cluster; motores Aria y ColumnStore; búsqueda vectorial |
| **PostgreSQL** | Comunidad (PostgreSQL Global Development Group); licencia libre de tipo BSD | **18** (septiembre de 2025); la 19, en beta | Objeto-relacional, muy extensible; una versión mayor al año con cinco años de soporte |
| **IBM Db2** | IBM, propietario | 12.1 | Linux, UNIX, Windows y mainframe z/OS |
| **SAP HANA** | SAP, propietario | — | **En memoria** y **columnar**; mezcla OLTP y OLAP |
| **SAP MaxDB** | SAP | — | SGBDR clásico de SAP, antes SAP DB y ADABAS D |
| **SQLite** | Dominio público | 3.x | **Embebido**, sin servidor: toda la base de datos en un fichero; el más desplegado del mundo (móviles, navegadores) |
| Otros | — | — | Informix (HCL), Firebird, H2 y Apache Derby (Java), Teradata (almacenes de datos) |

**En la nube** (DBaaS): **Amazon RDS** (Oracle, SQL Server, MySQL, MariaDB, PostgreSQL y Db2 gestionados) y **Amazon Aurora**, que es **relacional**, compatible con MySQL y PostgreSQL, con una capa de almacenamiento distribuida que guarda **seis copias en tres zonas de disponibilidad**; Azure SQL Database y Azure SQL Managed Instance; Google Cloud SQL, AlloyDB y Spanner; Oracle Autonomous Database.

> **Aurora no es NoSQL** (LI 2019): es un servicio relacional de AWS. Riak, DynamoDB y Redis sí lo son. **JSON** es un formato de datos, no un gestor (LI 2018: MaxDB, MySQL y PostgreSQL sí son SGBDR).

### 3.5 Tendencias: el relacional absorbe a sus rivales

- **JSON dentro del relacional**: funciones SQL/JSON desde SQL:2016 y **tipo de datos `JSON`** en SQL:2023. Lo implementan `JSONB` de PostgreSQL, `JSON` de MySQL, Oracle (con las vistas de **dualidad JSON-relacional**, que exponen las mismas filas como documentos) y SQL Server 2025.
- **Grafos de propiedades en SQL**: la parte 16 de SQL:2023 (**SQL/PGQ**) permite declarar un grafo sobre tablas existentes (`CREATE PROPERTY GRAPH`) y consultarlo con patrones dentro de `GRAPH_TABLE`. Disponible en Oracle 23ai y 26ai y, en beta, en PostgreSQL 19.
- **Vectores para inteligencia artificial**: tipos `VECTOR` e índices aproximados (HNSW, IVF, DiskANN) para búsquedas por similitud de *embeddings* (generación aumentada por recuperación, RAG): Oracle AI Vector Search, SQL Server 2025, MySQL 9, MariaDB, Db2 12.1 y pgvector en PostgreSQL.
- **Almacenamiento columnar y en memoria** para analítica sobre los datos operacionales (HTAP): Oracle Database In-Memory, índices *columnstore* de SQL Server, SAP HANA.
- **SQL distribuido o NewSQL**: escala horizontal sin renunciar a ACID ni a SQL (apartado 5.7).

### 3.6 Ejercicio resuelto: consultas, transacciones y bloqueos

Modelo del inventario de un centro de atención a usuarios: `SEDE(id_sede, nombre, provincia)`, `EQUIPO(id_equipo, tipo, id_sede, estado)` e `INCIDENCIA(id_inc, id_equipo, fecha, prioridad, cerrada)`.

**a) Sedes con más de 5 incidencias abiertas de prioridad alta, de mayor a menor**

```sql
SELECT s.nombre, COUNT(*) AS abiertas
FROM   sede s
       JOIN equipo e     ON e.id_sede   = s.id_sede
       JOIN incidencia i ON i.id_equipo = e.id_equipo
WHERE  i.cerrada = 'N' AND i.prioridad = 'ALTA'   -- filtra filas antes de agrupar
GROUP  BY s.nombre
HAVING COUNT(*) > 5                                -- filtra grupos después de agrupar
ORDER  BY abiertas DESC;
```

`WHERE` actúa **antes** de agrupar y no admite funciones de agregado; `HAVING` actúa **sobre los grupos**. Todo lo que aparece en el `SELECT` sin agregar debe estar en el `GROUP BY`.

**b) Equipos sin ninguna incidencia** (combinación externa)

```sql
SELECT e.id_equipo, e.tipo
FROM   equipo e LEFT JOIN incidencia i ON i.id_equipo = e.id_equipo
WHERE  i.id_inc IS NULL;
```

**c) Asignar un portátil libre sin que dos técnicos cojan el mismo** (transacción con bloqueo pesimista)

```sql
-- Sintaxis de PostgreSQL (en MySQL 8, LIMIT 1 en lugar de FETCH FIRST)
BEGIN;
SELECT id_equipo
FROM   equipo
WHERE  tipo = 'PORTATIL' AND estado = 'LIBRE'
FETCH FIRST 1 ROWS ONLY
FOR UPDATE SKIP LOCKED;                 -- bloquea la fila elegida y salta las ya bloqueadas
-- supongamos que devuelve 4711
UPDATE equipo SET estado = 'ASIGNADO' WHERE id_equipo = 4711;
COMMIT;                                 -- libera el bloqueo
```

`SELECT … FOR UPDATE` toma un bloqueo **exclusivo de fila** hasta el final de la transacción: un segundo técnico que ejecute lo mismo **espera** o, con `SKIP LOCKED` (Oracle, PostgreSQL y MySQL 8), salta esa fila y obtiene otra libre. En Oracle, donde la transacción empieza sola sin `BEGIN`, lo habitual es abrir un cursor `FOR UPDATE SKIP LOCKED` en PL/SQL y leer su primera fila. SQL Server consigue lo mismo con las sugerencias `WITH (UPDLOCK, READPAST)`.

**d) ¿Qué ocurre aquí?**

| Instante | Sesión 1 | Sesión 2 |
|---|---|---|
| t1 | `UPDATE equipo … WHERE id_equipo = 1` (bloquea la fila 1) | |
| t2 | | `UPDATE equipo … WHERE id_equipo = 2` (bloquea la fila 2) |
| t3 | `UPDATE equipo … WHERE id_equipo = 2` → **espera** a la sesión 2 | |
| t4 | | `UPDATE equipo … WHERE id_equipo = 1` → **espera** a la sesión 1 |

**Solución**: es un **interbloqueo**. El SGBD detecta el ciclo en el grafo de espera y aborta una de las dos sentencias o transacciones, la **víctima**: Oracle devuelve `ORA-00060`, SQL Server el error 1205 y PostgreSQL `deadlock detected`. Se evita accediendo a las filas **siempre en el mismo orden** y con transacciones cortas.

**e) Con MVCC**, si la sesión 1 actualiza una fila y aún no confirma, una sesión 2 que haga `SELECT` de esa fila en `READ COMMITTED` **no espera**: lee la **última versión confirmada**. Con un SGBD que solo use bloqueos (SQL Server con `READ_COMMITTED_SNAPSHOT` desactivado), la lectura **esperaría** al `COMMIT` o `ROLLBACK` de la sesión 1.

## 4. SGBD orientados a objetos y objeto-relacionales

### 4.1 Por qué surgen

En los años ochenta el modelo relacional mostró sus límites en aplicaciones con **datos complejos**: diseño asistido (CAD/CAM), herramientas CASE, sistemas de información geográfica, multimedia, telecomunicaciones o simulación científica. Los problemas eran tres:

- **Estructuras planas**: una pieza formada por subpiezas, a su vez formadas por otras, obliga a repartirla en muchas tablas y a reconstruirla con combinaciones costosas.
- **Tipos limitados**: no se podían definir tipos propios (un polígono, un plano) ni asociarles **comportamiento**.
- **Desajuste de impedancia** (*impedance mismatch*): los programas trabajan con **objetos** (identidad, referencias, herencia) y la base de datos con **tablas** y conjuntos; hay que traducir constantemente de un modelo a otro.

Hubo dos respuestas:

1. **SGBD orientados a objetos (SGBDOO)**: añadir **persistencia** y capacidades de base de datos a un lenguaje orientado a objetos (C++, Smalltalk, Java). Los objetos se guardan tal cual.
2. **SGBD objeto-relacionales (SGBDOR)**: **extender el modelo relacional** con tipos definidos por el usuario, herencia, referencias y colecciones, manteniendo SQL y las tablas.

Una tercera vía, que no es un SGBD sino una capa de *software*, es la **correspondencia objeto-relacional** (ORM): JPA e Hibernate en Java o Entity Framework en .NET traducen automáticamente objetos a tablas (tema III.5). Es hoy la solución más extendida.

### 4.2 Conceptos del modelo de objetos en bases de datos

**Objeto** = **identidad** + **estado** (valores de sus atributos) + **comportamiento** (métodos).

**Identificador de objeto (OID)**. Es la clave del modelo y cae en el examen (LI 2025):

| Propiedad del OID | Explicación |
|---|---|
| **Lo genera el sistema** | Ni el usuario ni el programa lo asignan |
| **Único** | Distinto para cada objeto de toda la base de datos |
| **Inmutable** | No cambia durante la vida del objeto, aunque cambien todos sus atributos |
| **Independiente de los valores** de los atributos | A diferencia de la clave primaria relacional, no se forma con datos del objeto |
| **No se reutiliza** | Aunque el objeto se borre |
| **Invisible para el usuario externo** | Lo usa internamente el sistema para identificar los objetos y para implementar las referencias entre ellos |

- **Identidad frente a igualdad**: dos objetos son **idénticos** si tienen el mismo OID y **iguales** si tienen el mismo estado. En el modelo relacional, en cambio, una fila se identifica **por sus valores** (la clave primaria).
- **Encapsulación**: el objeto solo se manipula a través de su interfaz pública (las signaturas de sus métodos). En las bases de datos se relaja para permitir consultas declarativas sobre los atributos.
- **Clase o tipo**: plantilla con atributos y métodos. La **extensión** (*extent*) de una clase es el conjunto de todas sus instancias persistentes; equivale a la tabla en el relacional.
- **Herencia** (simple o múltiple), **polimorfismo**, **sobrecarga**, **sobrescritura** (*overriding*) y **ligadura tardía** o dinámica: el método que se ejecuta se decide en tiempo de ejecución según la clase real del objeto (tema III.4).
- **Objetos complejos**: se construyen combinando **constructores de tipos**:

| Constructor | Qué construye | Orden | Duplicados |
|---|---|---|---|
| **Atómico** (básico) | Valores simples: entero, real, cadena, carácter, booleano, fecha | — | — |
| **Tupla** o **estructura** (*struct*) | Agrega componentes de distinto tipo con nombre: un registro | — | — |
| **Conjunto** (*set*) | Colección **sin orden** y **sin duplicados** | No | No |
| **Bolsa** (*bag* o multiconjunto) | Colección **sin orden** que **admite duplicados** | No | Sí |
| **Lista** (*list*) | Colección **ordenada** que admite duplicados | Sí | Sí |
| ***Array*** (vector) | Colección ordenada con acceso directo **por posición** (índice) | Sí | Sí |
| **Diccionario** (*dictionary*) | Pares **clave-valor** sin claves repetidas | — | — |

Los cinco últimos son los **constructores de colección**. «Columna» **no** es un constructor de tipos (LI 2025). Además existen las **referencias** a otros objetos (por OID), que permiten **navegar** de un objeto a otro sin combinaciones.

- **Persistencia ortogonal**: cualquier objeto de cualquier tipo puede ser persistente o transitorio. Se hace persistente **por nombre** (se le da un nombre que sirve de punto de entrada o «raíz») o **por alcanzabilidad** (*reachability*): todo objeto alcanzable desde un objeto persistente también lo es.
- Otras capacidades propias: **versiones** de objetos, **transacciones largas** o de diseño (que duran horas o días), **evolución del esquema** y navegación eficiente cargando referencias en memoria (*pointer swizzling*).

### 4.3 El Manifiesto de las bases de datos orientadas a objetos (1989)

Atkinson, Bancilhon, DeWitt, Dittrich, Maier y Zdonik publicaron en 1989 *The Object-Oriented Database System Manifesto*, que fija qué debe tener un SGBDOO. Las **características obligatorias** son trece: ocho de **orientación a objetos** y cinco de **SGBD**:

| Tipo | Características |
|---|---|
| **Obligatorias de orientación a objetos** | 1. **Objetos complejos** (construidos con constructores ortogonales). 2. **Identidad** de objetos, independiente de sus valores. 3. **Encapsulación**. 4. **Tipos o clases**. 5. **Jerarquías** de clases o tipos (herencia). 6. **Sobrescritura, sobrecarga y ligadura tardía**. 7. **Completitud computacional** del lenguaje de manipulación. 8. **Extensibilidad**: el usuario puede definir **tipos nuevos** y usarlos igual que los predefinidos |
| **Obligatorias de SGBD** | 9. **Persistencia**. 10. **Gestión del almacenamiento secundario** (índices, agrupamiento, optimización, invisible al usuario). 11. **Concurrencia**. 12. **Recuperación**. 13. **Consultas *ad hoc*** sencillas y eficientes |
| **Opcionales** | Herencia múltiple, comprobación e inferencia de tipos, distribución, transacciones de diseño y versiones |
| **Abiertas** (a elección del diseñador) | Paradigma de programación, sistema de representación, sistema de tipos y uniformidad |

> Pregunta de LI 2023: entre las características obligatorias **no** está que «el conjunto de tipos sea **fijo**». Es justo lo contrario: la **extensibilidad** obliga a poder definir tipos nuevos.

A este manifiesto respondieron otros dos:

- el ***Third-Generation Database System Manifesto*** (Stonebraker y otros, 1990) defendió **extender el relacional**, que es el origen de los SGBD objeto-relacionales;
- ***The Third Manifesto*** (Date y Darwen, 1995) propuso un relacional «puro» con un sistema de tipos rico, sin OID ni valores nulos.

### 4.4 El estándar ODMG

El **ODMG** (*Object Data Management Group*, 1991-2001), consorcio de fabricantes de SGBDOO, publicó el estándar de bases de datos de objetos en tres versiones: **ODMG-93** (1.0), **2.0** (1997) y **3.0** (2000). Tiene **cuatro componentes**:

| Componente | Qué es |
|---|---|
| **Modelo de objetos** | Basado en el de OMG. Distingue **objetos** (con OID) y **literales** (sin OID); colecciones `Set`, `Bag`, `List`, `Array` y `Dictionary`; **interfaces** (solo comportamiento, no instanciables) y **clases** (estado y comportamiento); **extensiones**, **claves** y **relaciones** con su **inversa** |
| **ODL** (*Object Definition Language*) | **Lenguaje de definición** de esquemas, derivado del IDL de CORBA. Equivale al LDD |
| **OQL** (*Object Query Language*) | **Lenguaje de consulta** declarativo, con sintaxis **parecida al `SELECT` de SQL** y **expresiones de camino** para navegar por las referencias. **No** tiene sentencias de actualización: los objetos se modifican con sus métodos |
| **Vinculaciones con lenguajes** (*bindings*) | Para **C++, Smalltalk y Java**. Incluyen el **OML** (*Object Manipulation Language*), que crea, modifica y borra objetos desde el propio lenguaje |

> En LI 2024: **OQL es un lenguaje de consulta de datos**, no de definición (eso es ODL) ni de manipulación (OML).

Ejemplo de esquema en **ODL**:

```odl
class Departamento (extent departamentos key codigo) {
    attribute string codigo;
    attribute string nombre;
    relationship set<Empleado> plantilla inverse Empleado::destino;
};

class Empleado (extent empleados key nrp) {
    attribute string nrp;
    attribute string nombre;
    attribute date   fecha_alta;
    attribute list<string> telefonos;                 // constructor de colección
    relationship Departamento destino inverse Departamento::plantilla;
    float antiguedad_anios();                         // método (comportamiento)
};

class Tecnico extends Empleado (extent tecnicos) {    // herencia de estado y comportamiento
    attribute set<string> certificaciones;
};
```

Consultas en **OQL** sobre ese esquema:

```oql
select e.nombre
from   e in empleados
where  e.destino.nombre = "Informática"        // expresión de camino: sin JOIN

select struct(depto: d.nombre, total: count(d.plantilla))
from   d in departamentos

select t.nombre
from   t in tecnicos
where  "ITIL" in t.certificaciones and t.antiguedad_anios() > 5
```

El ODMG se disolvió en 2001. Su vinculación con Java evolucionó hacia **JDO** (*Java Data Objects*) y la persistencia de objetos en Java acabó normalizándose con **JPA**, cuyo lenguaje JPQL hereda ideas de OQL.

### 4.5 Productos orientados a objetos

| Producto | Rasgos |
|---|---|
| **Matisse** | SGBDOO comercial que combina el modelo de objetos ODMG con acceso SQL (LI 2024: los distractores eran otros pintores, Cézanne, Picasso y Rembrandt) |
| **ObjectStore** | Uno de los pioneros, para C++ y Java |
| **Versant** | SGBDOO para C++ y Java, hoy en la familia de productos de Actian |
| **GemStone/S** | Basado en Smalltalk |
| **Objectivity/DB** | Distribuido, usado en ciencia y defensa |
| **db4o** | Embebido de código abierto para Java y .NET, ya abandonado |
| **ObjectDB** | Para Java, con interfaces JPA y JDO |
| **ZODB** | Base de datos de objetos de **Python**, nacida con el servidor de aplicaciones **Zope** (examen de 2015) |
| **InterSystems Caché**, hoy **IRIS** | Multimodelo: objetos, SQL y documentos sobre el mismo motor |
| Históricos | **O2**, Poet (FastObjects), Jasmine |

### 4.6 Ventajas e inconvenientes de los SGBDOO

| Ventajas | Inconvenientes |
|---|---|
| Modelado **más rico** y cercano a la realidad: objetos complejos, herencia, comportamiento | **Sin un modelo formal** comparable al relacional ni un estándar ampliamente implantado: ODMG se siguió poco |
| **Sin desajuste de impedancia**: el mismo modelo en el programa y en la base de datos | Consultas *ad hoc* y **optimización** más difíciles; la encapsulación choca con las consultas declarativas |
| **Navegación** rápida por referencias, sin combinaciones | **Ligado** a un lenguaje de programación |
| **Extensibilidad** y reutilización | Pocas herramientas y profesionales; **cuota de mercado pequeña** |
| Versiones, transacciones largas y evolución del esquema | Seguridad de grano fino y vistas menos desarrolladas |

Hoy los SGBDOO puros ocupan **nichos**: CAD, telecomunicaciones, finanzas en tiempo real, sistemas embebidos y algunos productos multimodelo.

### 4.7 SGBD objeto-relacionales

Un **SGBDOR** es un SGBD relacional **extendido** con características de objetos. Conserva las tablas, SQL y las transacciones, y añade tipos ricos. Es lo que hicieron **PostgreSQL** (que se define como «sistema de base de datos objeto-relacional»), **Oracle** desde la versión 8, **Db2** e Informix. El estándar **SQL:1999** (SQL3) incorporó estas extensiones:

| Característica | En el estándar SQL |
|---|---|
| **Tipos definidos por el usuario** (UDT) | **Distintos** (`DISTINCT`: renombran un tipo predefinido con comprobación de tipos, por ejemplo `euros` sobre `DECIMAL`) y **estructurados** (con atributos y **métodos**) |
| **Herencia** | De tipos (`CREATE TYPE … UNDER …`) y de tablas (subtablas) |
| **Tablas tipadas** | `CREATE TABLE … OF tipo`: cada fila es un objeto con un identificador generado por el sistema (`REF IS … SYSTEM GENERATED`) |
| **Referencias** | Tipo `REF` y desreferencia con el operador `->` |
| **Colecciones** | `ARRAY` (SQL:1999) y `MULTISET` (SQL:2003), además del tipo `ROW` |

Ejemplo en **Oracle**:

```sql
CREATE TYPE t_direccion AS OBJECT (
  via VARCHAR2(80), municipio VARCHAR2(50), cp CHAR(5)
);
/
CREATE TYPE t_telefonos AS VARRAY(3) OF VARCHAR2(15);     -- colección de tamaño máximo fijo
/
CREATE TYPE t_persona AS OBJECT (
  dni       CHAR(9),
  nombre    VARCHAR2(60),
  domicilio t_direccion,                                  -- objeto dentro de objeto
  telefonos t_telefonos,
  MEMBER FUNCTION etiqueta RETURN VARCHAR2               -- método
) NOT FINAL;                                              -- admite subtipos
/
CREATE TYPE t_interesado UNDER t_persona (rol VARCHAR2(20));   -- herencia
/
CREATE TABLE personas OF t_persona (dni PRIMARY KEY);     -- tabla de objetos (con OID)

SELECT p.nombre, p.domicilio.municipio                    -- notación de punto
FROM   personas p
WHERE  p.domicilio.cp LIKE '28%';
```

Oracle ofrece además **tablas anidadas** (`NESTED TABLE … STORE AS`), referencias entre objetos (`REF`, `DEREF`, `VALUE`) y **vistas de objetos** sobre tablas relacionales.

Ejemplo en **PostgreSQL**:

```sql
CREATE TYPE direccion AS (via text, municipio text, cp char(5));   -- tipo compuesto

CREATE TABLE documento (
  id        bigserial PRIMARY KEY,     -- la secuencia por defecto también la usan las tablas hijas
  titulo    text NOT NULL,
  etiquetas text[],                    -- array
  metadatos jsonb                      -- documento JSON binario e indexable
);

CREATE TABLE resolucion (
  organo  text,
  firmada boolean
) INHERITS (documento);               -- herencia de tablas

SELECT titulo FROM documento WHERE 'urgente' = ANY (etiquetas);
SELECT titulo FROM documento WHERE metadatos @> '{"procedimiento": "subvenciones"}';
```

### 4.8 Comparativa: relacional, objeto-relacional y orientado a objetos

| Aspecto | Relacional | Objeto-relacional | Orientado a objetos |
|---|---|---|---|
| Estructura básica | Tabla con valores **atómicos** | Tabla con tipos **estructurados**, colecciones y referencias | **Objeto** con atributos y métodos |
| Identificación | **Clave primaria** (por valores) | Clave primaria y, en tablas tipadas, identificador de objeto | **OID** generado por el sistema |
| Relaciones | Claves ajenas y **combinaciones** | Claves ajenas, `REF` y colecciones anidadas | **Referencias** navegables y relaciones inversas |
| Comportamiento | Fuera de los datos (procedimientos, disparadores) | **Métodos** de los tipos | **Métodos** encapsulados |
| Herencia | No | Sí, de tipos y de tablas | Sí |
| Lenguaje | **SQL** | **SQL:1999** y siguientes | **ODL** y **OQL** (ODMG) y el lenguaje anfitrión |
| Base formal | Fuerte: álgebra y cálculo relacional | La relacional, extendida | Débil |
| Productos | Todos los SGBDR | Oracle, PostgreSQL, Db2, Informix | Matisse, ObjectStore, Versant, GemStone/S, ObjectDB, ZODB |

## 5. SGBD NoSQL

### 5.1 Origen y concepto

**NoSQL** agrupa a los SGBD que **no siguen el modelo relacional**. Hoy se interpreta como «***Not only SQL***»: no rechazan SQL, sino que ofrecen alternativas para problemas en los que el relacional encaja mal.

- **Carlo Strozzi** usó el nombre en 1998 para una base de datos relacional ligera sin interfaz SQL.
- El término se popularizó en **2009**, cuando Johan Oskarsson lo eligió para un encuentro sobre bases de datos **distribuidas y no relacionales** de código abierto.
- Sus antecedentes son los artículos de **Google Bigtable** (2006), modelo de familias de columnas, y **Amazon Dynamo** (2007), almacén clave-valor muy disponible.

**Qué los impulsó**:

- la escala de la web y del ***big data***, con las «V»: **volumen**, **velocidad** y **variedad**, a las que se suman veracidad y valor;
- la necesidad de **escalar horizontalmente** añadiendo servidores baratos en lugar de comprar uno más grande;
- datos **semiestructurados** o cambiantes, que no caben en un esquema fijo;
- la **alta disponibilidad** continua en servicios globales;
- el desarrollo ágil y la nube.

### 5.2 Características comunes

| Característica | Explicación |
|---|---|
| **Modelo no relacional** | Clave-valor, documentos, familias de columnas o grafos |
| **Esquema flexible** (*schema-less*) | No hay que declarar la estructura antes de cargar datos: el esquema lo interpreta la aplicación al leer (*schema-on-read*). Dos documentos de la misma colección pueden tener campos distintos |
| **Escalado horizontal** | Los datos se reparten entre muchos nodos (**particionado** o ***sharding***) |
| **Replicación** | Varias copias de cada dato en nodos distintos para tolerar fallos |
| **Consistencia relajada** | Muchos priorizan la disponibilidad y ofrecen **consistencia eventual** (modelo BASE) |
| **Orientación a agregados** | Los datos que se usan juntos se guardan juntos (un pedido con sus líneas en un solo documento): se **desnormaliza** y se diseña **a partir de las consultas** |
| **Sin combinaciones o muy limitadas** | Las relaciones se resuelven anidando datos o en la aplicación |
| **API y lenguajes propios** | Cada producto tiene su interfaz: MQL de MongoDB, CQL de Cassandra, Cypher de Neo4j, órdenes de Redis |
| **Transacciones** limitadas | Tradicionalmente atómicas solo dentro de un registro o documento. Varios ofrecen ya transacciones ACID más amplias: MongoDB (multidocumento desde la 4.0), DynamoDB y Neo4j |

**Persistencia políglota**: una misma aplicación combina varios SGBD, cada uno para lo que mejor hace. Por ejemplo, el relacional para los expedientes, Redis para las sesiones y un motor de búsqueda para el texto libre.

### 5.3 Teorema CAP, PACELC y BASE

**Teorema CAP** (Eric Brewer lo enunció como conjetura en el año 2000; Gilbert y Lynch lo demostraron en 2002): un sistema **distribuido** no puede garantizar a la vez estas tres propiedades:

| Propiedad | Significado |
|---|---|
| **C**onsistencia (*consistency*) | Todos los nodos ven **el mismo dato al mismo tiempo**: cada lectura devuelve la última escritura |
| **D**isponibilidad (*availability*) | Toda petición a un nodo que funciona recibe **respuesta** |
| Tolerancia a **p**articiones (*partition tolerance*) | El sistema sigue funcionando aunque se pierdan mensajes entre nodos (la red se «parte») |

Como en un sistema distribuido las particiones de red **acaban ocurriendo**, la elección real es qué sacrificar **cuando hay una partición**:

- **CP** (consistencia + tolerancia a particiones): ante una partición, la parte que no puede garantizar el dato correcto **deja de responder**. Ejemplos: HBase, MongoDB con escrituras por mayoría, ZooKeeper y etcd, Google Spanner.
- **AP** (disponibilidad + tolerancia a particiones): todos los nodos **siguen respondiendo**, aunque alguno devuelva un dato antiguo, y las réplicas convergen después. Ejemplos: Cassandra, Riak, CouchDB, DynamoDB con su lectura por defecto.
- **CA**: solo posible **sin distribución** (un SGBD relacional en un único servidor), porque no hay particiones que tolerar. Muchos manuales colocan aquí a los relacionales clásicos.

**PACELC** (Daniel Abadi, 2010-2012) completa el CAP: **si hay partición (P)**, elegir entre disponibilidad (**A**) y consistencia (**C**); **si no la hay (E, *else*)**, elegir entre **latencia (L)** y **consistencia (C)**. Así, Dynamo, Cassandra y Riak son **PA/EL**, mientras que HBase y Bigtable son **PC/EC**.

**ACID frente a BASE**:

| ACID (relacional) | BASE (muchos NoSQL) |
|---|---|
| **A**tomicidad, **C**onsistencia, a**I**slamiento, **D**urabilidad | ***B**asically **A**vailable*: básicamente disponible, aunque falle parte del sistema |
| Consistencia **fuerte**: tras confirmar, todos ven el dato nuevo | ***S**oft state*: estado blando, que puede cambiar sin nuevas escrituras mientras las réplicas se sincronizan |
| Pesimista: bloqueos y validación antes de confirmar | ***E**ventual consistency*: **consistencia eventual**; si dejan de llegar escrituras, todas las réplicas acaban con el mismo valor |
| Prioriza la **corrección** | Prioriza la **disponibilidad** y la **escala** |

**Quórum**: con **N** réplicas, si una escritura espera confirmación de **W** réplicas y una lectura consulta **R** réplicas, se garantiza leer el último valor cuando **R + W > N**. Con N = 3, W = 2 y R = 2 hay consistencia fuerte y se tolera la caída de un nodo. Cassandra permite elegir el nivel de consistencia **en cada operación** (`ONE`, `QUORUM`, `LOCAL_QUORUM`, `ALL`): es la **consistencia ajustable**.

### 5.4 Técnicas de distribución y almacenamiento

- **Particionado (*sharding*)**:
  - **por rangos** de la clave: eficiente para consultas de rango, con riesgo de puntos calientes;
  - **por *hash***: reparte de forma uniforme;
  - **por directorio o zona**: una tabla de correspondencia decide dónde va cada dato.
  
  La elección de la **clave de particionado** es la decisión de diseño más importante.
- ***Hashing* consistente**: nodos y claves se colocan en un **anillo**; cada clave pertenece al primer nodo que encuentra siguiendo el anillo. Al añadir o quitar un nodo solo se mueven las claves vecinas. Los **nodos virtuales** equilibran la carga. Lo usan Dynamo, Cassandra y Riak.
- **Replicación**:
  - **primario-secundario** (maestro-esclavo): un nodo recibe las escrituras y las réplicas lo siguen, como en los conjuntos de réplicas de MongoDB, con elección automática de un nuevo primario;
  - **multimaestro o sin maestro** (*peer-to-peer*): cualquier nodo acepta escrituras, como en Cassandra, Riak o CouchDB.
- **Resolución de conflictos** entre réplicas: la última escritura gana (por marca de tiempo), **relojes vectoriales** (Dynamo, Riak) y estructuras CRDT. Mecanismos de reparación: *read repair*, *hinted handoff*, antientropía con árboles de Merkle y **protocolo de cotilleo** (*gossip*) para saber qué nodos están vivos.
- **Consenso**: algoritmos **Paxos** y **Raft** para que los nodos acuerden un valor o un líder (etcd, CockroachDB, MongoDB).
- **Árbol LSM** (*log-structured merge tree*): las escrituras van a un registro y a una tabla en memoria (*memtable*), que se vuelca a ficheros ordenados inmutables (**SSTables**) que se compactan periódicamente. Está optimizado para **escribir** y lo usan Cassandra, HBase, ScyllaDB y RocksDB. Los relacionales usan sobre todo árboles B+, más equilibrados entre lectura y escritura.
- **MapReduce** (Google, 2004): modelo de proceso por lotes en dos funciones. **Map** transforma cada registro en pares clave-valor; tras agrupar por clave (*shuffle*), **reduce** combina los valores de cada clave. Lo popularizó Hadoop. MongoDB lo declaró obsoleto en la versión 5.0 en favor de su canal de agregación.

### 5.5 Tipos de SGBD NoSQL

| Tipo | Modelo de datos | Consultas | Usos típicos | Productos |
|---|---|---|---|---|
| **Clave-valor** | Diccionario: **clave única → valor opaco** (cadena, binario o estructura) | Solo por clave: `GET`, `PUT`, `DELETE` | Cachés, **sesiones**, carritos, contadores, colas, configuración | **Redis**, Valkey, Memcached, **Amazon DynamoDB**, **Riak KV**, etcd, Aerospike, Berkeley DB |
| **Documental** | Documentos **JSON, BSON o XML** autodescriptivos y anidados, agrupados en colecciones | Por **cualquier campo**, con índices secundarios y agregaciones | Catálogos, gestión de contenidos, perfiles, expedientes con estructura variable | **MongoDB**, **CouchDB**, Couchbase, Amazon DocumentDB, Firestore, RavenDB |
| **Familias de columnas** (columnar ancho, *wide-column*) | Filas identificadas por clave con **columnas variables** agrupadas en familias; tabla dispersa distribuida | Por clave de partición y rangos de las columnas de agrupación | Series temporales, IoT, registros de eventos, mensajería a gran escala | **Apache Cassandra**, **Apache HBase**, Google Bigtable, ScyllaDB, Apache Accumulo |
| **Grafos** | **Nodos** y **aristas** (relaciones), ambos con propiedades | Recorridos y **patrones**: Cypher, Gremlin, SPARQL, GQL | Redes sociales, **fraude**, recomendaciones, dependencias de sistemas, grafos de conocimiento | **Neo4j**, **JanusGraph**, Amazon Neptune, TigerGraph, Memgraph, ArangoDB |

> Pregunta de LI 2025: los tipos de NoSQL son **documentales y clave-valor** (y de columnas y de grafos). «Sistemáticos» y «metodológicos» son inventados. Y en LI 2025‑ext: es **falso** que los relacionales usen un «método simple de clave-valor»; eso es lo propio de los NoSQL clave-valor.

Otras familias que suelen incluirse en NoSQL o junto a él:

- **series temporales**: InfluxDB, TimescaleDB (extensión de PostgreSQL), Prometheus para monitorización;
- **motores de búsqueda**: Elasticsearch, OpenSearch y Apache Solr, todos sobre el **índice invertido** de Apache Lucene;
- **vectoriales**: Milvus, Qdrant, Weaviate, Pinecone, para búsquedas por similitud en aplicaciones de IA;
- **multimodelo**: ArangoDB (documentos, grafos y clave-valor con un solo lenguaje, AQL), Azure Cosmos DB (con API para NoSQL, MongoDB, Cassandra, Gremlin y tablas), Couchbase, InterSystems IRIS;
- **XML nativas**: eXist-db, BaseX y MarkLogic, consultadas con XPath y XQuery.

#### Clave-valor: Redis

**Redis** (*REmote DIctionary Server*, 2009) es un almacén clave-valor **en memoria** con **estructuras de datos**: cadenas, listas, conjuntos, conjuntos ordenados, *hashes*, *streams*, mapas de bits e HyperLogLog. Admite caducidad (TTL), publicación y suscripción, persistencia en disco por **instantáneas (RDB)** o por **registro de órdenes (AOF)**, réplicas con **Sentinel** para la conmutación automática y **Redis Cluster**, que reparte las claves en **16 384 ranuras de *hash***.

```text
SET sesion:8f3a "usuario=ana;rol=gestor" EX 1800     -> guarda con caducidad de 30 minutos
GET sesion:8f3a
HSET expediente:2026-0001 estado EN_TRAMITE unidad SGTIC
HGETALL expediente:2026-0001
LPUSH cola:avisos "exp-2026-0001"                     -> lista usada como cola
RPOP cola:avisos
INCR contador:accesos                                 -> incremento atómico
ZADD ranking 9.75 ana 8.50 luis                       -> conjunto ordenado por puntuación
ZREVRANGE ranking 0 2 WITHSCORES
TTL sesion:8f3a                                       -> segundos que le quedan
```

En marzo de 2024 Redis dejó la licencia BSD por licencias de código disponible (RSALv2 y SSPLv1). La Linux Foundation respondió con la bifurcación **Valkey**, que mantiene la licencia BSD. Desde **Redis 8** (mayo de 2025) se ofrece además la licencia libre **AGPLv3**.

**Amazon DynamoDB** es el servicio clave-valor y documental gestionado de AWS. Cada elemento se identifica por una **clave de partición** y, opcionalmente, una **clave de ordenación**. Sus lecturas son **eventualmente consistentes por defecto**, con opción de lectura fuertemente consistente, y admite transacciones. **Riak KV** reproduce el diseño de Dynamo: sin maestro, *hashing* consistente y relojes vectoriales.

#### Documental: MongoDB y CouchDB

**MongoDB** (2009) guarda **documentos BSON** (JSON binario con más tipos, como fechas y enteros de 64 bits) en **colecciones**:

- cada documento tiene un `_id` único y ocupa como máximo **16 MB**;
- admite índices secundarios, también sobre campos anidados y *arrays*, y validación opcional con JSON Schema;
- consultas con su lenguaje MQL y un **canal de agregación** (*aggregation pipeline*);
- alta disponibilidad con **conjuntos de réplicas** (un primario y secundarios), escala con ***sharding*** y tiene transacciones ACID **multidocumento** desde la versión 4.0;
- motor de almacenamiento WiredTiger; la edición Community se distribuye con licencia SSPL desde 2018; versión principal 8.0, con versiones menores posteriores.

```javascript
// mongosh
db.expedientes.insertOne({
  _id: "EXP-2026-0001",
  procedimiento: "Subvenciones",
  estado: "EN_TRAMITE",
  importe: 15000,
  interesados: [ { nif: "12345678Z", nombre: "Ana Ruiz", rol: "solicitante" } ],
  documentos:  [ { tipo: "solicitud", fecha: ISODate("2026-09-01"), csv: "ABC123" } ]
});

// Equivale a SELECT procedimiento, importe FROM expedientes WHERE estado = ... AND importe > 10000
db.expedientes.find(
  { estado: "EN_TRAMITE", importe: { $gt: 10000 } },
  { procedimiento: 1, importe: 1 }
);

db.expedientes.updateOne(
  { _id: "EXP-2026-0001" },
  { $set: { estado: "RESUELTO" },
    $push: { documentos: { tipo: "resolucion", fecha: new Date() } } }
);

db.expedientes.createIndex({ "interesados.nif": 1 });   // índice sobre un campo anidado

// Equivale a SELECT procedimiento, SUM(importe), COUNT(*) ... GROUP BY procedimiento ORDER BY 2 DESC
db.expedientes.aggregate([
  { $match: { estado: "RESUELTO" } },
  { $group: { _id: "$procedimiento", total: { $sum: "$importe" }, n: { $sum: 1 } } },
  { $sort:  { total: -1 } }
]);
```

| Relacional (SQL) | MongoDB |
|---|---|
| Base de datos | Base de datos |
| Tabla | **Colección** |
| Fila | **Documento** |
| Columna | Campo |
| Clave primaria | `_id` |
| `JOIN` | Documentos **incrustados** o etapa `$lookup` |
| `WHERE` | Filtro de `find()` o etapa `$match` |
| `GROUP BY` | Etapa `$group` |

**Apache CouchDB** guarda documentos **JSON** y se usa con una **API HTTP REST**. Tiene control **MVCC**, replicación **multimaestro** pensada para trabajar sin conexión y sincronizar después, **vistas** definidas con funciones MapReduce en JavaScript y consultas declarativas Mango. Está escrito en Erlang.

#### Familias de columnas: Cassandra y HBase

- **Modelo**: un ***keyspace*** (equivale a la base de datos) contiene tablas o **familias de columnas**. Cada fila se identifica por una clave, y cada celda guarda **nombre, valor y marca de tiempo**. Las filas pueden tener columnas distintas y las vacías no ocupan espacio.
- **Apache Cassandra**:
  - creada en Facebook (2008), une el modelo de datos de Bigtable con la distribución de Dynamo;
  - **anillo sin maestro** (todos los nodos son iguales), protocolo de cotilleo, *hashing* consistente con nodos virtuales y **consistencia ajustable**;
  - almacenamiento LSM y lenguaje **CQL**, parecido a SQL pero **sin combinaciones**;
  - se modela **una tabla por consulta**. La clave primaria tiene una **clave de partición** (qué nodo guarda los datos) y **columnas de agrupación** (*clustering*, el orden dentro de la partición);
  - la rama estable es la **5.0** (índices SAI y búsqueda vectorial); la 6.0, en fase alfa, añade transacciones ACID generales (Accord).
- **Apache HBase**:
  - clon de Bigtable sobre **HDFS** (Hadoop);
  - arquitectura **con maestro** (HMaster y RegionServers, coordinados por ZooKeeper) y consistencia fuerte por fila: un sistema **CP**.

```cql
CREATE KEYSPACE telemetria
  WITH replication = {'class': 'NetworkTopologyStrategy', 'cpd_madrid': 3};

CREATE TABLE telemetria.lecturas (
  sensor_id   text,
  dia         date,
  ts          timestamp,
  temperatura double,
  PRIMARY KEY ((sensor_id, dia), ts)          -- partición (sensor, día); orden por ts
) WITH CLUSTERING ORDER BY (ts DESC);

SELECT ts, temperatura
FROM   telemetria.lecturas
WHERE  sensor_id = 'CPD-01' AND dia = '2026-10-11'
LIMIT  10;                                    -- últimas 10 lecturas: una sola partición
```

> **No confundir** «familias de columnas» (Cassandra, HBase: NoSQL operacional) con las **bases de datos columnares** analíticas, que guardan cada columna por separado para comprimir y agregar rápido: Vertica, ClickHouse, Amazon Redshift, SAP HANA, los índices *columnstore* de SQL Server o los ficheros Parquet.

#### Grafos: Neo4j, JanusGraph, Cypher y GQL

Modelan los datos como **nodos** (entidades) unidos por **aristas** o **relaciones**, y son eficaces cuando lo importante son las **conexiones**: recorrer muchos saltos (amigos de amigos, cadenas de dependencias, circuitos de fraude) sin combinaciones costosas. Hay dos modelos:

| Modelo | Elementos | Lenguajes | Productos |
|---|---|---|---|
| **Grafo de propiedades** | Nodos con **etiquetas** y propiedades; relaciones con **tipo**, **dirección** y propiedades | **Cypher**, **Gremlin**, **GQL**, SQL/PGQ | Neo4j, JanusGraph, Amazon Neptune, TigerGraph, Memgraph |
| **RDF** (W3C) | **Tripletas** sujeto-predicado-objeto identificadas por URI; ontologías RDFS y OWL | **SPARQL** | Virtuoso, GraphDB, Apache Jena, Amazon Neptune |

- **Neo4j** (Java) es el SGBD de grafos más extendido: grafo **nativo** (cada nodo apunta directamente a sus vecinos, la llamada adyacencia sin índices), transacciones **ACID** y lenguaje **Cypher**. Su edición Community tiene licencia GPLv3. Desde 2025 numera sus versiones por **calendario** (2025.01, 2026.02…) y el lenguaje tiene versión propia, **Cypher 25**.
- **JanusGraph** es un SGBD de grafos **distribuido** de código abierto, bajo la Linux Foundation. Se consulta con **Gremlin** (Apache TinkerPop) y guarda los datos en Cassandra, HBase, ScyllaDB o Bigtable.
- **Cypher**: lenguaje **declarativo** de Neo4j (2011) que describe **patrones** con «arte ASCII»: `(nodo)-[:RELACION]->(nodo)`. Su versión abierta es openCypher. Lo han adoptado Memgraph y Amazon Neptune, entre otros.
- **Gremlin**: lenguaje de **recorrido** (*traversal*), paso a paso, de Apache TinkerPop.
- **SPARQL** (W3C, 2008; versión 1.1 de 2013): consultas sobre RDF. Lo usan los datos abiertos enlazados; en España la Norma Técnica de Interoperabilidad de reutilización pide describir los catálogos en RDF con el vocabulario DCAT.
- **GQL** (***ISO/IEC 39075:2024***, abril de 2024): primer lenguaje de bases de datos que ISO normaliza desde SQL, para crear y consultar grafos de propiedades. Comparte la sintaxis de patrones con **SQL/PGQ** (ISO/IEC 9075-16:2023).

```cypher
// Crear dos nodos y una relación con propiedad
CREATE (a:Persona {nif: '12345678Z', nombre: 'Ana'})
       -[:PRESENTA {fecha: date('2026-09-01')}]->
       (e:Expediente {id: 'EXP-2026-0001', procedimiento: 'Subvenciones'});

// Personas que han presentado expedientes junto a Ana (patrón de dos saltos)
MATCH (p:Persona {nif: '12345678Z'})-[:PRESENTA]->(e:Expediente)<-[:PRESENTA]-(otra:Persona)
RETURN otra.nombre, count(e) AS comunes
ORDER BY comunes DESC;

// Cadena de dependencias entre servidores, de 1 a 6 saltos
MATCH ruta = shortestPath((a:Servidor {nombre: 'web01'})-[:DEPENDE_DE*1..6]->(b:Servidor {nombre: 'bd01'}))
RETURN ruta;
```

```gremlin
g.V().has('Persona', 'nif', '12345678Z').out('PRESENTA').in('PRESENTA').values('nombre').dedup()
```

```sparql
PREFIX dcat: <http://www.w3.org/ns/dcat#>
PREFIX dct:  <http://purl.org/dc/terms/>
SELECT ?conjunto ?titulo
WHERE { ?conjunto a dcat:Dataset ; dct:title ?titulo . }
LIMIT 10
```

#### Motores de búsqueda: Elasticsearch y OpenSearch

**Elasticsearch** es un motor de búsqueda y analítica distribuido sobre **Apache Lucene**:

- guarda documentos **JSON** en **índices** repartidos en fragmentos (*shards*) y réplicas;
- usa un **índice invertido** para el texto libre y se maneja con una **API REST**;
- con Logstash, Kibana y Beats forma la pila **ELK** o Elastic Stack, muy usada para centralizar registros.

En 2021 Elastic cambió su licencia y AWS creó la bifurcación **OpenSearch**, con licencia Apache 2.0, gestionada desde 2024 por la OpenSearch Software Foundation de la Linux Foundation. En agosto de 2024 Elastic añadió de nuevo una licencia libre, la **AGPLv3**.

### 5.6 El ecosistema Hadoop y el *big data*

**Apache Hadoop** (Doug Cutting y Mike Cafarella, 2006) almacena y procesa grandes volúmenes en clústeres de equipos baratos:

- **HDFS**: sistema de ficheros distribuido. Un **NameNode** guarda los metadatos y los **DataNodes**, los bloques: de **128 MB** por defecto y **replicados 3 veces**.
- **YARN**: gestor de recursos del clúster, desde Hadoop 2.
- **MapReduce**: el modelo de proceso por lotes.

| Proyecto de Apache | Para qué sirve |
|---|---|
| **Hive** | Almacén de datos sobre Hadoop con un lenguaje **parecido a SQL** (HiveQL) |
| **Pig** | Flujos de transformación con el lenguaje Pig Latin |
| **HBase** | Base de datos NoSQL de familias de columnas sobre HDFS |
| **Spark** | Procesamiento distribuido **en memoria**, mucho más rápido que MapReduce, con módulos de SQL, *streaming*, aprendizaje automático y grafos |
| **Kafka** | Plataforma distribuida de **flujos de eventos** (publicación y suscripción con registro persistente) |
| **ZooKeeper** | **Coordinación** de servicios distribuidos: configuración, elección de líder, bloqueos |
| **Avro** | **Serialización de datos**: esquemas definidos en JSON, formato binario compacto, evolución de esquemas y RPC (LI 2018) |
| Parquet y ORC | Formatos de fichero **columnares** para analítica |
| **Flume** | Recogida, agregación y traslado de grandes volúmenes de **registros** (*logs*) |
| **Sqoop** | Transferencia masiva entre Hadoop y bases de datos relacionales (hoy retirado al Apache Attic) |
| **Chukwa** | Recogida de datos para **monitorizar** grandes sistemas distribuidos (hoy retirado al Apache Attic) |
| Oozie | Planificador de flujos de trabajo (retirado al Apache Attic) |
| Mahout | Aprendizaje automático escalable |
| Ambari | Instalación, gestión y monitorización de clústeres Hadoop |

**Jaql** no es de Apache: era un lenguaje de consulta para JSON creado por IBM. En la arquitectura actual, los **lagos de datos** (*data lakes*) guardan datos en bruto en almacenamiento de objetos y los ***lakehouse*** les añaden transacciones ACID con formatos de tabla abiertos como Apache Iceberg, Delta Lake y Apache Hudi.

### 5.7 NewSQL y SQL distribuido

**NewSQL** (término de Matthew Aslett, 451 Group, 2011) designa a los SGBD que mantienen el **modelo relacional, SQL y ACID**, pero **escalan horizontalmente** como los NoSQL. Usan particionado automático y consenso Raft o Paxos.

| Producto | Rasgos |
|---|---|
| **Google Spanner** | Distribuido a escala mundial, con consistencia externa gracias a relojes sincronizados (TrueTime); servicio en Google Cloud |
| **CockroachDB** | Inspirado en Spanner; compatible con el protocolo de PostgreSQL |
| **TiDB** | Compatible con MySQL; HTAP |
| **YugabyteDB** | Compatible con PostgreSQL y con una API parecida a Cassandra |
| VoltDB, SingleStore | En memoria, orientados a transacciones muy rápidas |

### 5.8 Ventajas e inconvenientes de los NoSQL

| Ventajas | Inconvenientes |
|---|---|
| **Escalado horizontal** con equipos baratos o en la nube | Consistencia **eventual** en muchos casos: la aplicación debe tolerar datos momentáneamente antiguos |
| **Alta disponibilidad** y tolerancia a fallos | **Sin estándar** común: cada producto tiene su modelo, su API y su lenguaje (salvo GQL para grafos) |
| **Esquema flexible**: los cambios no exigen migraciones | Consultas *ad hoc* y combinaciones limitadas; diseñar **para unas consultas concretas** dificulta las imprevistas |
| Rendimiento muy alto en accesos simples por clave | **Redundancia** por la desnormalización: actualizar un dato repetido es más difícil |
| Modelos naturales para documentos, grafos o series | Menos madurez en seguridad, auditoría y herramientas; menos profesionales con experiencia |

## 6. Comparativa y criterios de elección

### 6.1 Cuadro comparativo de las familias

| Aspecto | Relacional | Objeto-relacional | Orientado a objetos | Clave-valor | Documental | Familias de columnas | Grafos |
|---|---|---|---|---|---|---|---|
| Unidad de datos | Fila de una tabla | Fila con tipos estructurados | Objeto con OID | Par clave → valor | Documento JSON o BSON | Fila con columnas variables | Nodo y relación |
| Esquema | **Rígido**, declarado antes | Rígido, con tipos de usuario | Clases | **Ninguno** | **Flexible** | Flexible por fila | Flexible |
| Relaciones | Claves ajenas y `JOIN` | Claves, `REF` y colecciones | Referencias navegables | No hay | Anidadas o referencias | No hay `JOIN` | **Aristas de primera clase** |
| Consistencia | ACID fuerte | ACID | ACID | Normalmente eventual | Ajustable | **Ajustable** | ACID (Neo4j) |
| Escalado | Vertical, réplicas | Vertical | Vertical | **Horizontal** | Horizontal (*sharding*) | **Horizontal** masivo | Vertical en la mayoría |
| Lenguaje | **SQL** | SQL:1999 y siguientes | ODL, OQL y el lenguaje anfitrión | `GET`/`SET` | MQL, Mango, SQL++ | **CQL** | **Cypher**, Gremlin, GQL, SPARQL |
| Punto fuerte | Integridad, consultas *ad hoc*, madurez | Tipos ricos sin dejar SQL | Datos complejos sin desajuste de impedancia | **Latencia mínima** | Estructuras variables y anidadas | **Escrituras masivas** | **Recorridos** de muchos saltos |
| Punto débil | Escalado horizontal, esquema rígido | Complejidad | Poca implantación | Solo acceso por clave | Combinaciones y redundancia | Solo las consultas previstas | Escalado y agregados masivos |
| Ejemplos | Oracle, SQL Server, MySQL, PostgreSQL | PostgreSQL, Oracle | Matisse, ObjectStore, ZODB | Redis, DynamoDB, Riak | MongoDB, CouchDB | Cassandra, HBase | Neo4j, JanusGraph |

### 6.2 Cómo elegir

- **Necesito integridad fuerte y transacciones complejas** (contabilidad, nóminas, registro de expedientes, pagos): **relacional**.
- **Los datos cambian de estructura** o vienen como JSON (fichas de procedimientos, formularios variables): **documental** o relacional con JSON.
- **Accesos muy rápidos por clave** con caducidad (sesiones, cachés, contadores, colas): **clave-valor en memoria**.
- **Volúmenes enormes de escrituras** con consultas conocidas (telemetría, registros, IoT): **familias de columnas** o **series temporales**.
- **Lo importante son las relaciones** (fraude, redes, dependencias, recomendaciones): **grafos**.
- **Búsqueda de texto libre** y analítica de registros: **motor de búsqueda**.
- **SQL y ACID a escala mundial**: **NewSQL**.
- Otros criterios:
  - **experiencia del equipo** y herramientas;
  - **coste y licencia**, porque varios productos han cambiado de licencia entre 2018 y 2025: MongoDB, Elasticsearch, Redis;
  - **soporte** del fabricante;
  - disponibilidad como **servicio gestionado** en la nube;
  - cumplimiento del **ENS** y del **RGPD**: control de acceso, registro de actividad, cifrado y copias.

### 6.3 Supuesto resuelto: una plataforma de tramitación

Un organismo diseña su nueva plataforma y pide justificar el tipo de SGBD de cada componente:

| Componente | Elección | Justificación |
|---|---|---|
| Expedientes, plazos y pagos | **Relacional** (PostgreSQL u Oracle) | Integridad referencial, transacciones ACID e informes *ad hoc* |
| Sesiones de la sede electrónica con caducidad de 30 minutos | **Clave-valor en memoria** (Redis o Valkey) | Acceso por clave en microsegundos y TTL nativo |
| Catálogo de procedimientos con fichas de estructura distinta | **Documental** (MongoDB) o columna `JSONB` | Esquema flexible y consultas por cualquier campo |
| Detección de fraude en subvenciones: empresas, administradores, domicilios y cuentas compartidos | **Grafos** (Neo4j) | Encontrar ciclos y vínculos de varios saltos sin `JOIN` encadenados |
| Telemetría del CPD con miles de lecturas por segundo | **Familias de columnas** (Cassandra) o **series temporales** | Escritura masiva distribuida y consulta por sensor y fecha |
| Buscador de resoluciones por texto libre | **Elasticsearch** u **OpenSearch** | Índice invertido, relevancia y tolerancia a errores de escritura |

**Mismo dato en tres modelos**: un expediente con sus interesados y documentos.

- **Relacional**: tres tablas, `EXPEDIENTE`, `INTERESADO` (con clave ajena al expediente) y `DOCUMENTO`, que se reúnen con `JOIN`:

```sql
SELECT e.id, e.procedimiento, i.nif, d.tipo
FROM   expediente e
       JOIN interesado i ON i.id_expediente = e.id
       LEFT JOIN documento d ON d.id_expediente = e.id
WHERE  e.id = 'EXP-2026-0001';
```

- **Documental**: **un solo documento** con los interesados y los documentos **incrustados** (el `insertOne` del apartado 5.5). Se lee de una vez, pero si un interesado cambia de domicilio hay que actualizarlo en todos los expedientes donde aparece.
- **Grafo**: nodos `Persona` y `Expediente` unidos por relaciones `PRESENTA` (el `CREATE` de Cypher del apartado 5.5). Es ideal para preguntar «quién está conectado con quién», pero peor para sumar importes de millones de expedientes.

## Normativa y estándares clave

| Estándar o norma | Qué regula | Puntos clave |
|---|---|---|
| **Codd (1970)** y **reglas de Codd (1985)** | Modelo relacional | Relación, dominio, claves e integridad; objetivos de independencia física y lógica, flexibilidad, uniformidad y sencillez; 12 reglas más la regla 0 |
| **Informes ANSI/X3/SPARC** (1975-1978) | Arquitectura de los SGBD | Niveles externo, conceptual e interno; independencia lógica y física |
| **ISO/IEC 9075:2023** (SQL:2023) | Lenguaje SQL | Parte 2 (*Foundation*), 3 (CLI, base de ODBC), 4 (PSM), 9 (datos externos), 14 (XML) y **16 (SQL/PGQ, grafos de propiedades)**; tipo `JSON`; tipos de objeto desde SQL:1999 y `MULTISET` desde SQL:2003 |
| **ISO/IEC 39075:2024** (GQL) | Lenguaje de consulta de grafos de propiedades | Primer lenguaje de bases de datos de ISO desde SQL; patrones compartidos con SQL/PGQ |
| ***The Object-Oriented Database System Manifesto*** (1989) | Definición de SGBDOO | 13 características obligatorias (8 de objetos y 5 de SGBD), 5 opcionales y 4 abiertas |
| **ODMG 3.0** (2000) | Bases de datos de objetos | Modelo de objetos, **ODL**, **OQL** y vinculaciones con C++, Smalltalk y Java (OML) |
| **W3C RDF 1.1** y **SPARQL 1.1** | Grafos de conocimiento y datos enlazados | Tripletas sujeto-predicado-objeto; consultas SPARQL |
| **X/Open XA** | Transacciones distribuidas | Compromiso en dos fases entre gestor de transacciones y gestores de recursos |
| **ENS** (Real Decreto 311/2022) | Seguridad de los sistemas de la Administración, incluidas sus bases de datos | Control de acceso (**op.acc**: identificación, requisitos de acceso, **segregación de funciones**, gestión de derechos, autenticación), **registro de la actividad** (op.exp.8), protección de **claves criptográficas** (op.exp.10), **criptografía** de soportes (mp.si.2), confidencialidad en las comunicaciones (mp.com.2) y **copias de seguridad** (mp.info.6) |
| **RGPD**, arts. 25 y 32 | Protección de datos personales | Protección de datos desde el diseño y por defecto; **seudonimización y cifrado**, confidencialidad, integridad, disponibilidad y resiliencia, restauración rápida tras un incidente |
| **NTI de Reutilización de recursos de la información** (2013) | Datos abiertos de la Administración | Catálogos descritos con el vocabulario **DCAT** en RDF |

## Lo que más cae en el examen

**26 preguntas** entre 2016 y 2025: 23 de ingreso libre (2 en 2016, 3 en 2018, 3 en 2019, 1 en 2021, 5 en 2023, 3 en 2024, 2 en el extraordinario de 2025 y 4 en 2025) y 3 de promoción interna (2018, 2021 y el supuesto de 2023). Incluyen 2 de reserva (LI 2019 y LI 2023) y 1 anulada (LI 2023).

| Concepto | Preguntas | Exámenes |
|---|---|---|
| **Reglas de Codd**: cuál **no** es una de ellas | 4 | LI 2019 (reserva), LI 2021, PI 2018, PI 2021 |
| **Objetivos de Codd**: la «independencia conceptual» no lo es | 1 | LI 2016 |
| **Conceptos relacionales**: el atributo toma valores de un dominio; clave foránea; clave primaria, superclave y dominio frente a «clave-valor»; **ACID** | 4 | LI 2016, LI 2023, LI 2024, LI 2025‑ext |
| **ANSI/SPARC** (anulada por tener dos respuestas falsas) | 1 | LI 2023 |
| **Orientados a objetos**: características obligatorias (extensibilidad), **OID** generado por el sistema, **constructores de colección**, **OQL** es de consulta, **Matisse** | 5 | LI 2023, LI 2024 (2), LI 2025 (2) |
| **NoSQL**: tipos (documentales y clave-valor), **Aurora no es NoSQL**, **JanusGraph** es de grafos, **Cypher** es el lenguaje de **Neo4j** (2) | 5 | LI 2018, LI 2019, LI 2025‑ext, LI 2025 (2) |
| **Ecosistema Hadoop**: Avro sirve para serializar datos | 1 | LI 2018 |
| **Productos**: MaxDB es relacional y JSON no es un SGBD; *tablespace* de Oracle; **Machine Learning Services** de SQL Server y su paquete RevoScaleR; un SGBD como producto típico de Oracle | 5 | LI 2018, LI 2019, LI 2023 (2, una de reserva), PI 2023 (supuesto) |

**Patrón**: preguntas cortas de **«cuál NO es»** (reglas, tipos, productos) y de **clasificar productos** por familia. En las de objetos, definiciones de manual (OID, constructores, OQL). Las de productos premian haber trabajado con Oracle y SQL Server. Los **niveles de aislamiento** y la propiedad de aislamiento se clasifican en el tema III.3 (LI 2024, LI 2025‑ext y PI 2025), y las copias y puertos de los SGBD, en el IV.2. En el examen de **2015**, que se está incorporando al banco, cayeron además: ZODB de **Zope** como base de datos orientada a objetos, PostgreSQL como gestor relacional, las propiedades ACID con la D como «**persistencia**» y Codd como creador del modelo relacional.

## Trampas habituales

- **ACID**: Atomicidad, Consistencia, aIslamiento y **Durabilidad** (o persistencia). La «D» no es «disponibilidad» ni «distribución», y la «C» no es «concurrencia».
- **Reglas de Codd**: es independencia **de** la distribución (no «dependencia»), inserción, actualización y borrado **de alto nivel** (no «de bajo nivel») y la **no subversión** sí es una regla. No existen la «cardinalidad de las entidades» ni la «integridad de paridad».
- **Objetivos de Codd**: independencia física, independencia lógica, flexibilidad, uniformidad y sencillez. La «independencia conceptual» no está.
- **ANSI/SPARC**: externo, **conceptual** e interno. No hay nivel «contextual», y el interno se llama **físico**, no lógico.
- **Oracle**: el *tablespace* es una unidad **lógica**; cada *datafile* pertenece a **un solo** *tablespace*; la unidad mínima es el **bloque**, no el segmento; la extensión es un conjunto de bloques contiguos, no una agrupación de índices.
- **SQL Server**: Machine Learning Services ejecuta **Python y R** con los datos; la **replicación** copia y sincroniza; **DQS** es calidad de datos (retirado en 2025); el **motor de base de datos** almacena, procesa y protege.
- **AWS**: **Aurora es relacional**; **DynamoDB** es NoSQL. **JSON** es un formato, no un SGBD; **MaxDB** sí es un SGBDR (de SAP).
- **Lenguaje → producto**: **Cypher → Neo4j**, CQL → Cassandra, MQL → MongoDB, Gremlin → TinkerPop y JanusGraph, SPARQL → RDF, AQL → ArangoDB, HiveQL → Hive, **OQL → ODMG**. Cypher es un lenguaje, no una base de datos.
- **Producto → tipo**: CouchDB y MongoDB son **documentales**; HBase y Cassandra, de **columnas**; Redis, Riak y DynamoDB, **clave-valor**; Neo4j y **JanusGraph**, de **grafos**.
- **OID**: lo **genera el sistema**, es **invisible** para el usuario externo, **inmutable** e **independiente** de los atributos. No lo asigna ni lo guarda la aplicación.
- **Constructores de colección**: conjunto, bolsa, lista, *array* y diccionario. «Columna» no lo es. El **conjunto** no admite duplicados y la **bolsa**, sí.
- **ODMG**: **ODL** define, **OQL** consulta y **OML** manipula (dentro de las vinculaciones con los lenguajes). OQL no tiene `UPDATE`.
- **Manifiesto de 1989**: la **extensibilidad** (poder definir tipos nuevos) es obligatoria; la **herencia múltiple**, la distribución, las versiones y las transacciones de diseño son **opcionales**.
- **Familias de columnas ≠ columnar analítico**: Cassandra y HBase son NoSQL operacionales; Vertica, ClickHouse o los *columnstore* son almacenes analíticos.
- **CAP**: la «C» de CAP (todas las réplicas ven el mismo dato) **no es** la «C» de ACID (respetar las restricciones). La elección real es entre C y A **cuando hay partición**; CA solo existe sin distribución.
- **BASE**: básicamente disponible, estado blando y consistencia **eventual**. No significa «sin transacciones» ni «sin consistencia».
- **NoSQL** es «***Not only SQL***»: varios tienen lenguajes parecidos a SQL (CQL, SQL++, HiveQL).
- **Hadoop**: **Avro = serialización**, Flume = registros, Chukwa = monitorización, Sqoop = Hadoop ↔ relacional, ZooKeeper = coordinación, Hive = SQL. Jaql es de IBM, no de Apache.
- **Bloqueos**: el bloqueo en dos fases garantiza la serializabilidad, **pero no evita los interbloqueos**. Con MVCC los lectores no bloquean a los escritores. Solo puede haber **un índice agrupado** por tabla.

## Repaso rápido

- SGBD: software que define, construye, manipula, protege y comparte bases de datos. Servicios: almacenamiento, catálogo, transacciones, concurrencia, recuperación, autorización, integridad, comunicación, independencia y utilidades.
- Componentes: **procesador de consultas** (intérprete LDD, compilador LMD, **optimizador** basado en costes, motor de ejecución) y **gestor de almacenamiento** (autorización e integridad, **transacciones**, búfer, ficheros), sobre datos, índices, **catálogo** y **registro**.
- ANSI/SPARC: externo, conceptual e interno; independencia lógica (externo/conceptual) y física (conceptual/interno).
- ACID (Härder y Reuter, 1983); WAL; puntos de control; *undo* y *redo*; ARIES.
- Concurrencia: bloqueos S y X, 2PL estricto, interbloqueos con grafo de espera y víctima; MVCC. Aislamiento por defecto: READ COMMITTED (Oracle, SQL Server, PostgreSQL) y REPEATABLE READ (InnoDB).
- Distribuidas: fragmentación horizontal y vertical, replicación, transparencias, **2PC** (votación y decisión), 12 reglas de Date.
- Relacional: Codd (1970); objetivos (independencia física y lógica, flexibilidad, uniformidad, sencillez); **12 reglas + regla 0** (1985).
- Oracle: instancia (SGA, PGA, DBWn, LGWR, CKPT, SMON, PMON, ARCn) y base de datos (datafiles, control files, redo); **bloque < extensión < segmento < tablespace**; CDB/PDB.
- SQL Server: motor, Agente, SSIS, SSAS, Power BI Report Server, **Machine Learning Services (Python y R)**, replicación; `.mdf`, `.ndf`, `.ldf`; master, model, msdb, tempdb.
- MySQL: motores enchufables, InnoDB por defecto. PostgreSQL: objeto-relacional, MVCC con VACUUM, extensible.
- En 2026: Oracle AI Database 26ai, SQL Server 2025, MySQL 8.4 y 9.7 LTS, MariaDB 12.3 LTS, PostgreSQL 18 (19 en beta), Db2 12.1.
- SGBDOO: OID generado por el sistema, invisible, inmutable e independiente de los valores; constructores atómico, tupla y colecciones (conjunto, bolsa, lista, *array*, diccionario); persistencia por nombre o por alcanzabilidad.
- Manifiesto de 1989: 13 obligatorias (objetos complejos, identidad, encapsulación, tipos o clases, herencia, sobrescritura y ligadura tardía, completitud, **extensibilidad**, persistencia, almacenamiento secundario, concurrencia, recuperación, consultas *ad hoc*).
- ODMG 3.0: modelo de objetos, ODL, **OQL (consulta)** y vinculaciones C++, Smalltalk y Java. Productos: Matisse, ObjectStore, Versant, GemStone/S, ObjectDB, ZODB.
- Objeto-relacional (SQL:1999): UDT distintos y estructurados, herencia `UNDER`, tablas tipadas, `REF`, `ARRAY` y `MULTISET`. Oracle `CREATE TYPE … AS OBJECT`; PostgreSQL tipos compuestos, *arrays* e `INHERITS`.
- NoSQL (2009, «Not only SQL»): esquema flexible, escalado horizontal, replicación, consistencia eventual; **CAP** (Brewer 2000, Gilbert y Lynch 2002), PACELC y **BASE**; quórum **R + W > N**.
- Tipos: **clave-valor** (Redis, DynamoDB, Riak), **documental** (MongoDB, CouchDB), **familias de columnas** (Cassandra, HBase), **grafos** (Neo4j con Cypher, JanusGraph con Gremlin; RDF con SPARQL; **GQL** ISO/IEC 39075:2024).
- Hadoop: HDFS (bloques de 128 MB, réplica 3), YARN, MapReduce; Hive, Pig, HBase, Spark, Kafka, ZooKeeper, **Avro (serialización)**, Flume, Sqoop. NewSQL: Spanner, CockroachDB, TiDB, YugabyteDB.

## Fuentes

- [E. F. Codd (1970), *A Relational Model of Data for Large Shared Data Banks*, Communications of the ACM 13(6)](https://doi.org/10.1145/362384.362685)
- [ISO/IEC 9075-1:2023, SQL/Framework (ISO)](https://www.iso.org/standard/76583.html)
- [ISO/IEC 9075-16:2023, Property Graph Queries (SQL/PGQ) (ISO)](https://www.iso.org/standard/79473.html)
- [ISO/IEC 39075:2024, GQL (ISO)](https://www.iso.org/standard/76120.html)
- [Atkinson y otros (1989), *The Object-Oriented Database System Manifesto*](https://cs.brown.edu/courses/cs295-11/2006/oo-manifesto.pdf)
- [Oracle Database 23ai Concepts, *Logical Storage Structures*](https://docs.oracle.com/en/database/oracle/oracle-database/23/cncpt/logical-storage-structures.html)
- [Microsoft Learn, *What's new in SQL Server 2025*](https://learn.microsoft.com/en-us/sql/sql-server/what-s-new-in-sql-server-2025)
- [Microsoft Learn, *What is SQL Server Machine Learning Services (Python and R)?*](https://learn.microsoft.com/en-us/sql/machine-learning/sql-server-machine-learning-services)
- [PostgreSQL, política de versiones](https://www.postgresql.org/support/versioning/) y [notas de la versión 18](https://www.postgresql.org/docs/release/18.0/)
- [MariaDB Server 12.3 LTS](https://mariadb.org/mariadb-server-12-3-lts-released/)
- [Documentación de MongoDB](https://www.mongodb.com/docs/manual/)
- [Documentación de Apache Cassandra](https://cassandra.apache.org/doc/latest/)
- [Documentación de Redis](https://redis.io/docs/latest/) y [Valkey (Linux Foundation)](https://valkey.io/)
- [Neo4j, *Cypher Manual*](https://neo4j.com/docs/cypher-manual/current/) y [JanusGraph](https://janusgraph.org/)
- [W3C, SPARQL 1.1 Query Language](https://www.w3.org/TR/sparql11-query/)
- [E. Brewer (2000), *Towards Robust Distributed Systems*, conferencia en PODC](https://people.eecs.berkeley.edu/~brewer/cs262b-2004/PODC-keynote.pdf)
- [S. Gilbert y N. Lynch (2002), *Brewer's Conjecture and the Feasibility of Consistent, Available, Partition-Tolerant Web Services*](https://www.comp.nus.edu.sg/~gilbert/pubs/BrewersConjecture-SigAct.pdf)
- [D. Abadi (2012), *Consistency Tradeoffs in Modern Distributed Database System Design*, IEEE Computer](https://doi.org/10.1109/MC.2012.33)
- [Apache Hadoop](https://hadoop.apache.org/), [Apache Avro](https://avro.apache.org/) y [Apache Attic](https://attic.apache.org/)
- [Real Decreto 311/2022, Esquema Nacional de Seguridad (BOE-A-2022-7191)](https://www.boe.es/buscar/act.php?id=BOE-A-2022-7191)
- [Reglamento (UE) 2016/679 (RGPD)](https://eur-lex.europa.eu/eli/reg/2016/679/oj)
- [NTI de Reutilización de recursos de la información (BOE-A-2013-2380)](https://www.boe.es/buscar/act.php?id=BOE-A-2013-2380)
