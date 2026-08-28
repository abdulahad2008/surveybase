import test from "node:test";
import assert from "node:assert/strict";
import { computeSummary, inferColumnType, tidyBin } from "@/lib/csv-analysis";

test("whole-number data produces whole-number histogram bins", () => {
  // Ages binned as "18.0–24.4" were unreadable on a phone and wrong about the
  // precision of the underlying data.
  const ages = Array.from({ length: 60 }, (_, i) => String(18 + (i % 45)));
  const summary = computeSummary("numeric", ages);

  assert.equal(summary.type, "numeric");
  if (summary.type !== "numeric") return;

  for (const { bin } of summary.histogram) {
    assert.match(bin, /^\d+–\d+$/, `bin "${bin}" should carry no decimals`);
  }
});

test("bins keep decimals when the data genuinely needs them", () => {
  const scores = Array.from({ length: 40 }, (_, i) => (1 + i * 0.05).toFixed(2));
  const summary = computeSummary("numeric", scores);

  assert.equal(summary.type, "numeric");
  if (summary.type !== "numeric") return;
  assert.ok(
    summary.histogram.some(({ bin }) => bin.includes(".")),
    "a range under 3 wide should still bin to decimals",
  );
});

test("tidyBin repairs labels already stored in summary_json", () => {
  // The generator fix cannot reach datasets deposited before it, because the
  // labels are written once at deposit time.
  assert.equal(tidyBin("18.0–24.4"), "18–24.4");
  assert.equal(tidyBin("18.0–24.0"), "18–24");
  assert.equal(tidyBin("1.5–2.5"), "1.5–2.5");
  assert.equal(tidyBin("100.0–200.0"), "100–200");
  assert.equal(tidyBin("0.0–0.5"), "0–0.5");
});

test("inferColumnType reads a repeated short answer as categorical", () => {
  // What decides the browse-page facets and which chart a column gets. Numbers
  // win over cardinality on purpose — a 1-5 Likert scale is still numeric — so
  // the categorical case is the one worth pinning down.
  const answers = Array.from({ length: 100 }, (_, i) => ["Yes", "No", "Don't know"][i % 3]);
  assert.equal(inferColumnType(answers), "categorical");
  assert.equal(inferColumnType(Array.from({ length: 100 }, (_, i) => String((i % 5) + 1))), "numeric");
  assert.equal(inferColumnType(["2024-01-31", "2024-02-01", "2024-02-02"]), "date");
});

test("a numeric column of whole numbers gets one bar per answer", () => {
  // A 1–5 Likert scale: five answers, five bars, in order. Ten range bins over
  // the same column produced "1.0–1.4" and three empty bins in between.
  const likert = ["1", "2", "2", "3", "5", "4", "5", "5", "", "3"];
  const summary = computeSummary("numeric", likert);
  assert.equal(summary.type, "numeric");
  if (summary.type !== "numeric") return;

  assert.deepEqual(
    summary.histogram,
    [
      { bin: "1", count: 1 },
      { bin: "2", count: 2 },
      { bin: "3", count: 2 },
      { bin: "4", count: 1 },
      { bin: "5", count: 3 },
    ],
  );
  assert.equal(summary.responseCount, 9);
  assert.equal(summary.min, 1);
  assert.equal(summary.max, 5);
});

test("a continuous numeric column still gets ten range bins", () => {
  // Ages 18–65: far more than a dozen distinct values, so ranges are the only
  // readable option and the old behaviour is what we want.
  const ages = Array.from({ length: 48 }, (_, i) => String(18 + i));
  const summary = computeSummary("numeric", ages);
  assert.equal(summary.type, "numeric");
  if (summary.type !== "numeric") return;

  assert.equal(summary.histogram.length, 10);
  assert.match(summary.histogram[0].bin, /^18–/);
  assert.equal(
    summary.histogram.reduce((sum, b) => sum + b.count, 0),
    48,
  );
});

test("whole numbers with too many distinct values are binned, not listed", () => {
  // Thirteen distinct integers is one past the cap: ranges, not thirteen bars.
  const values = Array.from({ length: 13 }, (_, i) => String(i + 1));
  const summary = computeSummary("numeric", values);
  if (summary.type !== "numeric") return assert.fail("expected a numeric summary");
  assert.equal(summary.histogram.length, 10);
});

test("a decimal column is binned even when it has few distinct values", () => {
  const values = ["1.5", "1.5", "2.5", "3.5"];
  const summary = computeSummary("numeric", values);
  if (summary.type !== "numeric") return assert.fail("expected a numeric summary");
  assert.equal(summary.histogram.length, 10);
});

test("common Uzbek words are not charted as the answer", () => {
  // Free-text answers in Uzbek: "uchun", "bilan" and "emas" appear in every
  // sentence and topped the chart on a site whose default language is Uzbek.
  const answers = [
    "Dastur juda foydali, lekin narxi qimmat",
    "Narxi uchun yaxshi emas",
    "Men narxi bilan rozi emasman, dastur foydali",
    "Нархи ҳам жуда қиммат",
  ];
  const summary = computeSummary("text", answers);
  if (summary.type !== "text") return assert.fail("expected a text summary");

  const terms = summary.topTerms.map((t) => t.term);
  for (const stopword of ["uchun", "bilan", "emas", "lekin", "juda", "men", "ҳам", "жуда"]) {
    assert.ok(!terms.includes(stopword), `"${stopword}" should not be a top term`);
  }
  assert.equal(summary.topTerms[0].term, "narxi");
  assert.equal(summary.topTerms[0].count, 3);
});
