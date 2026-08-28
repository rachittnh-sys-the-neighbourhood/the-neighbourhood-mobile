import type { useRouter } from "expo-router";
import { Platform } from "react-native";

/**
 * The universal fix for a wedged session (see useStuckWatchdog): a real
 * page reload on web re-creates the Supabase client's in-memory state
 * from scratch instead of whatever stale token it was holding. Native has
 * no equivalent hard reload without adding expo-updates, so it falls back
 * to re-entering the app at "/" — index.tsx re-derives the route from
 * scratch, which recovers most of the same class of stuck state.
 */
export function reloadApp(router: ReturnType<typeof useRouter>): void {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    window.location.reload();
    return;
  }
  router.replace("/");
}
