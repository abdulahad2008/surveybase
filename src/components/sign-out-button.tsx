"use client";

import { signOut } from "@/app/[locale]/(auth)/actions";
import type { Locale } from "@/i18n/routing";

export function SignOutButton({ locale, label }: { locale: Locale; label: string }) {
  return (
    <form action={signOut.bind(null, locale)}>
      <button
        type="submit"
        className="rounded-full px-3 py-2 text-sm font-semibold text-soft transition hover:bg-card-soft hover:text-ink"
      >
        {label}
      </button>
    </form>
  );
}
