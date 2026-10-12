// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
/** Selector del modo de corrección (al final, como el examen real, o inmediata, modo estudio). */
import { BookCheck, GraduationCap } from "lucide-react";
import type { FeedbackMode } from "@/api/types";
import { Field, Segmented } from "@/components/ui/controls";

interface FeedbackChooserProps {
  value: FeedbackMode;
  onChange: (v: FeedbackMode) => void;
  /** `exam`: simulacros y oficiales (por defecto «al final»); `practice`: tests de práctica. */
  context?: "exam" | "practice";
}

export function FeedbackChooser({ value, onChange, context = "exam" }: FeedbackChooserProps) {
  const exam = context === "exam";
  return (
    <Field
      label="Corrección"
      hint={
        value === "end"
          ? exam
            ? "Como el examen real: ves la nota y las explicaciones al entregar."
            : "Respondes todo el test y al terminar ves la nota y las explicaciones."
          : "Modo estudio: tras cada respuesta ves si aciertas y por qué. La respuesta queda bloqueada."
      }
    >
      <Segmented
        label="Corrección"
        fullWidth
        value={value}
        onChange={onChange}
        options={[
          { value: "end", label: exam ? "Al final (examen real)" : "Al final", icon: <BookCheck /> },
          { value: "immediate", label: exam ? "Inmediata (modo estudio)" : "Inmediata", icon: <GraduationCap /> },
        ]}
      />
    </Field>
  );
}
