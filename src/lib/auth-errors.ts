// Every auth failure the UI can render, as message keys rather than provider
// strings. Two reasons they live here and not in the "use server" actions file:
// a "use server" module may only export async functions, so the array below
// could not live there; and the callback route needs the same vocabulary
// without importing a server action.
//
// Raw Supabase or Google text is deliberately never shown to a user or put in a
// URL — it is provider-controlled, unlocalised, and occasionally leaks internal
// detail. It goes to the server log; the user gets one of these keys.

export const AUTH_ERROR_KEYS = [
  "errorInvalidCredentials",
  "errorEmailNotConfirmed",
  "errorUserExists",
  "errorWeakPassword",
  "errorOAuthUnavailable",
  "errorGeneric",
] as const;

export type AuthErrorKey = (typeof AUTH_ERROR_KEYS)[number];

/**
 * Narrow an untrusted `?authError=` value before it reaches next-intl's `t()`,
 * which throws on an unknown key. Without this check any stranger with a link
 * could crash the login page by inventing a query string.
 */
export function isAuthErrorKey(value: string | null): value is AuthErrorKey {
  return value !== null && (AUTH_ERROR_KEYS as readonly string[]).includes(value);
}
