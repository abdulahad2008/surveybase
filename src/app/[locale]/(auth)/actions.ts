"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "@/i18n/navigation";
import { redirect as redirectExternal } from "next/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { headers } from "next/headers";
import { authCallbackUrl } from "@/lib/auth-redirect";
import type { AuthErrorKey } from "@/lib/auth-errors";

type ActionState = { error: AuthErrorKey | null; needsConfirmation?: boolean; done?: boolean };

function authErrorKey(code: string | undefined, message?: string): AuthErrorKey {
  if (message && /provider is not enabled/i.test(message)) {
    return "errorOAuthUnavailable";
  }
  if (message && /email not confirmed/i.test(message)) {
    return "errorEmailNotConfirmed";
  }
  switch (code) {
    case "invalid_credentials":
      return "errorInvalidCredentials";
    case "email_not_confirmed":
      return "errorEmailNotConfirmed";
    case "user_already_exists":
      return "errorUserExists";
    case "weak_password":
      return "errorWeakPassword";
    case "same_password":
      return "errorSamePassword";
    default:
      return "errorGeneric";
  }
}

export async function login(
  locale: Locale,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email")),
    password: String(formData.get("password")),
  });

  if (error) {
    return { error: authErrorKey(error.code, error.message) };
  }

  redirect({ href: "/", locale });
  return { error: null };
}

export async function signup(
  locale: Locale,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const origin = (await headers()).get("origin");

  const { data, error } = await supabase.auth.signUp({
    email: String(formData.get("email")),
    password: String(formData.get("password")),
    options: {
      // Send the email-confirmation link back to the callback route that
      // exchanges the code for a session — NOT the site root, which drops it.
      emailRedirectTo: authCallbackUrl(locale, origin),
      data: {
        full_name: String(formData.get("name") ?? ""),
        affiliation: String(formData.get("affiliation") ?? ""),
      },
    },
  });

  if (error) {
    return { error: authErrorKey(error.code, error.message) };
  }

  // Email-enumeration protection: signing up with an already-registered email
  // returns success with no error and an empty `identities` array rather than a
  // user_already_exists error. Detect that and tell them to log in instead of
  // showing the misleading "check your email" message.
  if (data.user && data.user.identities && data.user.identities.length === 0) {
    return { error: "errorUserExists" };
  }

  if (!data.session) {
    // Project requires email confirmation before a session is issued.
    return { error: null, needsConfirmation: true };
  }

  redirect({ href: "/", locale });
  return { error: null };
}

/**
 * Step one of a password reset: mail a recovery link.
 *
 * The result is deliberately the same whether or not the address has an
 * account. Reporting "no such user" here would turn this form into a free
 * membership oracle for the archive — anyone could test whether a named
 * researcher has deposited under a given address. Supabase already answers
 * uniformly for this call; the point of the catch-all below is that our own
 * error handling must not undo that.
 *
 * The one failure worth surfacing is rate limiting, which says nothing about
 * the address — it is a property of the mail sender, not of the account.
 */
export async function requestPasswordReset(
  locale: Locale,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const origin = (await headers()).get("origin");
  const email = String(formData.get("email") ?? "").trim();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    // Back through the callback so the recovery code is exchanged for a
    // session; landing straight on /reset-password would arrive with nothing
    // to authorise the password change.
    redirectTo: authCallbackUrl(locale, origin, "reset-password"),
  });

  if (error) {
    console.error(`[auth] password reset request failed: ${error.message}`);
    if (error.code === "over_email_send_rate_limit" || error.status === 429) {
      return { error: "errorRateLimited" };
    }
  }

  return { error: null, done: true };
}

/**
 * Step two: set the new password using the session the recovery link created.
 *
 * Confirmation is compared here rather than only in the browser — the two
 * fields are a guard against a typo the user cannot see, and a guard that only
 * exists in client JavaScript is not one.
 */
export async function updatePassword(
  // Bound by the page for symmetry with the other auth actions; this one has
  // nowhere to redirect to, so it never reads the locale.
  _locale: Locale,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password !== confirm) return { error: "errorPasswordMismatch" };

  const supabase = await createClient();

  // updateUser reports a missing session as a generic error, and "your link
  // expired" is the only reading a user can act on, so check for the session
  // first and say so plainly.
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "errorResetLinkInvalid" };

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    console.error(`[auth] password update failed: ${error.message}`);
    return { error: authErrorKey(error.code, error.message) };
  }

  return { error: null, done: true };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect({ href: "/", locale: routing.defaultLocale });
}

export async function signInWithGoogle(
  locale: Locale,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- required by useActionState's action signature
  _prevState: ActionState,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- required by useActionState's action signature
  _formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const origin = (await headers()).get("origin");

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: authCallbackUrl(locale, origin),
    },
  });

  if (error) {
    return { error: authErrorKey(error.code, error.message) };
  }

  if (data.url) {
    redirectExternal(data.url);
  }

  return { error: null };
}
