// Where Supabase sends the browser back to, and where the callback route sends
// it next. Both must agree on one origin: a session cookie written for a host
// the user is not actually on is silently lost, which looks exactly like a
// failed login.

import { SITE_URL } from "@/lib/site";
import { routing, type Locale } from "@/i18n/routing";

/**
 * The public origin of this deployment.
 *
 * In production this is the canonical domain, deliberately NOT anything derived
 * from the request. Behind a proxy `request.url` carries the internal instance
 * host, and `x-forwarded-host` is caller-supplied — trusting either would turn
 * the callback into an open redirect. Supabase's redirect allow-list is keyed to
 * the canonical domain anyway, so a request-derived origin would be rejected
 * there before it ever reached us.
 *
 * In development there is no proxy and the origin is whatever port `next dev`
 * chose, so the request's own origin is both correct and safe.
 *
 * Consequence worth knowing: OAuth on a Vercel preview deployment redirects to
 * production. Fixing that means allow-listing each preview URL in Supabase, which
 * is not worth doing for a domain that changes every push.
 */
export function publicOrigin(requestOrigin: string | null): string {
  if (process.env.NODE_ENV === "development" && requestOrigin) return requestOrigin;
  return SITE_URL;
}

/** The URL Supabase redirects to after OAuth, or from an email confirmation link. */
export function authCallbackUrl(locale: Locale, requestOrigin: string | null): string {
  return `${publicOrigin(requestOrigin)}/auth/callback?locale=${locale}`;
}

/** Narrow an untrusted `?locale=` back to a locale we actually serve. */
export function resolveLocale(value: string | null): Locale {
  return (routing.locales as readonly string[]).includes(value ?? "")
    ? (value as Locale)
    : routing.defaultLocale;
}
