import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Card, Chevron, PageHeading, SectionLabel } from "../../../components/parentUI";
import { useAuth } from "../../../lib/AuthProvider";
import { computeAge } from "../../../lib/childAge";
import * as family from "../../../lib/db/family";
import {
  FATHER_ACTIVITY_CATEGORY_LABEL,
  MOTHER_ACTIVITY_CATEGORY_LABEL,
  type FatherActivity,
  type MotherActivity,
} from "../../../lib/db/types";
import { usePalette } from "../../../lib/ModeProvider";
import {
  STAGE_LABEL,
  deliveryPhrase,
  deriveProfile,
  elapsedPhrase,
  mealsFor,
  topicBySlug,
  type DeliveryType,
} from "../../../lib/parentCare";
import { isRecoveryRelevant } from "../../../lib/recoveryRelevance";
import { fonts, radius, spacing, typeScale } from "../../../lib/theme";
import { useTodaysFatherPlan } from "../../../lib/useTodaysFatherPlan";
import { useTodaysMotherPlan } from "../../../lib/useTodaysMotherPlan";

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

/**
 * The parent's own daily companion — reached from the "Today" card on
 * You's hub. This is the content that used to BE all of You (before the
 * hub redesign moved the landing spot to a feature grid, matching Child).
 * The mood check-in that used to open this screen has since moved up to
 * the hub itself (see app/(tabs)/you/index.tsx) so it doesn't take an
 * extra tap to reach; everything below is what's left once that's gone.
 *
 * Role and child age are known from main onboarding by the time this
 * screen can even be reached (see app/onboarding/role.tsx), so nothing
 * here asks again. What changes is which cards this renders:
 * postpartum-specific framing (the header's "week N", the Recovery card,
 * the feeding-fluid nudge) only appears while isRecoveryRelevant(ageMonths)
 * holds and, for the feeding nudge, only for a parent who isn't the father
 * — the same rules Home and the Care hub already apply.
 */
function greeting(hour: number) {
  if (hour < 5) return "You're up late";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function ParentToday() {
  const router = useRouter();
  const p = usePalette();
  const { session, parentName, child, profile: authProfile, refreshFamily } = useAuth();

  const ageMonths = child ? computeAge(child.date_of_birth)?.totalMonths ?? 0 : 0;
  const profile = useMemo(
    () => deriveProfile(ageMonths, authProfile),
    [ageMonths, authProfile],
  );
  const recoveryFramingApplies = isRecoveryRelevant(ageMonths);
  const showsRecovery = recoveryFramingApplies && profile.role !== "father";
  const showsFatherSupport = recoveryFramingApplies && profile.role === "father";

  // Never answered at all — distinct from an explicit "prefer_not_to_say",
  // which is a real answer and shouldn't be asked again every visit. Fathers
  // are never asked their partner's birth method during onboarding (see
  // lib/OnboardingProvider.tsx asksBirthingQuestions), so this is the first
  // time a father sees this question — same `profiles.birth_method` field,
  // reused to mean "his partner's delivery type" rather than his own.
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

  const firstName = parentName?.trim().split(" ")[0];

  const breakfast = mealsFor(profile, "breakfast")[0];
  const lunch = mealsFor(profile, "lunch")[0];
  const dinner = mealsFor(profile, "dinner")[0];
  const snack =
    mealsFor(profile, "afternoon_snack")[0] ?? mealsFor(profile, "morning_snack")[0];
  const nourishment = [breakfast, lunch, dinner, snack].filter(Boolean);
  const learning = topicBySlug("sleep-when-broken");

  // "Feeding quietly pulls fluid from you too" assumes the reader is the
  // one physically feeding — true for a mother, not for a father, whether
  // or not a postpartum framing still fits the child's age.
  const feedingInsight =
    profile.role !== "father" && profile.feeding !== "formula" && profile.feeding !== "prefer_not_to_say"
      ? "Since feeding quietly pulls fluid from you too, have a glass of water after your next feed."
      : profile.feeding === "formula"
        ? "Since today still runs around feeds and naps, keep one drink where you usually sit."
        : "Whatever the routine, keeping a drink within reach is the simplest habit to build.";

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
      <PageHeading
        eyebrow={
          recoveryFramingApplies
            ? `${STAGE_LABEL[profile.stage]} · week ${profile.weeksPostpartum}`
            : "YOUR SPACE"
        }
        title={`${greeting(new Date().getHours())}${firstName ? `, ${firstName}` : ""}.`}
        body="How can we make today a little easier for you?"
      />

      <Card style={styles.intelligentNudge}>
        <Text style={[styles.nudgeEyebrow, { color: p.primary }]}>TODAY'S REMINDER</Text>
        <Text style={[styles.nudgeTitle, { color: p.text }]}>{feedingInsight}</Text>
        <Text style={[styles.nudgeBody, { color: p.textMuted }]}>
          Put the glass beside the place you already are. No tracking, no catching up.
        </Text>
      </Card>

      <View style={styles.block}>
        <SectionLabel>Today's nourishment</SectionLabel>
        <Card onPress={() => router.push("/you/nutrition")} style={styles.editorialCard}>
          <View style={styles.rowBetween}>
            <View style={styles.titleGroup}>
              <Text style={[styles.sectionTitle, { color: p.text }]}>
                {recoveryFramingApplies ? "Food that supports recovery" : "Food that keeps you steady"}
              </Text>
              <Text style={[styles.sectionBody, { color: p.textMuted }]}>
                Iron, protein, calcium, hydration, and steady energy. No calories to count.
              </Text>
            </View>
            <Chevron />
          </View>
          <View style={styles.mealList}>
            {nourishment.map((meal) => (
              <View
                key={meal.id}
                style={[styles.mealRow, { borderTopColor: p.border }]}
              >
                <Text style={[styles.mealSlot, { color: p.primary }]}>
                  {meal.slot.includes("snack") ? "Snack" : meal.slot}
                </Text>
                <View style={styles.mealCopy}>
                  <Text style={[styles.mealTitle, { color: p.text }]}>{meal.title}</Text>
                  <Text style={[styles.mealMeta, { color: p.textMuted }]}>
                    {meal.minutes} min · {meal.blurb}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </Card>
      </View>

      <View style={styles.block}>
        <SectionLabel>Take five</SectionLabel>
        <Card style={styles.actionCard}>
          <Text style={[styles.sectionTitle, { color: p.text }]}>Shoulder drop and slow walk</Text>
          <Text style={[styles.sectionBody, { color: p.textMuted }]}>
            Roll your shoulders back five times, unclench your jaw, then walk to the window
            or outside for a few quiet minutes. Gentle is the whole point.
          </Text>
          <Text style={[styles.reason, { color: p.primary }]}>
            {recoveryFramingApplies && profile.role !== "father"
              ? `Designed for ${elapsedPhrase(profile.weeksPostpartum)} after ${deliveryPhrase(profile.delivery)}.`
              : "A small reset, any time of day."}
          </Text>
        </Card>
      </View>

      {/* A father's relevant support lives in "For Dads" instead — this
          section is specifically about the birthing parent's own body, so
          it never shows for him, the same rule Care and Home already apply. */}
      {showsRecovery && (
        <View style={styles.block}>
          <SectionLabel>Recovery</SectionLabel>
          <Card onPress={() => router.push("/you/care")} style={styles.recoveryCard}>
            <Text style={[styles.recoveryStage, { color: p.primary }]}>
              Week {profile.weeksPostpartum} postpartum
            </Text>
            <Text style={[styles.recoveryTitle, { color: p.text }]}>{recoveryLine}</Text>
            <View style={styles.learnRow}>
              <Text style={[styles.learnLink, { color: p.primary }]}>Read the full guide</Text>
              <Chevron />
            </View>
          </Card>

          {needsBirthConfirmation ? (
            <Card style={[styles.actionCard, styles.birthPromptCard]}>
              <Text style={[styles.sectionTitle, { color: p.text }]}>
                What type of birth did you have?
              </Text>
              <Text style={[styles.sectionBody, { color: p.textMuted }]}>
                So today's recovery activities actually fit your body.
              </Text>
              <View style={styles.birthOptionRow}>
                {BIRTH_OPTIONS.map((option) => (
                  <Pressable
                    key={option.value}
                    disabled={savingBirth}
                    onPress={() => handleConfirmBirth(option.value)}
                    style={[styles.birthOption, { borderColor: p.border }]}
                  >
                    <Text style={[styles.birthOptionLabel, { color: p.text }]}>
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {savingBirth && <ActivityIndicator style={{ marginTop: spacing.sm }} />}
            </Card>
          ) : motherPlanLoading ? (
            <ActivityIndicator style={{ marginTop: spacing.lg }} />
          ) : (
            motherPlan?.activities.map((activity) => (
              <Card key={activity.id} style={[styles.actionCard, styles.recoveryActivityCard]}>
                <Text style={[styles.recoveryActivityCategory, { color: p.primary }]}>
                  {MOTHER_ACTIVITY_CATEGORY_LABEL[activity.category].toUpperCase()}
                </Text>
                <Text style={[styles.sectionTitle, { color: p.text }]}>{activity.title}</Text>
                <Text style={[styles.sectionBody, { color: p.textMuted }]}>
                  {activity.description}
                </Text>
                <Text style={[styles.recoveryActivityMeta, { color: p.textMuted }]}>
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
          block above, but scoped to what he actually does: supporting her,
          bonding with the baby, the relationship, his own wellbeing,
          becoming a father, and the practical load. */}
      {showsFatherSupport && (
        <View style={styles.block}>
          <SectionLabel>For you, this month</SectionLabel>

          {needsBirthConfirmation ? (
            <Card style={[styles.actionCard, styles.birthPromptCard]}>
              <Text style={[styles.sectionTitle, { color: p.text }]}>
                How did your partner give birth?
              </Text>
              <Text style={[styles.sectionBody, { color: p.textMuted }]}>
                So today's suggestions actually fit where you both are.
              </Text>
              <View style={styles.birthOptionRow}>
                {BIRTH_OPTIONS.map((option) => (
                  <Pressable
                    key={option.value}
                    disabled={savingBirth}
                    onPress={() => handleConfirmBirth(option.value)}
                    style={[styles.birthOption, { borderColor: p.border }]}
                  >
                    <Text style={[styles.birthOptionLabel, { color: p.text }]}>
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {savingBirth && <ActivityIndicator style={{ marginTop: spacing.sm }} />}
            </Card>
          ) : fatherPlanLoading ? (
            <ActivityIndicator style={{ marginTop: spacing.lg }} />
          ) : (
            fatherPlan?.activities.map((activity) => (
              <Card key={activity.id} style={[styles.actionCard, styles.recoveryActivityCard]}>
                <Text style={[styles.recoveryActivityCategory, { color: p.primary }]}>
                  {FATHER_ACTIVITY_CATEGORY_LABEL[activity.category].toUpperCase()}
                </Text>
                <Text style={[styles.sectionTitle, { color: p.text }]}>{activity.title}</Text>
                <Text style={[styles.sectionBody, { color: p.textMuted }]}>
                  {activity.description}
                </Text>
                <Text style={[styles.recoveryActivityMeta, { color: p.textMuted }]}>
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

      <View style={styles.block}>
        <SectionLabel>Rest tip</SectionLabel>
        <Card style={styles.actionCard}>
          <Text style={[styles.sectionTitle, { color: p.text }]}>Lower expectations today</Text>
          <Text style={[styles.sectionBody, { color: p.textMuted }]}>
            If another caregiver takes over, sleep first and reset the house later.
            Rest during the baby's afternoon nap counts, even if it is only twenty minutes.
          </Text>
        </Card>
      </View>

      {learning && (
        <View style={styles.block}>
          <SectionLabel>Learn</SectionLabel>
          <Card onPress={() => router.push(`/care/${learning.slug}`)} style={styles.learnCard}>
            <View style={styles.rowBetween}>
              <View style={styles.titleGroup}>
                <Text style={[styles.sectionTitle, { color: p.text }]}>{learning.title}</Text>
                <Text style={[styles.sectionBody, { color: p.textMuted }]}>
                  {learning.blurb}
                </Text>
                <Text style={[styles.reason, { color: p.primary }]}>
                  {learning.minutes} min read
                </Text>
              </View>
              <Chevron />
            </View>
          </Card>
        </View>
      )}

      <Text style={[styles.footer, { color: p.textMuted }]}>
        This is here to inform, not to replace. If something feels off, your
        instinct is worth following. Reach out to your doctor.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  intelligentNudge: {
    padding: spacing.lg,
    marginTop: spacing.md,
  },
  nudgeEyebrow: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.caption,
    letterSpacing: 1.4,
  },
  nudgeTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: typeScale.h2,
    lineHeight: typeScale.h2 * 1.3,
    marginTop: spacing.sm,
  },
  nudgeBody: {
    fontFamily: fonts.body,
    fontSize: typeScale.bodySmall,
    lineHeight: typeScale.bodySmall * 1.55,
    marginTop: spacing.sm,
  },
  block: {
    marginTop: spacing.xl,
  },
  editorialCard: {
    padding: spacing.lg,
  },
  actionCard: {
    padding: spacing.lg,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  titleGroup: {
    flex: 1,
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
  mealList: {
    marginTop: spacing.md,
  },
  mealRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.md,
    marginTop: spacing.md,
    flexDirection: "row",
    gap: spacing.md,
  },
  mealSlot: {
    width: 64,
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.caption,
    textTransform: "capitalize",
  },
  mealCopy: {
    flex: 1,
  },
  mealTitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: typeScale.bodySmall,
    lineHeight: typeScale.bodySmall * 1.35,
  },
  mealMeta: {
    fontFamily: fonts.body,
    fontSize: typeScale.caption,
    lineHeight: typeScale.caption * 1.45,
    marginTop: 2,
  },
  reason: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.caption,
    lineHeight: typeScale.caption * 1.45,
    marginTop: spacing.sm,
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
  learnRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  learnLink: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.bodySmall,
  },
  learnCard: {
    padding: spacing.lg,
  },
  birthPromptCard: {
    marginTop: spacing.md,
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
  recoveryActivityCard: {
    marginTop: spacing.md,
  },
  recoveryActivityCategory: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.caption,
    letterSpacing: 1.2,
    marginBottom: spacing.xs,
  },
  recoveryActivityMeta: {
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
  footer: {
    fontFamily: fonts.body,
    fontSize: typeScale.caption,
    lineHeight: typeScale.caption * 1.6,
    marginTop: spacing.xl,
    textAlign: "center",
    paddingHorizontal: spacing.md,
  },
});
