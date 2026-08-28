import { Redirect, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { LogoMark } from "../components/Logo";
import { PrimaryButton } from "../components/ui";
import { useAuth } from "../lib/AuthProvider";
import { hasCompletedFirstRun } from "../lib/firstRun";
import { reloadApp } from "../lib/reload";
import { colors, spacing, type } from "../lib/theme";
import { useStuckWatchdog } from "../lib/useStuckWatchdog";

/**
 * The entry route. Decides, once, where a visitor actually belongs:
 *   no child yet         -> /welcome, which opens onboarding (resuming
 *                            mid-way if they left a draft behind)
 *   child yet no role    -> /onboarding/role?complete=1 — an account from
 *                            before role/birth/feeding existed on the main
 *                            profile. Home needs a role to personalise
 *                            around, so this is asked once, briefly,
 *                            rather than forcing the whole flow again.
 *   child and role exist -> /home — today's plan, inside the tab shell
 *
 * Gating on the CHILD rather than a session is what lets the same code
 * serve both auth modes: with auth off the child comes from the device,
 * with auth on it comes from the server, and either way "do we know this
 * family?" is the only question that decides the route.
 *
 * A connection error is shown here rather than leaving the app spinning.
 */
export default function Index() {
  const router = useRouter();
  const { session, loading, familyLoading, child, profile, connectionError } = useAuth();
  const [firstRunChecked, setFirstRunChecked] = useState(false);
  const [firstRunComplete, setFirstRunComplete] = useState(false);
  const isLoadingGate = loading || (session && familyLoading) || (child && !firstRunChecked);
  // The very first thing this app does is `supabase.auth.getSession()` —
  // if a stored session's refresh token hangs the client instead of
  // resolving or rejecting (see lib/useStuckWatchdog.ts), `loading` never
  // flips false and every visitor lands on a spinner forever, before
  // they've even reached onboarding.
  const stuck = useStuckWatchdog(Boolean(isLoadingGate));

  useEffect(() => {
    let alive = true;
    if (!child) {
      setFirstRunChecked(true);
      setFirstRunComplete(false);
      return;
    }
    setFirstRunChecked(false);
    hasCompletedFirstRun()
      .then((complete) => {
        if (!alive) return;
        setFirstRunComplete(complete);
      })
      .catch(() => {
        if (!alive) return;
        setFirstRunComplete(false);
      })
      .finally(() => {
        if (alive) setFirstRunChecked(true);
      });
    return () => {
      alive = false;
    };
  }, [child]);

  if (isLoadingGate) {
    return (
      <View style={styles.gate}>
        {stuck ? (
          <>
            <LogoMark size={40} />
            <Text style={styles.stuckText}>
              This is taking longer than it should. Reloading should fix it.
            </Text>
            <View style={styles.stuckReload}>
              <PrimaryButton tone="taupe" title="Reload" onPress={() => reloadApp(router)} />
            </View>
          </>
        ) : (
          <ActivityIndicator color={colors.warmTaupe} />
        )}
      </View>
    );
  }

  // Only meaningful when a session exists — it's set by the server fetch.
  if (session && connectionError) return <Redirect href="/connection-error" />;

  if (!child) return <Redirect href="/welcome" />;

  if (!firstRunComplete) return <Redirect href="/onboarding/first-run" />;

  if (!profile?.relationship) return <Redirect href="/onboarding/role?complete=1" />;

  return <Redirect href="/home" />;
}

const styles = StyleSheet.create({
  gate: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.cream,
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  stuckText: {
    ...type.body,
    color: colors.textMuted,
    textAlign: "center",
  },
  stuckReload: {
    width: "100%",
    maxWidth: 280,
    marginTop: spacing.sm,
  },
});
