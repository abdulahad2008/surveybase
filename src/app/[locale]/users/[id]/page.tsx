import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { pageMetadata } from "@/lib/site";
import {
  PUBLIC_PROFILE_COLUMNS,
  getProfileDatasets,
  orcidUrl,
  summarizeDatasets,
  type Profile,
} from "@/lib/profiles";
import { normalizeWebsite } from "@/lib/url";
import { topicLabel } from "@/lib/survey-vocab";
import { Avatar } from "@/components/avatar";
import { DatabaseIcon, DownloadIcon, LinkIcon, MailIcon, UsersIcon } from "@/components/icons";

// A uuid that isn't one will make Postgres error rather than return no rows.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale: raw, id } = await params;
  const locale: Locale = hasLocale(routing.locales, raw) ? raw : routing.defaultLocale;
  const t = await getTranslations({ locale, namespace: "Profile" });

  // A depositor who left their name blank is credited as anonymous everywhere
  // else on the site; the tab title said "Researcher", in English, to everyone.
  let name = t("anonymousResearcher");
  if (UUID.test(id)) {
    const supabase = await createClient();
    const { data } = await supabase.from("profiles").select("name").eq("id", id).maybeSingle();
    name = (data as { name: string | null } | null)?.name?.trim() || name;
  }

  return pageMetadata({
    locale,
    path: `/users/${id}`,
    title: name,
    description: t("publicMetaDescription", { name }),
  });
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: rawLocale, id } = await params;
  const locale: Locale = hasLocale(routing.locales, rawLocale) ? rawLocale : routing.defaultLocale;

  if (!UUID.test(id)) notFound();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(PUBLIC_PROFILE_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  // Same trap as the private page: a query error is indistinguishable from an
  // unknown id once it reaches notFound(). Worse here, because generateMetadata
  // selects only `name` and keeps succeeding, so the page serves a correct
  // <title> around a 404 body and looks half-alive rather than broken.
  if (error) console.error(`[users/${id}] loading public profile failed: ${error.message}`);

  // Returning a real 404 here depends on nothing above this route rendering a
  // Suspense fallback first: [locale]/loading.tsx used to, which committed the
  // response to 200 and left every unknown URL a soft 404. Adding a loading.tsx
  // to this segment or any ancestor brings that back silently.
  const profile = data as unknown as Profile | null;
  if (!profile) notFound();

  const t = await getTranslations("Profile");
  const v = await getTranslations("Vocab");
  const datasets = await getProfileDatasets(supabase, id, { publishedOnly: true });
  const stats = summarizeDatasets(datasets);

  const website = normalizeWebsite(profile.website);
  const orcid = orcidUrl(profile.orcid);
  const memberSince = new Date(profile.created_at).toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
  });

  return (
    <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
      <header className="card flex flex-wrap items-start gap-6 p-6 sm:p-8">
        <Avatar name={profile.name} src={profile.avatar_url} size={88} />

        <div className="min-w-[14rem] flex-1">
          <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">
            {profile.name ?? t("anonymousResearcher")}
          </h1>
          {profile.affiliation && (
            <p className="mt-1 text-sm font-semibold text-soft">{profile.affiliation}</p>
          )}
          <p className="mt-1 text-xs text-faint">{t("memberSince", { date: memberSince })}</p>

          {profile.bio && (
            <p className="mt-4 max-w-prose text-sm leading-relaxed text-soft">{profile.bio}</p>
          )}

          {(website || orcid || profile.contact_email) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {website && (
                <a
                  href={website}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="chip bg-card-soft text-soft transition hover:text-brand"
                >
                  <LinkIcon size={13} />
                  {website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                </a>
              )}
              {orcid && (
                <a
                  href={orcid}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="chip bg-mint-soft text-mint-ink transition hover:opacity-80"
                >
                  ORCID {profile.orcid}
                </a>
              )}
              {profile.contact_email && (
                <a
                  href={`mailto:${profile.contact_email}`}
                  className="chip bg-card-soft text-soft transition hover:text-brand"
                >
                  <MailIcon size={13} />
                  {profile.contact_email}
                </a>
              )}
            </div>
          )}
        </div>
      </header>

      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat icon={<DatabaseIcon size={16} />} value={stats.publishedCount} label={t("statDatasets")} locale={locale} />
        <Stat icon={<DownloadIcon size={16} />} value={stats.totalDownloads} label={t("statDownloadsLabel")} locale={locale} />
        <Stat icon={<UsersIcon size={16} />} value={stats.totalRespondents} label={t("statRespondentsLabel")} locale={locale} />
      </section>

      <section className="mt-10">
        <h2 className="mb-4 font-display text-xl font-bold text-ink">{t("publishedDatasets")}</h2>

        {datasets.length === 0 ? (
          <p className="card p-6 text-sm text-soft">{t("noPublicDatasets")}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {datasets.map((d) => (
              <li key={d.id} className="card card-hover p-4">
                <Link href={`/datasets/${d.slug}`} className="font-semibold text-ink hover:text-brand">
                  {d.title}
                </Link>
                <p className="mt-1 text-xs text-faint">
                  {d.fieldwork_start ? new Date(d.fieldwork_start).getFullYear() : "—"}
                  {d.sample_size ? ` · ${d.sample_size.toLocaleString(locale)}` : ""}
                  {` · ${d.download_count.toLocaleString(locale)} ↓`}
                </p>
                {d.topics?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {d.topics.slice(0, 4).map((topic) => (
                      <span key={topic} className="chip bg-card-soft text-soft">
                        {topicLabel(topic, v)}
                      </span>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function Stat({
  icon,
  value,
  label,
  locale,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  locale: Locale;
}) {
  return (
    <div className="card flex flex-col gap-1 p-4">
      <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-faint">
        {icon}
        {label}
      </span>
      <span className="font-display text-2xl font-bold text-ink">
        {value.toLocaleString(locale)}
      </span>
    </div>
  );
}
