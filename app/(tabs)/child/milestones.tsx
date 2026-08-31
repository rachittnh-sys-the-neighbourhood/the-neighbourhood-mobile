import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  LayoutAnimation,
  Platform,
  UIManager,
  KeyboardAvoidingView,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { GhostButton, PrimaryButton } from "../../../components/ui";
import { useAuth } from "../../../lib/AuthProvider";
import {
  canShowMilestones,
  developmentalAge,
  isBeyondMilestoneRange,
  MILESTONES_START_MONTHS,
} from "../../../lib/childAge";
import * as growth from "../../../lib/db/growth";
import * as plans from "../../../lib/db/plans";
import {
  ACTIVITY_LIBRARY_AGE_BANDS,
  AGE_BAND_LABEL,
  DOMAIN_LABEL,
  DOMAINS,
  type Activity,
  type DailyPlan,
  type Milestone,
  type Domain,
} from "../../../lib/db/types";
import { EMAIL_OTP_READY } from "../../../lib/authMode";
import { markFirstRunComplete, markHomeCoachComplete } from "../../../lib/firstRun";
import { hasAskedToSecure, markAskedToSecure } from "../../../lib/secureAccountPrompt";
import { colors, fonts, radius, spacing, typeScale } from "../../../lib/theme";

// Enable LayoutAnimation for Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Matches the 28 age bands milestones are now seeded at (see
// supabase/migrations/20260830080500_milestones_batch_00.sql onward) —
// finer-grained than the old 9 yearly-ish stages, out to 7 years.
const STAGE_ORDER = ACTIVITY_LIBRARY_AGE_BANDS.map((band) => AGE_BAND_LABEL[band]);

type InitialPhase = "check" | "celebrate" | "recommendations";

/** "m7_9" -> 9. "y3_0" -> 39 (a y-band is a 3-month window starting at its
 *  years/months point, so the upper bound is start + 3). Mirrors
 *  scripts/gen-activity-library-seed.mjs's parseAgeBand. */
function ageBandUpperBoundMonths(band: string): number {
  const monthsMatch = band.match(/^m(\d+)_(\d+)$/);
  if (monthsMatch) return Number(monthsMatch[2]);
  const yearsMatch = band.match(/^y(\d+)_(\d+)$/);
  if (yearsMatch) return Number(yearsMatch[1]) * 12 + Number(yearsMatch[2]) + 3;
  throw new Error(`cannot parse age band "${band}"`);
}

function getStageLabelForAge(months: number): string {
  for (const band of ACTIVITY_LIBRARY_AGE_BANDS) {
    if (months <= ageBandUpperBoundMonths(band)) return AGE_BAND_LABEL[band];
  }
  return AGE_BAND_LABEL[ACTIVITY_LIBRARY_AGE_BANDS[ACTIVITY_LIBRARY_AGE_BANDS.length - 1]];
}

function getNextStageLabel(currentLabel: string): string | null {
  const idx = STAGE_ORDER.indexOf(currentLabel);
  if (idx !== -1 && idx < STAGE_ORDER.length - 1) {
    return STAGE_ORDER[idx + 1];
  }
  return null;
}

export default function Milestones() {
  const router = useRouter();
  const params = useLocalSearchParams<{ afterTour?: string; initial?: string }>();
  const { child, accountLinked } = useAuth();
  const initialCheck = params.initial === "1";
  const afterTour = params.afterTour === "1";
  const [initialPhase, setInitialPhase] = useState<InitialPhase>("check");
  const [initialTransition, setInitialTransition] = useState(false);
  const [recommendationPlan, setRecommendationPlan] = useState<DailyPlan | null>(null);
  const [recommendationLoading, setRecommendationLoading] = useState(false);
  const [recommendationError, setRecommendationError] = useState(false);
  const [allMilestones, setAllMilestones] = useState<Milestone[]>([]);
  const [achievedMap, setAchievedMap] = useState<Map<string, { note: string | null; achieved_at: string }>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // UI States
  const [activeTab, setActiveTab] = useState<"journey" | "explore">("journey");
  const [selectedExploreStage, setSelectedExploreStage] = useState<string>("");
  const [expandedMilestoneId, setExpandedMilestoneId] = useState<string | null>(null);
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null);
  const [showSecurePrompt, setShowSecurePrompt] = useState(false);
  // Which "initial check" cards have their "Not yet" guidance open — kept
  // separate from achievedMap since opening it is just looking, not a fact
  // about the child.
  const [notYetOpenIds, setNotYetOpenIds] = useState<Set<string>>(new Set());
  const toggleNotYetOpen = (id: string) => {
    setNotYetOpenIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Corrected where prematurity applies — this whole screen is a
  // developmental question, so which stage is "current" has to follow
  // corrected age or a preterm child is measured against a timeline that
  // was never theirs. See lib/childAge.ts developmentalAge.
  const devAge = developmentalAge(child);
  const ageMonths = devAge?.totalMonths ?? 0;
  const usingCorrectedAge = devAge?.corrected ?? false;
  const milestonesAvailable = canShowMilestones(ageMonths);
  const beyondRange = isBeyondMilestoneRange(ageMonths);
  const currentStage = getStageLabelForAge(ageMonths);
  const nextStage = getNextStageLabel(currentStage);

  const load = useCallback(async () => {
    if (!child) return;
    if (!milestonesAvailable) {
      setAllMilestones([]);
      setAchievedMap(new Map());
      setSelectedExploreStage(`${MILESTONES_START_MONTHS}+ months`);
      setLoading(false);
      setError(false);
      return;
    }
    setLoading(true);
    setError(false);
    try {
      const [library, marked] = await Promise.all([
        initialCheck ? growth.getMilestonesForAge(ageMonths, 6) : growth.getAllMilestones(),
        growth.getAchievedMilestones(child.id),
      ]);
      setAllMilestones(library);
      
      const aMap = new Map();
      marked.forEach((m) => {
        aMap.set(m.milestone_id, { note: m.note, achieved_at: m.achieved_at });
      });
      setAchievedMap(aMap);

      if (!selectedExploreStage) {
        setSelectedExploreStage(currentStage);
      }
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [child, currentStage, selectedExploreStage, initialCheck, ageMonths, milestonesAvailable]);

  useEffect(() => {
    void load();
  }, [load]);

  // If this is the initial onboarding check and milestones aren't available yet
  // (child under 3 months), skip the milestone screen entirely and go straight
  // to the next step in the onboarding flow.
  useEffect(() => {
    if (!loading && initialCheck && !milestonesAvailable) {
      void Promise.all([markHomeCoachComplete(), markFirstRunComplete()]).catch(() => {});
      router.replace(afterTour ? "/home?tourComplete=1" : "/home?guidedTour=1&step=0");
    }
  }, [loading, initialCheck, milestonesAvailable, afterTour, router]);

  const toggleMilestone = async (milestone: Milestone, forceAchieved = false, customNote?: string | null) => {
    if (!child) return;
    
    const wasAchieved = achievedMap.has(milestone.id);
    const shouldBeAchieved = forceAchieved || !wasAchieved;

    // Local state backup for rollback
    const prevMap = new Map(achievedMap);

    // Apply LayoutAnimation for smooth transition
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    setAchievedMap((prev) => {
      const next = new Map(prev);
      if (shouldBeAchieved) {
        const existing = prev.get(milestone.id);
        next.set(milestone.id, {
          note: customNote !== undefined ? customNote : (existing?.note ?? null),
          achieved_at: existing?.achieved_at ?? new Date().toISOString().split("T")[0],
        });
      } else {
        next.delete(milestone.id);
      }
      return next;
    });

    try {
      if (shouldBeAchieved) {
        await growth.markMilestoneAchieved({
          childId: child.id,
          milestoneId: milestone.id,
          note: customNote !== undefined ? customNote : (achievedMap.get(milestone.id)?.note ?? null),
        });
      } else {
        await growth.unmarkMilestone(child.id, milestone.id);
      }
    } catch {
      // Rollback on failure
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setAchievedMap(prevMap);
      return;
    }

    // The parent has just recorded something they'd be upset to lose, and
    // on an unlinked account it currently would be. This is the one honest
    // moment to ask for an email — after the value exists, not before.
    // Only on a genuine save, only once ever, and never mid-onboarding.
    if (EMAIL_OTP_READY && shouldBeAchieved && !wasAchieved && !accountLinked && !initialCheck) {
      if (!(await hasAskedToSecure())) {
        await markAskedToSecure();
        setShowSecurePrompt(true);
      }
    }
  };

  const handleSaveNote = async (milestone: Milestone, noteText: string) => {
    if (!child) return;
    setSavingNoteId(milestone.id);
    try {
      await toggleMilestone(milestone, true, noteText);
    } finally {
      setSavingNoteId(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.warmTaupe} size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <EmptyState
        title="We couldn't load milestones."
        body="Check your connection and try again. Nothing you've marked is lost."
      />
    );
  }

  const beginGuidedTour = () => {
    setInitialTransition(true);
    setTimeout(() => router.replace("/home?guidedTour=1&step=0"), 650);
  };

  const finishOnboarding = async () => {
    setInitialTransition(true);
    await Promise.all([markHomeCoachComplete(), markFirstRunComplete()]).catch(() => {});
    router.replace("/home?tourComplete=1");
  };

  const skipProductTour = async () => {
    setInitialTransition(true);
    await Promise.all([markHomeCoachComplete(), markFirstRunComplete()]).catch(() => {});
    router.replace("/home");
  };

  const prepareRecommendations = async () => {
    if (!child) return;
    setRecommendationLoading(true);
    setRecommendationError(false);
    try {
      setRecommendationPlan(await plans.getTodaysPlan(child.id));
    } catch {
      setRecommendationError(true);
    } finally {
      setRecommendationLoading(false);
    }
  };

  // Derived milestones lists
  const currentStageMilestones = allMilestones.filter((m) => m.stage_label === currentStage);
  const nextStageMilestones = nextStage ? allMilestones.filter((m) => m.stage_label === nextStage) : [];

  const focusMilestones = currentStageMilestones.filter((m) => !achievedMap.has(m.id));
  const recentlyAchieved = allMilestones
    .filter((m) => achievedMap.has(m.id))
    .map((m) => ({
      ...m,
      achievedDetails: achievedMap.get(m.id),
    }))
    .sort((a, b) => {
      const dateA = a.achievedDetails?.achieved_at ?? "";
      const dateB = b.achievedDetails?.achieved_at ?? "";
      return dateB.localeCompare(dateA); // Sort latest first
    });

  const exploreStageMilestones = allMilestones.filter((m) => m.stage_label === selectedExploreStage);
  const exploreGroups = exploreStageMilestones.reduce<Record<string, Milestone[]>>((acc, m) => {
    (acc[m.domain] ??= []).push(m);
    return acc;
  }, {});

  const totalAchievedCount = achievedMap.size;

  // Children under 3 months: handled by the auto-navigation useEffect above.
  // Nothing to render here — the effect redirects before this point is reached.

  if (initialCheck && initialPhase === "celebrate") {
    const stageCount = currentStageMilestones.filter((milestone) => achievedMap.has(milestone.id)).length;

    return (
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
      >
        <ScrollView contentContainerStyle={styles.celebrationContent}>
          <View style={styles.celebrationMark}>
            <CheckIcon />
          </View>
          <Text style={styles.initialEyebrow}>A beautiful beginning</Text>
          <Text style={styles.initialCelebrationTitle}>
            Look how much {child?.name ?? "your little one"} has already discovered.
          </Text>
          <Text style={styles.initialCelebrationBody}>
            Every moment you noticed is part of a bigger story. There is no right number to reach, and no pressure to mark everything today.
          </Text>

          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Moments celebrated</Text>
              <Text style={styles.summaryValue}>{stageCount}</Text>
            </View>
            <View style={styles.summaryRule} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Current stage</Text>
              <Text style={styles.summaryValue}>{currentStage}</Text>
            </View>
          </View>

          <Text style={styles.celebrationNote}>
            We've used this starting point to prepare a few simple activities for today. You can update milestones anytime.
          </Text>
        </ScrollView>
        <View style={styles.initialFooter}>
          <PrimaryButton
            tone="accent"
            title={initialTransition ? "Opening your Neighbourhood..." : "See today's recommendations"}
            onPress={finishOnboarding}
            disabled={initialTransition}
          />
        </View>
      </KeyboardAvoidingView>
    );
  }

  if (initialCheck && initialPhase === "recommendations") {
    const recommendationActivities = recommendationPlan?.activities.slice(0, 3) ?? [];

    return (
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
      >
        <ScrollView contentContainerStyle={styles.recommendationContent}>
          <Text style={styles.initialEyebrow}>Made for your family</Text>
          <Text style={styles.initialTitle}>A gentle plan for {child?.name ?? "your child"}.</Text>
          <Text style={styles.initialBody}>
            Today's ideas are shaped around their age, current stage, and the moments you've already noticed.
          </Text>

          {recommendationLoading ? (
            <View style={styles.recommendationLoading}>
              <ActivityIndicator color={colors.warmTaupe} />
              <Text style={styles.smallMuted}>Choosing a few lovely ways to play and connect.</Text>
            </View>
          ) : recommendationActivities.length > 0 ? (
            <View style={styles.recommendationList}>
              {recommendationActivities.map((activity) => (
                <RecommendationCard key={activity.id} activity={activity} />
              ))}
            </View>
          ) : (
            <View style={styles.initialEmpty}>
              <Text style={styles.initialEmptyText}>
                Your personalized plan will be ready on Home. We'll keep it simple and age-appropriate.
              </Text>
            </View>
          )}

          {recommendationError && (
            <Text style={styles.recommendationError}>We'll finish preparing the plan when Home opens.</Text>
          )}
        </ScrollView>
        <View style={styles.initialFooter}>
          <PrimaryButton
            tone="accent"
            title={
              initialTransition
                ? "Opening your Neighbourhood..."
                : afterTour
                  ? "Go to Home"
                  : "Take a quick tour"
            }
            onPress={afterTour ? finishOnboarding : beginGuidedTour}
            disabled={initialTransition || recommendationLoading}
          />
          {!afterTour && !initialTransition && (
            <GhostButton title="Skip the tour" onPress={skipProductTour} />
          )}
        </View>
      </KeyboardAvoidingView>
    );
  }

  if (initialCheck) {
    const initialGroups = DOMAINS.map((domain) => ({
      domain,
      items: currentStageMilestones.filter((milestone) => milestone.domain === domain).slice(0, 2),
    })).filter((group) => group.items.length > 0);

    return (
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
      >
        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.initialContent}>
          <Text style={styles.initialEyebrow}>A gentle beginning</Text>
          <Text style={styles.initialTitle}>Where is {child?.name ?? "your child"} today?</Text>
          <Text style={styles.initialBody}>
            Tell us what you've noticed. There's no pass or fail here, just a starting point.
          </Text>
          <Text style={styles.initialAgeNote}>
            {beyondRange
              ? "Discovery tracking here covers birth to 7 years. Nothing further to check for now."
              : `Showing a few discoveries for the ${currentStage} stage.`}
          </Text>

          {beyondRange ? null : initialGroups.length > 0 ? (
            initialGroups.map(({ domain, items }) => (
              <View key={domain} style={styles.initialGroup}>
                <Text style={styles.initialGroupTitle}>{DOMAIN_LABEL[domain]}</Text>
                {items.map((milestone) => {
                  const isAchieved = achievedMap.has(milestone.id);
                  const notYetOpen = notYetOpenIds.has(milestone.id);
                  const guide = milestone.guide;
                  return (
                    <View
                      key={milestone.id}
                      style={[styles.initialMilestoneCard, isAchieved && styles.initialMilestoneCardOn]}
                    >
                      <Text style={styles.initialMilestoneText}>{milestone.description}</Text>
                      <View style={styles.initialMilestoneActions}>
                        <Pressable
                          onPress={() => toggleMilestone(milestone)}
                          style={[styles.initialMilestoneButton, isAchieved && styles.initialMilestoneButtonOn]}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: isAchieved }}
                        >
                          {isAchieved && <CheckIcon />}
                          <Text
                            style={[
                              styles.initialMilestoneButtonText,
                              isAchieved && styles.initialMilestoneButtonTextOn,
                            ]}
                          >
                            {isAchieved ? "Noticed" : "I've noticed this"}
                          </Text>
                        </Pressable>
                        {!isAchieved && (
                          <Pressable
                            onPress={() => toggleNotYetOpen(milestone.id)}
                            style={[styles.initialGhostButton, notYetOpen && styles.initialGhostButtonOn]}
                          >
                            <Text style={styles.initialGhostButtonText}>
                              {notYetOpen ? "Hide" : "Not yet"}
                            </Text>
                          </Pressable>
                        )}
                      </View>

                      {!isAchieved && notYetOpen && (
                        <View style={styles.initialNotYetPanel}>
                          <Text style={styles.initialNotYetIntro}>
                            Completely normal. Here's a little to go on.
                          </Text>
                          {guide?.try && (
                            <View style={styles.initialNotYetRow}>
                              <Text style={styles.initialNotYetLabel}>TRY</Text>
                              <Text style={styles.initialNotYetText}>{guide.try}</Text>
                            </View>
                          )}
                          {guide?.watch && (
                            <View style={styles.initialNotYetRow}>
                              <Text style={styles.initialNotYetLabel}>KEEP AN EYE ON</Text>
                              <Text style={styles.initialNotYetText}>{guide.watch}</Text>
                            </View>
                          )}
                          {guide?.see && (
                            <View style={styles.initialNotYetRow}>
                              <Text style={styles.initialNotYetLabel}>WORTH A CHAT WITH YOUR PAEDIATRICIAN IF</Text>
                              <Text style={styles.initialNotYetText}>{guide.see}</Text>
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            ))
          ) : (
            <View style={styles.initialEmpty}>
              <Text style={styles.initialEmptyText}>We'll keep learning alongside your family.</Text>
            </View>
          )}

          <Text style={styles.initialReassurance}>
            Every child develops at their own pace. You can update these moments anytime in Discoveries.
          </Text>
        </ScrollView>
        <View style={styles.initialFooter}>
          <PrimaryButton
            tone="accent"
            title="Continue"
            onPress={() => setInitialPhase("celebrate")}
          />
          <GhostButton title="Skip for now" onPress={() => setInitialPhase("celebrate")} />
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
    >
      {/* Editorial Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Discoveries</Text>
        <Text style={styles.headerSubtitle}>
          {child
            ? milestonesAvailable
              ? beyondRange
                ? `${child.name} has grown past what we track here.`
                : devAge
                  ? `${child.name} · ${devAge.label}`
                  : child.name
              : `${child.name}'s discoveries start at 3 months.`
            : "Your child's developmental journey."}
        </Text>

        {usingCorrectedAge && child && (
          <Text style={styles.correctedNote}>
            Matched to {child.name}&rsquo;s corrected age ({devAge!.label})because they arrived{" "}
            {devAge!.correctionWeeks} weeks early.
          </Text>
        )}

        {/* scrap-book styling for total progress */}
        <View style={styles.progressBanner}>
          <Text style={styles.progressText}>
            You have celebrated <Text style={styles.progressTextHighlight}>{totalAchievedCount} moments</Text> of growth.
          </Text>
        </View>

        <Pressable
          onPress={() =>
            router.push({
              pathname: "/ask",
              params: { mode: "child", topic: "Discoveries" },
            })
          }
          accessibilityRole="button"
          style={({ pressed }) => [styles.askAboutRow, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.askAboutText}>Ask about discoveries →</Text>
        </Pressable>
      </View>

      {/* Premium Segmented Controls */}
      {milestonesAvailable && (
        <View style={styles.tabContainer}>
          <Pressable
            style={[styles.tabButton, activeTab === "journey" && styles.tabButtonActive]}
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setActiveTab("journey");
            }}
          >
            <Text style={[styles.tabButtonText, activeTab === "journey" && styles.tabButtonTextActive]}>
              Active Journey
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tabButton, activeTab === "explore" && styles.tabButtonActive]}
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setActiveTab("explore");
            }}
          >
            <Text style={[styles.tabButtonText, activeTab === "explore" && styles.tabButtonTextActive]}>
              Explore Library
            </Text>
          </Pressable>
        </View>
      )}

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        {!milestonesAvailable ? (
          <View style={styles.notYetCard}>
            <Text style={styles.notYetTitle}>So much is happening already. Just notice.</Text>
            <Text style={styles.notYetBody}>
              The first three months are full of rapid growth and change. From 3 months,
              we&rsquo;ll help you notice the little things that start to emerge: new
              movements, sounds, connections and moments worth remembering.
            </Text>
            <Text style={styles.notYetBody}>
              Until then, find{" "}
              <Text style={styles.notYetLink} onPress={() => router.push("/home")}>
                simple, newborn-friendly ideas
              </Text>{" "}
              or learn more in{" "}
              <Text style={styles.notYetLink} onPress={() => router.push("/child")}>
                the Child section
              </Text>
              .
            </Text>
          </View>
        ) : activeTab === "journey" ? (
          <View>
            {/* FOCUS RIGHT NOW */}
            <View style={styles.sectionHeaderWrap}>
              <Text style={styles.sectionTitle}>Focus Right Now</Text>
              <Text style={styles.sectionSub}>Discoveries that typically blossom at this stage.</Text>
            </View>

            {focusMilestones.length === 0 ? (
              <View style={styles.celebrationCard}>
                <Text style={styles.celebrationEmoji}>🎉</Text>
                <Text style={styles.celebrationTitle}>All Focus Discoveries Noticed!</Text>
                <Text style={styles.celebrationBody}>
                  {child?.name ?? "Your child"} has checked off every discovery for this stage. Keep exploring and enjoying the journey.
                </Text>
              </View>
            ) : (
              focusMilestones.map((milestone) => (
                <MilestoneCard
                  key={milestone.id}
                  milestone={milestone}
                  isAchieved={false}
                  achievedNote={null}
                  isExpanded={expandedMilestoneId === milestone.id}
                  onToggleExpand={() => {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setExpandedMilestoneId(expandedMilestoneId === milestone.id ? null : milestone.id);
                  }}
                  onToggleAchieved={() => toggleMilestone(milestone)}
                  onSaveNote={(note) => handleSaveNote(milestone, note)}
                  savingNote={savingNoteId === milestone.id}
                />
              ))
            )}

            {/* COMING SOON */}
            {nextStageMilestones.length > 0 && (
              <View style={styles.marginTopLg}>
                <View style={styles.sectionHeaderWrap}>
                  <Text style={styles.sectionTitle}>Coming Soon</Text>
                  <Text style={styles.sectionSub}>A gentle preview of the next developmental stage ({nextStage}).</Text>
                </View>
                {nextStageMilestones.slice(0, 3).map((milestone) => (
                  <MilestoneCard
                    key={milestone.id}
                    milestone={milestone}
                    isAchieved={false}
                    achievedNote={null}
                    isExpanded={expandedMilestoneId === milestone.id}
                    onToggleExpand={() => {
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                      setExpandedMilestoneId(expandedMilestoneId === milestone.id ? null : milestone.id);
                    }}
                    onToggleAchieved={() => toggleMilestone(milestone)}
                    onSaveNote={(note) => handleSaveNote(milestone, note)}
                    savingNote={savingNoteId === milestone.id}
                    comingSoon
                  />
                ))}
              </View>
            )}

            {/* RECENTLY ACHIEVED MEMORIES */}
            {recentlyAchieved.length > 0 && (
              <View style={styles.marginTopLg}>
                <View style={styles.sectionHeaderWrap}>
                  <Text style={styles.sectionTitle}>Journey Journal</Text>
                  <Text style={styles.sectionSub}>Beautiful memories and discoveries logged so far.</Text>
                </View>
                {recentlyAchieved.map((milestone) => (
                  <MilestoneCard
                    key={milestone.id}
                    milestone={milestone}
                    isAchieved={true}
                    achievedNote={milestone.achievedDetails?.note ?? ""}
                    isExpanded={expandedMilestoneId === milestone.id}
                    onToggleExpand={() => {
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                      setExpandedMilestoneId(expandedMilestoneId === milestone.id ? null : milestone.id);
                    }}
                    onToggleAchieved={() => toggleMilestone(milestone)}
                    onSaveNote={(note) => handleSaveNote(milestone, note)}
                    savingNote={savingNoteId === milestone.id}
                  />
                ))}
              </View>
            )}
          </View>
        ) : (
          /* EXPLORE ALL LIBRARY VIEW */
          <View>
            {/* Horizontal Stage Selectors */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.stageFilterScroll}
              contentContainerStyle={styles.stageFilterContent}
            >
              {STAGE_ORDER.map((stage) => {
                const isSelected = selectedExploreStage === stage;
                const isCurrent = stage === currentStage;
                return (
                  <Pressable
                    key={stage}
                    onPress={() => {
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                      setSelectedExploreStage(stage);
                    }}
                    style={[
                      styles.stageChip,
                      isSelected && styles.stageChipSelected,
                      isCurrent && !isSelected && styles.stageChipCurrent,
                    ]}
                  >
                    <Text
                      style={[
                        styles.stageChipText,
                        isSelected && styles.stageChipTextSelected,
                        isCurrent && !isSelected && styles.stageChipTextCurrent,
                      ]}
                    >
                      {stage}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Grouped by Domain */}
            {Object.keys(exploreGroups).length === 0 ? (
              <Text style={styles.emptyStageText}>No milestones loaded for this stage.</Text>
            ) : (
              Object.entries(exploreGroups).map(([domain, items]) => (
                <View key={domain} style={styles.domainGroup}>
                  <Text style={styles.domainGroupTitle}>{DOMAIN_LABEL[domain as Domain].toUpperCase()}</Text>
                  {items.map((milestone) => {
                    const isAchieved = achievedMap.has(milestone.id);
                    const achievedDetails = achievedMap.get(milestone.id);
                    return (
                      <MilestoneCard
                        key={milestone.id}
                        milestone={milestone}
                        isAchieved={isAchieved}
                        achievedNote={achievedDetails?.note ?? null}
                        isExpanded={expandedMilestoneId === milestone.id}
                        onToggleExpand={() => {
                          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                          setExpandedMilestoneId(expandedMilestoneId === milestone.id ? null : milestone.id);
                        }}
                        onToggleAchieved={() => toggleMilestone(milestone)}
                        onSaveNote={(note) => handleSaveNote(milestone, note)}
                        savingNote={savingNoteId === milestone.id}
                      />
                    );
                  })}
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
      <SecureAccountPrompt
        visible={showSecurePrompt}
        childName={child?.name ?? "your child"}
        onDismiss={() => setShowSecurePrompt(false)}
        onConfirm={() => {
          setShowSecurePrompt(false);
          router.push("/secure-account");
        }}
      />
    </KeyboardAvoidingView>
  );
}

/**
 * Shown once, straight after a parent marks their first milestone.
 *
 * It celebrates first and asks second — the moment belongs to the child,
 * and leading with a warning would sour it. "Not now" is a real answer;
 * the Profile row keeps the offer alive afterwards.
 */
function SecureAccountPrompt({
  visible,
  childName,
  onDismiss,
  onConfirm,
}: {
  visible: boolean;
  childName: string;
  onDismiss: () => void;
  onConfirm: () => void;
}) {
  if (!visible) return null;
  return (
    <View style={styles.securePromptWrap} pointerEvents="box-none">
      <View style={styles.securePromptCard}>
        <Text style={styles.securePromptEyebrow}>SAVED</Text>
        <Text style={styles.securePromptTitle}>
          That&rsquo;s {childName}&rsquo;s first milestone.
        </Text>
        <Text style={styles.securePromptBody}>
          It&rsquo;s stored on this phone. Add an email and it&rsquo;s safe even
          if you lose it.
        </Text>
        <View style={styles.securePromptActions}>
          <Pressable onPress={onDismiss} hitSlop={8}>
            <Text style={styles.securePromptLater}>Not now</Text>
          </Pressable>
          <Pressable onPress={onConfirm} style={styles.securePromptCta}>
            <Text style={styles.securePromptCtaText}>Keep it safe</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.emptyWrap}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </View>
  );
}

function CheckIcon() {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4.5 12.5 9.5 17.5 19.5 6.5"
        stroke={colors.white}
        strokeWidth={3.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function RecommendationCard({ activity }: { activity: Activity }) {
  return (
    <View style={styles.recommendationCard}>
      <Text style={styles.recommendationDomain}>{DOMAIN_LABEL[activity.domain].toUpperCase()}</Text>
      <Text style={styles.recommendationTitle}>{activity.title}</Text>
      <Text style={styles.recommendationWhy}>{activity.why}</Text>
      <Text style={styles.recommendationMeta}>
        {activity.duration_label ?? `${activity.duration_minutes} min`} · {activity.materials}
      </Text>
    </View>
  );
}

function MilestoneCard({
  milestone,
  isAchieved,
  achievedNote,
  isExpanded,
  onToggleExpand,
  onToggleAchieved,
  onSaveNote,
  savingNote,
  comingSoon = false,
}: {
  milestone: Milestone;
  isAchieved: boolean;
  achievedNote: string | null;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onToggleAchieved: () => void;
  onSaveNote: (note: string) => void;
  savingNote: boolean;
  comingSoon?: boolean;
}) {
  const [noteText, setNoteText] = useState(achievedNote ?? "");

  // Update note text state if database state changes (e.g. initial load)
  useEffect(() => {
    setNoteText(achievedNote ?? "");
  }, [achievedNote]);

  const whyItMatters = milestone.guide?.see ?? "A beautiful leap forward in your child's capabilities.";
  const tryActivity = milestone.guide?.try ?? null;
  const watchFor = milestone.guide?.watch ?? null;

  return (
    <View
      style={[
        styles.card,
        isAchieved && styles.cardAchieved,
        comingSoon && styles.cardComingSoon,
        isExpanded && styles.cardExpanded,
      ]}
    >
      {/* Primary Card View */}
      <Pressable onPress={onToggleExpand} style={styles.cardHeader}>
        {/* Toggle Checkbox */}
        <Pressable
          onPress={onToggleAchieved}
          style={[styles.checkbox, isAchieved && styles.checkboxChecked]}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: isAchieved }}
        >
          {isAchieved && (
            <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
              <Path
                d="M4.5 12.5 9.5 17.5 19.5 6.5"
                stroke={colors.white}
                strokeWidth={3.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          )}
        </Pressable>

        <View style={styles.cardHeaderMain}>
          <View style={styles.cardLabelWrap}>
            <Text style={styles.cardDomainLabel}>{DOMAIN_LABEL[milestone.domain].toUpperCase()}</Text>
            <Text style={styles.cardAgeLabel}>{milestone.stage_label}</Text>
          </View>
          <Text style={[styles.cardDescription, isAchieved && styles.cardDescriptionAchieved]}>
            {milestone.description}
          </Text>
        </View>

        {/* Expand Icon */}
        <View style={[styles.arrowIcon, isExpanded && styles.arrowIconRotated]}>
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
            <Path
              d="m6 9 6 6 6-6"
              stroke={colors.textMuted}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </View>
      </Pressable>

      {/* Expanded Sub-details */}
      {isExpanded && (
        <View style={styles.expandedContent}>
          {/* Why it Matters */}
          <View style={styles.detailBlock}>
            <Text style={styles.detailLabel}>Why It Matters</Text>
            <Text style={styles.detailBody}>{whyItMatters}</Text>
          </View>

          {/* Try This Activity */}
          {tryActivity && (
            <View style={styles.detailBlock}>
              <Text style={styles.detailLabel}>Try This Activity</Text>
              <Text style={styles.detailBody}>{tryActivity}</Text>
            </View>
          )}

          {/* Watch for */}
          {watchFor && (
            <View style={styles.detailBlock}>
              <Text style={styles.detailLabel}>Watch For</Text>
              <Text style={styles.detailBody}>{watchFor}</Text>
            </View>
          )}

          {/* Source */}
          {milestone.source && (
            <View style={styles.detailBlock}>
              <Text style={styles.sourceText}>Source: {milestone.source}</Text>
            </View>
          )}

          {/* Memory Journal Input */}
          <View style={styles.noteBlock}>
            <Text style={styles.detailLabel}>Write a Memory</Text>
            <View style={styles.noteInputWrap}>
              <TextInput
                value={noteText}
                onChangeText={setNoteText}
                placeholder="Log a memory of when you first noticed this..."
                placeholderTextColor={colors.textMuted}
                style={styles.noteInput}
                multiline
                maxLength={400}
              />
              <Pressable
                onPress={() => onSaveNote(noteText)}
                disabled={savingNote || noteText.trim() === (achievedNote ?? "").trim()}
                style={[
                  styles.noteSaveButton,
                  noteText.trim() !== (achievedNote ?? "").trim() && styles.noteSaveButtonActive,
                ]}
              >
                {savingNote ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <Text style={styles.noteSaveText}>Save</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  securePromptWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.lg,
  },
  securePromptCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    shadowColor: colors.charcoal,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 6,
  },
  securePromptEyebrow: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.caption,
    letterSpacing: 1.5,
    color: colors.sage,
    marginBottom: spacing.sm,
  },
  securePromptTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: typeScale.h3,
    lineHeight: typeScale.h3 * 1.3,
    color: colors.charcoal,
  },
  securePromptBody: {
    fontFamily: fonts.body,
    fontSize: typeScale.bodySmall,
    lineHeight: typeScale.bodySmall * 1.55,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  securePromptActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  securePromptLater: {
    fontFamily: fonts.body,
    fontSize: typeScale.bodySmall,
    color: colors.textMuted,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  securePromptCta: {
    backgroundColor: colors.charcoal,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
  },
  securePromptCtaText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.bodySmall,
    color: colors.white,
  },
  screen: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md + 4,
    paddingBottom: spacing.xxl,
  },
  celebrationContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  celebrationMark: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.sage,
    marginBottom: spacing.xl,
  },
  initialCelebrationTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: typeScale.display - 3,
    lineHeight: (typeScale.display - 3) * 1.16,
    color: colors.charcoal,
    marginBottom: spacing.md,
  },
  initialCelebrationBody: {
    fontFamily: fonts.body,
    fontSize: typeScale.body,
    lineHeight: typeScale.body * 1.52,
    color: colors.textMuted,
  },
  summaryCard: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  summaryLabel: {
    fontFamily: fonts.body,
    fontSize: typeScale.bodySmall,
    color: colors.textMuted,
  },
  summaryValue: {
    flexShrink: 1,
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.bodySmall,
    color: colors.charcoal,
    textAlign: "right",
  },
  summaryRule: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  celebrationNote: {
    fontFamily: fonts.serifItalic,
    fontSize: typeScale.body,
    lineHeight: typeScale.body * 1.45,
    color: colors.warmTaupe,
    textAlign: "center",
    marginTop: spacing.xl,
  },
  recommendationContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  recommendationLoading: {
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xxl,
  },
  smallMuted: {
    fontFamily: fonts.body,
    fontSize: typeScale.bodySmall,
    lineHeight: typeScale.bodySmall * 1.45,
    color: colors.textMuted,
    textAlign: "center",
  },
  recommendationList: {
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  recommendationCard: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recommendationDomain: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.caption,
    letterSpacing: 1.2,
    color: colors.warmTaupe,
    marginBottom: spacing.sm,
  },
  recommendationTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: typeScale.h3,
    lineHeight: typeScale.h3 * 1.25,
    color: colors.charcoal,
  },
  recommendationWhy: {
    fontFamily: fonts.body,
    fontSize: typeScale.bodySmall,
    lineHeight: typeScale.bodySmall * 1.45,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  recommendationMeta: {
    fontFamily: fonts.bodyMedium,
    fontSize: typeScale.caption,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  recommendationError: {
    fontFamily: fonts.body,
    fontSize: typeScale.bodySmall,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.md,
  },
  initialContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  initialEyebrow: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.caption,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: colors.warmTaupe,
    marginBottom: spacing.sm,
  },
  initialTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: typeScale.display - 3,
    lineHeight: (typeScale.display - 3) * 1.16,
    color: colors.charcoal,
    marginBottom: spacing.sm,
  },
  initialBody: {
    fontFamily: fonts.body,
    fontSize: typeScale.body,
    lineHeight: typeScale.body * 1.5,
    color: colors.textMuted,
  },
  initialAgeNote: {
    fontFamily: fonts.serifItalic,
    fontSize: typeScale.body,
    lineHeight: typeScale.body * 1.35,
    color: colors.warmTaupe,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  initialGroup: {
    marginBottom: spacing.lg,
  },
  initialGroupTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.bodySmall,
    color: colors.charcoal,
    marginBottom: spacing.sm,
  },
  initialMilestoneCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  initialMilestoneCardOn: {
    backgroundColor: "rgba(168, 181, 164, 0.18)",
    borderColor: "rgba(168, 181, 164, 0.58)",
  },
  initialMilestoneText: {
    fontFamily: fonts.body,
    fontSize: typeScale.bodySmall,
    lineHeight: typeScale.bodySmall * 1.45,
    color: colors.charcoal,
  },
  initialMilestoneActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  initialMilestoneButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  initialMilestoneButtonOn: {
    backgroundColor: colors.sage,
    borderColor: colors.sage,
  },
  initialMilestoneButtonText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.caption,
    color: colors.charcoal,
  },
  initialMilestoneButtonTextOn: {
    color: colors.white,
  },
  initialGhostButton: {
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "transparent",
  },
  initialGhostButtonOn: {
    borderColor: colors.warmTaupe,
  },
  initialGhostButtonText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.caption,
    color: colors.warmTaupe,
  },
  initialNotYetPanel: {
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  initialNotYetIntro: {
    fontFamily: fonts.serifItalic,
    fontSize: typeScale.bodySmall,
    color: colors.textMuted,
  },
  initialNotYetRow: {
    gap: 2,
  },
  initialNotYetLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    letterSpacing: 0.6,
    color: colors.warmTaupe,
  },
  initialNotYetText: {
    fontFamily: fonts.body,
    fontSize: typeScale.bodySmall,
    lineHeight: typeScale.bodySmall * 1.45,
    color: colors.charcoal,
  },
  initialReassurance: {
    fontFamily: fonts.serifItalic,
    fontSize: typeScale.body,
    lineHeight: typeScale.body * 1.45,
    textAlign: "center",
    color: colors.textMuted,
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  initialEmpty: {
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: "rgba(139, 115, 85, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(139, 115, 85, 0.12)",
  },
  initialEmptyText: {
    fontFamily: fonts.body,
    fontSize: typeScale.bodySmall,
    lineHeight: typeScale.bodySmall * 1.45,
    color: colors.textMuted,
    textAlign: "center",
  },
  notYetCard: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notYetTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: typeScale.h3,
    lineHeight: typeScale.h3 * 1.25,
    color: colors.charcoal,
  },
  notYetBody: {
    fontFamily: fonts.body,
    fontSize: typeScale.bodySmall,
    lineHeight: typeScale.bodySmall * 1.5,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  notYetLink: {
    fontFamily: fonts.bodySemiBold,
    color: colors.warmTaupe,
  },
  initialFooter: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
    backgroundColor: colors.cream,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  centered: {
    flex: 1,
    backgroundColor: colors.cream,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    paddingHorizontal: spacing.md + 4,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  headerTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: typeScale.display - 4,
    color: colors.charcoal,
  },
  headerSubtitle: {
    fontFamily: fonts.serifItalic,
    fontSize: typeScale.h3,
    color: colors.warmTaupe,
    marginTop: 4,
  },
  correctedNote: {
    fontFamily: fonts.body,
    fontSize: typeScale.caption,
    lineHeight: typeScale.caption * 1.55,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  progressBanner: {
    backgroundColor: "rgba(139, 115, 85, 0.08)",
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: "rgba(139, 115, 85, 0.12)",
  },
  progressText: {
    fontFamily: fonts.body,
    fontSize: typeScale.bodySmall,
    color: colors.textMuted,
  },
  progressTextHighlight: {
    fontFamily: fonts.bodySemiBold,
    color: colors.charcoal,
  },
  askAboutRow: {
    marginTop: spacing.md,
    alignSelf: "flex-start",
  },
  askAboutText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.caption,
    color: colors.warmTaupe,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(139, 115, 85, 0.06)",
    padding: 4,
    borderRadius: radius.sm,
    marginHorizontal: spacing.md + 4,
    marginVertical: spacing.md,
  },
  tabButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: "center",
    borderRadius: radius.sm - 2,
  },
  tabButtonActive: {
    backgroundColor: colors.white,
    ...Platform.select({
      web: {
        boxShadow: "0px 2px 3px rgba(0, 0, 0, 0.04)",
      } as any,
      default: {
        shadowColor: "rgba(0, 0, 0, 0.04)",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 3,
        elevation: 2,
      },
    }),
  },
  tabButtonText: {
    fontFamily: fonts.bodyMedium,
    fontSize: typeScale.bodySmall,
    color: colors.textMuted,
  },
  tabButtonTextActive: {
    color: colors.charcoal,
    fontFamily: fonts.bodySemiBold,
  },
  sectionHeaderWrap: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: typeScale.h3,
    color: colors.charcoal,
  },
  sectionSub: {
    fontFamily: fonts.body,
    fontSize: typeScale.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  celebrationCard: {
    backgroundColor: "rgba(168, 181, 164, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(168, 181, 164, 0.3)",
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: "center",
    marginVertical: spacing.sm,
  },
  celebrationEmoji: {
    fontSize: 32,
    marginBottom: spacing.xs,
  },
  celebrationTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: typeScale.body,
    color: colors.charcoal,
    textAlign: "center",
  },
  celebrationBody: {
    fontFamily: fonts.body,
    fontSize: typeScale.bodySmall,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 6,
    lineHeight: typeScale.bodySmall * 1.45,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    ...Platform.select({
      web: {
        boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.02)",
      } as any,
      default: {
        shadowColor: "rgba(0, 0, 0, 0.02)",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 6,
        elevation: 1,
      },
    }),
  },
  cardAchieved: {
    backgroundColor: "rgba(168, 181, 164, 0.08)",
    borderColor: "rgba(168, 181, 164, 0.25)",
  },
  cardComingSoon: {
    opacity: 0.8,
    borderStyle: "dashed",
    borderColor: "rgba(139, 115, 85, 0.2)",
  },
  cardExpanded: {
    borderColor: colors.warmTaupe,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.warmTaupe,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  checkboxChecked: {
    backgroundColor: colors.sage,
    borderColor: colors.sage,
  },
  cardHeaderMain: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  cardLabelWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  cardDomainLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    letterSpacing: 1.2,
    color: colors.warmTaupe,
  },
  cardAgeLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 9,
    color: colors.textMuted,
    backgroundColor: "rgba(0, 0, 0, 0.04)",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.pill,
  },
  cardDescription: {
    fontFamily: fonts.bodyMedium,
    fontSize: typeScale.bodySmall,
    lineHeight: typeScale.bodySmall * 1.45,
    color: colors.charcoal,
  },
  cardDescriptionAchieved: {
    color: colors.textMuted,
    textDecorationLine: "none",
  },
  arrowIcon: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  arrowIconRotated: {
    transform: [{ rotate: "180deg" }],
  },
  expandedContent: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.md,
    backgroundColor: "rgba(247, 245, 242, 0.4)",
  },
  detailBlock: {
    marginBottom: spacing.md,
  },
  detailLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 1.1,
    textTransform: "uppercase",
    color: colors.warmTaupe,
    marginBottom: 4,
  },
  detailBody: {
    fontFamily: fonts.body,
    fontSize: typeScale.bodySmall,
    lineHeight: typeScale.bodySmall * 1.5,
    color: colors.charcoal,
  },
  sourceText: {
    fontFamily: fonts.body,
    fontSize: typeScale.caption,
    lineHeight: typeScale.caption * 1.45,
    color: colors.textMuted,
  },
  noteBlock: {
    marginTop: spacing.xs,
  },
  noteInputWrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: colors.white,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 8,
    marginTop: 6,
  },
  noteInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: typeScale.bodySmall,
    lineHeight: typeScale.bodySmall * 1.4,
    color: colors.charcoal,
    paddingTop: 4,
    paddingBottom: 4,
    minHeight: 48,
    maxHeight: 120,
    textAlignVertical: "top",
  },
  noteSaveButton: {
    backgroundColor: "rgba(139, 115, 85, 0.4)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm - 4,
    marginLeft: 8,
    alignSelf: "flex-end",
    minWidth: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  noteSaveButtonActive: {
    backgroundColor: colors.sageDark,
  },
  noteSaveText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.white,
  },
  stageFilterScroll: {
    marginBottom: spacing.md,
    marginTop: spacing.xs,
  },
  stageFilterContent: {
    paddingRight: spacing.md,
    gap: 8,
  },
  stageChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm - 2,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stageChipSelected: {
    backgroundColor: colors.warmTaupe,
    borderColor: colors.warmTaupe,
  },
  stageChipCurrent: {
    borderColor: colors.warmTaupe,
    borderWidth: 1.5,
  },
  stageChipText: {
    fontFamily: fonts.bodyMedium,
    fontSize: typeScale.bodySmall,
    color: colors.textMuted,
  },
  stageChipTextSelected: {
    color: colors.white,
    fontFamily: fonts.bodySemiBold,
  },
  stageChipTextCurrent: {
    color: colors.warmTaupe,
    fontFamily: fonts.bodySemiBold,
  },
  domainGroup: {
    marginBottom: spacing.lg,
  },
  domainGroupTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 1.3,
    color: colors.textMuted,
    marginBottom: spacing.xs,
    marginLeft: 4,
  },
  emptyStageText: {
    fontFamily: fonts.body,
    fontSize: typeScale.bodySmall,
    color: colors.textMuted,
    textAlign: "center",
    marginVertical: spacing.xl,
  },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.h3,
    color: colors.charcoal,
    textAlign: "center",
  },
  emptyBody: {
    fontFamily: fonts.body,
    fontSize: typeScale.bodySmall,
    lineHeight: typeScale.bodySmall * 1.55,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.sm,
  },
  marginTopLg: {
    marginTop: spacing.lg,
  },
});
