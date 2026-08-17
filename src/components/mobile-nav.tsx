"use client";

import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { MenuIcon, XIcon } from "./icons";

export function MobileNav({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // close the sheet whenever navigation happens (adjust-state-during-render pattern)
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setOpen(false);
  }

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-line-strong text-ink transition hover:bg-card-soft"
      >
        {open ? <XIcon size={20} /> : <MenuIcon size={20} />}
      </button>
      {open && (
        <div className="fade-up absolute inset-x-3 top-[calc(100%+0.5rem)] z-50 flex flex-col gap-1 rounded-2xl border border-line bg-card p-3 shadow-pop">
          {children}
        </div>
      )}
    </div>
  );
}
