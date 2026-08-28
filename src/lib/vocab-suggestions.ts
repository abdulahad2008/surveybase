import {
  COLLECTION_METHODS,
  LICENSES,
  OTHER,
  PLATFORMS,
  TOPICS,
} from "./survey-vocab";

/**
 * Finds the values depositors typed themselves — everything stored in a
 * vocabulary column that the vocabulary does not contain.
 *
 * Derived from the datasets rather than logged at deposit time. A log table
 * would have to keep its own copy of the vocabulary to know what counts as
 * "other", and the two would disagree the first time a topic was promoted;
 * this cannot disagree with the form, because it reads the same list the form
 * offers. It also sees the free text in datasets deposited before the
 * vocabulary existed, which a log starting today never would, and it empties
 * itself: a promoted topic stops being off-vocabulary and leaves on its own.
 *
 * The cost is a full scan of the four columns. At this archive's size that is
 * cheaper than the round trip; if it ever stops being so, the counting moves
 * into Postgres as an `unnest` and this signature does not change.
 */
export interface VocabSuggestion {
  value: string;
  count: number;
}

/**
 * Case and spacing are folded together so one topic does not arrive as three
 * entries — someone typing "tourism" is suggesting what "Tourism" suggests.
 * The spelling shown is whichever was used most, so the list reads the way
 * depositors actually write it.
 */
function tally(values: string[], known: Set<string>): VocabSuggestion[] {
  const groups = new Map<string, Map<string, number>>();

  for (const raw of values) {
    const value = raw.trim();
    if (value === "") continue;
    const key = value.toLowerCase();
    if (known.has(key)) continue;

    const spellings = groups.get(key) ?? new Map<string, number>();
    spellings.set(value, (spellings.get(value) ?? 0) + 1);
    groups.set(key, spellings);
  }

  return [...groups.values()]
    .map((spellings) => {
      const entries = [...spellings.entries()];
      const total = entries.reduce((sum, [, n]) => sum + n, 0);
      const commonest = entries.sort((a, b) => b[1] - a[1])[0][0];
      return { value: commonest, count: total };
    })
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}

// `OTHER` joins every list because it is a control the form uses, never an
// answer. It should not reach the database at all, but a row from before the
// vocabulary could carry it, and offering "Other" as a candidate topic would
// be nonsense.
function knownSet(values: string[]): Set<string> {
  return new Set([...values, OTHER].map((v) => v.toLowerCase()));
}

export interface VocabColumns {
  topics: string[] | null;
  collection_method: string | null;
  collection_platform: string | null;
  license: string | null;
}

export interface VocabSuggestions {
  topics: VocabSuggestion[];
  methods: VocabSuggestion[];
  platforms: VocabSuggestion[];
  licenses: VocabSuggestion[];
}

export function collectVocabSuggestions(
  rows: VocabColumns[],
): VocabSuggestions {
  const text = (values: (string | null)[]) =>
    values.filter((v): v is string => typeof v === "string");

  return {
    topics: tally(
      rows.flatMap((r) => r.topics ?? []),
      knownSet(TOPICS.map((t) => t.value)),
    ),
    methods: tally(
      text(rows.map((r) => r.collection_method)),
      knownSet(COLLECTION_METHODS.map((m) => m.value)),
    ),
    platforms: tally(
      text(rows.map((r) => r.collection_platform)),
      knownSet(PLATFORMS),
    ),
    licenses: tally(
      text(rows.map((r) => r.license)),
      knownSet(LICENSES.map((l) => l.value)),
    ),
  };
}

export function hasVocabSuggestions(s: VocabSuggestions): boolean {
  return (
    s.topics.length + s.methods.length + s.platforms.length + s.licenses.length >
    0
  );
}
