import { DEFAULT_COURSES } from "./courses";
import type { AppSettings, SignatoryEntry } from "./types";
import { DEFAULT_WATERMARK } from "./watermark";

/**
 * No signature ships with the app, and this is deliberate.
 *
 * A signature served from `public/` is a plain URL: it was fetchable by anyone
 * who knew the path, with no need to open the app, let alone inspect it — and
 * because the repository is public, from source control as well. Hardening the
 * markup would have protected nothing while that file existed.
 *
 * Signatures are therefore uploaded once through the settings page and kept in
 * the operator's own browser. A visitor to a deployed copy of this app has no
 * signature to take, because there is none to serve.
 */
export const DEFAULT_SIGNATORIES: SignatoryEntry[] = [
  {
    id: "rastegar",
    name: "دکتر حسین رستگار",
    title: "رئیس مرکز تحقیقات حلال جمهوری اسلامی ایران",
  },
];

export const DEFAULT_UNIT_CAPTIONS = ["اداره کل امور دارو و مواد تحت کنترل"];

export const DEFAULT_SETTINGS: AppSettings = {
  courses: DEFAULT_COURSES,
  signatories: DEFAULT_SIGNATORIES,
  unitCaptions: DEFAULT_UNIT_CAPTIONS,
  watermark: DEFAULT_WATERMARK,
};
