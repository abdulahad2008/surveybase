/** Slugs are capped here so a URL stays quotable in a paper's reference list. */
export const MAX_SLUG_LENGTH = 60;

export function slugify(title: string): string {
  const full = title
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");

  if (full.length <= MAX_SLUG_LENGTH) return full || "dataset";

  // Trim back to the last whole word inside the cap. A blind slice produced
  // slugs like "…-uzbekistan-multiple-indicator-cluster-survey-mics-20", where
  // the reader cannot tell whether the truncated year is 2001 or 2021.
  const cut = full.slice(0, MAX_SLUG_LENGTH);
  const lastBoundary = cut.lastIndexOf("-");
  const trimmed = lastBoundary > 0 ? cut.slice(0, lastBoundary) : cut;
  return trimmed.replace(/-+$/g, "") || "dataset";
}

export function randomSuffix(length = 6): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}
