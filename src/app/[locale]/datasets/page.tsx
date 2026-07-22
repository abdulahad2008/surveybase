import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { queryDatasets, getFilterOptions, type DatasetFilters } from "@/lib/datasets";
import { DatasetCard } from "./dataset-card";

const PAGE_SIZE = 12;

type RawSearchParams = Record<string, string | string[] | undefined>;

function parseIntParam(value: string | string[] | undefined): number | undefined {
  if (typeof value !== "string" || value.trim() === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function parseStringParam(value: string | string[] | undefined): string | undefined {
  if (typeof value !== "string" || value.trim() === "") return undefined;
  return value;
}

function buildPageHref(sp: RawSearchParams, page: number): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (key === "page") continue;
    if (typeof value === "string" && value !== "") params.set(key, value);
  }
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/datasets?${qs}` : "/datasets";
}

export default async function DatasetsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const sp = await searchParams;
  const t = await getTranslations("Browse");
  const supabase = await createClient();

  const filters: DatasetFilters = {
    q: parseStringParam(sp.q),
    topic: parseStringParam(sp.topic),
    method: parseStringParam(sp.method),
    language: parseStringParam(sp.language),
    yearFrom: parseIntParam(sp.yearFrom),
    yearTo: parseIntParam(sp.yearTo),
    sampleMin: parseIntParam(sp.sampleMin),
    sampleMax: parseIntParam(sp.sampleMax),
    sort: sp.sort === "downloads" ? "downloads" : "newest",
    page: parseIntParam(sp.page) ?? 1,
    pageSize: PAGE_SIZE,
  };
  const page = filters.page ?? 1;

  const [{ datasets, total }, options] = await Promise.all([
    queryDatasets(supabase, filters),
    getFilterOptions(supabase),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-6 py-10">
      <h1 className="text-2xl font-semibold">{t("heading")}</h1>

      <form
        method="get"
        className="grid grid-cols-2 gap-4 rounded border border-gray-200 p-4 text-sm dark:border-gray-800 sm:grid-cols-3 lg:grid-cols-4"
      >
        <label className="col-span-2 space-y-1 sm:col-span-3 lg:col-span-4">
          <span className="font-medium">{t("searchLabel")}</span>
          <input
            type="search"
            name="q"
            defaultValue={filters.q ?? ""}
            placeholder={t("searchPlaceholder")}
            className="w-full rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          />
        </label>

        <SelectField name="topic" label={t("filterTopic")} value={filters.topic} options={options.topics} allLabel={t("filterAll")} />
        <SelectField name="method" label={t("filterMethod")} value={filters.method} options={options.methods} allLabel={t("filterAll")} />
        <SelectField name="language" label={t("filterLanguage")} value={filters.language} options={options.languages} allLabel={t("filterAll")} />

        <label className="space-y-1">
          <span className="font-medium">{t("sortLabel")}</span>
          <select
            name="sort"
            defaultValue={filters.sort}
            className="w-full rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          >
            <option value="newest">{t("sortNewest")}</option>
            <option value="downloads">{t("sortDownloads")}</option>
          </select>
        </label>

        <NumberField name="yearFrom" label={t("filterYearFrom")} value={filters.yearFrom} />
        <NumberField name="yearTo" label={t("filterYearTo")} value={filters.yearTo} />
        <NumberField name="sampleMin" label={t("filterSampleMin")} value={filters.sampleMin} />
        <NumberField name="sampleMax" label={t("filterSampleMax")} value={filters.sampleMax} />

        <div className="col-span-2 flex flex-wrap items-end gap-2 sm:col-span-3 lg:col-span-4">
          <button
            type="submit"
            className="rounded bg-black px-4 py-2 font-medium text-white dark:bg-white dark:text-black"
          >
            {t("applyFilters")}
          </button>
          <Link
            href="/datasets"
            className="rounded border border-gray-300 px-4 py-2 font-medium dark:border-gray-700"
          >
            {t("resetFilters")}
          </Link>
        </div>
      </form>

      <p className="text-sm text-gray-600 dark:text-gray-400">{t("resultsCount", { count: total })}</p>

      {datasets.length === 0 ? (
        <p className="rounded border border-gray-200 p-6 text-center text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
          {t("noResults")}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {datasets.map((d) => (
            <DatasetCard key={d.id} dataset={d} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          {page > 1 ? (
            <Link href={buildPageHref(sp, page - 1)}>{t("prevPage")}</Link>
          ) : (
            <span className="text-gray-400 dark:text-gray-600">{t("prevPage")}</span>
          )}
          <span>{t("pageLabel", { page, total: totalPages })}</span>
          {page < totalPages ? (
            <Link href={buildPageHref(sp, page + 1)}>{t("nextPage")}</Link>
          ) : (
            <span className="text-gray-400 dark:text-gray-600">{t("nextPage")}</span>
          )}
        </div>
      )}
    </main>
  );
}

function SelectField({
  name,
  label,
  value,
  options,
  allLabel,
}: {
  name: string;
  label: string;
  value?: string;
  options: string[];
  allLabel: string;
}) {
  return (
    <label className="space-y-1">
      <span className="font-medium">{label}</span>
      <select
        name={name}
        defaultValue={value ?? ""}
        className="w-full rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
      >
        <option value="">{allLabel}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </label>
  );
}

function NumberField({ name, label, value }: { name: string; label: string; value?: number }) {
  return (
    <label className="space-y-1">
      <span className="font-medium">{label}</span>
      <input
        type="number"
        name={name}
        defaultValue={value ?? ""}
        className="w-full rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
      />
    </label>
  );
}
