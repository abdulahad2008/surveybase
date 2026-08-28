import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Papa from "papaparse";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import type { ColumnSummary } from "@/lib/csv-analysis";
import { routing, type Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { SITE_NAME, localeAlternates, localeUrl } from "@/lib/site";
import { citationYear, fullCitation } from "@/lib/citation";
import {
  datasetDescription,
  datasetJsonLd,
  type DescribableDataset,
} from "@/lib/dataset-jsonld";
import { topicColor } from "@/lib/topic-colors";
import { methodLabel, topicLabel } from "@/lib/survey-vocab";
import { CopyButton } from "@/components/copy-button";
import {
  ArrowLeftIcon,
  CalendarIcon,
  DownloadIcon,
  ExternalLinkIcon,
  FileTextIcon,
  GlobeIcon,
  QuoteIcon,
  UsersIcon,
} from "@/components/icons";
import { ColumnCharts } from "./column-charts";
import { DataTable, TABLE_ROW_LIMIT } from "./data-table";
import { Reviews, type ReviewRow } from "./reviews";

interface SurveyColumnRow {
  question_text: string;
  column_type: string;
  summary_json: ColumnSummary;
}

interface PublicationRow {
  title: string;
  authors: string | null;
  year: number | null;
  doi_or_url: string | null;
}

interface DatasetRow {
  id: string;
  title: string;
  slug: string;
  abstract: string | null;
  country: string;
  region: string | null;
  topics: string[];
  collection_method: string | null;
  collection_platform: string | null;
  sample_size: number | null;
  target_population: string | null;
  fieldwork_start: string | null;
  fieldwork_end: string | null;
  languages: string[];
  license: string;
  questionnaire_text: string | null;
  is_hosted: boolean;
  external_url: string | null;
  status: string;
  rejection_reason: string | null;
  depositor_id: string | null;
  source_organization: string | null;
  download_count: number;
  created_at: string;
  depositor: { id: string; name: string | null; affiliation: string | null } | null;
  survey_columns: SurveyColumnRow[];
  files: { storage_path: string; format: string }[];
  dataset_publications: { publications: PublicationRow | null }[];
  reviews: ReviewRow[];
}

// Metadata columns only — this runs as a second query alongside the page's own,
// so it stays as narrow as possible.
interface DatasetMetaRow extends DescribableDataset {
  title: string;
  status: string;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale: Locale = hasLocale(routing.locales, rawLocale) ? rawLocale : routing.defaultLocale;

  const supabase = await createClient();
  const { data } = await supabase
    .from("datasets")
    .select("title, abstract, country, region, topics, sample_size, status")
    .eq("slug", slug)
    .maybeSingle();

  const dataset = data as DatasetMetaRow | null;
  if (!dataset) return {};

  const path = `/datasets/${slug}`;
  const description = datasetDescription(dataset);

  return {
    title: dataset.title,
    description,
    alternates: { canonical: localeUrl(locale, path), languages: localeAlternates(path) },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title: dataset.title,
      description,
      url: localeUrl(locale, path),
    },
    // Drafts, pending deposits and rejections still render — for their depositor
    // and for moderators — so they have to be kept out of the index explicitly.
    ...(dataset.status === "published" ? {} : { robots: { index: false, follow: false } }),
  };
}

export default async function DatasetPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("datasets")
    .select(
      `*,
      depositor:profiles!datasets_depositor_id_fkey ( id, name, affiliation ),
      survey_columns ( question_text, column_type, summary_json ),
      files ( storage_path, format ),
      dataset_publications ( publications ( title, authors, year, doi_or_url ) ),
      reviews ( id, user_id, rating, comment, created_at, reviewer:profiles!reviews_user_id_fkey ( name ) )`,
    )
    .eq("slug", slug)
    .maybeSingle();

  const dataset = data as unknown as DatasetRow | null;
  if (!dataset) notFound();

  const t = await getTranslations("Dataset");
  const v = await getTranslations("Vocab");
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const csvFile = dataset.files.find((f) => f.format === "csv");
  let headers: string[] = [];
  let rows: Record<string, string>[] = [];
  let totalRows = 0;

  if (csvFile) {
    const { data: publicUrlData } = supabase.storage
      .from("dataset-files")
      .getPublicUrl(csvFile.storage_path);
    // A published dataset's file never changes — a correction is a new deposit —
    // so re-downloading and re-parsing the whole CSV on every request bought
    // nothing. Five minutes is short enough that an approval shows up quickly
    // and long enough that a dataset being read by a class is parsed once.
    const response = await fetch(publicUrlData.publicUrl, { next: { revalidate: 300 } });
    if (response.ok) {
      const csvText = await response.text();
      const parsed = Papa.parse<Record<string, string>>(csvText, {
        header: true,
        skipEmptyLines: true,
      });
      headers = parsed.meta.fields ?? [];
      totalRows = parsed.data.length;
      // Only the first page-worth of rows crosses the wire. Every row used to
      // be serialised into the RSC payload so the browser could paginate 20 at
      // a time — a 5,000-row survey shipped 5,000 rows to show 20 of them, on
      // connections where that is the whole cost of the page. The charts read
      // `summary_json`, not this, so they still describe the entire dataset.
      rows = parsed.data.slice(0, TABLE_ROW_LIMIT);
    }
  }

  // Column name → inferred type, so the table can sort a numeric column by
  // value. Built from the same rows the charts use, not re-inferred here.
  const columnTypes = Object.fromEntries(
    dataset.survey_columns.map((c) => [c.question_text, c.column_type]),
  );

  const orderedColumns = headers
    .map((h) => dataset.survey_columns.find((c) => c.question_text === h))
    .filter((c): c is SurveyColumnRow => Boolean(c));

  const citation = fullCitation(
    {
      title: dataset.title,
      author: dataset.depositor?.name ?? null,
      sourceOrganization: dataset.source_organization,
      year: citationYear(dataset.fieldwork_start, new Date(dataset.created_at)),
    },
    dataset.slug,
  );

  const publications = dataset.dataset_publications
    .map((dp) => dp.publications)
    .filter((p): p is PublicationRow => Boolean(p));

  const nf = new Intl.NumberFormat(locale);
  const fieldworkYearRange =
    dataset.fieldwork_start || dataset.fieldwork_end
      ? [
          dataset.fieldwork_start ? new Date(dataset.fieldwork_start).getFullYear() : "?",
          dataset.fieldwork_end ? new Date(dataset.fieldwork_end).getFullYear() : "?",
        ]
          .filter((v, i, arr) => i === 0 || v !== arr[0])
          .join("–")
      : null;

  // Only published datasets are advertised as structured data — a draft is not a
  // dataset anyone can get. Escaping "<" is what keeps a depositor-supplied
  // title or abstract from closing this script tag: everything in here is
  // user-submitted text.
  const jsonLd =
    dataset.status === "published"
      ? JSON.stringify(
          datasetJsonLd(
            dataset,
            localeUrl(
              hasLocale(routing.locales, locale) ? locale : routing.defaultLocale,
              `/datasets/${dataset.slug}`,
            ),
          ),
        ).replace(/</g, "\\u003c")
      : null;

  return (
    <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
      {jsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      )}
      <Link
        href="/datasets"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-soft transition hover:text-brand"
      >
        <ArrowLeftIcon size={15} />
        {t("backToBrowse")}
      </Link>

      {dataset.status !== "published" && (
        <div className="mt-4 rounded-2xl border border-sun/40 bg-sun-soft px-4 py-3 text-sm text-ink">
          <p className="font-medium">
            {t(dataset.status === "rejected" ? "rejectedBanner" : "pendingBanner")}
          </p>
          {/* The moderator's own words, when there are any. Rejections recorded
              before the column existed have none, and the banner above still
              says everything it used to. */}
          {dataset.status === "rejected" && dataset.rejection_reason && (
            <>
              <p className="mt-3 text-xs font-semibold tracking-wide text-faint uppercase">
                {t("rejectedReasonHeading")}
              </p>
              <p className="mt-1 leading-relaxed whitespace-pre-line">
                {dataset.rejection_reason}
              </p>
            </>
          )}
        </div>
      )}

      {/* header */}
      <header className="mt-6 max-w-3xl">
        {dataset.topics.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {dataset.topics.map((topic) => {
              const c = topicColor(topic);
              return (
                <Link
                  key={topic}
                  href={`/datasets?topic=${encodeURIComponent(topic)}`}
                  className="chip transition hover:scale-105"
                  style={{ background: c.bg, color: c.text }}
                >
                  {topicLabel(topic, v)}
                </Link>
              );
            })}
          </div>
        )}
        <h1 className="font-display mt-4 text-3xl leading-tight font-extrabold tracking-tight text-ink sm:text-4xl">
          {dataset.title}
        </h1>
        {dataset.abstract && (
          <p className="mt-3 text-base leading-relaxed text-soft wrap-anywhere">
            {dataset.abstract}
          </p>
        )}
        {dataset.depositor?.name && (
          <p className="mt-3 text-sm text-faint">
            {t("depositedBy")}{" "}
            <Link
              href={`/users/${dataset.depositor.id}`}
              className="font-semibold text-soft underline-offset-2 transition hover:text-brand hover:underline"
            >
              {dataset.depositor.name}
            </Link>
            {dataset.depositor.affiliation ? ` · ${dataset.depositor.affiliation}` : ""}
          </p>
        )}
      </header>

      {/* stat tiles */}
      <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {dataset.sample_size != null && (
          <StatTile
            icon={<UsersIcon size={17} />}
            bg="var(--brand-soft)"
            color="var(--brand)"
            value={nf.format(dataset.sample_size)}
            label={t("metadataSampleSize")}
          />
        )}
        <StatTile
          icon={<DownloadIcon size={17} />}
          bg="var(--mint-soft)"
          color="var(--mint)"
          value={nf.format(dataset.download_count)}
          label={t("statDownloads")}
        />
        {fieldworkYearRange && (
          <StatTile
            icon={<CalendarIcon size={17} />}
            bg="var(--sun-soft)"
            color="var(--sun)"
            value={fieldworkYearRange}
            label={t("metadataFieldwork")}
          />
        )}
        <StatTile
          icon={<GlobeIcon size={17} />}
          bg="var(--sky-soft)"
          color="var(--sky)"
          value={dataset.country}
          label={t("metadataCountry")}
        />
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_320px] lg:items-start">
        {/* ------------------- main column ------------------- */}
        <div className="min-w-0 space-y-10">
          {/* metadata */}
          <section className="card p-6">
            <h2 className="font-display text-lg font-bold text-ink">{t("aboutHeading")}</h2>
            <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
              <Meta label={t("metadataCountry")} value={[dataset.country, dataset.region].filter(Boolean).join(" · ")} />
              <Meta label={t("metadataTargetPopulation")} value={dataset.target_population} />
              <Meta
                label={t("metadataCollectionMethod")}
                value={
                  dataset.collection_method
                    ? methodLabel(dataset.collection_method, v)
                    : null
                }
              />
              <Meta label={t("metadataPlatform")} value={dataset.collection_platform ?? null} />
              <Meta
                label={t("metadataFieldwork")}
                value={
                  dataset.fieldwork_start || dataset.fieldwork_end
                    ? `${dataset.fieldwork_start ?? "?"} – ${dataset.fieldwork_end ?? "?"}`
                    : undefined
                }
              />
              <Meta label={t("metadataLanguages")} value={dataset.languages.join(", ")} />
              <Meta label={t("metadataLicense")} value={dataset.license} />
            </dl>
          </section>

          {/* questionnaire */}
          {dataset.questionnaire_text && (
            <section className="card p-6">
              <h2 className="font-display flex items-center gap-2 text-lg font-bold text-ink">
                <FileTextIcon size={18} className="text-brand" />
                {t("metadataQuestionnaire")}
              </h2>
              <p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap text-soft">
                {dataset.questionnaire_text}
              </p>
            </section>
          )}

          {/* publications */}
          {publications.length > 0 && (
            <section className="card p-6">
              <h2 className="font-display text-lg font-bold text-ink">{t("publicationsHeading")}</h2>
              <ul className="mt-3 space-y-3 text-sm">
                {publications.map((p, i) => (
                  <li key={i} className="rounded-xl bg-card-soft p-3.5 leading-relaxed wrap-anywhere">
                    <span className="font-semibold text-ink">{p.title}</span>
                    <span className="text-soft">
                      {p.authors ? ` — ${p.authors}` : ""}
                      {p.year ? ` (${p.year})` : ""}
                    </span>
                    {p.doi_or_url && (
                      <a
                        href={p.doi_or_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 flex min-w-0 items-center gap-1 text-brand hover:underline"
                      >
                        <ExternalLinkIcon size={13} className="shrink-0" />
                        <span className="truncate">{p.doi_or_url}</span>
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* charts */}
          {orderedColumns.length > 0 && (
            <section>
              <h2 className="font-display text-2xl font-extrabold tracking-tight text-ink">
                {t("questionsHeading")}
              </h2>
              <p className="mt-1 mb-5 text-sm text-soft">{t("questionsSubtitle")}</p>
              <ColumnCharts columns={orderedColumns} />
            </section>
          )}

          {/* data table */}
          {headers.length > 0 && (
            <section>
              <h2 className="font-display mb-5 text-2xl font-extrabold tracking-tight text-ink">
                {t("dataHeading")}
              </h2>
              <DataTable
                headers={headers}
                rows={rows}
                totalRows={totalRows}
                columnTypes={columnTypes}
                downloadHref={`/api/datasets/${dataset.slug}/download/csv`}
              />
            </section>
          )}

          <Reviews
            locale={locale as Locale}
            slug={dataset.slug}
            reviews={dataset.reviews}
            currentUserId={user?.id ?? null}
          />
        </div>

        {/* ------------------- side rail ------------------- */}
        <aside className="space-y-5 lg:sticky lg:top-20">
          {/* download panel */}
          <div className="card p-6">
            <h2 className="font-display flex items-center gap-2 text-base font-bold text-ink">
              <DownloadIcon size={17} className="text-brand" />
              {t("downloadsHeading")}
            </h2>
            {!dataset.is_hosted ? (
              <div className="mt-4 space-y-3">
                <a
                  href={`/api/datasets/${dataset.slug}/visit`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-primary w-full"
                >
                  <ExternalLinkIcon size={15} />
                  {t("viewAtSourceButton")}
                </a>
                <p className="tnum text-center text-xs font-medium text-faint">
                  {t("visitCount", {
                    count: dataset.download_count,
                    value: nf.format(dataset.download_count),
                  })}
                </p>
                <p className="text-xs leading-relaxed text-faint">{t("viewAtSourceNote")}</p>
              </div>
            ) : csvFile ? (
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  {(["csv", "xlsx", "json"] as const).map((format) => (
                    <a
                      key={format}
                      href={`/api/datasets/${dataset.slug}/download/${format}`}
                      className="btn btn-soft btn-sm justify-center"
                    >
                      {format.toUpperCase()}
                    </a>
                  ))}
                </div>
                <p className="tnum text-center text-xs font-medium text-faint">
                  {t("downloadCount", {
                    count: dataset.download_count,
                    value: nf.format(dataset.download_count),
                  })}
                </p>
              </div>
            ) : (
              <p className="mt-3 text-sm text-faint">{t("noFileYet")}</p>
            )}
          </div>

          {/* citation */}
          <div className="card border-brand/20 bg-brand-wash p-6">
            <h2 className="font-display flex items-center gap-2 text-base font-bold text-ink">
              <QuoteIcon size={17} className="text-brand" />
              {t("howToCiteHeading")}
            </h2>
            <p className="mt-3 rounded-xl bg-card p-3.5 font-mono text-xs leading-relaxed wrap-anywhere text-soft">
              {citation}
            </p>
            <div className="mt-3">
              <CopyButton text={citation} label={t("copyCitation")} copiedLabel={t("citationCopied")} />
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

function StatTile({
  icon,
  bg,
  color,
  value,
  label,
}: {
  icon: React.ReactNode;
  bg: string;
  color: string;
  value: string;
  label: string;
}) {
  return (
    <div className="card flex items-center gap-3.5 p-4">
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{ background: bg, color }}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="font-display tnum text-lg leading-tight font-extrabold text-ink wrap-anywhere">
          {value}
        </p>
        <p className="mt-0.5 text-[11px] font-semibold tracking-wide text-faint uppercase">{label}</p>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-[11px] font-semibold tracking-wide text-faint uppercase">{label}</dt>
      <dd className="mt-0.5 font-medium text-ink">{value}</dd>
    </div>
  );
}
