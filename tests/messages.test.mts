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
    const blank = [...values[i]].filter(([, v]) => typeof v === "string" && v.trim() === "");
    assert.deepEqual(blank.map(([k]) => k), [], `${locale}.json has empty strings`);
  }
});
