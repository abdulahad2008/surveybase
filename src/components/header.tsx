import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { LocaleSwitcher } from "./locale-switcher";
import { SignOutButton } from "./sign-out-button";

export async function Header() {
  const t = await getTranslations("Nav");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isModerator = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    isModerator = profile?.role === "moderator" || profile?.role === "admin";
  }

  return (
    <header className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
      <Link href="/" className="text-lg font-semibold">
        SurveyBank.uz
      </Link>
      <nav className="flex items-center gap-4 text-sm">
        <Link href="/">{t("browse")}</Link>
        {user ? (
          <>
            <Link href="/deposit">{t("deposit")}</Link>
            {isModerator && <Link href="/moderate">{t("moderate")}</Link>}
            <SignOutButton label={t("logout")} />
          </>
        ) : (
          <>
            <Link href="/login">{t("login")}</Link>
            <Link href="/signup">{t("signup")}</Link>
          </>
        )}
        <LocaleSwitcher />
      </nav>
    </header>
  );
}
