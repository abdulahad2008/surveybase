"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useFormat } from "@/lib/use-format";
import {
  type ColumnDef,
  type Row,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

/**
 * How many rows of a dataset are shipped to the browser.
 *
 * Every row used to be: the page serialised the whole parsed CSV into the RSC
 * payload so this component could paginate 20 at a time, which meant a
 * 5,000-row survey sent 5,000 rows to display 20. The table is a preview —
 * anyone who wants the data downloads it, and that button is right there.
 */
export const TABLE_ROW_LIMIT = 100;

/**
 * Sorts a column of numbers by value rather than by digit.
 *
 * The default comparator is lexical, so an age column sorted "1, 10, 100, 2" —
 * which looks like corrupted data in a table whose whole job is to show what
 * the data looks like. Empty cells sort last in both directions: a missing
 * answer is not a small one.
 */
function numericSort(a: Row<Record<string, string>>, b: Row<Record<string, string>>, id: string) {
  const left = Number(a.getValue(id));
  const right = Number(b.getValue(id));
  const leftMissing = Number.isNaN(left);
  const rightMissing = Number.isNaN(right);
  if (leftMissing || rightMissing) {
    if (leftMissing && rightMissing) return 0;
    return leftMissing ? 1 : -1;
  }
  return left - right;
}

export function DataTable({
  headers,
  rows,
  totalRows,
  columnTypes,
  downloadHref,
}: {
  headers: string[];
  rows: Record<string, string>[];
  /** Rows in the file, not in `rows` — the two differ once the cap bites. */
  totalRows: number;
  /** Column name → the type moderation inferred, so numbers sort as numbers. */
  columnTypes: Record<string, string>;
  downloadHref: string;
}) {
  const t = useTranslations("Dataset");
  const format = useFormat();
  const [sorting, setSorting] = useState<SortingState>([]);

  // A survey with 30 questions produces a table far wider than a phone. It has
  // always scrolled, but nothing said so: the columns were simply cut off at
  // the card edge, which reads as broken data rather than as more data.
  const scroller = useRef<HTMLDivElement>(null);
  const [overflowing, setOverflowing] = useState(false);
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const check = () => setOverflowing(el.scrollWidth > el.clientWidth + 1);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [headers.length, rows.length]);

  const columns: ColumnDef<Record<string, string>>[] = headers.map((header) => ({
    id: header,
    header,
    accessorFn: (row) => row[header] ?? "",
    ...(columnTypes[header] === "numeric" ? { sortingFn: numericSort } : {}),
  }));

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 20 } },
  });

  return (
    <div className="space-y-3">
      <div ref={scroller} className="card relative overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line bg-card-soft">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header, i) => {
                  const sorted = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      className={`px-4 py-3 font-semibold whitespace-nowrap text-ink ${
                        i === 0 ? "sticky left-0 z-20 border-r border-line bg-card-soft" : ""
                      }`}
                      aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : "none"}
                    >
                      <button
                        type="button"
                        className="inline-flex select-none items-center gap-1 transition hover:text-brand"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <span className="text-xs text-brand">
                          {{ asc: "▲", desc: "▼" }[sorted as string] ?? ""}
                        </span>
                      </button>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row, i) => {
              const stripe = i % 2 === 1 ? "bg-card-soft" : "bg-card";
              return (
                <tr key={row.id} className={`group border-t border-line transition hover:bg-brand-wash ${stripe}`}>
                  {row.getVisibleCells().map((cell, j) => (
                    <td
                      key={cell.id}
                      className={`max-w-[280px] truncate px-4 py-2.5 whitespace-nowrap text-soft ${
                        j === 0
                          ? `sticky left-0 z-10 border-r border-line ${stripe} transition group-hover:bg-brand-wash`
                          : ""
                      }`}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {totalRows > rows.length && (
        <p className="text-xs leading-relaxed text-faint">
          {t.rich("tableTruncated", {
            shown: format.integer(rows.length),
            total: format.integer(totalRows),
            download: (chunks) => (
              <a href={downloadHref} className="font-semibold text-brand hover:underline">
                {chunks}
              </a>
            ),
          })}
        </p>
      )}
      {overflowing && (
        <p aria-hidden className="text-xs font-medium text-faint">
          {t("tableScrollHint")}
        </p>
      )}
      <div className="flex items-center justify-between text-sm">
        <span className="tnum font-medium text-faint">
          {t("tablePageLabel", {
            page: table.getState().pagination.pageIndex + 1,
            total: table.getPageCount() || 1,
          })}
        </span>
        <div className="flex gap-2">
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            {t("tablePrev")}
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            {t("tableNext")}
          </button>
        </div>
      </div>
    </div>
  );
}
