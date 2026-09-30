import type { AppSettings } from "@/lib/settings/types";

import { referencedAssetIds, restoreArtworkContext } from "./artwork-snapshot";
import { localCertificateRepository, notifyArchiveChanged } from "./local-repository";
import { createRemoteRepository } from "./remote-repository";
import { ArchiveFullError, type CertificateRecord, type CertificateRepository } from "./types";

export type ArchiveLocation = "server" | "browser";

let backend: Promise<{ location: ArchiveLocation; repository: CertificateRepository }> | null = null;

/**
 * Where the archive lives is the server's call: with a store configured it is
 * shared by every browser, otherwise each browser keeps its own. Asked once
 * per page load; a failed answer is asked again rather than guessed.
 */
function resolveBackend() {
  backend ??= (async () => {
    const response = await fetch("/api/archive", { cache: "no-store" });
    if (!response.ok) throw new Error("ارتباط با سرور برای یافتن آرشیو ناموفق بود.");
    const { enabled } = (await response.json()) as { enabled: boolean };
    if (!enabled) return { location: "browser" as const, repository: localCertificateRepository };

    const remote = createRemoteRepository();
    await uploadBrowserArchive(remote);
    return { location: "server" as const, repository: remote };
  })().catch((error: unknown) => {
    backend = null;
    throw error;
  });
  return backend;
}

/**
 * Moves certificates issued while the archive lived in this browser to the
 * server, then forgets the local copy. Records keep their ids, so a repeat
 * after an interrupted upload, or from a second tab, only rewrites them.
 */
async function uploadBrowserArchive(remote: CertificateRepository) {
  try {
    const local = await localCertificateRepository.list();
    if (local.length === 0) return;
    const ids = referencedAssetIds(local);
    await remote.saveAssets(await localCertificateRepository.loadAssets(ids));
    await remote.saveMany(local);
    await localCertificateRepository.clear();
    notifyArchiveChanged();
  } catch (error) {
    // The local copy stays put and the next page load tries again.
    console.warn("انتقال آرشیو این مرورگر به سرور ناموفق بود.", error);
  }
}

async function current() {
  return (await resolveBackend()).repository;
}

/** The archive every screen uses, wherever it lives. */
export const certificateRepository: CertificateRepository = {
  list: async () => (await current()).list(),
  findBySerial: async (serial) => (await current()).findBySerial(serial),
  usage: async () => (await current()).usage(),
  save: async (record) => (await current()).save(record),
  saveMany: async (records) => (await current()).saveMany(records),
  remove: async (id) => (await current()).remove(id),
  clear: async () => (await current()).clear(),
  saveAssets: async (assets) => (await current()).saveAssets(assets),
  loadAssets: async (ids) => (await current()).loadAssets(ids),
};

export async function archiveLocation(): Promise<ArchiveLocation> {
  return (await resolveBackend()).location;
}

/** The context to re-issue or preview an archived certificate with. */
export async function artworkContextFor(record: CertificateRecord, settings: AppSettings) {
  const ids = Object.values(record.artwork?.signatures ?? {});
  const assets = ids.length > 0 ? await certificateRepository.loadAssets(ids) : {};
  return restoreArtworkContext(record, settings, assets);
}

/** Refuses up front when `needed` new certificates would not fit. */
export async function ensureArchiveRoom(needed: number) {
  const { used, capacity } = await certificateRepository.usage();
  const available = Math.max(0, capacity - used);
  if (needed > available) throw new ArchiveFullError(capacity, needed, available);
}

export { notifyArchiveChanged, STORAGE_EVENT } from "./local-repository";
export { snapshotArtwork } from "./artwork-snapshot";
export { ArchiveFullError } from "./types";
export type { ArchiveUsage, CertificateRecord, CertificateRepository } from "./types";
