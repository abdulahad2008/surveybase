import type { Metadata } from "next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ThemeScript } from "@/components/theme-script";
import "@fontsource-variable/inter";
import "@fontsource-variable/bricolage-grotesque";
import "../globals.css";

export const metadata: Metadata = {
  title: {
    default: "SurveyBase.uz — the open survey archive of Uzbekistan",
    template: "%s · SurveyBase.uz",
  },
  description:
    "An open archive of anonymized survey results about Uzbekistan and Central Asia. Browse, explore charts, download, and cite — or give your own survey a second life.",
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
          <Header />
          {children}
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
