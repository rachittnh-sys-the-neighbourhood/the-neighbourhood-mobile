import { useMemo } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Card, CareNote, PageHeading, SectionLabel } from "../../../components/parentUI";
import { useAuth } from "../../../lib/AuthProvider";
import { computeAge, youngestChild } from "../../../lib/childAge";
import { FATHER_ACTIVITY_CATEGORY_LABEL, type FatherActivity } from "../../../lib/db/types";
import {
  FATHER_ROLE_ACTIVITY_CATEGORIES,
  FATHER_ROLE_LABEL,
  type FatherRole,
} from "../../../lib/fatherRoles";
import { usePalette } from "../../../lib/ModeProvider";
import { deriveProfile } from "../../../lib/parentCare";
import { fonts, spacing, typeScale } from "../../../lib/theme";
import { useTodaysFatherPlan } from "../../../lib/useTodaysFatherPlan";

const FATHER_TIME_OF_DAY_LABEL: Record<FatherActivity["time_of_day"], string> = {
  anytime: "Anytime",
  morning: "Morning",
  evening: "Evening",
  night: "Night",
};

const FATHER_ROLE_ORDER: FatherRole[] = ["dad", "partner", "you"];

/**
 * The father's full monthly activity inventory — all six
 * father_activities categories, one activity each, grouped by the same
 * three roles as the You hub's "FOR TODAY" (see lib/fatherRoles.ts).
 *
 * This used to BE the whole "FOR YOU THIS MONTH" section on the hub
 * itself; it's here now specifically so the hub's FOR TODAY stays to
 * three cards, not six — see you/index.tsx.
 */
export default function ForToday() {
  const p = usePalette();
  const { session, profile: authProfile, children } = useAuth();

  const recoveryChild = youngestChild(children);
  const ageMonths = recoveryChild ? computeAge(recoveryChild.date_of_birth)?.totalMonths ?? 0 : 0;
  const profile = useMemo(() => deriveProfile(ageMonths, authProfile), [ageMonths, authProfile]);

  const profileId = profile.role === "father" ? session?.user?.id ?? null : null;
  const { plan, loading, swapping, swap } = useTodaysFatherPlan(profileId);

  if (loading) {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: p.bg }]}>
        <ActivityIndicator />
      </View>
    );
  }

  const activities = plan?.activities ?? [];

  return (
    <ScrollView
      style={{ backgroundColor: p.bg }}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <PageHeading
        eyebrow="For today"
        title="This month's activities."
        body="Everything today's three picks are drawn from — swap any one for another in its own category."
      />

      {FATHER_ROLE_ORDER.map((role) => {
        const roleActivities = activities.filter((a) =>
          FATHER_ROLE_ACTIVITY_CATEGORIES[role].includes(a.category)
        );
        if (roleActivities.length === 0) return null;
        return (
          <View key={role} style={styles.block}>
            <SectionLabel>{FATHER_ROLE_LABEL[role]}</SectionLabel>
            {roleActivities.map((activity) => (
              <Card key={activity.id} style={styles.activityCard}>
                <Text style={[styles.activityCategory, { color: p.primary }]}>
                  DO · {FATHER_ACTIVITY_CATEGORY_LABEL[activity.category].toUpperCase()}
                </Text>
                <Text style={[styles.sectionTitle, { color: p.text }]}>{activity.title}</Text>
                <Text style={[styles.sectionBody, { color: p.textMuted }]}>
                  {activity.description}
                </Text>
                <Text style={[styles.activityMeta, { color: p.textMuted }]}>
                  {activity.duration_label} · {FATHER_TIME_OF_DAY_LABEL[activity.time_of_day]}
                  {activity.with_baby === "yes" ? " · With baby" : ""}
                </Text>
                <Pressable
                  disabled={swapping === activity.category}
                  onPress={() => swap(activity.category)}
                  style={styles.swapButton}
                >
                  <Text style={[styles.swapLabel, { color: p.primary }]}>
                    {swapping === activity.category ? "Swapping…" : "Try something else"}
                  </Text>
                </Pressable>
              </Card>
            ))}
          </View>
        );
      })}

      <CareNote>
        General guidance, not a checklist — doing one of these today is doing enough.
      </CareNote>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  block: {
    marginTop: spacing.xl,
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
});
