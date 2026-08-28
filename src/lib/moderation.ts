/**
 * Limits the moderation UI and the server action have to agree on.
 *
 * A separate module because the action file is `"use server"`, which may only
 * export async functions — a constant exported from there is a build error,
 * and duplicating the number is how a `maxLength` and a server-side check
 * drift apart.
 */

/** Longest rejection reason a moderator can write. Matches the textarea's
 *  `maxLength`, so a longer one reaching the server bypassed the form. */
export const MAX_REJECTION_REASON = 1000;
