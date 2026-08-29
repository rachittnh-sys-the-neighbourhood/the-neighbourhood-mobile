/**
 * The data access layer.
 *
 * Screens import from here and nowhere else — no raw `supabase` calls
 * scattered through components. If a screen needs data this doesn't
 * expose, add a function to the relevant module rather than reaching past
 * it.
 *
 *   lib/db/family.ts       profile + children
 *   lib/db/plans.ts        today's persisted plan, swaps, domain recency
 *   lib/db/motherPlans.ts  the mother's own postpartum recovery plan
 *   lib/db/activityLog.ts  completions (content-snapshotted)
 *   lib/db/growth.ts       milestones + vaccinations
 *   lib/db/copilot.ts      conversations + messages
 */
export * from "./types";
export { DbError } from "./client";

export * as family from "./family";
export * as plans from "./plans";
export * as motherPlans from "./motherPlans";
export * as activityLog from "./activityLog";
export * as growth from "./growth";
export * as copilot from "./copilot";
