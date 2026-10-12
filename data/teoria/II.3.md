# II.3 · Tipos abstractos y estructuras de datos, organizaciones de ficheros, algoritmos y formatos

Este tema reúne los fundamentos de la **programación y el tratamiento de datos**:

- los **tipos abstractos de datos (TAD)** y las **estructuras de datos** que los implementan: vectores, listas, pilas, colas, árboles, grafos y tablas *hash*;
- las **organizaciones de ficheros**: secuencial, directa, secuencial indexada e indexada;
- los **algoritmos**: diseño, complejidad, búsqueda, ordenación y grafos;
- los **formatos de información y ficheros**: texto y datos (CSV, JSON, XML), documentos (PDF, ODF, OOXML), imagen, audio, vídeo y compresión.

En el examen domina la **teoría clásica**: recorridos de árboles, pilas y colas, ordenación por burbuja o rápida, algoritmos de Dijkstra y Kruskal. Cada vez más, también la **literalidad de los estándares de formato**: RFC 8259 de JSON, RFC 4180 de CSV, familia PDF, ODF. Entre 2018 y 2025 han caído **39 preguntas**, incluida 1 de reserva. Es, después de los sistemas operativos (II.4), el tema del bloque II que más se pregunta.

## 1. Tipos abstractos de datos (TAD)

- Un **TAD** es un tipo definido por un **conjunto de valores** y las **operaciones** que se pueden aplicar sobre ellos. Se describe con una **especificación independiente de su representación**.
  - Lo importante es **qué hace** (la interfaz), no **cómo** se implementa.
  - Ejemplos: el TAD Pila define apilar, desapilar, cima y vacía, y se puede implementar con un vector o con una lista enlazada.
- **Principios**:
  - **abstracción**: separar el comportamiento de la implementación;
  - **encapsulación** u **ocultación de la información**: el usuario solo accede mediante las operaciones;
  - **modularidad** y **reutilización**.
- **Especificación**:
  - **informal**: lenguaje natural o pseudocódigo;
  - **formal**: algebraica, con signatura y ecuaciones o axiomas; o axiomática, con precondiciones y postcondiciones;
  - también puede escribirse en un lenguaje de programación.
- **Operaciones típicas**:
  - **constructoras**, que crean valores;
  - **modificadoras**;
  - **observadoras o consultoras**.
- **En Java**:
  - el TAD se expresa como una **interfaz** (`interface`), que declara las operaciones;
  - las **clases** (`class`) que la implementan son las estructuras de datos concretas, y deben implementar **todas** sus operaciones. Por ejemplo, `List` es la interfaz y `ArrayList` o `LinkedList`, las implementaciones.

> Afirmación **incorrecta** de LI y PI 2024: «En Java, una estructura de datos (*interface*) debe implementar todas las operaciones definidas en su TAD (*class*)». **Invierte los papeles**: el TAD es la *interface* y la estructura es la *class*.

## 2. Estructuras de datos

### 2.1 Clasificación

**Por cómo se almacenan**:

- **estáticas**: tamaño fijo en tiempo de compilación, como los vectores clásicos;
- **dinámicas**: crecen y decrecen en ejecución mediante **punteros o referencias**, como las listas enlazadas y los árboles.

**Por su forma**:

- **lineales**: cada elemento tiene un único sucesor. Son los vectores, las cadenas, las listas, las pilas y las colas;
- **no lineales**: árboles, con jerarquía, y grafos, con relaciones arbitrarias.

**Por la memoria**:

- **contiguas**: los elementos ocupan posiciones consecutivas, como los vectores y las cadenas;
- **enlazadas**: cada nodo apunta al siguiente.

### 2.2 Vectores, matrices, cadenas y registros

- **Vector o *array***: colección de elementos **del mismo tipo** almacenados **de forma contigua**. Se accede **directamente** por índice, en **tiempo constante, O(1)**.
  - Insertar o borrar en medio cuesta **O(n)**, porque hay que desplazar elementos.
  - Una **porción o *slice*** es una **subestructura** del vector: un rango de elementos consecutivos. Fue la respuesta de PI 2025.
- **Matriz**: *array* **bidimensional** o multidimensional. Se almacena por filas (como en C) o por columnas (como en Fortran).
- **Cadena (*string*)**: secuencia contigua de caracteres.

> Afirmación **incorrecta** de LI 2019: «los vectores no son estructuras contiguas». Sí lo son.

- **Registro (*struct*)**: agrupa campos **de distinto tipo** bajo un nombre.

### 2.3 Listas enlazadas

| Tipo | Estructura del nodo | Características |
|---|---|---|
| **Simple** | Dato + **un** enlace al siguiente | Se recorre en un solo sentido. El último apunta a nulo |
| **Doble** | Dato + **dos** enlaces: al siguiente y al anterior | Se recorre en **ambos sentidos**. Suele mantener acceso inmediato al primero y al último |
| **Circular** | El **último enlaza con el primero** | Puede ser simple o doble |

- Ventajas: inserción y borrado en **O(1)** si se conoce la posición, y tamaño dinámico.
- Inconvenientes: acceso secuencial en **O(n)** y memoria extra para los enlaces.

> Afirmación **incorrecta** de PI 2023: «en una lista simple enlazada el primer y el último nodo están unidos». Eso describe una lista **circular**.

### 2.4 Pilas, colas y bicolas

**Pila (*stack*)**: política **LIFO** (*last in, first out*). Solo se accede por un extremo, la **cima**.

- Operaciones: **apilar** (*push*), **desapilar** (*pop*), consultar la **cima** (*top* o *peek*) y comprobar si está **vacía**.
- Puede implementarse con un **vector** o con una **lista enlazada**, que es una estructura dinámica.
- Usos: **llamadas a subrutinas** (la pila de ejecución), **deshacer**, evaluación de expresiones (notación polaca inversa), **recorrido en profundidad** y comprobación de paréntesis.

> «Se puede implementar usando *arrays*» fue la respuesta de PI 2024. Son falsos que funcione con FIFO, que no admita una estructura dinámica y que se apile «en cualquier posición».

**Cola (*queue*)**: política **FIFO** (*first in, first out*).

- Se **inserta por el final** (*enqueue*) y se **extrae por el principio** o **cabecera** (*dequeue*). Tiene, por tanto, **cabecera y final**. Fue la respuesta de PI 2025.
- Se implementa con **vectores**, a menudo como **cola circular** o búfer en anillo, o con **estructuras dinámicas**. LI 2024 dio como correcta esta última.
- Usos: colas de impresión, planificación de procesos, búferes y **recorrido en anchura**.

> **No** es LIFO, **no** permite insertar ni extraer en cualquier posición, y su nodo **no** tiene necesariamente dos enlaces (eso es una lista doble).

**Cola de prioridad**: se extrae primero el elemento de **mayor prioridad**. Se implementa con un **montículo** (*heap*).

**Bicola (*deque*, *double‑ended queue*)**: permite insertar y extraer **por ambos extremos**.

- La **bicola de entrada restringida** **inserta por un solo extremo** y **borra por los dos**. Fue la respuesta de LI 2018.
- La **bicola de salida restringida** inserta por los dos extremos y borra por uno.

### 2.5 Árboles

**Terminología**:

- **raíz**, nodo **padre e hijo**, **hermanos**;
- **hoja**: nodo sin hijos;
- **nodo interior**;
- **rama** o camino;
- **nivel o profundidad** de un nodo: la raíz está en el nivel 1 o en el 0, según el convenio;
- **altura** del árbol;
- **grado de un nodo**: número de hijos;
- **grado del árbol**: máximo grado de sus nodos.

Un **árbol binario** tiene **grado 2**. LI 2019 lo preguntó para un árbol binario lleno de 15 nodos.

**Árbol binario**: cada nodo tiene **como máximo dos hijos**, izquierdo y derecho.

- En el nivel k, con la raíz en el nivel 1, hay como máximo **2ᵏ⁻¹ nodos**.
- Un árbol de **h niveles** tiene como máximo **2ʰ − 1 nodos**. Con **4 niveles, 15 nodos**, que fue la respuesta de LI 2025‑ext.
- Un árbol binario **lleno o perfecto** tiene todos sus niveles completos. Un árbol **completo** tiene todos los niveles llenos salvo quizá el último, que se rellena de izquierda a derecha.

**Recorridos** (en profundidad):

| Recorrido | Orden | Uso típico |
|---|---|---|
| **Preorden** | **Raíz → subárbol izquierdo → subárbol derecho** | Copiar o serializar el árbol, notación prefija |
| **Inorden** (simétrico) | **Izquierdo → raíz → derecho** | En un árbol de búsqueda devuelve los elementos **ordenados** |
| **Postorden** | **Izquierdo → derecho → raíz** | Liberar nodos, notación posfija |
| **Por niveles** (anchura) | Nivel a nivel, de izquierda a derecha, con una **cola** | — |

Preorden lo preguntaron LI 2021, PI 2021 y LI 2025‑ext; inorden, LI 2019. «Reorden» y «exorden» no existen.

**Árbol binario de búsqueda (ABB)**: para cada nodo, las claves del subárbol izquierdo son **menores** y las del derecho, **mayores**.

- Buscar, insertar y borrar cuesta **O(log n)** si está equilibrado y **O(n)** en el peor caso, cuando degenera en una lista.

![Árbol binario de búsqueda de cuatro niveles con raíz 50; a la izquierda 30, con hijos 20 y 40, y 35 como hijo izquierdo de 40; a la derecha 70, con hijos 60 y 80. Sus recorridos: preorden 50, 30, 20, 40, 35, 70, 60, 80; inorden 20, 30, 35, 40, 50, 60, 70, 80, que sale ordenado; postorden 20, 35, 40, 30, 60, 80, 70, 50; y por niveles 50, 30, 70, 20, 40, 60, 80, 35](diagramas/II.3-arbol-recorridos.svg)

*Figura: los cuatro recorridos sobre el mismo árbol binario de búsqueda; solo el inorden devuelve las claves ordenadas.*

**Árboles equilibrados**:

- **AVL** (Adelson‑Velski y Landis): la diferencia de altura entre los subárboles de cada nodo es como máximo **1**. Se reequilibra con **rotaciones**.
- **Rojinegro**: se usa en las bibliotecas de colecciones, como `TreeMap` de Java.
- **Árboles 2‑3 y 2‑3‑4**: nodos con **2, 3 o 4 hijos** (2‑nodo, 3‑nodo, 4‑nodo) y 1, 2 o 3 claves. Fue la respuesta de LI 2024.
  - Son **perfectamente equilibrados**: **todas las hojas están al mismo nivel**.
  - Crecen **por la raíz**.
  - No son árboles binarios de búsqueda en sentido estricto, porque admiten más de dos hijos.
  - El 2‑3‑4 equivale al **rojinegro**.
- **Árbol B** y **B+**: árboles **multicamino** equilibrados, con muchos hijos por nodo, pensados para **almacenamiento en disco**.
  - En el **B+** los datos están **solo en las hojas**, que están **enlazadas** para recorridos secuenciales.
  - Son la base de los **índices** de bases de datos y de muchos sistemas de ficheros.

**Otros árboles**:

- **Montículo (*heap*)**: árbol binario **completo** en el que cada nodo es mayor (montículo de máximos) o menor (de mínimos) que sus hijos. Se almacena en un vector y sirve para colas de prioridad y para el **heapsort**.
- **Trie** o árbol de prefijos: para diccionarios y autocompletado.

### 2.6 Grafos

- **Grafo** G = (V, A): un conjunto de **vértices** o nodos y un conjunto de **aristas** que los unen.
  - **No dirigido**: la arista es un par **no ordenado**.
  - **Dirigido** o dígrafo: es un par **ordenado**, un arco.
  - **Ponderado**: las aristas tienen **pesos**.
- **Grado de un nodo**: número de **aristas que inciden** en él. En los dirigidos se distinguen el grado de entrada y el de salida. Fue la respuesta de PI 2019.
- **Camino** y **ciclo**.
- **Grafo conexo**: existe un **camino** entre cualquier par de vértices.
- **Grafo completo**: **todos** los vértices son **adyacentes** entre sí.
- **Grafo simple**: sin bucles ni aristas múltiples.
- **Árbol**: grafo conexo y **acíclico**. Un grafo dirigido acíclico se llama **DAG**.
- **Representación**:
  - **matriz de adyacencia**: O(V²) de espacio; buena para grafos densos;
  - **lista de adyacencia**: O(V + A); buena para grafos dispersos.
- **Recorridos**:
  - en **anchura (BFS)**, con una **cola**;
  - en **profundidad (DFS)**, con una **pila** o recursión.

### 2.7 Tablas *hash* (de dispersión)

- Una **función *hash*** transforma la **clave** en una posición de la tabla. El acceso es **O(1)** en promedio.
- Las **colisiones**, dos claves que van a la misma posición, se resuelven:
  - por **encadenamiento**: una lista por posición;
  - por **direccionamiento abierto**: sondeo lineal o cuadrático, o doble *hash*.
- El **factor de carga** (elementos / tamaño) determina cuándo redimensionar.
- Se usan en diccionarios y mapas (`HashMap`), conjuntos, cachés e índices *hash* de bases de datos.

## 3. Organizaciones de ficheros

### 3.1 Conceptos

- **Fichero o archivo**: colección de **registros** relacionados, guardada en almacenamiento secundario.
- **Registro**: conjunto de **campos**.
  - El **registro lógico** es el que ve el programa.
  - El **registro físico o bloque** es la unidad de transferencia con el disco.
  - El **factor de bloqueo** es el número de registros lógicos por bloque.
- **Clave**: campo que identifica el registro (**clave primaria**) o por el que se busca (**clave secundaria**).
- **Organización** (cómo se colocan físicamente los registros) frente a **modo de acceso** (cómo se recuperan): **secuencial**, **directo** o **dinámico**, que combina ambos.

### 3.2 Tipos de organización

| Organización | Descripción | Acceso | Ventajas e inconvenientes |
|---|---|---|---|
| **Secuencial** | Los registros se guardan uno tras otro, en orden de llegada o **por clave** | Solo secuencial: para leer el n‑ésimo hay que pasar por los anteriores | Simple y eficiente en **procesos por lotes** que recorren todo el fichero. Insertar o borrar obliga a **reescribir**. Es la única posible en **cinta** |
| **Relativa o directa (aleatoria)** | La posición se calcula a partir de la clave: **direccionamiento directo** o **función *hash*** | **Directo**, en un solo acceso | Muy rápida. Las colisiones van a un **área de desbordamiento**. No sirve para listados ordenados |
| **Secuencial indexada (ISAM)** | Un **área primaria** ordenada por clave, un **índice** (por bloques) y un **área de desbordamiento** | **Secuencial y directo** | Equilibrada. Con muchas altas, el desbordamiento crece y hay que **reorganizar** |
| **Indexada** (multinivel, árbol B o B+, como VSAM) | Índices de varios niveles que se reorganizan solos | Directo y secuencial ordenado | Es la base de los sistemas gestores y de los ficheros modernos |
| **Ficheros invertidos y multilista** | **Índices secundarios** para buscar por campos que no son clave | Por atributos | Consultas por varios criterios |

- **Dispersión estática y dinámica**: la *hash* estática tiene un tamaño fijo; la **extensible** o **lineal** crece sin reorganizar todo el fichero.
- En los **sistemas gestores de bases de datos**, las tablas se almacenan como ficheros de montón (*heap*), ordenados o *hash*, con **índices B+**, agrupados o no (véase el tema II.5).
- En los **sistemas operativos**, el fichero se ve como una **secuencia de bytes**. La asignación de espacio en disco es contigua, enlazada (FAT) o indexada (i‑nodos), lo que se estudia en el tema II.4.

## 4. Algoritmos

### 4.1 Concepto y representación

- Un **algoritmo** es una secuencia **finita** de pasos **bien definidos** y **no ambiguos** que, a partir de unas **entradas**, produce unas **salidas** en un tiempo finito, con operaciones **efectivas**.
- **Representación**:
  - **pseudocódigo**;
  - **diagramas de flujo** (ISO 5807);
  - diagramas de **Nassi‑Shneiderman**;
  - el código fuente.
- **Estructuras de control** (programación estructurada, **teorema de Böhm‑Jacopini**): **secuencia**, **selección** e **iteración** bastan para expresar cualquier algoritmo.
- **Recursión**: un algoritmo que se llama a sí mismo, con un **caso base** y un **caso recursivo**. Toda recursión puede transformarse en iteración, usando una pila explícita si hace falta.

### 4.2 Complejidad

- Se mide el **tiempo** (número de operaciones) y el **espacio** (memoria) en función del tamaño de la entrada n.
- La notación **O grande** expresa el **orden de crecimiento** en el **peor caso**; también se estudian el caso medio y el mejor. Ω y Θ expresan la cota inferior y la ajustada.
- **Órdenes más habituales**, de mejor a peor:
  - **O(1)**: constante;
  - **O(log n)**: logarítmico;
  - **O(n)**: lineal;
  - **O(n log n)**;
  - **O(n²)**: cuadrático;
  - O(n³);
  - **O(2ⁿ)**: exponencial;
  - **O(n!)**.
- **Clases P y NP**:
  - **P** son los problemas resolubles en tiempo polinómico;
  - **NP**, aquellos cuya solución se **verifica** en tiempo polinómico;
  - los **NP‑completos** son los más difíciles de NP, como el viajante en su versión de decisión o la satisfacibilidad (SAT).

### 4.3 Técnicas de diseño

| Técnica | Idea | Ejemplos |
|---|---|---|
| **Fuerza bruta** | Probar todas las posibilidades | Búsqueda exhaustiva |
| **Divide y vencerás** | Dividir el problema en subproblemas **independientes**, resolverlos y **combinar** | **Mergesort**, **quicksort**, **búsqueda binaria** |
| **Voraz** (*greedy*) | En cada paso elegir la opción **localmente óptima**, sin volver atrás (PI 2018) | **Kruskal**, **Prim**, **Dijkstra**, **Huffman**, el cambio de monedas |
| **Programación dinámica** | Subproblemas **solapados**: se resuelven una vez y se **guardan** (memorización) | Floyd‑Warshall, Bellman‑Ford, mochila 0/1, subsecuencia común más larga |
| **Vuelta atrás** (*backtracking*) | Construir la solución paso a paso y **retroceder** al llegar a un callejón sin salida | N reinas, sudoku, laberintos |
| **Ramificación y poda** | Explorar el árbol de soluciones **descartando ramas** con cotas | Optimización combinatoria |
| **Heurísticos y probabilísticos** | Soluciones aproximadas o aleatorizadas | Algoritmos genéticos, Monte Carlo |

### 4.4 Búsqueda

| Algoritmo | Requisito | Complejidad |
|---|---|---|
| **Secuencial o lineal** | Ninguno | O(n) |
| **Binaria o dicotómica** | Vector **ordenado**; se compara con el elemento central y se descarta la mitad | **O(log n)** |
| **Por *hash*** | Tabla de dispersión | O(1) de media |
| **En árbol binario de búsqueda o B+** | Árbol | O(log n) si está equilibrado |

> LI 2018 dio como distractor la búsqueda secuencial **«con requisito de vector ordenado»**: ese requisito es de la **binaria**, no de la secuencial.

### 4.5 Ordenación

| Algoritmo | Idea | Mejor | Medio | Peor | Espacio | Estable |
|---|---|---|---|---|---|---|
| **Burbuja** (intercambio directo) | Recorre el vector **comparando pares adyacentes** e **intercambiándolos** si no están en orden; repite hasta no hacer intercambios | O(n) | O(n²) | O(n²) | O(1) | Sí |
| **Selección directa** | Busca el **mínimo** y lo coloca en la primera posición; luego el segundo… | O(n²) | O(n²) | O(n²) | O(1) | No |
| **Inserción directa** | Inserta cada elemento en su sitio dentro de la parte ya ordenada, como al ordenar cartas | O(n) | O(n²) | O(n²) | O(1) | Sí |
| **Shell** | Inserción con saltos decrecientes | O(n log n) | Depende de la secuencia de saltos (subcuadrático) | O(n²) con los saltos originales de Shell | O(1) | No |
| **Mezcla (*mergesort*)** | **Divide y vencerás**: divide en mitades, ordena y **mezcla** | O(n log n) | O(n log n) | O(n log n) | O(n) | Sí |
| **Rápida (*quicksort*)** | Elige un **pivote** y **particiona**: los menores a un lado y los mayores al otro; luego recursión (PI 2019) | O(n log n) | **O(n log n)** | **O(n²)**, con un mal pivote | O(log n) | No |
| **Montículo (*heapsort*)** | Construye un montículo y extrae el máximo repetidamente | O(n log n) | O(n log n) | O(n log n) | O(1) | No |
| **Conteo (*counting sort*)** | Cuenta las apariciones de cada valor en un rango pequeño k | O(n + k) | O(n + k) | O(n + k) | O(k) | Sí |
| **Radix** | Ordena **dígito a dígito** con un método estable | O(d·(n + k)) | O(d·(n + k)): **lineal** con claves de longitud fija | O(d·(n + k)) | O(n + k) | Sí |

- La burbuja se preguntó en LI 2018 y PI 2021.
- Radix fue la respuesta de la reserva de LI 2025, frente a heapsort, mergesort y quicksort, que son O(n log n).
- Los algoritmos **por comparación** no pueden bajar de **Ω(n log n)** en el caso general. Los de **conteo, radix y cubetas** lo consiguen porque **no comparan**: aprovechan la estructura de las claves.
- **Ordenación externa**: para datos que no caben en memoria se usa la **mezcla** de tramos ordenados en disco.

### 4.6 Algoritmos sobre grafos

| Problema | Algoritmo | Características |
|---|---|---|
| **Camino más corto desde un origen** (pesos no negativos) | **Dijkstra** | Voraz; con un montículo, O((V + A) log V) (LI 2023) |
| Camino más corto con pesos negativos | **Bellman‑Ford** | Detecta ciclos negativos |
| **Caminos más cortos entre todos los pares** | **Floyd‑Warshall** | Programación dinámica; O(V³) |
| **Árbol recubridor mínimo** | **Kruskal**, que ordena las aristas y las añade si no forman ciclo (conjuntos disjuntos), y **Prim**, que crece desde un vértice | Voraces (LI 2018) |
| Orden topológico | Sobre un DAG | Planificación de tareas y dependencias |
| Flujo máximo | Ford‑Fulkerson | Redes de transporte |
| Búsqueda heurística | **A\*** | Caminos con heurística, como en mapas y juegos |

> Distractores de 2018: **Quicksort** (ordenación), **QR** (código bidimensional o factorización de matrices) y **Rijndael** (el cifrado AES) no son algoritmos de grafos.

## 5. Formatos de información y ficheros

### 5.1 Conceptos

- **Formato**: estructura con la que se codifica la información en un fichero. Se identifica por:
  - la **extensión**;
  - el **tipo MIME** o de medio (por ejemplo, `application/json` o `text/csv`);
  - los ***magic numbers***, los bytes iniciales que identifican el formato.
- **Abierto o propietario**: un formato abierto tiene especificación pública y sin restricciones de uso. En la Administración, el **ENI** obliga a usar **estándares abiertos** y el **catálogo de estándares** (véase el tema I.8).
- **Contenedor y códec**:
  - el **contenedor** (MP4, MKV, WebM, Ogg) **empaqueta** pistas de audio, vídeo, subtítulos y metadatos;
  - el **códec** (H.264, AV1, AAC, Opus…) **comprime y descomprime** cada pista.

### 5.2 Compresión

- **Sin pérdida** (*lossless*): se recupera **exactamente** el original. Imprescindible para texto, ejecutables y archivo.
  - **RLE**: sustituye repeticiones por pares de valor y número.
  - **Huffman**: códigos de **longitud variable**, más cortos para los símbolos frecuentes.
  - **LZ77/LZ78/LZW**: **diccionario adaptativo**. LZW se usa en **GIF** y TIFF.
  - **DEFLATE** = LZ77 + Huffman. Se usa en **ZIP**, **gzip** y **PNG**.
  - Otros: bzip2, xz (LZMA), Zstandard, Brotli.
- **Con pérdida** (*lossy*): elimina información poco perceptible, con mucha más compresión.
  - **Codificación por transformación**: la **transformada discreta del coseno (TDC o DCT)** en **JPEG** y en el vídeo, y las *wavelets* en **JPEG 2000**. Es el método con pérdida típico por el que preguntó LI 2018; RLE, Huffman y LZW son **sin pérdida**.
  - **Modelos psicoacústicos** en el audio: MP3 y AAC.
  - **Compensación de movimiento** entre fotogramas en el vídeo.
- **Archivadores**:
  - **ZIP** (archiva y comprime);
  - **tar** (**solo agrupa**; se combina con gzip, bzip2 o xz: `.tar.gz`);
  - **7z** (LZMA);
  - RAR (propietario).

### 5.3 Texto y datos estructurados

**TXT**: texto plano, con la codificación de caracteres que corresponda (véase el tema II.1).

**CSV** (*Comma‑Separated Values*, **RFC 4180**, 2005). Fue la respuesta de LI y PI 2025:

- cada **registro** va en una **línea**, terminada por **CRLF**;
- puede haber una **cabecera** opcional con los nombres de los campos;
- los campos se separan por **comas**. Todos los registros deberían tener el mismo número de campos, y los espacios forman parte del campo;
- los campos que contengan **comas, comillas dobles o saltos de línea** deben ir **entre comillas dobles**;
- una comilla doble dentro de un campo se escribe **duplicada** (`""`);
- el tipo MIME registrado es **`text/csv`**, no `application/csv`.

**JSON** (*JavaScript Object Notation*, **RFC 8259**, 2017, equivalente a **ECMA‑404**):

- es un **formato textual de intercambio de datos**, no una gramática XML ni una API (LI 2019);
- **tipos**: cuatro **primitivos** (cadena, número, booleano y nulo) y dos **estructurados** (objeto y *array*). Un valor JSON debe ser un **objeto, un *array*, un número, una cadena o uno de los literales `true`, `false` y `null`**. No existen `undefined`, `NaN`, fechas ni funciones. Fue la respuesta de LI y PI 2025;
- un **objeto** es una **colección no ordenada** de pares **nombre/valor**, y los nombres **deberían** ser únicos (LI 2025‑ext);
- un ***array*** es una **secuencia ordenada** de valores;
- **no admite comentarios** ni tipos definidos por el usuario;
- entre sistemas abiertos se codifica en **UTF‑8**. El tipo MIME es **`application/json`**.

**XML** (W3C, XML 1.0, quinta edición):

- es un lenguaje de **marcado extensible** que debe estar **bien formado**, con etiquetas que se cierran y anidan correctamente y un único elemento raíz;
- es **válido** si cumple su **DTD** o su **esquema XSD**;
- tiene espacios de nombres, XPath, XSLT y otras tecnologías asociadas;
- es la base de ODF, OOXML, SVG y los documentos del ENI.

**Otros**: **YAML** (configuración legible; superconjunto de JSON), TSV, INI y **Markdown** (texto con marcas ligeras).

### 5.4 Documentos ofimáticos y de publicación

**OpenDocument (ODF)**: estándar abierto de **OASIS**.

- Su versión 1.0 se aprobó como **ISO/IEC 26300:2006**, que fue la respuesta de PI 2023; la 1.2, como ISO/IEC 26300‑1, ‑2 y ‑3:2015.
- Extensiones: `.odt` (texto), `.ods` (hoja de cálculo), `.odp` (presentación) y `.odg` (dibujo). Son ficheros **ZIP con XML**.

**Office Open XML (OOXML)**: **ECMA‑376** e **ISO/IEC 29500**. Extensiones `.docx`, `.xlsx` y `.pptx`, también ZIP con XML. El catálogo de estándares admite la variante ***Strict***.

**RTF**: formato de texto enriquecido de Microsoft, **«en abandono»** en el catálogo de estándares.

**PDF** (*Portable Document Format*):

- es un estándar **ISO**: **ISO 32000‑1:2008** (PDF 1.7) e **ISO 32000‑2** (PDF 2.0);
- **subconjuntos** normalizados:

| Subconjunto | Norma ISO | Finalidad |
|---|---|---|
| **PDF/A** | ISO 19005, partes 1 a 4 | **Conservación a largo plazo** (archivo): fuentes incrustadas, sin contenido dinámico ni dependencias externas |
| **PDF/UA** | ISO 14289 | **Accesibilidad universal** (*Universal Accessibility*) |
| **PDF/E** | ISO 24517 | Documentos de **ingeniería** |
| **PDF/X** | ISO 15930 | **Artes gráficas**: documentos listos para imprenta |
| **PDF/VT** | ISO 16612‑2 | Impresión de datos variables y transaccionales |

> **«PDF/I» no existe**: el de imprenta es **PDF/X**. Fue la respuesta de LI y PI 2023.

**EPUB** (W3C): libro electrónico adaptable, empaquetado en ZIP con XHTML y CSS.

### 5.5 Imagen

**Mapas de bits (*raster*)**: una matriz de píxeles.

| Formato | Compresión | Características |
|---|---|---|
| **BMP** | Normalmente sin compresión | Mapa de bits de Windows; **no** está en el catálogo de estándares del ENI |
| **GIF** | Sin pérdida (LZW) | Paleta de **256 colores**, **animación**, transparencia de un bit |
| **JPEG** (ISO/IEC 10918) | **Con pérdida** (DCT) | **Estándar internacional** (PI 2023); **grado de compresión ajustable** (LI 2019); **24 bits** (millones de colores); **sin transparencia**; cada nueva compresión **pierde calidad** |
| **PNG** (ISO/IEC 15948) | **Sin pérdida** (DEFLATE) | **Transparencia** con canal alfa; sustituto libre del GIF |
| **TIFF** | Sin compresión o con compresión sin pérdida (también admite JPEG) | **Archivo y digitalización**; multipágina |
| **JPEG 2000** (ISO/IEC 15444) | Con o sin pérdida, por *wavelets* | Archivo, imagen médica, cine digital |
| **WebP** (Google) | Con o sin pérdida | Transparencia y animación; web |
| **HEIF / HEIC** (ISO/IEC 23008‑12) | HEIF es el contenedor; con codificación HEVC (HEIC), con pérdida | Fotos de móviles |
| **AVIF** | Con o sin pérdida, basado en **AV1** | Web |
| **JPEG XL** (ISO/IEC 18181) | Con o sin pérdida | Sucesor moderno del JPEG |

**Gráficos vectoriales**: describen **formas geométricas** y se **escalan sin perder calidad**.

- **SVG** (W3C, basado en XML) fue la respuesta de LI 2018.
- Otros son EPS, AI o WMF/EMF, y los PDF pueden contener vectores.

> **EXIF** no es un formato de imagen: son **metadatos** de cámara (fecha, exposición, GPS) incrustados en JPEG o TIFF.

### 5.6 Audio y vídeo

**Audio**:

| Formato | Compresión | Características |
|---|---|---|
| **WAV** / AIFF | Sin compresión (PCM) | — |
| **FLAC**, ALAC | **Sin pérdida** | FLAC es libre |
| **MP3** (MPEG‑1/2 Audio Layer III) | Con pérdida | Sus patentes ya han expirado |
| **AAC** | Con pérdida | Sucesor del MP3; YouTube, Apple |
| **Ogg Vorbis** | Con pérdida | Libre |
| **Opus** (RFC 6716) | Con pérdida | Libre; voz y música; videoconferencia y WebRTC |

**Códecs de vídeo**:

| Códec | Origen | Características |
|---|---|---|
| **H.264 / AVC** | ITU‑T y MPEG | El más extendido |
| **H.265 / HEVC** | ITU‑T y MPEG | Mitad de tasa binaria para igual calidad; licencias complejas |
| **H.266 / VVC** | ITU‑T y MPEG (2020) | — |
| **VP8 / VP9** | Google | Libres |
| **AV1** | ***Alliance for Open Media*** (2018) | Códec de vídeo **abierto y sin regalías**, sucesor de VP9 (LI 2021) |

**Contenedores**:

| Contenedor | Características |
|---|---|
| **MP4** (ISO/IEC 14496‑14) | — |
| **MKV** (Matroska) | Libre |
| **WebM** | VP8, VP9 o AV1 con Vorbis u Opus |
| **AVI** | Microsoft, antiguo |
| **MOV** | QuickTime |
| **MPEG‑TS** | Difusión |
| **Ogg / OGM** | Ogg es libre, de la Fundación Xiph.org; OGM es una variante no oficial de Ogg |

**OGM** (*Ogg Media*) es un **formato contenedor libre de audio y vídeo**, que fue la respuesta de PI 2018.

### 5.7 Formatos en la Administración

- El **catálogo de estándares** del ENI enumera los formatos admitidos, entre ellos PDF y PDF/A, ODF, OOXML Strict, JPEG, PNG, TIFF, SVG, TXT, CSV, HTML, XML, MP3, OGG‑Vorbis, MPEG‑4 y WebM.
- Ordena el **contenido** de los documentos electrónicos y su **conservación**: el **PDF/A** es el formato de archivo por excelencia.
- La **NTI de reutilización** prefiere formatos **abiertos y estructurados** (CSV, JSON, XML, RDF) para los datos abiertos.

## Normativa y estándares clave

| Estándar | Qué regula | Puntos clave |
|---|---|---|
| **RFC 8259** (JSON, 2017) / **ECMA‑404** | Intercambio de datos | Objeto **no ordenado** de pares nombre/valor; *array* ordenado; valores: objeto, *array*, número, cadena, `true`, `false`, `null`; sin comentarios; UTF‑8; `application/json` |
| **RFC 4180** (CSV, 2005) | Valores separados por comas | Registros separados por CRLF; cabecera opcional; comillas dobles para campos con coma, comillas o salto de línea; comilla interna duplicada; `text/csv` |
| **XML 1.0** (W3C) | Marcado extensible | Bien formado frente a válido (DTD o XSD) |
| **ISO 32000** (PDF) e ISO 19005, 14289, 24517, 15930 y 16612‑2 | Documento portable | PDF/A (archivo), PDF/UA (accesibilidad), PDF/E (ingeniería), PDF/X (imprenta), PDF/VT |
| **ISO/IEC 26300** (ODF) / **ISO/IEC 29500** (OOXML) | Documentos ofimáticos | ODF 1.0 en 2006; OOXML Strict |
| **ISO/IEC 10918** (JPEG), **15948** (PNG), **15444** (JPEG 2000), **18181** (JPEG XL); **SVG** (W3C) | Imagen | Con pérdida o sin ella; *raster* o vectorial |
| **AV1** (AOMedia), **H.264/H.265/H.266** (ITU‑T y MPEG), **Opus** (RFC 6716) | Audio y vídeo | Códecs abiertos o con licencia |
| **Catálogo de estándares del ENI** (2012) | Formatos admitidos en la Administración | Véase el tema I.8 |

## Lo que más cae en el examen

**39 preguntas** entre 2018 y 2025: 23 en ingreso libre y 16 en promoción interna, incluida 1 de reserva:

| Concepto | Preguntas | Exámenes |
|---|---|---|
| **Recorridos de árboles binarios**: preorden (raíz‑izquierdo‑derecho) e inorden | 4 | LI 2019, LI 2021, PI 2021, LI 2025‑ext |
| **JSON (RFC 8259)**: es un formato de intercambio; valores admitidos; objeto no ordenado | 4 | LI 2019, LI 2025‑ext, LI 2025, PI 2025 |
| **Pila y cola** (LIFO y FIFO; implementación con vectores o dinámica; cabecera y final) | 3 | LI 2024, PI 2024, PI 2025 |
| **TAD**: definición; en Java la interfaz es el TAD y la clase lo implementa | 2 | LI 2024, PI 2024 |
| **Algoritmos de ordenación**: burbuja (pares adyacentes), quicksort (pivote), radix (lineal) | 4 | LI 2018, PI 2019, PI 2021, LI 2025 (reserva) |
| **Grafos**: Dijkstra (camino mínimo), Kruskal (árbol recubridor mínimo), grado de un nodo | 3 | LI 2018, PI 2019, LI 2023 |
| **Familia PDF** («PDF/I» no existe) | 2 | LI 2023, PI 2023 |
| **CSV (RFC 4180)**: CRLF y comillas dobles | 2 | LI 2025, PI 2025 |
| **JPEG**: estándar internacional; compresión ajustable | 2 | LI 2019, PI 2023 |
| **Árboles**: máximo de 15 nodos con 4 niveles; grado 2; árboles 2‑3‑4 | 3 | LI 2019, LI 2024, LI 2025‑ext |
| **Estructuras lineales**: vectores contiguos; listas simples, dobles y circulares; bicola de entrada restringida; *slice* | 4 | LI 2018, LI 2019, PI 2023, PI 2025 |
| **Algoritmos voraces** | 1 | PI 2018 |
| **Compresión con pérdida**: transformada del coseno | 1 | LI 2018 |
| **Formato vectorial**: SVG | 1 | LI 2018 |
| **ODF**: ISO/IEC 26300:2006 | 1 | PI 2023 |
| **AV1**: códec de vídeo | 1 | LI 2021 |
| **OGM**: contenedor libre de audio y vídeo | 1 | PI 2018 |

## Trampas habituales

- **Recorridos**: **pre**orden = la raíz **antes** (R‑I‑D); **in**orden = la raíz **en medio** (I‑R‑D); **post**orden = la raíz **después** (I‑D‑R). «Reorden» y «exorden» no existen. El **inorden** de un árbol de búsqueda sale **ordenado**.
- **Nodos de un árbol binario**: con h niveles (raíz en el nivel 1), como máximo **2ʰ − 1**: 4 niveles dan **15**, no 16. En el nivel k caben 2ᵏ⁻¹.
- **Pila = LIFO** y **cola = FIFO**. Ambas pueden implementarse con **vectores** o con **listas dinámicas**. Ninguna permite insertar o extraer «en cualquier posición». Una cola tiene **cabecera** (por donde sale) y **final** (por donde entra).
- **Lista doble**: dos enlaces (al siguiente y al anterior). **Circular**: el último apunta al primero. La lista **simple** no une el último con el primero.
- **Bicola de entrada restringida**: **inserta por un extremo y borra por los dos**. La de salida restringida, al revés.
- **TAD frente a estructura de datos**: el TAD es la **especificación** (en Java, la *interface*); la estructura es la **implementación** (la *class*).
- **Árboles 2‑3‑4**: nodos con 2, 3 o 4 hijos y **todas las hojas al mismo nivel**. **No** son árboles binarios de búsqueda.
- **Dijkstra**: caminos mínimos **desde un origen** con pesos **no negativos**. **Floyd‑Warshall**: entre **todos los pares**. **Kruskal y Prim**: **árbol recubridor mínimo**, no caminos.
- **Grafo conexo**: hay **camino** entre todo par. **Grafo completo**: todo par es **adyacente**. **Dirigido**: pares **ordenados**.
- **Quicksort**: **pivote**; O(n log n) de media y **O(n²) en el peor caso**. **Mergesort**: siempre O(n log n), pero con memoria extra. **Radix y conteo**: lineales porque no comparan.
- **Burbuja**: compara e intercambia **elementos adyacentes**. Selección: busca el **mínimo** y lo coloca. Inserción: **inserta** en la parte ordenada.
- **Búsqueda binaria**: exige vector **ordenado**. La secuencial, no.
- **Voraz** = óptimo **local** en cada paso, sin vuelta atrás. **Backtracking** = retrocede. **Divide y vencerás** = subproblemas independientes. **Programación dinámica** = subproblemas **solapados** que se guardan.
- **JSON**: objeto **no ordenado**; **sin comentarios**; sin tipos propios; valores `true`, `false` y **`null`**, no `undefined`, `NaN`, fechas ni funciones. Es un **formato de intercambio**, no XML.
- **CSV**: comillas **dobles**, no simples; los campos **pueden** contener comas si van entre comillas; MIME **`text/csv`**.
- **PDF**: A = archivo; UA = accesibilidad; E = ingeniería; **X = imprenta**; VT = datos variables. **No existe PDF/I**.
- **JPEG**: **con pérdida**, **sin transparencia** y **pierde calidad** al volver a guardarse; compresión **ajustable**; 24 bits. **PNG**: sin pérdida y con transparencia. **GIF**: 256 colores y animación.
- **Con pérdida**: transformada del coseno o *wavelets*. **Sin pérdida**: RLE, **Huffman**, **LZW** y DEFLATE.
- **SVG** es vectorial; **EXIF** son metadatos; **HEIF** y **JPEG** son *raster*.
- **Contenedor frente a códec**: MP4, MKV, WebM y Ogg son contenedores; H.264, AV1, AAC y Opus son códecs. **AV1** es un códec de vídeo **libre** de la Alliance for Open Media.
- **ODF**: ISO/IEC **26300**:2006. **OOXML**: ISO/IEC **29500**.

## Repaso rápido

- TAD: valores y operaciones con una especificación independiente de la implementación (abstracción y encapsulación). En Java, la *interface* es el TAD y la *class* lo implementa.
- Estructuras estáticas o dinámicas, lineales o no lineales, contiguas o enlazadas. El vector es contiguo con acceso O(1); el *slice* es un subvector.
- Listas simples (un enlace), dobles (dos enlaces) y circulares (el último enlaza con el primero).
- Pila LIFO (*push*, *pop*, cima): llamadas, deshacer, DFS. Cola FIFO (cabecera y final): impresión, BFS. Cola de prioridad con montículo. Bicola de entrada o salida restringida.
- Árboles: grado (binario = 2); máximo de 2ʰ − 1 nodos; recorridos pre, in y postorden y por niveles; ABB; AVL; 2‑3‑4 (hojas al mismo nivel); B y B+ (índices).
- Grafos: dirigidos o no; grado; conexo frente a completo; matriz o lista de adyacencia; BFS (cola) y DFS (pila).
- *Hash*: O(1) de media; colisiones por encadenamiento o direccionamiento abierto; factor de carga.
- Ficheros: secuencial (lotes, cinta), directa o *hash* (área de desbordamiento), secuencial indexada (ISAM: área primaria, índice y desbordamiento), indexada (B+) e invertida.
- Complejidad O: 1 < log n < n < n log n < n² < 2ⁿ < n!. P y NP.
- Técnicas: divide y vencerás, voraz, programación dinámica, *backtracking* y ramificación y poda.
- Búsqueda secuencial O(n), binaria O(log n) sobre un vector ordenado, y *hash* O(1).
- Ordenación: burbuja, selección e inserción O(n²); mergesort y heapsort O(n log n); quicksort O(n log n) de media y O(n²) en el peor caso; radix y conteo lineales.
- Grafos: Dijkstra (un origen), Bellman‑Ford (pesos negativos), Floyd‑Warshall (todos los pares), Kruskal y Prim (árbol recubridor mínimo), A*.
- Formatos: CSV (RFC 4180), JSON (RFC 8259), XML; ODF (ISO/IEC 26300) y OOXML (ISO/IEC 29500); PDF (ISO 32000) con PDF/A, UA, E, X y VT.
- Imagen: JPEG con pérdida, PNG sin pérdida y con transparencia, GIF, TIFF, WebP, HEIF, AVIF; SVG vectorial. Audio: WAV, FLAC, MP3, AAC, Vorbis, Opus. Vídeo: H.264, HEVC, VVC, VP9, AV1; contenedores MP4, MKV, WebM y Ogg/OGM.

## Fuentes

- [RFC 8259, The JavaScript Object Notation (JSON) Data Interchange Format (IETF)](https://www.rfc-editor.org/rfc/rfc8259)
- [RFC 4180, Common Format and MIME Type for CSV Files (IETF)](https://www.rfc-editor.org/rfc/rfc4180)
- [ECMA‑404, The JSON Data Interchange Syntax (Ecma International)](https://ecma-international.org/publications-and-standards/standards/ecma-404/)
- [XML 1.0, quinta edición (W3C)](https://www.w3.org/TR/xml/)
- [ISO 32000‑2, PDF 2.0 (ISO)](https://www.iso.org/standard/75839.html)
- [ISO/IEC 26300, OpenDocument (ISO)](https://www.iso.org/standard/66363.html)
- [SVG (W3C)](https://www.w3.org/TR/SVG2/)
- [Alliance for Open Media: AV1](https://aomedia.org/specifications/av1/)
- [NTI de Catálogo de estándares (BOE)](https://www.boe.es/buscar/act.php?id=BOE-A-2012-13501)
