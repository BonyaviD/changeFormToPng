import type { ArtworkContext } from "@/lib/templates/types";

import type { AppSettings } from "./types";

/**
 * Builds the render context every screen hands to an artwork.
 *
 * Keeping this in one place means the preview, the single export, the bulk run
 * and a re-issue from the archive all resolve signatures the same way.
 */
export function buildArtworkContext(
  settings: AppSettings,
  serial?: string,
): ArtworkContext {
  const signatureImages: Record<string, string> = {};
  for (const signatory of settings.signatories) {
    if (signatory.signatureImage) {
      signatureImages[signatory.name.trim()] = signatory.signatureImage;
    }
  }
  return { serial, signatureImages };
}
