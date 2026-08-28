import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { routing } from "@/i18n/routing";

type Messages = Record<string, unknown>;

function keyPaths(value: Messages, prefix = ""): string[] {
  return Object.entries(value).flatMap(([key, child]) =>
    child !== null && typeof child === "object"
      ? keyPaths(child as Messages, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );
}

function load(locale: string): Messages {
  return JSON.parse(
    readFileSync(new URL(`../messages/${locale}.json`, import.meta.url), "utf8"),
  );
}

test("every locale defines exactly the same keys", () => {
  // next-intl throws at runtime on a key one locale has and another does not,
  // and Uzbek is the default — so a key missing from uz.json breaks the site
  // for the majority of its visitors rather than a minority.
  const [first, ...rest] = routing.locales;
  const expected = keyPaths(load(first)).sort();

  for (const locale of rest) {
    const actual = keyPaths(load(locale)).sort();
    const missing = expected.filter((k) => !actual.includes(k));
    const extra = actual.filter((k) => !expected.includes(k));
    assert.deepEqual(
      { missing, extra },
      { missing: [], extra: [] },
      `${locale}.json does not match ${first}.json`,
    );
  }
});

/**
 * The thousands separator in Uzbek and Russian is a no-break space, so it trims
 * away to nothing without being a missing translation. It is checked instead by
 * tests/format.test.mts, which asserts every locale ships a non-empty one.
 */
const WHITESPACE_VALUED = new Set(["Format.group"]);

test("no locale ships an empty string for a key another locale fills", () => {
  const values = routing.locales.map((locale) => {
    const messages = load(locale);
    return new Map(
      keyPaths(messages).map((path) => [
        path,
        path.split(".").reduce<unknown>((acc, k) => (acc as Messages)[k], messages),
      ]),
    );
  });

  for (const [i, locale] of routing.locales.entries()) {
    const blank = [...values[i]].filter(
      ([k, v]) => typeof v === "string" && v.trim() === "" && !WHITESPACE_VALUED.has(k),
    );
    assert.deepEqual(blank.map(([k]) => k), [], `${locale}.json has empty strings`);
  }
});

/**
 * Messages that put a number in front of a noun. Written as one string with a
 * hardcoded plural — "{count} downloads" — they read as "1 downloads" in
 * English and are simply wrong in Russian, where the noun takes three
 * different endings depending on the number in front of it.
 */
const COUNTED = [
  "Dataset.downloadCount",
  "Dataset.responses",
  "Dataset.averageRating",
  "Dataset.visitCount",
  "Browse.resultsCount",
  "Browse.cardSampleSize",
  "Browse.cardDownloads",
  "Profile.statDownloads",
  "Profile.statRespondents",
];

/**
 * Which branches each locale has to spell out.
 *
 * CLDR gives Uzbek a `one` category, but Uzbek nouns do not inflect after a
 * numeral — "1 ta respondent" and "5 ta respondent" are the same word — so a
 * `one` branch would be a byte-for-byte copy of `other`, and ICU falls back to
 * `other` for any category a message leaves out. Russian is the opposite case:
 * all three of its forms are different words and all three have to be there.
 */
const REQUIRED_FORMS: Record<string, string[]> = {
  uz: ["other"],
  ru: ["one", "few", "many", "other"],
  en: ["one", "other"],
};

test("counted messages have the plural forms their locale needs", () => {
  for (const locale of routing.locales) {
    const messages = load(locale);
    const forms = REQUIRED_FORMS[locale];
    assert.ok(forms, `no expected plural forms recorded for ${locale}`);

    for (const path of COUNTED) {
      const value = path
        .split(".")
        .reduce<unknown>((acc, k) => (acc as Messages)[k], messages);
      assert.equal(typeof value, "string", `${locale}.json is missing ${path}`);
      const message = value as string;

      assert.ok(
        message.startsWith("{count, plural,"),
        `${locale}.json ${path} does not select on a plural: ${message}`,
      );
      for (const form of forms) {
        assert.match(
          message,
          new RegExp(`(?:^|[\\s{])${form} \\{`),
          `${locale}.json ${path} has no "${form}" form`,
        );
      }

      // The number is interpolated already formatted, because Chromium and
      // Node disagree about how Uzbek numbers are written. `count` selects the
      // branch and must never be printed. See src/lib/format.ts.
      assert.doesNotMatch(
        message,
        /\{count\}/,
        `${locale}.json ${path} prints {count} instead of the formatted {value}`,
      );
      for (const branch of message.matchAll(/\w+ \{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g)) {
        if (branch[1].startsWith("plural")) continue;
        assert.ok(
          branch[1].includes("{value}"),
          `${locale}.json ${path} has a branch without {value}: ${branch[1]}`,
        );
      }
    }
  }
});
