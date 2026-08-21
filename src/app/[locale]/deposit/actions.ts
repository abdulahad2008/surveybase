"use server";

import Papa from "papaparse";
import { createClient } from "@/lib/supabase/server";
import { parseSpreadsheet } from "@/lib/spreadsheet";
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
  | "errorGeneric";

export interface DepositState {
  error: DepositErrorKey | null;
}

function splitList(value: FormDataEntryValue | null): string[] {
  return (value?.toString() ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter((v) => v !== "");
}

function nullableText(value: FormDataEntryValue | null): string | null {
  const v = value?.toString().trim() ?? "";
  return v === "" ? null : v;
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
  if (!title) return { error: "errorGeneric" };

  const sampleSizeRaw = formData.get("sample_size")?.toString().trim() ?? "";
  const sampleSize = sampleSizeRaw === "" ? null : Number(sampleSizeRaw);

  const publicationTitle = formData.get("publication_title")?.toString().trim() ?? "";

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
        abstract: nullableText(formData.get("abstract")),
        country: formData.get("country")?.toString().trim() || "Uzbekistan",
        region: nullableText(formData.get("region")),
        topics: splitList(formData.get("topics")),
        collection_method: nullableText(formData.get("collection_method")),
        sample_size: Number.isFinite(sampleSize) ? sampleSize : null,
        target_population: nullableText(formData.get("target_population")),
        fieldwork_start: nullableText(formData.get("fieldwork_start")),
        fieldwork_end: nullableText(formData.get("fieldwork_end")),
        languages: splitList(formData.get("languages")),
        license: formData.get("license")?.toString().trim() || "CC-BY",
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

  if (publicationTitle) {
    const { data: publication } = await supabase
      .from("publications")
      .insert({
        title: publicationTitle,
        authors: nullableText(formData.get("publication_authors")),
        year: (() => {
          const y = formData.get("publication_year")?.toString().trim();
          return y ? Number(y) : null;
        })(),
        doi_or_url: nullableText(formData.get("publication_url")),
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
