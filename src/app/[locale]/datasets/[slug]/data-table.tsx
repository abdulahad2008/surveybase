"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useFormat } from "@/lib/use-format";
import { numericValue } from "@/lib/table";
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

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

  const columns: ColumnDef<Record<string, string>>[] = headers.map((header) => {
    if (columnTypes[header] !== "numeric") {
      return { id: header, header, accessorFn: (row) => row[header] ?? "" };
    }
    return {
      id: header,
      header,
      accessorFn: (row) => numericValue(row[header]),
      // Sorting sees the accessor; the cell keeps showing the original text, so
      // a stray "n/a" in a numeric column is still displayed, just not ranked.
      cell: ({ row }) => row.original[header] ?? "",
      sortUndefined: "last",
      // A number-valued accessor makes the table auto-pick descending for the
      // first click. Every text column still starts ascending; one header out
      // of six reversing itself reads as a bug, so pin them all the same way.
      sortDescFirst: false,
    };
  });

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
