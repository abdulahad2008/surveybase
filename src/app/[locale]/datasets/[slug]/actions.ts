"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Locale } from "@/i18n/routing";
import { MAX_REVIEW_COMMENT } from "@/lib/moderation";

export type ReviewErrorKey = "reviewErrorAuth" | "reviewErrorGeneric" | "reviewErrorTooLong";

export interface ReviewState {
  error: ReviewErrorKey | null;
  /** Set once a review has been written, so the form can say so. Saving used
   *  to be silent: the page revalidates underneath, but nothing on the form
   *  changed, which reads as a button that did nothing. */
  saved?: boolean;
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
  // The textarea caps this too; a longer one got here around the form.
  if (comment && comment.length > MAX_REVIEW_COMMENT) {
    return { error: "reviewErrorTooLong" };
  }

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
  return { error: null, saved: true };
}
