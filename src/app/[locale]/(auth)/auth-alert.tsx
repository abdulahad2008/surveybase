"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { isAuthErrorKey } from "@/lib/auth-errors";

const TONE = {
  error: "bg-danger-soft text-danger",
  success: "bg-mint-soft text-ink",
} as const;

/**
 * One shape for every message these forms show, so an error on the reset page
 * cannot end up styled differently from the same error on the login page.
 *
 * `role` follows the tone rather than being passed in: an assistive technology
 * announces alert interruptively and status politely, and which of those a
 * message deserves is decided by whether it is a failure — not by the caller.
 */
export function AuthAlert({
  children,
  tone = "error",
  className = "",
}: {
  children: React.ReactNode;
  tone?: keyof typeof TONE;
  className?: string;
}) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-xl px-3 py-2.5 text-sm font-medium ${TONE[tone]} ${className}`}
    >
      {children}
    </p>
  );
}

function CallbackErrorMessage() {
  const t = useTranslations("Auth");
  const key = useSearchParams().get("authError");
  if (!isAuthErrorKey(key)) return null;
  return <AuthAlert className="mt-2">{t(key)}</AuthAlert>;
}

/**
 * Failures that happen during a redirect round-trip — OAuth, or an expired
 * recovery link — land back here as a query param, because the redirect from
 * /auth/callback cannot carry action state.
 *
 * The Suspense boundary lives inside this component rather than at each call
 * site: useSearchParams opts the client tree up to the nearest boundary out of
 * prerendering, and keeping that boundary tight leaves the rest of the page in
 * the static shell.
 */
export function CallbackError() {
  return (
    <Suspense fallback={null}>
      <CallbackErrorMessage />
    </Suspense>
  );
}
