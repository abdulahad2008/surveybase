"use client";

import { useRef, useState } from "react";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { submitReview, type ReviewState } from "./actions";
import type { Locale } from "@/i18n/routing";
import { StarIcon } from "@/components/icons";
import { MAX_REVIEW_COMMENT } from "@/lib/moderation";

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
            <StarIcon size={13} filled className="text-sun-ink" />
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
                <Stars rating={r.rating} label={t("ratingOutOfFive", { rating: String(r.rating) })} />
              </div>
              {r.comment && <p className="mt-2 leading-relaxed text-soft wrap-anywhere">{r.comment}</p>}
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
            <span className="label" id="review-rating-label">
              {t("reviewRatingLabel")}
            </span>
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
              maxLength={MAX_REVIEW_COMMENT}
              defaultValue={myReview?.comment ?? ""}
              className="input"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={pending} className="btn btn-primary btn-sm">
              {pending ? t("reviewSubmitting") : myReview ? t("reviewUpdate") : t("reviewSubmit")}
            </button>
            {/* Saving revalidates the page underneath, but nothing on the form
                itself changes, so without this the button looked inert. */}
            {state.saved && !pending && (
              <p role="status" className="text-sm font-medium text-mint-ink">
                {t("reviewSaved")}
              </p>
            )}
          </div>
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

/** A rating as five glyphs. `role="img"` because the label describes the group
 *  — without it the label sits on a span with no role and is dropped. */
function Stars({ rating, label }: { rating: number; label: string }) {
  return (
    <span role="img" aria-label={label} className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <StarIcon
          key={n}
          size={14}
          filled={n <= rating}
          className={n <= rating ? "text-sun-ink" : "text-line-strong"}
        />
      ))}
    </span>
  );
}

/**
 * Five stars that behave like the radio group they are.
 *
 * They were five buttons: a screen reader announced "1 / 5, button" five times
 * with nothing saying they were one choice or which one was current, and a
 * keyboard user tabbed through all five. A radiogroup with roving tabindex is
 * one tab stop, announces the selection, and moves with the arrow keys — which
 * is what a rating control is expected to do.
 */
function RatingPicker({ initial }: { initial: number }) {
  const t = useTranslations("Dataset");
  const [rating, setRating] = useState(initial);
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? rating;
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const select = (n: number) => {
    setRating(n);
    refs.current[n - 1]?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    const next = {
      ArrowRight: rating + 1,
      ArrowUp: rating + 1,
      ArrowLeft: rating - 1,
      ArrowDown: rating - 1,
      Home: 1,
      End: 5,
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    select(Math.min(5, Math.max(1, next)));
  };

  return (
    <div
      role="radiogroup"
      aria-labelledby="review-rating-label"
      onKeyDown={onKeyDown}
      className="flex items-center gap-1"
    >
      <input type="hidden" name="rating" value={rating} />
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          ref={(el) => {
            refs.current[n - 1] = el;
          }}
          type="button"
          role="radio"
          aria-checked={n === rating}
          aria-label={t("ratingOutOfFive", { rating: String(n) })}
          // Roving tabindex: the group is one tab stop and the arrow keys move
          // inside it, so Tab never lands on four stars nobody chose.
          tabIndex={n === rating ? 0 : -1}
          onClick={() => select(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(null)}
          className="rounded p-0.5 transition hover:scale-125 focus-visible:ring-2 focus-visible:ring-brand"
        >
          <StarIcon size={22} filled={n <= shown} className={n <= shown ? "text-sun-ink" : "text-line-strong"} />
        </button>
      ))}
    </div>
  );
}
