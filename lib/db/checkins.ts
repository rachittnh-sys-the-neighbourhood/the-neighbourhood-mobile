import { supabase, unwrap, unwrapMaybe } from "./client";
import type { ParentCheckin, ParentCheckinEnergy, ParentCheckinHelp } from "./types";

/**
 * The weekly recovery check-in -- replaces the old, unpersisted mood
 * picker on You's hub (bright/steady/flat/tired/low, plain useState) with
 * the two questions from the meal planner workbook's "Recovery Check-in
 * (spec)" sheet: energy, and whether help is available today. Used for
 * both roles -- a mother's check-in is about her own recovery, a
 * father's is about how HE'S doing supporting her -- same two questions,
 * role-appropriate copy in the UI layer (see components/CheckInCard.tsx).
 *
 * Cadence: weekly by default, twice-weekly during the 0-6 week window --
 * see isCheckinDue. Never scored, never shown to anyone but the parent
 * who answered it.
 */

export async function getLatestCheckin(profileId: string): Promise<ParentCheckin | null> {
  return unwrapMaybe<ParentCheckin>(
    "checkins.getLatestCheckin",
    await supabase
      .from("parent_checkins")
      .select("*")
      .eq("profile_id", profileId)
      .order("checkin_date", { ascending: false })
      .limit(1)
      .maybeSingle()
  );
}

export async function submitCheckin(
  profileId: string,
  energy: ParentCheckinEnergy,
  helpAvailable: ParentCheckinHelp
): Promise<ParentCheckin> {
  return unwrap<ParentCheckin>(
    "checkins.submitCheckin",
    await supabase
      .from("parent_checkins")
      .insert({ profile_id: profileId, energy, help_available: helpAvailable })
      .select()
      .single()
  );
}

/** Twice-weekly (every ~3.5 days) in the highest-risk 0-6 week window,
 *  weekly otherwise -- per the workbook's Postpartum Stages sheet. */
export function isCheckinDue(latest: ParentCheckin | null, weeksPostpartum: number): boolean {
  if (!latest) return true;
  const daysSince = Math.floor(
    (Date.now() - new Date(`${latest.checkin_date}T00:00:00`).getTime()) / 86_400_000
  );
  const cadenceDays = weeksPostpartum <= 6 ? 3 : 7;
  return daysSince >= cadenceDays;
}

/**
 * True the moment a check-in has been answered today specifically — a
 * tighter condition than `!isCheckinDue`, which stays true for the whole
 * cadence window (up to a week) after any answer. Used to collapse the
 * card to a small "✓ Checked in today" state right after answering,
 * distinct from the fuller "Checked in for now" card shown on a later
 * day that still isn't due yet.
 */
export function isCheckedInToday(latest: ParentCheckin | null): boolean {
  if (!latest) return false;
  const daysSince = Math.floor(
    (Date.now() - new Date(`${latest.checkin_date}T00:00:00`).getTime()) / 86_400_000
  );
  return daysSince === 0;
}
