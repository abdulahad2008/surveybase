/**
 * Applies a saved theme choice before the browser's first paint.
 *
 * This must be a blocking inline script in <head>. useEffect runs after paint,
 * and even useLayoutEffect runs after hydration — on a slow connection the
 * browser paints the server HTML long before React loads, so either would show
 * a flash of the wrong palette. An inline script runs during HTML *parsing*,
 * before anything is painted.
 *
 * `data-theme` is only written when the visitor has explicitly chosen. With no
 * stored choice the attribute stays absent and the `prefers-color-scheme` media
 * query in globals.css decides — which is also the no-JavaScript behaviour.
 *
 * `type` is flipped to text/plain on the client so React doesn't warn about
 * rendering a <script> tag, per Next.js's preventing-flash-before-hydration
 * guide; the script has already run by then and must not run again.
 */
export const THEME_STORAGE_KEY = "surveybase-theme";

const html = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

export function ThemeScript() {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
