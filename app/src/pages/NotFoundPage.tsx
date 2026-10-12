// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
import { Compass, House } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/display";

export default function NotFoundPage() {
  return (
    <Card className="mx-auto mt-10 max-w-xl">
      <EmptyState
        icon={<Compass />}
        title="Esta página no existe"
        description="Puede que el enlace esté desactualizado. Vuelve al inicio para seguir entrenando."
        action={
          <ButtonLink to="/inicio" variant="primary" leftIcon={<House className="size-4" />}>
            Ir al inicio
          </ButtonLink>
        }
      />
    </Card>
  );
}
