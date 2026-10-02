import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Card } from "../../../../components/parentUI";
import { useAuth } from "../../../../lib/AuthProvider";
import * as motherPlans from "../../../../lib/db/motherPlans";
import {
  MOTHER_ACTIVITY_CATEGORY_LABEL,
  type MotherActivity,
  type MotherActivityTimeOfDay,
} from "../../../../lib/db/types";
import { MOTHER_ROLE_ACTIVITY_CATEGORIES, type MotherRole } from "../../../../lib/motherRoles";
import { usePalette } from "../../../../lib/ModeProvider";
import { fonts, radius, spacing, typeScale } from "../../../../lib/theme";

const TIME_OF_DAY_LABEL: Record<MotherActivityTimeOfDay, string> = {
  anytime: "Anytime",
  morning: "Morning",
  evening: "Evening",
  during_nap: "During a nap",
};

/** Which FOR TODAY role an activity's category belongs under, for the
 *  eyebrow ("MOTHER · FOR ME · 10 MIN · MORNING") -- the same grouping
 *  lib/motherRoles.ts already uses for the home hub's role tabs. */
function roleForCategory(category: MotherActivity["category"]): MotherRole {
  const entry = (Object.entries(MOTHER_ROLE_ACTIVITY_CATEGORIES) as [MotherRole, string[]][]).find(
    ([, categories]) => categories.includes(category)
  );
  return entry?.[0] ?? "me";
}

const ROLE_EYEBROW: Record<MotherRole, string> = {
  me: "FOR ME",
  child: "WITH MY CHILD",
  together: "TOGETHER",
};

/**
 * One mother_activities row, in full -- reached from a FOR TODAY card's
 * "See how" or the wellbeing hub's featured "START HERE" card. Renders
 * the new structured content (short_description/steps/why_this/
 * requires_doctor_clearance) added by the 20261002090000 migration, with
 * a fallback to the original single-paragraph `description` for the ~28
 * NICU/preterm rows that migration didn't cover (see lib/db/types.ts).
 *
 * No video/demo asset -- deliberately out of scope for this pass (not a
 * generatable content problem, a production-asset one).
 *
 * "Done" and "Something else" map to real, already-existing concepts
 * (closing the screen, and the same swap-today's-activity RPC the home
 * hub's card already uses). "Save" isn't here -- there's no saved-items
 * table for mother_activities yet, and a button with nothing behind it
 * is worse than one fewer button.
 */
export default function ActivityDetail() {
  const p = usePalette();
  const router = useRouter();
  const { id, category: categoryParam } = useLocalSearchParams<{ id: string; category?: string }>();
  const { session } = useAuth();

  const [activity, setActivity] = useState<MotherActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [cleared, setCleared] = useState<boolean | null>(null);
  const [swapping, setSwapping] = useState(false);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    setLoading(true);
    motherPlans
      .getMotherActivity(id)
      .then((row) => {
        if (alive) setActivity(row);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [id]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: p.bg }]}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!activity) {
    return (
      <View style={[styles.center, { backgroundColor: p.bg }]}>
        <Text style={{ color: p.textMuted, fontFamily: fonts.body }}>
          This activity isn't available right now.
        </Text>
      </View>
    );
  }

  const role = roleForCategory(activity.category);
  const steps = activity.steps ?? [];
  const whyThis = activity.why_this ?? activity.description;
  const gateBlocksSteps = activity.requires_doctor_clearance && cleared !== true;

  const handleSomethingElse = async () => {
    const profileId = session?.user?.id;
    if (!profileId) return;
    setSwapping(true);
    try {
      await motherPlans.swapMotherCategory(profileId, activity.category);
      router.back();
    } finally {
      setSwapping(false);
    }
  };

  return (
    <ScrollView
      style={{ backgroundColor: p.bg }}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.eyebrow, { color: p.primary }]}>
        MOTHER · {ROLE_EYEBROW[role]} · {activity.duration_minutes > 0 ? `${activity.duration_minutes} MIN · ` : ""}
        {TIME_OF_DAY_LABEL[activity.time_of_day].toUpperCase()}
      </Text>
      <Text style={[styles.title, { color: p.text }]}>{activity.title}</Text>
      {activity.short_description && (
        <Text style={[styles.shortDescription, { color: p.textMuted }]}>{activity.short_description}</Text>
      )}

      {activity.requires_doctor_clearance && (
        <Card style={[styles.clearanceCard, { borderColor: p.primary }]}>
          <Text style={[styles.clearanceTitle, { color: p.text }]}>
            {activity.clearance_copy ?? "Has your doctor cleared you for exercise?"}
          </Text>
          <View style={styles.clearanceRow}>
            <Pressable
              onPress={() => setCleared(true)}
              style={[styles.clearanceButton, { backgroundColor: p.primary }]}
            >
              <Text style={[styles.clearanceButtonText, { color: p.surface }]}>Yes, cleared</Text>
            </Pressable>
            <Pressable
              onPress={() => setCleared(false)}
              style={[styles.clearanceButtonOutline, { borderColor: p.border }]}
            >
              <Text style={[styles.clearanceButtonOutlineText, { color: p.text }]}>Not yet</Text>
            </Pressable>
          </View>
        </Card>
      )}

      {steps.length > 0 && !gateBlocksSteps && (
        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionHeading, { color: p.text }]}>How to do it</Text>
          {steps.map((step, index) => (
            <View key={index} style={styles.stepRow}>
              <View style={[styles.stepNumber, { backgroundColor: p.surfaceAlt }]}>
                <Text style={[styles.stepNumberText, { color: p.primary }]}>{index + 1}</Text>
              </View>
              <Text style={[styles.stepText, { color: p.text }]}>{step}</Text>
            </View>
          ))}
        </Card>
      )}

      {gateBlocksSteps && (
        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionBody, { color: p.textMuted }]}>
            Check with your doctor before trying this one -- the steps will show once you've confirmed.
          </Text>
        </Card>
      )}

      <Card style={styles.sectionCard}>
        <Text style={[styles.sectionHeading, { color: p.text }]}>Why this one</Text>
        <Text style={[styles.sectionBody, { color: p.textMuted }]}>{whyThis}</Text>
      </Card>

      <View style={styles.actionRow}>
        <Pressable onPress={() => router.back()} style={[styles.doneButton, { backgroundColor: p.primary }]}>
          <Text style={[styles.doneButtonText, { color: p.surface }]}>Done</Text>
        </Pressable>
        <Pressable onPress={handleSomethingElse} disabled={swapping} style={styles.somethingElseButton}>
          <Text style={[styles.somethingElseText, { color: p.primary }]}>
            {swapping ? "Swapping…" : "Something else"}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  eyebrow: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.caption,
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
  },
  title: {
    fontFamily: fonts.bodyBold,
    fontSize: typeScale.h1,
    lineHeight: typeScale.h1 * 1.2,
  },
  shortDescription: {
    fontFamily: fonts.body,
    fontSize: typeScale.body,
    lineHeight: typeScale.body * 1.5,
    marginTop: spacing.sm,
  },
  clearanceCard: {
    padding: spacing.lg,
    marginTop: spacing.lg,
    borderWidth: 1.5,
  },
  clearanceTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.bodySmall,
    lineHeight: typeScale.bodySmall * 1.5,
    marginBottom: spacing.md,
  },
  clearanceRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  clearanceButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
  },
  clearanceButtonText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.bodySmall,
  },
  clearanceButtonOutline: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  clearanceButtonOutlineText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.bodySmall,
  },
  sectionCard: {
    padding: spacing.lg,
    marginTop: spacing.lg,
  },
  sectionHeading: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.h3,
    marginBottom: spacing.md,
  },
  sectionBody: {
    fontFamily: fonts.body,
    fontSize: typeScale.bodySmall,
    lineHeight: typeScale.bodySmall * 1.6,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  stepNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  stepNumberText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.caption,
  },
  stepText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: typeScale.bodySmall,
    lineHeight: typeScale.bodySmall * 1.55,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    marginTop: spacing.xl,
  },
  doneButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
  },
  doneButtonText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.body,
  },
  somethingElseButton: {
    paddingVertical: spacing.sm,
  },
  somethingElseText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.bodySmall,
    textDecorationLine: "underline",
  },
});
