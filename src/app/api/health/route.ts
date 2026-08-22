import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// One-click infrastructure check. Verifies the deploy is actually wired to a
// migrated Supabase project, so a broken sign-up / upload / download can be
// diagnosed as "migrations/config not applied" vs "code bug" in one request.
//
// Never returns keys or connection strings — only boolean pass/fail per check.
export const dynamic = "force-dynamic";

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
};

export async function GET() {
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
  };

  let supabase: ReturnType<typeof createAdminClient>;
  try {
    supabase = createAdminClient();
    checks.envPresent = true;
  } catch (error) {
    return NextResponse.json(
      { ok: false, checks, error: error instanceof Error ? error.message : "env error" },
      { status: 503 },
    );
  }

  // datasets table + reachability (also exercises the 0004 link-only columns).
  {
    const { error } = await supabase.from("datasets").select("id, is_hosted, external_url").limit(1);
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

  {
    const { error } = await supabase.from("files").select("id").limit(1);
    checks.filesTable = !error;
  }

  {
    const { error } = await supabase.from("survey_columns").select("id").limit(1);
    checks.surveyColumnsTable = !error;
  }

  // 0005's profile fields. The profiles table itself predates them, so a
  // missing column here reads as an ordinary empty result to every caller that
  // only destructures `data` — which is precisely how this went unnoticed until
  // a user tried to open their own profile.
  {
    const { error } = await supabase.from("profiles").select("bio, avatar_url").limit(1);
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
  return NextResponse.json({ ok, checks }, { status: ok ? 200 : 503 });
}
