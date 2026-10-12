# IV.4 · Administración de redes locales, gestión de usuarios y dispositivos, monitorización y control de tráfico

Administrar una **red de área local** es mantenerla documentada, configurada, segura y vigilada: conmutadores, VLAN, direccionamiento, servicios de red básicos y acceso. Sobre esa red se gestionan las **identidades** (usuarios, grupos, directorios como Active Directory o LDAP y sus directivas) y los **dispositivos** (inventario, puestos, móviles con MDM), y se **monitoriza y controla el tráfico** (SNMP, flujos, capturas, QoS, herramientas como Nagios, Checkmk o Zabbix). El modelo de referencia de gestión de red es **FCAPS**. En el examen se pregunta por SNMP (versiones, operaciones, MIB), FCAPS, CMIP, órdenes de conmutadores Cisco (VLAN, *port security*), Active Directory (UO, GPO, PSO, sitios, controladores de dominio, `repadmin`), MDM y BYOD, Nagios, Checkmk y `tcpdump`. Los fundamentos de las redes locales (topologías, Ethernet, conmutación) están en IV.10 y la seguridad perimetral en IV.9.

## Administración de redes de área local

### Áreas funcionales de la gestión de red (FCAPS)

El modelo de gestión de sistemas OSI (ISO/IEC 7498-4) y la recomendación M.3400 de la UIT‑T dividen la gestión en **cinco áreas**:

| Área | Qué abarca | Ejemplos |
|---|---|---|
| **F**ault (fallos) | Detectar, aislar, diagnosticar y corregir averías; alarmas | Caída de un enlace, *trap* SNMP, registro de incidencias |
| **C**onfiguration (configuración) | Inventario, configuración de equipos, versiones, copias de las configuraciones, cambios | Alta de una VLAN, copia de la configuración de los conmutadores |
| **A**ccounting (contabilidad) | Medir el uso de recursos por usuario o servicio, cuotas, facturación | Consumo por departamento |
| **P**erformance (rendimiento) | Caudal, retardo, utilización, errores; umbrales e informes | Saturación de un enlace troncal |
| **S**ecurity (seguridad) | Control del acceso a la red y a la gestión, claves, registros de auditoría | 802.1X, SNMPv3, AAA |

La gestión del **almacenamiento** no es una de las cinco áreas.

### Protocolos y modelos de gestión

| Protocolo o modelo | Origen | Características |
|---|---|---|
| **SNMP** | IETF (Internet) | Sencillo, sobre UDP; gestor, agentes y MIB; el más extendido en redes IP |
| **CMIP / CMIS** | OSI (UIT‑T X.710 y X.711) | **Protocolo de gestión de dispositivos** de red del modelo OSI, orientado a objetos y más completo (operaciones M-GET, M-SET, M-ACTION, M-CREATE, M-DELETE, M-EVENT-REPORT); usado en redes de telecomunicaciones (TMN) |
| **NETCONF** (RFC 6241) con modelos **YANG** (RFC 7950) | IETF | Configuración transaccional de equipos sobre SSH; base de la automatización de red |
| RESTCONF (RFC 8040) | IETF | Los mismos modelos YANG mediante una API HTTP |
| Telemetría en *streaming* | Fabricantes | Los equipos envían métricas de forma continua en lugar de ser sondeados |
| Syslog (RFC 5424) | IETF | Mensajes de registro de los equipos (UDP 514) |

SMTP, DNS o FTP **no** son protocolos de gestión de red.

### SNMP

***Simple Network Management Protocol*** tiene tres elementos: el **gestor** (estación de gestión, NMS), los **agentes** que corren en los equipos gestionados y la **MIB** (*Management Information Base*): el **conjunto de objetos (OID) que un dispositivo pone a disposición**, organizados en un árbol jerárquico (por ejemplo, `1.3.6.1.2.1` es `iso.org.dod.internet.mgmt.mib-2`; `1.3.6.1.2.1.1.5.0` es `sysName.0`). Los agentes escuchan en **UDP 161** y los gestores reciben las notificaciones en **UDP 162**.

| Operación | Versión | Uso |
|---|---|---|
| `GetRequest` | v1 | Leer el valor de uno o varios OID |
| `GetNextRequest` | v1 | Leer el siguiente objeto del árbol (recorrer tablas) |
| **`GetBulkRequest`** | v2c y v3 | **Recuperar de una vez grandes volúmenes de datos** de tablas MIB extensas |
| `SetRequest` | v1 | Modificar un valor (configuración) |
| `Response` | v1 | Respuesta del agente |
| `Trap` | v1 | Notificación no solicitada del agente al gestor (sin confirmación) |
| `InformRequest` | v2c y v3 | Notificación **con confirmación** |
| `Report` | v3 | Errores internos del motor SNMPv3 |

![Diagrama de secuencia de SNMP entre el gestor y el agente: en el sondeo, el gestor envía al puerto UDP 161 del agente GetRequest de sysName.0, GetNextRequest o GetBulkRequest y SetRequest, y el agente contesta con Response; en las notificaciones, el agente envía al puerto UDP 162 del gestor un Trap sin confirmación o un InformRequest que el gestor confirma con Response; SNMPv3 con el nivel authPriv autentica y cifra por usuario](diagramas/IV.4-snmp.svg)

*Figura: el gestor pregunta en UDP 161 y el agente avisa en UDP 162; solo el Inform espera confirmación.*

| Versión | Seguridad | Notas |
|---|---|---|
| SNMPv1 (RFC 1157) | Cadena de **comunidad** en claro | Obsoleta |
| SNMPv2c | Comunidad en claro | Añade `GetBulk`, `Inform` y contadores de 64 bits |
| **SNMPv3** (RFC 3411 a 3418, norma STD 62) | **Autenticación y cifrado** por usuario (modelo USM) y control de acceso a vistas (VACM) | **Es la última versión**; niveles `noAuthNoPriv`, `authNoPriv` y `authPriv`; admite SHA-2 (RFC 7860) y AES |

No existen SNMP v4 ni v5. El ENS y las guías CCN-STIC piden usar **SNMPv3 con autenticación y cifrado**, cambiar las comunidades por defecto (`public`, `private`) o desactivar SNMP si no se usa.

```bash
snmpget  -v3 -l authPriv -u monitor -a SHA -A 'ClaveAut.2026' -x AES -X 'ClavePriv.2026' sw-planta2 sysName.0
snmpwalk -v3 -l authPriv -u monitor -a SHA -A 'ClaveAut.2026' -x AES -X 'ClavePriv.2026' sw-planta2 IF-MIB::ifDescr
snmpbulkwalk -v2c -c c0mun1dad-lectura 10.0.99.2 IF-MIB::ifHCInOctets   # GetBulk sobre una tabla grande
```

Otros conceptos: **RMON** (RFC 2819), una MIB para que las sondas acumulen estadísticas y alarmas localmente, y la **MIB-II** (RFC 1213) con los grupos básicos (sistema, interfaces, IP, TCP, UDP).

### Configuración de conmutadores y VLAN

Una **VLAN** divide un conmutador (o varios) en dominios de difusión independientes. Con **IEEE 802.1Q** las tramas que viajan por un enlace **troncal** llevan una **etiqueta de 4 bytes** con el **identificador de VLAN** (VID de 12 bits, hasta 4094 VLAN útiles) y la prioridad 802.1p:

- Puerto **de acceso** (*untagged*): pertenece a una sola VLAN; las tramas salen **sin etiqueta** hacia el equipo final.
- Puerto **troncal** (*tagged*): transporta varias VLAN y **las tramas incorporan la etiqueta con el VLAN ID**; la VLAN **nativa** viaja sin etiqueta.
- El tráfico **entre VLAN** necesita un *router* o un conmutador de capa 3 (interfaces virtuales SVI).

Configuración típica en un conmutador Cisco IOS:

```text
configure terminal
 vlan 10
  name USUARIOS
 interface GigabitEthernet1/0/5
  description PC usuario planta 2
  switchport mode access              ! puerto de acceso
  switchport access vlan 10           ! asigna ESTE puerto a la VLAN 10
  switchport port-security
  switchport port-security maximum 2
  switchport port-security mac-address sticky
  switchport port-security violation restrict
  spanning-tree portfast              ! pasa a reenviar sin esperar a STP (solo puertos de equipo final)
  spanning-tree bpduguard enable      ! si llega una BPDU, el puerto se desactiva
 interface GigabitEthernet1/0/48
  switchport mode trunk               ! troncal 802.1Q hacia otro conmutador
  switchport trunk allowed vlan 10,20,99
  switchport trunk native vlan 999
 end
show vlan brief
show interfaces trunk
show port-security interface Gi1/0/5
show mac address-table
copy running-config startup-config    ! guardar la configuración
```

- `switchport access vlan N` **asigna el puerto que se está configurando a la VLAN N** (la VLAN 1 es la de fábrica; no conviene usarla para usuarios ni para gestión).
- Para un PC en la VLAN 10 se necesitan **`switchport mode access`** y **`switchport access vlan 10`**; los troncales se usan entre conmutadores, *routers* o servidores de virtualización. En algunos modelos antiguos hay que fijar antes `switchport trunk encapsulation dot1q`.
- **Port security** limita las MAC permitidas en un puerto. Una MAC ***sticky*** es una **dirección aprendida dinámicamente que se convierte en parte de la configuración en ejecución** y que, si se guarda la configuración, queda **permanente**. Ante una violación, el puerto puede descartar (`protect`), descartar y registrar (`restrict`) o desactivarse (`shutdown`, el modo por defecto, que deja el puerto en estado *err-disabled*).
- **PortFast** salta las fases de escucha y aprendizaje de STP; **BPDU Guard** apaga el puerto si recibe una BPDU (protege de conmutadores no autorizados).
- La configuración en ejecución (`running-config`) se pierde al reiniciar si no se guarda en la de arranque (`startup-config`).

### Servicios básicos de la red

| Servicio | Función | Puertos | Buenas prácticas |
|---|---|---|---|
| **DHCP** | Asignar IP, máscara, puerta de enlace y DNS (Discover, Offer, Request, Ack) | UDP 67 (servidor) y 68 (cliente) | Reservas para servidores e impresoras; agente de retransmisión (`ip helper-address`) entre VLAN; *DHCP snooping* frente a servidores falsos |
| **DNS** interno | Resolución de nombres de la organización; imprescindible para Active Directory | UDP/TCP 53 | Servidores redundantes; registros SRV del dominio |
| **NTP** | Sincronizar los relojes | UDP 123 | Fundamental para registros, Kerberos y certificados (ENS op.exp.8.r2) |
| **IPAM** | Gestión del espacio de direcciones | — | Inventario de subredes y asignaciones |
| Syslog y SNMP | Registro y gestión | UDP 514, UDP 161/162 | Servidor central; red de gestión separada |

### Control de acceso a la red

- **IEEE 802.1X**: control de acceso por puerto. El equipo (**solicitante**) se autentica ante el conmutador o punto de acceso (**autenticador**), que consulta a un servidor **RADIUS** (UDP 1812/1813); métodos EAP como **EAP-TLS** (certificados) o PEAP. Si el equipo no admite 802.1X se usa la autenticación por MAC (MAB). El servidor puede asignar la VLAN dinámicamente.
- **NAC** (*Network Access Control*): además comprueba la **postura** del equipo (parches, antivirus) antes de admitirlo.
- **AAA** para administrar los equipos de red: autenticación centralizada con RADIUS o **TACACS+** (TCP 49), autorización por órdenes y registro de lo que hace cada administrador.
- Gestión **segura**: SSH en lugar de Telnet, HTTPS en lugar de HTTP, SNMPv3, VLAN o red de gestión separada (**fuera de banda**), listas de acceso a la gestión y copias de las configuraciones (con herramientas como Oxidized o RANCID, o por SCP/TFTP).

### Red inalámbrica corporativa

Los puntos de acceso se gestionan de forma centralizada (controladora física o en la nube) y cada **SSID** se asocia a una **VLAN**: corporativo con **WPA3-Enterprise** y 802.1X (certificados o credenciales del directorio), invitados aislados y con salida solo a Internet, y dispositivos especiales (IoT, impresoras) en su propio segmento. Tareas habituales: planificación de canales (en 2,4 GHz, los canales 1, 6 y 11 no se solapan) y potencia, actualización del *firmware*, detección de puntos de acceso no autorizados (WIPS) y control de la ocupación por usuario. WPA3 (Wi-Fi Alliance, 2018) sustituye la clave compartida de WPA2-Personal por SAE y es obligatorio en Wi-Fi 6E y Wi-Fi 7.

### Documentación y automatización

El inventario de la red (equipos, versiones, contratos, **etiquetado del equipamiento y del cableado**, ENS op.exp.1.r1), los diagramas lógicos y físicos y el plan de direccionamiento deben estar al día. La **automatización** (Ansible, NETCONF/YANG) y las redes definidas por *software* (SDN, controladores) reducen errores en cambios repetitivos.

## Gestión de usuarios

### Ciclo de vida de las identidades

| Fase | Tareas |
|---|---|
| **Alta** | Identificador único, cuenta, grupos según el puesto, entrega segura de credenciales tras aceptar la política de seguridad |
| **Modificación** | Cambio de puesto: añadir y **quitar** permisos (evitar la acumulación de privilegios) |
| **Baja** | Inhabilitar la cuenta al dejar la organización o la función; conservarla el periodo de retención necesario para la trazabilidad |
| **Revisión** | Revisión periódica de permisos, cuentas inactivas y privilegiadas |

El **ENS** lo concreta en el grupo **op.acc**: identificador singular por entidad, usuario o proceso y **uno distinto por cada rol** (ciudadano, empleado, administrador), con cuentas inhabilitadas al cesar (op.acc.1); recursos protegidos según derechos (op.acc.2); **segregación de funciones** (op.acc.3: desarrollo y operación, o autorizar y controlar, en personas distintas); **todo acceso prohibido salvo autorización expresa, mínimo privilegio, necesidad de conocer** y revisión periódica (op.acc.4); y autenticación de los usuarios de la organización (op.acc.6) con aceptación de la política, credenciales bajo control exclusivo del usuario, **intentos limitados con bloqueo**, mensajes de error que no revelan información y **doble factor para el acceso desde zonas no controladas** como Internet.

### Servicios de directorio y LDAP

Un **servicio de directorio** es un **almacén de datos estructurado** con información sobre los **objetos y recursos de la red** (usuarios, grupos, equipos, impresoras) que **facilita su localización y administración** y centraliza la autenticación. **LDAP** (RFC 4510 a 4519) es el protocolo de acceso a directorios (TCP **389**; **636** para LDAPS); los objetos se identifican por su ***Distinguished Name***:

```text
dn: CN=Ana García,OU=Profesores,OU=Usuarios,DC=centro,DC=es
objectClass: user
sAMAccountName: agarcia
memberOf: CN=GG-Profesores,OU=Grupos,DC=centro,DC=es
```

Implementaciones: **Active Directory** (Microsoft), OpenLDAP, 389 Directory Server y Red Hat IdM/FreeIPA, y en la nube **Microsoft Entra ID** (antes Azure AD).

### Active Directory

| Elemento | Qué es |
|---|---|
| **Bosque** | Conjunto de uno o más dominios que comparten esquema, configuración y catálogo global; límite de seguridad |
| **Árbol** y **dominio** | Dominios con espacio de nombres DNS contiguo; el dominio es la unidad de administración y de replicación de los objetos |
| **Unidad organizativa (UO)** | Contenedor para **organizar objetos, delegar administración y vincular GPO** |
| **Objetos** | Usuarios, grupos, equipos, contactos, impresoras |
| **Controlador de dominio (DC)** | Servidor con una copia del directorio; replicación **multimaestro** |
| **Sitio** | Agrupa **subredes** con buena conectividad para controlar la replicación y el inicio de sesión en el DC más cercano |
| **Catálogo global** | Índice parcial de todos los objetos del bosque (TCP 3268/3269) |
| **Roles FSMO** | Cinco funciones de maestro único: de esquema y de nombres de dominio (por bosque); RID, emulador de PDC e infraestructura (por dominio) |
| **Relaciones de confianza** | Permiten que usuarios de un dominio accedan a recursos de otro |

AD depende de **DNS** (registros SRV para localizar los DC) y autentica con **Kerberos** (puerto 88). Windows Server 2025 añade un nuevo nivel funcional de dominio y bosque.

**Grupos**: por **tipo**, de seguridad (para permisos) o de distribución (para correo); por **ámbito**, **locales de dominio**, **globales** y **universales**. La estrategia clásica **AGDLP**: cuentas (**A**ccounts) en grupos **G**lobales, que se meten en grupos **D**omain **L**ocal, a los que se dan los **P**ermisos.

**Directivas de grupo (GPO)**: conjuntos de configuración de equipo y de usuario que se **vinculan a sitios, dominios o UO** y se aplican en el orden **local, sitio, dominio, UO** (gana la última, salvo que una GPO esté «exigida» o se bloquee la herencia); pueden filtrarse por grupos de seguridad o WMI. Cada GPO tiene una parte en el directorio (GPC) y otra en `SYSVOL` (GPT). Buena práctica: **crear primero una UO** (por ejemplo, «Profesores»), mover allí los usuarios y **vincular las GPO a esa UO**; no hace falta un bosque nuevo ni relaciones de confianza.

**Directivas de contraseña**: la directiva general del dominio va en la *Default Domain Policy*; para aplicar **políticas de contraseña distintas a usuarios o grupos concretos del mismo dominio** se usan las **directivas de contraseña específicas**, implementadas con objetos **PSO** (*Password Settings Objects*) que se aplican a usuarios o a grupos globales de seguridad.

| Herramienta | Uso |
|---|---|
| **Usuarios y equipos de Active Directory** (`dsa.msc`) | Herramienta gráfica nativa para crear usuarios, grupos y equipos, **añadir usuarios a grupos** y mover objetos entre UO |
| Centro de administración de AD (`dsac.exe`) | Interfaz moderna; papelera de reciclaje y PSO |
| Sitios y servicios (`dssite.msc`) | Sitios, subredes y replicación |
| Dominios y confianzas (`domain.msc`) | Relaciones de confianza |
| Administración de directivas de grupo (`gpmc.msc`) | Crear, vincular y modelar GPO |
| `lusrmgr.msc` | Solo usuarios **locales** (no existe en un DC) |

```powershell
# Instalar el rol de AD DS y promover el servidor a controlador de dominio
Install-WindowsFeature -Name AD-Domain-Services -IncludeManagementTools
Install-ADDSForest -DomainName "centro.es"                        # primer DC de un bosque nuevo
Install-ADDSDomainController -DomainName "centro.es" -InstallDns  # DC adicional

# Objetos
New-ADOrganizationalUnit -Name "Profesores" -Path "OU=Usuarios,DC=centro,DC=es"
New-ADUser -Name "Ana García" -SamAccountName agarcia -Path "OU=Profesores,OU=Usuarios,DC=centro,DC=es" -Enabled $true -AccountPassword (Read-Host -AsSecureString)
Add-ADGroupMember -Identity "GG-Profesores" -Members agarcia
Search-ADAccount -LockedOut ; Unlock-ADAccount -Identity agarcia
Search-ADAccount -AccountInactive -TimeSpan 90.00:00:00 -UsersOnly

# Sitios y directivas de contraseña específicas
New-ADReplicationSite -Name "PLANI"
New-ADReplicationSubnet -Name "10.30.0.0/16" -Site "PLANI"
New-ADFineGrainedPasswordPolicy -Name "PSO-Admins" -Precedence 10 -MinPasswordLength 16 -MaxPasswordAge "90.00:00:00" -ComplexityEnabled $true
Add-ADFineGrainedPasswordPolicySubject -Identity "PSO-Admins" -Subjects "GG-Administradores"
```

```bat
dcdiag /q                    :: diagnóstico del controlador de dominio (solo errores)
repadmin /replsummary        :: RESUMEN del estado de replicación entre controladores
repadmin /showrepl           :: detalle de la replicación de un DC
repadmin /syncall /AdeP      :: forzar la sincronización
netdom query fsmo            :: quién tiene cada rol FSMO
nltest /sc_verify:centro.es  :: comprobar el canal seguro con el dominio
gpupdate /force              :: volver a aplicar las directivas
gpresult /r                  :: conjunto resultante de directivas (RSoP) del usuario y el equipo
gpresult /h informe.html     :: el mismo informe en HTML
```

**Identidad híbrida y en la nube**: **Microsoft Entra ID** (nombre de Azure AD desde 2023) gestiona identidades para Microsoft 365 y aplicaciones en la nube, con **acceso condicional** y **MFA**; se sincroniza con el AD local mediante Entra Connect o Cloud Sync. Los equipos Linux se unen al dominio con **SSSD** y `realm join`.

### Cuentas privilegiadas

Cuentas de administración **separadas** de las de uso diario, modelo de **niveles** (*tiering*: quien administra controladores de dominio no inicia sesión en puestos), acceso **justo a tiempo**, contraseñas de administrador local distintas por equipo (Windows LAPS), almacenes de contraseñas, MFA obligatoria y registro de toda la actividad privilegiada.

## Gestión de dispositivos

### Inventario y gestión de puestos y servidores

- **Inventario** automático de *hardware* y *software* con responsable de cada elemento (ENS op.exp.1), **CMDB** y gestión de licencias: GLPI con su agente, OCS Inventory, Lansweeper, Configuration Manager.
- **Gestión centralizada** de la configuración: directivas de grupo, **Microsoft Configuration Manager**, **Intune** (gestión en la nube), Windows Autopilot para el despliegue; en Linux, Ansible o Red Hat Satellite; en macOS, Jamf.
- **Distribución de software y parches**, control de aplicaciones permitidas, cifrado de discos (BitLocker), protección del puesto (EDR).
- **Periféricos e impresoras**: servidores de impresión, colas, controladores y control de USB (ENS op.acc.2.r2 pide soluciones de control de acceso a los dispositivos).
- **Equipos de red**: inventario, *firmware*, copias de configuración y fin de soporte.

### Dispositivos móviles: MDM, MAM y UEM

| Concepto | Qué gestiona |
|---|---|
| **MDM** (*Mobile Device Management*) | **El dispositivo**: inscripción, políticas (PIN, cifrado), perfiles de Wi‑Fi, VPN y certificados, inventario, bloqueo y **borrado remoto** |
| **MAM** (*Mobile Application Management*) | **Las aplicaciones corporativas** y sus datos (copiar y pegar, guardar, cifrado), útil en dispositivos personales |
| MCM | El contenido corporativo |
| **EMM / UEM** | Gestión integrada de dispositivos, aplicaciones e identidades; **UEM** abarca también portátiles y PC |

**Inscripción (enrolamiento)**: registrar cada dispositivo en el MDM de la organización y **asociarlo a su usuario**, de forma que reciba las políticas, aplicaciones y perfiles. Puede ser manual o **automática desde fábrica** (*zero-touch*): Apple Business Manager con inscripción automatizada, Android Enterprise *zero-touch*, Samsung Knox Mobile Enrollment, Windows Autopilot.

| Modelo de propiedad | Significado |
|---|---|
| **BYOD** (*Bring Your Own Device*) | El usuario **usa su propio dispositivo personal** para tareas profesionales o educativas; se separan datos con perfil de trabajo o MAM |
| CYOD (*Choose Your Own Device*) | El usuario elige entre un catálogo de dispositivos de la organización |
| COPE (*Corporate-Owned, Personally Enabled*) | De la organización, con uso personal permitido |
| COBO (*Corporate-Owned, Business Only*) | De la organización, solo uso profesional |
| COSU | De la organización, dedicado a un único uso (quiosco) |

**Productos**: Microsoft Intune, Omnissa Workspace ONE (antes VMware), Ivanti, Citrix Endpoint Management, IBM MaaS360, ManageEngine, Miradore y Scalefusion (multiplataforma) y **Jamf** (Jamf Pro y **Jamf Now**, **exclusivos para dispositivos Apple**). Funciones clave: **cumplimiento** y acceso condicional (solo acceden al correo los dispositivos que cumplen), separación del espacio de trabajo (perfil de trabajo de Android, inscripción de usuario de Apple), borrado selectivo de los datos corporativos al dar de baja un dispositivo personal y localización de equipos perdidos.

## Monitorización y control de tráfico

### Qué se monitoriza

| Indicador | Ejemplos |
|---|---|
| **Disponibilidad** | Equipos y servicios activos (ping, comprobaciones HTTP, puertos) |
| **Rendimiento** | Caudal, utilización de enlaces, latencia, *jitter*, pérdida de paquetes, errores CRC |
| **Capacidad** | Tendencias de uso para planificar ampliaciones |
| **Seguridad** | Tráfico anómalo, intentos de acceso, firmas de ataques |
| **Servicio** | Tiempos de respuesta de aplicaciones y cumplimiento de los acuerdos de nivel de servicio |

### Herramientas de monitorización

| Herramienta | Tipo |
|---|---|
| **Nagios** (Core) | Monitorización de equipos y servicios con complementos (*plugins*) como `check_http` o `check_ping`; agentes NRPE |
| **Checkmk** (Check_MK) | **Software de monitorización** para Linux, nacido como extensión de Nagios; descubrimiento automático de servicios |
| Icinga | Bifurcación de Nagios |
| **Zabbix** | Servidor, agentes (TCP 10050 y 10051), SNMP, plantillas, alertas |
| **Prometheus** y **Grafana** | Métricas por sondeo de *exporters*, lenguaje PromQL y paneles |
| Cacti, MRTG, LibreNMS, PRTG | Gráficas de tráfico por SNMP |
| **Datadog**, Dynatrace, New Relic, Elastic | **Plataformas integradas de monitorización y seguridad** en la nube, con monitorización del rendimiento de aplicaciones (APM) |
| Nagstamon | Solo un visor de escritorio del estado de Nagios y similares |

```bash
/usr/local/nagios/bin/nagios -v /usr/local/nagios/etc/nagios.cfg   # verificar la configuración antes de recargar
systemctl reload nagios
/usr/local/nagios/libexec/check_http -H profesores.es -S -C 30       # comprobar HTTPS y que el certificado dura más de 30 días
```

**Ejercicio resuelto: utilización de un enlace por SNMP.** El contador `ifHCInOctets` de una interfaz de 100 Mbit/s vale 1 250 000 000 y, 300 s después, 1 287 500 000. Diferencia: 37 500 000 octetos × 8 = 300 000 000 bits; entre 300 s = **1 Mbit/s**, es decir, un **1 %** de utilización. Con contadores de 32 bits (`ifInOctets`) hay que vigilar el desbordamiento: a 1 Gbit/s un contador de 2³² octetos da la vuelta en unos 34 segundos, por eso se usan los de 64 bits (`ifHC…`, desde SNMPv2c).

### Análisis de flujos y réplica de puertos

- **NetFlow** (Cisco), **IPFIX** (RFC 7011, norma del IETF basada en NetFlow v9) y **sFlow** (por muestreo): los equipos exportan **resúmenes de conversaciones** (origen, destino, puertos, protocolo, bytes) a un colector; permiten saber **quién consume el ancho de banda** sin guardar los paquetes.
- **Réplica de puertos** (SPAN y RSPAN en Cisco) o **TAP** de red: copian el tráfico hacia una sonda (analizador, IDS) sin interrumpirlo.

### Captura y análisis de paquetes

```bash
tcpdump -i eth1 -w fichero.out              # capturar en eth1 y guardar en fichero (formato pcap)
tcpdump -r fichero.out -nn                  # leer la captura sin resolver nombres ni puertos
tcpdump -i eth0 -nn host 10.30.20.30 and tcp port 3306 -c 100
tshark -r fichero.out -Y "http.request"     # Wireshark en línea de órdenes con filtro de visualización
snoop -d net0 -o captura.snoop              # equivalente en Solaris (-d interfaz, -o fichero)
```

- `-i` elige la interfaz (`any` = todas), **`-w` escribe la captura en un fichero**, `-r` la lee, `-nn` evita resolver nombres y puertos, `-c` limita el número de paquetes; los filtros (BPF) usan `host`, `net`, `port`, `tcp`, `udp`.
- **Wireshark** analiza gráficamente las capturas con filtros de visualización (`ip.addr == 10.0.0.5`, `tcp.port == 443`, `dns`).
- En Windows: `pktmon` (incluido desde Windows 10) o `netsh trace start capture=yes`.
- Capturar tráfico de otras personas afecta a la privacidad: debe hacerse con autorización y finalidad definida.

### Control del tráfico

| Técnica | Qué hace |
|---|---|
| **QoS** | Clasificar y **marcar** el tráfico (DSCP en IP, 802.1p en Ethernet), darle colas con prioridad (voz y vídeo primero) |
| **Policing** frente a ***shaping*** | Descartar lo que excede un caudal / retrasarlo en un búfer para suavizarlo |
| **Listas de control de acceso (ACL)** | Permitir o denegar tráfico por direcciones, protocolos y puertos en conmutadores y *routers* |
| ***Storm control*** | Limitar las tormentas de difusión y multidifusión en un puerto |
| ***DHCP snooping***, ***Dynamic ARP Inspection***, *IP Source Guard* | Evitar servidores DHCP falsos, envenenamiento ARP y suplantación de IP |
| *Port security* y 802.1X | Limitar quién se conecta |
| Segmentación con VLAN y cortafuegos internos | Separar usuarios, servidores, gestión, voz e invitados |
| *Proxy* y filtrado de contenidos, IDS/IPS | Control de la navegación y detección de ataques (tema IV.9) |

Herramientas de prueba: `ping`, `mtr`, `iperf3` (mide el caudal real entre dos equipos), `traceroute`.

El **ENS** exige herramientas de **detección o prevención de intrusiones** (op.mon.1, basadas en reglas desde la categoría MEDIA y con procedimientos de respuesta en ALTA), un **sistema de métricas** (op.mon.2) y **vigilancia** con recolección automática de eventos de seguridad (op.mon.3, con correlación desde MEDIA). El CCN-CERT ofrece sistemas de alerta temprana (sondas SAT) para los organismos.

## Normativa y estándares clave

| Norma o estándar | Qué regula | Puntos clave |
|---|---|---|
| ISO/IEC 7498-4 y UIT‑T M.3400 | Marco de gestión OSI | Áreas **FCAPS**: fallos, configuración, contabilidad, rendimiento y seguridad |
| UIT‑T X.710 y X.711 | CMIS y **CMIP** | Gestión OSI orientada a objetos |
| **RFC 3411 a 3418** (STD 62) | **SNMPv3** | Arquitectura, USM (autenticación y cifrado) y VACM |
| RFC 1157, RFC 3416 | SNMPv1 y operaciones de SNMPv2 | `GetBulk`, `Inform` |
| RFC 6241, RFC 7950, RFC 8040 | NETCONF, YANG y RESTCONF | Configuración programable |
| RFC 7011 | IPFIX | Exportación de flujos |
| **IEEE 802.1Q** | VLAN y prioridades | Etiqueta de 4 bytes, VID de 12 bits |
| **IEEE 802.1X** | Control de acceso por puerto | Solicitante, autenticador y servidor RADIUS |
| RFC 4510 a 4519 | LDAP v3 | Modelo de directorio y protocolo (389/636) |
| **ENS** (RD 311/2022), **op.acc** | Control de acceso | Identificación singular por rol, mínimo privilegio, necesidad de conocer, segregación, bloqueo por intentos, doble factor desde zonas no controladas |
| ENS, op.exp.1 y op.exp.8 | Inventario y registro | Etiquetado de equipos y cableado; registros con reloj sincronizado |
| ENS, **op.mon** | Monitorización | Detección de intrusión, métricas y vigilancia |
| ISO/IEC 27002:2022 | Controles | 5.15 a 5.18 control de acceso e identidades; 8.16 monitorización; 8.20 a 8.22 seguridad y segregación de redes |

## Lo que más cae en el examen

En los nueve exámenes analizados hay **33 preguntas** de este tema: 23 de ingreso libre (2 en 2021, 6 en 2023, 4 en 2024, 5 en 2025 y 6 en el extraordinario de 2026) y 10 de promoción interna. Su peso ha crecido en los supuestos desde 2023.

| Bloque | Preguntas | Exámenes |
|---|---|---|
| **Active Directory y GPO**: qué es un directorio, `gpresult`, UO para aplicar GPO (×2), PSO, `dsa.msc` (×2), `Install-WindowsFeature AD-Domain-Services`, `repadmin /replsummary`, `New-ADReplicationSite` | 10 | LI 2023, 2024, 2025 y 2025‑ext; PI 2021, 2024 y 2025 |
| **Gestión de red, SNMP y FCAPS**: última versión de SNMP, protocolo de gestión de dispositivos (SNMP, CMIP ×2), `GetBulk`, MIB, FCAPS | 7 | LI 2021, 2023 y 2025‑ext; PI 2021 y 2023 |
| **Monitorización y captura**: Checkmk (×2), Nagios `-v` (×2), Datadog, `tcpdump -i eth1 -w` | 6 | LI 2023, 2024 y 2025‑ext; PI 2023 y 2024 |
| **Conmutadores y VLAN**: *tagged*, `switchport access vlan 1` (×2), puerto de acceso en la VLAN 10, MAC *sticky* | 5 | LI 2023, 2024, 2025 y 2025‑ext; PI 2024 |
| **Dispositivos móviles**: BYOD (×2), enrolamiento en MDM (×2), Jamf Now | 5 | LI 2021, 2024 y 2025‑ext; PI 2021 y 2024 |

Patrón: órdenes literales (Cisco IOS, PowerShell de AD, `repadmin`, `tcpdump`), siglas (BYOD, MIB, FCAPS, PSO) y productos (Checkmk, Datadog, Jamf) entre distractores inventados. Active Directory es desde 2024 el bloque que más crece en el supuesto de sistemas.

## Trampas habituales

- La última versión de SNMP es la **v3** (no existen v4 ni v5); v1 y v2c usan comunidades en claro.
- **`GetBulk`** sirve para tablas MIB grandes; `GetNext` recorre objeto a objeto; `Trap` no se confirma e `Inform` sí.
- La **MIB** es el conjunto de OID del dispositivo (no «MIR» ni «OID Database»).
- **CMIP** y SNMP son protocolos de gestión; SMTP, DNS y FTP no.
- FCAPS: fallos, configuración, **contabilidad**, rendimiento y seguridad; el almacenamiento no está.
- Tramas **etiquetadas** (*tagged*) con el VLAN ID en los troncales; *untagged* en los puertos de acceso.
- `switchport access vlan 1` asigna **el puerto** configurado a la VLAN 1 (no muestra equipos ni cambia todo el conmutador).
- PC en la VLAN 10: **`switchport mode access`** + **`switchport access vlan 10`** (no modo troncal).
- MAC ***sticky***: aprendida dinámicamente y añadida a la configuración en ejecución, que puede guardarse; apagar el puerto al recibir BPDU es **BPDU Guard** e ignorar STP es **PortFast**.
- Para aplicar GPO a un colectivo: **UO** primero (no bosque nuevo ni confianzas).
- Contraseñas distintas dentro del mismo dominio: **PSO** (directivas de contraseña específicas).
- Añadir un usuario a un grupo global en un DC: **`dsa.msc`**; `lusrmgr.msc` es para cuentas locales.
- Instalar AD DS: **`Install-WindowsFeature -Name AD-Domain-Services -IncludeManagementTools`**; promover a DC es otro paso (`Install-ADDSForest` o `Install-ADDSDomainController`).
- Replicación: **`repadmin /replsummary`**; `dcdiag` diagnostica el DC; `netdom query fsmo` lista roles; `nltest /sc_verify` comprueba el canal seguro.
- Sitio nuevo: **`New-ADReplicationSite`**.
- RSoP: **`gpresult`** (no `gpshow` ni `gplist`).
- **BYOD** = *Bring Your Own Device*; **enrolar** = asociar en el MDM cada dispositivo a su usuario.
- **Jamf** es solo para Apple; Miradore, Scalefusion o Citrix Endpoint Management son multiplataforma.
- **Checkmk** monitoriza; Nagstamon solo muestra el estado; Jenkins es integración continua; Redis es una base de datos.
- Verificar Nagios: **`nagios -v nagios.cfg`**.
- Capturar a fichero: **`tcpdump -i eth1 -w fichero.out`** (`-o` no es de tcpdump; en `snoop` el fichero va con `-o`).

## Repaso rápido

- FCAPS: fallos, configuración, contabilidad, rendimiento, seguridad.
- SNMP: gestor, agente, MIB y OID; UDP 161 y 162; Get, GetNext, GetBulk, Set, Trap, Inform; v3 con USM y VACM.
- CMIP (OSI), NETCONF/YANG, RESTCONF, syslog.
- 802.1Q: troncal etiquetado, acceso sin etiqueta, VLAN nativa; 4094 VLAN.
- Cisco: `switchport mode access`, `switchport access vlan N`, `switchport mode trunk`, *port security* con *sticky*, PortFast, BPDU Guard, `copy running-config startup-config`.
- DHCP (DORA, 67/68, *relay*, *snooping*), DNS, NTP (123).
- 802.1X con RADIUS; NAC; AAA con TACACS+; gestión fuera de banda.
- ENS op.acc: identificación por rol, mínimo privilegio, necesidad de conocer, segregación, bloqueo, doble factor desde Internet.
- Directorio = almacén estructurado de objetos de red; LDAP 389/636; DN con CN, OU y DC.
- AD: bosque, dominio, UO, DC, sitio, catálogo global, FSMO, confianzas; DNS y Kerberos.
- Grupos locales de dominio, globales y universales; AGDLP.
- GPO: local, sitio, dominio, UO; `gpupdate /force`, `gpresult /r`.
- PSO para contraseñas específicas; `dsa.msc`, `gpmc.msc`, `dssite.msc`.
- PowerShell de AD: `Install-WindowsFeature AD-Domain-Services`, `Install-ADDSForest`, `New-ADUser`, `Add-ADGroupMember`, `New-ADReplicationSite`; `repadmin`, `dcdiag`.
- Inventario y CMDB (op.exp.1); Intune, Configuration Manager, GLPI.
- MDM, MAM, UEM; inscripción *zero-touch*; BYOD, CYOD, COPE, COBO; Jamf solo Apple.
- Monitorización: Nagios, Checkmk, Zabbix, Prometheus y Grafana, Datadog.
- NetFlow, IPFIX, sFlow; SPAN y TAP; `tcpdump -w`, Wireshark.
- QoS (DSCP, 802.1p), *policing* y *shaping*, ACL, *storm control*, DHCP snooping, DAI.
- ENS op.mon: detección de intrusión, métricas y vigilancia.

## Fuentes

- RFC 3411, *An Architecture for Describing SNMP Management Frameworks*: https://www.rfc-editor.org/rfc/rfc3411
- RFC 3416, *Version 2 of the Protocol Operations for SNMP*: https://www.rfc-editor.org/rfc/rfc3416
- RFC 7860, HMAC-SHA-2 en el modelo USM de SNMPv3: https://www.rfc-editor.org/rfc/rfc7860
- RFC 6241, NETCONF: https://www.rfc-editor.org/rfc/rfc6241
- RFC 7011, IPFIX: https://www.rfc-editor.org/rfc/rfc7011
- RFC 4511, LDAP: https://www.rfc-editor.org/rfc/rfc4511
- UIT‑T M.3400, *TMN management functions*: https://www.itu.int/rec/T-REC-M.3400
- UIT‑T X.711, CMIP: https://www.itu.int/rec/T-REC-X.711
- IEEE 802.1Q: https://standards.ieee.org/ieee/802.1Q/10323/
- Real Decreto 311/2022, Esquema Nacional de Seguridad (op.acc, op.exp, op.mon) (BOE-A-2022-7191): https://www.boe.es/buscar/act.php?id=BOE-A-2022-7191
- Cisco, *Port Security* (Catalyst): https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9300/software/release/17-12/configuration_guide/sec/b_1712_sec_9300_cg/port_security.html
- Microsoft Learn, directivas de contraseña específicas (PSO): https://learn.microsoft.com/es-es/windows-server/identity/ad-ds/get-started/adac/fine-grained-password-policies
- Microsoft Learn, `repadmin`: https://learn.microsoft.com/es-es/previous-versions/windows/it-pro/windows-server-2012-r2-and-2012/cc770963(v=ws.11)
- Microsoft Learn, `New-ADReplicationSite`: https://learn.microsoft.com/es-es/powershell/module/activedirectory/new-adreplicationsite
- Microsoft Learn, instalar Servicios de dominio de Active Directory: https://learn.microsoft.com/es-es/windows-server/identity/ad-ds/deploy/install-active-directory-domain-services--level-100-
- Microsoft Learn, `gpresult`: https://learn.microsoft.com/es-es/windows-server/administration/windows-commands/gpresult
- Nagios Core, verificar la configuración: https://assets.nagios.com/downloads/nagioscore/docs/nagioscore/4/en/verifyconfig.html
- Checkmk, documentación: https://docs.checkmk.com/
- tcpdump, página de manual: https://www.tcpdump.org/manpages/tcpdump.1.html
- Jamf Now: https://www.jamf.com/products/jamf-now/
