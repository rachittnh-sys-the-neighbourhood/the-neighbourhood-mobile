import { useEffect, useRef } from "react";
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PrimaryButton } from "./ui";
import { colors, fonts, radius, spacing, typeScale } from "../lib/theme";

export function GuidedTourDialog({
  eyebrow,
  title,
  body,
  focus,
  step,
  total,
  primaryTitle,
  onPrimary,
  onSkip,
  autoAdvanceMs = 4800,
}: {
  eyebrow: string;
  title: string;
  body: string;
  focus: string;
  step: number;
  total: number;
  primaryTitle: string;
  onPrimary: () => void;
  onSkip: () => void;
  autoAdvanceMs?: number;
}) {
  const entrance = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0)).current;
  const primaryRef = useRef(onPrimary);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settledRef = useRef(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    primaryRef.current = onPrimary;
  }, [onPrimary]);

  const finish = (action: () => void) => {
    if (settledRef.current) return;
    settledRef.current = true;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    action();
  };

  // The last step's primary button commits an action (it leaves the tour and
  // can open a whole flow), so it waits for a real tap. Only the intermediate
  // steps play themselves.
  const autoAdvances = step < total - 1;

  useEffect(() => {
    settledRef.current = false;
    entrance.setValue(0);
    progress.setValue(0);
    Animated.parallel([
      Animated.timing(entrance, {
        toValue: 1,
        duration: 360,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(progress, {
        toValue: autoAdvances ? 1 : 0,
        duration: autoAdvances ? autoAdvanceMs : 0,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
    ]).start();
    if (!autoAdvances) return;
    timerRef.current = setTimeout(() => {
      finish(primaryRef.current);
    }, autoAdvanceMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
    };
    // `finish` intentionally stays outside the dependency list: this effect
    // should restart only when the displayed tour step changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoAdvanceMs, autoAdvances, entrance, progress, step]);

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => finish(onSkip)}
    >
      <View
        style={[
          styles.wrap,
          { paddingBottom: Math.max(insets.bottom + 104, spacing.lg) },
        ]}
      >
        <View style={styles.veil} />
        <Animated.View
          style={[
            styles.card,
            {
              opacity: entrance,
              transform: [
                {
                  translateY: entrance.interpolate({
                    inputRange: [0, 1],
                    outputRange: [14, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.topRow}>
            <Text style={styles.eyebrow}>{eyebrow}</Text>
            <Pressable onPress={() => finish(onSkip)} hitSlop={10}>
              <Text style={styles.skip}>Skip</Text>
            </Pressable>
          </View>
          <Text style={styles.focus}>{focus}</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>
          <View style={styles.dots}>
            {Array.from({ length: total }).map((_, index) => (
              <View key={index} style={[styles.dot, index === step && styles.dotActive]} />
            ))}
          </View>
          {autoAdvances && (
            <View style={styles.progressTrack}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width: progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0%", "100%"],
                    }),
                  },
                ]}
              />
            </View>
          )}
          <PrimaryButton title={primaryTitle} tone="accent" onPress={() => finish(onPrimary)} />
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: spacing.lg,
  },
  veil: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(44, 44, 44, 0.28)",
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.charcoal,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 26,
    elevation: 5,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  eyebrow: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.caption,
    letterSpacing: 1.3,
    textTransform: "uppercase",
    color: colors.warmTaupe,
  },
  skip: {
    fontFamily: fonts.bodyMedium,
    fontSize: typeScale.bodySmall,
    color: colors.textMuted,
  },
  focus: {
    alignSelf: "flex-start",
    fontFamily: fonts.serifItalic,
    fontSize: typeScale.body,
    lineHeight: typeScale.body * 1.35,
    color: colors.warmTaupe,
    marginBottom: spacing.sm,
  },
  title: {
    fontFamily: fonts.bodyBold,
    fontSize: typeScale.h2,
    lineHeight: typeScale.h2 * 1.24,
    color: colors.charcoal,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: typeScale.bodySmall,
    lineHeight: typeScale.bodySmall * 1.5,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  dots: {
    flexDirection: "row",
    gap: 6,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: {
    width: 22,
    backgroundColor: colors.warmTaupe,
  },
  progressTrack: {
    height: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    overflow: "hidden",
    marginBottom: spacing.md,
  },
  progressFill: {
    height: "100%",
    borderRadius: radius.pill,
    backgroundColor: colors.sage,
  },
});
