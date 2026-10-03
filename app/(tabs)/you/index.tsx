import { useLocalSearchParams, usePathname, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  FeatureCard,
  FeatureGrid,
  FeatureGroupLabel,
  FeatureIcon,
  HubHeader,
  type FeatureIconName,
} from "../../../components/FeatureHub";
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
  FATHER_MOOD_ROLE,
  FATHER_ROLE_HUB_BLURB,
  FATHER_ROLE_HUB_LABEL,
  FATHER_ROLE_LABEL,
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

  // The mood check-in's suggestion for which FOR TODAY role opens first
  // today -- see MoodCheckInCard/FATHER_MOOD_ROLE. Father-only now --
  // mother no longer has a role-tab FOR TODAY to suggest into (see the
  // companion thread below), so there's nothing for her own mood mapping
  // to drive any more.
  const [moodRole, setMoodRole] = useState<FatherRole | null>(null);
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
  const {
    plan: fatherPlan,
    loading: fatherPlanLoading,
    swapping: fatherSwapping,
    swap: swapFatherActivity,
  } = useTodaysFatherPlan(fatherPlanProfileId);

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
        onMoodChange={(mood) => {
          setMoodLoggedToday(true);
          if (isFather) setMoodRole(FATHER_MOOD_ROLE[mood]);
        }}
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
          recoveryChildName={recoveryChild?.name ?? null}
          showsStageContent={showsFatherSupport}
          needsBirthConfirmation={needsBirthConfirmation}
          fatherPlanActivities={fatherPlan?.activities ?? null}
          fatherPlanLoading={fatherPlanLoading}
          fatherSwapping={fatherSwapping}
          onSwapFatherActivity={swapFatherActivity}
          moodRole={moodRole}
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
              { backgroundColor: p.surface, borderColor: p.border },
              pressed && styles.pressed,
            ]}
          >
            <View style={[styles.familyMealsIcon, { backgroundColor: p.surfaceAlt }]}>
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

const STAGE_TILE_LABEL: Record<FatherRole, string> = {
  dad: "With your baby",
  partner: "With your partner",
  you: "For yourself",
};

/**
 * The father's whole You experience, reorganised around three roles —
 * "Your child. Your partnership. You." — instead of the mother's own
 * layout above. See lib/fatherRoles.ts for the category/area mapping this
 * all draws from.
 *
 * FOR TODAY: exactly three cards, collapsed to just a role label and
 * title until tapped (never the full monthly inventory either way —
 * that's "See more for today →", see you/for-today.tsx). YOUR STAGE:
 * three short, tap-to-expand context tiles, not another picked-topic
 * list — each one's expanded state offers a way into the fuller Explore
 * hub for whoever wants more than a paragraph. EXPLORE: exactly three
 * hubs, replacing the generic per-area Well Being grid. Family Meals is
 * deliberately NOT here — it lives inside the Partnership hub now (see
 * you/care.tsx).
 */
const FATHER_ROLE_ICON: Record<FatherRole, FeatureIconName> = {
  dad: "dads",
  partner: "relationships",
  you: "mental",
};

function FatherYouBody({
  router,
  profile,
  familyMealsDescription,
  recoveryChildName,
  showsStageContent,
  needsBirthConfirmation,
  fatherPlanActivities,
  fatherPlanLoading,
  fatherSwapping,
  onSwapFatherActivity,
  moodRole,
}: {
  router: ReturnType<typeof useRouter>;
  profile: ParentProfile;
  /** Same copy YouHub computes for mother's own Family Meals tile --
   *  shared so his EXPLORE tile (below) says "support her recovery"
   *  rather than duplicating that logic. */
  familyMealsDescription: string;
  recoveryChildName: string | null;
  /** Whether the postpartum/recovery window still applies to this father's
   *  youngest child — see lib/recoveryRelevance.ts. Once it doesn't, there
   *  is no daily father_activities plan and no meaningful "weeks in" stage
   *  line, so FOR TODAY and YOUR STAGE are skipped entirely rather than
   *  rendering empty or nonsensical (a three-year-old's father seeing
   *  "104 weeks in"). EXPLORE stays — browsable content isn't time-bound. */
  showsStageContent: boolean;
  needsBirthConfirmation: boolean;
  fatherPlanActivities: FatherActivity[] | null;
  fatherPlanLoading: boolean;
  fatherSwapping: FatherActivity["category"] | null;
  onSwapFatherActivity: (category: FatherActivity["category"]) => void;
  /** The mood check-in's suggestion for today, if any — see
   *  MoodCheckInCard/FATHER_MOOD_ROLE. A manual tab tap always wins over
   *  this once one happens (selectedRole below), so this only ever sets
   *  which tab opens first. */
  moodRole: FatherRole | null;
}) {
  const p = usePalette();
  // Which of the three roles is open right now, for BOTH FOR TODAY's
  // pills and YOUR STAGE's chips independently. A manual tap always wins;
  // absent one, the mood check-in's suggestion wins; absent that, the
  // day-rotated default keeps FOR TODAY from always opening on the same
  // role forever.
  const [selectedToday, setSelectedToday] = useState<FatherRole | null>(null);
  const [selectedStage, setSelectedStage] = useState<FatherRole | null>(null);
  const dayIndex = Math.floor(Date.now() / 86_400_000);
  const roles: FatherRole[] = ["dad", "partner", "you"];
  const activeToday = selectedToday ?? moodRole ?? roles[dayIndex % roles.length];

  // Same profile.stage buckets the mother's "Your Stage" recoveryLine
  // uses above — just three role-specific lines instead of one.
  const stageCopy: Record<FatherRole, string> =
    profile.stage === "fourth_trimester"
      ? {
          dad: `Right now, ${recoveryChildName ?? "your baby"} is learning your voice, your smell, your face. There's no wrong way to bond yet — just being present is doing it.`,
          partner:
            "She's healing from things that don't fully show, and running on very little sleep. Practical support matters more than getting it exactly right.",
          you: "You're allowed to be finding this hard too. Sleep, identity, and how your own life has changed are real adjustments, not side issues.",
        }
      : profile.stage === "recovering"
        ? {
            dad: `${recoveryChildName ?? "Your baby"} is starting to respond to you directly now — smiling, reaching, settling to your voice. The relationship is becoming a two-way thing.`,
            partner:
              "The acute stage has passed, but recovery and adjustment are still ongoing underneath. Checking in on her, not just the baby, still matters.",
            you: "As things steady, it's worth noticing how you're actually doing — not just how the baby and your partner are doing.",
          }
        : {
            dad: `${recoveryChildName ?? "Your baby"} increasingly knows you as one of their two steady people. What you do together now is shaping how they see fathers.`,
            partner:
              "The baby stage has settled into a rhythm. This is often when a couple relationship needs deliberate attention again, not less.",
            you: "Fatherhood has become your new normal. Worth checking in on what you've let go of, and what you want back.",
          };

  return (
    <>
      {showsStageContent && (
        <>
      {/* Hidden entirely until the birth-method question (now asked right
          after the mood check-in, see YouHub above) is answered -- no
          point showing role tabs with nothing underneath them. */}
      {!needsBirthConfirmation && (
      <View style={styles.block}>
        <SectionTitle>One idea for today</SectionTitle>

        {fatherPlanLoading ? (
          <ActivityIndicator style={{ marginTop: spacing.lg }} />
        ) : (
          <>
            {/* Pills pick which role's activity is open below — a single
                always-expanded card, not three equal-weight accordions.
                Whichever the mood check-in suggested (or the day-rotated
                default) opens first; tapping a pill is a manual override
                that sticks until tapped again. */}
            <View style={styles.roleTabRow}>
              {roles.map((role) => {
                const active = activeToday === role;
                return (
                  <Pressable
                    key={role}
                    onPress={() => setSelectedToday(role)}
                    style={[
                      styles.roleTab,
                      { borderColor: p.border },
                      active && { backgroundColor: p.primary, borderColor: p.primary },
                    ]}
                  >
                    <FeatureIcon name={FATHER_ROLE_ICON[role]} color={active ? p.surface : p.primary} />
                    <Text style={[styles.roleTabLabel, { color: active ? p.surface : p.text }]}>
                      {FATHER_ROLE_LABEL[role].replace(/^As a |^For /, "")}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {(() => {
              const activity = todaysActivityForRole(fatherPlanActivities ?? [], activeToday, dayIndex);
              if (!activity) return null;
              return (
                <Card style={styles.activityCard}>
                  <Text style={[styles.activityCategory, { color: p.primary }]}>
                    {FATHER_ROLE_LABEL[activeToday].toUpperCase()}
                  </Text>
                  <Text style={[styles.sectionTitle, { color: p.text }]}>{activity.title}</Text>
                  <Text style={[styles.sectionBody, { color: p.textMuted }]}>
                    {activity.short_description ?? activity.description}
                  </Text>
                  <Text style={[styles.activityMeta, { color: p.textMuted }]}>
                    {activity.duration_label}
                    {activity.with_baby === "yes" ? " · With baby" : ""}
                  </Text>
                  <View style={styles.activityActionRow}>
                    <Pressable
                      onPress={() => router.push(`/you/father-activity/${activity.id}`)}
                      style={[styles.seeHowChip, { backgroundColor: p.primary }]}
                    >
                      <Text style={[styles.seeHowChipText, { color: p.surface }]}>See how</Text>
                    </Pressable>
                    <Pressable
                      disabled={fatherSwapping === activity.category}
                      onPress={() => onSwapFatherActivity(activity.category)}
                      style={styles.swapButton}
                    >
                      <Text style={[styles.swapLabel, { color: p.primary }]}>
                        {fatherSwapping === activity.category ? "Swapping…" : "Something else"}
                      </Text>
                    </Pressable>
                  </View>
                </Card>
              );
            })()}
          </>
        )}

        {!fatherPlanLoading && (
          <Pressable onPress={() => router.push("/you/for-today")} style={styles.seeMoreRow}>
            <Text style={[styles.seeMoreText, { color: p.primary }]}>See more for today →</Text>
          </Pressable>
        )}
      </View>
      )}

      {/* Context, not tasks: one card, three tap-to-read chips, rather
          than three stacked accordion tiles — collapsing this section to
          almost no vertical space until someone actually wants to read
          more. Whichever chip is open offers a way into the fuller
          Explore hub for whoever wants more than a paragraph. */}
      <View style={styles.block}>
        <FeatureGroupLabel>{`${elapsedPhrase(profile.weeksPostpartum)} in`}</FeatureGroupLabel>
        <Card style={styles.stageCard}>
          <Text style={[styles.stageSubtext, { color: p.textMuted }]}>
            A little context for where things are now — nothing to do here.
          </Text>
          <View style={styles.stageChipRow}>
            {roles.map((role) => {
              const selected = selectedStage === role;
              return (
                <Pressable
                  key={role}
                  onPress={() => setSelectedStage(selected ? null : role)}
                  style={[
                    styles.stageChip,
                    { borderColor: p.border },
                    selected && { backgroundColor: p.surfaceAlt, borderColor: p.primary },
                  ]}
                >
                  <FeatureIcon name={FATHER_ROLE_ICON[role]} color={p.primary} />
                  <Text style={[styles.stageChipLabel, { color: p.text }]}>
                    {STAGE_TILE_LABEL[role]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={[styles.sectionBody, { color: p.textMuted, marginTop: spacing.md }]}>
            {selectedStage ? stageCopy[selectedStage] : "Tap a card to read more."}
          </Text>
          {selectedStage && (
            <Pressable onPress={() => router.push(`/you/care?hub=${selectedStage}`)}>
              <Text style={[styles.stageTileLink, { color: p.primary }]}>
                Read more in {FATHER_ROLE_HUB_LABEL[selectedStage]} →
              </Text>
            </Pressable>
          )}
        </Card>
      </View>
        </>
      )}

      {/* Exactly three hubs — everything that used to be a per-area Well
          Being grid, or a "fathering"-tagged article, now buckets into
          one of these (see lib/fatherRoles.ts topicsForFatherRole). Always
          shown, unlike FOR TODAY/YOUR STAGE above — browsable content
          isn't time-bound the way a postpartum daily plan is. The
          featured line above the grid is the one thing that changes here
          day to day, so Explore isn't the same static wallpaper on every
          visit. */}
      {(() => {
        const pool = roles.flatMap((role) =>
          topicsForFatherRole(profile.delivery, role).map((topic) => ({ role, topic }))
        );
        if (pool.length === 0) return null;
        const featured = pool[dayIndex % pool.length];
        return (
          <Card style={styles.featuredCard} onPress={() => router.push(`/care/${featured.topic.slug}`)}>
            <Text style={[styles.activityCategory, { color: p.primary }]}>
              NEW IN {FATHER_ROLE_HUB_LABEL[featured.role].toUpperCase()}
            </Text>
            <View style={styles.rowBetween}>
              <Text style={[styles.sectionTitle, { color: p.text, flex: 1 }]}>
                {featured.topic.title}
              </Text>
              <Text style={{ color: p.primary }}>→</Text>
            </View>
          </Card>
        );
      })()}

      <SectionTitle>Explore your space</SectionTitle>
      <FeatureGrid>
        <FeatureCard
          icon={<FeatureIcon name="dads" color={p.primary} />}
          title={FATHER_ROLE_HUB_LABEL.dad}
          description={FATHER_ROLE_HUB_BLURB.dad}
          onPress={() => router.push("/you/care?hub=dad")}
        />
        <FeatureCard
          icon={<FeatureIcon name="relationships" color={p.primary} />}
          title={FATHER_ROLE_HUB_LABEL.partner}
          description={FATHER_ROLE_HUB_BLURB.partner}
          onPress={() => router.push("/you/care?hub=partner")}
        />
        <FeatureCard
          icon={<FeatureIcon name="mental" color={p.primary} />}
          title={FATHER_ROLE_HUB_LABEL.you}
          description={FATHER_ROLE_HUB_BLURB.you}
          onPress={() => router.push("/you/care?hub=you")}
        />
        {/* A flat EXPLORE tile, not the richer FAMILY MEALS section
            mother's landing has above her own FOR TODAY -- Family Meals
            still deliberately isn't a first-class section on his page
            (it stays reachable from Home same as before), this just
            closes the one gap where a father had literally no path to
            it from You at all, consistent with the other three tiles
            here rather than duplicating mother's own treatment. */}
        <FeatureCard
          icon={<FeatureIcon name="meal" color={p.primary} />}
          title="Family Meals"
          description={familyMealsDescription}
          onPress={() => router.push("/you/nutrition")}
        />
      </FeatureGrid>
    </>
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
  activityActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    marginTop: spacing.md,
  },
  seeHowChip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
  },
  seeHowChipText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.bodySmall,
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
  activityCategory: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.caption,
    letterSpacing: 1.2,
    marginBottom: spacing.xs,
  },
  activityMeta: {
    fontFamily: fonts.body,
    fontSize: typeScale.caption,
    lineHeight: typeScale.caption * 1.45,
    marginTop: spacing.sm,
  },
  swapButton: {
    marginTop: spacing.md,
    alignSelf: "flex-start",
  },
  swapLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.bodySmall,
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
  rowBetween: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  seeMoreRow: {
    marginTop: spacing.md,
    alignSelf: "flex-start",
  },
  seeMoreText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.bodySmall,
  },
  stageSubtext: {
    fontFamily: fonts.body,
    fontSize: typeScale.bodySmall,
    lineHeight: typeScale.bodySmall * 1.5,
  },
  stageTileLink: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.bodySmall,
    marginTop: spacing.md,
  },
  roleTabRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  roleTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  roleTabLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.caption,
  },
  stageCard: {
    padding: spacing.lg,
    marginTop: spacing.sm,
  },
  stageChipRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  stageChip: {
    flex: 1,
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: "dashed",
  },
  stageChipLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: typeScale.caption,
    textAlign: "center",
  },
  featuredCard: {
    padding: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
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
});
