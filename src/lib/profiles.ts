import type { SupabaseClient } from "@supabase/supabase-js";

export interface Profile {
  id: string;
  name: string | null;
  affiliation: string | null;
  bio: string | null;
  contact_email: string | null;
  website: string | null;
  orcid: string | null;
  avatar_url: string | null;
  role: string;
  created_at: string;
}

/**
 * `role` is intentionally not selected for public pages — it is an internal
 * moderation concept, not something a visitor needs to see.
 */
export const PUBLIC_PROFILE_COLUMNS =
  "id, name, affiliation, bio, contact_email, website, orcid, avatar_url, created_at";

export const OWN_PROFILE_COLUMNS = `${PUBLIC_PROFILE_COLUMNS}, role`;

export interface ProfileStats {
  publishedCount: number;
  totalDownloads: number;
  totalRespondents: number;
}

export interface ProfileDataset {
  id: string;
  title: string;
  slug: string;
  status: string;
  topics: string[];
  sample_size: number | null;
  fieldwork_start: string | null;
  download_count: number;
  created_at: string;
}

const DATASET_COLUMNS =
  "id, title, slug, status, topics, sample_size, fieldwork_start, download_count, created_at";

/**
 * Datasets deposited by one person.
 *
 * `publishedOnly` must stay true for public pages. RLS would hide other
 * people's drafts anyway, but a moderator browsing a public profile has
 * visibility of every pending row — without this filter their view of a
 * public page would silently differ from everyone else's.
 */
export async function getProfileDatasets(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  profileId: string,
  { publishedOnly }: { publishedOnly: boolean },
): Promise<ProfileDataset[]> {
  let query = supabase
    .from("datasets")
    .select(DATASET_COLUMNS)
    .eq("depositor_id", profileId)
    .order("created_at", { ascending: false });

  if (publishedOnly) query = query.eq("status", "published");

  const { data } = await query;
  return (data as unknown as ProfileDataset[]) ?? [];
}

export function summarizeDatasets(datasets: ProfileDataset[]): ProfileStats {
  const published = datasets.filter((d) => d.status === "published");
  return {
    publishedCount: published.length,
    totalDownloads: published.reduce((sum, d) => sum + (d.download_count ?? 0), 0),
    totalRespondents: published.reduce((sum, d) => sum + (d.sample_size ?? 0), 0),
  };
}

export function orcidUrl(orcid: string | null): string | null {
  return orcid ? `https://orcid.org/${orcid}` : null;
}

/** "Ann Researcher" -> "AR"; used when there is no avatar. */
export function initials(name: string | null): string {
  if (!name?.trim()) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
