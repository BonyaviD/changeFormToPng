import assert from "node:assert/strict";
import { test } from "node:test";

import { buildImportTemplateCsv, mapSheetToRows } from "../src/lib/bulk/mapping";
import {
  ATTENDANCE_OPTIONS,
  GENDER_OPTIONS,
  halalTrainingSchema,
  type HalalTrainingValues,
} from "../src/lib/templates/halal-training/schema";
import type { CertificateTemplate } from "../src/lib/templates/types";

// The real certificate schema behind a field list shaped like the real form.
// The shipped template module also pulls in the React artwork and fonts.
const defaults: HalalTrainingValues = {
  courseTitle: "",
  courseCode: "",
  fullName: "",
  fatherName: "",
  nationalId: "",
  duration: "",
  issueDate: "1404-06-01",
  heldDate: "1404-05-01",
  gender: "male",
  attendance: "remote",
  primarySignatoryName: "امضاکننده",
  primarySignatoryTitle: "رئیس مرکز",
  dualSignature: false,
  secondSignatoryName: "",
  secondSignatoryTitle: "",
  secondUnitCaption: "",
};

const template: CertificateTemplate<HalalTrainingValues> = {
  id: "test",
  name: "test",
  description: "",
  version: 1,
  size: { width: 100, height: 100 },
  schema: halalTrainingSchema,
  groups: [
    {
      id: "all",
      title: "all",
      fields: [
        { name: "courseTitle", label: "عنوان دوره", kind: "combobox", importAliases: ["دوره", "course"] },
        { name: "courseCode", label: "کد دوره", kind: "text" },
        { name: "fullName", label: "نام و نام خانوادگی", kind: "text", importAliases: ["نام", "full name"] },
        { name: "fatherName", label: "نام پدر", kind: "text" },
        { name: "nationalId", label: "کد ملی", kind: "digits" },
        { name: "heldDate", label: "تاریخ برگزاری", kind: "jalali-date" },
        { name: "issueDate", label: "تاریخ صدور", kind: "jalali-date" },
        { name: "gender", label: "جنسیت", kind: "radio", options: GENDER_OPTIONS },
        { name: "attendance", label: "نحوه برگزاری", kind: "radio", options: ATTENDANCE_OPTIONS },
        { name: "dualSignature", label: "دو امضا", kind: "switch" },
        {
          name: "secondSignatoryName",
          label: "نام امضاکننده دوم",
          kind: "text",
          visibleWhen: (values) => values.dualSignature === true,
        },
        {
          name: "secondSignatoryTitle",
          label: "سمت امضاکننده دوم",
          kind: "text",
          visibleWhen: (values) => values.dualSignature === true,
        },
        { name: "primarySignatoryName", label: "نام امضاکننده", kind: "text", excludeFromImport: true },
      ],
    },
  ],
  defaults,
  sample: { ...defaults, fullName: "مهسا, \"میهن‌دوست\"", gender: "female" },
  summarize: (values) => ({ primary: values.fullName, secondary: values.courseTitle }),
  fileStem: (values) => values.fullName,
  Artwork: () => null,
};

const headers = ["نام", "نام پدر", "کد ملی", "دوره", "کد دوره", "تاریخ برگزاری", "جنسیت", "نحوه برگزاری"];

test("Persian headers, aliases, numerals and option labels map onto valid values", () => {
  const { rows, unmatchedHeaders } = mapSheetToRows(template, {
    headers,
    rows: [["مهسا میهن‌دوست", "مسیب", "۱۴۸-۰۱۸۰۰۱۴", "حلال", "400/617", "۱۴۰۴/۵/۱۲", "زن", "حضوری"]],
  });

  assert.deepEqual(unmatchedHeaders, []);
  assert.equal(rows[0].valid, true, JSON.stringify(rows[0].errors));
  assert.equal(rows[0].line, 2);
  assert.deepEqual(
    {
      fullName: rows[0].values.fullName,
      nationalId: rows[0].values.nationalId,
      heldDate: rows[0].values.heldDate,
      gender: rows[0].values.gender,
      attendance: rows[0].values.attendance,
      primarySignatoryName: rows[0].values.primarySignatoryName,
    },
    {
      fullName: "مهسا میهن‌دوست",
      nationalId: "1480180014",
      heldDate: "1404-05-12",
      gender: "female",
      attendance: "in-person",
      primarySignatoryName: "امضاکننده",
    },
  );
});

test("Arabic-keyboard letters, spacing and case in headers still match", () => {
  const { rows, unmatchedHeaders } = mapSheetToRows(template, {
    headers: ["Full_Name", "نام  پدر", "كد ملي", "Course", "کد دوره"],
    rows: [["Ali", "Reza", "12345678", "حلال", "1"]],
  });
  assert.deepEqual(unmatchedHeaders, []);
  assert.equal(rows[0].valid, true, JSON.stringify(rows[0].errors));
});

test("a blank cell falls back to the template default instead of failing", () => {
  const { rows } = mapSheetToRows(template, {
    headers,
    rows: [["علی", "رضا", "12345678", "حلال", "1", "1404-05-12", "مرد", ""]],
  });
  assert.equal(rows[0].valid, true, JSON.stringify(rows[0].errors));
  assert.equal(rows[0].values.attendance, "remote");
});

test("bad rows are flagged with the field that is wrong, and good rows still pass", () => {
  const { rows } = mapSheetToRows(template, {
    headers: [...headers, "تاریخ صدور"],
    rows: [
      ["", "رضا", "12345678", "حلال", "1", "1404-05-12", "مرد", "حضوری", "1404-06-01"],
      ["علی", "رضا", "123", "حلال", "1", "1404-13-01", "مرد", "حضوری", "1404-06-01"],
      ["علی", "رضا", "12345678", "حلال", "1", "1404-05-12", "نامشخص", "حضوری", "1404-06-01"],
      ["علی", "رضا", "12345678", "حلال", "1", "1404-05-12", "مرد", "حضوری", "1404-05-01"],
      ["علی", "رضا", "12345678", "حلال", "1", "1404-05-12", "مرد", "حضوری", "1404-06-01"],
    ],
  });

  assert.deepEqual(rows.map((row) => row.valid), [false, false, false, false, true]);
  assert.deepEqual(Object.keys(rows[0].errors), ["fullName"]);
  assert.deepEqual(Object.keys(rows[1].errors).sort(), ["heldDate", "nationalId"]);
  assert.match(rows[1].errors.heldDate, /معتبر نیست/);
  assert.deepEqual(Object.keys(rows[2].errors), ["gender"]);
  assert.match(rows[3].errors.issueDate, /قبل از تاریخ برگزاری/);
  assert.deepEqual(rows.map((row) => row.line), [2, 3, 4, 5, 6]);
});

test("a yes in a switch column turns on the fields that depend on it", () => {
  const base = ["علی", "رضا", "12345678", "حلال", "1", "1404-05-12", "مرد", "حضوری"];
  const { rows } = mapSheetToRows(template, {
    headers: [...headers, "دو امضا", "نام امضاکننده دوم", "سمت امضاکننده دوم"],
    rows: [
      [...base, "بله", "", ""],
      [...base, "۱", "دکتر ب", "مدیرکل"],
      [...base, "خیر", "", ""],
    ],
  });

  assert.equal(rows[0].values.dualSignature, true);
  assert.deepEqual(Object.keys(rows[0].errors), ["secondSignatoryName", "secondSignatoryTitle"]);
  assert.equal(rows[1].valid, true, JSON.stringify(rows[1].errors));
  assert.equal(rows[2].values.dualSignature, false);
  assert.equal(rows[2].valid, true);
});

test("unknown columns and columns with no default are reported", () => {
  const { unmatchedHeaders, missingFields } = mapSheetToRows(template, {
    headers: ["نام", "ایمیل", ""],
    rows: [["علی", "a@b.c", ""]],
  });

  assert.deepEqual(unmatchedHeaders, ["ایمیل"]);
  const missing = missingFields.map((field) => field.name);
  assert.ok(missing.includes("nationalId"));
  assert.ok(!missing.includes("heldDate"), "fields with a default are not reported");
  assert.ok(!missing.includes("secondSignatoryName"), "conditional fields are not reported");
  assert.ok(!missing.includes("primarySignatoryName"), "excluded fields are not reported");
});

test("the import template opens in Excel as UTF-8 and quotes awkward cells", () => {
  const csv = buildImportTemplateCsv(template);
  const [header, example] = csv.replace(/^﻿/, "").trimEnd().split("\n");

  assert.ok(csv.startsWith("﻿"));
  assert.ok(header.startsWith("عنوان دوره,کد دوره,نام و نام خانوادگی,"));
  assert.ok(!header.includes("نام امضاکننده,"), "excluded fields have no column");
  assert.ok(example.includes('"مهسا, ""میهن‌دوست"""'));
  assert.ok(example.includes(",زن,"), "options are written as their Persian label");
});
