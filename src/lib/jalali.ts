import {
  isValidJalaaliDate,
  jalaaliMonthLength,
  toGregorian,
  toJalaali,
} from "jalaali-js";

import { toLatinDigits, toPersianDigits } from "./persian";

/**
 * Jalali (Persian) calendar helpers.
 *
 * Dates travel through the app as an ISO-like string with Latin digits —
 * `"1404-02-04"` — so they sort, compare and serialise correctly. They are
 * converted to `"۱۴۰۴/۰۲/۰۴"` only at the moment of rendering.
 */

export interface JalaliDate {
  year: number;
  month: number;
  day: number;
}

export const JALALI_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
] as const;

/** Week starts on Saturday. */
export const JALALI_WEEKDAYS_SHORT = ["ش", "ی", "د", "س", "چ", "پ", "ج"] as const;

const STORAGE_PATTERN = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;

export function isJalaliDate(value: unknown): value is JalaliDate {
  return (
    typeof value === "object" &&
    value !== null &&
    "year" in value &&
    "month" in value &&
    "day" in value
  );
}

/** `"1404-02-04"` → `{ year: 1404, month: 2, day: 4 }`. */
export function parseJalali(value: string | null | undefined): JalaliDate | null {
  if (!value) return null;
  const match = STORAGE_PATTERN.exec(toLatinDigits(value).replace(/[/.]/g, "-"));
  if (!match) return null;

  const date: JalaliDate = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
  return isValidJalaaliDate(date.year, date.month, date.day) ? date : null;
}

/** `{ year: 1404, month: 2, day: 4 }` → `"1404-02-04"`. */
export function serializeJalali(date: JalaliDate): string {
  const month = String(date.month).padStart(2, "0");
  const day = String(date.day).padStart(2, "0");
  return `${date.year}-${month}-${day}`;
}

/** Display form for the UI and for the rendered certificate: `"۱۴۰۴/۰۲/۰۴"`. */
export function formatJalali(value: string | JalaliDate | null | undefined): string {
  const date = isJalaliDate(value) ? value : parseJalali(value ?? null);
  if (!date) return "";
  const month = String(date.month).padStart(2, "0");
  const day = String(date.day).padStart(2, "0");
  return toPersianDigits(`${date.year}/${month}/${day}`);
}

/** Long form used in headings: `"۴ اردیبهشت ۱۴۰۴"`. */
export function formatJalaliLong(value: string | JalaliDate | null | undefined): string {
  const date = isJalaliDate(value) ? value : parseJalali(value ?? null);
  if (!date) return "";
  return `${toPersianDigits(date.day)} ${JALALI_MONTHS[date.month - 1]} ${toPersianDigits(date.year)}`;
}

export function todayJalali(): JalaliDate {
  const now = new Date();
  const { jy, jm, jd } = toJalaali(now.getFullYear(), now.getMonth() + 1, now.getDate());
  return { year: jy, month: jm, day: jd };
}

export function jalaliToDate(date: JalaliDate): Date {
  const { gy, gm, gd } = toGregorian(date.year, date.month, date.day);
  return new Date(gy, gm - 1, gd);
}

export function dateToJalali(date: Date): JalaliDate {
  const { jy, jm, jd } = toJalaali(date.getFullYear(), date.getMonth() + 1, date.getDate());
  return { year: jy, month: jm, day: jd };
}

export function daysInJalaliMonth(year: number, month: number): number {
  return jalaaliMonthLength(year, month);
}

/**
 * Weekday index of the 1st of the month, where 0 = Saturday.
 * Used to pad the leading cells of the calendar grid.
 */
export function firstWeekdayOfJalaliMonth(year: number, month: number): number {
  const date = jalaliToDate({ year, month, day: 1 });
  return (date.getDay() + 1) % 7;
}

export function isSameJalaliDate(a: JalaliDate | null, b: JalaliDate | null): boolean {
  if (!a || !b) return false;
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

export function addJalaliMonths(date: JalaliDate, delta: number): JalaliDate {
  const total = date.year * 12 + (date.month - 1) + delta;
  const year = Math.floor(total / 12);
  const month = (total % 12) + 1;
  const day = Math.min(date.day, daysInJalaliMonth(year, month));
  return { year, month, day };
}

/**
 * Accepts anything a human might type or paste into a date cell — `1404/2/4`,
 * `۱۴۰۴-۰۲-۰۴`, `1404.02.04` — and returns the canonical storage string.
 */
export function coerceJalaliInput(value: string): string | null {
  const date = parseJalali(value);
  return date ? serializeJalali(date) : null;
}
