# III.1 · Modelado de datos, diseño de bases de datos y normalización

Este tema abre el bloque de Desarrollo de sistemas y es la base de buena parte del supuesto práctico del bloque III: casi todos los supuestos presentan un **modelo de datos** (tablas, claves primarias y foráneas, cardinalidades) sobre el que luego se pregunta SQL (tema III.3). El programa pide cinco cosas: el **modelado de datos** con sus metodologías y reglas; los **elementos del modelo entidad-relación** (entidades, atributos y relaciones); el **diseño de bases de datos** en sus fases **conceptual, lógica y física**; el **modelo lógico relacional**; y la **normalización**. El tribunal pregunta casi siempre con la terminología de **Métrica v3** (la metodología de la Administración española), así que las definiciones de este tema siguen esa metodología y se completan con la teoría relacional clásica (Codd, Chen, Fagin).

## Modelado de datos: metodologías y reglas

### Qué es un modelo de datos

Un **modelo de datos** es un conjunto de conceptos y reglas para describir la estructura de una base de datos. Siguiendo a Codd, todo modelo de datos tiene tres componentes:

| Componente | Qué define | Ejemplo en el modelo relacional |
|---|---|---|
| **Estructuras** (parte estática) | Cómo se organizan los datos | Relaciones (tablas), atributos, dominios |
| **Operaciones** (parte dinámica) | Cómo se consultan y modifican | Álgebra y cálculo relacional, SQL |
| **Reglas de integridad** (restricciones) | Qué estados de los datos son válidos | Clave primaria, integridad referencial, `CHECK` |

Se distingue entre **esquema** (la descripción, estable: también llamada *intensión*) y **ocurrencia** o **instancia** (los datos en un momento dado: *extensión*).

### Niveles de abstracción: tipos de modelos

| Nivel | Para qué sirve | Modelos típicos | ¿Depende del SGBD? |
|---|---|---|---|
| **Conceptual** | Representar la realidad con independencia de cualquier tecnología; comunicarse con el usuario | Entidad-relación (E-R) y E-R extendido, diagrama de clases UML | No |
| **Lógico** | Representar los datos según el **tipo** de SGBD que se usará | Jerárquico (IMS), en red (CODASYL), **relacional**, orientado a objetos, objeto-relacional, modelos NoSQL | Del tipo de SGBD, no del producto |
| **Físico** | Describir cómo se almacenan realmente los datos | Tablas, índices, particiones, ficheros, tablespaces de un SGBD concreto | Sí, del producto concreto |

### La arquitectura ANSI/SPARC de tres niveles

El comité ANSI/X3/SPARC propuso (informes de 1975 y 1977-1978) separar la descripción de una base de datos en **tres niveles de esquema**:

- **Nivel externo**: las **vistas** de cada usuario o aplicación; cada uno ve solo la parte que le interesa.
- **Nivel conceptual**: la descripción **global y lógica** de toda la base de datos (entidades, atributos, relaciones, restricciones), sin detalles de almacenamiento.
- **Nivel interno** (o **físico**): cómo se almacenan los datos: estructuras de ficheros, índices, métodos de acceso.

Entre niveles hay **correspondencias** (*mappings*) que proporcionan las dos independencias:

- **Independencia lógica**: se puede cambiar el esquema conceptual sin modificar los esquemas externos ni los programas (correspondencia externo/conceptual).
- **Independencia física**: se puede cambiar el esquema interno (índices, ficheros) sin modificar el conceptual (correspondencia conceptual/interno).

> En 2023 se anuló una pregunta sobre ANSI/SPARC porque tenía **dos** afirmaciones falsas: un «nivel contextual» que no existe y la idea de que el nivel interno «también se llama lógico» (se llama **físico**; el lógico es el conceptual).

### Metodologías de modelado de datos

| Metodología o notación | Origen | Técnicas de datos |
|---|---|---|
| **Métrica v3** | Administración española (Ministerio de Administraciones Públicas; promovida por el Consejo Superior de Informática) | Modelo Entidad/Relación extendido, normalización, optimización, reglas de obtención del modelo físico, reglas de transformación de clases a tablas |
| **SSADM** | Administración británica | *Logical Data Structure* y normalización (TNF) |
| **Merise** | Francia | MCD (conceptual), MLD (lógico) y MPD (físico) |
| **Information Engineering** | James Martin y Clive Finkelstein | Notación de **pata de gallo** (*crow's foot*) |
| **IDEF1X** | Fuerza Aérea de EE. UU.; FIPS PUB 184 (1993) e IEEE 1320.2 | Entidades independientes y dependientes, relaciones identificadoras |
| **UML** | OMG (ISO/IEC 19505) | Diagrama de clases usado como modelo de datos (multiplicidades `0..1`, `1`, `0..*`, `1..*`) |

En **Métrica v3** el modelo de datos se construye en dos procesos:

| Proceso | Actividad y tareas | Producto | Técnica |
|---|---|---|---|
| ASI (Análisis del Sistema de Información) | **ASI 6** Elaboración del modelo de datos: 6.1 modelo **conceptual**; 6.2 modelo **lógico**; 6.3 **normalización** del modelo lógico; 6.4 necesidades de **migración** y carga inicial | Modelo lógico de datos **normalizado** (al menos en **3FN**) | Modelo E/R extendido; normalización |
| DSI (Diseño del Sistema de Información) | **DSI 6** Diseño físico de datos: 6.1 diseño del modelo **físico**; 6.2 especificación de los **caminos de acceso**; 6.3 **optimización** del modelo físico; 6.4 especificación de la **distribución** de datos | Modelo físico de datos optimizado | Reglas de obtención del modelo físico a partir del lógico; reglas de transformación (desde el modelo de clases); optimización |

Métrica indica que el modelo de datos se elabora con **enfoque descendente** (*top-down*). Las **estrategias de diseño** que recoge la literatura son:

- **Descendente** (*top-down*): se parte de conceptos muy generales y se refinan (una entidad se divide en varias, aparecen subtipos…).
- **Ascendente** (*bottom-up*): se parte de los atributos elementales y se agrupan en entidades y relaciones.
- **Dentro-fuera** (*inside-out*): se parte de los conceptos más importantes y se avanza hacia los que se relacionan con ellos.
- **Mixta**: combinación de las anteriores, habitual en sistemas grandes; obliga a **integrar vistas** resolviendo conflictos de nombres (sinónimos y homónimos), estructurales (un concepto modelado como atributo en una vista y como entidad en otra) y de dominios.

### Reglas en el modelado de datos

En este tema «reglas» tiene varios sentidos, y todos se preguntan:

- **Reglas de negocio** (o **restricciones semánticas**): condiciones que impone la realidad («un opositor no puede presentar dos solicitudes a la misma convocatoria», «la nota está entre 0 y 10»). Métrica permite describirlas en lenguaje natural o con expresiones lógicas en la tarea ASI 6.1.
- **Reglas de integridad** del modelo relacional: integridad de entidad e integridad referencial (ver más abajo).
- **Reglas de transformación**: cómo pasar del modelo E-R al relacional y del relacional al físico.
- **Reglas de Codd**: los criterios que debe cumplir un SGBD para considerarse relacional (ver «El modelo lógico relacional»).

### Modelado de procesos relacionado: el DFD de Métrica v3

El modelado de datos se complementa con el de procesos. El **diagrama de flujo de datos (DFD)** de Métrica obtiene un **modelo lógico de procesos** independiente del entorno físico. Ha caído dos veces (2021):

| Elemento | Definición en Métrica v3 |
|---|---|
| **Entidad externa** | Ente ajeno al sistema que proporciona o recibe información (personas, departamentos, otros sistemas). Puede repetirse en el diagrama |
| **Proceso** | Funcionalidad que el sistema lleva a cabo para **transformar o manipular datos**; nunca es origen ni final de los datos y siempre es intermediario entre entidad externa y almacén |
| **Almacén de datos** | Información **en reposo**; no crea ni transforma datos y no puede comunicarse directamente con otro almacén ni con una entidad externa |
| **Flujo de datos** | Movimiento de datos entre procesos y almacenes o entidades externas; entre dos procesos solo si la información es síncrona. Con almacenes puede ser de **consulta**, de **actualización** o de **diálogo** |
| **Proceso de control** | Coordina y sincroniza las actividades de otros procesos |
| **Flujo de control** | Une un proceso de control con otro proceso; no lleva datos, sino **eventos** que activan procesos |

La descomposición es *top-down*: **diagrama de contexto (nivel 0)** con un único proceso, **diagrama 0 (nivel 1)** con los subsistemas, y niveles sucesivos hasta los **procesos primitivos**, manteniendo la consistencia de entradas y salidas entre niveles.

## Entidades, atributos y relaciones: el modelo entidad-relación

El **modelo entidad-relación** lo propuso **Peter Chen en 1976** (*ACM Transactions on Database Systems*). El modelo **E-R extendido** (EER) añade generalización, especialización, agregación y otras abstracciones. Métrica v3 lo define así: técnica para representar todos los datos que se introducen, almacenan, transforman y producen en un sistema **sin tener en cuenta la tecnología ni otras restricciones**.

### Entidad

- **Entidad**: «objeto, real o abstracto, acerca del cual se desea almacenar información en la base de datos» (Métrica). El conjunto de entidades con las mismas características es el **tipo de entidad**; cada elemento concreto, una **ocurrencia**.
- Reglas de Métrica para que algo sea entidad: **existencia propia**, cada ocurrencia **distinguible** de las demás y **todas las ocurrencias con los mismos atributos**.
- **Entidad regular** (fuerte): existe por sí misma. **Entidad débil**: su existencia depende de otra (por ejemplo, LÍNEA_DE_FACTURA respecto de FACTURA).

### Atributos y dominios

- **Atributo**: propiedad o característica de un tipo de entidad (o de una relación); es la unidad básica de información. **Todo atributo se define sobre un dominio** (y solo uno).
- **Dominio**: «conjunto nominado de valores homogéneos» que **tiene existencia propia** con independencia de entidades, relaciones o atributos (por ejemplo, el dominio CÓDIGOS_POSTALES lo comparten varios atributos).
- **Identificador principal** (clave): conjunto mínimo de atributos que identifica unívocamente cada ocurrencia. Si hay varios, los demás son **identificadores alternativos**.

| Tipo de atributo | Significado | Notación de Chen extendida |
|---|---|---|
| Simple / compuesto | Indivisible / formado por otros (DIRECCIÓN = calle + número + CP) | Elipse / elipse unida a sus componentes |
| Monovaluado (univaluado) / **multivaluado** | Un valor / varios valores por ocurrencia (TELÉFONOS) | Elipse / **doble elipse** |
| Almacenado / **derivado** | Se guarda / se calcula a partir de otros (EDAD a partir de FECHA_NACIMIENTO) | Elipse / **elipse discontinua** |
| Obligatorio / opcional | Debe tener valor / puede no tenerlo | Según notación (cardinalidad del atributo) |
| **Identificador** | Forma parte de la clave | Nombre **subrayado** (o círculo relleno) |
| Discriminante | Decide a qué subtipo pertenece una ocurrencia en una jerarquía | Asociado al triángulo de la jerarquía |

Métrica define además el atributo **univaluado** (solo un valor por ocurrencia) y el **obligatorio** (al menos un valor por ocurrencia), y pide **eliminar o marcar como redundantes** los atributos derivados.

### Relaciones (interrelaciones)

**Relación**: «asociación o correspondencia existente entre una o varias entidades» (Métrica). Se caracteriza por:

- **Nombre**, que la distingue de las demás.
- **Grado**: número de tipos de entidad que participan: **unaria o reflexiva** (EMPLEADO *dirige a* EMPLEADO), **binaria** (la más frecuente), **ternaria** o **n-aria**.
- **Tipo de correspondencia**: número **máximo** de ocurrencias de cada tipo de entidad que pueden intervenir en una ocurrencia de la relación: **1:1**, **1:N** o **M:N**.
- **Cardinalidad**: participación de cada entidad, con su **mínimo y máximo**: (0,1), (1,1), (0,n), (1,n). La cardinalidad **máxima coincide con el tipo de correspondencia**. Con mínimo 0 la participación es **opcional**; con mínimo 1, **obligatoria** (participación total).
- **Atributos propios** de la relación (FECHA_ASIGNACIÓN en *Trabaja en*), típicos de las M:N.

Tipos especiales según Métrica:

- **Relación débil**: asocia una entidad débil con una regular. Puede ser **dependencia en existencia** (la ocurrencia débil no puede existir sin la regular) o **dependencia en identificación** (además, para identificarla hay que añadir el identificador de la regular; por ejemplo, LÍNEA se identifica por *número de factura + número de línea*).
- **Relación exclusiva**: la existencia de una relación entre dos tipos de entidad implica que no existan las otras (se dibuja con un **arco** sobre las líneas).

> Atención a la convención: unas notaciones colocan la cardinalidad de una entidad en **su propio extremo** y otras en el **extremo opuesto** («mirar a través»). Métrica coloca la etiqueta «en el extremo de la entidad que corresponda» y advierte de que su notación no es obligatoria. En el examen, razona con el enunciado: «un registro de A puede tener N registros de B» es una **1:N de A a B**.

### Extensiones del modelo (E-R extendido)

| Mecanismo | Definición (Métrica v3) | Ejemplo |
|---|---|---|
| **Generalización** | Abstraer un tipo de entidad de **nivel superior (supertipo)** a partir de varios tipos (**subtipos**); los atributos y relaciones comunes pasan al supertipo | PROFESOR y ESTUDIANTE → PERSONA |
| **Especialización** | Operación **inversa**: un supertipo se descompone en subtipos, que **heredan** todos sus atributos y relaciones y añaden los suyos | EMPLEADO → SECRETARIA, TÉCNICO, INGENIERO |
| **Categoría** | Subtipo resultado de la **unión** de varios tipos (varios supertipos y un solo subtipo) | PERSONA y COMPAÑÍA → PROPIETARIO |
| **Agregación** | Construir un nuevo tipo de entidad como **composición de otros y de su relación** para manejarlo a un nivel de abstracción mayor (no se permiten relaciones entre relaciones) | EMPRESA–*entrevista*–SOLICITANTE tratado como entidad para relacionarlo con OFERTA |
| **Asociación** | Relacionar dos tipos de entidad que normalmente son de **dominios independientes** pero **coyunturalmente se asocian** | — |

Las jerarquías se dibujan con un **triángulo invertido** («Es_un»): **d** si los subtipos son **disjuntos**, **O** (o un círculo) si pueden **solaparse** y **U** para las categorías; una **doble línea** entre el supertipo y el triángulo indica jerarquía **total** (toda ocurrencia del supertipo pertenece a algún subtipo).

### Notaciones gráficas

| Elemento | Chen / Métrica | Pata de gallo (*crow's foot*) | UML |
|---|---|---|---|
| Entidad | Rectángulo (débil: doble rectángulo) | Rectángulo con la lista de atributos | Clase |
| Relación | Rombo (identificadora: doble rombo) | Línea entre entidades | Asociación |
| Cardinalidad | Etiquetas 1:N o (mín,máx) | Símbolos en cada extremo: dos rayas (uno y solo uno), círculo y raya (cero o uno), raya y pata de gallo (uno o muchos), círculo y pata de gallo (cero o muchos) | Multiplicidades `1`, `0..1`, `1..*`, `0..*` |
| Atributo | Elipse unida a la entidad | Dentro del rectángulo | Dentro de la clase |

### Ejemplo de modelado conceptual

Requisitos: un organismo gestiona **convocatorias**; cada **opositor** (identificado por su DNI, con uno o varios teléfonos) presenta **solicitudes**, cada una a una convocatoria; cada convocatoria tiene varios **ejercicios** numerados (1.º, 2.º…) y los opositores obtienen una nota en cada ejercicio que realizan.

```text
OPOSITOR (dni, nombre, {telefono})          {…} = atributo multivaluado
CONVOCATORIA (cod_conv, anio, plazas)
EJERCICIO (num_ejercicio, fecha)            entidad DÉBIL de CONVOCATORIA
                                            (dependencia en identificación)

OPOSITOR (0,n) ──< presenta >── (1,1) SOLICITUD (1,1) ──< corresponde a >── (0,n) CONVOCATORIA
CONVOCATORIA (1,1) ══< consta de >══ (1,n) EJERCICIO          (relación identificadora)
OPOSITOR (0,n) ──< realiza [nota] >── (0,n) EJERCICIO          (M:N con atributo propio)
```

## Diseño de bases de datos

### Fases del diseño

| Fase | Entrada | Resultado | Independencia |
|---|---|---|---|
| Análisis de requisitos | Entrevistas, documentos, sesiones de trabajo | Requisitos de datos y de procesos | — |
| **Diseño conceptual** | Requisitos | **Esquema conceptual** (E-R o clases) | Independiente del SGBD y del tipo de modelo |
| **Diseño lógico** | Esquema conceptual + tipo de SGBD | **Esquema lógico** (tablas, claves, restricciones) **normalizado** | Depende del tipo de SGBD (relacional), no del producto |
| **Diseño físico** | Esquema lógico + SGBD concreto + volúmenes y accesos | **Esquema físico**: tipos de datos, índices, particiones, almacenamiento, seguridad | Depende del producto (Oracle, PostgreSQL, SQL Server…) |
| Implementación y ajuste | Esquema físico | Base de datos creada, cargada (migración) y ajustada (*tuning*) | — |

El **diseño lógico** traduce el esquema conceptual al modelo del SGBD (en la práctica, al **relacional**) y lo **normaliza**; el **diseño físico** decide cómo se implementa ese esquema para que sea eficiente.

## Diseño lógico: del modelo E-R al modelo relacional

Métrica llama a este paso «reglas de obtención del modelo físico a partir del lógico», pero en la teoría general se estudia como **transformación del esquema conceptual al relacional**:

| Elemento del E-R | Transformación |
|---|---|
| Entidad | Una **tabla** |
| Atributo simple | Una **columna**; el identificador principal pasa a ser **clave primaria** |
| Atributo compuesto | Se descompone en sus componentes (o se guarda entero si nunca se consulta por partes) |
| Atributo multivaluado | **Nueva tabla** con la clave de la entidad + el atributo (clave primaria compuesta) |
| Atributo derivado | No se almacena (se calcula en consultas o vistas) o se guarda como redundancia controlada |
| Relación **1:N** | Se **propaga la clave** de la entidad del lado **1** a la del lado **N**, donde es **clave ajena** (si es de dependencia en identificación, forma parte de la clave primaria de la débil) |
| Relación **1:1** | Caso particular de 1:N: se propaga la clave en una dirección (o en las dos), eligiendo la que evite nulos; si ambas participaciones son obligatorias puede fusionarse en una tabla |
| Relación **M:N** | **Nueva tabla** cuya clave primaria es la combinación de las claves de ambas entidades (cada una, clave ajena) más los atributos propios de la relación |
| Relación n-aria | Nueva tabla con las claves de todas las entidades participantes |
| Relación reflexiva | Clave ajena que referencia a la misma tabla (1:N) o tabla intermedia (M:N) |
| Agregación | Igual que una 1:N |
| Relación exclusiva | Claves ajenas en la tabla común con la restricción de que **una y solo una** sea no nula |

**Jerarquías** (opciones de Métrica, con su equivalente en los ORM como JPA/Hibernate):

| Opción | Diseño | Cuándo conviene | JPA |
|---|---|---|---|
| a | Tabla para el **supertipo** y una tabla por **subtipo** con la clave del supertipo como clave ajena | Subtipos con muchos atributos distintos; **mejor conserva la semántica** | `JOINED` |
| b | Solo tablas de **subtipos**, cada una con los atributos comunes repetidos | Accesos frecuentes a todos los atributos de un subtipo | `TABLE_PER_CLASS` |
| c | **Una sola tabla** con todos los atributos y un **atributo discriminante** | Subtipos con pocos atributos distintos y mismas relaciones (si la jerarquía es total, el discriminante no admite nulos) | `SINGLE_TABLE` |

Esquema relacional del ejemplo anterior (clave primaria en negrita, claves ajenas en cursiva):

| Tabla | Columnas |
|---|---|
| OPOSITOR | **dni**, nombre |
| TELEFONO_OPOSITOR | ***dni***, **telefono** |
| CONVOCATORIA | **cod_conv**, anio, plazas |
| SOLICITUD | **id_solicitud**, *dni*, *cod_conv*, fecha_presentacion |
| EJERCICIO | ***cod_conv***, **num_ejercicio**, fecha |
| NOTA | ***dni***, ***cod_conv***, ***num_ejercicio***, nota |

![Diagrama entidad-relación en notación pata de gallo con las seis tablas del ejemplo: OPOSITOR, TELEFONO_OPOSITOR, CONVOCATORIA, SOLICITUD, EJERCICIO y NOTA, con sus claves primarias y ajenas; las relaciones identificadoras (teléfono, ejercicio y nota) van en línea continua y las no identificadoras (solicitud) en discontinua](diagramas/III.1-er-opositores.svg)

*Figura: el esquema del ejemplo de opositores en notación pata de gallo, con claves primarias (PK) y ajenas (FK).*

## El modelo lógico relacional

### Origen y estructura

El modelo relacional lo propuso **Edgar F. Codd (IBM) en 1970** en el artículo *A Relational Model of Data for Large Shared Data Banks* (*Communications of the ACM*). Se basa en la teoría de conjuntos y la lógica de predicados: los datos se representan como **relaciones** (tablas) y se manipulan con operaciones sobre conjuntos.

| Término formal | Término SQL | Término de ficheros | Definición |
|---|---|---|---|
| Relación | Tabla | Fichero | Conjunto de tuplas con los mismos atributos |
| Tupla | Fila | Registro | Un elemento de la relación |
| Atributo | Columna | Campo | Propiedad con nombre definida sobre un dominio |
| Dominio | Tipo de datos (+ restricciones) | — | Conjunto de valores válidos de un atributo |
| **Grado** | Número de columnas | — | Número de **atributos** de la relación |
| **Cardinalidad** | Número de filas | — | Número de **tuplas** en un momento dado |

> Pregunta de 2025: una tabla con 4 columnas y 7 filas tiene **grado 4 y cardinalidad 7**. No confundir con el *grado de una relación E-R* (número de entidades que participan) ni con la *cardinalidad E-R* (mínimos y máximos).

**Propiedades de una relación** (diferencias con una simple tabla): no hay **tuplas repetidas** (es un conjunto); las tuplas y los atributos **no tienen orden**; cada valor es **atómico** (lo que exige la 1FN); cada atributo tiene un nombre distinto dentro de la relación.

### Claves

| Concepto | Definición |
|---|---|
| **Superclave** | Conjunto de atributos que identifica unívocamente cada tupla (puede tener atributos sobrantes) |
| **Clave candidata** | Superclave **mínima** (irreducible): si se quita cualquier atributo, deja de identificar |
| **Clave primaria** | La clave candidata **elegida** para identificar las tuplas |
| **Clave alternativa** | Cada una de las candidatas no elegidas (en SQL, `UNIQUE` + `NOT NULL`) |
| **Clave ajena o foránea** | Atributo o conjunto de atributos de una relación cuyos valores deben coincidir con los de la **clave primaria (o candidata) de otra relación** —o de la misma, en las reflexivas— o ser nulos |
| Clave natural / **subrogada** | Natural: con significado (DNI, ISBN). Subrogada o artificial: generada por el sistema sin significado (autonumérico, secuencia, UUID) |
| Atributo principal / no principal | Principal (*prime*): forma parte de alguna clave candidata. No principal: no forma parte de ninguna |

### Restricciones e integridad

- **Inherentes** al modelo: no hay tuplas duplicadas; los valores son atómicos; el orden no importa.
- **Integridad de entidad** (regla de Codd): **ningún atributo de la clave primaria puede ser nulo** (ni la clave entera ni ninguno de sus componentes).
- **Integridad referencial**: todo valor **no nulo** de una clave ajena debe **existir** en la clave referenciada.
- **De dominio**: cada valor pertenece al dominio de su atributo (`CHECK`, tipos de datos).
- **Semánticas o de usuario**: `NOT NULL`, `UNIQUE`, `CHECK`, aserciones (`CREATE ASSERTION`, del estándar pero apenas implementada) y disparadores (tema III.3).

**Acciones referenciales** (qué ocurre al borrar o modificar la fila referenciada):

| Acción | Efecto |
|---|---|
| `NO ACTION` (por defecto en el estándar) / `RESTRICT` | Se rechaza la operación si hay filas que referencian; `RESTRICT` lo impide de inmediato, mientras que `NO ACTION` comprueba al final de la sentencia y permite diferir la comprobación al final de la transacción si la restricción es diferible |
| `CASCADE` | Se borran o actualizan en cascada las filas que referencian |
| `SET NULL` | La clave ajena se pone a nulo |
| `SET DEFAULT` | La clave ajena toma su valor por defecto |

```sql
CREATE TABLE convocatoria (
  cod_conv  VARCHAR(10)  PRIMARY KEY,
  anio      SMALLINT     NOT NULL CHECK (anio >= 2000),
  plazas    INTEGER      NOT NULL CHECK (plazas > 0)
);

CREATE TABLE solicitud (
  id_solicitud        BIGINT       PRIMARY KEY,
  dni                 CHAR(9)      NOT NULL REFERENCES opositor (dni),
  cod_conv            VARCHAR(10)  NOT NULL,
  fecha_presentacion  DATE         NOT NULL,
  CONSTRAINT fk_solicitud_conv FOREIGN KEY (cod_conv)
      REFERENCES convocatoria (cod_conv)
      ON DELETE RESTRICT ON UPDATE CASCADE,  -- Oracle no admite ON UPDATE
  CONSTRAINT uq_una_por_conv UNIQUE (dni, cod_conv)   -- regla de negocio
);
```

**Valores nulos.** `NULL` representa un valor desconocido o no aplicable; no es cero ni cadena vacía. Las comparaciones con `NULL` dan **desconocido** (lógica **trivaluada**: verdadero, falso, desconocido), por eso se usa `IS NULL` y no `= NULL`.

### Operaciones: álgebra y cálculo relacional

| Operador | Símbolo | Tipo | Equivalente SQL |
|---|---|---|---|
| Selección (restricción) | σ | Primitivo, unario | `WHERE` |
| Proyección | π | Primitivo, unario | Lista del `SELECT` (con `DISTINCT`) |
| Unión | ∪ | Primitivo, binario (relaciones compatibles) | `UNION` |
| Diferencia | − | Primitivo, binario | `EXCEPT` (`MINUS` en Oracle) |
| Producto cartesiano | × | Primitivo, binario | `CROSS JOIN` |
| Renombrado | ρ | Primitivo | `AS` |
| Intersección | ∩ | Derivado | `INTERSECT` |
| Combinación (*join*: theta, equi, natural) | ⋈ | Derivado (producto + selección) | `JOIN … ON`, `NATURAL JOIN` |
| División | ÷ | Derivado | Doble `NOT EXISTS` («los que cumplen para todos») |

El **álgebra** es procedimental (indica cómo obtener el resultado); el **cálculo relacional** (de **tuplas** y de **dominios**) es declarativo (indica qué se quiere). Ambos tienen la misma potencia expresiva (**completitud relacional**) y SQL se basa en los dos.

### Las reglas de Codd

En 1985 Codd publicó **12 reglas** (más la **regla 0**) para decidir si un SGBD es realmente relacional. Han caído en 2021 en los dos turnos, con distractores que **invierten** el sentido de una regla.

| N.º | Regla | Idea clave |
|---|---|---|
| 0 | Fundamento | El sistema gestiona la base de datos **solo** con sus capacidades relacionales |
| 1 | Información | Toda la información se representa como **valores en tablas** |
| 2 | Acceso garantizado | Todo dato es accesible con **tabla + clave primaria + columna** |
| 3 | Tratamiento sistemático de **valores nulos** | Representación del valor desconocido o no aplicable distinta de cualquier valor normal |
| 4 | **Catálogo dinámico en línea** basado en el modelo relacional | El diccionario de datos son tablas consultables con el mismo lenguaje |
| 5 | Sublenguaje de datos completo | Un lenguaje para definición, manipulación, vistas, integridad, autorización y transacciones |
| 6 | Actualización de vistas | Las vistas teóricamente actualizables deben poder actualizarse |
| 7 | Inserción, actualización y borrado **de alto nivel** | Operaciones sobre **conjuntos** de filas, no fila a fila |
| 8 | **Independencia física** | Cambiar el almacenamiento no afecta a las aplicaciones |
| 9 | **Independencia lógica** | Cambiar las tablas (sin perder información) no afecta a las aplicaciones |
| 10 | Independencia de la **integridad** | Las restricciones se definen en el catálogo, no en los programas |
| 11 | Independencia de la **distribución** | Que los datos estén distribuidos no afecta a los usuarios |
| 12 | **No subversión** | Un acceso de bajo nivel no puede saltarse las reglas de integridad o seguridad |

## Normalización

### Objetivo: evitar redundancia y anomalías

La normalización (Codd, 1970-1971) busca, según Métrica, **eliminar dependencias entre atributos que originen anomalías en la actualización** y dar una estructura más regular a las tablas. Una tabla mal diseñada repite información y provoca:

- **Anomalía de inserción**: no se puede registrar un dato sin otro (no puedo dar de alta una editorial sin un libro).
- **Anomalía de modificación**: un cambio obliga a actualizar muchas filas y se generan inconsistencias si se olvida alguna.
- **Anomalía de borrado**: al borrar una fila se pierde información que no se quería borrar.

### Dependencias

| Concepto | Definición |
|---|---|
| **Dependencia funcional** X → Y | Y depende funcionalmente de X «si, y solo si, a cada valor de X le corresponde un único valor de Y» (Métrica). X es el **implicante o determinante**; Y, el **implicado** |
| Dependencia trivial | Y ⊆ X (siempre se cumple) |
| **Dependencia funcional completa** | Y depende de **todo** X y no de una parte de él (si X es compuesto) |
| Dependencia parcial | Y depende de una **parte** de una clave compuesta |
| **Dependencia transitiva** | Z depende de X a través de Y: X → Y, Y no→ X, Y → Z |
| Dependencia **multivaluada** X →→ Y | A cada valor de X le corresponde un **conjunto** de valores de Y independiente del resto de atributos |
| Dependencia de **combinación** (*join*) | La relación puede reconstruirse exactamente combinando varias proyecciones suyas |

**Axiomas de Armstrong** (1974), para deducir dependencias: **reflexividad** (si Y ⊆ X, entonces X → Y), **aumentatividad** (si X → Y, entonces XZ → YZ) y **transitividad** (si X → Y e Y → Z, entonces X → Z); de ellos se derivan la **unión**, la **descomposición** y la **pseudotransitividad**. Con ellos se calcula el **cierre** de un conjunto de atributos (X⁺) para averiguar si es superclave.

### Las formas normales

Cada forma normal exige la anterior: una tabla en 3FN está también en 2FN y en 1FN.

| Forma normal | Condición | Elimina | Autor |
|---|---|---|---|
| **1FN** | No hay **grupos repetitivos**: cada atributo toma un **único valor de un dominio simple** (atómico) | Atributos multivaluados y grupos repetidos | Codd (1970) |
| **2FN** | 1FN y todo atributo **no principal** tiene **dependencia funcional completa** de las claves candidatas | Dependencias **parciales** | Codd (1971) |
| **3FN** | 2FN y ningún atributo no principal depende **transitivamente** de las claves (todos dependen **directamente** de la clave) | Dependencias **transitivas** | Codd (1971) |
| **FNBC** (Boyce-Codd) | Todo **determinante** de una dependencia no trivial es **clave candidata** (superclave) | Dependencias cuyo determinante no es clave, aunque afecten a atributos principales | Boyce y Codd (1974) |
| **4FN** | FNBC y no hay **dependencias multivaluadas** no triviales salvo de una superclave | Dependencias multivaluadas independientes | Fagin (1977) |
| **5FN** (de proyección-combinación) | Toda dependencia de **combinación** está implicada por las claves candidatas | Dependencias de combinación | Fagin (1979) |
| FNDC (dominio-clave) | Toda restricción es consecuencia de restricciones de **dominio** y de **clave** | Cualquier anomalía | Fagin (1981) |
| 6FN | Sin dependencias de combinación no triviales (tablas irreducibles); útil en datos temporales | — | Date, Darwen y Lorentzos (2003) |

Regla nemotécnica de las tres primeras: cada atributo no clave depende «**de la clave** (1FN), **de toda la clave** (2FN) **y nada más que de la clave** (3FN)».

Consecuencias útiles:

- Una tabla en 1FN cuya clave primaria es **simple** (un solo atributo) y sin otras candidatas compuestas está **automáticamente en 2FN**.
- Una tabla en 3FN con **una sola clave candidata** está también en **FNBC**; la diferencia aparece solo con varias claves candidatas compuestas y solapadas.
- Métrica v3 exige normalizar **al menos hasta 3FN** (tarea ASI 6.3).

### Descomposición: sin pérdida y conservando dependencias

Normalizar es **descomponer** una relación en proyecciones. Una buena descomposición debe ser:

- **Sin pérdida de información** (*lossless join*): la combinación natural de las proyecciones devuelve exactamente la relación original, sin tuplas espurias. Teorema de Heath: si en R(A, B, C) se cumple A → B, la descomposición en (A, B) y (A, C) es sin pérdida.
- **Conservando las dependencias**: cada dependencia funcional puede comprobarse dentro de alguna de las tablas resultantes.

Siempre es posible llegar a **3FN** con ambas propiedades; la **FNBC** garantiza la primera pero **no siempre la segunda**.

### Ejercicio resuelto: normalización hasta FNBC

Una biblioteca guarda sus préstamos en una única tabla:

| num_socio | nombre_socio | telefonos | cod_libro | titulo | cod_editorial | nombre_editorial | fecha_prestamo | fecha_devolucion |
|---|---|---|---|---|---|---|---|---|
| 7 | Emilia Pardo | 916666666; 917777777 | L1 | Redes | E1 | Ed. Norte | 2026-03-02 | 2026-03-16 |
| 7 | Emilia Pardo | 916666666; 917777777 | L2 | SQL | E2 | Ed. Sur | 2026-03-02 | 2026-03-20 |
| 9 | Luis Gil | 600111222 | L1 | Redes | E1 | Ed. Norte | 2026-04-01 | — |

Dependencias funcionales (semántica del enunciado): `num_socio → nombre_socio`; `cod_libro → titulo, cod_editorial`; `cod_editorial → nombre_editorial`; `(num_socio, cod_libro, fecha_prestamo) → fecha_devolucion`; y un socio tiene **varios** teléfonos.

**Paso 0. ¿En qué forma normal está?** En **ninguna**: `telefonos` guarda varios valores en un mismo campo (grupo repetitivo). Es exactamente lo que preguntó el supuesto de 2021, con un registro cuyo campo `Telefonos` contenía dos números separados por punto y coma.

**Paso 1. 1FN.** Se saca el atributo multivaluado a una tabla propia con la clave de la entidad:

- `TELEFONO_SOCIO(num_socio, telefono)`; clave: (num_socio, telefono).
- `PRESTAMO(num_socio, cod_libro, fecha_prestamo, nombre_socio, titulo, cod_editorial, nombre_editorial, fecha_devolucion)`; clave: (num_socio, cod_libro, fecha_prestamo).

**Paso 2. 2FN.** La clave de PRESTAMO es compuesta y hay **dependencias parciales**: `nombre_socio` depende solo de `num_socio`, y `titulo`, `cod_editorial` y `nombre_editorial` solo de `cod_libro`. Se crean tablas con la parte de la clave de la que dependen:

- `SOCIO(num_socio, nombre_socio)`
- `LIBRO(cod_libro, titulo, cod_editorial, nombre_editorial)`
- `PRESTAMO(num_socio, cod_libro, fecha_prestamo, fecha_devolucion)`

**Paso 3. 3FN.** En LIBRO hay una **dependencia transitiva**: `cod_libro → cod_editorial → nombre_editorial`. Se extrae, y `cod_editorial` queda como clave ajena:

- `EDITORIAL(cod_editorial, nombre_editorial)`
- `LIBRO(cod_libro, titulo, cod_editorial)`

**Paso 4. FNBC.** En cada tabla, todos los determinantes son claves candidatas: el esquema está en **FNBC** (y, sin dependencias multivaluadas independientes, en 4FN).

![Normalización paso a paso de la tabla de préstamos: sin forma normal por el campo telefonos multivaluado; en 1FN se separa TELEFONO_SOCIO y quedan dependencias parciales de nombre_socio, titulo, cod_editorial y nombre_editorial; en 2FN salen SOCIO y LIBRO y queda la dependencia transitiva de nombre_editorial; en 3FN sale EDITORIAL y el esquema queda en FNBC](diagramas/III.1-normalizacion.svg)

*Figura: del préstamo sin normalizar a la 3FN (y FNBC): qué dependencia impide cada forma normal y qué tabla sale en cada paso.*

```sql
CREATE TABLE socio     (num_socio INTEGER PRIMARY KEY, nombre_socio VARCHAR(100) NOT NULL);
CREATE TABLE editorial (cod_editorial CHAR(3) PRIMARY KEY, nombre_editorial VARCHAR(100) NOT NULL);
CREATE TABLE libro (
  cod_libro     CHAR(5)      PRIMARY KEY,
  titulo        VARCHAR(200) NOT NULL,
  cod_editorial CHAR(3)      NOT NULL REFERENCES editorial (cod_editorial)
);
CREATE TABLE telefono_socio (
  num_socio INTEGER     NOT NULL REFERENCES socio (num_socio) ON DELETE CASCADE,
  telefono  VARCHAR(15) NOT NULL,
  PRIMARY KEY (num_socio, telefono)
);
CREATE TABLE prestamo (
  num_socio        INTEGER NOT NULL REFERENCES socio (num_socio),
  cod_libro        CHAR(5) NOT NULL REFERENCES libro (cod_libro),
  fecha_prestamo   DATE    NOT NULL,
  fecha_devolucion DATE,
  PRIMARY KEY (num_socio, cod_libro, fecha_prestamo),
  CHECK (fecha_devolucion IS NULL OR fecha_devolucion >= fecha_prestamo)
);
```

**Un caso en 3FN que no está en FNBC.** `IMPARTE(alumno, asignatura, profesor)` con las reglas «cada profesor imparte una sola asignatura» (`profesor → asignatura`) y «un alumno tiene un único profesor por asignatura» (`alumno, asignatura → profesor`). Claves candidatas: (alumno, asignatura) y (alumno, profesor). Todos los atributos son principales, así que está en **3FN**, pero `profesor` es un determinante que no es clave: **no está en FNBC**. Descomponer en `PROFESOR(profesor, asignatura)` y `TUTELA(alumno, profesor)` elimina la redundancia, pero la dependencia `alumno, asignatura → profesor` ya no se puede comprobar en una sola tabla (se pierde una dependencia).

**Un caso de 4FN.** `EMPLEADO_HABILIDAD_IDIOMA(empleado, habilidad, idioma)`, donde las habilidades y los idiomas de un empleado son independientes (`empleado →→ habilidad` y `empleado →→ idioma`): hay que combinar todas las habilidades con todos los idiomas. Se descompone en `(empleado, habilidad)` y `(empleado, idioma)`.

### Desnormalización

**Desnormalizar** es reintroducir redundancia de forma **controlada** en el diseño físico para **mejorar el rendimiento** (menos combinaciones y accesos), a costa de espacio y de tener que mantener la coherencia (con disparadores, procesos o columnas calculadas). Es típica de los almacenes de datos y de las consultas críticas. Métrica la llama **optimización** (ver el diseño físico).

## Diseño físico

### Decisiones del diseño físico

- **SGBD y tipos de datos** concretos: `CHAR` frente a `VARCHAR`, `NUMERIC(p,s)` para importes (nunca `FLOAT`), `DATE`/`TIMESTAMP`, objetos grandes (`BLOB`/`CLOB`).
- **Índices**: árbol **B+** (el habitual), *hash* (solo igualdad), **bitmap** (columnas con pocos valores distintos, típico de almacenes de datos), índice **agrupado** (*clustered*: ordena físicamente la tabla; uno por tabla), no agrupado o secundario, compuesto (importa el orden de las columnas), único, de función y parcial o filtrado. Aceleran las lecturas y **penalizan las escrituras**.
- **Particionamiento**: horizontal (por **rango**, **lista** o **hash**) o vertical; en bases de datos distribuidas, **fragmentación** y **replicación**.
- **Almacenamiento**: *tablespaces* (Oracle) o grupos de ficheros (SQL Server), tamaño de bloque, agrupamientos (*clusters*), compresión.
- **Vistas materializadas** y columnas calculadas para consultas costosas.
- **Seguridad física y lógica**: usuarios, roles y privilegios, cifrado (TDE), auditoría.
- **Estimación de volúmenes** y crecimiento, y plan de migración y carga inicial.

### Diseño físico en Métrica v3 (DSI 6)

- **DSI 6.1**: se aplican las **reglas de obtención del modelo físico a partir del lógico** (cada entidad, una tabla; cada atributo, una columna; el identificador, clave primaria; 1:N propagando la clave; M:N con tabla propia; jerarquías con las opciones a, b o c), o las **reglas de transformación** si se parte del modelo de clases.
- **DSI 6.2**: se especifican los **caminos de acceso** de los módulos críticos (tratamiento crítico, concurrencia, accesos complejos), estimando número, frecuencia y prioridad de los accesos.
- **DSI 6.3: optimización**, que Métrica define como «una **desnormalización controlada** del modelo físico de datos que se aplica para **reducir o simplificar el número de accesos** a la base de datos». Recomendaciones literales de la técnica:
  - **Introducir elementos redundantes.**
  - **Dividir entidades.**
  - **Combinar entidades si los accesos son frecuentes dentro de la misma transacción.**
  - **Redefinir o añadir relaciones** para hacer más directo el acceso.
  - **Definir claves secundarias o índices** para caminos de acceso alternativos.

  Factores a considerar: tiempos de respuesta, tasa de actualizaciones frente a recuperaciones, accesos conjuntos a atributos, longitud de los atributos, tipo de aplicación (en línea o por lotes), frecuencia, tipo y prioridad de los accesos, tamaño de las tablas y requisitos de seguridad.
- **DSI 6.4**: **distribución** de los datos entre nodos (técnicas matriciales).

```sql
-- Índice para la consulta frecuente "préstamos de un libro"
CREATE INDEX idx_prestamo_libro ON prestamo (cod_libro);

-- Particionado por rango de fechas (sintaxis de PostgreSQL)
CREATE TABLE prestamo_hist (
  num_socio        INTEGER NOT NULL,
  cod_libro        CHAR(5) NOT NULL,
  fecha_prestamo   DATE    NOT NULL,
  fecha_devolucion DATE,
  PRIMARY KEY (num_socio, cod_libro, fecha_prestamo)
) PARTITION BY RANGE (fecha_prestamo);

CREATE TABLE prestamo_2026 PARTITION OF prestamo_hist
  FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

-- Desnormalización controlada: total de préstamos guardado en SOCIO
ALTER TABLE socio ADD COLUMN total_prestamos INTEGER DEFAULT 0 NOT NULL;
```

### Modelado dimensional (almacenes de datos)

Los sistemas analíticos (OLAP) no se normalizan como los transaccionales (OLTP). **Ralph Kimball** propone el **modelado dimensional** en cuatro pasos: elegir el **proceso de negocio**, declarar el **grano** (qué representa una fila de hechos), identificar las **dimensiones** e identificar los **hechos**. **Bill Inmon** defiende, en cambio, un almacén corporativo normalizado (3FN) del que se alimentan los *data marts*.

| Concepto | Significado |
|---|---|
| **Tabla de hechos** | Medidas numéricas del proceso (importe, nota, número de solicitudes) y claves ajenas a las dimensiones; hechos aditivos, semiaditivos y no aditivos |
| **Tabla de dimensión** | Contexto descriptivo (fecha, sede, convocatoria), muy desnormalizada |
| **Esquema en estrella** | Una tabla de hechos rodeada de dimensiones desnormalizadas |
| **Copo de nieve** (*snowflake*) | Dimensiones normalizadas en varias tablas |
| **Dimensión *outrigger*** | **Tabla de dimensión enlazada desde otra tabla de dimensión** (referencia secundaria); Kimball la admite pero recomienda usarla con moderación (pregunta de 2025) |
| Dimensiones lentamente cambiantes (SCD) | Tipo 1: sobrescribir; tipo 2: nueva fila con versión (conserva el historial); tipo 3: nueva columna con el valor anterior (Kimball define tipos 0 a 7) |
| Dimensión conformada | Compartida por varias tablas de hechos (arquitectura en bus) |

```text
                 DIM_FECHA
                     |
DIM_SEDE ——— HECHOS_EXAMEN (nota, presentados) ——— DIM_CONVOCATORIA
                     |                                     |
               DIM_OPOSITOR                         DIM_CUERPO  ← outrigger
```

## Normativa y estándares clave

| Estándar o norma | Qué regula | Puntos clave |
|---|---|---|
| Métrica v3 (Ministerio de Administraciones Públicas) | Metodología de desarrollo de la AGE | ASI 6 (modelo conceptual, lógico, normalización hasta 3FN, migración) y DSI 6 (modelo físico, caminos de acceso, optimización, distribución); técnicas «Modelo Entidad/Relación extendido», «Normalización» y «Optimización» |
| Informes ANSI/X3/SPARC (1975-1978) | Arquitectura de SGBD | Niveles externo, conceptual e interno; independencia lógica y física |
| Codd (1970) y reglas de Codd (1985) | Modelo relacional | Relación, dominio, claves, integridad de entidad y referencial; 12 reglas + regla 0 |
| Chen (1976) | Modelo entidad-relación | Entidades, relaciones (rombos), atributos |
| ISO/IEC 9075 (SQL), edición vigente **SQL:2023** | Lenguaje de definición y manipulación | `PRIMARY KEY`, `FOREIGN KEY`, acciones referenciales, `CHECK`, `CREATE ASSERTION` |
| IDEF1X (FIPS PUB 184, 1993; IEEE 1320.2-1998) | Notación de modelado de datos | Entidades independientes y dependientes, relaciones identificadoras |
| UML (OMG; ISO/IEC 19505) | Modelado orientado a objetos | Diagrama de clases como modelo de datos; multiplicidades |
| NTI de Relación de modelos de datos (Resolución de 28-6-2012, BOE-A-2012-10050) | Esquema Nacional de Interoperabilidad (RD 4/2010) | Publicación de modelos de datos de intercambio en el **Centro de Interoperabilidad Semántica** |
| RGPD, art. 25 | Protección de datos desde el diseño y por defecto | El modelo de datos debe aplicar **minimización**: solo los datos necesarios |

## Lo que más cae en el examen

En los nueve exámenes oficiales disponibles (ingreso libre 2021, 2023, 2024, 2025 y extraordinario de 2025, y promoción interna 2021, 2023, 2024 y 2025) hay unas **34 preguntas** de este tema según nuestra clasificación por contenidos: 19 de ingreso libre (5 en 2021, 2 en 2023, 6 en 2024, 3 en 2025 y 3 en el extraordinario) y 15 de promoción interna (muchas repetidas del examen de ingreso libre del mismo día). Aparecen en el cuestionario y en el supuesto del bloque III.

| Concepto | Preguntas | Exámenes |
|---|---|---|
| Definiciones del **Modelo E/R extendido de Métrica v3**: entidad, cardinalidad, tipo de correspondencia, asociación, agregación, atributo | 8 | LI 2023, 2024 y 2025‑ext; PI 2023 y 2024 |
| **Normalización**: dependencia funcional, 2FN y 3FN según Métrica, tabla «en ninguna forma normal» por un campo multivaluado, motivo para desnormalizar | 7 | LI 2021 y 2024; PI 2021 y 2024 |
| **Claves e integridad**: clave foránea, integridad de entidad, integridad referencial, dominio | 5 | LI 2024 y 2025‑ext; PI 2021 y 2025 |
| **Grado y cardinalidad** de una tabla y notación del **atributo derivado** (elipse discontinua) | 4 | LI 2025; PI 2025 |
| **Reglas de Codd** (cuál no lo es) | 2 | LI 2021; PI 2021 |
| **DFD de Métrica v3** (proceso, proceso de control) | 2 | LI 2021; PI 2021 |
| **Optimización** del modelo físico en Métrica (introducir elementos redundantes) | 2 | Supuestos LI y PI 2024 |
| Tipo de correspondencia **1:N** leída en el modelo del supuesto | 2 | Supuestos LI y PI 2024 |
| Arquitectura **ANSI/SPARC** (anulada) y dimensión ***outrigger*** de Kimball | 2 | LI 2023 y 2025 |

Patrón: preguntas de **definición literal de Métrica v3**, donde los distractores cambian una palabra («nivel inferior» por «superior», «mismo dominio» por «dominios independientes», «transacciones distintas» por «misma transacción»). En el supuesto práctico se pide leer el modelo (claves, cardinalidades) y razonar sobre normalización o diseño físico.

## Trampas habituales

- **Generalización y especialización al revés**: la generalización obtiene el **supertipo** (nivel superior) a partir de los **subtipos**; en la especialización los **subtipos heredan** del supertipo. Los distractores del examen extraordinario (julio de 2026) los invertían.
- **Asociación**: relaciona entidades de **dominios independientes** que **coyunturalmente** se asocian (no «del mismo dominio» ni «que no se asocian»).
- **Tipo de correspondencia** = número **máximo** de ocurrencias (1:1, 1:N, M:N); **cardinalidad** = participación con **mínimo y máximo**; la máxima coincide con el tipo de correspondencia.
- **Dominio**: tiene **existencia propia**, independiente de entidades, relaciones y atributos; un atributo se define sobre **un** dominio (no «sobre diversos»).
- **Clave candidata** frente a superclave: la candidata es **mínima**; la superclave puede tener atributos sobrantes.
- **Grado** de una tabla = columnas; **cardinalidad** = filas. El grado de una relación E-R es el número de entidades que participan.
- **2FN** habla de dependencia **completa** respecto de **las claves candidatas** (atributos no principales); **3FN**, de que no haya dependencias **transitivas**. FNBC: **todo determinante es clave candidata**.
- Un campo con **varios valores** (teléfonos separados por punto y coma) significa que la tabla **no está ni en 1FN**.
- **Optimización de Métrica**: «combinar entidades si los accesos son frecuentes **dentro de la misma transacción**» (no en transacciones distintas); normalizar a FNBC **no** reduce accesos.
- **Reglas de Codd**: independencia **de** la distribución (no «dependencia»); inserción, actualización y borrado **de alto nivel** (no «de bajo nivel»); la **no subversión** sí es regla.
- **ANSI/SPARC**: externo, **conceptual** e interno (físico); no existe nivel «contextual». La independencia **lógica** separa externo y conceptual; la **física**, conceptual e interno.
- **DFD**: el **almacén** es información **en reposo** (no «en movimiento»); el flujo de control une un **proceso de control** con otro proceso; el flujo de datos comunica procesos con almacenes o entidades externas (dos almacenes nunca se comunican directamente).
- **Integridad referencial**: la clave ajena puede ser **nula** (salvo `NOT NULL`); si no lo es, su valor debe existir en la tabla referenciada.
- **Atributo derivado** = elipse **discontinua**; **multivaluado** = elipse **doble**; entidad débil = **doble rectángulo**.
- ***Outrigger***: dimensión enlazada desde **otra dimensión**, no desde la tabla de hechos.

## Repaso rápido

- Modelo de datos = estructuras + operaciones + reglas de integridad.
- Diseño conceptual (E-R, independiente del SGBD) → lógico (relacional, normalizado) → físico (SGBD concreto: índices, particiones).
- ANSI/SPARC: externo, conceptual e interno; independencia lógica y física.
- Métrica v3: ASI 6 (conceptual, lógico, normalización ≥ 3FN, migración) y DSI 6 (físico, caminos de acceso, optimización, distribución).
- Entidad: objeto real o abstracto del que se quiere guardar información; regular o débil.
- Dependencia en existencia frente a dependencia en identificación (la débil necesita la clave de la regular).
- Tipo de correspondencia: 1:1, 1:N, M:N. Cardinalidad: (0,1), (1,1), (0,n), (1,n).
- E-R extendido: generalización, especialización, categoría (unión), agregación y asociación.
- M:N → tabla intermedia; 1:N → clave ajena en el lado N; multivaluado → tabla propia.
- Jerarquías: tabla por supertipo y subtipos (JOINED), solo subtipos (TABLE_PER_CLASS) o tabla única con discriminante (SINGLE_TABLE).
- Modelo relacional: Codd, 1970. Relación = tabla; tupla = fila; atributo = columna; grado = columnas; cardinalidad = filas.
- Integridad de entidad: la clave primaria nunca es nula. Integridad referencial: toda clave ajena no nula existe en la referenciada.
- Acciones referenciales: NO ACTION, RESTRICT, CASCADE, SET NULL, SET DEFAULT.
- Reglas de Codd: 0 a 12; independencia física (8), lógica (9), de integridad (10), de distribución (11) y no subversión (12).
- 1FN: valores atómicos; 2FN: sin dependencias parciales; 3FN: sin transitivas; FNBC: todo determinante es clave candidata; 4FN: sin multivaluadas; 5FN: sin dependencias de combinación.
- Axiomas de Armstrong: reflexividad, aumentatividad y transitividad.
- Descomposición sin pérdida y conservando dependencias: la 3FN siempre es alcanzable con ambas; la FNBC puede perder dependencias.
- Desnormalizar: redundancia controlada para mejorar el rendimiento (optimización de Métrica: introducir elementos redundantes, dividir o combinar entidades, redefinir relaciones, índices).
- Modelado dimensional (Kimball): hechos y dimensiones, estrella frente a copo de nieve, *outrigger*, SCD tipo 1, 2 y 3.

## Fuentes

- Portal de Administración Electrónica · Métrica v3: https://administracionelectronica.gob.es/pae_Home/pae_Documentacion/pae_Metodolog/pae_Metrica_v3.html
- Métrica v3 · Técnicas y prácticas (PDF, MAP): https://administracionelectronica.gob.es/pae_Home/va/dam/jcr:da7d91fa-d6bd-467c-be32-a72e27c603b3/METRICA_V3_Tecnicas.pdf
- E. F. Codd (1970), *A relational model of data for large shared data banks*, Communications of the ACM 13(6): https://doi.org/10.1145/362384.362685
- P. P. Chen (1976), *The entity-relationship model — toward a unified view of data*, ACM TODS 1(1): https://doi.org/10.1145/320434.320440
- R. Fagin (1977), *Multivalued dependencies and a new normal form for relational databases*, ACM TODS 2(3): https://doi.org/10.1145/320557.320571
- ISO/IEC 9075-1:2023, SQL/Framework: https://www.iso.org/standard/76583.html
- NIST, FIPS PUB 184, *Integration Definition for Information Modeling (IDEF1X)*: https://nvlpubs.nist.gov/nistpubs/Legacy/FIPS/fipspub184.pdf
- Resolución de 28 de junio de 2012, NTI de Relación de modelos de datos (BOE-A-2012-10050): https://www.boe.es/buscar/act.php?id=BOE-A-2012-10050
- Kimball Group, *Outrigger dimension*: https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/outrigger-dimension/
- Reglamento (UE) 2016/679 (RGPD), art. 25: https://eur-lex.europa.eu/eli/reg/2016/679/oj
