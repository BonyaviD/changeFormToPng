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
   * Either a path under `public/` (the signature shipped with the app) or a
   * data URL uploaded through the settings page. Both work as an `<img src>`,
   * which is why the field is a plain string.
   */
  signatureImage?: string;
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
