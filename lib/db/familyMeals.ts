import { supabase, unwrap } from "./client";
import type { DietaryPreference } from "../parentCare";
import type { FamilyMeal } from "./types";

/**
 * The Family Meal Planner data layer, sourced from the v11 Meal Planner
 * workbook (see supabase/migrations/20260910090000_family_meal_planner.sql).
 *
 * STILL PENDING RD/PAEDIATRICIAN SIGN-OFF -- every screen that reads from
 * here must show components/ExpertReviewBanner alongside the content. This
 * is a product decision (ship behind a visible disclaimer rather than wait
 * for full clinical review), not an oversight.
 *
 * Filtering (age stage, diet, allergies) happens client-side over the
 * whole (small, ~200-row) table, same pattern the old hardcoded
 * lib/parentCare.ts mealsFor() used -- simplest thing that works, and the
 * table changes rarely enough that a session-lifetime cache is fine.
 */

export type FamilyMealSlot = FamilyMeal["slots"][number];

export const FAMILY_MEAL_SLOTS: { key: FamilyMealSlot; label: string; window: string }[] = [
  { key: "breakfast", label: "Breakfast", window: "Morning" },
  { key: "morning_snack", label: "Morning Snack", window: "Mid-morning" },
  { key: "lunch", label: "Lunch", window: "Midday" },
  { key: "afternoon_snack", label: "Evening Snack", window: "Afternoon" },
  { key: "dinner", label: "Dinner", window: "Evening" },
];

/** The workbook's five age-stage buckets. Below 6 months there is no meal
 *  timeline at all -- milk is the whole diet -- so this returns null. */
export function familyMealAgeStage(ageMonths: number): string | null {
  if (ageMonths < 6) return null;
  if (ageMonths < 8) return "6-8m";
  if (ageMonths < 12) return "8-12m";
  if (ageMonths < 24) return "12-24m";
  if (ageMonths < 48) return "2-4y";
  return "4-7y";
}

let cache: FamilyMeal[] | null = null;

export async function fetchAllFamilyMeals(): Promise<FamilyMeal[]> {
  if (cache) return cache;
  const rows = unwrap<FamilyMeal[]>(
    "familyMeals.fetchAllFamilyMeals",
    await supabase.from("family_meals").select("*")
  );
  cache = rows;
  return rows;
}

/** Test-only escape hatch -- production code never needs to clear this. */
export function _resetFamilyMealsCacheForTests(): void {
  cache = null;
}

function matchesDiet(meal: FamilyMeal, diet: DietaryPreference): boolean {
  if (diet === "vegan") return meal.vegan;
  if (diet === "vegetarian") return meal.vegetarian && !meal.has_egg;
  if (diet === "eggetarian") return meal.vegetarian || meal.has_egg;
  return true; // omnivore (non-vegetarian): nothing excluded on diet grounds
}

function matchesAllergies(meal: FamilyMeal, allergies: string[]): boolean {
  if (allergies.length === 0) return true;
  const lowerAllergies = allergies.map((a) => a.toLowerCase().trim()).filter(Boolean);
  const flagText = meal.allergen_flags.join(" ").toLowerCase();
  const ingredientText = (meal.ingredients ?? "").toLowerCase();
  return !lowerAllergies.some(
    (a) => flagText.includes(a) || ingredientText.includes(a)
  );
}

/**
 * The family's candidate pool for one slot: age-appropriate for the
 * child, matching the household's diet, and clear of every known
 * allergen -- the parents' own (profile.allergies) union the child's
 * (child.allergies), since a family meal is eaten by everyone.
 */
export function mealsForSlot(
  allMeals: FamilyMeal[],
  slot: FamilyMealSlot,
  ageStage: string | null,
  diet: DietaryPreference,
  allergies: string[]
): FamilyMeal[] {
  return allMeals.filter((meal) => {
    // 41 of the 204 rows are audience="Child"-only entries (a baby's own
    // mash, not a dish for the table) and are flagged as such via this
    // exact boolean -- excluded here, not just from display, since this
    // pool also feeds the swap alternatives. Previously unchecked, which
    // meant a child-only item could surface as a "family" meal.
    if (!meal.family_meal_compatible) return false;
    if (!meal.slots.includes(slot)) return false;
    if (ageStage && !meal.age_stages.includes(ageStage)) return false;
    if (!matchesDiet(meal, diet)) return false;
    if (!matchesAllergies(meal, allergies)) return false;
    return true;
  });
}

/** Deterministic "today's pick" -- same day-index rotation pattern used
 *  everywhere else content rotates by day (see home.tsx, parentCare.ts). */
export function pickForDay<T>(pool: T[], dayIndex: number): T | null {
  if (pool.length === 0) return null;
  return pool[dayIndex % pool.length];
}

/**
 * Today's swap choices -- a slot the parent tapped "Swap" on shows the
 * next alternative from that same slot's pool instead of the day's
 * default pick, until they undo it or the app restarts. Session-only, in
 * memory: swapping is "not today, thanks", not a standing preference, so
 * nothing here is persisted to the database. A single module-level store
 * rather than component state because both the meal list and the meal
 * detail screen (a separate route) need to read and act on the same
 * swap, and there's no simpler way to share that between two screens
 * than the module both already import.
 */
const swapOverrides = new Map<FamilyMealSlot, string>();

export function getSwapOverride(slot: FamilyMealSlot): string | null {
  return swapOverrides.get(slot) ?? null;
}

export function setSwapOverride(slot: FamilyMealSlot, mealId: string): void {
  swapOverrides.set(slot, mealId);
}

export function clearSwapOverride(slot: FamilyMealSlot): void {
  swapOverrides.delete(slot);
}

/**
 * The mother-specific addition for a meal, by her diet -- e.g. "For you:
 * add curd + a squeeze of lemon." Falls back to the general
 * mother_boost_good_for line rather than showing nothing, and never
 * "n/a" -- matching the workbook's own explicit rule.
 */
export function motherBoostFor(meal: FamilyMeal, diet: DietaryPreference): string | null {
  const byDiet =
    diet === "vegan"
      ? meal.mother_boost_vegan
      : diet === "eggetarian"
        ? meal.mother_boost_eggetarian
        : diet === "vegetarian"
          ? meal.mother_boost_vegetarian
          : meal.mother_boost_nonveg;
  return byDiet || meal.mother_boost_good_for || null;
}

/**
 * motherBoostFor() is authored entirely in the mother's own voice ("For
 * you: add curd + a squeeze of lemon.", or the plain "Good for protein +
 * iron" fallback) -- correct read by her, wrong read by anyone else.
 *
 * A father reading the same line isn't a bystander being briefed on what
 * someone else needs -- family meals are cooked and eaten together, and
 * he's just as able to be the one adding the curd as she is. So this
 * keeps the original action ("Add a bowl of curd.") intact and verb-
 * first -- something either parent can actually go do -- and only swaps
 * the label in front of it from "for you" (wrong person) to what it's
 * FOR ("good for her recovery"), never "for your partner" or anything
 * that reads like handing her a plate.
 */
export function reframeBoostForPartner(boost: string): string {
  const forYou = boost.match(/^for you:\s*/i);
  if (forYou) {
    return `Good for her recovery: ${boost.slice(forYou[0].length).trim()}`;
  }
  const goodFor = boost.match(/^good for\s*/i);
  if (goodFor) {
    return `Good for her recovery — ${boost.slice(goodFor[0].length)}`;
  }
  return `Good for her recovery: ${boost}`;
}

/** motherBoostFor(), reframed for a father viewing the same meal -- see
 *  reframeBoostForPartner. */
export function partnerBoostFor(meal: FamilyMeal, diet: DietaryPreference): string | null {
  const boost = motherBoostFor(meal, diet);
  return boost ? reframeBoostForPartner(boost) : null;
}

const NUTRIENT_KEYWORDS: { key: string; label: string; terms: string[] }[] = [
  { key: "protein", label: "Protein-source", terms: ["protein"] },
  { key: "iron", label: "Iron-source", terms: ["iron"] },
  { key: "calcium", label: "Calcium-source", terms: ["calcium", "curd", "paneer", "milk", "dairy"] },
  { key: "vitamin_c", label: "Iron + vitamin C pairing", terms: ["lemon", "vitamin c", "guava", "orange", "amla", "citrus"] },
  { key: "b12_choline", label: "B12 / choline-source", terms: ["b12", "choline", "egg"] },
  { key: "fibre", label: "Fibre-source", terms: ["fibre", "fiber"] },
];

/**
 * A day-balancing HEURISTIC, in the workbook's own words: "counts
 * food-source opportunities across the day's planned meals... does NOT
 * calculate nutrient amounts or adequacy." This never states a number
 * met or a target reached, only how many times a source shows up today,
 * because that's exactly the language the workbook's "Mother Day
 * Balancing" sheet requires (LOCKED rule).
 */
export function dayBalancingOpportunities(
  todaysMeals: FamilyMeal[],
  diet: DietaryPreference
): { label: string; count: number }[] {
  const haystacks = todaysMeals.map((meal) =>
    [
      meal.mother_boost_good_for,
      motherBoostFor(meal, diet),
      meal.food_groups,
      meal.ingredients,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
  );
  return NUTRIENT_KEYWORDS.map(({ label, terms }) => ({
    label,
    count: haystacks.filter((text) => terms.some((term) => text.includes(term))).length,
  })).filter((entry) => entry.count > 0);
}
