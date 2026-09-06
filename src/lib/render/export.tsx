"use client";

import { createElement } from "react";

import type { ArtworkContext, CertificateTemplate } from "@/lib/templates/types";

import { captureBlob } from "./capture";
import { downloadBlob, safeFilename } from "./download";
import { withOffscreenRender } from "./offscreen";
import { blobToBytes, pngToPdf } from "./pdf";

export type ExportFormat = "png" | "pdf";

/** Rasterises one certificate and returns it as a PNG blob. */
export async function renderCertificatePng<TValues>(
  template: CertificateTemplate<TValues>,
  values: TValues,
  context: ArtworkContext = {},
): Promise<Blob> {
  return withOffscreenRender(
    createElement(template.Artwork, { values, context }),
    (node) => captureBlob(node, template.size),
  );
}

export async function renderCertificatePdf<TValues>(
  template: CertificateTemplate<TValues>,
  values: TValues,
  context: ArtworkContext = {},
): Promise<Blob> {
  const png = await renderCertificatePng(template, values, context);
  const pdfBytes = await pngToPdf(await blobToBytes(png));
  // `pdf-lib` hands back a view over a larger buffer; slice it so the Blob does
  // not carry the extra bytes.
  return new Blob([pdfBytes.slice()], { type: "application/pdf" });
}

export async function downloadCertificate<TValues>(
  template: CertificateTemplate<TValues>,
  values: TValues,
  context: ArtworkContext,
  format: ExportFormat,
): Promise<void> {
  const blob =
    format === "pdf"
      ? await renderCertificatePdf(template, values, context)
      : await renderCertificatePng(template, values, context);

  downloadBlob(blob, safeFilename(template.fileStem(values), format));
}
