import type { ComponentType } from "react";
import type { ZodType, ZodTypeDef } from "zod";

import type { WatermarkSettings } from "@/lib/settings/types";

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
  | "combobox"
  | "switch";

export interface FieldOption {
  value: string;
  label: string;
  /**
   * Other fields to write when this option is chosen — how picking a course
   * from the catalogue also fills in its certificate code, and picking a
   * signatory fills in their title.
   */
  fills?: Record<string, string>;
}

/**
 * Where a field's options come from when they are not fixed by the template.
 * These name catalogues owned by the settings page, so the operator can extend
 * a list without a code change.
 */
export type FieldOptionSource = "courses" | "signatories" | "unitCaptions";

export interface FieldDefinition {
  /** Must match a key of the template's schema. */
  name: string;
  label: string;
  kind: FieldKind;
  placeholder?: string;
  /** Helper text rendered under the control. */
  hint?: string;
  options?: readonly FieldOption[];
  /** Resolve the option list from the settings catalogue at render time. */
  optionsSource?: FieldOptionSource;
  /**
   * Maps an attribute of the chosen catalogue entry onto another field of this
   * form — `{ code: "courseCode" }` is what makes picking a course fill in its
   * certificate number. Used together with `optionsSource`.
   */
  optionsFillMap?: Readonly<Record<string, string>>;
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
  /**
   * Tracking number assigned when the certificate is issued. Passed to every
   * artwork so a design can stamp it; this template does not.
   */
  serial?: string;
  /**
   * Scanned signatures from the settings catalogue, keyed by signatory name.
   * A certificate records the printed *name*, not the image bytes, so a
   * re-issue picks up whatever signature is on file for that person today.
   */
  signatureImages?: Readonly<Record<string, string>>;
  /** Per-signatory visual zoom, keyed by the same printed name. */
  signatureScales?: Readonly<Record<string, number>>;
  /** Optional organisation watermark shared by previews and every export path. */
  watermark?: Readonly<WatermarkSettings>;
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
