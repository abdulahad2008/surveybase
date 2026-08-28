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

import type { Metadata } from "next";
import { routing, type Locale } from "@/i18n/routing";

export const SITE_URL = "https://surveybase.uz";
export const SITE_NAME = "SurveyBase.uz";

/**
 * The one address on the site a visitor can write to: takedown requests, data
 * requests and anything else on the privacy and terms pages. Kept here rather
 * than in the message catalogs because it is the same in all three locales and
 * a translated address is a typo waiting to happen.
 *
 * This has to be a mailbox that is actually read: the privacy policy promises
 * an answer within 30 days and the terms page promises a takedown route.
 */
export const SITE_CONTACT_EMAIL = "hello@surveybase.uz";

/**
 * When the privacy policy and terms last changed, as `yyyy-mm-dd`. Both pages
 * print it, so a reader can tell whether they are looking at the version they
 * agreed to. Bump it whenever the `Legal` copy changes in substance.
 */
export const LEGAL_LAST_UPDATED = "2026-08-28";

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

/**
 * Title, description, canonical, hreflang and Open Graph for one page.
 *
 * Every page but the dataset detail one inherited the layout's default title,
 * so five tabs open on this site were indistinguishable and every URL shared
 * on Telegram — the channel that matters here — unfurled as a bare link.
 */
export function pageMetadata({
  locale,
  path,
  title,
  description,
  index = true,
  absoluteTitle = false,
}: {
  locale: Locale;
  path?: string;
  title: string;
  description: string;
  index?: boolean;
  /** Skip the layout's "%s · SurveyBase.uz" template — for titles already carrying the brand. */
  absoluteTitle?: boolean;
}): Metadata {
  const url = localeUrl(locale, path);
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: url, languages: localeAlternates(path) },
    openGraph: { type: "website", siteName: SITE_NAME, title, description, url },
    twitter: { card: "summary_large_image", title, description },
    ...(index ? {} : { robots: { index: false, follow: false } }),
  };
}
