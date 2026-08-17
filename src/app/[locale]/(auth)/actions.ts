"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "@/i18n/navigation";
import { redirect as redirectExternal } from "next/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { headers } from "next/headers";

export type AuthErrorKey =
  | "errorInvalidCredentials"
  | "errorEmailNotConfirmed"
  | "errorUserExists"
  | "errorWeakPassword"
  | "errorOAuthUnavailable"
  | "errorGeneric";

type ActionState = { error: AuthErrorKey | null; needsConfirmation?: boolean };

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
      emailRedirectTo: origin
        ? `${origin}/auth/callback?locale=${locale}`
        : undefined,
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
      redirectTo: `${origin}/auth/callback?locale=${locale}`,
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
