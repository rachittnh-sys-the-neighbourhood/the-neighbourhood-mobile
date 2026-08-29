import React from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { usePalette } from "../lib/ModeProvider";
import { fonts, radius, spacing, typeScale } from "../lib/theme";

/**
 * Shared surfaces for calm, disclosure-heavy screens — originally built for
 * Parent Mode, now also used by Growth's Meal Planner. These read the
 * palette from context rather than importing colours, so they render
 * correctly in whichever mode renders them.
 *
 * Everything here is deliberately quieter than Child Mode's default style:
 * flatter shadows, more white space, no filled progress bars racing to 100%.
 * A parent should be able to scan this in the dark with one hand.
 */

export function PageHeading({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body?: string;
}) {
  const p = usePalette();
  return (
    <View style={styles.heading}>
      <Text style={[styles.eyebrow, { color: p.primary }]}>{eyebrow.toUpperCase()}</Text>
      <Text style={[styles.title, { color: p.text }]}>{title}</Text>
      {body && <Text style={[styles.headingBody, { color: p.textMuted }]}>{body}</Text>}
    </View>
  );
}

export function Card({
  children,
  onPress,
  style,
  padded = true,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}) {
  const p = usePalette();
  const base: ViewStyle = {
    backgroundColor: p.surface,
    borderColor: p.border,
    ...(padded ? { padding: spacing.md } : null),
  };
  if (!onPress) return <View style={[styles.card, base, style]}>{children}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.card, base, pressed && styles.pressed, style]}
    >
      {children}
    </Pressable>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  const p = usePalette();
  return (
    <Text style={[styles.sectionLabel, { color: p.textMuted }]}>
      {String(children).toUpperCase()}
    </Text>
  );
}

/** A quiet ring. Never labelled with a percentage. */
export function Ring({
  fraction,
  size = 44,
  children,
}: {
  fraction: number;
  size?: number;
  children?: React.ReactNode;
}) {
  const p = usePalette();
  const stroke = 3.5;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, fraction));

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={p.surfaceAlt}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={p.positive}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference * clamped} ${circumference}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
}

/** Horizontal nutrient track — soft, and it never turns red. */
export function NutrientTrack({ fraction }: { fraction: number }) {
  const p = usePalette();
  const clamped = Math.max(0, Math.min(1, fraction));
  return (
    <View style={[styles.track, { backgroundColor: p.surfaceAlt }]}>
      <View
        style={[
          styles.trackFill,
          { width: `${clamped * 100}%`, backgroundColor: p.positive },
        ]}
      />
    </View>
  );
}

export function Chip({ label, tone = "quiet" }: { label: string; tone?: "quiet" | "accent" }) {
  const p = usePalette();
  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: tone === "accent" ? p.primary : p.surfaceAlt,
        },
      ]}
    >
      <Text
        style={[
          styles.chipText,
          { color: tone === "accent" ? p.surface : p.textMuted },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

/**
 * The one piece of chrome that is allowed to be firm. Used wherever content
 * touches medical ground, so education never gets mistaken for advice.
 */
export function CareNote({ children }: { children: React.ReactNode }) {
  const p = usePalette();
  return (
    <View style={[styles.careNote, { borderColor: p.border }]}>
      <Text style={[styles.careNoteText, { color: p.textMuted }]}>{children}</Text>
    </View>
  );
}

export function Chevron() {
  const p = usePalette();
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 5l7 7-7 7"
        stroke={p.textMuted}
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  heading: {
    marginBottom: spacing.lg,
  },
  eyebrow: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.caption,
    letterSpacing: 1.5,
    marginBottom: spacing.sm,
  },
  title: {
    fontFamily: fonts.bodyBold,
    fontSize: typeScale.h1,
    lineHeight: typeScale.h1 * 1.2,
  },
  headingBody: {
    fontFamily: fonts.body,
    fontSize: typeScale.body,
    lineHeight: typeScale.body * 1.55,
    marginTop: spacing.sm,
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pressed: {
    opacity: 0.7,
  },
  sectionLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.caption,
    letterSpacing: 1.4,
    marginBottom: spacing.sm,
  },
  track: {
    height: 4,
    borderRadius: 999,
    overflow: "hidden",
  },
  trackFill: {
    height: "100%",
    borderRadius: 999,
  },
  chip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  chipText: {
    fontFamily: fonts.bodyMedium,
    fontSize: typeScale.caption,
  },
  careNote: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.md,
    marginTop: spacing.lg,
  },
  careNoteText: {
    fontFamily: fonts.body,
    fontSize: typeScale.caption,
    lineHeight: typeScale.caption * 1.55,
  },
});
