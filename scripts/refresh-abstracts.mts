// One-off migration for the seeded records whose abstract is an internal note.
//
// Usage: npm run refresh-abstracts           (dry run — prints what it would do)
//        npm run refresh-abstracts -- --apply
//
// buildAbstract in seed.mts used to open every abstract with the manifest's
// `notes` field, which is the instruction to whoever runs the seed rather than
// anything a reader wants: the four published records went live reading "LINK
// ONLY. Do not store files. Catalog metadata + link to source." That is fixed
// at the source — the manifest now carries a real `abstract` per record — but
// the rows already in the table keep the old text until it is pushed to them.
//
// Matched by title, the same key seed.mts uses for its idempotency check, so
// this stays correct after reslug-seeds has rewritten the slugs. Rebuilds each
// abstract with the same trailer the seed script writes (Source / Citation /
// License), so a re-seeded row and a repaired row read identically.

import { readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

interface ManifestEntry {
  title: string;
  abstract: string;
  source_name: string;
  source_url: string;
  citation: string | null;
  license: string;
  attribution_required: boolean;
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

// Kept in step with buildAbstract in seed.mts.
function buildAbstract(entry: ManifestEntry): string {
  const parts = [entry.abstract];
  parts.push(`Source: ${entry.source_name} — ${entry.source_url}`);
  if (entry.citation) parts.push(`Citation: ${entry.citation}`);
  parts.push(`License: ${entry.license}${entry.attribution_required ? " (attribution required)" : ""}`);
  return parts.filter(Boolean).join("\n\n");
}

async function main() {
  console.log(`${manifest.datasets.length} manifest entr(ies)${apply ? "" : " — dry run, pass --apply to write"}\n`);
  let written = 0;
  let missing = 0;

  for (const entry of manifest.datasets) {
    const { data, error } = await supabase
      .from("datasets")
      .select("id, status, abstract")
      .eq("title", entry.title)
      .maybeSingle();

    if (error) {
      console.error(`  ! ${entry.title}: ${error.message}`);
      continue;
    }
    if (!data) {
      console.warn(`  ? ${entry.title} is not in the table — skipped`);
      missing++;
      continue;
    }

    const row = data as { id: string; status: string; abstract: string | null };
    const next = buildAbstract(entry);
    if (row.abstract === next) {
      console.log(`  = [${row.status}] ${entry.title} — already current`);
      continue;
    }

    console.log(`  → [${row.status}] ${entry.title}`);
    console.log(`      was: ${(row.abstract ?? "").split("\n")[0].slice(0, 78)}`);
    console.log(`      now: ${next.split("\n")[0].slice(0, 78)}`);

    if (apply) {
      const { error: updateError, data: updated } = await supabase
        .from("datasets")
        .update({ abstract: next })
        .eq("id", row.id)
        .select("id");
      if (updateError) {
        console.error(`      FAILED: ${updateError.message}`);
        continue;
      }
      // An update the database declines returns no error, only no rows.
      if (!updated || updated.length === 0) {
        console.error(`      FAILED: no row written`);
        continue;
      }
    }
    written++;
  }

  console.log(`\n${written} record(s) ${apply ? "updated" : "would be updated"}${missing ? `, ${missing} not found` : ""}.`);
  if (!apply) console.log("Dry run — nothing was written.");
}

main();
