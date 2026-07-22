"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { submitReview, type ReviewState } from "./actions";
import type { Locale } from "@/i18n/routing";

export interface ReviewRow {
  id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer: { name: string | null } | null;
}

const initialState: ReviewState = { error: null };

export function Reviews({
  locale,
  slug,
  reviews,
  currentUserId,
}: {
  locale: Locale;
  slug: string;
  reviews: ReviewRow[];
  currentUserId: string | null;
}) {
  const t = useTranslations("Dataset");
  const boundAction = submitReview.bind(null, locale, slug);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  const sorted = [...reviews].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  const average =
    sorted.length > 0 ? sorted.reduce((sum, r) => sum + r.rating, 0) / sorted.length : null;
  const myReview = currentUserId ? (sorted.find((r) => r.user_id === currentUserId) ?? null) : null;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium">{t("reviewsHeading")}</h2>

      {average != null ? (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t("averageRating", { rating: average.toFixed(1), count: sorted.length })}
        </p>
      ) : (
        <p className="text-sm text-gray-600 dark:text-gray-400">{t("noReviews")}</p>
      )}

      {sorted.length > 0 && (
        <ul className="space-y-3">
          {sorted.map((r) => (
            <li
              key={r.id}
              className="rounded border border-gray-200 p-3 text-sm dark:border-gray-800"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium">{r.reviewer?.name ?? "Anonymous"}</span>
                <Stars rating={r.rating} />
              </div>
              {r.comment && <p className="mt-1 text-gray-600 dark:text-gray-400">{r.comment}</p>}
            </li>
          ))}
        </ul>
      )}

      {currentUserId ? (
        <form
          action={formAction}
          className="max-w-sm space-y-3 rounded border border-gray-200 p-4 text-sm dark:border-gray-800"
        >
          <p className="font-medium">
            {myReview ? t("reviewYourReviewHeading") : t("reviewFormHeading")}
          </p>

          {state.error && (
            <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              {t(state.error)}
            </p>
          )}

          <label className="block space-y-1">
            <span className="font-medium">{t("reviewRatingLabel")}</span>
            <select
              name="rating"
              defaultValue={myReview?.rating ?? 5}
              className="w-full rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
            >
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1">
            <span className="font-medium">{t("reviewCommentLabel")}</span>
            <textarea
              name="comment"
              rows={3}
              defaultValue={myReview?.comment ?? ""}
              className="w-full rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
            />
          </label>

          <button
            type="submit"
            disabled={pending}
            className="rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {pending ? t("reviewSubmitting") : myReview ? t("reviewUpdate") : t("reviewSubmit")}
          </button>
        </form>
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400">{t("reviewLoginPrompt")}</p>
      )}
    </div>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <span aria-label={`${rating} / 5`} className="text-amber-500">
      {"★".repeat(rating)}
      <span className="text-gray-300 dark:text-gray-700">{"★".repeat(5 - rating)}</span>
    </span>
  );
}
