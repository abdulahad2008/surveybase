"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useFormatter, useTranslations } from "next-intl";
import type { ColumnSummary } from "@/lib/csv-analysis";

interface Column {
  question_text: string;
  column_type: string;
  summary_json: ColumnSummary;
}

type Categorical = Extract<ColumnSummary, { type: "categorical" }>;
type Numeric = Extract<ColumnSummary, { type: "numeric" }>;
type DateSummary = Extract<ColumnSummary, { type: "date" }>;
type TextSummary = Extract<ColumnSummary, { type: "text" }>;

const AXIS_TICK = { fontSize: 11, fill: "var(--chart-axis)" };

/** Always one decimal. A right-aligned column of percentages should line up on
 *  the decimal point; letting it drop gives "35%" sitting beside "32.2%". */
const PERCENT = {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
} as const;

// Colour by option, so the reader can match a slice to its legend row. Eight is
// the whole palette; past six options we draw bars instead, and bars need one
// colour, so the list never has to stretch.
const SLICES = [
  "var(--slice-1)",
  "var(--slice-2)",
  "var(--slice-3)",
  "var(--slice-4)",
  "var(--slice-5)",
  "var(--slice-6)",
  "var(--slice-7)",
  "var(--slice-8)",
];

/** Above this many options a donut turns into unreadable slivers, and the
 *  option text stops fitting beside it. Bars carry both without crowding. */
const DONUT_MAX = 6;

/** Bars are cheap but a hundred of them is not a chart, it is a table. What is
 *  cut is always named underneath — see `moreOptions`. */
const BAR_MAX = 12;

export function ColumnCharts({ columns }: { columns: Column[] }) {
  const t = useTranslations("Dataset");

  return (
    <div className="space-y-5">
      {columns.map((col) => (
        <div key={col.question_text} className="card p-5">
          <h3 className="text-sm leading-snug font-bold text-ink">{col.question_text}</h3>
          <p className="tnum mt-1 text-xs font-medium text-faint">
            {t("responses", { count: col.summary_json.responseCount })}
          </p>
          <div className="mt-4">
            <ColumnChart summary={col.summary_json} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ColumnChart({ summary }: { summary: ColumnSummary }) {
  if (summary.type === "categorical") return <CategoricalChart summary={summary} />;
  if (summary.type === "numeric") return <NumericChart summary={summary} />;
  if (summary.type === "date") return <DateRange summary={summary} />;
  return <TopTerms summary={summary} />;
}

// ── Categorical ────────────────────────────────────────────────────────────

function CategoricalChart({ summary }: { summary: Categorical }) {
  return summary.counts.length <= DONUT_MAX ? (
    <Donut summary={summary} />
  ) : (
    <OptionBars summary={summary} />
  );
}

/**
 * Six options or fewer: a donut plus a legend carrying the numbers.
 *
 * The chart itself is aria-hidden and the legend is an ordinary list, so the
 * figures reach a screen reader as text rather than as a shape. That is also
 * why the legend repeats every count instead of relying on the on-slice labels,
 * which are suppressed below 8% to stop them colliding.
 */
function Donut({ summary }: { summary: Categorical }) {
  const format = useFormatter();
  const { counts, responseCount } = summary;
  const share = (n: number) => (responseCount > 0 ? n / responseCount : 0);

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:gap-6">
      <div className="h-52 w-52 shrink-0" aria-hidden="true">
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={counts}
              dataKey="count"
              nameKey="value"
              innerRadius="58%"
              outerRadius="92%"
              paddingAngle={counts.length > 1 ? 2 : 0}
              stroke="var(--card)"
              strokeWidth={2}
              isAnimationActive={false}
              labelLine={false}
              label={SliceLabel}
            >
              {counts.map((c, i) => (
                <Cell key={c.value} fill={SLICES[i % SLICES.length]} />
              ))}
            </Pie>
            <Tooltip content={<SliceTooltip total={responseCount} />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <ul className="w-full min-w-0 space-y-2">
        {counts.map((c, i) => (
          <li key={c.value} className="flex items-baseline gap-2.5 text-sm">
            <span
              className="mt-1.5 size-2.5 shrink-0 rounded-full"
              style={{ background: SLICES[i % SLICES.length] }}
            />
            <span className="min-w-0 flex-1 break-words text-ink">{c.value}</span>
            <span className="tnum shrink-0 font-semibold text-soft">
              {format.number(c.count)}
            </span>
            <span className="tnum w-14 shrink-0 text-right text-xs font-medium text-faint">
              {format.number(share(c.count), PERCENT)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const RAD = Math.PI / 180;

function SliceLabel({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: {
  cx?: number;
  cy?: number;
  midAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
  percent?: number;
}) {
  // A sliver cannot hold its own label, and a label that overflows its slice is
  // worse than none — the legend already has the number.
  if (percent === undefined || percent < 0.08) return null;
  if (cx === undefined || cy === undefined || midAngle === undefined) return null;
  if (innerRadius === undefined || outerRadius === undefined) return null;

  const r = innerRadius + (outerRadius - innerRadius) * 0.55;
  return (
    <text
      x={cx + r * Math.cos(-midAngle * RAD)}
      y={cy + r * Math.sin(-midAngle * RAD)}
      fill="#fff"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={11}
      fontWeight={700}
      // The palette spans light gold to deep indigo, so no single fill reads
      // cleanly on every slice. Painting a dark stroke beneath the glyphs keeps
      // the label legible on all eight without muddying the colours.
      stroke="rgba(0, 0, 0, 0.35)"
      strokeWidth={2.5}
      paintOrder="stroke"
    >
      {Math.round(percent * 100)}%
    </text>
  );
}

/**
 * Seven or more options: horizontal bars in plain HTML rather than SVG.
 *
 * Deliberate. Option text in Uzbek and Russian runs long, and an SVG axis label
 * has to be clipped to a fixed width — which is how the previous chart lost the
 * end of nearly every answer. HTML wraps, so the full option is always legible,
 * and it reaches assistive tech as text without any aria scaffolding.
 *
 * Bars are scaled against the largest count, not against the total, so the
 * shape stays readable when no single option is popular. The printed percentage
 * is always of the total, which is the number a reader actually wants.
 */
function OptionBars({ summary }: { summary: Categorical }) {
  const t = useTranslations("Dataset");
  const format = useFormatter();
  const { counts, responseCount } = summary;

  const shown = counts.slice(0, BAR_MAX);
  const hidden = counts.length - shown.length;
  const largest = shown[0]?.count ?? 0;

  return (
    <>
      <ul className="space-y-3">
        {shown.map((c) => (
          <li key={c.value}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 break-words text-sm text-ink">{c.value}</span>
              <span className="tnum shrink-0 text-xs font-semibold whitespace-nowrap text-soft">
                {format.number(c.count)}
                <span className="ml-1.5 font-medium text-faint">
                  {format.number(responseCount > 0 ? c.count / responseCount : 0, PERCENT)}
                </span>
              </span>
            </div>
            <div
              className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full"
              style={{ background: "var(--chart-track)" }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${largest > 0 ? (c.count / largest) * 100 : 0}%`,
                  background: "var(--chart-cat)",
                }}
              />
            </div>
          </li>
        ))}
      </ul>

      {hidden > 0 && (
        <p className="tnum mt-3 text-xs font-medium text-faint">
          {t("moreOptions", { count: hidden })}
        </p>
      )}
    </>
  );
}

// ── Numeric ────────────────────────────────────────────────────────────────

/**
 * A distribution, so it stays a histogram: a pie of age bins would imply the
 * bins are unordered categories. Counts and shares sit above each bar because
 * a tooltip is unreachable on a phone and absent from a screenshot, and these
 * charts get screenshotted into papers.
 */
function NumericChart({ summary }: { summary: Numeric }) {
  const t = useTranslations("Dataset");
  const format = useFormatter();
  const { histogram, responseCount } = summary;

  const rows = histogram.map((h) => ({
    ...h,
    share:
      responseCount > 0
        ? format.number(h.count / responseCount, PERCENT)
        : "",
  }));

  return (
    <>
      <div
        className="h-72 w-full"
        role="img"
        aria-label={t("responses", { count: responseCount })}
      >
        <ResponsiveContainer>
          <BarChart data={rows} margin={{ top: 26, right: 4, left: -18, bottom: 0 }}>
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
            <Tooltip
              content={<SliceTooltip total={responseCount} />}
              cursor={{ fill: "var(--mint-soft)", opacity: 0.5 }}
            />
            <Bar
              dataKey="count"
              fill="var(--chart-num)"
              radius={[4, 4, 0, 0]}
              maxBarSize={44}
              isAnimationActive={false}
            >
              {/* Two stacked LabelLists rather than one custom renderer:
                  LabelList's dataKey contract is stable, whereas a `label`
                  render prop only receives the datum's other fields by
                  accident of how recharts spreads them. */}
              <LabelList
                dataKey="count"
                position="top"
                offset={14}
                fontSize={11}
                fontWeight={700}
                fill="var(--ink)"
                formatter={hideEmpty}
              />
              <LabelList
                dataKey="share"
                position="top"
                offset={3}
                fontSize={9}
                fill="var(--chart-axis)"
                formatter={hideEmpty}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1">
        {[
          t("statMin", { value: summary.min }),
          t("statMax", { value: summary.max }),
          t("statMean", { value: summary.mean.toFixed(2) }),
          t("statMedian", { value: summary.median }),
        ].map((s) => (
          <span key={s} className="chip tnum bg-card-soft text-soft">
            {s}
          </span>
        ))}
      </div>
    </>
  );
}

/** An empty bin carries no information, so it carries no label either. */
function hideEmpty(value: unknown): string {
  if (value === 0 || value === "0%" || value === null || value === undefined) return "";
  return String(value);
}

// ── Shared tooltip ─────────────────────────────────────────────────────────

function SliceTooltip({
  active,
  payload,
  total,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number; payload?: { value?: string; bin?: string } }[];
  total: number;
}) {
  if (!active || !payload?.length) return null;

  const entry = payload[0];
  const count = entry.value ?? 0;
  const label = entry.payload?.value ?? entry.payload?.bin ?? entry.name ?? "";
  const share = total > 0 ? Math.round((count / total) * 1000) / 10 : 0;

  return (
    <div className="rounded-xl border border-line bg-card px-3 py-2 text-xs shadow-lift">
      <p className="max-w-[220px] font-semibold text-ink">{label}</p>
      <p className="tnum mt-0.5 text-soft">
        {count} · {share}%
      </p>
    </div>
  );
}

// ── Date & free text (unchanged in substance) ──────────────────────────────

function DateRange({ summary }: { summary: DateSummary }) {
  const format = useFormatter();
  // Bare toLocaleDateString() resolves against the server's locale, not the
  // visitor's, so a Russian or Uzbek reader was shown American month/day order.
  const day = (iso: string) => format.dateTime(new Date(iso), { dateStyle: "medium" });

  return (
    <p className="tnum text-sm text-soft">
      {summary.min ? day(summary.min) : "—"} – {summary.max ? day(summary.max) : "—"}
    </p>
  );
}

function TopTerms({ summary }: { summary: TextSummary }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {summary.topTerms.map((term) => (
        <li key={term.term} className="chip bg-brand-soft text-brand-ink">
          {term.term}
          <span className="tnum opacity-70">{term.count}</span>
        </li>
      ))}
    </ul>
  );
}
