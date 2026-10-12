# III.2 · Lenguajes de programación: tipos, operadores, control, subprogramas y estructura

Este tema recoge los fundamentos comunes a cualquier lenguaje de programación: qué es un lenguaje y cómo se traduce, cómo se **representan los tipos de datos** en memoria, los **operadores** y su precedencia, las **estructuras de control** (condicionales, bucles y recursividad), los **subprogramas** con sus **parámetros**, las estructuras básicas (**vectores y registros**) y la **estructura de un programa**. En el examen se pregunta de dos maneras: conceptos («qué es un transpilador», «qué permite el paso por referencia», «qué es un *slice*») y, sobre todo, **trazas de código** en Java, JavaScript, Python o pseudocódigo en las que hay que calcular el resultado. Las preguntas específicas de orientación a objetos están en III.4, las de Java y .NET en III.5 y las de lenguajes web en III.7; las estructuras de datos y algoritmos (pilas, colas, árboles, ordenación) son del tema II.3.

## Lenguajes de programación

### Concepto y componentes

Un **lenguaje de programación** es un lenguaje formal, con reglas precisas, que permite expresar algoritmos para que los ejecute un ordenador. Tiene tres niveles de descripción:

| Nivel | Qué define | Herramienta |
|---|---|---|
| **Léxico** | Las palabras válidas (*tokens*): identificadores, palabras reservadas, literales, operadores, separadores | Expresiones regulares; analizador léxico |
| **Sintaxis** | Cómo se combinan los *tokens* en construcciones válidas | Gramáticas libres de contexto, notación **BNF/EBNF**; analizador sintáctico |
| **Semántica** | Qué significa cada construcción: estática (tipos, declaraciones) y dinámica (efecto al ejecutar) | Análisis semántico; especificación del lenguaje |

### Generaciones y niveles

| Generación | Características | Ejemplos |
|---|---|---|
| **1GL** | Lenguaje **máquina**: código binario específico de cada procesador | Código máquina x86, ARM |
| **2GL** | **Ensamblador**: mnemónicos 1:1 con las instrucciones máquina; necesita un ensamblador | `MOV`, `ADD`, `JMP` |
| **3GL** | **Alto nivel**, procedimentales u orientados a objetos; independientes de la máquina | FORTRAN, COBOL, C, **C++**, Pascal, Java, C#, Python |
| **4GL** | Orientados al **qué** y al dominio (consultas, informes, generadores de aplicaciones) | **SQL**, Natural, generadores de informes, herramientas RAD |
| **5GL** | Basados en **restricciones y lógica**, ligados a la inteligencia artificial | **Prolog**, OPS5 |

Por cercanía a la máquina se habla de lenguajes de **bajo nivel** (máquina y ensamblador), de **nivel medio** (a veces se clasifica así a C, por su acceso directo a memoria) y de **alto nivel**.

### Paradigmas

| Paradigma | Idea | Lenguajes |
|---|---|---|
| **Imperativo** (procedimental, estructurado) | Secuencia de órdenes que cambian el estado del programa | C, Pascal, COBOL, FORTRAN |
| **Orientado a objetos** | Objetos con estado y comportamiento; clases, herencia, polimorfismo (tema III.4) | Java, C#, C++, Smalltalk |
| **Funcional** (declarativo) | Evaluación de funciones puras, inmutabilidad, funciones de orden superior | Haskell, Lisp, F#, Erlang, Scala |
| **Lógico** (declarativo) | Hechos, reglas y consultas resueltas por inferencia | Prolog |
| Dirigido por eventos | El flujo lo marcan eventos (clics, mensajes) | JavaScript en el navegador, interfaces gráficas |
| Concurrente | Procesos o hilos que se ejecutan a la vez | Go (gorrutinas), Erlang |

La mayoría de los lenguajes actuales son **multiparadigma**: Python, JavaScript, C#, Kotlin, Scala o Java (con lambdas desde la versión 8).

### Traductores: compilación, interpretación y máquinas virtuales

- **Compilador**: traduce **todo** el programa fuente a otro lenguaje de **más bajo nivel** (normalmente código máquina o código intermedio) **antes** de ejecutarlo. Fases: análisis **léxico**, **sintáctico** y **semántico** (*front-end*), generación de **código intermedio**, **optimización** y **generación de código** (*back-end*), con una **tabla de símbolos** compartida.
- **Intérprete**: analiza y **ejecuta directamente** las instrucciones, una a una, sin generar un ejecutable.
- **Ensamblador**: traduce lenguaje ensamblador a código máquina.
- **Enlazador** (*linker*): une los módulos objeto y las bibliotecas en un ejecutable. **Cargador** (*loader*): lo lleva a memoria.
- **Preprocesador**: transforma el fuente antes de compilar (`#include`, `#define` en C).
- **Compilador cruzado** (*cross compiler*): genera código para una **plataforma distinta** de aquella en la que se ejecuta (por ejemplo, compilar en un PC para un microcontrolador).
- **Transpilador** (*source-to-source compiler*): traduce de un lenguaje de alto nivel a **otro de nivel similar**: TypeScript → JavaScript, Babel (JavaScript moderno → antiguo), Sass → CSS. **No** es «un intérprete y un compilador a la vez» (afirmación falsa en 2023).
- **Máquina virtual y código intermedio**: Java compila a **bytecode** (`.class`), que ejecuta la **JVM** interpretándolo y compilando con **JIT** (*Just-In-Time*) las partes más usadas; C# y los demás lenguajes .NET compilan a **CIL** (*Common Intermediate Language*), que ejecuta el **CLR** con JIT o se compila por adelantado (**AOT**, *Native AOT*); CPython compila a *bytecode* (`.pyc`). El *bytecode* es código **intermedio** para una máquina virtual, no código máquina nativo.

| Aspecto | Compilado | Interpretado | Híbrido (bytecode + JIT) |
|---|---|---|---|
| Velocidad de ejecución | Alta | Menor | Alta tras el calentamiento |
| Portabilidad | Hay que recompilar para cada plataforma | El fuente es portable si hay intérprete | «Escribe una vez, ejecuta en cualquier parte» (JVM, CLR) |
| Detección de errores | En compilación | En ejecución | Ambas |
| Ejemplos | C, C++, Go, Rust | Bash, PHP clásico | Java, C#, Kotlin; JavaScript (motores V8, SpiderMonkey) |

![Tres caminos del código fuente a la CPU: compilado, en el que main.c pasa por el preprocesador y el compilador (front-end de análisis léxico, sintáctico y semántico; back-end de código intermedio, optimización y generación de código; tabla de símbolos compartida), y el código objeto main.o lo une el enlazador con las bibliotecas en un ejecutable que el cargador lleva a memoria; híbrido, en el que javac compila Main.java a bytecode que la JVM interpreta y compila con JIT (en .NET, CIL y CLR); e interpretado, en el que el intérprete ejecuta el script instrucción a instrucción sin generar ejecutable](diagramas/III.2-traductores.svg)

*Figura: fases del compilador y papel del enlazador, del cargador, de la máquina virtual y del intérprete.*

### Sistemas de tipos

- **Tipado estático**: los tipos se comprueban en **compilación** (Java, C#, C, Go, TypeScript). **Dinámico**: en **ejecución**; las variables no tienen tipo, los valores sí (Python, JavaScript, PHP).
- **Tipado fuerte**: no se mezclan tipos sin conversión explícita (Python: `"5" + 1` da error). **Débil**: conversiones implícitas permisivas (JavaScript: `"5" + 1` da `"51"` y `"5" - 1` da `4`).
- **Explícito** frente a **inferido**: `var` en Java (desde la 10) y C#, `auto` en C++, `let` en TypeScript.
- *Duck typing*: «si camina como un pato…»: importa que el objeto tenga los métodos, no su clase (Python, JavaScript).

### Lenguajes de uso habitual en la Administración

| Lenguaje | Año | Paradigma | Tipado | Ejecución | Versión de referencia en 2026 |
|---|---|---|---|---|---|
| COBOL | 1959 | Imperativo, gestión | Estático | Compilado | ISO/IEC 1989:2023 |
| C | 1972 | Imperativo estructurado | Estático, débil | Compilado | C23 (ISO/IEC 9899:2024) |
| C++ | 1985 | Multiparadigma | Estático | Compilado | C++23 (ISO/IEC 14882:2024) |
| Python | 1991 | Multiparadigma | Dinámico, fuerte | *Bytecode* interpretado | 3.15 (9 de octubre de 2026) |
| Java | 1995 | Orientado a objetos | Estático, fuerte | *Bytecode* + JIT | **Java SE 25 (LTS, sept. 2025)**; Java 27 (sept. 2026, no LTS) |
| JavaScript | 1995 | Multiparadigma (prototipos) | Dinámico, débil | Motores con JIT | **ECMAScript 2026** (ECMA-262, 17.ª ed., junio de 2026) |
| PHP | 1995 | Multiparadigma | Dinámico | Interpretado (*bytecode* Zend) | 8.x |
| C# | 2000 | Orientado a objetos multiparadigma | Estático, fuerte | CIL + CLR | **C# 14 con .NET 10 (LTS, nov. 2025)** |
| TypeScript | 2012 | Superconjunto tipado de JavaScript | Estático gradual | Se transpila a JavaScript | — |
| Go | 2009 | Imperativo concurrente | Estático | Compilado | — |
| Rust | 2015 (1.0) | Multiparadigma, seguridad de memoria | Estático | Compilado | — |
| Kotlin | 2016 (1.0) | Orientado a objetos y funcional | Estático | JVM o nativo | — |

## Representación de tipos de datos

### Tipos simples o primitivos

**Enteros.** Se almacenan en binario con un número fijo de bits. Los negativos se representan casi siempre en **complemento a 2** (también existen signo-magnitud, complemento a 1 y exceso a K). Con *n* bits, el rango en complemento a 2 es de **−2ⁿ⁻¹ a 2ⁿ⁻¹ − 1**.

| Tipo (Java) | Bits | Rango |
|---|---|---|
| `byte` | 8 | −128 a 127 |
| `short` | 16 | −32 768 a 32 767 |
| `int` | 32 | −2 147 483 648 a 2 147 483 647 |
| `long` | 64 | −2⁶³ a 2⁶³ − 1 |
| `char` | 16 | Unidad de código UTF-16 sin signo (0 a 65 535) |

En C el tamaño de `int` depende de la implementación (mínimo 16 bits); Java fija los tamaños en su especificación. Si se supera el rango se produce **desbordamiento** (*overflow*): en Java `Integer.MAX_VALUE + 1` da `Integer.MIN_VALUE`. Python tiene enteros de **precisión arbitraria**.

> Complemento a 2 de −5 con 8 bits: +5 = `00000101` → se invierten los bits (`11111010`) → se suma 1 → **`11111011`**.

**Reales en coma flotante: IEEE 754.** El estándar **IEEE 754** (revisiones de 1985, **2008** y la vigente **2019**) representa un real como signo, exponente sesgado y mantisa (fracción) normalizada `1,f × 2^e`:

| Formato | Bits totales | Signo | Exponente (sesgo) | Fracción | Precisión decimal | Tipos |
|---|---|---|---|---|---|---|
| **Simple precisión** (binary32) | **32** | 1 | 8 (127) | 23 | ~7 dígitos | `float` |
| **Doble precisión** (binary64) | **64** | 1 | 11 (1023) | 52 | ~15-16 dígitos | `double` (Java, C, C#), `float` de Python, `Number` de JavaScript |

La revisión de **2008** añadió los formatos **decimales** (decimal32/64/128), los binarios de 16 y 128 bits y la operación *fused multiply-add*. Hay valores especiales: **±0**, **±∞** (por ejemplo, `1.0/0.0`), **NaN** (*Not a Number*, como `0.0/0.0`) y números **subnormales**. Muchos decimales no tienen representación exacta en binario: `0.1 + 0.2 == 0.3` es **falso** en Java, Python o JavaScript. Por eso los importes se guardan en tipos **decimales de coma fija**: `BigDecimal` (Java), `decimal` (C#), `Decimal` (Python), `NUMERIC(p,s)` en SQL o el decimal empaquetado (BCD) de COBOL.

> 5,75 en simple precisión: 5,75 = 101,11₂ = 1,0111 × 2². Signo 0; exponente 2 + 127 = 129 = `10000001`; fracción `0111` seguida de ceros → `0 10000001 01110000000000000000000` = **0x40B80000**.

**Caracteres.** **ASCII** usa 7 bits (128 caracteres); ISO-8859-1 (Latin-1) y ISO-8859-15 (con el símbolo del euro), 8 bits. **Unicode** (equivalente a ISO/IEC 10646) asigna un número (*code point*) a cada carácter de todas las escrituras; se codifica en **UTF-8** (1 a 4 bytes, compatible con ASCII; RFC 3629), **UTF-16** (2 o 4 bytes; el `char` de Java y C#) o **UTF-32** (4 bytes fijos).

**Lógicos** (`boolean`/`bool`): verdadero o falso. En C clásico no existían (0 es falso y cualquier otro valor, verdadero). **Enumerados** (`enum`): conjunto cerrado de constantes con nombre. **Punteros y referencias**: guardan direcciones de memoria (C y C++ permiten aritmética de punteros; Java y C# usan referencias gestionadas).

### Tipos por valor y por referencia

- **Tipos por valor**: la variable contiene el dato (primitivos de Java; `struct`, `int`, `double` en C#).
- **Tipos por referencia**: la variable contiene una **referencia** al objeto, que vive en el **montón** (*heap*) (objetos, arrays y `String` en Java; `class` en C#). Dos variables pueden apuntar al mismo objeto (*aliasing*).
- En Java los primitivos **no son objetos ni tienen métodos**: `idAlumno.equals(id)` con `int idAlumno` es un **error de compilación** (supuesto de 2026); hay que usar `==` o la clase envoltorio `Integer` (con *autoboxing*). Para comparar objetos se usa `equals()`; `==` compara referencias.
- **Tipos anulables**: en C# `int?` admite `null` (supuesto de 2024); en Java, los envoltorios (`Integer`) pueden ser `null`.

### Conversiones de tipos

- **Implícita** (promoción o ensanchamiento): de un tipo «menor» a uno «mayor» sin pérdida (`int` → `long` → `double`).
- **Explícita** (*cast*): `(int) 3.9` da **3** (trunca); puede perder información.
- **Coerción** automática en lenguajes de tipado débil: en JavaScript `"3" * "4"` da `12`, pero `"3" + 4` da `"34"`.

### Variables, constantes, ámbito y vida

- **Variable**: zona de memoria con nombre, tipo y valor modificable. **Constante**: valor que no cambia (`final` en Java, `const` en C#, JavaScript y C).
- **Ámbito** (*scope*): parte del programa donde un identificador es visible (de bloque, de función, de clase, global). **Vida** (*lifetime*): tiempo durante el que existe en memoria.
- **Asignación de memoria**: **estática** (variables globales y `static`, durante toda la ejecución), **automática** en la **pila** (variables locales; se libera al salir del bloque) y **dinámica** en el **montón** (`new`, `malloc`; se libera con `free`/`delete` o por el **recolector de basura** en Java, C#, Python y JavaScript).
- **Identificadores en Java**: letras, dígitos, `_` y **`$`**; **no pueden empezar por un dígito** ni ser palabras reservadas (`static`, `class`, `int`…); se distinguen mayúsculas y minúsculas. Comentarios: `//` de una línea, `/* … */` de varias y `/** … */` de documentación (Javadoc).

## Operadores

### Tipos de operadores

| Tipo | Operadores (familia C: Java, C#, JavaScript) | Notas |
|---|---|---|
| Aritméticos | `+ - * / %` | Entre enteros, `/` es **división entera** que trunca hacia cero en Java, C y C# (`7/2` = 3, `-7/2` = −3). Python usa `/` (real) y `//` (entera hacia abajo: `-7//2` = −4). Potencia: `**` en Python y JavaScript, `Math.pow` en Java |
| Incremento y decremento | `++ --` | Prefijo (`++i`: incrementa y luego usa) y sufijo (`i++`: usa y luego incrementa) |
| Relacionales | `== != < > <= >=` | Devuelven booleano |
| Lógicos | `&&` (Y), `\|\|` (O), `!` (NO) | **Cortocircuito**: si el primer operando decide, no se evalúa el segundo. Python: `and`, `or`, `not` |
| A nivel de bit | `&` (Y), `\|` (O), `^` (**O exclusivo, XOR**), `~` (complemento), `<<`, `>>`, `>>>` | `>>>` (Java, JavaScript): desplazamiento a la derecha sin signo. En Java, `&` y `\|` entre booleanos evalúan **siempre** ambos lados |
| Asignación | `= += -= *= /= %=` … | `x += 2` equivale a `x = x + 2` |
| Condicional (ternario) | `condición ? valor1 : valor2` | En Python: `valor1 if condición else valor2` |
| Igualdad en JavaScript | `==` (con conversión de tipos) y `===` (estricta: valor **y** tipo) | `123 == '123'` es `true`; `10 === '10'` es `false` |
| Otros | `instanceof`, `typeof`, `??` (fusión de nulos en C# y JavaScript), `?.` (navegación segura) | — |

En Python, `%` toma el signo del **divisor** (`-7 % 3` = 2) y en Java y C, el del **dividendo** (`-7 % 3` = −1).

### Precedencia y asociatividad

De mayor a menor prioridad (familia C; se evalúa primero lo de arriba): **posfijos** (`i++`, llamadas, índices) → **unarios** (`!`, `-`, `++i`, *cast*) → **multiplicativos** (`* / %`) → **aditivos** (`+ -`) → **desplazamiento** (`<< >>`) → **relacionales** (`< > <= >=`, `instanceof`) → **igualdad** (`== !=`) → `&` → `^` → `|` → `&&` → `||` → **ternario** → **asignación**. Los operadores binarios se asocian de izquierda a derecha, salvo la asignación, el ternario y la potencia `**`, que lo hacen de **derecha a izquierda** (`2 ** 3 ** 2` = 2⁹ = 512). La potencia tiene más prioridad que la multiplicación: `4 * 3 ** 2` vale **36** en JavaScript y Python (pregunta de reserva de 2023, anulada porque decía «en JSON», que no es un lenguaje ejecutable).

### Ejercicios resueltos de operadores (tipo examen)

```java
int x = 6, y = 3;
int r = x ^ y;          // ^ es XOR bit a bit, NO potencia: 110 ^ 011 = 101 → r = 5
```

```javascript
let a = 10, b = 4, c = 4;
let r = (a + b) % 2 == 0 ? c + 4 : c - 2;   // 14 % 2 = 0 → cierto → r = 8
```

```text
a=1, b=2, c=3, d=1
NOT (a == c) AND (c > b)          → NOT(falso) AND cierto → cierto
((a > b) OR (a < c)) AND ((a == c) OR (a >= b))  → (F OR V) AND (F OR F) → falso
```

| A | B | A AND B | A OR B | A XOR B | NOT A |
|---|---|---|---|---|---|
| F | F | F | F | F | V |
| F | V | F | V | V | V |
| V | F | F | V | V | F |
| V | V | V | V | F | F |

Leyes de **De Morgan**: `NOT (A AND B)` = `NOT A OR NOT B`; `NOT (A OR B)` = `NOT A AND NOT B`.

## Instrucciones condicionales

### Programación estructurada

El **teorema de Böhm-Jacopini** (1966) demuestra que cualquier algoritmo puede escribirse con solo tres estructuras de control: **secuencia**, **selección** (condicional) e **iteración** (bucle). En 1968 Dijkstra publicó *Go To Statement Considered Harmful*, base de la **programación estructurada**: bloques con **una entrada y una salida**, sin saltos incondicionales (`goto`).

### Formas de la selección

| Estructura | Uso | Ejemplo |
|---|---|---|
| Simple | Ejecuta un bloque si se cumple la condición | `if (nota >= 5) aprobados++;` |
| Doble | Uno u otro bloque | `if … else …` |
| Múltiple encadenada | Varias condiciones excluyentes en orden | `if … else if … else …` |
| Selección múltiple por valor | Elige según el valor de una expresión | `switch`/`case` (Java, C, C#, JavaScript), `match` (Python 3.10+), `CASE` (SQL) |
| Expresión condicional | Devuelve un valor | Operador ternario |

```java
// Java: switch clásico (con break para no "caer" al caso siguiente)
switch (dia) {
    case 6:
    case 7:
        tipo = "fin de semana";
        break;
    default:
        tipo = "laborable";
}

// Java 14+: switch como expresión, sin caída entre casos
String tipo = switch (dia) {
    case 6, 7 -> "fin de semana";
    default   -> "laborable";
};
```

```python
# Python: los bloques se delimitan por la SANGRÍA (mismo número de espacios)
if nota >= 5:
    print("Apto")
    aptos += 1
elif nota >= 4:
    print("Revisión")
else:
    print("No apto")

match codigo:                 # Python 3.10+: concordancia de patrones
    case "L":
        acceso = "Ingreso libre"
    case "P":
        acceso = "Promoción interna"
    case _:
        acceso = "Desconocido"
```

En C, Java y JavaScript, sin `break` la ejecución **continúa** en el siguiente `case` (*fall-through*); C# lo prohíbe salvo en casos vacíos. Java 21 añadió la **concordancia de patrones** en `switch` (`case Integer i when i > 0 ->`).

## Bucles y recursividad

### Estructuras repetitivas

| Bucle | Comprobación | Repeticiones | Lenguajes |
|---|---|---|---|
| `while` (mientras) | **Antes** de cada iteración | **0 o más** | Todos |
| `do … while` (hacer… mientras) | **Después** de cada iteración | **1 o más**: el cuerpo se ejecuta **al menos una vez** | C, C++, Java, C#, JavaScript (no existe en Python) |
| `repeat … until` (repetir… hasta) | Después; termina cuando la condición es **cierta** | 1 o más | Pascal, pseudocódigo |
| `for` con contador | Antes; inicialización, condición e incremento | Número conocido | C, Java, C#, JavaScript |
| *for-each* (para cada) | Recorre una colección o iterable | Tantas como elementos | `for (T x : lista)` en Java, `foreach` en C#, `for x in iterable` en Python, `for…of` en JavaScript |

- `break` sale del bucle; `continue` pasa a la siguiente iteración.
- En JavaScript, `for…in` recorre las **claves** (propiedades) y `for…of` los **valores** de un iterable.
- Tipos de control: por **contador**, por **centinela** (un valor especial marca el final) y por **bandera** (variable booleana).
- **Bucle infinito**: la condición nunca llega a ser falsa (por ejemplo, porque la variable de control no avanza).

```java
int i = 0;
do {
    System.out.println(i);   // se ejecuta una vez aunque la condición sea falsa
    i++;
} while (i < 0);
```

### Trazas de bucles (tipo examen)

```javascript
function prueba() {
  var i = 1, j = 0;
  while (i < 7) {   // i toma 1, 3, 5 (con 7 se sale)
    j += i;         // j: 1, 4, 9
    i += 2;
  }
  return j;         // 9
}
```

```text
integer x = 0
while x < 100 do (x = x + 1; print x; x = x - 1)
→ x vuelve siempre a 0: imprime "1" sin parar. Es un BUCLE INFINITO.
```

```python
[a * a for a in [3, 2, 1] if a > 1]     # comprensión de listas → [9, 4]
```

Método para las trazas: una tabla con una columna por variable y una fila por iteración, comprobando la condición **antes** (`while`, `for`) o **después** (`do-while`) de cada vuelta.

### Recursividad

Un subprograma es **recursivo** cuando se llama a sí mismo, directa o indirectamente. Toda definición recursiva necesita:

1. Uno o más **casos base**, que se resuelven sin recursión y detienen las llamadas.
2. Un **caso recursivo**, que reduce el problema hacia el caso base.

Cada llamada crea un **registro de activación** (parámetros, variables locales y dirección de retorno) en la **pila de llamadas**; si la recursión es muy profunda o no tiene caso base se agota la pila (`StackOverflowError` en Java; `RecursionError` en Python, cuyo límite por defecto es de unas 1000 llamadas).

| Tipo | Descripción | Ejemplo |
|---|---|---|
| Directa | El subprograma se llama a sí mismo | Factorial |
| **Indirecta o mutua** | A llama a B y B llama a A | `esPar(n)` ↔ `esImpar(n)` |
| Lineal | Una sola llamada recursiva por invocación | Factorial, búsqueda binaria recursiva |
| Múltiple (en árbol) | Varias llamadas por invocación | Fibonacci, recorridos de árboles, torres de Hanói (2ⁿ − 1 movimientos) |
| **De cola** (*tail recursion*) | La llamada recursiva es la **última** operación; el compilador puede convertirla en un bucle (**optimización de llamada de cola**) | Factorial con acumulador; Scheme la exige; Java y Python **no** la optimizan; Kotlin con `tailrec` |
| Anidada | Un argumento de la llamada es otra llamada recursiva | Función de Ackermann |

```java
static long factorial(int n) {          // recursión lineal (no de cola)
    if (n <= 1) return 1;               // caso base
    return n * factorial(n - 1);        // caso recursivo: queda una multiplicación pendiente
}

static long factorialCola(int n, long acc) {   // recursión de cola
    if (n <= 1) return acc;
    return factorialCola(n - 1, n * acc);      // la llamada es lo último que se hace
}
```

```python
from functools import lru_cache

@lru_cache(maxsize=None)      # memoización: evita recalcular (de O(2^n) a O(n))
def fib(n: int) -> int:
    return n if n < 2 else fib(n - 1) + fib(n - 2)

def misterio(n: int) -> int:
    return 0 if n <= 0 else n + misterio(n - 2)
# misterio(5) = 5 + misterio(3) = 5 + 3 + misterio(1) = 5 + 3 + 1 + misterio(-1) = 9
```

| | Recursión | Iteración |
|---|---|---|
| Claridad | Natural para problemas recursivos (árboles, divide y vencerás) | Natural para recorridos lineales |
| Memoria | Un marco de pila por llamada | Constante |
| Rendimiento | Sobrecarga de llamadas; riesgo de desbordar la pila | Normalmente más eficiente |
| Equivalencia | Todo algoritmo recursivo puede escribirse de forma iterativa (con una pila explícita si hace falta) y viceversa | — |

## Procedimientos, funciones y parámetros

### Subprogramas

Un **subprograma** (rutina, subrutina, método) es un bloque de código con nombre que realiza una tarea y puede invocarse varias veces. Favorece la **reutilización**, la **abstracción** y la **modularidad**.

| | Procedimiento | Función |
|---|---|---|
| Devuelve valor | **No** (o solo a través de parámetros de salida) | **Sí**, mediante `return` |
| Cómo se invoca | Como una **instrucción** independiente | Dentro de una **expresión** (puede ser operando) |
| Ejemplos | `void imprimir(...)` en Java/C, `PROCEDURE` en Pascal o PL/SQL | `int max(...)`, `FUNCTION` en PL/SQL |

Por tanto, una llamada a un **procedimiento no puede ser operando** de una expresión y un procedimiento **no necesita** `return` (pregunta de 2024).

### Parámetros

- **Parámetros formales**: los declarados en la cabecera del subprograma. **Parámetros reales** (actuales o **argumentos**): los valores o variables que se pasan en la llamada. Deben coincidir en número, orden y tipo (salvo parámetros por defecto o con nombre).
- **Modos** (terminología de Ada): de **entrada** (`in`), de **salida** (`out`) y de **entrada/salida** (`in out`).

| Mecanismo de paso | Qué se pasa | ¿El subprograma puede modificar la variable del llamante? | Uso |
|---|---|---|---|
| **Por valor** | Una **copia** del valor | **No** | Parámetros de entrada |
| **Por referencia** | La **dirección** (un alias de la variable) | **Sí** | Parámetros de **salida o entrada/salida**; evita copiar estructuras grandes |
| Por valor-resultado | Copia al entrar y copia de vuelta al salir | Sí, al terminar | Ada (`in out` de tipos simples) |
| Por nombre | La expresión sin evaluar, que se evalúa en cada uso | Sí | Algol 60 (histórico) |

Cómo lo hace cada lenguaje:

- **Java**: **siempre por valor**. Con objetos se copia la **referencia**: el método puede modificar el estado del objeto, pero no hacer que la variable del llamante apunte a otro.
- **C#**: por valor por defecto; por referencia con **`ref`** (la variable debe estar inicializada), **`out`** (el método **debe** asignarla) e **`in`** (referencia de solo lectura).
- **C**: solo por valor; el efecto «por referencia» se consigue pasando **punteros** (`&x`). **C++**: referencias (`int &x`, `const T &x`).
- **Python**: «por asignación» (se pasa la referencia al objeto): los objetos mutables (listas, diccionarios) pueden modificarse; los inmutables (números, cadenas, tuplas), no.
- **PL/SQL**: modos `IN`, `OUT` e `IN OUT`.

```csharp
static void Incrementar(ref int n) => n++;          // modifica la variable del llamante
static bool Dividir(int a, int b, out int cociente)  // parámetro de salida
{
    if (b == 0) { cociente = 0; return false; }
    cociente = a / b;
    return true;
}

int x = 5;
Incrementar(ref x);                         // x = 6
if (Dividir(7, 2, out int q)) { /* q = 3 */ }
```

### Otros conceptos de subprogramas

- **Variables locales y globales**; **efectos laterales** (*side effects*): un subprograma modifica algo fuera de su ámbito (una variable global, un parámetro por referencia, un fichero).
- **Función pura**: mismo resultado para los mismos argumentos y sin efectos laterales (**transparencia referencial**).
- **Sobrecarga**: varios subprogramas con el **mismo nombre** y **distinta firma** (número o tipo de parámetros) en el mismo ámbito: son **funciones sobrecargadas** (C++, Java, C#; pregunta de 2023). Python y JavaScript no la tienen (se usan parámetros por defecto).
- **Parámetros por defecto y con nombre**, **número variable de argumentos** (`int... v` en Java, `params int[] v` en C#, `*args` y `**kwargs` en Python).
- **Funciones de orden superior** (reciben o devuelven funciones), **lambdas** y **clausuras** (*closures*: funciones que «recuerdan» las variables de su entorno).

## Vectores y registros

### Vectores (arrays)

Un **vector** o **array** es una estructura de datos **estática** (tamaño fijo al crearlo), **homogénea** (todos los elementos del mismo tipo) y **lineal**, cuyos elementos se almacenan en posiciones **consecutivas de memoria** y se acceden **directamente por su índice** en tiempo constante, O(1) (definición dada por correcta en 2023).

- **Índice base 0** en C, C++, Java, C#, Python y JavaScript (el último elemento de un vector de *n* es el `n − 1`); base 1 en COBOL, Fortran o MATLAB.
- Dirección de un elemento: `dir(v[i]) = dir_base + i × tamaño_elemento`.
- **Matrices** (bidimensionales): se almacenan **por filas** (*row-major*: C, C++, Java) o **por columnas** (*column-major*: Fortran, MATLAB). Por filas, en una matriz de `F × C`: `dir(m[i][j]) = base + (i × C + j) × tamaño`.

> Ejemplo: `int m[3][4]` (enteros de 4 bytes) en la dirección 1000. `m[2][1]` está en 1000 + (2 × 4 + 1) × 4 = **1036**.

```java
int[] notas = new int[5];            // 5 enteros inicializados a 0
int[] pares = {2, 4, 6};             // declaración con inicialización
int[][] tabla = new int[3][4];       // matriz (en Java, array de arrays)
System.out.println(notas.length);    // length es un ATRIBUTO del array
// notas[5] = 1;  → ArrayIndexOutOfBoundsException (índices válidos: 0..4)
```

```c
int vector2[] = {1, 2, 3, 4, 10, 9, 80, 70, 19};   /* correcto en C y C++: el tamaño (9) se deduce */
```

```csharp
int[] arrayEnteros = new[] {1, 2, 3};   // C#: array implícitamente tipado
int[,] rectangular = new int[3, 4];     // matriz rectangular
int[][] escalonado = new int[3][];      // array de arrays (jagged)
```

**Operaciones típicas**: recorrido; **búsqueda secuencial** (O(n), sirve para vectores desordenados); **búsqueda binaria o dicotómica** (O(log₂ n), exige el vector **ordenado**: con un millón de elementos bastan unas 20 comparaciones); inserción y borrado (obligan a desplazar elementos); ordenación (tema II.3).

**Estructuras dinámicas basadas en arrays**: `ArrayList` y `List<T>` (Java, C#), `std::vector` (C++), las listas de Python o los arrays de JavaScript crecen según se necesita.

**Slice (rebanada)**: **subestructura** de un array formada por un rango de sus elementos (pregunta de 2026):

```python
v = [10, 20, 30, 40, 50]
v[1:3]     # [20, 30]   (inicio incluido, fin excluido)
v[:2]      # [10, 20]
v[::-1]    # [50, 40, 30, 20, 10]   (paso negativo: invertido)
```

En JavaScript, `slice(inicio, fin)` devuelve una copia del tramo sin modificar el original (`splice` sí lo modifica); en Go un *slice* es una vista sobre un array con longitud y capacidad.

**Cadenas**: secuencias de caracteres. En Java y C# `String` es **inmutable**: concatenar en un bucle crea muchos objetos, por eso se usa **`StringBuilder`** (supuesto de 2021).

### Registros (estructuras)

Un **registro** agrupa datos **heterogéneos** relacionados, cada uno en un **campo** con nombre (frente al vector, homogéneo y accedido por índice). Se accede con la notación punto (`opositor.nota`). Un **array de registros** es la forma básica de representar una tabla en memoria.

```c
struct Opositor {          /* C */
    char  dni[10];
    char  nombre[60];
    float nota;
};
struct Opositor op = {"12345678Z", "Emilia Pardo", 7.5f};
```

```java
// Java 16+: record = clase inmutable con constructor, accesores, equals, hashCode y toString
public record Opositor(String dni, String nombre, double nota) { }
Opositor op = new Opositor("12345678Z", "Emilia Pardo", 7.5);
double n = op.nota();
```

```cobol
       01  OPOSITOR.
           05  DNI        PIC X(9).
           05  NOMBRE     PIC X(60).
           05  NOTA       PIC 9(2)V99.
```

En COBOL los números de nivel (01, 05…) definen la jerarquía del registro y `V` marca la coma decimal implícita. En C#, `struct` es un tipo por valor y `record` (C# 9) un tipo con igualdad por valor; en Python se usan clases `dataclass`, `namedtuple` o diccionarios (`opositor['notas'][1]` accede al segundo elemento de la lista guardada en la clave `notas`). Las **uniones** (`union` en C) comparten la misma memoria para campos alternativos.

## Estructura de un programa

### Partes de un programa

Un programa imperativo clásico se organiza en:

1. **Cabecera**: nombre e información del programa (o, en lenguajes modernos, el paquete y las importaciones).
2. **Bloque de declaraciones**: constantes, tipos, variables y subprogramas.
3. **Bloque de instrucciones** (cuerpo), con instrucciones de:
   - **entrada** de datos;
   - **asignación** o **proceso** (cálculos);
   - **control**: las **alternativas** (condicionales) y las **iterativas** o repetitivas (bucles). El bloque «donde se incluyen las instrucciones iterativas» es el de **control** (pregunta de 2026);
   - **salida** de resultados.
4. **Comentarios** a lo largo del código.

```java
package es.gob.opotai;                     // paquete

import java.util.List;                     // importaciones

/** Calcula la media de las notas. */      // comentario de documentación
public class Media {
    private static final int MINIMO = 5;   // constante

    public static void main(String[] args) {          // punto de entrada
        List<Double> notas = List.of(6.5, 4.0, 8.25); // declaración y asignación
        double suma = 0;
        for (double n : notas) {                      // control iterativo
            suma += n;
        }
        double media = suma / notas.size();
        if (media >= MINIMO) {                        // control alternativo
            System.out.println("Media de apto: " + media);   // salida
        }
    }
}
```

```python
"""Módulo de ejemplo."""
import statistics

MINIMO = 5

def media(notas: list[float]) -> float:
    return statistics.mean(notas)

if __name__ == "__main__":          # solo se ejecuta al lanzar el fichero directamente
    print(media([6.5, 4.0, 8.25]))
```

Otros ejemplos de estructura: en **C**, directivas del preprocesador (`#include`), declaraciones globales y la función `int main(void)`; en **COBOL**, las cuatro divisiones **IDENTIFICATION, ENVIRONMENT, DATA y PROCEDURE**; en **Pascal**, `program`, `const`, `type`, `var`, subprogramas y el bloque `begin … end.`

### Programación modular: cohesión y acoplamiento

La **programación modular** divide el programa en **módulos** con una interfaz pública y una implementación oculta (**ocultación de información**, Parnas, 1972), diseñados **de arriba abajo** por **refinamientos sucesivos** (Wirth, 1971). El objetivo es **alta cohesión** y **bajo acoplamiento**.

| Acoplamiento (de mejor a peor) | Qué comparten los módulos |
|---|---|
| **De datos** | Solo parámetros elementales necesarios |
| **De marca** o de estampado | Una estructura de datos completa, aunque solo usen parte |
| **De control** | Un *flag* o señal que dirige la lógica del otro módulo |
| Externo | Un formato, protocolo o dispositivo externo |
| **Común** | Una **estructura global de datos** (pregunta del examen extraordinario de 2026) |
| **De contenido** | Un módulo accede o modifica el **interior** de otro (el peor) |

| Cohesión (de mejor a peor) | Por qué están juntos los elementos del módulo |
|---|---|
| **Funcional** | Contribuyen a una **única** función bien definida (la ideal) |
| Secuencial | La salida de uno es la entrada del siguiente |
| Comunicacional | Usan los mismos datos |
| Procedimental | Siguen un orden de ejecución |
| Temporal | Se ejecutan en el mismo momento (inicialización) |
| Lógica | Hacen cosas parecidas elegidas con un *flag* |
| **Casual o coincidental** | Sin relación (la peor) |

### Representación de algoritmos

- **Pseudocódigo**: lenguaje natural estructurado, independiente del lenguaje de programación.
- **Diagramas de flujo** (ordinogramas), con los símbolos de **ISO 5807**: óvalo (inicio/fin), rectángulo (proceso), rombo (decisión), paralelogramo (entrada/salida).
- **Diagramas de Nassi-Shneiderman** (de cajas, sin flechas), **tablas de decisión** y el método de **Jackson** (JSP).

### Tratamiento de errores

Los lenguajes modernos separan el flujo normal del de error con **excepciones**: `try` (código que puede fallar), `catch`/`except` (tratamiento) y `finally` (se ejecuta siempre). En Java las excepciones **comprobadas** (*checked*) deben capturarse o declararse con `throws`; las no comprobadas (`RuntimeException`) no. La liberación de recursos se automatiza con `try-with-resources` (Java) o `using` (C#).

## Normativa y estándares clave

| Estándar | Qué regula | Puntos clave |
|---|---|---|
| **IEEE 754-2019** (revisión de la de 2008) | Aritmética en coma flotante | binary32 (simple: 1 + 8 + 23 bits) y **binary64** (doble: 1 + 11 + 52 = **64 bits**); formatos decimales desde 2008; ±∞, NaN, subnormales |
| ISO/IEC 9899:2024 (C23) | Lenguaje C | Sustituye a C17; `bool`, `true` y `false` pasan a ser palabras clave |
| ISO/IEC 14882:2024 (C++23) | Lenguaje C++ | Edición publicada vigente |
| ECMA-262, 17.ª edición (ECMAScript 2026, junio de 2026) | JavaScript | Una edición al año desde 2015 (ES6) |
| *Java Language Specification* (Java SE 25 LTS; SE 27 desde septiembre de 2026) | Java | Nuevas versiones cada seis meses; LTS cada dos años |
| ECMA-334 y ECMA-335 | C# y la infraestructura común de lenguajes (CLI) | C# 14 con .NET 10 (LTS, noviembre de 2025) |
| ISO/IEC 1989:2023 | COBOL | Lenguaje de gestión aún presente en grandes sistemas de la Administración |
| Unicode / ISO/IEC 10646 y RFC 3629 | Juego de caracteres universal y codificación UTF-8 | UTF-8 de 1 a 4 bytes, compatible con ASCII |
| ISO 5807:1985 | Símbolos de diagramas de flujo | Proceso, decisión, entrada/salida, terminal |

## Lo que más cae en el examen

En los nueve exámenes oficiales analizados hay **25 preguntas** de este tema según nuestra clasificación: 16 de ingreso libre (6 en 2021, 3 en 2023, 3 en 2024, 3 en 2025 y 1 en el extraordinario) y 9 de promoción interna (varias repetidas del mismo día). Muchas están en el **supuesto práctico** del bloque III.

| Concepto | Preguntas | Exámenes |
|---|---|---|
| **Trazas de código**: bucles `while`, bucle infinito, ternario y `%` en JavaScript, expresiones lógicas, XOR `^` en Java, comprensión de listas de Python, potencia `**` (anulada) | 9 | LI 2021, 2023, 2024 y 2025; PI 2021 y 2024 |
| **Tipos y estructuras**: definición de vector, *slice*, `int` sin `equals()`, doble precisión IEEE 754 (64 bits) | 5 | LI 2023 y 2025; PI 2023, 2024 y 2025 |
| **Python**: bloques por sangría, acceso a diccionarios y listas, `import tensorflow as tf`, Keras | 4 | LI 2021 y 2025 |
| **Bucle `do…while`** (se ejecuta al menos una vez) | 2 | LI y PI 2021 |
| Paso de parámetros (**por referencia = entrada/salida**) | 1 | LI 2024 |
| Traductores (qué **no** es un transpilador) | 1 | LI 2023 |
| Identificadores de Java (pueden contener `$`) | 1 | PI 2023 |
| Estructura de un programa (bloque de **control**) | 1 | PI 2025 |
| Diseño modular (**acoplamiento común**) | 1 | LI 2025‑ext |

Patrón: preguntas de traza en las que hay que **ejecutar mentalmente** el código; los distractores son los resultados de errores típicos (confundir `^` con potencia, olvidar que el bucle se repite, contar una iteración de más o tomar el índice 1 como el primero).

## Trampas habituales

- **`^` en Java, C, C# y JavaScript es XOR**, no potencia: `6 ^ 3` = 5. La potencia es `Math.pow` o `**` (Python, JavaScript).
- **`do…while`** ejecuta el cuerpo **al menos una vez**; `while` puede no ejecutarlo nunca. Python no tiene `do…while`.
- **Índices desde 0**: el «segundo elemento» es `[1]`; el último de un vector de *n* es `[n-1]`.
- **División entera**: `7/2` es 3 entre enteros en Java y C; en Python `7/2` es 3.5 y `7//2` es 3.
- **`==` frente a `===`** en JavaScript; **`==` frente a `equals()`** en Java (referencias frente a contenido); los primitivos de Java **no tienen métodos**.
- **Paso por referencia**: permite parámetros de **entrada/salida**; el paso por valor envía una **copia**. Java pasa **siempre por valor** (también las referencias).
- **Procedimiento**: no devuelve valor, no puede ser operando de una expresión y no está obligado a `return`.
- **Transpilador**: traduce entre lenguajes de alto nivel (TypeScript → JavaScript); el *bytecode* de Java es código **intermedio**, no código máquina; **C++ es de tercera generación**.
- **IEEE 754**: doble precisión = **64 bits** (11 de exponente y 52 de fracción); simple = 32 bits.
- **Identificadores Java**: admiten `$` y `_`, no empiezan por dígito y no pueden ser palabras reservadas como `static`; los comentarios de varias líneas son `/* … */`, no `//`.
- **Sangría en Python**: delimita los bloques; no hay llaves.
- **Recursión de cola**: la llamada recursiva es lo **último** que se hace; Java y Python no la optimizan.
- **Acoplamiento común** = estructura **global** compartida; **de contenido** = un módulo modifica el interior de otro; **de control** = se pasa un *flag*.
- **`length`, `length()` y `size()`** en Java: atributo de los arrays, método de `String` y método de las colecciones.

## Repaso rápido

- Generaciones: 1GL máquina, 2GL ensamblador, 3GL alto nivel (C, C++, Java), 4GL SQL e informes, 5GL Prolog.
- Compilador (todo antes de ejecutar), intérprete (instrucción a instrucción), transpilador (fuente a fuente), compilador cruzado (otra plataforma), JIT (en ejecución).
- Java: *bytecode* + JVM; .NET: CIL + CLR; CPython: *bytecode* `.pyc`.
- Tipado estático/dinámico (cuándo se comprueba) y fuerte/débil (si se permiten mezclas implícitas).
- Complemento a 2 con n bits: −2ⁿ⁻¹ a 2ⁿ⁻¹ − 1; `int` de Java: 32 bits; `long`: 64 bits.
- IEEE 754: simple 32 bits (1+8+23, sesgo 127); doble 64 bits (1+11+52, sesgo 1023); vigente la revisión de 2019.
- `0.1 + 0.2 != 0.3`: para dinero, `BigDecimal`, `decimal` o `NUMERIC`.
- UTF-8 de 1 a 4 bytes; `char` de Java y C#: 16 bits (UTF-16).
- Precedencia: unarios > `* / %` > `+ -` > relacionales > igualdad > `&&` > `||` > ternario > asignación; `**` asocia por la derecha.
- Böhm-Jacopini: secuencia, selección e iteración bastan.
- `while` 0..n veces; `do-while` 1..n; `for` con contador; *for-each* para colecciones.
- Recursión: caso base + caso recursivo; pila de llamadas; tipos directa, indirecta, lineal, múltiple, de cola y anidada.
- Función devuelve valor y va en expresiones; procedimiento no.
- Paso por valor (copia, entrada) y por referencia (alias, entrada/salida); C#: `ref`, `out`, `in`.
- Sobrecarga: mismo nombre y distinta firma.
- Vector: estático, homogéneo, contiguo, acceso O(1) por índice; registro: heterogéneo, campos con nombre.
- Búsqueda binaria: O(log n) y vector ordenado; secuencial: O(n).
- Partes de un programa: cabecera, declaraciones e instrucciones de entrada, proceso, control (alternativas e iterativas) y salida.
- Alta cohesión (funcional) y bajo acoplamiento (de datos); el común comparte datos globales.

## Fuentes

- IEEE 754-2019, *Standard for Floating-Point Arithmetic* (grupo de trabajo IEEE MSC): https://grouper.ieee.org/groups/msc/ANSI_IEEE-Std-754-2019/background/
- Ecma International, ECMA-262 (ECMAScript 2026): https://262.ecma-international.org/
- Oracle, *The Java Language Specification* (Java SE): https://docs.oracle.com/javase/specs/
- OpenJDK, calendario de versiones de JDK: https://openjdk.org/projects/jdk/
- Microsoft Learn, documentación de C#: https://learn.microsoft.com/es-es/dotnet/csharp/
- Microsoft Learn, parámetros de métodos (`ref`, `out`, `in`): https://learn.microsoft.com/es-es/dotnet/csharp/language-reference/keywords/method-parameters
- Python Software Foundation, *The Python Language Reference*: https://docs.python.org/3/reference/
- Python.org, versiones activas: https://www.python.org/downloads/
- ISO/IEC 9899:2024 (C23): https://www.iso.org/standard/82075.html
- The Unicode Standard: https://www.unicode.org/versions/latest/
- RFC 3629, UTF-8: https://www.rfc-editor.org/rfc/rfc3629
- C. Böhm y G. Jacopini (1966), *Flow diagrams, Turing machines and languages with only two formation rules*, Communications of the ACM 9(5): https://doi.org/10.1145/355592.365646
