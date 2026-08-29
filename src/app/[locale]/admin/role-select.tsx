"use client";

import { useActionState, useId } from "react";
import { useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { ROLES } from "@/lib/admin";
import { changeRole, type AdminState } from "./actions";

// Lives here rather than beside the action: a "use server" module may only
// export async functions, and exporting this constant from it made every
// dispatch of changeRole fail with a 500 before the action ever ran.
const IDLE: AdminState = { error: null, changedTo: null };

/**
 * The role control for one user.
 *
 * A select plus an explicit Save rather than a select that submits on change:
 * the list is keyboard-navigable, and on a native select an arrow key press
 * changes the value. Submitting on change would demote someone while its owner
 * was still reading the options.
 */
export function RoleSelect({
  locale,
  userId,
  currentRole,
  userLabel,
}: {
  locale: Locale;
  userId: string;
  currentRole: string;
  userLabel: string;
}) {
  const t = useTranslations("Admin");
  const [state, action, pending] = useActionState(
    changeRole.bind(null, locale, userId),
    IDLE,
  );
  const selectId = useId();

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <label htmlFor={selectId} className="sr-only">
        {t("roleFor", { name: userLabel })}
      </label>
      <select
        id={selectId}
        name="role"
        defaultValue={currentRole}
        disabled={pending}
        className="rounded-lg border border-line bg-card px-2 py-1.5 text-sm text-ink disabled:opacity-60"
      >
        {ROLES.map((role) => (
          <option key={role} value={role}>
            {t(`role_${role}`)}
          </option>
        ))}
      </select>
      <button type="submit" disabled={pending} className="btn btn-soft btn-sm">
        {pending ? t("saving") : t("save")}
      </button>

      {/* role="status" rather than "alert" for the success case: a screen
          reader should hear it, but not be interrupted mid-sentence for a
          change its user just asked for. */}
      {state.changedTo && (
        <span role="status" className="text-xs font-semibold text-good-text">
          {t("roleSaved", { role: t(`role_${state.changedTo}`) })}
        </span>
      )}
      {state.error && (
        <span role="alert" className="text-xs font-semibold text-danger">
          {t(state.error)}
        </span>
      )}
    </form>
  );
}
