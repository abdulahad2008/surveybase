// Column type inference + summary_json computation for uploaded survey data.
// Pure functions, safe to run both in the browser (live preview) and on the
// server (authoritative processing at upload time).

export type ColumnType = "categorical" | "numeric" | "date" | "text";

const DATE_PATTERNS = [
  /^\d{4}-\d{2}-\d{2}$/, // 2024-01-31
  /^\d{4}\/\d{2}\/\d{2}$/, // 2024/01/31
  /^\d{2}\/\d{2}\/\d{4}$/, // 31/01/2024 or 01/31/2024
  /^\d{2}\.\d{2}\.\d{4}$/, // 31.01.2024
  /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/, // ISO timestamp
];

function isNumericString(value: string): boolean {
  const v = value.trim().replace(/,/g, "");
  if (v === "") return false;
  return /^-?\d+(\.\d+)?$/.test(v);
}

function isDateString(value: string): boolean {
  const v = value.trim();
  if (v === "") return false;
  if (!DATE_PATTERNS.some((p) => p.test(v))) return false;
  return !Number.isNaN(Date.parse(v));
}

export function inferColumnType(values: string[]): ColumnType {
  const nonEmpty = values.map((v) => (v ?? "").trim()).filter((v) => v !== "");
  if (nonEmpty.length === 0) return "text";

  const numericCount = nonEmpty.filter(isNumericString).length;
  if (numericCount / nonEmpty.length >= 0.9) return "numeric";

  const dateCount = nonEmpty.filter(isDateString).length;
  if (dateCount / nonEmpty.length >= 0.9) return "date";

  const distinct = new Set(nonEmpty);
  if (distinct.size <= 25 || distinct.size / nonEmpty.length <= 0.2) return "categorical";

  return "text";
}

interface CategoricalSummary {
  type: "categorical";
  counts: { value: string; count: number }[];
  responseCount: number;
}

interface NumericSummary {
  type: "numeric";
  min: number;
  max: number;
  mean: number;
  median: number;
  histogram: { bin: string; count: number }[];
  responseCount: number;
}

interface DateSummary {
  type: "date";
  min: string;
  max: string;
  responseCount: number;
}

interface TextSummary {
  type: "text";
  topTerms: { term: string; count: number }[];
  responseCount: number;
}

export type ColumnSummary = CategoricalSummary | NumericSummary | DateSummary | TextSummary;

const STOPWORDS = new Set([
  "the", "and", "for", "are", "was", "were", "with", "that", "this", "have",
  "has", "not", "but", "you", "your", "from", "она", "или", "как", "что",
  "это", "для", "его", "она", "они", "был", "была", "было", "были",
]);

/**
 * Above this many distinct whole numbers a column is treated as continuous and
 * binned into ranges. Twelve covers the discrete scales surveys actually use —
 * 1–5 and 1–7 Likert, 0–10 net-promoter, household size, months of the year —
 * and stops short of an axis nobody can read.
 */
const MAX_DISCRETE_BINS = 12;

export function computeSummary(type: ColumnType, values: string[]): ColumnSummary {
  const nonEmpty = values.map((v) => (v ?? "").trim()).filter((v) => v !== "");

  if (type === "numeric") {
    const nums = nonEmpty.map((v) => Number(v.replace(/,/g, ""))).filter((n) => !Number.isNaN(n));
    const sorted = [...nums].sort((a, b) => a - b);
    const min = sorted[0] ?? 0;
    const max = sorted[sorted.length - 1] ?? 0;
    const mean = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length
      ? sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid]
      : 0;

    // A Likert column is numeric but not continuous: five possible answers
    // spread over ten range bins gives "1.0–1.4", three empty bins, "2.6–3.0"
    // and so on — a chart that hides the shape of the answers it is drawing.
    // When every value is a whole number and there are few enough of them to
    // fit on an axis, each one gets its own bar, in numeric order.
    const distinct = [...new Set(nums)].sort((a, b) => a - b);
    if (
      nums.length > 0 &&
      distinct.length <= MAX_DISCRETE_BINS &&
      distinct.every((n) => Number.isInteger(n))
    ) {
      const counts = new Map(distinct.map((n) => [n, 0]));
      for (const n of nums) counts.set(n, (counts.get(n) ?? 0) + 1);
      return {
        type: "numeric",
        min,
        max,
        mean,
        median,
        histogram: distinct.map((n) => ({ bin: String(n), count: counts.get(n) ?? 0 })),
        responseCount: nums.length,
      };
    }

    const binCount = 10;
    const span = max - min || 1;
    const binSize = span / binCount;
    // Ten bins of an age column produced labels like "18.0–24.4", and ten of
    // those on a phone axis overlap into noise. A tenth of the span is the
    // smallest difference a label has to express, so that is what sets the
    // precision — whole numbers for ages and counts, decimals only where the
    // bins are genuinely narrower than one unit.
    const decimals = binSize >= 1 ? 0 : binSize >= 0.1 ? 1 : 2;
    const bins = Array.from({ length: binCount }, (_, i) => {
      const lo = min + i * binSize;
      const hi = i === binCount - 1 ? max : lo + binSize;
      return { bin: `${lo.toFixed(decimals)}–${hi.toFixed(decimals)}`, count: 0 };
    });
    for (const n of nums) {
      const idx = Math.min(binCount - 1, Math.floor(((n - min) / span) * binCount));
      bins[idx].count += 1;
    }

    return { type: "numeric", min, max, mean, median, histogram: bins, responseCount: nums.length };
  }

  if (type === "date") {
    const times = nonEmpty.map((v) => Date.parse(v)).filter((t) => !Number.isNaN(t));
    const min = times.length ? new Date(Math.min(...times)).toISOString() : "";
    const max = times.length ? new Date(Math.max(...times)).toISOString() : "";
    return { type: "date", min, max, responseCount: times.length };
  }

  if (type === "categorical") {
    const counts = new Map<string, number>();
    for (const v of nonEmpty) counts.set(v, (counts.get(v) ?? 0) + 1);
    const sorted = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([value, count]) => ({ value, count }));
    return { type: "categorical", counts: sorted, responseCount: nonEmpty.length };
  }

  // text
  const termCounts = new Map<string, number>();
  for (const v of nonEmpty) {
    const words = v
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
    for (const w of words) termCounts.set(w, (termCounts.get(w) ?? 0) + 1);
  }
  const topTerms = [...termCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([term, count]) => ({ term, count }));

  return { type: "text", topTerms, responseCount: nonEmpty.length };
}

/**
 * Bin labels are baked into summary_json at deposit time, so datasets archived
 * before the precision fix above still carry "18.0–24.4". Dropping a trailing
 * ".0" at render time shortens those without a backfill, and is a no-op for
 * bins that genuinely need a decimal.
 */
export function tidyBin(bin: string): string {
  return bin.replace(/(\d)\.0(?=\s*[–-]|$)/g, "$1");
}
