import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// One-click infrastructure check. Verifies the deploy is actually wired to a
// migrated Supabase project, so a broken sign-up / upload / download can be
// diagnosed as "migrations/config not applied" vs "code bug" in one request.
//
// Never returns keys or connection strings. It does return which migrations
// have landed and which tables, buckets and functions exist, which is a map of
// the backend and a list of what is currently broken — useful to whoever is
// fixing it, and equally useful to anyone deciding where to push. So the
// per-check detail is gated and the public answer is one boolean, which is all
// an uptime monitor needs.
export const dynamic = "force-dynamic";

/**
 * Fails closed: with no HEALTH_CHECK_TOKEN configured there is no way to ask
 * for detail at all, rather than the detail being open by default.
 */
function detailAuthorized(request: Request): boolean {
  const expected = process.env.HEALTH_CHECK_TOKEN;
  if (!expected) return false;

  const header = request.headers.get("authorization") ?? "";
  const presented = header.startsWith("Bearer ") ? header.slice(7) : "";

  const a = Buffer.from(presented);
  const b = Buffer.from(expected);
  // timingSafeEqual throws on a length mismatch, so the lengths are compared
  // first; the length of a token is not the part worth hiding.
  return a.length === b.length && timingSafeEqual(a, b);
}

type Checks = {
  envPresent: boolean;
  supabaseReachable: boolean;
  datasetsTable: boolean;
  filesTable: boolean;
  surveyColumnsTable: boolean;
  datasetFilesBucket: boolean;
  incrementDownloadCountFn: boolean;
  linkOnlyColumns: boolean;
  profileColumns: boolean;
  avatarsBucket: boolean;
  collectionPlatformColumn: boolean;
};

export async function GET(request: Request) {
  const detailed = detailAuthorized(request);

  const checks: Checks = {
    envPresent: false,
    supabaseReachable: false,
    datasetsTable: false,
    filesTable: false,
    surveyColumnsTable: false,
    datasetFilesBucket: false,
    incrementDownloadCountFn: false,
    linkOnlyColumns: false,
    profileColumns: false,
    avatarsBucket: false,
    collectionPlatformColumn: false,
  };

  let supabase: ReturnType<typeof createAdminClient>;
  try {
    supabase = createAdminClient();
    checks.envPresent = true;
  } catch (error) {
    const message = error instanceof Error ? error.message : "env error";
    console.error(`[api/health] admin client unavailable: ${message}`);
    return NextResponse.json(
      detailed ? { ok: false, checks, error: message } : { ok: false },
      { status: 503 },
    );
  }

  // datasets table + reachability (also exercises the 0004 link-only columns).
  {
    const { error } = await supabase
      .from("datasets")
      .select("id, is_hosted, external_url")
      .limit(1);
    if (!error) {
      checks.supabaseReachable = true;
      checks.datasetsTable = true;
      checks.linkOnlyColumns = true;
    } else if (error.code === "42703") {
      // Table reachable but the is_hosted/external_url columns are missing → 0004 not applied.
      checks.supabaseReachable = true;
      checks.datasetsTable = true;
    } else if (error.code === "42P01") {
      // Relation does not exist → 0001 not applied. Connection still worked.
      checks.supabaseReachable = true;
    }
  }

  // 0006. The deposit action writes this column on every submission, so a
  // database without it does not degrade — it rejects the deposit outright,
  // and the depositor is told only that something went wrong. Worth a check of
  // its own rather than hiding inside datasetsTable.
  {
    const { error } = await supabase
      .from("datasets")
      .select("collection_platform")
      .limit(1);
    checks.collectionPlatformColumn = !error;
  }

  {
    const { error } = await supabase.from("files").select("id").limit(1);
    checks.filesTable = !error;
  }

  {
    const { error } = await supabase
      .from("survey_columns")
      .select("id")
      .limit(1);
    checks.surveyColumnsTable = !error;
  }

  // 0005's profile fields. The profiles table itself predates them, so a
  // missing column here reads as an ordinary empty result to every caller that
  // only destructures `data` — which is precisely how this went unnoticed until
  // a user tried to open their own profile.
  {
    const { error } = await supabase
      .from("profiles")
      .select("bio, avatar_url")
      .limit(1);
    checks.profileColumns = !error;
  }

  // Storage bucket existence (requires service role — anon can't list buckets).
  {
    const { data, error } = await supabase.storage.getBucket("dataset-files");
    checks.datasetFilesBucket = !error && Boolean(data);
  }

  {
    const { data, error } = await supabase.storage.getBucket("avatars");
    checks.avatarsBucket = !error && Boolean(data);
  }

  // increment_download_count callable. A random uuid updates zero rows (the
  // function is scoped to published datasets) — a safe no-op probe. Success =
  // the function exists and is grant-executable.
  {
    const { error } = await supabase.rpc("increment_download_count", {
      p_dataset_id: "00000000-0000-0000-0000-000000000000",
    });
    checks.incrementDownloadCountFn = !error;
  }

  const ok = Object.values(checks).every(Boolean);
  return NextResponse.json(detailed ? { ok, checks } : { ok }, {
    status: ok ? 200 : 503,
  });
}
