import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Record one file download or one outbound "View at source" click.
 *
 * Best-effort by design: a visitor must still get their file (or their
 * redirect) even if the bookkeeping fails, so nothing here throws. But failing
 * *silently* is how a dead counter goes unnoticed for weeks — a stuck number
 * looks exactly like an unpopular dataset, so there is no other symptom to
 * notice. Hence: never throw, always log.
 *
 * Note that a successful RPC does not prove the number moved.
 * increment_download_count() returns void and only touches rows with
 * status = 'published', so calling it for a draft or rejected dataset updates
 * zero rows and still reports success.
 *
 * Logged fields are deliberately limited to the error text, the dataset, and
 * the format — never user_id, and never PostgrestError.details/hint, which can
 * echo the offending row back into the log on a constraint violation.
 */
export async function recordDownload(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  datasetId: string,
  userId: string | null,
  format: string,
): Promise<void> {
  const where = `dataset=${datasetId} format=${format}`;

  const { error: logError } = await supabase
    .from("download_log")
    .insert({ dataset_id: datasetId, user_id: userId, format });
  if (logError) {
    console.error(
      `[download-count] download_log insert failed (${where}): ${logError.message} [${logError.code}]`,
    );
  }

  const { error: rpcError } = await supabase.rpc("increment_download_count", {
    p_dataset_id: datasetId,
  });
  if (rpcError) {
    console.error(
      `[download-count] increment_download_count failed (${where}): ${rpcError.message} [${rpcError.code}]`,
    );
  }
}
