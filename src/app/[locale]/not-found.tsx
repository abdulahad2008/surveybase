import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("NotFound");

  return (
    <main id="main-content" tabIndex={-1} className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-5 px-4 py-16 text-center">
      <div aria-hidden className="flex items-end gap-2">
        <span className="h-10 w-4 rounded-full bg-brand-soft" />
        <span className="h-16 w-4 rounded-full bg-brand" />
        <span className="h-7 w-4 rounded-full bg-coral" />
        <span className="h-12 w-4 rounded-full bg-sun" />
      </div>
      <p className="font-display text-5xl font-extrabold tracking-tight text-ink">404</p>
      <h1 className="font-display text-xl font-bold text-ink">{t("heading")}</h1>
      <p className="text-sm leading-relaxed text-soft">{t("message")}</p>
      <Link href="/" className="btn btn-primary">
        {t("backHome")}
      </Link>
    </main>
  );
}
