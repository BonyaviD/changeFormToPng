"use client";

import {
  Controller,
  type Control,
  type FieldValues,
  type UseFormSetValue,
} from "react-hook-form";

import { ComboboxField } from "@/components/form/combobox-field";
import { JalaliDateField } from "@/components/form/jalali-date-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { digitsOnly, sanitizePersianInput } from "@/lib/persian";
import { fieldOptions } from "@/lib/settings/options";
import type { AppSettings } from "@/lib/settings/types";
import type { FieldDefinition } from "@/lib/templates/types";
import { cn } from "@/lib/utils";

/**
 * Renders one field of a template's schema.
 *
 * Every screen — the single-issue form, the bulk row editor — goes through
 * here, so a new field kind is added once and shows up everywhere.
 */
export function FieldControl<TValues extends FieldValues>({
  field,
  control,
  setValue,
  settings,
  error,
}: {
  field: FieldDefinition;
  control: Control<TValues>;
  /** Needed so a catalogue pick can fill its companion fields. */
  setValue: UseFormSetValue<TValues>;
  settings: AppSettings;
  error?: string;
}) {
  const controlId = `field-${field.name}`;
  const options = fieldOptions(field, settings);
  const describedBy = error
    ? `${controlId}-error`
    : field.hint
      ? `${controlId}-hint`
      : undefined;

  return (
    <div className={cn("space-y-2", field.span === 2 && "sm:col-span-2")}>
      {field.kind !== "switch" ? (
        <Label htmlFor={controlId} className="text-sm">
          {field.label}
        </Label>
      ) : null}

      <Controller
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        name={field.name as any}
        control={control}
        render={({ field: rhf }) => {
          switch (field.kind) {
            case "jalali-date":
              return (
                <JalaliDateField
                  id={controlId}
                  value={(rhf.value as string) ?? ""}
                  onChange={rhf.onChange}
                  onBlur={rhf.onBlur}
                  placeholder={field.placeholder}
                  invalid={Boolean(error)}
                />
              );

            case "radio":
              return (
                <RadioGroup
                  value={(rhf.value as string) ?? ""}
                  onValueChange={rhf.onChange}
                  className="flex flex-wrap gap-2"
                >
                  {options.map((option) => {
                    const optionId = `${controlId}-${option.value}`;
                    const checked = rhf.value === option.value;
                    return (
                      <Label
                        key={option.value}
                        htmlFor={optionId}
                        className={cn(
                          "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors",
                          checked
                            ? "border-primary bg-primary/8 text-primary"
                            : "hover:bg-muted",
                        )}
                      >
                        <RadioGroupItem id={optionId} value={option.value} />
                        {option.label}
                      </Label>
                    );
                  })}
                </RadioGroup>
              );

            case "combobox":
              return (
                <ComboboxField
                  id={controlId}
                  value={(rhf.value as string) ?? ""}
                  options={options}
                  onChange={rhf.onChange}
                  onSelectOption={(option) => {
                    // Choosing a catalogue entry also writes whatever it knows
                    // about its companions — a course brings its code with it.
                    for (const [target, filled] of Object.entries(option.fills ?? {})) {
                      setValue(
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        target as any,
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        filled as any,
                        { shouldValidate: true, shouldDirty: true },
                      );
                    }
                  }}
                  placeholder={field.placeholder}
                  invalid={Boolean(error)}
                />
              );

            case "select":
              return (
                <Select value={(rhf.value as string) ?? ""} onValueChange={rhf.onChange}>
                  <SelectTrigger id={controlId} className="w-full" aria-invalid={Boolean(error)}>
                    <SelectValue placeholder={field.placeholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {options.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              );

            case "switch":
              return (
                <Label
                  htmlFor={controlId}
                  className="hover:bg-muted/60 flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-3 text-sm transition-colors"
                >
                  <span>{field.label}</span>
                  <Switch
                    id={controlId}
                    checked={Boolean(rhf.value)}
                    onCheckedChange={rhf.onChange}
                  />
                </Label>
              );

            case "textarea":
              return (
                <Textarea
                  id={controlId}
                  value={(rhf.value as string) ?? ""}
                  onChange={(event) =>
                    rhf.onChange(sanitizePersianInput(event.target.value))
                  }
                  onBlur={rhf.onBlur}
                  placeholder={field.placeholder}
                  aria-invalid={Boolean(error)}
                  aria-describedby={describedBy}
                  rows={3}
                />
              );

            case "digits":
              return (
                <Input
                  id={controlId}
                  value={(rhf.value as string) ?? ""}
                  // Persian numerals are normalised on the way in so the stored
                  // value is always machine-readable.
                  onChange={(event) => rhf.onChange(digitsOnly(event.target.value))}
                  onBlur={rhf.onBlur}
                  placeholder={field.placeholder}
                  inputMode="numeric"
                  autoComplete="off"
                  aria-invalid={Boolean(error)}
                  aria-describedby={describedBy}
                  className="h-10 font-mono tracking-wider"
                />
              );

            default:
              return (
                <Input
                  id={controlId}
                  value={(rhf.value as string) ?? ""}
                  onChange={(event) =>
                    rhf.onChange(sanitizePersianInput(event.target.value))
                  }
                  onBlur={rhf.onBlur}
                  placeholder={field.placeholder}
                  autoComplete="off"
                  aria-invalid={Boolean(error)}
                  aria-describedby={describedBy}
                  className="h-10"
                />
              );
          }
        }}
      />

      {error ? (
        <p id={`${controlId}-error`} className="text-destructive text-xs">
          {error}
        </p>
      ) : field.hint ? (
        <p id={`${controlId}-hint`} className="text-muted-foreground text-xs">
          {field.hint}
        </p>
      ) : null}
    </div>
  );
}
