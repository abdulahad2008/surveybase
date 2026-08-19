import type { SupabaseClient } from "@supabase/supabase-js";

export interface DatasetSummary {
  id: string;
  title: string;
  slug: string;
  abstract: string | null;
  country: string;
  region: string | null;
  topics: string[];
  collection_method: string | null;
  sample_size: number | null;
  fieldwork_start: string | null;
  fieldwork_end: string | null;
  languages: string[];
  download_count: number;
  created_at: string;
}

export interface DatasetFilters {
  q?: string;
  topic?: string;
  method?: string;
  language?: string;
  yearFrom?: number;
  yearTo?: number;
  sampleMin?: number;
  sampleMax?: number;
  sort?: "newest" | "downloads";
  page?: number;
  pageSize?: number;
}

export interface FilterOptions {
  topics: string[];
  methods: string[];
  languages: string[];
}

const SUMMARY_COLUMNS =
  "id, title, slug, abstract, country, region, topics, collection_method, sample_size, fieldwork_start, fieldwork_end, languages, download_count, created_at";

export async function queryDatasets(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  filters: DatasetFilters,
): Promise<{ datasets: DatasetSummary[]; total: number }> {
  const pageSize = filters.pageSize ?? 12;
  const page = filters.page ?? 1;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("datasets")
    .select(SUMMARY_COLUMNS, { count: "exact" })
    .eq("status", "published");

  if (filters.q) {
    query = query.textSearch("search_vector", filters.q, { type: "websearch", config: "simple" });
  }
  if (filters.topic) query = query.contains("topics", [filters.topic]);
  if (filters.method) query = query.eq("collection_method", filters.method);
  if (filters.language) query = query.contains("languages", [filters.language]);
  if (filters.yearFrom) query = query.gte("fieldwork_start", `${filters.yearFrom}-01-01`);
  if (filters.yearTo) query = query.lte("fieldwork_start", `${filters.yearTo}-12-31`);
  if (filters.sampleMin != null) query = query.gte("sample_size", filters.sampleMin);
  if (filters.sampleMax != null) query = query.lte("sample_size", filters.sampleMax);

  query =
    filters.sort === "downloads"
      ? query.order("download_count", { ascending: false })
      : query.order("created_at", { ascending: false });

  const { data, count } = await query.range(from, to);
  return { datasets: (data as unknown as DatasetSummary[]) ?? [], total: count ?? 0 };
}

export interface ArchiveStats {
  datasetCount: number;
  totalRespondents: number;
  totalDownloads: number;
  topicCount: number;
}

export async function getArchiveStats(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
): Promise<ArchiveStats> {
  const { data, count } = await supabase
    .from("datasets")
    .select("sample_size, download_count, topics", { count: "exact" })
    .eq("status", "published");

  let totalRespondents = 0;
  let totalDownloads = 0;
  const topics = new Set<string>();
  for (const row of (data as { sample_size: number | null; download_count: number; topics: string[] }[]) ?? []) {
    totalRespondents += row.sample_size ?? 0;
    totalDownloads += row.download_count ?? 0;
    for (const t of row.topics ?? []) topics.add(t);
  }
  return {
    datasetCount: Math.max(count ?? 0, envFloor("STATS_MIN_DATASETS")),
    totalRespondents,
    totalDownloads: Math.max(totalDownloads, envFloor("STATS_MIN_DOWNLOADS")),
    topicCount: topics.size,
  };
}

/**
 * Display floors for the homepage counters.
 *
 * These let the homepage show a minimum figure while the archive is still
 * filling up. They are a *floor*, not an offset or an override: once the real
 * number passes the floor the real number is shown and the setting becomes
 * inert, so it cannot silently drift further from the truth over time.
 *
 * Unset (the default, and what the repo ships with) means no floor at all and
 * the counters show exactly what is in the database. Set them per environment
 * in the Vercel project settings, not here.
 *
 * Only the homepage summary is affected. Per-dataset download counts are never
 * adjusted — those are what a depositor sees about their own data.
 */
function envFloor(name: "STATS_MIN_DATASETS" | "STATS_MIN_DOWNLOADS"): number {
  const parsed = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export async function getFilterOptions(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
): Promise<FilterOptions> {
  const { data } = await supabase
    .from("datasets")
    .select("topics, collection_method, languages")
    .eq("status", "published");

  const topics = new Set<string>();
  const methods = new Set<string>();
  const languages = new Set<string>();
  for (const row of (data as { topics: string[]; collection_method: string | null; languages: string[] }[]) ?? []) {
    for (const t of row.topics ?? []) topics.add(t);
    for (const l of row.languages ?? []) languages.add(l);
    if (row.collection_method) methods.add(row.collection_method);
  }
  return {
    topics: [...topics].sort(),
    methods: [...methods].sort(),
    languages: [...languages].sort(),
  };
}
