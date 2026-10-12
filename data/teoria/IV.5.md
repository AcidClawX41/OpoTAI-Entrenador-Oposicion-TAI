# IV.5 · Seguridad de los sistemas de información, criptografía, firma digital, CPD, gestión de incidencias y control remoto

Es el tema más amplio del bloque de sistemas: reúne los **conceptos de seguridad** (dimensiones, activos, amenazas, riesgo), la **seguridad física** y la **lógica**, el catálogo de **amenazas y vulnerabilidades**, las **técnicas criptográficas** y los **protocolos seguros**, los **mecanismos de firma digital** (procesos, formatos CAdES, XAdES y PAdES, eIDAS y AutoFirma), la **infraestructura física de un CPD** (TIA-942, energía, climatización, extinción, PUE), los **sistemas de gestión de incidencias** (ITIL, herramientas de *ticketing*, gestión de ciberincidentes con el CCN-CERT) y el **control remoto de puestos de usuario**. El marco normativo de referencia en la Administración es el **Esquema Nacional de Seguridad** (Real Decreto 311/2022). En el examen se pregunta por algoritmos (simétricos, asimétricos, de firma), formatos y proceso de firma, ataques (vishing, *tailgating*, escaneo, APT), dimensiones afectadas por un incidente, zonas y niveles del estándar TIA-942, PUE, herramientas del CCN (LUCIA, CLAUDIA) e ITSM (ITIL, Remedy, osTicket).

## Conceptos de seguridad de los sistemas de información

### Dimensiones de la seguridad

La seguridad de la información protege sus **dimensiones**. El ENS (anexo I) utiliza cinco:

| Dimensión | Significado | Se pierde cuando… |
|---|---|---|
| **Confidencialidad** [C] | Solo acceden quienes están autorizados | Una fuga de datos o un acceso indebido |
| **Integridad** [I] | La información es exacta y completa; no se altera sin autorización | Un fichero o una base de datos se corrompe o se manipula |
| **Disponibilidad** [D] | Accesible cuando se necesita | Una caída, una denegación de servicio o un *ransomware* |
| **Autenticidad** [A] | Las entidades son quienes dicen ser y los datos proceden de quien dicen | Una suplantación de identidad |
| **Trazabilidad** [T] | Se puede saber quién hizo qué y cuándo | Registros inexistentes o borrados |

El **no repudio** (que el autor no pueda negar haber enviado o firmado algo) se apoya en la autenticidad, la integridad y la trazabilidad, y se consigue con la firma electrónica. **Ejemplo**: si una base de datos se corrompe y los usuarios no pueden acceder, se ven afectadas la **integridad** (el fichero está dañado) y la **disponibilidad** (no se puede acceder); si se sabe quién lo causó y cómo, la trazabilidad se ha mantenido.

### Activos, amenazas, vulnerabilidades y riesgo

| Concepto | Definición |
|---|---|
| **Activo** | Lo que tiene valor para la organización: información, servicios, aplicaciones, equipos, redes, instalaciones, personas |
| **Amenaza** | Causa potencial de un incidente que puede dañar un activo (un atacante, un incendio, un error humano) |
| **Vulnerabilidad** | Debilidad de un activo que una amenaza puede aprovechar (un fallo de *software* sin parchear, una contraseña débil) |
| **Impacto** | Daño que produce la materialización de la amenaza |
| **Riesgo** | Estimación del daño posible: combina la **probabilidad** de que la amenaza se materialice y su **impacto** |
| **Salvaguarda** (control) | Medida que reduce la probabilidad o el impacto |
| **Riesgo residual** | El que queda tras aplicar las salvaguardas; debe aceptarlo formalmente quien corresponda |

Tratamientos del riesgo: **mitigar** (aplicar controles), **transferir** (seguros, contratos), **evitar** (no realizar la actividad) o **aceptar**. El ENS basa la seguridad en el **análisis y gestión de riesgos** (art. 14).

| Metodología de análisis de riesgos | Origen |
|---|---|
| **MAGERIT** v3 (con la herramienta **PILAR** del CCN) | Administración española (2012) |
| **ISO/IEC 27005** | Internacional, alineada con la ISO/IEC 27001 |
| **NIST SP 800-30** | Estados Unidos |
| **OCTAVE** | Universidad Carnegie Mellon |
| EBIOS Risk Manager | Francia (ANSSI) |
| CRAMM, MEHARI | Reino Unido; Francia (CLUSIF) |

PRINCE2 es de gestión de proyectos, ITIL de gestión de servicios y COBIT de gobierno de TI: ninguno es una metodología de análisis de riesgos.

### Principios

El ENS (art. 5) fija como principios básicos: la **seguridad como proceso integral**, la **gestión de la seguridad basada en los riesgos**, la **prevención, detección, respuesta y conservación**, la **existencia de líneas de defensa**, la **vigilancia continua y reevaluación periódica** y la **diferenciación de responsabilidades** (responsables de la información, del servicio, de la seguridad y del sistema). Otros principios de diseño: **defensa en profundidad**, **mínimo privilegio**, **necesidad de conocer**, **segregación de funciones**, **seguridad desde el diseño y por defecto** y **confianza cero** (*zero trust*: no confiar por estar «dentro» de la red y verificar cada acceso, NIST SP 800-207).

### Marco normativo

- **ENS** (RD 311/2022): aplica a todo el sector público y a sus proveedores; los sistemas se categorizan en **BÁSICA, MEDIA o ALTA** según el nivel (bajo, medio, alto) de cada dimensión; el anexo II contiene las medidas del marco **organizativo** (org), **operacional** (op: planificación, control de acceso, explotación, servicios externos, nube, continuidad, monitorización) y de **protección** (mp: instalaciones, personal, equipos, comunicaciones, soportes, aplicaciones, información, servicios).
- **ISO/IEC 27001:2022** (sistema de gestión de la seguridad de la información) e **ISO/IEC 27002:2022** (93 controles en cuatro temas: organizativos, de personas, físicos y tecnológicos).
- **NIST Cybersecurity Framework 2.0** (2024): funciones *Govern, Identify, Protect, Detect, Respond, Recover*.
- **RGPD** y **LOPDGDD** para los datos personales (art. 32 RGPD: seguridad del tratamiento).
- **Directiva NIS2** (UE 2022/2555): en España sigue vigente el Real Decreto-ley 12/2018 (NIS1) mientras se tramita la ley de transposición (anteproyecto de Ley de Coordinación y Gobernanza de la Ciberseguridad, enero de 2025).

## Seguridad física

La seguridad física protege las **instalaciones, los equipos y los soportes** frente a accesos no autorizados, robos, daños y riesgos del entorno.

| Medida ENS | Contenido |
|---|---|
| **mp.if.1** Áreas separadas y con control de acceso | Los equipos se instalan en áreas separadas, con acceso controlado |
| **mp.if.2** Identificación de las personas | Control de quién entra (tarjetas, PIN, biometría) y registro |
| **mp.if.3** Acondicionamiento de los locales | Temperatura, humedad, cableado, protección frente a amenazas del entorno |
| **mp.if.4** Energía eléctrica | Suministro adecuado; en nivel medio y alto de disponibilidad, **suministro de emergencia** (SAI, grupo) |
| **mp.if.5** Protección frente a incendios | Detección y extinción |
| **mp.if.6** Protección frente a inundaciones | Desde nivel medio de disponibilidad |
| **mp.if.7** Registro de entrada y salida de equipamiento | Control de lo que entra y sale |
| mp.eq.1 a mp.eq.4 | Puesto despejado, bloqueo del puesto, protección de portátiles, otros dispositivos |
| mp.si.1 a mp.si.5 | Marcado, criptografía, custodia, transporte y **borrado y destrucción** de soportes |

Elementos habituales: perímetros sucesivos (edificio, planta, sala), **control de acceso** con tarjeta, PIN o biometría (mejor combinados), **esclusas** o tornos que solo dejan pasar a una persona, vigilancia por **CCTV** y personal, registro de visitas acompañadas, **puesto despejado** y bloqueo de pantalla, destrucción segura de papel y soportes, y protección frente a emanaciones electromagnéticas (TEMPEST) en entornos clasificados.

Un riesgo típico es el ***tailgating*** o ***piggybacking***: entrar en una zona protegida **pegado a una persona autorizada**, aprovechando que abre la puerta. Se combate con esclusas, tornos y concienciación.

## Seguridad lógica

La seguridad lógica protege el **acceso a los sistemas y a la información** mediante *software* y procedimientos:

- **Identificación, autenticación, autorización y auditoría** (AAA). Factores de autenticación: **algo que se sabe** (contraseña, PIN), **algo que se tiene** (tarjeta, certificado, móvil con OTP) y **algo que se es** (biometría); la **autenticación multifactor** combina factores de **tipos distintos**. El ENS exige doble factor para el acceso desde zonas no controladas como Internet (op.acc.6.r8).
- **Modelos de control de acceso**: discrecional (DAC, el propietario decide), obligatorio (MAC, etiquetas y niveles fijados por la política), basado en roles (**RBAC**) y en atributos (ABAC).
- **Contraseñas**: según las recomendaciones del CCN-CERT, deben ser **largas** (mejor **frases** sin sentido evidente que palabras sueltas), **únicas** para cada servicio, sin datos personales (nombre, fecha de nacimiento) y guardadas en un **gestor de contraseñas**, nunca apuntadas en papel. Las guías actuales priorizan la longitud y la comprobación frente a listas de contraseñas filtradas sobre la caducidad periódica.
- **Protección frente a código dañino** (antivirus, EDR), **cortafuegos** y segmentación, **cifrado** de discos, soportes y comunicaciones, **parches** y **bastionado**, **copias de seguridad**, **registros** centralizados (SIEM), prevención de fugas de datos (**DLP**) y gestión de cuentas privilegiadas (**PAM**).

## Amenazas y vulnerabilidades

### Clasificación de las amenazas (MAGERIT)

| Grupo | Ejemplos |
|---|---|
| [N] **Desastres naturales** | Terremoto, inundación, tormenta |
| [I] **De origen industrial** | Incendio, avería eléctrica, fallo de climatización, contaminación |
| [E] **Errores y fallos no intencionados** | Errores de usuarios o administradores, fallos de configuración, defectos de *software* |
| [A] **Ataques intencionados** | Accesos no autorizados, suplantación, *malware*, robo, denegación de servicio |

### Código dañino (*malware*)

| Tipo | Característica |
|---|---|
| Virus | Se adhiere a otros programas o documentos y necesita que se ejecuten |
| Gusano | Se propaga solo por la red aprovechando vulnerabilidades |
| Troyano | Aparenta ser legítimo y abre una puerta al atacante (RAT: troyano de acceso remoto) |
| ***Ransomware*** | **Cifra los datos y pide un rescate**; hoy además roba datos (doble extorsión). Ejemplos: Ryuk (que afectó al SEPE en 2021), WannaCry, LockBit |
| *Spyware*, *keylogger* | Espía la actividad y captura pulsaciones |
| *Rootkit*, *bootkit* | Se oculta en el sistema o en el arranque |
| *Botnet* | Red de equipos infectados controlados de forma remota (DDoS, *spam*) |
| *Fileless* | Se ejecuta en memoria con herramientas legítimas del sistema (PowerShell) |
| *Cryptojacking*, *adware*, bomba lógica | Minería oculta, publicidad, código que se activa ante una condición |

### Ingeniería social

| Ataque | Medio |
|---|---|
| ***Phishing*** | Correo que suplanta a una entidad legítima para robar credenciales o instalar *malware* |
| *Spear phishing* / *whaling* | Dirigido a personas concretas / a directivos |
| ***Vishing*** | **Llamadas telefónicas** (voz) suplantando a una entidad legítima |
| ***Smishing*** | SMS o mensajería |
| *Quishing* | Códigos QR maliciosos |
| *Pharming* | Redirigir a una web falsa manipulando el DNS o el fichero *hosts* |
| Fraude del CEO (BEC) | Suplantar a un directivo o proveedor para ordenar pagos |
| *Pretexting*, *baiting* | Historia inventada para obtener datos; dispositivos o enlaces cebo |
| ***Tailgating*** / *piggybacking* | Colarse físicamente tras una persona autorizada |
| *Shoulder surfing*, *dumpster diving* | Mirar por encima del hombro; buscar en la basura |

### Ataques a redes y sistemas

| Ataque | Descripción |
|---|---|
| **Escaneo (barrido) de puertos** | Obtener información de **qué servicios ofrece un sistema** y otros detalles técnicos (reconocimiento previo) |
| ***Sniffing*** | **Capturar** el tráfico que circula por la red |
| ***Spoofing*** | **Falsear el origen** (IP, MAC, ARP, DNS, correo) |
| *Man-in-the-middle* | Interponerse entre dos partes para leer o alterar la comunicación |
| **DoS / DDoS** | Agotar los recursos de un servicio; en el **distribuido**, **desde muchos orígenes** (a menudo una *botnet*) **contra un objetivo** |
| Fuerza bruta, diccionario, *password spraying*, *credential stuffing* | Probar contraseñas; una contraseña común contra muchas cuentas; reutilizar credenciales filtradas |
| Repetición (*replay*), secuestro de sesión | Reenviar mensajes capturados; robar el identificador de sesión |
| Envenenamiento de caché DNS o ARP | Desviar el tráfico |
| Inyección SQL, XSS, CSRF | Ataques a aplicaciones web (tema III.8) |
| **Día cero** | Explota una vulnerabilidad desconocida o sin parche |
| **Cadena de suministro** | Compromete a un proveedor o componente (SolarWinds en 2020; la puerta trasera de XZ Utils en 2024) |
| **APT** | Según el CCN, **ataque selectivo de ciberespionaje o cibersabotaje**, llevado a cabo bajo el auspicio o la dirección de un **país u organización adversaria**, por razones que van más allá de las financieras, delictivas o de protesta; persistente, sigiloso y con movimiento lateral |
| Amenaza interna | Personal propio o contratado, malintencionado o negligente |

### Gestión de vulnerabilidades

| Recurso | Qué es |
|---|---|
| **CVE** | Identificador único de cada vulnerabilidad publicada (`CVE-2024-3094`), gestionado por MITRE con autoridades de numeración (CNA) |
| **CWE** | Catálogo de **tipos** de debilidades (CWE-79 XSS, CWE-89 inyección SQL) |
| **CVSS** | Puntuación de gravedad de 0 a 10; versión **4.0** (FIRST, 2023) |
| **NVD** | ***National Vulnerability Database*** del NIST: **base de datos de vulnerabilidades** que enriquece los CVE con CVSS, CWE y productos afectados |
| **EUVD** | *European Vulnerability Database* de ENISA, operativa desde mayo de 2025 en virtud de la Directiva NIS2 |
| Catálogo KEV de CISA y EPSS | Vulnerabilidades explotadas activamente; probabilidad de explotación |
| **SCAP** | Conjunto de **especificaciones** para automatizar la evaluación (no es una base de datos) |
| Escáneres | Nessus, OpenVAS/Greenbone, Qualys |
| Avisos | **CCN-CERT** (sector público), INCIBE-CERT, boletines de fabricantes |

Herramientas del **CCN-CERT** para las Administraciones: **PILAR** (análisis de riesgos con MAGERIT), **LUCIA** (gestión de ciberincidentes), **INES** (informe del estado de la seguridad y cumplimiento del ENS), **CLAUDIA** (detección de *malware* complejo y movimiento lateral en los puestos), **microCLAUDIA** (protección frente a *ransomware*), **CARMEN** (detección de amenazas en el tráfico de red), **MARTA** (análisis dinámico de ficheros), **ROCÍO** (auditoría de equipos de comunicaciones) y **CLARA** (auditoría de cumplimiento en Windows).

## Técnicas criptográficas

### Objetivos y tipos

La criptografía aporta **confidencialidad** (cifrado), **integridad** (funciones resumen, MAC), **autenticidad** y **no repudio** (firma digital).

| Tipo | Claves | Uso | Ejemplos |
|---|---|---|---|
| **Simétrica** (clave secreta) | La **misma** clave cifra y descifra; hay que compartirla de forma segura | Cifrado rápido de grandes volúmenes | **AES** (bloques de 128 bits; claves de 128, 192 y 256), ChaCha20, Camellia; obsoletos DES, 3DES, RC4; **GOST 28147-89** (cifrado de bloque ruso) |
| **Asimétrica** (clave pública) | Par de claves: **pública** (se difunde) y **privada** (secreta) | Intercambio de claves, firma digital, cifrado de pequeños datos | **RSA** (factorización), **Diffie-Hellman** (acuerdo de claves), **ElGamal**, DSA, **ECDSA** y EdDSA (**algoritmos de firma** con curvas elípticas), ECDH y X25519 |
| **Funciones resumen** (*hash*) | Sin clave; salida de longitud fija, unidireccional y resistente a colisiones | Integridad, firma, almacenamiento de contraseñas | **SHA-2** (SHA-256, SHA-384, SHA-512), **SHA-3**; rotos: **MD5** y **SHA-1** |
| MAC | Clave compartida | Integridad y autenticidad del origen | HMAC-SHA-256, CMAC, GMAC |

En la práctica se usa **cifrado híbrido**: con criptografía asimétrica se acuerda o transporta una **clave de sesión** simétrica, que es la que cifra los datos (así funcionan TLS, S/MIME y PGP). Si se cifra con la **clave pública del destinatario**, solo su clave privada descifra (**confidencialidad**); si se firma con la **clave privada del emisor**, cualquiera verifica con su clave pública (**autenticidad**).

![Tres esquemas de cifrado entre Ana y Benito: en el simétrico, la misma clave secreta K, compartida antes por un canal seguro, cifra y descifra con AES; en el asimétrico, Ana cifra con la clave pública de Benito y solo la privada de Benito descifra; en el híbrido, Ana genera una clave de sesión, cifra los datos con AES y esa clave, cifra la clave de sesión con la pública de Benito, y Benito la recupera con su privada para descifrar los datos](diagramas/IV.5-cifrado.svg)

*Figura: qué clave cifra y cuál descifra en cada tipo de criptografía, y cómo las combina el cifrado híbrido.*

**Modos de cifrado de bloque**: ECB (inseguro: bloques iguales dan cifrados iguales), CBC, CTR y los **autenticados** (AEAD) como **GCM**, que cifran y protegen la integridad a la vez. Las contraseñas no se cifran: se guardan con funciones de derivación lentas y con sal (**Argon2**, bcrypt, scrypt, PBKDF2).

### Fortaleza y longitudes de clave

| Fortaleza (bits de seguridad) | Simétrico | RSA y DH | Curvas elípticas |
|---|---|---|---|
| 112 | 3DES (en retirada) | 2048 | 224 |
| **128** | **AES-128** | **3072** | **256** (P-256, Curve25519) |
| 192 | AES-192 | 7680 | 384 |
| 256 | AES-256 | 15360 | 512 |

(Equivalencias de NIST SP 800-57.) Las guías del CCN (CCN-STIC-807, criptología de empleo en el ENS, y CCN-STIC-221, mecanismos criptográficos autorizados) fijan qué algoritmos y longitudes se admiten en cada categoría; en el examen de 2025 la respuesta oficial fue que solo se autorizan métodos de **intercambio de claves** con una fortaleza de **al menos 112 bits**.

### Criptografía poscuántica

Un ordenador cuántico suficientemente grande rompería RSA y las curvas elípticas (algoritmo de Shor) y debilitaría los simétricos (Grover, por eso se prefiere AES-256). En agosto de 2024 el NIST publicó los primeros estándares poscuánticos: **FIPS 203 (ML-KEM)** para encapsulación de claves, **FIPS 204 (ML-DSA)** y **FIPS 205 (SLH-DSA)** para firma; en 2025 seleccionó HQC como segundo KEM y la FIPS 206 (FN-DSA) está en preparación. La hoja de ruta coordinada de la UE (junio de 2025) pide empezar la transición antes de finales de 2026, migrar los casos de alto riesgo antes de 2030 y completar la migración hacia 2035. Mientras tanto se despliegan **esquemas híbridos** (por ejemplo, X25519 + ML-KEM en TLS).

### Comprobar la integridad y firmar con OpenSSL

Que una web publique el ***hash*** de una descarga sirve para **asegurar la integridad**: si el resumen calculado del fichero descargado no coincide con el publicado, el fichero se ha alterado o está incompleto.

```bash
sha256sum herramienta.zip                          # Linux: comparar con el hash publicado
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:3072 -out privada.pem
openssl pkey -in privada.pem -pubout -out publica.pem
openssl dgst -sha256 -sign privada.pem -out documento.sig documento.pdf     # firmar el resumen
openssl dgst -sha256 -verify publica.pem -signature documento.sig documento.pdf   # «Verified OK»
openssl enc -aes-256-cbc -pbkdf2 -salt -in datos.csv -out datos.csv.enc     # cifrado simétrico con contraseña
```

```powershell
Get-FileHash .\herramienta.zip -Algorithm SHA256   # Windows (también certutil -hashfile herramienta.zip SHA256)
```

## Protocolos seguros

| Protocolo | Protege | Notas |
|---|---|---|
| **TLS 1.3** (RFC 8446) y TLS 1.2 | Transporte de aplicaciones: HTTPS (443), correo, LDAPS (636), FTPS | TLS 1.3: un solo viaje de ida y vuelta, solo cifrados AEAD y secreto perfecto hacia adelante; **SSL 2.0/3.0 y TLS 1.0/1.1 están prohibidos** (RFC 8996). Detalle en IV.8 |
| **SSH** (RFC 4251 a 4254) | Acceso remoto, SFTP, SCP, túneles | TCP 22; autenticación con claves |
| **IPsec** con IKEv2 (RFC 7296) | Capa de red: VPN | AH (integridad), ESP (cifrado e integridad); modos transporte y túnel; UDP 500 y 4500 (tema IV.9) |
| **S/MIME** (RFC 8551) y **OpenPGP** (RFC 9580) | Correo: cifrado y firma de extremo a extremo | Certificados X.509 / anillos de confianza |
| **DNSSEC** | Autenticidad e integridad de las respuestas DNS | Firma las zonas; no cifra |
| **Kerberos** | Autenticación en dominios (TCP/UDP 88) | Tiques emitidos por el KDC |
| SNMPv3, SRTP, WPA3 y 802.1X con EAP-TLS | Gestión, voz, Wi‑Fi | Sustituyen a SNMPv1/v2c, RTP, WEP y WPA-TKIP |

### Infraestructura de clave pública (PKI)

- **Autoridad de certificación (CA)**: emite y firma los certificados; **autoridad de registro (RA)**: verifica la identidad del solicitante; **servicios de validación**: listas de revocación (**CRL**) y consulta en línea (**OCSP**, RFC 6960); **autoridad de sellado de tiempo** (TSA, RFC 3161).
- **Certificado X.509 v3**: versión, número de serie, algoritmo de firma, emisor, periodo de validez, sujeto, **clave pública del sujeto**, extensiones (usos de la clave, nombres alternativos) y **firma de la CA**.
- Las claves privadas críticas se guardan en **HSM** (módulos criptográficos certificados FIPS 140-3 o Common Criteria).
- Certificados de servidor web: el CA/Browser Forum reduce su validez máxima a **200 días desde el 15‑3‑2026**, 100 días desde 2027 y 47 días desde 2029, lo que obliga a **automatizar la renovación** (ACME).
- En España: certificados de la **FNMT**, el **DNI electrónico**, sistemas de clave concertada como **Cl@ve** y certificados de empleado público y de sello de órgano.

## Mecanismos de firma digital

### Proceso

```text
FIRMAR (emisor)                                  VERIFICAR (receptor)
1. resumen = hash(documento)                     1. resumen1 = hash(documento recibido)
2. firma = cifrar(resumen, clave PRIVADA)        2. resumen2 = descifrar(firma, clave PÚBLICA del certificado)
3. se envía documento + firma + certificado      3. ¿resumen1 == resumen2? → íntegro y auténtico
                                                 4. comprobar el certificado: CA de confianza, vigencia, revocación (OCSP/CRL)
```

La firma garantiza **autenticidad** del firmante, **integridad** del documento y **no repudio**, pero **no confidencialidad**: el documento no se cifra (para eso habría que cifrarlo además con la clave pública del destinatario). Lo que se «cifra» con la clave privada es el **resumen**, no el documento.

### Marco jurídico

- **Reglamento eIDAS** (UE 910/2014, reformado por el **Reglamento (UE) 2024/1183**, que crea la **cartera europea de identidad digital**): firma electrónica **simple**, **avanzada** (vinculada al firmante de forma única, permite identificarlo, creada con medios bajo su control exclusivo y detecta cambios posteriores) y **cualificada** (avanzada + **certificado cualificado** + **dispositivo cualificado de creación de firma**, con efecto jurídico equivalente a la firma manuscrita); además, **sello electrónico** (de personas jurídicas), **sello de tiempo** y servicios de confianza cualificados.
- **Ley 6/2020**, de servicios electrónicos de confianza.
- **Ley 39/2015** (arts. 9 y 10: sistemas de identificación y firma de los interesados, incluidos certificados cualificados y sistemas de clave concertada) y **Ley 40/2015** (arts. 40 a 43: sello electrónico de órgano, código seguro de verificación y firma del personal).

### Formatos

| Formato | Base | Características |
|---|---|---|
| **CAdES** (*CMS Advanced Electronic Signatures*) | CMS / PKCS#7, **binario** | Firma cualquier tipo de fichero; puede contener el documento (implícita, *attached*) o no (explícita, *detached*); **apropiado para ficheros grandes**, sobre todo si la firma contiene el documento original, por su menor sobrecarga |
| **XAdES** (*XML Advanced Electronic Signatures*) | XML | El resultado es **XML**; firmas **despegadas** (*detached*), **envolventes** (*enveloping*: el documento va dentro de la firma) y **envueltas** (*enveloped*: la firma va dentro del XML firmado); usado en la factura electrónica (Facturae); poco adecuado para ficheros muy grandes |
| **PAdES** (*PDF Advanced Electronic Signatures*) | PDF | La firma va **dentro del propio PDF** (puede ser visible); **el más adecuado cuando el documento es un PDF** |
| JAdES | JSON | Para servicios web y API |
| ASiC | Contenedor ZIP | Agrupa documentos y firmas CAdES o XAdES |
| Firmas OOXML y ODF | Office y LibreOffice | Formatos propios de los paquetes ofimáticos (no son PAdES) |

**Niveles** (normas ETSI EN 319 122, 132 y 142): **B-B** (básica), **B-T** (con **sello de tiempo**), **B-LT** (incluye los datos de validación —certificados y respuestas OCSP— para verificarla a largo plazo) y **B-LTA** (con sellos de archivo que se renuevan). Equivalen a los antiguos BES/EPES, T, C/X/XL y A.

**Firmas múltiples**: la **cofirma** es una firma **en paralelo**: todos los firmantes están al mismo nivel y el orden no importa; la **contrafirma** firma **una firma anterior** (en cascada o jerárquica, por ejemplo el visto bueno de un superior).

### Herramientas de la Administración

- **AutoFirma**: aplicación de escritorio de la Administración para firmar en local (CAdES, XAdES, PAdES, Facturae) y desde las sedes electrónicas; utiliza resúmenes de la familia **SHA-2** (SHA-256, SHA-384, SHA-512) con RSA o ECDSA; MD5 no se admite y ECDSA o DSA son algoritmos **de firma**, no de huella.
- **Cliente @firma móvil**, **Cl@ve Firma** (firma con certificados centralizados en la nube), **@firma** (plataforma de validación y firma de la AGE), **VALIDe** (validación web de firmas y certificados), **Portafirmas** y la **autoridad de sellado de tiempo** de la AGE.

## Infraestructura física de un CPD: acondicionamiento y equipamiento

### Ubicación y edificio

Lejos de zonas inundables y de riesgos industriales, sin ventanas exteriores, con **suelo técnico** (falso suelo) o canalizaciones aéreas para el cableado y el aire, techo técnico, resistencia estructural para el peso de los armarios, compartimentación contra incendios, accesos controlados y espacio para crecer. Los armarios (*racks*) son de 19 pulgadas y su altura se mide en **unidades U** (1U = 44,45 mm).

### Estándar ANSI/TIA-942

La norma de infraestructura de telecomunicaciones para centros de datos de la TIA (revisión **B** de 2017 y **C** de 2024) define los espacios y la topología del cableado:

| Espacio | Función |
|---|---|
| Sala de entrada (ER) | Llegada de los operadores y demarcación |
| **MDA** (*Main Distribution Area*) | Distribución principal: núcleo de la red y conexión cruzada principal |
| IDA (*Intermediate Distribution Area*) | Distribución intermedia en CPD grandes |
| **HDA** (*Horizontal Distribution Area*) | Distribución horizontal hacia las filas de equipos |
| ZDA (*Zone Distribution Area*) | Punto de consolidación opcional |
| **EDA** (*Equipment Distribution Area*) | **Donde se ubican los equipos finales**: servidores, almacenamiento, *mainframes* |
| Sala de telecomunicaciones (TR) | Da servicio a las oficinas del edificio |

La norma define también términos como el **plenum**: **compartimento al que se conectan uno o más conductos de aire y que forma parte del sistema de distribución del aire** (por ejemplo, el espacio bajo el suelo técnico o sobre el techo usado para el retorno).

**Niveles de disponibilidad**: TIA-942 clasifica los CPD en **cuatro niveles**, del **1 (menor disponibilidad)** al **4 (mayor)**; desde la revisión B los llama *Rated‑1* a *Rated‑4* (antes *Tier*), y el Uptime Institute certifica sus propios **Tier I a IV**:

| Nivel | Concepto | Redundancia | Disponibilidad orientativa que suele citarse |
|---|---|---|---|
| 1 | Básico | Sin redundancia (N) | 99,671 % |
| 2 | Componentes redundantes | N+1 en equipos, un solo camino de distribución | 99,741 % |
| 3 | **Mantenimiento concurrente**: cualquier componente se puede mantener sin parar | N+1 y varios caminos (uno activo) | 99,982 % |
| 4 | **Tolerante a fallos**: un fallo cualquiera no interrumpe | 2N o 2(N+1), caminos activos simultáneos | 99,995 % |

En Europa se usa además la serie **EN 50600** (adoptada como ISO/IEC 22237), con clases de disponibilidad 1 a 4.

### Energía

- **Acometidas** eléctricas independientes, cuadros, **SAI** (sistema de alimentación ininterrumpida) y **grupo electrógeno** con conmutación automática (ATS) para cortes largos; **PDU** en los armarios y doble alimentación A/B a cada equipo.
- Tipos de SAI: *off-line* o *standby* (entra solo al fallar la red), **interactivo** (*line-interactive*, regula tensión) y ***on-line* de doble conversión** (el equipo siempre se alimenta desde el inversor; la mejor protección, la habitual en CPD).
- Redundancia: **N** (lo justo), **N+1** (un elemento de reserva), **2N** (todo duplicado).
- Toma de tierra, protección contra sobretensiones y mantenimiento periódico de baterías.

### Climatización

- Equipos de **precisión** (CRAC y CRAH, en fila o *in-row*) que controlan temperatura y **humedad** las 24 horas, todo el año, con redundancia. No se debe derivar la climatización general del edificio: está pensada para el confort de las personas, con horarios, cargas térmicas y control de humedad distintos, y sin la redundancia ni la continuidad que exige un CPD.
- Disposición en **pasillos fríos y calientes** (los equipos aspiran del frío y expulsan al caliente), con **confinamiento** de pasillo para no mezclar el aire; paneles ciegos en los huecos de los armarios.
- **Free cooling** (aprovechar el aire o el agua fríos del exterior) y refrigeración **líquida** para las altas densidades (servidores de IA).
- Rango recomendado por ASHRAE para la entrada de aire de los equipos: **18 a 27 °C**, con control del punto de rocío.

### Detección y extinción de incendios

- **Detección** temprana por aspiración (VESDA) y detectores de humo y temperatura, también bajo el suelo técnico.
- **Extinción automática** sin dañar los equipos: **gases inertes** (IG-541, IG-55, nitrógeno, que reducen el oxígeno), **agentes químicos** (FK-5-1-12, HFC-227ea, sujetos a la normativa europea de gases fluorados) o **agua nebulizada**; el **halón** está prohibido. Extintores de CO₂ para fuego eléctrico.
- Alarmas, pulsadores de disparo y paro, y ventilación tras la descarga.

### Seguridad, monitorización y cableado

Control de acceso por capas con registro (mp.if.1, mp.if.2 y mp.if.7), CCTV, detección de agua y de intrusión, sondas de temperatura y humedad, gestión del CPD con **DCIM** o BMS, cableado estructurado (ISO/IEC 11801, TIA-568) con **etiquetado** (TIA-606) e inventario.

### Eficiencia energética

**PUE** (*Power Usage Effectiveness*, ISO/IEC 30134-2) compara la **energía total consumida por el CPD** con la que **consume realmente el equipamiento de TI**:

```text
PUE = energía total de la instalación / energía de los equipos de TI      (ideal = 1,0)
Ejemplo: 1 500 MWh totales / 1 000 MWh de TI = PUE 1,5  →  DCiE = 1 / 1,5 = 67 %
```

Cuanto más se acerca a 1, menos energía se va en refrigeración, pérdidas eléctricas e iluminación. Otros indicadores: WUE (agua), CUE (carbono), ERF (reutilización de energía). La **Directiva (UE) 2023/1791** de eficiencia energética obliga a los CPD de al menos 500 kW a comunicar sus indicadores de sostenibilidad cada año.

## Sistemas de gestión de incidencias

### ITIL y gestión de servicios TI

**ITIL** es una **colección de buenas prácticas para la gestión de servicios de TI**. ITIL 4 (2019) organiza la gestión en un sistema de valor del servicio con 34 prácticas; en 2026 PeopleCert lanzó **ITIL versión 5**, que integra la gestión de productos y servicios digitales. La norma certificable equivalente es **ISO/IEC 20000-1:2018**.

| Concepto | Definición |
|---|---|
| **Incidencia** | Interrupción no planificada o degradación de un servicio; objetivo: **restaurarlo cuanto antes** |
| **Problema** | **Causa** (desconocida) de una o varias incidencias; objetivo: encontrar la **causa raíz** y eliminarla |
| Error conocido | Problema analizado con causa conocida y, a menudo, solución temporal |
| **Petición de servicio** | Solicitud de algo previsto (alta de usuario, permiso, *software*), no una avería |
| **Cambio** | Modificación de un elemento de configuración, con evaluación y autorización |
| SLA, OLA, UC | Acuerdo de nivel de servicio con el cliente; acuerdo interno entre equipos; contrato con el proveedor |

**Prioridad = impacto × urgencia**:

| Impacto \ Urgencia | Alta | Media | Baja |
|---|---|---|---|
| **Alto** | 1 Crítica | 2 Alta | 3 Media |
| **Medio** | 2 Alta | 3 Media | 4 Baja |
| **Bajo** | 3 Media | 4 Baja | 5 Planificada |

**Ciclo de una incidencia**: detección y **registro** → **clasificación** → **priorización** → diagnóstico inicial (primer nivel, *service desk*) → **escalado** funcional (a un nivel más especializado: segundo y tercer nivel) o jerárquico (a responsables) → resolución y recuperación → **cierre** con confirmación del usuario. Indicadores: tiempo medio de resolución (MTTR), resolución en el primer contacto, cumplimiento de los SLA, reaperturas. Apoyos: **base de conocimiento** y **CMDB**.

| Herramienta ITSM | Licencia |
|---|---|
| ServiceNow | Comercial, en la nube |
| **BMC Remedy / Helix** | Comercial |
| Jira Service Management | Comercial |
| **GLPI** | Código abierto (inventario y gestión de servicios) |
| **osTicket** | **Código abierto** (sistema de *tickets*) |
| OTRS/Znuny, iTop, Zammad, Request Tracker | Código abierto o comercial |

RabbitMQ (mensajería), Hibernate (persistencia en Java), Snort (IDS) o Nagios (monitorización) **no** son herramientas ITSM.

### Gestión de ciberincidentes en el sector público

- **ENS**: art. 25 (las entidades dispondrán de procedimientos de gestión de incidentes), art. 33 (el **CCN-CERT** articula la respuesta y las entidades le **notifican los incidentes con impacto significativo**), **op.exp.7** (proceso integral de gestión con clasificación y escalado; en categoría MEDIA, **ventanilla única de notificación al CCN-CERT** y medidas de detección y respuesta: detención de servicios, aislamiento, recogida de evidencias; en ALTA, reconfiguración dinámica) y **op.exp.9** (registro de todas las actuaciones y de las evidencias).
- **LUCIA** (*Listado Unificado de Coordinación de Incidentes y Amenazas*) es la **herramienta de *ticketing* del CCN-CERT para gestionar los ciberincidentes** de las entidades del ámbito del ENS y su notificación federada. La guía **CCN-STIC-817** establece los criterios de clasificación (tipo de incidente y niveles de **peligrosidad** e **impacto**).
- Otros equipos de respuesta: **INCIBE-CERT** (ciudadanos y empresas), **ESPDEF-CERT** (Defensa).
- **Datos personales**: notificar la brecha a la **AEPD en 72 horas** (art. 33 RGPD) y, si hay alto riesgo, a los afectados (art. 34).
- **NIS2**: alerta temprana en 24 horas, notificación en 72 horas e informe final en un mes para las entidades esenciales e importantes.
- **Fases** (NIST SP 800-61, revisión 3 de 2025, alineada con el CSF 2.0): preparación; detección y análisis; contención, erradicación y recuperación; y actividad posterior (lecciones aprendidas), conservando las evidencias con **cadena de custodia**.

## Control remoto de puestos de usuario

### Herramientas y protocolos

| Herramienta | Uso | Notas |
|---|---|---|
| **Escritorio remoto** (RDP) | Acceso completo a un equipo o servidor | TCP/UDP 3389; con **autenticación a nivel de red** (NLA); no exponer a Internet: usar VPN o puerta de enlace de Escritorio remoto |
| **Asistencia rápida** (*Quick Assist*) y Asistencia remota (`msra`) de Windows | Soporte al usuario con su consentimiento | El usuario comparte un código o una invitación |
| **Remote Help** de Intune, control remoto de Configuration Manager | Soporte corporativo integrado con la gestión de dispositivos | Con roles, registro y consentimiento |
| **VNC** (protocolo RFB, RFC 6143) | Ver y controlar el escritorio | TCP 5900; sin cifrado propio en muchas implementaciones: túnel SSH o VPN |
| TeamViewer, AnyDesk, Splashtop, BeyondTrust, RustDesk | Soporte por Internet mediante intermediarios | Muy usados también por estafadores y atacantes: solo las herramientas **autorizadas** |
| **SSH** y PowerShell Remoting (WinRM 5985/5986) | Administración por línea de órdenes | Sin interferir en la sesión del usuario |

Modalidades: **atendida** (el usuario está presente y acepta la conexión) o **desatendida** (equipos y servidores sin usuario, con agente instalado y acceso restringido).

### Medidas de seguridad y privacidad

- El ENS exige para el **acceso remoto** (op.acc.6.r9) que esté **autorizado**, que el **tráfico vaya cifrado**, que se **deshabilite cuando no se use de forma constante** y que se **registre** en auditoría; además, una **política específica de acceso remoto** con autorización expresa (op.acc.4.5) y doble factor desde zonas no controladas (op.acc.6.r8).
- **Consentimiento e información** al usuario (aviso visible mientras dura la sesión), control de qué técnicos pueden conectarse y a qué equipos, autenticación fuerte de los técnicos, grabación o registro de las sesiones cuando proceda, y cierre al terminar.
- **Privacidad**: el acceso puede exponer datos personales y comunicaciones privadas; el art. 87 de la **LOPDGDD** reconoce el derecho a la intimidad en el uso de dispositivos digitales en el ámbito laboral y obliga a fijar criterios de uso.
- **Bloquear** las herramientas no autorizadas (lista de aplicaciones permitidas), porque los atacantes instalan herramientas legítimas de control remoto para mantener el acceso.

## Normativa y estándares clave

| Norma o estándar | Qué regula | Puntos clave |
|---|---|---|
| **ENS** (RD 311/2022) | Seguridad en el sector público | Dimensiones C, I, D, A, T; categorías BÁSICA, MEDIA y ALTA; principios (art. 5); medidas org, op y mp |
| ENS, mp.if.1 a mp.if.7 | Instalaciones | Áreas separadas, identificación, acondicionamiento, energía (emergencia en nivel medio), incendios, inundaciones, registro de equipamiento |
| ENS, op.exp.7 y op.exp.9, arts. 25 y 33 | Incidentes | Proceso integral, notificación al CCN-CERT, registro y evidencias |
| ENS, op.acc.6.r9 y op.acc.4.5 | Acceso remoto | Autorizado, cifrado, deshabilitado si no se usa, registrado |
| **MAGERIT v3** | Análisis de riesgos | Amenazas N, I, E, A; herramienta PILAR |
| **ISO/IEC 27001 y 27002:2022** | SGSI y controles | 93 controles en cuatro temas |
| ISO/IEC 27005, NIST SP 800-30 | Gestión de riesgos | Metodologías |
| **Reglamento eIDAS** (910/2014 y 2024/1183) y Ley 6/2020 | Firma y servicios de confianza | Firma simple, avanzada y cualificada; sello; cartera europea de identidad digital |
| Leyes 39/2015 y 40/2015 | Identificación y firma ante la Administración | Arts. 9-10 (interesados); arts. 40-43 (Administración) |
| ETSI EN 319 122, 132 y 142 | CAdES, XAdES y PAdES | Niveles B-B, B-T, B-LT y B-LTA |
| FIPS 197, FIPS 180-4, FIPS 202 | AES, SHA-2, SHA-3 | Algoritmos de referencia |
| FIPS 203, 204 y 205 (2024) | Criptografía poscuántica | ML-KEM, ML-DSA, SLH-DSA |
| RFC 8446 y RFC 8996 | TLS 1.3; retirada de TLS 1.0 y 1.1 | — |
| **ANSI/TIA-942-C** (2024), EN 50600 | Infraestructura de CPD | Espacios ER, MDA, HDA, ZDA, EDA; niveles 1 a 4 |
| ISO/IEC 30134-2 y Directiva (UE) 2023/1791 | Eficiencia de CPD | PUE; obligación de informar desde 500 kW |
| **ITIL** (4 y versión 5) e ISO/IEC 20000-1 | Gestión de servicios | Incidencias, problemas, peticiones, cambios |
| NIST SP 800-61r3 (2025) | Respuesta a incidentes | Alineada con el CSF 2.0 |
| RGPD arts. 32-34 y LOPDGDD art. 87 | Datos personales | Seguridad, notificación de brechas en 72 h, intimidad en el puesto |

## Lo que más cae en el examen

En los nueve exámenes analizados hay **37 preguntas** de este tema: 24 de ingreso libre (4 en 2021, 3 en 2023, **9 en 2024**, 4 en 2025 y 4 en el extraordinario de 2026) y 13 de promoción interna.

| Bloque | Preguntas | Exámenes |
|---|---|---|
| **Criptografía y firma**: proceso de firma (afirmación falsa: «cifra el documento»), algoritmo no asimétrico (GOST), ECDSA, RSA (×2), formatos de firma (PAdES ×2, CAdES ×2), algoritmo de huella en AutoFirma (×2), 112 bits para el intercambio de claves (×2) | 13 | LI 2021, 2023, 2024, 2025 y 2025‑ext; PI 2021, 2023, 2024 y 2025 |
| **Amenazas y vulnerabilidades**: escaneo de puertos frente a *sniffing*, *spoofing* y DDoS, vishing (×2), *tailgating* (×2), definición de APT del CCN, NVD, Ryuk | 8 | LI 2024 y 2025; PI 2021 y 2024 |
| **Conceptos y gestión de la seguridad**: dimensiones afectadas por un incidente, *hash* para la integridad (×2), metodologías de riesgos, contraseña robusta según el CCN-CERT (×2) | 6 | LI 2024, 2025 y 2025‑ext; PI 2024 y 2025 |
| **CPD**: niveles TIA-942, EDA (×2), plenum, PUE, climatización (anulada) | 6 | LI 2021, 2024, 2025 y 2025‑ext; PI 2024 y 2025 |
| **Gestión de incidencias**: definición de ITIL, LUCIA, Remedy/Helix, osTicket | 4 | LI 2021, 2024 y 2025‑ext; PI 2021 |

Patrón: definiciones literales con un término cambiado (PAdES como «Propietario Avanzado», DDoS «desde un solo punto», *sniffing* y *spoofing* intercambiados), listas de las que hay que descartar el intruso (GOST entre asimétricos, PRICE3 entre metodologías de riesgos, MD5 entre algoritmos de huella) y documentos del CCN-CERT (contraseñas, APT, LUCIA, fortaleza criptográfica).

## Trampas habituales

- La firma digital **no da confidencialidad**: se cifra el **resumen** con la **clave privada**; el documento no se cifra.
- **RSA, ElGamal, DSA y ECDSA** son asimétricos; **GOST 28147-89**, AES y 3DES son simétricos; **ECDSA** es un algoritmo **de firma**; **RSA** es un criptosistema de **clave pública**.
- Algoritmos de **huella** (resumen): SHA-256, **SHA-384**, SHA-512; MD5 y SHA-1 están rotos; ECDSA y DSA no son de huella.
- **PAdES** = *PDF Advanced Electronic Signatures* (no «Propietario Avanzado» ni formato de Office); **CAdES** es binario y adecuado para ficheros grandes; **XAdES** produce XML y no conviene con ficheros muy grandes; el formato idóneo para un PDF es PAdES.
- **Cofirma**: firmantes al mismo nivel y orden indiferente; **contrafirma**: firma de una firma anterior.
- ***Sniffing*** captura; ***spoofing*** falsea el origen; **DDoS** ataca **un** objetivo **desde muchos** orígenes; el **escaneo de puertos** obtiene información de los servicios.
- **Vishing** = teléfono; smishing = SMS; *phishing* = correo; ***tailgating*** = colarse detrás de alguien autorizado.
- **APT** (CCN): ataque selectivo de ciberespionaje o cibersabotaje con respaldo de un Estado u organización, no un simple *ransomware* ni un día cero masivo.
- **NVD** es una base de datos de vulnerabilidades; UTM es un cortafuegos unificado; SCAP, un conjunto de especificaciones.
- Un incidente con corrupción e inaccesibilidad afecta a la **integridad** y a la **disponibilidad**.
- El *hash* publicado junto a una descarga protege la **integridad**, no la confidencialidad.
- Contraseñas según el CCN-CERT: **frases** largas sin sentido evidente; nunca datos personales ni apuntarlas.
- TIA-942: **cuatro niveles**, el **1 es el de menor** disponibilidad y el **4 el de mayor**; **EDA** = zona de los equipos finales; MDA = distribución principal; HDA = horizontal; **plenum** = compartimento de distribución de aire.
- **PUE** = energía total del CPD / energía de TI (ideal 1).
- **ITIL** = buenas prácticas de gestión de servicios TI; **LUCIA** = *ticketing* de ciberincidentes del CCN-CERT; **Remedy/Helix** = ITSM; **osTicket** = *ticketing* de código abierto (Remedy es comercial y Nagios monitoriza).
- Metodologías de riesgos: MAGERIT, OCTAVE, NIST SP 800-30, ISO/IEC 27005 (no «PRICE3»).
- Incidencia ≠ problema: la incidencia se restaura; el problema busca la causa raíz.

## Repaso rápido

- Dimensiones ENS: confidencialidad, integridad, disponibilidad, autenticidad y trazabilidad.
- Riesgo = probabilidad × impacto; salvaguardas; riesgo residual; MAGERIT y PILAR.
- Principios ENS (art. 5): proceso integral, riesgos, prevención-detección-respuesta-conservación, líneas de defensa, vigilancia continua, diferenciación de responsabilidades.
- Seguridad física: mp.if.1 a mp.if.7; esclusas, CCTV, puesto despejado; *tailgating*.
- Seguridad lógica: AAA, MFA con factores de tipo distinto, RBAC, contraseñas largas, EDR, cifrado, parches, copias, SIEM.
- Amenazas MAGERIT: N, I, E, A. *Malware*: virus, gusano, troyano, *ransomware*, *rootkit*, *botnet*.
- Ingeniería social: *phishing*, vishing, smishing, *pharming*, BEC, *tailgating*.
- CVE, CWE, CVSS 4.0, NVD, EUVD, KEV; herramientas CCN: PILAR, LUCIA, INES, CLAUDIA, microCLAUDIA, CARMEN.
- Simétrica (AES), asimétrica (RSA, DH, ECDSA), *hash* (SHA-2, SHA-3); cifrado híbrido; AES-GCM.
- 128 bits de seguridad ≈ AES-128 ≈ RSA 3072 ≈ ECC 256; 112 bits ≈ RSA 2048.
- Poscuántica: ML-KEM, ML-DSA, SLH-DSA (2024); hoja de ruta de la UE 2026-2030-2035.
- TLS 1.3, SSH, IPsec, S/MIME, OpenPGP, DNSSEC, Kerberos; PKI con CA, RA, CRL, OCSP, TSA; certificados web de 200 días desde 2026.
- Firma: hash + clave privada; autenticidad, integridad y no repudio; eIDAS (simple, avanzada, cualificada); CAdES, XAdES, PAdES; B-B, B-T, B-LT, B-LTA; cofirma y contrafirma; AutoFirma, @firma, VALIDe, Cl@ve Firma.
- CPD: TIA-942 (ER, MDA, IDA, HDA, ZDA, EDA), niveles 1 a 4; SAI de doble conversión, grupo, N+1 y 2N; pasillos frío y caliente; 18-27 °C; gases inertes; PUE.
- ITIL: incidencia, problema, petición, cambio; prioridad = impacto × urgencia; ITSM: ServiceNow, Remedy/Helix, GLPI, osTicket.
- Ciberincidentes: CCN-CERT, LUCIA, CCN-STIC-817, RGPD 72 h, NIS2 24/72 h y un mes.
- Control remoto: RDP con NLA y sin exposición a Internet, Asistencia rápida, VNC, SSH; ENS op.acc.6.r9: autorizado, cifrado, deshabilitado si no se usa y registrado.

## Fuentes

- Real Decreto 311/2022, Esquema Nacional de Seguridad (BOE-A-2022-7191): https://www.boe.es/buscar/act.php?id=BOE-A-2022-7191
- PAe, MAGERIT v3: https://administracionelectronica.gob.es/pae_Home/pae_Documentacion/pae_Metodolog/pae_Magerit.html
- Reglamento (UE) 910/2014 (eIDAS), versión consolidada: https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX:02014R0910-20240520
- Ley 6/2020, de servicios electrónicos de confianza (BOE-A-2020-14046): https://www.boe.es/buscar/act.php?id=BOE-A-2020-14046
- Ley 39/2015, del Procedimiento Administrativo Común (BOE-A-2015-10565): https://www.boe.es/buscar/act.php?id=BOE-A-2015-10565
- Portal de Firma Electrónica del Gobierno de España (AutoFirma, VALIDe): https://firmaelectronica.gob.es/
- ETSI EN 319 122-1 (CAdES): https://www.etsi.org/deliver/etsi_en/319100_319199/31912201/
- NIST SP 800-57 Part 1 Rev. 5, *Recommendation for Key Management*: https://csrc.nist.gov/pubs/sp/800/57/pt1/r5/final
- NIST, FIPS 203, 204 y 205 (criptografía poscuántica): https://csrc.nist.gov/projects/post-quantum-cryptography
- NIST SP 800-61 Rev. 3, *Incident Response Recommendations*: https://csrc.nist.gov/pubs/sp/800/61/r3/final
- NIST Cybersecurity Framework 2.0: https://www.nist.gov/cyberframework
- RFC 8446 (TLS 1.3): https://www.rfc-editor.org/rfc/rfc8446
- RFC 8996 (retirada de TLS 1.0 y 1.1): https://www.rfc-editor.org/rfc/rfc8996
- National Vulnerability Database (NVD): https://nvd.nist.gov/
- ENISA, *European Vulnerability Database*: https://euvd.enisa.europa.eu/
- FIRST, CVSS v4.0: https://www.first.org/cvss/v4-0/
- CCN-CERT (guías CCN-STIC y herramientas LUCIA, PILAR, CLAUDIA): https://www.ccn-cert.cni.es/
- TIA, revisión C de la norma TIA-942: https://tiaonline.org/
- Directiva (UE) 2023/1791, de eficiencia energética: https://eur-lex.europa.eu/eli/dir/2023/1791/oj
- Comisión Europea, hoja de ruta coordinada para la criptografía poscuántica: https://digital-strategy.ec.europa.eu/en/library/coordinated-implementation-roadmap-transition-post-quantum-cryptography
