/**
 * How many rows of a dataset are shipped to the browser.
 *
 * Every row used to be: the page serialised the whole parsed CSV into the RSC
 * payload so the table could paginate 20 at a time, which meant a 5,000-row
 * survey sent 5,000 rows to display 20. The table is a preview — anyone who
 * wants the data downloads it, and that button is right there.
 *
 * It lives here rather than in data-table.tsx because the server page needs it
 * too, and every export of a `"use client"` module reaches the server as an
 * opaque client reference. Imported from there, this was `undefined`, so
 * `slice(0, TABLE_ROW_LIMIT)` returned nothing and every hosted dataset showed
 * an empty table under a note that said it was showing 0 of N rows.
 */
export const TABLE_ROW_LIMIT = 100;

/**
 * Reads a numeric cell as a number, or as nothing at all.
 *
 * Sorting reads the accessor, so handing the table a number is what makes an
 * age column sort 2, 10, 100 instead of lexically "1, 10, 100, 2" — which looks
 * like corrupted data in a table whose whole job is to show what the data looks
 * like. A cell holding no number returns undefined, which the column's
 * `sortUndefined: "last"` pins to the bottom in both directions: a missing
 * answer is not a small one.
 *
 * Blanks have to be caught before the parse. `Number("")` is 0, not NaN, so an
 * empty income cell used to sort ahead of every real value ascending — and a
 * comparator can't fix that on its own, because the sorted row model negates
 * what a sorting function returns when the column is descending. Only
 * `sortUndefined` is applied before that negation.
 */
export function numericValue(raw: string | undefined): number | undefined {
  const text = raw?.trim();
  if (!text) return undefined;
  const value = Number(text);
  return Number.isFinite(value) ? value : undefined;
}
