// schema.org/Dataset structured data, so dataset pages can be indexed by
// Google Dataset Search rather than only by ordinary web search.
//
// Kept as a pure function with no React and no I/O: everything it needs arrives
// as an argument, so the mapping can be read, reasoned about, and eventually
// tested without standing up a page. The caller is responsible for escaping the
// result before it reaches the DOM — see the note in the dataset page.

import { SITE_NAME, SITE_URL, datasetId } from "@/lib/site";

/**
 * The subset of a dataset row this module reads. Deliberately structural rather
 * than an import of the page's own row type: this file should not have to change
 * when the page starts selecting another column.
 */
export interface JsonLdDataset {
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
  license: string;
  is_hosted: boolean;
  external_url: string | null;
  created_at: string;
  depositor: { name: string | null; affiliation: string | null } | null;
  survey_columns: { question_text: string; column_type: string }[];
  files: { format: string }[];
  dataset_publications: {
    publications: {
      title: string;
      authors: string | null;
      year: number | null;
      doi_or_url: string | null;
    } | null;
  }[];
}

// The deposit form offers exactly these four (deposit-form.tsx). "Other" has no
// canonical URL to point at, so it is omitted rather than guessed — an absent
// license field reads as "unstated", a wrong one reads as a licence grant.
const LICENSE_URLS: Record<string, string> = {
  "CC-BY": "https://creativecommons.org/licenses/by/4.0/",
  "CC-BY-SA": "https://creativecommons.org/licenses/by-sa/4.0/",
  CC0: "https://creativecommons.org/publicdomain/zero/1.0/",
};

const DOWNLOAD_FORMATS: [format: string, mime: string][] = [
  ["csv", "text/csv"],
  ["xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  ["json", "application/json"],
];

// Surveys with several hundred columns exist, and one PropertyValue per column
// would dominate the page weight for no indexing benefit. The cap is arbitrary
// but generous; if it ever bites, the fix is a linked DataDownload of the
// codebook, not a bigger number.
const MAX_VARIABLES = 100;

/**
 * Google requires a description and rejects the entry without one, but `abstract`
 * is nullable. Fall back to the facts we always have rather than dropping the
 * dataset out of the index entirely. Also used for the page's meta description,
 * so the two never disagree.
 */
export type DescribableDataset = Pick<
  JsonLdDataset,
  "abstract" | "region" | "country" | "sample_size" | "topics"
>;

export function datasetDescription(dataset: DescribableDataset): string {
  if (dataset.abstract?.trim()) return dataset.abstract.trim();

  const parts = [`Survey data from ${dataset.region ? `${dataset.region}, ` : ""}${dataset.country}`];
  if (dataset.sample_size != null) parts.push(`${dataset.sample_size.toLocaleString("en")} respondents`);
  if (dataset.topics.length > 0) parts.push(dataset.topics.join(", "));
  return `${parts.join(" · ")}. Openly archived on ${SITE_NAME}.`;
}

/** ISO 8601 interval. ".." is the standard open end, and is what Google documents. */
function temporalCoverage(dataset: JsonLdDataset): string | undefined {
  const { fieldwork_start: start, fieldwork_end: end } = dataset;
  if (!start && !end) return undefined;
  return `${start ?? ".."}/${end ?? ".."}`;
}

function distribution(dataset: JsonLdDataset) {
  // Mirrors the download panel: conversions are generated from the stored CSV,
  // so with no CSV there is nothing to offer. Externally hosted datasets get no
  // distribution at all — we link to their source, we do not serve their data.
  if (!dataset.is_hosted || !dataset.files.some((f) => f.format === "csv")) return undefined;

  return DOWNLOAD_FORMATS.map(([format, mime]) => ({
    "@type": "DataDownload",
    encodingFormat: mime,
    contentUrl: `${SITE_URL}/api/datasets/${dataset.slug}/download/${format}`,
  }));
}

function citations(dataset: JsonLdDataset) {
  const published = dataset.dataset_publications
    .map((dp) => dp.publications)
    .filter((p): p is NonNullable<typeof p> => Boolean(p));
  if (published.length === 0) return undefined;

  return published.map((p) => ({
    "@type": "CreativeWork",
    name: p.title,
    ...(p.authors ? { author: p.authors } : {}),
    ...(p.year ? { datePublished: String(p.year) } : {}),
    ...(p.doi_or_url ? { url: p.doi_or_url } : {}),
  }));
}

function creator(dataset: JsonLdDataset) {
  const name = dataset.depositor?.name;
  if (!name) return { "@type": "Organization", name: SITE_NAME, url: SITE_URL };

  const affiliation = dataset.depositor?.affiliation;
  return {
    "@type": "Person",
    name,
    ...(affiliation ? { affiliation: { "@type": "Organization", name: affiliation } } : {}),
  };
}

/**
 * `url` is the locale-prefixed page that actually answers 200; `@id` is the
 * locale-neutral identifier that also appears in the citation block, so a
 * consumer can tell the three translations are one dataset.
 */
export function datasetJsonLd(dataset: JsonLdDataset, canonicalUrl: string) {
  const spatial = [dataset.region, dataset.country].filter(Boolean).join(", ");
  const variables = dataset.survey_columns.slice(0, MAX_VARIABLES);

  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    "@id": datasetId(dataset.slug),
    url: canonicalUrl,
    identifier: datasetId(dataset.slug),
    name: dataset.title,
    description: datasetDescription(dataset),
    datePublished: dataset.created_at,
    isAccessibleForFree: true,
    ...(LICENSE_URLS[dataset.license] ? { license: LICENSE_URLS[dataset.license] } : {}),
    ...(dataset.topics.length > 0 ? { keywords: dataset.topics } : {}),
    ...(dataset.languages.length > 0 ? { inLanguage: dataset.languages } : {}),
    ...(dataset.collection_method ? { measurementTechnique: dataset.collection_method } : {}),
    ...(temporalCoverage(dataset) ? { temporalCoverage: temporalCoverage(dataset) } : {}),
    ...(spatial ? { spatialCoverage: { "@type": "Place", name: spatial } } : {}),
    creator: creator(dataset),
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    includedInDataCatalog: { "@type": "DataCatalog", name: SITE_NAME, url: SITE_URL },
    ...(dataset.is_hosted || !dataset.external_url ? {} : { sameAs: dataset.external_url }),
    ...(distribution(dataset) ? { distribution: distribution(dataset) } : {}),
    ...(citations(dataset) ? { citation: citations(dataset) } : {}),
    ...(variables.length > 0
      ? {
          variableMeasured: variables.map((c) => ({
            "@type": "PropertyValue",
            name: c.question_text,
            measurementTechnique: c.column_type,
          })),
        }
      : {}),
  };
}
