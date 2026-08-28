"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Locale } from "@/i18n/routing";
import { MAX_REJECTION_REASON } from "@/lib/moderation";

export type ModerateErrorKey = "errorAuth" | "errorGeneric" | "errorReasonTooLong";

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

export async function approveDataset(
  locale: Locale,
  datasetId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- required by useActionState's action signature
  _prev: ModerateState,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- required by useActionState's action signature
  _formData: FormData,
): Promise<ModerateState> {
  const { user, isModerator, supabase } = await requireModerator();
  if (!user || !isModerator) return { error: "errorAuth" };

  const { error } = await supabase
    .from("datasets")
    // Approving clears any earlier rejection reason: it described a version of
    // the dataset that is no longer the one on the page.
    .update({ status: "published", rejection_reason: null })
    .eq("id", datasetId);

  if (error) {
    console.error(`[moderate] approving ${datasetId} failed: ${error.message}`);
    return { error: "errorGeneric" };
  }

  revalidatePath(`/${locale}/moderate`);
  return { error: null };
}

export async function rejectDataset(
  locale: Locale,
  datasetId: string,
  _prev: ModerateState,
  formData: FormData,
): Promise<ModerateState> {
  const { user, isModerator, supabase } = await requireModerator();
  if (!user || !isModerator) return { error: "errorAuth" };

  const raw = formData.get("reason");
  const reason = typeof raw === "string" ? raw.trim() : "";
  if (reason.length > MAX_REJECTION_REASON) return { error: "errorReasonTooLong" };

  const { error } = await supabase
    .from("datasets")
    .update({ status: "rejected", rejection_reason: reason || null })
    .eq("id", datasetId);

  if (error) {
    console.error(`[moderate] rejecting ${datasetId} failed: ${error.message}`);
    return { error: "errorGeneric" };
  }

  revalidatePath(`/${locale}/moderate`);
  return { error: null };
}
