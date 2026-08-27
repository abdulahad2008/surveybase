"use server";

import Papa from "papaparse";
import { createClient } from "@/lib/supabase/server";
import { parseSpreadsheet } from "@/lib/spreadsheet";
import { splitList as splitListValue } from "@/lib/form-values";
import { OTHER } from "@/lib/survey-vocab";
import { detectPiiColumns } from "@/lib/pii";
import { inferColumnType, computeSummary } from "@/lib/csv-analysis";
import { slugify, randomSuffix } from "@/lib/slug";
import { redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

export type DepositErrorKey =
  | "errorAuth"
  | "errorConfirm"
  | "errorFile"
  | "errorAllPii"
  | "errorMissingFields"
  | "errorPublicationIncomplete"
  | "errorGeneric";

export interface DepositState {
  error: DepositErrorKey | null;
}

function splitList(value: FormDataEntryValue | null): string[] {
  return splitListValue(value?.toString() ?? "");
}

function nullableText(value: FormDataEntryValue | null): string | null {
  const v = value?.toString().trim() ?? "";
  return v === "" ? null : v;
}

/**
 * Reads a field backed by a preset list plus an "Other" escape hatch, and
 * returns what should actually be stored.
 *
 * "Other" is a control for the form, not a value for the archive: storing the
 * literal string would give the browse page a facet named "Other" collecting
 * unrelated surveys, which is worse than no answer at all. So the free-text
 * box replaces the choice rather than annotating it, and an "Other" with an
 * empty box comes back null.
 */
function resolveChoice(formData: FormData, name: string): string | null {
  const chosen = formData.get(name)?.toString().trim() ?? "";
  if (chosen === "") return null;
  if (chosen !== OTHER) return chosen;
  return nullableText(formData.get(`${name}_other`));
}

export async function submitDataset(
  locale: Locale,
  _prevState: DepositState,
  formData: FormData,
): Promise<DepositState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "errorAuth" };

  if (formData.get("confirmAnonymized") !== "on") {
    return { error: "errorConfirm" };
  }

  const file = formData.get("csv");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "errorFile" };
  }

  const title = formData.get("title")?.toString().trim() ?? "";
  const abstract = nullableText(formData.get("abstract"));
  const country = formData.get("country")?.toString().trim() || "Uzbekistan";
  const targetPopulation = nullableText(formData.get("target_population"));
  const fieldworkStart = nullableText(formData.get("fieldwork_start"));
  const fieldworkEnd = nullableText(formData.get("fieldwork_end"));
  const collectionMethod = resolveChoice(formData, "collection_method");
  const collectionPlatform = resolveChoice(formData, "collection_platform");
  const license = resolveChoice(formData, "license") ?? "CC-BY";
  const languages = splitList(formData.get("languages"));

  // Every chip and the free-text "Other" box submit under the same name, so
  // the answer arrives as repeated entries rather than one delimited string.
  // Each is still split on commas: only the free-text one can contain any, and
  // a depositor typing "sport, leisure" there means two topics.
  const topics = [
    ...new Set(
      formData.getAll("topics").flatMap((v) => splitListValue(v.toString())),
    ),
  ];

  const sampleSizeRaw = formData.get("sample_size")?.toString().trim() ?? "";
  const sampleSize = sampleSizeRaw === "" ? null : Number(sampleSizeRaw);

  // The form marks all of these required, but `required` is a request to a
  // cooperating browser, not a rule — and this action is a public endpoint
  // that anything can POST to. Checking here is what actually keeps the
  // archive's records complete; the attribute only makes the ask visible.
  const incomplete =
    !title ||
    !abstract ||
    !country ||
    !collectionMethod ||
    !targetPopulation ||
    !fieldworkStart ||
    !fieldworkEnd ||
    topics.length === 0 ||
    languages.length === 0 ||
    sampleSize === null ||
    !Number.isFinite(sampleSize) ||
    sampleSize <= 0;

  if (incomplete) return { error: "errorMissingFields" };

  // The link is the whole reason for asking, and `publications.title` is NOT
  // NULL, so an answer of "yes" missing either one cannot be stored at all.
  // Checked here beside the other required fields rather than down at the
  // insert, so a missing link cannot leave a dataset already created and its
  // publication quietly discarded — which is what the old `if (publicationTitle)`
  // gate did to anyone who pasted a DOI and skipped the title.
  const hasPublication =
    formData.get("has_publication")?.toString() === "yes";
  const publicationTitle =
    formData.get("publication_title")?.toString().trim() ?? "";
  const publicationUrl =
    formData.get("publication_url")?.toString().trim() ?? "";

  if (hasPublication && (!publicationTitle || !publicationUrl)) {
    return { error: "errorPublicationIncomplete" };
  }

  // Accepts CSV and Excel alike; everything downstream still works in CSV, so
  // the format a depositor happened to export is not the archive's problem.
  // Parsed again server-side rather than trusting the browser's preview: this
  // is the copy that decides what gets stored and what gets stripped.
  let headers: string[];
  let rows: Record<string, string>[];
  try {
    ({ headers, rows } = await parseSpreadsheet(file));
  } catch {
    // A corrupt workbook, or something renamed to .xlsx that never was one.
    return { error: "errorFile" };
  }
  if (headers.length === 0 || rows.length === 0) {
    return { error: "errorFile" };
  }

  const columnValues = headers.map((h) => rows.map((r) => r[h] ?? ""));
  const piiFlags = detectPiiColumns(headers, columnValues);
  const piiIndexes = new Set(piiFlags.map((f) => f.index));
  const keptHeaders = headers.filter((_, i) => !piiIndexes.has(i));

  // Every column was flagged as personal data — there is nothing safe to
  // store. Reject rather than create an empty dataset.
  if (keptHeaders.length === 0) {
    return { error: "errorAllPii" };
  }

  const slugBase = slugify(title);
  let dataset: { id: string; slug: string } | null = null;
  let insertError: { code?: string } | null = null;

  for (let attempt = 0; attempt < 3 && !dataset; attempt++) {
    if (insertError && insertError.code !== "23505") break;
    const slug = `${slugBase}-${randomSuffix()}`;
    const { data, error } = await supabase
      .from("datasets")
      .insert({
        title,
        slug,
        abstract,
        country,
        region: nullableText(formData.get("region")),
        topics,
        collection_method: collectionMethod,
        collection_platform: collectionPlatform,
        sample_size: sampleSize,
        target_population: targetPopulation,
        fieldwork_start: fieldworkStart,
        fieldwork_end: fieldworkEnd,
        languages,
        license,
        questionnaire_text: nullableText(formData.get("questionnaire_text")),
        depositor_id: user.id,
        status: "pending",
      })
      .select("id, slug")
      .single();

    dataset = data;
    insertError = error;
  }

  if (!dataset) {
    return { error: "errorGeneric" };
  }

  if (hasPublication) {
    const { data: publication } = await supabase
      .from("publications")
      .insert({
        title: publicationTitle,
        authors: nullableText(formData.get("publication_authors")),
        year: (() => {
          const y = formData.get("publication_year")?.toString().trim();
          return y ? Number(y) : null;
        })(),
        doi_or_url: publicationUrl,
      })
      .select("id")
      .single();

    if (publication) {
      await supabase
        .from("dataset_publications")
        .insert({ dataset_id: dataset.id, publication_id: publication.id });
    }
  }

  const columnsPayload = keptHeaders.map((header) => {
    const originalIndex = headers.indexOf(header);
    const values = columnValues[originalIndex];
    const type = inferColumnType(values);
    const summary = computeSummary(type, values);
    return {
      dataset_id: dataset.id,
      question_text: header,
      column_type: type,
      summary_json: summary,
    };
  });

  if (columnsPayload.length > 0) {
    await supabase.from("survey_columns").insert(columnsPayload);
  }

  const cleanedRows = rows.map((row) => {
    const out: Record<string, string> = {};
    for (const h of keptHeaders) out[h] = row[h] ?? "";
    return out;
  });
  const cleanedCsv = Papa.unparse(cleanedRows, { columns: keptHeaders });
  const storagePath = `${dataset.id}/data.csv`;

  const { error: uploadError } = await supabase.storage
    .from("dataset-files")
    .upload(storagePath, new Blob([cleanedCsv], { type: "text/csv" }), {
      contentType: "text/csv",
      upsert: true,
    });

  if (uploadError) {
    return { error: "errorGeneric" };
  }

  await supabase.from("files").insert({
    dataset_id: dataset.id,
    storage_path: storagePath,
    format: "csv",
    size_bytes: new Blob([cleanedCsv]).size,
  });

  redirect({ href: `/datasets/${dataset.slug}`, locale });
  return { error: null };
}
