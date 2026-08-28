"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { CheckIcon, XIcon } from "@/components/icons";
import {
  approveDataset,
  rejectDataset,
  MAX_REJECTION_REASON,
  type ModerateState,
} from "./actions";

const IDLE: ModerateState = { error: null };

/**
 * The approve and reject buttons for one queued dataset.
 *
 * A client component because both actions used to be inline server actions
 * whose return value went nowhere: a rejection that failed on RLS or a lost
 * session looked exactly like one that worked — the row simply stayed in the
 * queue. `useActionState` gives both of them somewhere to say so.
 *
 * Rejecting also asks twice. It is the one irreversible-feeling action in the
 * queue and it sits next to Approve, so a mis-click would tell a depositor
 * their work was turned down. The confirmation step doubles as the place to
 * write the reason, which is optional but is the whole point of rejecting
 * rather than ignoring.
 */
export function ModerationActions({
  locale,
  datasetId,
  title,
}: {
  locale: Locale;
  datasetId: string;
  title: string;
}) {
  const t = useTranslations("Moderate");
  const [confirming, setConfirming] = useState(false);
  const reasonRef = useRef<HTMLTextAreaElement>(null);

  const [approveState, approveAction, approving] = useActionState(
    approveDataset.bind(null, locale, datasetId),
    IDLE,
  );
  const [rejectState, rejectAction, rejecting] = useActionState(
    rejectDataset.bind(null, locale, datasetId),
    IDLE,
  );

  // Focus lands on the reason box rather than on the confirm button: the
  // moderator opened this to explain, and the button is one Tab away.
  useEffect(() => {
    if (confirming) reasonRef.current?.focus();
  }, [confirming]);

  const error = approveState.error ?? rejectState.error;
  const busy = approving || rejecting;

  return (
    <div className="space-y-3">
      {!confirming ? (
        <div className="flex gap-2.5">
          <form action={approveAction}>
            <button
              type="submit"
              disabled={busy}
              className="btn btn-sm bg-mint text-white hover:brightness-105"
            >
              <CheckIcon size={14} />
              {approving ? t("approving") : t("approve")}
            </button>
          </form>
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirming(true)}
            className="btn btn-ghost btn-sm text-danger hover:bg-danger-soft"
          >
            <XIcon size={14} />
            {t("reject")}
          </button>
        </div>
      ) : (
        <form action={rejectAction} className="space-y-3 rounded-2xl bg-danger-soft p-4">
          <p className="text-sm font-semibold text-ink">
            {t("rejectConfirm", { title })}
          </p>
          <div>
            <label className="label" htmlFor={`reason-${datasetId}`}>
              {t("rejectReasonLabel")}
            </label>
            <textarea
              ref={reasonRef}
              id={`reason-${datasetId}`}
              name="reason"
              rows={3}
              maxLength={MAX_REJECTION_REASON}
              className="input"
              placeholder={t("rejectReasonPlaceholder")}
            />
            <p className="hint">{t("rejectReasonHint")}</p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <button
              type="submit"
              disabled={rejecting}
              className="btn btn-sm bg-danger text-white hover:brightness-105"
            >
              <XIcon size={14} />
              {rejecting ? t("rejecting") : t("rejectConfirmButton")}
            </button>
            <button
              type="button"
              disabled={rejecting}
              onClick={() => setConfirming(false)}
              className="btn btn-ghost btn-sm"
            >
              {t("cancel")}
            </button>
          </div>
        </form>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-xl bg-danger-soft px-3 py-2 text-sm font-medium text-danger"
        >
          {t(error)}
        </p>
      )}
    </div>
  );
}
