import { initials } from "@/lib/profiles";

/**
 * A plain <img> rather than next/image: avatar URLs come from a Supabase
 * Storage bucket, and routing them through the optimizer would mean adding
 * the project host to next.config remotePatterns and paying for a transform
 * on an image that is already small and served from a CDN.
 */
export function Avatar({
  name,
  src,
  size = 48,
}: {
  name: string | null;
  src: string | null;
  size?: number;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- see note above
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        className="shrink-0 rounded-full border border-line object-cover"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-brand-soft font-display font-bold text-brand-ink"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
    >
      {initials(name)}
    </span>
  );
}
