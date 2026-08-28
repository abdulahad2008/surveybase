"use server";

import Papa from "papaparse";
import { createClient } from "@/lib/supabase/server";
import { MAX_UPLOAD_BYTES, parseSpreadsheet } from "@/lib/spreadsheet";
import { splitList as splitListValue } from "@/lib/form-values";
import { OTHER } from "@/lib/survey-vocab";
import { detectPiiColumns } from "@/lib/pii";
import { inferColumnType, computeSummary } from "@/lib/csv-analysis";
import { slugify, randomSuffix } from "@/lib/slug";
import { normalizeWebsite, plausiblePublicationYear } from "@/lib/url";
import { redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

export type DepositErrorKey =
  | "errorAuth"
  | "errorConfirm"
  | "errorFile"
  | "errorFileTooLarge"
  | "errorAllPii"
  | "errorMissingFields"
  | "errorPublicationIncomplete"
  | "errorPublicationUrl"
  | "errorPublicationYear"
  | "errorDateOrder"
  | "errorUploadFailed"
  | "errorGeneric";

export interface DepositState {
  error: DepositErrorKey | null;
}

type ServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Undoes a deposit that failed after the dataset row was created.
 *
 * Without this, a failure anywhere downstream — storage unreachable, a column
 * summary rejected — left a pending row behind while the depositor was told to
 * "check the form and try again". They retried, and the archive collected one
 * duplicate per attempt, some of them with no file at all for a moderator to
 * look at.
 *
 * Deleting the dataset row is enough for `files`, `survey_columns` and
 * `dataset_publications`, which all cascade from it. The stored object does
 * not: nothing in Postgres knows it exists, so it is removed by hand first.
 * Both failures are logged rather than raised — the deposit is already being
 * reported as failed, and burying that under a cleanup error would tell the
 * depositor even less.
 */
async function rollbackDeposit(
  supabase: ServerClient,
  datasetId: string,
  storagePath: string | null,
): Promise<void> {
  if (storagePath) {
    const { error } = await supabase.storage.from("dataset-files").remove([storagePath]);
    if (error) {
      console.error(`[deposit] rollback left an object at ${storagePath}: ${error.message}`);
    }
  }
  // `select()` so the delete reports which rows it actually removed. Without
  // it a delete that RLS declines is indistinguishable from one that worked:
  // PostgREST returns no error for a statement that matched no rows, so the
  // orphan this function exists to prevent would be left behind silently.
  // Caught exactly that way in verification, against a database where the
  // delete policy in 0007_deposit_rollback.sql had not been applied yet.
  const { data, error } = await supabase
    .from("datasets")
    .delete()
    .eq("id", datasetId)
    .select("id");
  if (error) {
    console.error(`[deposit] rollback left dataset ${datasetId} in place: ${error.message}`);
  } else if (!data || data.length === 0) {
    console.error(
      `[deposit] rollback deleted no row for dataset ${datasetId}; ` +
        "the delete policy from 0007_deposit_rollback.sql is probably missing",
    );
  }
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
  // The browser checks this too, and this is the check that counts: the action
  // is a public endpoint and `required`-style limits in the form are a request
  // to a cooperating client, not a rule.
  if (file.size > MAX_UPLOAD_BYTES) {
    return { error: "errorFileTooLarge" };
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
    !Number.isInteger(sampleSize) ||
    sampleSize <= 0;

  if (incomplete) return { error: "errorMissingFields" };

  // Both dates are <input type="date">, so they arrive as yyyy-mm-dd and sort
  // correctly as strings. Comparing them as text avoids parsing them into Date
  // objects, which would drag the server's timezone into a question that has
  // nothing to do with time of day.
  if (fieldworkEnd < fieldworkStart) {
    return { error: "errorDateOrder" };
  }

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
  const publicationUrlRaw =
    formData.get("publication_url")?.toString().trim() ?? "";
  const publicationYearRaw =
    formData.get("publication_year")?.toString().trim() ?? "";

  if (hasPublication && (!publicationTitle || !publicationUrlRaw)) {
    return { error: "errorPublicationIncomplete" };
  }

  // The link is rendered as an `href` on a public page, so a `javascript:` or
  // `data:` URL pasted here would become a live one. Anything without a scheme
  // is treated as a bare host and gets https, which is what someone typing
  // "doi.org/10.1234/x" means.
  const publicationUrl = hasPublication ? normalizeWebsite(publicationUrlRaw) : null;
  if (hasPublication && !publicationUrl) {
    return { error: "errorPublicationUrl" };
  }

  const publicationYear = publicationYearRaw === "" ? null : Number(publicationYearRaw);
  if (
    publicationYear !== null &&
    !plausiblePublicationYear(publicationYear, new Date())
  ) {
    return { error: "errorPublicationYear" };
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
    console.error(`[deposit] dataset insert failed: ${insertError?.code ?? "unknown"}`);
    return { error: "errorGeneric" };
  }

  const { id: datasetId, slug: datasetSlug } = dataset;

  // From here on the dataset row exists, so every failure has to take it back
  // out before reporting. `fail` is the only way out of this section.
  async function fail(
    error: DepositErrorKey,
    why: string,
    storagePath: string | null = null,
  ): Promise<DepositState> {
    console.error(`[deposit] ${why}`);
    await rollbackDeposit(supabase, datasetId, storagePath);
    return { error };
  }

  const columnsPayload = keptHeaders.map((header) => {
    const originalIndex = headers.indexOf(header);
    const values = columnValues[originalIndex];
    const type = inferColumnType(values);
    const summary = computeSummary(type, values);
    return {
      dataset_id: datasetId,
      question_text: header,
      column_type: type,
      summary_json: summary,
    };
  });

  if (columnsPayload.length > 0) {
    const { error } = await supabase.from("survey_columns").insert(columnsPayload);
    if (error) {
      return fail("errorGeneric", `column summaries for ${datasetId} failed: ${error.message}`);
    }
  }

  const cleanedRows = rows.map((row) => {
    const out: Record<string, string> = {};
    for (const h of keptHeaders) out[h] = row[h] ?? "";
    return out;
  });
  const cleanedCsv = Papa.unparse(cleanedRows, { columns: keptHeaders });
  const storagePath = `${datasetId}/data.csv`;

  const { error: uploadError } = await supabase.storage
    .from("dataset-files")
    .upload(storagePath, new Blob([cleanedCsv], { type: "text/csv" }), {
      contentType: "text/csv",
      upsert: true,
    });

  if (uploadError) {
    return fail("errorUploadFailed", `upload for ${datasetId} failed: ${uploadError.message}`);
  }

  const { error: fileError } = await supabase.from("files").insert({
    dataset_id: datasetId,
    storage_path: storagePath,
    format: "csv",
    size_bytes: new Blob([cleanedCsv]).size,
  });

  if (fileError) {
    // The object uploaded but nothing points at it, so it goes back too.
    return fail("errorUploadFailed", `files row for ${datasetId} failed: ${fileError.message}`, storagePath);
  }

  // Last, because it is the only step whose own row does not cascade away with
  // the dataset. Leaving it until everything else has succeeded means a
  // rollback almost never has one to clean up.
  if (hasPublication) {
    const { data: publication, error: publicationError } = await supabase
      .from("publications")
      .insert({
        title: publicationTitle,
        authors: nullableText(formData.get("publication_authors")),
        year: publicationYear,
        doi_or_url: publicationUrl,
      })
      .select("id")
      .single();

    if (publicationError || !publication) {
      return fail(
        "errorGeneric",
        `publication for ${datasetId} failed: ${publicationError?.message ?? "no row returned"}`,
        storagePath,
      );
    }

    const { error: linkError } = await supabase
      .from("dataset_publications")
      .insert({ dataset_id: datasetId, publication_id: publication.id });

    if (linkError) {
      // `publications` is shared and has no delete policy, so this may be a
      // no-op. An unlinked publication row is invisible to every page; an
      // unlinked dataset row is not, which is the one worth undoing.
      await supabase.from("publications").delete().eq("id", publication.id);
      return fail(
        "errorGeneric",
        `publication link for ${datasetId} failed: ${linkError.message}`,
        storagePath,
      );
    }
  }

  redirect({ href: `/datasets/${datasetSlug}`, locale });
  return { error: null };
}
