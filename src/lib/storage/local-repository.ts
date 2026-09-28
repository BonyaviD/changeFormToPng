import { ArchiveFullError, type CertificateRecord, type CertificateRepository } from "./types";

const STORAGE_KEY = "sara.certificates.v1";
/** Guard against filling the ~5MB origin quota during a large bulk run. */
export const MAX_RECORDS = 2000;

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readAll(): CertificateRecord[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CertificateRecord[]) : [];
  } catch (error) {
    console.warn("خواندن آرشیو گواهی‌ها ناموفق بود.", error);
    return [];
  }
}

function writeAll(records: CertificateRecord[]) {
  if (!isBrowser()) return;
  // Never trim to fit: that silently deleted the oldest certificates. Callers
  // check the room first, so reaching this is a last line of defence.
  if (records.length > MAX_RECORDS) throw new ArchiveFullError(MAX_RECORDS);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (error) {
    throw new Error(
      "ذخیره‌سازی مرورگر پر شده است. چند گواهی قدیمی را از آرشیو حذف کنید.",
      { cause: error },
    );
  }
}

/** Newest first — the order every screen wants. */
function sortRecords(records: CertificateRecord[]): CertificateRecord[] {
  return [...records].sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
}

export const localCertificateRepository: CertificateRepository = {
  capacity: MAX_RECORDS,

  async list() {
    return sortRecords(readAll());
  },

  async remaining() {
    return Math.max(0, MAX_RECORDS - readAll().length);
  },

  async findBySerial(serial) {
    const needle = serial.trim().toUpperCase();
    return readAll().find((record) => record.serial.toUpperCase() === needle) ?? null;
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
    writeAll(readAll().filter((record) => record.id !== id));
  },

  async clear() {
    if (!isBrowser()) return;
    window.localStorage.removeItem(STORAGE_KEY);
  },
};

export const STORAGE_EVENT = "sara:certificates-changed";

/** Lets every mounted screen refresh when the archive changes. */
export function notifyArchiveChanged() {
  if (!isBrowser()) return;
  window.dispatchEvent(new Event(STORAGE_EVENT));
}
