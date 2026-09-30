import assert from "node:assert/strict";
import { test } from "node:test";

import { DOMParser } from "@xmldom/xmldom";
import JSZip from "jszip";

import { parseSpreadsheet } from "../src/lib/bulk/parse";

// The browser build of read-excel-file reads the sheet XML with DOMParser.
// Node has none; this is the implementation the library's own Node build uses.
Object.assign(globalThis, { DOMParser });

function csv(text: string) {
  return new File([text], "people.csv", { type: "text/csv" });
}

/** A minimal one-sheet workbook; `null` rows are left out, as Excel does. */
async function xlsx(rows: (string[] | null)[]) {
  const cells = rows
    .map((row, index) =>
      row === null
        ? ""
        : `<row r="${index + 1}">${row
            .map((value, column) =>
              `<c r="${String.fromCharCode(65 + column)}${index + 1}" t="inlineStr"><is><t>${value}</t></is></c>`)
            .join("")}</row>`)
    .join("");
  const zip = new JSZip();
  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`);
  zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
  zip.file("xl/workbook.xml", `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>`);
  zip.file("xl/_rels/workbook.xml.rels", `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`);
  zip.file("xl/worksheets/sheet1.xml", `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${cells}</sheetData></worksheet>`);
  return new File([await zip.generateAsync({ type: "arraybuffer" })], "people.xlsx");
}

test("CSV rows keep their spreadsheet row numbers across blank lines", async () => {
  const table = await parseSpreadsheet(csv("نام,کد ملی\nعلی,123\n\n,\nمریم,456\n\n"));
  assert.deepEqual(table.headers, ["نام", "کد ملی"]);
  assert.deepEqual(table.rows, [["علی", "123"], ["مریم", "456"]]);
  assert.deepEqual(table.lines, [2, 5]);
});

test("a quoted CSV cell spanning lines is still one spreadsheet row", async () => {
  const table = await parseSpreadsheet(csv('نام,توضیح\nعلی,"خط اول\nخط دوم"\nمریم,ساده\n'));
  assert.deepEqual(table.rows, [["علی", "خط اول\nخط دوم"], ["مریم", "ساده"]]);
  assert.deepEqual(table.lines, [2, 3]);
});

test("Excel rows keep their row numbers across blank rows", async () => {
  const table = await parseSpreadsheet(await xlsx([["نام", "کد ملی"], ["علی", "123"], null, null, ["مریم", "456"]]));
  assert.deepEqual(table.rows, [["علی", "123"], ["مریم", "456"]]);
  assert.deepEqual(table.lines, [2, 5]);
});

test("files with no data rows are refused with a clear message", async () => {
  await assert.rejects(parseSpreadsheet(csv("")), /خالی/);
  await assert.rejects(parseSpreadsheet(csv("نام,کد ملی\n\n\n")), /ردیف داده/);
});

test("tab-separated files are still detected", async () => {
  const table = await parseSpreadsheet(csv("نام\tکد ملی\nعلی\t123\n\nمریم\t456\n"));
  assert.deepEqual(table.rows, [["علی", "123"], ["مریم", "456"]]);
  assert.deepEqual(table.lines, [2, 4]);
});
