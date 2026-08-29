import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { usePalette } from "../lib/ModeProvider";
import { fonts, radius, spacing, typeScale } from "../lib/theme";

/**
 * The shared hub shell for Child and You — one card system, one grid, one
 * header shape, used by both. This is what makes them read as siblings
 * ("the Child version of this page" / "the You version of this page")
 * rather than two unrelated screens that happen to sit next to each other
 * in the tab bar.
 *
 * Reads usePalette() rather than fixed colors, so the SAME component
 * renders in Child's warm cream on /child and You's cooler eucalyptus on
 * /you automatically — see lib/ModeProvider.tsx. The two palettes share
 * identical structure (same keys, same roles), which is what makes one
 * card definition work correctly in both places.
 */

export function HubHeader({
  title,
  subtitle,
}: {
  /** The child's name, or "You". */
  title: string;
  /** Age for Child; a short, profile-aware line for You. Never a paragraph. */
  subtitle: string;
}) {
  const p = usePalette();
  return (
    <View style={styles.header}>
      <Text style={[styles.headerTitle, { color: p.text }]}>{title}</Text>
      <Text style={[styles.headerSubtitle, { color: p.textMuted }]}>{subtitle}</Text>
    </View>
  );
}

export function FeatureGroupLabel({ children }: { children: string }) {
  const p = usePalette();
  return <Text style={[styles.groupLabel, { color: p.primary }]}>{children.toUpperCase()}</Text>;
}

/** Two cards per row, wrapping — the grid every group renders into. */
export function FeatureGrid({ children }: { children: React.ReactNode }) {
  return <View style={styles.grid}>{children}</View>;
}

export function FeatureCard({
  icon,
  title,
  description,
  status,
  onPress,
  highlighted,
}: {
  icon: React.ReactNode;
  title: string;
  /** One short line — what this is, not how to use it. */
  description: string;
  /** A real, already-known value only — e.g. "3 due" or "2–5 years". Never invented. */
  status?: string;
  onPress: () => void;
  highlighted?: boolean;
}) {
  const p = usePalette();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: p.surface, borderColor: p.border },
        highlighted && { borderColor: p.primary },
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.iconCircle, { backgroundColor: p.surfaceAlt }]}>{icon}</View>
      <Text style={[styles.cardTitle, { color: p.text }]} numberOfLines={1}>
        {title}
      </Text>
      <Text style={[styles.cardDescription, { color: p.textMuted }]} numberOfLines={2}>
        {description}
      </Text>
      {status && (
        <Text style={[styles.cardStatus, { color: p.primary }]} numberOfLines={1}>
          {status}
        </Text>
      )}
    </Pressable>
  );
}

const ICON_SIZE = 16;

/** Icons shared between Child's and You's cards, so the same concept (e.g. feeding) always draws the same way. */
export function FeatureIcon({ name, color }: { name: FeatureIconName; color: string }) {
  const props = { width: ICON_SIZE, height: ICON_SIZE, viewBox: "0 0 24 24", fill: "none" as const };
  switch (name) {
    case "milestone":
      return (
        <Svg {...props}>
          <Path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke={color} strokeWidth={2} strokeLinecap="round" />
        </Svg>
      );
    case "meal":
      return (
        <Svg {...props}>
          <Path d="M7 2v7a3 3 0 0 0 3 3v10M7 2v7M7 9V2M11 2v7M17 2c-2 2-2 5-2 8s0 4 2 4v8" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case "vaccine":
      return (
        <Svg {...props}>
          <Path d="M9 2h6M12 2v4M5 12h14M7 8h10l1 4v6a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-6l1-4Z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case "kit":
      return (
        <Svg {...props}>
          <Path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M3.27 6.96 12 12.01l8.73-5.05M12 22.08V12" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case "reports":
      return (
        <Svg {...props}>
          <Path d="M3 3v18h18M7 16l4-4 4 4 6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case "guide":
      return (
        <Svg {...props}>
          <Path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2ZM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7Z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case "product":
      return (
        <Svg {...props}>
          <Path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case "today":
      return (
        <Svg {...props}>
          <Circle cx="12" cy="12" r="4.5" stroke={color} strokeWidth={1.8} />
          <Path d="M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8 6 18M18 6l1.8-1.8" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
        </Svg>
      );
    case "recovery":
      return (
        <Svg {...props}>
          <Path d="M12 13.5c0-4 2.6-7 6.5-7.5.4 3.9-1.7 7.6-6.5 7.5Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
          <Path d="M12 21v-7.5M12 14c-.4-2.7-2-4.4-4.5-4.8" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
        </Svg>
      );
    case "mental":
      return (
        <Svg {...props}>
          <Path d="M12 21s-6.7-4.35-9.5-8.5C.6 9.1 2 5 6 5c2.1 0 3.6 1.2 6 3.8C14.4 6.2 15.9 5 18 5c4 0 5.4 4.1 3.5 7.5C18.7 16.65 12 21 12 21Z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case "sleep":
      return (
        <Svg {...props}>
          <Path d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9Z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case "relationships":
      return (
        <Svg {...props}>
          <Circle cx="9" cy="7" r="3" stroke={color} strokeWidth={1.8} />
          <Path d="M3 18c0-3 2.7-5 6-5s6 2 6 5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
          <Circle cx="16.5" cy="8.5" r="2.3" stroke={color} strokeWidth={1.8} />
          <Path d="M14 18c.3-1.8 1.8-3 3.8-3 1.4 0 2.6.6 3.2 1.8" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
        </Svg>
      );
    case "dads":
      return (
        <Svg {...props}>
          <Circle cx="12" cy="8.2" r="3.2" stroke={color} strokeWidth={1.8} />
          <Path d="M5 20c1.2-3.8 4-5.6 7-5.6s5.8 1.8 7 5.6" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
        </Svg>
      );
    case "story":
      return (
        <Svg {...props}>
          <Path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2ZM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7Z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M6 7h2M6 10.5h2M16 7h2M16 10.5h2" stroke={color} strokeWidth={1.4} strokeLinecap="round" />
        </Svg>
      );
  }
}

export type FeatureIconName =
  | "milestone"
  | "meal"
  | "vaccine"
  | "kit"
  | "reports"
  | "guide"
  | "product"
  | "today"
  | "recovery"
  | "mental"
  | "sleep"
  | "relationships"
  | "dads"
  | "story";

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing.lg,
  },
  headerTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: typeScale.h1,
    lineHeight: typeScale.h1 * 1.2,
  },
  headerSubtitle: {
    fontFamily: fonts.body,
    fontSize: typeScale.bodySmall,
    lineHeight: typeScale.bodySmall * 1.4,
    marginTop: spacing.xs,
  },
  groupLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.caption,
    letterSpacing: 1.4,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  card: {
    width: "48%",
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.sm,
  },
  pressed: {
    opacity: 0.7,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  cardTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.bodySmall,
    lineHeight: typeScale.bodySmall * 1.3,
  },
  cardDescription: {
    fontFamily: fonts.body,
    fontSize: typeScale.caption,
    lineHeight: typeScale.caption * 1.45,
    marginTop: 3,
  },
  cardStatus: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    marginTop: spacing.sm,
  },
});
