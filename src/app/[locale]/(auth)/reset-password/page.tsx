"use client";

import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LogoGlyph } from "@/components/logo";
import { AuthAlert } from "../auth-alert";
import { updatePassword } from "../actions";

export default function ResetPasswordPage() {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const [state, formAction, pending] = useActionState(
    updatePassword.bind(null, locale),
    { error: null },
  );

  // Only reachable with a session, which the recovery link creates on its way
  // through /auth/callback. If it expired, the action says so and the way
  // forward is another link — not this form again.
  const expired = state.error === "errorResetLinkInvalid";

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="relative mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16"
    >
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
            {t("resetTitle")}
          </h1>
          <p className="text-sm text-soft">{t("resetSubtitle")}</p>
        </div>

        {state.done ? (
          <>
            <AuthAlert tone="success">{t("resetDone")}</AuthAlert>
            <Link href="/" className="btn btn-primary w-full">
              {t("resetContinue")}
            </Link>
          </>
        ) : expired ? (
          <>
            <AuthAlert>{t("errorResetLinkInvalid")}</AuthAlert>
            <Link href="/forgot-password" className="btn btn-primary w-full">
              {t("requestNewLink")}
            </Link>
          </>
        ) : (
          <form action={formAction} className="space-y-4">
            <div>
              <label className="label" htmlFor="reset-password">
                {t("newPassword")}
              </label>
              <input
                id="reset-password"
                name="password"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                className="input"
              />
            </div>
            <div>
              <label className="label" htmlFor="reset-confirm">
                {t("confirmPassword")}
              </label>
              <input
                id="reset-confirm"
                name="confirm"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                className="input"
              />
            </div>
            {state.error && <AuthAlert>{t(state.error)}</AuthAlert>}
            <button type="submit" disabled={pending} className="btn btn-primary w-full">
              {pending ? t("resetSaving") : t("resetSubmit")}
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
