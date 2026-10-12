# Lanzamiento de OpoTAI v1.0.0

> Guía para publicar la primera versión. Proyecto **OpoTAI** · autor: **Eric Valls Gramunt**.

## 1. Decisiones previas (del autor)

| Decisión | Opciones | Recomendación |
|---|---|---|
| **¿Dónde se descargan los instaladores?** | (a) Hacer **público** este repositorio. (b) Crear un repositorio público solo para las *releases* (p. ej. `OpoTAI-releases`) y publicar ahí los instaladores. (c) Mantenerlo todo privado (solo para ti y colaboradores). | (a) si quieres que cuente como proyecto abierto en LinkedIn/GitHub (la licencia ya es GPL-3.0); (b) si prefieres no publicar el código todavía. **Con el repositorio privado, las releases de GitHub solo las ven los colaboradores**: nadie más podría descargar la app. |
| **Firma de código** | Sin firma (gratis) o con certificado. | Para la v1.0.0, **sin firma comercial** y con instrucciones claras: Windows mostrará SmartScreen («Editor desconocido» → *Más información* → *Ejecutar de todas formas*); en macOS la app lleva **firma ad-hoc** (obligatoria en Apple Silicon para apps descargadas) y la primera vez hay que permitirla en *Ajustes del Sistema → Privacidad y seguridad → Abrir igualmente*. Si la app crece: Windows con *Azure Trusted Signing* o un certificado OV/EV; macOS con *Developer ID* (99 $/año) y notarización. |
| **Actualizaciones automáticas** | Ninguna (descarga manual) o `tauri-plugin-updater`. | Manual en la v1.0.0 (cada convocatoria nueva será una versión menor). El actualizador exige claves de firma propias y publicar `latest.json`: buen objetivo para la v1.1. |
| **Cuentas de donación** | PayPal.me, Ko-fi, GitHub Sponsors. | Comprueba que las tres páginas existen y están activas (GitHub Sponsors requiere darse de alta y aprobación) antes de anunciar la app. Los enlaces están en `app/src/content/support.ts` y en `.github/FUNDING.yml`. |

## 2. Congelar el contenido

- [ ] Explicaciones de todos los bancos (auditoría: `cd tools && uv run python qa/audit_contenido.py`).
- [ ] Teoría: 33/33 temas en el índice.
- [ ] Figuras revisadas y reconstruidas donde el escaneo es borroso.
- [ ] Preguntas `needs_review` revisadas (listado en el informe de la auditoría y en `docs/datos/examenes-oficiales.md`).
- [ ] `CHANGELOG.md`: cambiar «en desarrollo» por la fecha de publicación.

## 3. Versión candidata (rc)

1. Validación local completa (lo mismo que hace el CI):
   ```bash
   cd tools && uv run python -m opotai.validate && uv run python qa/audit_contenido.py \
     && uv run python qa/version.py check && uv run python qa/spdx_headers.py --check && uv run pytest -q
   cd ../app && pnpm typecheck && pnpm test && pnpm build
   cd .. && cargo fmt --all --check && cargo clippy --workspace --all-targets -- -D warnings && cargo test --workspace
   ```
2. **Ejecutables para probar sin publicar nada**: cambia `.github/compilar-instaladores` (anota el
   motivo) y empuja la rama. El workflow «Instaladores» compila **Windows x64** (`-setup.exe`,
   `.msi` y `.exe` portable), **Linux x64** (`.deb`, `.rpm`, `.AppImage`) y **macOS Apple Silicon**
   (`.dmg`, con firma ad-hoc) y los deja como artefactos privados en la pestaña *Actions*.
3. Etiqueta: `git tag -a v1.0.0-rc.N <commit> -m "…" && git push origin v1.0.0-rc.N`. El mismo
   workflow crea un **borrador de pre-release** con todos esos ficheros adjuntos.
4. Probar los instaladores en equipos reales: Windows 10 y 11, Ubuntu 22.04/24.04 y un Mac con
   Apple Silicon (macOS ≥ 13). En macOS, la primera vez: Ajustes del Sistema → Privacidad y
   seguridad → «Abrir igualmente». En Linux, el `.AppImage` necesita `libfuse2t64` en Ubuntu 24.04+.

## 4. Pruebas manuales en cada sistema (15 minutos)

- [ ] Instala, abre y crea un perfil con alias (y con imagen propia).
- [ ] Simulacro sorpresa en **Examen real**: el cronómetro corre y se entrega solo al acabar el tiempo.
- [ ] Un examen oficial en **Aprendizaje**: corrección y explicación al momento.
- [ ] Entrega un examen completo: nota por partes, probabilidad de plaza y **simulador de destinos** (mapa, zoom, vista plana).
- [ ] Supuesto con figuras: la reconstrucción y el original se ven y se amplían.
- [ ] Teoría: abre varios temas.
- [ ] Ajustes: tema claro/oscuro, sonido, «Privacidad y datos» (ruta de la base de datos), borrar perfil.
- [ ] «☕ Invítame a un café o dona»: los enlaces abren el navegador.
- [ ] Cierra la app a mitad de examen y vuelve a abrirla: se reanuda.
- [ ] Desinstala: los datos siguen en la carpeta de la app (ver `docs/PRIVACIDAD.md`) y se pueden borrar a mano.

## 5. Publicar

1. Etiqueta final `v1.0.0` sobre el commit probado; revisa el borrador de release que crea el
   workflow (notas, instaladores) y publícalo.
2. Si el repositorio es privado, publica los instaladores donde decidiste en el punto 1.
3. Anuncia: README con capturas y vídeo, publicación en LinkedIn (qué es, para quién, enlace de
   descarga, que es gratis y de código abierto, y el aviso de que es un proyecto no oficial).

## 6. Después del lanzamiento

- Nueva convocatoria: incorporar el examen con `tools/` (ver `docs/datos/examenes-oficiales.md`),
  explicaciones, propagación a promoción interna, auditoría y nueva versión menor.
- Erratas que comuniquen los usuarios: parches en `tools/opotai/fixes/` o en `data/anotaciones/` y
  versión de corrección (`1.0.x`).
