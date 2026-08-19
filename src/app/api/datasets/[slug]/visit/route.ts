import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Outbound click tracking for link-only datasets.
 *
 * A link-only record has no file to serve, so its "View at source" button used
 * to point straight at external_url. Nothing on this site was hit, so the
 * counter never moved. Routing the click through here counts it and then
 * forwards the visitor on.
 *
 * A plain redirect rather than a fetch from the client: it works with
 * JavaScript disabled, survives middle-click and "open in new tab", and needs
 * no extra round trip before the visitor leaves.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: dataset } = await supabase
    .from("datasets")
    .select("id, external_url, is_hosted, status")
    .eq("slug", slug)
    .maybeSingle();

  if (!dataset || dataset.is_hosted || !dataset.external_url) {
    return NextResponse.json({ error: "Not a link-only dataset" }, { status: 404 });
  }

  // Never redirect to anything but http(s). external_url is moderator-curated,
  // but an open redirect that forwards to `javascript:` or an arbitrary scheme
  // is the kind of thing that turns one bad row into a phishing vector.
  let destination: URL;
  try {
    destination = new URL(dataset.external_url);
  } catch {
    return NextResponse.json({ error: "Malformed source URL" }, { status: 500 });
  }
  if (destination.protocol !== "https:" && destination.protocol !== "http:") {
    return NextResponse.json({ error: "Unsupported source URL" }, { status: 500 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 'link' rather than a file format, so referrals stay distinguishable from
  // real file downloads when reading download_log later.
  await supabase.from("download_log").insert({
    dataset_id: dataset.id,
    user_id: user?.id ?? null,
    format: "link",
  });

  // Security-definer RPC; it only touches rows with status = 'published'.
  await supabase.rpc("increment_download_count", { p_dataset_id: dataset.id });

  // 302, not 307/308: this is a tracking hop, and it must never be cached.
  return NextResponse.redirect(destination.toString(), {
    status: 302,
    headers: { "Cache-Control": "no-store" },
  });
}
