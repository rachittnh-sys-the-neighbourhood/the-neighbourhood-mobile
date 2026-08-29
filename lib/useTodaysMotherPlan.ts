import { useCallback, useEffect, useRef, useState } from "react";
import * as motherPlans from "./db/motherPlans";
import type { MotherActivityCategory, MotherDailyPlan } from "./db/types";

/**
 * Owns the mother's own daily recovery plan: fetch and swap.
 *
 * Deliberately lighter than useTodaysPlan (the child's equivalent) — no
 * offline cache or completion tracking, since this is a suggestion list a
 * mother reads, not something she checks off. If that changes, this is
 * the place to add it.
 */
export type TodaysMotherPlanState = {
  plan: MotherDailyPlan | null;
  loading: boolean;
  error: string | null;
  swapping: MotherActivityCategory | null;
  swap: (category: MotherActivityCategory) => Promise<void>;
};

export function useTodaysMotherPlan(profileId: string | null): TodaysMotherPlanState {
  const [plan, setPlan] = useState<MotherDailyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [swapping, setSwapping] = useState<MotherActivityCategory | null>(null);

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
      const fresh = await motherPlans.getTodaysMotherPlan(profileId);
      if (alive.current) {
        setPlan(fresh);
        setError(null);
      }
    } catch (err) {
      if (alive.current) {
        setError(err instanceof Error ? err.message : "We couldn't load today's recovery activities.");
      }
    } finally {
      if (alive.current) setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    void load();
  }, [load]);

  const swap = useCallback(
    async (category: MotherActivityCategory) => {
      if (!profileId) return;
      setSwapping(category);
      try {
        const updated = await motherPlans.swapMotherCategory(profileId, category);
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
