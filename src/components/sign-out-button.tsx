"use client";

import { signOut } from "@/app/[locale]/(auth)/actions";

export function SignOutButton({ label }: { label: string }) {
  return (
    <form action={signOut}>
      <button type="submit" className="underline">
        {label}
      </button>
    </form>
  );
}
