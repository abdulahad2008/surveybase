"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { submitReview, type ReviewState } from "./actions";
import type { Locale } from "@/i18n/routing";
import { StarIcon } from "@/components/icons";

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
    <section className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-display text-2xl font-extrabold tracking-tight text-ink">
          {t("reviewsHeading")}
        </h2>
        {average != null && (
          <span className="chip bg-sun-soft text-ink">
            <StarIcon size={13} filled className="text-sun" />
            <span className="tnum font-bold">{average.toFixed(1)}</span>
            <span className="tnum text-soft">({sorted.length})</span>
          </span>
        )}
      </div>

      {sorted.length === 0 && <p className="text-sm text-faint">{t("noReviews")}</p>}

      {sorted.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2">
          {sorted.map((r) => (
            <li key={r.id} className="card p-4 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 font-semibold text-ink">
                  <Avatar name={r.reviewer?.name ?? null} fallback={t("anonymousReviewer")} />
                  {r.reviewer?.name ?? t("anonymousReviewer")}
                </span>
                <Stars rating={r.rating} />
              </div>
              {r.comment && <p className="mt-2 leading-relaxed text-soft">{r.comment}</p>}
            </li>
          ))}
        </ul>
      )}

      {currentUserId ? (
        <form action={formAction} className="card max-w-md space-y-4 p-5 text-sm">
          <p className="font-display font-bold text-ink">
            {myReview ? t("reviewYourReviewHeading") : t("reviewFormHeading")}
          </p>

          {state.error && (
            <p
              role="alert"
              className="rounded-xl bg-danger-soft px-3 py-2 text-sm font-medium text-danger"
            >
              {t(state.error)}
            </p>
          )}

          <div>
            <span className="label">{t("reviewRatingLabel")}</span>
            <RatingPicker initial={myReview?.rating ?? 5} />
          </div>

          <div>
            <label className="label" htmlFor="review-comment">
              {t("reviewCommentLabel")}
            </label>
            <textarea
              id="review-comment"
              name="comment"
              rows={3}
              defaultValue={myReview?.comment ?? ""}
              className="input"
            />
          </div>

          <button type="submit" disabled={pending} className="btn btn-primary btn-sm">
            {pending ? t("reviewSubmitting") : myReview ? t("reviewUpdate") : t("reviewSubmit")}
          </button>
        </form>
      ) : (
        <p className="text-sm text-faint">{t("reviewLoginPrompt")}</p>
      )}
    </section>
  );
}

function Avatar({ name, fallback }: { name: string | null; fallback: string }) {
  const initial = (name ?? fallback).trim().charAt(0).toUpperCase() || "?";
  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand-ink">
      {initial}
    </span>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <span aria-label={`${rating} / 5`} className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <StarIcon
          key={n}
          size={14}
          filled={n <= rating}
          className={n <= rating ? "text-sun" : "text-line-strong"}
        />
      ))}
    </span>
  );
}

function RatingPicker({ initial }: { initial: number }) {
  const [rating, setRating] = useState(initial);
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? rating;

  return (
    <div className="flex items-center gap-1">
      <input type="hidden" name="rating" value={rating} />
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`${n} / 5`}
          onClick={() => setRating(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(null)}
          className="rounded p-0.5 transition hover:scale-125"
        >
          <StarIcon size={22} filled={n <= shown} className={n <= shown ? "text-sun" : "text-line-strong"} />
        </button>
      ))}
    </div>
  );
}
