"use client";

import { useLocale, useTranslations } from "next-intl";
import { routing } from "@/i18n/routing";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useParams } from "next/navigation";

const LABELS: Record<string, string> = {
  uz: "O'z",
  ru: "Ру",
  en: "En",
};

export function LocaleSwitcher() {
  const t = useTranslations("Nav");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();

  return (
    <div
      role="group"
      aria-label={t("selectLanguage")}
      className="flex items-center gap-0.5 rounded-full border border-line-strong p-0.5"
    >
      {routing.locales.map((l) => (
        <button
          key={l}
          type="button"
          aria-pressed={l === locale}
          onClick={() => {
            router.replace(
              // @ts-expect-error -- params come from the current route
              { pathname, params },
              { locale: l },
            );
          }}
          className={
            l === locale
              ? "rounded-full bg-brand px-2.5 py-1 text-xs font-bold text-on-brand"
              : "rounded-full px-2.5 py-1 text-xs font-semibold text-soft transition hover:bg-card-soft hover:text-ink"
          }
        >
          {LABELS[l]}
        </button>
      ))}
    </div>
  );
}
