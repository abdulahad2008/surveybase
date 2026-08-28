/**
 * Turning something a person typed into a link we are willing to render.
 *
 * Shared by profile websites and publication links: both are free text that
 * ends up in an `href` on a public page, and both arrive from people who type
 * "unicef.org" as often as they paste a full URL.
 */

/**
 * Normalises a user-supplied web address, or returns null if it is not one.
 *
 * A bare host gets `https://` so the common case works. Anything carrying its
 * own scheme is only accepted when that scheme is http(s) — `javascript:` and
 * `data:` are what this exists to keep out, and they are indistinguishable
 * from a legitimate address once they are sitting in an `href`.
 */
export function normalizeWebsite(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return null;
  return `https://${trimmed}`;
}

/** The earliest year a publication could plausibly carry. */
export const EARLIEST_PUBLICATION_YEAR = 1900;

/**
 * True when `year` could be a publication year.
 *
 * The upper bound is next year rather than this one, because journals date
 * issues ahead and a paper accepted in December is routinely stamped with the
 * following year.
 */
export function plausiblePublicationYear(year: number, now: Date): boolean {
  return (
    Number.isInteger(year) &&
    year >= EARLIEST_PUBLICATION_YEAR &&
    year <= now.getFullYear() + 1
  );
}
