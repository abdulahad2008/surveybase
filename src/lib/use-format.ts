"use client";

import { useTranslations } from "next-intl";
import {
  formatFixed,
  formatInteger,
  formatNumber,
  formatPercent,
  isoDateParts,
  type Separators,
} from "@/lib/format";

/**
 * The client-side half of `@/lib/format`: reads the locale's separators, month
 * names and date order out of the `Format` namespace and hands back formatters
 * that produce the same string in Node and in the browser.
 *
 * Every value interpolated into a message here is already a string, so
 * next-intl passes it through untouched instead of running it back through
 * `Intl.NumberFormat`, which is the divergence this exists to avoid.
 */
export function useFormat() {
  const t = useTranslations("Format");
  const separators: Separators = { decimal: t("decimal"), group: t("group") };
  const months = t("monthsShort").split(",");

  return {
    integer: (value: number) => formatInteger(value, separators),
    /** Up to two decimals, trailing zeros dropped. */
    number: (value: number) => formatNumber(value, separators),
    fixed: (value: number, digits: number) => formatFixed(value, digits, separators),
    percent: (share: number) => formatPercent(share, separators),
    /** `yyyy-mm-dd` in the locale's own order and month names. */
    day: (iso: string) => {
      const parts = isoDateParts(iso);
      if (!parts) return iso;
      return t("dateShort", {
        day: parts.day,
        month: months[parts.month - 1] ?? String(parts.month),
        year: parts.year,
      });
    },
  };
}
