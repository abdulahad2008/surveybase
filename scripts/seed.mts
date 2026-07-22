// Phase 4 seed script — imports seed/seed-manifest.json into the live datasets table.
//
// Usage: npm run seed   (wraps `node --env-file=.env.local scripts/seed.mts`)
//
// Reuses the exact PII-guard + column-analysis pipeline the deposit flow uses
// (src/lib/pii.ts, src/lib/csv-analysis.ts) so seeded "hosted" files get the
// same anonymization guarantees as user-submitted ones. Idempotent: re-running
// skips any manifest entry whose deterministic slug already exists.

import { readFileSync } from "node:fs";
import path from "node:path";
import Papa from "papaparse";
import { createClient } from "@supabase/supabase-js";
import { detectPiiColumns } from "../src/lib/pii.ts";
import { inferColumnType, computeSummary } from "../src/lib/csv-analysis.ts";
import { slugify } from "../src/lib/slug.ts";

interface ManifestEntry {
  record_type: "hosted" | "link_only";
  title: string;
  source_name: string;
  source_url: string;
  external_url?: string;
  download_url?: string;
  license: string;
  attribution_required: boolean;
  citation: string | null;
  country: string;
  topics: string[];
  collection_method: string;
  sample_size: number | null;
  languages: string[];
  formats_available: string[];
  fieldwork_year: number | null;
  notes: string;
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in the environment.");
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false } });

const manifestPath = path.join(import.meta.dirname, "..", "seed", "seed-manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf-8")) as { datasets: ManifestEntry[] };

const isPlaceholder = (entry: ManifestEntry) => entry.notes?.startsWith("Placeholder:");
const needsLicenseHold = (entry: ManifestEntry) => /confirm before re-hosting/i.test(entry.license);

function buildAbstract(entry: ManifestEntry): string {
  const parts = [entry.notes];
  parts.push(`Source: ${entry.source_name} — ${entry.source_url}`);
  if (entry.citation) parts.push(`Citation: ${entry.citation}`);
  parts.push(`License: ${entry.license}${entry.attribution_required ? " (attribution required)" : ""}`);
  return parts.filter(Boolean).join("\n\n");
}

function fieldworkStart(entry: ManifestEntry): string | null {
  return entry.fieldwork_year ? `${entry.fieldwork_year}-01-01` : null;
}

async function slugExists(slug: string): Promise<boolean> {
  const { data } = await supabase.from("datasets").select("id").eq("slug", slug).maybeSingle();
  return Boolean(data);
}

async function seedLinkOnly(entry: ManifestEntry) {
  const slug = `seed-${slugify(entry.title)}`;
  if (await slugExists(slug)) {
    console.log(`  skip (exists): ${entry.title}`);
    return;
  }

  const { error } = await supabase.from("datasets").insert({
    title: entry.title,
    slug,
    abstract: buildAbstract(entry),
    country: entry.country,
    topics: entry.topics,
    collection_method: entry.collection_method,
    sample_size: entry.sample_size,
    fieldwork_start: fieldworkStart(entry),
    languages: entry.languages,
    license: entry.license,
    is_hosted: false,
    external_url: entry.external_url ?? entry.source_url,
    status: "published",
    depositor_id: null,
  });

  if (error) {
    console.error(`  FAILED: ${entry.title} — ${error.message}`);
    return;
  }
  console.log(`  inserted (published, link_only): ${entry.title}`);
}

async function seedHosted(entry: ManifestEntry) {
  if (isPlaceholder(entry)) {
    console.log(`  skip (placeholder, add concrete records later): ${entry.title}`);
    return;
  }

  const slug = `seed-${slugify(entry.title)}`;
  if (await slugExists(slug)) {
    console.log(`  skip (exists): ${entry.title}`);
    return;
  }

  const status = needsLicenseHold(entry) ? "draft" : "published";

  const baseRow = {
    title: entry.title,
    slug,
    abstract: buildAbstract(entry),
    country: entry.country,
    topics: entry.topics,
    collection_method: entry.collection_method,
    sample_size: entry.sample_size,
    fieldwork_start: fieldworkStart(entry),
    languages: entry.languages,
    license: entry.license,
    is_hosted: true,
    external_url: null,
    status,
    depositor_id: null,
  };

  if (!entry.download_url) {
    const { error } = await supabase.from("datasets").insert(baseRow);
    if (error) {
      console.error(`  FAILED: ${entry.title} — ${error.message}`);
      return;
    }
    console.log(
      `  inserted (${status}, metadata-only — no download_url in manifest yet): ${entry.title}`,
    );
    return;
  }

  // Full path for a manifest entry that does specify a direct file link:
  // download → PII-guard → column analysis → store → files/survey_columns rows.
  const response = await fetch(entry.download_url);
  if (!response.ok) {
    console.error(`  FAILED to download: ${entry.title} — HTTP ${response.status}`);
    return;
  }
  const csvText = await response.text();
  const parsed = Papa.parse<Record<string, string>>(csvText, { header: true, skipEmptyLines: true });
  const headers = parsed.meta.fields ?? [];
  const rows = parsed.data;
  if (headers.length === 0 || rows.length === 0) {
    console.error(`  FAILED to parse downloaded file: ${entry.title}`);
    return;
  }

  const columnValues = headers.map((h) => rows.map((r) => r[h] ?? ""));
  const piiFlags = detectPiiColumns(headers, columnValues);
  const piiIndexes = new Set(piiFlags.map((f) => f.index));
  const keptHeaders = headers.filter((_, i) => !piiIndexes.has(i));

  const { data: dataset, error: insertError } = await supabase
    .from("datasets")
    .insert(baseRow)
    .select("id, slug")
    .single();
  if (insertError || !dataset) {
    console.error(`  FAILED: ${entry.title} — ${insertError?.message}`);
    return;
  }

  const columnsPayload = keptHeaders.map((header) => {
    const originalIndex = headers.indexOf(header);
    const values = columnValues[originalIndex];
    const type = inferColumnType(values);
    const summary = computeSummary(type, values);
    return { dataset_id: dataset.id, question_text: header, column_type: type, summary_json: summary };
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
    console.error(`  FAILED to upload file: ${entry.title} — ${uploadError.message}`);
    return;
  }

  await supabase.from("files").insert({
    dataset_id: dataset.id,
    storage_path: storagePath,
    format: "csv",
    size_bytes: new Blob([cleanedCsv]).size,
  });

  console.log(`  inserted (${status}, hosted, ${piiFlags.length} PII column(s) stripped): ${entry.title}`);
}

async function main() {
  console.log(`Seeding ${manifest.datasets.length} manifest entries...\n`);
  for (const entry of manifest.datasets) {
    console.log(`${entry.record_type}: ${entry.title}`);
    if (entry.record_type === "link_only") {
      await seedLinkOnly(entry);
    } else {
      await seedHosted(entry);
    }
  }
  console.log("\nDone.");
}

main();
