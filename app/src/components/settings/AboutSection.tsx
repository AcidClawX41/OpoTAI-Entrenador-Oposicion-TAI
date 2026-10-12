// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
/**
 * «Acerca de»: versión (de `get_app_info`), commit de compilación, licencia
 * GPL-3.0-or-later con su texto íntegro (`get_license_text`), derechos de autor,
 * avisos de contenido y licencias de terceros (content/legal.ts).
 */
import { useEffect, useState } from "react";
import { BookText, Code2, ExternalLink, GitCommitHorizontal, Heart, Scale, ShieldCheck } from "lucide-react";
import { api } from "@/api/client";
import { errorMessage } from "@/api/errors";
import type { AppInfo } from "@/api/types";
import { COPYRIGHT_LINE, CONTENT_NOTICE, GPL_NOTICE, LICENSE_NAME, LICENSE_SPDX, LICENSE_URL, THIRD_PARTY } from "@/content/legal";
import { AUTHOR_PROFILE } from "@/content/support";
import { formatDate, formatInt } from "@/lib/format";
import { openExternal } from "@/lib/platform";
import { APP_VERSION } from "@/lib/version";
import { useUi } from "@/store/ui";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { Logo } from "@/components/ui/display";
import { Spinner } from "@/components/ui/misc";

export function LicenseDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!open || text !== null) return;
    let alive = true;
    api.getLicenseText().then(
      (t) => alive && setText(t),
      (e: unknown) => alive && setError(errorMessage(e)),
    );
    return () => {
      alive = false;
    };
  }, [open, text]);
  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="xl"
      icon={<Scale />}
      title={LICENSE_NAME}
      description={`${LICENSE_SPDX} · texto oficial en inglés`}
      footer={
        <>
          <Button variant="ghost" leftIcon={<ExternalLink className="size-4" />} onClick={() => void openExternal(LICENSE_URL)}>
            gnu.org
          </Button>
          <Button variant="primary" onClick={onClose}>
            Cerrar
          </Button>
        </>
      }
    >
      {error ? (
        <p className="text-sm text-danger-text">{error}</p>
      ) : text === null ? (
        <Spinner label="Cargando la licencia…" />
      ) : (
        <pre data-testid="license-text" className="max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-xl border border-border bg-surface-2 p-4 font-mono text-[12px] leading-5 text-fg-muted">
          {text}
        </pre>
      )}
    </Dialog>
  );
}

export function AboutSection({ appInfo }: { appInfo: AppInfo | null }) {
  const [licenseOpen, setLicenseOpen] = useState(false);
  const setSupportOpen = useUi((s) => s.setSupportOpen);
  const version = appInfo?.version ?? APP_VERSION;
  const copyright = appInfo?.copyright ?? COPYRIGHT_LINE;
  const license = appInfo?.license ?? LICENSE_SPDX;
  return (
    <div className="space-y-5">
      <Card className="relative overflow-hidden p-6">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 size-64 bg-accent/15 [mask-image:radial-gradient(closest-side,#000,transparent)]" />
        <div className="relative flex flex-wrap items-center justify-between gap-5">
          <div>
            <Logo size={44} />
            <p className="mt-4 max-w-lg text-sm leading-6 text-fg-muted">
              Entrenador de tests y simulacros para la oposición de Técnico Auxiliar de Informática (TAI) de la Administración General del Estado.
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <div>
              <dt className="text-xs text-fg-muted">Versión</dt>
              <dd className="mt-0.5 font-semibold tabular-nums text-fg" data-testid="about-version">
                v{version}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-fg-muted">Compilación</dt>
              <dd className="mt-0.5 inline-flex items-center gap-1.5 font-mono text-[13px] text-fg">
                <GitCommitHorizontal className="size-3.5 text-fg-subtle" aria-hidden />
                {appInfo?.git_commit ?? "desarrollo"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-fg-muted">Licencia</dt>
              <dd className="mt-0.5 font-semibold text-fg">{license}</dd>
            </div>
            <div>
              <dt className="text-xs text-fg-muted">Autor</dt>
              <dd className="mt-0.5 font-semibold text-fg">{appInfo?.author ?? "Eric Valls Gramunt"}</dd>
            </div>
          </dl>
        </div>
        <div className="relative mt-6 flex flex-wrap items-center gap-2 border-t border-border pt-5">
          <p className="mr-auto text-sm font-medium text-fg">{copyright}</p>
          <Button size="sm" leftIcon={<BookText className="size-3.5" />} onClick={() => setLicenseOpen(true)}>
            Ver la licencia
          </Button>
          {appInfo?.repository ? (
            <Button size="sm" variant="ghost" leftIcon={<Code2 className="size-3.5" />} onClick={() => void openExternal(appInfo.repository)}>
              Código fuente
            </Button>
          ) : null}
          <Button size="sm" variant="ghost" leftIcon={<ExternalLink className="size-3.5" />} onClick={() => void openExternal(AUTHOR_PROFILE.linkedin.url)}>
            LinkedIn del autor
          </Button>
          <Button size="sm" variant="soft" leftIcon={<Heart className="size-3.5" />} onClick={() => setSupportOpen(true)}>
            Apoyar el proyecto
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="flex items-center gap-2 text-[15px] font-semibold text-fg">
          <ShieldCheck className="size-4 text-accent-text" aria-hidden /> Software libre
        </h3>
        <div className="mt-3 space-y-2.5 text-[13.5px] leading-6 text-fg-muted">
          {GPL_NOTICE.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
        <h3 className="mt-6 text-[15px] font-semibold text-fg">Contenidos</h3>
        <div className="mt-3 space-y-2.5 text-[13.5px] leading-6 text-fg-muted">
          {CONTENT_NOTICE.map((p) => (
            <p key={p}>{p}</p>
          ))}
          {appInfo ? (
            <p>
              Datos de {formatInt(appInfo.official_exams)} exámenes oficiales y {formatInt(appInfo.questions)} preguntas
              {appInfo.data_updated ? ` · actualizados el ${formatDate(appInfo.data_updated)}` : ""}.
            </p>
          ) : null}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-[15px] font-semibold text-fg">Componentes de terceros</h3>
        <ul className="mt-3 divide-y divide-border">
          {THIRD_PARTY.map((t) => (
            <li key={t.name} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
              <button type="button" onClick={() => void openExternal(t.url)} className="text-sm font-medium text-fg hover:text-accent-text hover:underline">
                {t.name}
              </button>
              <span className="text-xs text-fg-subtle">{t.use}</span>
              <Badge tone="neutral" className="ml-auto">
                {t.license}
              </Badge>
            </li>
          ))}
        </ul>
      </Card>
      <LicenseDialog open={licenseOpen} onClose={() => setLicenseOpen(false)} />
    </div>
  );
}
