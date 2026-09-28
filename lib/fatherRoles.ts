import type { CareArea, CareTopic, DeliveryType } from "./parentCare";
import { topicsForProfile } from "./parentCare";
import type { FatherActivity, FatherActivityCategory, MoodValue } from "./db/types";

/**
 * The three-role reorganisation of the father's You experience: "Your
 * child. Your partnership. You." — everything a father sees on his You
 * hub buckets into exactly one of these three, never a fourth catch-all.
 *
 * This is father-only. Nothing here touches how a mother's You hub reads
 * her own recovery/relationship/wellbeing content — see you/index.tsx.
 */
export type FatherRole = "dad" | "partner" | "you";

export const FATHER_ROLE_LABEL: Record<FatherRole, string> = {
  dad: "As a dad",
  partner: "As a partner",
  you: "For you",
};

export const FATHER_ROLE_HUB_LABEL: Record<FatherRole, string> = {
  dad: "Fatherhood",
  partner: "Partnership",
  you: "Your wellbeing",
};

export const FATHER_ROLE_HUB_BLURB: Record<FatherRole, string> = {
  dad: "Your bond, confidence and role as dad.",
  partner: "Your relationship and the load you share.",
  you: "Mind, body, rest and life outside parenting.",
};

/**
 * The six father_activities categories (see lib/db/types.ts
 * FATHER_ACTIVITY_CATEGORIES), grouped into the three roles. This mapping
 * is almost verbatim the role definitions themselves: "As a Partner —
 * shared responsibility: supporting recovery, practical load,
 * communication" IS supporting_her_recovery + practical_load +
 * couple_relationship.
 */
export const FATHER_ROLE_ACTIVITY_CATEGORIES: Record<FatherRole, FatherActivityCategory[]> = {
  dad: ["bonding_with_baby", "becoming_a_father"],
  partner: ["supporting_her_recovery", "couple_relationship", "practical_load"],
  you: ["your_own_wellbeing"],
};

/**
 * CARE_TOPICS areas that belong wholesale to a role's Explore hub.
 * "fathering" is deliberately NOT listed here — see
 * FATHERING_TOPIC_ROLE_OVERRIDE below. That area actually mixes bonding
 * content ("As a Dad") with partner-support and his-own-adjustment
 * content ("As a Partner" / "For You") under one CareArea tag, because
 * area was never meant to carry this three-way split before now. Areas
 * ARE shared with a mother's own Well Being (relationships/feeding/
 * mental/sleep are general, visible to both roles) — that's unaffected;
 * this only decides how a FATHER's own Explore screen groups them.
 */
const FATHER_ROLE_BASE_AREAS: Record<FatherRole, CareArea[]> = {
  dad: [],
  partner: ["relationships", "feeding"],
  you: ["mental", "sleep"],
};

/**
 * Per-slug override for the "fathering"-area topics specifically, since
 * that one area bundles all three roles' content together. Any future
 * "fathering" topic not listed here defaults to "dad" — the area's own
 * original, narrower intent (bonding/confidence/understanding the child).
 */
const FATHERING_TOPIC_ROLE_OVERRIDE: Record<string, FatherRole> = {
  "bonding-when-shes-feeding": "dad",
  "what-she-needs-right-now": "partner",
  "supporting-recovery-you-cant-see": "partner",
  "your-own-adjustment": "you",
};

/** A father's Explore-hub reading list for one role — the READ content. */
export function topicsForFatherRole(delivery: DeliveryType, role: FatherRole): CareTopic[] {
  const fromBaseAreas = FATHER_ROLE_BASE_AREAS[role].flatMap((area) =>
    topicsForProfile(delivery, area)
  );
  const fromFathering = topicsForProfile(delivery, "fathering").filter(
    (topic) => (FATHERING_TOPIC_ROLE_OVERRIDE[topic.slug] ?? "dad") === role
  );
  return [...fromFathering, ...fromBaseAreas];
}

/**
 * A first guess at which role today's mood check-in should suggest --
 * rough/meh point toward "For you" (self first, before anything else),
 * "great" points toward "As a partner" (good days are a fair time to give
 * something back rather than default to himself), and the steady middle
 * (okay/good) leaves the day-rotated pick alone by pointing at "dad", the
 * usual default. This is a starting rule, not a validated one -- worth
 * revisiting once there's real usage to check it against, not more
 * guessing.
 */
export const FATHER_MOOD_ROLE: Record<MoodValue, FatherRole> = {
  rough: "you",
  meh: "you",
  okay: "dad",
  good: "dad",
  great: "partner",
};

/**
 * Today's one DO pick for a role, from the day's already-generated
 * father plan — rotates by day across the role's categories when it has
 * more than one (Partner has three), so "For Today" doesn't always
 * surface the same category. "You" has exactly one category, so this is
 * just that one.
 */
export function todaysActivityForRole(
  activities: FatherActivity[],
  role: FatherRole,
  dayIndex: number
): FatherActivity | null {
  const categories = FATHER_ROLE_ACTIVITY_CATEGORIES[role];
  const pool = activities.filter((a) => categories.includes(a.category));
  if (pool.length === 0) return null;
  // Stable per-role rotation: sort by category name first so the same
  // dayIndex always lands on the same activity for a given day, rather
  // than depending on the array's incoming order.
  const sorted = [...pool].sort((a, b) => a.category.localeCompare(b.category));
  return sorted[dayIndex % sorted.length];
}
