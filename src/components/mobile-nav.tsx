"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { MenuIcon, XIcon } from "./icons";

/**
 * The menu the site is navigated with on a phone.
 *
 * It used to close on exactly one thing: pressing the button again. Escape did
 * nothing, tapping the page behind it did nothing, and dismissing it left focus
 * on a button that had just stopped describing what it did. The sheet sits
 * directly after the toggle in the DOM, so Tab reaches it without a focus trap
 * — what was missing was every way out.
 */
export function MobileNav({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const sheetId = useId();
  const container = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);

  // close the sheet whenever navigation happens (adjust-state-during-render pattern)
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      // Escape is a keyboard gesture, so the keyboard has to land somewhere
      // deliberate: the control that opened the sheet.
      toggle.current?.focus();
    }

    function onPointerDown(event: PointerEvent) {
      if (container.current?.contains(event.target as Node)) return;
      setOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    // Capture, so a link or button behind the sheet cannot swallow the event
    // before the sheet learns it was dismissed.
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [open]);

  return (
    <div ref={container} className="md:hidden">
      <button
        ref={toggle}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={sheetId}
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-line-strong text-ink transition hover:bg-card-soft"
      >
        {open ? <XIcon size={20} /> : <MenuIcon size={20} />}
      </button>
      {open && (
        <div
          id={sheetId}
          className="fade-up absolute inset-x-3 top-[calc(100%+0.5rem)] z-50 flex flex-col gap-1 rounded-2xl border border-line bg-card p-3 shadow-pop"
        >
          {children}
        </div>
      )}
    </div>
  );
}
