"use client";

import type { Control, FieldValues, UseFormWatch } from "react-hook-form";

import { FieldControl } from "@/components/form/field-control";
import type { CertificateTemplate } from "@/lib/templates/types";

/**
 * Builds the entire data-entry form from a template's field groups.
 * No template-specific markup lives here — that is the point.
 */
export function TemplateForm<TValues extends FieldValues>({
  template,
  control,
  watch,
  errors,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  template: CertificateTemplate<any>;
  control: Control<TValues>;
  watch: UseFormWatch<TValues>;
  errors: Record<string, { message?: string } | undefined>;
}) {
  const values = watch() as Record<string, unknown>;

  return (
    <div className="space-y-8">
      {template.groups.map((group) => {
        const visibleFields = group.fields.filter(
          (field) => !field.visibleWhen || field.visibleWhen(values),
        );
        if (visibleFields.length === 0) return null;

        return (
          <section key={group.id} className="space-y-4">
            <header className="space-y-1">
              <h3 className="text-sm font-semibold">{group.title}</h3>
              {group.description ? (
                <p className="text-muted-foreground text-xs">{group.description}</p>
              ) : null}
            </header>

            <div className="grid gap-4 sm:grid-cols-2">
              {visibleFields.map((field) => (
                <FieldControl
                  key={field.name}
                  field={field}
                  control={control}
                  error={errors[field.name]?.message}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
