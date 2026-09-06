import { PDFDocument } from "pdf-lib";

/**
 * PDF export.
 *
 * The certificate is embedded as the high-resolution bitmap produced by the
 * capture step rather than re-typeset with a PDF font. Persian shaping —
 * Nastaliq ligatures in particular — is something browsers do well and PDF text
 * layers do badly, so keeping the pixels is what preserves the design.
 */

/** A4 landscape, in PDF points. */
const A4_LANDSCAPE = { width: 841.89, height: 595.28 } as const;

export async function pngToPdf(pngBytes: Uint8Array): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const image = await pdf.embedPng(pngBytes);

  const page = pdf.addPage([A4_LANDSCAPE.width, A4_LANDSCAPE.height]);

  // Fit the certificate inside the page while preserving its aspect ratio.
  const scale = Math.min(
    A4_LANDSCAPE.width / image.width,
    A4_LANDSCAPE.height / image.height,
  );
  const width = image.width * scale;
  const height = image.height * scale;

  page.drawImage(image, {
    x: (A4_LANDSCAPE.width - width) / 2,
    y: (A4_LANDSCAPE.height - height) / 2,
    width,
    height,
  });

  return pdf.save();
}

export async function blobToBytes(blob: Blob): Promise<Uint8Array> {
  return new Uint8Array(await blob.arrayBuffer());
}
