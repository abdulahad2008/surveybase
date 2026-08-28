import test from "node:test";
import assert from "node:assert/strict";
import { datasetId, localeAlternates, localeUrl, pageMetadata } from "@/lib/site";
import { routing } from "@/i18n/routing";

test("every page gets a canonical plus an alternate for all three locales", () => {
  const meta = pageMetadata({
    locale: "ru",
    path: "/datasets",
    title: "Просмотр наборов данных",
    description: "Поиск по архиву.",
  });

  assert.equal(meta.alternates?.canonical, "https://surveybase.uz/ru/datasets");

  const languages = meta.alternates?.languages ?? {};
  for (const locale of routing.locales) {
    assert.equal(languages[locale], `https://surveybase.uz/${locale}/datasets`);
  }
  // An unprefixed request lands on the default locale, so that is where
  // x-default has to point.
  assert.equal(languages["x-default"], localeUrl(routing.defaultLocale, "/datasets"));
});

test("the layout title template is applied unless the title already carries the brand", () => {
  const inherits = pageMetadata({ locale: "uz", title: "Kirish", description: "d" });
  assert.equal(inherits.title, "Kirish");

  // "SurveyBase.uz — ..." through the "%s · SurveyBase.uz" template would name
  // the site twice in one tab.
  const absolute = pageMetadata({
    locale: "uz",
    title: "SurveyBase.uz — arxiv",
    description: "d",
    absoluteTitle: true,
  });
  assert.deepEqual(absolute.title, { absolute: "SurveyBase.uz — arxiv" });
});

test("noindex is set only where it was asked for", () => {
  assert.equal(pageMetadata({ locale: "uz", title: "t", description: "d" }).robots, undefined);
  assert.deepEqual(
    pageMetadata({ locale: "uz", title: "t", description: "d", index: false }).robots,
    { index: false, follow: false },
  );
});

test("open graph carries the same url the canonical does", () => {
  const meta = pageMetadata({ locale: "en", path: "/deposit", title: "t", description: "d" });
  assert.equal(meta.openGraph?.url, meta.alternates?.canonical);
});

test("the citation id stays locale-neutral", () => {
  // A URL printed in someone's bibliography must not freeze a language choice.
  assert.equal(datasetId("uzbekistan-labour-2024"), "https://surveybase.uz/datasets/uzbekistan-labour-2024");
  assert.ok(!Object.values(localeAlternates("/datasets")).includes(datasetId("x")));
});
