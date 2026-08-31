import { useLocalSearchParams, usePathname, useRouter } from "expo-router";
import { useScreenFocus } from "../../../lib/useScreenFocus";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  ActivityCollapsedRow,
  ActivityDoneRow,
  ActivityExpandedCard,
  EndOfDay,
} from "../../../components/ActivityCard";
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
import { sectionsInGroup, childHref, type ChildSection } from "../../../lib/childSections";
import { recommendedChildStageTopics } from "../../../lib/childStageTopics";
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
 * TODAY'S ACTIVITIES lists every domain's activity for the day as a flat,
 * always-visible row list (done rows quiet but still tappable) — no
 * featured-card-plus-fold; a parent can see the whole day at a glance.
 * Tapping a row opens it inline into the same ActivityExpandedCard Home
 * uses (see components/ActivityCard.tsx).
 *
 * Below that, two tile groups: EXPLORE (Notice / Discover / This Stage /
 * Eat — each a short, personalized teaser for something to look at today)
 * and CARE (the day-to-day and longer-range sections — meals, vaccines,
 * stories, progress, the kit — merged from childSections.ts's `care`,
 * `journey` and `need` groups into one visual group, since splitting them
 * into three same-styled labels added zones without adding meaning). Both
 * groups render as the same white icon-tile grid (see renderTiles below),
 * two-to-a-row except the odd one out, which stretches to a full-width row
 * instead of leaving a dangling gap next to an empty column (FeatureCard's
 * `wide` prop).
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

/** One tile in a group's icon grid — either a childSections.ts entry or an
 *  ad-hoc EXPLORE teaser, normalized to the same shape so both render
 *  through the same renderTiles helper. */
type ChildTile = {
  key: string;
  icon: FeatureIconName;
  title: string;
  description: string;
  status?: string;
  onPress: () => void;
};

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

  /** Renders one group's tiles two-to-a-row, except the odd one out (or a
   *  lone single tile), which gets a full-width row instead of a dangling
   *  half-empty gap. Shared by EXPLORE and CARE below. */
  const renderTiles = (tiles: ChildTile[]) => {
    const hasOddOne = tiles.length % 2 === 1;
    const paired = hasOddOne ? tiles.slice(0, -1) : tiles;
    const odd = hasOddOne ? tiles[tiles.length - 1] : null;
    return (
      <>
        {paired.length > 0 && (
          <FeatureGrid>
            {paired.map((tile) => (
              <FeatureCard
                key={tile.key}
                icon={<FeatureIcon name={tile.icon} color={colors.warmTaupe} />}
                title={tile.title}
                description={tile.description}
                status={tile.status}
                onPress={tile.onPress}
              />
            ))}
          </FeatureGrid>
        )}
        {odd && (
          <FeatureCard
            wide
            icon={<FeatureIcon name={odd.icon} color={colors.warmTaupe} />}
            title={odd.title}
            description={odd.description}
            status={odd.status}
            onPress={odd.onPress}
          />
        )}
      </>
    );
  };

  // EXPLORE — Notice (the next specific thing to watch for), Discover (the
  // general "what's typical" browse entry), This Stage (the top
  // recommended read) and Eat (today's meal idea) — four short, already
  // personalized teasers, each one tap from its full screen.
  const exploreTiles: ChildTile[] = [];
  if (nextMilestone) {
    exploreTiles.push({
      key: "notice",
      icon: "notice",
      title: "Notice",
      description: nextMilestone.description,
      onPress: () => router.push(childHref("milestones")),
    });
  }
  exploreTiles.push({
    key: "discover",
    icon: "milestone",
    title: "Discover",
    description:
      child && age
        ? `What's typical for ${child.name} at ${age.label}.`
        : "What's typical now, and what they've already done.",
    status: milestoneStats ? `${milestoneStats.achieved} noticed so far` : undefined,
    onPress: () => router.push(childHref("milestones")),
  });
  if (topStageTopic) {
    exploreTiles.push({
      key: "stage",
      icon: "guide",
      title: "This Stage",
      description: topStageTopic.title,
      status: `${topStageTopic.minutes} min`,
      onPress: () => router.push(childHref("guide")),
    });
  }
  if (mealSlot && mealIdea) {
    exploreTiles.push({
      key: "eat",
      icon: "meal",
      title: "Eat",
      description: mealIdea.title,
      status: mealSlot.window,
      onPress: () => router.push(childHref("meals")),
    });
  }

  // CARE — childSections.ts's `care`, `journey` and `need` groups, merged
  // into one visual group (meals, vaccinations, stories, progress, the
  // kit): day-to-day and longer-range, but all "things this app tracks for
  // you", which reads as one group rather than three same-styled labels.
  const careTiles: ChildTile[] = [
    ...sectionsInGroup("care"),
    ...sectionsInGroup("journey"),
    ...sectionsInGroup("need"),
  ].map((section) => ({
    key: section.slug,
    icon: ICONS[section.slug],
    title: section.title,
    description: descriptionFor(section),
    status: statusFor(section.slug),
    onPress: () => router.push(childHref(section.slug)),
  }));

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

        <FeatureGroupLabel>Today's Activities</FeatureGroupLabel>

        {activities.length > 0 &&
          (allDone && dayCollapsed ? (
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
                <View style={{ marginTop: spacing.sm }}>
                  <EndOfDay
                    childName={child?.name ?? "your child"}
                    collapsed={false}
                    onToggle={() => setDayCollapsed(true)}
                  />
                </View>
              )}
            </View>
          ))}

        {exploreTiles.length > 0 && (
          <View>
            <FeatureGroupLabel>Explore</FeatureGroupLabel>
            {renderTiles(exploreTiles)}
          </View>
        )}

        {careTiles.length > 0 && (
          <View>
            <FeatureGroupLabel>Care</FeatureGroupLabel>
            {renderTiles(careTiles)}
          </View>
        )}
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
