"use client";

import type { Control, FieldValues, UseFormSetValue } from "react-hook-form";

import { FieldControl } from "@/components/form/field-control";
import { useSettings } from "@/hooks/use-settings";
import type { CertificateTemplate } from "@/lib/templates/types";

/**
 * Builds the entire data-entry form from a template's field groups.
 * No template-specific markup lives here — that is the point.
 */
export function TemplateForm<TValues extends FieldValues>({
  template,
  control,
  setValue,
  values,
  errors,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  template: CertificateTemplate<any>;
  control: Control<TValues>;
  setValue: UseFormSetValue<TValues>;
  /** Current form values, used to evaluate each field's `visibleWhen`. */
  values: Record<string, unknown>;
  errors: Record<string, { message?: string } | undefined>;
}) {
  // Option lists for course, signatory and header-caption fields come from the
  // settings catalogue rather than from the template.
  const { settings } = useSettings();

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
                  setValue={setValue}
                  settings={settings}
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
