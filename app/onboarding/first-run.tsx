import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { LogoMark } from "../../components/Logo";
import { FadeIn, OnboardingScreen } from "../../components/onboarding";
import { GhostButton, PrimaryButton } from "../../components/ui";
import { useAuth } from "../../lib/AuthProvider";
import { canShowMilestones, developmentalAge } from "../../lib/childAge";
import * as growth from "../../lib/db/growth";
import { DOMAIN_LABEL, DOMAINS, type Domain, type Milestone } from "../../lib/db/types";
import { colors, fonts, radius, spacing, typeScale } from "../../lib/theme";

type Phase = "welcome" | "milestones" | "plan";

const WELCOME_LINES = [
  "Creating a personalized experience",
  "Curating activities by age",
  "Preparing developmental discoveries",
  "Personalizing recommendations",
];

const REASSURANCE = [
  "Every child develops at their own pace.",
  "Discoveries are guides, not deadlines.",
  "Small moments lead to big discoveries.",
  "You're doing a great job by simply paying attention.",
];

const PLAN_LINES = [
  "Choosing age-appropriate activities",
  "Highlighting helpful discoveries",
  "Preparing development recommendations",
  "Gathering resources for the days ahead",
];

function firstName(name: string | null | undefined) {
  return name?.trim().split(" ")[0] || "your child";
}

export default function FirstRun() {
  const router = useRouter();
  const params = useLocalSearchParams<{ phase?: string }>();
  const { child } = useAuth();
  const [phase, setPhase] = useState<Phase>(params.phase === "milestones" ? "milestones" : "welcome");
  const [lineIndex, setLineIndex] = useState(0);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loadingMilestones, setLoadingMilestones] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [planLineIndex, setPlanLineIndex] = useState(0);

  const childName = firstName(child?.name);
  // The whole reason gestational age is collected: this screen is the
  // first thing a parent sees after setup, and checking a preterm baby
  // against chronological age marks them "not yet" on nearly everything.
  const devAge = developmentalAge(child);
  const ageMonths = devAge?.totalMonths ?? 0;
  const usingCorrectedAge = devAge?.corrected ?? false;
  const pulse = useRef(new Animated.Value(0)).current;
  const lineOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulse]);

  useEffect(() => {
    if (phase !== "welcome") return;
    const lineTimers = WELCOME_LINES.slice(1).map((_, index) =>
      setTimeout(() => fadeLine(index + 1), 720 * (index + 1))
    );
    const timer = setTimeout(
      () =>
        router.replace("/home?guidedTour=1&step=0&next=milestones"),
      3600
    );
    return () => {
      lineTimers.forEach(clearTimeout);
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ageMonths, phase, router]);

  useEffect(() => {
    if (phase !== "plan") return;
    const timers = PLAN_LINES.slice(1).map((_, index) =>
      setTimeout(() => setPlanLineIndex(index + 1), 520 * (index + 1))
    );
    const doneTimer = setTimeout(() => {
      router.replace("/home?guidedTour=1&step=0");
    }, 2600);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(doneTimer);
    };
  }, [phase, router]);

  const fadeLine = (nextIndex: number) => {
    Animated.timing(lineOpacity, {
      toValue: 0,
      duration: 140,
      useNativeDriver: true,
    }).start(() => {
      setLineIndex(nextIndex);
      Animated.timing(lineOpacity, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });
  };

  const loadMilestones = useCallback(async () => {
    if (!child) return;
    if (!canShowMilestones(ageMonths)) {
      setMilestones([]);
      setSelected(new Set());
      return;
    }
    setLoadingMilestones(true);
    try {
      const [library, marked] = await Promise.all([
        growth.getMilestonesForCurrentAge(ageMonths),
        growth.getAchievedMilestones(child.id),
      ]);
      setMilestones(library);
      setSelected(new Set(marked.map((m) => m.milestone_id)));
    } finally {
      setLoadingMilestones(false);
    }
  }, [ageMonths, child]);

  useEffect(() => {
    if (phase === "milestones") void loadMilestones();
  }, [loadMilestones, phase]);

  const grouped = useMemo(() => {
    const limited: Partial<Record<Domain, Milestone[]>> = {};
    DOMAINS.forEach((domain) => {
      const items = milestones.filter((milestone) => milestone.domain === domain);
      if (items.length) limited[domain] = items.slice(0, 4);
    });
    return limited;
  }, [milestones]);

  // Which cards currently show their "not yet" guidance — purely local UI
  // state, never persisted. "Not yet" is an observation, not a recorded
  // fact the way an achieved milestone is.
  const [notYetOpen, setNotYetOpen] = useState<Set<string>>(new Set());
  const toggleNotYet = (id: string) => {
    setNotYetOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleMilestone = async (milestone: Milestone) => {
    if (!child || savingId) return;
    const wasSelected = selected.has(milestone.id);
    setSavingId(milestone.id);
    setSelected((prev) => {
      const next = new Set(prev);
      if (wasSelected) next.delete(milestone.id);
      else next.add(milestone.id);
      return next;
    });
    try {
      if (wasSelected) {
        await growth.unmarkMilestone(child.id, milestone.id);
      } else {
        await growth.markMilestoneAchieved({
          childId: child.id,
          milestoneId: milestone.id,
        });
      }
    } catch {
      setSelected((prev) => {
        const next = new Set(prev);
        if (wasSelected) next.add(milestone.id);
        else next.delete(milestone.id);
        return next;
      });
    } finally {
      setSavingId(null);
    }
  };

  if (!child) {
    return (
      <OnboardingScreen>
        <Text style={styles.body}>We need a child profile before personalizing your experience.</Text>
      </OnboardingScreen>
    );
  }

  if (phase === "welcome") {
    return (
      <OnboardingScreen>
        <FadeIn style={styles.center}>
          <Animated.View
            style={[
              styles.orbit,
              {
                transform: [
                  {
                    scale: pulse.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.04],
                    }),
                  },
                ],
              },
            ]}
          >
            <LogoMark size={40} />
          </Animated.View>
          <Text style={styles.welcomeTitle}>Welcome to The Neighbourhood.</Text>
          <Text style={styles.bodyMuted}>
            We're creating a calm, personalized space for you and {childName}.
          </Text>
          <Animated.View style={[styles.statusCard, { opacity: lineOpacity }]}>
            <CheckTiny />
            <Text style={styles.statusText}>
              {WELCOME_LINES[lineIndex]} for {childName}.
            </Text>
          </Animated.View>
        </FadeIn>
      </OnboardingScreen>
    );
  }

  if (phase === "milestones") {
    return (
      <OnboardingScreen
        scroll
        footer={
          <View style={styles.footerStack}>
            <PrimaryButton
              tone="accent"
              title={selected.size ? "Continue to today's plan" : "Continue without marking"}
              onPress={() => setPhase("plan")}
            />
            {selected.size > 0 && (
              <GhostButton title="Skip the rest for now" onPress={() => setPhase("plan")} />
            )}
          </View>
        }
      >
        <FadeIn>
          <Text style={styles.title}>Tell us what you&rsquo;ve noticed.</Text>
          <Text style={styles.bodyMuted}>
            Not a test. Just a starting point. "Not yet" is completely normal and gets you a
            few ideas to try, not a red flag.
          </Text>
          {usingCorrectedAge && (
            <Text style={styles.correctedNote}>
              Because {childName} arrived {devAge!.correctionWeeks} weeks early, these are matched
              to their corrected age ({devAge!.label})not the calendar.
            </Text>
          )}
        </FadeIn>

        {loadingMilestones ? (
          <View style={styles.loadingBlock}>
            <ActivityIndicator color={colors.warmTaupe} />
            <Text style={styles.smallMuted}>Finding a few discoveries that fit {childName}'s age.</Text>
          </View>
        ) : (
          <View style={styles.milestoneStack}>
            {DOMAINS.map((domain, index) => {
              const items = grouped[domain] ?? [];
              if (!items.length) return null;
              return (
                <View key={domain}>
                  <Text style={styles.domainTitle}>{DOMAIN_LABEL[domain]}</Text>
                  {items.map((milestone) => {
                    const noticed = selected.has(milestone.id);
                    const showingNotYet = notYetOpen.has(milestone.id);
                    return (
                      <View
                        key={milestone.id}
                        style={[styles.milestoneCard, noticed && styles.milestoneCardNoticed]}
                      >
                        <Text style={styles.milestoneText}>{milestone.description}</Text>
                        <View style={styles.milestoneActions}>
                          <Pressable
                            onPress={() => {
                              if (showingNotYet) toggleNotYet(milestone.id);
                              void toggleMilestone(milestone);
                            }}
                            disabled={savingId === milestone.id}
                            accessibilityRole="button"
                            accessibilityLabel={`Mark noticed: ${milestone.description}`}
                            style={({ pressed }) => [
                              styles.milestoneButton,
                              noticed && styles.milestoneButtonOn,
                              pressed && { opacity: 0.75 },
                            ]}
                          >
                            {noticed && <CheckTiny color={colors.white} />}
                            <Text style={[styles.milestoneButtonText, noticed && styles.milestoneButtonTextOn]}>
                              {noticed ? "Noticed" : "I've noticed this"}
                            </Text>
                          </Pressable>
                          {!noticed && (
                            <Pressable
                              onPress={() => toggleNotYet(milestone.id)}
                              accessibilityRole="button"
                              accessibilityLabel={`Not yet: ${milestone.description}`}
                              style={({ pressed }) => [
                                styles.milestoneGhostButton,
                                showingNotYet && styles.milestoneGhostButtonOn,
                                pressed && { opacity: 0.75 },
                              ]}
                            >
                              <Text style={styles.milestoneGhostButtonText}>Not yet</Text>
                            </Pressable>
                          )}
                        </View>

                        {showingNotYet && !noticed && (
                          <View style={styles.notYetPanel}>
                            <Text style={styles.notYetIntro}>
                              Totally normal. Here&rsquo;s something to try, and what to watch for.
                            </Text>
                            {milestone.guide?.try && (
                              <View style={styles.notYetRow}>
                                <Text style={styles.notYetLabel}>TRY</Text>
                                <Text style={styles.notYetText}>{milestone.guide.try}</Text>
                              </View>
                            )}
                            {milestone.guide?.watch && (
                              <View style={styles.notYetRow}>
                                <Text style={styles.notYetLabel}>KEEP AN EYE ON</Text>
                                <Text style={styles.notYetText}>{milestone.guide.watch}</Text>
                              </View>
                            )}
                            {milestone.guide?.see && (
                              <View style={styles.notYetRow}>
                                <Text style={styles.notYetLabel}>WORTH A CHAT WITH YOUR PAEDIATRICIAN IF</Text>
                                <Text style={styles.notYetText}>{milestone.guide.see}</Text>
                              </View>
                            )}
                          </View>
                        )}
                      </View>
                    );
                  })}
                  <Text style={styles.reassurance}>
                    {REASSURANCE[index % REASSURANCE.length]}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </OnboardingScreen>
    );
  }

  return (
    <OnboardingScreen>
      <FadeIn style={styles.center}>
        <View style={styles.orbit}>
          <PlanIcon />
        </View>
        <Text style={styles.titleCenter}>Creating today's plan for {childName}...</Text>
        <Text style={styles.bodyMuted}>
          We're turning what you shared into a gentle starting point.
        </Text>
        <View style={styles.planList}>
          {PLAN_LINES.map((line, index) => (
            <View key={line} style={styles.planLine}>
              <View style={[styles.planCheck, index <= planLineIndex && styles.planCheckOn]}>
                {index <= planLineIndex && <CheckTiny color={colors.white} />}
              </View>
              <Text style={[styles.planText, index <= planLineIndex && styles.planTextOn]}>
                {line}
              </Text>
            </View>
          ))}
        </View>
      </FadeIn>
    </OnboardingScreen>
  );
}

function PlanIcon() {
  return (
    <Svg width={58} height={58} viewBox="0 0 58 58" fill="none">
      <Circle cx={29} cy={29} r={27} fill="rgba(255,255,255,0.8)" />
      <Path d="M19 23h20M19 30h14M19 37h9" stroke={colors.warmTaupe} strokeWidth={2.2} strokeLinecap="round" />
      <Path d="M36 36l3 3 6-7" stroke={colors.sage} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CheckTiny({ color = colors.sage }: { color?: string }) {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4.5 12.5 9.5 17.5 19.5 6.5"
        stroke={color}
        strokeWidth={3.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  orbit: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.42)",
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xl,
  },
  welcomeTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: typeScale.display,
    lineHeight: typeScale.display * 1.18,
    color: colors.charcoal,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: fonts.bodyBold,
    fontSize: typeScale.h1,
    lineHeight: typeScale.h1 * 1.24,
    color: colors.charcoal,
    marginBottom: spacing.sm,
  },
  titleCenter: {
    fontFamily: fonts.bodyBold,
    fontSize: typeScale.h1,
    lineHeight: typeScale.h1 * 1.24,
    color: colors.charcoal,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: typeScale.body,
    lineHeight: typeScale.body * 1.5,
    color: colors.charcoal,
  },
  bodyMuted: {
    fontFamily: fonts.body,
    fontSize: typeScale.body,
    lineHeight: typeScale.body * 1.5,
    color: colors.textMuted,
    textAlign: "center",
  },
  correctedNote: {
    fontFamily: fonts.serifItalic,
    fontSize: typeScale.bodySmall,
    lineHeight: typeScale.bodySmall * 1.55,
    color: colors.warmTaupe,
    textAlign: "center",
    marginTop: spacing.md,
  },
  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusText: {
    flexShrink: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: typeScale.bodySmall,
    color: colors.charcoal,
  },
  eyebrow: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.caption,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: colors.warmTaupe,
    marginBottom: spacing.sm,
  },
  dots: {
    flexDirection: "row",
    gap: 7,
    marginTop: spacing.xl,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: {
    width: 22,
    backgroundColor: colors.warmTaupe,
  },
  footerStack: {
    gap: spacing.md,
    alignItems: "center",
  },
  loadingBlock: {
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  smallMuted: {
    fontFamily: fonts.body,
    fontSize: typeScale.bodySmall,
    lineHeight: typeScale.bodySmall * 1.45,
    color: colors.textMuted,
    textAlign: "center",
  },
  milestoneStack: {
    marginTop: spacing.xl,
    gap: spacing.lg,
  },
  domainTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: typeScale.h3,
    color: colors.charcoal,
    marginBottom: spacing.sm,
  },
  milestoneCard: {
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  milestoneCardNoticed: {
    backgroundColor: "rgba(168, 181, 164, 0.14)",
    borderColor: "rgba(168, 181, 164, 0.5)",
  },
  milestoneText: {
    fontFamily: fonts.bodyMedium,
    fontSize: typeScale.bodySmall,
    lineHeight: typeScale.bodySmall * 1.45,
    color: colors.charcoal,
  },
  milestoneActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  milestoneButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  milestoneButtonOn: {
    backgroundColor: colors.sage,
    borderColor: colors.sage,
  },
  milestoneButtonText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.caption,
    color: colors.charcoal,
  },
  milestoneButtonTextOn: {
    color: colors.white,
  },
  milestoneGhostButton: {
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "transparent",
  },
  milestoneGhostButtonOn: {
    borderColor: colors.border,
  },
  milestoneGhostButtonText: {
    fontFamily: fonts.bodyMedium,
    fontSize: typeScale.caption,
    color: colors.textMuted,
  },
  notYetPanel: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  notYetIntro: {
    fontFamily: fonts.serifItalic,
    fontSize: typeScale.bodySmall,
    color: colors.warmTaupe,
    marginBottom: 2,
  },
  notYetRow: { gap: 2 },
  notYetLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    letterSpacing: 1.1,
    color: colors.warmTaupe,
  },
  notYetText: {
    fontFamily: fonts.body,
    fontSize: typeScale.caption,
    lineHeight: typeScale.caption * 1.5,
    color: colors.textMuted,
  },
  reassurance: {
    fontFamily: fonts.serifItalic,
    fontSize: typeScale.body,
    lineHeight: typeScale.body * 1.45,
    color: colors.warmTaupe,
    marginTop: spacing.xs,
  },
  planList: {
    width: "100%",
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  planLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  planCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.border,
  },
  planCheckOn: {
    backgroundColor: colors.sage,
  },
  planText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: typeScale.bodySmall,
    color: colors.textMuted,
  },
  planTextOn: {
    fontFamily: fonts.bodySemiBold,
    color: colors.charcoal,
  },
});
