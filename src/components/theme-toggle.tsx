"use client";

import { MoonIcon, SunIcon } from "./icons";
import { THEME_STORAGE_KEY } from "./theme-script";

/**
 * Both icons are always rendered; CSS decides which one is visible (see the
 * .theme-icon rules in globals.css). That keeps the server and client markup
 * identical, so there is no hydration mismatch and no placeholder flicker —
 * the alternative, reading localStorage into React state, cannot be done
 * during SSR and forces an empty first render.
 *
 * With no stored choice the media query alone drives both the palette and the
 * icon, so the site keeps following the OS if it switches at sunset. Toggling
 * writes an explicit choice, which from then on wins over the OS.
 */
export function ThemeToggle({ label }: { label: string }) {
  function toggle() {
    const root = document.documentElement;
    const current =
      root.getAttribute("data-theme") ??
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const next = current === "dark" ? "light" : "dark";

    root.setAttribute("data-theme", next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* storage blocked — the choice just won't survive a reload */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-line-strong text-soft transition hover:bg-card-soft hover:text-ink"
    >
      <MoonIcon size={18} className="theme-icon-light" />
      <SunIcon size={18} className="theme-icon-dark" />
    </button>
  );
}
