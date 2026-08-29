/**
 * The controlled vocabularies a depositor chooses from, and the only place
 * their canonical values are written down.
 *
 * Two rules govern everything here.
 *
 * The stored value is **canonical English**, never the label the depositor
 * saw. `datasets.topics` and `datasets.collection_method` are facets — the
 * browse page filters with `contains("topics", [value])` and `eq()` — so a
 * topic filed as "Ta'lim" and the same topic filed as "Education" would split
 * into two facets that never match each other. Labels are localised at render
 * time instead, through `topicLabel`/`methodLabel` below.
 *
 * The vocabulary is a **suggestion, not a constraint**. Every list ends in
 * "Other" with a free-text box, and both columns stay plain text with no CHECK
 * constraint, so a survey that does not fit still gets deposited. That means
 * unknown values reach the display helpers routinely — from "Other", and from
 * the free-text era before this file existed — and they must pass through
 * unchanged rather than render blank.
 */

import type { Messages } from "next-intl";

/**
 * Message keys, not free strings. next-intl types `t` against the actual
 * catalogue, so a key with no translation is a compile error here rather than
 * a blank chip in production — and adding a topic without adding all three
 * locales cannot get past `tsc`.
 */
type VocabKey = keyof Messages["Vocab"];
type DepositKey = keyof Messages["Deposit"];

/** Sentinel stored by none of the columns: it only ever means "show the box". */
export const OTHER = "Other";

export interface VocabOption {
  /** What goes in the database, and what a filter URL carries. */
  value: string;
  /** Message key under the `Vocab` namespace. */
  key: VocabKey;
}

/**
 * Ordered roughly by how often surveys in the region are about them, not
 * alphabetically — a depositor scans this list rather than looking a word up
 * in it, and the ones they are most likely to want should come first.
 */
export const TOPICS: VocabOption[] = [
  { value: "Education", key: "education" },
  { value: "Health", key: "health" },
  { value: "Wellbeing & life satisfaction", key: "wellbeing" },
  { value: "Employment & labour", key: "employment" },
  { value: "Income & poverty", key: "income" },
  { value: "Economy & prices", key: "economy" },
  { value: "Migration", key: "migration" },
  { value: "Gender", key: "gender" },
  { value: "Youth", key: "youth" },
  { value: "Family & household", key: "family" },
  { value: "Agriculture & rural life", key: "agriculture" },
  { value: "Business & entrepreneurship", key: "business" },
  { value: "Politics & public opinion", key: "politics" },
  { value: "Governance & corruption", key: "governance" },
  { value: "Social cohesion & trust", key: "cohesion" },
  { value: "Religion & values", key: "religion" },
  { value: "Media & internet", key: "media" },
  { value: "Environment & climate", key: "environment" },
  { value: "Housing & infrastructure", key: "housing" },
  { value: "Social protection", key: "socialProtection" },
  { value: "Crime & safety", key: "crime" },
];

export interface MethodOption extends VocabOption {
  /**
   * Whether to follow up with "which platform?". False for the modes that
   * cannot have one — a paper questionnaire ran on paper — so the question
   * only appears when it has a real answer.
   */
  asksPlatform: boolean;
}

export const COLLECTION_METHODS: MethodOption[] = [
  { value: "Online questionnaire", key: "online", asksPlatform: true },
  { value: "Face-to-face interview", key: "faceToFace", asksPlatform: false },
  { value: "Telephone interview", key: "telephone", asksPlatform: false },
  { value: "Paper questionnaire", key: "paper", asksPlatform: false },
  { value: "Mixed mode", key: "mixed", asksPlatform: true },
  { value: OTHER, key: "other", asksPlatform: true },
];

/**
 * Product names, so they are not translated — the label shown is the value
 * itself. Telegram sits high because bot-run surveys are ordinary here and a
 * depositor who does not see it listed tends to answer "Online" and stop.
 */
export const PLATFORMS: string[] = [
  "Google Forms",
  "Telegram bot",
  "Microsoft Forms",
  "KoboToolbox",
  "ODK",
  "SurveyMonkey",
  "Qualtrics",
  "Typeform",
  OTHER,
];

export interface LicenseOption extends VocabOption {
  /** Key of the one-line plain explanation shown beside it, under `Deposit`. */
  blurbKey: DepositKey;
}

/** Recommended first. CC-BY is the default the column already carries. */
export const LICENSES: LicenseOption[] = [
  // Keys are prefixed because `Vocab.other` already belongs to the collection
  // methods, and "Other licence" has to say more than "Other".
  { value: "CC-BY", key: "licenseCcBy", blurbKey: "ccByBlurb" },
  { value: "CC0", key: "licenseCc0", blurbKey: "cc0Blurb" },
  { value: "CC-BY-SA", key: "licenseCcBySa", blurbKey: "ccBySaBlurb" },
  { value: OTHER, key: "licenseOther", blurbKey: "otherBlurb" },
];

type Translate = (key: VocabKey) => string;

function label(options: VocabOption[], value: string, t: Translate): string {
  const match = options.find((o) => o.value === value);
  // Free-text and pre-vocabulary values land here. Echoing the stored string
  // is the only honest fallback: a missing-key placeholder would hide a real
  // topic behind "Vocab.undefined" on the browse page.
  return match ? t(match.key) : value;
}

export function topicLabel(value: string, t: Translate): string {
  return label(TOPICS, value, t);
}

export function methodLabel(value: string, t: Translate): string {
  return label(COLLECTION_METHODS, value, t);
}
