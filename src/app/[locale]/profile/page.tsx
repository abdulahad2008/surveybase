import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import {
  OWN_PROFILE_COLUMNS,
  getProfileDatasets,
  summarizeDatasets,
  type Profile,
} from "@/lib/profiles";
import { ArrowRightIcon, DownloadIcon, ExternalLinkIcon, UsersIcon } from "@/components/icons";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Profile" };

const statusChip: Record<string, string> = {
  published: "bg-mint-soft text-mint",
  pending: "bg-sun-soft text-warning",
  draft: "bg-card-soft text-soft",
  rejected: "bg-danger-soft text-danger",
};

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = hasLocale(routing.locales, rawLocale) ? rawLocale : routing.defaultLocale;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: "/login", locale });
  }

  const { data } = await supabase
    .from("profiles")
    .select(OWN_PROFILE_COLUMNS)
    .eq("id", user!.id)
    .single();

  const profile = data as unknown as Profile | null;
  if (!profile) {
    // The handle_new_user trigger creates this row at signup; if it is missing
    // something went wrong server-side and there is nothing sensible to edit.
    redirect({ href: "/", locale });
  }

  const t = await getTranslations("Profile");
  const datasets = await getProfileDatasets(supabase, user!.id, { publishedOnly: false });
  const stats = summarizeDatasets(datasets);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">{t("title")}</h1>
          <p className="mt-1 text-sm text-soft">{t("intro")}</p>
        </div>
        <Link href={`/users/${profile!.id}`} className="btn btn-ghost btn-sm">
          {t("viewPublic")}
          <ExternalLinkIcon size={15} />
        </Link>
      </div>

      <ProfileForm locale={locale} profile={profile!} />

      <section className="mt-12">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-bold text-ink">{t("myDatasets")}</h2>
          {datasets.length > 0 && (
            <div className="flex gap-4 text-sm text-soft">
              <span className="inline-flex items-center gap-1.5">
                <DownloadIcon size={15} />
                {t("statDownloads", { count: stats.totalDownloads })}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <UsersIcon size={15} />
                {t("statRespondents", { count: stats.totalRespondents })}
              </span>
            </div>
          )}
        </div>

        {datasets.length === 0 ? (
          <div className="card flex flex-col items-start gap-3 p-6">
            <p className="text-sm text-soft">{t("noDatasets")}</p>
            <Link href="/deposit" className="btn btn-soft btn-sm">
              {t("depositCta")}
              <ArrowRightIcon size={15} />
            </Link>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {datasets.map((d) => (
              <li key={d.id} className="card card-hover flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-[12rem] flex-1">
                  {d.status === "published" ? (
                    <Link
                      href={`/datasets/${d.slug}`}
                      className="font-semibold text-ink hover:text-brand"
                    >
                      {d.title}
                    </Link>
                  ) : (
                    <span className="font-semibold text-ink">{d.title}</span>
                  )}
                  <p className="mt-0.5 text-xs text-faint">
                    {new Date(d.created_at).toLocaleDateString(locale)}
                    {d.sample_size ? ` · ${d.sample_size.toLocaleString(locale)}` : ""}
                  </p>
                </div>
                <span className={`chip ${statusChip[d.status] ?? "bg-card-soft text-soft"}`}>
                  {t(`status_${d.status}` as "status_published")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
