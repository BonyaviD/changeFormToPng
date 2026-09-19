import { DEFAULT_SETTINGS } from "./defaults";
import type { AppSettings } from "./types";
import { normalizeWatermarkSettings } from "./watermark";

const STORAGE_KEY = "sara.settings.v1";
export const SETTINGS_EVENT = "sara:settings-changed";

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

/**
 * Reads the stored settings, falling back to the shipped defaults for any
 * section that has never been edited. Merging per section rather than replacing
 * wholesale means a future release can add a new catalogue without wiping what
 * the operator has already customised.
 */
export function readSettings(): AppSettings {
  if (!isBrowser()) return DEFAULT_SETTINGS;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;

    const stored = JSON.parse(raw) as Partial<AppSettings>;
    return {
      courses: stored.courses ?? DEFAULT_SETTINGS.courses,
      signatories: stored.signatories ?? DEFAULT_SETTINGS.signatories,
      unitCaptions: stored.unitCaptions ?? DEFAULT_SETTINGS.unitCaptions,
      watermark: normalizeWatermarkSettings(stored.watermark),
    };
  } catch (error) {
    console.warn("خواندن تنظیمات ناموفق بود؛ از مقادیر پیش‌فرض استفاده می‌شود.", error);
    return DEFAULT_SETTINGS;
  }
}

export function writeSettings(settings: AppSettings) {
  if (!isBrowser()) return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    throw new Error(
      "ذخیره‌سازی مرورگر پر شده است. تصاویر امضای بزرگ را حذف یا کوچک‌تر کنید.",
      { cause: error },
    );
  }

  window.dispatchEvent(new Event(SETTINGS_EVENT));
}

export function resetSettings() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event(SETTINGS_EVENT));
}

export function findSignatory(settings: AppSettings, name: string) {
  const needle = name.trim();
  return settings.signatories.find((entry) => entry.name.trim() === needle) ?? null;
}

export function findCourseByTitle(settings: AppSettings, title: string) {
  const needle = title.trim();
  return settings.courses.find((entry) => entry.title.trim() === needle) ?? null;
}
