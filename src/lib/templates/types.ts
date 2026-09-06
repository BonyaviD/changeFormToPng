import type { ComponentType } from "react";
import type { ZodType, ZodTypeDef } from "zod";

/**
 * The certificate template contract.
 *
 * Adding a new certificate design means adding one folder under
 * `src/lib/templates/<id>/` that default-exports a `CertificateTemplate` and
 * registering it in `registry.ts`. Nothing else in the app changes: the form,
 * the live preview, the PNG/PDF pipeline, the bulk importer and the history
 * list are all driven by this contract.
 */

export type FieldKind =
  | "text"
  | "textarea"
  | "digits"
  | "jalali-date"
  | "radio"
  | "select"
  | "switch";

export interface FieldOption {
  value: string;
  label: string;
}

export interface FieldDefinition {
  /** Must match a key of the template's schema. */
  name: string;
  label: string;
  kind: FieldKind;
  placeholder?: string;
  /** Helper text rendered under the control. */
  hint?: string;
  options?: readonly FieldOption[];
  /** Columns the control spans in the two-column form grid. */
  span?: 1 | 2;
  /** Hide the control unless the predicate holds (e.g. the second signatory). */
  visibleWhen?: (values: Record<string, unknown>) => boolean;
  /**
   * Spreadsheet headers that map onto this field during a bulk import.
   * The field label and name are always accepted in addition to these.
   */
  importAliases?: readonly string[];
  /** Excluded from bulk import — e.g. per-run switches. */
  excludeFromImport?: boolean;
}

export interface FieldGroup {
  id: string;
  title: string;
  description?: string;
  fields: readonly FieldDefinition[];
}

/** The fixed design canvas the artwork is drawn on, in CSS pixels. */
export interface CanvasSize {
  width: number;
  height: number;
}

export interface ArtworkContext {
  /** Data URL of the verification QR code, when the template asks for one. */
  qrDataUrl?: string;
  /** Stable serial assigned when the certificate is issued. */
  serial?: string;
}

export interface RecordSummary {
  /** Headline for a history row — usually the recipient. */
  primary: string;
  /** Supporting line — usually the course. */
  secondary: string;
}

export interface CertificateTemplate<TValues = Record<string, unknown>> {
  id: string;
  name: string;
  description: string;
  /** Bump when the artwork changes in a way that alters existing output. */
  version: number;
  size: CanvasSize;
  /** Static preview thumbnail shown in the template picker. */
  thumbnail: string;
  /**
   * Input is left open because schemas legitimately transform on the way in
   * (Persian numerals normalised, optional fields defaulted), so what the form
   * holds is not always what the artwork receives.
   */
  schema: ZodType<TValues, ZodTypeDef, unknown>;
  groups: readonly FieldGroup[];
  defaults: TValues;
  /** Realistic values used by the "نمونه" button and by the picker preview. */
  sample: TValues;
  /** Whether the artwork renders a verification QR code. */
  supportsQr: boolean;
  summarize: (values: TValues) => RecordSummary;
  /** Filename stem for downloads, without extension. */
  fileStem: (values: TValues) => string;
  Artwork: ComponentType<{ values: TValues; context: ArtworkContext }>;
}

/** Flattens a template's groups into the field list. */
export function templateFields<TValues>(
  template: CertificateTemplate<TValues>,
): FieldDefinition[] {
  return template.groups.flatMap((group) => [...group.fields]);
}
