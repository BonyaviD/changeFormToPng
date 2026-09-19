export const SIGNATURE_SCALE_MIN = 0.5;
export const SIGNATURE_SCALE_MAX = 2.5;
export const SIGNATURE_SCALE_STEP = 0.1;
export const SIGNATURE_SCALE_DEFAULT = 1;

/** Keeps persisted or user-entered zoom values inside the printable range. */
export function normalizeSignatureScale(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return SIGNATURE_SCALE_DEFAULT;
  }

  const rounded = Math.round(value * 100) / 100;
  return Math.min(SIGNATURE_SCALE_MAX, Math.max(SIGNATURE_SCALE_MIN, rounded));
}
