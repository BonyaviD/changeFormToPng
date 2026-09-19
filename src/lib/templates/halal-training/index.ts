import { serializeJalali, todayJalali } from "@/lib/jalali";
import { DEFAULT_SIGNATORIES, DEFAULT_UNIT_CAPTIONS } from "@/lib/settings/defaults";

import type { CertificateTemplate, FieldGroup } from "../types";
import { HalalTrainingArtwork } from "./artwork";
import { CANVAS } from "./layout";
import {
  ATTENDANCE_OPTIONS,
  GENDER_OPTIONS,
  halalTrainingSchema,
  type HalalTrainingValues,
} from "./schema";

const [defaultSignatory] = DEFAULT_SIGNATORIES;

const groups: readonly FieldGroup[] = [
  {
    id: "course",
    title: "مشخصات دوره",
    description: "اطلاعاتی که در متن گواهی و در سربرگ چاپ می‌شود.",
    fields: [
      {
        name: "courseTitle",
        label: "عنوان دوره",
        kind: "combobox",
        placeholder: "انتخاب از فهرست دوره‌ها یا تایپ عنوان جدید",
        // Picking a catalogued course drops its certificate code into the next
        // field; typing a new title leaves the code to be entered by hand.
        optionsSource: "courses",
        optionsFillMap: { code: "courseCode" },
        hint: "فهرست دوره‌ها از صفحه‌ی تنظیمات قابل ویرایش است.",
        span: 2,
        importAliases: ["دوره", "نام دوره", "course", "course title"],
      },
      {
        name: "courseCode",
        label: "کد دوره",
        kind: "text",
        placeholder: "برای مثال: ۴۰۰/۷۰۵",
        hint: "همان عددی که روی گواهی با عنوان «شماره» چاپ می‌شود.",
        importAliases: ["شماره", "کد", "code", "course code", "کد گواهی"],
      },
      {
        name: "duration",
        label: "مدت دوره",
        kind: "text",
        placeholder: "برای مثال: ۸ ساعت",
        hint: "اختیاری. اگر خالی بماند، از متن گواهی حذف می‌شود.",
        importAliases: ["مدت", "طول دوره", "duration"],
      },
      {
        name: "heldDate",
        label: "تاریخ برگزاری",
        kind: "jalali-date",
        placeholder: "انتخاب تاریخ",
        importAliases: ["تاریخ برگزاری", "held", "held date"],
      },
      {
        name: "issueDate",
        label: "تاریخ صدور",
        kind: "jalali-date",
        placeholder: "انتخاب تاریخ",
        hint: "پیش‌فرض تاریخ امروز؛ نمی‌تواند قبل از تاریخ برگزاری باشد.",
        importAliases: ["تاریخ صدور", "issue", "issue date"],
      },
      {
        name: "attendance",
        label: "نحوه برگزاری",
        kind: "radio",
        options: ATTENDANCE_OPTIONS,
        span: 2,
        importAliases: ["وضعیت", "نحوه برگزاری", "attendance"],
      },
    ],
  },
  {
    id: "recipient",
    title: "مشخصات فراگیر",
    description: "نامی که روی گواهی درج می‌شود.",
    fields: [
      {
        name: "fullName",
        label: "نام و نام خانوادگی",
        kind: "text",
        placeholder: "نام و نام خانوادگی",
        importAliases: ["نام", "نام و نام خانوادگی", "name", "full name"],
      },
      {
        name: "fatherName",
        label: "نام پدر",
        kind: "text",
        placeholder: "نام پدر",
        importAliases: ["پدر", "نام پدر", "father", "father name"],
      },
      {
        name: "nationalId",
        label: "کد ملی",
        kind: "digits",
        placeholder: "۱۰ رقم",
        importAliases: ["کد ملی", "کدملی", "national id", "nationalid"],
      },
      {
        name: "gender",
        label: "جنسیت",
        kind: "radio",
        options: GENDER_OPTIONS,
        hint: "تعیین‌کننده‌ی «جناب آقای» یا «سرکار خانم» در متن گواهی.",
        importAliases: ["جنسیت", "gender"],
      },
    ],
  },
  {
    id: "signature",
    title: "امضا و سربرگ",
    description:
      "امضاکنندگان از فهرست تنظیمات انتخاب می‌شوند و تصویر امضایشان خودکار روی گواهی می‌آید.",
    fields: [
      {
        name: "primarySignatoryName",
        label: "امضاکننده (سمت چپ)",
        kind: "combobox",
        placeholder: "انتخاب امضاکننده",
        optionsSource: "signatories",
        optionsFillMap: { title: "primarySignatoryTitle" },
        importAliases: ["امضاکننده", "signatory"],
      },
      {
        name: "primarySignatoryTitle",
        label: "سمت امضاکننده",
        kind: "text",
        placeholder: "برای مثال: رئیس مرکز …",
        importAliases: ["سمت امضاکننده", "signatory title"],
      },
      {
        name: "dualSignature",
        label: "گواهی دو امضا داشته باشد",
        kind: "switch",
        span: 2,
        excludeFromImport: true,
      },
      {
        name: "secondSignatoryName",
        label: "امضاکننده دوم (سمت راست)",
        kind: "combobox",
        placeholder: "انتخاب یا تایپ نام",
        optionsSource: "signatories",
        optionsFillMap: { title: "secondSignatoryTitle" },
        visibleWhen: (values) => values.dualSignature === true,
        importAliases: ["امضاکننده دوم", "second signatory"],
      },
      {
        name: "secondSignatoryTitle",
        label: "سمت امضاکننده دوم",
        kind: "text",
        placeholder: "برای مثال: مدیرکل …",
        visibleWhen: (values) => values.dualSignature === true,
        importAliases: ["سمت امضاکننده دوم", "second signatory title"],
      },
      {
        name: "secondUnitCaption",
        label: "عنوان زیر لوگوی سمت راست",
        kind: "combobox",
        placeholder: "برای مثال: اداره کل امور دارو و مواد تحت کنترل",
        optionsSource: "unitCaptions",
        hint: "فقط در حالت دو امضا روی سربرگ چاپ می‌شود.",
        span: 2,
        visibleWhen: (values) => values.dualSignature === true,
        importAliases: ["اداره", "عنوان سربرگ", "unit"],
      },
    ],
  },
];

const today = serializeJalali(todayJalali());

const emptyValues: HalalTrainingValues = {
  courseTitle: "",
  courseCode: "",
  fullName: "",
  fatherName: "",
  nationalId: "",
  duration: "",
  issueDate: today,
  heldDate: today,
  gender: "male",
  // Most courses are run online, so this is the value that is right by default.
  attendance: "remote",
  primarySignatoryName: defaultSignatory.name,
  primarySignatoryTitle: defaultSignatory.title,
  dualSignature: false,
  secondSignatoryName: "",
  secondSignatoryTitle: "",
  secondUnitCaption: DEFAULT_UNIT_CAPTIONS[0],
};

const sampleValues: HalalTrainingValues = {
  ...emptyValues,
  courseTitle: "آشنایی با مبانی حلیت، حرمت و طهارت",
  courseCode: "400/617",
  fullName: "مهسا میهن‌دوست",
  fatherName: "مسیب",
  nationalId: "1480180014",
  duration: "۸ ساعت",
  heldDate: "1404-05-12",
  gender: "female",
  attendance: "remote",
};

export const halalTrainingTemplate: CertificateTemplate<HalalTrainingValues> = {
  id: "halal-training",
  name: "گواهی پایان دوره آموزشی",
  description: "قالب رسمی مرکز تحقیقات حلال با کادر تذهیب و امضای رئیس مرکز.",
  version: 3,
  size: CANVAS,
  schema: halalTrainingSchema,
  groups,
  defaults: emptyValues,
  sample: sampleValues,
  summarize: (values) => ({
    primary: values.fullName || "بدون نام",
    secondary: values.courseTitle || "بدون عنوان دوره",
  }),
  fileStem: (values) =>
    [values.fullName, values.courseTitle]
      .filter(Boolean)
      .join(" - ")
      .replace(/[\\/:*?"<>|]/g, "-") || "certificate",
  Artwork: HalalTrainingArtwork,
};

export default halalTrainingTemplate;
export type { HalalTrainingValues } from "./schema";
