import { redirect } from "@/i18n/navigation";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { routing, type Locale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { CheckIcon, ExternalLinkIcon, XIcon } from "@/components/icons";
import { approveDataset, rejectDataset } from "./actions";

interface PendingDataset {
  id: string;
  title: string;
  slug: string;
  abstract: string | null;
  country: string;
  sample_size: number | null;
  created_at: string;
  depositor: { name: string | null; affiliation: string | null } | null;
}

export default async function ModeratePage({
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();

  if (profile?.role !== "moderator" && profile?.role !== "admin") {
    redirect({ href: "/", locale });
  }

  const { data } = await supabase
    .from("datasets")
    .select(
      `id, title, slug, abstract, country, sample_size, created_at,
      depositor:profiles!datasets_depositor_id_fkey ( name, affiliation )`,
    )
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  const pending = (data ?? []) as unknown as PendingDataset[];
  const t = await getTranslations("Moderate");

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">
          {t("title")}
        </h1>
        {pending.length > 0 && (
          <span className="rounded-full bg-sun-soft px-3 py-1 text-sm font-bold text-ink tnum">
            {pending.length}
          </span>
        )}
      </div>

      {pending.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 p-12 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-mint-soft text-mint">
            <CheckIcon size={26} />
          </span>
          <p className="font-display text-lg font-bold text-ink">{t("emptyHeading")}</p>
          <p className="text-sm text-soft">{t("empty")}</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {pending.map((dataset) => (
            <li key={dataset.id} className="card space-y-4 p-6">
              <div>
                <a
                  href={`/${locale}/datasets/${dataset.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-display inline-flex items-center gap-2 text-lg font-bold text-ink transition hover:text-brand"
                >
                  {dataset.title}
                  <ExternalLinkIcon size={15} className="text-faint" />
                </a>
                {dataset.abstract && (
                  <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-soft">
                    {dataset.abstract}
                  </p>
                )}
              </div>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs sm:grid-cols-4">
                <MetaItem label={t("colDepositor")} value={dataset.depositor?.name ?? t("unknownDepositor")} />
                <MetaItem label={t("colCountry")} value={dataset.country} />
                <MetaItem label={t("colSampleSize")} value={dataset.sample_size?.toString() ?? "—"} />
                <MetaItem
                  label={t("colSubmitted")}
                  value={new Date(dataset.created_at).toLocaleDateString(locale)}
                />
              </dl>
              <div className="flex gap-2.5">
                <form
                  action={async () => {
                    "use server";
                    await approveDataset(locale, dataset.id);
                  }}
                >
                  <button type="submit" className="btn btn-sm bg-mint text-white hover:brightness-105">
                    <CheckIcon size={14} />
                    {t("approve")}
                  </button>
                </form>
                <form
                  action={async () => {
                    "use server";
                    await rejectDataset(locale, dataset.id);
                  }}
                >
                  <button
                    type="submit"
                    className="btn btn-ghost btn-sm text-danger hover:bg-danger-soft"
                  >
                    <XIcon size={14} />
                    {t("reject")}
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold tracking-wide text-faint uppercase">{label}</dt>
      <dd className="mt-0.5 font-medium text-ink">{value}</dd>
    </div>
  );
}
