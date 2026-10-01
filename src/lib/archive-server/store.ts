import { assetId, isAssetId, isImageDataUrl } from "@/lib/storage/assets";
import { ArchiveFullError, type CertificateRecord, type CertificateRepository } from "@/lib/storage/types";

import type { RedisRest } from "./redis";
import { InvalidArchiveInput } from "./validation";

/**
 * Far more than this office issues, and small enough that the whole archive
 * still lists in a few pages. Raise it if that ever changes.
 */
export const SERVER_CAPACITY = 10_000;

/** Records per page. Keeps every response well under a serverless body limit. */
const PAGE_SIZE = 500;

const KEYS = {
  /** id → record JSON */
  records: "sara:v1:certificates",
  /** upper-cased serial → id, for the verify page */
  serials: "sara:v1:serials",
  /** asset id → image data URL */
  assets: "sara:v1:assets",
} as const;

export interface ServerArchive extends CertificateRepository {
  /** One page of records; pass the returned cursor back until it is "0". */
  page(cursor: string): Promise<{ records: CertificateRecord[]; cursor: string }>;
}

function parseRecord(json: unknown): CertificateRecord | null {
  if (typeof json !== "string") return null;
  try {
    return JSON.parse(json) as CertificateRecord;
  } catch {
    return null;
  }
}

function newestFirst(records: CertificateRecord[]) {
  return records.sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
}

export function createServerArchive(redis: RedisRest, capacity = SERVER_CAPACITY): ServerArchive {
  async function page(cursor: string) {
    const [next, flat] = await redis.command<[string, string[]]>(
      "HSCAN", KEYS.records, cursor, "COUNT", PAGE_SIZE,
    );
    const records: CertificateRecord[] = [];
    for (let index = 1; index < flat.length; index += 2) {
      const record = parseRecord(flat[index]);
      if (record) records.push(record);
    }
    return { records, cursor: String(next) };
  }

  async function saveMany(input: CertificateRecord[]) {
    // The last copy of a repeated id wins, as it would in a Map.
    const records = [...new Map(input.map((record) => [record.id, record])).values()];
    if (records.length === 0) return;

    const ids = records.map((record) => record.id);
    const [used, existing] = await Promise.all([
      redis.command<number>("HLEN", KEYS.records),
      redis.command<(string | null)[]>("HMGET", KEYS.records, ...ids),
    ]);
    const added = existing.filter((value) => value === null).length;
    const available = Math.max(0, capacity - used);
    if (added > available) throw new ArchiveFullError(capacity, added, available);

    await redis.transaction([
      ["HSET", KEYS.records, ...records.flatMap((record) => [record.id, JSON.stringify(record)])],
      ["HSET", KEYS.serials, ...records.flatMap((record) => [record.serial.toUpperCase(), record.id])],
    ]);
  }

  return {
    page,

    async list() {
      const all: CertificateRecord[] = [];
      let cursor = "0";
      do {
        const next = await page(cursor);
        all.push(...next.records);
        cursor = next.cursor;
      } while (cursor !== "0");
      return newestFirst(all);
    },

    async findBySerial(serial) {
      const needle = serial.trim().toUpperCase();
      if (!needle) return null;
      const id = await redis.command<string | null>("HGET", KEYS.serials, needle);
      if (!id) return null;
      const record = parseRecord(await redis.command("HGET", KEYS.records, id));
      // A record re-saved under another serial leaves its old index entry behind.
      return record && record.serial.toUpperCase() === needle ? record : null;
    },

    async usage() {
      return { used: await redis.command<number>("HLEN", KEYS.records), capacity };
    },

    save: (record) => saveMany([record]),
    saveMany,

    async remove(id) {
      const record = parseRecord(await redis.command("HGET", KEYS.records, id));
      if (!record) return;
      await redis.transaction([
        ["HDEL", KEYS.records, id],
        ["HDEL", KEYS.serials, record.serial.toUpperCase()],
      ]);
    },

    async clear() {
      await redis.command("DEL", KEYS.records, KEYS.serials, KEYS.assets);
    },

    async saveAssets(assets) {
      const entries = Object.entries(assets);
      if (entries.length === 0) return;
      for (const [id, image] of entries) {
        // The id is the content hash, so a mismatched pair is refused outright.
        if (!isAssetId(id) || !isImageDataUrl(image) || (await assetId(image)) !== id) {
          throw new InvalidArchiveInput(`asset ${id.slice(0, 16)} does not match its content`);
        }
      }
      await redis.command("HSET", KEYS.assets, ...entries.flat());
    },

    async loadAssets(ids) {
      const wanted = [...new Set(ids.filter(isAssetId))];
      if (wanted.length === 0) return {};
      const images = await redis.command<(string | null)[]>("HMGET", KEYS.assets, ...wanted);
      return Object.fromEntries(
        wanted.flatMap((id, index) => (images[index] ? [[id, images[index]]] : [])),
      );
    },
  };
}
