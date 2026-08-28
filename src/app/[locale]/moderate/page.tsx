import { redirect } from "@/i18n/navigation";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { routing, type Locale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import {
  CheckIcon,
  ExternalLinkIcon,
  SparkleIcon,
  XIcon,
} from "@/components/icons";
import { approveDataset, rejectDataset } from "./actions";
import {
  collectVocabSuggestions,
  hasVocabSuggestions,
  type VocabColumns,
  type VocabSuggestion,
} from "@/lib/vocab-suggestions";

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

  // Everything depositors typed in an "Other" box, read back out of the
  // datasets themselves. Pending rows count: a topic worth adding to the form
  // is worth seeing before the dataset carrying it is approved.
  const { data: vocabRows } = await supabase
    .from("datasets")
    .select("topics, collection_method, collection_platform, license");
  const suggestions = collectVocabSuggestions(
    (vocabRows ?? []) as unknown as VocabColumns[],
  );

  const t = await getTranslations("Moderate");

  return (
    <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-10 sm:px-6">
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
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-mint-soft text-mint-ink">
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

      {hasVocabSuggestions(suggestions) && (
        <section className="card space-y-5 p-6">
          <div>
            <p className="font-display flex items-center gap-2 font-bold text-ink">
              <SparkleIcon size={17} className="text-brand" />
              {t("vocabHeading")}
            </p>
            <p className="hint">{t("vocabHint")}</p>
          </div>

          <SuggestionGroup
            label={t("vocabTopics")}
            items={suggestions.topics}
            filter="topic"
            locale={locale}
            t={t}
          />
          <SuggestionGroup
            label={t("vocabMethods")}
            items={suggestions.methods}
            filter="method"
            locale={locale}
            t={t}
          />
          {/* Platform and licence have no filter on the browse page, so these
              rows carry no link rather than a link that would filter on
              nothing and come back empty. */}
          <SuggestionGroup
            label={t("vocabPlatforms")}
            items={suggestions.platforms}
            locale={locale}
            t={t}
          />
          <SuggestionGroup
            label={t("vocabLicenses")}
            items={suggestions.licenses}
            locale={locale}
            t={t}
          />
        </section>
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

/**
 * One vocabulary's worth of depositor-typed values. Renders nothing when the
 * vocabulary already covers everything, so the panel shows only what needs a
 * decision.
 */
function SuggestionGroup({
  label,
  items,
  filter,
  locale,
  t,
}: {
  label: string;
  items: VocabSuggestion[];
  filter?: "topic" | "method";
  locale: Locale;
  t: Awaited<ReturnType<typeof getTranslations<"Moderate">>>;
}) {
  if (items.length === 0) return null;

  return (
    <div>
      <p className="text-[10px] font-semibold tracking-wide text-faint uppercase">
        {label}
      </p>
      <ul className="mt-2 flex flex-col gap-1.5">
        {items.map((item) => {
          const count = (
            <span className="text-xs text-soft tnum">
              {t("vocabDatasetCount", { count: item.count })}
            </span>
          );
          return (
            <li
              key={item.value}
              className="flex items-center justify-between gap-3 rounded-xl bg-card-soft px-3.5 py-2"
            >
              <span className="text-sm font-medium text-ink">{item.value}</span>
              {filter ? (
                <a
                  href={`/${locale}/datasets?${filter}=${encodeURIComponent(item.value)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex shrink-0 items-center gap-1.5 transition hover:text-brand"
                >
                  {count}
                  <ExternalLinkIcon size={13} className="text-faint" />
                </a>
              ) : (
                count
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
