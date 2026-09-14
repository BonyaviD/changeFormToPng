/**
 * Signature image processing.
 *
 * A signature is stored twice (see `SignatoryEntry`):
 *
 *  - **source** — the upload, cropped to its ink and downscaled, never rotated.
 *    It is the master every rotation is recomputed from, so turning a signature
 *    back and forth never degrades it the way re-rotating the last result would.
 *  - **image** — the source turned to the operator's chosen angle and cropped to
 *    its ink again. The certificate draws exactly this, with no rotation of its
 *    own, so what the settings page shows is what gets printed.
 *
 * Every result is cropped to the ink because a scan is mostly empty sheet: the
 * artwork positions the mark by its box, and an uncropped image would place the
 * padding rather than the strokes. Every result is also bounded in size, because
 * a full-resolution scan base64-encodes to hundreds of kilobytes and the
 * origin's `localStorage` quota is only about 5MB.
 */

/** Longest edge of any stored image, in pixels. */
const MAX_EDGE = 900;

/** Alpha at or below this counts as empty sheet rather than ink. */
const INK_ALPHA_THRESHOLD = 24;

const ACCEPTED = ["image/png", "image/jpeg", "image/webp"];

/** Reads an upload into a cropped, downscaled, unrotated source image. */
export async function readSignatureImage(file: File): Promise<string> {
  if (!ACCEPTED.includes(file.type)) {
    throw new Error("فقط تصویر PNG، JPEG یا WebP پذیرفته می‌شود.");
  }

  const bitmap = await createImageBitmap(file);
  try {
    const canvas = createCanvas(bitmap.width, bitmap.height);
    context2d(canvas).drawImage(bitmap, 0, 0);
    return cropAndEncode(canvas);
  } finally {
    bitmap.close();
  }
}

/**
 * Turns a source image clockwise by `degrees` and crops the result to its ink.
 * Always pass the untouched source, never a previously rotated image.
 */
export async function rotateSignature(source: string, degrees: number): Promise<string> {
  const angle = normalizeAngle(degrees);
  if (angle === 0) return source;

  // Decoded through an <img> rather than fetch(): data URLs are already allowed
  // as image sources here, which a Content-Security-Policy may not grant fetch.
  const image = new Image();
  image.src = source;
  await image.decode();

  const radians = (angle * Math.PI) / 180;
  const sin = Math.abs(Math.sin(radians));
  const cos = Math.abs(Math.cos(radians));
  const { naturalWidth: width, naturalHeight: height } = image;

  // Large enough to hold the whole turned image without clipping a corner.
  const canvas = createCanvas(
    Math.ceil(width * cos + height * sin),
    Math.ceil(width * sin + height * cos),
  );
  const context = context2d(canvas);
  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate(radians);
  context.drawImage(image, -width / 2, -height / 2);

  return cropAndEncode(canvas);
}

/** Keeps an angle in (-180, 180] so the stored value stays readable. */
export function normalizeAngle(degrees: number): number {
  const wrapped = ((degrees % 360) + 360) % 360;
  return wrapped > 180 ? wrapped - 360 : wrapped;
}

function createCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, width);
  canvas.height = Math.max(1, height);
  return canvas;
}

function context2d(canvas: HTMLCanvasElement) {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("پردازش تصویر در این مرورگر ممکن نیست.");
  return context;
}

/** Crops a canvas to its ink, bounds its size, and encodes it as PNG. */
function cropAndEncode(source: HTMLCanvasElement): string {
  const bounds = inkBounds(source);
  const cropWidth = bounds.maxX - bounds.minX + 1;
  const cropHeight = bounds.maxY - bounds.minY + 1;

  const scale = Math.min(1, MAX_EDGE / Math.max(cropWidth, cropHeight));
  const output = createCanvas(
    Math.round(cropWidth * scale),
    Math.round(cropHeight * scale),
  );

  context2d(output).drawImage(
    source,
    bounds.minX,
    bounds.minY,
    cropWidth,
    cropHeight,
    0,
    0,
    output.width,
    output.height,
  );

  // PNG, not JPEG: a JPEG would fill the transparent background with white.
  return output.toDataURL("image/png");
}

/**
 * Bounding box of the non-transparent pixels. A fully opaque upload (a JPEG,
 * say) has no transparency to trim, so it falls back to the whole image.
 */
function inkBounds(canvas: HTMLCanvasElement) {
  const { width, height } = canvas;
  const { data } = context2d(canvas).getImageData(0, 0, width, height);

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
