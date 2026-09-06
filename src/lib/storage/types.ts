import type { RecordSummary } from "@/lib/templates/types";

export interface CertificateRecord {
  id: string;
  /** Short human-quotable code, also encoded in the verification QR. */
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
  list(): Promise<CertificateRecord[]>;
  findBySerial(serial: string): Promise<CertificateRecord | null>;
  save(record: CertificateRecord): Promise<void>;
  saveMany(records: CertificateRecord[]): Promise<void>;
  remove(id: string): Promise<void>;
  clear(): Promise<void>;
}
