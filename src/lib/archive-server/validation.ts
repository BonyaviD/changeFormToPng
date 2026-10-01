import { z } from "zod";

import { isAssetId } from "@/lib/storage/assets";
import type { CertificateRecord } from "@/lib/storage/types";

/** Thrown for input a client should never have sent; answered with 400. */
export class InvalidArchiveInput extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidArchiveInput";
  }
}

/** A record is a form's worth of short strings; this is far above any real one. */
const MAX_RECORD_BYTES = 32 * 1024;

const text = (max: number) => z.string().max(max);

const recordSchema = z
  .object({
    id: text(100).min(1),
    serial: text(64).min(1),
    templateId: text(100).min(1),
    templateVersion: z.number().int().nonnegative(),
    values: z.record(z.unknown()),
    summary: z.object({ primary: text(500), secondary: text(500) }).strict(),
    issuedAt: z.string().datetime(),
    source: z.enum(["single", "bulk"]),
    artwork: z
      .object({
        signatures: z.record(z.string().refine(isAssetId, "invalid asset id")),
        signatureScales: z.record(z.number().finite()),
        watermark: z
          .object({
            enabled: z.boolean(),
            x: z.number().finite(),
            y: z.number().finite(),
            size: z.number().finite(),
            color: z.string().regex(/^#[0-9a-f]{6}$/i),
            opacity: z.number().finite(),
          })
          .strict(),
      })
      .strict()
      .optional(),
  })
  .strict();

export function parseRecords(input: unknown): CertificateRecord[] {
  const records = z.array(z.unknown()).max(500).safeParse(input);
  if (!records.success) throw new InvalidArchiveInput("records must be an array of at most 500");
  return records.data.map((raw, index) => {
    const parsed = recordSchema.safeParse(raw);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new InvalidArchiveInput(`record ${index}: ${issue.path.join(".")} ${issue.message}`);
    }
    if (JSON.stringify(parsed.data).length > MAX_RECORD_BYTES) {
      throw new InvalidArchiveInput(`record ${index} is too large`);
    }
    return parsed.data as CertificateRecord;
  });
}
