import { isPreterm } from "./childAge";
import type { Child, Profile } from "./db/types";

/**
 * The preterm / NICU module: extra recovery and support activities for
 * parents of a baby born before 37 weeks, chosen by where the family is now
 * (baby in the NICU, baby home, later months). The selection itself happens
 * in Postgres (mother_activity_pool / father_activity_pool); this file only
 * decides when the app should ask about it and when to refetch.
 *
 * Inputs: children.gestational_weeks (asked at onboarding), children.in_nicu
 * (set by the parent, cleared at discharge) and profiles.had_hypertension.
 */

/** Long enough to cover the longest NICU stays and a home-coming after them. */
const MODULE_MONTHS = 12;

/** The child whose NICU status the parent is asked about, or null. */
export function nicuStatusChild<T extends Pick<Child, "gestational_weeks" | "date_of_birth">>(
  child: T | null | undefined,
  ageMonths: number
): T | null {
  if (!child || !isPreterm(child.gestational_weeks)) return null;
  return ageMonths <= MODULE_MONTHS ? child : null;
}

/**
 * Changes when anything that reshapes today's plan changes. The database
 * clears today's plan at the same moment, so the plan hooks refetch on it.
 */
export function planRefreshKey(
  child: Pick<Child, "in_nicu" | "gestational_weeks"> | null | undefined,
  profile: Pick<Profile, "had_hypertension"> | null | undefined
): string {
  return [child?.in_nicu ? "nicu" : "home", child?.gestational_weeks ?? "-", profile?.had_hypertension ?? "-"].join("|");
}
