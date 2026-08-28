import type { Messages } from "next-intl";
import { getTranslations } from "next-intl/server";
import { isoDateParts } from "@/lib/format";
import { LEGAL_LAST_UPDATED, SITE_CONTACT_EMAIL } from "@/lib/site";
import { MailIcon } from "./icons";

/** Message keys, not free strings, so a section whose copy is missing from one
 *  locale is a compile error rather than a gap in a legal document. */
type LegalKey = keyof Messages["Legal"];

export interface LegalSection {
  heading: LegalKey;
  body: LegalKey;
}

/**
 * The privacy policy and the terms of use are the same page with different
 * words: a title, a date, an opening paragraph, a run of headed sections and
 * the contact block. Rendering both from one component is what keeps them
 * looking like two halves of one document, and means the contact address is
 * written down once.
 *
 * A server component on purpose — it is prose with no state, so it costs the
 * client nothing and the date it formats never has to survive hydration.
 */
export async function LegalPage({
  titleKey,
  introKey,
  sections,
}: {
  titleKey: LegalKey;
  introKey: LegalKey;
  sections: LegalSection[];
}) {
  const t = await getTranslations("Legal");
  const f = await getTranslations("Format");

  // Formatted through the same catalog the client-side formatter uses, so the
  // date reads the way every other date on the site does in this locale.
  const parts = isoDateParts(LEGAL_LAST_UPDATED);
  const months = f("monthsShort").split(",");
  const updated = parts
    ? f("dateShort", {
        day: parts.day,
        month: months[parts.month - 1] ?? String(parts.month),
        year: parts.year,
      })
    : LEGAL_LAST_UPDATED;

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 sm:py-14"
    >
      <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">{t(titleKey)}</h1>
      <p className="mt-2 text-xs text-faint">{t("updated", { date: updated })}</p>
      <p className="mt-6 max-w-prose leading-relaxed text-soft">{t(introKey)}</p>

      <div className="mt-10 space-y-8">
        {sections.map((section) => (
          <section key={section.heading}>
            <h2 className="font-display text-xl font-bold text-ink">{t(section.heading)}</h2>
            <p className="mt-2 max-w-prose leading-relaxed text-soft">{t(section.body)}</p>
          </section>
        ))}

        <section className="card p-6">
          <h2 className="font-display text-xl font-bold text-ink">{t("contactHeading")}</h2>
          <p className="mt-2 max-w-prose leading-relaxed text-soft">{t("contactBody")}</p>
          <a
            href={`mailto:${SITE_CONTACT_EMAIL}`}
            className="mt-3 inline-flex items-center gap-2 font-semibold text-brand transition hover:opacity-80"
          >
            <MailIcon size={16} />
            {SITE_CONTACT_EMAIL}
          </a>
        </section>
      </div>
    </main>
  );
}
