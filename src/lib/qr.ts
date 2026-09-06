import QRCode from "qrcode";

/**
 * Verification QR codes.
 *
 * The QR encodes a link back to this app's `/verify` page carrying the
 * certificate serial. Because the app is client-only, that page resolves the
 * serial against the browser's own archive — so it verifies certificates issued
 * on this machine. Pointing `NEXT_PUBLIC_VERIFY_BASE_URL` at a hosted instance
 * (or swapping the storage adapter for an API) makes it work everywhere without
 * touching the templates.
 */

export function generateSerial(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${timestamp}-${random}`;
}

export function verificationUrl(serial: string): string {
  const configured = process.env.NEXT_PUBLIC_VERIFY_BASE_URL;
  const origin =
    configured || (typeof window !== "undefined" ? window.location.origin : "");
  return `${origin}/verify?serial=${encodeURIComponent(serial)}`;
}

export async function generateQrDataUrl(serial: string): Promise<string> {
  return QRCode.toDataURL(verificationUrl(serial), {
    errorCorrectionLevel: "M",
    margin: 0,
    width: 256,
    color: { dark: "#000000ff", light: "#ffffffff" },
  });
}
