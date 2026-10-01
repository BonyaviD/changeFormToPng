import { referencedAssetIds } from "./artwork-snapshot";
import { ArchiveFullError, type CertificateRecord, type CertificateRepository } from "./types";

const STORAGE_KEY = "sara.certificates.v1";
const ASSETS_KEY = "sara.certificate-assets.v1";
/** Guard against filling the ~5MB origin quota during a large bulk run. */
export const MAX_RECORDS = 2000;

const QUOTA_MESSAGE = "ذخیره‌سازی مرورگر پر شده است. چند گواهی قدیمی را از آرشیو حذف کنید.";

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readJson<T>(key: string, isValid: (value: unknown) => value is T, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    return isValid(parsed) ? parsed : fallback;
  } catch (error) {
    console.warn("خواندن آرشیو گواهی‌ها ناموفق بود.", error);
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    throw new Error(QUOTA_MESSAGE, { cause: error });
  }
}

function readAll(): CertificateRecord[] {
  return readJson(STORAGE_KEY, (value): value is CertificateRecord[] => Array.isArray(value), []);
}

function writeAll(records: CertificateRecord[]) {
  // Never trim to fit: that silently deleted the oldest certificates. Callers
  // check the room first, so reaching this is a last line of defence.
  if (records.length > MAX_RECORDS) throw new ArchiveFullError(MAX_RECORDS);
  writeJson(STORAGE_KEY, records);
}

function readAssets(): Record<string, string> {
  return readJson(
    ASSETS_KEY,
    (value): value is Record<string, string> =>
      typeof value === "object" && value !== null && !Array.isArray(value),
    {},
  );
}

/** Drops images no remaining certificate refers to, so the quota is not spent on them. */
function pruneAssets(records: CertificateRecord[]) {
  const assets = readAssets();
  const keep = new Set(referencedAssetIds(records));
  const kept = Object.fromEntries(Object.entries(assets).filter(([id]) => keep.has(id)));
  if (Object.keys(kept).length === Object.keys(assets).length) return;
  if (Object.keys(kept).length === 0) window.localStorage.removeItem(ASSETS_KEY);
  else writeJson(ASSETS_KEY, kept);
}

/** Newest first — the order every screen wants. */
function sortRecords(records: CertificateRecord[]): CertificateRecord[] {
  return [...records].sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
}

export const localCertificateRepository: CertificateRepository = {
  async list() {
    return sortRecords(readAll());
  },

  async findBySerial(serial) {
    const needle = serial.trim().toUpperCase();
    return readAll().find((record) => record.serial.toUpperCase() === needle) ?? null;
  },

  async usage() {
    return { used: readAll().length, capacity: MAX_RECORDS };
  },

  async save(record) {
    const existing = readAll().filter((item) => item.id !== record.id);
    writeAll(sortRecords([record, ...existing]));
  },

  async saveMany(records) {
    if (records.length === 0) return;
    const incomingIds = new Set(records.map((record) => record.id));
    const all = readAll();
    const existing = all.filter((item) => !incomingIds.has(item.id));
    const added = records.length - (all.length - existing.length);
    const available = Math.max(0, MAX_RECORDS - all.length);
    if (added > available) throw new ArchiveFullError(MAX_RECORDS, added, available);
    writeAll(sortRecords([...records, ...existing]));
  },

  async remove(id) {
    const remaining = readAll().filter((record) => record.id !== id);
    writeAll(remaining);
    pruneAssets(remaining);
  },

  async clear() {
    if (!isBrowser()) return;
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(ASSETS_KEY);
  },

  async saveAssets(assets) {
    const stored = readAssets();
    const missing = Object.entries(assets).filter(([id]) => !(id in stored));
    if (missing.length === 0) return;
    writeJson(ASSETS_KEY, { ...stored, ...Object.fromEntries(missing) });
  },

  async loadAssets(ids) {
    const stored = readAssets();
    return Object.fromEntries(ids.filter((id) => id in stored).map((id) => [id, stored[id]]));
  },
};

export const STORAGE_EVENT = "sara:certificates-changed";

/** Lets every mounted screen refresh when the archive changes. */
export function notifyArchiveChanged() {
  if (!isBrowser()) return;
  window.dispatchEvent(new Event(STORAGE_EVENT));
}
