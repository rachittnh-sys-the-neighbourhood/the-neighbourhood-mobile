import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Card } from "../../../../components/parentUI";
import { useAuth } from "../../../../lib/AuthProvider";
import * as fatherPlans from "../../../../lib/db/fatherPlans";
import type { FatherActivity } from "../../../../lib/db/types";
import { FATHER_ROLE_ACTIVITY_CATEGORIES, FATHER_ROLE_LABEL, type FatherRole } from "../../../../lib/fatherRoles";
import { usePalette } from "../../../../lib/ModeProvider";
import { fonts, radius, spacing, typeScale } from "../../../../lib/theme";

/** Which FOR TODAY role an activity's category belongs under, for the
 *  eyebrow -- mirrors app/(tabs)/you/activity/[id].tsx's roleForCategory. */
function roleForCategory(category: FatherActivity["category"]): FatherRole {
  const entry = (Object.entries(FATHER_ROLE_ACTIVITY_CATEGORIES) as [FatherRole, string[]][]).find(
    ([, categories]) => categories.includes(category)
  );
  return entry?.[0] ?? "dad";
}

/**
 * One father_activities row, in full -- the father-side mirror of
 * app/(tabs)/you/activity/[id].tsx. No doctor-clearance gate: nothing in
 * father_activities involves his own postpartum body, so every row goes
 * straight to steps once loaded, unlike the mother version. Falls back
 * to the original `description` for any row the 20261002100000
 * structured-content migration somehow didn't reach.
 *
 * Same "Done"/"Something else" shape as mother's -- no "Save", for the
 * same reason (no saved-items table for either activities table yet).
 */
export default function FatherActivityDetail() {
  const p = usePalette();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();

  const [activity, setActivity] = useState<FatherActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [swapping, setSwapping] = useState(false);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    setLoading(true);
    fatherPlans
      .getFatherActivity(id)
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

  const handleSomethingElse = async () => {
    const profileId = session?.user?.id;
    if (!profileId) return;
    setSwapping(true);
    try {
      await fatherPlans.swapFatherCategory(profileId, activity.category);
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
        FATHER · {FATHER_ROLE_LABEL[role].toUpperCase()} · {activity.duration_label.toUpperCase()}
      </Text>
      <Text style={[styles.title, { color: p.text }]}>{activity.title}</Text>
      {activity.short_description && (
        <Text style={[styles.shortDescription, { color: p.textMuted }]}>{activity.short_description}</Text>
      )}

      {steps.length > 0 && (
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
