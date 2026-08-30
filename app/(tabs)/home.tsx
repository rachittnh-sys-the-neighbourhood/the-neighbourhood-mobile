import { useLocalSearchParams, useNavigation, usePathname, useRouter } from "expo-router";
import { useScreenFocus } from "../../lib/useScreenFocus";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { ActivityCollapsedRow, ActivityDoneRow, ActivityExpandedCard, EndOfDay, FeaturedActivityCard } from "../../components/ActivityCard";
import { GuidedTourDialog } from "../../components/GuidedTourDialog";
import { LogoMark } from "../../components/Logo";
import { PrimaryButton } from "../../components/ui";
import { useAuth, type Child, type Profile } from "../../lib/AuthProvider";
import { computeAge, developmentalAgeMonths, stageLabel } from "../../lib/childAge";
import * as growth from "../../lib/db/growth";
import { DOMAIN_LABEL, type Domain, type Milestone, type VaccinationScheduleItem } from "../../lib/db/types";
import {
  hasCompletedHomeCoach,
  hasSwipedActivityPager,
  markFirstRunComplete,
  markHomeCoachComplete,
  markSwipedActivityPager,
} from "../../lib/firstRun";
import {
  mealsFor as kidMealsFor,
  slotsForStage,
  stageForAgeMonths,
  type KidMeal,
  type MealSlot,
} from "../../lib/kidMealPlanner";
import {
  bridgesFor,
  deriveProfile,
  topicsForProfile,
  visibleCareAreas,
  type CareArea,
  type CareTopic,
} from "../../lib/parentCare";
import { reloadApp } from "../../lib/reload";
import { useGuidedTourStep } from "../../lib/useGuidedTourStep";
import { useStuckWatchdog } from "../../lib/useStuckWatchdog";
import { useTodaysPlan } from "../../lib/useTodaysPlan";
import { colors, radius, spacing, type } from "../../lib/theme";

function greetingWord(hour: number): string {
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function todayLabel(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/**
 * Home — "what should I do with my child today?", answered four times, one
 * per developmental domain.
 *
 * The four are NOT a checklist. Exactly one is expanded at a time; the
 * rest are quiet single rows. A parent who does two of four should close
 * the app feeling fine, so there is no percentage, no streak, no score,
 * and no state that reads as "behind". Completed activities stay visible
 * as calm lines rather than vanishing, because seeing what you already did
 * is the point.
 *
 * Nothing here is tied to time of day — the plan is equally valid at 7am
 * or 9pm.
 */
export default function Home() {
  const router = useRouter();
  const navigation = useNavigation();
  const pathname = usePathname();
  const params = useLocalSearchParams<{
    guidedTour?: string;
    next?: string;
    step?: string;
    tourComplete?: string;
    replay?: string;
  }>();
  const { child, children: kids, parentName, profile: authProfile } = useAuth();
  const [coachVisible, setCoachVisible] = useState(false);
  const [coachStep, setCoachStep] = useState(0);
  const [showTourDone, setShowTourDone] = useState(params.tourComplete === "1");
  const [nextVaccination, setNextVaccination] = useState<VaccinationScheduleItem | null>(null);
  const [nextMilestone, setNextMilestone] = useState<Milestone | null>(null);
  // See guide.tsx: only the focused screen on matching route with step 0 may show a tour dialog.
  const isFocused = useScreenFocus();
  const isHomeRoute = pathname === "/home" || pathname === "/";
  const wantsGuidedTour =
    params.guidedTour === "1" && (params.step === "0" || !params.step) && isFocused && isHomeRoute;
  const guidedTour = useGuidedTourStep(0, wantsGuidedTour, params.replay === "1");
  const afterOnboardingTour = params.next === "milestones";
  const tourNext = afterOnboardingTour ? "&next=milestones" : "";

  // The plan now comes from the database, cached locally so this renders
  // immediately and completions never wait on the network. Kept here only
  // for the screen-level loading/error gate below — the actual activity
  // list for each child now lives in ChildDayActivities, one instance per
  // child, so more than one child's plan can be on screen (swipeable) at
  // once instead of just the single active child's.
  const { plan, loading, error } = useTodaysPlan(child?.id ?? null);
  // Covers both this hook's own load() and `child` itself never arriving
  // — a session left wedged after a desynced tab (see AuthProvider's
  // fetchFamily) can leave either one hanging with no error to show.
  const isLoadingGate = !child || (loading && !plan);
  const stuck = useStuckWatchdog(isLoadingGate);

  // The loading gate below already leads with its own centered LogoMark
  // (see the render below) — the tab header's mark (set in (tabs)/_layout.tsx)
  // would otherwise show a second one at the same time, right after
  // finishing onboarding, until the real Home content is ready.
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (isLoadingGate ? null : <LogoMark size={26} />),
    });
  }, [navigation, isLoadingGate]);

  const entrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [entrance]);

  useEffect(() => {
    let alive = true;
    if (!child || guidedTour || params.guidedTour === "1") return;
    hasCompletedHomeCoach()
      .then((complete) => {
        if (!alive || complete) return;
        setTimeout(() => {
          if (alive) setCoachVisible(true);
        }, 650);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [child, guidedTour, params.guidedTour]);

  useEffect(() => {
    if (params.tourComplete !== "1") return;
    setShowTourDone(true);
    const timer = setTimeout(() => setShowTourDone(false), 2600);
    return () => clearTimeout(timer);
  }, [params.tourComplete]);

  useEffect(() => {
    if (!child) return;
    let alive = true;
    const ageDays = Math.floor(
      (Date.now() - new Date(`${child.date_of_birth}T00:00:00`).getTime()) / 86_400_000
    );
    Promise.all([growth.getVaccinationSchedule(), growth.getAdministeredVaccinations(child.id)])
      .then(([schedule, recorded]) => {
        if (!alive) return;
        const recordedIds = new Set(recorded.map((item) => item.vaccination_id));
        const remaining = schedule.filter((item) => !recordedIds.has(item.id));
        setNextVaccination(
          remaining.find((item) => item.age_days >= ageDays) ?? remaining[0] ?? null
        );
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [child]);

  useEffect(() => {
    if (!child) return;
    let alive = true;
    // Corrected, not chronological: which discoveries are "current" is a
    // developmental question. See lib/childAge.ts developmentalAge.
    const ageMonths = developmentalAgeMonths(child);
    Promise.all([growth.getMilestonesForCurrentAge(ageMonths), growth.getAchievedMilestones(child.id)])
      .then(([current, achieved]) => {
        if (!alive) return;
        const achievedIds = new Set(achieved.map((item) => item.milestone_id));
        const outstanding = current.filter((item) => !achievedIds.has(item.id));
        if (outstanding.length === 0) {
          setNextMilestone(null);
          return;
        }
        // Rotates by day, same as the Care topic below — a toddler has
        // several outstanding milestones at once, so this keeps the card
        // from suggesting the same one every morning.
        const dayIndex = Math.floor(Date.now() / 86_400_000);
        setNextMilestone(outstanding[dayIndex % outstanding.length]);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [child]);

  const closeCoach = async () => {
    setCoachVisible(false);
    setCoachStep(0);
    await markHomeCoachComplete().catch(() => {});
  };

  const nextCoach = () => {
    if (coachStep >= HOME_COACH.length - 1) {
      void closeCoach();
      return;
    }
    setCoachStep((step) => step + 1);
  };

  const skipGuidedTour = async () => {
    await Promise.all([markHomeCoachComplete(), markFirstRunComplete()]).catch(() => {});
    if (afterOnboardingTour) {
      router.replace("/child/milestones?initial=1&afterTour=1");
      return;
    }
    router.replace("/home");
  };

  if (isLoadingGate) {
    return (
      <View style={styles.screen}>
        <View style={[styles.inner, styles.loadingInner]}>
          {/* Every other wait in the app — making.tsx, welcome.tsx — leads
              with this mark. This screen was the one place a parent saw
              plain text instead, right after finishing onboarding. */}
          <LogoMark size={40} />
          <Text style={styles.loading}>
            {stuck
              ? "This is taking longer than it should. Reloading should fix it."
              : "Setting up your plan…"}
          </Text>
          {stuck && (
            <View style={styles.stuckReload}>
              <PrimaryButton tone="taupe" title="Reload" onPress={() => reloadApp(router)} />
            </View>
          )}
        </View>
      </View>
    );
  }

  // Only reached when there's genuinely nothing to show — a cached plan
  // takes precedence over reporting a network problem.
  if (error && !plan) {
    return (
      <View style={styles.screen}>
        <View style={styles.inner}>
          <Text style={styles.loading}>
            We couldn&rsquo;t load today&rsquo;s plan. It&rsquo;ll be here when
            you&rsquo;re back online.
          </Text>
        </View>
      </View>
    );
  }

  const age = computeAge(child.date_of_birth);
  const ageMonths = age?.totalMonths ?? 0;

  // A vaccination only earns a spot on Home when it's genuinely close —
  // otherwise it's not "today", it's just what the Vaccinations screen is
  // for. Everything else about it (schedule, records) lives on Child.
  // This is the ONE reminder slot — it never competes with the two
  // recommendation cards below for space or attention.
  const ageDays = Math.floor(
    (Date.now() - new Date(`${child.date_of_birth}T00:00:00`).getTime()) / 86_400_000
  );
  const vaccinationDueSoon =
    nextVaccination && nextVaccination.age_days - ageDays <= 60 ? nextVaccination : null;
  const reminder = vaccinationDueSoon
    ? {
        title: vaccinationTitle(vaccinationDueSoon),
        body: `Due around ${vaccinationDueSoon.age_label}, worth booking ahead.`,
        onPress: () => router.push("/child/vaccinations"),
      }
    : null;

  // "For you" reuses the exact gating You's own hub uses — physical
  // recovery only for a mother within the postpartum window, "For dads"
  // only for a father, mental/sleep/feeding/relationships open to anyone.
  // The single highest-priority visible area wins the slot; which TOPIC
  // within it shows rotates by day so it isn't the same line forever.
  // This is always available (bridgesFor is a guaranteed fallback), so it
  // is always the first of the two curated recommendations.
  const careProfile = deriveProfile(ageMonths, authProfile);
  const careAreas = visibleCareAreas(careProfile.role, ageMonths, careProfile.delivery);
  const topCareArea = careAreas[0] ?? null;
  const careTopics = topCareArea ? topicsForProfile(careProfile.delivery, topCareArea.key) : [];
  const dayIndex = Math.floor(Date.now() / 86_400_000);
  const careTopic = careTopics.length > 0 ? careTopics[dayIndex % careTopics.length] : null;

  // The second recommendation: a stage-appropriate meal when there is
  // one, otherwise an outstanding milestone for this exact age band —
  // never both, and never neither if either is genuinely available.
  // Nothing is invented to fill this slot.
  const mealStage = stageForAgeMonths(ageMonths);
  const mealSlots = slotsForStage(mealStage);
  const mealSlot = mealSlots[0] ?? null;
  const mealIdea = mealSlot ? kidMealsFor(mealStage, mealSlot.key)[0] ?? null : null;
  const milestoneRecommendation =
    !mealIdea && nextMilestone
      ? {
          eyebrow: `WATCH FOR · ${DOMAIN_LABEL[nextMilestone.domain].toUpperCase()}`,
          title: nextMilestone.description,
          body: "Typical for this age. No rush, just something to notice.",
          onPress: () => router.push("/child/milestones"),
        }
      : null;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>
        <Animated.View
          style={{
            opacity: entrance,
            transform: [
              { translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) },
            ],
          }}
        >
          {/* Date orients the day; greeting and intro stay smaller than the
              activity title, which is the loudest thing on screen. */}
          <Text style={styles.dateLine}>{todayLabel()}</Text>
          <Text style={styles.greeting}>
            {greetingWord(new Date().getHours())}
            {parentName ? `, ${parentName.split(" ")[0]}` : ""}.
          </Text>
          <View style={styles.introRow}>
            <Text style={styles.familyIntro}>Today with your family.</Text>
            {age && (
              <View style={styles.stageChip}>
                <Text style={styles.stageChipText}>
                  {child.name} · {age.label}
                </Text>
              </View>
            )}
          </View>

          <SectionLabel first accent={colors.warmTaupe}>
            TODAY
          </SectionLabel>
          <TodayActivitiesPager kids={kids.length > 0 ? kids : [child]} activeChildId={child.id} guidedTour={guidedTour} />

          <CopilotHomeCard onPress={(prompt) => router.push(prompt ? `/ask?prompt=${encodeURIComponent(prompt)}` : "/ask")} />

          <SectionLabel accent="#5E7360">FOR YOU</SectionLabel>
          <ForYouCard
            childName={child.name}
            ageMonths={ageMonths}
            authProfile={authProfile}
            area={topCareArea}
            topic={careTopic}
          />

          {mealSlot && mealIdea ? (
            <>
              <SectionLabel accent={colors.softSand}>TOGETHER</SectionLabel>
              <MealIdeaCard
                slot={mealSlot}
                meal={mealIdea}
                onPress={() => router.push("/child/meals")}
              />
            </>
          ) : (
            milestoneRecommendation && (
              <>
                <SectionLabel accent={colors.softSand}>WORTH NOTICING</SectionLabel>
                <DiscoveryRow
                  eyebrow={milestoneRecommendation.eyebrow}
                  title={milestoneRecommendation.title}
                  body={milestoneRecommendation.body}
                  onPress={milestoneRecommendation.onPress}
                />
              </>
            )
          )}

          {reminder && (
            <>
              <SectionLabel accent={colors.softSand}>COMING UP</SectionLabel>
              <DiscoveryRow
                eyebrow="VACCINATION"
                title={reminder.title}
                body={reminder.body}
                onPress={reminder.onPress}
              />
            </>
          )}
        </Animated.View>
      </ScrollView>
      {showTourDone && (
        <View style={styles.tourDoneToast}>
          <Text style={styles.tourDoneTitle}>Welcome home.</Text>
          <Text style={styles.tourDoneBody}>Everything's ready for you and {child.name}.</Text>
        </View>
      )}
      <HomeCoachMark
        visible={coachVisible}
        step={coachStep}
        onNext={nextCoach}
        onSkip={closeCoach}
      />
      {guidedTour && (
        <GuidedTourDialog
          eyebrow="Home"
          focus="Your family, at a glance"
          title="Start here each day."
          body="What matters today for your family. Activities, discoveries, vaccinations, and support for you."
          step={0}
          total={5}
          primaryTitle="Continue"
          onPrimary={() => router.replace(`/community?guidedTour=1&step=1${tourNext}`)}
          onSkip={skipGuidedTour}
        />
      )}
    </View>
  );
}

const HOME_COACH = [
  {
    label: "Today's activities",
    title: "Start here.",
    body: "A few simple activities for today. Do one, do all, or come back later.",
  },
  {
    label: "Parenting companion",
    title: "Need help in the moment?",
    body: "Ask about sleep, feeding, routines, behaviour, or anything on your mind.",
  },
  {
    label: "Your child",
    title: "Your child's story builds here.",
    body: "Discoveries, memories, and progress collect gently over time.",
  },
];

/**
 * One child's "today" card — extracted so it can be mounted once per
 * child. Each instance owns its own useTodaysPlan/expand state, so
 * swiping between children never mixes up which activity is expanded
 * where.
 */
function ChildDayActivities({
  child,
  guidedTour,
  width,
}: {
  child: Child;
  guidedTour: boolean;
  width: number;
}) {
  const { plan, completed, complete, swap } = useTodaysPlan(child.id);
  const [expandedDomain, setExpandedDomain] = useState<Domain | null>(null);
  const [moreIdeasOpen, setMoreIdeasOpen] = useState(false);
  const cardOpacity = useRef(new Animated.Value(1)).current;

  const fadeSwap = useCallback(
    (domain: Domain, run: () => Promise<void>) => {
      Animated.timing(cardOpacity, { toValue: 0, duration: 140, useNativeDriver: true }).start(
        async () => {
          await run();
          Animated.timing(cardOpacity, {
            toValue: 1,
            duration: 220,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }).start();
        }
      );
    },
    [cardOpacity]
  );

  const age = computeAge(child.date_of_birth);
  const activities = plan?.activities ?? [];
  const allDone = activities.length > 0 && completed.length === activities.length;

  // Folds the four rows away the moment the last one is done — and on a
  // later visit, where the day is already finished. Tracked separately from
  // `allDone` so reopening the summary survives re-renders.
  const [dayCollapsed, setDayCollapsed] = useState(false);
  useEffect(() => {
    if (allDone) {
      setDayCollapsed(true);
      setExpandedDomain(null);
    }
  }, [allDone]);

  // The one activity Home leads with: the next undone activity in
  // orderDomains' order (see lib/todaysPlan.ts) -- exactly the hook that
  // order exists for. As recency signals get wired in there, this picks
  // up whichever domain most deserves attention today without this
  // screen needing to know why. The allDone fallback keeps the type
  // non-null; that branch is never reached once allDone is true, since
  // the surrounding render swaps to the finished-day view first.
  const featured = activities.find((a) => !completed.includes(a.domain)) ?? activities[0];
  const otherActivities = activities.filter((a) => a.domain !== featured?.domain);

  // Shared by the all-done recap below and the "More ideas" list: same
  // collapsed/expanded/done switch either way, just over a different
  // subset of `activities`.
  const renderActivityRow = (activity: (typeof activities)[number]) => {
    const isDone = completed.includes(activity.domain);

    // Expansion is checked before completion so a done activity can still
    // be reopened — see ActivityDoneRow.
    if (activity.domain === expandedDomain) {
      return (
        <Animated.View key={activity.domain} style={{ opacity: cardOpacity }}>
          <ActivityExpandedCard
            activity={activity}
            canSwap
            highlighted={guidedTour}
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
  };

  return (
    <View style={{ width }}>
      <View style={styles.childSection}>
        {/* Once there's nothing left to pick, "Pick one" is stale copy —
            the hero switches to acknowledging the day instead. */}
        <View style={styles.planHero}>
          <Text style={styles.planTitle}>
            {allDone ? "Nicely done today." : `A moment with ${child.name}.`}
          </Text>
          {/* "whenever it suits" rather than "for today" — the plan is valid
              whenever the parent opens the app, and the section label above
              already says TODAY. Opening at 9pm must not read as late. */}
          <Text style={styles.subline}>
            {allDone
              ? `You and ${child.name} got through all four.`
              : "One small idea, whenever it suits."}
          </Text>
        </View>

        {activities.length === 0 ? (
          <EmptyPlan childName={child.name} />
        ) : allDone && dayCollapsed ? (
          <EndOfDay childName={child.name} collapsed onToggle={() => setDayCollapsed(false)} />
        ) : allDone ? (
          // The moment the last activity is marked done, before the
          // collapse effect above folds this into the EndOfDay recap —
          // brief enough that it keeps the plain four-row view rather
          // than switching layouts out from under the parent mid-tap.
          <>
            <View style={styles.list}>{activities.map(renderActivityRow)}</View>

            <Text style={styles.safetyNote}>
              General guidance, not exact instructions, stay close, and skip whatever
              doesn&rsquo;t feel right for {child.name}.
            </Text>

            <EndOfDay
              childName={child.name}
              collapsed={false}
              onToggle={() => setDayCollapsed(true)}
            />
          </>
        ) : (
          <>
            {featured &&
              (featured.domain === expandedDomain ? (
                <Animated.View style={{ opacity: cardOpacity, marginTop: spacing.lg }}>
                  <ActivityExpandedCard
                    activity={featured}
                    canSwap
                    highlighted={guidedTour}
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
                <View style={styles.featuredWrap}>
                  <FeaturedActivityCard
                    activity={featured}
                    highlighted={guidedTour}
                    moreIdeasCount={otherActivities.length}
                    moreIdeasOpen={moreIdeasOpen}
                    onOpen={() => setExpandedDomain(featured.domain)}
                    onToggleMoreIdeas={() => setMoreIdeasOpen((v) => !v)}
                  />
                </View>
              ))}

            {otherActivities.length > 0 && moreIdeasOpen && (
              <View style={styles.list}>{otherActivities.map(renderActivityRow)}</View>
            )}

            <Text style={styles.safetyNote}>
              General guidance, not exact instructions, stay close, and skip whatever
              doesn&rsquo;t feel right for {child.name}.
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

/** Shown only when the plan genuinely has nothing for today — distinct
 *  from the loading and error states, which are handled a level up in
 *  Home itself. Never invents activities to fill the gap. */
function EmptyPlan({ childName }: { childName: string }) {
  return (
    <View style={styles.emptyPlanCard}>
      <Text style={styles.emptyPlanTitle}>Nothing planned for today.</Text>
      <Text style={styles.emptyPlanBody}>
        We don&rsquo;t have activities queued up for {childName} right now. This is usually
        temporary. Check back shortly, or look at Discoveries for what to try next.
      </Text>
    </View>
  );
}

/**
 * Wraps ChildDayActivities in a horizontal swipe pager once there's more
 * than one child — otherwise renders exactly the single card it always
 * has, so nothing changes for the common one-child case. Defaults to
 * whichever child is active elsewhere in the app (Child tab's switcher);
 * swiping here is just looking, it doesn't change that active child.
 *
 * Two things make the pager itself discoverable, since a single card
 * filling the screen gives no hint there's a second one:
 *  - each page is narrower than the screen so the next card visibly peeks
 *    in at the edge, always on;
 *  - a text hint names the next child explicitly, shown until the parent
 *    has actually swiped once (see lib/firstRun.ts), then never again.
 */
const PAGER_PEEK = 22;

function TodayActivitiesPager({
  kids,
  activeChildId,
  guidedTour,
}: {
  kids: Child[];
  activeChildId: string;
  guidedTour: boolean;
}) {
  const screenWidth = Dimensions.get("window").width;
  const cardWidth = screenWidth - spacing.lg * 2 - PAGER_PEEK;
  const pageWidth = cardWidth + spacing.sm;
  const initialIndex = Math.max(
    0,
    kids.findIndex((k) => k.id === activeChildId)
  );
  const scrollRef = useRef<ScrollView>(null);
  const [pageIndex, setPageIndex] = useState(initialIndex);
  const [hintSeen, setHintSeen] = useState(true); // default hidden until we know otherwise
  // A horizontal ScrollView stretches every page to match its tallest
  // sibling by default — fine when all children's cards run about the same
  // length, but a child whose day is done collapses to a short summary
  // while another's full four-item list stays tall, leaving dead space
  // under the short one. Measuring each page and sizing the container to
  // just the active one avoids that gap.
  const [pageHeights, setPageHeights] = useState<Record<string, number>>({});

  useEffect(() => {
    if (kids.length > 1) {
      hasSwipedActivityPager()
        .then((seen) => setHintSeen(seen))
        .catch(() => setHintSeen(true));
    }
  }, [kids.length]);

  if (kids.length <= 1) {
    const width = screenWidth - spacing.lg * 2;
    return <ChildDayActivities child={kids[0]} guidedTour={guidedTour} width={width} />;
  }

  const nextKid = kids[(pageIndex + 1) % kids.length];

  return (
    <View>
      {!hintSeen && (
        <Text style={styles.pagerHint}>Swipe for {nextKid.name}&rsquo;s activities →</Text>
      )}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        snapToInterval={pageWidth}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        contentOffset={{ x: initialIndex * pageWidth, y: 0 }}
        // Without this, the row's default stretch makes every page report
        // the SAME (tallest-sibling) height from onLayout below, which
        // would defeat the measurement — each page needs to size to its
        // own content first.
        contentContainerStyle={{ alignItems: "flex-start" }}
        style={
          pageHeights[kids[pageIndex]?.id] ? { height: pageHeights[kids[pageIndex].id] } : undefined
        }
        onScroll={(e) => {
          // Any real movement counts, not just a touch drag — trackpad/wheel
          // scrolling on web never fires onScrollBeginDrag, and would
          // otherwise leave the hint stuck forever for those parents.
          if (!hintSeen && e.nativeEvent.contentOffset.x > 4) {
            setHintSeen(true);
            void markSwipedActivityPager();
          }
          // Tracks the page live off scroll position rather than waiting for
          // onMomentumScrollEnd below — on real mobile Safari that event
          // doesn't reliably fire, which left pageIndex stuck on whichever
          // page loaded first. Since the container's height (see `style`
          // above) is keyed off pageIndex, a stuck index meant the page you
          // actually swiped to could render at the WRONG, smaller height and
          // clip its own activity list.
          const idx = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
          setPageIndex((prev) => (prev === idx ? prev : idx));
        }}
        scrollEventThrottle={32}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
          setPageIndex(idx);
        }}
      >
        {kids.map((kid, index) => (
          <View
            key={kid.id}
            style={{ width: pageWidth, paddingRight: index === kids.length - 1 ? 0 : spacing.sm }}
            onLayout={(e) => {
              const height = e.nativeEvent.layout.height;
              setPageHeights((prev) => (prev[kid.id] === height ? prev : { ...prev, [kid.id]: height }));
            }}
          >
            <ChildDayActivities
              child={kid}
              guidedTour={guidedTour && kid.id === activeChildId}
              width={cardWidth}
            />
          </View>
        ))}
      </ScrollView>
      <View style={styles.pagerDots}>
        {kids.map((kid, index) => (
          <View key={kid.id} style={[styles.pagerDot, index === pageIndex && styles.pagerDotActive]} />
        ))}
      </View>
    </View>
  );
}

function HomeCoachMark({
  visible,
  step,
  onNext,
  onSkip,
}: {
  visible: boolean;
  step: number;
  onNext: () => void;
  onSkip: () => void;
}) {
  const item = HOME_COACH[step];
  const isLast = step === HOME_COACH.length - 1;
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onSkip}>
      <View style={styles.coachScrim}>
        <View style={styles.coachCard}>
          <View style={styles.coachHeader}>
            <Text style={styles.coachLabel}>{item.label}</Text>
            <Pressable onPress={onSkip} hitSlop={10}>
              <Text style={styles.coachSkip}>Skip</Text>
            </Pressable>
          </View>
          <Text style={styles.coachTitle}>{item.title}</Text>
          <Text style={styles.coachBody}>{item.body}</Text>
          <View style={styles.coachDots}>
            {HOME_COACH.map((_, index) => (
              <View key={index} style={[styles.coachDot, index === step && styles.coachDotActive]} />
            ))}
          </View>
          <PrimaryButton title={isLast ? "Begin" : "Next"} tone="taupe" onPress={onNext} />
        </View>
      </View>
    </Modal>
  );
}

/** Acknowledgement, not celebration. No confetti, no "come back tomorrow". */
function DiscoveryRow({
  eyebrow,
  title,
  body,
  onPress,
}: {
  eyebrow: string;
  title: string;
  body: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.discoveryRow} onPress={onPress} accessibilityRole="button">
      <View style={styles.discoveryText}>
        <Text style={styles.discoveryEyebrow}>{eyebrow}</Text>
        <Text style={styles.discoveryRowTitle}>{title}</Text>
        <Text style={styles.discoveryRowBody}>{body}</Text>
      </View>
      <ChevronRight />
    </Pressable>
  );
}

function vaccinationTitle(vaccination: VaccinationScheduleItem): string {
  return vaccination.dose_label
    ? `${vaccination.vaccine_name} - ${vaccination.dose_label}`
    : vaccination.vaccine_name;
}

/** A quiet all-caps header marking a shift in who a section is for, with a
 *  small dot in the section's accent color so the shift also reads at a
 *  glance while scrolling, not just on close reading. */
function SectionLabel({
  children,
  first = false,
  accent,
}: {
  children: string;
  first?: boolean;
  accent: string;
}) {
  return (
    <View style={[styles.sectionLabelRow, first && styles.sectionLabelFirst]}>
      <View style={[styles.sectionDot, { backgroundColor: accent }]} />
      <Text style={styles.sectionLabel}>{children}</Text>
    </View>
  );
}

/**
 * The parent's own suggestion for today. When a Care area is genuinely
 * relevant right now (postpartum recovery for the mother, "For dads" for a
 * father, or one of the areas open to any parent) it shows one topic from
 * the highest-priority such area — the same gating You's own hub uses, so
 * nothing appears here that wouldn't also appear there. The topic rotates
 * by day rather than always being the first one, so the card doesn't go
 * stale for a parent who opens Home every morning.
 *
 * When there's nothing more specific to say, it falls back to the bridge:
 * today's actual activity becomes the reason for a small self-care
 * suggestion — "Tummy time → open your chest while you're down there".
 *
 * Tapping it goes to the You tab — an ordinary navigation, not a mode
 * switch.
 */
function ForYouCard({
  childName,
  ageMonths,
  authProfile,
  area,
  topic,
}: {
  childName: string;
  ageMonths: number;
  authProfile: Profile | null;
  area: { key: CareArea; label: string } | null;
  topic: CareTopic | null;
}) {
  const router = useRouter();
  const [showWhyThis, setShowWhyThis] = useState(false);

  if (area && topic) {
    return (
      <Pressable
        onPress={() => router.push(`/you/care?area=${area.key}`)}
        accessibilityRole="button"
        style={({ pressed }) => [styles.forYouCard, pressed && { opacity: 0.75 }]}
      >
        <Text style={styles.forYouEyebrow}>{area.label.toUpperCase()}</Text>
        <Text style={styles.forYouTitle}>{topic.title}</Text>
        <Text style={styles.forYouBody}>{topic.blurb}</Text>
        <Text style={styles.forYouLink}>{topic.minutes} min read →</Text>
        <Pressable onPress={(e) => { e.stopPropagation(); setShowWhyThis((v) => !v); }} hitSlop={6}>
          <Text style={styles.forYouWhyThis}>{showWhyThis ? "Hide" : "Why this?"}</Text>
        </Pressable>
        {showWhyThis && (
          <Text style={styles.forYouWhyThisText}>
            {area.label} is one of the areas most relevant to you right now, based on your role
            and {stageLabel(ageMonths)}.
          </Text>
        )}
      </Pressable>
    );
  }

  const bridge = bridgesFor(deriveProfile(ageMonths, authProfile))[0];
  return (
    <Pressable
      onPress={() => router.push("/you/today")}
      accessibilityRole="button"
      style={({ pressed }) => [styles.forYouCard, pressed && { opacity: 0.75 }]}
    >
      <Text style={styles.forYouEyebrow}>WHILE {childName.toUpperCase()} PLAYS</Text>
      <Text style={styles.forYouTitle}>{bridge.parentOffer}</Text>
      <Text style={styles.forYouBody}>{bridge.detail}</Text>
      <Text style={styles.forYouLink}>{bridge.minutes} min · in your space →</Text>
    </Pressable>
  );
}

/**
 * One meal idea for today, staged to the child's feeding age and framed as
 * shared time rather than a child-only task — cooking or feeding together
 * is the brief's own example of "together" content. Home decides whether
 * a stage-appropriate meal exists at all; this component only renders it.
 */
function MealIdeaCard({
  slot,
  meal,
  onPress,
}: {
  slot: { key: MealSlot; label: string; window: string };
  meal: KidMeal;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.mealIdeaCard, pressed && { opacity: 0.75 }]}
    >
      <Text style={styles.mealIdeaEyebrow}>{slot.window.toUpperCase()} · COOK TOGETHER</Text>
      <Text style={styles.mealIdeaTitle}>{meal.title}</Text>
      <Text style={styles.mealIdeaBody}>{meal.blurb}</Text>
      <Text style={styles.mealIdeaLink}>{meal.minutes} min · see the full plan →</Text>
    </Pressable>
  );
}

function CopilotHomeCard({ onPress }: { onPress: (prompt: string) => void }) {
  const [prompt, setPrompt] = useState("");
  const submit = () => onPress(prompt.trim());

  return (
    <View style={styles.copilotModule}>
      <Text style={styles.copilotEyebrow}>ASK</Text>
      <Text style={styles.copilotQuestion}>What would you like help with today?</Text>
      <View style={styles.copilotComposer}>
        <TextInput
          style={styles.copilotInput}
          value={prompt}
          onChangeText={setPrompt}
          placeholder="Sleep, feeding, or a tricky moment"
          placeholderTextColor={colors.textMuted}
          returnKeyType="send"
          onSubmitEditing={submit}
        />
        <Pressable
          style={styles.copilotAskButton}
          onPress={submit}
          accessibilityRole="button"
          accessibilityLabel="Ask"
        >
          <Text style={styles.copilotAskText}>Ask</Text>
        </Pressable>
      </View>
    </View>
  );
}

function BasketIcon() {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 9h16l-1.4 9.2a2 2 0 0 1-2 1.8H7.4a2 2 0 0 1-2-1.8L4 9Zm4.5 0L11 4m4.5 5L13 4"
        stroke={colors.textMuted}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ChevronRight() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 5l7 7-7 7"
        stroke={colors.textMuted}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  inner: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  loadingInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  loading: {
    ...type.body,
    color: colors.textMuted,
    textAlign: "center",
  },
  stuckReload: {
    width: "100%",
    maxWidth: 280,
    marginTop: spacing.sm,
  },

  // Header — stepped down so the activity title is the largest text here.
  dateLine: {
    ...type.meta,
    color: colors.textMuted,
    marginBottom: 2,
  },
  greeting: {
    ...type.label,
    color: colors.charcoal,
  },
  introRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: 2,
  },
  familyIntro: {
    ...type.serif,
    color: colors.charcoal,
  },
  stageChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: "rgba(137, 116, 91, 0.1)",
  },
  stageChipText: {
    ...type.meta,
    color: colors.warmTaupe,
  },

  // A quiet colored dot in front of each eyebrow, so the shift between
  // "for your child" / "for you" / "together" reads at a glance while
  // scrolling, not just on close reading.
  sectionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: spacing.xxl,
    marginBottom: spacing.sm,
  },
  sectionLabelFirst: {
    marginTop: spacing.xl,
  },
  sectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  sectionLabel: {
    ...type.eyebrow,
    color: colors.warmTaupe,
  },

  // The primary block: today's activities live inside a gently tinted
  // card, so it reads as one elevated "today" surface rather than text
  // sitting loose on the page background — the loudest thing on screen,
  // by container as well as by type size.
  childSection: {
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: "rgba(137, 116, 91, 0.05)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(96, 79, 60, 0.08)",
  },
  planHero: { paddingHorizontal: spacing.xs },
  planTitle: {
    ...type.display,
    color: colors.charcoal,
    marginTop: spacing.xs,
  },
  subline: {
    ...type.lead,
    color: colors.textMuted,
    marginTop: 6,
  },


  list: {
    marginTop: spacing.lg,
  },
  featuredWrap: {
    marginTop: spacing.lg,
  },
  // A real bordered pill rather than a text link — the previous plain
  // "More ideas →" line read as ambient copy, not something to tap.
  pagerHint: {
    ...type.meta,
    color: colors.warmTaupe,
    marginBottom: spacing.sm,
  },
  pagerDots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: spacing.sm,
  },
  pagerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(96, 79, 60, 0.18)",
  },
  pagerDotActive: {
    backgroundColor: colors.warmTaupe,
  },

  safetyNote: {
    ...type.meta,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  emptyPlanCard: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(96, 79, 60, 0.1)",
  },
  emptyPlanTitle: {
    ...type.title,
    color: colors.charcoal,
  },
  emptyPlanBody: {
    ...type.body,
    color: colors.textMuted,
    marginTop: 4,
  },
  askRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  askText: { flexShrink: 1 },
  askTitle: {
    ...type.label,
    color: colors.charcoal,
  },
  askSub: {
    ...type.meta,
    color: colors.textMuted,
    marginTop: 2,
  },
  // Carries a hint of Parent Mode's eucalyptus into Child Mode, so the card
  // looks like it belongs to somewhere else before you tap it.
  forYouCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: "rgba(94, 115, 96, 0.08)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(60, 80, 62, 0.16)",
    shadowColor: "#3C503E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 1,
  },
  forYouEyebrow: {
    ...type.eyebrow,
    color: "#5E7360",
  },
  forYouTitle: {
    ...type.title,
    color: colors.charcoal,
    marginTop: 6,
  },
  forYouBody: {
    ...type.body,
    color: colors.textMuted,
    marginTop: 6,
  },
  forYouLink: {
    ...type.label,
    color: "#5E7360",
    marginTop: spacing.md,
  },
  forYouWhyThis: {
    ...type.meta,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  forYouWhyThisText: {
    ...type.meta,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  mealIdeaCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: "rgba(201, 165, 142, 0.16)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(150, 110, 70, 0.16)",
    shadowColor: colors.charcoal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 1,
  },
  mealIdeaEyebrow: {
    ...type.eyebrow,
    color: colors.warmTaupe,
  },
  mealIdeaTitle: {
    ...type.title,
    color: colors.charcoal,
    marginTop: 6,
  },
  mealIdeaBody: {
    ...type.body,
    color: colors.textMuted,
    marginTop: 6,
  },
  mealIdeaLink: {
    ...type.label,
    color: colors.warmTaupe,
    marginTop: spacing.md,
  },
  copilotModule: {
    marginTop: spacing.xxl,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: "rgba(139, 116, 91, 0.11)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(96, 79, 60, 0.12)",
  },
  copilotEyebrow: {
    ...type.eyebrow,
    color: colors.warmTaupe,
  },
  copilotQuestion: {
    ...type.serif,
    color: colors.charcoal,
    marginTop: spacing.xs,
  },
  copilotComposer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  copilotInput: {
    flex: 1,
    minHeight: 40,
    paddingHorizontal: spacing.sm,
    ...type.body,
    color: colors.charcoal,
  },
  copilotAskButton: {
    minHeight: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.warmTaupe,
  },
  copilotAskText: {
    ...type.label,
    color: colors.white,
  },
  discoveryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(96, 79, 60, 0.1)",
  },
  discoveryText: { flex: 1 },
  discoveryEyebrow: {
    ...type.eyebrow,
    color: colors.warmTaupe,
    marginBottom: 2,
  },
  discoveryRowTitle: {
    ...type.label,
    color: colors.charcoal,
  },
  // `meta`, not `body`: in a compact row the title is only `label` size,
  // so a 13px description sits at the same size as its own heading and
  // flattens the pair. Dropping to meta restores the contrast and keeps
  // these one-liners from wrapping.
  discoveryRowBody: {
    ...type.meta,
    color: colors.textMuted,
    marginTop: 3,
  },
  coachScrim: {
    flex: 1,
    justifyContent: "flex-end",
    padding: spacing.lg,
    backgroundColor: "rgba(44, 44, 44, 0.32)",
  },
  coachCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  coachHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  coachLabel: {
    ...type.eyebrow,
    color: colors.warmTaupe,
  },
  coachSkip: {
    ...type.label,
    color: colors.textMuted,
  },
  coachTitle: {
    ...type.title,
    color: colors.charcoal,
  },
  coachBody: {
    ...type.body,
    color: colors.textMuted,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  coachDots: {
    flexDirection: "row",
    gap: 6,
    marginBottom: spacing.md,
  },
  coachDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  coachDotActive: {
    width: 20,
    backgroundColor: colors.warmTaupe,
  },
  tourDoneToast: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    top: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.charcoal,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 22,
    elevation: 5,
  },
  tourDoneTitle: {
    ...type.label,
    color: colors.charcoal,
  },
  tourDoneBody: {
    ...type.body,
    color: colors.textMuted,
    marginTop: 2,
  },
});
