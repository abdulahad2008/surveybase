import test from "node:test";
import assert from "node:assert/strict";
import { inferFieldworkRange } from "@/lib/fieldwork";

const HEADERS = ["Timestamp", "How old are you?"];

/** One timestamp column plus a second column, in the shape the deposit form passes. */
function columns(timestamps: string[]): string[][] {
  return [timestamps, timestamps.map(() => "34")];
}

test("year-first dates are read whatever separator the export used", () => {
  // Google Sheets writes 2026/03/14 in some locales; only the dashed form was
  // recognised, so those exports silently prefilled nothing and the depositor
  // was asked for dates that were sitting in the file.
  for (const [a, b] of [
    ["2026/03/14", "2026/04/02"],
    ["2026-03-14", "2026-04-02"],
    ["2026.03.14", "2026.04.02"],
  ]) {
    assert.deepEqual(inferFieldworkRange(HEADERS, columns([b, a])), {
      start: "2026-03-14",
      end: "2026-04-02",
    });
  }
});

test("a year-first date runs straight into its time", () => {
  // 2026-03-14T09:12:00 has no space to end the date on.
  assert.deepEqual(
    inferFieldworkRange(HEADERS, columns(["2026-03-14T09:12:00Z", "2026-03-20T22:01:59Z"])),
    { start: "2026-03-14", end: "2026-03-20" },
  );
});

test("year-first dates need no padding", () => {
  assert.deepEqual(inferFieldworkRange(HEADERS, columns(["2026/3/4", "2026/12/9"])), {
    start: "2026-03-04",
    end: "2026-12-09",
  });
});

test("a day past the twelfth settles a day-first column", () => {
  const range = inferFieldworkRange(HEADERS, columns(["4/8/2026", "19/8/2026", "1/9/2026"]));
  assert.deepEqual(range, { start: "2026-08-04", end: "2026-09-01" });
});

test("an all-ambiguous slash column is read the way Google Forms writes English", () => {
  assert.deepEqual(inferFieldworkRange(HEADERS, columns(["4/8/2026", "5/9/2026"])), {
    start: "2026-04-08",
    end: "2026-05-09",
  });
});

test("an all-ambiguous dotted column is read day-first", () => {
  assert.deepEqual(inferFieldworkRange(HEADERS, columns(["4.8.2026", "5.9.2026"])), {
    start: "2026-08-04",
    end: "2026-09-05",
  });
});

test("a date that does not exist is dropped rather than rolled forward", () => {
  // new Date(2026, 1, 30) is the 2nd of March, which would put the fieldwork
  // range on a day nobody filled in a form.
  assert.deepEqual(inferFieldworkRange(HEADERS, columns(["2026-02-30", "2026-02-10"])), {
    start: "2026-02-10",
    end: "2026-02-10",
  });
  assert.equal(inferFieldworkRange(HEADERS, columns(["2026-02-30"])), null);
});

test("nothing is inferred without a timestamp column or without values", () => {
  assert.equal(inferFieldworkRange(["Age", "Region"], columns(["2026-03-14"])), null);
  assert.equal(inferFieldworkRange(HEADERS, columns(["", "   "])), null);
  assert.equal(inferFieldworkRange(HEADERS, columns(["not a date"])), null);
});

test("the Russian and Uzbek timestamp headers are found too", () => {
  for (const header of ["Отметка времени", "Vaqt belgisi"]) {
    assert.deepEqual(inferFieldworkRange([header, "Yosh"], columns(["2026-03-14"])), {
      start: "2026-03-14",
      end: "2026-03-14",
    });
  }
});
