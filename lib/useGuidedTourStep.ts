import { useEffect, useState } from "react";
import {
  markGuidedTourStepShown,
  maxGuidedTourStepShown,
  resetGuidedTourProgress,
} from "./firstRun";

/**
 * Shows a guided-tour step at most once ever, even if the tab navigator
 * later restores this screen's URL (still carrying the old ?guidedTour=1
 * params) when the parent taps the tab bar directly instead of the tour's
 * own "Continue" button — see lib/firstRun.ts.
 *
 * `wantsStep` is the screen's existing params/focus check for "this URL
 * says show step N right now"; this adds the "have we already shown step
 * N" veto on top of it.
 *
 * `resetFirst` is only ever true for Home's step 0 when reached via
 * "Take the tour again" (?replay=1, see app/profile.tsx) — it clears the
 * one-time gate before checking it, so a deliberate replay isn't blocked
 * by having already completed the tour once. Awaited in-line rather than
 * as a separate effect so it can never race the read it's meant to
 * precede.
 *
 * Stepping backward through the tour (see GuidedTourDialog's onBack)
 * calls rewindGuidedTourStep before navigating rather than passing any
 * flag here — that actually lowers the stored max back below the target
 * step, so this same one-time gate naturally lets it show again, and
 * naturally re-gates it once the parent moves forward past it a second
 * time. No separate bypass path to keep in sync with the tab-restoration
 * case this gate exists for in the first place.
 */
export function useGuidedTourStep(step: number, wantsStep: boolean, resetFirst = false): boolean {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!wantsStep) {
      setShow(false);
      return;
    }
    let alive = true;
    (async () => {
      if (resetFirst) await resetGuidedTourProgress();
      const max = await maxGuidedTourStepShown();
      if (!alive) return;
      if (max >= step) {
        setShow(false);
        return;
      }
      setShow(true);
      void markGuidedTourStepShown(step);
    })();
    return () => {
      alive = false;
    };
  }, [wantsStep, step, resetFirst]);

  return show;
}
