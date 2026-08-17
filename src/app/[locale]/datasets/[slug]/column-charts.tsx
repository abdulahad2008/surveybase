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

const AXIS_TICK = { fontSize: 11, fill: "var(--chart-axis)" };

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-line bg-card px-3 py-2 text-xs shadow-lift">
      <p className="max-w-[220px] font-semibold text-ink">{label}</p>
      <p className="tnum mt-0.5 text-soft">{payload[0].value}</p>
    </div>
  );
}

export function ColumnCharts({ columns }: { columns: Column[] }) {
  return (
    <div className="space-y-5">
      {columns.map((col) => (
        <div key={col.question_text} className="card p-5">
          <h3 className="mb-4 text-sm leading-snug font-bold text-ink">{col.question_text}</h3>
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
            <BarChart data={data} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
              <XAxis
                dataKey="value"
                tick={AXIS_TICK}
                interval={0}
                angle={-20}
                textAnchor="end"
                height={60}
                tickLine={false}
                axisLine={{ stroke: "var(--chart-grid)" }}
              />
              <YAxis
                allowDecimals={false}
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--brand-soft)", opacity: 0.5 }} />
              <Bar dataKey="count" fill="var(--chart-cat)" radius={[4, 4, 0, 0]} maxBarSize={44} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="tnum mt-2 text-xs font-medium text-faint">
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
            <BarChart data={summary.histogram} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
              <XAxis
                dataKey="bin"
                tick={{ ...AXIS_TICK, fontSize: 10 }}
                interval={0}
                angle={-30}
                textAnchor="end"
                height={60}
                tickLine={false}
                axisLine={{ stroke: "var(--chart-grid)" }}
              />
              <YAxis allowDecimals={false} tick={AXIS_TICK} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--mint-soft)", opacity: 0.5 }} />
              <Bar dataKey="count" fill="var(--chart-num)" radius={[4, 4, 0, 0]} maxBarSize={44} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1">
          {[
            t("statMin", { value: summary.min }),
            t("statMax", { value: summary.max }),
            t("statMean", { value: summary.mean.toFixed(2) }),
            t("statMedian", { value: summary.median }),
            t("responses", { count: summary.responseCount }),
          ].map((s) => (
            <span key={s} className="chip tnum bg-card-soft text-soft">
              {s}
            </span>
          ))}
        </div>
      </>
    );
  }

  if (summary.type === "date") {
    return (
      <p className="tnum text-sm text-soft">
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
          <li key={term.term} className="chip bg-brand-soft text-brand-ink">
            {term.term}
            <span className="tnum opacity-70">{term.count}</span>
          </li>
        ))}
      </ul>
      <p className="tnum mt-3 text-xs font-medium text-faint">
        {t("responses", { count: summary.responseCount })}
      </p>
    </>
  );
}
