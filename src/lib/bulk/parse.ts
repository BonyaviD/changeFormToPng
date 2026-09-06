import Papa from "papaparse";
import readXlsxFile from "read-excel-file";

export interface SheetTable {
  headers: string[];
  rows: string[][];
}

const CSV_EXTENSIONS = [".csv", ".tsv", ".txt"];

function isCsv(file: File): boolean {
  const name = file.name.toLowerCase();
  return CSV_EXTENSIONS.some((extension) => name.endsWith(extension));
}

function cellToString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) {
    // Excel hands back real Dates for date-formatted cells; the Gregorian ISO
    // form is unusable here, so surface it as text and let the field parser
    // reject it rather than silently writing a wrong date onto a certificate.
    return value.toISOString().slice(0, 10);
  }
  return String(value).trim();
}

/** Reads the first sheet of an `.xlsx`, or a delimited text file. */
export async function parseSpreadsheet(file: File): Promise<SheetTable> {
  const table = isCsv(file) ? await parseCsv(file) : await parseXlsx(file);

  if (table.length === 0) {
    throw new Error("فایل خالی است.");
  }

  const [headerRow, ...dataRows] = table;
  const headers = headerRow.map(cellToString);
  const rows = dataRows
    .map((row) => headers.map((_, index) => cellToString(row[index])))
    // Trailing blank rows are extremely common in hand-made spreadsheets.
    .filter((row) => row.some((cell) => cell !== ""));

  if (rows.length === 0) {
    throw new Error("فایل هیچ ردیف داده‌ای ندارد.");
  }

  return { headers, rows };
}

async function parseXlsx(file: File): Promise<unknown[][]> {
  return (await readXlsxFile(file)) as unknown[][];
}

async function parseCsv(file: File): Promise<unknown[][]> {
  const text = await file.text();
  const result = Papa.parse<string[]>(text, { skipEmptyLines: true });
  if (result.errors.length > 0) {
    throw new Error(`خواندن فایل ناموفق بود: ${result.errors[0].message}`);
  }
  return result.data;
}
