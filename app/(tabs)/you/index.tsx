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
  FATHER_ACTIVITY_CATEGORY_LABEL,
  MOTHER_ACTIVITY_CATEGORY_LABEL,
  type FatherActivity,
  type MotherActivity,
} from "../../../lib/db/types";
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
 * content (his own support activities, never postpartum recovery
 * presented as his own), a mother sees only mother content (her recovery
 * activities, never "For dads"). "Well Being" already filters by role via
 * visibleCareAreas — reused here, not re-derived.
 *
 * Fixed hierarchy, one job per section, deliberately in this order: Check-
 * in (how are you) → Family Meals (what's the family eating) → For You
 * Today (one quick read) → Well Being (the browsable library, for when
 * one read isn't enough) → Your Stage (where things actually are right
 * now, in one line — NOT another picked-topic list; that used to sit here
 * and just duplicated "For You Today" a second time) → For You This Month
 * (the actual activities to do, role-gated). This used to also carry a
 * "Your Stage" pair of recommended topics and a separate "Today" screen
 * (you/today.tsx, since folded in here) that between them read as the
 * same content three or four times over with no real hierarchy — this is
 * the trimmed version.
 *
 * The check-in itself is the meal planner workbook's two-question
 * Recovery Check-in (energy, and whether help is available today) —
 * replacing the old five-emoji mood picker, which was never actually
 * saved anywhere. See components/CheckInCard.tsx.
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

const FATHER_TIME_OF_DAY_LABEL: Record<FatherActivity["time_of_day"], string> = {
  anytime: "Anytime",
  morning: "Morning",
  evening: "Evening",
  night: "Night",
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

      {/* Family Meals — the one door into the meal planner now; the old
          "Nutrition" card and the redundant "Today" card it sat beside are
          both gone. The full day's timeline, the expert-review banner and
          the mother's own diet-specific boost live on the screen this
          opens. Right after the check-in — food is as much a daily,
          practical concern as how you're doing. */}
      <FeatureGroupLabel>FAMILY MEALS</FeatureGroupLabel>
      <FeatureGrid>
        <FeatureCard
          icon={<FeatureIcon name="meal" color={p.primary} />}
          title="Family Meals"
          description={familyMealsDescription}
          onPress={() => router.push("/you/nutrition")}
        />
      </FeatureGrid>

      {/* "Help me navigate being a parent," one recommendation at a time —
          not a library to scan. */}
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
          over time rather than today's one recommendation. Already
          role-filtered by visibleCareAreas: a father never sees "Physical
          recovery", "For dads" only ever appears for a father. Moved up
          here, right after today's one pick, since it's the natural next
          stop from "read one thing" to "browse more like it". */}
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

      {/* "Your Stage" — where things actually are right now, in one line,
          not another picked-topic list (that was the same recommendation
          engine as "For you today" above, reading as a repeat of it).
          Shown to both roles: a father's own subtitle already counts
          elapsed time the same way, so this isn't mother-only context. */}
      {recoveryFramingApplies && (
        <View style={styles.block}>
          <FeatureGroupLabel>YOUR STAGE</FeatureGroupLabel>
          <Card style={styles.recoveryCard}>
            <Text style={[styles.recoveryStage, { color: p.primary }]}>
              {profile.role === "father"
                ? `${elapsedPhrase(profile.weeksPostpartum)} in`
                : `Week ${profile.weeksPostpartum} postpartum`}
            </Text>
            <Text style={[styles.recoveryTitle, { color: p.text }]}>{recoveryLine}</Text>
          </Card>
        </View>
      )}

      {/* A mother's own Recovery activities — never shown to a father,
          whose relevant support lives in the block right below instead. */}
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
                <Text style={[styles.sectionBody, { color: p.textMuted }]}>{activity.description}</Text>
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

      {/* A father's own support set — parallel to the mother's Recovery
          block above, but scoped to what he actually does: supporting
          her, bonding with the baby, the relationship, his own wellbeing,
          becoming a father, and the practical load. Never shown to a
          mother. */}
      {showsFatherSupport && (
        <View style={styles.block}>
          <FeatureGroupLabel>FOR YOU THIS MONTH</FeatureGroupLabel>

          {needsBirthConfirmation ? (
            <BirthConfirmationCard
              title="How did your partner give birth?"
              body="So today's suggestions actually fit where you both are."
              saving={savingBirth}
              onChoose={handleConfirmBirth}
            />
          ) : fatherPlanLoading ? (
            <ActivityIndicator style={{ marginTop: spacing.lg }} />
          ) : (
            fatherPlan?.activities.map((activity) => (
              <Card key={activity.id} style={styles.activityCard}>
                <Text style={[styles.activityCategory, { color: p.primary }]}>
                  {FATHER_ACTIVITY_CATEGORY_LABEL[activity.category].toUpperCase()}
                </Text>
                <Text style={[styles.sectionTitle, { color: p.text }]}>{activity.title}</Text>
                <Text style={[styles.sectionBody, { color: p.textMuted }]}>{activity.description}</Text>
                <Text style={[styles.activityMeta, { color: p.textMuted }]}>
                  {activity.duration_label} · {FATHER_TIME_OF_DAY_LABEL[activity.time_of_day]}
                  {activity.with_baby === "yes" ? " · With baby" : ""}
                </Text>
                <Pressable
                  disabled={fatherSwapping === activity.category}
                  onPress={() => swapFatherActivity(activity.category)}
                  style={styles.swapButton}
                >
                  <Text style={[styles.swapLabel, { color: p.primary }]}>
                    {fatherSwapping === activity.category ? "Swapping…" : "Try something else"}
                  </Text>
                </Pressable>
              </Card>
            ))
          )}
        </View>
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
});
