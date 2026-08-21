"use client";

import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { isAuthErrorKey } from "@/lib/auth-errors";
import { LogoGlyph } from "@/components/logo";
import { GoogleIcon } from "@/components/icons";
import { login, signInWithGoogle } from "../actions";

const ALERT_CLASS =
  "mt-2 rounded-xl bg-danger-soft px-3 py-2 text-sm font-medium text-danger";

/**
 * Failures that happen during the OAuth round-trip land back here as a query
 * param, because the redirect from /auth/callback cannot carry action state.
 *
 * Isolated behind its own Suspense boundary: useSearchParams opts the client
 * tree up to the nearest boundary out of prerendering, and keeping that boundary
 * tight leaves the rest of the login page in the static shell.
 */
function CallbackError() {
  const t = useTranslations("Auth");
  const key = useSearchParams().get("authError");
  if (!isAuthErrorKey(key)) return null;
  return (
    <p role="alert" className={ALERT_CLASS}>
      {t(key)}
    </p>
  );
}

export default function LoginPage() {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const [state, formAction, pending] = useActionState(login.bind(null, locale), {
    error: null,
  });
  const [googleState, googleAction] = useActionState(signInWithGoogle.bind(null, locale), {
    error: null,
  });

  return (
    <main className="relative mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
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
            <p role="alert" className={ALERT_CLASS}>
              {t(googleState.error)}
            </p>
          )}
          <Suspense fallback={null}>
            <CallbackError />
          </Suspense>
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
            <input id="login-email" name="email" type="email" required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="login-password">
              {t("password")}
            </label>
            <input
              id="login-password"
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
            {t("submitLogin")}
          </button>
        </form>

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
