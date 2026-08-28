import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  formatFixed,
  formatInteger,
  formatNumber,
  formatPercent,
  isoDateParts,
  type Separators,
} from "@/lib/format";
import { routing } from "@/i18n/routing";

function formatSection(locale: string): Record<string, string> {
  const messages = JSON.parse(
    readFileSync(new URL(`../messages/${locale}.json`, import.meta.url), "utf8"),
  );
  return messages.Format;
}

function separators(locale: string): Separators {
  const { decimal, group } = formatSection(locale);
  return { decimal, group };
}

const NBSP = " ";

test("percentages are identical in Node and in the browser", () => {
  // The whole point of the helper: Chromium ships no CLDR data for `uz` and
  // falls back to root, so `Intl` gave "57.5%" in the browser against Node's
  // "57,5%" and every Uzbek dataset page threw a hydration mismatch. These are
  // string operations over catalog values, so both runtimes reach the same
  // characters — which is what makes the expectations below assertable at all.
  assert.equal(formatPercent(0.575, separators("uz")), "57,5%");
  assert.equal(formatPercent(0.575, separators("ru")), "57,5%");
  assert.equal(formatPercent(0.575, separators("en")), "57.5%");
});

test("percentages always carry one decimal so columns line up", () => {
  assert.equal(formatPercent(0.35, separators("en")), "35.0%");
  assert.equal(formatPercent(1, separators("en")), "100.0%");
  assert.equal(formatPercent(0, separators("uz")), "0,0%");
  // Rounded, not truncated, and never as "-0,0".
  assert.equal(formatPercent(0.32249, separators("uz")), "32,2%");
  assert.equal(formatPercent(-0.00001, separators("uz")), "0,0%");
});

test("integers group by the locale's own separator", () => {
  assert.equal(formatInteger(1234567, separators("uz")), `1${NBSP}234${NBSP}567`);
  assert.equal(formatInteger(1234567, separators("ru")), `1${NBSP}234${NBSP}567`);
  assert.equal(formatInteger(1234567, separators("en")), "1,234,567");
  assert.equal(formatInteger(999, separators("en")), "999");
  assert.equal(formatInteger(-4321, separators("en")), "-4,321");
});

test("statistics drop trailing zeros but keep real decimals", () => {
  assert.equal(formatNumber(4, separators("uz")), "4");
  assert.equal(formatNumber(4.5, separators("uz")), "4,5");
  assert.equal(formatNumber(34.567, separators("uz")), "34,57");
  assert.equal(formatNumber(1234.5, separators("en")), "1,234.5");
  assert.equal(formatFixed(1234.5, 0, separators("en")), "1,235");
});

test("every locale defines separators, twelve months and a date order", () => {
  for (const locale of routing.locales) {
    const section = formatSection(locale);
    assert.ok(section.decimal.length > 0, `${locale} has no decimal separator`);
    assert.ok(section.group.length > 0, `${locale} has no group separator`);
    assert.equal(
      section.monthsShort.split(",").length,
      12,
      `${locale} does not name twelve months`,
    );
    for (const part of ["{day}", "{month}", "{year}"]) {
      assert.ok(
        section.dateShort.includes(part),
        `${locale} dateShort is missing ${part}`,
      );
    }
  }
});

test("ISO dates split into parts a catalog pattern can order", () => {
  assert.deepEqual(isoDateParts("2021-11-14"), { day: "14", month: 11, year: "2021" });
  // Timestamps arrive from the summary as full ISO strings.
  assert.deepEqual(isoDateParts("2021-01-05T10:00:00Z"), {
    day: "5",
    month: 1,
    year: "2021",
  });
  assert.equal(isoDateParts("not a date"), null);
  assert.equal(isoDateParts("2021-13-01"), null);
});
