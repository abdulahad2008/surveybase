/**
 * Deterministically map a topic string to one of the accent chip palettes,
 * so the same topic always wears the same color everywhere in the UI.
 */
export interface TopicColor {
  bg: string;
  text: string;
  solid: string;
}

// `text` is always the -ink variant, never the base accent: the base accents
// are fills, and a chip that painted its label in one sat at 2.77:1 on its own
// background. `bg` and `solid` keep the originals — the fill is not the part
// that has to be readable.
const PALETTES: TopicColor[] = [
  { bg: "var(--brand-soft)", text: "var(--brand-ink)", solid: "var(--brand)" },
  { bg: "var(--coral-soft)", text: "var(--coral-ink)", solid: "var(--coral)" },
  { bg: "var(--mint-soft)", text: "var(--mint-ink)", solid: "var(--mint)" },
  { bg: "var(--sun-soft)", text: "var(--sun-ink)", solid: "var(--sun)" },
  { bg: "var(--rose-soft)", text: "var(--rose-ink)", solid: "var(--rose)" },
  { bg: "var(--sky-soft)", text: "var(--sky-ink)", solid: "var(--sky)" },
];

export function topicColor(topic: string): TopicColor {
  let hash = 0;
  for (let i = 0; i < topic.length; i++) {
    hash = (hash * 31 + topic.charCodeAt(i)) >>> 0;
  }
  return PALETTES[hash % PALETTES.length];
}
