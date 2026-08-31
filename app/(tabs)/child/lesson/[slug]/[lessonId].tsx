import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { courseBySlug, lessonById } from "../../../../../lib/learning";
import { getCompletedLessons, setLessonComplete } from "../../../../../lib/learningProgress";
import { colors, fonts, radius, spacing, typeScale } from "../../../../../lib/theme";

/**
 * Renders one lesson, branching on `type` — the one place in the module
 * that has to know every lesson type exists. A new lesson type means one
 * new case here and a new LessonContent variant in lib/learning.ts;
 * nothing upstream (course cards, the course list, progress storage)
 * needs to change.
 */
export default function LessonViewer() {
  const { slug, lessonId } = useLocalSearchParams<{ slug: string; lessonId: string }>();
  const router = useRouter();
  const course = slug ? courseBySlug(slug) : undefined;
  const lesson = course && lessonId ? lessonById(course, lessonId) : undefined;
  const [done, setDone] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});

  const loadDone = useCallback(async () => {
    if (!course || !lesson) return;
    const completed = await getCompletedLessons(course.slug);
    setDone(completed.includes(lesson.id));
  }, [course, lesson]);

  useEffect(() => {
    void loadDone();
  }, [loadDone]);

  if (!course || !lesson) {
    return (
      <View style={styles.missing}>
        <Text style={styles.missingText}>We couldn&rsquo;t find that lesson.</Text>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Text style={styles.back}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const toggleDone = async () => {
    const next = !done;
    setDone(next);
    await setLessonComplete(course.slug, lesson.id, next);
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: "" }} />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>{course.title.toUpperCase()}</Text>
        <Text style={styles.title}>{lesson.title}</Text>
        <Text style={styles.meta}>{lesson.durationMinutes} min</Text>

        {lesson.type === "video" && (
          <View style={styles.videoPlaceholder}>
            <Text style={styles.videoPlaceholderText}>▶</Text>
            {lesson.transcript && <Text style={styles.transcript}>{lesson.transcript}</Text>}
          </View>
        )}

        {lesson.type === "text" && <Text style={styles.body}>{lesson.body}</Text>}

        {lesson.type === "pdf" && (
          <View style={styles.pdfCard}>
            <Text style={styles.pdfIcon}>📄</Text>
            <Text style={styles.pdfText}>
              {lesson.pages ?? 1} page{(lesson.pages ?? 1) > 1 ? "s" : ""} · opens in your PDF viewer
            </Text>
          </View>
        )}

        {lesson.type === "quiz" && (
          <View style={styles.quiz}>
            {lesson.questions.map((q) => (
              <View key={q.id} style={styles.quizQuestion}>
                <Text style={styles.quizPrompt}>{q.prompt}</Text>
                {q.options.map((option, i) => {
                  const selected = quizAnswers[q.id] === i;
                  const revealed = quizAnswers[q.id] != null;
                  const correct = i === q.correctIndex;
                  return (
                    <Pressable
                      key={option}
                      style={[
                        styles.quizOption,
                        selected && styles.quizOptionSelected,
                        revealed && correct && styles.quizOptionCorrect,
                      ]}
                      onPress={() => setQuizAnswers((prev) => ({ ...prev, [q.id]: i }))}
                    >
                      <Text style={styles.quizOptionText}>{option}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        )}

        <Pressable style={[styles.completeButton, done && styles.completeButtonDone]} onPress={toggleDone}>
          <Text style={[styles.completeButtonText, done && styles.completeButtonTextDone]}>
            {done ? "Completed ✓" : "Mark as complete"}
          </Text>
        </Pressable>
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
    letterSpacing: 1.2,
    color: colors.warmTaupe,
    marginBottom: spacing.sm,
  },
  title: {
    fontFamily: fonts.bodyBold,
    fontSize: typeScale.h1,
    lineHeight: typeScale.h1 * 1.2,
    color: colors.charcoal,
  },
  meta: {
    fontFamily: fonts.body,
    fontSize: typeScale.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: typeScale.body,
    lineHeight: typeScale.body * 1.68,
    color: colors.charcoal,
    marginTop: spacing.xl,
  },
  videoPlaceholder: {
    marginTop: spacing.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.charcoal,
    aspectRatio: 16 / 9,
    alignItems: "center",
    justifyContent: "center",
  },
  videoPlaceholderText: {
    fontSize: 40,
    color: colors.white,
  },
  transcript: {
    position: "absolute",
    bottom: spacing.md,
    left: spacing.md,
    right: spacing.md,
    fontFamily: fonts.body,
    fontSize: typeScale.caption,
    color: "rgba(255,255,255,0.75)",
  },
  pdfCard: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: "center",
    gap: spacing.sm,
  },
  pdfIcon: {
    fontSize: 32,
  },
  pdfText: {
    fontFamily: fonts.body,
    fontSize: typeScale.bodySmall,
    color: colors.textMuted,
  },
  quiz: {
    marginTop: spacing.xl,
    gap: spacing.lg,
  },
  quizQuestion: {
    gap: spacing.sm,
  },
  quizPrompt: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.body,
    color: colors.charcoal,
    marginBottom: spacing.xs,
  },
  quizOption: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  quizOptionSelected: {
    borderColor: colors.warmTaupe,
  },
  quizOptionCorrect: {
    borderColor: colors.sage,
    backgroundColor: "rgba(168, 181, 164, 0.16)",
  },
  quizOptionText: {
    fontFamily: fonts.body,
    fontSize: typeScale.bodySmall,
    color: colors.charcoal,
  },
  completeButton: {
    marginTop: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.sageDark,
    alignItems: "center",
  },
  completeButtonDone: {
    backgroundColor: "rgba(168, 181, 164, 0.24)",
  },
  completeButtonText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.body,
    color: colors.white,
  },
  completeButtonTextDone: {
    color: colors.charcoal,
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
