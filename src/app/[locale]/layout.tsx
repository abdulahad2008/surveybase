import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { SITE_URL } from "@/lib/site";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ThemeScript } from "@/components/theme-script";
import "@fontsource-variable/inter";
import "@fontsource-variable/bricolage-grotesque";
import "../globals.css";

export const metadata: Metadata = {
  // Without this, any relative `alternates`/`openGraph` URL a page declares is
  // dropped from the rendered head rather than resolved.
  metadataBase: new URL(SITE_URL),
  title: {
    default: "SurveyBase.uz — the open survey archive of Uzbekistan",
    template: "%s · SurveyBase.uz",
  },
  description:
    "An open archive of survey results about Uzbekistan and Central Asia. Browse, explore charts, download, and cite — or give your own survey a second life.",
};

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const t = await getTranslations({ locale, namespace: "Nav" });

  return (
    // suppressHydrationWarning: the inline script below rewrites data-theme on
    // <html> before React hydrates, so the DOM legitimately differs from the
    // server payload. It applies to this element's attributes only, not to the
    // tree beneath it.
    <html lang={locale} className="h-full antialiased" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider>
          {/* Reaching the content by keyboard otherwise means tabbing past every
              header control on every navigation. Hidden until focused, so it
              costs sighted users nothing. */}
          <a
            href="#main-content"
            className="sr-only rounded-full focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-on-brand focus:shadow-pop focus:outline-none"
          >
            {t("skipToContent")}
          </a>
          <Header />
          {children}
          <Footer />
          {/* Page views. Cookieless and aggregate-only — no identifiers reach
              Vercel, which is the only kind of measurement this site can take
              while promising visitors it does not track them. Said out loud on
              /privacy rather than left for someone to discover. */}
          <Analytics />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
