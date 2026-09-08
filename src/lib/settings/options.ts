import type { FieldDefinition, FieldOption } from "@/lib/templates/types";

import type { AppSettings } from "./types";

/**
 * Turns a field's `optionsSource` into a concrete option list.
 *
 * Each catalogue entry is flattened to a record of attributes, so the field's
 * `optionsFillMap` can say which attribute lands in which other form field —
 * that indirection is what lets one signatory catalogue serve both the primary
 * and the secondary signatory fields.
 */
export function resolveFieldOptions(
  field: FieldDefinition,
  settings: AppSettings,
): FieldOption[] {
  const entries = catalogueEntries(field, settings);
  const fillMap = field.optionsFillMap;

  return entries.map(({ value, attributes }) => ({
    value,
    label: value,
    fills: fillMap
      ? Object.fromEntries(
          Object.entries(fillMap).map(([attribute, target]) => [
            target,
            attributes[attribute] ?? "",
          ]),
        )
      : undefined,
  }));
}

function catalogueEntries(
  field: FieldDefinition,
  settings: AppSettings,
): { value: string; attributes: Record<string, string> }[] {
  switch (field.optionsSource) {
    case "courses":
      return settings.courses.map((course) => ({
        value: course.title,
        attributes: { title: course.title, code: course.code },
      }));

    case "signatories":
      return settings.signatories.map((signatory) => ({
        value: signatory.name,
        attributes: { name: signatory.name, title: signatory.title },
      }));

    case "unitCaptions":
      return settings.unitCaptions.map((caption) => ({
        value: caption,
        attributes: { caption },
      }));

    default:
      return [];
  }
}

/** The options a field should offer, from settings or from the template. */
export function fieldOptions(
  field: FieldDefinition,
  settings: AppSettings,
): readonly FieldOption[] {
  if (field.optionsSource) return resolveFieldOptions(field, settings);
  return field.options ?? [];
}
