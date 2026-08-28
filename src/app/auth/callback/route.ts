import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { nextPath, publicOrigin, resolveLocale, resolveNext } from "@/lib/auth-redirect";
import type { AuthErrorKey } from "@/lib/auth-errors";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const locale = resolveLocale(searchParams.get("locale"));
  const next = resolveNext(searchParams.get("next"));
  const base = publicOrigin(origin);

  // A failed recovery link belongs back at the form that sends one, not at the
  // login page — the whole reason the user is here is that they cannot log in.
  const recovery = next === "reset-password";

  const backToStart = (error?: AuthErrorKey) => {
    const path = recovery ? "forgot-password" : "login";
    return NextResponse.redirect(
      error
        ? `${base}/${locale}/${path}?authError=${error}`
        : `${base}/${locale}/${path}`,
    );
  };

  // Supabase forwards the provider's own failure here as query params. Reading
  // them is the difference between a diagnosis and "it just went back to the
  // login page", which is all this route used to say about any failure at all.
  const providerError = searchParams.get("error");
  if (providerError) {
    const description = searchParams.get("error_description") ?? "no description";
    console.error(`[auth/callback] provider returned ${providerError}: ${description}`);

    // An expired or already-spent recovery link arrives as access_denied too,
    // so the "user pressed Cancel" reading below only holds outside recovery.
    if (recovery) return backToStart("errorResetLinkInvalid");

    // Pressing Cancel on Google's consent screen is a choice, not a fault. Send
    // them back quietly rather than showing an error for doing what they meant.
    if (providerError === "access_denied") return backToStart();

    return backToStart(
      /provider is not enabled/i.test(description) ? "errorOAuthUnavailable" : "errorGeneric",
    );
  }

  const code = searchParams.get("code");
  if (!code) {
    console.error("[auth/callback] reached with neither a code nor an error param");
    return backToStart("errorGeneric");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    // Most often a PKCE verifier mismatch: the cookie set when the flow started
    // is missing by the time the user comes back — opening the mail in a
    // different browser from the one that asked for the link does exactly that.
    console.error(`[auth/callback] code exchange failed: ${error.message}`);
    return backToStart(recovery ? "errorResetLinkInvalid" : "errorGeneric");
  }

  return NextResponse.redirect(`${base}/${locale}${nextPath(next)}`);
}
