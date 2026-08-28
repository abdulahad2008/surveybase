"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

export function DataTable({ headers, rows }: { headers: string[]; rows: Record<string, string>[] }) {
  const t = useTranslations("Dataset");
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
