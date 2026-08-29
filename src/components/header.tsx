import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { Logo } from "./logo";
import { LocaleSwitcher } from "./locale-switcher";
import { SignOutButton } from "./sign-out-button";
import { MobileNav } from "./mobile-nav";
import { ThemeToggle } from "./theme-toggle";
import { UploadIcon, UserIcon } from "./icons";

const navLink =
  "rounded-full px-3 py-2 text-sm font-semibold text-soft transition hover:bg-card-soft hover:text-ink";
const sheetLink =
  "rounded-xl px-4 py-3 text-sm font-semibold text-ink transition hover:bg-card-soft";

export async function Header() {
  const t = await getTranslations("Nav");
  const locale = await getLocale();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isModerator = false;
  let admin = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    isModerator = profile?.role === "moderator" || profile?.role === "admin";
    admin = isAdmin(profile?.role);
  }

  // Staff carry one or two extra links, which is what pushes the inline nav past
  // a 768px viewport. See MobileNav for the measurements.
  const staff = isModerator || admin;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/85 backdrop-blur-md">
      <div className="relative mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Logo />

        {/* desktop nav */}
        <nav
          className={
            staff
              ? "hidden items-center gap-1 lg:flex"
              : "hidden items-center gap-1 md:flex"
          }
        >
          <Link href="/datasets" className={navLink}>
            {t("browse")}
          </Link>
          {isModerator && (
            <Link href="/moderate" className={navLink}>
              {t("moderate")}
            </Link>
          )}
          {admin && (
            <Link href="/admin" className={navLink}>
              {t("admin")}
            </Link>
          )}
          {user ? (
            <>
              <Link
                href="/profile"
                className={`${navLink} inline-flex items-center gap-1.5`}
              >
                <UserIcon size={15} />
                {t("profile")}
              </Link>
              <SignOutButton locale={locale} label={t("logout")} />
            </>
          ) : (
            <Link href="/login" className={navLink}>
              {t("login")}
            </Link>
          )}
          <div className="mx-2 flex items-center gap-2">
            <ThemeToggle label={t("toggleTheme")} />
            <LocaleSwitcher />
          </div>
          <Link href="/deposit" className="btn btn-primary btn-sm">
            <UploadIcon size={15} />
            {t("deposit")}
          </Link>
        </nav>

        {/* mobile nav

            Theme and language sit inside the sheet rather than beside the menu
            button. As three separate controls next to the logo they measured
            33px wider than a 375px viewport, and because the header is sticky
            that overflow scrolled every page on the site sideways — not just
            this component. Collapsing them to one button removes the cause
            rather than clipping the symptom. */}
        <MobileNav label={t("menu")} wide={staff}>
          <Link href="/datasets" className={sheetLink}>
            {t("browse")}
          </Link>
          <Link href="/deposit" className={sheetLink}>
            {t("deposit")}
          </Link>
          {isModerator && (
            <Link href="/moderate" className={sheetLink}>
              {t("moderate")}
            </Link>
          )}
          {admin && (
            <Link href="/admin" className={sheetLink}>
              {t("admin")}
            </Link>
          )}
          {user ? (
            <>
              <Link href="/profile" className={sheetLink}>
                {t("profile")}
              </Link>
              <div className="px-2">
                <SignOutButton locale={locale} label={t("logout")} />
              </div>
            </>
          ) : (
            <>
              <Link href="/login" className={sheetLink}>
                {t("login")}
              </Link>
              <Link href="/signup" className={sheetLink}>
                {t("signup")}
              </Link>
            </>
          )}
          <div className="mt-1 flex items-center justify-between gap-2 border-t border-line px-2 pt-3">
            <LocaleSwitcher />
            <ThemeToggle label={t("toggleTheme")} />
          </div>
        </MobileNav>
      </div>
    </header>
  );
}
