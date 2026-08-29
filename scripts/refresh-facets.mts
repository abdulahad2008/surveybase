// One-off migration for the seeded records whose facets are prose.
//
// Usage: npm run refresh-facets           (dry run — prints before → after)
//        npm run refresh-facets -- --apply
//
// `datasets.topics` and `datasets.collection_method` are facets: the browse
// page filters on the stored string and localises it at render time through
// topicLabel/methodLabel. The seed manifest carried free English prose instead
// — "attitudes to markets & democracy", "Nationally representative household
// survey (MICS Round 6)" — so every live record showed those words untranslated
// to an Uzbek or Russian reader, and each one was a facet of exactly one
// dataset that no filter could ever group with another. The manifest now holds
// canonical values from src/lib/survey-vocab.ts; this pushes them to the rows
// already in the table. The design detail that used to sit in the method field
// is already in each abstract, so nothing published is lost.
//
// Matched by title, like refresh-abstracts.mts, so it stays correct after
// reslug-seeds has rewritten the slugs.

import { readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { COLLECTION_METHODS, TOPICS } from "../src/lib/survey-vocab.ts";

interface ManifestEntry {
  title: string;
  topics: string[];
  collection_method: string;
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

const KNOWN_TOPICS = new Set(TOPICS.map((t) => t.value));
const KNOWN_METHODS = new Set(COLLECTION_METHODS.map((m) => m.value));

/**
 * A typo in the manifest would be written to the table and then displayed
 * untranslated — exactly the state this script exists to end. Nothing is
 * written until every entry checks out.
 */
function validate(): string[] {
  const problems: string[] = [];
  for (const entry of manifest.datasets) {
    for (const topic of entry.topics) {
      if (!KNOWN_TOPICS.has(topic)) problems.push(`${entry.title}: topic "${topic}" is not in TOPICS`);
    }
    if (!KNOWN_METHODS.has(entry.collection_method)) {
      problems.push(`${entry.title}: method "${entry.collection_method}" is not in COLLECTION_METHODS`);
    }
  }
  return problems;
}

function sameTopics(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((value, i) => value === b[i]);
}

async function main() {
  const problems = validate();
  if (problems.length) {
    console.error("The manifest does not use the controlled vocabulary:");
    for (const p of problems) console.error(`  ! ${p}`);
    process.exit(1);
  }

  console.log(`${manifest.datasets.length} manifest entr(ies)${apply ? "" : " — dry run, pass --apply to write"}\n`);
  let written = 0;
  let missing = 0;

  for (const entry of manifest.datasets) {
    const { data, error } = await supabase
      .from("datasets")
      .select("id, status, topics, collection_method")
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

    const row = data as {
      id: string;
      status: string;
      topics: string[] | null;
      collection_method: string | null;
    };
    const currentTopics = row.topics ?? [];
    if (sameTopics(currentTopics, entry.topics) && row.collection_method === entry.collection_method) {
      console.log(`  = [${row.status}] ${entry.title} — already canonical`);
      continue;
    }

    console.log(`  → [${row.status}] ${entry.title}`);
    console.log(`      topics was: ${currentTopics.join(", ") || "(none)"}`);
    console.log(`      topics now: ${entry.topics.join(", ")}`);
    console.log(`      method was: ${row.collection_method ?? "(none)"}`);
    console.log(`      method now: ${entry.collection_method}`);

    if (apply) {
      const { error: updateError, data: updated } = await supabase
        .from("datasets")
        .update({ topics: entry.topics, collection_method: entry.collection_method })
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
