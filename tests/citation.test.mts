import test from "node:test";
import assert from "node:assert/strict";
import { ANONYMOUS_AUTHOR, citationWithoutUrl, citationYear } from "@/lib/citation";
import { datasetJsonLd, type JsonLdDataset } from "@/lib/dataset-jsonld";
import { slugify, MAX_SLUG_LENGTH } from "@/lib/slug";

const MICS = {
  title: "Uzbekistan Multiple Indicator Cluster Survey (MICS) 2021–2022",
  author: null,
  sourceOrganization: "UNICEF / UzStat",
  year: 2021,
};

test("credit falls back depositor → source organization → the archive", () => {
  // A depositor who named themselves always wins, even on a record that also
  // carries a source organization.
  assert.match(
    citationWithoutUrl({ ...MICS, author: "Nodira Karimova" }),
    /^Nodira Karimova \(2021\)\./,
  );

  // The seeded archive records: nobody deposited them, so the body that ran
  // the survey is the correct credit.
  assert.equal(
    citationWithoutUrl(MICS),
    "UNICEF / UzStat (2021). Uzbekistan Multiple Indicator Cluster Survey (MICS) 2021–2022 [Data set]. SurveyBase.uz.",
  );

  // Only a record with neither falls through to the anonymous fallback.
  assert.match(
    citationWithoutUrl({ ...MICS, sourceOrganization: null }),
    new RegExp(`^${ANONYMOUS_AUTHOR} \\(2021\\)\\.`),
  );

  // Whitespace is not a credit.
  assert.match(
    citationWithoutUrl({ ...MICS, author: "   ", sourceOrganization: "  " }),
    new RegExp(`^${ANONYMOUS_AUTHOR} `),
  );
});

test("a survey is cited by the year it ran, not the year it was uploaded", () => {
  assert.equal(citationYear("2021-06-01", new Date("2026-01-01")), 2021);
  assert.equal(citationYear(null, new Date("2026-01-01")), 2026);
  assert.equal(citationYear("not a date", new Date("2026-01-01")), 2026);
});

const BASE: JsonLdDataset = {
  title: MICS.title,
  slug: "uzbekistan-multiple-indicator-cluster-survey-mics-abc123",
  abstract: null,
  country: "Uzbekistan",
  region: null,
  topics: [],
  collection_method: null,
  sample_size: null,
  fieldwork_start: "2021-06-01",
  fieldwork_end: "2022-01-31",
  languages: [],
  license: "CC-BY",
  is_hosted: true,
  external_url: null,
  created_at: "2026-01-01T00:00:00Z",
  source_organization: MICS.sourceOrganization,
  depositor: null,
  survey_columns: [],
  files: [],
  dataset_publications: [],
};

test("the JSON-LD creator agrees with the citation block", () => {
  const url = "https://surveybase.uz/uz/datasets/x";

  assert.deepEqual(datasetJsonLd(BASE, url).creator, {
    "@type": "Organization",
    name: "UNICEF / UzStat",
  });

  assert.deepEqual(
    datasetJsonLd({ ...BASE, depositor: { name: "Nodira Karimova", affiliation: null } }, url)
      .creator,
    { "@type": "Person", name: "Nodira Karimova" },
  );

  // No depositor and no source organization: the archive itself, as before.
  const orphan = datasetJsonLd({ ...BASE, source_organization: null }, url).creator as {
    name: string;
  };
  assert.equal(orphan.name, "SurveyBase.uz");
});

test("slugs stop at a word boundary rather than mid-word", () => {
  // The seeded MICS record used to end "...-mics-20", which reads as 2001 or
  // 2020 as easily as the 2021 it actually is.
  const slug = slugify(MICS.title);
  assert.ok(slug.length <= MAX_SLUG_LENGTH, slug);
  assert.ok(!slug.startsWith("seed-"));
  assert.ok(!slug.endsWith("-"));
  // Every segment that survives is a whole word from the title.
  const words = new Set(
    MICS.title.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean),
  );
  for (const part of slug.split("-")) assert.ok(words.has(part), `truncated: ${part}`);

  // A title that fits is left alone, and one with no usable characters still
  // produces a routable slug.
  assert.equal(slugify("Ish bilan bandlik 2024"), "ish-bilan-bandlik-2024");
  assert.equal(slugify("!!!"), "dataset");
});
