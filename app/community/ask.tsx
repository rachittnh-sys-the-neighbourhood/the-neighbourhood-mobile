import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PrimaryButton } from "../../components/ui";
import { useAuth } from "../../lib/AuthProvider";
import { computeAge } from "../../lib/childAge";
import * as communityDb from "../../lib/db/community";
import { COMMUNITY_TOPICS, CommunityTopic, TOPIC_LABEL } from "../../lib/db/communityTypes";
import { colors, fonts, radius, spacing, typeScale } from "../../lib/theme";

export default function AskQuestion() {
  const router = useRouter();
  const { child, parentName } = useAuth();
  const age = child ? computeAge(child.date_of_birth) : null;
  const ageMonths = age?.totalMonths ?? 12;

  const [questionText, setQuestionText] = useState("");
  const [selectedTopic, setSelectedTopic] = useState<CommunityTopic | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const text = questionText.trim();
    if (!text) return;

    setSubmitting(true);
    try {
      const parentInitial = parentName?.trim()?.[0]?.toUpperCase() ?? "P";
      const newDisc = await communityDb.createDiscussion({
        question: text,
        topic: selectedTopic ?? undefined,
        childAgeMonths: ageMonths,
        parentInitial,
      });
      router.replace(`/community/discussion?id=${newDisc.id}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Ask a Question</Text>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.eyebrow}>COMMUNITY</Text>
          <Text style={styles.title}>What&apos;s on your mind?</Text>

          {/* Privacy Note */}
          <View style={styles.privacyNote}>
            <Text style={styles.privacyText}>
              🔒 <Text style={styles.privacyHighlight}>Privacy first:</Text> We&apos;ll share this with parents at a similar developmental stage ({age?.label ?? "similar age"}). Only your initial and your child&apos;s age will be visible.
            </Text>
          </View>

          {/* Question Text Area */}
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              placeholder="Ask anything about sleep, routines, feeding, behaviour, or developmental leaps…"
              placeholderTextColor={colors.textMuted}
              multiline
              autoFocus
              value={questionText}
              onChangeText={setQuestionText}
              maxLength={600}
            />
          </View>

          {/* Topic Selector (Optional) */}
          <Text style={styles.topicLabel}>SELECT A TOPIC (OPTIONAL)</Text>
          <Text style={styles.topicSub}>
            If skipped, we&apos;ll automatically route your question to the right topic.
          </Text>

          <View style={styles.topicGrid}>
            {COMMUNITY_TOPICS.map((topic) => {
              const isSelected = selectedTopic === topic;
              return (
                <Pressable
                  key={topic}
                  onPress={() => setSelectedTopic(isSelected ? null : topic)}
                  style={[
                    styles.topicChip,
                    isSelected && styles.topicChipSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.topicChipText,
                      isSelected && styles.topicChipTextSelected,
                    ]}
                  >
                    {TOPIC_LABEL[topic]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        {/* Submit Footer */}
        <View style={styles.footer}>
          <PrimaryButton
            title={submitting ? "Posting question…" : "Post to Community"}
            tone="accent"
            onPress={handleSubmit}
            disabled={!questionText.trim() || submitting}
            loading={submitting}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: typeScale.h3,
    color: colors.charcoal,
  },
  cancelText: {
    fontFamily: fonts.bodyMedium,
    fontSize: typeScale.bodySmall,
    color: colors.warmTaupe,
  },

  container: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },

  eyebrow: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.caption,
    letterSpacing: 1.5,
    color: colors.warmTaupe,
    marginBottom: spacing.xs,
  },
  title: {
    fontFamily: fonts.bodyBold,
    fontSize: typeScale.h1,
    color: colors.charcoal,
  },

  privacyNote: {
    backgroundColor: "rgba(139, 115, 85, 0.08)",
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(139, 115, 85, 0.14)",
    marginTop: spacing.md,
  },
  privacyText: {
    fontFamily: fonts.body,
    fontSize: typeScale.bodySmall,
    lineHeight: typeScale.bodySmall * 1.45,
    color: colors.textMuted,
  },
  privacyHighlight: {
    fontFamily: fonts.bodySemiBold,
    color: colors.charcoal,
  },

  inputWrap: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.lg,
    minHeight: 140,
  },
  input: {
    fontFamily: fonts.body,
    fontSize: typeScale.body,
    lineHeight: typeScale.body * 1.45,
    color: colors.charcoal,
    textAlignVertical: "top",
  },

  topicLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 1.3,
    color: colors.warmTaupe,
    marginTop: spacing.xl,
  },
  topicSub: {
    fontFamily: fonts.body,
    fontSize: typeScale.caption,
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: spacing.sm,
  },

  topicGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs + 2,
  },
  topicChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm - 2,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  topicChipSelected: {
    backgroundColor: colors.warmTaupe,
    borderColor: colors.warmTaupe,
  },
  topicChipText: {
    fontFamily: fonts.bodyMedium,
    fontSize: typeScale.caption + 1,
    color: colors.textMuted,
  },
  topicChipTextSelected: {
    color: colors.white,
    fontFamily: fonts.bodySemiBold,
  },

  footer: {
    padding: spacing.lg,
    backgroundColor: colors.cream,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
