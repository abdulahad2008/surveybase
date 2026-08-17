/**
 * Deterministically map a topic string to one of the accent chip palettes,
 * so the same topic always wears the same color everywhere in the UI.
 */
export interface TopicColor {
  bg: string;
  text: string;
  solid: string;
}

const PALETTES: TopicColor[] = [
  { bg: "var(--brand-soft)", text: "var(--brand-ink)", solid: "var(--brand)" },
  { bg: "var(--coral-soft)", text: "var(--coral)", solid: "var(--coral)" },
  { bg: "var(--mint-soft)", text: "var(--mint)", solid: "var(--mint)" },
  { bg: "var(--sun-soft)", text: "var(--sun)", solid: "var(--sun)" },
  { bg: "var(--rose-soft)", text: "var(--rose)", solid: "var(--rose)" },
  { bg: "var(--sky-soft)", text: "var(--sky)", solid: "var(--sky)" },
];

export function topicColor(topic: string): TopicColor {
  let hash = 0;
  for (let i = 0; i < topic.length; i++) {
    hash = (hash * 31 + topic.charCodeAt(i)) >>> 0;
  }
  return PALETTES[hash % PALETTES.length];
}
