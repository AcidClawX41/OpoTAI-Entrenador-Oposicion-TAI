# IV.2 · Administración de bases de datos, almacenamiento, copias de seguridad y virtualización

Este tema reúne las tareas de administración que protegen y sostienen los **datos** y la **infraestructura** donde se ejecutan los sistemas: la **administración de bases de datos** (instancias, usuarios, rendimiento, copias y recuperación), los **sistemas de almacenamiento** (DAS, NAS, SAN, RAID) y su **virtualización** (LVM, *thin provisioning*, deduplicación, instantáneas, infraestructuras convergentes e hiperconvergentes), las **políticas y procedimientos de copia de seguridad y recuperación** (tipos de copia, regla 3-2-1, RPO y RTO, cintas y VTL), las particularidades de las **copias de sistemas físicos y virtuales**, y la **virtualización de servidores y de puestos de usuario** (hipervisores, VDI). En el examen aparece tanto en el cuestionario (definiciones de RAID, tipos de copia, hipervisores, VDI) como en el supuesto de sistemas (cálculo de capacidad RAID, órdenes `tar`, consultas de Oracle y MySQL, RMAN, ampliación de un volumen LVM).

## Administración de bases de datos

### Funciones del administrador de bases de datos (DBA)

- **Instalación y actualización** del SGBD (versiones, parches trimestrales o acumulativos).
- **Creación y configuración** de instancias y bases de datos: parámetros de memoria, juegos de caracteres, ficheros y espacios de tablas.
- **Gestión del almacenamiento**: crecimiento de ficheros de datos, espacios de tablas, registros de transacciones.
- **Seguridad**: usuarios, roles y privilegios con mínimo privilegio; auditoría; cifrado; enmascaramiento de datos para entornos de prueba.
- **Rendimiento**: planes de ejecución, índices, estadísticas, bloqueos, sesiones.
- **Copias de seguridad y recuperación**, incluida la recuperación a un instante (*point-in-time recovery*, PITR).
- **Alta disponibilidad y réplicas**; **mantenimiento** periódico (integridad, estadísticas, purgas).
- **Soporte a desarrollo**: despliegue de cambios de esquema, revisión de SQL.

### Arquitectura de un SGBD relacional

Se distingue entre la **instancia** (procesos y memoria en ejecución) y la **base de datos** (ficheros en disco):

| Componente | Oracle | SQL Server | MySQL (InnoDB) | PostgreSQL |
|---|---|---|---|---|
| Memoria compartida | SGA (caché de bloques, *shared pool*, búfer de *redo*) y PGA por proceso | *Buffer pool*, caché de planes | *Buffer pool* de InnoDB | `shared_buffers` |
| Ficheros de datos | *Datafiles* agrupados en **espacios de tablas** (SYSTEM, SYSAUX, UNDO, TEMP, USERS) | `.mdf` (primario) y `.ndf` | *Tablespaces* `.ibd` | Directorio de datos (`PGDATA`) |
| Registro de transacciones | ***Redo log*** en línea y archivado | Registro de transacciones `.ldf` | *Redo log* y ***binary log*** | **WAL** (*write-ahead log*) |
| Ficheros de control y catálogo | *Control files*, diccionario de datos | Bases de sistema `master`, `model`, `msdb`, `tempdb` | Esquema `mysql`, `information_schema` | Catálogo `pg_catalog` |
| Procesos | DBWn, LGWR, CKPT, SMON, PMON, ARCn | Servicio `sqlservr` y Agente SQL Server | `mysqld` | *postmaster* y un proceso por conexión |

Desde Oracle 21c la arquitectura **multiinquilino** es obligatoria: una base de datos contenedora (**CDB**) aloja bases de datos conectables (**PDB**).

### Productos y versiones en 2026

| SGBD | Versiones de referencia | Notas |
|---|---|---|
| Oracle Database | **Oracle AI Database 26ai** (octubre de 2025, sustituye a 23ai como versión de soporte prolongado; en local desde enero de 2026) y 19c | Parches trimestrales (*Release Updates*) |
| Microsoft SQL Server | **SQL Server 2025** (noviembre de 2025), 2022 | Ediciones Enterprise, Standard, Express y Developer |
| MySQL | **8.4 LTS** (2024) y **9.7 LTS** (abril de 2026); la 8.0 terminó en abril de 2026 | Ramas LTS y de innovación |
| PostgreSQL | **PostgreSQL 18** (septiembre de 2025) | Una versión mayor al año, cada una con 5 años de soporte |
| MariaDB | Ramas LTS | Bifurcación comunitaria de MySQL |

### Puertos, herramientas y consultas habituales

| Tarea | Oracle | SQL Server | MySQL / MariaDB | PostgreSQL |
|---|---|---|---|---|
| Puerto por defecto | **1521** (*listener*) | **TCP 1433** (instancia predeterminada; el servicio Browser usa UDP 1434) | **3306** | **5432** |
| Cliente de línea de órdenes | SQL\*Plus, SQLcl | `sqlcmd` | `mysql` | `psql` |
| Consola gráfica | SQL Developer, Enterprise Manager | SQL Server Management Studio | MySQL Workbench | pgAdmin |
| Versión | `SELECT * FROM V$VERSION;` | `SELECT @@VERSION;` | `SELECT VERSION();` | `SELECT version();` |
| Usuarios | `SELECT username FROM dba_users;` | `SELECT name FROM sys.server_principals;` | `SELECT user, host FROM mysql.user;` | `\du` o `SELECT rolname FROM pg_roles;` |
| Sesiones activas | `V$SESSION` | `sys.dm_exec_sessions` | `SHOW PROCESSLIST;` | `pg_stat_activity` |
| Copia lógica | Data Pump (`expdp`, `impdp`) | Exportación BACPAC, `bcp` | `mysqldump`, MySQL Shell | `pg_dump`, `pg_restore`, `pg_dumpall` |
| Copia física | **RMAN** | `BACKUP DATABASE`, `BACKUP LOG` | MySQL Enterprise Backup, Percona XtraBackup | `pg_basebackup` + archivado de WAL |
| Alta disponibilidad | Data Guard (réplica en espera), RAC (clúster activo-activo) | Always On (grupos de disponibilidad), trasvase de registros | Replicación, Group Replication e InnoDB Cluster; Galera en MariaDB | Replicación en *streaming* y lógica; Patroni |

Las **vistas dinámicas** de Oracle empiezan por `V$` (`V$VERSION`, `V$INSTANCE`, `V$DATABASE`, `V$SESSION`) y las del diccionario por `DBA_`, `ALL_` y `USER_` (todo lo de la base, lo accesible para el usuario y lo propio). En MySQL una cuenta se identifica por el par **usuario + equipo** (`'app'@'10.0.%'`), por eso para saber quién accede **y desde dónde** se consultan las columnas `user` y `host` de `mysql.user`.

### Usuarios, privilegios y seguridad

```sql
-- MySQL: cuenta limitada a una subred y solo con los privilegios necesarios
CREATE USER 'biblio_app'@'10.20.30.%' IDENTIFIED BY 'Clave.Larga.2026';
GRANT SELECT, INSERT, UPDATE ON biblioteca.* TO 'biblio_app'@'10.20.30.%';
SHOW GRANTS FOR 'biblio_app'@'10.20.30.%';
REVOKE UPDATE ON biblioteca.* FROM 'biblio_app'@'10.20.30.%';

-- PostgreSQL: privilegios a través de roles
CREATE ROLE lectura NOLOGIN;
GRANT CONNECT ON DATABASE expedientes TO lectura;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO lectura;
CREATE ROLE ana LOGIN PASSWORD 'Clave.Larga.2026' IN ROLE lectura;
```

Buenas prácticas: cambiar o bloquear las cuentas por defecto (en MySQL, `mysql_secure_installation`), cuentas nominativas para los DBA y cuentas de servicio para las aplicaciones, **cifrado en reposo** (TDE en Oracle y SQL Server, cifrado de *tablespaces* en MySQL) y **en tránsito** (TLS), **auditoría** (Unified Auditing en Oracle, SQL Server Audit, extensión `pgaudit`), no exponer el puerto del SGBD fuera de la red de datos y **enmascarar** los datos personales que se copian a desarrollo o pruebas.

### Rendimiento y mantenimiento

- **Planes de ejecución**: `EXPLAIN` (MySQL, PostgreSQL), `EXPLAIN PLAN FOR` (Oracle), plan real en SSMS; buscar recorridos completos de tablas grandes e índices ausentes.
- **Estadísticas** del optimizador: `DBMS_STATS.GATHER_SCHEMA_STATS` (Oracle), `ANALYZE` y *autovacuum* (PostgreSQL), `ANALYZE TABLE` (MySQL), `UPDATE STATISTICS` (SQL Server).
- **Mantenimiento físico**: `VACUUM` en PostgreSQL (recupera el espacio de filas muertas), reconstrucción o reorganización de índices fragmentados, `DBCC CHECKDB` (integridad en SQL Server), `OPTIMIZE TABLE` (MySQL).
- **Diagnóstico**: informes AWR y ADDM (Oracle), Query Store y vistas `sys.dm_*` (SQL Server), `pg_stat_statements` (PostgreSQL), *slow query log* y Performance Schema (MySQL); bloqueos e interbloqueos (*deadlocks*).
- **Tareas programadas**: SQL Server Agent, Oracle Scheduler (`DBMS_SCHEDULER`), `cron` o `pg_cron`.

### Copias de seguridad y recuperación de bases de datos

| Tipo | Qué copia | Herramientas | Ventajas e inconvenientes |
|---|---|---|---|
| **Lógica** (exportación) | Definiciones y datos como SQL o formato propio | `mysqldump`, `pg_dump`, Data Pump | Portable entre versiones y plataformas; lenta en bases grandes; restaura al instante de la copia |
| **Física en frío** | Ficheros con la base **parada** | Copia de ficheros | Sencilla y consistente; exige parada |
| **Física en caliente** | Ficheros con la base **abierta** + registros de transacciones | RMAN, `pg_basebackup`, `BACKUP DATABASE`, XtraBackup | Sin parada; permite **recuperación a un instante** aplicando los registros |

- **Oracle**: para copias en caliente y recuperación a un instante la base debe estar en modo **`ARCHIVELOG`** (archiva los *redo logs* llenos). **RMAN** (*Recovery Manager*) es la herramienta nativa de copia y recuperación física.
- **SQL Server**: el **modelo de recuperación** decide qué se puede hacer: `SIMPLE` (sin copias del registro, solo hasta la última copia), `FULL` (copias del registro y recuperación a un instante) y `BULK_LOGGED`. Tipos de copia: completa, **diferencial**, de **registro de transacciones** y *copy-only*. La restauración encadena completa → diferencial → registros con `NORECOVERY` y termina con `RECOVERY`.
- **PostgreSQL**: archivado continuo del WAL (`archive_mode`, `archive_command`) más una copia base (`pg_basebackup`); para recuperar se fija `recovery_target_time`. Desde PostgreSQL 17, `pg_basebackup --incremental` y `pg_combinebackup` permiten copias físicas incrementales.
- **MySQL**: `mysqldump --single-transaction` (copia lógica consistente de InnoDB sin bloquear) y recuperación a un instante con el *binary log* (`mysqlbinlog`).

```bash
# Copias lógicas
mysqldump --single-transaction --routines biblioteca > biblioteca_$(date +%F).sql
pg_dump -Fc -f expedientes.dump expedientes      # formato propio comprimido
pg_restore -d expedientes_pruebas expedientes.dump
expdp system DIRECTORY=copias DUMPFILE=rrhh.dmp SCHEMAS=RRHH LOGFILE=rrhh.log
```

```text
RMAN> CONFIGURE RETENTION POLICY TO RECOVERY WINDOW OF 7 DAYS;
RMAN> BACKUP INCREMENTAL LEVEL 0 DATABASE PLUS ARCHIVELOG;   # base de la estrategia incremental
RMAN> BACKUP INCREMENTAL LEVEL 1 DATABASE;                   # bloques cambiados
RMAN> LIST BACKUP SUMMARY;
RMAN> CROSSCHECK BACKUP;           # comprueba que las piezas siguen existiendo
RMAN> DELETE OBSOLETE;             # borra lo que ya no exige la política de retención
RMAN> RESTORE DATABASE VALIDATE;   # prueba la restauración sin restaurar
RMAN> LIST SCRIPT NAMES;           # guiones locales y globales ejecutables en la base destino
RMAN> LIST GLOBAL SCRIPT NAMES;    # solo los globales del catálogo
RMAN> LIST ALL SCRIPT NAMES;       # todos, de todas las bases del catálogo
```

Ojo con la terminología de RMAN: su copia incremental de nivel 1 **«diferencial»** (la predeterminada) copia los bloques cambiados desde la última de nivel 1 o 0, que es lo que en general se llama copia **incremental**; la de nivel 1 **«acumulativa»** copia lo cambiado desde la última de nivel 0, es decir, una **diferencial** en el sentido general. Los guiones almacenados (`CREATE SCRIPT`, `EXECUTE SCRIPT`, `PRINT SCRIPT`) requieren un **catálogo de recuperación**.

## Sistemas de almacenamiento

### Arquitecturas: DAS, NAS y SAN

| Arquitectura | Significado | Acceso | Protocolos | Características |
|---|---|---|---|---|
| **DAS** | *Direct Attached Storage* | **Bloque**, conectado a un solo servidor | SATA, SAS, NVMe | Sencillo y barato; no se comparte |
| **NAS** | ***Network Attached Storage*** | **Fichero**: dispositivo de almacenamiento compartido en la red local | **NFS** (TCP 2049), **SMB/CIFS** (TCP 445) | Varios usuarios y equipos acceden a ficheros en un almacenamiento centralizado; el NAS gestiona el sistema de ficheros |
| **SAN** | ***Storage Area Network*** | **Bloque**: red dedicada que presenta volúmenes (LUN) a los servidores | **Fibre Channel**, **iSCSI** (TCP 3260), FCoE, NVMe-oF | Alto rendimiento y baja latencia; el servidor ve un disco local y pone su sistema de ficheros; más cara y compleja |
| **Objeto** | *Object storage* | Objetos con metadatos mediante API HTTP | API S3 | Escala masiva, nube, copias inmutables |

Conceptos de SAN: **LUN** (unidad lógica que se presenta a un servidor), **zonificación** (*zoning*) en los conmutadores Fibre Channel, **enmascaramiento de LUN**, **WWN** (identificador de los puertos Fibre Channel), **HBA** (tarjeta del servidor), **multitrayecto** (*multipathing*) para tolerar la caída de un camino, iniciador y destino iSCSI (identificados por su IQN). El almacenamiento **unificado** ofrece bloque y fichero en la misma cabina.

### Soportes

| Soporte | Uso | Notas |
|---|---|---|
| HDD (disco magnético) | Capacidad a bajo coste | SATA y SAS |
| SSD (SATA, SAS y **NVMe**) | Rendimiento, bases de datos, virtualización | NVMe sobre PCIe ofrece latencias muy bajas |
| **Cinta LTO** | Copias de larga duración y archivo; fuera de línea | LTO-9: 18 TB nativos; **LTO-10** (2025): 30 TB nativos; cartuchos WORM |
| Óptico | Archivo puntual | Residual |
| Nube (objeto) | Copias fuera de la sede, archivo | Bloqueo de objetos para inmutabilidad |

### RAID

**RAID** (*Redundant Array of Independent Disks*) combina varios discos para ganar rendimiento, capacidad o tolerancia a fallos. Puede ser por *hardware* (controladora con caché protegida por batería) o por *software* (`mdadm` en Linux, Espacios de almacenamiento en Windows, ZFS).

| Nivel | Técnica | Mín. discos | Capacidad útil (n discos de tamaño C) | Tolera |
|---|---|---|---|---|
| **RAID 0** | Bandas (*striping*) sin redundancia | 2 | n × C | Ningún fallo |
| **RAID 1** | Espejo | 2 | C (con 2 discos, el 50 %) | n − 1 fallos |
| RAID 2 | Bandas a nivel de bit con código Hamming | — | — | En desuso |
| RAID 3 | Bandas a nivel de **byte** con disco de paridad dedicado | 3 | (n − 1) × C | 1 fallo |
| **RAID 4** | Bandas a nivel de **bloque** con **un** disco de paridad dedicado | 3 | (n − 1) × C | 1 fallo |
| **RAID 5** | Bloques con **paridad distribuida**; acceso independiente | 3 | (n − 1) × C | 1 fallo |
| **RAID 6** | Bloques con **doble paridad distribuida** | 4 | (n − 2) × C | 2 fallos |
| **RAID 10 (1+0)** | Bandas de espejos | 4 | n × C / 2 | 1 por pareja de espejo |
| RAID 01 (0+1) | Espejo de bandas | 4 | n × C / 2 | Menos robusto que 10 |
| RAID 50 / 60 | Bandas de grupos RAID 5 / RAID 6 | 6 / 8 | Según grupos | 1 / 2 por grupo |

![Reparto de bloques por disco en RAID 0 (bandas A1 a A8 alternando entre dos discos), RAID 1 (los mismos bloques en los dos discos), RAID 10 (bandas sobre dos parejas en espejo), RAID 5 (paridad P que rota entre cuatro discos) y RAID 6 (paridades P y Q que rotan entre cuatro discos), con la capacidad útil y los fallos tolerados de cada nivel](diagramas/IV.2-raid.svg)

*Figura: cómo reparten los datos y la paridad los niveles RAID más preguntados.*

**Ejercicios resueltos de capacidad**

1. 5 discos de 6 TB en **RAID 6**: (5 − 2) × 6 = **18 TB** útiles; aguanta dos discos averiados.
2. 4 discos de 4 TB en **RAID 5**: (4 − 1) × 4 = **12 TB**; aguanta uno.
3. 6 discos de 2 TB en **RAID 10**: 6 × 2 / 2 = **6 TB**; aguanta un disco por pareja (hasta tres si caen en parejas distintas).
4. 6 discos de 4 TB en **RAID 50** (dos grupos de 3): 2 × (3 − 1) × 4 = **16 TB**.
5. Unidades: los fabricantes usan TB decimales (10¹² bytes) y los sistemas suelen mostrar TiB (2⁴⁰ bytes): 18 TB ≈ 16,4 TiB.

Otros conceptos: **disco de reserva en caliente** (*hot spare*) que entra automáticamente en la reconstrucción; la **reconstrucción** de discos grandes en RAID 5 tarda horas y, si falla otro disco entretanto, se pierden los datos (por eso se prefiere RAID 6 con discos de gran capacidad); la **penalización de escritura** de la paridad (RAID 5 y 6 escriben más lento que RAID 10). **RAID no es una copia de seguridad**: un borrado, un *ransomware* o una corrupción lógica se replican en todos los discos al instante. En sistemas distribuidos (Ceph, almacenamiento de objetos) se usa **codificación de borrado** (*erasure coding*), una generalización de la paridad entre nodos.

## Virtualización del almacenamiento

Virtualizar el almacenamiento es **abstraer la capacidad física** (discos, cabinas) en **reservas lógicas** que se asignan con independencia de dónde estén los datos. Se hace en distintos niveles:

| Nivel | Cómo | Ejemplos |
|---|---|---|
| En el servidor | Gestores de volúmenes | **LVM** en Linux, Espacios de almacenamiento en Windows, ZFS |
| En la cabina | La controladora agrupa discos en reservas y presenta LUN o volúmenes | Cabinas SAN y NAS empresariales |
| En la red | Un dispositivo entre servidores y cabinas unifica cabinas heterogéneas | Virtualizadores de SAN |
| Definido por *software* (SDS) | El almacenamiento local de muchos servidores forma una reserva distribuida | Ceph, vSAN, Storage Spaces Direct |
| Hiperconvergencia (HCI) | Cómputo, almacenamiento definido por *software* y red en nodos x86 idénticos que escalan añadiendo nodos | Nutanix, vSAN, Azure Local |
| Infraestructura convergente (CI) | **Solución definida por *hardware*** que combina cómputo, red, almacenamiento y gestión en un **paquete preconfigurado** que funciona como un sistema único | Bloques certificados de varios fabricantes |

### Técnicas

- ***Thin provisioning*** (aprovisionamiento ligero): el espacio se presenta al cliente con su tamaño nominal pero se **asigna de forma flexible, bajo demanda**, a medida que se escribe («justo a tiempo»). Permite sobreasignar (*overcommit*) y exige vigilar la ocupación real de la reserva, porque si se llena fallan todos los volúmenes que dependen de ella. Lo contrario es el aprovisionamiento grueso (*thick*), que reserva todo el espacio al crear el volumen. El espacio liberado se devuelve a la reserva con TRIM/UNMAP.
- **Deduplicación**: guarda una sola vez los bloques o ficheros repetidos y sustituye las copias por referencias; **mejora la eficiencia del almacenamiento y reduce su coste**, sobre todo en copias de seguridad y escritorios virtuales. Puede hacerse en línea (al escribir) o posproceso, y en origen (el cliente envía solo lo nuevo) o en destino.
- **Compresión**: reduce el tamaño de cada bloque; se combina con la deduplicación.
- **Instantáneas** (*snapshots*): imagen del estado de un volumen en un instante, casi inmediata, normalmente por **copia en escritura** (*copy-on-write*) o redirección en escritura; sirven para volver atrás tras un cambio fallido o para obtener una copia consistente, pero **dependen del volumen original**.
- **Clones**: copias escribibles de un volumen o de una instantánea.
- **Replicación**: **síncrona** (la escritura se confirma cuando está en los dos sitios; RPO cero; distancia limitada por la latencia) o **asíncrona** (se envía con retraso; admite grandes distancias; RPO de segundos o minutos).
- **Jerarquización** (*tiering*): mover automáticamente los datos calientes a SSD y los fríos a discos de capacidad o a la nube.
- **Migración en caliente del almacenamiento** de una máquina virtual entre cabinas sin parada.

### LVM: ejemplo práctico

LVM organiza los discos en **volúmenes físicos** (PV), los agrupa en **grupos de volúmenes** (VG) y reparte su espacio en **volúmenes lógicos** (LV) que se formatean y montan. Caso típico de examen: el grupo `vg_datos` tiene 200 GiB libres y hay que ampliar `/contenido` (volumen `lv_contenido`, XFS, 500 GiB) hasta 600 GiB sin añadir discos ni cambiar el montaje. Se **extiende el volumen lógico** y, a continuación, se **amplía en línea el sistema de ficheros**:

```bash
vgs vg_datos                                     # comprobar el espacio libre del grupo
lvextend -L 600G /dev/vg_datos/lv_contenido      # tamaño final (o -L +100G)
xfs_growfs /contenido                            # XFS crece montado, indicando el punto de montaje
df -h /contenido                                 # verificar
# Alternativa en un paso: lvextend -r -L 600G /dev/vg_datos/lv_contenido
```

No hace falta `fsck` (y en XFS montado no se puede usar), ni crear un volumen nuevo, ni trabajar sobre una instantánea. *Thin provisioning* en LVM:

```bash
lvcreate --type thin-pool -L 1T -n reserva vg_datos      # reserva física de 1 TiB
lvcreate -V 2T --thin -n lv_fino vg_datos/reserva         # volumen de 2 TiB nominales
lvs -o lv_name,lv_size,data_percent vg_datos              # vigilar la ocupación real
```

## Políticas, sistemas y procedimientos de copia de seguridad y recuperación

### Conceptos

| Concepto | Definición |
|---|---|
| **Copia de seguridad** (*backup*) | Copia independiente de los datos, en otro soporte y lugar, para **restaurarlos** ante pérdida, daño o error |
| **Archivo** | Conservación a largo plazo de información que ya no se usa (requisitos legales o históricos); no es una copia de seguridad |
| **Instantánea** | Imagen del estado en un instante, dependiente del sistema original |
| **Replicación** | Copia continua a otro sistema para la continuidad; replica también los errores y borrados |
| **RPO** (*Recovery Point Objective*) | Pérdida de datos máxima tolerable medida en tiempo: determina la **frecuencia** de las copias |
| **RTO** (*Recovery Time Objective*) | Tiempo máximo para restablecer el servicio: determina la **técnica** de recuperación |
| **Retención** | Tiempo que se conserva cada copia |
| **Ventana de copia** | Periodo en que se puede copiar sin afectar al servicio |

El RPO y el RTO de cada servicio salen del **análisis de impacto** (BIA), que el ENS exige en las categorías de disponibilidad media y alta (op.cont.1).

### Tipos de copia

| Tipo | Qué copia | Bit de archivo | Para restaurar | Espacio y tiempo |
|---|---|---|---|---|
| **Completa** (*full*) | Todo | Lo desmarca | Solo la última completa | Máximo |
| **Incremental** | Lo modificado desde la **última copia de cualquier tipo** (completa o incremental) | Lo desmarca | Completa + **todas** las incrementales posteriores | Mínimo al copiar, restauración más larga |
| **Diferencial** | Lo modificado desde la **última completa** | No lo desmarca | Completa + **la última** diferencial | Crece cada día; restauración más rápida |
| **Espejo** (*mirror*) | Réplica fiel del origen: lo borrado en el origen se borra en la copia | — | La propia copia | No guarda versiones antiguas |
| **Completa sintética** | Se construye en el destino combinando la completa anterior y las incrementales | — | La sintética | Sin volver a leer el origen |
| **Incremental perpetua** | Una completa inicial y después solo incrementales, que el sistema consolida | — | La cadena gestionada por la herramienta | Muy eficiente |
| **Continua** (CDP) | Cada cambio en el momento en que ocurre | — | Cualquier instante | RPO casi cero |

**Ejercicio resuelto.** Copia completa el domingo por la noche y copias diarias de lunes a sábado; el jueves por la mañana falla el disco:

- Con **incrementales**: se restaura la completa del domingo y las incrementales del lunes, martes y miércoles (**4 juegos**, en orden).
- Con **diferenciales**: la completa del domingo y la diferencial del miércoles (**2 juegos**).
- En ambos casos se pierde lo hecho desde la copia del miércoles por la noche: con copias diarias, el **RPO es de un día**.

![Completa el domingo y copias de lunes a miércoles antes del fallo del jueves: las incrementales guardan solo los cambios de su día y hay que restaurar la completa más las tres; las diferenciales acumulan los cambios desde la completa y basta la completa más la diferencial del miércoles](diagramas/IV.2-tipos-copia.svg)

*Figura: el ejercicio anterior visto en el tiempo; con borde grueso, las copias que hacen falta para restaurar.*

No hay más tipos «oficiales»: términos como «compartimental» no existen.

### La regla 3-2-1 y sus variantes

**3** copias de los datos (la original y dos copias), en **2** soportes o medios distintos, con **1** copia **fuera de la sede**. La variante **3-2-1-1-0** añade **1** copia **fuera de línea o inmutable** (*air gap*, cinta extraída, almacenamiento de objetos con bloqueo) y **0** errores en la verificación de la restauración. El ENS exige en nivel ALTO de disponibilidad que al menos una copia esté **en un lugar diferente**, de modo que un incidente no afecte a la vez al original y a la copia (mp.info.6.r2).

### Sistemas y soportes de copia

| Sistema | Descripción |
|---|---|
| Disco a disco (D2D) | Copias rápidas en cabinas o servidores de copia; restauración ágil |
| Disco a disco a cinta (D2D2T) | Copia rápida en disco y después a cinta para la retención larga y fuera de línea |
| **VTL** (*Virtual Tape Library*) | **Biblioteca de cintas virtual**: discos que emulan cintas para el software de copia; permite **eliminar las cintas físicas** sin cambiar los procedimientos |
| Biblioteca de cintas | Robot con cartuchos LTO; soporte barato, duradero y desconectable |
| Nube | Almacenamiento de objetos en otra región o proveedor, con bloqueo de objetos (WORM) |
| Dispositivos de deduplicación | Destinos de copia con deduplicación en línea |

Rotación de soportes: el esquema **abuelo-padre-hijo** (GFS) conserva copias diarias (hijo), semanales (padre) y mensuales o anuales (abuelo). Herramientas habituales: Veeam, Commvault, NetBackup, IBM Storage Protect, Bacula y Bareos, Copias de seguridad de Windows Server (`wbadmin`), además de las propias de cada SGBD y de utilidades como `tar` y `rsync`.

```bash
tar -czf config_backup.tar.gz /srv/app/config/      # c crear, z gzip, f fichero
tar -cjf temas.tar.bz2 /home/opositor/temas/        # j bzip2 (J para xz, --zstd para Zstandard)
tar -tzvf config_backup.tar.gz                      # t listar el contenido sin extraer
tar -xzf config_backup.tar.gz -C /restaurar         # x extraer en otro directorio
rsync -aHAX --delete /srv/datos/ copias@nas01:/copias/datos/   # réplica incremental tipo espejo
```

En `tar`, la opción `-f` va seguida del nombre del fichero que se crea, y **el orden es: fichero de salida y después lo que se copia**.

### Política de copias

Una política documentada responde a: **qué** se copia (datos, sistemas, configuraciones, bases de datos), **con qué frecuencia** (según el RPO), **qué tipo** de copia y en qué ciclo, **cuánto tiempo** se conserva (retención y obligaciones legales), **dónde** se guarda (en el propio lugar y en otros lugares), **cómo se protege** (cifrado, control de acceso, inmutabilidad), **quién** es responsable y **cómo y cada cuánto se prueba** la restauración. El ENS lo exige en **mp.info.6**: copias que permitan recuperar datos perdidos accidental o intencionadamente, con periodicidad y retención fijadas en la normativa interna, y procedimientos que indiquen frecuencia, almacenamiento en el propio lugar y en otros lugares y controles de acceso; en nivel MEDIO, **pruebas de recuperación regulares** (R1), y en ALTO, copia en **lugar separado** (R2).

Frente al *ransomware*: copias **inmutables** o **fuera de línea**, credenciales del sistema de copias separadas del dominio y con MFA, cifrado de las copias, alertas ante borrados masivos de copias y pruebas de restauración periódicas. Las copias **cifradas** (o los equipos cifrados con BitLocker) solo se pueden recuperar si se conservan las **claves**: para restaurar un equipo cifrado con BitLocker hace falta su **clave de recuperación**, que debe custodiarse (por ejemplo, en Active Directory o Microsoft Entra ID).

### Procedimientos de recuperación

1. **Clasificar** el incidente y decidir qué recuperar y hasta qué punto en el tiempo.
2. **Elegir el punto de restauración** (la copia limpia más reciente: ante *ransomware*, anterior a la infección).
3. **Restaurar** en el orden correcto (infraestructura básica, directorio, bases de datos, aplicaciones) y, si es posible, primero en un entorno aislado.
4. **Verificar** la integridad y la coherencia (el ENS pide comprobar la integridad del sistema operativo, el *firmware* y la configuración tras una caída, op.cont.2.r2).
5. **Documentar** tiempos reales frente a RTO y RPO y las lecciones aprendidas.

Recuperar ficheros sueltos, bases de datos a un instante o sistemas completos son procedimientos distintos que deben estar escritos y **probados**: una copia que nunca se ha restaurado no garantiza nada.

## Copias de seguridad de sistemas físicos y virtuales

### Sistemas físicos

- **Copia a nivel de ficheros** con un agente instalado: selectiva, permite restaurar ficheros sueltos.
- **Copia de imagen** del disco completo: permite la **recuperación completa** (*bare-metal recovery*, BMR) en un equipo nuevo, incluso con *hardware* distinto.
- **Estado del sistema** en Windows (Registro, Active Directory, arranque): `wbadmin start systemstatebackup`; copia completa recuperable: `wbadmin start backup -allCritical`.
- **Aplicaciones con datos abiertos**: se usa el Servicio de instantáneas de volumen (**VSS**) en Windows o los mecanismos del SGBD, para que la copia sea consistente.
- En Linux, herramientas como *Relax-and-Recover* (ReaR) crean un medio de arranque para la recuperación completa.

### Sistemas virtuales

- **Copia sin agente a nivel de imagen** usando las API del hipervisor: la herramienta pide una instantánea de la máquina virtual, copia sus discos virtuales y elimina la instantánea. VMware ofrece las API de protección de datos (VADP) con ***Changed Block Tracking*** (CBT) para copiar solo los bloques cambiados; Hyper-V, el seguimiento de cambios resiliente (RCT).
- **Niveles de consistencia**: **consistente ante caída** (*crash-consistent*: como si se hubiera ido la luz) o **consistente con la aplicación** (se congelan las escrituras de la aplicación mediante VSS o *scripts* previos y posteriores antes de la instantánea), imprescindible para bases de datos.
- **Restauraciones** granulares (un fichero o un objeto de una aplicación desde la imagen), de la máquina completa o **recuperación instantánea** arrancando la máquina directamente desde el repositorio de copias.
- **Replicación de máquinas virtuales** a otro centro para la recuperación ante desastres.
- **Una instantánea no es una copia de seguridad**: depende de los discos originales, crece con cada escritura, degrada el rendimiento y no protege si se pierde el almacenamiento; debe borrarse en horas o pocos días.

| | Instantánea | Copia de seguridad |
|---|---|---|
| Qué es | Captura del estado de un sistema o conjunto de datos en un momento concreto | Réplica independiente de los datos para restaurarlos en caso de pérdida, daño o error |
| Dónde está | En el mismo almacenamiento | En otro soporte y, al menos una, en otro lugar |
| Depende del original | Sí | No |
| Duración | Corta | La de la política de retención |
| Protege frente a | Cambios fallidos y errores recientes | Pérdida del sistema, del soporte o del centro, *ransomware* (si es inmutable) |

Las **plataformas de contenedores** y los **servicios en la nube** también necesitan copias: los volúmenes persistentes y la configuración del clúster (tema IV.3), y los datos de servicios SaaS como el correo o la ofimática en la nube, cuya protección no siempre cubre el proveedor.

## Virtualización de sistemas

### Concepto, ventajas e inconvenientes

La virtualización permite ejecutar **varias máquinas virtuales** (cada una con su sistema operativo invitado) **sobre una única máquina física**, gracias a un **hipervisor** que reparte CPU, memoria, almacenamiento y red y aísla unas máquinas de otras.

| Ventajas | Inconvenientes |
|---|---|
| **Consolidación**: mayor aprovechamiento del *hardware*, menos servidores, energía y espacio | El servidor físico es un punto único de fallo para muchas máquinas (se mitiga con clústeres y alta disponibilidad) |
| Despliegue rápido con plantillas y clones | Pequeña sobrecarga de rendimiento |
| Aislamiento entre sistemas y entornos | Proliferación descontrolada de máquinas (*VM sprawl*) |
| Instantáneas, migración en caliente, alta disponibilidad, recuperación ante desastres | Licencias y dependencia del fabricante |
| Independencia del *hardware* concreto | Requiere *hardware* compatible (extensiones de virtualización), pero **no** obliga a aumentar la inversión en *hardware* específico: normalmente la reduce |

### Tipos de hipervisor

| Tipo | Dónde se ejecuta | Ejemplos | Uso |
|---|---|---|---|
| **Tipo 1** (nativo, *bare metal*) | **Directamente sobre el *hardware* físico**, sin sistema operativo anfitrión | **VMware ESXi**, **Microsoft Hyper-V**, **KVM** (integrado en el núcleo Linux), Xen, Proxmox VE (KVM), Nutanix AHV | Centros de datos |
| **Tipo 2** (alojado, *hosted*) | Como una **aplicación** sobre un sistema operativo anfitrión | **VirtualBox**, **VMware Workstation**, **Parallels Desktop**, QEMU sin KVM | Puesto de trabajo, laboratorio, pruebas |

![Comparación de pilas: en el tipo 1 el hipervisor (ESXi, Hyper-V, KVM, Xen) está directamente sobre el hardware y sobre él las máquinas virtuales con su SO invitado y sus aplicaciones; en el tipo 2 el hipervisor (VirtualBox, VMware Workstation) es una aplicación sobre el SO anfitrión, junto a las demás aplicaciones del anfitrión](diagramas/IV.2-hipervisores.svg)

*Figura: el hipervisor de tipo 1 sustituye al sistema operativo anfitrión; el de tipo 2 se apoya en él.*

### Técnicas

- **Virtualización completa**: el invitado no sabe que está virtualizado; antiguamente con traducción binaria.
- **Paravirtualización**: el invitado está modificado o usa **controladores paravirtuales** (virtio, VMware Tools, servicios de integración de Hyper-V) para hablar con el hipervisor de forma eficiente.
- **Asistida por *hardware***: extensiones Intel VT-x y AMD-V, tablas de páginas anidadas (EPT/NPT) y, para pasar dispositivos a las máquinas, VT-d/IOMMU y SR-IOV.
- **Virtualización a nivel de sistema operativo** (contenedores: LXC, Docker, Podman): comparten el núcleo del anfitrión, son más ligeros pero aíslan menos (tema IV.3).
- **Emulación**: imita otra arquitectura de CPU (QEMU); lenta.

### Recursos y funciones

- **Recursos virtuales**: vCPU, memoria (con técnicas de sobreasignación como el *ballooning*), discos virtuales finos o gruesos, conmutadores virtuales y VLAN.
- **Formatos de disco y de intercambio**: VMDK (VMware), VHD y VHDX (Hyper-V), QCOW2 (KVM); **OVF/OVA** (estándar abierto de DMTF) para exportar e importar máquinas entre plataformas.
- **Funciones de clúster**: **migración en caliente** (vMotion, Live Migration) de una máquina entre servidores sin parada, **alta disponibilidad** (reinicio automático de las máquinas en otro servidor si cae uno), reparto automático de carga (DRS), tolerancia a fallos con una copia sincronizada, plantillas y clones.
- **Gestión**: vCenter, Windows Admin Center y System Center Virtual Machine Manager, interfaz web de Proxmox, `virsh` y `virt-manager` en KVM/libvirt.

```bash
virsh list --all                       # máquinas KVM definidas y su estado
virsh start srv-web01 ; virsh shutdown srv-web01
virsh snapshot-create-as srv-web01 antes-parche "Antes del parche de octubre"
virsh dominfo srv-web01                # vCPU, memoria, estado
```

```powershell
Get-VM                                          # máquinas de Hyper-V
Checkpoint-VM -Name SRV-APP01 -SnapshotName "Antes del cambio"
Move-VM -Name SRV-APP01 -DestinationHost HV02   # migración en vivo
```

El ENS exige configurar y gestionar las máquinas virtuales de modo seguro: **parches, cuentas y antivirus como si fueran físicas, incluida la máquina anfitriona** (op.exp.2.4).

### Panorama en 2026

Broadcom compró VMware a finales de 2023 y pasó a licencias por suscripción agrupadas (VMware Cloud Foundation y vSphere Foundation; la versión 9.0 se publicó en junio de 2025), lo que ha llevado a muchas organizaciones a evaluar alternativas como Hyper-V, Proxmox VE, Nutanix AHV o la virtualización sobre plataformas de contenedores (OpenShift Virtualization, KubeVirt). En la nube, la virtualización se ofrece como **IaaS**.

## Virtualización de puestos de usuario

### Modalidades

| Modalidad | Qué se virtualiza | Ejemplos |
|---|---|---|
| **VDI** (*Virtual Desktop Infrastructure*) | **Escritorios completos alojados en servidores centrales** (una máquina virtual por usuario) a los que se accede en remoto | Citrix Virtual Apps and Desktops, Omnissa Horizon (antes VMware Horizon), Azure Virtual Desktop |
| **Escritorios por sesión** (RDS) | Muchos usuarios comparten un mismo sistema servidor, cada uno en su sesión | Servicios de Escritorio remoto de Windows Server, Citrix |
| **DaaS** (*Desktop as a Service*) | Escritorios virtuales ofrecidos desde la nube por suscripción | Windows 365, Azure Virtual Desktop, Amazon WorkSpaces |
| **Aplicaciones publicadas** | Solo la aplicación se ejecuta en el servidor y se muestra en el puesto | RemoteApp, Citrix Virtual Apps |
| **Virtualización de aplicaciones** | La aplicación se empaqueta aislada del sistema y se entrega bajo demanda | MSIX con *app attach*, App-V (sus servidores perdieron el soporte en abril de 2026) |
| **Virtualización de perfiles** | El perfil del usuario viaja en un disco virtual o contenedor | FSLogix |
| Virtualización local | Máquinas virtuales en el propio puesto | Hyper-V cliente, VirtualBox |

### VDI persistente y no persistente

| | Persistente | No persistente (agrupado) |
|---|---|---|
| Asignación | Cada usuario tiene **su** escritorio y se conecta **siempre al mismo** | El usuario recibe **cualquiera** de un grupo de escritorios idénticos |
| Cambios | Se conservan (aplicaciones instaladas, configuración) | **Se descartan** al cerrar la sesión o reiniciar; los datos y el perfil se guardan aparte |
| Gestión | Parecida a la de un PC físico | Una **imagen maestra** que se actualiza una vez para todos |
| Almacenamiento | Mayor | Menor (clones enlazados o instantáneos, deduplicación) |

### Componentes y protocolos

- **Agente de conexiones** (*connection broker*): autentica al usuario y le asigna un escritorio.
- **Servidores de virtualización** y **almacenamiento** dimensionados para las tormentas de arranque e inicio de sesión (*boot storms*).
- **Imagen maestra** (*golden image*) y gestión de perfiles.
- **Pasarela** para el acceso seguro desde Internet.
- **Protocolos de visualización remota**: RDP (Microsoft), HDX/ICA (Citrix), Blast Extreme (Horizon), PCoIP; optimizan gráficos, audio, vídeo y periféricos para que la experiencia se parezca a la de un equipo físico (con GPU virtualizada si hace falta).
- **Dispositivos de acceso**: clientes ligeros (*thin clients*), clientes cero, PC reaprovechados, portátiles, tabletas y móviles, o simplemente un navegador.

### Ventajas e inconvenientes

| Ventajas | Inconvenientes |
|---|---|
| Datos centralizados en el CPD: más seguridad y menos riesgo por pérdida o robo del dispositivo | **Requiere conexión de red permanente** con el servidor (sin red no hay escritorio) |
| Gestión, actualización y parcheo centralizados | Infraestructura y licencias específicas costosas |
| Acceso desde cualquier lugar y dispositivo: teletrabajo, BYOD | Dimensionamiento delicado (CPU, memoria, IOPS, GPU) |
| **No exige *hardware* potente en el puesto**: basta un cliente ligero | Punto único de fallo si el CPD o la red caen |
| Aprovisionamiento rápido y continuidad (el usuario cambia de equipo y sigue trabajando) | Experiencia peor con gráficos exigentes o mala latencia |

## Normativa y estándares clave

| Norma o estándar | Qué regula | Puntos clave |
|---|---|---|
| **ENS** (RD 311/2022), **mp.info.6** | Copias de seguridad | Copias para recuperar datos perdidos accidental o intencionadamente; frecuencia, almacenamiento local y en otros lugares y control de acceso; R1 pruebas de recuperación (MEDIO), R2 copia en lugar separado (ALTO) |
| ENS, **op.cont.1 a op.cont.4** | Continuidad del servicio | Análisis de impacto (MEDIO y ALTO); plan de continuidad, pruebas periódicas y medios alternativos (ALTO) |
| ENS, op.exp.2.4 y op.exp.3.r3 | Configuración | Máquinas virtuales y anfitriones gestionados como físicos; copias de la configuración para reconstruir el sistema (ALTA) |
| ENS, mp.si | Soportes de información | Cifrado, custodia, transporte, borrado y destrucción de soportes (incluidas las cintas de copia) |
| **RGPD**, art. 32 | Seguridad del tratamiento | Capacidad de **restaurar la disponibilidad y el acceso a los datos personales** de forma rápida tras un incidente físico o técnico |
| **ISO/IEC 27002:2022** | Controles | 8.13 copias de seguridad de la información; 8.14 redundancia; 5.30 preparación de las TIC para la continuidad |
| ISO 22301 e ISO/IEC 27031 | Continuidad de negocio | Sistema de gestión de la continuidad; preparación de las TIC |
| NIST SP 800-34 Rev. 1 | Planes de contingencia | BIA, RPO, RTO, estrategias de recuperación |
| SNIA | Terminología de almacenamiento | Definiciones de NAS, SAN, *thin provisioning*, deduplicación |
| RFC 7143 (iSCSI), RFC 7862 (NFSv4.2) | Protocolos de almacenamiento en red | Bloque sobre TCP/IP; ficheros en red |
| DMTF OVF | Formato de intercambio de máquinas virtuales | Paquetes OVF/OVA portables entre hipervisores |
| Consorcio LTO | Cintas | LTO-9 (18 TB) y LTO-10 (30 TB) nativos |

## Lo que más cae en el examen

En los nueve exámenes analizados hay **45 preguntas** de este tema: 28 de ingreso libre (7 en 2021, 5 en 2023, 4 en 2024, 5 en 2025 y 7 en el extraordinario de 2026) y 17 de promoción interna. Aparece en todas las convocatorias, en el cuestionario y en el supuesto de sistemas.

| Bloque | Preguntas | Exámenes |
|---|---|---|
| **Copias de seguridad**: diferencial (×2), regla 3-2-1 (×4), instantánea frente a copia, dónde se guardan, tipos que no existen («compartimental»), deduplicación, VTL, clave de BitLocker (×2), `tar -czf` (×3) | 16 | LI 2021, 2023, 2024, 2025 y 2025‑ext; PI 2021, 2023, 2024 y 2025 |
| **Almacenamiento**: RAID 5 con paridad distribuida (×2), capacidad de RAID 6, discos de RAID 10 (×2), afirmación incorrecta sobre RAID 4, *thin provisioning* (×2), SAN y NAS (×2), infraestructura convergente, ampliación LVM + XFS (×2) | 13 | LI 2021, 2023, 2024, 2025 y 2025‑ext; PI 2021, 2024 y 2025 |
| **Bases de datos**: `V$VERSION` (×2), RMAN (×2), `LIST SCRIPT NAMES`, `user,host` de `mysql.user` (×2), puertos 3306 y 1433 | 9 | LI 2021, 2023, 2024 y 2025‑ext; PI 2021, 2023 y 2024 |
| **Virtualización**: hipervisor de tipo 1 (×3, uno con ESXi como ejemplo), ventajas (opción falsa), LVM no es virtualización de sistemas, VDI (×2) | 7 | LI 2023, 2025 y 2025‑ext; PI 2021 y 2023 |

Patrón: definiciones con un detalle cambiado (diferencial frente a incremental o espejo; RAID 4 con «dos» discos de paridad; VDI persistente y no persistente intercambiados; siglas falsas como «Storage Attached Network»), cálculos sencillos de RAID y órdenes concretas (`tar`, RMAN, consultas al diccionario). Desde 2025 crecen las preguntas de virtualización y de escenarios con LVM.

## Trampas habituales

- **Diferencial** = cambios desde la última **completa**; **incremental** = desde la última copia **de cualquier tipo**; la copia que borra lo que se borró en el origen es un **espejo**.
- La regla **3-2-1** es 3 copias, 2 soportes **distintos**, 1 **fuera de la sede** (no «2 fuera de la sede» ni «1 cifrada» ni «1 en la nube»).
- Una **instantánea no es una copia de seguridad** ni la sustituye aunque haya redundancia; RAID tampoco.
- **RAID 5** = paridad **distribuida** (mínimo 3 discos); **RAID 4** = **un** disco de paridad dedicado; **RAID 6** = doble paridad (mínimo 4, capacidad n − 2); **RAID 10** = mínimo 4 discos.
- ***Thin provisioning*** asigna el espacio bajo demanda, no reserva todo para ir reduciéndolo ni sirve para añadir discos en caliente.
- **SAN** = *Storage Area Network*, acceso por **bloques**; **NAS** = *Network Attached Storage*, acceso por **ficheros** y más sencillo y barato.
- Infraestructura **convergente** = paquete preconfigurado definido por *hardware*; **hiperconvergente** = definida por *software* sobre nodos x86.
- **Deduplicación** mejora la eficiencia y reduce el coste; RPO y RTO son objetivos, no técnicas; *vaulting* es enviar soportes a una custodia externa.
- **VTL** elimina las cintas físicas; **VDI** es otra cosa (escritorios virtuales).
- **Hipervisor de tipo 1** = sobre el *hardware* (ESXi, Hyper-V, KVM, Xen); **tipo 2** = sobre un sistema anfitrión (VirtualBox, VMware Workstation, Parallels). Un hipervisor no exige almacenamiento compartido ni limita a una máquina virtual.
- **LVM** gestiona volúmenes de disco, **no** es un software de virtualización de sistemas (VMware, VirtualBox e Hyper-V sí).
- La virtualización **reduce**, no aumenta, la inversión en *hardware*.
- **VDI no persistente**: el usuario recibe un escritorio cualquiera y los cambios se pierden; **persistente**: siempre el mismo con sus cambios. El VDI **sí necesita conexión** permanente y **no** necesita *hardware* potente en el puesto.
- Oracle: la vista es **`V$VERSION`**; la copia física es **RMAN**; `LIST SCRIPT NAMES` lista guiones globales y locales y `LIST GLOBAL SCRIPT NAMES`, solo globales.
- MySQL: `SELECT user, host FROM mysql.user` (sin `host` no se sabe desde dónde); `all_users` es una vista de Oracle.
- Puertos: MySQL **3306**, SQL Server **1433**, PostgreSQL **5432**, Oracle **1521**.
- `tar -czf DESTINO.tar.gz ORIGEN`: primero el fichero que se crea.
- Para ampliar un LV con XFS montado: `lvextend` y **`xfs_growfs`** en línea; sin `fsck` y sin volumen nuevo.

## Repaso rápido

- DBA: instalación, seguridad, rendimiento, copias, recuperación, alta disponibilidad.
- Instancia (memoria y procesos) frente a base de datos (ficheros de datos, control y registro de transacciones).
- Puertos: Oracle 1521, SQL Server 1433, MySQL 3306, PostgreSQL 5432.
- Versión: `V$VERSION` (Oracle), `@@VERSION` (SQL Server), `VERSION()` (MySQL), `version()` (PostgreSQL).
- Copias de BD: lógicas (`mysqldump`, `pg_dump`, `expdp`) y físicas (RMAN, `pg_basebackup`, `BACKUP DATABASE`); PITR con registros archivados, WAL o *binlog*.
- SQL Server: modelos de recuperación SIMPLE, FULL y BULK_LOGGED.
- DAS (bloque, local), NAS (fichero, NFS y SMB), SAN (bloque, FC e iSCSI), objeto (S3).
- RAID 0 (bandas), 1 (espejo), 5 (paridad distribuida, n − 1), 6 (doble paridad, n − 2), 10 (espejos con bandas, n/2).
- Virtualización del almacenamiento: LVM, cabinas, SDS, HCI y CI; *thin provisioning*, deduplicación, instantáneas, replicación síncrona o asíncrona.
- RPO = pérdida de datos tolerable; RTO = tiempo de recuperación.
- Copias completa, incremental, diferencial, espejo, sintética y continua.
- 3-2-1 (y 3-2-1-1-0); VTL; LTO-10 con 30 TB nativos; copias inmutables frente al *ransomware*.
- ENS mp.info.6: pruebas de recuperación (MEDIO) y copia en lugar separado (ALTO); op.cont para la continuidad.
- Máquinas virtuales: copia sin agente por API (CBT, RCT), consistencia ante caída o con la aplicación (VSS).
- Hipervisores tipo 1 (ESXi, Hyper-V, KVM, Xen) y tipo 2 (VirtualBox, Workstation, Parallels).
- Paravirtualización (virtio), asistencia por *hardware* (VT-x, AMD-V), contenedores.
- VDI persistente y no persistente; RDS; DaaS; aplicaciones publicadas y virtualizadas; FSLogix; RDP, HDX y Blast.

## Fuentes

- Real Decreto 311/2022, Esquema Nacional de Seguridad (mp.info.6, op.cont, op.exp.2) (BOE-A-2022-7191): https://www.boe.es/buscar/act.php?id=BOE-A-2022-7191
- Reglamento (UE) 2016/679, General de Protección de Datos, art. 32: https://www.boe.es/buscar/doc.php?id=DOUE-L-2016-80807
- Oracle, *Database Backup and Recovery Reference* (RMAN, `LIST`): https://docs.oracle.com/en/database/oracle/oracle-database/19/rcmrf/LIST.html
- Oracle, anuncio de Oracle AI Database 26ai: https://blogs.oracle.com/database/post/oracle-announces-oracle-ai-database-26ai
- Microsoft Learn, modelos de recuperación de SQL Server: https://learn.microsoft.com/es-es/sql/relational-databases/backup-restore/recovery-models-sql-server
- Microsoft Learn, configurar el Firewall de Windows para SQL Server (puertos): https://learn.microsoft.com/es-es/sql/database-engine/configure-windows/configure-a-windows-firewall-for-database-engine-access
- MySQL 8.4 Reference Manual, tablas de privilegios (`mysql.user`): https://dev.mysql.com/doc/refman/8.4/en/grant-tables.html
- PostgreSQL 18, copia de seguridad y restauración: https://www.postgresql.org/docs/18/backup.html
- Red Hat, *Configuring and managing logical volumes* (RHEL 9): https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_logical_volumes/index
- GNU tar, manual: https://www.gnu.org/software/tar/manual/tar.html
- SNIA, *Dictionary*: https://www.snia.org/education/online-dictionary
- LTO Program, especificaciones de LTO-10: https://www.lto.org/
- Microsoft Learn, introducción a Hyper-V: https://learn.microsoft.com/es-es/windows-server/virtualization/hyper-v/hyper-v-overview
- Microsoft Learn, Azure Virtual Desktop: https://learn.microsoft.com/es-es/azure/virtual-desktop/overview
- DMTF, *Open Virtualization Format*: https://www.dmtf.org/standards/ovf
- NIST SP 800-34 Rev. 1, *Contingency Planning Guide*: https://csrc.nist.gov/pubs/sp/800/34/r1/upd1/final
