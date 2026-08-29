import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AGE_BAND_LABEL } from "../../../../lib/db/types";
import { storyById } from "../../../../lib/storiesLibrary";
import { colors, fonts, radius, spacing, typeScale } from "../../../../lib/theme";

/**
 * A single story, shown one at a time — the reading view itself, and also
 * where an activity's "Read this story" link lands (see
 * components/ActivityCard.tsx storyForActivity). Lives at
 * child/story/[id] rather than nested under child/stories/, matching how
 * child/course/[slug] sits alongside courses.tsx.
 */
export default function StoryDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const story = id ? storyById(id) : undefined;

  if (!story) {
    return (
      <View style={styles.missing}>
        <Text style={styles.missingText}>We couldn&rsquo;t find that story.</Text>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Text style={styles.back}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: "" }} />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>
          {AGE_BAND_LABEL[story.age_band].toUpperCase()} · {story.telling_minutes} MIN
        </Text>
        <Text style={styles.title}>{story.title}</Text>
        <Text style={styles.storyType}>{story.story_type}</Text>

        <View style={styles.storyBlock}>
          {story.story.split(/\n\n+/).map((paragraph, i) => (
            <Text key={i} style={styles.storyParagraph}>
              {paragraph}
            </Text>
          ))}
        </View>

        {story.repeating_line && (
          <View style={styles.infoBlock}>
            <Text style={styles.blockLabel}>THE REPEATING LINE</Text>
            <Text style={styles.blockText}>{story.repeating_line}</Text>
          </View>
        )}

        {story.how_they_join_in && (
          <View style={styles.infoBlock}>
            <Text style={styles.blockLabel}>HOW THEY JOIN IN</Text>
            <Text style={styles.blockText}>{story.how_they_join_in}</Text>
          </View>
        )}

        {story.how_to_tell_it && (
          <View style={styles.infoBlock}>
            <Text style={styles.blockLabel}>HOW TO TELL IT</Text>
            <Text style={styles.blockText}>{story.how_to_tell_it}</Text>
          </View>
        )}

        {story.what_this_builds && (
          <View style={styles.infoBlock}>
            <Text style={styles.blockLabel}>WHAT THIS BUILDS</Text>
            <Text style={styles.blockText}>{story.what_this_builds}</Text>
          </View>
        )}

        {story.hindi_words && (
          <View style={styles.infoBlock}>
            <Text style={styles.blockLabel}>HINDI WORDS USED</Text>
            <Text style={styles.blockText}>{story.hindi_words}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
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
  storyType: {
    fontFamily: fonts.body,
    fontSize: typeScale.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  storyBlock: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  storyParagraph: {
    fontFamily: fonts.body,
    fontSize: typeScale.body,
    lineHeight: typeScale.body * 1.6,
    color: colors.charcoal,
    marginBottom: spacing.md,
  },
  infoBlock: {
    marginTop: spacing.lg,
  },
  blockLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    letterSpacing: 1.2,
    color: colors.warmTaupe,
    marginBottom: spacing.xs,
  },
  blockText: {
    fontFamily: fonts.body,
    fontSize: typeScale.bodySmall,
    lineHeight: typeScale.bodySmall * 1.55,
    color: colors.textMuted,
  },
  missing: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    backgroundColor: colors.cream,
  },
  missingText: {
    fontFamily: fonts.body,
    fontSize: typeScale.body,
    color: colors.textMuted,
  },
  back: {
    fontFamily: fonts.bodyMedium,
    fontSize: typeScale.body,
    color: colors.warmTaupe,
  },
});
