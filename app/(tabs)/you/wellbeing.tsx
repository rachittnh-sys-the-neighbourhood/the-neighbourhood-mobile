import { useRouter } from "expo-router";
import { useMemo } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { FeatureCard, FeatureGrid, FeatureIcon, type FeatureIconName } from "../../../components/FeatureHub";
import { Card, SectionTitle } from "../../../components/parentUI";
import { useAuth } from "../../../lib/AuthProvider";
import { computeAge, youngestChild } from "../../../lib/childAge";
import { usePalette } from "../../../lib/ModeProvider";
import { CARE_AREAS, deriveProfile, elapsedPhrase, topicBySlug, type CareArea } from "../../../lib/parentCare";
import { fonts, radius, spacing, typeScale } from "../../../lib/theme";
import { useTodaysMotherPlan } from "../../../lib/useTodaysMotherPlan";

/** The four personal-wellbeing areas -- "Relationships" and "Who I am now"
 *  live one level up, on the You hub's own "Explore your space" grid, not
 *  inside this hub (see app/(tabs)/you/index.tsx). */
const WELLBEING_AREAS: CareArea[] = ["physical", "mental", "sleep", "feeding"];

const AREA_ICON: Record<CareArea, FeatureIconName> = {
  physical: "recovery",
  mental: "mental",
  sleep: "sleep",
  feeding: "meal",
  nutrition: "meal",
  fathering: "dads",
  relationships: "relationships",
};

/**
 * "Your wellbeing" -- the mother-only hub mockup 1 introduced: a
 * stage-aware reassurance, today's featured physical-recovery activity
 * (the same one FOR TODAY's "me" role surfaces, so tapping through from
 * either place lands on the same activity), one featured article, and a
 * "Find what helps" grid into the four personal-wellbeing areas.
 *
 * No helpline/crisis content here yet -- deliberately deferred, see
 * app/(tabs)/you/index.tsx's own note on the same topic.
 */
export default function Wellbeing() {
  const p = usePalette();
  const router = useRouter();
  const { session, children, profile: authProfile } = useAuth();

  const recoveryChild = youngestChild(children);
  const ageMonths = recoveryChild ? computeAge(recoveryChild.date_of_birth)?.totalMonths ?? 0 : 0;
  const profile = useMemo(() => deriveProfile(ageMonths, authProfile), [ageMonths, authProfile]);

  const { plan, loading } = useTodaysMotherPlan(session?.user?.id ?? null);
  const featuredActivity = plan?.activities.find((a) => a.category === "physical_recovery") ?? null;

  const featuredArticle = topicBySlug("managing-discomfort");

  const stageLine =
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
      <Text style={[styles.title, { color: p.text }]}>Your wellbeing</Text>
      <Text style={[styles.subtitle, { color: p.textMuted }]}>Support for you, at your stage.</Text>

      <Card style={styles.stageCard}>
        <Text style={[styles.stageEyebrow, { color: p.primary }]}>
          Week {profile.weeksPostpartum} postpartum
        </Text>
        <Text style={[styles.stageBody, { color: p.text }]}>{stageLine}</Text>
      </Card>

      {loading ? (
        <ActivityIndicator style={{ marginTop: spacing.lg }} />
      ) : (
        featuredActivity && (
          <Pressable
            onPress={() => router.push(`/you/activity/${featuredActivity.id}`)}
            style={[styles.featuredCard, { backgroundColor: p.primary }]}
          >
            <Text style={styles.featuredEyebrow}>
              START HERE · PHYSICAL RECOVERY
              {featuredActivity.duration_minutes > 0 ? ` · ${featuredActivity.duration_minutes} MIN` : ""}
            </Text>
            <Text style={styles.featuredTitle}>{featuredActivity.title}</Text>
            <Text style={styles.featuredDescription}>
              {featuredActivity.short_description ?? featuredActivity.description}
            </Text>
            <View style={[styles.seeHowButton, { backgroundColor: p.surface }]}>
              <Text style={[styles.seeHowText, { color: p.primary }]}>See how</Text>
            </View>
          </Pressable>
        )
      )}

      {featuredArticle && (
        <Card style={styles.articleCard} onPress={() => router.push(`/care/${featuredArticle.slug}`)}>
          <Text style={[styles.articleEyebrow, { color: p.primary }]}>
            IF YOU NEED IT · {featuredArticle.minutes} MIN READ
          </Text>
          <View style={styles.articleRow}>
            <Text style={[styles.articleTitle, { color: p.text }]}>{featuredArticle.title}</Text>
            <Text style={{ color: p.primary }}>→</Text>
          </View>
          <Text style={[styles.articleBlurb, { color: p.textMuted }]}>{featuredArticle.blurb}</Text>
        </Card>
      )}

      <View style={styles.block}>
        <SectionTitle>Find what helps</SectionTitle>
        <FeatureGrid>
          {WELLBEING_AREAS.map((key) => {
            const area = CARE_AREAS.find((a) => a.key === key);
            if (!area) return null;
            return (
              <FeatureCard
                key={key}
                icon={<FeatureIcon name={AREA_ICON[key]} color={p.primary} />}
                title={area.label}
                description={area.blurb}
                wide
                onPress={() => router.push(`/you/care?area=${key}`)}
              />
            );
          })}
        </FeatureGrid>
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
  title: {
    fontFamily: fonts.bodyBold,
    fontSize: typeScale.h1,
    lineHeight: typeScale.h1 * 1.2,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: typeScale.body,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  stageCard: {
    padding: spacing.lg,
  },
  stageEyebrow: {
    fontFamily: fonts.serifItalic,
    fontSize: typeScale.body,
    marginBottom: spacing.sm,
  },
  stageBody: {
    fontFamily: fonts.body,
    fontSize: typeScale.body,
    lineHeight: typeScale.body * 1.6,
  },
  featuredCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    marginTop: spacing.lg,
  },
  featuredEyebrow: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.caption,
    letterSpacing: 1.2,
    color: "rgba(255,255,255,0.85)",
    marginBottom: spacing.sm,
  },
  featuredTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: typeScale.h2,
    color: "#FFFFFF",
    marginBottom: spacing.sm,
  },
  featuredDescription: {
    fontFamily: fonts.body,
    fontSize: typeScale.bodySmall,
    lineHeight: typeScale.bodySmall * 1.55,
    color: "rgba(255,255,255,0.92)",
    marginBottom: spacing.lg,
  },
  seeHowButton: {
    alignSelf: "flex-start",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
  },
  seeHowText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.bodySmall,
  },
  articleCard: {
    padding: spacing.lg,
    marginTop: spacing.md,
  },
  articleEyebrow: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.caption,
    letterSpacing: 1.2,
    marginBottom: spacing.xs,
  },
  articleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  articleTitle: {
    flex: 1,
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.h3,
    lineHeight: typeScale.h3 * 1.3,
  },
  articleBlurb: {
    fontFamily: fonts.body,
    fontSize: typeScale.bodySmall,
    lineHeight: typeScale.bodySmall * 1.5,
    marginTop: spacing.xs,
  },
  block: {
    marginTop: spacing.xl,
  },
});
