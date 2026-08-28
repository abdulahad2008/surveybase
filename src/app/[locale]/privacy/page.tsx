import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { routing, type Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/site";
import { LegalPage, type LegalSection } from "@/components/legal-page";

const SECTIONS: LegalSection[] = [
  { heading: "privacyOperatorHeading", body: "privacyOperatorBody" },
  { heading: "privacyCollectHeading", body: "privacyCollectBody" },
  { heading: "privacyWhyHeading", body: "privacyWhyBody" },
  { heading: "privacyPublicHeading", body: "privacyPublicBody" },
  { heading: "privacyAnonHeading", body: "privacyAnonBody" },
  { heading: "privacyCookiesHeading", body: "privacyCookiesBody" },
  { heading: "privacyStorageHeading", body: "privacyStorageBody" },
  { heading: "privacyRetentionHeading", body: "privacyRetentionBody" },
  { heading: "privacyRightsHeading", body: "privacyRightsBody" },
  { heading: "privacyChangesHeading", body: "privacyChangesBody" },
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
    path: "/privacy",
    title: t("privacyTitle"),
    description: t("privacyMetaDescription"),
  });
}

export default function PrivacyPage() {
  return (
    <LegalPage titleKey="privacyTitle" introKey="privacyIntro" sections={SECTIONS} />
  );
}
