import AsyncStorage from "@react-native-async-storage/async-storage";

const FIRST_RUN_COMPLETE_KEY = "tn.firstRun.complete.v1";
const HOME_COACH_COMPLETE_KEY = "tn.homeCoach.complete.v1";

export async function hasCompletedFirstRun(): Promise<boolean> {
  return (await AsyncStorage.getItem(FIRST_RUN_COMPLETE_KEY)) === "true";
}

export async function markFirstRunComplete(): Promise<void> {
  await AsyncStorage.setItem(FIRST_RUN_COMPLETE_KEY, "true");
}

export async function hasCompletedHomeCoach(): Promise<boolean> {
  return (await AsyncStorage.getItem(HOME_COACH_COMPLETE_KEY)) === "true";
}

export async function markHomeCoachComplete(): Promise<void> {
  await AsyncStorage.setItem(HOME_COACH_COMPLETE_KEY, "true");
}

/**
 * The 5-screen guided tour (Home -> Community -> Ask -> Child -> You) is
 * driven by ?guidedTour=1&step=N in the URL. Tab navigators remember each
 * tab's last route, so tapping the Community tab bar icon after the tour
 * has already moved on restores its OLD url — including that stale
 * guidedTour param — and re-shows a card the parent already dismissed.
 * This tracks the highest step actually shown so a step never displays
 * twice, independent of whatever the URL happens to say.
 */
const GUIDED_TOUR_MAX_STEP_KEY = "tn.guidedTour.maxStepShown.v1";

export async function maxGuidedTourStepShown(): Promise<number> {
  const raw = await AsyncStorage.getItem(GUIDED_TOUR_MAX_STEP_KEY);
  const parsed = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) ? parsed : -1;
}

export async function markGuidedTourStepShown(step: number): Promise<void> {
  const current = await maxGuidedTourStepShown();
  if (step > current) await AsyncStorage.setItem(GUIDED_TOUR_MAX_STEP_KEY, String(step));
}

/** Used only by "Take the tour again" (see app/profile.tsx), so a
 *  deliberate replay isn't blocked by the same one-time gate. */
export async function resetGuidedTourProgress(): Promise<void> {
  await AsyncStorage.removeItem(GUIDED_TOUR_MAX_STEP_KEY);
}

/**
 * Stepping backward through the tour (GuidedTourDialog's onBack) calls
 * this before navigating, lowering the stored max just enough that
 * `toStep` itself is "unshown" again — the exact same one-time gate
 * above then naturally lets it redisplay, and naturally re-gates it once
 * the parent moves forward past it a second time. Only ever lowers the
 * max, never raises it, so this can't accidentally un-gate a step the
 * parent hasn't actually navigated back to.
 */
export async function rewindGuidedTourStep(toStep: number): Promise<void> {
  const current = await maxGuidedTourStepShown();
  const target = toStep - 1;
  if (target < current) await AsyncStorage.setItem(GUIDED_TOUR_MAX_STEP_KEY, String(target));
}

/**
 * Home's multi-child activity pager (see TodayActivitiesPager in
 * app/(tabs)/home.tsx) is swipeable but easy to miss with only a dot
 * indicator. A "Swipe for X's activities" hint shows until the parent has
 * actually swiped once — global rather than per-child, since the gesture
 * itself is what's being taught, not any one child's card.
 */
// v2: bumped to reset every device's dismissal, including parents who
// already swiped once before the pager-height and per-child-cache fixes
// landed — they'd earlier dismissed the hint while the feature was still
// broken underneath it.
const SWIPE_HINT_SEEN_KEY = "tn.homeActivityPager.swiped.v2";

export async function hasSwipedActivityPager(): Promise<boolean> {
  return (await AsyncStorage.getItem(SWIPE_HINT_SEEN_KEY)) === "true";
}

export async function markSwipedActivityPager(): Promise<void> {
  await AsyncStorage.setItem(SWIPE_HINT_SEEN_KEY, "true");
}

/**
 * The one-time Home prompt for a partner's name (see
 * components/PartnerNamePrompt.tsx) — covers accounts that onboarded
 * before that question existed, and anyone who skipped it. Shown at most
 * once per device regardless of whether a name was actually entered, so
 * declining it once doesn't mean seeing it forever.
 */
const PARTNER_NAME_PROMPT_SEEN_KEY = "tn.partnerNamePrompt.seen.v1";

export async function hasSeenPartnerNamePrompt(): Promise<boolean> {
  return (await AsyncStorage.getItem(PARTNER_NAME_PROMPT_SEEN_KEY)) === "true";
}

export async function markPartnerNamePromptSeen(): Promise<void> {
  await AsyncStorage.setItem(PARTNER_NAME_PROMPT_SEEN_KEY, "true");
}

/**
 * Home's "new stage, new milestones to check for" nudge (see
 * useMilestoneStageNudge in home.tsx) -- shown at most once per
 * developmental stage per child, not on every app open. Keyed by child id
 * since a family can have more than one child, each on their own
 * timeline. Stores the stage label itself (e.g. "10-12 months") rather
 * than a boolean, so "has this stage already been nudged" is a plain
 * equality check against the child's current stage.
 */
const MILESTONE_STAGE_NUDGE_KEY_PREFIX = "tn.milestoneStageNudge.lastShown.v1.";

export async function lastNudgedMilestoneStage(childId: string): Promise<string | null> {
  return await AsyncStorage.getItem(MILESTONE_STAGE_NUDGE_KEY_PREFIX + childId);
}

export async function markMilestoneStageNudged(childId: string, stage: string): Promise<void> {
  await AsyncStorage.setItem(MILESTONE_STAGE_NUDGE_KEY_PREFIX + childId, stage);
}
