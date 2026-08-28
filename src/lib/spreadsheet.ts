// One parser for every file a depositor can hand us.
//
// The archive stores CSV and only CSV — this module exists so that what a
// depositor *uploads* no longer has to be CSV. The overwhelmingly common path
// is Google Forms → "View responses in Sheets" → Download, and that menu's
// default is .xlsx; requiring CSV meant asking every depositor to notice a
// different menu item before they could begin.
//
// Runs on both sides: the browser parses to preview which columns will be
// stripped, and the server parses again as the authority on what is stored.
// Sharing the code is what keeps the preview honest.

import Papa from "papaparse";

export interface Sheet {
  headers: string[];
  rows: Record<string, string>[];
}

/** Anything SheetJS reads that is not delimited text. */
const BINARY_WORKBOOK = /\.(xlsx|xlsm|xlsb|xls|ods)$/i;

export function isBinaryWorkbook(fileName: string): boolean {
  return BINARY_WORKBOOK.test(fileName);
}

/** What the file input should advertise, and what the server will accept. */
export const ACCEPTED_UPLOAD_EXTENSIONS = ".csv,.tsv,.xlsx,.xlsm,.xlsb,.xls,.ods";

/**
 * The largest upload the deposit form accepts, checked in the browser before
 * parsing and again on the server before storing.
 *
 * The ceiling is not ours to choose freely: a deposit is a Server Action, and
 * the whole action body — file plus every other field — has to fit inside
 * `serverActions.bodySizeLimit` in next.config.ts, which is set to 4mb. This
 * sits below that so the depositor meets our message rather than the
 * framework's, which arrives as an unexplained failure with the form still
 * full. Going much higher is a platform question rather than a config one:
 * request bodies to a serverless function are capped independently of Next.
 *
 * A survey wider than this exists, and the answer for it is an upload that
 * goes straight to storage rather than through an action. That is a different
 * piece of work; this constant is what makes the current limit legible.
 */
export const MAX_UPLOAD_BYTES = 3.5 * 1024 * 1024;

/** For messages: the limit, and a file's size, in whole tenths of a megabyte. */
export function megabytes(bytes: number): number {
  return Math.round((bytes / (1024 * 1024)) * 10) / 10;
}

function fromRowArrays(rowArrays: unknown[][]): Sheet {
  const rawHeaders = (rowArrays[0] ?? []).map((h) => String(h ?? "").trim());

  // A trailing empty column is what a stray formatted-but-empty cell looks like
  // in an exported sheet. Dropping it here keeps it out of the PII preview and
  // out of the column list on the published page.
  let lastNamed = -1;
  rawHeaders.forEach((h, i) => {
    if (h !== "") lastNamed = i;
  });
  const headers = rawHeaders.slice(0, lastNamed + 1).map((h, i) => h || `Column ${i + 1}`);

  const rows: Record<string, string>[] = [];
  for (const rowArray of rowArrays.slice(1)) {
    const row: Record<string, string> = {};
    let hasValue = false;
    headers.forEach((header, i) => {
      const cell = String(rowArray[i] ?? "").trim();
      if (cell !== "") hasValue = true;
      row[header] = cell;
    });
    if (hasValue) rows.push(row);
  }

  return { headers, rows };
}

export async function parseSpreadsheet(file: File): Promise<Sheet> {
  if (!isBinaryWorkbook(file.name)) {
    const parsed = Papa.parse<Record<string, string>>(await file.text(), {
      header: true,
      skipEmptyLines: true,
    });
    return { headers: parsed.meta.fields ?? [], rows: parsed.data };
  }

  // Imported on demand. SheetJS is far larger than everything else on the
  // deposit page put together, and a depositor uploading CSV should never pay
  // to download a workbook reader they will not use.
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });

  const sheetName = workbook.SheetNames[0];
  const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;
  if (!sheet) return { headers: [], rows: [] };

  // raw: false renders each cell through its own number format, so a date stays
  // the date the depositor saw in the sheet rather than an Excel serial number.
  // defval keeps blank cells as positional placeholders instead of shifting
  // every later value one column to the left.
  const rowArrays = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: false,
    defval: "",
    blankrows: false,
  });

  return fromRowArrays(rowArrays);
}
