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

const MOTHER_ACTIVITY_COLUMNS =
  "id, category, month_postpartum, applies_to, title, description, duration_minutes, time_of_day, with_baby, effort_level, progression_notes, short_description, steps, why_this, requires_doctor_clearance, clearance_copy, repeat_sets, repeat_reps, repeat_times_per_day, repeat_note, weekly_target_sessions, weekly_target_note";

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
          .select(MOTHER_ACTIVITY_COLUMNS)
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

/** A single activity by id — for the activity detail screen, reached by
 *  tapping a FOR TODAY card or the wellbeing hub's featured activity.
 *  Returns null if the id doesn't exist (e.g. a stale deep link after a
 *  content refresh removed it). */
export async function getMotherActivity(id: string): Promise<MotherActivity | null> {
  const rows = unwrap<MotherActivity[]>(
    "motherPlans.getMotherActivity",
    await supabase.from("mother_activities").select(MOTHER_ACTIVITY_COLUMNS).eq("id", id)
  );
  return rows[0] ?? null;
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

/**
 * The companion thread's own "Something else" -- unlike swapMotherCategory
 * above, this never crosses effort_level or dosing shape (a gentle rep set
 * never swaps into a moderate weekly walk), via
 * swap_mother_physical_recovery_activity rather than the generic RPC. See
 * 20261002130000_mother_physical_recovery_constrained_swap.sql.
 */
export async function swapPhysicalRecoveryActivity(profileId: string): Promise<MotherDailyPlan> {
  const row = unwrap<MotherDailyPlanRow>(
    "motherPlans.swapPhysicalRecoveryActivity",
    await supabase.rpc("swap_mother_physical_recovery_activity", { p_profile_id: profileId })
  );
  return hydrate(row);
}
