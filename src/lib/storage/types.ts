import { toPersianDigits } from "@/lib/persian";
import type { WatermarkSettings } from "@/lib/settings/types";
import type { RecordSummary } from "@/lib/templates/types";

/**
 * What the certificate looked like apart from its form values: the signatures,
 * their zoom and the watermark in force when it was issued. A re-issue draws
 * from this, so it matches the original even after the settings have changed
 * or the signatory has been renamed or removed.
 */
export interface ArtworkSnapshot {
  /** Signature image ids (see `assetId`), keyed by the printed signatory name. */
  signatures: Record<string, string>;
  /** Per-signatory zoom, keyed by the same printed name. */
  signatureScales: Record<string, number>;
  watermark: WatermarkSettings;
}

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
  /**
   * Absent on certificates issued before snapshots existed; those re-issue
   * with the current settings, which is all there is to go on.
   */
  artwork?: ArtworkSnapshot;
}

export interface ArchiveUsage {
  used: number;
  capacity: number;
}

/**
 * Storage contract. The app ships two implementations: one in the browser's
 * `localStorage`, and one on a shared server store behind `/api/archive`. The
 * screens only ever see this interface.
 */
export interface CertificateRepository {
  list(): Promise<CertificateRecord[]>;
  findBySerial(serial: string): Promise<CertificateRecord | null>;
  usage(): Promise<ArchiveUsage>;
  save(record: CertificateRecord): Promise<void>;
  /** Rejects with `ArchiveFullError`, writing nothing, when the records do not fit. */
  saveMany(records: CertificateRecord[]): Promise<void>;
  remove(id: string): Promise<void>;
  clear(): Promise<void>;
  /**
   * Stores the images an artwork snapshot refers to, keyed by `assetId`. An
   * image shared by many certificates — a signature — is stored once.
   */
  saveAssets(assets: Record<string, string>): Promise<void>;
  /** The stored images among `ids`; unknown ids are simply left out. */
  loadAssets(ids: string[]): Promise<Record<string, string>>;
}

/**
 * Thrown instead of dropping records to make room: an archive that silently
 * forgets old certificates is worse than one that asks for space.
 */
export class ArchiveFullError extends Error {
  constructor(
    readonly capacity: number,
    readonly needed = 1,
    readonly available = 0,
  ) {
    const limit = toPersianDigits(capacity);
    super(
      needed > 1
        ? `آرشیو حداکثر ${limit} گواهی نگه می‌دارد و فقط برای ${toPersianDigits(available)} گواهی دیگر جا دارد، نه ${toPersianDigits(needed)} گواهی. چند گواهی قدیمی را از آرشیو حذف کنید.`
        : `آرشیو پر است (حداکثر ${limit} گواهی). چند گواهی قدیمی را از آرشیو حذف کنید.`,
    );
    this.name = "ArchiveFullError";
  }
}
