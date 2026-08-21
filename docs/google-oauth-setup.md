# Google OAuth: the two dashboards, and which URL goes where

Almost every failure of "Continue with Google" is one of two URLs typed into the
wrong dashboard. They are different URLs, they live in different places, and
neither is interchangeable with the other.

## The flow, so the URLs make sense

There are **two** redirects, not one:

```
browser  ──1──▶  accounts.google.com
                   redirect_uri = https://<project-ref>.supabase.co/auth/v1/callback
                                  ▲ Google only ever sees SUPABASE's URL
google   ──2──▶  https://<project-ref>.supabase.co/auth/v1/callback
supabase ──3──▶  https://surveybase.uz/auth/callback?locale=uz
                   ▲ our redirectTo, from src/lib/auth-redirect.ts
our app  ──4──▶  https://surveybase.uz/uz
```

Google never learns that surveybase.uz exists. Supabase is the OAuth client;
our site is downstream of it. That is the whole source of the confusion.

## Fixing `Error 400: redirect_uri_mismatch`

This is Google rejecting step 1, so the fix is **only** in Google Cloud Console.

1. Google Cloud Console → **APIs & Services → Credentials**
2. Open the OAuth 2.0 Client ID already wired into Supabase
3. Under **Authorized redirect URIs**, there must be exactly:

   ```
   https://<project-ref>.supabase.co/auth/v1/callback
   ```

   No trailing slash. `https`, not `http`. `<project-ref>` is the subdomain of
   `NEXT_PUBLIC_SUPABASE_URL` (visible in the Supabase dashboard URL, and in the
   Vercel environment variables).

   **The common mistake is putting `https://surveybase.uz/auth/callback` here.**
   That URL is real and is used — but at step 3, by Supabase, not by Google.

4. Under **Authorized JavaScript origins**: `https://<project-ref>.supabase.co`

Google's own error page prints the exact `redirect_uri` it received — expand
"Error details" and paste that value into the field verbatim. That removes all
guesswork about typos.

Changes can take a few minutes to propagate. Test in a private window, since a
cached Google session masks the difference between "fixed" and "still broken".

## The other dashboard — Supabase

Needed for step 3 to work. Even with Google correct, a missing entry here means
sign-in succeeds and then dumps the user back at the login page.

Supabase Dashboard → **Authentication → URL Configuration**:

- **Site URL**: `https://surveybase.uz`
- **Redirect URLs** must include:
  - `https://surveybase.uz/auth/callback`
  - `http://localhost:3000/auth/callback` — local development

Supabase Dashboard → **Authentication → Providers → Google**: enabled, with the
client ID and secret from the same Google credential above.

Preview deployments are deliberately not supported: `publicOrigin()` sends
production traffic to the canonical domain rather than trusting a request header,
so OAuth from a preview URL lands on production. Allow-listing a domain that
changes on every push is not worth the maintenance.

## When it still fails

The callback route logs every failure with an `[auth/callback]` prefix — read
the Vercel function logs for `/auth/callback`. The user-facing message is
deliberately a generic localized string, because the provider's own text is
unlocalised and sometimes leaks internal detail; the specific reason is in the
log, not the URL.
