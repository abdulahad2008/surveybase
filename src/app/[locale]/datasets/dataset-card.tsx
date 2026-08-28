import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { DatasetSummary } from "@/lib/datasets";
import { topicColor } from "@/lib/topic-colors";
import { topicLabel } from "@/lib/survey-vocab";
import { CalendarIcon, DownloadIcon, GlobeIcon, UsersIcon } from "@/components/icons";

export async function DatasetCard({
  dataset,
  locale,
}: {
  dataset: DatasetSummary;
  locale?: string;
}) {
  const t = await getTranslations("Browse");
  const v = await getTranslations("Vocab");
  const fieldworkYear = dataset.fieldwork_start
    ? new Date(dataset.fieldwork_start).getFullYear()
    : null;
  const accent = topicColor(dataset.topics[0] ?? dataset.title);
  const nf = new Intl.NumberFormat(locale);

  return (
    <Link
      href={`/datasets/${dataset.slug}`}
      className="card card-hover group relative flex flex-col overflow-hidden p-5 pt-6"
    >
      {/* topic accent strip */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-1.5"
        style={{ background: accent.solid }}
      />

      <h3 className="font-display line-clamp-2 text-base font-bold leading-snug text-ink transition group-hover:text-brand">
        {dataset.title}
      </h3>

      {dataset.abstract && (
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-soft">{dataset.abstract}</p>
      )}

      {dataset.topics.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {dataset.topics.slice(0, 3).map((topic) => {
            const c = topicColor(topic);
            return (
              <span key={topic} className="chip" style={{ background: c.bg, color: c.text }}>
                {topicLabel(topic, v)}
              </span>
            );
          })}
          {dataset.topics.length > 3 && (
            <span className="chip bg-card-soft text-faint">+{dataset.topics.length - 3}</span>
          )}
        </div>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-4 text-xs font-medium text-faint">
        <span className="inline-flex items-center gap-1.5">
          <GlobeIcon size={13} />
          {[dataset.country, dataset.region].filter(Boolean).join(" · ")}
        </span>
        {fieldworkYear && (
          <span className="inline-flex items-center gap-1.5 tnum">
            <CalendarIcon size={13} />
            {fieldworkYear}
          </span>
        )}
        {dataset.sample_size != null && (
          <span className="inline-flex items-center gap-1.5 tnum">
            <UsersIcon size={13} />
            {t("cardSampleSize", {
              count: dataset.sample_size,
              value: nf.format(dataset.sample_size),
            })}
          </span>
        )}
        {/* The figure is the whole label here, so on its own it reaches a
            screen reader as a bare number next to an icon it cannot read. */}
        <span className="inline-flex items-center gap-1.5 tnum">
          <DownloadIcon size={13} />
          <span aria-hidden>{nf.format(dataset.download_count)}</span>
          <span className="sr-only">
            {t("cardDownloads", {
              count: dataset.download_count,
              value: nf.format(dataset.download_count),
            })}
          </span>
        </span>
      </div>
    </Link>
  );
}
