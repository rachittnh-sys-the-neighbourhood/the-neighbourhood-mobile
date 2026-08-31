import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { childStageTopicBySlug, CHILD_STAGE_DOMAIN_LABEL } from "../../lib/childStageTopics";
import { colors, fonts, radius, spacing, typeScale } from "../../lib/theme";

/**
 * A single "This Stage" read — the Child-tab counterpart to
 * app/care/[slug].tsx. Lives at the root, same reasoning as that file: a
 * 2–4 minute read deserves the whole screen, not a tab bar competing for
 * attention mid-read.
 */
export default function ChildStageTopicScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const topic = slug ? childStageTopicBySlug(slug) : undefined;

  if (!topic) {
    return (
      <View style={styles.missing}>
        <Text style={styles.missingText}>We couldn&rsquo;t find that one.</Text>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Text style={styles.back}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "",
          headerStyle: { backgroundColor: colors.cream },
          headerShadowVisible: false,
          headerTintColor: colors.warmTaupe,
        }}
      />
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.eyebrow}>
          {CHILD_STAGE_DOMAIN_LABEL[topic.domain].toUpperCase()} · {topic.minutes} MIN READ
        </Text>
        <Text style={styles.title}>{topic.title}</Text>

        <View style={styles.section}>
          {topic.paragraphs.map((paragraph, index) => (
            <Text key={index} style={styles.body}>
              {paragraph}
            </Text>
          ))}
        </View>

        <View style={styles.takeaway}>
          <Text style={styles.takeawayLabel}>KEY TAKEAWAY</Text>
          <Text style={styles.takeawayText}>{topic.reason}</Text>
        </View>

        <Text style={styles.sourceText}>Source: {topic.source}</Text>

        <Pressable
          onPress={() =>
            router.push({
              pathname: "/ask",
              params: { mode: "child", topic: topic.title, prompt: `About "${topic.title}": ` },
            })
          }
          accessibilityRole="button"
          style={({ pressed }) => [styles.askRow, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.askText}>Ask about this →</Text>
        </Pressable>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.cream },
  content: {
    paddingHorizontal: spacing.lg,
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
    fontSize: typeScale.display,
    lineHeight: typeScale.display * 1.16,
    color: colors.charcoal,
  },
  section: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: typeScale.body,
    lineHeight: typeScale.body * 1.68,
    color: colors.textMuted,
  },
  takeaway: {
    marginTop: spacing.xl,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: "rgba(139, 116, 91, 0.1)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(96, 79, 60, 0.14)",
  },
  takeawayLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 1.1,
    color: colors.warmTaupe,
    marginBottom: 4,
  },
  takeawayText: {
    fontFamily: fonts.bodyMedium,
    fontSize: typeScale.bodySmall,
    lineHeight: typeScale.bodySmall * 1.5,
    color: colors.charcoal,
  },
  sourceText: {
    fontFamily: fonts.body,
    fontSize: typeScale.caption,
    lineHeight: typeScale.caption * 1.45,
    color: colors.textMuted,
    marginTop: spacing.md,
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
  askRow: {
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    alignItems: "center",
  },
  askText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.bodySmall,
    color: colors.warmTaupe,
  },
});
