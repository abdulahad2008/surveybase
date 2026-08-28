/**
 * Deterministic locale formatting for anything rendered inside a client
 * component.
 *
 * `Intl` is not the same in both places. Chromium ships no CLDR data for `uz`
 * and falls back to root, while Node's full ICU has it, so the same value
 * comes out of the server and out of the browser differently:
 *
 *   value            Node (uz)        Chromium (uz)
 *   0.575 percent    "57,5%"          "57.5%"
 *   1234567          "1 234 567"      "1,234,567"
 *   2021-11-14       "14-noy, 2021"   "2021 M11 14"
 *
 * React compares the two and throws a hydration mismatch (#418) on every
 * Uzbek dataset page, and the Uzbek reader is left with the root-locale
 * rendering, which is not a date any Uzbek speaker writes. `ru` and `en` are
 * identical in both runtimes, so they lose nothing by going through here.
 *
 * The separators live in the message catalogs beside every other piece of
 * per-locale text, so a translator can see and change them.
 *
 * Server components render once and are never rehydrated, so they can keep
 * using `useFormatter`. This is for the components that run twice.
 */

export interface Separators {
  /** Between the whole part and the fraction. */
  decimal: string;
  /** Between groups of three digits. */
  group: string;
}

/** Digits only — a leading "-" is a word boundary, so \B leaves it alone. */
function group(digits: string, separator: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
}

/** Rounds to `digits` places and groups the whole part. */
export function formatFixed(
  value: number,
  digits: number,
  separators: Separators,
): string {
  if (!Number.isFinite(value)) return "";
  const fixed = Math.abs(value).toFixed(digits);
  const [whole, fraction] = fixed.split(".");
  // Read the sign off the rounded value, so -0.02 at one decimal is "0,0"
  // rather than "-0,0".
  const sign = value < 0 && Number(fixed) !== 0 ? "-" : "";
  const grouped = group(whole, separators.group);
  return fraction ? `${sign}${grouped}${separators.decimal}${fraction}` : `${sign}${grouped}`;
}

export function formatInteger(value: number, separators: Separators): string {
  return formatFixed(value, 0, separators);
}

/**
 * A statistic as written: up to `maxDigits` decimals, with trailing zeros
 * dropped, so a mean of exactly 4 reads "4" rather than "4,00".
 */
export function formatNumber(
  value: number,
  separators: Separators,
  maxDigits = 2,
): string {
  if (!Number.isFinite(value)) return "";
  const rounded = Number(value.toFixed(maxDigits));
  const digits = (String(rounded).split(".")[1] ?? "").length;
  return formatFixed(rounded, digits, separators);
}

/**
 * A share in 0..1 as a percentage, always to one decimal.
 *
 * Always one decimal because a right-aligned column of percentages should line
 * up on the decimal point; letting it drop gives "35%" sitting beside "32,2%".
 */
export function formatPercent(share: number, separators: Separators): string {
  return `${formatFixed(share * 100, 1, separators)}%`;
}

/** ISO `yyyy-mm-dd` (or a full timestamp) split into its parts, as strings. */
export function isoDateParts(iso: string): { day: string; month: number; year: string } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return null;
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  // Trimmed rather than padded: "14" reads better than "05" in prose, and the
  // catalog pattern decides how the three parts are ordered.
  return { day: String(Number(match[3])), month, year: match[1] };
}
