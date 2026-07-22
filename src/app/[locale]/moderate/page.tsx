import { redirect } from "@/i18n/navigation";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { routing, type Locale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
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
    <main className="mx-auto max-w-3xl space-y-6 px-6 py-10">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>

      {pending.length === 0 ? (
        <p className="text-sm text-gray-600 dark:text-gray-400">{t("empty")}</p>
      ) : (
        <ul className="space-y-4">
          {pending.map((dataset) => (
            <li
              key={dataset.id}
              className="space-y-3 rounded border border-gray-200 p-4 dark:border-gray-800"
            >
              <div>
                <a
                  href={`/${locale}/datasets/${dataset.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium underline"
                >
                  {dataset.title}
                </a>
                {dataset.abstract && (
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    {dataset.abstract}
                  </p>
                )}
              </div>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-gray-600 sm:grid-cols-4 dark:text-gray-400">
                <div>
                  <dt className="uppercase tracking-wide">{t("colDepositor")}</dt>
                  <dd>{dataset.depositor?.name ?? t("unknownDepositor")}</dd>
                </div>
                <div>
                  <dt className="uppercase tracking-wide">{t("colCountry")}</dt>
                  <dd>{dataset.country}</dd>
                </div>
                <div>
                  <dt className="uppercase tracking-wide">{t("colSampleSize")}</dt>
                  <dd>{dataset.sample_size ?? "—"}</dd>
                </div>
                <div>
                  <dt className="uppercase tracking-wide">{t("colSubmitted")}</dt>
                  <dd>{new Date(dataset.created_at).toLocaleDateString(locale)}</dd>
                </div>
              </dl>
              <div className="flex gap-3">
                <form
                  action={async () => {
                    "use server";
                    await approveDataset(locale, dataset.id);
                  }}
                >
                  <button
                    type="submit"
                    className="rounded bg-black px-3 py-1.5 text-sm font-medium text-white dark:bg-white dark:text-black"
                  >
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
                    className="rounded border border-gray-300 px-3 py-1.5 text-sm font-medium dark:border-gray-700"
                  >
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
