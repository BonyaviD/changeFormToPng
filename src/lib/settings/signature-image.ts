/**
 * Prepares an uploaded signature for storage.
 *
 * Two things happen here, and the certificate depends on both:
 *
 *  1. **Crop to the ink.** A signature scan is mostly empty sheet. The artwork
 *     positions the mark by its box, so an uncropped scan places the padding
 *     rather than the strokes — which is how the bundled signature originally
 *     ended up printed across the last line of the body text. Cropping to the
 *     opaque bounding box makes the image *be* the signature.
 *  2. **Downscale.** The bundled scan was 3464x3464, about 400KB once
 *     base64-encoded. A few of those would exhaust the origin's ~5MB
 *     `localStorage` quota, so the longest edge is bounded.
 */

/** Longest edge of the stored image, in pixels. */
const MAX_EDGE = 900;

/** Alpha at or below this counts as empty sheet rather than ink. */
const INK_ALPHA_THRESHOLD = 24;

const ACCEPTED = ["image/png", "image/jpeg", "image/webp"];

export async function readSignatureImage(file: File): Promise<string> {
  if (!ACCEPTED.includes(file.type)) {
    throw new Error("فقط تصویر PNG، JPEG یا WebP پذیرفته می‌شود.");
  }

  const bitmap = await createImageBitmap(file);
  try {
    const source = drawToCanvas(bitmap, bitmap.width, bitmap.height);
    const bounds = inkBounds(source);

    const cropWidth = bounds.maxX - bounds.minX + 1;
    const cropHeight = bounds.maxY - bounds.minY + 1;

    const scale = Math.min(1, MAX_EDGE / Math.max(cropWidth, cropHeight));
    const width = Math.max(1, Math.round(cropWidth * scale));
    const height = Math.max(1, Math.round(cropHeight * scale));

    const output = document.createElement("canvas");
    output.width = width;
    output.height = height;

    const context = output.getContext("2d");
    if (!context) throw new Error("پردازش تصویر در این مرورگر ممکن نیست.");
    context.drawImage(
      source,
      bounds.minX,
      bounds.minY,
      cropWidth,
      cropHeight,
      0,
      0,
      width,
      height,
    );

    // PNG, not JPEG: a JPEG would fill the transparent background with white.
    return output.toDataURL("image/png");
  } finally {
    bitmap.close();
  }
}

function drawToCanvas(bitmap: ImageBitmap, width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("پردازش تصویر در این مرورگر ممکن نیست.");
  context.drawImage(bitmap, 0, 0);
  return canvas;
}

/**
 * Bounding box of the non-transparent pixels. A fully opaque upload (a JPEG,
 * say) has no transparency to trim, so it falls back to the whole image.
 */
function inkBounds(canvas: HTMLCanvasElement) {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("پردازش تصویر در این مرورگر ممکن نیست.");

  const { width, height } = canvas;
  const { data } = context.getImageData(0, 0, width, height);

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] <= INK_ALPHA_THRESHOLD) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < 0) return { minX: 0, minY: 0, maxX: width - 1, maxY: height - 1 };
  return { minX, minY, maxX, maxY };
}
