"use client";

import { useActionState, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LogoGlyph } from "@/components/logo";
import { GoogleIcon } from "@/components/icons";
import { AuthAlert, CallbackError } from "../auth-alert";
import { login, resendConfirmation, signInWithGoogle } from "../actions";

export default function LoginPage() {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const [state, formAction, pending] = useActionState(login.bind(null, locale), {
    error: null,
  });
  const [googleState, googleAction] = useActionState(signInWithGoogle.bind(null, locale), {
    error: null,
  });
  // Mirrored into a hidden field below: the resend form cannot be nested
  // inside the login form, so it needs its own copy of the address.
  const [email, setEmail] = useState("");
  const [resendState, resendAction, resending] = useActionState(
    resendConfirmation.bind(null, locale),
    { error: null },
  );

  return (
    <main id="main-content" tabIndex={-1} className="relative mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
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
            {t("loginTitle")}
          </h1>
          <p className="text-sm text-soft">{t("loginSubtitle")}</p>
        </div>

        <form action={googleAction}>
          <button type="submit" className="btn btn-ghost w-full">
            <GoogleIcon size={17} />
            {t("continueWithGoogle")}
          </button>
          {googleState.error && (
            <AuthAlert className="mt-2">{t(googleState.error)}</AuthAlert>
          )}
          <CallbackError />
        </form>

        <div className="flex items-center gap-3 text-xs font-semibold text-faint">
          <span className="h-px flex-1 bg-line" />
          {t("orDivider")}
          <span className="h-px flex-1 bg-line" />
        </div>

        <form action={formAction} className="space-y-4">
          <div>
            <label className="label" htmlFor="login-email">
              {t("email")}
            </label>
            <input
              id="login-email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
              className="input"
            />
          </div>
          <div>
            <div className="flex flex-wrap items-center justify-between gap-x-3">
              <label className="label" htmlFor="login-password">
                {t("password")}
              </label>
              <Link
                href="/forgot-password"
                className="tap-target mb-1.5 text-xs font-semibold text-brand hover:underline"
              >
                {t("forgotLink")}
              </Link>
            </div>
            <input
              id="login-password"
              name="password"
              type="password"
              required
              minLength={6}
              className="input"
            />
          </div>
          {state.error && <AuthAlert>{t(state.error)}</AuthAlert>}
          <button type="submit" disabled={pending} className="btn btn-primary w-full">
            {t("submitLogin")}
          </button>
        </form>

        {/* Offered only once sign-in has said the address is unconfirmed —
            before that it is an invitation to mail people who did not ask.
            Kept mounted after it succeeds so the status message stays put. */}
        {state.error === "errorEmailNotConfirmed" && (
          <form action={resendAction} className="space-y-2">
            <input type="hidden" name="email" value={email} />
            <button
              type="submit"
              disabled={resending || resendState.done}
              className="btn btn-ghost btn-sm w-full"
            >
              {resending ? t("resending") : t("resendConfirmation")}
            </button>
            {resendState.error && <AuthAlert>{t(resendState.error)}</AuthAlert>}
            {resendState.done && !resendState.error && (
              <AuthAlert tone="success">{t("confirmationResent")}</AuthAlert>
            )}
          </form>
        )}

        <p className="text-center text-sm text-soft">
          {t("noAccount")}{" "}
          <Link href="/signup" className="font-semibold text-brand hover:underline">
            {t("signupLink")}
          </Link>
        </p>
      </div>
    </main>
  );
}
