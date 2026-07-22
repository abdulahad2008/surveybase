import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("NotFound");

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-xl font-semibold">{t("heading")}</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400">{t("message")}</p>
      <Link
        href="/"
        className="rounded bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
      >
        {t("backHome")}
      </Link>
    </main>
  );
}
