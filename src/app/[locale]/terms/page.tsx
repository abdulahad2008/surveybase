import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { routing, type Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/site";
import { LegalPage, type LegalSection } from "@/components/legal-page";

const SECTIONS: LegalSection[] = [
  { heading: "termsWhatHeading", body: "termsWhatBody" },
  { heading: "termsAccountHeading", body: "termsAccountBody" },
  { heading: "termsDepositHeading", body: "termsDepositBody" },
  { heading: "termsLicenseHeading", body: "termsLicenseBody" },
  { heading: "termsModerationHeading", body: "termsModerationBody" },
  { heading: "termsReuseHeading", body: "termsReuseBody" },
  { heading: "termsWarrantyHeading", body: "termsWarrantyBody" },
  { heading: "termsLiabilityHeading", body: "termsLiabilityBody" },
  { heading: "termsTakedownHeading", body: "termsTakedownBody" },
  { heading: "termsChangesHeading", body: "termsChangesBody" },
];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: Locale = hasLocale(routing.locales, raw) ? raw : routing.defaultLocale;
  const t = await getTranslations({ locale, namespace: "Legal" });
  return pageMetadata({
    locale,
    path: "/terms",
    title: t("termsTitle"),
    description: t("termsMetaDescription"),
  });
}

export default function TermsPage() {
  return <LegalPage titleKey="termsTitle" introKey="termsIntro" sections={SECTIONS} />;
}
