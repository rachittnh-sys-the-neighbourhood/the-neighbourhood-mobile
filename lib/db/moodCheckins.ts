import { supabase, unwrap } from "./client";
import type { MoodCheckin, MoodValue } from "./types";

/**
 * The daily mood check-in -- "How's today treating you?", one tap, five
 * options. Distinct from the weekly recovery check-in in checkins.ts
 * (energy/help-available, gated by a weekly cadence): this one has no
 * cadence at all, is meant to be answered every day, and doubles as the
 * signal that suggests which of today's three FOR TODAY roles opens
 * first (see lib/fatherRoles.ts FATHER_MOOD_ROLE).
 */

function toDateKey(date: Date): string {
  // Local calendar date, not UTC -- checkin_date is a plain date column,
  // and a UTC slice here would occasionally land on the wrong day for
  // whoever's west of Greenwich. Matches the existing app-wide pattern of
  // reasoning in local time for "which day is this" (see home.tsx).
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Monday through Sunday of the week containing `date` -- always the full
 *  calendar week, regardless of when the parent first started using the
 *  app. A day before their first check-in simply has no row, and the UI
 *  renders that as an empty slot rather than shifting the week to start
 *  on whatever day they joined. */
export function weekBounds(date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  // getDay(): 0 = Sunday .. 6 = Saturday. Distance back to Monday.
  const dayOfWeek = start.getDay();
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  start.setDate(start.getDate() - diffToMonday);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { start, end };
}

/** All of this week's check-ins (Monday–Sunday), for the "This week" strip. */
export async function getCheckinsForWeek(
  profileId: string,
  weekStart: Date,
  weekEnd: Date
): Promise<MoodCheckin[]> {
  return unwrap<MoodCheckin[]>(
    "moodCheckins.getCheckinsForWeek",
    await supabase
      .from("mood_checkins")
      .select("*")
      .eq("profile_id", profileId)
      .gte("checkin_date", toDateKey(weekStart))
      .lte("checkin_date", toDateKey(weekEnd))
      .order("checkin_date", { ascending: true })
  );
}

/** Submits (or updates) today's mood -- upsert on the (profile_id,
 *  checkin_date) unique constraint, so tapping a different face later the
 *  same day corrects today's answer rather than adding a second row. */
export async function submitMoodCheckin(
  profileId: string,
  mood: MoodValue
): Promise<MoodCheckin> {
  return unwrap<MoodCheckin>(
    "moodCheckins.submitMoodCheckin",
    await supabase
      .from("mood_checkins")
      .upsert(
        { profile_id: profileId, checkin_date: toDateKey(new Date()), mood },
        { onConflict: "profile_id,checkin_date" }
      )
      .select()
      .single()
  );
}
