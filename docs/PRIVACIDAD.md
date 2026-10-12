# Privacidad y datos en OpoTAI

OpoTAI es una aplicación de escritorio que funciona **sin conexión**: no tiene cuentas, servidores,
publicidad, analítica ni telemetría. Todo lo que haces en la app se queda en tu equipo.

## Qué datos guarda la app

| Dato | Para qué sirve |
|---|---|
| **Nombre o alias** del perfil, color y avatar (un emoji o una **imagen propia** que tú eliges: tu foto, un personaje, lo que quieras) | Saludarte y distinguir perfiles si varias personas estudian en el mismo equipo. Puedes usar un alias y cualquier imagen. |
| Ajustes (tema, sonido, modo de corrección, convocatoria objetivo, fecha del examen, localidades preferidas) | Personalizar la app. Todos son opcionales. |
| Intentos de examen (respuestas, tiempo, notas por parte) | Corregir, mostrar resultados e historial. |
| Estadísticas por pregunta, bloque y tema, y repaso espaciado | Recomendarte qué repasar y estimar tu progreso. |

Si subes una imagen de avatar (de cualquier proporción; el fichero original puede ocupar hasta
30 MB), la app la reduce si su lado mayor pasa de 1024 píxeles y la vuelve a codificar antes de
guardarla (como mucho 2 MB): así ocupa poco y **se eliminan sus metadatos** (EXIF, que pueden
incluir la ubicación GPS o el modelo de la cámara). Los GIF animados se guardan tal cual para no
perder la animación (el formato GIF no lleva EXIF). Se guarda solo en tu equipo, dentro de la
base de datos local, y la puedes cambiar o quitar cuando quieras.

La app **no pide** correo electrónico, DNI, teléfono, fecha de nacimiento, datos de salud o
discapacidad ni ningún otro dato sensible. No los escribas en el nombre del perfil: basta con un
alias.

## Dónde se guardan

En una base de datos local (SQLite), `opotai.sqlite3`, dentro de la carpeta de datos de la
aplicación de tu usuario del sistema operativo:

| Sistema | Carpeta |
|---|---|
| Windows | `%APPDATA%\com.ericvallsgramunt.opotai\` |
| Linux | `~/.local/share/com.ericvallsgramunt.opotai/` (o `$XDG_DATA_HOME/…`) |
| macOS | `~/Library/Application Support/com.ericvallsgramunt.opotai/` |

La ruta exacta aparece en la app, en **Ajustes → Privacidad y datos** y en **Acerca de**. Los
perfiles no tienen contraseña: cualquiera que use tu misma cuenta del sistema operativo puede
verlos. Si compartes el ordenador y quieres privacidad, usa cuentas de usuario separadas.

## Qué sale de tu equipo

Nada, salvo que tú lo decidas. La app no hace peticiones de red. Los enlaces externos (donaciones
con PayPal, Ko-fi o GitHub Sponsors, el perfil de LinkedIn del autor y el repositorio de GitHub)
se abren en tu navegador solo cuando los pulsas, y esos servicios aplican sus propias políticas
de privacidad.

## Cómo borrar tus datos

- **Un perfil**: en **Ajustes → Privacidad y datos** (o en **Perfiles**), «Borrar este perfil y
  todos sus datos» elimina el perfil, sus ajustes, intentos y estadísticas.
- **Todo**: desinstala la app y borra la carpeta de datos indicada arriba.

## El autor no trata tus datos

Como todo el tratamiento ocurre en tu equipo y bajo tu control, el autor de OpoTAI no recibe,
almacena ni trata ningún dato de las personas usuarias. Los datos de convocatorias anteriores que
incluye la app (notas de corte, plazas y destinos adjudicados) proceden de publicaciones oficiales
del BOE y se usan **agregados y sin datos personales** de los aspirantes (ni nombres ni DNI).

---
© 2026 Eric Valls Gramunt · GPL-3.0-or-later
