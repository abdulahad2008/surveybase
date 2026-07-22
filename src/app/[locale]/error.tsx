"use client";

import { useTranslations } from "next-intl";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("Error");

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-xl font-semibold">{t("heading")}</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400">{t("message")}</p>
      <button
        type="button"
        onClick={reset}
        className="rounded bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
      >
        {t("retry")}
      </button>
    </main>
  );
}
