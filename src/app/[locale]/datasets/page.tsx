import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { queryDatasets, getFilterOptions, type DatasetFilters } from "@/lib/datasets";
import { methodLabel, topicLabel } from "@/lib/survey-vocab";
import { DatasetCard } from "./dataset-card";
import { ArrowLeftIcon, ArrowRightIcon, SearchIcon } from "@/components/icons";

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
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<RawSearchParams>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const t = await getTranslations("Browse");
  const v = await getTranslations("Vocab");
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
  const activeFilterCount = [
    filters.topic,
    filters.method,
    filters.language,
    filters.yearFrom,
    filters.yearTo,
    filters.sampleMin,
    filters.sampleMax,
  ].filter((v) => v != null).length;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">
            {t("heading")}
          </h1>
          <p className="mt-1 text-sm text-soft">{t("resultsCount", { count: total })}</p>
        </div>
      </div>

      <form method="get" className="mt-6 lg:grid lg:grid-cols-[280px_1fr] lg:items-start lg:gap-8">
        {/* keep sort when re-filtering */}
        <div className="contents">
          {/* -------- filter rail -------- */}
          <aside className="card space-y-5 p-5 lg:sticky lg:top-20">
            <div className="flex items-center justify-between">
              <p className="font-display text-sm font-bold text-ink">
                {t("filtersHeading")}
                {activeFilterCount > 0 && (
                  <span className="ml-2 rounded-full bg-brand px-2 py-0.5 text-xs font-bold text-on-brand">
                    {activeFilterCount}
                  </span>
                )}
              </p>
              <Link href="/datasets" className="text-xs font-semibold text-brand hover:underline">
                {t("resetFilters")}
              </Link>
            </div>

            <div>
              <label className="label" htmlFor="filter-q">
                {t("searchLabel")}
              </label>
              <div className="relative">
                <SearchIcon
                  size={15}
                  className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-faint"
                />
                <input
                  id="filter-q"
                  type="search"
                  name="q"
                  defaultValue={filters.q ?? ""}
                  placeholder={t("searchPlaceholder")}
                  className="input pl-9"
                />
              </div>
            </div>

            <SelectField
              name="topic"
              label={t("filterTopic")}
              value={filters.topic}
              options={options.topics.map((o) => ({ value: o, label: topicLabel(o, v) }))}
              allLabel={t("filterAll")}
            />
            <SelectField
              name="method"
              label={t("filterMethod")}
              value={filters.method}
              options={options.methods.map((o) => ({ value: o, label: methodLabel(o, v) }))}
              allLabel={t("filterAll")}
            />
            <SelectField
              name="language"
              label={t("filterLanguage")}
              value={filters.language}
              options={options.languages.map((o) => ({ value: o, label: o }))}
              allLabel={t("filterAll")}
            />

            <div className="grid grid-cols-2 gap-3">
              <NumberField name="yearFrom" label={t("filterYearFrom")} value={filters.yearFrom} />
              <NumberField name="yearTo" label={t("filterYearTo")} value={filters.yearTo} />
              <NumberField name="sampleMin" label={t("filterSampleMin")} value={filters.sampleMin} />
              <NumberField name="sampleMax" label={t("filterSampleMax")} value={filters.sampleMax} />
            </div>

            <div>
              <label className="label" htmlFor="filter-sort">
                {t("sortLabel")}
              </label>
              <select id="filter-sort" name="sort" defaultValue={filters.sort} className="input">
                <option value="newest">{t("sortNewest")}</option>
                <option value="downloads">{t("sortDownloads")}</option>
              </select>
            </div>

            <button type="submit" className="btn btn-primary w-full">
              {t("applyFilters")}
            </button>
          </aside>

          {/* -------- results -------- */}
          <section className="mt-8 lg:mt-0">
            {datasets.length === 0 ? (
              <div className="card flex flex-col items-center gap-3 p-12 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft text-brand">
                  <SearchIcon size={24} />
                </span>
                <p className="font-display text-lg font-bold text-ink">{t("noResultsHeading")}</p>
                <p className="max-w-sm text-sm text-soft">{t("noResults")}</p>
                <Link href="/datasets" className="btn btn-soft btn-sm mt-2">
                  {t("resetFilters")}
                </Link>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {datasets.map((d) => (
                  <DatasetCard key={d.id} dataset={d} locale={locale} />
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <nav className="mt-8 flex items-center justify-between text-sm" aria-label={t("pageLabel", { page, total: totalPages })}>
                {page > 1 ? (
                  <Link href={buildPageHref(sp, page - 1)} className="btn btn-ghost btn-sm">
                    <ArrowLeftIcon size={14} />
                    {t("prevPage")}
                  </Link>
                ) : (
                  <span className="btn btn-ghost btn-sm opacity-40" aria-disabled>
                    <ArrowLeftIcon size={14} />
                    {t("prevPage")}
                  </span>
                )}
                <span className="tnum font-semibold text-soft">
                  {t("pageLabel", { page, total: totalPages })}
                </span>
                {page < totalPages ? (
                  <Link href={buildPageHref(sp, page + 1)} className="btn btn-ghost btn-sm">
                    {t("nextPage")}
                    <ArrowRightIcon size={14} />
                  </Link>
                ) : (
                  <span className="btn btn-ghost btn-sm opacity-40" aria-disabled>
                    {t("nextPage")}
                    <ArrowRightIcon size={14} />
                  </span>
                )}
              </nav>
            )}
          </section>
        </div>
      </form>
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
  // Value and label are separate because the stored facet is canonical
  // English: translating it in place would send a Russian label to a filter
  // that matches on the English one and return nothing.
  options: { value: string; label: string }[];
  allLabel: string;
}) {
  return (
    <div>
      <label className="label" htmlFor={`filter-${name}`}>
        {label}
      </label>
      <select id={`filter-${name}`} name={name} defaultValue={value ?? ""} className="input">
        <option value="">{allLabel}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function NumberField({ name, label, value }: { name: string; label: string; value?: number }) {
  return (
    <div>
      <label className="label" htmlFor={`filter-${name}`}>
        {label}
      </label>
      <input
        id={`filter-${name}`}
        type="number"
        name={name}
        defaultValue={value ?? ""}
        className="input tnum"
      />
    </div>
  );
}
