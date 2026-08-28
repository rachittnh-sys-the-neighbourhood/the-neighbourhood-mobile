import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  // Loud in dev, harmless in prod builds where env vars are always set.
  console.warn(
    "Supabase env vars are missing. Copy .env.example to .env and fill them in."
  );
}

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
