import { useLocalSearchParams, usePathname, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { FeatureIcon, HubHeader, type FeatureIconName } from "../../../components/FeatureHub";
import { CheckInCard } from "../../../components/CheckInCard";
import { CompanionThreadCard } from "../../../components/CompanionThreadCard";
import { MoodCheckInCard } from "../../../components/MoodCheckInCard";
import { Card, SectionTitle } from "../../../components/parentUI";
import { GuidedTourDialog } from "../../../components/GuidedTourDialog";
import { useAuth } from "../../../lib/AuthProvider";
import { computeAge, youngestChild } from "../../../lib/childAge";
import * as family from "../../../lib/db/family";
import { type FatherActivity } from "../../../lib/db/types";
import {
  FATHER_ROLE_HUB_BLURB,
  FATHER_ROLE_HUB_LABEL,
  todaysActivityForRole,
  topicsForFatherRole,
  type FatherRole,
} from "../../../lib/fatherRoles";
import { markFirstRunComplete, markHomeCoachComplete, rewindGuidedTourStep } from "../../../lib/firstRun";
import { usePalette } from "../../../lib/ModeProvider";
import {
  deriveProfile,
  elapsedPhrase,
  type DeliveryType,
  type ParentProfile,
} from "../../../lib/parentCare";
import { isRecoveryRelevant } from "../../../lib/recoveryRelevance";
import { fonts, radius, spacing, typeScale } from "../../../lib/theme";
import { useGuidedTourStep } from "../../../lib/useGuidedTourStep";
import { useScreenFocus } from "../../../lib/useScreenFocus";
import { useTodaysFatherPlan } from "../../../lib/useTodaysFatherPlan";
import { useTodaysMotherPlan } from "../../../lib/useTodaysMotherPlan";

/**
 * You's landing hub — the mirror of Child's: a feature grid, not a page of
 * content.
 *
 * Everything below is strictly role-relevant: a father sees only father
 * content, a mother sees only mother content — never "For dads" or
 * postpartum recovery presented as his own. The two roles now render
 * genuinely different bodies below the shared Check-in, not just
 * role-gated blocks inside one shared layout:
 *
 * MOTHER (and prefer_not_to_say): Family Meals → FOR TODAY ("For me /
 * With my child / Together" — see lib/motherRoles.ts, same role-tab
 * shape as a father's own FOR TODAY below, over her actual
 * mother_activities daily plan) → Well Being (the browsable library) →
 * Your Stage (a single where-things-are-now line). FOR TODAY replaces
 * two older sections: a static single "For You Today" reading
 * recommendation that never varied with mood or day, and a flat "For You
 * This Month" list showing all four of her plan's activities at once —
 * both read as more of the same thing shown differently, not real
 * variety.
 *
 * FATHER: reorganised around three roles instead — "Your child. Your
 * partnership. You." (see lib/fatherRoles.ts, and FatherYouBody below).
 * FOR TODAY (exactly three cards: As a dad / As a partner / For you,
 * never the full monthly inventory) → YOUR STAGE (three short, tap-to-
 * expand context tiles, not another picked-topic list) → EXPLORE
 * (exactly three hubs — Fatherhood / Partnership / Your wellbeing —
 * replacing the generic per-area Well Being grid). Family Meals is
 * deliberately not on his landing page; it lives inside the Partnership
 * hub now. Each FOR TODAY card itself starts collapsed to just its role
 * label and title ("Tap to view") — the description, duration, and swap
 * only show once tapped, so the three read as a clean, equal-weight set
 * rather than a wall of text on first glance.
 *
 * The check-in: a daily mood check-in (see components/MoodCheckInCard.tsx)
 * now leads for BOTH roles, with its week-strip giving either parent a
 * visible "you showed up" trail -- it used to be father-only, with a
 * mother going straight to the second layer below and never getting the
 * lightweight daily touchpoint at all. Underneath, the meal planner
 * workbook's two-question Recovery Check-in (energy, and whether help is
 * available today) — replacing the old five-emoji mood picker, which was
 * never actually saved anywhere, and collapses to a tiny "✓ Checked in
 * today" the moment it's answered for the day — see
 * components/CheckInCard.tsx.
 */
// Same wording as Home's and Ask's greeting -- kept in sync by hand
// rather than shared, matching the existing pattern of a small per-screen
// copy rather than a shared util for a 3-line function.
function greetingWord(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const BIRTH_OPTIONS: { value: DeliveryType; label: string }[] = [
  { value: "vaginal", label: "Vaginal birth" },
  { value: "caesarean", label: "Caesarean" },
  { value: "prefer_not_to_say", label: "Rather not say" },
];

export default function YouHub() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useLocalSearchParams<{ guidedTour?: string; next?: string; step?: string }>();
  const p = usePalette();
  const { session, parentName, profile: authProfile, children, refreshFamily } = useAuth();

  // The tour's final stop — see child/guide.tsx: only the focused screen
  // on matching route with the right step may show a tour dialog.
  const isFocused = useScreenFocus();
  const isYouRoute = pathname === "/you";
  const wantsGuidedTour = params.guidedTour === "1" && params.step === "4" && isFocused && isYouRoute;
  const guidedTour = useGuidedTourStep(4, wantsGuidedTour);
  const afterOnboardingTour = params.next === "milestones";
  const tourNext = afterOnboardingTour ? "&next=milestones" : "";

  const finishGuidedTour = async () => {
    await markHomeCoachComplete().catch(() => {});
    if (afterOnboardingTour) {
      router.replace("/child/milestones?initial=1&afterTour=1");
      return;
    }
    await markFirstRunComplete().catch(() => {});
    router.replace("/home?tourComplete=1");
  };

  // The parent's own postpartum stage follows the youngest child, not
  // whichever child is active in the Kids tab switcher — see today.tsx's
  // former version of this same comment.
  const recoveryChild = youngestChild(children);
  const ageMonths = recoveryChild ? computeAge(recoveryChild.date_of_birth)?.totalMonths ?? 0 : 0;

  const profile = useMemo(
    () => deriveProfile(ageMonths, authProfile),
    [ageMonths, authProfile],
  );
  const firstName = parentName?.trim().split(" ")[0];
  const partnerFirstName = authProfile?.partner_name?.trim().split(" ")[0];

  const recoveryFramingApplies = isRecoveryRelevant(ageMonths);
  const showsRecovery = recoveryFramingApplies && profile.role !== "father";
  const showsFatherSupport = recoveryFramingApplies && profile.role === "father";

  const subtitle = recoveryFramingApplies
    ? profile.role === "father"
      ? `${elapsedPhrase(profile.weeksPostpartum)} in.`
      : `${elapsedPhrase(profile.weeksPostpartum)} postpartum.`
    : firstName
      ? `Everything here is for you, ${firstName}.`
      : "Everything here is for you.";

  // Never answered at all — distinct from an explicit "prefer_not_to_say".
  // A father is never asked his partner's birth method during onboarding,
  // so this is the first time he sees this question.
  const needsBirthConfirmation =
    (showsRecovery || showsFatherSupport) && authProfile?.birth_method == null;

  // Whether today's mood has been answered yet -- gates the companion
  // thread below, which deliberately only appears once she's already
  // taken an action on this screen (see CompanionThreadCard's own notes).
  // onMoodChange fires on first load too if already answered today, not
  // just on a fresh tap, so this also covers reopening the app later.
  const [moodLoggedToday, setMoodLoggedToday] = useState(false);

  const [savingBirth, setSavingBirth] = useState(false);
  const handleConfirmBirth = async (value: DeliveryType) => {
    const userId = session?.user?.id;
    if (!userId) return;
    setSavingBirth(true);
    try {
      await family.updateProfile(userId, { birth_method: value });
      await refreshFamily();
    } finally {
      setSavingBirth(false);
    }
  };

  const motherPlanProfileId = showsRecovery && !needsBirthConfirmation ? session?.user?.id ?? null : null;
  const {
    plan: motherPlan,
    swappingPhysicalRecovery,
    swapPhysicalRecovery,
  } = useTodaysMotherPlan(motherPlanProfileId);

  const fatherPlanProfileId =
    showsFatherSupport && !needsBirthConfirmation ? session?.user?.id ?? null : null;
  const { plan: fatherPlan, loading: fatherPlanLoading } = useTodaysFatherPlan(fatherPlanProfileId);

  /**
   * A father's nutrition/recovery card used to say "Food to support
   * {his own name}'s recovery" — wrong, since it's really about HER
   * recovery. Naming her by her actual name (asked once in onboarding)
   * fixes that; falling back to "her" when he hasn't given a name rather
   * than defaulting back to his own.
   */
  const familyMealsDescription =
    profile.role === "father"
      ? partnerFirstName
        ? `Meals to support ${partnerFirstName}'s recovery, and the family.`
        : "Meals to support her recovery, and the family."
      : recoveryFramingApplies
        ? "Meals built around your recovery, for the whole family."
        : "What the family's eating today.";

  // Today's physical-recovery activity, and the two picks that now surface
  // as quiet "today" teasers on their Explore tiles (see the mother
  // branch below) rather than through a role-tab FOR TODAY section.
  const physicalRecoveryActivity =
    motherPlan?.activities.find((a) => a.category === "physical_recovery") ?? null;
  const emotionalWellnessActivity =
    motherPlan?.activities.find((a) => a.category === "emotional_wellness") ?? null;
  const coupleConnectionActivity =
    motherPlan?.activities.find((a) => a.category === "couple_connection") ?? null;

  const recoveryLine =
    profile.stage === "fourth_trimester"
      ? "Feeling more tired than you expected can be completely normal. Your body is still doing deep repair."
      : profile.stage === "recovering"
        ? "Energy can dip again around this stage. Healing is not linear, especially after interrupted sleep."
        : "Even when the baby is older, your nervous system may still be catching up from months of broken rest.";

  const isFather = profile.role === "father";

  // "Week 13 with Rudr" when the child's name is known, "Week 13 · Day 91"
  // otherwise -- the mother hero card's eyebrow. Day count is a plain
  // elapsed-days figure off the same date_of_birth the week figure
  // already derives from (see lib/parentCare.ts deriveProfile).
  const dayCount = recoveryChild
    ? Math.floor((Date.now() - new Date(recoveryChild.date_of_birth).getTime()) / 86_400_000) + 1
    : null;

  return (
    <ScrollView
      style={{ backgroundColor: p.bg }}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {showsRecovery ? (
        <ParentHeroCard
          weeksPostpartum={profile.weeksPostpartum}
          dayCount={dayCount}
          childName={recoveryChild?.name ?? null}
          firstName={firstName ?? null}
          bodyLine={recoveryLine}
        />
      ) : showsFatherSupport ? (
        <ParentHeroCard
          weeksPostpartum={profile.weeksPostpartum}
          dayCount={dayCount}
          childName={recoveryChild?.name ?? null}
          firstName={firstName ?? null}
          bodyLine="She's healing from things that don't fully show. Your part right now is steady, practical support. And finding your own footing matters too."
        />
      ) : (
        <HubHeader title="You" subtitle={subtitle} />
      )}

      {/* The daily mood check-in now leads for BOTH roles -- it used to
          be father-only, with a mother going straight to the weekly
          recovery check-in below and never getting the lightweight daily
          touchpoint (or its week-strip "you showed up" trail) at all.
          CheckInCard's own weekly/twice-weekly cadence is unchanged --
          it's just a second, deeper layer underneath this now, for both
          roles, rather than the only check-in a mother ever saw. */}
      <MoodCheckInCard
        profileId={session?.user?.id ?? null}
        onMoodChange={() => setMoodLoggedToday(true)}
      >
        {/* The companion thread -- the one place physical recovery
            surfaces on her hub now (see CompanionThreadCard's own notes
            for why "One idea for today" was retired in its favour).
            Rendered INSIDE the mood check-in card, not underneath it --
            "while you're here" means here, in the card she's already
            answering, not a second card right after it. Gated on
            moodLoggedToday so it only ever appears once she's already
            taken an action here, never cold; naturally renders nothing
            while needsBirthConfirmation is true, since there's no plan
            yet to pull an activity from. */}
        {!isFather && showsRecovery && moodLoggedToday && (
          <CompanionThreadCard
            activity={physicalRecoveryActivity}
            onSwap={swapPhysicalRecovery}
            swapping={swappingPhysicalRecovery}
          />
        )}
      </MoodCheckInCard>

      {/* Both parents' birth-method questions now sit right here, just
          after the mood check-in -- not buried inside a FOR TODAY section
          gating its own content. Each is its own standalone prompt, same
          as the mood check-in above it. */}
      {!isFather && needsBirthConfirmation && (
        <BirthConfirmationCard
          title="What type of birth did you have?"
          body="So today's recovery activities actually fit your body."
          saving={savingBirth}
          onChoose={handleConfirmBirth}
        />
      )}
      {isFather && needsBirthConfirmation && (
        <BirthConfirmationCard
          title="How did your partner give birth?"
          body="So today's suggestions actually fit where you both are."
          saving={savingBirth}
          onChoose={handleConfirmBirth}
        />
      )}

      <CheckInCard
        profileId={session?.user?.id ?? null}
        role={profile.role}
        weeksPostpartum={profile.weeksPostpartum}
      />

      {isFather ? (
        <FatherYouBody
          router={router}
          profile={profile}
          familyMealsDescription={familyMealsDescription}
          showsStageContent={showsFatherSupport}
          needsBirthConfirmation={needsBirthConfirmation}
          fatherPlanActivities={fatherPlan?.activities ?? null}
          fatherPlanLoading={fatherPlanLoading}
        />
      ) : (
        <>
          {/* Family Meals -- its own distinct card now, not one tile among
              equals in the Explore grid below. It's a full planner with
              its own flows (see you/nutrition.tsx, you/meal.tsx), not a
              browsable reference hub, so it keeps the first-class
              placement "One idea for today" used to have rather than
              competing for space with article-hub tiles. */}
          <Pressable
            onPress={() => router.push("/you/nutrition")}
            style={({ pressed }) => [
              styles.familyMealsCard,
              { backgroundColor: p.surfaceAltStrong, borderColor: p.border },
              pressed && styles.pressed,
            ]}
          >
            <View style={[styles.familyMealsIcon, { backgroundColor: p.surface }]}>
              <FeatureIcon name="meal" color={p.primary} />
            </View>
            <View style={styles.familyMealsText}>
              <Text style={[styles.familyMealsTitle, { color: p.text }]}>Family Meals</Text>
              <Text style={[styles.familyMealsBody, { color: p.textMuted }]} numberOfLines={2}>
                {familyMealsDescription}
              </Text>
            </View>
          </Pressable>

          {/* Explore -- one flat 2-column grid for everything else,
              replacing the old separate "Your wellbeing" section and
              "Explore your space" grid (those two were an artificial
              split -- both were just reference content to browse).
              Mental health and Relationships and support each carry a
              quiet "today" line -- the daily pick that used to live in
              "One idea for today"'s For me / Together roles, now folded
              into the tile it's most related to rather than kept as a
              separate role-tab section. Sleep and Feeding support stay
              pure reference, since neither was ever a daily category.
              "Feeding support", not "Feeding" -- bare "Feeding" read too
              close to "Family Meals" above even though they're about
              completely different things (her own feeding journey vs.
              what the family eats). */}
          <View style={styles.block}>
            <SectionTitle>Explore</SectionTitle>
            <View style={styles.exploreGrid}>
              <ExploreTile
                icon={<FeatureIcon name="mental" color={p.primary} />}
                title="Mental health"
                description="Mood, stress, and when to reach out."
                today={emotionalWellnessActivity ? `Today: ${emotionalWellnessActivity.title}` : null}
                onPress={() => router.push("/you/care?area=mental")}
              />
              <ExploreTile
                icon={<FeatureIcon name="sleep" color={p.primary} />}
                title="Sleep"
                description="Recovering rest in a broken-night season."
                onPress={() => router.push("/you/care?area=sleep")}
              />
              <ExploreTile
                icon={<FeatureIcon name="bottle" color={p.primary} />}
                title="Feeding support"
                description="Latch, supply, and common snags."
                onPress={() => router.push("/you/care?area=feeding")}
              />
              <ExploreTile
                icon={<FeatureIcon name="relationships" color={p.primary} />}
                title="Relationships and support"
                description="Share the load, talk together."
                today={coupleConnectionActivity ? `Together today: ${coupleConnectionActivity.title}` : null}
                onPress={() => router.push("/you/care?area=relationships")}
              />
            </View>
          </View>
        </>
      )}

      {guidedTour && (
        <GuidedTourDialog
          eyebrow="You"
          focus="And don't forget yourself"
          title="This part is yours."
          body="Parent Care, wellbeing, and nutrition. Personalised to your role and your child's stage."
          step={4}
          total={5}
          primaryTitle="Start exploring"
          onPrimary={finishGuidedTour}
          onBack={async () => {
            await rewindGuidedTourStep(3);
            router.replace(`/child?guidedTour=1&step=3${tourNext}`);
          }}
          onSkip={finishGuidedTour}
        />
      )}
    </ScrollView>
  );
}

/**
 * The You home hub's own hero card, replacing the plain HubHeader while
 * the postpartum framing applies -- "Week N with {child}" (or "Week N ·
 * Day D" once the child's name isn't known), a time-of-day greeting, and
 * a role-appropriate body line. Shared by both roles: a mother's own
 * recoveryLine (3 stage-branching variants, see YouHub) and a father's
 * fixed reassurance line (the same text care.tsx's fatherReassurance
 * shows) both just pass through `bodyLine`. For mother this also
 * replaces what her old YOUR STAGE section used to say below; father
 * keeps his own YOUR STAGE section (3 role-specific context chips) as a
 * separate, non-redundant block further down, since it carries real
 * distinct content this single line doesn't.
 */
function ParentHeroCard({
  weeksPostpartum,
  dayCount,
  childName,
  firstName,
  bodyLine,
}: {
  weeksPostpartum: number;
  dayCount: number | null;
  childName: string | null;
  firstName: string | null;
  bodyLine: string;
}) {
  const p = usePalette();
  const eyebrow = childName
    ? `Week ${weeksPostpartum} with ${childName}`
    : dayCount != null
      ? `Week ${weeksPostpartum} · Day ${dayCount}`
      : `Week ${weeksPostpartum} postpartum`;

  return (
    <View style={[styles.heroCard, { backgroundColor: p.primary }]}>
      <Text style={styles.heroEyebrow}>{eyebrow.toUpperCase()}</Text>
      <Text style={styles.heroGreeting}>
        {greetingWord(new Date().getHours())}, {firstName ?? "there"}
      </Text>
      <Text style={styles.heroBody}>{bodyLine}</Text>
    </View>
  );
}

function BirthConfirmationCard({
  title,
  body,
  saving,
  onChoose,
}: {
  title: string;
  body: string;
  saving: boolean;
  onChoose: (value: DeliveryType) => void;
}) {
  const p = usePalette();
  return (
    <Card style={styles.activityCard}>
      <Text style={[styles.sectionTitle, { color: p.text }]}>{title}</Text>
      <Text style={[styles.sectionBody, { color: p.textMuted }]}>{body}</Text>
      <View style={styles.birthOptionRow}>
        {BIRTH_OPTIONS.map((option) => (
          <Pressable
            key={option.value}
            disabled={saving}
            onPress={() => onChoose(option.value)}
            style={[styles.birthOption, { borderColor: p.border }]}
          >
            <Text style={[styles.birthOptionLabel, { color: p.text }]}>{option.label}</Text>
          </Pressable>
        ))}
      </View>
      {saving && <ActivityIndicator style={{ marginTop: spacing.sm }} />}
    </Card>
  );
}

/**
 * One tile in mother's "Explore" grid -- a plain reference tile (icon,
 * title, description) plus an optional quiet "today" line for the two
 * areas that used to have their own FOR TODAY role (Mental health /
 * emotional_wellness, Relationships and support / couple_connection).
 * Sleep and Feeding support pass no `today`, since neither was ever a
 * daily category -- they're pure reference, same as this tile without
 * the extra line.
 */
function ExploreTile({
  icon,
  title,
  description,
  today,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  today?: string | null;
  onPress: () => void;
}) {
  const p = usePalette();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.exploreTile,
        { backgroundColor: p.surface, borderColor: p.border },
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.exploreTileIcon, { backgroundColor: p.surfaceAlt }]}>{icon}</View>
      <Text style={[styles.exploreTileTitle, { color: p.text }]} numberOfLines={2}>
        {title}
      </Text>
      <Text style={[styles.exploreTileBody, { color: p.textMuted }]} numberOfLines={2}>
        {description}
      </Text>
      {today && (
        <Text style={[styles.exploreTileToday, { color: p.primary }]} numberOfLines={2}>
          {today}
        </Text>
      )}
    </Pressable>
  );
}

const FATHER_ROLE_ICON: Record<FatherRole, FeatureIconName> = {
  dad: "dads",
  partner: "relationships",
  you: "mental",
};

/**
 * The father's whole You experience, reorganised around three roles —
 * "Your child. Your partnership. You." — instead of the mother's own
 * layout above. See lib/fatherRoles.ts for the category/area mapping this
 * all draws from.
 *
 * Family Meals is its own first-class card here now, same placement as
 * mother's -- directly under the check-in, not folded into the Explore
 * grid as a fourth tile (see c30b23d for why it moved there in the first
 * place; this undoes that specifically because every Explore tile below
 * now needs room to be about ONE hub, not shared with an unrelated
 * planner link).
 *
 * EXPLORE replaces FOR TODAY, YOUR STAGE and the old featured-topic card
 * all at once: each of the three hubs is one tile that carries BOTH its
 * library (icon, blurb, how many articles) AND today's one doable pick,
 * as a distinct strip underneath -- tapping the tile opens the hub,
 * tapping the strip jumps straight to today's activity. No role pills,
 * no separate "three months in" chips, no second "new in X" card
 * repeating a signal the tile already gives -- see the design discussion
 * this carries forward (mother's Explore tiles already do half of this
 * with their own "today" teaser; this is the same idea taken further).
 */
function FatherYouBody({
  router,
  profile,
  familyMealsDescription,
  showsStageContent,
  needsBirthConfirmation,
  fatherPlanActivities,
  fatherPlanLoading,
}: {
  router: ReturnType<typeof useRouter>;
  profile: ParentProfile;
  /** Same copy YouHub computes for mother's own Family Meals card. */
  familyMealsDescription: string;
  /** Whether the postpartum/recovery window still applies to this father's
   *  youngest child — see lib/recoveryRelevance.ts. Once it doesn't, there
   *  is no daily father_activities plan, so every tile's today-strip is
   *  skipped rather than rendering stale or empty. The tiles themselves
   *  stay -- browsable content isn't time-bound. */
  showsStageContent: boolean;
  needsBirthConfirmation: boolean;
  fatherPlanActivities: FatherActivity[] | null;
  fatherPlanLoading: boolean;
}) {
  const p = usePalette();
  const dayIndex = Math.floor(Date.now() / 86_400_000);
  const roles: FatherRole[] = ["dad", "partner", "you"];
  const showsToday = showsStageContent && !needsBirthConfirmation && !fatherPlanLoading;

  return (
    <>
      <Pressable
        onPress={() => router.push("/you/nutrition")}
        style={({ pressed }) => [
          styles.familyMealsCard,
          { backgroundColor: p.surfaceAltStrong, borderColor: p.border },
          pressed && styles.pressed,
        ]}
      >
        <View style={[styles.familyMealsIcon, { backgroundColor: p.surface }]}>
          <FeatureIcon name="meal" color={p.primary} />
        </View>
        <View style={styles.familyMealsText}>
          <Text style={[styles.familyMealsTitle, { color: p.text }]}>Family Meals</Text>
          <Text style={[styles.familyMealsBody, { color: p.textMuted }]} numberOfLines={2}>
            {familyMealsDescription}
          </Text>
        </View>
      </Pressable>

      <View style={styles.block}>
        <SectionTitle>Explore</SectionTitle>
        <View style={{ gap: spacing.sm }}>
          {roles.map((role) => {
            const activity = showsToday
              ? todaysActivityForRole(fatherPlanActivities ?? [], role, dayIndex)
              : null;
            return (
              <FatherExploreTile
                key={role}
                icon={<FeatureIcon name={FATHER_ROLE_ICON[role]} color={p.primary} />}
                title={FATHER_ROLE_HUB_LABEL[role]}
                description={FATHER_ROLE_HUB_BLURB[role]}
                articleCount={topicsForFatherRole(profile.delivery, role).length}
                activity={activity}
                onPressHub={() => router.push(`/you/care?hub=${role}`)}
                onPressToday={() => activity && router.push(`/you/father-activity/${activity.id}`)}
              />
            );
          })}
        </View>
      </View>
    </>
  );
}

/**
 * One Explore tile for father -- a hub's library (icon, title, blurb,
 * article count) with today's one doable pick as a distinct, separately
 * tappable strip underneath when there is one. Two tap targets by
 * design: the body opens the hub itself (its full article list), the
 * strip jumps straight into today's activity -- see FatherYouBody's own
 * notes on why this replaced FOR TODAY/YOUR STAGE/the featured card.
 */
function FatherExploreTile({
  icon,
  title,
  description,
  articleCount,
  activity,
  onPressHub,
  onPressToday,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  articleCount: number;
  activity: FatherActivity | null;
  onPressHub: () => void;
  onPressToday: () => void;
}) {
  const p = usePalette();
  return (
    <View style={[styles.fatherTile, { backgroundColor: p.surface, borderColor: p.border }]}>
      <Pressable onPress={onPressHub} style={styles.fatherTileTop}>
        <View style={[styles.fatherTileIcon, { backgroundColor: p.surfaceAlt }]}>{icon}</View>
        <View style={styles.fatherTileMain}>
          <Text style={[styles.fatherTileTitle, { color: p.text }]}>{title}</Text>
          <Text style={[styles.fatherTileBody, { color: p.textMuted }]}>{description}</Text>
          <Text style={[styles.fatherTileCount, { color: p.secondary }]}>
            {articleCount} {articleCount === 1 ? "article" : "articles"}
          </Text>
        </View>
      </Pressable>
      {activity && (
        <Pressable onPress={onPressToday} style={[styles.todayStrip, { backgroundColor: p.surfaceAlt }]}>
          <View style={styles.todayMain}>
            <Text style={[styles.todayEyebrow, { color: p.primary }]}>Today</Text>
            <Text style={[styles.todayTitle, { color: p.text }]} numberOfLines={1}>
              {activity.title}
            </Text>
          </View>
          <View style={styles.todaySide}>
            <Text style={[styles.todayMeta, { color: p.textMuted }]}>{activity.duration_label}</Text>
            <Text style={{ color: p.primary }}>›</Text>
          </View>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    // Matches Home's own top padding (app/(tabs)/home.tsx) -- was
    // spacing.md, a visibly bigger gap above the hero than Home leaves
    // above its own greeting.
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  block: {
    // Matches the rhythm Home uses between its own top-level sections
    // (familyMealWrap/forYouCard/whatsNextWrap, all spacing.lg) -- was
    // spacing.xl, a visibly bigger gap between sections here than on Home.
    marginTop: spacing.lg,
  },
  heroCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    marginBottom: spacing.lg,
  },
  heroEyebrow: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.caption,
    letterSpacing: 1.2,
    color: "rgba(255,255,255,0.85)",
    marginBottom: spacing.sm,
  },
  heroGreeting: {
    fontFamily: fonts.serifItalic,
    fontSize: typeScale.h1,
    lineHeight: typeScale.h1 * 1.2,
    color: "#FFFFFF",
    marginBottom: spacing.sm,
  },
  heroBody: {
    fontFamily: fonts.body,
    fontSize: typeScale.bodySmall,
    lineHeight: typeScale.bodySmall * 1.55,
    color: "rgba(255,255,255,0.92)",
  },
  activityCard: {
    padding: spacing.lg,
    marginTop: spacing.md,
  },
  sectionTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.h3,
    lineHeight: typeScale.h3 * 1.3,
  },
  sectionBody: {
    fontFamily: fonts.body,
    fontSize: typeScale.bodySmall,
    lineHeight: typeScale.bodySmall * 1.55,
    marginTop: spacing.xs,
  },
  birthOptionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  birthOption: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  birthOptionLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: typeScale.bodySmall,
  },
  pressed: {
    opacity: 0.7,
  },
  familyMealsCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  familyMealsIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  familyMealsText: {
    flex: 1,
  },
  familyMealsTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: typeScale.body,
  },
  familyMealsBody: {
    fontFamily: fonts.body,
    fontSize: typeScale.bodySmall,
    lineHeight: typeScale.bodySmall * 1.4,
    marginTop: 2,
  },
  exploreGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  exploreTile: {
    width: "48%",
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.sm,
  },
  exploreTileIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  exploreTileTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.bodySmall,
    lineHeight: typeScale.bodySmall * 1.3,
  },
  exploreTileBody: {
    fontFamily: fonts.body,
    fontSize: typeScale.caption,
    lineHeight: typeScale.caption * 1.45,
    marginTop: 3,
  },
  exploreTileToday: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.caption,
    lineHeight: typeScale.caption * 1.4,
    marginTop: spacing.sm,
  },
  fatherTile: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
  },
  fatherTileTop: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "flex-start",
  },
  fatherTileIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  fatherTileMain: {
    flex: 1,
  },
  fatherTileTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: typeScale.h3,
    lineHeight: typeScale.h3 * 1.2,
  },
  fatherTileBody: {
    fontFamily: fonts.body,
    fontSize: typeScale.caption,
    lineHeight: typeScale.caption * 1.5,
    marginTop: 2,
  },
  fatherTileCount: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.caption,
    marginTop: spacing.xs,
  },
  todayStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.md,
  },
  todayMain: {
    flex: 1,
    minWidth: 0,
  },
  todayEyebrow: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  todayTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.bodySmall,
    marginTop: 2,
  },
  todaySide: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexShrink: 0,
  },
  todayMeta: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.caption,
  },
});
