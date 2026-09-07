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
const FONT_EMBED_TIMEOUT_MS = 20_000;

let fontEmbedCache: Promise<string> | null = null;

export function primeFontEmbedCache(node: HTMLElement): Promise<string> {
  fontEmbedCache ??= Promise.race([
    getFontEmbedCSS(node),
    // Embedding walks every stylesheet and fetches each font file. A request
    // that never settles must not hold the export open.
    new Promise<string>((resolve) => setTimeout(() => resolve(""), FONT_EMBED_TIMEOUT_MS)),
  ]).catch((error) => {
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
 * Nothing in the readiness check may block forever: a stalled export leaves the
 * button spinning with no error for the user to act on.
 */
const READY_TIMEOUT_MS = 10_000;

function withTimeout(promise: Promise<unknown>, ms = READY_TIMEOUT_MS): Promise<void> {
  return new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    void promise.then(
      () => {
        clearTimeout(timer);
        resolve();
      },
      () => {
        clearTimeout(timer);
        resolve();
      },
    );
  });
}

/**
 * Waits until every `<img>` inside the node has settled. `html-to-image` inlines
 * images itself, but a not-yet-decoded image can still produce a blank region on
 * slower machines.
 *
 * An image that already failed reports `complete === true` with a zero
 * `naturalWidth` and will never fire another event, so `complete` alone is the
 * signal to move on — waiting for a load that cannot arrive is what hung the
 * export.
 */
export async function waitForImages(node: HTMLElement): Promise<void> {
  const images = Array.from(node.querySelectorAll("img"));

  await Promise.all(
    images.map((image) => {
      if (image.complete) return Promise.resolve();
      return withTimeout(
        new Promise<void>((resolve) => {
          image.addEventListener("load", () => resolve(), { once: true });
          image.addEventListener("error", () => resolve(), { once: true });
        }),
      );
    }),
  );

  if (typeof document !== "undefined" && "fonts" in document) {
    await withTimeout(document.fonts.ready);
  }
}

/**
 * `html-to-image` serialises the node into an SVG `foreignObject` data URL —
 * several megabytes once the fonts and artwork are inlined — and loads it into
 * an `Image`. Chromium occasionally neither resolves nor rejects that load, and
 * the export then hangs with the button stuck on "generating" and nothing for
 * the user to act on. Bounding it turns an indefinite hang into one retry and,
 * failing that, a visible error.
 */
const CAPTURE_TIMEOUT_MS = 30_000;

async function runCapture<T>(work: () => Promise<T>, what: string): Promise<T> {
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("CAPTURE_TIMEOUT")), CAPTURE_TIMEOUT_MS);
    });

    try {
      return await Promise.race([work(), timeout]);
    } catch (error) {
      if (!(error instanceof Error && error.message === "CAPTURE_TIMEOUT")) throw error;
      if (attempt === 2) {
        throw new Error(`ساخت ${what} بیش از حد طول کشید. دوباره تلاش کنید.`);
      }
      console.warn(`${what}: تلاش اول به نتیجه نرسید؛ دوباره تلاش می‌شود.`);
    } finally {
      clearTimeout(timer);
    }
  }

  // Unreachable: the loop either returns or throws.
  throw new Error(`ساخت ${what} ناموفق بود.`);
}

export async function captureDataUrl(node: HTMLElement, size: CanvasSize): Promise<string> {
  await waitForImages(node);
  const options = await captureOptions(node, size);
  return runCapture(() => toPng(node, options), "تصویر گواهی");
}

export async function captureBlob(node: HTMLElement, size: CanvasSize): Promise<Blob> {
  await waitForImages(node);
  const options = await captureOptions(node, size);
  const blob = await runCapture(() => toBlob(node, options), "تصویر گواهی");
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
