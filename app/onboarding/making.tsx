import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { OnboardingScreen } from "../../components/onboarding";
import { LogoMark } from "../../components/Logo";
import { PrimaryButton } from "../../components/ui";
import { useAuth } from "../../lib/AuthProvider";
import * as family from "../../lib/db/family";
import * as plans from "../../lib/db/plans";
import { ensureSession } from "../../lib/db/session";
import { useOnboarding } from "../../lib/OnboardingProvider";
import { reloadApp } from "../../lib/reload";
import { colors, fonts, radius, spacing, typeScale } from "../../lib/theme";
import { useStuckWatchdog } from "../../lib/useStuckWatchdog";

// How long the save is allowed to run silently before this screen assumes
// it's wedged (see useStuckWatchdog) rather than just slow. Comfortably
// above NAVIGATE_AT so a normal save never trips it.
const STUCK_AFTER = 10000;

// Calm, human facts — never fake-technical. Rotate underneath a real
// progress fill so the wait reads as "getting ready", not "processing".
const FACTS = [
  "The first five years are the fastest period of brain development.",
  "Play builds cognitive, language, and social skills.",
  "Small daily activities create long-term developmental gains.",
];

/** Warm and specific rather than technical — uses whatever names are
 *  actually on hand, never "Setting up your experience". */
function personalHeadline(parentName: string, childName: string): string {
  const parent = parentName.trim().split(" ")[0];
  const child = childName.trim().split(" ")[0];
  if (parent && child) return `Getting things ready for you and ${child}.`;
  if (child) return `A little space for you and ${child}.`;
  if (parent) return `Getting things ready for you, ${parent}.`;
  return "Getting things ready for your family.";
}

const FACT_INTERVAL = 1250; // ms per fact
const BAR_DURATION = FACT_INTERVAL * FACTS.length; // 3750ms
const READY_HOLD = 750; // ms spent on the "Ready." moment
const NAVIGATE_AT = BAR_DURATION + READY_HOLD; // 4500ms, comfortably under 5s

export default function Making() {
  const router = useRouter();
  const { hydrateFamily, refreshFamily } = useAuth();
  const { draft, hydrated, clear, resumeHref } = useOnboarding();
  const [factIndex, setFactIndex] = useState(0);
  const [ready, setReady] = useState(false);
  /**
   * A failed save is NOT survivable: a parent who finishes onboarding with
   * no child row has a broken account and an app that can't plan anything.
   * So this screen holds rather than navigating on, and offers a retry.
   */
  const [saveError, setSaveError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [navigated, setNavigated] = useState(false);
  const navTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedAtRef = useRef(Date.now());
  // True for as long as we're waiting on a save with nothing to show for
  // it yet — flips `stuck` on if that goes on too long. A session left
  // wedged from a desynced tab (see lib/useStuckWatchdog.ts) hangs here
  // silently: no error, no navigation, just this screen forever.
  const stuck = useStuckWatchdog(!saveError && !navigated, STUCK_AFTER);

  const barProgress = useRef(new Animated.Value(0)).current;
  const entrance = useRef(new Animated.Value(0)).current;
  const factOpacity = useRef(new Animated.Value(1)).current;
  const factRise = useRef(new Animated.Value(0)).current;
  const readyOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Premium micro-interaction: the whole block settles in on mount
    // rather than appearing abruptly.
    Animated.timing(entrance, {
      toValue: 1,
      duration: 380,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    // A real, smooth progress fill — not a spinner standing in for one.
    Animated.timing(barProgress, {
      toValue: 1,
      duration: BAR_DURATION,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    const fadeToNextFact = (nextIndex: number) => {
      Animated.parallel([
        Animated.timing(factOpacity, { toValue: 0, duration: 160, useNativeDriver: true }),
        Animated.timing(factRise, { toValue: -6, duration: 160, useNativeDriver: true }),
      ]).start(() => {
        setFactIndex(nextIndex);
        factRise.setValue(6);
        Animated.parallel([
          Animated.timing(factOpacity, {
            toValue: 1,
            duration: 260,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(factRise, {
            toValue: 0,
            duration: 260,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start();
      });
    };

    const factTimers = FACTS.slice(1).map((_, i) =>
      setTimeout(() => fadeToNextFact(i + 1), FACT_INTERVAL * (i + 1))
    );

    const readyTimer = setTimeout(() => {
      setReady(true);
      Animated.timing(readyOpacity, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }, BAR_DURATION);

    return () => {
      factTimers.forEach(clearTimeout);
      clearTimeout(readyTimer);
      if (navTimerRef.current) clearTimeout(navTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Separate from the animation effect above: this screen can be reached
  // by a fresh page load (not just a client-side push from gender.tsx) —
  // a browser refresh, or the app being backgrounded and reopened right
  // here. On a fresh load, `draft` starts EMPTY for one tick while
  // OnboardingProvider reads it back from storage; saving against that
  // empty snapshot looks exactly like an incomplete draft and bounces the
  // parent back to the start. Waiting for `hydrated` avoids that false
  // negative without changing the "ready in under 5 seconds" promise for
  // the normal case, where hydration has long since finished.
  useEffect(() => {
    if (hydrated) void save();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  /**
   * The real commit: a profiles row and a children row.
   *
   * Runs alongside the animation rather than after it — the promise to the
   * parent is "ready in under 5 seconds", not "as slow as the network" —
   * but navigation waits for it to succeed. Failures are surfaced, never
   * swallowed, because landing on Home with no child is a broken account
   * that looks like a working one.
   */
  const save = async () => {
    setSaveError(null);
    try {
      // This screen can be reached with an incomplete draft — a restored
      // dev route, a deep link, or a resumed session whose storage was
      // cleared. Writing anyway produced a raw Postgres error ("invalid
      // input syntax for type date"), which is both meaningless to a
      // parent and impossible to act on. Send them back to the step
      // that's actually missing instead.
      if (!draft.parentName || !draft.childName || !draft.dateOfBirth) {
        router.replace(resumeHref);
        return;
      }

      const userId = await ensureSession();

      const profile = await family.updateProfile(userId, {
        parent_name: draft.parentName,
        // The parent's own facts — role, birth type, feeding method — are
        // asked as part of this same onboarding now, not a separate
        // Parent Care questionnaire later. Empty string (skipped/not
        // reached, e.g. birth type for a father) is stored as null rather
        // than "", so it reads the same as "never asked" everywhere else.
        relationship: draft.role || null,
        birth_method: draft.birthMethod || null,
        feeding_method: draft.feedingMethod || null,
        // Captured once, here. Every "today" in the product — which plan
        // is current, when it rolls over — is derived from this.
        timezone: family.deviceTimezone(),
        ...(draft.mobile ? { phone: draft.mobile } : {}),
      });

      // Reuse the MVP child when onboarding is completed again. Keeping the
      // old row here meant a new name or birthday silently disappeared from
      // Home and the age-aware milestone experience.
      const existing = await family.getPrimaryChild(userId);
      const savedChild =
        existing
          ? await family.updateChild(existing.id, {
              name: draft.childName,
              date_of_birth: draft.dateOfBirth,
              gender: draft.gender || null,
              gestational_weeks: draft.gestationalWeeks,
            })
          : await family.createChild({
              parentId: userId,
              name: draft.childName,
              dateOfBirth: draft.dateOfBirth,
              gender: draft.gender || null,
              gestationalWeeks: draft.gestationalWeeks,
            });

      // A plan is persisted for the day. Clear today's copy when the child
      // profile changes so recommendations are regenerated for the new age.
      if (existing) await plans.invalidateTodaysPlan(savedChild.id).catch(() => {});

      hydrateFamily({ profile, child: savedChild });
      await refreshFamily();
      await clear();

      // Hold the "Ready." beat if the save finished early.
      const elapsed = Date.now() - startedAtRef.current;
      navTimerRef.current = setTimeout(() => {
        setNavigated(true);
        router.replace("/home?guidedTour=1&step=0&next=milestones");
      }, Math.max(0, NAVIGATE_AT - elapsed));
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  const retry = async () => {
    setRetrying(true);
    await save();
    setRetrying(false);
  };

  const barWidth = barProgress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });

  return (
    <OnboardingScreen>
      <Animated.View
        style={[
          styles.wrap,
          {
            opacity: entrance,
            transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
          },
        ]}
      >
        <LogoMark size={44} />

        <Text style={styles.headline}>{personalHeadline(draft.parentName, draft.childName)}</Text>

        <View style={styles.track}>
          <Animated.View style={[styles.fill, { width: barWidth }]} />
        </View>

        <View style={styles.factSlot}>
          {saveError ? (
            <Text style={styles.errorText}>
              We couldn&rsquo;t finish setting up your family. Nothing is lost, your
              answers are still here.
            </Text>
          ) : stuck ? (
            <Text style={styles.errorText}>
              This is taking longer than it should. Your answers are saved,
              reloading should get you straight in.
            </Text>
          ) : !ready ? (
            <Animated.Text
              style={[
                styles.fact,
                { opacity: factOpacity, transform: [{ translateY: factRise }] },
              ]}
            >
              {FACTS[factIndex]}
            </Animated.Text>
          ) : (
            <Animated.Text style={[styles.ready, { opacity: readyOpacity }]}>Ready.</Animated.Text>
          )}
        </View>

        {saveError && (
          <View style={styles.retryWrap}>
            <PrimaryButton
              tone="accent"
              title="Try again"
              onPress={retry}
              loading={retrying}
            />
            {/* The underlying cause, kept small. Useful while this is in
                testing; the sentence above is what actually matters. */}
            <Text style={styles.errorDetail}>{saveError}</Text>
          </View>
        )}

        {stuck && !saveError && (
          <View style={styles.retryWrap}>
            {/* Not "Try again": a wedged session (the usual cause here)
                hangs the same way on a retry. A reload is what actually
                clears it — see lib/reload.ts. */}
            <PrimaryButton tone="accent" title="Reload" onPress={() => reloadApp(router)} />
          </View>
        )}
      </Animated.View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
  },
  headline: {
    marginTop: spacing.lg,
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.h3,
    lineHeight: typeScale.h3 * 1.4,
    color: colors.charcoal,
    textAlign: "center",
  },
  track: {
    width: "100%",
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    overflow: "hidden",
    marginTop: spacing.xl,
  },
  fill: {
    height: "100%",
    borderRadius: radius.pill,
    backgroundColor: colors.warmTaupe,
  },
  factSlot: {
    marginTop: spacing.lg,
    minHeight: typeScale.body * 1.5 * 2, // reserves space so layout doesn't jump between facts
    justifyContent: "center",
  },
  fact: {
    fontFamily: fonts.body,
    fontSize: typeScale.body,
    lineHeight: typeScale.body * 1.5,
    color: colors.textMuted,
    textAlign: "center",
  },
  ready: {
    fontFamily: fonts.serifItalic,
    fontSize: typeScale.h1,
    color: colors.warmTaupe,
    textAlign: "center",
  },
  errorText: {
    fontFamily: fonts.body,
    fontSize: typeScale.body,
    lineHeight: typeScale.body * 1.5,
    color: colors.charcoal,
    textAlign: "center",
  },
  retryWrap: {
    width: "100%",
    marginTop: spacing.lg,
  },
  errorDetail: {
    fontFamily: fonts.body,
    fontSize: typeScale.caption,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.sm,
  },
});
