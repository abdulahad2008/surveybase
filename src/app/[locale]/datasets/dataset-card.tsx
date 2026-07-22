import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { DatasetSummary } from "@/lib/datasets";

export async function DatasetCard({ dataset }: { dataset: DatasetSummary }) {
  const t = await getTranslations("Browse");
  const fieldworkYear = dataset.fieldwork_start
    ? new Date(dataset.fieldwork_start).getFullYear()
    : null;

  return (
    <Link
      href={`/datasets/${dataset.slug}`}
      className="block rounded border border-gray-200 p-4 transition hover:border-gray-400 dark:border-gray-800 dark:hover:border-gray-600"
    >
      <h3 className="font-medium">{dataset.title}</h3>
      {dataset.abstract && (
        <p className="mt-1 line-clamp-2 text-sm text-gray-600 dark:text-gray-400">
          {dataset.abstract}
        </p>
      )}
      {dataset.topics.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {dataset.topics.slice(0, 4).map((topic) => (
            <span
              key={topic}
              className="rounded-full bg-gray-100 px-2 py-0.5 text-xs dark:bg-gray-800"
            >
              {topic}
            </span>
          ))}
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
        <span>{[dataset.country, dataset.region].filter(Boolean).join(" · ")}</span>
        {fieldworkYear && <span>{fieldworkYear}</span>}
        {dataset.sample_size != null && (
          <span>{t("cardSampleSize", { count: dataset.sample_size })}</span>
        )}
        <span>{t("cardDownloads", { count: dataset.download_count })}</span>
      </div>
    </Link>
  );
}
