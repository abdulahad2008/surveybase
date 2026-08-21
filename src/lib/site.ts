// Canonical URL construction, in one place.
//
// Two different URLs describe the same dataset, on purpose:
//
//   canonical  https://surveybase.uz/uz/datasets/<slug>   — what Google indexes
//   stable id  https://surveybase.uz/datasets/<slug>      — what people cite
//
// next-intl prefixes every locale including the default, so the locale-neutral
// form is a 307 to the uz page rather than a page of its own. A search engine
// needs a canonical that answers 200, but a citation printed in a paper should
// not freeze a language choice into someone's bibliography — hence both. The
// redirect is the feature: the citation URL keeps working whatever we do to the
// locale routing later.

import { routing, type Locale } from "@/i18n/routing";

export const SITE_URL = "https://surveybase.uz";
export const SITE_NAME = "SurveyBase.uz";

/** A real, 200-answering page URL. `path` is locale-agnostic, e.g. "/datasets". */
export function localeUrl(locale: Locale, path: string = ""): string {
  return `${SITE_URL}/${locale}${path}`;
}

/**
 * hreflang map for one page, for `alternates.languages` in both Metadata and
 * MetadataRoute.Sitemap. x-default points at the default locale because that is
 * where an unprefixed request lands anyway.
 */
export function localeAlternates(path: string = ""): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const locale of routing.locales) {
    languages[locale] = localeUrl(locale, path);
  }
  languages["x-default"] = localeUrl(routing.defaultLocale, path);
  return languages;
}

/** The permanent, locale-neutral identifier for a dataset. Redirects to the default locale. */
export function datasetId(slug: string): string {
  return `${SITE_URL}/datasets/${slug}`;
}
