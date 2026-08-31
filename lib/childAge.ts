/** Age math shared across onboarding and the Home tab. */

export const MILESTONES_START_MONTHS = 3;
/** The library's oldest tracked stage is 6y9m–7y — see
 *  supabase/migrations/20260830080500_milestones_batch_00.sql onward. Past
 *  this, there's genuinely nothing more to check, not a data gap to paper
 *  over. */
export const MILESTONES_END_MONTHS = 84;

export function canShowMilestones(totalMonths: number): boolean {
  return totalMonths >= MILESTONES_START_MONTHS;
}

export function isBeyondMilestoneRange(totalMonths: number): boolean {
  return totalMonths > MILESTONES_END_MONTHS;
}

export type ChildAge = {
  totalMonths: number;
  years: number;
  months: number;
  /** "2 years, 3 months" / "7 months" / "3 weeks" — human, never a date. */
  label: string;
};

export function computeAge(dateOfBirth: string, now: Date = new Date()): ChildAge | null {
  const dob = new Date(dateOfBirth + "T00:00:00");
  if (isNaN(dob.getTime())) return null;

  let months = (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth());
  if (now.getDate() < dob.getDate()) months -= 1;
  if (months < 0) months = 0;

  const years = Math.floor(months / 12);
  const rem = months % 12;

  let label: string;
  if (months === 0) {
    const days = Math.max(0, Math.round((now.getTime() - dob.getTime()) / 86400000));
    const weeks = Math.floor(days / 7);
    label = weeks >= 1 ? plural(weeks, "week") : plural(days, "day");
  } else if (years === 0) {
    label = plural(months, "month");
  } else if (rem === 0) {
    label = plural(years, "year");
  } else {
    label = `${plural(years, "year")}, ${plural(rem, "month")}`;
  }

  return { totalMonths: months, years, months: rem, label };
}

function plural(n: number, unit: string): string {
  return `${n} ${unit}${n === 1 ? "" : "s"}`;
}

/* ------------------------------------------------------------------ */
/* Corrected age (prematurity)                                         */
/* ------------------------------------------------------------------ */

/** Below this many weeks of gestation, a birth is considered preterm. */
export const FULL_TERM_WEEKS = 37;
/** The reference correction is measured from. */
const TERM_REFERENCE_WEEKS = 40;
/**
 * Correction is conventionally applied until the second birthday, after
 * which the gap has closed enough that it stops being meaningful. Past
 * this point a preterm child is assessed on chronological age like anyone
 * else — so this is a real cutoff, not an arbitrary one.
 */
export const CORRECTION_UNTIL_MONTHS = 24;

/** Structural, so this module stays free of a db/types import. */
type ChildLike = { date_of_birth: string; gestational_weeks?: number | null };

/**
 * The most recently born child — not whichever is active in the Kids tab
 * switcher (see lib/AuthProvider.tsx `child` vs `children`). A parent's own
 * postpartum recovery content (Mother's/Father's daily plan, the "week N"
 * framing) should always follow the youngest child, since that's whose
 * birth the recovery is from, regardless of which child's screen the
 * parent happens to be looking at.
 */
export function youngestChild<T extends { date_of_birth: string }>(
  children: T[],
): T | null {
  if (children.length === 0) return null;
  return children.reduce((youngest, c) =>
    c.date_of_birth > youngest.date_of_birth ? c : youngest,
  );
}

export function isPreterm(gestationalWeeks: number | null | undefined): boolean {
  return typeof gestationalWeeks === "number" && gestationalWeeks < FULL_TERM_WEEKS;
}

/** How many weeks of correction this gestation earns. 0 for full term. */
export function correctionWeeks(gestationalWeeks: number | null | undefined): number {
  if (!isPreterm(gestationalWeeks)) return 0;
  return Math.max(0, TERM_REFERENCE_WEEKS - (gestationalWeeks as number));
}

function toLocalISO(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

export type DevelopmentalAge = ChildAge & {
  /** True when a correction was actually applied to reach this age. */
  corrected: boolean;
  /** Weeks subtracted. 0 whenever `corrected` is false. */
  correctionWeeks: number;
};

/**
 * The age a child should be assessed against DEVELOPMENTALLY — chronological
 * age for most children, corrected age for a child born preterm.
 *
 * Why this exists: a baby born at 30 weeks is ten weeks younger than the
 * calendar says in every way that milestones measure. Checking them against
 * their chronological age marks them "not yet" on essentially everything,
 * which is exactly the "audited, not accompanied" failure lib/parentCare.ts
 * warns against — and it lands on the very first screen after onboarding
 * (app/onboarding/first-run.tsx).
 *
 * Use this ONLY for developmental content — milestones/discoveries and the
 * activity plan. Vaccination schedules, birthdays, the Home greeting and
 * community age bands all stay on computeAge: vaccine timing is written
 * against chronological age, and a parent whose child turns one does not
 * want to be told they're ten months old.
 */
export function developmentalAge(
  child: ChildLike | null | undefined,
  now: Date = new Date()
): DevelopmentalAge | null {
  if (!child) return null;
  const chronological = computeAge(child.date_of_birth, now);
  if (!chronological) return null;

  const weeks = correctionWeeks(child.gestational_weeks);
  // Past the cutoff, or full term, the two ages are the same thing.
  if (weeks === 0 || chronological.totalMonths >= CORRECTION_UNTIL_MONTHS) {
    return { ...chronological, corrected: false, correctionWeeks: 0 };
  }

  // Correcting = pretending they were born on their due date, which is
  // exactly a date shift. Reusing computeAge keeps one implementation of
  // the month/label arithmetic rather than a parallel one that can drift.
  const dob = new Date(child.date_of_birth + "T00:00:00");
  const dueDate = new Date(dob.getTime() + weeks * 7 * 86400000);
  const corrected = computeAge(toLocalISO(dueDate), now);
  if (!corrected) return { ...chronological, corrected: false, correctionWeeks: 0 };

  return { ...corrected, corrected: true, correctionWeeks: weeks };
}

/** Convenience for the many call sites that only want the month count. */
export function developmentalAgeMonths(child: ChildLike | null | undefined): number {
  return developmentalAge(child)?.totalMonths ?? 0;
}

/** A warm, non-clinical stage name for the Home greeting — never a percentile, just a word. */
export function stageLabel(totalMonths: number): string {
  if (totalMonths <= 3) return "the newborn days";
  if (totalMonths <= 11) return "the infant stage";
  if (totalMonths <= 23) return "the toddler stage";
  if (totalMonths <= 35) return "early exploring";
  if (totalMonths <= 59) return "the preschool years";
  return "the school-age years";
}
