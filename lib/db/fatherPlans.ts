import { supabase, unwrap } from "./client";
import {
  FATHER_ACTIVITY_CATEGORIES,
  type FatherActivity,
  type FatherActivityCategory,
  type FatherDailyPlan,
  type FatherDailyPlanRow,
} from "./types";

/**
 * The father's own daily support plan.
 *
 * Same shape as lib/db/motherPlans.ts — generation, the family-local date,
 * and the swap rotation all live in Postgres
 * (get_or_create_father_daily_plan / swap_father_plan_category), keyed by
 * profile_id, the father's own record.
 */

const ACTIVITY_ID_COLUMN: Record<FatherActivityCategory, keyof FatherDailyPlanRow> = {
  supporting_her_recovery: "supporting_her_recovery_activity_id",
  bonding_with_baby: "bonding_with_baby_activity_id",
  couple_relationship: "couple_relationship_activity_id",
  your_own_wellbeing: "your_own_wellbeing_activity_id",
  becoming_a_father: "becoming_a_father_activity_id",
  practical_load: "practical_load_activity_id",
};

/** Resolves a plan row's six activity ids into full activity records. */
async function hydrate(row: FatherDailyPlanRow): Promise<FatherDailyPlan> {
  const ids = FATHER_ACTIVITY_CATEGORIES.map(
    (c) => row[ACTIVITY_ID_COLUMN[c]] as string | null
  ).filter((id): id is string => Boolean(id));

  const activities = ids.length
    ? unwrap<FatherActivity[]>(
        "fatherPlans.hydrate",
        await supabase
          .from("father_activities")
          .select(
            "id, category, month_postpartum, applies_to, title, description, duration_minutes, duration_label, time_of_day, with_baby, effort_level, next_step, source"
          )
          .in("id", ids)
      )
    : [];

  const byId = new Map(activities.map((a) => [a.id, a]));

  return {
    id: row.id,
    planDate: row.plan_date,
    activities: FATHER_ACTIVITY_CATEGORIES.map((c) =>
      byId.get(row[ACTIVITY_ID_COLUMN[c]] as string)
    ).filter((a): a is FatherActivity => Boolean(a)),
    swaps: row.swaps ?? {},
  };
}

/** The father's plan for today, generating it once if this is the first open. */
export async function getTodaysFatherPlan(profileId: string): Promise<FatherDailyPlan> {
  const row = unwrap<FatherDailyPlanRow>(
    "fatherPlans.getTodaysFatherPlan",
    await supabase.rpc("get_or_create_father_daily_plan", { p_profile_id: profileId })
  );
  return hydrate(row);
}

/** Rotates one category to its next activity, staying inside the current month. */
export async function swapFatherCategory(
  profileId: string,
  category: FatherActivityCategory
): Promise<FatherDailyPlan> {
  const row = unwrap<FatherDailyPlanRow>(
    "fatherPlans.swapFatherCategory",
    await supabase.rpc("swap_father_plan_category", {
      p_profile_id: profileId,
      p_category: category,
    })
  );
  return hydrate(row);
}
