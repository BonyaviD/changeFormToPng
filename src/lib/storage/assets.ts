/**
 * Images referenced by archived certificates, stored once by content.
 *
 * The id is the SHA-256 of the data URL, so the same signature issued on a
 * thousand certificates is one stored image, and a server can check that an
 * upload is what its id claims to be.
 */

const DATA_URL = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/;
const ASSET_ID = /^[0-9a-f]{64}$/;

/** A signature is at most 900px on its longest edge; this leaves ample room. */
export const MAX_ASSET_LENGTH = 2 * 1024 * 1024;

export async function assetId(dataUrl: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(dataUrl));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function isAssetId(value: unknown): value is string {
  return typeof value === "string" && ASSET_ID.test(value);
}

export function isImageDataUrl(value: unknown): value is string {
  return typeof value === "string" && value.length <= MAX_ASSET_LENGTH && DATA_URL.test(value);
}
