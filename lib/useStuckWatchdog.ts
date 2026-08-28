import { useEffect, useState } from "react";

/**
 * Flips to true if `active` stays true for longer than `ms`.
 *
 * Some session/network calls in this app can hang instead of resolving or
 * rejecting — e.g. a Supabase client left holding a stale in-memory access
 * token after a desynced tab/session (see making.tsx and home.tsx). When
 * that happens the screen that awaited them just sits on a spinner
 * forever: no error to show, nothing to retry. This is the fallback —
 * not a fix for why the promise never settles, just a guarantee the
 * parent is never left staring at a loading screen with no way out.
 */
export function useStuckWatchdog(active: boolean, ms: number = 10000): boolean {
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    if (!active) {
      setStuck(false);
      return;
    }
    const timer = setTimeout(() => setStuck(true), ms);
    return () => clearTimeout(timer);
  }, [active, ms]);

  return stuck;
}
