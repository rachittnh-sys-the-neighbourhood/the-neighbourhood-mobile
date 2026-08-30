import { supabase, unwrap } from "./client";
import {
  DOMAINS,
  type Activity,
  type DailyPlan,
  type DailyPlanRow,
  type Domain,
} from "./types";

/**
 * Today's plan.
 *
 * Reads a persisted plan and only generates when none exists — that's what
 * makes the four activities stable across app opens. Generation, the
 * family-local date, and the swap rotation all live in Postgres
 * (get_or_create_daily_plan / swap_plan_domain), so two devices or a
 * cold start can't disagree about what today's plan is.
 */

const ACTIVITY_ID_COLUMN: Record<Domain, keyof DailyPlanRow> = {
  motor: "motor_activity_id",
  communication: "communication_activity_id",
  cognitive: "cognitive_activity_id",
  social_emotional: "social_emotional_activity_id",
};

/** Resolves a plan row's four activity ids into full activity records. */
async function hydrate(row: DailyPlanRow): Promise<DailyPlan> {
  const ids = DOMAINS.map((d) => row[ACTIVITY_ID_COLUMN[d]] as string | null).filter(
    (id): id is string => Boolean(id)
  );

  const activities = ids.length
    ? unwrap<Activity[]>(
        "plans.hydrate",
        await supabase
          .from("activities")
          .select(
            "id, domain, age_band, title, why, duration_minutes, duration_label, materials, instructions, benefit, source"
          )
          .in("id", ids)
      )
    : [];

  const byId = new Map(activities.map((a) => [a.id, a]));

  return {
    id: row.id,
    planDate: row.plan_date,
    // Rebuilt in DOMAIN order rather than the order Postgres returned, so
    // the plan always presents motor → communication → cognitive → social.
    activities: DOMAINS.map((d) => byId.get(row[ACTIVITY_ID_COLUMN[d]] as string)).filter(
      (a): a is Activity => Boolean(a)
    ),
    swaps: row.swaps ?? {},
  };
}

/** The plan for today, generating it once if this is the first open. */
export async function getTodaysPlan(childId: string): Promise<DailyPlan> {
  const row = unwrap<DailyPlanRow>(
    "plans.getTodaysPlan",
    await supabase.rpc("get_or_create_daily_plan", { p_child_id: childId })
  );
  return hydrate(row);
}

/**
 * Remove the current plan after a child birthday change so the next read is
 * generated from the child's new age band rather than yesterday's profile.
 */
export async function invalidateTodaysPlan(childId: string): Promise<void> {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const today = `${parts.find((part) => part.type === "year")?.value}-${parts.find((part) => part.type === "month")?.value}-${parts.find((part) => part.type === "day")?.value}`;
  const { error } = await supabase
    .from("daily_plans")
    .delete()
    .eq("child_id", childId)
    .eq("plan_date", today);
  if (error) throw error;
}

/** Rotates one domain to its next activity, staying inside the age band. */
export async function swapDomain(childId: string, domain: Domain): Promise<DailyPlan> {
  const row = unwrap<DailyPlanRow>(
    "plans.swapDomain",
    await supabase.rpc("swap_plan_domain", { p_child_id: childId, p_domain: domain })
  );
  return hydrate(row);
}

/**
 * Domains ordered by how long they've gone without a completed activity,
 * never-completed first.
 *
 * This is the signal `orderDomains()` in lib/todaysPlan.ts was left a hook
 * for. Not yet wired into plan generation — doing so changes which domain
 * leads the plan, which is a product decision, not a data one.
 */
export async function getDomainRecency(
  childId: string
): Promise<{ domain: Domain; lastCompletedAt: string | null }[]> {
  const rows = unwrap<{ domain: Domain; last_completed_at: string | null }[]>(
    "plans.getDomainRecency",
    await supabase.rpc("domain_recency", { p_child_id: childId })
  );
  return rows.map((r) => ({ domain: r.domain, lastCompletedAt: r.last_completed_at }));
}
