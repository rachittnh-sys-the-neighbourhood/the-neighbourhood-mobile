import { useLocalSearchParams, usePathname, useRouter } from "expo-router";
import { useScreenFocus } from "../../../lib/useScreenFocus";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  ActivityCollapsedRow,
  ActivityDoneRow,
  ActivityExpandedCard,
  EndOfDay,
  FeaturedActivityCard,
} from "../../../components/ActivityCard";
import {
  FeatureCard,
  FeatureGrid,
  FeatureGroupLabel,
  FeatureIcon,
  HubHeader,
  MicroLearningCard,
  type FeatureIconName,
} from "../../../components/FeatureHub";
import { GuidedTourDialog } from "../../../components/GuidedTourDialog";
import { useAuth } from "../../../lib/AuthProvider";
import { computeAge, developmentalAgeMonths } from "../../../lib/childAge";
import { CHILD_SECTIONS, sectionsInGroup, childHref, type ChildSection } from "../../../lib/childSections";
import { CHILD_STAGE_DOMAIN_LABEL, recommendedChildStageTopics } from "../../../lib/childStageTopics";
import * as growth from "../../../lib/db/growth";
import type { Domain, Milestone, VaccinationScheduleItem } from "../../../lib/db/types";
import { markFirstRunComplete, markHomeCoachComplete } from "../../../lib/firstRun";
import {
  mealsFor as kidMealsFor,
  slotsForStage,
  stageForAgeMonths,
} from "../../../lib/kidMealPlanner";
import { colors, fonts, spacing, typeScale } from "../../../lib/theme";
import { useGuidedTourStep } from "../../../lib/useGuidedTourStep";
import { useTodaysPlan } from "../../../lib/useTodaysPlan";

/**
 * Child's landing hub.
 *
 * TODAY leads with three small, honest answers (Try / Notice / Eat) before
 * anything else — Try shows exactly one recommended activity, the other
 * three folded behind "More ideas" (same pattern as Home's own activity
 * card, see components/ActivityCard.tsx), rather than four rows of real
 * estate every single time.
 *
 * Below TODAY, each remaining section earns its own small zone (see
 * lib/childSections.ts), but a zone whose card is mostly self-explanatory
 * (Discoveries, a single recommended This Stage read) doesn't repeat its
 * own name as both a section label and a card title — the label alone, or
 * the card's real content, carries the meaning once.
 *
 * A group's cards lay out two-to-a-row EXCEPT the odd one out, which
 * stretches to a full-width row instead of leaving a dangling gap next to
 * an empty column (see FeatureCard's `wide` prop).
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

const GROUP_LABEL: Record<ChildSection["group"], string> = {
  discover: "DISCOVER",
  stage: "THIS STAGE",
  care: "CARE",
  journey: "JOURNEY",
  need: "WHAT YOU NEED",
};

// Render order for the zones below TODAY, matching the product's own
// mental model: notice something → understand the stage → day-to-day care
// → the story over time → what might help.
const GROUP_ORDER: ChildSection["group"][] = ["discover", "stage", "care", "journey", "need"];

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
  const [nextMilestone, setNextMilestone] = useState<Milestone | null>(null);

  // Same "today's plan" the Home tab reads — see components/ActivityCard.tsx.
  const { plan, completed, complete, swap } = useTodaysPlan(child?.id ?? null);
  const [expandedDomain, setExpandedDomain] = useState<Domain | null>(null);
  const [moreIdeasOpen, setMoreIdeasOpen] = useState(false);
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

  // The one activity Try leads with: the next undone activity in
  // orderDomains' order (see lib/todaysPlan.ts) — same idea as Home's
  // ChildDayActivities. The rest fold behind "More ideas".
  const featured = activities.find((a) => !completed.includes(a.domain)) ?? activities[0];
  const otherActivities = activities.filter((a) => a.domain !== featured?.domain);

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

      const achievedIds = new Set(achieved.map((m) => m.milestone_id));
      const outstanding = current.filter((m) => !achievedIds.has(m.id));
      // Rotates by day, same idea as Home's own pick — see home.tsx.
      const dayIndex = Math.floor(Date.now() / 86_400_000);
      setNextMilestone(outstanding.length > 0 ? outstanding[dayIndex % outstanding.length] : null);

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

  // The same meal-of-the-day pick Home makes for this exact child — see
  // home.tsx's mealStage/mealSlot/mealIdea. Duplicated rather than shared
  // as a hook because it's three short lines and the two screens have
  // slightly different fallback needs; if it grows, it should move to a
  // shared selector.
  const mealStage = stageForAgeMonths(ageMonths);
  const mealSlots = slotsForStage(mealStage);
  const mealSlot = mealSlots[0] ?? null;
  const mealIdea = mealSlot ? kidMealsFor(mealStage, mealSlot.key)[0] ?? null : null;

  const recommendedStageTopics = recommendedChildStageTopics(ageMonths, 1);
  const topStageTopic = recommendedStageTopics[0] ?? null;

  const statusFor = (slug: ChildSection["slug"]): string | undefined => {
    switch (slug) {
      case "vaccinations":
        return nextVaccination ? `Due around ${nextVaccination.age_label}` : "Up to date";
      default:
        return undefined;
    }
  };

  /**
   * Only sections with real, already-loaded data to draw on get a
   * personalized caption (age, next vaccination). Development Kit and
   * Progress are still backend scaffolds with nothing genuine to say
   * beyond the static line (see lib/childSections.ts), so they fall
   * through unchanged rather than being personalized with nothing but the
   * child's name.
   */
  const descriptionFor = (section: ChildSection): string => {
    if (!child || !age) return section.description;
    switch (section.slug) {
      case "meals":
        return `Feeding guidance for ${child.name}, at ${age.label}.`;
      case "vaccinations":
        // The due date already lives in the status line below (see
        // statusFor) — repeating it here just duplicated the same phrase
        // twice on a two-line card.
        return nextVaccination
          ? `${child.name}'s next: ${nextVaccination.vaccine_name}.`
          : `${child.name}'s schedule, up to date for now.`;
      case "kit":
        return `Based on what ${child.name} is exploring right now.`;
      default:
        return section.description;
    }
  };

  /** Renders one zone's cards two-to-a-row, except the odd one out (or a
   *  lone single card), which gets a full-width row instead of a dangling
   *  half-empty gap. */
  const renderGroupCards = (sections: ChildSection[]) => {
    const hasOddOne = sections.length % 2 === 1;
    const paired = hasOddOne ? sections.slice(0, -1) : sections;
    const odd = hasOddOne ? sections[sections.length - 1] : null;
    return (
      <>
        {paired.length > 0 && (
          <FeatureGrid>
            {paired.map((section) => (
              <FeatureCard
                key={section.slug}
                icon={<FeatureIcon name={ICONS[section.slug]} color={colors.warmTaupe} />}
                title={section.title}
                description={descriptionFor(section)}
                status={statusFor(section.slug)}
                onPress={() => router.push(childHref(section.slug))}
              />
            ))}
          </FeatureGrid>
        )}
        {odd && (
          <FeatureCard
            wide
            icon={<FeatureIcon name={ICONS[odd.slug]} color={colors.warmTaupe} />}
            title={odd.title}
            description={descriptionFor(odd)}
            status={statusFor(odd.slug)}
            onPress={() => router.push(childHref(odd.slug))}
          />
        )}
      </>
    );
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

        <FeatureGroupLabel>TODAY</FeatureGroupLabel>

        {activities.length > 0 && (
          <>
            <Text style={styles.subLabel}>TRY</Text>
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
                {featured &&
                  (featured.domain === expandedDomain ? (
                    <Animated.View style={{ opacity: cardOpacity }}>
                      <ActivityExpandedCard
                        activity={featured}
                        canSwap
                        isDone={completed.includes(featured.domain)}
                        onComplete={() => {
                          complete(featured);
                          setExpandedDomain(null);
                        }}
                        onSwap={() => fadeSwap(featured.domain, () => swap(featured.domain))}
                        onCollapse={() => setExpandedDomain(null)}
                      />
                    </Animated.View>
                  ) : (
                    <FeaturedActivityCard
                      activity={featured}
                      moreIdeasCount={otherActivities.length}
                      moreIdeasOpen={moreIdeasOpen}
                      onOpen={() => setExpandedDomain(featured.domain)}
                      onToggleMoreIdeas={() => setMoreIdeasOpen((v) => !v)}
                    />
                  ))}

                {otherActivities.length > 0 && moreIdeasOpen && (
                  <View style={styles.moreIdeasList}>
                    {otherActivities.map((activity) => {
                      const isDone = completed.includes(activity.domain);
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
                  </View>
                )}

                {allDone && (
                  <View style={{ marginTop: spacing.sm }}>
                    <EndOfDay
                      childName={child?.name ?? "your child"}
                      collapsed={false}
                      onToggle={() => setDayCollapsed(true)}
                    />
                  </View>
                )}
              </View>
            )}
          </>
        )}

        {nextMilestone && (
          <>
            <Text style={styles.subLabel}>NOTICE</Text>
            <Pressable
              style={({ pressed }) => [styles.todayCard, pressed && styles.pressed]}
              onPress={() => router.push("/child/milestones")}
              accessibilityRole="button"
            >
              <Text style={styles.todayCardTitle}>{nextMilestone.description}</Text>
              <Text style={styles.todayCardBody}>Typical for this age. No rush, just something to notice.</Text>
            </Pressable>
          </>
        )}

        {mealSlot && mealIdea && (
          <>
            <Text style={styles.subLabel}>EAT</Text>
            <Pressable
              style={({ pressed }) => [styles.todayCard, pressed && styles.pressed]}
              onPress={() => router.push("/child/meals")}
              accessibilityRole="button"
            >
              <Text style={styles.todayCardTitle}>{mealIdea.title}</Text>
              <Text style={styles.todayCardBody}>
                {mealSlot.window} · {mealIdea.minutes} min
              </Text>
            </Pressable>
          </>
        )}

        {/* DISCOVER — same blurb-card treatment as Notice/Eat above, not a
            row that just repeats "Discoveries" under a "DISCOVER" label.
            No count/status here: that detail belongs on the Discoveries
            screen itself, once opened. */}
        <FeatureGroupLabel>DISCOVER</FeatureGroupLabel>
        <Pressable
          style={({ pressed }) => [styles.todayCard, pressed && styles.pressed]}
          onPress={() => router.push(childHref("milestones"))}
          accessibilityRole="button"
        >
          <Text style={styles.todayCardTitle}>See what's typical now</Text>
          <Text style={styles.todayCardBody}>
            What {child?.name ?? "your child"} might do next, and what they&rsquo;ve already tried.
          </Text>
        </Pressable>

        {/* THIS STAGE — the top recommended read stands in for the section;
            no card also titled "This Stage" repeating the label above it. */}
        {topStageTopic && (
          <>
            <FeatureGroupLabel>THIS STAGE</FeatureGroupLabel>
            <MicroLearningCard
              eyebrow={CHILD_STAGE_DOMAIN_LABEL[topStageTopic.domain]}
              title={topStageTopic.title}
              reason={topStageTopic.reason}
              minutes={topStageTopic.minutes}
              onPress={() => router.push(childHref("guide"))}
            />
          </>
        )}

        {GROUP_ORDER.filter((g) => g === "care" || g === "journey" || g === "need").map((group) => {
          const sections = sectionsInGroup(group);
          if (sections.length === 0) return null;
          return (
            <View key={group}>
              <FeatureGroupLabel>{GROUP_LABEL[group]}</FeatureGroupLabel>
              {renderGroupCards(sections)}
            </View>
          );
        })}
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
  moreIdeasList: {
    marginTop: spacing.sm,
    gap: spacing.xs,
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
  subLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.caption,
    letterSpacing: 1.1,
    color: colors.textMuted,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  todayCard: {
    padding: spacing.md,
    borderRadius: 14,
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(96, 79, 60, 0.1)",
    marginBottom: spacing.md,
  },
  pressed: {
    opacity: 0.7,
  },
  todayCardTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.bodySmall,
    color: colors.charcoal,
  },
  todayCardBody: {
    fontFamily: fonts.body,
    fontSize: typeScale.caption,
    lineHeight: typeScale.caption * 1.4,
    color: colors.textMuted,
    marginTop: 3,
  },
});
