import { getTranslations } from "next-intl/server";

export default async function Loading() {
  const t = await getTranslations("Common");

  return (
    <main className="mx-auto flex w-full flex-1 flex-col items-center justify-center gap-4 px-4 py-24">
      <div aria-hidden className="flex h-10 items-end gap-1.5">
        <span className="loading-bar h-full w-2.5 rounded-full bg-brand" />
        <span className="loading-bar h-full w-2.5 rounded-full bg-coral" style={{ animationDelay: "150ms" }} />
        <span className="loading-bar h-full w-2.5 rounded-full bg-mint" style={{ animationDelay: "300ms" }} />
        <span className="loading-bar h-full w-2.5 rounded-full bg-sun" style={{ animationDelay: "450ms" }} />
      </div>
      <p className="text-sm font-medium text-faint">{t("loading")}</p>
    </main>
  );
}
