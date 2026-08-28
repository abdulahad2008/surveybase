// One-off migration for the seeded archive records that are already live.
//
// Usage: npm run reslug-seeds           (dry run — prints what it would do)
//        npm run reslug-seeds -- --apply
//
// Two things are wrong with the rows the first seed run inserted:
//
//   1. Their slugs carry a `seed-` prefix and were cut to 60 characters
//      mid-word, so the MICS record lives at
//      "seed-uzbekistan-multiple-indicator-cluster-survey-mics-20", where the
//      reader cannot tell whether that year is 2001 or 2021.
//   2. They have no `source_organization`, so their citation block credits
//      "SurveyBase.uz contributor" for surveys UNICEF, the World Bank and the
//      EBRD ran.
//
// Both are fixed here rather than by re-seeding, because re-seeding would
// insert duplicates beside the rows people have already linked to. Renaming a
// slug breaks the old URL: the old → new pairs are printed so the redirects
// can be configured, and nothing is written without --apply.

import { readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { slugify, randomSuffix } from "../src/lib/slug.ts";

interface ManifestEntry {
  title: string;
  source_organization?: string | null;
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in the environment.");
  process.exit(1);
}

const apply = process.argv.includes("--apply");
const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false } });

const manifestPath = path.join(import.meta.dirname, "..", "seed", "seed-manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf-8")) as { datasets: ManifestEntry[] };
const orgByTitle = new Map(
  manifest.datasets.map((entry) => [entry.title, entry.source_organization ?? null]),
);

async function main() {
  const { data, error } = await supabase
    .from("datasets")
    .select("id, slug, title, source_organization")
    .like("slug", "seed-%");

  if (error) {
    console.error(`Could not read datasets: ${error.message}`);
    process.exit(1);
  }

  const rows = (data ?? []) as {
    id: string;
    slug: string;
    title: string;
    source_organization: string | null;
  }[];

  if (rows.length === 0) {
    console.log("No `seed-` slugs left. Nothing to do.");
    return;
  }

  console.log(`${rows.length} seeded record(s)${apply ? "" : " — dry run, pass --apply to write"}\n`);
  const redirects: string[] = [];

  for (const row of rows) {
    const newSlug = `${slugify(row.title)}-${randomSuffix()}`;
    const org = orgByTitle.get(row.title) ?? null;
    if (!orgByTitle.has(row.title)) {
      console.warn(`  ! ${row.title} is not in the manifest — leaving its attribution alone`);
    }

    const patch: { slug: string; source_organization?: string | null } = { slug: newSlug };
    if (org && org !== row.source_organization) patch.source_organization = org;

    console.log(`  ${row.slug}`);
    console.log(`  → ${newSlug}${patch.source_organization ? `  (credit: ${org})` : ""}`);

    if (apply) {
      const { error: updateError } = await supabase
        .from("datasets")
        .update(patch)
        .eq("id", row.id);
      if (updateError) {
        console.error(`    FAILED: ${updateError.message}`);
        continue;
      }
    }
    redirects.push(`/datasets/${row.slug} → /datasets/${newSlug}`);
  }

  console.log("\nRedirects to configure (301, all three locale prefixes):");
  for (const line of redirects) console.log(`  ${line}`);
  if (!apply) console.log("\nDry run — nothing was written.");
}

main();
