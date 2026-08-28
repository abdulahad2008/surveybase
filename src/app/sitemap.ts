import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { supabaseUrl, supabaseAnonKey } from "@/lib/supabase/env";
import { localeAlternates, localeUrl } from "@/lib/site";
import { routing } from "@/i18n/routing";

// Regenerated hourly. A sitemap that is an hour stale costs nothing; querying
// Supabase on every crawler request costs real time on a route bots hit often.
export const revalidate = 3600;

// Deliberately NOT the cookie-aware server client: this route has no user, and
// reading cookies() would force it dynamic. The anon key is enough — RLS
// ("Published datasets are viewable by everyone", 0001_init.sql:137) already
// limits an unauthenticated read to exactly the rows belonging in a sitemap,
// so no service-role key is involved.
function anonClient() {
  return createClient(supabaseUrl(), supabaseAnonKey(), {
    auth: { persistSession: false },
  });
}

interface SitemapDataset {
  slug: string;
  created_at: string;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Every entry is listed at the default locale with hreflang alternates for
  // the others, which is how Google reads a multilingual sitemap: one row per
  // page, not one row per translation.
  const staticPaths = ["", "/datasets", "/privacy", "/terms"];
  const entries: MetadataRoute.Sitemap = staticPaths.map((path) => ({
    url: localeUrl(routing.defaultLocale, path),
    alternates: { languages: localeAlternates(path) },
  }));

  let datasets: SitemapDataset[] = [];
  try {
    const { data, error } = await anonClient()
      .from("datasets")
      .select("slug, created_at")
      .eq("status", "published")
      .order("created_at", { ascending: false });
    if (error) throw new Error(`${error.message} [${error.code}]`);
    datasets = (data ?? []) as SitemapDataset[];
  } catch (cause) {
    // Serving the static entries beats failing: this route is prerendered at
    // build time, so an unreachable (or unconfigured) Supabase would otherwise
    // take the whole deploy down over a file crawlers treat as advisory.
    console.error(`[sitemap] dataset query failed: ${(cause as Error).message}`);
    return entries;
  }

  for (const dataset of datasets) {
    const path = `/datasets/${dataset.slug}`;
    entries.push({
      url: localeUrl(routing.defaultLocale, path),
      // datasets has no updated_at column, so deposit time is the best signal
      // available. It is honest rather than accurate — crawlers treat an
      // always-now lastmod as noise anyway.
      lastModified: dataset.created_at,
      alternates: { languages: localeAlternates(path) },
    });
  }

  return entries;
}
