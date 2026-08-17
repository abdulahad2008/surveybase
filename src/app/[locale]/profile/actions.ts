"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Locale } from "@/i18n/routing";

export type ProfileErrorKey =
  | "errorAuth"
  | "errorInvalidOrcid"
  | "errorInvalidEmail"
  | "errorAvatarTooLarge"
  | "errorAvatarType"
  | "errorGeneric";

export interface ProfileState {
  error: ProfileErrorKey | null;
  saved?: boolean;
}

const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ORCID_PATTERN = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/;

/** Empty form fields arrive as "" — store null so the column stays unset. */
function nullable(value: FormDataEntryValue | null): string | null {
  const s = typeof value === "string" ? value.trim() : "";
  return s === "" ? null : s;
}

export async function updateProfile(
  locale: Locale,
  _prevState: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "errorAuth" };

  const orcid = nullable(formData.get("orcid"));
  if (orcid && !ORCID_PATTERN.test(orcid)) {
    return { error: "errorInvalidOrcid" };
  }

  const contactEmail = nullable(formData.get("contact_email"));
  if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    return { error: "errorInvalidEmail" };
  }

  // `role` is deliberately absent from this object. Even if it were included,
  // migration 0005's profiles_guard_role trigger would reject the change.
  const updates = {
    name: nullable(formData.get("name")),
    affiliation: nullable(formData.get("affiliation")),
    bio: nullable(formData.get("bio")),
    contact_email: contactEmail,
    website: nullable(formData.get("website")),
    orcid,
  };

  // ── Avatar (optional) ──────────────────────────────────────────────────
  const avatar = formData.get("avatar");
  let avatarUrl: string | null = null;

  if (avatar instanceof File && avatar.size > 0) {
    if (avatar.size > MAX_AVATAR_BYTES) return { error: "errorAvatarTooLarge" };
    if (!ALLOWED_AVATAR_TYPES.includes(avatar.type)) return { error: "errorAvatarType" };

    const extension = avatar.type === "image/png" ? "png" : avatar.type === "image/webp" ? "webp" : "jpg";
    // Storage RLS requires the first path segment to be the caller's uid.
    // The timestamp busts any CDN cache of a previously uploaded avatar.
    const path = `${user.id}/avatar-${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, avatar, { contentType: avatar.type, upsert: true });

    if (uploadError) return { error: "errorGeneric" };

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(path);
    avatarUrl = publicUrl;
  }

  const { error } = await supabase
    .from("profiles")
    .update(avatarUrl ? { ...updates, avatar_url: avatarUrl } : updates)
    .eq("id", user.id);

  if (error) return { error: "errorGeneric" };

  revalidatePath(`/${locale}/profile`);
  revalidatePath(`/${locale}/users/${user.id}`);
  return { error: null, saved: true };
}
