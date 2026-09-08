import { z } from "zod";

import { parseJalali, type JalaliDate } from "@/lib/jalali";
import { toLatinDigits } from "@/lib/persian";

export const GENDER_OPTIONS = [
  { value: "male", label: "مرد" },
  { value: "female", label: "زن" },
] as const;

export const ATTENDANCE_OPTIONS = [
  { value: "in-person", label: "حضوری" },
  { value: "remote", label: "غیرحضوری" },
] as const;

/** How each gender is addressed in the body of the certificate. */
export const HONORIFIC: Record<string, string> = {
  male: "جناب آقای",
  female: "سرکار خانم",
};

export const ATTENDANCE_LABEL: Record<string, string> = {
  "in-person": "حضوری",
  remote: "غیرحضوری",
};

const requiredText = (label: string) =>
  z
    .string({ required_error: `${label} الزامی است` })
    .trim()
    .min(1, `${label} الزامی است`);

const jalaliDate = (label: string) =>
  z
    .string({ required_error: `${label} الزامی است` })
    .trim()
    .min(1, `${label} الزامی است`)
    .refine((value) => parseJalali(value) !== null, `${label} معتبر نیست`);

/** Orders two Jalali dates without going through the Gregorian calendar. */
function compareJalali(a: JalaliDate, b: JalaliDate): number {
  return a.year - b.year || a.month - b.month || a.day - b.day;
}

export const halalTrainingSchema = z
  .object({
    courseTitle: requiredText("عنوان دوره").max(160, "عنوان دوره طولانی است"),
    courseCode: requiredText("کد دوره").max(40, "کد دوره طولانی است"),
    fullName: requiredText("نام و نام خانوادگی").max(80, "نام طولانی است"),
    fatherName: requiredText("نام پدر").max(60, "نام پدر طولانی است"),
    nationalId: z
      .string({ required_error: "کد ملی الزامی است" })
      .transform((value) => toLatinDigits(value).replace(/\D/g, ""))
      .pipe(
        z
          .string()
          .min(8, "کد ملی باید حداقل ۸ رقم باشد")
          .max(12, "کد ملی باید حداکثر ۱۲ رقم باشد"),
      ),
    duration: z.string().trim().max(40, "مدت دوره طولانی است").optional().default(""),
    issueDate: jalaliDate("تاریخ صدور"),
    heldDate: jalaliDate("تاریخ برگزاری"),
    gender: z.enum(["male", "female"], { required_error: "جنسیت را انتخاب کنید" }),
    attendance: z.enum(["in-person", "remote"], {
      required_error: "وضعیت برگزاری را انتخاب کنید",
    }),

    primarySignatoryName: requiredText("نام امضاکننده").max(60),
    primarySignatoryTitle: requiredText("سمت امضاکننده").max(120),

    dualSignature: z.boolean().default(false),
    secondSignatoryName: z.string().trim().max(60).optional().default(""),
    secondSignatoryTitle: z.string().trim().max(120).optional().default(""),
    /** Second line under the right-hand logo; only printed on a dual signature. */
    secondUnitCaption: z.string().trim().max(120).optional().default(""),
  })
  .superRefine((values, ctx) => {
    // A certificate cannot be issued before the course it certifies took place.
    const issued = parseJalali(values.issueDate);
    const held = parseJalali(values.heldDate);
    if (issued && held && compareJalali(issued, held) < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["issueDate"],
        message: "تاریخ صدور نمی‌تواند قبل از تاریخ برگزاری باشد",
      });
    }

    // The second signature block only exists when the switch is on, so its
    // fields are conditionally required rather than always required.
    if (!values.dualSignature) return;

    if (!values.secondSignatoryName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["secondSignatoryName"],
        message: "نام امضاکننده دوم الزامی است",
      });
    }
    if (!values.secondSignatoryTitle) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["secondSignatoryTitle"],
        message: "سمت امضاکننده دوم الزامی است",
      });
    }
  });

export type HalalTrainingValues = z.infer<typeof halalTrainingSchema>;
/** The shape the form works with before Zod applies its transforms/defaults. */
export type HalalTrainingInput = z.input<typeof halalTrainingSchema>;
