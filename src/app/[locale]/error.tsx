"use client";

import { useTranslations } from "next-intl";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("Error");

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-5 px-4 py-16 text-center">
      <span aria-hidden className="font-display text-6xl font-extrabold text-brand-soft">
        :(
      </span>
      <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">{t("heading")}</h1>
      <p className="text-sm leading-relaxed text-soft">{t("message")}</p>
      <button type="button" onClick={reset} className="btn btn-primary">
        {t("retry")}
      </button>
    </main>
  );
}
