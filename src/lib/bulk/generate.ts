import JSZip from "jszip";

import { safeFilename } from "@/lib/render/download";
import { renderCertificatePdf, renderCertificatePng } from "@/lib/render/export";
import { generateSerial } from "@/lib/serial";
import { buildArtworkContext } from "@/lib/settings/artwork-context";
import { readSettings } from "@/lib/settings/store";
import type { CertificateRecord } from "@/lib/storage";
import type { CertificateTemplate } from "@/lib/templates/types";

import type { MappedRow } from "./mapping";

export interface BulkOptions {
  format: "png" | "pdf";
}

export interface BulkProgress {
  completed: number;
  total: number;
  currentLabel: string;
}

export interface BulkResult {
  zip: Blob;
  records: CertificateRecord[];
}

/**
 * Renders every valid row and packs the results into a single ZIP.
 *
 * Rendering is deliberately sequential: each certificate mounts an off-screen
 * React tree and rasterises a 2300x1640 canvas, and running those in parallel
 * starves the main thread without finishing any sooner.
 */
export async function generateBulkArchive(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  template: CertificateTemplate<any>,
  rows: MappedRow[],
  options: BulkOptions,
  onProgress?: (progress: BulkProgress) => void,
): Promise<BulkResult> {
  const valid = rows.filter((row) => row.valid);
  if (valid.length === 0) {
    throw new Error("هیچ ردیف معتبری برای صدور وجود ندارد.");
  }

  const zip = new JSZip();
  const records: CertificateRecord[] = [];
  const usedNames = new Set<string>();
  // Read once: the catalogue cannot change midway through a run.
  const settings = readSettings();

  for (const [index, row] of valid.entries()) {
    const serial = generateSerial();
    const context = buildArtworkContext(settings, serial);

    const blob =
      options.format === "pdf"
        ? await renderCertificatePdf(template, row.values, context)
        : await renderCertificatePng(template, row.values, context);

    zip.file(uniqueName(usedNames, template.fileStem(row.values), options.format), blob);

    records.push({
      id: crypto.randomUUID(),
      serial,
      templateId: template.id,
      templateVersion: template.version,
      values: row.values,
      summary: template.summarize(row.values),
      issuedAt: new Date().toISOString(),
      source: "bulk",
    });

    onProgress?.({
      completed: index + 1,
      total: valid.length,
      currentLabel: template.summarize(row.values).primary,
    });
  }

  return {
    zip: await zip.generateAsync({ type: "blob" }),
    records,
  };
}

/** Two people with the same name must not overwrite each other in the ZIP. */
function uniqueName(used: Set<string>, stem: string, extension: string): string {
  let candidate = safeFilename(stem, extension);
  let counter = 2;
  while (used.has(candidate)) {
    candidate = safeFilename(`${stem} (${counter})`, extension);
    counter += 1;
  }
  used.add(candidate);
  return candidate;
}
