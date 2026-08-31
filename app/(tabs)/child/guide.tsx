import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MicroLearningCard } from "../../../components/FeatureHub";
import { CourseCard, WorkshopCard } from "../../../components/LearningUI";
import { useAuth } from "../../../lib/AuthProvider";
import { computeAge, developmentalAgeMonths } from "../../../lib/childAge";
import {
  CHILD_STAGE_DOMAIN_LABEL,
  childStageTopicsForAge,
  recommendedChildStageTopics,
} from "../../../lib/childStageTopics";
import { COURSES, upcomingWorkshops, type Course, type Workshop } from "../../../lib/learning";
import { getCompletedLessons, getRegisteredWorkshops } from "../../../lib/learningProgress";
import { colors, fonts, radius, spacing, typeScale } from "../../../lib/theme";
import { useScreenFocus } from "../../../lib/useScreenFocus";

const FEATURED_COURSE = COURSES[0];
const WORKSHOP_PREVIEW_COUNT = 1;

/**
 * This Stage — the Child tab's knowledge layer.
 *
 * Answers "what should I understand about my child, right now?" with 1–2
 * short recommended reads (lib/childStageTopics.ts) up front — the product
 * is meant to curate, not hand over a library. A parent who wants more can
 * browse the rest of this stage's reads below, filtered by domain.
 *
 * Courses & Workshops (the "go deeper" layer — structured, multi-lesson,
 * "I want to understand this properly") still live on this screen, just
 * below the fold rather than as the headline — this used to be their whole
 * home page. Nothing about them changed; they're just no longer what This
 * Stage leads with.
 */
export default function ThisStage() {
  const router = useRouter();
  const isFocused = useScreenFocus();
  const { child } = useAuth();
  const ageMonths = developmentalAgeMonths(child);
  const age = child ? computeAge(child.date_of_birth) : null;

  const [featuredCompleted, setFeaturedCompleted] = useState<number | undefined>(undefined);
  const [registeredWorkshops, setRegisteredWorkshops] = useState<string[]>([]);
  const [domainFilter, setDomainFilter] = useState<string | null>(null);

  const loadState = useCallback(async () => {
    const [completed, registered] = await Promise.all([
      getCompletedLessons(FEATURED_COURSE.slug),
      getRegisteredWorkshops(),
    ]);
    setFeaturedCompleted(completed.length);
    setRegisteredWorkshops(registered);
  }, []);

  useEffect(() => {
    if (isFocused) void loadState();
  }, [isFocused, loadState]);

  const openCourse = (course: Course) => router.push(`/child/course/${course.slug}`);
  const openWorkshop = (workshop: Workshop) => router.push(`/child/workshop/${workshop.slug}`);
  const openTopic = (slug: string) => router.push(`/stage/${slug}`);

  const recommended = recommendedChildStageTopics(ageMonths, 2);
  const recommendedSlugs = new Set(recommended.map((t) => t.slug));
  const allForAge = childStageTopicsForAge(ageMonths);
  const domains = Array.from(new Set(allForAge.map((t) => t.domain)));
  const browseTopics = domainFilter
    ? allForAge.filter((t) => t.domain === domainFilter)
    : allForAge.filter((t) => !recommendedSlugs.has(t.slug));

  const nextWorkshops = upcomingWorkshops().slice(0, WORKSHOP_PREVIEW_COUNT);

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>THIS STAGE</Text>
        <Text style={styles.title}>What matters for your child right now.</Text>
        {child && age && (
          <Text style={styles.body}>
            {child.name} · {age.label}
          </Text>
        )}

        {recommended.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>RECOMMENDED FOR YOU</Text>
            {recommended.map((topic) => (
              <MicroLearningCard
                key={topic.slug}
                eyebrow={CHILD_STAGE_DOMAIN_LABEL[topic.domain]}
                title={topic.title}
                reason={topic.reason}
                minutes={topic.minutes}
                onPress={() => openTopic(topic.slug)}
              />
            ))}
          </>
        )}

        {domains.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>EXPLORE THIS STAGE</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              <Pressable
                onPress={() => setDomainFilter(null)}
                style={[styles.chip, !domainFilter && styles.chipActive]}
              >
                <Text style={[styles.chipText, !domainFilter && styles.chipTextActive]}>All</Text>
              </Pressable>
              {domains.map((domain) => (
                <Pressable
                  key={domain}
                  onPress={() => setDomainFilter(domain)}
                  style={[styles.chip, domainFilter === domain && styles.chipActive]}
                >
                  <Text style={[styles.chipText, domainFilter === domain && styles.chipTextActive]}>
                    {CHILD_STAGE_DOMAIN_LABEL[domain]}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            {browseTopics.map((topic) => (
              <Pressable
                key={topic.slug}
                onPress={() => openTopic(topic.slug)}
                style={({ pressed }) => [styles.readRow, pressed && { opacity: 0.7 }]}
              >
                <View style={styles.readText}>
                  <Text style={styles.readTitle}>{topic.title}</Text>
                  <Text style={styles.readMinutes}>{topic.minutes} min</Text>
                </View>
              </Pressable>
            ))}
          </>
        )}

        <View style={styles.divider} />

        <Text style={styles.sectionLabel}>GO DEEPER</Text>
        <Text style={styles.body}>Structured courses and live workshops, for when 3 minutes isn't enough.</Text>

        <Pressable style={styles.featuredCard} onPress={() => openCourse(FEATURED_COURSE)}>
          <Text style={styles.featuredLabel}>START HERE</Text>
          <Text style={styles.featuredTitle}>{FEATURED_COURSE.title}</Text>
          <Text style={styles.featuredBody}>{FEATURED_COURSE.description}</Text>
          {featuredCompleted != null && featuredCompleted > 0 && (
            <Text style={styles.featuredProgress}>
              {featuredCompleted}/{FEATURED_COURSE.lessons.length} lessons done
            </Text>
          )}
        </Pressable>

        <View style={styles.sectionHeader}>
          <Pressable onPress={() => router.push("/child/courses")} hitSlop={8}>
            <Text style={styles.seeAll}>See all courses</Text>
          </Pressable>
        </View>

        {nextWorkshops.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>WORKSHOPS</Text>
              <Pressable onPress={() => router.push("/child/workshops")} hitSlop={8}>
                <Text style={styles.seeAll}>See all</Text>
              </Pressable>
            </View>
            {nextWorkshops.map((workshop) => (
              <WorkshopCard
                key={workshop.slug}
                workshop={workshop}
                registered={registeredWorkshops.includes(workshop.slug)}
                onPress={() => openWorkshop(workshop)}
              />
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  eyebrow: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.caption,
    letterSpacing: 1.5,
    color: colors.warmTaupe,
    marginBottom: spacing.sm,
  },
  title: {
    fontFamily: fonts.bodyBold,
    fontSize: typeScale.h1,
    lineHeight: typeScale.h1 * 1.2,
    color: colors.charcoal,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: typeScale.body,
    lineHeight: typeScale.body * 1.5,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  sectionLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.caption,
    letterSpacing: 1.4,
    color: colors.textMuted,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.md,
  },
  seeAll: {
    fontFamily: fonts.bodyMedium,
    fontSize: typeScale.bodySmall,
    color: colors.warmTaupe,
  },
  chipRow: {
    marginBottom: spacing.md,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  chipActive: {
    backgroundColor: colors.warmTaupe,
    borderColor: colors.warmTaupe,
  },
  chipText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.caption,
    color: colors.charcoal,
  },
  chipTextActive: {
    color: colors.white,
  },
  readRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  readText: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  readTitle: {
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: typeScale.bodySmall,
    color: colors.charcoal,
    marginRight: spacing.sm,
  },
  readMinutes: {
    fontFamily: fonts.body,
    fontSize: typeScale.caption,
    color: colors.textMuted,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginTop: spacing.xl,
  },
  featuredCard: {
    marginTop: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  featuredLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.caption,
    letterSpacing: 1.1,
    textTransform: "uppercase",
    color: colors.warmTaupe,
    marginBottom: spacing.sm,
  },
  featuredTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: typeScale.h2,
    lineHeight: typeScale.h2 * 1.24,
    color: colors.charcoal,
  },
  featuredBody: {
    fontFamily: fonts.body,
    fontSize: typeScale.bodySmall,
    lineHeight: typeScale.bodySmall * 1.5,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  featuredProgress: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.caption,
    color: colors.sage,
    marginTop: spacing.md,
  },
});
