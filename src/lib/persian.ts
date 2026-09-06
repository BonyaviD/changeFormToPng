/**
 * Digit and text helpers for Persian output.
 *
 * Every value printed on a certificate goes through `toPersianDigits`, and
 * every value coming out of an input goes through `toLatinDigits` before it is
 * validated or stored — so the stored record is always machine-readable and the
 * rendered document is always fully Persian.
 */

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_INDIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

export function toPersianDigits(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/\d/g, (digit) => PERSIAN_DIGITS[Number(digit)]);
}

export function toLatinDigits(value: string | null | undefined): string {
  if (!value) return "";
  return String(value).replace(/[۰-۹٠-٩]/g, (digit) => {
    const persianIndex = PERSIAN_DIGITS.indexOf(digit);
    if (persianIndex >= 0) return String(persianIndex);
    return String(ARABIC_INDIC_DIGITS.indexOf(digit));
  });
}

/** Collapses runs of whitespace and trims — Persian input is often pasted. */
export function normalizeText(value: string | null | undefined): string {
  if (!value) return "";
  return value.replace(/\s+/g, " ").trim();
}

/** Normalises the Arabic characters that Windows keyboards produce. */
export function normalizePersianLetters(value: string): string {
  return value.replace(/ي/g, "ی").replace(/ك/g, "ک");
}

export function sanitizePersianInput(value: string): string {
  return normalizePersianLetters(value);
}

/** Strips everything but digits, accepting Persian numerals as input. */
export function digitsOnly(value: string): string {
  return toLatinDigits(value).replace(/\D/g, "");
}
