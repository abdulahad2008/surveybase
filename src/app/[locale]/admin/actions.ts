"use server";

import { createClient } from "@/lib/supabase/server";
import type { Locale } from "@/i18n/routing";
import {
  isRole,
  refuseRoleChange,
  type Role,
  type RoleRefusal,
} from "@/lib/admin";

export type AdminErrorKey = RoleRefusal | "errorGeneric" | "errorMissing";

export interface AdminState {
  error: AdminErrorKey | null;
  /** Set on success so the row can confirm what it just did. */
  changedTo: Role | null;
  /**
   * The role the target actually holds once the attempt is over — the same on
   * success, unchanged on a refusal. The select is put back to this, because
   * after a refusal the value the admin picked is a lie and the value the page
   * was rendered with may be several saves stale.
   */
  serverRole: Role | null;
}

/**
 * Promote or demote a user.
 *
 * Deliberately uses the caller's own session client rather than the
 * service-role one: the role guard added in migration 0005 keys off
 * auth.uid(), and the service-role key has none, so writing roles through it
 * would make this the one code path the guard cannot see. Reaching another
 * user's row is instead granted by the admin update policy in 0010.
 */
export async function changeRole(
  // Bound by the caller and kept for symmetry with the site's other actions,
  // which use it to build redirects.
  _locale: Locale,
  targetId: string,
  // Unused, but useActionState's action signature requires it.
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "errorAuth", changedTo: null, serverRole: null };

  const raw = formData.get("role");
  const nextRole = typeof raw === "string" ? raw : "";

  // Everything the decision depends on is re-read here rather than taken from
  // the form: the page that rendered it may be minutes stale, and a Server
  // Action is reachable by anyone who can POST to it, form or no form.
  const { data: rows, error: readError } = await supabase
    .from("profiles")
    .select("id, role")
    .in("id", [user.id, targetId]);

  if (readError) {
    console.error(
      `[admin] reading roles for ${targetId} failed: ${readError.message}`,
    );
    return { error: "errorGeneric", changedTo: null, serverRole: null };
  }

  const actor = rows?.find((r) => r.id === user.id);
  const target = rows?.find((r) => r.id === targetId);
  if (!target)
    return { error: "errorMissing", changedTo: null, serverRole: null };

  const { count, error: countError } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin");

  if (countError) {
    console.error(`[admin] counting admins failed: ${countError.message}`);
    return { error: "errorGeneric", changedTo: null, serverRole: null };
  }

  const refusal = refuseRoleChange({
    actorRole: actor?.role,
    actorId: user.id,
    targetId,
    targetRole: target.role,
    nextRole,
    adminCount: count ?? 0,
  });
  // A refusal still knows the truth, having just read it.
  const held = isRole(target.role) ? target.role : null;
  if (refusal) return { error: refusal, changedTo: null, serverRole: held };
  // refuseRoleChange has already rejected anything outside ROLES. Repeated
  // here only so the type narrows before the value reaches the database.
  if (!isRole(nextRole))
    return { error: "errorRole", changedTo: null, serverRole: held };

  // `select()` so a write RLS declines is distinguishable from one that
  // worked. Without it PostgREST returns no error for a statement that matched
  // no rows, and the page would report a promotion that never happened —
  // which is exactly what this would do if 0010 has not been applied.
  const { data: updated, error } = await supabase
    .from("profiles")
    .update({ role: nextRole })
    .eq("id", targetId)
    .select("id");

  if (error) {
    console.error(
      `[admin] setting ${targetId} to ${nextRole} failed: ${error.message}`,
    );
    return { error: "errorGeneric", changedTo: null, serverRole: held };
  }
  if (!updated || updated.length === 0) {
    console.error(
      `[admin] setting ${targetId} to ${nextRole} changed no row; ` +
        "the admin update policy from 0010_admin_role_management.sql is probably missing",
    );
    return { error: "errorGeneric", changedTo: null, serverRole: held };
  }

  // No revalidatePath. It re-renders the route, which discards the state
  // useActionState is holding — so the row silently lost its "Saved" line and
  // a screen reader was told nothing at all. Nothing here needs it either:
  // /admin is dynamic, its queries are cookie-bound and uncached, the client
  // router cache treats dynamic entries as stale immediately, and a role
  // appears nowhere on this page except the select the admin just set.
  return { error: null, changedTo: nextRole, serverRole: nextRole };
}
