// The citation string, in one place.
//
// It is built twice: once on a published dataset page, and once in the deposit
// form to show a depositor what they will be credited with before they commit
// to submitting. Those two must agree exactly — promising one citation and
// printing another is a broken promise about attribution, which is the whole
// reason most people deposit at all.

import { datasetId } from "@/lib/site";
import { isoDateParts } from "@/lib/format";

/** Shown when a depositor has not filled in their name. Matches the fallback
 *  the dataset page has always used, so the preview cannot promise a credit
 *  that will not appear. */
export const ANONYMOUS_AUTHOR = "SurveyBase.uz contributor";

export interface CitationParts {
  title: string;
  author: string | null;
  /**
   * The body that ran the survey, for datasets nobody deposited — the seeded
   * archive records. Crediting UNICEF's MICS to "SurveyBase.uz contributor"
   * is not anonymity, it is a wrong citation.
   */
  sourceOrganization?: string | null;
  /** Fieldwork start is preferred: a survey is cited by when it was run, not
   *  by when it happened to be uploaded. Falls back to the deposit date. */
  year: number;
}

/**
 * The year a survey should be cited by. `fieldworkStart` wins when present;
 * `fallback` is the deposit timestamp on a published page, and today in the
 * deposit form, where no row exists yet.
 */
export function citationYear(fieldworkStart: string | null, fallback: Date): number {
  if (fieldworkStart) {
    const parts = isoDateParts(fieldworkStart);
    if (parts) return Number(parts.year);
  }
  return fallback.getFullYear();
}

/**
 * The citation without a URL.
 *
 * Every slug carries a random suffix assigned at insert time (see
 * `randomSuffix` in the deposit action), so at deposit time the permanent link
 * genuinely does not exist yet. This form is what the deposit preview shows;
 * showing a guessed URL that later 404s would be worse than showing none.
 */
export function citationWithoutUrl({
  title,
  author,
  sourceOrganization,
  year,
}: CitationParts): string {
  // Depositor first, then the organization the data came from, then the
  // anonymous fallback — most specific credit that exists, in that order.
  const credit =
    author?.trim() || sourceOrganization?.trim() || ANONYMOUS_AUTHOR;
  return `${credit} (${year}). ${title} [Data set]. SurveyBase.uz.`;
}

/** The full citation, once a slug exists. */
export function fullCitation(parts: CitationParts, slug: string): string {
  return `${citationWithoutUrl(parts)} ${datasetId(slug)}`;
}
