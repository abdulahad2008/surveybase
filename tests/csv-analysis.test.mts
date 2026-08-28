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
