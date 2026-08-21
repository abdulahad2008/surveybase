// Recover the fieldwork date range from a Google Forms response timestamp.
//
// fieldwork_start and fieldwork_end are two of the nine required deposit
// fields, and they are the two a depositor is least able to answer: nobody
// remembers the day they closed a form. The answer is already in the file —
// Google Forms stamps every response — and pii.ts is about to delete that
// column as personal data.
//
// Taking the minimum and maximum first discloses nothing: a range is aggregate
// over the whole sample, identifies no respondent, and fieldwork dates are
// published metadata on every dataset page anyway. The per-response timestamps
// are still stripped; only the two endpoints survive, and only as a prefilled
// suggestion the depositor can overwrite.

import { TIMESTAMP_HEADER } from "@/lib/pii";

export interface FieldworkRange {
  start: string;
  end: string;
}

/** Day-first or month-first, decided per column rather than per value. */
type Ordering = "dmy" | "mdy";

const NUMERIC_DATE = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})\b/;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})\b/;

/**
 * 4/8/2026 is genuinely ambiguous on its own, but a column of them rarely is:
 * one response landing on the 13th or later settles it. Only when every single
 * value could be read either way do we fall back on the separator, which tracks
 * the locale that produced the export — Google Forms writes m/d/yyyy in English
 * and d.m.yyyy in Russian.
 */
function detectOrdering(values: string[]): Ordering {
  let separator = "/";
  for (const value of values) {
    const match = NUMERIC_DATE.exec(value.trim());
    if (!match) continue;
    separator = value.trim().includes(".") ? "." : separator;
    if (Number(match[1]) > 12) return "dmy";
    if (Number(match[2]) > 12) return "mdy";
  }
  return separator === "." ? "dmy" : "mdy";
}

/** Calendar day as YYYY-MM-DD, which is both what <input type="date"> wants and what the column stores. */
function toIsoDay(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  // Rejects the 31st of a 30-day month, which JS would otherwise roll forward.
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date.toISOString().slice(0, 10);
}

function parseDay(value: string, ordering: Ordering): string | null {
  const trimmed = value.trim();

  const iso = ISO_DATE.exec(trimmed);
  if (iso) return toIsoDay(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  const numeric = NUMERIC_DATE.exec(trimmed);
  if (!numeric) return null;
  const [, first, second, year] = numeric;
  return ordering === "dmy"
    ? toIsoDay(Number(year), Number(second), Number(first))
    : toIsoDay(Number(year), Number(first), Number(second));
}

/** Index of the response-timestamp column, or -1. */
export function findTimestampColumn(headers: string[]): number {
  return headers.findIndex((header) => TIMESTAMP_HEADER.test(header.trim()));
}

/**
 * Null whenever the answer would be a guess — no timestamp column, or nothing
 * in it we can read. A wrong prefilled date is worse than an empty field,
 * because a depositor in a hurry will accept it.
 */
export function inferFieldworkRange(
  headers: string[],
  columns: string[][],
): FieldworkRange | null {
  const index = findTimestampColumn(headers);
  if (index === -1) return null;

  const values = (columns[index] ?? []).filter((v) => v?.trim());
  if (values.length === 0) return null;

  const ordering = detectOrdering(values);
  const days = values
    .map((value) => parseDay(value, ordering))
    .filter((day): day is string => day !== null)
    .sort();

  if (days.length === 0) return null;
  return { start: days[0], end: days[days.length - 1] };
}
