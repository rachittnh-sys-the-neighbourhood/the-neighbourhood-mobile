import { useLocalSearchParams, usePathname, useRouter } from "expo-router";
import { useScreenFocus } from "../../../lib/useScreenFocus";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ActivityCollapsedRow, ActivityDoneRow, ActivityExpandedCard, EndOfDay } from "../../../components/ActivityCard";
import {
  FeatureCard,
  FeatureGrid,
  FeatureGroupLabel,
  FeatureIcon,
  HubHeader,
  type FeatureIconName,
} from "../../../components/FeatureHub";
import { GuidedTourDialog } from "../../../components/GuidedTourDialog";
import { useAuth } from "../../../lib/AuthProvider";
import { computeAge, developmentalAgeMonths } from "../../../lib/childAge";
import { CHILD_SECTIONS, LIBRARY_SECTIONS, childHref, type ChildSection } from "../../../lib/childSections";
import * as growth from "../../../lib/db/growth";
import type { Domain, VaccinationScheduleItem } from "../../../lib/db/types";
import { markFirstRunComplete, markHomeCoachComplete } from "../../../lib/firstRun";
import { STAGE_LABEL, stageForAgeMonths } from "../../../lib/kidMealPlanner";
import { colors, fonts, spacing, typeScale } from "../../../lib/theme";
import { useGuidedTourStep } from "../../../lib/useGuidedTourStep";
import { useTodaysPlan } from "../../../lib/useTodaysPlan";

/**
 * Child's landing hub — a feature grid, not a scrolling list under section
 * headers. Everything about understanding, supporting and tracking the
 * child is one screen, one tap away, visible without scrolling to
 * discover it exists.
 *
 * "Today's activities" deliberately isn't a card here — that's Home's job,
 * and a card that just deep-links back to a different tab would undercut
 * "everything here is about my child, in one place." See
 * lib/childSections.ts for the full reasoning.
 *
 * Status text on a card is only ever a REAL, already-loaded value (how
 * many milestones noticed, when the next vaccination is due) — never a
 * fabricated number. A card with nothing honest to say just shows its
 * description alone.
 */
const ICONS: Record<ChildSection["slug"], FeatureIconName> = {
  meals: "meal",
  milestones: "milestone",
  vaccinations: "vaccine",
  kit: "kit",
  reports: "reports",
  guide: "guide",
  stories: "story",
};

// The main grid is everything not filed under Library — see
// lib/childSections.ts for what "library" means and why.
const MAIN_SECTIONS = CHILD_SECTIONS.filter((s) => s.group !== "library");

export default function ChildHome() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useLocalSearchParams<{ guidedTour?: string; step?: string; next?: string }>();
  const { child, children, setActiveChild } = useAuth();
  // Two ages, deliberately. `age` is chronological — it's what gets shown
  // to the parent, who knows how old their child is. `ageMonths` is
  // corrected, and drives which developmental content applies.
  const age = child ? computeAge(child.date_of_birth) : null;
  const ageMonths = developmentalAgeMonths(child);
  const isFocused = useScreenFocus();
  const isChildRoute = pathname === "/child" || pathname === "/child/";
  const wantsGuidedTour =
    params.guidedTour === "1" && params.step === "3" && isFocused && isChildRoute;
  const guidedTour = useGuidedTourStep(3, wantsGuidedTour);
  const afterOnboardingTour = params.next === "milestones";
  const tourNext = afterOnboardingTour ? "&next=milestones" : "";

  const [milestoneStats, setMilestoneStats] = useState<{ achieved: number; total: number } | null>(null);
  const [nextVaccination, setNextVaccination] = useState<VaccinationScheduleItem | null>(null);

  // Same "today's plan" the Home tab reads — see components/ActivityCard.tsx.
  // Collapsed by default here too; nothing auto-expands.
  const { plan, completed, complete, swap } = useTodaysPlan(child?.id ?? null);
  const [expandedDomain, setExpandedDomain] = useState<Domain | null>(null);
  const cardOpacity = useRef(new Animated.Value(1)).current;

  const activities = plan?.activities ?? [];
  const allDone = activities.length > 0 && completed.length === activities.length;

  // Same fold as Home once every domain for the day is done — see
  // components/ActivityCard.tsx EndOfDay. Kept as its own flag (not derived
  // straight from allDone) so reopening the summary survives re-renders.
  const [dayCollapsed, setDayCollapsed] = useState(false);
  useEffect(() => {
    if (allDone) {
      setDayCollapsed(true);
      setExpandedDomain(null);
    }
  }, [allDone]);
  const fadeSwap = useCallback(
    (domain: Domain, run: () => Promise<void>) => {
      Animated.timing(cardOpacity, { toValue: 0, duration: 140, useNativeDriver: true }).start(async () => {
        await run();
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
      });
    },
    [cardOpacity]
  );

  const loadStats = useCallback(async () => {
    if (!child) return;
    try {
      const [current, achieved, schedule, recorded] = await Promise.all([
        growth.getMilestonesForCurrentAge(ageMonths),
        growth.getAchievedMilestones(child.id),
        growth.getVaccinationSchedule(),
        growth.getAdministeredVaccinations(child.id),
      ]);
      setMilestoneStats({ achieved: achieved.length, total: current.length });

      const recordedIds = new Set(recorded.map((v) => v.vaccination_id));
      const ageDays = Math.floor(
        (Date.now() - new Date(`${child.date_of_birth}T00:00:00`).getTime()) / 86_400_000
      );
      const remaining = schedule.filter((v) => !recordedIds.has(v.id));
      setNextVaccination(remaining.find((v) => v.age_days >= ageDays) ?? remaining[0] ?? null);
    } catch {}
  }, [child, ageMonths]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const skipGuidedTour = async () => {
    await Promise.all([markHomeCoachComplete(), markFirstRunComplete()]).catch(() => {});
    if (afterOnboardingTour) {
      router.replace("/child/milestones?initial=1&afterTour=1");
      return;
    }
    router.replace("/home");
  };

  const statusFor = (slug: ChildSection["slug"]): string | undefined => {
    switch (slug) {
      case "milestones":
        return milestoneStats ? `${milestoneStats.achieved} noticed so far` : undefined;
      case "vaccinations":
        return nextVaccination ? `Due around ${nextVaccination.age_label}` : "Up to date";
      case "meals":
        return STAGE_LABEL[stageForAgeMonths(ageMonths)];
      default:
        return undefined;
    }
  };

  /**
   * Only three sections get their caption rewritten per child — the ones
   * with real, already-loaded data to draw on (age, next vaccination).
   * Development Kit and Reports are still backend scaffolds with nothing
   * genuine to say beyond the static line (see lib/childSections.ts), so
   * they fall through unchanged rather than being personalized with
   * nothing but the child's name.
   */
  const descriptionFor = (section: ChildSection): string => {
    if (!child || !age) return section.description;
    switch (section.slug) {
      case "meals":
        return `Feeding guidance for ${child.name}, at ${age.label}.`;
      case "milestones":
        return `What's typical for ${child.name} at ${age.label}.`;
      case "vaccinations":
        // The due date already lives in the status line below (see
        // statusFor) — repeating it here just duplicated the same phrase
        // twice on a two-line card.
        return nextVaccination
          ? `${child.name}'s next: ${nextVaccination.vaccine_name}.`
          : `${child.name}'s schedule, up to date for now.`;
      default:
        return section.description;
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <HubHeader
          title={child?.name ?? "Your child"}
          subtitle={age ? `${age.label} old` : "What they're doing now, and what's coming."}
        />

        <View style={styles.childRow}>
          {children.map((kid) => {
            const selected = kid.id === child?.id;
            return (
              <Pressable
                key={kid.id}
                onPress={() => setActiveChild(kid.id)}
                style={[styles.childPill, selected && styles.childPillOn]}
              >
                <Text style={[styles.childPillText, selected && styles.childPillTextOn]}>
                  {kid.name}
                </Text>
              </Pressable>
            );
          })}
          <Pressable onPress={() => router.push("/child/add")} style={styles.addChildPill}>
            <Text style={styles.addChildPillText}>+ Add a child</Text>
          </Pressable>
        </View>

        {activities.length > 0 && (
          <>
            <FeatureGroupLabel>TODAY'S ACTIVITIES</FeatureGroupLabel>
            {allDone && dayCollapsed ? (
              <View style={styles.activityList}>
                <EndOfDay
                  childName={child?.name ?? "your child"}
                  collapsed
                  onToggle={() => setDayCollapsed(false)}
                />
              </View>
            ) : (
              <View style={styles.activityList}>
                {activities.map((activity) => {
                  const isDone = completed.includes(activity.domain);

                  // Expansion is checked before completion so a done
                  // activity can still be reopened — see ActivityDoneRow.
                  if (activity.domain === expandedDomain) {
                    return (
                      <Animated.View key={activity.domain} style={{ opacity: cardOpacity }}>
                        <ActivityExpandedCard
                          activity={activity}
                          canSwap
                          isDone={isDone}
                          onComplete={() => {
                            complete(activity);
                            setExpandedDomain(null);
                          }}
                          onSwap={() => fadeSwap(activity.domain, () => swap(activity.domain))}
                          onCollapse={() => setExpandedDomain(null)}
                        />
                      </Animated.View>
                    );
                  }

                  if (isDone) {
                    return (
                      <ActivityDoneRow
                        key={activity.domain}
                        activity={activity}
                        onPress={() => setExpandedDomain(activity.domain)}
                      />
                    );
                  }

                  return (
                    <ActivityCollapsedRow
                      key={activity.domain}
                      activity={activity}
                      onPress={() => setExpandedDomain(activity.domain)}
                    />
                  );
                })}
                {allDone && (
                  <EndOfDay
                    childName={child?.name ?? "your child"}
                    collapsed={false}
                    onToggle={() => setDayCollapsed(true)}
                  />
                )}
              </View>
            )}
          </>
        )}

        <FeatureGroupLabel>EXPLORE</FeatureGroupLabel>
        <FeatureGrid>
          {MAIN_SECTIONS.map((section) => (
            <FeatureCard
              key={section.slug}
              icon={<FeatureIcon name={ICONS[section.slug]} color={colors.warmTaupe} />}
              title={section.title}
              description={descriptionFor(section)}
              status={statusFor(section.slug)}
              onPress={() => router.push(childHref(section.slug))}
              highlighted={guidedTour && section.slug === "milestones"}
            />
          ))}
        </FeatureGrid>

        <FeatureGroupLabel>LIBRARY</FeatureGroupLabel>
        <FeatureGrid>
          {LIBRARY_SECTIONS.map((section) => (
            <FeatureCard
              key={section.slug}
              icon={<FeatureIcon name={ICONS[section.slug]} color={colors.warmTaupe} />}
              title={section.title}
              description={section.description}
              status={statusFor(section.slug)}
              onPress={() => router.push(childHref(section.slug))}
            />
          ))}
        </FeatureGrid>
      </ScrollView>
      {guidedTour && (
        <GuidedTourDialog
          eyebrow="Child"
          focus="Everything about your child"
          title="Growth becomes a story."
          body="Activities, discoveries, vaccinations, meals. Everything you want to keep track of as they grow."
          step={3}
          total={5}
          primaryTitle="Continue"
          onPrimary={() => router.replace(`/you?guidedTour=1&step=4${tourNext}`)}
          onSkip={skipGuidedTour}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  activityList: {
    marginBottom: spacing.lg,
  },
  childRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  childPill: {
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
  },
  childPillOn: {
    backgroundColor: colors.warmTaupe,
    borderColor: colors.warmTaupe,
  },
  childPillText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.caption,
    color: colors.charcoal,
  },
  childPillTextOn: {
    color: colors.white,
  },
  addChildPill: {
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
  },
  addChildPillText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.caption,
    color: colors.warmTaupe,
  },
});
