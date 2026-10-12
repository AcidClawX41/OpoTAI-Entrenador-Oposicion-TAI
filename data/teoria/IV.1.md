# IV.1 · Administración del sistema operativo y software de base

Administrar un sistema operativo es mantenerlo **disponible, seguro y al día** durante todo su ciclo de vida: instalarlo y configurarlo, gestionar usuarios, permisos, servicios, almacenamiento y red, vigilar su funcionamiento, aplicar actualizaciones y repararlo cuando falla. Lo mismo vale para el **software de base** que corre sobre él (servidores web y de aplicaciones, entornos de ejecución, gestores de bases de datos, agentes). Este tema es el más «práctico» del bloque IV: en el examen casi todas sus preguntas piden **la orden exacta** para una tarea concreta en Linux (RHEL, Debian/Ubuntu), Windows (CMD y PowerShell) o un servidor web (IIS, Apache), sobre todo en el supuesto práctico de sistemas. Los fundamentos teóricos de los sistemas operativos (procesos, memoria, núcleo) están en el tema II.4; la seguridad, las redes y las copias se amplían en IV.2, IV.4, IV.5 y IV.9.

## Administración del sistema operativo: funciones y principios

### Software de base y software de aplicación

| Concepto | Qué es | Ejemplos |
|---|---|---|
| **Software de base** (o de sistema) | Programas que gestionan el *hardware* y dan servicio a las aplicaciones | Sistema operativo, controladores, *firmware*, utilidades, compiladores e intérpretes, entornos de ejecución, servidores web y de aplicaciones, SGBD, agentes de copias, antivirus/EDR o monitorización |
| **Software de aplicación** | Programas que resuelven necesidades del usuario o del negocio | Aplicación de expedientes, nóminas, sede electrónica, ofimática |
| ***Middleware*** | Software de base que conecta aplicaciones y sistemas | Servidores de aplicaciones, colas de mensajes, buses de servicios |

### Funciones del administrador de sistemas

- **Instalación y configuración** del sistema y del software de base siguiendo las guías del fabricante y las de bastionado (CCN-STIC, CIS).
- **Gestión de usuarios, grupos y permisos** con el principio de **mínimo privilegio**.
- **Gestión de servicios y procesos**: arrancar, parar, habilitar en el arranque, vigilar.
- **Gestión del almacenamiento**: discos, particiones, volúmenes, sistemas de ficheros, cuotas.
- **Configuración de red**: direcciones, rutas, resolución de nombres, cortafuegos local.
- **Actualización**: parches de seguridad, nuevas versiones, *firmware* y controladores.
- **Mantenimiento preventivo**: registros, espacio libre, rendimiento, capacidad, copias.
- **Reparación** y resolución de incidencias; documentación de todo lo anterior (inventario, procedimientos, cambios).

### Principios de buena administración

- **Mínimo privilegio y cuentas nominativas**: cada administrador usa su propia cuenta y eleva privilegios solo cuando lo necesita (`sudo` en Linux, Control de cuentas de usuario y «Ejecutar como administrador» en Windows); la cuenta `root` o `Administrador` no se usa para el día a día. El ENS exige retirar **cuentas y contraseñas estándar** antes de poner un equipo en operación (op.exp.2.1).
- **Mínima funcionalidad y seguridad por defecto** (ENS op.exp.2): solo los servicios imprescindibles; lo inseguro debe exigir una acción consciente.
- **Separación de entornos**: desarrollo, preproducción y producción; los cambios se prueban antes (op.exp.4.r1, op.exp.5).
- **Trazabilidad**: registro de la actividad (op.exp.8), gestión de cambios con número de referencia (op.exp.5) e inventario actualizado (op.exp.1).
- **Automatización y homogeneidad**: guiones (*scripts*) Bash o PowerShell, gestión de configuración (Ansible, directivas de grupo) e imágenes de referencia, para que todos los equipos queden iguales y documentados.

### Formas de administrar

| Vía | Linux/Unix | Windows |
|---|---|---|
| Consola local | Terminal (*shell* Bash) | Consolas MMC, CMD, PowerShell |
| Remota en línea de órdenes | **SSH** (TCP 22) | PowerShell Remoting sobre **WinRM** (TCP 5985 HTTP y 5986 HTTPS), OpenSSH (incluido desde Windows 10 1809 y Windows Server 2019) |
| Remota gráfica | Cockpit (consola web, TCP 9090), VNC | Escritorio remoto **RDP** (TCP 3389), Windows Admin Center |
| Fuera de banda | Controladoras de gestión del servidor (iLO, iDRAC, IPMI, Redfish): consola aunque el sistema esté caído | Igual |
| Centralizada | Ansible, Red Hat Satellite, Landscape, Puppet | Directivas de grupo (GPO), Configuration Manager, Intune |

### Sistemas operativos vigentes en 2026

| Familia | Versiones actuales | Datos de ciclo de vida |
|---|---|---|
| Windows (puesto) | Windows 11 **25H2** (30‑9‑2025, paquete de habilitación sobre 24H2) y **26H1** (febrero de 2026, solo para equipos nuevos); LTSC 2024 | Cada versión anual: **24 meses** en Home/Pro y **36 meses** en Enterprise/Education; la 24H2 Home/Pro termina el 13‑10‑2026. **Windows 10 dejó de tener soporte el 14‑10‑2025** (solo actualizaciones de seguridad extendidas, ESU, de pago) |
| Windows Server | **Windows Server 2025** (1‑11‑2024), 2022, 2019 | Política fija: soporte principal de 2025 hasta noviembre de 2029 y extendido hasta noviembre de 2034 |
| Red Hat | **RHEL 10** (mayo de 2025; 10.1 en noviembre de 2025), RHEL 9 | Ciclo de 10 años por versión mayor; derivadas compatibles: AlmaLinux, Rocky Linux, Oracle Linux. **CentOS Linux 7 terminó el 30‑6‑2024**; CentOS Stream es la rama previa a RHEL |
| Debian | **Debian 13 «trixie»** (9‑8‑2025) | Unos 5 años entre seguridad y LTS |
| Ubuntu | **Ubuntu 26.04 LTS** (abril de 2026), 24.04 LTS | 5 años de soporte estándar, ampliables con Ubuntu Pro |
| Unix | Oracle Solaris 11.4, IBM AIX | Actualizaciones por SRU en Solaris |

## Administración de sistemas Linux y Unix

### Estructura de directorios (FHS)

La **Filesystem Hierarchy Standard** (FHS 3.0, Linux Foundation) fija dónde va cada cosa:

| Directorio | Contenido |
|---|---|
| `/boot` | Núcleo (`vmlinuz`), *initramfs* y cargador GRUB; en UEFI, la partición EFI en `/boot/efi` |
| `/etc` | **Configuración** del sistema y de los servicios (ficheros de texto) |
| `/home` y `/root` | Directorios personales de los usuarios y del superusuario |
| `/bin`, `/sbin`, `/usr` | Programas; en las distribuciones actuales `/bin` y `/sbin` son enlaces a `/usr/bin` y `/usr/sbin` |
| `/lib`, `/lib64` | Bibliotecas compartidas y módulos del núcleo |
| `/var` | Datos variables: registros en **`/var/log`**, colas en `/var/spool`, estado en `/var/lib` |
| `/tmp` | Temporales (con bit *sticky*) |
| `/dev` | Ficheros de dispositivo (`/dev/sda`, `/dev/nvme0n1`) |
| `/proc` y `/sys` | Sistemas de ficheros virtuales con información del núcleo, procesos y dispositivos |
| `/run` | Datos volátiles desde el arranque (PID, *sockets*) |
| `/opt`, `/srv` | Software de terceros; datos que sirve el equipo (web, FTP) |
| `/mnt`, `/media` | Puntos de montaje temporales y de soportes extraíbles |

### Arranque y servicios con systemd

Secuencia de arranque: **firmware UEFI** (o BIOS) → cargador **GRUB 2** (con *shim* si hay Arranque seguro) → **núcleo + initramfs** → **systemd** (proceso con PID 1) → objetivo por defecto (`default.target`). systemd sustituye al antiguo `init` de System V: los **niveles de ejecución** (*runlevels*) pasan a ser ***targets***.

![Diagrama de flujo del arranque de Linux: firmware UEFI o BIOS, shim solo con Arranque seguro, GRUB 2, núcleo con initramfs, systemd como PID 1 y default.target, que lleva a multi-user.target (servidores) o graphical.target (escritorio); systemd también puede ir a rescue.target o emergency.target](diagramas/IV.1-arranque-linux.svg)

*Figura: secuencia de arranque hasta el target por defecto.*

| Nivel SysV | *Target* de systemd | Uso |
|---|---|---|
| 0 | `poweroff.target` | Apagar |
| 1 (S) | `rescue.target` | Modo de rescate monousuario: sistemas de ficheros locales montados, sin red |
| — | `emergency.target` | Mínimo absoluto: raíz en solo lectura y *shell* de root |
| 2, 3, 4 | `multi-user.target` | Multiusuario con red y sin entorno gráfico (servidores) |
| 5 | `graphical.target` | Multiusuario con entorno gráfico |
| 6 | `reboot.target` | Reiniciar |

```bash
systemctl status nginx            # estado, PID y últimas líneas del registro
systemctl start nginx             # arrancar ahora (stop = parar)
systemctl restart tomcat9         # parar y arrancar
systemctl reload nginx            # releer la configuración sin cortar el servicio (si lo admite)
systemctl enable nginx            # arranque automático al iniciar el sistema
systemctl enable --now nginx      # habilitar y arrancar en un solo paso
systemctl disable nginx           # quitar del arranque
systemctl mask nginx              # impedir que arranque, incluso a mano
systemctl is-active nginx         # ¿está en ejecución?
systemctl is-enabled nginx        # ¿arranca con el sistema?
systemctl list-units --type=service --state=running
systemctl --failed                # unidades que han fallado
systemctl daemon-reload           # obligatorio tras editar un fichero de unidad
systemctl get-default             # target por defecto
systemctl set-default multi-user.target
```

Un servicio propio se describe con un **fichero de unidad** en `/etc/systemd/system/` (los de los paquetes están en `/usr/lib/systemd/system/`):

```ini
# /etc/systemd/system/informes.service
[Unit]
Description=Generación de informes nocturnos
After=network-online.target postgresql.service
Wants=network-online.target

[Service]
Type=oneshot
User=informes
ExecStart=/opt/informes/bin/generar.sh

[Install]
WantedBy=multi-user.target
```

Recuerda: `start` actúa **ahora** y `enable` actúa **en el próximo arranque**; son independientes. La antigua orden `service nginx start` sigue funcionando como envoltorio, pero la forma propia de systemd es `systemctl`.

### Usuarios, grupos y privilegios

Las cuentas locales se guardan en ficheros de texto:

| Fichero | Contenido | Permisos |
|---|---|---|
| `/etc/passwd` | Una línea por usuario con 7 campos: nombre, `x` (la contraseña está en *shadow*), UID, GID principal, comentario (GECOS), directorio personal y *shell* | Legible por todos |
| **`/etc/shadow`** | **Hash de la contraseña** y datos de caducidad (9 campos) | Solo root |
| `/etc/group` y `/etc/gshadow` | Grupos y sus miembros | — |
| `/etc/sudoers` y `/etc/sudoers.d/` | Quién puede usar `sudo` y para qué | Editar con `visudo` |
| `/etc/login.defs` | Valores por defecto (UID mínimo, caducidad) | — |

```text
/etc/passwd →  ana:x:1001:1001:Ana García:/home/ana:/bin/bash
/etc/shadow →  ana:$y$j9T$...hash...:20737:0:90:7:14::
               usuario:hash:último cambio (días desde 1-1-1970):mín:máx:aviso:inactividad:caducidad:reservado
```

El prefijo del *hash* indica el algoritmo: `$6$` SHA-512, `$y$` yescrypt (por defecto en Debian y Ubuntu recientes); `$1$` (MD5) está obsoleto. Un `!` o `*` en lugar del *hash* significa cuenta bloqueada o sin contraseña utilizable. El **UID 0** es root; las cuentas de sistema usan UID bajos y las de personas empiezan en 1000.

```bash
useradd -m -s /bin/bash -c "Ana García" ana   # crear con directorio personal
passwd ana                                     # asignar contraseña
usermod -aG wheel ana     # añadir a un grupo secundario (sin -a, -G SUSTITUYE los grupos)
chage -l ana              # ver caducidad de la contraseña
chage -M 90 -W 7 ana      # máximo 90 días, aviso 7 días antes
passwd -l ana             # bloquear (passwd -u desbloquea)
userdel -r ana            # borrar usuario y su directorio personal
id ana ; groups ana ; getent passwd ana
sudo -l                   # qué puedo ejecutar con sudo
su -                      # abrir sesión de root con su entorno
last ; lastb ; who ; w    # accesos correctos, fallidos y sesiones abiertas
```

En RHEL el grupo de administradores con `sudo` es **`wheel`**; en Debian y Ubuntu, **`sudo`**. La autenticación pasa por **PAM** (`/etc/pam.d/`), donde se configuran la calidad de contraseñas (`pam_pwquality`) y el bloqueo por intentos fallidos (`pam_faillock`).

### Permisos y atributos

`ls -l` muestra el tipo y tres tríos de permisos (propietario, grupo, otros):

```text
-rwxr-x---  1 ana contabilidad  2048 oct 11 09:00 cierre.sh
│└┬┘└┬┘└┬┘
│ │  │  └── otros: ---  (0)
│ │  └───── grupo: r-x  (4+0+1 = 5)
│ └──────── propietario: rwx (4+2+1 = 7)   →  750
└────────── tipo: - fichero, d directorio, l enlace, b/c dispositivo, s socket, p tubería
```

| Permiso | Valor | En un fichero | En un directorio |
|---|---|---|---|
| `r` | 4 | Leer | Listar el contenido |
| `w` | 2 | Modificar | Crear, borrar y renombrar entradas |
| `x` | 1 | Ejecutar | Entrar y atravesar (`cd`) |
| **SUID** | 4000 | Se ejecuta con el UID del propietario (`/usr/bin/passwd`: `-rwsr-xr-x`) | — |
| **SGID** | 2000 | Se ejecuta con el GID del grupo | Los ficheros nuevos heredan el grupo del directorio |
| ***Sticky*** | 1000 | — | Solo el dueño borra sus ficheros (`/tmp`: `drwxrwxrwt`) |

Si el bit especial aparece en **mayúscula** (`S`, `T`) es que falta el permiso `x` debajo. La **`umask`** resta permisos a los ficheros nuevos: con `umask 022` los ficheros nacen `644` y los directorios `755`.

```bash
chmod 750 cierre.sh            # notación octal
chmod u+x script.sh            # simbólica: u propietario, g grupo, o otros, a todos
chmod g-w,o= informe.txt       # quitar escritura al grupo y todo a otros
chmod +x script.sh             # sin indicar quién = a todos (respetando la umask)
chown ana:contabilidad informe.txt ; chown -R ana /srv/datos
setfacl -m u:luis:rw informe.txt   # ACL: permiso a un usuario concreto
getfacl informe.txt                # ver ACL (ls -l muestra un «+» al final)
chattr +i /etc/resolv.conf         # atributo inmutable (lsattr para verlo)
```

**Ejercicio resuelto.** `script.sh` tiene `-rw-r--r--` (644) y hay que hacerlo ejecutable **solo por el propietario**, sin tocar grupo ni otros. `chmod u+x script.sh` deja `-rwxr--r--` (744). En cambio `chmod +x` y `chmod a+x` dan `-rwxr-xr-x` (755) y `chmod 755` también, porque añaden `x` al grupo y a otros.

### Procesos y señales

```bash
ps aux ; ps -ef                # todos los procesos
top ; htop                     # vista dinámica de CPU y memoria
pgrep -a nginx                 # buscar procesos por nombre
kill 1234                      # envía SIGTERM (15): terminación ordenada
kill -9 1234                   # SIGKILL: muerte inmediata, no se puede capturar
pkill -HUP rsyslogd            # SIGHUP: muchos demonios releen su configuración
nice -n 10 ./copia.sh          # arrancar con menos prioridad (de -20, máxima, a 19, mínima)
renice -n 5 -p 1234
nohup ./largo.sh &             # seguir tras cerrar la sesión; jobs, bg y fg gestionan los trabajos
uptime                         # carga media de 1, 5 y 15 minutos
free -h ; vmstat 2 ; iostat -x 2 ; lsof -i :443
```

| Señal | Número | Efecto |
|---|---|---|
| SIGHUP | 1 | Colgar; en demonios, releer la configuración |
| SIGINT | 2 | Interrupción desde el teclado (Ctrl+C) |
| SIGKILL | 9 | Matar sin posibilidad de captura (último recurso) |
| SIGTERM | 15 | Terminar ordenadamente (la señal por defecto de `kill`) |
| SIGTSTP | 20 | Suspender desde el teclado (Ctrl+Z) |
| SIGCONT | 18 | Reanudar un proceso detenido |

### Gestión de paquetes

| Tarea | Debian y Ubuntu | RHEL y Fedora | SUSE |
|---|---|---|---|
| Actualizar la información de los repositorios | **`apt update`** | `dnf makecache` / `dnf check-update` | `zypper refresh` |
| Instalar desde repositorio | `apt install nginx` | `dnf install nginx` | `zypper install nginx` |
| Actualizar lo instalado | `apt upgrade` / `apt full-upgrade` | `dnf upgrade` (`dnf update`) | `zypper update` |
| Solo parches de seguridad | `unattended-upgrades` | `dnf upgrade --security` | `zypper patch --category security` |
| Instalar un paquete local | `dpkg -i paquete.deb` | `rpm -ivh paquete.rpm` | `rpm -ivh` |
| Desinstalar | `apt remove` (`purge` borra también la configuración) | `dnf remove` | `zypper remove` |
| Listar instalados | `dpkg -l`, `apt list --installed` | `rpm -qa`, `dnf list installed` | `rpm -qa` |
| ¿De qué paquete es un fichero? | `dpkg -S /ruta` | `rpm -qf /ruta` | `rpm -qf /ruta` |
| Ficheros de un paquete | `dpkg -L paquete` | `rpm -ql paquete` | `rpm -ql paquete` |
| Historial y deshacer | `/var/log/apt/history.log` | `dnf history`, `dnf history undo N` | Instantáneas Btrfs (*snapper*) |
| Repositorios | `/etc/apt/sources.list.d/` | `/etc/yum.repos.d/*.repo` | `/etc/zypp/repos.d/` |

Diferencias que se preguntan: **`apt update` descarga la información de los paquetes desde todas las fuentes configuradas** pero no instala nada; `apt upgrade` instala las versiones nuevas **sin eliminar** paquetes; `apt full-upgrade` (antes `apt-get dist-upgrade`) puede **eliminar** paquetes para resolver dependencias; `apt autoremove` quita dependencias que ya no hacen falta. En RHEL, `yum` es hoy un alias de `dnf`. Ubuntu (desde 24.04) guarda las fuentes en formato **deb822** (`ubuntu.sources`) y el APT 3 de Debian 13 trae `apt modernize-sources` para convertir el formato clásico.

### Almacenamiento y sistemas de ficheros

```bash
lsblk -f                        # discos, particiones, tipo de sistema de ficheros y montaje
blkid                           # UUID de cada dispositivo
df -h                           # ocupación por sistema de ficheros
du -sh /var/log/*               # ocupación por directorio
mount /dev/sdb1 /datos ; umount /datos ; findmnt /datos
mkfs.xfs /dev/sdb1              # crear sistema de ficheros (borra el contenido)
fsck -y /dev/sda8               # comprobar y reparar respondiendo «sí» a todo (desmontado)
xfs_repair /dev/sdb1            # reparar XFS (fsck.xfs no hace nada)
```

Reglas de **`fsck`**: se ejecuta sobre sistemas de ficheros **desmontados** (o desde el modo de rescate), nunca sobre uno montado en lectura y escritura; `-y` contesta afirmativamente a todas las reparaciones, `-n` solo comprueba sin cambiar nada y `-f` fuerza la comprobación aunque parezca limpio. Para ext4 llama a `e2fsck`; para XFS hay que usar `xfs_repair`.

El montaje permanente se declara en **`/etc/fstab`**:

```text
# dispositivo                                punto    tipo  opciones          dump  pass
UUID=3f1c2a9e-0b7d-4c55-9e1a-2b6f8d0c7a11    /datos   xfs   defaults,noatime  0     2
/dev/mapper/vg_datos-lv_logs                 /logs    ext4  defaults          0     2
```

El último campo (*pass*) indica el orden de comprobación en el arranque: 1 para la raíz, 2 para el resto y 0 para no comprobar. Con **LVM** (volúmenes físicos → grupos de volúmenes → volúmenes lógicos) se puede crecer en caliente:

```bash
pvcreate /dev/sdc                             # preparar el disco nuevo
vgextend vg_datos /dev/sdc                    # añadirlo al grupo de volúmenes
lvextend -r -L +20G /dev/vg_datos/lv_datos    # ampliar el volumen y (-r) su sistema de ficheros
pvs ; vgs ; lvs                               # resumen
```

**XFS crece pero no se puede reducir**; ext4 admite ambas operaciones (reducir solo desmontado). Sistemas de ficheros por defecto: **XFS en RHEL**, **ext4 en Debian y Ubuntu**, **Btrfs** en la raíz de SUSE y en Fedora.

### Red

| Tarea | Linux actual | Orden antigua | Windows |
|---|---|---|---|
| Direcciones de una interfaz | `ip addr show eth0` | `ifconfig eth0` | `ipconfig /all` |
| Tabla de rutas | **`ip route show`** | `route -n`, `netstat -rn` | **`route print`** |
| Ruta efectiva hacia un destino | **`ip route get 10.30.20.30`** | — | `Find-NetRoute -RemoteIPAddress 10.30.20.30` |
| Puertos en escucha | **`ss -ltn`** (`-tulpn` con UDP y proceso) | `netstat -tulpn` | `netstat -ano` |
| Probar un puerto TCP | **`nc -vz 10.30.20.30 3306`** | `telnet host puerto` | `Test-NetConnection host -Port 3306` |
| Explorar puertos de un servidor | **`nmap`** | — | `nmap` (también existe) |
| Tabla ARP o de vecinos | `ip neigh` | `arp -an` | `arp -a` |
| Resolución de nombres | `dig`, `host`, `nslookup`, `resolvectl` | — | `nslookup`, `Resolve-DnsName` |
| Vaciar la caché DNS | `resolvectl flush-caches` | — | **`ipconfig /flushdns`** |
| Camino de los paquetes | `traceroute`, `tracepath`, `mtr` | — | `tracert`, `pathping` |
| Nombre del equipo | `hostname`, **`hostname -f`** (FQDN), `hostnamectl` | — | `hostname` |

```bash
ip addr show eth0                          # IP, máscara y MAC de eth0
ip route show                              # tabla de rutas (abreviado: ip r)
ip route get 10.30.20.30                   # interfaz y siguiente salto que usaría el núcleo
ip route add 10.0.5.0/24 via 10.0.5.150    # ruta temporal (se pierde al reiniciar)
nmcli connection modify eth0 +ipv4.routes "10.0.5.0/24 10.0.5.150"   # ruta persistente
nmcli connection up eth0
ss -ltn                                    # sockets TCP en escucha, numéricos
ss -tulpn                                  # TCP y UDP en escucha con el proceso
nc -vz 10.30.20.30 3306                    # ¿acepta conexiones TCP ese puerto?
nc -v 10.0.4.22 422                        # conectar y ver el resultado (sintaxis: host puerto)
nmap -sT -p 1-1024 10.0.4.22               # explorar puertos abiertos de un servidor
dig www.boe.es ; dig -x 193.146.1.1        # consulta directa e inversa
hostname -f                                # nombre completo cualificado (FQDN)
```

En RHEL la red la gestiona **NetworkManager** (`nmcli`, `nmtui`); en Ubuntu, **netplan** (`/etc/netplan/*.yaml` y `netplan apply`); en Debian clásico, `/etc/network/interfaces`. El paquete *net-tools* (`ifconfig`, `route`, `netstat`, `arp`) está obsoleto, aunque sus órdenes siguen apareciendo en el examen. El cortafuegos local (`firewalld` con `firewall-cmd` en RHEL, `ufw` en Ubuntu) se estudia en IV.9.

### Registros, auditoría y SELinux

| Registro | RHEL y Fedora | Debian y Ubuntu |
|---|---|---|
| Sistema general | `/var/log/messages` | `/var/log/syslog` (si está instalado rsyslog) |
| Autenticación | `/var/log/secure` | `/var/log/auth.log` |
| Auditoría | `/var/log/audit/audit.log` | Ídem, si se instala `auditd` |
| Servidor web | `/var/log/httpd/`, `/var/log/nginx/` | `/var/log/apache2/`, `/var/log/nginx/` |
| Paquetes | `/var/log/dnf.log` | `/var/log/apt/history.log`, `/var/log/dpkg.log` |
| *Journal* de systemd | `journalctl` (persistente si existe `/var/log/journal`) | Ídem; desde Debian 12 rsyslog ya no se instala por defecto y el *journal* es el registro principal |

```bash
journalctl -u nginx -n 50          # últimas 50 líneas del registro de la unidad nginx
journalctl -u nginx -f             # seguir en tiempo real
journalctl -b -p err               # errores desde el arranque actual
journalctl --since "2026-10-11 08:00" --until "1 hour ago"
journalctl -k                      # mensajes del núcleo (como dmesg)
journalctl --vacuum-time=30d       # borrar entradas de más de 30 días
tail -f /var/log/messages          # ver un fichero en tiempo real a medida que crece
tail -n 100 /var/log/secure ; grep -i "failed password" /var/log/secure
logger -p auth.warning "Prueba"    # escribir un mensaje en el registro
```

La rotación la hace **logrotate** (`/etc/logrotate.conf` y `/etc/logrotate.d/`) y el reenvío a un servidor central o SIEM, **rsyslog** (`*.* @@siem.organismo.es:514`, donde `@@` es TCP y `@` es UDP). El ENS (op.exp.8) exige registrar usuario, fecha y hora, objeto, tipo y resultado de cada evento, **activar los registros en los servidores**, y en categoría media **revisarlos, sincronizar el reloj** (NTP con `chrony`), fijar la **retención** y proteger su acceso.

**auditd** es el subsistema de **auditoría del núcleo**: vigila accesos y modificaciones a ficheros, llamadas al sistema y acciones de usuarios según reglas.

```bash
auditctl -w /etc/passwd -p wa -k cuentas   # vigilar escritura (w) y cambio de atributos (a)
auditctl -l                                # reglas activas
# reglas permanentes: /etc/audit/rules.d/*.rules y después «augenrules --load»
ausearch -k cuentas -i                     # buscar eventos por clave, interpretados
aureport --auth                            # informe de autenticaciones
```

**SELinux** (RHEL, Fedora) es un control de acceso **obligatorio** (MAC): cada proceso y fichero lleva un **contexto** (`usuario:rol:tipo:nivel`, por ejemplo `system_u:object_r:httpd_sys_content_t:s0`) y la política decide qué tipo de proceso accede a qué tipo de objeto, aunque los permisos clásicos lo permitan. Modos: **enforcing** (aplica y registra), **permissive** (solo registra) y **disabled**. Las denegaciones se registran como mensajes **AVC** en `audit.log`.

```bash
getenforce ; sestatus                       # modo actual
setenforce 0                                # permissive hasta el reinicio (1 = enforcing)
# modo permanente: SELINUX=enforcing en /etc/selinux/config
ls -Z /var/www/html ; ps -eZ                # contextos de ficheros y procesos
ausearch -m AVC -ts recent                  # denegaciones recientes
sealert -a /var/log/audit/audit.log         # explica la causa y propone la solución
semanage fcontext -a -t httpd_sys_content_t "/srv/web(/.*)?"   # regla de etiquetado permanente
restorecon -Rv /srv/web                     # reetiquetar según la política
getsebool -a ; setsebool -P httpd_can_network_connect on       # interruptores (booleanos)
semanage port -a -t http_port_t -p tcp 8081 # permitir al servidor web un puerto no estándar
```

Flujo típico ante un «permission denied» con permisos aparentemente correctos: comprobar que SELinux está en *enforcing*, buscar la denegación (`ausearch -m AVC`), **analizar la causa con `sealert`** (paquete *setroubleshoot*) o `audit2why`, y corregir con `restorecon`/`semanage fcontext` (etiqueta incorrecta), `setsebool` (comportamiento desactivado) o `semanage port`. `audit2allow` genera un módulo de política a medida, solo como último recurso. Debian y Ubuntu usan AppArmor (perfiles por programa) en lugar de SELinux.

### Tareas programadas

**cron** ejecuta órdenes periódicas. Cada línea de `crontab` tiene **cinco campos de tiempo** y la orden:

```text
┌──────────── minuto (0-59)
│ ┌────────── hora (0-23)
│ │ ┌──────── día del mes (1-31)
│ │ │ ┌────── mes (1-12)
│ │ │ │ ┌──── día de la semana (0-7; 0 y 7 son domingo)
│ │ │ │ │
0 5 8 11 *    /usr/local/bin/tarea.sh   → a las 05:00 del 8 de noviembre
*/15 * * * *  /usr/local/bin/sonda.sh   → cada 15 minutos
30 2 * * 1-5  /usr/local/bin/copia.sh   → a las 02:30 de lunes a viernes
0 0 1 * *     /usr/local/bin/mensual.sh → a medianoche del día 1 de cada mes
@reboot       /usr/local/bin/inicio.sh  → al arrancar
```

- `crontab -e` edita, `crontab -l` lista y **`crontab -r` borra todo** el crontab del usuario; `crontab -u ana -l` actúa sobre otro usuario.
- `/etc/crontab` y `/etc/cron.d/*` llevan un **sexto campo con el usuario**; los directorios `/etc/cron.daily/`, `cron.weekly/` y `cron.monthly/` ejecutan guiones con esa periodicidad (anacron recupera las ejecuciones perdidas en equipos que no están siempre encendidos).
- Si se restringen **a la vez** el día del mes y el día de la semana, la tarea se ejecuta cuando se cumple **cualquiera** de los dos.
- **`at`** programa una ejecución única (`at 23:00`, `atq`, `atrm`).
- Los **temporizadores de systemd** (`.timer` con `OnCalendar=*-*-* 02:30:00`, `systemctl list-timers`) son la alternativa moderna, con registro en el *journal*.

### Información del sistema

```bash
uname -r                  # versión del núcleo (p. ej., 6.12.0-…)
uname -a                  # núcleo, nombre de equipo, arquitectura
cat /etc/os-release       # distribución y versión (común a todas)
cat /etc/redhat-release   # RHEL y derivadas: «Red Hat Enterprise Linux release 10.0 (Coughlan)»
hostnamectl               # nombre, sistema, núcleo, arquitectura y virtualización
lscpu ; free -h ; lsblk ; lspci ; lsusb ; dmidecode -t system
pwd ; mkdir -p /srv/datos/2026 ; ls -la ; cd /etc   # orden básicas de ficheros
```

### Un ejemplo de guion Bash de mantenimiento

```bash
#!/usr/bin/env bash
# Comprueba el espacio libre y avisa si algún sistema de ficheros supera el 85 %
set -euo pipefail
UMBRAL=85
df -P -x tmpfs -x devtmpfs | awk 'NR>1 {gsub("%","",$5); print $5, $6}' |
while read -r uso punto; do
  if [ "$uso" -ge "$UMBRAL" ]; then
    logger -p user.warning "Disco: $punto al $uso %"
  fi
done
```

### Unix propietarios: Oracle Solaris

Solaris 11 comparte las ideas de Unix pero con herramientas propias: **SMF** para servicios (`svcs -a`, `svcs -x` para diagnosticar, `svcadm enable|restart network/ssh`), **IPS** para paquetes (`pkg install`, `pkg update`, que crea un nuevo **entorno de arranque** al que se puede volver con `beadm`), **ZFS**, **zonas** (contenedores) e `ipadm`/`dladm` para la red. Una ruta **persistente** se añade con `-p`:

```bash
route -p add -net 10.0.5.0/24 -gateway 10.0.5.150   # ruta estática que sobrevive al reinicio
route -p show                                        # rutas persistentes
netstat -rn                                          # tabla de rutas activa
```

## Administración de sistemas Windows

### Herramientas gráficas

| Consola | Orden | Para qué |
|---|---|---|
| Administración de equipos | `compmgmt.msc` | Reúne visor de eventos, usuarios locales, discos y servicios |
| Servicios | `services.msc` | Arrancar, parar y tipo de inicio |
| Visor de eventos | `eventvwr.msc` | Registros del sistema |
| Administración de discos | `diskmgmt.msc` | Particiones y volúmenes |
| Administrador de dispositivos | `devmgmt.msc` | Controladores: actualizar, deshabilitar, **revertir** |
| Usuarios y grupos locales | `lusrmgr.msc` | Cuentas locales (no existe en las ediciones Home) |
| Directiva de seguridad local | `secpol.msc` | Contraseñas, bloqueo, auditoría, derechos de usuario |
| Editor de directivas de grupo local | `gpedit.msc` | Directiva local del equipo |
| Programador de tareas | `taskschd.msc` | Tareas programadas |
| Monitor de rendimiento y de recursos | `perfmon.msc`, `resmon` | Contadores y consumo por proceso; `perfmon /rel` abre el Monitor de confiabilidad |
| Configuración del sistema | `msconfig` | Arranque selectivo, modo seguro |
| Información del sistema | `msinfo32` | Inventario de *hardware* y *software* |
| Editor del Registro | `regedit` | Registro de Windows |
| Usuarios y equipos de Active Directory | `dsa.msc` | Cuentas del dominio (herramientas RSAT) |
| Administración de directivas de grupo | `gpmc.msc` | GPO del dominio |

En servidores se usan además el **Administrador del servidor**, **Windows Admin Center** (consola web) y las utilidades **Sysinternals** (Process Explorer, Autoruns, PsExec).

### Línea de órdenes (CMD) y órdenes NET

| Orden | Qué hace |
|---|---|
| `net user` | Lista las cuentas locales |
| `net user Infocentro` | Muestra los datos de una cuenta: último inicio, caducidad, grupos |
| `net user ana Clave.2026 /add` | Crea una cuenta (`/active:no` la deshabilita; `/domain` actúa en el dominio) |
| `net localgroup` | Lista los grupos locales |
| `net localgroup administradores` | Muestra los miembros del grupo local Administradores |
| `net localgroup administradores ana /add` | Añade un miembro al grupo |
| **`net accounts`** | Muestra la **directiva de cuentas y contraseñas**: duración, longitud mínima, historial, bloqueo |
| **`net start`** | Sin argumentos, **lista los servicios en ejecución**; con un nombre, lo arranca |
| `net stop "Spooler"` | Detiene un servicio |
| `net share` / `net use Z: \\srv01\datos` | Recursos compartidos / conectar una unidad de red |
| `net session` / `net view \\srv01` | Sesiones abiertas contra el equipo / recursos de otro equipo |

Los nombres de los grupos integrados están **traducidos**: «Administradores» en un Windows en español y «Administrators» en inglés (su SID, `S-1-5-32-544`, es el mismo). Otras órdenes útiles:

```bat
whoami /all                 :: usuario, grupos y privilegios del token actual
systeminfo                  :: versión, parches instalados, memoria, dominio
sc query wuauserv           :: estado de un servicio (sc qc muestra su configuración)
sc config wuauserv start= disabled   :: tipo de inicio (ojo: espacio tras «start=»)
tasklist /svc               :: procesos y servicios que alojan
taskkill /PID 4321 /F       :: terminar un proceso por PID (/IM por nombre)
gpupdate /force             :: volver a aplicar las directivas de grupo
gpresult /r                 :: directivas aplicadas al equipo y al usuario
shutdown /r /t 0            :: reiniciar ya (/s apaga)
schtasks /create /tn "Copia" /tr "C:\scripts\copia.cmd" /sc daily /st 02:00 /ru SYSTEM
winget upgrade --all        :: actualizar aplicaciones con el gestor de paquetes de Windows
```

### PowerShell

PowerShell es el *shell* y lenguaje de automatización de Microsoft. Sus órdenes (*cmdlets*) siguen el patrón **Verbo-Sustantivo** (`Get-Service`, `Copy-Item`, `Restart-Computer`) y la **canalización (*pipeline*) pasa objetos**, no texto, por lo que se filtra por propiedades (`$_.Status`). Hay dos ediciones:

| Edición | Ejecutable | Base | Situación en 2026 |
|---|---|---|---|
| **Windows PowerShell 5.1** | `powershell.exe` | .NET Framework | Incluida en Windows; ya no evoluciona |
| **PowerShell 7** | `pwsh.exe` | .NET, multiplataforma (Windows, Linux, macOS) | **7.6 LTS** (marzo de 2026, sobre .NET 10); la 7.4 LTS termina en noviembre de 2026 |

Novedad para quien estudie con exámenes antiguos: **Windows PowerShell 2.0 se eliminó** de Windows 11 24H2 (agosto de 2025) y de Windows Server 2025 (septiembre de 2025), y la utilidad **WMIC** desaparece de Windows 11 (se sustituye por `Get-CimInstance`).

```powershell
# Servicios en ejecución, solo el nombre
Get-Service | Where-Object { $_.Status -eq "Running" } | Select-Object Name
Get-Service | Where-Object Status -eq Running          # sintaxis simplificada equivalente
Restart-Service -Name Spooler
Set-Service -Name wuauserv -StartupType Manual          # Automatic, Manual, Disabled

# Copiar el contenido de un directorio en otro ya existente, de forma recursiva
Copy-Item -Path "C:\DirectorioA\*" -Destination "C:\DirectorioB" -Recurse

# Ver un registro en tiempo real (equivalente a tail -f)
Get-Content -Path C:\logs\app.log -Tail 50 -Wait

# Usuarios y grupos locales
Get-LocalUser
Get-LocalGroupMember -Group "Administradores"
New-LocalUser -Name "soporte" -Description "Cuenta de soporte" -Password (Read-Host -AsSecureString)
Add-LocalGroupMember -Group "Administradores" -Member "soporte"

# Red
Get-NetIPConfiguration ; Get-NetRoute -AddressFamily IPv4
Test-NetConnection db01 -Port 3306
Resolve-DnsName www.boe.es ; Clear-DnsClientCache

# Eventos, parches e información
Get-WinEvent -LogName System -MaxEvents 20
Get-WinEvent -FilterHashtable @{ LogName = "Security"; Id = 4625 } -MaxEvents 10
Get-HotFix | Sort-Object InstalledOn -Descending | Select-Object -First 5
Get-CimInstance Win32_OperatingSystem | Select-Object Caption, Version, LastBootUpTime

# Administración remota por WinRM
Invoke-Command -ComputerName srv01, srv02 -ScriptBlock { Get-Service W3SVC }
```

Detalles que se preguntan: el estado de un servicio en ejecución es **`Running`** (los demás valores son `Stopped`, `Paused` y los transitorios `StartPending`, `StopPending`…; no existen `Active`, `Started` ni `Enabled`); el parámetro es **`-Recurse`** (no `-Recursive`) y el *cmdlet* es **`Copy-Item`** (no existe `Copy-Path`). Ayudas: `Get-Help`, `Get-Command` y `Get-Member`. La **directiva de ejecución** (`Get-ExecutionPolicy`, `Set-ExecutionPolicy RemoteSigned`) vale por defecto `Restricted` en los clientes y `RemoteSigned` en los servidores.

| Tarea | CMD | PowerShell | Linux |
|---|---|---|---|
| Listar ficheros | `dir` | `Get-ChildItem` | `ls -l` |
| Copiar con subdirectorios | `xcopy /E`, `robocopy` | `Copy-Item -Recurse` | `cp -r`, `rsync -a` |
| Ver un fichero | `type` | `Get-Content` | `cat` |
| Seguir un registro | — | `Get-Content -Wait` | `tail -f` |
| Buscar texto | `findstr` | `Select-String` | `grep` |
| Procesos | `tasklist`, `taskkill` | `Get-Process`, `Stop-Process` | `ps`, `kill` |
| Servicios | `net start`, `sc` | `Get-Service`, `Restart-Service` | `systemctl` |
| Crear directorio | `md` o `mkdir` | `New-Item -ItemType Directory` | `mkdir` |

### Usuarios, grupos y directivas

Cuentas **locales** (en la base SAM del equipo) frente a cuentas **de dominio** (Active Directory, tema IV.4). Buenas prácticas: deshabilitar o renombrar la cuenta integrada `Administrador`, no trabajar con privilegios elevados (**UAC**), y gestionar la contraseña del administrador local con **Windows LAPS** (integrado en Windows desde 2023), que la genera distinta en cada equipo, la rota y la guarda en Active Directory o Microsoft Entra ID. Las **directivas de cuenta** (longitud, caducidad, historial, bloqueo) se ven con `net accounts` y se fijan en `secpol.msc` o por GPO; `gpupdate /force` las vuelve a aplicar y `gpresult /r` muestra cuáles se aplican.

### Servicios y procesos

Cada servicio tiene un **tipo de inicio**: Automático, Automático (inicio retrasado), Manual o Deshabilitado; una **cuenta de inicio de sesión** (LocalSystem, LocalService, NetworkService o una cuenta de servicio administrada) y **acciones de recuperación** ante fallos (reiniciar el servicio, ejecutar un programa, reiniciar el equipo). Su configuración vive en `HKLM\SYSTEM\CurrentControlSet\Services`.

### El Registro de Windows

Base de datos jerárquica con la configuración del sistema, los usuarios y las aplicaciones.

| Clave raíz | Abreviatura | Contenido |
|---|---|---|
| `HKEY_LOCAL_MACHINE` | HKLM | Configuración del **equipo**: `SOFTWARE`, `SYSTEM` (servicios, controladores), `SAM`, `SECURITY`, `HARDWARE` |
| `HKEY_CURRENT_USER` | HKCU | Perfil del **usuario con sesión iniciada** (se carga desde su `NTUSER.DAT`) |
| `HKEY_USERS` | HKU | Todos los perfiles de usuario cargados |
| `HKEY_CLASSES_ROOT` | HKCR | Asociaciones de tipos de fichero y registro COM (vista combinada de las claves `Software\Classes` de HKLM y HKCU) |
| `HKEY_CURRENT_CONFIG` | HKCC | Perfil de *hardware* actual |

Tipos de valor: `REG_SZ` (cadena), `REG_EXPAND_SZ` (cadena con variables como `%SystemRoot%`), `REG_MULTI_SZ` (lista de cadenas), `REG_DWORD` (32 bits), `REG_QWORD` (64 bits) y `REG_BINARY`. Los ficheros de las colmenas del sistema están en `%SystemRoot%\System32\config`. Antes de tocar el Registro se exporta la rama:

```bat
reg query "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run"
reg export "HKLM\SOFTWARE\Organismo" C:\copias\organismo.reg
reg add "HKLM\SOFTWARE\Organismo\App" /v Modo /t REG_DWORD /d 1 /f
reg import C:\copias\organismo.reg
```

### Visor de eventos

Registros principales: **Aplicación**, **Seguridad**, **Sistema**, **Instalación** y **Eventos reenviados**, más los de «Registros de aplicaciones y servicios». Niveles: Crítico, Error, Advertencia, Información y Detallado; en Seguridad, «Auditoría correcta» y «Auditoría con errores».

| Id. | Registro | Significado |
|---|---|---|
| 4624 / 4625 | Seguridad | Inicio de sesión correcto / fallido |
| 4634 | Seguridad | Cierre de sesión |
| 4720 | Seguridad | Cuenta de usuario creada |
| 4740 | Seguridad | Cuenta bloqueada |
| 1102 | Seguridad | Registro de auditoría borrado |
| 7036 / 7045 | Sistema | Cambio de estado de un servicio / servicio nuevo instalado |
| 6005 / 6006 | Sistema | Inicio / parada del servicio de registro de eventos (arranque y apagado) |
| 6008 y 41 | Sistema | Apagado inesperado (41 = Kernel-Power, reinicio sin apagado limpio) |
| 1074 | Sistema | Apagado o reinicio iniciado por un usuario o proceso |

### Sistemas de ficheros y discos

| Sistema | Uso típico | Características | Compatibilidad |
|---|---|---|---|
| **NTFS** | Volumen del sistema Windows | Diario (*journaling*), ACL, cifrado EFS, compresión, cuotas, instantáneas VSS | Lectura y escritura en Windows; Linux con el controlador `ntfs3`; macOS solo lectura |
| **ReFS** | Servidores, Espacios de almacenamiento, Dev Drive | Resiliencia y comprobación de integridad | Solo Windows |
| **FAT32** | Soportes pequeños, partición EFI | Fichero máximo de 4 GB; Windows solo lo formatea hasta 32 GB desde su interfaz (las compilaciones Insider recientes amplían a 2 TB la orden `format`) | Universal |
| **exFAT** | Memorias USB, tarjetas SDXC, discos externos | Sin el límite de 4 GB por fichero; sin diario ni permisos | **Nativo en Windows, macOS (también macOS Tahoe) y Linux** |
| APFS / HFS+ | macOS | APFS por defecto desde macOS High Sierra | No nativos en Windows |
| ext4 / XFS / Btrfs | Linux | Diario; Btrfs con instantáneas | No nativos en Windows |

```bat
chkdsk C: /f        :: corrige errores lógicos (si el volumen está en uso, lo programa al reiniciar)
chkdsk D: /r        :: además localiza sectores defectuosos y recupera lo legible (implica /f)
chkdsk C: /scan     :: análisis en línea de NTFS sin desmontar
diskpart            :: list disk, select disk 1, clean, convert gpt, create partition primary, format fs=ntfs quick, assign
icacls D:\datos /grant "Contabilidad:(OI)(CI)M"   :: permiso Modificar heredable por subcarpetas y ficheros
robocopy D:\datos \\nas01\copia /MIR /R:2 /W:5 /LOG:C:\logs\robocopy.log   :: réplica exacta con registro
```

### Red en Windows

```bat
ipconfig /all                    :: configuración completa (MAC, DHCP, DNS, puerta de enlace)
ipconfig /release & ipconfig /renew   :: renovar la concesión DHCP
ipconfig /displaydns             :: ver la caché del cliente DNS
ipconfig /flushdns               :: vaciar la caché DNS (también desde PowerShell)
route print                      :: tabla de rutas (equivale a netstat -r)
route -p add 10.0.5.0 mask 255.255.255.0 10.0.5.150   :: ruta persistente (-p)
netstat -ano                     :: conexiones y puertos en escucha con el PID
nslookup www.boe.es
tracert 10.30.20.30 ; pathping 10.30.20.30
netsh advfirewall show allprofiles
netsh winsock reset              :: reparar el catálogo Winsock
```

## Administración del software de base

El software de base que no es el sistema operativo se administra con el mismo ciclo: **inventario** de productos y versiones (con su lista de componentes, ENS op.exp.1.r4), **instalación y configuración segura** (op.exp.2), **actualización** (op.exp.4), **monitorización** y control del **fin de soporte**. Las vulnerabilidades del *middleware* y de las bibliotecas son tan graves como las del sistema (Log4Shell, en una biblioteca Java de registro, afectó en 2021 a miles de servidores de aplicaciones).

| Categoría | Ejemplos | Puertos y ficheros típicos |
|---|---|---|
| Servidor web | Apache HTTP Server 2.4, Nginx, IIS 10 | 80 y 443; `httpd.conf`, `nginx.conf`, `applicationHost.config` |
| Contenedor de *servlets* y servidor de aplicaciones | Apache Tomcat, WildFly/JBoss EAP, WebLogic, Open Liberty | 8080 y 8443; `server.xml` |
| Gestor de bases de datos | Oracle, SQL Server, PostgreSQL, MySQL/MariaDB | 1521, 1433, 5432, 3306 (tema IV.2) |
| Entornos de ejecución | JDK (Java 25 LTS), .NET 10 LTS, Python, Node.js | `JAVA_HOME`; `alternatives --config java` (RHEL) o `update-alternatives` (Debian) |
| Agentes | Copias, antivirus/EDR, monitorización | Se actualizan como el resto |

### Internet Information Services (IIS)

IIS 10 es el servidor web de Windows Server 2016 y posteriores. Su configuración central está en `%windir%\System32\inetsrv\config\applicationHost.config`; los sitios se ejecutan en **grupos de aplicaciones** (*application pools*), procesos `w3wp.exe` aislados que se pueden reciclar.

```bat
iisreset /status           :: estado de los servicios de IIS
iisreset                   :: detiene y reinicia todos los servicios de IIS (igual que /restart)
iisreset /stop & iisreset /start
cd %windir%\system32\inetsrv
appcmd list site                                   :: sitios
appcmd list apppool                                :: grupos de aplicaciones
appcmd recycle apppool /apppool.name:"DefaultAppPool"
appcmd stop site /site.name:"Default Web Site"
appcmd add backup "BackupManual"                   :: copia de seguridad de la configuración
appcmd list backup                                 :: copias existentes
appcmd restore backup "BackupManual"               :: restaurar
appcmd delete backup "BackupManual"
```

La sintaxis de **AppCmd** es siempre `appcmd VERBO OBJETO` (`list site`, `add backup`, `restore backup`); las copias se guardan en `%windir%\System32\inetsrv\backup\`. Además, IIS guarda automáticamente un historial de configuración en `%SystemDrive%\inetpub\history`. En PowerShell están los módulos `WebAdministration` e `IISAdministration`.

### Apache HTTP Server 2.4

En RHEL el paquete y el servicio se llaman **`httpd`** (configuración en `/etc/httpd/conf/httpd.conf` y `/etc/httpd/conf.d/*.conf`); en Debian y Ubuntu, **`apache2`** (`/etc/apache2/`, con `sites-available` y `sites-enabled`). Para servir **varios dominios** en el mismo servidor se usan **hosts virtuales** con la directiva `VirtualHost`, distinguidos por nombre (`ServerName`):

```apache
# /etc/httpd/conf.d/sede.conf
<VirtualHost *:443>
    ServerName sede.organismo.es
    ServerAlias www.sede.organismo.es
    DocumentRoot /var/www/sede
    SSLEngine on
    SSLCertificateFile    /etc/pki/tls/certs/sede.crt
    SSLCertificateKeyFile /etc/pki/tls/private/sede.key
    ErrorLog  logs/sede_error.log
    CustomLog logs/sede_access.log combined
    <Directory /var/www/sede>
        Options -Indexes
        Require all granted
    </Directory>
</VirtualHost>
```

```bash
apachectl configtest              # validar la sintaxis (también httpd -t) antes de recargar
systemctl reload httpd            # recargar sin cortar conexiones (apache2 en Debian)
a2ensite sede.conf                # Debian/Ubuntu: habilitar el sitio (a2dissite lo deshabilita)
a2enmod ssl                       # Debian/Ubuntu: habilitar un módulo
httpd -M                          # módulos cargados
```

En Apache 2.4 el control de acceso usa `Require` (en 2.2 era `Order`/`Allow`/`Deny`) y la antigua directiva `NameVirtualHost` ya no es necesaria. Los módulos de multiprocesamiento (MPM) son *prefork*, *worker* y *event*.

### Nginx

```nginx
server {
    listen 443 ssl;
    server_name intranet.organismo.es;
    root /usr/share/nginx/html;
    ssl_certificate     /etc/pki/tls/certs/intranet.crt;
    ssl_certificate_key /etc/pki/tls/private/intranet.key;
    location /api/ {
        proxy_pass http://127.0.0.1:8080/;   # proxy inverso hacia Tomcat
    }
}
```

`nginx -t` valida la configuración y `systemctl reload nginx` (o `nginx -s reload`) la aplica sin cortar el servicio. Nginx se usa a menudo como **proxy inverso** delante de servidores de aplicaciones.

### Apache Tomcat y servidores de aplicaciones Java

| Tomcat | Especificación Servlet | Plataforma | Java mínimo | Situación (2026) |
|---|---|---|---|---|
| 11.0 | 6.1 | Jakarta EE 11 | 17 | Rama principal |
| 10.1 | 6.0 | Jakarta EE 10 (paquetes `jakarta.*`) | 11 | Soportada |
| 9.0 | 4.0 | Java EE 8 (paquetes `javax.*`) | 8 | Soportada; fin **no antes del 31‑3‑2027** |
| 8.5 | 3.1 | — | 7 | Sin soporte desde el 31‑3‑2024 |

Estructura: `conf/server.xml` (conectores HTTP 8080 y HTTPS 8443, puerto de apagado 8005), `conf/tomcat-users.xml` (usuarios de las consolas de gestión), `webapps/` (despliegue de ficheros WAR) y `logs/catalina.out`. Con paquetes de Debian/Ubuntu el servicio se llama **`tomcat9`** o `tomcat10` (con paquetes de RHEL, `tomcat`), así que se reinicia con **`systemctl restart tomcat9`**. Buenas prácticas: retirar las aplicaciones de ejemplo, proteger el *Manager*, ejecutar con un usuario sin privilegios y mantener desactivado el conector AJP si no se usa.

## Actualización del sistema operativo

### Tipos de actualización

| Tipo | Qué es | Ejemplos |
|---|---|---|
| **Parche de seguridad** | Corrige vulnerabilidades concretas (CVE) | Actualización mensual de Windows; avisos RHSA de Red Hat, DSA de Debian, USN de Ubuntu |
| **Acumulativa** | Incluye todas las correcciones anteriores: basta instalar la última | Actualización acumulativa mensual de Windows |
| **Versión menor** (*point release*) | Conjunto de correcciones y mejoras compatibles | RHEL 10.1, Debian 13.1 |
| **Actualización de características o versión mayor** | Nueva versión del sistema | Windows 11 24H2 → 25H2; RHEL 9 → 10; Debian 12 → 13 |
| ***Firmware* y microcódigo** | BIOS/UEFI, controladoras de gestión, discos, microcódigo de la CPU | Cápsulas UEFI, `fwupdmgr` (LVFS) en Linux, utilidades del fabricante |
| **Controladores** | *Drivers* de dispositivos | Windows Update, catálogos del fabricante |
| **Parcheo en caliente** | Corrige sin reiniciar | *Hotpatch* de Windows Server 2025 y Windows 11 Enterprise; `kpatch` en RHEL; Livepatch en Ubuntu |

### Proceso de gestión de parches

1. **Inventario** de equipos, sistemas y versiones (ENS op.exp.1): no se puede parchear lo que no se conoce.
2. **Vigilancia** de avisos: fabricantes, **CCN-CERT**, INCIBE-CERT, CVE y NVD (el ENS exige «seguimiento continuo de los anuncios de defectos», op.exp.4.1).
3. **Análisis y priorización por riesgo** (op.exp.4.2): gravedad CVSS, si se está **explotando activamente** (catálogo KEV de CISA), exposición a Internet y categoría del sistema.
4. **Pruebas en preproducción** equivalente a producción (op.exp.4.r1, exigido en categoría MEDIA y ALTA).
5. **Planificación** dentro de la **gestión de cambios** (op.exp.5): petición registrada, ventana de mantenimiento, aviso a usuarios, copia o instantánea previa.
6. **Despliegue escalonado** por anillos (piloto → grupos amplios) con herramientas centralizadas.
7. **Verificación** y, si algo falla, **reversión** (mecanismo previsto de antemano, op.exp.4.r2, categoría ALTA).
8. **Documentación** y cierre: inventario y configuración actualizados, informe de cumplimiento.

Si no hay parche (vulnerabilidad de día cero) se aplican **mitigaciones** temporales: desactivar el servicio o la función, reglas de cortafuegos o de WAF, aislar el equipo. El mantenimiento solo lo hace **personal autorizado** (op.exp.4.3).

### Windows

- **Ciclo mensual**: el **segundo martes** de cada mes Microsoft publica las actualizaciones de seguridad (*Patch Tuesday*, versión «B»); en la cuarta semana, una actualización **opcional de vista previa** sin seguridad («D»); y, si urge, actualizaciones **fuera de banda** (OOB).
- **Versiones**: Windows 11 recibe una actualización de características al año (25H2 se instaló como **paquete de habilitación** sobre 24H2, con un solo reinicio). Canal de disponibilidad general frente a **LTSC** (canal de mantenimiento a largo plazo, sin nuevas funciones).
- **Herramientas**: Windows Update; **WSUS** (servidor local de actualizaciones, declarado **en desuso** en septiembre de 2024, aunque sigue incluido y soportado); **Configuration Manager**; **Intune** con **Windows Autopatch**; **Azure Update Manager** para servidores.
- ***Hotpatch***: en Windows Server 2025 (con Azure Arc, por suscripción desde julio de 2025) y Windows 11 Enterprise solo se reinicia en los meses de **línea base** (enero, abril, julio y octubre).
- **Arranque seguro**: los certificados de Microsoft de 2011 usados por *Secure Boot* caducan entre junio y octubre de 2026; los equipos deben recibir los nuevos certificados de 2023 por Windows Update o por actualización de *firmware*.
- Comprobación: `winver`, `systeminfo`, `Get-HotFix`, historial de Windows Update.

### Linux

```bash
# Debian / Ubuntu
apt update && apt upgrade                 # actualizar índices y paquetes
apt list --upgradable                     # qué hay pendiente
cat /var/run/reboot-required              # Ubuntu: existe si hace falta reiniciar
dpkg-reconfigure -plow unattended-upgrades   # parches de seguridad automáticos

# RHEL
dnf check-update                          # qué hay pendiente
dnf updateinfo list --security            # avisos de seguridad aplicables
dnf upgrade --security                    # aplicar solo los de seguridad
dnf needs-restarting -r                   # ¿hace falta reiniciar?
dnf history ; dnf history undo 42         # deshacer una transacción
```

Las versiones mayores se actualizan con herramientas específicas: **Leapp** en RHEL (`leapp preupgrade` para el informe previo y `leapp upgrade`), `do-release-upgrade` en Ubuntu y, en Debian, cambiando el nombre de la versión en las fuentes y ejecutando `apt full-upgrade`. Las gestiones centralizadas usan Red Hat Satellite, Landscape (Canonical), SUSE Multi-Linux Manager o Ansible. El núcleo nuevo solo se usa **tras reiniciar** (salvo parcheo en caliente).

### Fin de soporte y obsolescencia

Un sistema **sin soporte** deja de recibir parches: hay que planificar la migración antes de su fin. Hitos recientes: **Windows 10** (14‑10‑2025, con ESU de pago), **CentOS Linux 7** (30‑6‑2024), Windows Server 2012 y 2012 R2 (octubre de 2023), Windows 11 23H2 Home/Pro (noviembre de 2025) y 24H2 Home/Pro (13‑10‑2026). El ENS exige reaccionar a las vulnerabilidades notificadas (op.exp.3.4) y mantener la configuración actualizada (op.exp.3.r4), algo imposible sin soporte del fabricante.

## Mantenimiento del sistema operativo

| Tipo de mantenimiento | En el sistema operativo |
|---|---|
| **Preventivo** | Parches, revisión de registros, limpieza de temporales, control de espacio y de rendimiento, comprobación de copias |
| **Correctivo** | Resolver fallos: servicio caído, disco lleno, sistema de ficheros dañado |
| **Adaptativo** | Adecuarse a cambios del entorno: nueva versión del sistema, nuevo *hardware*, nueva normativa |
| **Perfectivo** | Mejorar rendimiento o administración: ajuste de parámetros, automatización |

Tareas periódicas habituales:

- **Diarias**: revisar alertas de monitorización, servicios críticos y el resultado de las copias; vigilar registros de seguridad (intentos fallidos, cambios de cuentas).
- **Semanales**: espacio libre y crecimiento, parches pendientes, cuentas inactivas.
- **Mensuales**: ciclo de parches, pruebas de restauración, revisión de permisos y cuentas privilegiadas, capacidad (tendencias).
- **Anuales o por proyecto**: renovación de certificados, fin de soporte, actualización de *firmware*, revisión de la documentación y del bastionado.

**Monitorización de recursos**: CPU (`top`, `uptime`, Administrador de tareas), memoria (`free`, `vmstat`, contadores de `perfmon`), disco (`df`, `iostat`, Monitor de recursos) y red (`ss`, `iftop`, `netstat`). Las plataformas de monitorización (Nagios, Zabbix, Prometheus con Grafana, Checkmk) centralizan umbrales y alertas (tema IV.4); los registros se centralizan en un **SIEM**.

**Bastionado** (*hardening*): aplicar las **guías CCN-STIC** (por ejemplo, la CCN-STIC-610A22 para RHEL 9 con perfiles básico, intermedio y avanzado; la serie 800 desarrolla el ENS) o los *CIS Benchmarks*, retirar cuentas por defecto, desactivar servicios innecesarios y verificar periódicamente la configuración. En RHEL la comprobación se automatiza con **OpenSCAP**:

```bash
oscap xccdf eval --profile xccdf_org.ssgproject.content_profile_ccn_basic \
  --report informe-ccn.html /usr/share/xml/scap/ssg/content/ssg-rhel9-ds.xml
```

**Automatización**: la gestión de configuración aplica el mismo estado a muchos equipos y deja constancia de cada cambio. Ansible no necesita agente (usa SSH o WinRM):

```yaml
# parches.yml: aplicar parches de seguridad y reiniciar si hace falta
- hosts: servidores_rhel
  become: true
  serial: "25%"            # por tandas, como un despliegue en anillos
  tasks:
    - name: Aplicar actualizaciones de seguridad
      ansible.builtin.dnf:
        name: "*"
        security: true
        state: latest
    - name: Comprobar si hay que reiniciar
      ansible.builtin.command: dnf needs-restarting -r
      register: reinicio
      changed_when: false
      failed_when: reinicio.rc > 1
    - name: Reiniciar si es necesario
      ansible.builtin.reboot:
      when: reinicio.rc == 1
```

**Despliegue e imágenes**: imágenes de referencia («de oro») con Sysprep y DISM en Windows o con Kickstart (RHEL), *preseed* (Debian), *autoinstall* (Ubuntu) y **cloud-init** en Linux; arranque por red **PXE**; en Windows también Windows Autopilot.

## Reparación del sistema operativo

### Método de diagnóstico

1. **Delimitar el síntoma**: qué falla, desde cuándo, a quién afecta, qué cambió (parche, configuración, *hardware*).
2. **Consultar los registros**: `journalctl`, `/var/log`, Visor de eventos, `dmesg`.
3. **Comprobar recursos**: espacio en disco, memoria, CPU, red.
4. **Aislar**: modo seguro o de rescate, deshabilitar lo último instalado, probar con otro usuario.
5. **Reparar** con la herramienta adecuada, de la menos a la más invasiva, con copia previa.
6. **Verificar y documentar** (registro de incidencias, causa raíz).

### Linux

- **Núcleo anterior**: el menú de GRUB permite arrancar con la versión previa del núcleo si la nueva falla.
- **Modo de rescate o emergencia**: en GRUB se edita la entrada (tecla `e`) y se añade `systemd.unit=rescue.target` o `systemd.unit=emergency.target`.
- **Sistema de ficheros dañado**: `fsck -y` (o `xfs_repair`) sobre el dispositivo **desmontado**, desde el modo de emergencia o un medio de rescate.
- **Cargador dañado**: arrancar desde un medio de instalación, montar el sistema, `chroot` y reinstalar GRUB (`grub2-install` y `grub2-mkconfig` en RHEL; `grub-install` y `update-grub` en Debian). Si falla el *initramfs*: `dracut -f` (RHEL) o `update-initramfs -u` (Debian).
- **Contraseña de root perdida** (RHEL): interrumpir el arranque con `rd.break`, montar `/sysroot` en lectura y escritura, `chroot`, cambiar la contraseña y forzar el reetiquetado de SELinux:

```bash
mount -o remount,rw /sysroot
chroot /sysroot
passwd root
touch /.autorelabel        # SELinux reetiquetará el sistema en el siguiente arranque
exit ; exit
```

- **Paquete o actualización problemática**: `dnf history undo N`, o instalar una versión concreta con `apt install paquete=versión`; volver a una instantánea (LVM, Btrfs con *snapper*, máquina virtual) o, en Solaris, a un entorno de arranque anterior.

### Windows

| Problema | Herramienta | Qué hace |
|---|---|---|
| Ficheros del sistema dañados | **`sfc /scannow`** | **Examina todos los ficheros protegidos del sistema y sustituye los dañados por una copia en caché** |
| El almacén de componentes también está dañado | `DISM /Online /Cleanup-Image /RestoreHealth` | Repara la imagen (almacén WinSxS) desde Windows Update u otro origen; después se repite `sfc` |
| Errores del disco o del sistema de ficheros | `chkdsk C: /f` o `/r` | Corrige la estructura NTFS y los sectores defectuosos |
| El sistema no arranca | Entorno de recuperación (**WinRE**): Reparación de inicio, `bootrec /fixmbr`, `/fixboot`, `/rebuildbcd`, **`bcdboot`** | Reparan el arranque; `bcdboot C:\Windows` recrea los ficheros de arranque en la partición del sistema |
| Controlador o programa que impide trabajar | **Modo seguro**, revertir el controlador, desinstalar la actualización | Arranca con lo mínimo para aislar el problema |
| Cambio reciente que rompió el sistema | **Restaurar sistema** (`rstrui`), puntos de restauración | Vuelve a la configuración anterior sin tocar los datos personales |
| Fallo masivo de arranque | **Recuperación rápida de la máquina** (Windows 11 24H2 y posteriores) | Desde WinRE descarga e instala correcciones de Windows Update |
| Todo lo anterior falla | **Restablecer este PC** o reinstalación | Reinstala Windows conservando o no los ficheros |
| Sospecha de memoria defectuosa | `mdsched.exe` | Diagnóstico de memoria |

```bat
DISM /Online /Cleanup-Image /CheckHealth      :: ¿está marcado como dañado?
DISM /Online /Cleanup-Image /ScanHealth       :: análisis completo
DISM /Online /Cleanup-Image /RestoreHealth    :: reparar el almacén de componentes
sfc /scannow                                  :: después, reparar los ficheros protegidos
:: resultados en %windir%\Logs\CBS\CBS.log
bcdedit /set {current} safeboot minimal       :: arrancar en modo seguro (deshacer: bcdedit /deletevalue {current} safeboot)
```

En el examen, las otras descripciones que se ofrecen junto a `sfc` suelen ser literales de la referencia de órdenes de Windows: «reparar el entorno de arranque de la partición del sistema» es **`bcdboot`**, «mostrar o establecer la directiva SAN» es la orden **`san`** de `diskpart` y «analizar servidores con una directiva generada por SCW» es **`scwcmd`**.

## Normativa y estándares clave

| Norma o estándar | Qué regula | Puntos clave |
|---|---|---|
| **ENS** (RD 311/2022), op.exp.1 | Inventario de activos | Inventario actualizado con responsable; lista de componentes *software* (R4) |
| ENS, **op.exp.2** | Configuración de seguridad | Retirar cuentas y contraseñas estándar; **mínima funcionalidad**; **seguridad por defecto**; máquinas virtuales gestionadas como las físicas |
| ENS, op.exp.3 | Gestión de la configuración de seguridad | Mínima funcionalidad y mínimo privilegio en todo momento; reaccionar a vulnerabilidades e incidentes; R1 configuraciones autorizadas y lista de servicios |
| ENS, **op.exp.4** | Mantenimiento y actualizaciones de seguridad | Especificaciones del fabricante y seguimiento de defectos; procedimiento para analizar, priorizar y aplicar parches según el riesgo; solo personal autorizado; R1 preproducción (MEDIA), R2 reversión (ALTA) |
| ENS, op.exp.5 | Gestión de cambios | Peticiones registradas, pruebas en preproducción, aprobación del Responsable de Seguridad si el riesgo es alto (MEDIA y ALTA) |
| ENS, op.exp.8 | Registro de la actividad | Usuario, fecha y hora, objeto, tipo y resultado; reloj sincronizado, retención y control de acceso (nivel MEDIO) |
| **ISO/IEC 27002:2022** | Controles de seguridad | 8.8 vulnerabilidades técnicas, 8.9 configuración, 8.15 registro, 8.17 sincronización de relojes, 8.19 instalación de *software* en producción, 8.32 gestión de cambios |
| ISO/IEC 20000-1 e ITIL 4 | Gestión de servicios TI | Procesos de cambios, incidencias, problemas y versiones |
| Guías **CCN-STIC** | Bastionado | Perfiles por sistema (CCN-STIC-610A22 para RHEL 9); serie 800 para el ENS |
| **POSIX** (IEEE 1003.1, última edición 2024) | Interfaz estándar de Unix | *Shell* y utilidades comunes |
| **FHS 3.0** | Jerarquía de directorios Linux | `/etc`, `/var/log`, `/home`, `/usr`, `/opt` |
| Ciclos de vida de Microsoft | Soporte de productos | Política moderna (Windows 11: 24 o 36 meses por versión) y política fija (Windows Server: 5 + 5 años) |

## Lo que más cae en el examen

En los nueve exámenes analizados hay **52 preguntas** de este tema: 37 de ingreso libre (10 en 2021, 5 en 2023, 3 en 2024, 10 en 2025 y 9 en el extraordinario de 2026) y 15 de promoción interna, muchas repetidas entre ambos turnos. Casi todas están en el **supuesto práctico de sistemas** y piden la orden exacta.

| Bloque | Preguntas | Ejemplos (exámenes) |
|---|---|---|
| **Red en Linux y Unix**: `nmap`, `nc -v` y `nc -vz`, `ip route show`, `ip route get`, `ss -ltn`, `ifconfig eth0`, `hostname -f`, ruta persistente en Solaris | 13 | LI 2021, 2025 y 2025‑ext; PI 2021, 2024 y 2025 |
| **Usuarios, permisos, ficheros y versiones en Linux**: `/etc/shadow`, `chmod u+x`, `mkdir`, `pwd`, `uname -r` (×2), `cat /etc/redhat-release` (×2), `apt update`, `fsck -y` | 10 | LI 2021, 2024 y 2025‑ext; PI 2021 y 2024 |
| **Usuarios y servicios en Windows**: `net start` (×2), `net user` (×2), `net localgroup administradores` (×2), `net accounts`, `Get-Service` filtrado por `Running`, `Copy-Item -Recurse` (×2) | 10 | LI 2021, 2023, 2025 y 2025‑ext; PI 2021, 2023 y 2025 |
| **Servicios, registros y auditoría en Linux**: `systemctl enable` (×2), `systemctl restart tomcat9`, `journalctl -u -n`, `tail -f` (×2), crontab `0 5 8 11 *`, `auditd`, `sealert` | 9 | LI 2025 y 2025‑ext; PI 2025 |
| **Red y reparación en Windows**: `ipconfig /flushdns` (×3), `route print`, `sfc /scannow`, exFAT | 6 | LI 2021, 2023, 2024 y 2025; PI 2023 |
| **Servidores web**: `IISRESET`, `appcmd add backup`, `appcmd list backup`, directiva `VirtualHost` de Apache | 4 | LI 2023 y 2025‑ext |

Patrón: opciones casi idénticas que solo se diferencian en un detalle de sintaxis (`ipconfig /flushdns` frente a `/dnsflush` o `/cleardns`; `appcmd add backup` frente a `create backup` o `backup add`; `journalctl -u nginx -n 50` frente a `--last=50`) o en el sistema (orden de Windows en una pregunta de Linux y al revés). La tendencia desde 2025 es más Linux moderno (systemd, iproute2, SELinux, auditd) y escenarios de un servidor RHEL con nginx, MySQL y Tomcat.

## Trampas habituales

- **`/etc/shadow`** guarda los *hash* de las contraseñas; `/etc/passwd` solo tiene una `x`. No existen `/etc/users` ni `/etc/groups` (el fichero es `/etc/group`).
- **`apt update`** solo descarga la información de los paquetes; **`apt upgrade`** instala; `full-upgrade` puede eliminar paquetes.
- **`chmod u+x`** cambia solo al propietario; `chmod +x`, `chmod a+x` y `chmod 755` también tocan grupo y otros.
- **`systemctl enable`** = arranque automático; `start` = ahora. No existen `systemctl autostart` ni `systemctl run … -onboot`.
- **`journalctl -u UNIDAD -n N`**: `-u` es la unidad y `-n` el número de líneas (no `--last` ni `-t`, que es el identificador de *syslog*).
- **`tail -f`** sigue el fichero (*follow*); `-n` indica las líneas.
- Crontab: **minuto, hora, día del mes, mes, día de la semana**. `0 5 8 11 *` = 05:00 del 8 de noviembre (no 00:05 ni 11 de agosto).
- **`ip route get`** da la ruta efectiva hacia un destino; **`ip route show`** toda la tabla; `ip neigh` es la tabla ARP.
- **`ss -ltn`** (o `netstat -tln`) lista puertos en escucha; `route -n`, `arp -an` y `hostnamectl` no.
- **`nc -vz host puerto`**: primero el *host*, luego el puerto, separados por espacio (no `host:puerto`). `ping` no prueba puertos y `telnet` no admite UDP.
- **`hostname -f`** = FQDN; `hostname -s` = nombre corto.
- **`uname -r`** = versión del núcleo; `uname -o` = sistema operativo; la distribución está en `/etc/os-release` o **`/etc/redhat-release`**.
- **`sealert`** analiza las denegaciones de SELinux; `restorecon` reetiqueta, `getsebool` lista booleanos y `semanage` configura la política.
- **`auditd`** audita accesos y cambios a ficheros según reglas; `journalctl` lee el *journal* y `top` muestra procesos.
- **`fsck -y`** repara respondiendo sí a todo, siempre sobre un sistema de ficheros **desmontado**; `checkdisk` no existe en Linux.
- **`net start`** sin parámetros lista los servicios en ejecución; **`net accounts`**, la directiva de contraseñas; **`net localgroup administradores`**, los miembros del grupo (no `net local`).
- **`ipconfig /flushdns`** vacía la caché DNS (funciona también desde PowerShell); `ifconfig` no existe en Windows y `route print` es la tabla de rutas de Windows.
- En PowerShell: estado **`Running`**, parámetro **`-Recurse`**, *cmdlet* **`Copy-Item`**.
- **`IISRESET`** es una sola palabra; **AppCmd** sigue el orden **verbo + objeto** (`add backup`, `list backup`).
- Hosts virtuales en Apache: directiva **`VirtualHost`** (no `VirtualDomain` ni `VirtualIp`).
- **`sfc /scannow`** sustituye los ficheros protegidos dañados por la copia en caché; reparar el arranque es `bcdboot` o `bootrec`.
- **exFAT** es el formato común a Windows y macOS para volúmenes grandes; APFS y HFS+ no son nativos en Windows y ReFS no lo es en macOS.
- Ruta persistente: `-p` tanto en Solaris (`route -p add -net … -gateway …`) como en Windows (`route -p add`).

## Repaso rápido

- Software de base = sistema operativo + utilidades, controladores, entornos de ejecución, *middleware*, SGBD y agentes.
- Arranque Linux: UEFI → GRUB 2 → núcleo + initramfs → systemd (PID 1) → `default.target`.
- *Targets*: `rescue` (nivel 1), `multi-user` (3), `graphical` (5), `emergency` (mínimo).
- `systemctl start/stop/restart/reload/enable/disable/status`; `journalctl -u -n -f -b -p`.
- `/etc/passwd` (7 campos), `/etc/shadow` (*hash*, 9 campos), `/etc/group`, `visudo`; `usermod -aG`.
- Permisos r=4, w=2, x=1; SUID 4000, SGID 2000, *sticky* 1000; `umask 022` → 644 y 755.
- Señales: 1 HUP (releer), 9 KILL, 15 TERM (por defecto).
- Paquetes: `apt`/`dpkg` (Debian), `dnf`/`rpm` (RHEL), `zypper` (SUSE).
- `fsck -y` desmontado; XFS → `xfs_repair`, crece pero no se reduce; `lvextend -r`.
- Red: `ip addr`, `ip route show/get`, `ss -ltn`, `nc -vz`, `nmap`, `dig`, `hostname -f`.
- Registros: `/var/log/messages` y `secure` (RHEL), `syslog` y `auth.log` (Debian); `auditd`; SELinux con `sealert`.
- cron: minuto hora día mes día-semana; `crontab -e/-l/-r`; `at` para una vez.
- Windows: `net user/localgroup/accounts/start`, `sc`, `tasklist`, `gpupdate /force`, `ipconfig /flushdns`, `route print`.
- PowerShell: Verbo-Sustantivo, objetos; 5.1 integrada y 7.6 LTS; PowerShell 2.0 y WMIC retirados.
- Registro: HKLM, HKCU, HKU, HKCR, HKCC; Visor de eventos: 4624/4625, 4740, 1102, 6008.
- IIS: `iisreset`, `appcmd add/list/restore backup`; Apache: `VirtualHost`, `apachectl configtest`; Nginx: `nginx -t`; Tomcat: `systemctl restart tomcat9`.
- Parches: inventario → vigilancia → priorización por riesgo → preproducción → cambio → despliegue escalonado → verificación/reversión (ENS op.exp.4 y op.exp.5).
- Windows: *Patch Tuesday* (segundo martes), WSUS en desuso, Intune/Autopatch, *hotpatch*; Windows 10 sin soporte desde el 14‑10‑2025.
- Reparación Windows: DISM `/RestoreHealth` y luego `sfc /scannow`; `chkdsk /f /r`; WinRE, modo seguro, Restaurar sistema.
- Reparación Linux: núcleo anterior, `rescue.target`, `fsck`, `chroot` + GRUB, `rd.break` para la contraseña de root.

## Fuentes

- Real Decreto 311/2022, Esquema Nacional de Seguridad, anexo II (op.exp) (BOE-A-2022-7191): https://www.boe.es/buscar/act.php?id=BOE-A-2022-7191
- Linux Foundation, *Filesystem Hierarchy Standard* 3.0: https://refspecs.linuxfoundation.org/FHS_3.0/fhs/index.html
- systemd, página de manual de `systemctl`: https://www.freedesktop.org/software/systemd/man/latest/systemctl.html
- Debian, páginas de manual de `journalctl`, `crontab(5)`, `fsck`, `ip-route` y `ss`: https://manpages.debian.org/trixie/systemd/journalctl.1.en.html
- Debian, página de manual de `apt`: https://manpages.debian.org/trixie/apt/apt.8.en.html
- Debian, anuncio de Debian 13 «trixie»: https://www.debian.org/News/2025/20250809
- Red Hat, documentación de RHEL 10: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10
- Red Hat, *Using SELinux* (RHEL 9): https://docs.redhat.com/es/documentation/red_hat_enterprise_linux/9/html/using_selinux/index
- Red Hat, CCN-STIC y perfiles de SCAP Security Guide: https://access.redhat.com/compliance/ccn-stic
- Ubuntu, anuncio de Ubuntu 26.04 LTS: https://discourse.ubuntu.com/t/ubuntu-26-04-resolute-raccoon-lts-released/80833
- Oracle, *Transitioning From Oracle Solaris 10 to Oracle Solaris 11.2* (rutas persistentes): https://docs.oracle.com/cd/E36784_01/html/E39134/routing.html
- Microsoft Learn, referencia de órdenes de Windows: https://learn.microsoft.com/es-es/windows-server/administration/windows-commands/windows-commands
- Microsoft Learn, `sfc`: https://learn.microsoft.com/es-es/windows-server/administration/windows-commands/sfc
- Microsoft Learn, reparar una imagen de Windows con DISM: https://learn.microsoft.com/es-es/windows-hardware/manufacture/desktop/repair-a-windows-image
- Microsoft Learn, `Copy-Item`: https://learn.microsoft.com/es-es/powershell/module/microsoft.powershell.management/copy-item
- Microsoft Learn, introducción a AppCmd.exe: https://learn.microsoft.com/es-es/iis/get-started/getting-started-with-iis/getting-started-with-appcmdexe
- Microsoft Learn, información de versiones de Windows 11: https://learn.microsoft.com/es-es/windows/release-health/windows11-release-information
- Microsoft Learn, ciclo de vida de Windows Server 2025: https://learn.microsoft.com/es-es/lifecycle/products/windows-server-2025
- Microsoft, eliminación de PowerShell 2.0 de Windows (KB5065506): https://support.microsoft.com/help/5065506
- PowerShell Team, anuncio de PowerShell 7.6 LTS: https://devblogs.microsoft.com/powershell/announcing-powershell-7-6/
- Apache HTTP Server 2.4, hosts virtuales por nombre: https://httpd.apache.org/docs/2.4/vhosts/name-based.html
- Apache Tomcat, versiones y especificaciones: https://tomcat.apache.org/whichversion.html
