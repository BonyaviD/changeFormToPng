export interface CourseEntry {
  id: string;
  title: string;
  /** Certificate code printed as «شماره» on the document. May be empty. */
  code: string;
}

export interface SignatoryEntry {
  id: string;
  name: string;
  title: string;
  /**
   * What the certificate draws, exactly as stored: the signature turned to
   * `signatureRotation` and cropped to its ink. A data URL.
   */
  signatureImage?: string;
  /**
   * The upload, cropped and downscaled but never rotated — the master every
   * rotation is recomputed from. Absent on signatures saved before rotation
   * existed; those treat `signatureImage` as their source.
   */
  signatureSource?: string;
  /** Clockwise turn in degrees, in (-180, 180]. Absent means 0. */
  signatureRotation?: number;
  /** Visual zoom on the certificate. Absent means 1 (100%). */
  signatureScale?: number;
}

/**
 * Everything on the certificate that is a matter of organisational fact rather
 * than of the individual being certified. It is editable from `/settings` and
 * stored per browser, seeded from the defaults below.
 */
export interface AppSettings {
  courses: CourseEntry[];
  signatories: SignatoryEntry[];
  /** Second line under the right-hand logo, e.g. the issuing directorate. */
  unitCaptions: string[];
}
