import { Stack, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../../../lib/AuthProvider";
import { developmentalAgeMonths } from "../../../lib/childAge";
import { AGE_BAND_LABEL } from "../../../lib/db/types";
import { STORIES, STORY_AGE_BANDS, storiesForAgeBand, storyAgeBandFor } from "../../../lib/storiesLibrary";
import { colors, fonts, radius, spacing, typeScale } from "../../../lib/theme";

/**
 * The full read-aloud story library, reached from Child's Library group.
 * Defaults to the child's own age band (the stories most likely to land
 * today), with every other band one chip away — same "All" + chip filter
 * pattern as Courses (see courses.tsx), scoped to the 12 fine bands the
 * story library actually spans rather than the full 28-band activity range.
 */
export default function Stories() {
  const router = useRouter();
  const { child } = useAuth();
  const ageMonths = developmentalAgeMonths(child);
  const defaultBand = storyAgeBandFor(ageMonths);

  const [band, setBand] = useState<(typeof STORY_AGE_BANDS)[number] | undefined>(defaultBand);

  const stories = useMemo(
    () => (band ? storiesForAgeBand(band) : STORIES),
    [band],
  );

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: "Stories" }} />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>STORIES</Text>
        <Text style={styles.title}>Read-aloud stories, 0 to 3 years.</Text>
        <Text style={styles.subtitle}>
          Folk tales, lullabies, and original stories, each with how to tell it and what it builds.
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          <Chip label="All" active={!band} onPress={() => setBand(undefined)} />
          {STORY_AGE_BANDS.map((b) => (
            <Chip
              key={b}
              label={AGE_BAND_LABEL[b]}
              active={band === b}
              onPress={() => setBand(b)}
            />
          ))}
        </ScrollView>

        <View style={styles.list}>
          {stories.map((story) => (
            <Pressable
              key={story.id}
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
              onPress={() => router.push(`/child/story/${story.id}`)}
              accessibilityRole="button"
              accessibilityLabel={`Read ${story.title}`}
            >
              <View style={styles.rowText}>
                <Text style={styles.rowEyebrow}>{AGE_BAND_LABEL[story.age_band].toUpperCase()}</Text>
                <Text style={styles.rowTitle}>{story.title}</Text>
              </View>
              <Text style={styles.rowMeta}>{story.telling_minutes} min</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
      accessibilityRole="button"
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
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
    color: colors.charcoal,
    lineHeight: typeScale.h1 * 1.25,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: typeScale.bodySmall,
    color: colors.textMuted,
    lineHeight: typeScale.bodySmall * 1.5,
    marginTop: spacing.sm,
  },
  chipRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingRight: spacing.lg,
  },
  chip: {
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  chipActive: {
    backgroundColor: colors.warmTaupe,
    borderColor: colors.warmTaupe,
  },
  chipText: {
    fontFamily: fonts.bodyMedium,
    fontSize: typeScale.caption,
    color: colors.textMuted,
  },
  chipTextActive: {
    color: colors.white,
  },
  list: {
    marginTop: spacing.xl,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowText: { flex: 1 },
  rowEyebrow: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    letterSpacing: 1.2,
    color: colors.warmTaupe,
  },
  rowTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.body,
    color: colors.charcoal,
    marginTop: 2,
  },
  rowMeta: {
    fontFamily: fonts.body,
    fontSize: typeScale.caption,
    color: colors.textMuted,
  },
});
