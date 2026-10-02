import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * How many times today's physical-recovery activity has been marked done
 * via the You hub's companion thread -- local-only, device-local date (same
 * dateKey shape as components/MoodCheckInCard.tsx), never synced. This
 * exists purely to decide whether to keep offering the activity again
 * today; the count itself is never shown to the mother (see the You hub's
 * design notes on why no "X of Y" copy appears anywhere in this feature).
 *
 * Deliberately not server-side: unlike a real completion log, nothing here
 * needs to survive a device change or feed a report, and AsyncStorage is
 * the same lightweight mechanism lib/firstRun.ts already uses for this
 * class of "just decide what to show next" local state.
 */

function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function storageKey(activityId: string): string {
  return `tn.companionThread.count.${activityId}.${dateKey(new Date())}`;
}

export async function getTodaysCompletionCount(activityId: string): Promise<number> {
  const raw = await AsyncStorage.getItem(storageKey(activityId));
  const parsed = raw ? parseInt(raw, 10) : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Records one completion and returns the new count. */
export async function recordCompanionThreadCompletion(activityId: string): Promise<number> {
  const next = (await getTodaysCompletionCount(activityId)) + 1;
  await AsyncStorage.setItem(storageKey(activityId), String(next));
  return next;
}
