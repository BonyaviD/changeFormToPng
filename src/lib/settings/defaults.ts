import { DEFAULT_COURSES } from "./courses";
import type { AppSettings, SignatoryEntry } from "./types";

/** The signature that ships with the app. */
export const RASTEGAR_SIGNATURE = "/templates/halal-training/signature-rastegar.png";

export const DEFAULT_SIGNATORIES: SignatoryEntry[] = [
  {
    id: "rastegar",
    name: "دکتر حسین رستگار",
    title: "رئیس مرکز تحقیقات حلال جمهوری اسلامی ایران",
    signatureImage: RASTEGAR_SIGNATURE,
  },
];

export const DEFAULT_UNIT_CAPTIONS = ["اداره کل امور دارو و مواد تحت کنترل"];

export const DEFAULT_SETTINGS: AppSettings = {
  courses: DEFAULT_COURSES,
  signatories: DEFAULT_SIGNATORIES,
  unitCaptions: DEFAULT_UNIT_CAPTIONS,
};
