import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { publicOrigin, resolveLocale } from "@/lib/auth-redirect";
import type { AuthErrorKey } from "@/lib/auth-errors";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const locale = resolveLocale(searchParams.get("locale"));
  const base = publicOrigin(origin);

  const backToLogin = (error?: AuthErrorKey) =>
    NextResponse.redirect(
      error
        ? `${base}/${locale}/login?authError=${error}`
        : `${base}/${locale}/login`,
    );

  // Supabase forwards the provider's own failure here as query params. Reading
  // them is the difference between a diagnosis and "it just went back to the
  // login page", which is all this route used to say about any failure at all.
  const providerError = searchParams.get("error");
  if (providerError) {
    const description = searchParams.get("error_description") ?? "no description";
    console.error(`[auth/callback] provider returned ${providerError}: ${description}`);

    // Pressing Cancel on Google's consent screen is a choice, not a fault. Send
    // them back quietly rather than showing an error for doing what they meant.
    if (providerError === "access_denied") return backToLogin();

    return backToLogin(
      /provider is not enabled/i.test(description) ? "errorOAuthUnavailable" : "errorGeneric",
    );
  }

  const code = searchParams.get("code");
  if (!code) {
    console.error("[auth/callback] reached with neither a code nor an error param");
    return backToLogin("errorGeneric");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    // Most often a PKCE verifier mismatch: the cookie set when the flow started
    // is missing by the time the user comes back.
    console.error(`[auth/callback] code exchange failed: ${error.message}`);
    return backToLogin("errorGeneric");
  }

  return NextResponse.redirect(`${base}/${locale}`);
}
