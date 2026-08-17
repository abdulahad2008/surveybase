"use client";

import { useState } from "react";
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
      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line bg-card-soft/70">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const sorted = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      className="px-4 py-3 font-semibold whitespace-nowrap text-ink"
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
            {table.getRowModel().rows.map((row, i) => (
              <tr
                key={row.id}
                className={`border-t border-line transition hover:bg-brand-wash ${
                  i % 2 === 1 ? "bg-card-soft/40" : ""
                }`}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="max-w-[280px] truncate px-4 py-2.5 whitespace-nowrap text-soft">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
