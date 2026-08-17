"use client";

import { signOut } from "@/app/[locale]/(auth)/actions";

export function SignOutButton({ label }: { label: string }) {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="rounded-full px-3 py-2 text-sm font-semibold text-soft transition hover:bg-card-soft hover:text-ink"
      >
        {label}
      </button>
    </form>
  );
}
