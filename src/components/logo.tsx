import { Link } from "@/i18n/navigation";

/** Playful bar-chart glyph — the SurveyBase mark. */
export function LogoGlyph({ size = 32 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-flex items-end justify-center gap-[3px] rounded-xl bg-brand p-[7px]"
      style={{ width: size, height: size }}
    >
      <span className="w-[4px] rounded-full bg-on-brand/70" style={{ height: "40%" }} />
      <span className="w-[4px] rounded-full bg-on-brand" style={{ height: "100%" }} />
      <span className="w-[4px] rounded-full bg-on-brand/85" style={{ height: "65%" }} />
    </span>
  );
}

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <Link href="/" className="group inline-flex items-center gap-2.5">
      <LogoGlyph size={size} />
      <span className="font-display text-lg font-bold tracking-tight text-ink">
        SurveyBase<span className="text-brand">.uz</span>
      </span>
    </Link>
  );
}
