import { useCallback, useEffect, useRef, useState } from "react";
import * as fatherPlans from "./db/fatherPlans";
import type { FatherActivityCategory, FatherDailyPlan } from "./db/types";

/**
 * Owns the father's own daily support plan: fetch and swap.
 *
 * Deliberately lighter than useTodaysPlan (the child's equivalent) — no
 * offline cache or completion tracking, mirroring useTodaysMotherPlan. This
 * is a suggestion list a father reads, not something he checks off.
 */
export type TodaysFatherPlanState = {
  plan: FatherDailyPlan | null;
  loading: boolean;
  error: string | null;
  swapping: FatherActivityCategory | null;
  swap: (category: FatherActivityCategory) => Promise<void>;
};

export function useTodaysFatherPlan(profileId: string | null): TodaysFatherPlanState {
  const [plan, setPlan] = useState<FatherDailyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [swapping, setSwapping] = useState<FatherActivityCategory | null>(null);

  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    if (!profileId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const fresh = await fatherPlans.getTodaysFatherPlan(profileId);
      if (alive.current) {
        setPlan(fresh);
        setError(null);
      }
    } catch (err) {
      if (alive.current) {
        setError(err instanceof Error ? err.message : "We couldn't load today's activities.");
      }
    } finally {
      if (alive.current) setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    void load();
  }, [load]);

  const swap = useCallback(
    async (category: FatherActivityCategory) => {
      if (!profileId) return;
      setSwapping(category);
      try {
        const updated = await fatherPlans.swapFatherCategory(profileId, category);
        if (alive.current) setPlan(updated);
      } catch {
        // Keep the current activity on screen rather than showing an error.
      } finally {
        if (alive.current) setSwapping(null);
      }
    },
    [profileId]
  );

  return { plan, loading, error, swapping, swap };
}
