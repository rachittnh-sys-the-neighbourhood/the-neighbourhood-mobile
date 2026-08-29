import { supabase, unwrap } from "./client";
import {
  MOTHER_ACTIVITY_CATEGORIES,
  type MotherActivity,
  type MotherActivityCategory,
  type MotherDailyPlan,
  type MotherDailyPlanRow,
} from "./types";

/**
 * The mother's own daily recovery plan.
 *
 * Same shape as lib/db/plans.ts's child plan: generation, the family-local
 * date, and the swap rotation all live in Postgres
 * (get_or_create_mother_daily_plan / swap_mother_plan_category), keyed by
 * profile_id rather than child_id — the mother's own record, not the
 * child's.
 */

const ACTIVITY_ID_COLUMN: Record<MotherActivityCategory, keyof MotherDailyPlanRow> = {
  physical_recovery: "physical_recovery_activity_id",
  emotional_wellness: "emotional_wellness_activity_id",
  mother_baby_bonding: "mother_baby_bonding_activity_id",
  couple_connection: "couple_connection_activity_id",
};

/** Resolves a plan row's four activity ids into full activity records. */
async function hydrate(row: MotherDailyPlanRow): Promise<MotherDailyPlan> {
  const ids = MOTHER_ACTIVITY_CATEGORIES.map(
    (c) => row[ACTIVITY_ID_COLUMN[c]] as string | null
  ).filter((id): id is string => Boolean(id));

  const activities = ids.length
    ? unwrap<MotherActivity[]>(
        "motherPlans.hydrate",
        await supabase
          .from("mother_activities")
          .select(
            "id, category, month_postpartum, applies_to, title, description, duration_minutes, time_of_day, with_baby, effort_level, progression_notes"
          )
          .in("id", ids)
      )
    : [];

  const byId = new Map(activities.map((a) => [a.id, a]));

  return {
    id: row.id,
    planDate: row.plan_date,
    activities: MOTHER_ACTIVITY_CATEGORIES.map((c) =>
      byId.get(row[ACTIVITY_ID_COLUMN[c]] as string)
    ).filter((a): a is MotherActivity => Boolean(a)),
    swaps: row.swaps ?? {},
  };
}

/** The mother's plan for today, generating it once if this is the first open. */
export async function getTodaysMotherPlan(profileId: string): Promise<MotherDailyPlan> {
  const row = unwrap<MotherDailyPlanRow>(
    "motherPlans.getTodaysMotherPlan",
    await supabase.rpc("get_or_create_mother_daily_plan", { p_profile_id: profileId })
  );
  return hydrate(row);
}

/** Rotates one category to its next activity, staying inside the current month. */
export async function swapMotherCategory(
  profileId: string,
  category: MotherActivityCategory
): Promise<MotherDailyPlan> {
  const row = unwrap<MotherDailyPlanRow>(
    "motherPlans.swapMotherCategory",
    await supabase.rpc("swap_mother_plan_category", {
      p_profile_id: profileId,
      p_category: category,
    })
  );
  return hydrate(row);
}
