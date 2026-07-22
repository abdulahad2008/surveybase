import { notFound } from "next/navigation";
import Papa from "papaparse";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import type { ColumnSummary } from "@/lib/csv-analysis";
import type { Locale } from "@/i18n/routing";
import { ColumnCharts } from "./column-charts";
import { DataTable } from "./data-table";
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
  depositor_id: string | null;
  download_count: number;
  created_at: string;
  depositor: { name: string | null; affiliation: string | null } | null;
  survey_columns: SurveyColumnRow[];
  files: { storage_path: string; format: string }[];
  dataset_publications: { publications: PublicationRow | null }[];
  reviews: ReviewRow[];
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
      depositor:profiles!datasets_depositor_id_fkey ( name, affiliation ),
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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const csvFile = dataset.files.find((f) => f.format === "csv");
  let headers: string[] = [];
  let rows: Record<string, string>[] = [];

  if (csvFile) {
    const { data: publicUrlData } = supabase.storage
      .from("dataset-files")
      .getPublicUrl(csvFile.storage_path);
    const response = await fetch(publicUrlData.publicUrl, { cache: "no-store" });
    if (response.ok) {
      const csvText = await response.text();
      const parsed = Papa.parse<Record<string, string>>(csvText, {
        header: true,
        skipEmptyLines: true,
      });
      headers = parsed.meta.fields ?? [];
      rows = parsed.data;
    }
  }

  const orderedColumns = headers
    .map((h) => dataset.survey_columns.find((c) => c.question_text === h))
    .filter((c): c is SurveyColumnRow => Boolean(c));

  const citationYear = dataset.fieldwork_start
    ? new Date(dataset.fieldwork_start).getFullYear()
    : new Date(dataset.created_at).getFullYear();
  const citationAuthor = dataset.depositor?.name ?? "SurveyBank.uz contributor";
  const citationUrl = `https://surveybank.uz/datasets/${dataset.slug}`;
  const citation = `${citationAuthor} (${citationYear}). ${dataset.title} [Data set]. SurveyBank.uz. ${citationUrl}`;

  const publications = dataset.dataset_publications
    .map((dp) => dp.publications)
    .filter((p): p is PublicationRow => Boolean(p));

  return (
    <main className="mx-auto max-w-4xl space-y-8 px-6 py-10">
      {dataset.status !== "published" && (
        <p className="rounded bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">
          {t(dataset.status === "rejected" ? "rejectedBanner" : "pendingBanner")}
        </p>
      )}

      <div>
        <h1 className="text-3xl font-semibold">{dataset.title}</h1>
        {dataset.abstract && (
          <p className="mt-2 text-gray-600 dark:text-gray-400">{dataset.abstract}</p>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
        <Meta label={t("metadataCountry")} value={[dataset.country, dataset.region].filter(Boolean).join(" · ")} />
        <Meta label={t("metadataSampleSize")} value={dataset.sample_size?.toString()} />
        <Meta label={t("metadataTargetPopulation")} value={dataset.target_population} />
        <Meta label={t("metadataCollectionMethod")} value={dataset.collection_method} />
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

      {dataset.topics.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {dataset.topics.map((topic) => (
            <span key={topic} className="rounded-full bg-gray-100 px-3 py-1 text-xs dark:bg-gray-800">
              {topic}
            </span>
          ))}
        </div>
      )}

      {dataset.questionnaire_text && (
        <div>
          <h2 className="text-lg font-medium">{t("metadataQuestionnaire")}</h2>
          <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-400">
            {dataset.questionnaire_text}
          </p>
        </div>
      )}

      {publications.length > 0 && (
        <div>
          <h2 className="text-lg font-medium">{t("publicationsHeading")}</h2>
          <ul className="mt-1 space-y-1 text-sm">
            {publications.map((p, i) => (
              <li key={i}>
                {p.title}
                {p.authors ? ` — ${p.authors}` : ""}
                {p.year ? ` (${p.year})` : ""}
                {p.doi_or_url ? (
                  <>
                    {" "}
                    ·{" "}
                    <a href={p.doi_or_url} className="underline" target="_blank" rel="noreferrer">
                      {p.doi_or_url}
                    </a>
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h2 className="text-lg font-medium">{t("howToCiteHeading")}</h2>
        <p className="mt-1 rounded bg-gray-50 p-3 text-sm dark:bg-gray-900">{citation}</p>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-medium">{t("downloadsHeading")}</h2>
        {!dataset.is_hosted ? (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <a
              href={dataset.external_url ?? "#"}
              target="_blank"
              rel="noreferrer"
              className="rounded border border-gray-300 px-3 py-1.5 font-medium dark:border-gray-700"
            >
              {t("viewAtSourceButton")}
            </a>
            <span className="text-gray-500 dark:text-gray-400">{t("viewAtSourceNote")}</span>
          </div>
        ) : csvFile ? (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {(["csv", "xlsx", "json"] as const).map((format) => (
              <a
                key={format}
                href={`/api/datasets/${dataset.slug}/download/${format}`}
                className="rounded border border-gray-300 px-3 py-1.5 font-medium dark:border-gray-700"
              >
                {format.toUpperCase()}
              </a>
            ))}
            <span className="text-gray-500 dark:text-gray-400">
              {t("downloadCount", { count: dataset.download_count })}
            </span>
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">{t("noFileYet")}</p>
        )}
      </div>

      {orderedColumns.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-medium">{t("questionsHeading")}</h2>
          <ColumnCharts columns={orderedColumns} />
        </div>
      )}

      {headers.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-medium">{t("dataHeading")}</h2>
          <DataTable headers={headers} rows={rows} />
        </div>
      )}

      <Reviews
        locale={locale as Locale}
        slug={dataset.slug}
        reviews={dataset.reviews}
        currentUserId={user?.id ?? null}
      />
    </main>
  );
}

function Meta({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
