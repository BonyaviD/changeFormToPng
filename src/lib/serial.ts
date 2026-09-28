/**
 * Tracking numbers.
 *
 * Every issued certificate gets one so the archive can identify it, re-issue it
 * and look it up. It is not printed on the document itself — it is an internal
 * reference, quoted from the archive.
 */
export function generateSerial(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${timestamp}-${random}`;
}

/** The certificate a form session last issued, and exactly what it said. */
export interface IssuedCertificate {
  serial: string;
  fingerprint: string;
}

/**
 * A key-order-independent snapshot of a certificate's content. Two exports with
 * the same fingerprint are the same certificate.
 */
export function certificateFingerprint(templateId: string, values: unknown): string {
  return stableStringify([templateId, values]);
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`);
    return `{${entries.join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

/**
 * Picks the tracking number for an export or save. Re-exporting unchanged
 * content (PNG then PDF, or saving after downloading) keeps the serial, so it
 * updates one archive row. Any edit makes it a different certificate with a
 * new serial — reusing the old one overwrote the previous recipient's record.
 */
export function claimSerial(
  issued: IssuedCertificate | null,
  fingerprint: string,
  mint: () => string = generateSerial,
): IssuedCertificate {
  if (issued && issued.fingerprint === fingerprint) return issued;
  return { serial: mint(), fingerprint };
}
