import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  // Loud in dev, harmless in prod builds where env vars are always set.
  console.warn(
    "Supabase env vars are missing. Copy .env.example to .env and fill them in."
  );
}

/**
 * A failed OAuth/magic-link redirect return (Google/Apple sending back
 * `#error=...&error_description=...` instead of a session) needs to be
 * read out HERE, synchronously, at module load — not from anything
 * `supabase.auth.getSession()` later returns. supabase-js's own
 * `_initialize()` does detect this error internally (it's what
 * `detectSessionInUrl` below triggers), but `getSession()` awaits that
 * initialization and then unconditionally returns `{ error: null }` from
 * storage regardless of what `_initialize()` found — the error never
 * comes back out through the public API. Reading the raw URL ourselves,
 * before the SDK's own async cleanup gets a chance to strip it, is the
 * only way the app can know this happened at all. See lib/AuthProvider.tsx.
 */
export const initialAuthCallbackError: string | null = (() => {
  if (Platform.OS !== "web" || typeof window === "undefined") return null;
  const raw = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.search.startsWith("?")
      ? window.location.search.slice(1)
      : "";
  if (!raw) return null;
  const params = new URLSearchParams(raw);
  const description = params.get("error_description");
  const error = params.get("error");
  if (!description && !error) return null;
  return (description || error || "Sign-in didn't go through.").replace(/\+/g, " ");
})();

// Same project the website's waitlist already uses (kvayhcablmsorycpqmkg) —
// the app and the site share one backend, per the PRD's "one platform"
// architecture. AsyncStorage persists the session across app restarts;
// autoRefreshToken keeps it alive while the app is foregrounded.
export const supabase = createClient(supabaseUrl ?? "", supabaseAnonKey ?? "", {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // Web's Google sign-in is now a full-page redirect rather than a
    // popup (mobile browsers block window.open() outside a click's own
    // tick — see lib/db/session.ts signInWithGoogle), so Supabase attaches
    // the session to the URL this page reloads to and needs to read it
    // back out. Native hands the same round trip off to WebBrowser and a
    // custom URL scheme instead, so this must stay off there — parsing a
    // URL it was never given would be a bug, not a no-op.
    detectSessionInUrl: Platform.OS === "web",
  },
});

/**
 * Native JS timers are throttled/paused while the app is backgrounded, so
 * gotrue's own auto-refresh interval (see autoRefreshToken above) doesn't
 * tick while the user is away. Left alone, coming back after the access
 * token's ~1hr lifetime has passed leaves every request using an expired
 * JWT until the next tick fires minutes later — every family/profile fetch
 * 401s in that window, which lib/AuthProvider.tsx's fetchFamily can't tell
 * apart from a real network failure, so the parent gets stuck on
 * app/connection-error.tsx with no working "Try again" until they sign out
 * and back in. startAutoRefresh() checks-and-refreshes immediately (it's
 * not just resuming the timer), so calling it the moment the app returns to
 * the foreground closes that window instead of waiting on the next tick.
 * This is Supabase's own documented React Native integration point — see
 * https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native#session-management.
 */
if (Platform.OS !== "web") {
  AppState.addEventListener("change", (state) => {
    if (state === "active") {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
