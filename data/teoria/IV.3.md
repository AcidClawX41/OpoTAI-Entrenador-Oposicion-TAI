# IV.3 · Servidores de correo electrónico y sus protocolos. Contenedores y microservicios

El tema une dos servicios que un administrador de sistemas de la Administración gestiona a diario. Por un lado, el **correo electrónico**: su arquitectura (agentes de usuario, de envío, de transferencia y de entrega), sus **protocolos** (SMTP, POP3, IMAP y sus variantes seguras), los **registros DNS** que lo hacen funcionar y lo protegen (MX, SPF, DKIM, DMARC) y la **administración de servidores** como Postfix, Dovecot o Exchange. Por otro, la **administración de contenedores** (Docker, Podman, imágenes OCI), su **orquestación con Kubernetes** y la **arquitectura de microservicios** que suelen alojar. En el examen se pregunta por los puertos seguros del correo, POP3 frente a IMAP, el papel de cada protocolo, registros DNS, órdenes `docker`, componentes y objetos de Kubernetes y ventajas de los microservicios.

## Arquitectura del correo electrónico

### Agentes

La arquitectura del correo de Internet (RFC 5598) distingue varios papeles:

| Agente | Función | Ejemplos |
|---|---|---|
| **MUA** (*Mail User Agent*) | Cliente con el que el usuario redacta y lee | Outlook, Thunderbird, clientes móviles, correo web |
| **MSA** (*Mail Submission Agent*) | Recibe del cliente el correo que este envía, lo autentica y lo pasa al MTA | Postfix o Exchange en el puerto de envío 587/465 |
| **MTA** (*Mail Transfer Agent*) | Encamina el mensaje entre servidores hasta el dominio de destino | Postfix, Exim, Sendmail, Exchange |
| **MDA** (*Mail Delivery Agent*) | Deposita el mensaje en el buzón del destinatario (filtros, carpetas) | Dovecot LDA o LMTP, procmail |
| **MS** (*Message Store*) y servidor de acceso | Guarda los buzones y los sirve al cliente | Dovecot, Cyrus, Exchange |

### Recorrido de un mensaje

![Recorrido de un correo: el cliente del remitente envía por SMTP de envío (587 o 465, con TLS) a su servidor MSA/MTA; este consulta en el DNS el registro MX del dominio de destino y transfiere el mensaje por SMTP en el puerto 25 al MTA de destino, que lo entrega al buzón; el destinatario lo lee con su cliente por IMAP (993) o POP3 (995)](diagramas/IV.3-recorrido-correo.svg)

*Figura: protocolos y puertos en cada tramo del viaje de un mensaje.*

- **SMTP** se usa **del cliente de origen a su servidor** (envío) y **entre servidores** (transferencia).
- **POP3 o IMAP** se usan **del servidor de destino al cliente del destinatario** (acceso al buzón). Nunca se usan para transferir correo entre servidores.
- El correo web (Outlook en la web, Roundcube) accede por **HTTPS**; Exchange y Microsoft 365 usan además sus protocolos propios (MAPI sobre HTTP, EWS, ActiveSync para móviles, Microsoft Graph).
- El servidor de origen descubre el de destino consultando el **registro MX** del dominio en el DNS.

### Formato del mensaje

Un mensaje (RFC 5322) tiene **cabeceras** (`From`, `To`, `Cc`, `Subject`, `Date`, `Message-ID`, `Received` —una por cada servidor atravesado—, `Return-Path`) y **cuerpo**. **MIME** (RFC 2045 a 2049) permite adjuntos, varias partes (`multipart/mixed`, `multipart/alternative`), juegos de caracteres y codificaciones (`base64`, `quoted-printable`). Hay que distinguir el **sobre** SMTP (`MAIL FROM`, `RCPT TO`, lo que usan los servidores para entregar) de las **cabeceras** que ve el usuario (`From:`, `To:`): pueden no coincidir, y en eso se basan la suplantación y los mecanismos que la combaten (SPF, DKIM y DMARC). Si no se puede entregar, el servidor devuelve una **notificación de no entrega** (NDR o DSN) a la dirección del sobre.

## Protocolos de correo

### SMTP

***Simple Mail Transfer Protocol*** (RFC 5321) es un protocolo de texto, orientado a conexión sobre TCP, de **envío y transferencia**. El cliente se presenta con `EHLO` (SMTP extendido) o `HELO`, indica el remitente y los destinatarios del sobre y envía el contenido tras `DATA`, que termina con una línea con un punto:

```text
S: 220 correo.organismo.es ESMTP
C: EHLO portatil.organismo.es
S: 250-correo.organismo.es
S: 250-STARTTLS
S: 250-AUTH PLAIN LOGIN
S: 250 SIZE 52428800
C: STARTTLS
S: 220 Ready to start TLS
   ... negociación TLS y nuevo EHLO ...
C: AUTH PLAIN AGFuYQBDbGF2ZQ==
S: 235 Authentication successful
C: MAIL FROM:<ana@organismo.es>
S: 250 OK
C: RCPT TO:<luis@ministerio.gob.es>
S: 250 OK
C: DATA
S: 354 End data with <CR><LF>.<CR><LF>
C: From: Ana <ana@organismo.es>
C: Subject: Informe
C:
C: Adjunto el informe.
C: .
S: 250 OK: queued as 4F7A2C1
C: QUIT
S: 221 Bye
```

| Código | Significado | Ejemplos |
|---|---|---|
| 2xx | Éxito | 220 servicio listo, 250 correcto, 221 cierre, 235 autenticado |
| 3xx | Esperando más datos | 354 empezar el contenido |
| 4xx | Error **temporal**: el emisor reintentará | 421 servicio no disponible, 450 buzón no disponible temporalmente |
| 5xx | Error **permanente**: se devuelve el mensaje | 550 buzón inexistente o rechazo por política, 554 transacción fallida |

Extensiones (ESMTP) que se anuncian tras `EHLO`: `STARTTLS` (RFC 3207), `AUTH` (RFC 4954), `SIZE`, `8BITMIME`, `PIPELINING`, `SMTPUTF8`, `DSN`. Las órdenes `VRFY` y `EXPN` (comprobar usuarios y listas) se desactivan porque revelan direcciones.

### Envío autenticado: puertos 587 y 465

El envío desde los clientes se separa del intercambio entre servidores:

- **Puerto 25**: **transferencia entre servidores** (MTA a MTA); sin autenticación de usuario; TLS oportunista con `STARTTLS`. Muchos proveedores bloquean la salida al 25 desde redes de usuarios.
- **Puerto 587** (*submission*, RFC 6409): envío desde clientes y aplicaciones **con autenticación** y cifrado negociado con **`STARTTLS`**. Es el que se usa, por ejemplo, para enviar desde una aplicación a través de Microsoft 365 (`smtp.office365.com:587`).
- **Puerto 465** (*submissions*, SMTPS): envío con **TLS implícito** (la conexión es TLS desde el primer byte). Fue retirado y vuelto a asignar: la RFC 8314 (2018) lo recupera y **recomienda el TLS implícito** para el envío y el acceso al correo.

Novedad en Microsoft 365: el envío SMTP AUTH con autenticación básica (usuario y contraseña) se está retirando en favor de OAuth; según el calendario publicado por Microsoft en 2026, quedará desactivado por defecto a finales de 2026.

### POP3

***Post Office Protocol* versión 3** (RFC 1939) **descarga** los mensajes del servidor al cliente y, normalmente, **los borra del servidor** (puede dejarse una copia). Órdenes: `USER`, `PASS`, `STAT`, `LIST`, `RETR`, `DELE`, `QUIT`. Es una **sincronización unidireccional** (del servidor al cliente): las carpetas, los mensajes leídos o borrados en un dispositivo **no se reflejan** en los demás. Puertos **110** (con `STLS` opcional) y **995** (POP3S, TLS implícito).

### IMAP

***Internet Message Access Protocol*** (IMAP4rev2, RFC 9051, que sustituye a la RFC 3501) trabaja **sobre los buzones del servidor**: los mensajes, carpetas y marcas (leído, respondido, destacado) **se quedan en el servidor** hasta que el usuario los borra, y **todos los dispositivos ven lo mismo**. Permite descargar solo las cabeceras o una parte del mensaje, buscar en el servidor y recibir avisos inmediatos (`IDLE`). Puertos **143** (con `STARTTLS`) y **993** (IMAPS, TLS implícito).

| Característica | POP3 | IMAP |
|---|---|---|
| Dónde quedan los mensajes | En el cliente (se descargan y suelen borrarse del servidor) | **En el servidor** hasta que se borran |
| Varios dispositivos | Mal: cada uno tiene su copia | **Bien**: todos ven el mismo buzón |
| Carpetas y marcas | Locales, no se sincronizan | **Se sincronizan** en el servidor |
| Lectura sin descargar | No | **Sí**, se puede ver el correo en el servidor y descargar partes |
| Uso de espacio en el servidor | Bajo | Alto (cuotas) |
| Trabajo sin conexión | Natural | Con caché local |
| Puertos | 110 / **995** | 143 / **993** |

### Resumen de puertos

| Protocolo | Puerto en claro o con STARTTLS | Puerto con TLS implícito |
|---|---|---|
| SMTP entre servidores | **25** | — |
| Envío de clientes (*submission*) | **587** (STARTTLS + autenticación) | **465** (SMTPS) |
| POP3 | 110 | **995** |
| IMAP | 143 | **993** |
| Correo web y Exchange/Microsoft 365 | — | 443 (HTTPS) |

Otros protocolos: **LMTP** (RFC 2033, entrega local del MTA al almacén de buzones), **JMAP** (RFC 8620 y 8621, acceso moderno con JSON sobre HTTPS), **ManageSieve** (gestión de filtros Sieve), y el histórico **X.400** de la UIT. **No** son protocolos de correo: Outlook (es un cliente), SNTP (sincronización horaria), SNMP (gestión de red).

## El DNS y la autenticación del correo

| Registro | Para qué | Ejemplo |
|---|---|---|
| **MX** | **Dirige el correo entrante** del dominio a sus servidores; el valor de **preferencia más bajo** es el preferido | `organismo.es. MX 10 mx1.organismo.es.` |
| A / AAAA | Dirección IP del servidor que figura en el MX | `mx1.organismo.es. A 192.0.2.25` |
| **PTR** (inverso) | Nombre asociado a la IP de salida; muchos receptores rechazan IP sin resolución inversa coherente | `25.2.0.192.in-addr.arpa. PTR mx1.organismo.es.` |
| **SPF** (TXT) | Lista de servidores **autorizados a enviar** por el dominio (comprueba el remitente del sobre) | `v=spf1 ip4:192.0.2.0/24 include:spf.protection.outlook.com -all` |
| **DKIM** (TXT) | Publica la **clave pública** con la que el receptor verifica la **firma** que el servidor de origen añade a cada mensaje | Registro TXT en `sel2026._domainkey.organismo.es` |
| **DMARC** (TXT) | Política del dominio si fallan SPF y DKIM alineados con el `From:` visible, y direcciones para recibir informes | `_dmarc.organismo.es. TXT "v=DMARC1; p=reject; rua=mailto:dmarc@organismo.es"` |
| MTA-STS y TLS-RPT | Obligan a usar TLS válido entre servidores y piden informes de fallos de TLS | `_mta-sts` y `_smtp._tls` |

- **SPF** (RFC 7208): el receptor comprueba si la IP que entrega está autorizada para el dominio del sobre (`MAIL FROM`). Terminaciones: `-all` (rechazar lo no autorizado), `~all` (marcar como sospechoso). Máximo de 10 consultas DNS anidadas.
- **DKIM** (RFC 6376): el servidor de origen **firma automáticamente** cabeceras y cuerpo con su clave privada (cabecera `DKIM-Signature` con el dominio `d=` y el selector `s=`); el receptor obtiene la clave pública del DNS. Garantiza **integridad** y que el mensaje pasó por un servidor autorizado del dominio, y sobrevive al reenvío mejor que SPF.
- **DMARC**: une SPF y DKIM con el dominio visible del `From:` (**alineación**) y fija qué hacer si falla: `p=none` (solo observar), `quarantine` (correo no deseado) o `reject` (rechazar), además de pedir **informes** agregados (`rua`) y de fallos (`ruf`). En **mayo de 2026** se publicó la **RFC 9989** (DMARCbis), norma del IETF que sustituye a la RFC 7489: elimina la etiqueta `pct`, añade `np` (política para subdominios inexistentes), `psd` y `t` (modo de prueba) y sustituye la lista de sufijos públicos por un **recorrido del árbol DNS**; los informes pasan a las RFC 9990 y 9991.
- Los grandes proveedores de correo exigen desde 2024 SPF, DKIM y DMARC a los remitentes masivos.

```bash
dig +short MX organismo.es
dig +short TXT organismo.es                         # SPF
dig +short TXT sel2026._domainkey.organismo.es      # clave pública DKIM
dig +short TXT _dmarc.organismo.es                  # política DMARC
dig +short -x 192.0.2.25                            # resolución inversa
```

## Administración de servidores de correo

### Productos

| Producto | Papel | Notas |
|---|---|---|
| **Postfix** | MTA (y MSA) | El más usado en Linux; configuración en `/etc/postfix/main.cf` y `master.cf` |
| Exim, Sendmail | MTA | Sendmail es el histórico; Exim, por defecto en Debian |
| **Dovecot** | Servidor IMAP y POP3, LDA/LMTP | Se combina con Postfix |
| **Microsoft Exchange Server** | Plataforma completa (buzones, transporte, calendario) | **Exchange Server SE** (*Subscription Edition*, julio de 2025) sustituye a Exchange 2016 y 2019, **sin soporte desde el 14‑10‑2025** |
| Exchange Online (Microsoft 365), Google Workspace | Correo en la nube | Administración web y PowerShell |
| Zimbra, Open-Xchange | Plataformas de colaboración | Alternativas de código abierto o comerciales |
| SpamAssassin, rspamd, ClamAV | Filtrado antispam y antivirus | Integrados como filtros (*milters*) |
| OpenDKIM, OpenDMARC | Firma y verificación | También integrados en rspamd |

### Postfix

`main.cf` contiene los **parámetros** (`nombre = valor`, consultables con `postconf`) y `master.cf` define los **servicios** y procesos (escucha en 25, 587 y 465):

```text
# /etc/postfix/main.cf (extracto)
myhostname = mx1.organismo.es
mydomain = organismo.es
myorigin = $mydomain
inet_interfaces = all
mydestination = $myhostname, localhost.$mydomain, $mydomain
mynetworks = 127.0.0.0/8, 10.20.0.0/16          # redes a las que se permite reenviar sin autenticar
smtpd_banner = $myhostname ESMTP                # saludo «220» que ve quien se conecta
smtp_helo_name = $myhostname                    # nombre que Postfix envía en HELO/EHLO a otros servidores
message_size_limit = 52428800
smtpd_tls_cert_file = /etc/pki/tls/certs/mx1.crt
smtpd_tls_key_file = /etc/pki/tls/private/mx1.key
smtpd_tls_security_level = may                  # TLS oportunista en el puerto 25
smtp_tls_security_level = may
smtpd_relay_restrictions = permit_mynetworks, permit_sasl_authenticated, reject_unauth_destination
```

```bash
postconf -n                          # parámetros con valor distinto del predeterminado
postconf -e 'smtp_helo_name = CORREOBIBLIOTECA'   # cambiar un parámetro de main.cf
postfix check                        # validar la configuración
systemctl reload postfix             # aplicar sin cortar el servicio (restart también vale)
postqueue -p                         # ver la cola (equivale a mailq)
postqueue -f                         # reintentar la entrega de toda la cola
postsuper -d 4F7A2C1                 # borrar un mensaje de la cola (-d ALL vacía la cola)
postcat -q 4F7A2C1                   # ver un mensaje encolado
newaliases                           # regenerar /etc/aliases.db tras editar /etc/aliases
journalctl -u postfix                # registros (o /var/log/maillog en RHEL, /var/log/mail.log en Debian)
```

El **nombre que el servidor anuncia** se controla en `main.cf`: `smtp_helo_name` es lo que Postfix envía en `HELO`/`EHLO` cuando actúa como cliente y `smtpd_banner`, el saludo que muestra a quien se conecta (en el examen de 2024 la respuesta oficial lo llamó «`$helo_name` en `main.cf`»). Para que el cambio se aplique en **todos** los servidores, se distribuye la misma configuración a todos (con gestión de configuración) y se recarga cada uno.

Regla de oro: **no ser un relé abierto**. El servidor solo debe aceptar correo para sus dominios o de usuarios autenticados y de redes de confianza (`reject_unauth_destination`); un relé abierto acaba enviando *spam* y en listas negras.

### Dovecot y pruebas de conexión

```bash
doveconf -n                                          # configuración efectiva de Dovecot
doveadm user ana                                     # comprobar un usuario
openssl s_client -connect mail.organismo.es:993      # probar IMAPS (TLS implícito)
openssl s_client -connect mail.organismo.es:465      # probar SMTPS
openssl s_client -starttls smtp -connect mail.organismo.es:587   # probar envío con STARTTLS
```

### Exchange y Microsoft 365

Exchange Server se administra con el **Centro de administración de Exchange** (web) y con el **Shell de administración de Exchange** (PowerShell); la alta disponibilidad de los buzones se consigue con **grupos de disponibilidad de bases de datos** (DAG). Exchange Online se gestiona desde el centro de administración de Microsoft 365 y el módulo `ExchangeOnlineManagement`:

```powershell
Connect-ExchangeOnline -UserPrincipalName admin@organismo.es
Get-Mailbox -ResultSize 20 | Select-Object DisplayName, PrimarySmtpAddress
New-Mailbox -Shared -Name "Registro" -PrimarySmtpAddress registro@organismo.es
Set-Mailbox -Identity ana@organismo.es -ProhibitSendQuota 49GB
Get-MessageTraceV2 -SenderAddress ana@organismo.es -StartDate (Get-Date).AddDays(-2) -EndDate (Get-Date)
```

(`Get-MessageTraceV2` sustituye desde septiembre de 2025 al antiguo `Get-MessageTrace`; en Exchange Server local el seguimiento se consulta con `Get-MessageTrackingLog`.)

### Tareas del administrador de correo

- **Buzones**: altas y bajas, cuotas, buzones compartidos, alias, listas de distribución, reglas de retención y archivado, recuperación de elementos eliminados.
- **Colas y entrega**: vigilar el tamaño de las colas, los rebotes y los retrasos; seguimiento de mensajes.
- **Seguridad**: TLS en todos los puertos de cliente y entre servidores, autenticación robusta (MFA, OAuth), SPF, DKIM y DMARC, filtros **antispam** (listas DNSBL, reputación, *greylisting*, contenido) y **antivirus**, bloqueo de adjuntos peligrosos y análisis en *sandbox*, límites de envío por usuario, formación frente al *phishing*.
- **Reputación**: resolución inversa correcta, IP fuera de listas negras, certificados válidos y renovados.
- **Copias y continuidad**: copias de los buzones, réplicas y plan de recuperación.

El **ENS** dedica una medida al correo, **mp.s.1** (todas las categorías): proteger la información en el **cuerpo y en los anexos**, proteger la **información de encaminamiento** y de establecimiento de conexiones, proteger a la organización frente al ***spam***, el **código dañino** y el **código móvil** (*applets*), y fijar **normas de uso** para el personal (limitación del uso privado y concienciación).

## Contenedores

### Concepto

Un **contenedor** es un proceso (o grupo de procesos) que se ejecuta **aislado** en el mismo núcleo del sistema anfitrión: es **virtualización a nivel de sistema operativo**. En Linux se apoya en:

- **Espacios de nombres** (*namespaces*): cada contenedor ve sus propios procesos (PID), red, puntos de montaje, nombre de equipo (UTS), IPC y usuarios.
- **Grupos de control** (*cgroups*): limitan CPU, memoria y E/S.
- **Capacidades**, **seccomp** y **SELinux o AppArmor**: reducen lo que el proceso puede hacer.
- **Sistemas de ficheros por capas** (OverlayFS): la **imagen** es de solo lectura y cada contenedor añade una capa escribible.

| | Máquina virtual | Contenedor |
|---|---|---|
| Qué virtualiza | El *hardware* (hipervisor) | El sistema operativo (núcleo compartido) |
| Sistema operativo invitado | Completo, uno por máquina | No: comparte el núcleo del anfitrión |
| Tamaño y arranque | Gigabytes; minutos | Megabytes; segundos o menos |
| Aislamiento | Fuerte | Menor (mismo núcleo) |
| Portabilidad | Imagen de disco del hipervisor | Imagen OCI ejecutable en cualquier motor compatible |
| Uso típico | Sistemas completos, distintos SO | Aplicaciones y microservicios |

### Tecnologías

| Tecnología | Qué es |
|---|---|
| **LXC** (*Linux Containers*) | **Virtualización a nivel de sistema operativo para Linux**; contenedores «de sistema» con un espacio de usuario completo (gestionados con LXD o Incus) |
| **Docker** (2013) | Plataforma que popularizó los contenedores de aplicación: motor (`dockerd`), cliente `docker`, formato de imagen, Docker Hub, Compose |
| **OCI** (*Open Container Initiative*, 2015) | Especificaciones abiertas de imagen, de ejecución y de distribución que siguen todos los motores |
| **containerd** | Motor de contenedores de alto nivel (usado por Docker y por Kubernetes) |
| **CRI-O** | Motor ligero pensado solo para Kubernetes |
| **runc**, crun | Ejecutores de bajo nivel que crean el contenedor según la especificación OCI |
| **Podman** | Alternativa a Docker **sin demonio** y **sin privilegios de root** (*rootless*), con órdenes compatibles; la opción por defecto en RHEL; acompañado de Buildah (construir) y Skopeo (copiar e inspeccionar imágenes) |
| Contenedores Windows | Aislamiento de procesos o con Hyper-V; imágenes base Windows Server Core y Nano Server |

Nginx (servidor web), Ubuntu o Debian (distribuciones) **no** son tecnologías de contenedores, aunque existan imágenes de ellos.

### Imágenes y registros

Una imagen se identifica como `registro/espacio/repositorio:etiqueta` (por ejemplo, `docker.io/library/nginx:1.28`) o, de forma inmutable, por su **resumen** (`@sha256:…`). Se guardan en **registros**: Docker Hub (público por defecto), Quay, GitHub Container Registry, los de los proveedores de nube o uno privado como **Harbor**. En producción se evita la etiqueta `latest` y se fija la versión o el resumen.

Las imágenes se construyen con un **Dockerfile**:

```dockerfile
# Etapa de construcción
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /src
COPY pom.xml .
COPY src ./src
RUN mvn -q package -DskipTests

# Etapa de ejecución: imagen mínima, sin herramientas de compilación
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /src/target/expedientes.jar app.jar
USER 1001
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

| Instrucción | Para qué |
|---|---|
| `FROM` | Imagen base (una por etapa en construcciones multietapa) |
| `RUN` | Ejecutar órdenes durante la construcción (crea una capa) |
| `COPY` / `ADD` | Copiar ficheros (`ADD` además descomprime y descarga URL) |
| `WORKDIR`, `ENV`, `ARG` | Directorio de trabajo, variables de entorno y de construcción |
| `EXPOSE` | **Documenta** el puerto; publicarlo se hace con `-p` al ejecutar |
| `USER` | Usuario con el que se ejecuta (evitar root) |
| `VOLUME` | Punto de datos persistentes |
| `CMD` / `ENTRYPOINT` | Orden por defecto / programa principal del contenedor |
| `HEALTHCHECK` | Comprobación periódica de salud |

### Órdenes de Docker

| Orden | Qué hace |
|---|---|
| **`docker run`** | **Crea e inicia** un contenedor nuevo a partir de una imagen, **descargándola si no está**, y ejecuta la orden indicada (`-d` en segundo plano, `-it` interactivo, `--name`, `-p 8443:8443`, `-v`, `-e`, `--rm`, `--restart`) |
| `docker create` / `docker start` | Crear sin arrancar / arrancar un contenedor **ya existente** |
| `docker stop` | Parada ordenada: SIGTERM y, si no termina en el plazo de gracia (10 s por defecto), SIGKILL |
| **`docker kill`** | **Interrumpe inmediatamente** (SIGKILL) |
| `docker restart`, `pause`, `unpause` | Reiniciar, congelar y descongelar |
| **`docker rm`** | **Elimina** un contenedor detenido (`-f` fuerza si está en marcha) |
| `docker ps` | Contenedores **en ejecución** |
| **`docker ps -a`** | **Todos** los contenedores, incluidos los detenidos |
| **`docker pull`** | **Descarga** una imagen de un registro (Docker Hub por defecto) |
| `docker push`, `docker tag`, `docker build -t` | Subir, etiquetar y construir imágenes |
| `docker images` (`docker image ls`), `docker rmi` | Listar y borrar imágenes |
| `docker logs -f` | Salida del contenedor |
| `docker exec -it ID sh` | Ejecutar una orden dentro de un contenedor en marcha |
| `docker inspect` | Información detallada (JSON) de **un objeto** concreto: contenedor, imagen, red o volumen |
| **`docker info`** | Información de **todo el sistema** Docker: número de contenedores e imágenes, controlador de almacenamiento, versión |
| `docker stats`, `docker top` | Consumo de recursos y procesos |
| `docker network ls`, `docker volume ls` | Redes y volúmenes |
| `docker system df`, `docker system prune` | Espacio usado y limpieza de lo no utilizado |
| `docker compose up -d`, `down`, `ps`, `logs` | Aplicaciones de varios contenedores definidas en `compose.yaml` |

```bash
docker pull nginx:1.28
docker run -d --name web -p 8080:80 --restart unless-stopped nginx:1.28
docker ps                     # en marcha
docker ps -a                  # todos
docker logs -f web
docker exec -it web sh
docker kill 3f7               # cortar ya un contenedor desbocado
docker rm 3f7                 # y eliminarlo
docker run --rm -it --memory 512m --cpus 1 --read-only alpine:3.22 sh   # con límites y sistema de ficheros de solo lectura
```

### Datos, red y aplicaciones de varios contenedores

- **Persistencia**: el contenedor es **efímero**; los datos deben ir en **volúmenes** (gestionados por el motor), montajes del anfitrión (*bind mounts*) o almacenamiento externo.
- **Redes**: `bridge` (por defecto, con NAT), `host` (comparte la red del anfitrión), `none`, `overlay` (entre anfitriones) y `macvlan`; en redes definidas por el usuario los contenedores se resuelven por nombre.
- **Compose** describe una aplicación completa en YAML:

```yaml
# compose.yaml
services:
  web:
    image: nginx:1.28
    ports:
      - "443:443"
    depends_on:
      - app
  app:
    build: .
    environment:
      DB_HOST: db
  db:
    image: postgres:17
    volumes:
      - datos-bd:/var/lib/postgresql/data
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/bd_clave
    secrets:
      - bd_clave
volumes:
  datos-bd:
secrets:
  bd_clave:
    file: ./bd_clave.txt
```

### Seguridad de contenedores

Imágenes base mínimas y de origen fiable; **análisis de vulnerabilidades** de las imágenes (Trivy, Grype, Clair) y lista de componentes (SBOM); **firma** de imágenes (Sigstore cosign); ejecutar **sin root** (`USER`, Podman *rootless*), sin `--privileged` y con las capacidades mínimas; sistema de ficheros de solo lectura y límites de CPU y memoria; **secretos** fuera de la imagen; actualizar reconstruyendo la imagen, nunca «parcheando» el contenedor en marcha. Referencias: **NIST SP 800-190** (*Application Container Security Guide*) y los *CIS Benchmarks* de Docker y Kubernetes.

## Orquestación de contenedores: Kubernetes

### Qué es y qué no es

**Kubernetes** (K8s) es una **plataforma de orquestación de contenedores de código abierto** que automatiza el despliegue, el escalado, la recuperación y la gestión de aplicaciones en contenedores sobre un clúster de máquinas. Nació en Google (heredero de Borg), su versión 1.0 es de 2015 y la mantiene la **CNCF**. Publica unas tres versiones menores al año y mantiene las tres últimas (en octubre de 2026, la más reciente es la **1.37**). Su propia documentación aclara lo que **no** hace: no despliega código fuente ni compila la aplicación, no impone soluciones de registro, monitorización o alertas, no limita el tipo de aplicaciones admitidas y **no proporciona ni adopta un sistema exhaustivo de configuración, mantenimiento, gestión o autorreparación de las máquinas**.

### Arquitectura

| Componente | Dónde | Función |
|---|---|---|
| **kube-apiserver** | Plano de control | Expone la API de Kubernetes; todo pasa por él |
| **etcd** | Plano de control | Almacén clave-valor consistente con **todo el estado del clúster** |
| **kube-scheduler** | Plano de control | **Decide en qué nodo se ejecuta cada Pod** según recursos disponibles, afinidades, *taints* y tolerancias |
| **kube-controller-manager** | Plano de control | Ejecuta los controladores que llevan el estado real al deseado (nodos, réplicas, *endpoints*, cuentas de servicio) |
| cloud-controller-manager | Plano de control | Integra con el proveedor de nube (balanceadores, discos) |
| **kubelet** | Cada nodo | Agente que asegura que los contenedores de los Pods asignados están en marcha |
| **kube-proxy** | Cada nodo | Reglas de red que implementan los Services |
| Motor de contenedores | Cada nodo | containerd o CRI-O a través de la interfaz CRI (Docker Engine dejó de usarse directamente en la versión 1.24) |
| Complementos | Clúster | DNS (CoreDNS), red (CNI: Calico, Cilium, Flannel), métricas, controladores de entrada |

### Objetos

Todo objeto se describe en YAML o JSON con cuatro campos: **`apiVersion`**, **`kind`** (tipo de objeto), **`metadata`** (los datos que lo **identifican de forma única**: nombre, UID, espacio de nombres, además de etiquetas y anotaciones) y **`spec`** (el **estado deseado**); el sistema añade **`status`** (el estado real).

| Objeto | Función |
|---|---|
| **Pod** | Unidad mínima: uno o varios contenedores que comparten red y almacenamiento |
| **Service** | IP y nombre DNS estables para un conjunto de Pods, con balanceo; tipos `ClusterIP` (por defecto), `NodePort`, `LoadBalancer` y `ExternalName`; protocolos **TCP (por defecto), UDP y SCTP** |
| **Volume** | Almacenamiento accesible por los contenedores del Pod |
| **Namespace** | Partición lógica del clúster (equipos, entornos) con sus cuotas y permisos |
| ReplicaSet | Mantiene un número de réplicas de un Pod |
| **Deployment** | Despliegues declarativos de aplicaciones sin estado, con actualizaciones progresivas y vuelta atrás |
| StatefulSet | Aplicaciones con estado (identidad y almacenamiento estables, orden) |
| DaemonSet | Un Pod en cada nodo (agentes de registros o monitorización) |
| Job / CronJob | Tareas que terminan / tareas programadas |
| ConfigMap / **Secret** | Configuración / datos sensibles (los Secret solo están codificados en base64: hay que activar el cifrado en reposo y limitar el acceso) |
| PersistentVolume / PersistentVolumeClaim / StorageClass | Almacenamiento persistente y su aprovisionamiento dinámico |
| Ingress / **Gateway API** | Entrada HTTP y HTTPS desde fuera del clúster; Gateway API es su sucesora |
| NetworkPolicy | Cortafuegos entre Pods |
| HorizontalPodAutoscaler | Escalado automático por consumo |
| Role, ClusterRole, RoleBinding, ServiceAccount | Control de acceso (RBAC) |

Pod, Service, Volume y Namespace son los **objetos básicos**; Deployment, StatefulSet, DaemonSet, ReplicaSet y Job son **controladores** de nivel superior.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: expedientes
  namespace: tramitacion
  labels:
    app: expedientes
spec:
  replicas: 3
  selector:
    matchLabels:
      app: expedientes
  template:
    metadata:
      labels:
        app: expedientes
    spec:
      containers:
        - name: app
          image: registro.organismo.es/tramitacion/expedientes:2.4.1
          ports:
            - containerPort: 8080
          resources:
            requests: { cpu: "250m", memory: "512Mi" }
            limits: { cpu: "1", memory: "1Gi" }
          readinessProbe:
            httpGet: { path: /actuator/health/readiness, port: 8080 }
          livenessProbe:
            httpGet: { path: /actuator/health/liveness, port: 8080 }
---
apiVersion: v1
kind: Service
metadata:
  name: expedientes
  namespace: tramitacion
spec:
  selector:
    app: expedientes
  ports:
    - port: 80
      targetPort: 8080
      protocol: TCP
```

### Administración con kubectl

```bash
kubectl get nodes
kubectl get pods -n tramitacion -o wide
kubectl describe pod expedientes-7d9c-abcde -n tramitacion   # eventos y motivo de fallos
kubectl logs -f deploy/expedientes -n tramitacion
kubectl exec -it expedientes-7d9c-abcde -n tramitacion -- sh
kubectl apply -f expedientes.yaml                  # crear o actualizar de forma declarativa
kubectl scale deployment expedientes --replicas=5 -n tramitacion
kubectl set image deployment/expedientes app=registro.organismo.es/tramitacion/expedientes:2.4.2 -n tramitacion
kubectl rollout status deployment/expedientes -n tramitacion
kubectl rollout undo deployment/expedientes -n tramitacion   # volver a la versión anterior
kubectl top pods -n tramitacion                    # consumo (requiere metrics-server)
kubectl cordon nodo3 ; kubectl drain nodo3 --ignore-daemonsets   # vaciar un nodo para mantenimiento
kubectl uncordon nodo3
```

Ecosistema: **Helm** (gestor de paquetes con *charts*), **GitOps** con Argo CD o Flux (el repositorio Git es la fuente de verdad), mallas de servicios (Istio, Linkerd) para mTLS y control de tráfico, y distribuciones como **OpenShift** (Red Hat), Rancher (SUSE) o los servicios gestionados de la nube (EKS, AKS, GKE); para laboratorio, minikube, kind o k3s. En noviembre de 2025 Kubernetes anunció la **retirada del controlador Ingress NGINX** (sin mantenimiento desde marzo de 2026) y recomienda migrar a **Gateway API**. Alternativas más simples de orquestación: Docker Swarm y Nomad.

## Microservicios

### Concepto

La arquitectura de **microservicios** construye una aplicación como un **conjunto de servicios pequeños**, cada uno **ejecutándose en su propio proceso**, organizado en torno a una **capacidad de negocio**, con **sus propios datos**, que se comunica con los demás mediante **mecanismos ligeros** (API HTTP o mensajería) y que se **despliega de forma independiente** y automatizada (definición de Lewis y Fowler, 2014).

| | Monolito | SOA | Microservicios |
|---|---|---|---|
| Unidad de despliegue | Toda la aplicación | Servicios grandes y compartidos | Cada servicio |
| Datos | Una base común | A menudo compartida | **Una base por servicio** |
| Comunicación | Llamadas internas | Bus de servicios (ESB), SOAP | REST, gRPC, eventos |
| Escalado | Todo junto | Por servicio | **Fino**, por servicio |
| Tecnología | Única | Heterogénea con estándares comunes | **Libre en cada servicio** (políglota) |
| Complejidad | En el código | En el bus | En la operación distribuida |

### Ventajas e inconvenientes

| Ventajas | Inconvenientes |
|---|---|
| **Escalado flexible**: solo lo que lo necesita | Complejidad de un sistema distribuido (red, latencia, fallos parciales) |
| **Despliegue independiente**, integración y entrega continuas | Consistencia de datos entre servicios (eventual; patrón Saga) |
| **Resistencia a fallos**: una función se degrada sin bloquear toda la aplicación | Observabilidad y depuración más difíciles |
| **Libertad tecnológica**: cada equipo elige lenguaje y almacenamiento | Más infraestructura y automatización (contenedores, orquestación, CI/CD) |
| Equipos pequeños y autónomos alineados con el negocio | Pruebas de integración y versionado de API |

### Composición: orquestación y coreografía

- **Orquestación**: un componente central (orquestador) **dirige** el proceso y llama a cada servicio en orden; el flujo es explícito y fácil de seguir, pero el orquestador concentra la lógica.
- **Coreografía**: no hay director; cada servicio **reacciona a eventos** publicados por otros y publica los suyos; más desacoplado, pero el flujo global queda implícito.

### Patrones

| Patrón | Problema que resuelve |
|---|---|
| **API Gateway** | Punto de entrada único: enrutamiento, autenticación, limitación de tráfico, agregación |
| *Backend for Frontend* (BFF) | Una pasarela adaptada a cada tipo de cliente (web, móvil) |
| **Descubrimiento de servicios** | Localizar instancias dinámicas (DNS de Kubernetes, Consul, Eureka) |
| ***Circuit breaker*** | Dejar de llamar a un servicio que falla para no propagar el fallo; con reintentos, tiempos de espera y compartimentos (*bulkhead*) |
| Base de datos por servicio | Autonomía y desacoplamiento de datos |
| **Saga** | Transacciones distribuidas como secuencia de transacciones locales con compensaciones (orquestada o coreografiada) |
| CQRS y *event sourcing* | Separar lecturas y escrituras; guardar el estado como secuencia de eventos |
| ***Strangler fig*** | Migrar un monolito poco a poco, sustituyendo funciones por servicios |
| *Sidecar* y malla de servicios | Funciones transversales (mTLS, telemetría) en un contenedor auxiliar |
| Configuración externa y *Twelve-Factor App* | Misma imagen en todos los entornos; configuración por variables o servicios |

### Comunicación

- **Síncrona**: REST sobre HTTP con JSON, **gRPC** (Protocol Buffers sobre HTTP/2, eficiente entre servicios internos), GraphQL.
- **Asíncrona**: **mensajería** y eventos con intermediarios como **Kafka**, **RabbitMQ** (AMQP) o NATS; publicación-suscripción y colas; desacopla en el tiempo y absorbe picos.

### Administración y operación

- **Observabilidad** con sus tres pilares: **registros** centralizados (pila ELK/EFK, Loki), **métricas** (Prometheus y Grafana) y **trazas distribuidas** (OpenTelemetry, Jaeger), con un identificador de correlación por petición.
- **Comprobaciones de salud** (*liveness* y *readiness*) y autorreparación por el orquestador.
- **Estrategias de despliegue**: progresivo (*rolling*), azul-verde (dos entornos y cambio instantáneo) y **canario** (una fracción del tráfico a la versión nueva).
- **Seguridad**: mTLS entre servicios, OAuth 2.0 y OpenID Connect con JWT en la pasarela, mínimo privilegio, políticas de red y gestión de secretos (Vault, Secrets de Kubernetes cifrados); confianza cero. Guía de referencia: **NIST SP 800-204** (estrategias de seguridad para sistemas basados en microservicios).
- **Gestión de API**: versionado, documentación OpenAPI, cuotas y catálogo.

## Normativa y estándares clave

| Norma o estándar | Qué regula | Puntos clave |
|---|---|---|
| **RFC 5321** | SMTP | `EHLO`, `MAIL FROM`, `RCPT TO`, `DATA`; códigos 2xx a 5xx; puerto 25 |
| RFC 5322 y RFC 2045 a 2049 | Formato del mensaje y MIME | Cabeceras, partes, adjuntos y codificaciones |
| RFC 6409 y **RFC 8314** | Envío de correo y TLS | 587 con autenticación; TLS implícito recomendado en 465, 993 y 995 |
| RFC 3207 y RFC 4954 | Extensiones SMTP | `STARTTLS` y `AUTH` |
| **RFC 1939** | POP3 | Descarga al cliente; 110 y 995 |
| **RFC 9051** | IMAP4rev2 (sustituye a RFC 3501) | Buzones en el servidor; 143 y 993 |
| RFC 7208, **RFC 6376** | SPF y DKIM | Servidores autorizados; firma con clave publicada en DNS |
| **RFC 9989** (mayo de 2026) | DMARC (sustituye a RFC 7489) | Políticas `none`, `quarantine` y `reject`; informes en RFC 9990 y 9991 |
| RFC 8461 y RFC 7672 | MTA-STS y DANE | TLS obligatorio y verificado entre servidores |
| **ENS** (RD 311/2022), **mp.s.1** | Protección del correo electrónico | Cuerpo y anexos, encaminamiento, *spam*, código dañino, código móvil, normas de uso y concienciación |
| Especificaciones **OCI** | Imágenes y ejecución de contenedores | Formato de imagen, ejecución y distribución interoperables |
| Kubernetes (CNCF) | Orquestación | Tres versiones menores al año; se mantienen las tres últimas |
| **NIST SP 800-190** | Seguridad de contenedores | Riesgos de imágenes, registros, orquestadores y anfitriones |
| NIST SP 800-204 | Seguridad de microservicios | Autenticación, control de acceso, pasarelas, malla de servicios |

## Lo que más cae en el examen

En los nueve exámenes analizados hay **36 preguntas** de este tema: 24 de ingreso libre (5 en 2021, 4 en 2023, 5 en 2024, 6 en 2025 y 4 en el extraordinario de 2026) y 12 de promoción interna.

| Bloque | Preguntas | Exámenes |
|---|---|---|
| **Correo: protocolos, puertos, DNS y servidor**: papel de SMTP, POP3 e IMAP en el envío, puertos seguros 995/465/993 (×2), SMTPS 465, IMAPS 993, envío autenticado con STARTTLS en 587, siglas de SMTP, «no es un protocolo de correo» (Outlook ×2, SNTP), ventajas de IMAP frente a POP3 (×3), registros MX y DKIM, parámetro HELO de Postfix | 16 | LI 2021, 2023, 2024, 2025 y 2025‑ext; PI 2021, 2023, 2024 y 2025 |
| **Docker y contenedores**: `docker run` (×3), `docker ps -a` (×2), `docker kill` (×2), `docker rm`, `docker pull`, `docker info`, Docker/containerd/Podman, LXC | 12 | LI 2021, 2024, 2025 y 2025‑ext; PI 2021, 2023 y 2025 |
| **Kubernetes y microservicios**: objetos básicos, campo `metadata`, protocolos de los Service, qué es Kubernetes (×2), kube-scheduler, coreografía y orquestación, beneficios de los microservicios | 8 | LI 2021, 2023, 2024, 2025 y 2025‑ext; PI 2023 y 2024 |

Patrón: puertos con números cruzados (995/993/465/587/143/110), órdenes de Docker inventadas (`docker end`, `docker delete`, `docker download`, `docker systeminfo`) frente a las reales, y definiciones literales de la documentación de Kubernetes. El correo cae en todas las convocatorias; Docker se ha convertido desde 2025 en un clásico del supuesto de sistemas.

## Trampas habituales

- **SMTP** envía (cliente → servidor de origen y servidor → servidor); **POP3/IMAP** solo del servidor de destino al cliente del destinatario.
- Puertos: **25** entre servidores, **587** envío con STARTTLS y autenticación, **465** SMTPS (TLS implícito), **993** IMAPS, **995** POP3S, 143 IMAP, 110 POP3. No confundir 993 (IMAPS) con 995 (POP3S).
- **IMAP** mantiene el correo y las carpetas en el servidor y sincroniza todos los dispositivos; con **POP3** las carpetas **no** se replican.
- **Outlook** es un cliente, **SNTP** sincroniza la hora: ninguno es protocolo de correo.
- **MX** dirige el correo entrante; **DKIM** firma; **SPF** autoriza servidores emisores; **DMARC** fija la política y los informes; **CNAME** es un alias.
- En Postfix los parámetros están en **`main.cf`**; `master.cf` define servicios.
- **`docker run`** crea, arranca y descarga si hace falta; `docker start` solo arranca uno existente.
- **`docker ps -a`** lista todos (también los detenidos); `docker ps` solo los activos.
- **`docker kill`** corta al instante; `docker stop` es ordenado; **`docker rm`** elimina el contenedor y `docker rmi` la imagen.
- **`docker pull`** descarga; **`docker info`** da la información de todo el sistema y `docker inspect` la de un objeto.
- **LXC** es virtualización a nivel de sistema operativo para Linux (no «Linux Exchange Container» ni algo basado en Docker).
- Tecnologías de contenedores: **Docker, containerd, Podman, CRI-O**; nginx, Ubuntu o Debian no lo son.
- Objetos básicos de Kubernetes: **Pod, Service, Volume, Namespace** (no «State»; Job y Deployment son controladores).
- **`metadata`** identifica al objeto; `spec` es el estado deseado; `kind` el tipo.
- Protocolos de un Service: **TCP (por defecto), UDP y SCTP** (no HTTP ni FTP).
- **kube-scheduler** asigna nodos a los Pods; etcd guarda el estado; kube-apiserver expone la API; kube-controller-manager ejecuta los controladores.
- Kubernetes **no** compila código ni impone registros o monitorización.
- Composición de microservicios: **coreografía y orquestación**. La libertad tecnológica es una **ventaja**: «diseño único sin elegir tecnología» no es un beneficio.

## Repaso rápido

- Agentes: MUA (cliente), MSA (envío), MTA (transferencia), MDA (entrega), almacén de buzones.
- SMTP (RFC 5321): EHLO, MAIL FROM, RCPT TO, DATA, QUIT; 2xx éxito, 4xx temporal, 5xx permanente.
- Puertos: 25, 587, 465, 110, 995, 143, 993.
- POP3 descarga (RFC 1939); IMAP4rev2 sincroniza en el servidor (RFC 9051).
- RFC 8314: TLS implícito recomendado; STARTTLS negocia TLS sobre una conexión en claro.
- DNS: MX (preferencia más baja primero), PTR, SPF, DKIM, DMARC (RFC 9989 de 2026), MTA-STS.
- Postfix: `main.cf`, `master.cf`, `postconf`, `postqueue -p`, `postsuper -d`; evitar el relé abierto.
- Exchange Server SE (2025) sustituye a 2016 y 2019; Exchange Online con PowerShell.
- ENS mp.s.1: cuerpo y anexos, encaminamiento, *spam*, código dañino, código móvil, normas de uso.
- Contenedor = proceso aislado con *namespaces* y *cgroups* sobre el núcleo del anfitrión; imagen por capas.
- LXC, Docker, containerd, CRI-O, runc, Podman (sin demonio, sin root); especificaciones OCI.
- Docker: `run`, `ps -a`, `stop`, `kill`, `rm`, `rmi`, `pull`, `push`, `build`, `logs`, `exec`, `inspect`, `info`; Compose.
- Kubernetes: plano de control (apiserver, etcd, scheduler, controller-manager) y nodos (kubelet, kube-proxy, motor CRI).
- Objetos: Pod, Service, Volume, Namespace; Deployment, StatefulSet, DaemonSet, Job; ConfigMap, Secret, PVC, Ingress/Gateway.
- Campos: apiVersion, kind, metadata, spec (y status).
- Microservicios: servicios pequeños, independientes, con sus datos; orquestación frente a coreografía; API Gateway, *circuit breaker*, Saga, *strangler fig*.
- Observabilidad: registros, métricas y trazas; despliegues *rolling*, azul-verde y canario.

## Fuentes

- RFC 5321, *Simple Mail Transfer Protocol*: https://www.rfc-editor.org/rfc/rfc5321
- RFC 5598, *Internet Mail Architecture*: https://www.rfc-editor.org/rfc/rfc5598
- RFC 8314, *Cleartext Considered Obsolete: Use of TLS for Email Submission and Access*: https://www.rfc-editor.org/rfc/rfc8314
- RFC 1939, *Post Office Protocol - Version 3*: https://www.rfc-editor.org/rfc/rfc1939
- RFC 9051, *IMAP Version 4rev2*: https://www.rfc-editor.org/rfc/rfc9051
- RFC 7208 (SPF): https://www.rfc-editor.org/rfc/rfc7208
- RFC 6376 (DKIM): https://www.rfc-editor.org/rfc/rfc6376
- RFC 9989 (DMARC): https://www.rfc-editor.org/rfc/rfc9989
- Real Decreto 311/2022, Esquema Nacional de Seguridad, medida mp.s.1 (BOE-A-2022-7191): https://www.boe.es/buscar/act.php?id=BOE-A-2022-7191
- Postfix, parámetros de configuración (`postconf(5)`): https://www.postfix.org/postconf.5.html
- Microsoft Learn, configurar un dispositivo o aplicación para enviar correo con Microsoft 365: https://learn.microsoft.com/es-es/exchange/mail-flow-best-practices/how-to-set-up-a-multifunction-device-or-application-to-send-email-using-microsoft-365-or-office-365
- Docker Docs, referencia de la CLI: https://docs.docker.com/reference/cli/docker/
- Open Container Initiative: https://opencontainers.org/
- Linux Containers (LXC): https://linuxcontainers.org/lxc/introduction/
- Kubernetes, ¿qué es Kubernetes?: https://kubernetes.io/es/docs/concepts/overview/what-is-kubernetes/
- Kubernetes, componentes: https://kubernetes.io/docs/concepts/overview/components/
- Kubernetes, objetos: https://kubernetes.io/docs/concepts/overview/working-with-objects/
- Kubernetes, protocolos de los Service: https://kubernetes.io/docs/reference/networking/service-protocols/
- Kubernetes, versiones mantenidas: https://kubernetes.io/releases/
- Kubernetes, retirada de Ingress NGINX: https://kubernetes.io/blog/2025/11/11/ingress-nginx-retirement/
- Lewis y Fowler, *Microservices*: https://martinfowler.com/articles/microservices.html
- NIST SP 800-190, *Application Container Security Guide*: https://csrc.nist.gov/pubs/sp/800/190/final
- NIST SP 800-204, *Security Strategies for Microservices-based Application Systems*: https://csrc.nist.gov/pubs/sp/800/204/final
