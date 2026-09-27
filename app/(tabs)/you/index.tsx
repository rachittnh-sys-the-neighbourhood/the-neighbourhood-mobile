import { useLocalSearchParams, usePathname, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  FeatureCard,
  FeatureGrid,
  FeatureGroupLabel,
  FeatureIcon,
  HubHeader,
  MicroLearningCard,
  type FeatureIconName,
} from "../../../components/FeatureHub";
import { CheckInCard } from "../../../components/CheckInCard";
import { Card } from "../../../components/parentUI";
import { GuidedTourDialog } from "../../../components/GuidedTourDialog";
import { useAuth } from "../../../lib/AuthProvider";
import { computeAge, youngestChild } from "../../../lib/childAge";
import * as family from "../../../lib/db/family";
import {
  MOTHER_ACTIVITY_CATEGORY_LABEL,
  type FatherActivity,
  type MotherActivity,
} from "../../../lib/db/types";
import {
  FATHER_ROLE_HUB_BLURB,
  FATHER_ROLE_HUB_LABEL,
  FATHER_ROLE_LABEL,
  todaysActivityForRole,
  type FatherRole,
} from "../../../lib/fatherRoles";
import { markFirstRunComplete, markHomeCoachComplete, rewindGuidedTourStep } from "../../../lib/firstRun";
import { usePalette } from "../../../lib/ModeProvider";
import {
  deliveryPhrase,
  deriveProfile,
  elapsedPhrase,
  recommendedTopicsForProfile,
  visibleCareAreas,
  type CareArea,
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
 * MOTHER (and prefer_not_to_say): Family Meals → For You Today (one quick
 * read) → Well Being (the browsable library) → Your Stage (a single
 * where-things-are-now line) → For You This Month (her recovery
 * activities). Unchanged from before.
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
 * The check-in itself is the meal planner workbook's two-question
 * Recovery Check-in (energy, and whether help is available today) —
 * replacing the old five-emoji mood picker, which was never actually
 * saved anywhere, and collapses to a tiny "✓ Checked in today" the
 * moment it's answered for the day — see components/CheckInCard.tsx.
 */
const CARE_ICONS: Record<CareArea, FeatureIconName> = {
  physical: "recovery",
  fathering: "dads",
  mental: "mental",
  sleep: "sleep",
  feeding: "meal",
  nutrition: "meal",
  relationships: "relationships",
};

const BIRTH_OPTIONS: { value: DeliveryType; label: string }[] = [
  { value: "vaginal", label: "Vaginal birth" },
  { value: "caesarean", label: "Caesarean" },
  { value: "prefer_not_to_say", label: "Rather not say" },
];

const TIME_OF_DAY_LABEL: Record<MotherActivity["time_of_day"], string> = {
  anytime: "Anytime",
  morning: "Morning",
  evening: "Evening",
  during_nap: "During a nap",
};

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
  const careAreas = useMemo(
    () => visibleCareAreas(profile.role, ageMonths, profile.delivery),
    [profile.role, profile.delivery, ageMonths],
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
  const { plan: motherPlan, loading: motherPlanLoading, swapping, swap: swapMotherActivity } =
    useTodaysMotherPlan(motherPlanProfileId);

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

  const careAreaDescription = (area: (typeof careAreas)[number]): string => {
    if (area.key === "physical") {
      return `Healing at ${elapsedPhrase(profile.weeksPostpartum)}, after ${deliveryPhrase(profile.delivery)}.`;
    }
    if (area.key === "fathering") {
      return `Your part in this, ${elapsedPhrase(profile.weeksPostpartum)} in.`;
    }
    return area.blurb;
  };

  // The single most relevant read right now — same selection logic as
  // Home's "For You" (see home.tsx). This used to run a second time for
  // "Your Stage" too (a curated pair of more topics from the same pool) —
  // that's gone now: between this one pick, the full Well Being library
  // below it, and the actual activities in "For you this month", a second
  // algorithmic topic-list was reading as more of the same, not more
  // value. "Your Stage" below is the where-you-are framing instead.
  const forYouToday = recommendedTopicsForProfile(profile, ageMonths, 1)[0] ?? null;
  const forYouTodayArea = forYouToday
    ? careAreas.find((a) => a.key === forYouToday.area) ?? null
    : null;

  const recoveryLine =
    profile.stage === "fourth_trimester"
      ? "Feeling more tired than you expected can be completely normal. Your body is still doing deep repair."
      : profile.stage === "recovering"
        ? "Energy can dip again around this stage. Healing is not linear, especially after interrupted sleep."
        : "Even when the baby is older, your nervous system may still be catching up from months of broken rest.";

  const isFather = profile.role === "father";

  return (
    <ScrollView
      style={{ backgroundColor: p.bg }}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <HubHeader title="You" subtitle={subtitle} />

      <CheckInCard
        profileId={session?.user?.id ?? null}
        role={profile.role}
        weeksPostpartum={profile.weeksPostpartum}
      />

      {isFather ? (
        <FatherYouBody
          router={router}
          profile={profile}
          recoveryChildName={recoveryChild?.name ?? null}
          showsStageContent={showsFatherSupport}
          needsBirthConfirmation={needsBirthConfirmation}
          savingBirth={savingBirth}
          onChooseBirth={handleConfirmBirth}
          fatherPlanActivities={fatherPlan?.activities ?? null}
          fatherPlanLoading={fatherPlanLoading}
          fatherSwapping={fatherSwapping}
          onSwapFatherActivity={swapFatherActivity}
        />
      ) : (
        <>
          {/* Family Meals — the one door into the meal planner now; the old
              "Nutrition" card and the redundant "Today" card it sat beside
              are both gone. The full day's timeline, the expert-review
              banner and the mother's own diet-specific boost live on the
              screen this opens. Right after the check-in — food is as much
              a daily, practical concern as how you're doing. */}
          <FeatureGroupLabel>FAMILY MEALS</FeatureGroupLabel>
          <FeatureGrid>
            <FeatureCard
              icon={<FeatureIcon name="meal" color={p.primary} />}
              title="Family Meals"
              description={familyMealsDescription}
              onPress={() => router.push("/you/nutrition")}
            />
          </FeatureGrid>

          {/* "Help me navigate being a parent," one recommendation at a
              time — not a library to scan. */}
          {forYouToday && (
            <>
              <FeatureGroupLabel>FOR YOU TODAY</FeatureGroupLabel>
              <MicroLearningCard
                eyebrow={forYouTodayArea?.label ?? "For you"}
                title={forYouToday.title}
                reason={forYouToday.blurb}
                minutes={forYouToday.minutes}
                onPress={() => router.push(`/care/${forYouToday.slug}`)}
              />
            </>
          )}

          {/* Zone: the reference library, organised by area — for browsing
              over time rather than today's one recommendation. */}
          <FeatureGroupLabel>WELL BEING</FeatureGroupLabel>
          <FeatureGrid>
            {careAreas.map((area) => (
              <FeatureCard
                key={area.key}
                icon={<FeatureIcon name={CARE_ICONS[area.key]} color={p.primary} />}
                title={area.label}
                description={careAreaDescription(area)}
                status={`${area.topicCount} ${area.topicCount === 1 ? "topic" : "topics"}`}
                onPress={() => router.push(`/you/care?area=${area.key}`)}
              />
            ))}
          </FeatureGrid>

          {/* "Your Stage" — where things actually are right now, in one
              line, not another picked-topic list (that was the same
              recommendation engine as "For you today" above, reading as a
              repeat of it). */}
          {recoveryFramingApplies && (
            <View style={styles.block}>
              <FeatureGroupLabel>YOUR STAGE</FeatureGroupLabel>
              <Card style={styles.recoveryCard}>
                <Text style={[styles.recoveryStage, { color: p.primary }]}>
                  Week {profile.weeksPostpartum} postpartum
                </Text>
                <Text style={[styles.recoveryTitle, { color: p.text }]}>{recoveryLine}</Text>
              </Card>
            </View>
          )}

          {/* A mother's own Recovery activities. */}
          {showsRecovery && (
            <View style={styles.block}>
              <FeatureGroupLabel>FOR YOU THIS MONTH</FeatureGroupLabel>

              {needsBirthConfirmation ? (
                <BirthConfirmationCard
                  title="What type of birth did you have?"
                  body="So today's recovery activities actually fit your body."
                  saving={savingBirth}
                  onChoose={handleConfirmBirth}
                />
              ) : motherPlanLoading ? (
                <ActivityIndicator style={{ marginTop: spacing.lg }} />
              ) : (
                motherPlan?.activities.map((activity) => (
                  <Card key={activity.id} style={styles.activityCard}>
                    <Text style={[styles.activityCategory, { color: p.primary }]}>
                      {MOTHER_ACTIVITY_CATEGORY_LABEL[activity.category].toUpperCase()}
                    </Text>
                    <Text style={[styles.sectionTitle, { color: p.text }]}>{activity.title}</Text>
                    <Text style={[styles.sectionBody, { color: p.textMuted }]}>
                      {activity.description}
                    </Text>
                    <Text style={[styles.activityMeta, { color: p.textMuted }]}>
                      {activity.duration_minutes > 0 ? `${activity.duration_minutes} min · ` : ""}
                      {TIME_OF_DAY_LABEL[activity.time_of_day]}
                      {activity.with_baby === "yes" ? " · With baby" : ""}
                    </Text>
                    <Pressable
                      disabled={swapping === activity.category}
                      onPress={() => swapMotherActivity(activity.category)}
                      style={styles.swapButton}
                    >
                      <Text style={[styles.swapLabel, { color: p.primary }]}>
                        {swapping === activity.category ? "Swapping…" : "Try something else"}
                      </Text>
                    </Pressable>
                  </Card>
                ))
              )}
            </View>
          )}
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
function FatherYouBody({
  router,
  profile,
  recoveryChildName,
  showsStageContent,
  needsBirthConfirmation,
  savingBirth,
  onChooseBirth,
  fatherPlanActivities,
  fatherPlanLoading,
  fatherSwapping,
  onSwapFatherActivity,
}: {
  router: ReturnType<typeof useRouter>;
  profile: ParentProfile;
  recoveryChildName: string | null;
  /** Whether the postpartum/recovery window still applies to this father's
   *  youngest child — see lib/recoveryRelevance.ts. Once it doesn't, there
   *  is no daily father_activities plan and no meaningful "weeks in" stage
   *  line, so FOR TODAY and YOUR STAGE are skipped entirely rather than
   *  rendering empty or nonsensical (a three-year-old's father seeing
   *  "104 weeks in"). EXPLORE stays — browsable content isn't time-bound. */
  showsStageContent: boolean;
  needsBirthConfirmation: boolean;
  savingBirth: boolean;
  onChooseBirth: (value: DeliveryType) => void;
  fatherPlanActivities: FatherActivity[] | null;
  fatherPlanLoading: boolean;
  fatherSwapping: FatherActivity["category"] | null;
  onSwapFatherActivity: (category: FatherActivity["category"]) => void;
}) {
  const p = usePalette();
  const [expandedStage, setExpandedStage] = useState<FatherRole | null>(null);
  // Each FOR TODAY card starts collapsed to just its heading — tapping
  // one expands it in place to show the description, meta, and swap;
  // tapping again (or another card) collapses it. Same single-open
  // pattern as the Your Stage tiles below.
  const [expandedToday, setExpandedToday] = useState<FatherRole | null>(null);
  const dayIndex = Math.floor(Date.now() / 86_400_000);

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

  const roles: FatherRole[] = ["dad", "partner", "you"];

  return (
    <>
      {showsStageContent && (
        <>
      <View style={styles.block}>
        <FeatureGroupLabel>FOR TODAY</FeatureGroupLabel>

        {needsBirthConfirmation ? (
          <BirthConfirmationCard
            title="How did your partner give birth?"
            body="So today's suggestions actually fit where you both are."
            saving={savingBirth}
            onChoose={onChooseBirth}
          />
        ) : fatherPlanLoading ? (
          <ActivityIndicator style={{ marginTop: spacing.lg }} />
        ) : (
          roles.map((role) => {
            const activity = todaysActivityForRole(fatherPlanActivities ?? [], role, dayIndex);
            if (!activity) return null;
            const isExpanded = expandedToday === role;
            return (
              <Card
                key={role}
                style={styles.activityCard}
                onPress={() => setExpandedToday(isExpanded ? null : role)}
              >
                <Text style={[styles.activityCategory, { color: p.primary }]}>
                  {FATHER_ROLE_LABEL[role].toUpperCase()}
                </Text>
                <Text style={[styles.sectionTitle, { color: p.text }]}>{activity.title}</Text>
                {isExpanded ? (
                  <>
                    <Text style={[styles.sectionBody, { color: p.textMuted }]}>
                      {activity.description}
                    </Text>
                    <Text style={[styles.activityMeta, { color: p.textMuted }]}>
                      {activity.duration_label}
                      {activity.with_baby === "yes" ? " · With baby" : ""}
                    </Text>
                    <Pressable
                      disabled={fatherSwapping === activity.category}
                      onPress={() => onSwapFatherActivity(activity.category)}
                      style={styles.swapButton}
                    >
                      <Text style={[styles.swapLabel, { color: p.primary }]}>
                        {fatherSwapping === activity.category ? "Swapping…" : "Try something else"}
                      </Text>
                    </Pressable>
                  </>
                ) : (
                  <Text style={[styles.tapHint, { color: p.primary }]}>Tap to view</Text>
                )}
              </Card>
            );
          })
        )}

        {!needsBirthConfirmation && !fatherPlanLoading && (
          <Pressable onPress={() => router.push("/you/for-today")} style={styles.seeMoreRow}>
            <Text style={[styles.seeMoreText, { color: p.primary }]}>See more for today →</Text>
          </Pressable>
        )}
      </View>

      {/* Context, not tasks: three short, tap-to-expand tiles rather than
          another picked-topic list. Each expanded tile offers a way into
          the fuller Explore hub for whoever wants more than a paragraph. */}
      <View style={styles.block}>
        <FeatureGroupLabel>{`${elapsedPhrase(profile.weeksPostpartum)} in`}</FeatureGroupLabel>
        <Text style={[styles.stageSubtext, { color: p.textMuted }]}>
          A little context for where things are now.
        </Text>

        {roles.map((role) => {
          const expanded = expandedStage === role;
          return (
            <Card
              key={role}
              style={styles.stageTile}
              onPress={() => setExpandedStage(expanded ? null : role)}
            >
              <View style={styles.rowBetween}>
                <Text style={[styles.stageTileLabel, { color: p.text }]}>
                  {STAGE_TILE_LABEL[role]}
                </Text>
                <Text style={[styles.stageTileToggle, { color: p.primary }]}>
                  {expanded ? "Hide" : "More"}
                </Text>
              </View>
              {expanded && (
                <>
                  <Text style={[styles.sectionBody, { color: p.textMuted, marginTop: spacing.sm }]}>
                    {stageCopy[role]}
                  </Text>
                  <Pressable onPress={() => router.push(`/you/care?hub=${role}`)}>
                    <Text style={[styles.stageTileLink, { color: p.primary }]}>
                      Read more in {FATHER_ROLE_HUB_LABEL[role]} →
                    </Text>
                  </Pressable>
                </>
              )}
            </Card>
          );
        })}
      </View>
        </>
      )}

      {/* Exactly three hubs — everything that used to be a per-area Well
          Being grid, or a "fathering"-tagged article, now buckets into
          one of these (see lib/fatherRoles.ts topicsForFatherRole). Always
          shown, unlike FOR TODAY/YOUR STAGE above — browsable content
          isn't time-bound the way a postpartum daily plan is. */}
      <FeatureGroupLabel>EXPLORE</FeatureGroupLabel>
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
          wide
        />
      </FeatureGrid>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  block: {
    marginTop: spacing.xl,
  },
  recoveryCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
  },
  recoveryStage: {
    fontFamily: fonts.serifItalic,
    fontSize: typeScale.body,
    marginBottom: spacing.sm,
  },
  recoveryTitle: {
    fontFamily: fonts.body,
    fontSize: typeScale.body,
    lineHeight: typeScale.body * 1.6,
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
  tapHint: {
    fontFamily: fonts.bodyMedium,
    fontSize: typeScale.bodySmall,
    marginTop: spacing.xs,
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
    marginTop: -spacing.xs,
    marginBottom: spacing.sm,
  },
  stageTile: {
    padding: spacing.lg,
    marginTop: spacing.sm,
  },
  stageTileLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.h3,
  },
  stageTileToggle: {
    fontFamily: fonts.bodyMedium,
    fontSize: typeScale.bodySmall,
  },
  stageTileLink: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.bodySmall,
    marginTop: spacing.md,
  },
});
