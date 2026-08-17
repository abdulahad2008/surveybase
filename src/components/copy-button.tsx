"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon } from "./icons";

export function CopyButton({ text, label, copiedLabel }: { text: string; label: string; copiedLabel: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable — ignore
    }
  }

  return (
    <button type="button" onClick={copy} className="btn btn-sm btn-soft">
      {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
      {copied ? copiedLabel : label}
    </button>
  );
}
