"use client";

import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LogoGlyph } from "@/components/logo";
import { GoogleIcon } from "@/components/icons";
import { signup, signInWithGoogle } from "../actions";

export default function SignupPage() {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const [state, formAction, pending] = useActionState(signup.bind(null, locale), {
    error: null,
  });
  const [googleState, googleAction] = useActionState(signInWithGoogle.bind(null, locale), {
    error: null,
  });

  return (
    <main className="relative mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-10 left-0 h-64 w-64 rounded-full bg-coral-soft blur-3xl"
      />
      <div className="card relative space-y-6 p-8">
        <div className="space-y-3 text-center">
          <div className="flex justify-center">
            <LogoGlyph size={44} />
          </div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">
            {t("signupTitle")}
          </h1>
          <p className="text-sm text-soft">{t("signupSubtitle")}</p>
        </div>

        {state.needsConfirmation && (
          <p
            role="status"
            className="rounded-xl bg-mint-soft px-3 py-2.5 text-sm font-medium text-ink"
          >
            {t("checkEmailToConfirm")}
          </p>
        )}

        <form action={googleAction}>
          <button type="submit" className="btn btn-ghost w-full">
            <GoogleIcon size={17} />
            {t("continueWithGoogle")}
          </button>
          {googleState.error && (
            <p role="alert" className="mt-2 rounded-xl bg-danger-soft px-3 py-2 text-sm font-medium text-danger">
              {t(googleState.error)}
            </p>
          )}
        </form>

        <div className="flex items-center gap-3 text-xs font-semibold text-faint">
          <span className="h-px flex-1 bg-line" />
          {t("orDivider")}
          <span className="h-px flex-1 bg-line" />
        </div>

        <form action={formAction} className="space-y-4">
          <div>
            <label className="label" htmlFor="signup-name">
              {t("name")}
            </label>
            <input id="signup-name" name="name" type="text" required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="signup-affiliation">
              {t("affiliation")}
            </label>
            <input
              id="signup-affiliation"
              name="affiliation"
              type="text"
              className="input"
              placeholder={t("affiliationPlaceholder")}
            />
          </div>
          <div>
            <label className="label" htmlFor="signup-email">
              {t("email")}
            </label>
            <input id="signup-email" name="email" type="email" required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="signup-password">
              {t("password")}
            </label>
            <input
              id="signup-password"
              name="password"
              type="password"
              required
              minLength={6}
              className="input"
            />
          </div>
          {state.error && (
            <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm font-medium text-danger">
              {t(state.error)}
            </p>
          )}
          <button type="submit" disabled={pending} className="btn btn-primary w-full">
            {t("submitSignup")}
          </button>
        </form>

        <p className="text-center text-sm text-soft">
          {t("haveAccount")}{" "}
          <Link href="/login" className="font-semibold text-brand hover:underline">
            {t("loginLink")}
          </Link>
        </p>
      </div>
    </main>
  );
}
