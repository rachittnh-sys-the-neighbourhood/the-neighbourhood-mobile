/**
 * The sections that live inside Child — the single source of truth for
 * both the Child card grid and the Stack's screen registration, so the
 * two can never drift out of sync.
 *
 * None of these is a tab, and none gets a top-level route. They are all
 * exactly one tap from the Child landing screen (two from Home), which is
 * the depth budget the IA allows.
 *
 * `group` places each card into one of five conceptual zones — discover,
 * stage, care, journey or need. The Child landing screen (see
 * app/(tabs)/child/index.tsx) renders `discover`/`stage` as two of the
 * EXPLORE tiles (alongside the ad-hoc Notice and Eat teasers) and merges
 * `care`, `journey` and `need` into a single visual CARE tile group. The
 * zones stay distinct here even though three of them currently render
 * under one on-screen label, because what's genuinely in each differs and
 * a future screen may want to tell them apart again. This is a curated
 * companion, not a feature catalogue, so the zones exist to give each
 * card a reason for being there, not to turn six cards into six
 * equally-weighted tiles.
 * "Activities" deliberately isn't here: that's Home's job (the daily
 * plan), and a card here that just deep-links back to a different tab
 * would undercut "everything here is about my child, in one place."
 *
 * This list is age-invariant: a 2-week-old and a 7-year-old see the same
 * cards in the same zones. Age changes what's INSIDE a section —
 * vaccination entries thin out, milestone density drops, kit
 * recommendations advance, meal stage moves on, This Stage's recommended
 * reads change — never which sections exist.
 */
export type ChildSectionGroup = "discover" | "stage" | "care" | "journey" | "need";

export type ChildSection = {
  /** Route segment under app/(tabs)/child/ */
  slug: "milestones" | "guide" | "kit" | "vaccinations" | "meals" | "reports" | "stories";
  title: string;
  /** One short line, shown on the card. */
  description: string;
  group: ChildSectionGroup;
};

export const CHILD_SECTIONS: ChildSection[] = [
  {
    slug: "milestones",
    title: "Discoveries",
    description: "What's typical now, and what they've already done.",
    group: "discover",
  },
  {
    slug: "guide",
    title: "This Stage",
    description: "What matters for your child right now.",
    group: "stage",
  },
  {
    slug: "meals",
    title: "Meal Planner",
    description: "Feeding guidance staged to where they actually are.",
    group: "care",
  },
  {
    slug: "vaccinations",
    title: "Vaccinations",
    description: "The schedule, what's given, and what's due.",
    group: "care",
  },
  {
    slug: "stories",
    title: "Stories",
    description: "Read-aloud stories for the first three years.",
    group: "care",
  },
  {
    slug: "reports",
    title: "Progress",
    description: "Discoveries, activities and patterns over time.",
    group: "journey",
  },
  {
    slug: "kit",
    title: "Development Kit",
    description: "The kit they're on, and what's next.",
    group: "need",
  },
];

export const sectionsInGroup = (group: ChildSectionGroup): ChildSection[] =>
  CHILD_SECTIONS.filter((s) => s.group === group);

export const childHref = (slug: ChildSection["slug"]) => `/child/${slug}` as const;
