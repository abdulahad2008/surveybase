"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Locale } from "@/i18n/routing";

export type ModerateErrorKey = "errorAuth" | "errorGeneric";

export interface ModerateState {
  error: ModerateErrorKey | null;
}

async function requireModerator() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, isModerator: false };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isModerator = profile?.role === "moderator" || profile?.role === "admin";
  return { supabase, user, isModerator };
}

export async function approveDataset(locale: Locale, datasetId: string): Promise<ModerateState> {
  const { user, isModerator, supabase } = await requireModerator();
  if (!user || !isModerator) return { error: "errorAuth" };

  const { error } = await supabase
    .from("datasets")
    .update({ status: "published" })
    .eq("id", datasetId);

  if (error) return { error: "errorGeneric" };

  revalidatePath(`/${locale}/moderate`);
  return { error: null };
}

export async function rejectDataset(locale: Locale, datasetId: string): Promise<ModerateState> {
  const { user, isModerator, supabase } = await requireModerator();
  if (!user || !isModerator) return { error: "errorAuth" };

  const { error } = await supabase
    .from("datasets")
    .update({ status: "rejected" })
    .eq("id", datasetId);

  if (error) return { error: "errorGeneric" };

  revalidatePath(`/${locale}/moderate`);
  return { error: null };
}
