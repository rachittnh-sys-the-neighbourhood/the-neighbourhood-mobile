import { StyleSheet, Text, View } from "react-native";
import { usePalette } from "../lib/ModeProvider";
import { fonts, radius, spacing, typeScale } from "../lib/theme";

/**
 * A quiet, honest notice for a screen that's real and usable today but
 * still actively being built out — distinct from components/SectionScaffold,
 * which replaces a screen's content entirely when there's nothing genuine
 * to show yet. This sits ON TOP of working content instead.
 *
 * Reads the palette from context (see components/parentUI.tsx for the
 * same pattern) so it renders correctly in both Child's cream and You's
 * eucalyptus tint without the caller needing to care which one applies.
 *
 * Delete this the moment the screen it's on is actually finished.
 */
export function BuildingBanner() {
  const p = usePalette();
  return (
    <View style={[styles.banner, { borderColor: p.border, backgroundColor: p.surfaceAlt }]}>
      <View style={[styles.rule, { backgroundColor: p.primary }]} />
      <Text style={[styles.text, { color: p.textMuted }]}>
        We are still building this out and shall update you as soon as we are ready.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.lg,
    overflow: "hidden",
  },
  rule: {
    width: 3,
  },
  text: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: typeScale.bodySmall,
    lineHeight: typeScale.bodySmall * 1.5,
    padding: spacing.md,
  },
});
