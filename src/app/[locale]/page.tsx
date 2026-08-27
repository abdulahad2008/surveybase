import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { queryDatasets, getArchiveStats, getFilterOptions } from "@/lib/datasets";
import { DatasetCard } from "./datasets/dataset-card";
import { topicColor } from "@/lib/topic-colors";
import { topicLabel } from "@/lib/survey-vocab";
import {
  ArrowRightIcon,
  ChartIcon,
  DatabaseIcon,
  DownloadIcon,
  QuoteIcon,
  SearchIcon,
  ShieldIcon,
  SparkleIcon,
  UploadIcon,
  UsersIcon,
} from "@/components/icons";

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations("Home");
  const v = await getTranslations("Vocab");
  const supabase = await createClient();

  const [{ datasets: newest }, { datasets: mostDownloaded }, stats, options] = await Promise.all([
    queryDatasets(supabase, { sort: "newest", pageSize: 6 }),
    queryDatasets(supabase, { sort: "downloads", pageSize: 3 }),
    getArchiveStats(supabase),
    getFilterOptions(supabase),
  ]);

  const nf = new Intl.NumberFormat(locale);
  const popularTopics = options.topics.slice(0, 6);

  return (
    <main className="flex-1">
      {/* ---------------------------------------------------------------- */}
      {/* Hero                                                              */}
      {/* ---------------------------------------------------------------- */}
      <section className="relative overflow-hidden">
        {/* soft background blobs */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 -right-24 h-96 w-96 rounded-full bg-brand-soft blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-40 -left-24 h-80 w-80 rounded-full bg-coral-soft blur-3xl"
        />

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pt-14 pb-16 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:pt-20">
          <div className="space-y-7">
            <p className="fade-up inline-flex items-center gap-2 rounded-full border border-line bg-card px-4 py-1.5 text-xs font-semibold text-soft shadow-card">
              <SparkleIcon size={14} className="text-sun" />
              {t("eyebrow")}
            </p>

            <h1 className="font-display text-4xl leading-[1.08] font-extrabold tracking-tight text-ink sm:text-5xl lg:text-[3.4rem]">
              {t.rich("headline", {
                highlight: (chunks) => <span className="squiggle text-brand">{chunks}</span>,
              })}
            </h1>

            <p className="max-w-xl text-lg leading-relaxed text-soft">{t("subtitle")}</p>

            {/* search */}
            <form action={`/${locale}/datasets`} method="get" className="max-w-xl">
              <div className="flex items-center gap-2 rounded-full border border-line-strong bg-card p-1.5 pl-4 shadow-card transition focus-within:border-brand focus-within:shadow-lift">
                <SearchIcon size={18} className="shrink-0 text-faint" />
                <input
                  type="search"
                  name="q"
                  placeholder={t("searchPlaceholder")}
                  className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-faint"
                />
                <button type="submit" className="btn btn-primary btn-sm shrink-0">
                  {t("searchButton")}
                </button>
              </div>
            </form>

            {popularTopics.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-faint">{t("popularTopics")}</span>
                {popularTopics.map((topic) => {
                  const c = topicColor(topic);
                  return (
                    <Link
                      key={topic}
                      href={`/datasets?topic=${encodeURIComponent(topic)}`}
                      className="chip transition hover:scale-105"
                      style={{ background: c.bg, color: c.text }}
                    >
                      {topicLabel(topic, v)}
                    </Link>
                  );
                })}
              </div>
            )}

            {/* dual path */}
            <div className="flex flex-wrap gap-3 pt-1">
              <Link href="/datasets" className="btn btn-primary">
                <SearchIcon size={16} />
                {t("ctaFind")}
              </Link>
              <Link href="/deposit" className="btn btn-coral">
                <UploadIcon size={16} />
                {t("ctaShare")}
              </Link>
            </div>
          </div>

          {/* decorative data composition */}
          <div aria-hidden className="relative hidden justify-center lg:flex">
            <div className="card w-full max-w-sm space-y-5 p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="h-2.5 w-28 rounded-full bg-card-soft" />
                  <div className="h-2 w-20 rounded-full bg-card-soft" />
                </div>
                <span className="chip" style={{ background: "var(--mint-soft)", color: "var(--mint)" }}>
                  <ShieldIcon size={12} />
                  {t("mockAnonymized")}
                </span>
              </div>
              <div className="flex h-40 items-end justify-between gap-3 rounded-2xl bg-card-soft/60 p-4">
                {[
                  { h: 58, c: "var(--brand)", d: "0ms" },
                  { h: 92, c: "var(--coral)", d: "80ms" },
                  { h: 74, c: "var(--mint)", d: "160ms" },
                  { h: 115, c: "var(--sun)", d: "240ms" },
                  { h: 45, c: "var(--rose)", d: "320ms" },
                  { h: 84, c: "var(--sky)", d: "400ms" },
                ].map((bar, i) => (
                  <span
                    key={i}
                    className="bar-grow w-full rounded-t-md rounded-b-[4px]"
                    style={{ height: `${bar.h}px`, background: bar.c, animationDelay: bar.d }}
                  />
                ))}
              </div>
              <div className="flex items-center justify-between text-xs font-semibold text-faint">
                <span className="tnum">n = {nf.format(1204)}</span>
                <span className="inline-flex items-center gap-1">
                  <DownloadIcon size={13} />
                  CSV · XLSX · JSON
                </span>
              </div>
            </div>

            {/* floating chips */}
            <div className="float-soft absolute -top-4 -left-2 rounded-2xl border border-line bg-card px-4 py-3 shadow-lift">
              <p className="flex items-center gap-2 text-xs font-bold text-ink">
                <ChartIcon size={14} className="text-brand" />
                {t("mockAutoCharts")}
              </p>
            </div>
            <div
              className="float-soft absolute -bottom-5 right-0 rounded-2xl border border-line bg-card px-4 py-3 shadow-lift"
              style={{ animationDelay: "1.2s" }}
            >
              <p className="flex items-center gap-2 text-xs font-bold text-ink">
                <QuoteIcon size={14} className="text-coral" />
                {t("mockCitation")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Stats band                                                        */}
      {/* ---------------------------------------------------------------- */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatTile
            icon={<DatabaseIcon size={18} />}
            iconBg="var(--brand-soft)"
            iconColor="var(--brand)"
            value={nf.format(stats.datasetCount)}
            label={t("statDatasets")}
          />
          <StatTile
            icon={<UsersIcon size={18} />}
            iconBg="var(--coral-soft)"
            iconColor="var(--coral)"
            value={nf.format(stats.totalRespondents)}
            label={t("statRespondents")}
          />
          <StatTile
            icon={<DownloadIcon size={18} />}
            iconBg="var(--mint-soft)"
            iconColor="var(--mint)"
            value={nf.format(stats.totalDownloads)}
            label={t("statDownloads")}
          />
          <StatTile
            icon={<SparkleIcon size={18} />}
            iconBg="var(--sun-soft)"
            iconColor="var(--sun)"
            value={nf.format(stats.topicCount)}
            label={t("statTopics")}
          />
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* How it works — two paths                                          */}
      {/* ---------------------------------------------------------------- */}
      <section className="mx-auto max-w-6xl px-4 pt-20 sm:px-6">
        <div className="mx-auto max-w-2xl space-y-3 text-center">
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-ink">
            {t("howHeading")}
          </h2>
          <p className="text-soft">{t("howSubtitle")}</p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          {/* find data path */}
          <div className="card space-y-6 p-7">
            <span className="chip" style={{ background: "var(--brand-soft)", color: "var(--brand-ink)" }}>
              <SearchIcon size={13} />
              {t("pathFindLabel")}
            </span>
            <ol className="space-y-5">
              <Step n={1} color="var(--brand)" title={t("findStep1Title")} text={t("findStep1Text")} />
              <Step n={2} color="var(--brand)" title={t("findStep2Title")} text={t("findStep2Text")} />
              <Step n={3} color="var(--brand)" title={t("findStep3Title")} text={t("findStep3Text")} />
            </ol>
            <Link href="/datasets" className="btn btn-soft">
              {t("pathFindCta")}
              <ArrowRightIcon size={15} />
            </Link>
          </div>

          {/* share data path */}
          <div className="card space-y-6 p-7">
            <span className="chip" style={{ background: "var(--coral-soft)", color: "var(--coral)" }}>
              <UploadIcon size={13} />
              {t("pathShareLabel")}
            </span>
            <ol className="space-y-5">
              <Step n={1} color="var(--coral)" title={t("shareStep1Title")} text={t("shareStep1Text")} />
              <Step n={2} color="var(--coral)" title={t("shareStep2Title")} text={t("shareStep2Text")} />
              <Step n={3} color="var(--coral)" title={t("shareStep3Title")} text={t("shareStep3Text")} />
            </ol>
            <Link href="/deposit" className="btn btn-coral">
              {t("pathShareCta")}
              <ArrowRightIcon size={15} />
            </Link>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Anonymization trust banner                                        */}
      {/* ---------------------------------------------------------------- */}
      <section className="mx-auto max-w-6xl px-4 pt-14 sm:px-6">
        <div className="flex flex-col items-start gap-4 rounded-3xl border border-line bg-mint-soft/60 p-7 sm:flex-row sm:items-center">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-mint text-white">
            <ShieldIcon size={22} />
          </span>
          <div>
            <p className="font-display text-lg font-bold text-ink">{t("trustHeading")}</p>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-soft">{t("trustText")}</p>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Dataset shelves                                                   */}
      {/* ---------------------------------------------------------------- */}
      <section className="mx-auto max-w-6xl space-y-14 px-4 pt-20 sm:px-6">
        {newest.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="font-display text-lg font-bold text-ink">{t("emptyHeading")}</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-soft">{t("empty")}</p>
            <Link href="/deposit" className="btn btn-primary mt-6">
              <UploadIcon size={16} />
              {t("ctaShare")}
            </Link>
          </div>
        ) : (
          <>
            <Shelf
              heading={t("newestHeading")}
              viewAllLabel={t("viewAll")}
              viewAllHref="/datasets?sort=newest"
              datasets={newest}
            />
            {mostDownloaded.length > 0 && (
              <Shelf
                heading={t("mostDownloadedHeading")}
                viewAllLabel={t("viewAll")}
                viewAllHref="/datasets?sort=downloads"
                datasets={mostDownloaded}
              />
            )}
          </>
        )}
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Final CTA                                                         */}
      {/* ---------------------------------------------------------------- */}
      <section className="mx-auto max-w-6xl px-4 pt-20 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-brand p-10 text-center sm:p-14">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-16 -right-10 h-56 w-56 rounded-full bg-white/10 blur-2xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-black/10 blur-2xl"
          />
          <h2 className="font-display relative text-3xl font-extrabold tracking-tight text-on-brand">
            {t("finalCtaHeading")}
          </h2>
          <p className="relative mx-auto mt-3 max-w-xl text-on-brand/80">{t("finalCtaText")}</p>
          <div className="relative mt-7 flex flex-wrap justify-center gap-3">
            <Link
              href="/deposit"
              className="btn bg-white text-brand-deep shadow-pop hover:-translate-y-0.5"
            >
              <UploadIcon size={16} />
              {t("ctaShare")}
            </Link>
            <Link
              href="/datasets"
              className="btn border-white/40 text-on-brand hover:bg-white/10"
              style={{ borderWidth: 1.5 }}
            >
              {t("ctaFind")}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function StatTile({
  icon,
  iconBg,
  iconColor,
  value,
  label,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  value: string;
  label: string;
}) {
  return (
    <div className="card card-hover flex items-center gap-4 p-5">
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
        style={{ background: iconBg, color: iconColor }}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="font-display tnum truncate text-2xl font-extrabold text-ink">{value}</p>
        <p className="truncate text-xs font-semibold text-faint">{label}</p>
      </div>
    </div>
  );
}

function Step({ n, color, title, text }: { n: number; color: string; title: string; text: string }) {
  return (
    <li className="flex gap-4">
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-extrabold text-white"
        style={{ background: color }}
      >
        {n}
      </span>
      <div>
        <p className="font-semibold text-ink">{title}</p>
        <p className="mt-0.5 text-sm leading-relaxed text-soft">{text}</p>
      </div>
    </li>
  );
}

function Shelf({
  heading,
  viewAllLabel,
  viewAllHref,
  datasets,
}: {
  heading: string;
  viewAllLabel: string;
  viewAllHref: string;
  datasets: Awaited<ReturnType<typeof queryDatasets>>["datasets"];
}) {
  if (datasets.length === 0) return null;
  return (
    <section className="space-y-5">
      <div className="flex items-end justify-between gap-4">
        <h2 className="font-display text-2xl font-extrabold tracking-tight text-ink">{heading}</h2>
        <Link
          href={viewAllHref}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand transition hover:gap-2.5"
        >
          {viewAllLabel}
          <ArrowRightIcon size={15} />
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {datasets.map((d) => (
          <DatasetCard key={d.id} dataset={d} />
        ))}
      </div>
    </section>
  );
}
