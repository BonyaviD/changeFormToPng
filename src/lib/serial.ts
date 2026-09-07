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
