import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { queryDatasets } from "@/lib/datasets";
import { DatasetCard } from "./datasets/dataset-card";

export default async function Home() {
  const t = await getTranslations("Home");
  const supabase = await createClient();

  const [{ datasets: newest }, { datasets: mostDownloaded }] = await Promise.all([
    queryDatasets(supabase, { sort: "newest", pageSize: 6 }),
    queryDatasets(supabase, { sort: "downloads", pageSize: 6 }),
  ]);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-12 px-6 py-16">
      <div className="space-y-4 text-center">
        <h1 className="text-4xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mx-auto max-w-xl text-lg text-gray-600 dark:text-gray-400">
          {t("subtitle")}
        </p>
        <Link
          href="/datasets"
          className="inline-block rounded bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
        >
          {t("cta")}
        </Link>
      </div>

      {newest.length === 0 ? (
        <p className="text-center text-sm text-gray-500 dark:text-gray-400">{t("empty")}</p>
      ) : (
        <>
          <DatasetSection heading={t("newestHeading")} viewAllLabel={t("viewAll")} viewAllHref="/datasets?sort=newest" datasets={newest} />
          <DatasetSection
            heading={t("mostDownloadedHeading")}
            viewAllLabel={t("viewAll")}
            viewAllHref="/datasets?sort=downloads"
            datasets={mostDownloaded}
          />
        </>
      )}
    </main>
  );
}

function DatasetSection({
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
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">{heading}</h2>
        <Link href={viewAllHref} className="text-sm underline">
          {viewAllLabel}
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
