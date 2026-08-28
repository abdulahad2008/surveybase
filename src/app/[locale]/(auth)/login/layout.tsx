// The page itself is a client component, so its metadata lives here.
import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { routing, type Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: Locale = hasLocale(routing.locales, raw) ? raw : routing.defaultLocale;
  const t = await getTranslations({ locale, namespace: "Auth" });
  return pageMetadata({
    locale,
    path: "/login",
    title: t("loginTitle"),
    description: t("loginSubtitle"),
    index: false,
  });
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
