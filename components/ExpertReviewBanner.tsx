import { StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing, type } from "../lib/theme";

/**
 * The disclaimer required on every screen that shows content from the v11
 * Meal Planner workbook — that workbook is explicitly "frozen for expert
 * review" and most of its rows are still pending RD/paediatrician
 * sign-off (see supabase/migrations/20260910090000_family_meal_planner.sql
 * for exactly what that means and what's excluded outright). Product
 * decision: ship it now, with this banner, rather than wait for full
 * clinical sign-off.
 *
 * Deliberately plain rather than alarming — this is a provenance note, not
 * a warning: the same register as the existing "This is here to inform,
 * not to replace" footers already used across You.
 */
export function ExpertReviewBanner() {
  return (
    <View style={styles.banner}>
      <Text style={styles.text}>
        Meal content is currently under review with a nutrition expert. Treat it as a helpful
        starting point, not final medical or dietary advice.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: "rgba(137, 116, 91, 0.10)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(96, 79, 60, 0.16)",
    marginBottom: spacing.md,
  },
  text: {
    ...type.meta,
    color: colors.textMuted,
    lineHeight: 17,
  },
});
