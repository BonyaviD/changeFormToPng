import { buildArtworkContext } from "@/lib/settings/artwork-context";
import type { AppSettings } from "@/lib/settings/types";
import { normalizeWatermarkSettings } from "@/lib/settings/watermark";
import type { ArtworkContext } from "@/lib/templates/types";

import { assetId } from "./assets";
import type { ArtworkSnapshot, CertificateRecord } from "./types";

/** Hashing a signature is the only slow step, and a bulk run repeats it per row. */
const idCache = new Map<string, Promise<string>>();

function cachedAssetId(dataUrl: string) {
  let id = idCache.get(dataUrl);
  if (!id) {
    // A settings session only ever produces a handful of images.
    if (idCache.size > 32) idCache.clear();
    id = assetId(dataUrl);
    idCache.set(dataUrl, id);
  }
  return id;
}

/**
 * Records what a certificate is drawn with, apart from its values. Only the
 * signatories the certificate actually names are kept, and their images are
 * returned separately so the repository can store each one once.
 */
export async function snapshotArtwork(
  context: ArtworkContext,
  values: Record<string, unknown>,
): Promise<{ artwork: ArtworkSnapshot; assets: Record<string, string> }> {
  const named = new Set(
    Object.values(values)
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim())
      .filter(Boolean),
  );

  const signatures: Record<string, string> = {};
  const signatureScales: Record<string, number> = {};
  const assets: Record<string, string> = {};

  for (const [name, image] of Object.entries(context.signatureImages ?? {})) {
    if (!named.has(name)) continue;
    const id = await cachedAssetId(image);
    signatures[name] = id;
    assets[id] = image;
    const scale = context.signatureScales?.[name];
    if (scale !== undefined) signatureScales[name] = scale;
  }

  return {
    artwork: {
      signatures,
      signatureScales,
      watermark: normalizeWatermarkSettings(context.watermark),
    },
    assets,
  };
}

/** Every image id the records refer to. */
export function referencedAssetIds(records: CertificateRecord[]): string[] {
  return [...new Set(records.flatMap((record) => Object.values(record.artwork?.signatures ?? {})))];
}

/**
 * The render context for re-issuing or previewing an archived certificate.
 * A snapshot reproduces the original; a record from before snapshots, or an
 * image that has gone missing, falls back to what the settings hold today.
 */
export function restoreArtworkContext(
  record: CertificateRecord,
  settings: AppSettings,
  assets: Record<string, string>,
): ArtworkContext {
  const current = buildArtworkContext(settings, record.serial);
  const { artwork } = record;
  if (!artwork) return current;

  const signatureImages: Record<string, string> = {};
  const signatureScales: Record<string, number> = { ...artwork.signatureScales };
  for (const [name, id] of Object.entries(artwork.signatures)) {
    const image = assets[id] ?? current.signatureImages?.[name];
    if (image) signatureImages[name] = image;
    if (!assets[id] && current.signatureScales?.[name] !== undefined) {
      signatureScales[name] = current.signatureScales[name];
    }
  }

  return {
    serial: record.serial,
    signatureImages,
    signatureScales,
    watermark: artwork.watermark,
  };
}
