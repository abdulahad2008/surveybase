"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "@/i18n/navigation";
import { redirect as redirectExternal } from "next/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { headers } from "next/headers";

type ActionState = { error: string | null };

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
    return { error: error.message };
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

  const { error } = await supabase.auth.signUp({
    email: String(formData.get("email")),
    password: String(formData.get("password")),
    options: {
      data: {
        full_name: String(formData.get("name") ?? ""),
        affiliation: String(formData.get("affiliation") ?? ""),
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  redirect({ href: "/", locale });
  return { error: null };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect({ href: "/", locale: routing.defaultLocale });
}

export async function signInWithGoogle(locale: Locale) {
  const supabase = await createClient();
  const origin = (await headers()).get("origin");

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?locale=${locale}`,
    },
  });

  if (error) {
    throw error;
  }

  if (data.url) {
    redirectExternal(data.url);
  }
}
