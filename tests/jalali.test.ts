import assert from "node:assert/strict";
import { test } from "node:test";

import {
  addJalaliMonths,
  coerceJalaliInput,
  dateToJalali,
  firstWeekdayOfJalaliMonth,
  formatJalali,
  formatJalaliLong,
  jalaliToDate,
  looksGregorian,
  parseJalali,
  serializeJalali,
} from "../src/lib/jalali";

test("typed and pasted dates normalise to the storage form", () => {
  assert.equal(coerceJalaliInput("1404-02-04"), "1404-02-04");
  assert.equal(coerceJalaliInput("1404/2/4"), "1404-02-04");
  assert.equal(coerceJalaliInput("1404.02.04"), "1404-02-04");
  assert.equal(coerceJalaliInput("۱۴۰۴/۰۲/۰۴"), "1404-02-04");
  assert.equal(coerceJalaliInput("١٤٠٤-٠٢-٠٤"), "1404-02-04");
});

test("impossible or malformed dates are rejected rather than guessed", () => {
  assert.equal(coerceJalaliInput("1404-13-01"), null);
  assert.equal(coerceJalaliInput("1404-07-31"), null, "the autumn months have 30 days");
  assert.equal(coerceJalaliInput("1404-12-30"), null, "1404 is not a leap year");
  assert.equal(coerceJalaliInput("1403-12-30"), "1403-12-30", "1403 is a leap year");
  assert.equal(coerceJalaliInput("2025-03-21"), null, "a Gregorian date is not a Jalali one");
  assert.equal(coerceJalaliInput("2025/3/21"), null);
  assert.equal(coerceJalaliInput("0404-02-04"), null);
  assert.equal(coerceJalaliInput("1300-01-01"), "1300-01-01");
  assert.equal(coerceJalaliInput("1499-12-29"), "1499-12-29");
  assert.equal(coerceJalaliInput("04/02/1404"), null);
  assert.equal(coerceJalaliInput(""), null);
  assert.equal(parseJalali(undefined), null);
});

test("dates render with Persian digits", () => {
  assert.equal(formatJalali("1404-02-04"), "۱۴۰۴/۰۲/۰۴");
  assert.equal(formatJalali({ year: 1404, month: 2, day: 4 }), "۱۴۰۴/۰۲/۰۴");
  assert.equal(formatJalaliLong("1404-02-04"), "۴ اردیبهشت ۱۴۰۴");
  assert.equal(formatJalali("not a date"), "");
  assert.equal(serializeJalali({ year: 1404, month: 1, day: 9 }), "1404-01-09");
});

test("conversion to and from the Gregorian calendar round-trips", () => {
  const nowruz = jalaliToDate({ year: 1404, month: 1, day: 1 });
  assert.deepEqual([nowruz.getFullYear(), nowruz.getMonth() + 1, nowruz.getDate()], [2025, 3, 21]);
  assert.deepEqual(dateToJalali(new Date(2025, 2, 21)), { year: 1404, month: 1, day: 1 });
  assert.deepEqual(dateToJalali(jalaliToDate({ year: 1403, month: 12, day: 30 })), { year: 1403, month: 12, day: 30 });
});

test("calendar navigation clamps days and crosses years", () => {
  assert.deepEqual(addJalaliMonths({ year: 1404, month: 6, day: 31 }, 1), { year: 1404, month: 7, day: 30 });
  assert.deepEqual(addJalaliMonths({ year: 1404, month: 12, day: 15 }, 1), { year: 1405, month: 1, day: 15 });
  assert.deepEqual(addJalaliMonths({ year: 1404, month: 1, day: 15 }, -1), { year: 1403, month: 12, day: 15 });
  // 1 Farvardin 1404 was a Friday; the grid starts its week on Saturday.
  assert.equal(firstWeekdayOfJalaliMonth(1404, 1), 6);
});

test("Gregorian-shaped input is recognised so the form can say what is wrong", () => {
  assert.equal(looksGregorian("2025-03-21"), true);
  assert.equal(looksGregorian("۲۰۲۵/۳/۲۱"), true);
  assert.equal(looksGregorian("1404-02-04"), false);
  assert.equal(looksGregorian("not a date"), false);
  assert.equal(looksGregorian(undefined), false);
});
