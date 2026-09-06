import { localCertificateRepository } from "./local-repository";
import type { CertificateRepository } from "./types";

/**
 * The adapter the app uses. Swapping this single binding for an HTTP-backed
 * repository is the whole migration path to a server-side archive.
 */
export const certificateRepository: CertificateRepository = localCertificateRepository;

export { notifyArchiveChanged, STORAGE_EVENT } from "./local-repository";
export type { CertificateRecord, CertificateRepository } from "./types";
