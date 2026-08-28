import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";
import { resolveLocale } from "@/lib/auth-redirect";
import { updateSession } from "@/lib/supabase/middleware";

const handleI18nRouting = createIntlMiddleware(routing);

/**
 * Pages that a logged-out visitor has no business rendering.
 *
 * They each check the session again on the server and redirect, and that check
 * stays — this is not a replacement for it. But `redirect()` from a Server
 * Component is resolved by the client during the initial document request, so
 * the page answered 200 with a body to anything that does not run JavaScript:
 * a crawler, a link preview, a `curl`. Deciding here means the answer is a 307
 * before any of the page is rendered.
 */
const PROTECTED_SEGMENTS = ["profile", "deposit", "moderate"];

function protectedRequest(pathname: string): boolean {
  const [, locale, segment] = pathname.split("/");
  return (
    (routing.locales as readonly string[]).includes(locale) &&
    PROTECTED_SEGMENTS.includes(segment)
  );
}

export async function proxy(request: NextRequest) {
  const intlResponse = handleI18nRouting(request);

  // next-intl answers an unprefixed path with a redirect of its own. Nothing
  // is being rendered, so there is nothing to protect yet, and the locale is
  // only settled on the request that follows.
  if (intlResponse.status >= 300 && intlResponse.status < 400) {
    return (await updateSession(request, intlResponse)).response;
  }

  const { response, user } = await updateSession(request, intlResponse);

  const { pathname } = request.nextUrl;
  if (!user && protectedRequest(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = `/${resolveLocale(pathname.split("/")[1])}/login`;
    url.search = "";
    const redirectResponse = NextResponse.redirect(url);
    // updateSession may have written refreshed auth cookies onto the response
    // it was handed; dropping them here would log the visitor out for real.
    response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|trpc|_next|_vercel|auth|.*\\..*).*)"],
};
