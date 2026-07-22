"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTranslations } from "next-intl";
import type { ColumnSummary } from "@/lib/csv-analysis";

interface Column {
  question_text: string;
  column_type: string;
  summary_json: ColumnSummary;
}

export function ColumnCharts({ columns }: { columns: Column[] }) {
  return (
    <div className="space-y-8">
      {columns.map((col) => (
        <div key={col.question_text} className="rounded border border-gray-200 p-4 dark:border-gray-800">
          <h3 className="mb-3 text-sm font-medium">{col.question_text}</h3>
          <ColumnChart summary={col.summary_json} />
        </div>
      ))}
    </div>
  );
}

function ColumnChart({ summary }: { summary: ColumnSummary }) {
  const t = useTranslations("Dataset");

  if (summary.type === "categorical") {
    const data = summary.counts.slice(0, 15);
    return (
      <>
        <div className="h-64 w-full" role="img" aria-label={t("responses", { count: summary.responseCount })}>
          <ResponsiveContainer>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="value" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#4f46e5" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {t("responses", { count: summary.responseCount })}
        </p>
      </>
    );
  }

  if (summary.type === "numeric") {
    return (
      <>
        <div className="h-64 w-full" role="img" aria-label={t("responses", { count: summary.responseCount })}>
          <ResponsiveContainer>
            <BarChart data={summary.histogram}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="bin" tick={{ fontSize: 10 }} interval={0} angle={-30} textAnchor="end" height={60} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#0891b2" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {t("statMin", { value: summary.min })} · {t("statMax", { value: summary.max })} ·{" "}
          {t("statMean", { value: summary.mean.toFixed(2) })} ·{" "}
          {t("statMedian", { value: summary.median })} · {t("responses", { count: summary.responseCount })}
        </p>
      </>
    );
  }

  if (summary.type === "date") {
    return (
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {summary.min ? new Date(summary.min).toLocaleDateString() : "—"} –{" "}
        {summary.max ? new Date(summary.max).toLocaleDateString() : "—"} ·{" "}
        {t("responses", { count: summary.responseCount })}
      </p>
    );
  }

  return (
    <>
      <ul className="flex flex-wrap gap-2">
        {summary.topTerms.map((term) => (
          <li
            key={term.term}
            className="rounded-full bg-gray-100 px-3 py-1 text-xs dark:bg-gray-800"
          >
            {term.term} ({term.count})
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        {t("responses", { count: summary.responseCount })}
      </p>
    </>
  );
}
