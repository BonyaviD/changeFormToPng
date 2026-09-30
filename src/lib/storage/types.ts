import { toPersianDigits } from "@/lib/persian";
import type { RecordSummary } from "@/lib/templates/types";

export interface CertificateRecord {
  id: string;
  /** Short human-quotable code the archive and the verify page look it up by. */
  serial: string;
  templateId: string;
  templateVersion: number;
  /** The validated form values, exactly as the template renders them. */
  values: Record<string, unknown>;
  summary: RecordSummary;
  /** ISO timestamp of when the certificate was issued. */
  issuedAt: string;
  source: "single" | "bulk";
}

/**
 * Storage contract.
 *
 * The app currently ships a `localStorage` adapter, which keeps it deployable
 * as a static bundle. Moving the archive to a server later means writing one
 * more implementation of this interface — no screen has to change.
 */
export interface CertificateRepository {
  /** Most records the archive holds; `Infinity` when it has no fixed bound. */
  readonly capacity: number;
  list(): Promise<CertificateRecord[]>;
  /** How many more new records fit. Updating an existing record needs none. */
  remaining(): Promise<number>;
  findBySerial(serial: string): Promise<CertificateRecord | null>;
  save(record: CertificateRecord): Promise<void>;
  /** Rejects with `ArchiveFullError`, writing nothing, when the records do not fit. */
  saveMany(records: CertificateRecord[]): Promise<void>;
  remove(id: string): Promise<void>;
  clear(): Promise<void>;
}

/**
 * Thrown instead of dropping records to make room: an archive that silently
 * forgets old certificates is worse than one that asks for space.
 */
export class ArchiveFullError extends Error {
  constructor(capacity: number, needed = 1, available = 0) {
    const limit = toPersianDigits(capacity);
    super(
      needed > 1
        ? `آرشیو این مرورگر حداکثر ${limit} گواهی نگه می‌دارد و فقط برای ${toPersianDigits(available)} گواهی دیگر جا دارد، نه ${toPersianDigits(needed)} گواهی. چند گواهی قدیمی را از آرشیو حذف کنید.`
        : `آرشیو این مرورگر پر است (حداکثر ${limit} گواهی). چند گواهی قدیمی را از آرشیو حذف کنید.`,
    );
    this.name = "ArchiveFullError";
  }
}
