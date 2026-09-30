import { ArchiveFullError, type CertificateRecord, type CertificateRepository } from "./types";

/** Records per upload; keeps each request far below serverless body limits. */
const UPLOAD_CHUNK = 200;

type Fetch = (path: string, init?: RequestInit) => Promise<Response>;

async function failure(response: Response): Promise<Error> {
  const body = (await response.json().catch(() => ({}))) as {
    error?: string;
    capacity?: number;
    needed?: number;
    available?: number;
  };
  if (body.error === "archive_full") {
    return new ArchiveFullError(body.capacity ?? 0, body.needed, body.available);
  }
  if (response.status === 401) return new Error("نشست شما به پایان رسیده است. دوباره وارد شوید.");
  return new Error("ارتباط با آرشیو سرور ناموفق بود. دوباره تلاش کنید.");
}

/** The archive on the server, reached through `/api/archive`. */
export function createRemoteRepository(request: Fetch = fetch): CertificateRepository {
  async function call<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await request(path, { cache: "no-store", ...init });
    if (!response.ok) throw await failure(response);
    return (response.status === 204 ? undefined : await response.json()) as T;
  }

  const send = (method: string, body: unknown) => ({
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  /** Images this page has already uploaded; a signature is sent once per visit. */
  const uploaded = new Set<string>();

  async function saveMany(records: CertificateRecord[]) {
    for (let start = 0; start < records.length; start += UPLOAD_CHUNK) {
      await call("/api/archive/records", send("POST", { records: records.slice(start, start + UPLOAD_CHUNK) }));
    }
  }

  return {
    async list() {
      const records: CertificateRecord[] = [];
      let cursor = "0";
      do {
        const page = await call<{ records: CertificateRecord[]; cursor: string }>(
          `/api/archive/records?cursor=${cursor}`,
        );
        records.push(...page.records);
        cursor = page.cursor;
      } while (cursor !== "0");
      return records.sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
    },

    async findBySerial(serial) {
      const { record } = await call<{ record: CertificateRecord | null }>(
        `/api/archive/records?serial=${encodeURIComponent(serial.trim())}`,
      );
      return record;
    },

    usage: () => call("/api/archive/usage"),

    save: (record) => saveMany([record]),

    // The server refuses any chunk that does not fit; screens check the room
    // for a whole batch before rendering it (see `ensureArchiveRoom`).
    saveMany,

    async remove(id) {
      await call(`/api/archive/records?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    },

    async clear() {
      await call("/api/archive/records?all=1", { method: "DELETE" });
    },

    async saveAssets(assets) {
      // One image per request: each may be up to 2MB, and a request is capped.
      for (const [id, image] of Object.entries(assets)) {
        if (uploaded.has(id)) continue;
        await call("/api/archive/assets", send("POST", { assets: { [id]: image } }));
        uploaded.add(id);
      }
    },

    async loadAssets(ids) {
      const wanted = [...new Set(ids)];
      if (wanted.length === 0) return {};
      const { assets } = await call<{ assets: Record<string, string> }>(
        `/api/archive/assets?ids=${wanted.join(",")}`,
      );
      return assets;
    },
  };
}
