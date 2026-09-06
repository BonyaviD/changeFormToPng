import { coerceJalaliInput } from "@/lib/jalali";
import { digitsOnly, sanitizePersianInput, toLatinDigits } from "@/lib/persian";
import type { CertificateTemplate, FieldDefinition } from "@/lib/templates/types";
import { templateFields } from "@/lib/templates/types";

import type { SheetTable } from "./parse";

export interface MappedRow {
  /** 1-based row number as it appears in the spreadsheet, for error messages. */
  line: number;
  values: Record<string, unknown>;
  errors: Record<string, string>;
  valid: boolean;
}

export interface MappingResult {
  rows: MappedRow[];
  /** Header text of columns that matched no field — surfaced as a warning. */
  unmatchedHeaders: string[];
  /** Fields the sheet has no column for. */
  missingFields: FieldDefinition[];
}

function normalizeHeader(value: string): string {
  return sanitizePersianInput(value).replace(/[\s_‌]+/g, " ").trim().toLowerCase();
}

/** Every spelling of a column that should land on a given field. */
function aliasesFor(field: FieldDefinition): string[] {
  return [field.name, field.label, ...(field.importAliases ?? [])].map(normalizeHeader);
}

/**
 * Coerces one spreadsheet cell into the shape the template's schema expects.
 * Option fields accept either the stored value or the Persian label, because
 * that is what people actually type into a spreadsheet.
 */
function coerceCell(field: FieldDefinition, raw: string): unknown {
  const value = sanitizePersianInput(raw).trim();

  switch (field.kind) {
    case "jalali-date":
      return coerceJalaliInput(value) ?? value;

    case "digits":
      return digitsOnly(value);

    case "radio":
    case "select": {
      const options = field.options ?? [];
      const match =
        options.find((option) => option.value.toLowerCase() === value.toLowerCase()) ??
        options.find((option) => normalizeHeader(option.label) === normalizeHeader(value));
      return match?.value ?? value;
    }

    case "switch": {
      const truthy = ["1", "true", "yes", "بله", "دارد", "آری"];
      return truthy.includes(toLatinDigits(value).toLowerCase());
    }

    default:
      return value;
  }
}

export function mapSheetToRows(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  template: CertificateTemplate<any>,
  table: SheetTable,
): MappingResult {
  const fields = templateFields(template).filter((field) => !field.excludeFromImport);

  const columnForField = new Map<string, number>();
  const matchedColumns = new Set<number>();

  for (const field of fields) {
    const aliases = aliasesFor(field);
    const index = table.headers.findIndex((header) =>
      aliases.includes(normalizeHeader(header)),
    );
    if (index >= 0) {
      columnForField.set(field.name, index);
      matchedColumns.add(index);
    }
  }

  const rows: MappedRow[] = table.rows.map((cells, rowIndex) => {
    const raw: Record<string, unknown> = { ...(template.defaults as object) };

    for (const field of fields) {
      const column = columnForField.get(field.name);
      if (column === undefined) continue;
      raw[field.name] = coerceCell(field, cells[column] ?? "");
    }

    const parsed = template.schema.safeParse(raw);
    const errors: Record<string, string> = {};

    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        errors[key] ??= issue.message;
      }
    }

    return {
      line: rowIndex + 2, // +1 for the header row, +1 for 1-based numbering
      values: parsed.success ? (parsed.data as Record<string, unknown>) : raw,
      errors,
      valid: parsed.success,
    };
  });

  return {
    rows,
    unmatchedHeaders: table.headers.filter(
      (header, index) => header !== "" && !matchedColumns.has(index),
    ),
    missingFields: fields.filter((field) => !columnForField.has(field.name)),
  };
}

/** A ready-to-fill CSV with one column per importable field. */
export function buildImportTemplateCsv(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  template: CertificateTemplate<any>,
): string {
  const fields = templateFields(template).filter((field) => !field.excludeFromImport);
  const headers = fields.map((field) => field.label);
  const example = fields.map((field) => {
    const sample = (template.sample as Record<string, unknown>)[field.name];
    if (field.kind === "radio" || field.kind === "select") {
      return field.options?.find((option) => option.value === sample)?.label ?? "";
    }
    return sample === undefined || sample === null ? "" : String(sample);
  });

  const escape = (cell: string) =>
    /[",\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell;

  // The BOM makes Excel open the file as UTF-8 instead of mangling Persian.
  return `﻿${[headers, example].map((row) => row.map(escape).join(",")).join("\n")}\n`;
}
