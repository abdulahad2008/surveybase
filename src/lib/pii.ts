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

const HEADER_PATTERNS: [PiiReason, RegExp][] = [
  ["timestamp", /^timestamp$/i],
  ["email", /e[\s-]?mail/i],
  ["phone", /\b(phone|mobile|tel(?:efon)?|whatsapp)\b/i],
  ["address", /\baddress\b|\bip address\b|\blocation\b/i],
  ["id", /\bid\b|passport|jshshir|national[\s_-]?id|\bssn\b/i],
  ["name", /\bname\b|\bF\.?I\.?O\.?\b/i],
];

function isEmailValue(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isPhoneValue(value: string): boolean {
  const normalized = value.replace(/[\s\-()]/g, "");
  return /^\+?\d{7,15}$/.test(normalized);
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
