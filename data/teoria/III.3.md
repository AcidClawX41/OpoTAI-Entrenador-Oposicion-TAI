# III.3 · Lenguajes de consulta: SQL estándar, procedimientos almacenados, eventos y disparadores

SQL es, con diferencia, el contenido más preguntado del bloque III: aparece en el cuestionario (clasificación de sentencias, transacciones, disparadores) y en **todos** los supuestos prácticos del bloque III, donde hay que elegir la sentencia correcta sobre un modelo de datos dado (`SELECT` con `JOIN`, `GROUP BY` y `HAVING`, `CREATE TABLE`, restricciones, vistas, secuencias, usuarios). El programa pide cuatro cosas: los **lenguajes de interrogación** de bases de datos en general, el **estándar ANSI/ISO SQL**, los **procedimientos almacenados** y los **eventos y disparadores**. El tema se apoya en el diseño de datos del tema III.1 y en los SGBD del tema II.5; la administración de bases de datos (copias, usuarios del SGBD, puertos) está en IV.2.

## Lenguajes de interrogación de bases de datos

### Clasificación

| Tipo | Idea | Ejemplos |
|---|---|---|
| **Procedimentales** | Indican **cómo** obtener el resultado, paso a paso | Álgebra relacional; lenguajes navegacionales de los modelos jerárquico y en red (DL/I de IMS, DML de CODASYL) |
| **No procedimentales** (declarativos) | Indican **qué** se quiere; el SGBD decide cómo | Cálculo relacional; **SQL**; QUEL (Ingres); **QBE** (*Query By Example*, IBM, consulta rellenando una tabla modelo) |

### Lenguajes de consulta según el modelo de datos

| Modelo | Lenguaje | Estándar o referencia |
|---|---|---|
| Relacional | **SQL** | ISO/IEC 9075 (vigente: **SQL:2023**) |
| Grafos de propiedades | **GQL**; Cypher (Neo4j); SQL/PGQ | **ISO/IEC 39075:2024** (GQL, primer lenguaje de consulta de bases de datos publicado por ISO desde SQL); ISO/IEC 9075-16 (SQL/PGQ) |
| Orientado a objetos | OQL | ODMG 3.0 |
| XML | XPath y XQuery | W3C (XQuery 3.1) |
| RDF (web semántica) | SPARQL | W3C (SPARQL 1.1) |
| Documental | API de consultas de MongoDB (filtros JSON, *aggregation pipeline*) | Producto |
| Columnas anchas | CQL (Cassandra) | Producto |
| ORM | JPQL (Jakarta Persistence), HQL (Hibernate), LINQ (.NET) | Especificaciones de cada plataforma |

### Formas de usar SQL desde los programas

- **Interactivo**: desde una consola o cliente (SQL\*Plus, `psql`, `mysql`, SQL Server Management Studio).
- **SQL inmerso o embebido**: sentencias dentro de un lenguaje anfitrión (COBOL, C) marcadas con `EXEC SQL` y tratadas por un **precompilador**; los resultados de varias filas se procesan con **cursores**.
- **SQL dinámico**: la sentencia se construye en ejecución (`PREPARE`/`EXECUTE`, `EXECUTE IMMEDIATE`).
- **Interfaces de llamada (CLI)**: ODBC (basado en SQL/CLI, ISO/IEC 9075-3), **JDBC** (Java), **ADO.NET** (.NET), PDO (PHP), DB-API (Python). Para evitar la **inyección SQL** se usan **sentencias preparadas con parámetros** (`PreparedStatement`), nunca concatenación de cadenas.
- **Módulos almacenados** en el propio SGBD (SQL/PSM, PL/SQL, T-SQL): procedimientos, funciones y disparadores.

## El estándar ANSI/ISO SQL

### Historia y versiones

SQL nació en IBM como **SEQUEL** (Chamberlin y Boyce, 1974) para el prototipo **System R**, basado en el modelo de Codd. Lo normalizó **ANSI en 1986** y **ISO en 1987**; desde entonces lo mantiene el comité ISO/IEC JTC 1/SC 32.

| Versión | Novedades principales |
|---|---|
| SQL-86/87 | Primera norma |
| SQL-89 | Integridad referencial básica |
| **SQL-92** (SQL2) | Tres niveles de conformidad (*Entry, Intermediate, Full*); `JOIN` explícitos en el `FROM`, `CASE`, `CAST`, **niveles de aislamiento**, dominios, `INFORMATION_SCHEMA` |
| **SQL:1999** (SQL3) | **Disparadores**, consultas **recursivas** (`WITH RECURSIVE`), tipo `BOOLEAN`, roles, tipos definidos por el usuario y características **objeto-relacionales**; SQL/PSM se integra como parte 4 |
| SQL:2003 | **Funciones de ventana** (`OVER`), `MERGE`, **secuencias**, columnas **identidad**, SQL/XML |
| SQL:2006 | Más XML (integración con XQuery) |
| SQL:2008 | `TRUNCATE TABLE`, disparadores **`INSTEAD OF`**, `FETCH FIRST n ROWS ONLY` |
| SQL:2011 | **Datos temporales** (tablas versionadas por el sistema y periodos de aplicación) |
| SQL:2016 | **JSON** (funciones SQL/JSON), reconocimiento de patrones en filas (`MATCH_RECOGNIZE`), `LISTAGG` |
| **SQL:2023** | **SQL/PGQ** (consultas de grafos de propiedades, parte 16), tipo de datos **`JSON`**, `GREATEST`/`LEAST`, `ANY_VALUE` |

Partes de **ISO/IEC 9075** que conviene reconocer: 1 *Framework*, 2 *Foundation* (el núcleo), 3 **CLI** (base de ODBC), 4 **PSM** (módulos almacenados), 9 MED (datos externos), 10 OLB (SQL en Java), 11 *Schemata* (catálogo), 13 JRT (rutinas en Java), 14 **XML**, 15 MDA (*arrays* multidimensionales) y 16 **PGQ** (grafos). Ningún producto cumple el estándar completo y todos añaden **extensiones propias** (PL/SQL de Oracle, Transact-SQL de SQL Server, dialectos de MySQL y PostgreSQL). Ojo: **los índices (`CREATE INDEX`) no forman parte del estándar**, aunque todos los SGBD los implementan.

### Sublenguajes de SQL

| Sublenguaje | Para qué | Sentencias |
|---|---|---|
| **DDL** (*Data Definition Language*) | Definir y modificar la **estructura** (esquemas, tablas, vistas, índices) | `CREATE`, `ALTER`, `DROP`, `TRUNCATE`, `RENAME`, `COMMENT` |
| **DML** (*Data Manipulation Language*) | Consultar y modificar **los datos** | **`SELECT`**, `INSERT`, `UPDATE`, `DELETE`, `MERGE` |
| DQL (*Data Query Language*) | Subconjunto de consulta en algunas clasificaciones | `SELECT` |
| **DCL** (*Data Control Language*) | **Permisos** y seguridad | **`GRANT`**, **`REVOKE`**, `DENY` (Transact-SQL) |
| **TCL** (*Transaction Control Language*) | Control de **transacciones** | `COMMIT`, **`ROLLBACK`**, **`SAVEPOINT`**, `SET TRANSACTION` |

En el estándar y en las preguntas del tribunal **`SELECT` es DML** (2024). **CRUD** (*Create, Read, Update, Delete*) son las cuatro operaciones básicas sobre los datos, que corresponden a `INSERT`, `SELECT`, `UPDATE` y `DELETE`.

| | `DELETE` | `TRUNCATE` | `DROP` |
|---|---|---|---|
| Tipo | DML | DDL en la práctica (incorporado al estándar en SQL:2008) | DDL |
| Qué elimina | Filas (todas o las que cumplan el `WHERE`) | **Todas** las filas | La **tabla entera**: estructura y datos (y sus índices, permisos, disparadores) |
| `WHERE` | Sí | No | No |
| ¿Dispara *triggers* de fila? | Sí | No | No |
| ¿Se puede deshacer? | Sí, con `ROLLBACK` | En Oracle no (hace `COMMIT` implícito); en SQL Server y PostgreSQL sí dentro de una transacción | En Oracle no (salvo la papelera, `FLASHBACK`) |
| Contadores de identidad | Se mantienen | Se reinician (SQL Server, MySQL) | Desaparecen con la tabla |

### DDL: definición de datos

```sql
CREATE TABLE convocatoria (
  id_conv     INTEGER       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,  -- identidad (SQL:2003)
  cuerpo      VARCHAR(10)   NOT NULL,
  anio        SMALLINT      NOT NULL CHECK (anio BETWEEN 2000 AND 2100),
  plazas      INTEGER       DEFAULT 0 NOT NULL,
  CONSTRAINT uq_conv UNIQUE (cuerpo, anio)
);

CREATE TABLE opositor (
  id_opositor BIGINT        PRIMARY KEY,
  dni         CHAR(9)       NOT NULL,
  nombre      VARCHAR(100)  NOT NULL,
  provincia   VARCHAR(40)
);

CREATE TABLE solicitud (
  id_solicitud BIGINT       PRIMARY KEY,
  id_opositor  BIGINT       NOT NULL REFERENCES opositor (id_opositor),
  id_conv      INTEGER      NOT NULL REFERENCES convocatoria (id_conv) ON DELETE CASCADE,
  fecha        DATE         DEFAULT CURRENT_DATE NOT NULL,
  estado       VARCHAR(12)  DEFAULT 'PRESENTADA' NOT NULL
);

CREATE TABLE nota (
  id_solicitud BIGINT       NOT NULL REFERENCES solicitud (id_solicitud),
  ejercicio    SMALLINT     NOT NULL,
  nota         DECIMAL(4,2) CHECK (nota BETWEEN 0 AND 10),
  PRIMARY KEY (id_solicitud, ejercicio)
);

ALTER TABLE opositor ADD CONSTRAINT uq_dni UNIQUE (dni);   -- evita duplicados (y crea un índice)
ALTER TABLE opositor ADD email VARCHAR(100);
ALTER TABLE opositor DROP COLUMN provincia;
DROP TABLE prueba_old;                                    -- estructura y datos
```

- **Tipos de datos del estándar**: `CHAR(n)` (longitud fija, rellena con espacios), `VARCHAR(n)` (variable), `NUMERIC(p,s)`/`DECIMAL(p,s)` (exactos), `SMALLINT`, `INTEGER`, `BIGINT`, `REAL`, `DOUBLE PRECISION`, `FLOAT(p)`, `BOOLEAN`, `DATE`, `TIME`, `TIMESTAMP`, `INTERVAL`, `BLOB`, `CLOB`, `XML` y, desde 2023, `JSON`. Oracle usa `VARCHAR2` y `NUMBER`; SQL Server, `NVARCHAR`, `DATETIME2` y `BIT`.
- **Restricciones**: `PRIMARY KEY`, `FOREIGN KEY … REFERENCES` (con `ON DELETE`/`ON UPDATE CASCADE | SET NULL | SET DEFAULT | RESTRICT | NO ACTION`), `UNIQUE`, `NOT NULL`, `CHECK` y `DEFAULT`. Para que un campo no admita duplicados se usa **`UNIQUE`** (supuesto de 2026); un índice normal no lo impide.
- **Valores autonuméricos**: columnas identidad del estándar (`GENERATED … AS IDENTITY`), `IDENTITY(1,1)` en SQL Server (se reajusta con `DBCC CHECKIDENT`), `AUTO_INCREMENT` en MySQL, `SERIAL`/identidad en PostgreSQL y **secuencias**:

```sql
CREATE SEQUENCE seq_matricula START WITH 1 INCREMENT BY 1;   -- Oracle, PostgreSQL, SQL Server
INSERT INTO matricula (id_matricula, id_alumno) VALUES (seq_matricula.NEXTVAL, 10);   -- Oracle
-- PostgreSQL: nextval('seq_matricula'); SQL Server y estándar: NEXT VALUE FOR seq_matricula
```

```sql
CREATE TABLE profesores_ingles (                 -- MySQL
  id        INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
  nombre    VARCHAR(30),
  apellido1 VARCHAR(30)
);
```

**Vistas**: tablas virtuales definidas por una consulta. Simplifican consultas, ocultan columnas y filas (seguridad) y aportan independencia lógica. Una vista es **actualizable** si se basa en una sola tabla sin agregados, `DISTINCT` ni `GROUP BY`; `WITH CHECK OPTION` impide insertar o modificar filas que la vista no mostraría. Las **vistas materializadas** (Oracle, PostgreSQL; vistas indexadas en SQL Server) guardan el resultado y no son del estándar.

```sql
CREATE VIEW exp_tramitados AS
  SELECT id_usuario_tramitador, COUNT(id_expediente) AS total
  FROM expedientes
  GROUP BY id_usuario_tramitador;
```

### DML: manipulación de datos

```sql
INSERT INTO cuerpo_becado (codigo, denominacion) VALUES ('TAI', 'Técnico Auxiliar de Informática');
INSERT INTO convocatoria (cuerpo, anio, plazas) VALUES ('TAI', 2026, 1200), ('GSI', 2026, 400);
INSERT INTO hist_solicitud SELECT * FROM solicitud WHERE fecha < DATE '2024-01-01';

UPDATE ejercicio SET duracion = duracion * 1.1;              -- +10 % a todas las filas
UPDATE customers SET city = 'PARIS' WHERE customer_id = 7;   -- sin WHERE, cambia TODAS las filas

DELETE FROM solicitud WHERE estado = 'DESISTIDA';

MERGE INTO plazas_destino d                                   -- "upsert" (SQL:2003)
USING plazas_nuevas n ON (d.id_destino = n.id_destino)
WHEN MATCHED THEN UPDATE SET d.plazas = n.plazas
WHEN NOT MATCHED THEN INSERT (id_destino, plazas) VALUES (n.id_destino, n.plazas);
```

### La sentencia SELECT

```sql
SELECT   [DISTINCT] columnas o expresiones [AS alias]
FROM     tablas y combinaciones (JOIN)
WHERE    condición sobre filas
GROUP BY columnas de agrupación
HAVING   condición sobre grupos
ORDER BY columnas [ASC | DESC]
OFFSET n ROWS FETCH FIRST m ROWS ONLY;
```

**Orden lógico de evaluación**: `FROM` → `WHERE` → `GROUP BY` → `HAVING` → `SELECT` → `DISTINCT` → `ORDER BY` → `OFFSET/FETCH`. Por eso un alias del `SELECT` no puede usarse en el `WHERE` ni en el `HAVING` (sí en el `ORDER BY`), y **las funciones de agregado no pueden ir en el `WHERE`**: las condiciones sobre grupos van en **`HAVING`**.

**Predicados del `WHERE`**: comparaciones (`=`, `<>`, `<`, `>`, `<=`, `>=`), `BETWEEN a AND b` (**incluye** los extremos), `IN (lista o subconsulta)`, `LIKE` con comodines **`%`** (cualquier secuencia, incluso vacía) y **`_`** (exactamente un carácter), `IS [NOT] NULL` (nunca `= NULL`), `EXISTS`, `ANY`/`SOME`/`ALL` y los conectores `AND`, `OR`, `NOT`.

```sql
SELECT * FROM opositor WHERE dni LIKE '3%';                 -- DNI que empieza por 3
SELECT * FROM fichero WHERE nombre NOT LIKE '%.pdf';        -- los que no terminan en .pdf
SELECT * FROM opositor WHERE nombre LIKE '_a%';             -- segunda letra "a"
SELECT * FROM opositor WHERE email IS NULL;
```

**Funciones de agregado**: `COUNT(*)` (cuenta filas), `COUNT(columna)` (**ignora los nulos**), `COUNT(DISTINCT columna)`, `SUM`, `AVG`, `MIN` y `MAX`; todas salvo `COUNT(*)` ignoran los nulos. Toda columna del `SELECT` que no esté dentro de un agregado debe figurar en el `GROUP BY`. Extensiones de agrupación: `ROLLUP` (subtotales jerárquicos), `CUBE` (todas las combinaciones) y `GROUPING SETS`.

```sql
-- Opositores con más de una solicitud (WHERE no admite agregados: se usa HAVING)
SELECT id_opositor, COUNT(id_solicitud)
FROM solicitud
GROUP BY id_opositor
HAVING COUNT(id_solicitud) > 1;
```

**Expresión `CASE`** (estándar desde SQL-92; no existen `IF … ENDIF`, `SWITCH` ni `IIF` en el estándar):

```sql
SELECT id_proceso,
       CASE id_forma_acceso WHEN 'L' THEN 'Ingreso libre'
                            WHEN 'P' THEN 'Promoción interna'
                            ELSE 'Otra' END AS forma_acceso
FROM proceso;
```

Otras funciones útiles: `COALESCE(a, b, …)` (primer valor no nulo; `NVL` en Oracle, `ISNULL` en SQL Server, `IFNULL` en MySQL), `NULLIF`, `CAST(x AS tipo)`, de cadenas (`SUBSTRING`, `UPPER`, `LOWER`, `TRIM`, `POSITION`, `CHAR_LENGTH`, concatenación `||`; en Oracle `SUBSTR` e `INSTR`, en SQL Server `LEN` y `CHARINDEX`) y de fechas (`CURRENT_DATE`, `CURRENT_TIMESTAMP`, `EXTRACT`).

> `INSTR(cadena, buscada, inicio, ocurrencia)` de Oracle: `INSTR('Corporate Floor', 'or', 3, 2)` busca desde la posición 3 la **segunda** aparición de «or». Las apariciones están en las posiciones 2, 5 y 14; desde la 3, la primera es la 5 y la segunda la **14** (pregunta de 2026).

**Limitar filas**: estándar `FETCH FIRST 10 ROWS ONLY` (Oracle 12c+, PostgreSQL, SQL Server con `OFFSET`), **`TOP (10)`** en SQL Server, `LIMIT 10` en MySQL y PostgreSQL, `ROWNUM` en Oracle antiguo. Para «los últimos 10 dados de alta» hay que **ordenar por fecha descendente**:

```sql
SELECT TOP (10) nombre, apellido1 FROM usuarios ORDER BY fecha_creacion DESC;     -- SQL Server
SELECT nombre, apellido1 FROM usuarios ORDER BY fecha_creacion DESC
FETCH FIRST 10 ROWS ONLY;                                                         -- estándar
```

### Combinaciones (JOIN)

| Tipo | Devuelve |
|---|---|
| `INNER JOIN … ON` | Solo las filas con correspondencia en ambas tablas |
| `LEFT [OUTER] JOIN` | Todas las de la izquierda y las coincidentes de la derecha (o nulos) |
| `RIGHT [OUTER] JOIN` | Todas las de la derecha y las coincidentes de la izquierda |
| `FULL [OUTER] JOIN` | Todas las de ambas (no existe en MySQL) |
| `CROSS JOIN` | **Producto cartesiano** (todas con todas) |
| `NATURAL JOIN` / `JOIN … USING (col)` | *Join* por las columnas de igual nombre |
| Autocombinación (*self join*) | Una tabla consigo misma con alias distintos (empleado y su jefe) |

![Seis esquemas de combinación entre las tablas A y B: INNER JOIN sombrea solo la intersección; LEFT JOIN, todo A; RIGHT JOIN, todo B; FULL JOIN, ambas; LEFT JOIN con WHERE B.clave IS NULL, la parte de A sin pareja; y CROSS JOIN, una cuadrícula con todas las combinaciones de tres filas de A y dos de B](diagramas/III.3-tipos-join.svg)

*Figura: qué filas devuelve cada tipo de JOIN (las filas sin pareja se completan con NULL).*

`SELECT * FROM alumno, matricula` **sin condición** es un producto cartesiano, no una combinación (distractor de 2026). La sintaxis antigua equivalente a un `INNER JOIN` lleva la condición en el `WHERE`.

```sql
-- Alumnos con matrículas (INNER JOIN)
SELECT a.*, m.id_programa
FROM alumno a
INNER JOIN matricula m ON a.id_alumno = m.id_alumno;

-- Opositores SIN ninguna solicitud: LEFT JOIN + IS NULL (o NOT EXISTS)
SELECT o.id_opositor, o.nombre
FROM opositor o
LEFT JOIN solicitud s ON s.id_opositor = o.id_opositor
WHERE s.id_solicitud IS NULL;
```

### Subconsultas, operaciones de conjuntos y consultas avanzadas

- **Subconsulta escalar** (devuelve un valor), **de fila** o **de tabla**; puede ir en el `WHERE`, en el `FROM` (tabla derivada) o en el `SELECT`.
- **Correlacionada**: hace referencia a la consulta exterior y se evalúa por cada fila.
- `NOT IN` con una subconsulta que devuelva algún **nulo** no devuelve ninguna fila: mejor `NOT EXISTS`.
- **Operaciones de conjuntos** (columnas compatibles): `UNION` (elimina duplicados), `UNION ALL` (los conserva), `INTERSECT` y `EXCEPT` (`MINUS` en Oracle).
- **Expresiones de tabla comunes** (`WITH`) y **consultas recursivas** (`WITH RECURSIVE`, SQL:1999; en Oracle también `CONNECT BY`).
- **Funciones de ventana** (SQL:2003): `ROW_NUMBER()`, `RANK()`, `DENSE_RANK()`, `LAG`, `LEAD` y agregados con `OVER (PARTITION BY … ORDER BY …)`, que calculan sobre un conjunto de filas **sin agruparlas**.

```sql
-- Subconsultas anidadas: ficheros no PDF de la solicitud de 2024 del interesado 00000000T
SELECT * FROM fichero_adjunto
WHERE denominacion NOT LIKE '%.pdf'
  AND id_solicitud_beca = (SELECT id_solicitud_beca FROM solicitud_beca
                           WHERE anio_convocatoria = 2024
                             AND id_interesado = (SELECT id_interesado FROM interesado
                                                  WHERE documento_identidad = '00000000T'));

-- Correlacionada: notas por encima de la media de su ejercicio
SELECT n.id_solicitud, n.ejercicio, n.nota
FROM nota n
WHERE n.nota > (SELECT AVG(n2.nota) FROM nota n2 WHERE n2.ejercicio = n.ejercicio);

-- Ranking de los 10 mejores por convocatoria (función de ventana)
SELECT *
FROM (SELECT s.id_conv, s.id_opositor, SUM(n.nota) AS total,
             ROW_NUMBER() OVER (PARTITION BY s.id_conv ORDER BY SUM(n.nota) DESC) AS puesto
      FROM solicitud s JOIN nota n ON n.id_solicitud = s.id_solicitud
      GROUP BY s.id_conv, s.id_opositor) t
WHERE t.puesto <= 10;
```

### Ejercicio resuelto tipo supuesto

Modelo: `OPOSITOR(id_opositor, dni, nombre, provincia)`, `CONVOCATORIA(id_conv, cuerpo, anio, plazas)`, `SOLICITUD(id_solicitud, id_opositor, id_conv, fecha, estado)` y `NOTA(id_solicitud, ejercicio, nota)`.

```sql
-- 1. Número de solicitudes por convocatoria de 2026, solo las que superan 500
SELECT c.cuerpo, COUNT(*) AS solicitudes
FROM convocatoria c JOIN solicitud s ON s.id_conv = c.id_conv
WHERE c.anio = 2026
GROUP BY c.cuerpo
HAVING COUNT(*) > 500
ORDER BY solicitudes DESC;

-- 2. Nota media de cada ejercicio, con un decimal
SELECT ejercicio, ROUND(AVG(nota), 1) AS media
FROM nota
GROUP BY ejercicio;

-- 3. Opositores de Madrid que no han realizado el ejercicio 2
SELECT o.dni, o.nombre
FROM opositor o
WHERE o.provincia = 'Madrid'
  AND NOT EXISTS (SELECT 1 FROM solicitud s JOIN nota n ON n.id_solicitud = s.id_solicitud
                  WHERE s.id_opositor = o.id_opositor AND n.ejercicio = 2);

-- 4. Aumentar un 10 % las plazas de las convocatorias TAI
UPDATE convocatoria SET plazas = plazas * 1.1 WHERE cuerpo = 'TAI';

-- 5. Dar permiso de consulta sobre las notas a un rol y retirarlo
GRANT SELECT ON nota TO rol_consulta;
REVOKE SELECT ON nota FROM rol_consulta;
```

## Transacciones y concurrencia

Una **transacción** es una unidad lógica de trabajo que debe cumplir las propiedades **ACID**: **atomicidad** (todo o nada), **consistencia** (de un estado válido a otro), **aislamiento** (las transacciones concurrentes no interfieren entre sí de forma que comprometan la consistencia) y **durabilidad** (lo confirmado sobrevive a fallos, gracias al *log*).

```sql
-- En el estándar la transacción empieza implícitamente; en SQL Server y PostgreSQL: BEGIN [TRANSACTION]
UPDATE cuenta SET saldo = saldo - 100 WHERE id = 1;
SAVEPOINT tras_cargo;                       -- punto de salvaguarda intermedio
UPDATE cuenta SET saldo = saldo + 100 WHERE id = 2;
ROLLBACK TO SAVEPOINT tras_cargo;           -- deshace solo hasta el punto (SQL Server: SAVE TRANSACTION / ROLLBACK TRANSACTION nombre)
COMMIT;                                     -- confirma; ROLLBACK deshace todo desde el inicio
```

**Anomalías de concurrencia** (no existen las «lecturas hundidas»):

| Anomalía | Qué ocurre |
|---|---|
| **Lectura sucia** (*dirty read*) | Se leen datos modificados por otra transacción **aún no confirmados** (que pueden deshacerse) |
| **Lectura no repetible** | Al releer la **misma fila** en la transacción, otra la ha **modificado o borrado** y confirmado |
| **Lectura fantasma** | Al repetir una **consulta de rango**, aparecen o desaparecen **filas nuevas** insertadas o borradas por otra |
| Actualización perdida | Dos transacciones actualizan el mismo dato y una sobrescribe a la otra |

**Niveles de aislamiento ANSI** (`SET TRANSACTION ISOLATION LEVEL …`):

| Nivel | Lectura sucia | Lectura no repetible | Lectura fantasma |
|---|---|---|---|
| `READ UNCOMMITTED` | Posible | Posible | Posible |
| `READ COMMITTED` | **Evita** | Posible | Posible |
| **`REPEATABLE READ`** | **Evita** | **Evita** | **Posible** |
| `SERIALIZABLE` | Evita | Evita | Evita |

Niveles por defecto: `READ COMMITTED` en Oracle (que solo ofrece `READ COMMITTED`, `SERIALIZABLE` y `READ ONLY`), SQL Server y PostgreSQL; `REPEATABLE READ` en MySQL con InnoDB. Mecanismos: **bloqueos** compartidos (lectura) y exclusivos (escritura), bloqueo en dos fases (2PL), detección de **interbloqueos** (*deadlocks*) y **control multiversión** (MVCC: los lectores ven una instantánea y no bloquean a los escritores; Oracle, PostgreSQL, InnoDB y el aislamiento de instantánea de SQL Server).

## DCL: usuarios, roles y permisos

```sql
CREATE USER educa_user IDENTIFIED BY "Clave-Segura-2026";        -- Oracle
CREATE ROLE rol_gestor;
GRANT SELECT, INSERT, UPDATE ON solicitud TO rol_gestor;
GRANT rol_gestor TO educa_user;
GRANT SELECT ON nota TO auditor WITH GRANT OPTION;   -- puede conceder a su vez el permiso
REVOKE UPDATE ON solicitud FROM rol_gestor;
DENY DELETE ON dbo.Solicitud TO Becario;            -- Transact-SQL: denegación explícita (DCL)
```

Buenas prácticas: **mínimo privilegio**, permisos a **roles** y no a usuarios, cuentas de aplicación sin privilegios de administración y ejecución de procedimientos en lugar de acceso directo a las tablas.

## Procedimientos almacenados

### Concepto, ventajas e inconvenientes

Un **procedimiento almacenado** es un programa con nombre que se **guarda (compilado) en el propio SGBD** y se ejecuta en el **servidor** al invocarlo. Junto con las **funciones almacenadas** y los **disparadores** forma la programación del lado de la base de datos.

| Ventajas | Inconvenientes |
|---|---|
| **Rendimiento**: menos tráfico de red (una llamada en lugar de muchas sentencias) y planes de ejecución reutilizados | **Portabilidad** baja: cada SGBD tiene su lenguaje (PL/SQL, T-SQL…) |
| **Seguridad**: se concede `EXECUTE` sin dar acceso a las tablas; con parámetros evitan la inyección SQL | Lógica de negocio repartida entre aplicación y base de datos |
| **Reutilización** y coherencia de las reglas de negocio para todas las aplicaciones | Depuración, pruebas y control de versiones más difíciles |
| Encapsulación del modelo de datos | Más carga en el servidor de base de datos, que escala peor |

**Procedimiento frente a función almacenada**: la **función** devuelve un valor y puede usarse dentro de un `SELECT`; el **procedimiento** se invoca con `CALL` o `EXEC` y devuelve resultados mediante parámetros `OUT`/`INOUT` o conjuntos de resultados. Los parámetros pueden ser **`IN`**, **`OUT`** e **`IN OUT`/`INOUT`**.

### El estándar SQL/PSM y los lenguajes de cada SGBD

| SGBD | Lenguaje | Características |
|---|---|---|
| Estándar | **SQL/PSM** (ISO/IEC 9075-4, desde 1996) | `CREATE PROCEDURE`/`FUNCTION`, bloques `BEGIN … END`, `DECLARE`, `IF`, `CASE`, `LOOP`, `WHILE`, `REPEAT`, `FOR`, cursores, manejadores (`DECLARE … HANDLER`), `SIGNAL`/`RESIGNAL`. Muy próximo: SQL PL de Db2 y el de MySQL/MariaDB |
| Oracle | **PL/SQL** | Lenguaje procedimental de Oracle que **permite insertar sentencias SQL** y **se almacena compilado** en la base de datos (supuesto de 2023). Bloques `DECLARE … BEGIN … EXCEPTION … END`; **paquetes** (especificación + cuerpo); también procedimientos en Java |
| SQL Server | **Transact-SQL** | `CREATE PROCEDURE`, parámetros `@p` y `OUTPUT`, `EXEC`, `TRY…CATCH`, `THROW`. Tipos de procedimientos: **definidos por el usuario, temporales** (`#` locales, `##` globales), **del sistema** (`sp_`) y **extendidos** (`xp_`, en desuso); también procedimientos CLR (.NET) |
| PostgreSQL | **PL/pgSQL** (y PL/Python, PL/Perl…) | Funciones con `CREATE FUNCTION … LANGUAGE plpgsql`; `CREATE PROCEDURE` y `CALL` con control de transacciones desde la versión 11 |
| MySQL / MariaDB | SQL/PSM | `CREATE PROCEDURE`; en el cliente se cambia el delimitador (`DELIMITER //`) para escribir el cuerpo |

```sql
-- Oracle PL/SQL
CREATE OR REPLACE PROCEDURE registrar_solicitud (
  p_id_opositor  IN  solicitud.id_opositor%TYPE,
  p_id_conv      IN  solicitud.id_conv%TYPE,
  p_id_solicitud OUT solicitud.id_solicitud%TYPE
) AS
BEGIN
  INSERT INTO solicitud (id_solicitud, id_opositor, id_conv, fecha, estado)
  VALUES (seq_solicitud.NEXTVAL, p_id_opositor, p_id_conv, SYSDATE, 'PRESENTADA')
  RETURNING id_solicitud INTO p_id_solicitud;
EXCEPTION
  WHEN DUP_VAL_ON_INDEX THEN
    RAISE_APPLICATION_ERROR(-20001, 'Ya existe una solicitud para esa convocatoria');
END registrar_solicitud;
/
```

```sql
-- SQL Server Transact-SQL
CREATE PROCEDURE dbo.MediaConvocatoria
  @IdConv INT,
  @Media  DECIMAL(4,2) OUTPUT
AS
BEGIN
  SET NOCOUNT ON;
  SELECT @Media = AVG(n.Nota)
  FROM dbo.Nota n
  JOIN dbo.Solicitud s ON s.IdSolicitud = n.IdSolicitud
  WHERE s.IdConv = @IdConv;
END;
GO
DECLARE @m DECIMAL(4,2);
EXEC dbo.MediaConvocatoria @IdConv = 7, @Media = @m OUTPUT;
```

```sql
-- MySQL: procedimiento con cursor y manejador (sintaxis SQL/PSM)
DELIMITER //
CREATE PROCEDURE total_aprobados (IN p_conv INT, OUT p_total INT)
BEGIN
  DECLARE fin INT DEFAULT 0;
  DECLARE v_nota DECIMAL(4,2);
  DECLARE cur CURSOR FOR
    SELECT n.nota FROM nota n JOIN solicitud s ON s.id_solicitud = n.id_solicitud
    WHERE s.id_conv = p_conv AND n.ejercicio = 1;
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET fin = 1;
  SET p_total = 0;
  OPEN cur;
  bucle: LOOP
    FETCH cur INTO v_nota;
    IF fin = 1 THEN LEAVE bucle; END IF;
    IF v_nota >= 5 THEN SET p_total = p_total + 1; END IF;
  END LOOP;
  CLOSE cur;
END//
DELIMITER ;
CALL total_aprobados(7, @t);
```

**Cursores**: permiten recorrer fila a fila el resultado de una consulta (`DECLARE`, `OPEN`, `FETCH`, `CLOSE`); PL/SQL tiene además cursores implícitos y bucles `FOR fila IN (SELECT …)`. Siempre que se pueda, es preferible una sentencia de conjunto a un cursor.

**Excepciones**: en PL/SQL hay excepciones predefinidas (`NO_DATA_FOUND`, `TOO_MANY_ROWS`, `ZERO_DIVIDE`, `DUP_VAL_ON_INDEX`) y errores de aplicación con `RAISE_APPLICATION_ERROR` (códigos −20000 a −20999); en Transact-SQL, `TRY…CATCH` y `THROW`; en SQL/PSM, `SIGNAL SQLSTATE '45000'`.

**Llamada desde una aplicación Java (JDBC)**:

```java
try (CallableStatement cs = con.prepareCall("{call registrar_solicitud(?, ?, ?)}")) {
    cs.setLong(1, idOpositor);
    cs.setInt(2, idConv);
    cs.registerOutParameter(3, java.sql.Types.BIGINT);
    cs.execute();
    long idSolicitud = cs.getLong(3);
}
```

## Eventos y disparadores

### Eventos: tareas programadas en el SGBD

En el sentido de MySQL/MariaDB, un **evento** es una **tarea que el SGBD ejecuta automáticamente en un momento programado** (una vez o periódicamente), como un *cron* interno. Lo ejecuta el **planificador de eventos** (*Event Scheduler*, variable `event_scheduler`).

```sql
CREATE EVENT IF NOT EXISTS ev_purga_sesiones
  ON SCHEDULE EVERY 1 DAY
  STARTS '2026-10-12 03:00:00'
  ON COMPLETION PRESERVE
  DO DELETE FROM sesiones WHERE caducidad < NOW();

CREATE EVENT ev_cierre_plazo                       -- evento de una sola vez
  ON SCHEDULE AT '2026-11-01 00:00:00'
  DO UPDATE convocatoria SET estado = 'CERRADA' WHERE id_conv = 7;
```

- Se crean con **`CREATE EVENT nombre`**; la temporalidad va en **`ON SCHEDULE`** (`AT` para una vez, `EVERY` con `STARTS`/`ENDS` para repetir).
- Por defecto (**`ON COMPLETION NOT PRESERVE`**) un evento puntual **se elimina automáticamente** al ejecutarse; con `ON COMPLETION PRESERVE` se conserva. Por eso es **falso** que «haya que eliminarlo manualmente» (pregunta de 2024).
- Se modifican con `ALTER EVENT` (por ejemplo, `DISABLE`) y se borran con `DROP EVENT`.
- Equivalentes: **`DBMS_SCHEDULER`** en Oracle (sustituye a `DBMS_JOB`), los trabajos del **Agente SQL Server** y la extensión `pg_cron` en PostgreSQL.

```sql
BEGIN                                               -- Oracle: trabajo programado
  DBMS_SCHEDULER.CREATE_JOB(
    job_name        => 'JOB_PURGA_SESIONES',
    job_type        => 'PLSQL_BLOCK',
    job_action      => 'BEGIN purgar_sesiones; END;',
    start_date      => SYSTIMESTAMP,
    repeat_interval => 'FREQ=DAILY;BYHOUR=3',
    enabled         => TRUE);
END;
/
```

En sentido amplio, «evento» es también **lo que activa un disparador**: una sentencia DML (`INSERT`, `UPDATE`, `DELETE`), una sentencia DDL (`CREATE`, `ALTER`, `DROP`) o un evento del sistema (inicio de sesión, arranque o parada de la instancia, error del servidor). PostgreSQL llama ***event triggers*** a los disparadores de DDL.

### Disparadores (triggers)

Un **disparador** es un procedimiento asociado a una tabla (o vista, esquema o base de datos) que el SGBD **ejecuta automáticamente cada vez que ocurre un evento determinado** sobre ella. Siguen el modelo **ECA**: **E**vento (qué lo activa), **C**ondición (cuándo actúa, cláusula `WHEN`) y **A**cción (qué hace). Se incorporaron al estándar en **SQL:1999**.

**Sintaxis del estándar** (las preguntas de 2021 y 2025 pedían reconocer el comienzo correcto):

```sql
CREATE TRIGGER validar_salario
  BEFORE UPDATE OF salario ON empleados          -- momento, evento (y columnas) y tabla
  REFERENCING OLD ROW AS antes NEW ROW AS despues
  FOR EACH ROW                                    -- de fila (o FOR EACH STATEMENT)
  WHEN (despues.salario < antes.salario)          -- condición
  BEGIN ATOMIC
    SIGNAL SQLSTATE '75001';                       -- acción: rechaza la bajada de salario
  END;
```

Esquema: `CREATE TRIGGER nombre {BEFORE | AFTER | INSTEAD OF} {INSERT | DELETE | UPDATE [OF columnas]} ON tabla [REFERENCING …] [FOR EACH {ROW | STATEMENT}] [WHEN (condición)] acción`. Formas **incorrectas** típicas: `CREATE NEW TRIGGER`, `… OF TABLE Empleados`, `… IN Empleados BEFORE …`.

| Clasificación | Tipos |
|---|---|
| Por el **momento** | **`BEFORE`** (antes: validar o ajustar los valores nuevos), **`AFTER`** (después: auditoría, propagación), **`INSTEAD OF`** (en lugar de: típico para hacer actualizables las **vistas**; estándar desde SQL:2008) |
| Por la **granularidad** | **De fila** (`FOR EACH ROW`: una vez por fila afectada; accede a los valores antiguos y nuevos) y **de sentencia** (`FOR EACH STATEMENT`: una vez por sentencia; opción por defecto del estándar) |
| Por el **evento** | DML (`INSERT`, `UPDATE`, `DELETE`), **DDL** (`CREATE`, `ALTER`, `DROP`) y de **sistema o base de datos** (`LOGON`, `LOGOFF`, `STARTUP`, `SHUTDOWN`, `SERVERERROR` en Oracle) |

**Diferencias entre productos**:

| | Oracle | SQL Server | MySQL / MariaDB | PostgreSQL |
|---|---|---|---|---|
| Momentos | `BEFORE`, `AFTER`, `INSTEAD OF` (vistas), disparadores compuestos | **Solo `AFTER` (o `FOR`) e `INSTEAD OF`: no hay `BEFORE`** | `BEFORE` y `AFTER` | `BEFORE`, `AFTER`, `INSTEAD OF` |
| Granularidad | Fila y sentencia | Solo **de sentencia** (las filas afectadas están en las pseudotablas) | **Solo de fila** (`FOR EACH ROW`) | Fila y sentencia |
| Valores antiguos y nuevos | `:OLD` y `:NEW` | Pseudotablas **`deleted`** e **`inserted`** | `OLD` y `NEW` | `OLD` y `NEW` |
| Tipos | DML, DDL, de sistema (base de datos) | **DML, DDL y LOGON** (pregunta de 2026) | DML | DML y *event triggers* (DDL) |

```sql
-- Oracle: auditoría de cambios de estado
CREATE OR REPLACE TRIGGER trg_auditoria_estado
AFTER UPDATE OF estado ON solicitud
FOR EACH ROW
WHEN (OLD.estado <> NEW.estado)
BEGIN
  INSERT INTO auditoria_solicitud (id_solicitud, estado_anterior, estado_nuevo, usuario, fecha)
  VALUES (:OLD.id_solicitud, :OLD.estado, :NEW.estado, USER, SYSTIMESTAMP);
END;
/
```

```sql
-- SQL Server: AFTER UPDATE con las pseudotablas inserted y deleted
CREATE TRIGGER trg_solicitud_estado ON dbo.Solicitud
AFTER UPDATE
AS
BEGIN
  SET NOCOUNT ON;
  IF UPDATE(Estado)
    INSERT INTO dbo.AuditoriaSolicitud (IdSolicitud, EstadoAnterior, EstadoNuevo, Usuario, Fecha)
    SELECT d.IdSolicitud, d.Estado, i.Estado, SUSER_SNAME(), SYSDATETIME()
    FROM deleted d JOIN inserted i ON i.IdSolicitud = d.IdSolicitud
    WHERE d.Estado <> i.Estado;
END;
```

```sql
-- MySQL: validación antes de insertar
DELIMITER //
CREATE TRIGGER trg_nota_valida
BEFORE INSERT ON nota
FOR EACH ROW
BEGIN
  IF NEW.nota < 0 OR NEW.nota > 10 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Nota fuera de rango';
  END IF;
END//
DELIMITER ;
```

**Usos**: reglas de negocio complejas que no caben en un `CHECK`, **auditoría** e historificación, columnas derivadas o redundantes (desnormalización controlada), replicación, integridad entre bases de datos y vistas actualizables (`INSTEAD OF`).

**Comportamiento y riesgos**:

- Un **error** en un disparador **cancela la sentencia que lo activó** (se deshacen sus cambios); no hace falta programarlo (afirmación falsa en 2024).
- Los disparadores **no se invocan explícitamente** ni reciben parámetros; se ejecutan dentro de la transacción de la sentencia que los activa y, en general, no pueden hacer `COMMIT` (salvo transacciones autónomas en Oracle).
- **Cascadas** y recursividad (un disparador provoca otro); en Oracle, error de **tabla mutante** (ORA-04091) al consultar en un disparador de fila la tabla que se está modificando.
- Lógica «oculta» difícil de mantener y coste de rendimiento en cargas masivas. Un `DROP TABLE` **elimina** los disparadores asociados: un `DROP` no puede «ser ejecutado por disparadores» de DML.

## Normativa y estándares clave

| Estándar | Qué regula | Puntos clave |
|---|---|---|
| **ISO/IEC 9075:2023** (SQL:2023) | Lenguaje SQL | Partes 1 *Framework*, 2 *Foundation*, 3 CLI, 4 **PSM**, 9 MED, 11 *Schemata*, 14 XML, 16 **PGQ**; tipo `JSON` |
| ISO/IEC 9075-4 (SQL/PSM) | Procedimientos, funciones y disparadores almacenados | Bloques, variables, control de flujo, cursores, manejadores, `SIGNAL` |
| ISO/IEC 9075-3 (SQL/CLI) | Interfaz de llamada | Base de **ODBC** |
| **ISO/IEC 39075:2024** (GQL) | Consulta de grafos de propiedades | Publicado en abril de 2024 |
| JDBC 4.3 (JSR 221) y ADO.NET | Acceso a bases de datos desde Java y .NET | `PreparedStatement`, `CallableStatement`; `SqlCommand` con `CommandType.StoredProcedure` |
| W3C XQuery 3.1 y SPARQL 1.1 | Consulta de XML y de RDF | — |
| ODMG 3.0 | Bases de datos de objetos | OQL |
| OWASP *SQL Injection Prevention Cheat Sheet* | Seguridad | Consultas parametrizadas, procedimientos seguros, validación de entradas, mínimo privilegio |

## Lo que más cae en el examen

Es el tema con más preguntas del bloque III: **53** en los nueve exámenes analizados según nuestra clasificación (33 de ingreso libre: 6 en 2021, 5 en 2023, 8 en 2024, 7 en 2025 y 7 en el extraordinario; y 20 de promoción interna), repartidas entre el cuestionario y los supuestos.

| Concepto | Preguntas | Exámenes |
|---|---|---|
| Sentencias DDL y DML concretas: `CREATE TABLE` (también con `AUTO_INCREMENT`), `INSERT`, `UPDATE` (`* 1.1`), restricción `UNIQUE`, `CREATE SEQUENCE … START WITH … INCREMENT BY`, `CREATE USER … IDENTIFIED BY`, `DROP TABLE`, `DBCC CHECKIDENT` | 15 | Todos los años, sobre todo en los supuestos |
| **Consultas `SELECT`**: `GROUP BY` + `HAVING`, `INNER JOIN` frente a producto cartesiano, `LIKE`, `CASE`, subconsultas anidadas, `ORDER BY`, `TOP`, vista con `COUNT` | 11 | LI 2021, 2024, 2025 y 2025‑ext; PI 2021, 2023 y 2025 |
| **Clasificación de sentencias** (DDL, DML, DCL, TCL), `SELECT` como DML, `GRANT`/`DENY` como DCL, `DELETE` frente a `DROP`, CRUD | 9 | LI 2023, 2024 y 2025; PI 2021, 2023, 2024 y 2025 |
| **Transacciones**: `SAVEPOINT`, `ROLLBACK`, anomalías («lecturas hundidas» no existe), niveles de aislamiento (`REPEATABLE READ`), aislamiento ACID | 8 | LI 2021, 2023, 2024, 2025 y 2025‑ext; PI 2023 y 2025 |
| **Disparadores**: sintaxis `CREATE TRIGGER … BEFORE UPDATE [OF col] ON tabla`, efecto de un error, tipos en SQL Server (DML, DDL y LOGON) | 5 | LI 2021, 2024, 2025 y 2025‑ext; PI 2025 |
| **Procedimientos almacenados**: PL/SQL, tipos en SQL Server | 3 | LI 2023 y 2025‑ext; PI 2023 |
| **Eventos** (`CREATE EVENT`, `ON SCHEDULE`, borrado automático) y funciones de Oracle (`INSTR`) | 2 | PI 2024; LI 2025‑ext |

Patrón: en los supuestos, cuatro sentencias casi iguales en las que solo una es sintácticamente correcta (agregado en el `WHERE`, `GROUP BY` sin la columna, falta el `FROM` en una subconsulta, `LIKE` sin `%`, palabra clave inventada como `RECOVERPOINT`, `RETURNBACK`, `REGISTER USER`, `BEGIN WITH`). Conviene dominar la sintaxis exacta de Oracle y SQL Server, que son los SGBD de los enunciados.

## Trampas habituales

- **Agregados en el `WHERE`**: no se puede; las condiciones sobre `COUNT`, `SUM`… van en **`HAVING`**, que se escribe **después** del `GROUP BY`.
- **`DELETE`** borra filas (DML) y **no** elimina tablas, bases de datos ni índices; eso es **`DROP`** (DDL), que borra estructura y datos y no admite `WHERE`.
- **`TRUNCATE`** no es DML (se trata como DDL); **`SELECT` sí es DML**; **`GRANT`, `REVOKE` y `DENY`** son DCL; **`COMMIT`, `ROLLBACK` y `SAVEPOINT`**, TCL. DML significa *Data **Manipulation** Language*, no «Manager».
- **`SAVEPOINT`** marca un punto de salvaguarda; **`ROLLBACK`** deshace (todo o hasta un `SAVEPOINT`). No existen `RECOVERPOINT` ni `RETURNBACK`.
- **`REPEATABLE READ`** evita lecturas sucias y no repetibles pero **no** las fantasma; `READ COMMITTED` solo evita las sucias; `SERIALIZABLE` las evita todas.
- **`COUNT(columna)`** ignora los nulos; `COUNT(*)` no.
- **`LIKE '3%'`** = empieza por 3; `LIKE 'pdf'` sin comodines equivale a `= 'pdf'`.
- **`FROM a, b` sin condición** es un **producto cartesiano**.
- **«Los 10 últimos»**: `ORDER BY fecha DESC` (con `ASC` saldrían los 10 primeros); `TOP` va justo después de `SELECT`.
- **Unicidad**: `UNIQUE` (restricción) impide duplicados; un `CREATE INDEX` normal no; `CREATE INDEX` ni siquiera es del estándar.
- **Secuencias en Oracle**: `START WITH 1 INCREMENT BY 1`; **usuarios**: `CREATE USER … IDENTIFIED BY …`.
- **Disparadores**: `CREATE TRIGGER nombre BEFORE UPDATE OF columna ON tabla`; SQL Server **no tiene `BEFORE`** y sus tipos son DML, DDL y LOGON; MySQL solo tiene disparadores **de fila**; un error en el disparador **aborta** la sentencia.
- **Eventos** de MySQL: `CREATE EVENT … ON SCHEDULE …`; uno puntual **se borra solo** salvo `ON COMPLETION PRESERVE`.
- **PL/SQL** es de Oracle; **Transact-SQL**, de SQL Server; **PL/pgSQL**, de PostgreSQL. Tipos de procedimientos en SQL Server: definidos por el usuario, temporales, del sistema y extendidos.
- **`NOT IN`** con nulos en la subconsulta no devuelve filas; usar `NOT EXISTS`.

## Repaso rápido

- SQL: SEQUEL (IBM, 1974), ANSI 1986, ISO 1987; vigente **SQL:2023** (ISO/IEC 9075).
- DDL: `CREATE`, `ALTER`, `DROP`, `TRUNCATE`. DML: `SELECT`, `INSERT`, `UPDATE`, `DELETE`, `MERGE`. DCL: `GRANT`, `REVOKE` (`DENY`). TCL: `COMMIT`, `ROLLBACK`, `SAVEPOINT`.
- Orden lógico: FROM → WHERE → GROUP BY → HAVING → SELECT → DISTINCT → ORDER BY.
- `HAVING` filtra grupos; `WHERE` filtra filas.
- Comodines de `LIKE`: `%` (0 o más caracteres) y `_` (uno).
- `INNER JOIN` coincidencias; `LEFT JOIN` + `IS NULL` = filas sin correspondencia; `CROSS JOIN` = cartesiano.
- `UNION` quita duplicados; `UNION ALL` no; `EXCEPT` = `MINUS` en Oracle.
- Limitar filas: `FETCH FIRST n ROWS ONLY` (estándar), `TOP` (SQL Server), `LIMIT` (MySQL, PostgreSQL).
- ACID: atomicidad, consistencia, aislamiento y durabilidad.
- Anomalías: lectura sucia, no repetible, fantasma (y actualización perdida).
- Aislamiento: READ UNCOMMITTED < READ COMMITTED < REPEATABLE READ < SERIALIZABLE.
- Procedimiento almacenado: compilado en el servidor; parámetros IN, OUT, INOUT; `CALL`/`EXEC`.
- SQL/PSM = ISO/IEC 9075-4; PL/SQL (Oracle), T-SQL (SQL Server), PL/pgSQL (PostgreSQL).
- Evento (MySQL): tarea programada con `CREATE EVENT … ON SCHEDULE AT | EVERY`.
- Disparador: evento-condición-acción; BEFORE, AFTER, INSTEAD OF; de fila o de sentencia; OLD/NEW (`inserted`/`deleted` en SQL Server).
- `INSTEAD OF` se usa sobre vistas; los disparadores llegaron al estándar en SQL:1999.
- Contra la inyección SQL: consultas parametrizadas (`PreparedStatement`) y mínimo privilegio.

## Fuentes

- ISO/IEC 9075-1:2023, *SQL/Framework*: https://www.iso.org/standard/76583.html
- ISO/IEC 39075:2024, *GQL*: https://www.iso.org/standard/76120.html
- Oracle, *Database SQL Language Reference* (`CREATE SEQUENCE`, `INSTR`, `CREATE USER`): https://docs.oracle.com/en/database/oracle/oracle-database/23/sqlrf/
- Oracle, *PL/SQL Language Reference* (disparadores y procedimientos): https://docs.oracle.com/en/database/oracle/oracle-database/23/lnpls/
- Microsoft Learn, procedimientos almacenados en SQL Server (tipos): https://learn.microsoft.com/es-es/sql/relational-databases/stored-procedures/stored-procedures-database-engine
- Microsoft Learn, `CREATE TRIGGER` (Transact-SQL): https://learn.microsoft.com/es-es/sql/t-sql/statements/create-trigger-transact-sql
- Microsoft Learn, niveles de aislamiento (`SET TRANSACTION ISOLATION LEVEL`): https://learn.microsoft.com/es-es/sql/t-sql/statements/set-transaction-isolation-level-transact-sql
- MySQL 8.4 Reference Manual, `CREATE EVENT`: https://dev.mysql.com/doc/refman/8.4/en/create-event.html
- MySQL 8.4 Reference Manual, `CREATE TRIGGER`: https://dev.mysql.com/doc/refman/8.4/en/create-trigger.html
- PostgreSQL, documentación de `CREATE TRIGGER` y PL/pgSQL: https://www.postgresql.org/docs/current/sql-createtrigger.html
- OWASP, *SQL Injection Prevention Cheat Sheet*: https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html
