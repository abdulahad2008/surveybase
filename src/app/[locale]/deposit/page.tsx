import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { pageMetadata } from "@/lib/site";
import { redirect } from "@/i18n/navigation";
import { hasLocale } from "next-intl";
import { routing, type Locale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { DepositForm } from "./deposit-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: Locale = hasLocale(routing.locales, raw) ? raw : routing.defaultLocale;
  const t = await getTranslations({ locale, namespace: "Deposit" });
  return pageMetadata({
    locale,
    path: "/deposit",
    title: t("title"),
    description: t("intro").slice(0, 155),
    index: false,
  });
}

export default async function DepositPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = hasLocale(routing.locales, rawLocale) ? rawLocale : routing.defaultLocale;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: "/login", locale });
  }

  // Needed so the review step can show the depositor the citation they will be
  // credited with. Read here rather than in the form: the name belongs to the
  // signed-in user, and the client has no business querying profiles for it.
  const { data: profile } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", user!.id)
    .maybeSingle();

  return (
    <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6">
      <DepositForm
        locale={locale}
        depositorName={profile?.name ?? null}
        maxPublicationYear={new Date().getFullYear() + 1}
      />
    </main>
  );
}
