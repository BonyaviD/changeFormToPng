import type { WatermarkSettings } from "./types";

export const WATERMARK_POSITION_MIN = 0;
export const WATERMARK_POSITION_MAX = 100;
export const WATERMARK_SIZE_MIN = 140;
export const WATERMARK_SIZE_MAX = 480;
export const WATERMARK_SIZE_STEP = 10;
export const WATERMARK_OPACITY_MIN = 0;
export const WATERMARK_OPACITY_MAX = 1;
export const WATERMARK_OPACITY_STEP = 0.01;

export const DEFAULT_WATERMARK: WatermarkSettings = {
  enabled: true,
  x: 50,
  y: 50,
  size: 350,
  color: "#268a69",
  opacity: 0.08,
};

function finiteNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function normalizeWatermarkColor(value: unknown) {
  if (typeof value !== "string") return DEFAULT_WATERMARK.color;
  const color = value.trim();
  if (/^#[0-9a-f]{6}$/i.test(color)) return color.toLowerCase();
  if (/^#[0-9a-f]{3}$/i.test(color)) {
    const [r, g, b] = color.slice(1);
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return DEFAULT_WATERMARK.color;
}

/**
 * Keeps old or hand-edited localStorage values safe for the fixed certificate
 * canvas. The UI uses the same normaliser, so previews and exports cannot
 * disagree about a value at either end of a slider.
 */
export function normalizeWatermarkSettings(
  value?: Partial<WatermarkSettings> | null,
): WatermarkSettings {
  const x = clamp(
    finiteNumber(value?.x, DEFAULT_WATERMARK.x),
    WATERMARK_POSITION_MIN,
    WATERMARK_POSITION_MAX,
  );
  const y = clamp(
    finiteNumber(value?.y, DEFAULT_WATERMARK.y),
    WATERMARK_POSITION_MIN,
    WATERMARK_POSITION_MAX,
  );
  const size = clamp(
    finiteNumber(value?.size, DEFAULT_WATERMARK.size),
    WATERMARK_SIZE_MIN,
    WATERMARK_SIZE_MAX,
  );
  const opacity = clamp(
    finiteNumber(value?.opacity, DEFAULT_WATERMARK.opacity),
    WATERMARK_OPACITY_MIN,
    WATERMARK_OPACITY_MAX,
  );

  return {
    enabled:
      typeof value?.enabled === "boolean"
        ? value.enabled
        : DEFAULT_WATERMARK.enabled,
    x: Math.round(x),
    y: Math.round(y),
    size: Math.round(size / WATERMARK_SIZE_STEP) * WATERMARK_SIZE_STEP,
    color: normalizeWatermarkColor(value?.color),
    opacity: Math.round(opacity * 100) / 100,
  };
}
