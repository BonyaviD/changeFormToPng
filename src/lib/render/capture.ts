import { getFontEmbedCSS, toBlob, toPng } from "html-to-image";

import type { CanvasSize } from "@/lib/templates/types";

/**
 * Rasterising a certificate.
 *
 * Output has to be byte-for-byte comparable between machines, which rules out
 * the two things that normally make DOM screenshots drift:
 *
 *  1. **Device pixel ratio.** `html-to-image` defaults to the monitor's DPR, so
 *     the same certificate came out 1150px wide on one laptop and 2300px on a
 *     retina one. We pin it.
 *  2. **Locally installed fonts.** If the Nastaliq face fails to load, the
 *     browser silently falls back to a system serif and the whole document
 *     reflows. We inline every `@font-face` as a data URI so the snapshot never
 *     depends on what is installed.
 *
 * The node handed in must be rendered at its natural design size — the visible
 * preview is a separate, CSS-scaled copy (see `CertificateStage`).
 */

/** Fixed multiplier applied to the design canvas. 1150x820 -> 2300x1640. */
export const CAPTURE_PIXEL_RATIO = 2;

/**
 * Embedding the fonts means base64-ing ~1.3MB of TTF. Doing that once per
 * bulk run rather than once per certificate is the difference between a
 * three-second export and a three-minute one.
 */
let fontEmbedCache: Promise<string> | null = null;

export function primeFontEmbedCache(node: HTMLElement): Promise<string> {
  fontEmbedCache ??= getFontEmbedCSS(node).catch((error) => {
    // A failed embed is recoverable (the browser still has the font loaded
    // locally), so don't poison the cache — just fall back to no override.
    fontEmbedCache = null;
    console.warn("جاسازی فونت‌ها ناموفق بود؛ از فونت‌های بارگذاری‌شده استفاده می‌شود.", error);
    return "";
  });
  return fontEmbedCache;
}

export function clearFontEmbedCache() {
  fontEmbedCache = null;
}

async function captureOptions(node: HTMLElement, size: CanvasSize) {
  const fontEmbedCSS = await primeFontEmbedCache(node);
  return {
    width: size.width,
    height: size.height,
    pixelRatio: CAPTURE_PIXEL_RATIO,
    backgroundColor: "#ffffff",
    cacheBust: false,
    ...(fontEmbedCSS ? { fontEmbedCSS } : {}),
    style: {
      // The capture node is never transformed, but a stray inherited transform
      // would silently offset the output, so we neutralise it explicitly.
      transform: "none",
      transformOrigin: "top left",
      margin: "0",
    } as Partial<CSSStyleDeclaration>,
  };
}

/**
 * Waits until every `<img>` inside the node has decoded. `html-to-image`
 * inlines images itself, but a not-yet-decoded image can still produce a blank
 * region on slower machines.
 */
export async function waitForImages(node: HTMLElement): Promise<void> {
  const images = Array.from(node.querySelectorAll("img"));
  await Promise.all(
    images.map((image) => {
      if (image.complete && image.naturalWidth > 0) return Promise.resolve();
      return new Promise<void>((resolve) => {
        image.addEventListener("load", () => resolve(), { once: true });
        image.addEventListener("error", () => resolve(), { once: true });
      });
    }),
  );

  if (typeof document !== "undefined" && "fonts" in document) {
    await document.fonts.ready;
  }
}

export async function captureDataUrl(node: HTMLElement, size: CanvasSize): Promise<string> {
  await waitForImages(node);
  return toPng(node, await captureOptions(node, size));
}

export async function captureBlob(node: HTMLElement, size: CanvasSize): Promise<Blob> {
  await waitForImages(node);
  const blob = await toBlob(node, await captureOptions(node, size));
  if (!blob) {
    throw new Error("ساخت تصویر گواهی ناموفق بود.");
  }
  return blob;
}

export function pixelDimensions(size: CanvasSize) {
  return {
    width: size.width * CAPTURE_PIXEL_RATIO,
    height: size.height * CAPTURE_PIXEL_RATIO,
  };
}
