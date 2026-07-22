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
      <div className="overflow-x-auto rounded border border-gray-200 dark:border-gray-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const sorted = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      className="whitespace-nowrap px-3 py-2 font-medium"
                      aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : "none"}
                    >
                      <button
                        type="button"
                        className="select-none"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {{ asc: " ▲", desc: " ▼" }[sorted as string] ?? ""}
                      </button>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-t border-gray-100 dark:border-gray-800">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="whitespace-nowrap px-3 py-2">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span>
          {t("tablePageLabel", {
            page: table.getState().pagination.pageIndex + 1,
            total: table.getPageCount() || 1,
          })}
        </span>
        <div className="flex gap-2">
          <button
            className="rounded border border-gray-300 px-2 py-1 disabled:opacity-40 dark:border-gray-700"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            {t("tablePrev")}
          </button>
          <button
            className="rounded border border-gray-300 px-2 py-1 disabled:opacity-40 dark:border-gray-700"
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
