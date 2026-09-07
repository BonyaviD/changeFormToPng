import { serializeJalali, todayJalali } from "@/lib/jalali";

import type { CertificateTemplate, FieldGroup } from "../types";
import { HalalTrainingArtwork } from "./artwork";
import { CANVAS } from "./layout";
import {
  ATTENDANCE_OPTIONS,
  GENDER_OPTIONS,
  halalTrainingSchema,
  type HalalTrainingValues,
} from "./schema";

const groups: readonly FieldGroup[] = [
  {
    id: "course",
    title: "مشخصات دوره",
    description: "اطلاعاتی که در متن گواهی و در سربرگ چاپ می‌شود.",
    fields: [
      {
        name: "courseTitle",
        label: "عنوان دوره",
        kind: "text",
        placeholder: "برای مثال: اصول فرآوری حلال",
        span: 2,
        importAliases: ["دوره", "نام دوره", "course", "course title"],
      },
      {
        name: "courseCode",
        label: "کد دوره",
        kind: "text",
        placeholder: "برای مثال: ۱۲۱۰۳۲۰/۲۲۲",
        hint: "همان عددی که روی گواهی با عنوان «شماره» چاپ می‌شود.",
        importAliases: ["شماره", "کد", "code", "course code"],
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
    title: "امضا",
    description:
      "امضای اول همیشه رئیس مرکز تحقیقات حلال است. در صورت نیاز امضای دوم اضافه کنید.",
    fields: [
      {
        name: "dualSignature",
        label: "گواهی دو امضا داشته باشد",
        kind: "switch",
        span: 2,
        excludeFromImport: true,
      },
      {
        name: "secondSignatoryName",
        label: "نام امضاکننده دوم",
        kind: "text",
        placeholder: "برای مثال: دکتر …",
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
    ],
  },
];

const emptyValues: HalalTrainingValues = {
  courseTitle: "",
  courseCode: "",
  fullName: "",
  fatherName: "",
  nationalId: "",
  duration: "",
  issueDate: serializeJalali(todayJalali()),
  heldDate: serializeJalali(todayJalali()),
  gender: "male",
  attendance: "in-person",
  dualSignature: false,
  secondSignatoryName: "",
  secondSignatoryTitle: "",
};

const sampleValues: HalalTrainingValues = {
  courseTitle: "آشنایی با الزامات حلال",
  courseCode: "1210320/222",
  fullName: "مهسا میهن‌دوست",
  fatherName: "مسیب",
  nationalId: "1480180014",
  duration: "۸ ساعت",
  issueDate: "1404-02-04",
  heldDate: "1402-12-03",
  gender: "female",
  attendance: "in-person",
  dualSignature: false,
  secondSignatoryName: "",
  secondSignatoryTitle: "",
};

export const halalTrainingTemplate: CertificateTemplate<HalalTrainingValues> = {
  id: "halal-training",
  name: "گواهی پایان دوره آموزشی",
  description: "قالب رسمی مرکز تحقیقات حلال با کادر تذهیب و امضای رئیس مرکز.",
  version: 1,
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
