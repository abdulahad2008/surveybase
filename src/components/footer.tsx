import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Logo } from "./logo";
import { ShieldIcon } from "./icons";

export async function Footer() {
  const t = await getTranslations("Footer");

  return (
    <footer className="mt-20 border-t border-line bg-card">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-sm text-sm leading-relaxed text-soft">{t("blurb")}</p>
          <p className="inline-flex items-center gap-2 rounded-full bg-mint-soft px-3 py-1.5 text-xs font-semibold text-mint-ink">
            <ShieldIcon size={14} />
            {t("anonymizedBadge")}
          </p>
        </div>

        <nav className="space-y-3 text-sm" aria-label={t("exploreHeading")}>
          <p className="font-display text-sm font-bold text-ink">{t("exploreHeading")}</p>
          <ul className="space-y-2 text-soft">
            <li>
              <Link href="/datasets" className="tap-target transition hover:text-brand">
                {t("linkBrowse")}
              </Link>
            </li>
            <li>
              <Link href="/deposit" className="tap-target transition hover:text-brand">
                {t("linkDeposit")}
              </Link>
            </li>
            <li>
              <Link href="/signup" className="tap-target transition hover:text-brand">
                {t("linkSignup")}
              </Link>
            </li>
          </ul>
        </nav>

        <div className="space-y-3 text-sm">
          <p className="font-display text-sm font-bold text-ink">{t("aboutHeading")}</p>
          <p className="leading-relaxed text-soft">{t("aboutText")}</p>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-faint sm:px-6">
          <span>© {new Date().getFullYear()} SurveyBase.uz</span>
          <span>{t("madeIn")}</span>
        </div>
      </div>
    </footer>
  );
}
