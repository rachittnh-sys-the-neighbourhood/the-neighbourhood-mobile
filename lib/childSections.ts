/**
 * The sections that live inside Child — the single source of truth for
 * both the Child card grid and the Stack's screen registration, so the
 * two can never drift out of sync.
 *
 * None of these is a tab, and none gets a top-level route. They are all
 * exactly one tap from the Child landing screen (two from Home), which is
 * the depth budget the IA allows.
 *
 * Order is priority order — the grid renders in this sequence, most
 * frequently useful first. "Activities" deliberately isn't here: that's
 * Home's job (the daily plan), and a card here that just deep-links back
 * to a different tab would undercut "everything here is about my child,
 * in one place."
 *
 * This list is age-invariant: a 2-week-old and a 7-year-old see the same
 * six cards in the same order. Age changes what's INSIDE a section —
 * vaccination entries thin out, milestone density drops, kit
 * recommendations advance, meal stage moves on — never which sections exist.
 */
export type ChildSection = {
  /** Route segment under app/(tabs)/child/ */
  slug: "milestones" | "guide" | "kit" | "vaccinations" | "meals" | "reports" | "stories";
  title: string;
  /** One short line, shown on the card. */
  description: string;
  /**
   * Unset sections render in the main grid. "library" sections render in
   * their own group below it — still one tap away and just as much a card
   * as any other, just filed under reference material rather than daily
   * or growth-tracking use. See CHILD_SECTIONS / LIBRARY_SECTIONS below.
   */
  group?: "library";
};

export const CHILD_SECTIONS: ChildSection[] = [
  {
    slug: "meals",
    title: "Meal Planner",
    description: "Feeding guidance staged to where they actually are.",
  },
  {
    slug: "milestones",
    title: "Discoveries",
    description: "What's typical now, and what they've already done.",
  },
  {
    slug: "vaccinations",
    title: "Vaccinations",
    description: "The schedule, what's given, and what's due.",
  },
  {
    slug: "kit",
    title: "Development Kit",
    description: "The kit they're on, and what's next.",
  },
  {
    slug: "reports",
    title: "Reports",
    description: "Quiet weekly and monthly summaries.",
    group: "library",
  },
  {
    slug: "guide",
    title: "The Guide",
    description: "Courses and live workshops, expert-backed.",
    group: "library",
  },
  {
    slug: "stories",
    title: "Stories",
    description: "Read-aloud stories for the first three years.",
    group: "library",
  },
];

export const LIBRARY_SECTIONS = CHILD_SECTIONS.filter((s) => s.group === "library");

export const childHref = (slug: ChildSection["slug"]) => `/child/${slug}` as const;
