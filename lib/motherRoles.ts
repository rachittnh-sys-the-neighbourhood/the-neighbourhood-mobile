import type { MotherActivity, MotherActivityCategory, MoodValue } from "./db/types";

/**
 * The three-bucket reorganisation of a mother's own "FOR TODAY" section —
 * "For me / With my child / Together", matching the exact wording of the
 * You Tab brand-direction reference. Mirrors lib/fatherRoles.ts's "Your
 * child. Your partnership. You." for a father's own FOR TODAY, which this
 * is deliberately the same shape as (role tabs over the day's plan
 * activities, one always-expanded card, day-rotated default) — but this
 * is mother-only. Nothing here touches a father's own You hub.
 */
export type MotherRole = "me" | "child" | "together";

export const MOTHER_ROLE_LABEL: Record<MotherRole, string> = {
  me: "For me",
  child: "With my child",
  together: "Together",
};

/**
 * The four mother_activities categories (see lib/db/types.ts
 * MOTHER_ACTIVITY_CATEGORIES), grouped into the three roles. "me" is the
 * only role with more than one category — physical recovery and
 * emotional wellness are both squarely "about her" rather than about the
 * baby or the couple — so it day-rotates between the two the same way a
 * father's "partner" role rotates across its three.
 */
export const MOTHER_ROLE_ACTIVITY_CATEGORIES: Record<MotherRole, MotherActivityCategory[]> = {
  me: ["physical_recovery", "emotional_wellness"],
  child: ["mother_baby_bonding"],
  together: ["couple_connection"],
};

/**
 * A first guess at which role today's mood check-in should suggest —
 * same rationale as FATHER_MOOD_ROLE: rough/meh point toward "me" (self
 * first, before anything else), "great" points toward "together" (a good
 * day is a fair time to give something back), and the steady middle
 * (okay/good) leaves the day-rotated pick alone by pointing at "child",
 * the usual default.
 */
export const MOTHER_MOOD_ROLE: Record<MoodValue, MotherRole> = {
  rough: "me",
  meh: "me",
  okay: "child",
  good: "child",
  great: "together",
};

/**
 * Today's one DO pick for a role, from the day's already-generated
 * mother plan — rotates by day across the role's categories when it has
 * more than one ("me" has two), so FOR TODAY doesn't always surface the
 * same category.
 */
export function todaysActivityForMotherRole(
  activities: MotherActivity[],
  role: MotherRole,
  dayIndex: number
): MotherActivity | null {
  const categories = MOTHER_ROLE_ACTIVITY_CATEGORIES[role];
  const pool = activities.filter((a) => categories.includes(a.category));
  if (pool.length === 0) return null;
  // Stable per-role rotation: sort by category name first so the same
  // dayIndex always lands on the same activity for a given day, rather
  // than depending on the array's incoming order.
  const sorted = [...pool].sort((a, b) => a.category.localeCompare(b.category));
  return sorted[dayIndex % sorted.length];
}
