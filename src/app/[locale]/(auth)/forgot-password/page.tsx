"use client";

import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LogoGlyph } from "@/components/logo";
import { AuthAlert, CallbackError } from "../auth-alert";
import { requestPasswordReset } from "../actions";

export default function ForgotPasswordPage() {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const [state, formAction, pending] = useActionState(
    requestPasswordReset.bind(null, locale),
    { error: null },
  );

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="relative mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-10 right-0 h-64 w-64 rounded-full bg-brand-soft blur-3xl"
      />
      <div className="card relative space-y-6 p-8">
        <div className="space-y-3 text-center">
          <div className="flex justify-center">
            <LogoGlyph size={44} />
          </div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">
            {t("forgotTitle")}
          </h1>
          <p className="text-sm text-soft">{t("forgotSubtitle")}</p>
        </div>

        {/* The form is replaced rather than merely captioned on success. Leaving
            a filled-in form under a "check your inbox" line reads as an
            invitation to press the button again, which is how someone talks
            themselves into the rate limit. */}
        {state.done ? (
          <AuthAlert tone="success">{t("forgotSent")}</AuthAlert>
        ) : (
          <form action={formAction} className="space-y-4">
            <div>
              <label className="label" htmlFor="forgot-email">
                {t("email")}
              </label>
              <input
                id="forgot-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="input"
              />
            </div>
            {state.error && <AuthAlert>{t(state.error)}</AuthAlert>}
            <CallbackError />
            <button type="submit" disabled={pending} className="btn btn-primary w-full">
              {pending ? t("forgotSending") : t("forgotSubmit")}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-soft">
          <Link href="/login" className="font-semibold text-brand hover:underline">
            {t("backToLogin")}
          </Link>
        </p>
      </div>
    </main>
  );
}
