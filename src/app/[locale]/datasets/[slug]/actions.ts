"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Locale } from "@/i18n/routing";

export type ReviewErrorKey = "reviewErrorAuth" | "reviewErrorGeneric";

export interface ReviewState {
  error: ReviewErrorKey | null;
}

export async function submitReview(
  locale: Locale,
  slug: string,
  _prevState: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "reviewErrorAuth" };

  const rating = Number(formData.get("rating"));
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { error: "reviewErrorGeneric" };
  }
  const comment = formData.get("comment")?.toString().trim() || null;

  const { data: dataset } = await supabase
    .from("datasets")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!dataset) return { error: "reviewErrorGeneric" };

  const { error } = await supabase
    .from("reviews")
    .upsert(
      { dataset_id: dataset.id, user_id: user.id, rating, comment },
      { onConflict: "dataset_id,user_id" },
    );
  if (error) return { error: "reviewErrorGeneric" };

  revalidatePath(`/${locale}/datasets/${slug}`);
  return { error: null };
}
