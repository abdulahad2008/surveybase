"use client";

import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { signup, signInWithGoogle } from "../actions";

export default function SignupPage() {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const [state, formAction, pending] = useActionState(signup.bind(null, locale), {
    error: null,
  });

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-16">
      <h1 className="text-2xl font-semibold">{t("signupTitle")}</h1>
      <form action={formAction} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          {t("name")}
          <input
            name="name"
            type="text"
            required
            className="rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-black"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t("affiliation")}
          <input
            name="affiliation"
            type="text"
            className="rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-black"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t("email")}
          <input
            name="email"
            type="email"
            required
            className="rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-black"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t("password")}
          <input
            name="password"
            type="password"
            required
            minLength={6}
            className="rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-black"
          />
        </label>
        {state.error && (
          <p role="alert" className="text-sm text-red-600">
            {t(state.error)}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {t("submitSignup")}
        </button>
      </form>
      <form action={signInWithGoogle.bind(null, locale)}>
        <button
          type="submit"
          className="w-full rounded border border-gray-300 px-4 py-2 dark:border-gray-700"
        >
          {t("continueWithGoogle")}
        </button>
      </form>
      <p className="text-sm">
        {t("haveAccount")}{" "}
        <Link href="/login" className="underline">
          {t("loginLink")}
        </Link>
      </p>
    </main>
  );
}
