// PII detection for uploaded survey CSVs.
//
// SurveyBase.uz must never store personal/identifiable data. This module is
// the single source of truth for which columns get stripped — it runs
// server-side as the final word before anything is persisted, and is also
// reused client-side purely to preview to the depositor what will happen.
// There is no way for a depositor to "keep" a flagged column: they can only
// review the list and confirm the anonymization statement.

export type PiiReason = "email" | "phone" | "name" | "address" | "id" | "timestamp";

export interface PiiFlag {
  header: string;
  index: number;
  reason: PiiReason;
}

// Uzbek is agglutinative, so Latin stems are anchored at the start of a word
// but left open at the end: "ism" also catches "ismingiz", "manzil" also
// catches "manzilingiz".
const lat = (...stems: string[]) => `\\b(?:${stems.join("|")})`;

// JS's \b is ASCII-only, so it is useless for Cyrillic: /\bимя/ does NOT match
// "Ваше имя", because the engine sees the space and "и" as two non-word
// characters and finds no boundary between them. Anchor on an explicitly
// consumed non-Cyrillic character instead. A lookbehind would read better but
// Safari only shipped it in 16.4, and this module also runs in the browser.
const cyr = (...stems: string[]) => `(?:^|[^\\u0400-\\u04FF])(?:${stems.join("|")})`;

const HEADER_PATTERNS: [PiiReason, RegExp][] = [
  // Google Forms names its automatic first column after the form's interface
  // language. Kept fully anchored so it cannot swallow a genuine question
  // about time ("Ish vaqtingiz", "Во сколько вы встаёте").
  ["timestamp", /^(?:timestamp|vaqt\s*belgisi|отметка\s*времени)$/i],
  ["email", new RegExp(`e[\\s-]?mail|${lat("pochta(?!\\s*indeks)")}|${cyr("почт(?!ов)")}`, "i")],
  [
    "phone",
    new RegExp(
      `${lat("phone", "telephone", "telefon", "mobil", "whatsapp", "telegram")}|\\btel\\b|${cyr("телефон", "мобильн")}`,
      "i",
    ),
  ],
  [
    "address",
    new RegExp(
      `\\baddress\\b|\\bip address\\b|\\blocation\\b|${lat("manzil", "pochta\\s*indeks")}|${cyr("адрес", "прописк", "почтов")}`,
      "i",
    ),
  ],
  [
    "id",
    new RegExp(
      `\\bid\\b|${lat("pass?port", "jshshir", "pinfl", "national[\\s_-]?id", "ssn")}|${cyr("паспорт", "жшшир", "пинфл", "снилс")}`,
      "i",
    ),
  ],
  [
    "name",
    new RegExp(
      `\\bname\\b|\\bF\\.?I\\.?O\\.?\\b|f\\.\\s*i\\.\\s*sh|${lat("ism", "familiya")}|${cyr("фио", "фамили", "имя", "отчеств")}`,
      "i",
    ),
  ],
];

function isEmailValue(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

// Uzbek mobile operator and landline area codes.
const UZ_AREA_CODE = /^(?:20|33|50|55|66|69|7[0-9]|88|9[0-9])/;

// A bare run of digits is ambiguous — it could be a phone number, a salary in
// so'm, an ID, or a count — so "7 to 15 digits" is far too loose. A monthly
// income in so'm is 6-8 digits, which meant every income column in every
// survey was being stripped as a column of phone numbers, with no way for the
// depositor to keep it. Only accept digits that actually have the shape of a
// reachable number.
function isPhoneValue(value: string): boolean {
  const normalized = value.trim().replace(/[\s\-()]/g, "");

  // Written internationally: +998…, 00998…, or a foreign number for a
  // respondent abroad (migration surveys collect plenty of those).
  if (/^(?:\+|00)\d{8,15}$/.test(normalized)) return true;

  // Uzbek country code without the plus.
  if (/^998\d{9}$/.test(normalized)) return true;

  // Bare national number: nine digits behind a real operator/area code. Round
  // figures are excluded because that is what money looks like and no operator
  // hands out 90 000 0000.
  return (
    /^\d{9}$/.test(normalized) && UZ_AREA_CODE.test(normalized) && !/0{4,}$/.test(normalized)
  );
}

function contentBasedReason(values: string[]): PiiReason | null {
  const nonEmpty = values.map((v) => v?.trim() ?? "").filter((v) => v !== "");
  if (nonEmpty.length === 0) return null;

  const emailMatches = nonEmpty.filter(isEmailValue).length;
  if (emailMatches / nonEmpty.length >= 0.6) return "email";

  const phoneMatches = nonEmpty.filter(isPhoneValue).length;
  if (phoneMatches / nonEmpty.length >= 0.6) return "phone";

  return null;
}

/**
 * headers: column headers in order.
 * columns: sample values per column, same order/index as headers (a subset
 * of rows is enough — a few dozen is plenty for both header and content checks).
 */
export function detectPiiColumns(headers: string[], columns: string[][]): PiiFlag[] {
  const flags: PiiFlag[] = [];

  headers.forEach((header, index) => {
    const trimmedHeader = header.trim();
    const headerMatch = HEADER_PATTERNS.find(([, pattern]) => pattern.test(trimmedHeader));
    if (headerMatch) {
      flags.push({ header, index, reason: headerMatch[0] });
      return;
    }

    const reason = contentBasedReason(columns[index] ?? []);
    if (reason) {
      flags.push({ header, index, reason });
    }
  });

  return flags;
}
