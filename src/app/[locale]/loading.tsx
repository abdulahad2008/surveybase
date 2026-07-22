import { getTranslations } from "next-intl/server";

export default async function Loading() {
  const t = await getTranslations("Common");

  return (
    <main className="mx-auto flex w-full flex-1 items-center justify-center px-4 py-16">
      <p className="text-sm text-gray-500 dark:text-gray-400">{t("loading")}</p>
    </main>
  );
}
