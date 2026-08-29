import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { TABLE_ROW_LIMIT, numericValue } from "@/lib/table";

function source(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const PAGE = "src/app/[locale]/datasets/[slug]/page.tsx";
const TABLE = "src/app/[locale]/datasets/[slug]/data-table.tsx";

test("TABLE_ROW_LIMIT is a usable row count", () => {
  assert.ok(Number.isFinite(TABLE_ROW_LIMIT), "must be a real number, not a client reference");
  assert.ok(TABLE_ROW_LIMIT > 0);
  assert.equal(TABLE_ROW_LIMIT, Math.floor(TABLE_ROW_LIMIT), "slice() takes whole rows");
});

test("the dataset page does not import the row limit from the client module", () => {
  // Node resolves data-table.tsx as an ordinary module, so importing the
  // constant from it passes every unit test and still breaks in the app: across
  // the RSC boundary each export of a `"use client"` file is an opaque client
  // reference, `slice(0, undefined)` returns [], and the table renders empty.
  // Only the import site can be checked from here, so check the import site.
  assert.ok(
    /import \{ TABLE_ROW_LIMIT \} from "@\/lib\/table"/.test(source(PAGE)),
    `${PAGE} must take TABLE_ROW_LIMIT from the server-safe module`,
  );
  assert.ok(
    !/TABLE_ROW_LIMIT[^\n]*from "\.\/data-table"/.test(source(PAGE)),
    `${PAGE} must not import TABLE_ROW_LIMIT across the client boundary`,
  );
  assert.ok(
    !/export const TABLE_ROW_LIMIT/.test(source(TABLE)),
    `${TABLE} is a client module and must not own the limit`,
  );
});

test("numericValue ranks numbers by value and leaves non-numbers unranked", () => {
  assert.deepEqual(
    ["20", "900", "1000", "4"].map(numericValue).sort((a, b) => a! - b!),
    [4, 20, 900, 1000],
  );
  assert.equal(numericValue("75000"), 75000);
  assert.equal(numericValue(" 42 "), 42, "CSV cells arrive with whitespace");
  assert.equal(numericValue("-3.5"), -3.5);
});

test("numericValue treats an absent answer as absent, not as zero", () => {
  // `Number("")` is 0, which is why empty income cells used to sort ahead of
  // every real value ascending. Undefined is what the column's
  // `sortUndefined: "last"` needs to pin them to the bottom either way.
  assert.equal(numericValue(""), undefined);
  assert.equal(numericValue("   "), undefined);
  assert.equal(numericValue(undefined), undefined);
  assert.equal(numericValue("n/a"), undefined);
  assert.equal(numericValue("Infinity"), undefined, "not a value a survey can hold");
});

test("the numeric column pins unrankable cells last in both directions", () => {
  // A sorting function cannot do this: the sorted row model negates whatever it
  // returns when the column is descending, so "push it down" becomes "push it
  // up". Only sortUndefined is applied ahead of that negation.
  assert.ok(
    /sortUndefined: "last"/.test(source(TABLE)),
    `${TABLE} must place unrankable numeric cells with sortUndefined`,
  );
});
