# III.4 · Diseño y programación orientada a objetos, patrones de diseño y UML

La **orientación a objetos** (OO) es el paradigma dominante en el desarrollo de aplicaciones de la Administración (Java y C#) y uno de los temas que más se preguntan del bloque III, tanto en el cuestionario (conceptos, patrones GoF, diagramas UML) como en el supuesto (leer un diagrama de clases, elegir modificadores de visibilidad, reconocer un patrón en un fragmento de código o el diagrama UML adecuado). El programa pide: el **diseño y la programación orientada a objetos**; sus **elementos**: objetos, clases, herencia, métodos y **sobrecarga**; sus **ventajas e inconvenientes**; los **patrones de diseño**, y el **lenguaje unificado de modelado (UML)**. Los detalles propios de Java y .NET están en III.5 y los fundamentos comunes de programación (tipos, subprogramas, paso de parámetros), en III.2.

## El paradigma orientado a objetos

### Origen y lenguajes

La OO nació con **Simula 67** (Dahl y Nygaard, Noruega), que introdujo clases, objetos y herencia, y se consolidó con **Smalltalk** (Alan Kay, Xerox PARC, años setenta), donde todo es un objeto y los objetos se comunican por mensajes. Después llegaron C++ (1985), Eiffel (Bertrand Meyer), Java (1995), C# (2000), Python, Ruby, Kotlin o Swift. Lenguajes **puros** (todo es objeto: Smalltalk, Ruby) frente a **híbridos** (con tipos primitivos o funciones sueltas: C++, Java, C#).

### Elementos del modelo de objetos (Booch)

Grady Booch distingue cuatro elementos **fundamentales** y tres **secundarios**:

| Elemento | Significado |
|---|---|
| **Abstracción** | Quedarse con las características esenciales de un objeto que lo distinguen de los demás, ignorando los detalles irrelevantes |
| **Encapsulamiento** | Agrupar datos y comportamiento en una unidad y **ocultar** la implementación interna (ocultación de información): solo se accede a través de la interfaz pública |
| **Modularidad** | Dividir el sistema en módulos cohesionados y poco acoplados (paquetes, espacios de nombres) |
| **Jerarquía** | Ordenar las abstracciones: herencia («es un») y agregación («parte de») |
| Tipificación (secundario) | Cumplimiento de los tipos de los objetos |
| Concurrencia (secundario) | Objetos activos que se ejecutan en paralelo |
| Persistencia (secundario) | Que el objeto sobreviva al programa que lo creó |

La **durabilidad** no es un elemento del modelo OO: es una propiedad ACID de las transacciones (distractor de 2023).

## Elementos y componentes del software orientado a objetos

### Objeto, clase e instancia

- **Objeto**: entidad con **estado** (valores de sus atributos), **comportamiento** (métodos) e **identidad** (es distinguible de otro aunque tenga el mismo estado).
- **Clase**: plantilla o molde que define los **atributos** y **métodos** comunes a un conjunto de objetos. Métrica v3: «describe un conjunto de objetos con propiedades similares y un comportamiento común; los objetos son instancias de las clases».
- **Instancia**: **ejemplar concreto e individualizado de una clase que posee su propio estado** (definición dada por correcta en 2026). Instanciar es crear un objeto (`new`).
- **Atributo** (campo, propiedad): dato de cada objeto. **Atributo de clase** (`static`): compartido por todas las instancias.
- **Método** (operación): función asociada a la clase. Tipos: **constructores** (inicializan el objeto; mismo nombre que la clase, sin tipo de retorno), **destructores** o finalizadores (C++; en Java y C# libera memoria el **recolector de basura**), de acceso (*getters* y *setters*), **de clase** (`static`, se invocan sin crear objeto) y **abstractos** (sin implementación).
- **Mensaje**: petición de un objeto a otro para que ejecute un método; la OO es un sistema de objetos que se comunican por mensajes.

### Visibilidad (modificadores de acceso)

| UML | Java | C# | Acceso |
|---|---|---|---|
| `+` | `public` | `public` | Desde cualquier clase |
| `#` | `protected` | `protected` | La propia clase y sus subclases (en Java, también el mismo paquete) |
| `~` | (sin modificador: *package-private*) | `internal` (mismo ensamblado) | Mismo paquete o ensamblado |
| `-` | `private` | `private` | Solo la propia clase |

Para que **otros objetos accedan directamente** a un atributo sin métodos hace falta **`public`** (supuesto de 2023), aunque el encapsulamiento aconseja atributos `private` con métodos de acceso.

### Herencia

La **herencia** permite que una clase (**subclase**, derivada o hija) incorpore los atributos y métodos de otra (**superclase**, base o padre) y añada o redefina los suyos: es la relación «**es un**». Métrica la describe como el mecanismo de las jerarquías de **generalización** (definir una superclase a partir de otras) y **especialización** (descomponer una clase en subclases).

- **Herencia simple** (una superclase) frente a **múltiple** (varias). Java y C# solo admiten herencia **simple de clases**, pero una clase puede **implementar varias interfaces**; C++ y Python admiten herencia múltiple, con el **problema del diamante** (ambigüedad cuando dos superclases heredan de un ancestro común).
- **Clase abstracta** (`abstract`): **no puede instanciarse**; puede estar **sin implementar o implementada de forma incompleta** (métodos abstractos) y sirve de base a subclases, que deben implementar lo que falta (pregunta de 2021). En UML el nombre va en *cursiva*.
- **Interfaz**: contrato de métodos que una clase se compromete a implementar (`implements` en Java; en C# se usa `:`). Desde Java 8 puede tener métodos `default` y `static`.
- **Clase final o sellada**: no se puede heredar de ella (`final class Ejercicio` en Java, supuesto de 2021; `sealed` en C#). Un método `final`/`sealed` no puede sobrescribirse.
- `super` (Java) o `base` (C#) acceden a la superclase; `this`, al objeto actual.

```java
public abstract class Empleado {                 // clase abstracta: no instanciable
    private final String nif;                    // encapsulamiento: atributo privado
    protected double sueldoBase;

    protected Empleado(String nif, double sueldoBase) {   // constructor
        this.nif = nif;
        this.sueldoBase = sueldoBase;
    }
    public String getNif() { return nif; }       // método de acceso
    public abstract double nomina();             // método abstracto: sin cuerpo
}

public interface Teletrabajable {                // interfaz
    boolean puedeTeletrabajar();
}

public final class Funcionario extends Empleado implements Teletrabajable {
    private final double complemento;

    public Funcionario(String nif, double sueldoBase, double complemento) {
        super(nif, sueldoBase);                  // llamada al constructor de la superclase
        this.complemento = complemento;
    }
    @Override
    public double nomina() { return sueldoBase + complemento; }   // sobrescritura
    @Override
    public boolean puedeTeletrabajar() { return true; }
}
```

### Polimorfismo, sobrecarga y sobrescritura

**Polimorfismo** («muchas formas»): capacidad de que un mismo mensaje produzca comportamientos distintos según el objeto que lo recibe o los argumentos. Clasificación clásica de Cardelli y Wegner:

| Tipo | Variante | Ejemplo |
|---|---|---|
| **Ad hoc** | **Sobrecarga** (*overloading*): mismo nombre, **distinta lista de parámetros** (número, tipo u orden) en el mismo ámbito; se resuelve en **compilación** | `sumar(int, int)` y `sumar(double, double)` |
| Ad hoc | Coerción: conversión implícita de tipos | `3 + 2.5` |
| **Universal** | **Paramétrico** (genericidad) | `List<T>` |
| Universal | **De inclusión o subtipos**: **sobrescritura** (*overriding*) de un método heredado, con **la misma firma**, resuelta en **ejecución** por **ligadura dinámica** | `empleado.nomina()` ejecuta la versión de `Funcionario` o de `Laboral` |

| | Sobrecarga (*overloading*) | Sobrescritura (*overriding*) |
|---|---|---|
| Dónde | Misma clase (o jerarquía) | Subclase respecto de la superclase |
| Firma | **Distintos parámetros** | **Misma** lista de parámetros y tipo de retorno compatible |
| Resolución | En compilación (ligadura **estática**) | En ejecución (ligadura **dinámica**) |
| Anotación | — | `@Override` (Java), `override` (C#, que exige `virtual` en la base) |

> En 2026 se preguntó qué es definir en la subclase un método **con la misma lista de parámetros** que en la superclase para especializarlo: **sobrescritura**. En 2021 (promoción interna) el tribunal dio como respuesta «**polimorfismo**» a «usar el mismo nombre de método con distintos parámetros», que es la **sobrecarga** entendida como polimorfismo ad hoc: si «sobrecarga» no está entre las opciones, la respuesta es polimorfismo.

```java
public class Calculadora {
    int sumar(int a, int b)             { return a + b; }        // sobrecarga
    double sumar(double a, double b)    { return a + b; }
    int sumar(int a, int b, int c)      { return a + b + c; }
}

List<Empleado> plantilla = List.of(new Funcionario("1A", 1800, 400), new Laboral("2B", 1700));
for (Empleado e : plantilla) {
    System.out.println(e.nomina());     // polimorfismo de inclusión: ligadura dinámica
}
```

### Relaciones entre clases

| Relación | Significado | Notación UML |
|---|---|---|
| **Asociación** | Enlaces entre objetos de dos clases (la relación más general): «una Persona trabaja para una Empresa»; con nombre, roles, **multiplicidad** y navegabilidad | Línea continua (flecha abierta si es navegable en un sentido) |
| **Agregación** | Relación **todo-parte** débil: la parte puede existir sin el todo y compartirse | Línea con **rombo blanco** en el lado del **todo** |
| **Composición** | Agregación **fuerte**: la parte pertenece a un solo todo y **comparte su ciclo de vida** (muere con él) | Línea con **rombo negro** en el lado del todo |
| **Generalización** (herencia) | «Es un»: la subclase hereda propiedades, comportamiento y relaciones de la superclase y puede añadir los suyos | Línea **continua** con **triángulo blanco** apuntando a la superclase |
| **Realización** | Una clase implementa una interfaz | Línea **discontinua** con triángulo blanco |
| **Dependencia** | Una clase **usa** a otra temporalmente (parámetro, variable local) | Línea **discontinua** con flecha abierta |

Métrica v3 define la **agregación** como «relación jerárquica entre un objeto que representa la totalidad y las partes que lo componen» y la **composición** como «una forma de agregación donde la relación de propiedad es más fuerte, e incluso coinciden los tiempos de vida». Por eso se anuló en 2023 una pregunta que admitía ambas respuestas. «Dispersión» no es ningún tipo de asociación UML (distractor de 2021).

### Componentes software

Por encima de las clases está el **componente**: una **unidad de software independiente y desplegable** que ofrece servicios a través de **interfaces** bien definidas (**interfaces proporcionadas**) y declara las que necesita (**interfaces requeridas**). Según la definición clásica de Szyperski, es «una unidad de composición con interfaces especificadas contractualmente y solo dependencias de contexto explícitas». Métrica v3 lo define como «un módulo de software que puede ser código fuente, código binario, un ejecutable o una librería con una interfaz definida».

- **Desarrollo basado en componentes** (CBSE): construir sistemas **ensamblando** componentes reutilizables, propios o de terceros (COTS), en lugar de programarlo todo.
- Modelos de componentes: **JavaBeans** y **Enterprise JavaBeans** (Jakarta EE), **ensamblados** (*assemblies*) de .NET, COM/DCOM de Microsoft, OSGi, componentes web (Angular, React) y, a mayor escala, servicios y microservicios.
- Ventajas: reutilización, sustitución de un componente por otro con la misma interfaz, desarrollo en paralelo; riesgos: dependencia de terceros, versiones e integración.
- En UML se representan en el **diagrama de componentes** (interfaces con la notación de «piruleta» y «enchufe») y su ubicación física en el de **despliegue**.

### Del análisis al diseño orientado a objetos

1. **Análisis OO** (OOA): identificar las **clases candidatas** a partir de los **sustantivos** de los requisitos y los casos de uso, y sus **responsabilidades** a partir de los **verbos**. Las tarjetas **CRC** (Clase, Responsabilidades, Colaboradores) ayudan a repartirlas.
2. **Diseño OO** (OOD): decidir atributos, métodos, visibilidad, relaciones, interfaces y patrones; refinar con los principios SOLID y GRASP; añadir clases de diseño (controladores, DAO, servicios).
3. **Programación OO** (OOP): implementar en un lenguaje OO y probar cada clase.

### Diseño orientado a objetos: principios

**Bajo acoplamiento y alta cohesión** (tema III.2) siguen siendo la base. Además:

| Principio SOLID (Robert C. Martin) | Enunciado |
|---|---|
| **S**RP, responsabilidad única | Una clase debe tener **un único motivo para cambiar** |
| **O**CP, abierto/cerrado (Meyer) | Abierto a la **extensión**, cerrado a la **modificación** |
| **L**SP, sustitución de Liskov | Los subtipos deben poder **sustituir** a su tipo base sin alterar la corrección del programa |
| **I**SP, segregación de interfaces | Mejor varias interfaces específicas que una general; ningún cliente debe depender de métodos que no usa |
| **D**IP, inversión de dependencias | Los módulos de **alto nivel no deben depender de los de bajo nivel: ambos deben depender de abstracciones** (pregunta de 2026); base de la **inyección de dependencias** |

Otros principios: **favorecer la composición sobre la herencia** (GoF), **programar contra interfaces y no contra implementaciones**, **DRY** (*Don't Repeat Yourself*), **KISS**, **YAGNI** y la **Ley de Demeter** («habla solo con tus amigos inmediatos»).

**GRASP** (*General Responsibility Assignment Software Patterns*, Craig Larman) son **patrones generales para asignar responsabilidades** en el diseño OO (pregunta de 2023): **Experto en información** (la responsabilidad va a la clase que tiene la información), **Creador** (quién crea instancias de una clase), **Controlador** (quién recibe y coordina los eventos del sistema), **Bajo acoplamiento**, **Alta cohesión**, **Polimorfismo**, **Fabricación pura** (clase artificial para mantener cohesión), **Indirección** y **Variaciones protegidas**.

## Ventajas e inconvenientes de la orientación a objetos

| Ventajas | Inconvenientes |
|---|---|
| **Reutilización** (herencia, composición, bibliotecas y *frameworks*) | **Curva de aprendizaje** y necesidad de buen diseño previo |
| **Mantenibilidad** y **extensibilidad**: el encapsulamiento limita el impacto de los cambios | **Sobrecarga** de rendimiento y memoria (objetos, llamadas indirectas, recolección de basura) |
| Modelado **cercano al mundo real** y continuidad entre análisis, diseño e implementación (mismos conceptos en todo el ciclo) | Riesgo de **sobreingeniería**: jerarquías profundas y demasiadas abstracciones |
| **Modularidad**: trabajo en equipo por clases y paquetes | **Herencia frágil**: cambiar una superclase rompe las subclases |
| **Robustez y seguridad** del estado gracias a la ocultación | **Desajuste de impedancia objeto-relacional**: los objetos no encajan directamente en tablas, lo que obliga a usar ORM (JPA, Entity Framework) |
| Facilita probar unidades aisladas (con interfaces y dobles de prueba) | Programas más grandes y, a veces, más difíciles de seguir (flujo repartido entre muchas clases) |

## Patrones de diseño

### Concepto

Un **patrón de diseño** es una **solución probada y reutilizable a un problema recurrente** de diseño en un contexto determinado, con un **nombre**, el **problema**, la **solución** y sus **consecuencias**. La idea viene del arquitecto Christopher Alexander y se popularizó con el libro *Design Patterns: Elements of Reusable Object-Oriented Software* (1994) de la **«Banda de los Cuatro» (GoF)**: Gamma, Helm, Johnson y Vlissides, que describe **23 patrones** en tres categorías.

### Los 23 patrones GoF

| Creacionales (5): cómo **crear** objetos | Estructurales (7): cómo **componer** clases y objetos | De comportamiento (11): cómo **interactúan** y se reparten responsabilidades |
|---|---|---|
| **Abstract Factory** | **Adapter** | Chain of Responsibility |
| **Builder** | Bridge | Command |
| **Factory Method** | **Composite** | Interpreter |
| Prototype | **Decorator** | **Iterator** |
| **Singleton** | **Facade** | Mediator |
| | Flyweight | Memento |
| | **Proxy** | **Observer** |
| | | State |
| | | **Strategy** |
| | | **Template Method** |
| | | Visitor |

| Patrón | Intención (lo que preguntan) |
|---|---|
| **Singleton** | Garantiza que una clase tenga **una única instancia** y un punto de acceso global a ella |
| **Factory Method** | Define una interfaz para **crear un objeto** pero deja a las **subclases** decidir qué clase concreta instanciar: crea objetos de **un mismo tipo** (producto) |
| **Abstract Factory** | Interfaz para crear **familias de objetos relacionados** sin especificar sus clases concretas (pregunta de 2026: Factory Method crea objetos de un mismo tipo; Abstract Factory, de una misma **familia**). Ambos son **creacionales** |
| **Builder** | Separa la **construcción paso a paso** de un objeto complejo de su representación (supuesto de 2026: un método que crea carpetas, documentos e índice de un expediente) |
| Prototype | Crea objetos **clonando** un prototipo |
| **Adapter** | Convierte la interfaz de una clase en **otra que esperan los clientes**; permite **reutilizar** una clase o biblioteca existente con una interfaz incompatible (supuesto de 2023: librería heredada de Cl@ve) |
| Bridge | Separa una abstracción de su implementación para que varíen independientemente |
| **Composite** | Compone objetos en **estructuras de árbol** (parte-todo) y permite tratar igual los objetos simples y los compuestos mediante una **interfaz común** |
| **Decorator** | **Añade responsabilidades a un objeto dinámicamente**, de forma transparente y sin afectar a otros objetos; alternativa flexible a la herencia |
| **Facade** | Proporciona una **interfaz unificada y simplificada** a un conjunto de interfaces de un subsistema |
| Flyweight | Comparte objetos de grano fino para ahorrar memoria |
| **Proxy** | Proporciona un **sustituto o representante** de otro objeto para **controlar el acceso** a él (remoto, virtual, de protección) |
| Chain of Responsibility | Pasa una petición por una cadena de manejadores hasta que uno la atiende |
| Command | Encapsula una petición como objeto (deshacer, colas, registro) |
| **Iterator** | Accede **secuencialmente** a los elementos de un agregado **sin exponer su representación** interna |
| Mediator | Centraliza la comunicación entre objetos para reducir su acoplamiento |
| Memento | Captura y restaura el estado interno de un objeto sin violar el encapsulamiento |
| **Observer** | Dependencia **uno a muchos**: cuando un **sujeto** cambia de estado, **notifica automáticamente** a sus observadores, con **acoplamiento débil** (pregunta de 2026). Base del modelo publicador-suscriptor y de los eventos |
| State | El objeto cambia su comportamiento cuando cambia su estado interno |
| **Strategy** | Define una familia de **algoritmos intercambiables** y encapsula cada uno |
| **Template Method** | Define el **esqueleto** de un algoritmo en la superclase y deja que las subclases redefinan algunos pasos |
| Visitor | Añade operaciones a una estructura de objetos sin modificar sus clases |

**Cómo distinguir los que se confunden**: Decorator **añade** funcionalidad manteniendo la interfaz; Adapter **cambia** la interfaz; Proxy **controla el acceso** con la misma interfaz; Facade **simplifica** un subsistema; Composite construye **árboles** de objetos tratados uniformemente (un distractor de 2024 le atribuía la definición del Decorator).

```java
// Singleton seguro en concurrencia (inicialización bajo demanda con clase interna)
public final class Configuracion {
    private Configuracion() { }                                   // constructor privado
    private static class Holder { static final Configuracion INSTANCIA = new Configuracion(); }
    public static Configuracion getInstance() { return Holder.INSTANCIA; }
}

// Observer
interface Observador { void actualizar(String estado); }
class Expediente {
    private final List<Observador> observadores = new ArrayList<>();
    void suscribir(Observador o) { observadores.add(o); }
    void cambiarEstado(String nuevo) {
        observadores.forEach(o -> o.actualizar(nuevo));          // notificación automática
    }
}

// Decorator: añade comportamiento sin modificar la clase original
interface Notificador { void enviar(String msg); }
class NotificadorEmail implements Notificador {
    public void enviar(String msg) { /* envía correo */ }
}
class NotificadorConSms implements Notificador {
    private final Notificador envuelto;
    NotificadorConSms(Notificador envuelto) { this.envuelto = envuelto; }
    public void enviar(String msg) { envuelto.enviar(msg); /* y además envía SMS */ }
}
Notificador n = new NotificadorConSms(new NotificadorEmail());

// Adapter: reutiliza una librería heredada con una interfaz incompatible
interface ServicioIdentificacion { boolean validar(String usuario, String pin); }
class AdaptadorLibreriaAntigua implements ServicioIdentificacion {
    private final LibreriaAntigua lib = new LibreriaAntigua();
    public boolean validar(String usuario, String pin) {
        return lib.checkCredentials(usuario + ":" + pin) == 0;  // traduce la llamada
    }
}
```

### Otros patrones que aparecen en el examen

| Familia | Patrones |
|---|---|
| **Arquitectura** | **MVC** (Modelo-Vista-Controlador; Ruby on Rails, Spring MVC, ASP.NET Core MVC), MVP, **MVVM** (WPF, .NET MAUI, Angular), arquitectura en **capas**, hexagonal (puertos y adaptadores), microservicios, publicación-suscripción, inyección de dependencias e inversión de control (IoC) |
| **Java EE / empresariales** | **DAO** (*Data Access Object*: encapsula el acceso a datos), **DTO** o *Transfer Object*, *Front Controller*, *Service Locator*, *Business Delegate*, *Session Facade* |
| Persistencia (Fowler) | *Repository*, *Unit of Work*, *Active Record*, *Data Mapper*, *Lazy Load* |
| **Antipatrones** | Objeto Dios (*God Object*), código espagueti, *Golden Hammer*, *copy-paste programming*, acoplamiento circular |

## El lenguaje unificado de modelado (UML)

### Qué es

**UML** (*Unified Modeling Language*) es un **lenguaje gráfico** para **especificar, visualizar, construir y documentar** los artefactos de un sistema software (y también de negocio). Se basa en el **paradigma orientado a objetos**, es **independiente de la metodología** y del **lenguaje de programación**, y cubre tanto el modelado **estático** (estructura) como el **dinámico** (comportamiento): es falso que «muestre únicamente el modelado estático» (2024).

- Lo crearon **Grady Booch, James Rumbaugh e Ivar Jacobson** («los tres amigos», Rational Software) unificando los métodos Booch, OMT y OOSE; el **OMG** lo adoptó como estándar en **1997 (UML 1.1)**.
- **UML 2.0** (2005) reorganizó el lenguaje; **la última versión formal es UML 2.5.1 (diciembre de 2017)**; UML 2.5 se publicó en 2015. ISO lo recoge como **ISO/IEC 19505** (partes 1 y 2, edición de 2012, correspondiente a UML 2.4.1).
- Mecanismos de extensión: **estereotipos** (`«entity»`, `«boundary»`, `«control»`), **valores etiquetados** y **restricciones** (en **OCL**, *Object Constraint Language*), agrupados en **perfiles**.
- El **Proceso Unificado** (RUP) es la metodología de Rational que usa UML: dirigido por casos de uso, centrado en la arquitectura, iterativo e incremental (tema III.9).

### Los 14 diagramas de UML 2.5

| Estructurales (estáticos) | Para qué | De comportamiento (dinámicos) | Para qué |
|---|---|---|---|
| **Clases** | Clases, atributos, operaciones y relaciones: la estructura del sistema | **Casos de uso** | Funcionalidad vista por los **actores** (requisitos funcionales) |
| **Objetos** | Instancias y enlaces en un **momento concreto** (una «foto» del diagrama de clases) | **Actividades** | Flujos de trabajo y algoritmos (acciones, decisiones, paralelismo, calles) |
| **Paquetes** | Agrupación de elementos y **dependencias** entre paquetes | **Máquina de estados** | **Estados** de un objeto, **transiciones** y **eventos** que las provocan |
| **Componentes** | Cómo el sistema se divide en **componentes** y las **dependencias** entre ellos | **Secuencia** (interacción) | **Mensajes** entre objetos **ordenados en el tiempo** |
| **Despliegue** | **Nodos hardware** y entorno de ejecución, y los artefactos desplegados en ellos | **Comunicación** (antes «colaboración», interacción) | Mensajes numerados destacando los **enlaces** entre objetos |
| Estructura compuesta | Estructura interna de una clase (partes, puertos, conectores) | **Tiempos** (interacción) | Cambios de estado en función del **tiempo** |
| Perfiles | Extensiones del metamodelo (estereotipos) | Visión global de la interacción | Combina actividades e interacciones |

Asociaciones típicas del examen: **interacción entre objetos mediante mensajes** → **secuencia** (2026); **acciones de un flujo** (autenticarse, firmar, guardar, registrar, generar justificante) → **secuencia** (supuesto de 2024) o actividades; **estados de un objeto, transiciones y eventos** → **máquina de estados** (2023); **división en componentes y dependencias** → **componentes** (2023); **hardware y nodos** → **despliegue**.

### Diagrama de clases: notación

```text
┌───────────────────────────────┐
│ «entity»                      │   ← estereotipo
│ Solicitud                     │   ← nombre (en cursiva si es abstracta)
├───────────────────────────────┤
│ - id : Long                   │   ← atributos: visibilidad nombre : tipo
│ - fecha : LocalDate           │
│ # estado : Estado = PRESENTADA│
├───────────────────────────────┤
│ + presentar() : void          │   ← operaciones
│ + subsanar(doc : Documento)   │
│ + contar() : int              │   ← subrayado = estático (de clase)
└───────────────────────────────┘
```

- Visibilidad: **`+` pública, `-` privada** (pregunta de 2026), **`#` protegida**, `~` de paquete.
- **Multiplicidad** en cada extremo de la asociación: `1`, `0..1`, `*` o `0..*`, `1..*`, `n..m`.
- La multiplicidad colocada junto a una clase indica **cuántas instancias de esa clase** se relacionan con **una** instancia de la clase del otro extremo.

> Lectura tipo supuesto (2023): «cada trámite pertenece a una única solicitud de representación y una solicitud puede no tener trámites o tener varios». En el extremo de **Trámite** va `0..N` (o `0..*`) y en el extremo de **Solicitud de representación** va `1`.

```text
SolicitudRepresentacion 1 ─────────────── 0..* Tramite
Expediente ◆───────── 1..* Documento        (composición: el documento muere con el expediente)
Departamento ◇──────── 0..* Empleado        (agregación: el empleado existe sin el departamento)
Funcionario ──────────▷ Empleado            (generalización)
Funcionario - - - - - ▷ Teletrabajable      (realización de una interfaz)
```

### Diagrama de casos de uso

Contiene **actores** (personas, sistemas externos o temporizadores que interactúan con el sistema; se dibujan como un «hombre de palo»), **casos de uso** (elipses: secuencias de acciones que producen un resultado observable y valioso para un actor) y **relaciones**; opcionalmente, el **límite del sistema**. No contiene almacenes ni procedimientos (pregunta de 2021).

| Relación | Significado | Dirección de la flecha |
|---|---|---|
| Asociación (comunicación) | El actor participa en el caso de uso | Línea actor–caso |
| **«include»** («usa» en Métrica) | Comportamiento **común y obligatorio** extraído a otro caso | Del caso **base** al **incluido** |
| **«extend»** («extiende» en Métrica) | Comportamiento **opcional o condicional** que amplía al base en un punto de extensión | Del caso que **extiende** al **base** |
| Generalización | Entre actores o entre casos de uso | Hacia el más general |

### Diagramas de interacción, estados y actividades

- **Secuencia**: **líneas de vida** verticales (objetos), **barras de activación**, mensajes **síncronos** (flecha rellena), **asíncronos** (flecha abierta) y de **retorno** (discontinua), creación y destrucción de objetos, y **fragmentos combinados**: `alt` (alternativa), `opt` (opcional), `loop` (bucle), `par` (paralelo), `ref` (referencia a otro diagrama).
- **Comunicación**: la misma información que el de secuencia pero centrada en los **enlaces**; el orden se indica numerando los mensajes (1, 1.1, 2…).
- **Máquina de estados**: **estados** (rectángulos redondeados), **transiciones** etiquetadas `evento [condición] / acción`, **estado inicial** (círculo negro; solo uno), **estados finales** (círculo con anillo; puede haber varios), estados compuestos e historia (`H`).
- **Actividades**: nodo inicial y final, acciones, **decisión y fusión** (rombos), **bifurcación y unión** (barras para paralelismo) y **particiones o calles** (*swimlanes*) por responsable.

### Ejercicio resuelto: del enunciado al diagrama de clases

Enunciado: «Un **ciudadano** presenta **solicitudes**; cada solicitud pertenece a un único ciudadano y lleva **uno o varios documentos**, que no tienen sentido fuera de su solicitud. Las solicitudes se tramitan en una **unidad**, que puede tener cero o muchas solicitudes. Hay dos tipos de ciudadano: **persona física** (con NIF) y **persona jurídica** (con CIF y representante). Cuando una solicitud cambia de estado hay que avisar al ciudadano por correo y por la carpeta ciudadana».

1. **Clases** (sustantivos): Ciudadano (abstracta), PersonaFisica, PersonaJuridica, Solicitud, Documento, Unidad.
2. **Relaciones y multiplicidades**:
   - Ciudadano `1` —— `0..*` Solicitud (asociación).
   - Solicitud ◆ `1..*` Documento (**composición**: el documento no existe sin su solicitud).
   - Unidad `1` —— `0..*` Solicitud.
   - PersonaFisica y PersonaJuridica ——▷ Ciudadano (**generalización**).
3. **Comportamiento**: el aviso por varios canales al cambiar de estado sugiere el patrón **Observer** (la solicitud es el sujeto; los notificadores, los observadores); el ciclo de vida (presentada, en subsanación, resuelta, archivada) se documentaría con un **diagrama de máquina de estados**, y el flujo de presentación (autenticación, firma, registro, justificante) con un **diagrama de secuencia**.

```text
             ┌──────────────┐
             │ «abstract»   │
             │  Ciudadano   │ 1 ─────────── 0..* ┌────────────┐ 0..* ─────── 1 ┌────────┐
             └──────▲───────┘                    │ Solicitud  │                │ Unidad │
          ┌─────────┴─────────┐                  └─────◆──────┘                └────────┘
 ┌─────────────┐     ┌────────────────┐                │ 1..*
 │PersonaFisica│     │PersonaJuridica │          ┌────────────┐
 └─────────────┘     └────────────────┘          │ Documento  │
                                                 └────────────┘
```

![Diagrama de clases UML del ejercicio: Ciudadano, abstracta, con las subclases PersonaFisica y PersonaJuridica; Ciudadano 1 a 0..* Solicitud; Unidad 1 a 0..* Solicitud; composición de Solicitud con 1..* Documento; agregación de Solicitud con 0..* Notificador, interfaz que realizan NotificadorCorreo y NotificadorCarpeta (patrón Observer)](diagramas/III.4-clases-solicitud.svg)

*Figura: el ejercicio resuelto como diagrama de clases UML, con generalización, composición, agregación, realización y multiplicidades.*

![Diagrama de secuencia UML: el ciudadano accede al trámite en la sede electrónica, que lo identifica con Cl@ve; rellena el formulario, la sede pide a AutoFirma la firma y AutoFirma solicita al ciudadano el certificado y el PIN; la sede registra la solicitud en el registro electrónico, que devuelve número, fecha y hora, y entrega el justificante](diagramas/III.4-secuencia-presentacion.svg)

*Figura: el flujo de presentación del ejercicio como diagrama de secuencia (mensajes síncronos en línea continua y respuestas en discontinua).*

### UML en Métrica v3

Métrica v3 usa UML en el desarrollo orientado a objetos:

| Técnica de Métrica | Uso | Definición de Métrica |
|---|---|---|
| **Casos de uso** | ASI: capturar requisitos funcionales desde el punto de vista del usuario | Relaciones «usa» y «extiende» entre casos de uso |
| **Diagrama de clases** | ASI y DSI: aspectos **estáticos** con abstracción, generalización y agregación | No muestra información temporal; para eso, el de transición de estados |
| **Diagrama de interacción** (secuencia y colaboración) | ASI y DSI: comportamiento dinámico mediante paso de mensajes | **«Describe en detalle un determinado escenario de un caso de uso»** (pregunta de 2023) |
| **Diagrama de transición de estados** | Comportamiento dependiente del tiempo | Estados de un componente y eventos que provocan el cambio |
| **Diagrama de paquetes** | Organizar casos de uso, clases o componentes en subsistemas | Las dependencias entre paquetes **no son transitivas** |
| **Diagrama de componentes** | DSI: visión física de la construcción | Componentes software, interfaces y dependencias |
| **Diagrama de despliegue** | DSI: particiones físicas (nodos) y asignación de componentes | Nodos (cubos) y conexiones |

Métrica clasifica los objetos con los estereotipos de Jacobson: **entidad**, **límite o interfaz** y **control**. Las reglas para pasar del **modelo de clases** a tablas son las «reglas de transformación» (tema III.1).

## Normativa y estándares clave

| Estándar | Qué regula | Puntos clave |
|---|---|---|
| **OMG UML 2.5.1** (diciembre de 2017) | Lenguaje unificado de modelado | 14 diagramas (7 estructurales y 7 de comportamiento); estereotipos y perfiles; OCL para restricciones |
| ISO/IEC 19505-1 y 19505-2:2012 | UML 2.4.1 como norma ISO | Infraestructura y superestructura |
| ISO/IEC 19507 | OCL (*Object Constraint Language*) | Restricciones formales sobre modelos UML |
| Métrica v3 | Metodología de la Administración | Casos de uso, clases, interacción, transición de estados, paquetes, componentes, despliegue |
| Gamma, Helm, Johnson y Vlissides (1994) | Patrones de diseño GoF | 23 patrones: 5 creacionales, 7 estructurales y 11 de comportamiento |
| Larman (GRASP) y Martin (SOLID) | Principios de asignación de responsabilidades y diseño | Experto, Creador, Controlador…; SRP, OCP, LSP, ISP y DIP |

## Lo que más cae en el examen

En los nueve exámenes analizados hay **38 preguntas** de este tema según nuestra clasificación: 25 de ingreso libre (5 en 2021, 9 en 2023, 4 en 2024, 2 en 2025 y 5 en el extraordinario) y 13 de promoción interna, muchas en el supuesto del bloque III.

| Concepto | Preguntas | Exámenes |
|---|---|---|
| **UML**: qué representa cada diagrama (secuencia, estados, componentes, casos de uso), características generales, versión 2.5, visibilidad `-` | 12 | LI 2021, 2023, 2024 y 2025‑ext; PI 2021, 2023 y 2024 |
| **Patrones GoF**: Decorator, Composite, Observer, Adapter, Builder, Iterator, Factory Method frente a Abstract Factory | 9 | LI 2021, 2023, 2024, 2025 y 2025‑ext; PI 2021 y 2024 |
| **Conceptos OO**: clase abstracta, `implements`, `final class`, visibilidad `public`, instancia, sobrescritura, sobrecarga como polimorfismo, generalización, elementos del modelo de objetos | 11 | Todos los años |
| **Diagrama de clases y multiplicidades** en el supuesto y relaciones de Métrica v3 (interacción, composición/agregación anulada) | 4 | LI 2023; PI 2023 |
| **Principios de diseño**: GRASP y DIP | 3 | LI 2023 y 2025‑ext; PI 2023 |

Patrón: definiciones de patrones GoF con los distractores de otro patrón (Facade, Proxy o Iterator en lugar de Decorator; la definición del Decorator para el Composite), elección del diagrama UML para una situación descrita y conceptos básicos de Java aplicados a la OO.

## Trampas habituales

- **Sobrecarga ≠ sobrescritura**: sobrecarga = mismo nombre y **distintos parámetros** (compilación); sobrescritura = **misma firma** en la subclase (ejecución, ligadura dinámica). Si no aparece «sobrecarga», la respuesta para «mismo nombre, distintos parámetros» es **polimorfismo**.
- **Clase abstracta**: no se instancia, puede estar incompleta y **sí** puede extenderse; existe el modificador `abstract` en Java.
- En Java las interfaces se implementan con **`implements`**; las clases se heredan con `extends`; para impedir la herencia, **`final`**.
- **Factory Method** crea un producto (un tipo) y delega en subclases; **Abstract Factory** crea **familias** de productos relacionados. Ambos son **creacionales** (no de comportamiento).
- **Iterator** y **Observer** son de **comportamiento**; **Adapter, Composite, Decorator, Facade y Proxy**, estructurales; **Builder, Singleton, Prototype** y las factorías, creacionales.
- **Decorator** añade responsabilidades dinámicamente; **Composite** compone árboles; **Facade** unifica interfaces; **Proxy** controla el acceso.
- **UML no es solo estático** ni una metodología: es un lenguaje de modelado independiente del proceso. Última versión: **2.5.1**.
- **Generalización** = línea **continua** con triángulo blanco; la discontinua es realización o dependencia.
- **Composición** (rombo negro, ciclo de vida compartido) frente a **agregación** (rombo blanco); según Métrica la composición es una forma de agregación.
- **«include»** va del caso base al incluido (obligatorio); **«extend»**, del que extiende al base (opcional).
- **Diagrama de objetos**: una instantánea de instancias; **de despliegue**: hardware y nodos; **de componentes**: módulos software y dependencias.
- **GRASP** asigna responsabilidades; **SOLID** son principios de diseño de clases; **DIP**: alto y bajo nivel dependen de abstracciones (no confundir con SRP o ISP).
- **Durabilidad** no es un elemento del modelo OO (es ACID); sí lo son abstracción, encapsulamiento, modularidad y jerarquía.

## Repaso rápido

- Objeto = estado + comportamiento + identidad; clase = plantilla; instancia = ejemplar concreto con estado propio.
- Pilares: abstracción, encapsulamiento, herencia y polimorfismo (Booch: abstracción, encapsulamiento, modularidad y jerarquía).
- Visibilidad UML: `+` pública, `-` privada, `#` protegida, `~` paquete.
- Java y C#: herencia simple de clases y múltiple de interfaces; C++: herencia múltiple.
- Abstracta: no instanciable; interfaz: contrato; `final`/`sealed`: no heredable.
- Polimorfismo ad hoc (sobrecarga, coerción) y universal (paramétrico, de inclusión con ligadura dinámica).
- Relaciones: asociación, agregación (◇), composición (◆), generalización (triángulo, línea continua), realización (triángulo, línea discontinua), dependencia (flecha discontinua).
- SOLID: SRP, OCP, LSP, ISP, DIP. GRASP: Experto, Creador, Controlador, Bajo acoplamiento, Alta cohesión, Polimorfismo, Fabricación pura, Indirección, Variaciones protegidas.
- GoF (1994): 23 patrones = 5 creacionales + 7 estructurales + 11 de comportamiento.
- Singleton (una instancia), Builder (construcción paso a paso), Adapter (adapta interfaces), Decorator (añade responsabilidades), Composite (árboles), Facade (interfaz simple), Proxy (controla acceso), Observer (notifica cambios), Strategy (algoritmos intercambiables), Iterator (recorre sin exponer).
- MVC: modelo, vista y controlador; DAO encapsula el acceso a datos; DTO transporta datos.
- UML: Booch, Rumbaugh y Jacobson; OMG 1997; versión vigente 2.5.1 (2017); 14 diagramas.
- Secuencia = mensajes en el tiempo; máquina de estados = estados, transiciones y eventos; componentes = módulos y dependencias; despliegue = nodos.
- Métrica v3: el diagrama de interacción describe en detalle un escenario de un caso de uso.

## Fuentes

- Object Management Group, *Unified Modeling Language* (versiones y especificación 2.5.1): https://www.omg.org/spec/UML/
- ISO/IEC 19505-2:2012 (UML 2.4.1, superestructura): https://www.iso.org/standard/52854.html
- Métrica v3 · Técnicas y prácticas (casos de uso, diagrama de clases, interacción, estados, componentes, despliegue): https://administracionelectronica.gob.es/pae_Home/va/dam/jcr:da7d91fa-d6bd-467c-be32-a72e27c603b3/METRICA_V3_Tecnicas.pdf
- Oracle, *The Java Tutorials*: conceptos de programación orientada a objetos: https://docs.oracle.com/javase/tutorial/java/concepts/
- Oracle, *The Java Tutorials*: herencia, interfaces y clases abstractas: https://docs.oracle.com/javase/tutorial/java/IandI/
- Microsoft Learn, programación orientada a objetos en C#: https://learn.microsoft.com/es-es/dotnet/csharp/fundamentals/tutorials/oop
- L. Cardelli y P. Wegner (1985), *On understanding types, data abstraction, and polymorphism*, ACM Computing Surveys 17(4): https://doi.org/10.1145/6041.6042
