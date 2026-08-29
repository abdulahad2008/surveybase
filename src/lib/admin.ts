/**
 * Shared logic for the admin dashboard.
 *
 * Everything here is pure: the page and the server action both need the same
 * rules, and rules that live in a component can only be checked by driving a
 * browser against a live database.
 */

export const ROLES = ["user", "depositor", "moderator", "admin"] as const;
export type Role = (typeof ROLES)[number];

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export function isAdmin(role: string | null | undefined): boolean {
  return role === "admin";
}

/**
 * `download_log.format` for an outbound click on a link-only dataset, written
 * by /api/datasets/[slug]/visit. Anything else in that column is a real file
 * download, so the two stay countable apart.
 */
export const LINK_FORMAT = "link";

export interface ActivityEvent {
  created_at: string;
  format: string;
}

export interface ActivityTotals {
  links: number;
  files: number;
  total: number;
}

export function totalActivity(events: readonly ActivityEvent[]): ActivityTotals {
  let links = 0;
  for (const e of events) if (e.format === LINK_FORMAT) links += 1;
  return { links, files: events.length - links, total: events.length };
}

export interface DayBucket {
  /** ISO date, YYYY-MM-DD, in UTC. */
  day: string;
  links: number;
  files: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * One bucket per day, newest first, including days with no activity — a chart
 * or table that silently skips empty days makes a quiet week look like a busy
 * one. UTC throughout: the alternative is a rollup that shifts under readers in
 * different timezones, and Tashkent is the only timezone that matters here
 * anyway, so the simpler rule wins.
 */
export function rollupByDay(
  events: readonly ActivityEvent[],
  days: number,
  now: Date,
): DayBucket[] {
  const buckets = new Map<string, DayBucket>();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

  for (let i = 0; i < days; i += 1) {
    const day = new Date(today - i * DAY_MS).toISOString().slice(0, 10);
    buckets.set(day, { day, links: 0, files: 0 });
  }

  for (const e of events) {
    const day = e.created_at.slice(0, 10);
    const bucket = buckets.get(day);
    if (!bucket) continue; // older than the window, or an unparseable timestamp
    if (e.format === LINK_FORMAT) bucket.links += 1;
    else bucket.files += 1;
  }

  return [...buckets.values()];
}

export interface RoleChange {
  actorRole: string | null | undefined;
  actorId: string;
  targetId: string;
  targetRole: string;
  nextRole: string;
  /** How many admins exist right now, the target included. */
  adminCount: number;
}

export type RoleRefusal = "errorAuth" | "errorRole" | "errorNoop" | "errorLastAdmin";

/**
 * Why a role change must be refused, or null when it may proceed.
 *
 * The last-admin rule is the important one: /admin is the only place roles can
 * be changed, and it is admin-only, so demoting the final admin would lock the
 * door from the inside with the key still in it. Recovering means going back to
 * the service-role key, which is exactly what this page exists to avoid. The
 * check covers demoting anyone, not just yourself — one admin demoting another
 * is safe only while a third remains.
 */
export function refuseRoleChange(change: RoleChange): RoleRefusal | null {
  if (!isAdmin(change.actorRole)) return "errorAuth";
  if (!isRole(change.nextRole)) return "errorRole";
  if (change.nextRole === change.targetRole) return "errorNoop";
  if (
    isAdmin(change.targetRole) &&
    !isAdmin(change.nextRole) &&
    change.adminCount <= 1
  ) {
    return "errorLastAdmin";
  }
  return null;
}
