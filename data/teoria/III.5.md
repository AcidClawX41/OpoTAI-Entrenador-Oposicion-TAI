# III.5 · Arquitecturas Jakarta EE y .NET: componentes, persistencia, seguridad e interfaces

Java (con **Jakarta EE**, antes Java EE) y **.NET** son las dos grandes plataformas de desarrollo empresarial de la Administración General del Estado, y el tribunal las pregunta en paralelo: qué componente hace cada cosa, cuál es el **homólogo** en la otra plataforma, qué comando instala un paquete o arranca una aplicación y cómo se escribe una consulta, un controlador REST o un método asíncrono. El programa pide sus **componentes, persistencia y seguridad**; sus **características, elementos, lenguajes y funciones**, y el **desarrollo de interfaces**. Este tema enlaza con III.4 (orientación a objetos), III.3 (SQL), III.6 (servicios web) y III.7 (desarrollo web).

## La plataforma Java

### Ediciones y piezas básicas

| Pieza | Qué es |
|---|---|
| **Java SE** (*Standard Edition*) | Lenguaje, máquina virtual y bibliotecas básicas (`java.lang`, `java.util`, `java.io`, `java.sql`, `java.time`, colecciones, *streams*, concurrencia) |
| **Jakarta EE** (antes Java EE y J2EE) | Conjunto de **especificaciones** para aplicaciones empresariales (web, transacciones, persistencia, mensajería, seguridad) que implementan los **servidores de aplicaciones** |
| Java ME (*Micro Edition*) | Dispositivos con recursos limitados (prácticamente en desuso) |
| **JVM** (*Java Virtual Machine*) | Ejecuta el **bytecode** (`.class`): cargador de clases, verificador, intérprete, compilador **JIT** y **recolector de basura** |
| **JRE** / **JDK** | Entorno de ejecución / kit de desarrollo (`javac`, `java`, `jar`, `javadoc`, `jshell`, `keytool`, `jlink`) |

El **compilador JIT** (*Just-In-Time*, HotSpot con sus compiladores C1 y C2) es el componente que **compila el código intermedio (bytecode) a código máquina en tiempo de ejecución** (pregunta de 2026); el recolector de basura (G1 por defecto; también ZGC y Shenandoah) libera la memoria del montón (*heap*). La compilación anticipada (AOT) a ejecutable nativo la ofrecen GraalVM Native Image y los últimos JDK.

**Versiones**: nueva versión cada **seis meses** desde Java 10 (2018) y **LTS** cada dos años: Java 8 (2014, lambdas y *streams*), 11 (2018), 17 (2021), **21** (2023, hilos virtuales) y **25** (septiembre de 2025, LTS vigente); **Java 27** salió en septiembre de 2026 y no es LTS.

```java
// Streams (Java 8+): contar los asientos registrales de 2026
long total = asientos.stream()
                     .filter(a -> a.getAnioPresentacion() == 2026)
                     .count();

// Colecciones: Set no admite duplicados; List mantiene orden y admite duplicados; Map, pares clave-valor
Set<String> dnis = new HashSet<>();
List<Solicitud> pendientes = new ArrayList<>();
Map<String, Integer> plazasPorCuerpo = new HashMap<>();

// Concatenar muchas cadenas en un bucle: StringBuilder (String es inmutable)
StringBuilder sb = new StringBuilder();
for (String linea : lineas) { sb.append(linea).append('\n'); }

// Fecha y hora (java.time, Java 8+): LocalDate, LocalTime y LocalDateTime
LocalDateTime finPlazo = LocalDateTime.of(2026, 11, 2, 23, 59);
```

### De J2EE a Jakarta EE

| Versión | Año | Novedades |
|---|---|---|
| J2EE 1.2 a 1.4 | 1999-2003 | Servlets, JSP, EJB 2 (con *entity beans*), JMS, JTA |
| **Java EE 5** | 2006 | Anotaciones, **EJB 3** y **JPA 1.0** (POJO en lugar de *entity beans*), JSF |
| Java EE 6 | 2009 | **CDI**, **JAX-RS**, *Web Profile* |
| Java EE 7 | 2013 | WebSocket, JSON-P, Batch, Concurrency |
| Java EE 8 | 2017 | JSON-B, Security API, Servlet 4 (HTTP/2). Oracle cede Java EE a la **Eclipse Foundation** |
| Jakarta EE 8 | 2019 | Mismas API con el nombre Jakarta, aún en el paquete `javax.*` |
| **Jakarta EE 9 / 9.1** | 2020-2021 | **Cambio de espacio de nombres `javax.*` → `jakarta.*`** |
| Jakarta EE 10 | 2022 | Nuevo **Core Profile** (microservicios) |
| **Jakarta EE 11** | **junio de 2025** | Java SE **17** como mínimo, soporte de **hilos virtuales** y *records*, nueva especificación **Jakarta Data 1.0**, eliminación del `SecurityManager` y de las especificaciones opcionales (SOAP y XML salen de la plataforma, aunque siguen como especificaciones independientes) |
| Jakarta EE 12 | Prevista para finales de 2026 | Consistencia y configuración |

Las especificaciones ya no se aprueban por el JCP (JSR), sino por el **proceso de especificación de la Eclipse Foundation** (EFSP), con una API, una especificación, un **TCK** (batería de pruebas de compatibilidad) y al menos una implementación compatible.

### Arquitectura multicapa de Jakarta EE

| Capa | Componentes | Dónde se ejecuta |
|---|---|---|
| **Cliente** | Navegador (HTML, JavaScript), aplicaciones cliente Java, aplicaciones móviles | Máquina del usuario |
| **Web** | **Servlets**, **Jakarta Pages** (JSP), **Jakarta Faces** (JSF), WebSocket, recursos REST | **Contenedor web** |
| **Negocio** | **Enterprise Beans** (EJB), *beans* **CDI**, servicios REST | **Contenedor de EJB/CDI** |
| **EIS** (sistemas de información empresariales) | Bases de datos (JDBC, JPA), ERP, sistemas heredados (Connectors), colas (Messaging) | Servidores de datos |

Los **contenedores** proporcionan a los componentes los servicios de infraestructura: ciclo de vida, **inyección de dependencias**, **transacciones**, **seguridad**, concurrencia, nombres (**JNDI**) y acceso remoto. **Servidores de aplicaciones completos**: GlassFish (implementación de referencia), Payara, WildFly / JBoss EAP, Open Liberty / WebSphere Liberty, TomEE, WebLogic. **Contenedores de servlets** (solo capa web): **Apache Tomcat** (motor **Catalina**), Jetty, Undertow.

**Empaquetado**: **JAR** (clases y bibliotecas), **WAR** (aplicación web: `WEB-INF/web.xml`, `WEB-INF/classes`, `WEB-INF/lib`), **EAR** (aplicación empresarial con varios módulos: `META-INF/application.xml`) y RAR (conectores). La configuración se hace con **anotaciones** o con **descriptores de despliegue** XML.

> Ciclo de vida de Tomcat (supuesto de 2026): para ejecutar código cuando el motor Catalina se ha detenido por completo, pero antes de que termine la JVM, se implementa un **`LifecycleListener`** y se registra en el elemento `<Server>` de **`server.xml`**.

### Perfiles

| Perfil | Para qué | Contenido |
|---|---|---|
| **Platform** (completa) | Aplicaciones empresariales completas | Todas las especificaciones |
| **Web Profile** | Aplicaciones web | Servlet, Pages, Faces, CDI, Persistence, Transactions, Validation, REST, Security, Data… |
| **Core Profile** (desde EE 10) | **Microservicios** y ejecutables ligeros o nativos | REST, JSON-P, JSON-B, CDI Lite, Interceptors, Dependency Injection, Annotations |

**MicroProfile** (Eclipse) es un conjunto de especificaciones **alineado con el Core Profile** para microservicios: Config, Health, Telemetry, Fault Tolerance, **JWT Authentication**, OpenAPI y REST Client (supuesto de 2023). Implementaciones: Quarkus, Open Liberty, Helidon, Payara Micro, WildFly.

### Especificaciones de Jakarta EE 11 (componentes)

| Especificación (nombre antiguo) | Para qué | Elementos clave |
|---|---|---|
| **Servlet 6.1** | Atender peticiones HTTP en el servidor | `HttpServlet`, `doGet`/`doPost`, ciclo de vida `init` → `service` → `destroy`, `@WebServlet`, filtros y *listeners*, sesión (`HttpSession`) |
| **Pages 4.0** (JSP) | Páginas con HTML y código que se **compilan a servlets** | Directivas, etiquetas JSTL, EL `${…}` |
| **Faces 4.1** (JSF) | Interfaces web **basadas en componentes** (MVC) | Vistas **Facelets** (`.xhtml`), *beans* CDI, ciclo de vida de la petición; bibliotecas como PrimeFaces |
| Expression Language 6.0 | Expresiones `${…}`/`#{…}` en vistas | Acceso a *beans* y propiedades |
| WebSocket 2.2 | Comunicación bidireccional en tiempo real | `@ServerEndpoint` |
| **RESTful Web Services 4.0** (JAX-RS) | **Servicios REST** | `@Path`, `@GET`, `@POST`, `@PUT`, `@DELETE`, `@Produces`, `@Consumes`, `@PathParam`; implementaciones Jersey, RESTEasy |
| JSON Processing 2.1 / JSON Binding 3.0 | Procesar JSON / convertir objetos ↔ JSON | `JsonObject`; `Jsonb.toJson()` |
| **CDI 4.1** (*Contexts and Dependency Injection*) | **Inyección de dependencias** y contextos | `@Inject`, ámbitos `@RequestScoped`, `@SessionScoped`, `@ApplicationScoped`, `@Dependent`; eventos e interceptores |
| **Enterprise Beans 4.0** (EJB) | Componentes de negocio transaccionales | *Session beans* **`@Stateless`**, **`@Stateful`**, **`@Singleton`**; ***message-driven beans*** (`@MessageDriven`) para mensajería asíncrona; servicio de temporizadores |
| **Persistence 3.2** (JPA) | **ORM**: mapear objetos a tablas | Ver «Persistencia» |
| **Data 1.0** (nueva en EE 11) | Repositorios declarativos | Interfaces `@Repository` con `@Find`, `@Insert`… |
| Transactions 2.0 (JTA) | Transacciones distribuidas | `@Transactional`, `UserTransaction` |
| **Validation 3.1** (*Bean Validation*) | Validar datos con anotaciones | `@NotNull`, `@Size`, `@Email`, `@Pattern` |
| **Security 4.0**, Authentication 3.1, Authorization 3.0 | Seguridad | Ver «Seguridad» |
| **Messaging 3.1** (JMS) | Mensajería asíncrona | **Colas** (punto a punto) y **temas** (publicación-suscripción) |
| Mail 2.1 | Envío de correo | `Session`, `Transport` |
| Batch 2.1, Concurrency 3.1 | Procesos por lotes; ejecutores gestionados | `ManagedExecutorService`; hilos virtuales |
| Connectors 2.1 (JCA) | Integración con sistemas de información empresariales | Adaptadores de recursos (RAR) |

```java
@Path("/alumnos")                                  // Jakarta REST (JAX-RS)
@Produces(MediaType.APPLICATION_JSON)
@RequestScoped
public class AlumnoRecurso {
    @Inject AlumnoServicio servicio;               // CDI

    @GET
    public List<Alumno> listar() { return servicio.todos(); }

    @GET @Path("/{id}")
    public Alumno obtener(@PathParam("id") long id) { return servicio.buscar(id); }
}
```

### Spring y otros marcos del ecosistema Java

**Spring** no es Jakarta EE, pero usa muchas de sus API (Servlet, JPA, Validation) y es el marco más extendido. **Spring Framework** aporta inversión de control e inyección de dependencias, AOP y Spring MVC; **Spring Boot** añade autoconfiguración, servidor embebido (Tomcat) y dependencias *starter*; **Spring Data JPA**, repositorios; **Spring Security**, seguridad. Versión actual: **Spring Boot 4** (noviembre de 2025, sobre Spring Framework 7 y Jakarta EE 11). Otros marcos: Quarkus, Micronaut, Helidon.

```java
@RestController                                     // Spring Boot: controlador REST
public class AlumnoController {
    private final AlumnoRepository repo;
    public AlumnoController(AlumnoRepository repo) { this.repo = repo; }   // inyección por constructor

    @GetMapping("/alumnos")
    public List<Alumno> obtenerAlumnos() { return repo.findAll(); }
}
```

**Construcción**: **Maven** (fichero **`pom.xml`** con `groupId`, `artifactId` y **`version`**; ciclo `validate` → `compile` → `test` → `package` → `verify` → `install` → `deploy`; `mvn clean package`; **`mvn spring-boot:run`** arranca una aplicación Spring Boot), **Gradle** (`build.gradle` en Groovy o Kotlin) y Ant (`build.xml`, histórico).

**Bibliotecas habituales**: Apache Commons (**commons-io**, commons-lang), **Log4j 2** (vulnerabilidad *Log4Shell*, CVE-2021-44228), SLF4J y Logback, **Apache HttpClient**, Jackson (JSON), JUnit y Mockito (pruebas). «Mockete» no existe (distractor de 2023).

**XML en Java**: **JAXP** agrupa **DOM** (árbol en memoria), **SAX** (eventos, *push*), **StAX** (*Streaming API for XML*, lectura por demanda, *pull*; pregunta de 2021), XSLT y XPath; **JAXB** (Jakarta XML Binding) **mapea elementos XML a clases** y viceversa (supuesto de 2024); JAX-WS para servicios SOAP (`wsimport` genera las clases a partir de un WSDL, tema III.6).

## La plataforma .NET

### Evolución y soporte

| Etapa | Años | Características |
|---|---|---|
| **.NET Framework** 1.0 → 4.8.1 | 2002-2022 | Solo **Windows**; sigue en mantenimiento (ASP.NET Web Forms, WCF, WPF, WinForms) |
| **.NET Core** 1.0 → 3.1 | 2016-2019 | **Multiplataforma** (Windows, Linux, macOS) y **código abierto** (licencia MIT, .NET Foundation) |
| **.NET 5** y siguientes | Desde 2020 | Plataforma unificada; una versión cada noviembre: **6 (LTS)**, 7, **8 (LTS, 2023)**, 9 (STS, 2024), **10 (LTS, noviembre de 2025, con C# 14)**; .NET 11 está prevista para noviembre de 2026 |

Las versiones **pares son LTS** (tres años de soporte) y las impares **STS**, cuyo soporte pasó de 18 a **24 meses** a partir de .NET 9; por eso .NET 8 y .NET 9 terminan su soporte el mismo día, el **10 de noviembre de 2026**. En 2024 «la última versión LTS» era **.NET 8**; hoy lo es **.NET 10**. .NET es un proyecto de **código abierto** (no «de Google», distractor de 2023).

### Arquitectura

```text
C#, F#, Visual Basic ──(compilador Roslyn / F#)──▶ CIL + metadatos en ENSAMBLADOS (.dll / .exe)
                                                        │
                                   CLR: carga, verificación, compilación JIT (RyuJIT),
                                   recolección de basura, excepciones, hilos, seguridad de tipos
                                                        │
                                                  código máquina nativo
```

| Elemento | Qué es |
|---|---|
| **CLR** (*Common Language Runtime*) | Entorno de ejecución: compilación **JIT**, **recolección de basura**, **gestión de excepciones**, seguridad de tipos e hilos (pregunta de 2026). Equivale a la JVM |
| **CIL** / MSIL / IL | Código intermedio común a todos los lenguajes .NET (equivale al *bytecode*) |
| **CTS** y **CLS** | Sistema de tipos común y especificación común de lenguajes: permiten que componentes escritos en distintos lenguajes interoperen |
| **BCL** (biblioteca de clases base) | `System`, `System.Collections.Generic`, `System.IO`, `System.Linq`, `System.Net.Http`… |
| **Ensamblado** (*assembly*) | **Unidad fundamental de implementación, versionado y seguridad**: `.dll` o `.exe` con código IL, metadatos y **manifiesto**. Se **cargan en memoria solo si se necesitan** (pregunta de 2026). En .NET Framework podían compartirse en la **GAC** (*Global Assembly Cache*; no «GAP»), que no existe en .NET moderno |
| Native AOT / ReadyToRun | Compilación anticipada a código nativo (arranque rápido, sin JIT) |
| **NuGet** | **Gestor de paquetes** de .NET (pregunta de 2021); paquetes `.nupkg` publicados en nuget.org |
| SDK y CLI `dotnet` | `dotnet new`, `build`, `run`, `test`, `publish`; fichero de proyecto `.csproj` (MSBuild) |

**Lenguajes oficiales**: **C#, F# y Visual Basic** (pregunta de 2026: Java, PHP o R **no** lo son).

- **C#**: orientado a objetos y multiparadigma (C# 14 con .NET 10 añade miembros de extensión, la palabra clave `field` en propiedades y la asignación condicional con `?.`).
- **F#**: **funcional**; **`let`** enlaza un nombre a un valor o función (pregunta de 2024); los valores son inmutables salvo `let mutable`; comentarios `//` y `(* … *)`; `sbyte` es un entero **con signo** de 8 bits.
- **Visual Basic**: se mantiene estable, sin nuevas características de lenguaje.

```bash
dotnet new webapi -n Becas.Api              # nuevo proyecto de API web
dotnet add package iText                    # instalar un paquete NuGet (sintaxis clásica)
dotnet package add Microsoft.EntityFrameworkCore   # sintaxis «sustantivo primero» del SDK de .NET 10 (equivalente)
dotnet ef migrations add Inicial            # herramientas de EF Core
dotnet run
```

> El supuesto de 2024 dio por buena `dotnet add package iText` y el extraordinario de julio de 2026, `dotnet package add Microsoft.EntityFrameworkCore`: el SDK de .NET 10 introdujo la forma «sustantivo primero» y mantiene la clásica.

### Elementos de C# que caen en el supuesto

```csharp
// Tipos anulables, using (libera recursos IDisposable) y arrays
int? telefono = null;
using (var conn = new SqlConnection(cadena)) { conn.Open(); /* … */ }   // llama a Dispose al salir
int[] arrayEnteros = new[] { 1, 2, 3 };

// Programación asíncrona: async + Task (o Task<T>), y await al invocar
public async Task<List<Usuario>> BuscarAsync(string texto) =>
    await context.Usuarios.Where(u => u.Apellido1.Contains(texto)).ToListAsync();

public async Task DevolverDato() { await Task.Delay(100); }

// Registro de trazas con ILogger<T>: Trace, Debug, Information, Warning, Error, Critical
logger.LogInformation("Ejecución del método finalizada correctamente.");
logger.LogError(ex, "Error al registrar la solicitud {Id}", id);
```

### Modelos de aplicación

| Tipo | Tecnologías .NET |
|---|---|
| **Web** | **ASP.NET Core**: MVC, **Razor Pages**, **Web API** y *minimal APIs*, **Blazor** (componentes `.razor` en servidor o en el navegador con WebAssembly), SignalR (tiempo real), gRPC |
| **Escritorio Windows** | **Windows Forms**, **WPF** (XAML), **WinUI 3** (Windows App SDK) |
| **Multiplataforma nativa** | **.NET MAUI** (*Multi-platform App UI*): aplicaciones **móviles y de escritorio nativas** para Android, iOS, macOS y Windows con **C# y XAML**; sucesor de Xamarin.Forms. **Blazor Hybrid** integra componentes Blazor en MAUI, WPF o WinForms |
| Servicios y nube | *Worker services*, Azure Functions, contenedores |
| Otros | ML.NET (aprendizaje automático), Unity (videojuegos), consola |

**Razor** es la **sintaxis de plantillas** de ASP.NET Core que combina HTML y C# para crear **vistas dinámicas** (`.cshtml` en MVC y Razor Pages; `.razor` en Blazor). Se procesa **en el servidor** y usa **`@`** para pasar **de HTML a C#** (los distractores invertían el sentido o decían que es un lenguaje de programación o que se ejecuta en el navegador).

```cshtml
@page
@model ListadoModel
<h1>Solicitudes (@Model.Total)</h1>
<ul>
@foreach (var s in Model.Solicitudes)
{
    <li>@s.Numero — @s.Estado</li>
}
</ul>
```

## Persistencia

### En Java: JDBC

**JDBC** (`java.sql` y `javax.sql`) es la API de bajo nivel de acceso a bases de datos relacionales:

- `DriverManager` o, mejor, un **`DataSource`** (`javax.sql`) obtenido por **JNDI** (`javax.naming`) del servidor de aplicaciones, con **pool de conexiones** (supuesto de 2023: para conectar a la base de datos se usan **`javax.naming` y `javax.sql`**).
- `Connection`, `Statement`, **`PreparedStatement`** (sentencia **precompilada** y parametrizada que puede **ejecutarse muchas veces** con distintos valores y **evita la inyección SQL**; pregunta de 2021), **`CallableStatement`** (procedimientos almacenados) y `ResultSet`.

| Tipo de controlador JDBC | Cómo se conecta |
|---|---|
| **Tipo 1**: puente JDBC-ODBC | Traduce a ODBC (eliminado en Java 8) |
| **Tipo 2**: API nativa | Usa las bibliotecas cliente nativas del SGBD (parte en Java) |
| **Tipo 3**: protocolo de red | Habla un protocolo independiente con un **servidor intermedio (*middleware*)**, que traduce al SGBD (pregunta de 2023) |
| **Tipo 4**: protocolo nativo, Java puro (*thin*) | Habla directamente el protocolo de red del SGBD; el más usado hoy |

```java
@Resource(lookup = "java:comp/env/jdbc/Notificacion")   // DataSource obtenido por JNDI
DataSource ds;

String sql = "SELECT id, estado FROM notificacion WHERE id_destinatario = ?";
try (Connection con = ds.getConnection();
     PreparedStatement ps = con.prepareStatement(sql)) {
    ps.setLong(1, idDestinatario);                       // parámetro: sin inyección SQL
    try (ResultSet rs = ps.executeQuery()) {
        while (rs.next()) { /* rs.getLong("id"), rs.getString("estado") */ }
    }
}
```

### En Java: Jakarta Persistence (JPA) y ORM

Un **ORM** (*Object-Relational Mapping*) resuelve el desajuste entre objetos y tablas: **cada entidad representa normalmente una tabla y cada instancia, una fila** (pregunta de 2024). **Jakarta Persistence** es la **especificación**; necesita un **proveedor** que la implemente: **Hibernate**, **EclipseLink** (implementación de referencia) u OpenJPA.

- **Entidad**: clase con **`@Entity`** (supuesto de 2026), clave **`@Id`** (con `@GeneratedValue`), `@Table`, `@Column`, relaciones **`@OneToMany`**, `@ManyToOne`, `@OneToOne`, `@ManyToMany` (con carga `LAZY` o `EAGER` y operaciones en `cascade`).
- **`EntityManager`**: `persist`, `find`, `merge`, `remove`, consultas; gestiona el **contexto de persistencia**; la unidad de persistencia se configura en `persistence.xml`.
- Estados de una entidad: **nueva** (*transient*), **gestionada** (*managed*), **separada** (*detached*) y **eliminada** (*removed*).
- Consultas con **JPQL** (*Jakarta Persistence Query Language*, orientado a objetos; no existe «JPSQL»), la **API Criteria** o SQL nativo; desde EE 11, repositorios de **Jakarta Data**.

```java
@Entity
@Table(name = "ALUMNO")
public class Alumno {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idAlumno;

    @Column(nullable = false, unique = true, length = 9)
    private String dni;

    @OneToMany(mappedBy = "alumno", cascade = CascadeType.ALL)
    private List<Matricula> matriculas = new ArrayList<>();
}

List<Alumno> conMatricula = em.createQuery(
        "SELECT DISTINCT a FROM Alumno a JOIN a.matriculas m WHERE m.anio = :anio", Alumno.class)
    .setParameter("anio", 2026)
    .getResultList();
```

### En .NET: ADO.NET y Entity Framework Core

- **ADO.NET**: componente de .NET para la **comunicación con bases de datos** (pregunta de 2023). Modo **conectado** (`DbConnection`, `DbCommand`, `DbDataReader`) y **desconectado** (`DataSet`, `DataTable`, `DataAdapter`). Proveedores: `Microsoft.Data.SqlClient`, Npgsql, `Oracle.ManagedDataAccess`, MySqlConnector.
- **Entity Framework Core**: el **ORM** de .NET y **homólogo de Jakarta Persistence** (pregunta de 2026). `DbContext`, `DbSet<T>`, consultas **LINQ** traducidas a SQL, **migraciones**, enfoques *code first* y *database first*, seguimiento de cambios y carga diferida o ansiosa (`Include`). Las entidades son clases **POCO**.
- Otros: **NHibernate** (versión .NET de Hibernate), **Dapper** (micro-ORM). En el examen de 2021, «Ruby Hibernation» era el falso ORM.
- **POCO** (*Plain Old CLR Object*): clase sencilla que **no depende de clases base ni interfaces del marco** (equivale al POJO de Java). En el examen de 2023 se tomó la definición estricta: solo propiedades o campos públicos, sin herencia y sin métodos, eventos ni delegados.

```csharp
public class Usuario                       // entidad POCO
{
    public int Id { get; set; }
    public string Nombre { get; set; } = "";
    public string Apellido1 { get; set; } = "";
}

public class GestionContext : DbContext
{
    public GestionContext(DbContextOptions<GestionContext> options) : base(options) { }
    public DbSet<Usuario> Usuarios => Set<Usuario>();
}

// Contains se traduce a LIKE '%texto%'
var lista = await context.Usuarios.Where(u => u.Apellido1.Contains(texto)).ToListAsync();
```

| Concepto | Java / Jakarta EE | .NET |
|---|---|---|
| Acceso de bajo nivel | JDBC | ADO.NET |
| ORM estándar | **Jakarta Persistence** (Hibernate, EclipseLink) | **Entity Framework Core** |
| Lenguaje de consulta de objetos | JPQL, Criteria | LINQ |
| Repositorios | Jakarta Data, Spring Data | `DbSet<T>` / patrón *Repository* |
| Clase sencilla | POJO | POCO |

## Seguridad

### En Jakarta EE

- **Seguridad declarativa** (anotaciones o descriptor): `@RolesAllowed("GESTOR")`, `@PermitAll`, `@DenyAll`, `@DeclareRoles`; en `web.xml`, `<security-constraint>` con los recursos protegidos, los roles y la **garantía de transporte** `CONFIDENTIAL` (obliga a usar HTTPS).
- **Seguridad programática**: `SecurityContext` (`isCallerInRole`, `getCallerPrincipal`).
- **Jakarta Security 4.0**: mecanismos de autenticación HTTP (`HttpAuthenticationMechanism`: básica, formulario, formulario personalizado y **OpenID Connect**) y **almacenes de identidades** (`IdentityStore`: base de datos, LDAP). **Jakarta Authentication** (antes JASPIC) define la interfaz con los proveedores de autenticación y **Jakarta Authorization** (antes JACC), las políticas de autorización.
- Conceptos: usuarios, grupos, **roles** (lógicos, en la aplicación) y **reinos** (*realms*: almacén de usuarios del servidor).
- Microservicios: **MicroProfile JWT** (*tokens* firmados con las identidades y roles) y **Spring Security** (OAuth 2.0 / OpenID Connect, CSRF, sesiones).
- Java SE: criptografía con **JCA/JCE**, almacenes de claves (`keytool`, PKCS#12), TLS con JSSE. El `SecurityManager`, obsoleto desde Java 17, quedó desactivado de forma permanente en Java 24 y Jakarta EE 11 ya no lo exige.

```java
@Stateless
@DeclareRoles({"GESTOR", "CONSULTA"})
public class ExpedienteServicio {
    @RolesAllowed("GESTOR")
    public void resolver(long id) { /* … */ }

    @RolesAllowed({"GESTOR", "CONSULTA"})
    public Expediente ver(long id) { /* … */ return null; }
}
```

### En .NET

- **Autenticación** en ASP.NET Core con esquemas: *cookies*, **JWT Bearer** (cabecera `Authorization: Bearer …`), **OpenID Connect** y **Microsoft Entra ID** (antes Azure AD); **ASP.NET Core Identity** para gestionar usuarios, contraseñas, MFA y roles.
- **Autorización**: atributo **`[Authorize]`** (con roles, *claims* o políticas) y `[AllowAnonymous]`.
- Protección de la aplicación: *middleware* de **HTTPS y HSTS**, *tokens* **antifalsificación** (CSRF), **CORS**, **Data Protection API**, gestión de secretos (*user secrets*, Azure Key Vault). La antigua *Code Access Security* de .NET Framework no existe en .NET moderno.

```csharp
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer();
builder.Services.AddAuthorization(o => o.AddPolicy("Gestores", p => p.RequireRole("GESTOR")));
builder.Services.AddDbContext<GestionContext>(o => o.UseSqlServer(builder.Configuration.GetConnectionString("Gestion")));
var app = builder.Build();
app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();
app.MapGet("/expedientes/{id}", (int id) => Results.Ok(id)).RequireAuthorization("Gestores");
app.Run();
```

## Comparativa: características y funciones en ambos entornos

| Aspecto | Java / Jakarta EE | .NET |
|---|---|---|
| Entorno de ejecución | **JVM** | **CLR** |
| Código intermedio | *Bytecode* (`.class`, `.jar`) | **CIL** en ensamblados (`.dll`) |
| Compilación en ejecución / anticipada | JIT HotSpot / GraalVM Native Image | JIT RyuJIT / **Native AOT** |
| Lenguajes | Java, Kotlin, Scala, Groovy | **C#, F#, Visual Basic** |
| Paquetes y construcción | **Maven** (Maven Central, `pom.xml`), Gradle | **NuGet**, CLI `dotnet` y MSBuild (`.csproj`) |
| Web MVC y plantillas | Jakarta Faces, Pages, **Spring MVC**, Thymeleaf | **ASP.NET Core MVC**, **Razor Pages**, **Blazor** |
| Servicios REST | **Jakarta REST** (JAX-RS), Spring Web | ASP.NET Core **Web API** y *minimal APIs* |
| Servicios SOAP | Jakarta XML Web Services (JAX-WS), Apache CXF | WCF (.NET Framework), CoreWCF |
| Inyección de dependencias | **CDI**, Spring | Contenedor integrado (`AddScoped`, `AddTransient`, `AddSingleton`) |
| Persistencia | JDBC, **Jakarta Persistence** (Hibernate) | ADO.NET, **EF Core** |
| Mensajería | Jakarta Messaging (JMS) | Azure Service Bus, RabbitMQ con MassTransit |
| Seguridad | Jakarta Security, Spring Security | ASP.NET Core Identity, autenticación y autorización |
| Escritorio | Swing, **JavaFX** | WinForms, **WPF**, WinUI, **MAUI** |
| Servidores | WildFly, Payara, Open Liberty, **Tomcat** | **Kestrel** (detrás de IIS, Nginx o YARP) |
| Pruebas | JUnit, Mockito, Selenium | xUnit, **NUnit**, MSTest, Moq |
| Gobierno | Eclipse Foundation (especificaciones abiertas) | Microsoft y .NET Foundation (código abierto; CLI normalizada como ECMA-335) |

## Desarrollo de interfaces

### Interfaces de usuario de escritorio y móviles

| Plataforma | Tecnología | Características |
|---|---|---|
| Java | **Swing** (`javax.swing`) sobre AWT | Componentes ligeros, *look and feel* intercambiable; aún frecuente en aplicaciones internas |
| Java | **JavaFX** (OpenJFX) | Interfaces modernas con **FXML** (XML) y CSS, enlace de propiedades, Scene Builder |
| Java | SWT (Eclipse) | Componentes nativos del sistema |
| Android | Kotlin o Java con Jetpack Compose o *layouts* XML | — |
| .NET | **Windows Forms** | Diseñador visual sobre controles de Windows (eventos) |
| .NET | **WPF** | Interfaces en **XAML**, **enlace de datos** (*data binding*), estilos y patrón **MVVM** |
| .NET | WinUI 3 | Interfaz moderna de Windows (Windows App SDK) |
| .NET | **.NET MAUI** | Una sola base de código en C# y XAML para Android, iOS, macOS y Windows; **es la opción para aplicaciones de escritorio nativas multiplataforma** en .NET (supuesto de 2023) |

### Interfaces web

- **Java**: **Jakarta Faces** (componentes en Facelets `.xhtml`, con PrimeFaces), Jakarta Pages (JSP), **Thymeleaf** (plantillas de Spring MVC), Vaadin; o una **API REST** consumida por un *front-end* JavaScript (Angular, React, Vue: tema III.7).
- **.NET**: **Razor Pages** y vistas **MVC** (`.cshtml`), **Blazor** (componentes `.razor` en C#, con renderizado en servidor o en el navegador mediante WebAssembly) o una **Web API** consumida por un *front-end* JavaScript.

```xml
<!-- Jakarta Faces (Facelets): formulario enlazado a un bean CDI -->
<h:form>
  <h:inputText value="#{solicitudBean.dni}" required="true" />
  <h:commandButton value="Presentar" action="#{solicitudBean.presentar}" />
</h:form>
```

```xml
<!-- .NET MAUI (XAML) con enlace de datos MVVM; en WPF se usarían TextBox y StackPanel -->
<StackLayout>
  <Entry Text="{Binding Dni}" Placeholder="DNI" />
  <Button Text="Presentar" Command="{Binding PresentarCommand}" />
</StackLayout>
```

Principios comunes: separar la **presentación** de la **lógica** (MVC, MVP, **MVVM**), **enlace de datos**, programación **dirigida por eventos**, validación en cliente y servidor, **accesibilidad** (UNE-EN 301 549, tema III.8), **diseño adaptable** y uso de los **componentes visuales comunes** de la organización.

### Interfaces de programación (API) e integración

El otro sentido de «desarrollo de interfaces» es exponer y consumir **API**: interfaces Java o C# entre capas, **servicios REST** (Jakarta REST, ASP.NET Core Web API) documentados con **OpenAPI**, servicios **SOAP** (WSDL), mensajería asíncrona y clientes generados (`wsimport`, Apache CXF, `dotnet-svcutil`). Se estudian en III.6.

## Normativa y estándares clave

| Estándar | Qué regula | Puntos clave |
|---|---|---|
| **Jakarta EE 11** (Eclipse Foundation, junio de 2025) | Plataforma Java empresarial | Java SE 17+; perfiles Platform, Web y Core; Jakarta Data 1.0; espacio de nombres `jakarta.*` |
| *Java Language Specification* y *JVM Specification* (Java SE 25 LTS) | Lenguaje y máquina virtual | Ciclo semestral; LTS cada dos años |
| Eclipse MicroProfile | Microservicios Java | Config, Health, Fault Tolerance, JWT, OpenAPI, Telemetry |
| **ECMA-335** (CLI) y **ECMA-334** (C#) | Infraestructura común de lenguajes y lenguaje C# | CIL, CTS, CLS, metadatos y ensamblados |
| Política de soporte de .NET | Ciclo de vida | LTS 3 años (.NET 10 hasta noviembre de 2028); STS 24 meses desde .NET 9 |
| JDBC 4.3 (JSR 221) | Acceso a bases de datos en Java | `PreparedStatement`, `CallableStatement`, `DataSource` |
| OWASP ASVS y Top 10 | Seguridad de aplicaciones | Base de los controles de seguridad de ambas plataformas (tema III.8) |
| ENS (RD 311/2022) | Seguridad de los sistemas de la Administración | Medidas de protección de las aplicaciones (mp.sw) |

## Lo que más cae en el examen

En los nueve exámenes analizados hay **52 preguntas** de este tema según nuestra clasificación: 36 de ingreso libre (7 en 2021, 8 en 2023, 8 en 2024, 8 en 2025 y 5 en el extraordinario) y 16 de promoción interna. Más de la mitad están en el **supuesto práctico**.

| Concepto | Preguntas | Exámenes |
|---|---|---|
| **.NET**: NuGet y `dotnet add package`/`dotnet package add`, MAUI, Razor, CLR, ensamblados, lenguajes de .NET 10, última LTS, ADO.NET, POCO, F# | 17 | Todos los años |
| **Persistencia**: ORM (Hibernate, Entity Framework), JPA y su homólogo EF Core, `@Entity`, JDBC (`PreparedStatement`, tipos de *driver*, `javax.naming`/`javax.sql`), LINQ con `Contains` | 13 | LI 2021, 2023, 2024, 2025 y 2025‑ext; PI 2024 y 2025 |
| **Java SE en el supuesto**: `StringBuilder`, `Set`, `LocalDateTime`, *streams*, `async`/`Task` en C#, `ILogger`, `using`, arrays de C# | 11 | LI 2021, 2023, 2024, 2025 y 2025‑ext; PI 2023 y 2024 |
| **Jakarta EE y Spring**: JIT, MicroProfile, Jakarta REST, definición de Jakarta EE, Spring Boot (`@RestController`, `mvn spring-boot:run`), Tomcat | 9 | LI 2023, 2025; PI 2023 y 2025 |
| **APIs XML de Java** y bibliotecas (StAX, JAXB, Apache Commons, Log4j) | 4 | LI 2021, 2023 y 2024; PI 2021 |

Patrón: preguntas de «qué es X» con distractores absurdos y, en el supuesto, cuatro líneas de código casi iguales en Java o C#, de las que solo una compila o usa el método correcto (`stream()` frente a `collection()`, `LogInformation` frente a `LogWarn`, `async Task` frente a `Thread`).

## Trampas habituales

- **JIT** compila el *bytecode* a código máquina en ejecución; el *bytecode* es el código intermedio y el recolector de basura libera memoria.
- En .NET el **CLR** gestiona la ejecución, las excepciones y la recolección de basura (no el CLS, el CTS ni la BCL).
- **NuGet** es el gestor de paquetes (no una biblioteca ni un entorno de ejecución); la orden clásica es `dotnet add package X` y la nueva de .NET 10, `dotnet package add X`.
- **.NET MAUI** es multiplataforma (móvil y escritorio) con C# y XAML; no es solo para Android ni es de Java; **JavaFX** es de Java.
- **Razor** es una sintaxis de plantillas que se procesa en el servidor; `@` pasa de HTML a C#.
- Lenguajes de .NET: **C#, F# y Visual Basic** (no Java). .NET es de **código abierto** y multiplataforma.
- **Jakarta Persistence** es una especificación: **necesita un proveedor** (Hibernate, EclipseLink); su lenguaje es **JPQL**; admite relaciones uno a muchos.
- Homólogos: JPA ↔ **EF Core**; JDBC ↔ ADO.NET; Maven ↔ NuGet; JVM ↔ CLR; *bytecode* ↔ CIL; POJO ↔ POCO; JAX-RS ↔ Web API.
- **JAXB** mapea XML a clases; **JAX-RS** es REST; **JAXR** era para registros UDDI; **StAX** procesa XML por flujo.
- **Driver JDBC tipo 3** = protocolo de red + *middleware*; tipo 4 = Java puro con el protocolo del SGBD; tipo 1 = puente ODBC; hay **cuatro** tipos.
- **`PreparedStatement`** = sentencia SQL precompilada para ejecutarse muchas veces (y sin inyección).
- Microservicios en Java: **MicroProfile** (alineado con el Core Profile) y **Jakarta RESTful Web Services**; no Batch, Connectors ni Mail.
- Desde Jakarta EE 9 los paquetes son **`jakarta.*`** (antes `javax.*`); `javax.naming` y `javax.sql` son de Java SE y no cambian.
- Spring Boot se arranca con **`mvn spring-boot:run`**; la versión del proyecto Maven se cambia en **`pom.xml`**.
- **`async Task`** (o `Task<T>`) define un método asíncrono en C#; `await` se usa al llamarlo.
- Niveles de `ILogger`: `LogTrace`, `LogDebug`, **`LogInformation`**, `LogWarning`, `LogError`, `LogCritical` (no existen `LogWarn` ni `Error`).

## Repaso rápido

- Java SE + JVM (bytecode, JIT, GC); Java 25 es la LTS vigente; Java 27 salió en septiembre de 2026.
- Jakarta EE 11 (junio de 2025): Java 17+, Jakarta Data, hilos virtuales; EE 9 cambió `javax` por `jakarta`.
- Capas: cliente, web (Servlet, Pages, Faces), negocio (EJB, CDI) y EIS; contenedores web y EJB.
- Perfiles: Platform, Web Profile y Core Profile (microservicios, alineado con MicroProfile).
- EJB: `@Stateless`, `@Stateful`, `@Singleton` y *message-driven beans*.
- CDI: `@Inject` y ámbitos `@RequestScoped`, `@SessionScoped`, `@ApplicationScoped`.
- Jakarta REST: `@Path`, `@GET`, `@POST`, `@Produces`; Spring: `@RestController`, `@GetMapping`.
- JDBC: `Connection`, `PreparedStatement`, `CallableStatement`, `ResultSet`; `DataSource` por JNDI; cuatro tipos de *driver*.
- JPA: `@Entity`, `@Id`, `EntityManager`, JPQL; proveedores Hibernate y EclipseLink.
- .NET: .NET Framework (Windows) → .NET Core → .NET 5+; LTS pares (10, noviembre de 2025); STS 24 meses.
- CLR (JIT, GC, excepciones), CIL, CTS, CLS, BCL; ensamblados `.dll` cargados bajo demanda; NuGet.
- C#, F# (`let`) y Visual Basic; C# 14 con .NET 10.
- ASP.NET Core: MVC, Razor Pages, Web API, Blazor; escritorio: WinForms, WPF, WinUI; multiplataforma: MAUI.
- ADO.NET (bajo nivel) y EF Core (ORM, LINQ, migraciones); POCO.
- Seguridad: `@RolesAllowed`, Jakarta Security, MicroProfile JWT; en .NET, `[Authorize]`, Identity, JWT Bearer, Entra ID.

## Fuentes

- Jakarta EE Platform 11: https://jakarta.ee/specifications/platform/11/
- Jakarta EE, especificaciones: https://jakarta.ee/specifications/
- Eclipse MicroProfile: https://microprofile.io/
- Oracle, *Java SE Specifications* (JLS y JVMS): https://docs.oracle.com/javase/specs/
- OpenJDK, proyecto JDK (calendario de versiones): https://openjdk.org/projects/jdk/
- Oracle, JDBC (*java.sql*): https://docs.oracle.com/en/java/javase/25/docs/api/java.sql/module-summary.html
- Spring, *Release highlights*: https://spring.io/projects/release-highlights/
- Microsoft Learn, introducción a .NET: https://learn.microsoft.com/es-es/dotnet/core/introduction
- .NET, política de soporte: https://dotnet.microsoft.com/es-es/platform/support/policy/dotnet-core
- .NET Blog, soporte de 24 meses para las versiones STS (16-9-2025): https://devblogs.microsoft.com/dotnet/dotnet-sts-releases-supported-for-24-months/
- Microsoft Learn, novedades de C# 14: https://learn.microsoft.com/es-es/dotnet/csharp/whats-new/csharp-14
- Microsoft Learn, `dotnet package add`: https://learn.microsoft.com/es-es/dotnet/core/tools/dotnet-package-add
- Microsoft Learn, ensamblados en .NET: https://learn.microsoft.com/es-es/dotnet/standard/assembly/
- Microsoft Learn, .NET MAUI: https://learn.microsoft.com/es-es/dotnet/maui/what-is-maui
- Microsoft Learn, sintaxis Razor: https://learn.microsoft.com/es-es/aspnet/core/mvc/views/razor
- Microsoft Learn, Entity Framework Core: https://learn.microsoft.com/es-es/ef/core/
- Ecma International, ECMA-335 (CLI): https://ecma-international.org/publications-and-standards/standards/ecma-335/
