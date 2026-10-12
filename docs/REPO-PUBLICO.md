# Repositorio público de OpoTAI

> Cómo publicar OpoTAI en un repositorio **público** de GitHub para que cualquier opositor pueda
> descargar los ejecutables y los instaladores. Proyecto **OpoTAI** · autor: **Eric Valls Gramunt**.

## Por qué un repositorio público

- Las *releases* de un repositorio privado solo las ven su dueño y sus colaboradores.
- En un repositorio público, **GitHub Actions es gratuito**, también para compilar en macOS
  (en los privados, cada minuto de macOS cuenta como 10).
- Con la licencia GPL-3.0 el código ya está preparado para publicarse, y el repositorio sirve de
  escaparate del proyecto (LinkedIn, CV).

El repositorio público lleva **todo el código** (lo necesita GitHub Actions para compilar), los
datos, la documentación y el workflow «Instaladores», que genera:

| Sistema | Ficheros |
|---|---|
| Windows 10/11 x64 | `-setup.exe` (NSIS), `.msi` y `.exe` portable |
| Linux x64 | `.deb`, `.rpm` y `.AppImage` |
| macOS Apple Silicon (arm64) | `.dmg` (firma ad-hoc) |

## 1. Crear el repositorio

En GitHub: **New repository**.

- **Nombre**: `OpoTAI` (o `opotai`).
- **Visibilidad**: *Public*.
- Sin README, sin `.gitignore` y sin licencia: ya vienen en el código.

### Descripción («About»)

> Entrenador de escritorio gratuito y de código abierto para la oposición TAI (AGE): exámenes
> oficiales con la corrección del tribunal, explicación de cada fallo, simulacros con cronómetro,
> teoría de los 33 temas y simulador de plaza y destino. Windows, Linux y macOS.

**Temas (topics)**: `oposiciones`, `oposicion-tai`, `tai`, `age`, `test`, `simulacros`,
`examenes`, `educacion`, `spain`, `tauri`, `rust`, `react`, `typescript`, `desktop-app`,
`offline-first`.

**Imagen de vista previa** (*Settings → General → Social preview*): sube
`docs/capturas/v1/social-preview.png` (1280 × 640).

## 2. Subir el código sin exponer tu correo

Cada commit guarda el nombre y el correo de su autor. Si subes el historial de desarrollo tal
cual, **tu correo personal quedará visible en todos los commits públicos**. Hay dos formas de
evitarlo:

**A) Historial limpio (recomendado):** un único commit inicial con tu correo *noreply* de GitHub
(GitHub → *Settings → Emails →* «Keep my email addresses private» te muestra uno con la forma
`ID+usuario@users.noreply.github.com`).

```bash
# En una copia local del repositorio privado, sobre la versión que quieras publicar:
git fetch origin claude/app-escritorio-tai
git switch --orphan publico
git checkout origin/claude/app-escritorio-tai -- .
git rm -r --cached --quiet .claude 2>/dev/null; rm -rf .claude   # ajustes locales de Claude Code
git add -A
git -c user.name="Eric Valls Gramunt" \
    -c user.email="TU_ID+TU_USUARIO@users.noreply.github.com" \
    commit -m "OpoTAI v1.0.0"
git remote add publico https://github.com/TU_USUARIO/OpoTAI.git
git push publico publico:main
```

**B) Historial completo:** `git push publico claude/app-escritorio-tai:main`. Tu correo quedará
en los commits antiguos.

Para las versiones siguientes, repite **A** con un commit nuevo encima, sin `--orphan`: trae los
cambios con `git checkout origin/claude/app-escritorio-tai -- .`, haz el commit y el push. O
usa **B**.

## 3. Ajustes del repositorio público

- **Actions**: deben estar activadas (por defecto lo están). El workflow ya declara
  `permissions: contents: write`, que necesita para crear la release.
- **Issues**: actívalas para que los opositores avisen de erratas.
- **Sponsors**: el botón «Sponsor» sale de `.github/FUNDING.yml` (GitHub Sponsors, Ko-fi y
  PayPal). Comprueba antes que las tres cuentas están activas.

## 4. Generar y publicar los instaladores

1. Prueba de compilación sin publicar nada: cambia `.github/compilar-instaladores`, haz commit y
   push. En *Actions → Instaladores* aparecen los ejecutables de los tres sistemas como
   artefactos, para descargarlos y probarlos.
2. Versión: `git tag -a v1.0.0 -m "OpoTAI v1.0.0" && git push publico v1.0.0`. El workflow crea
   un **borrador de release** con todos los ficheros adjuntos y las instrucciones de instalación
   por sistema.
3. Revisa el borrador (*Releases*), prueba los instaladores (checklist en
   [`LANZAMIENTO.md`](LANZAMIENTO.md)) y pulsa **Publish release**. El botón «Descargar» del
   README apunta siempre a la última versión publicada.

## 5. Mantenerlo al día

Cada convocatoria nueva o corrección importante:

1. Se prepara en el repositorio privado.
2. Se sube al público (paso 2).
3. Se publica con una etiqueta nueva (`v1.1.0`, `v1.0.1`…).

El `CHANGELOG.md` resume qué cambia en cada versión.
