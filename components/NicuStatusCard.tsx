import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Card } from "./parentUI";
import { usePalette } from "../lib/ModeProvider";
import { fonts, radius, spacing, typeScale } from "../lib/theme";

/**
 * Asks whether a preterm baby is still in the NICU, and lets the parent
 * change it when the baby comes home. The answer switches the parent's
 * daily plan between NICU content (expressing, kangaroo care, visiting
 * while recovering) and going-home content. Shown on Today, to a mother
 * and a father alike, for a preterm baby in their first year.
 *
 * The database clears today's plan when the answer changes, so the plan
 * below this card updates straight away — see lib/preterm.ts.
 */
export function NicuStatusCard({
  childName,
  inNicu,
  onChange,
}: {
  childName: string;
  inNicu: boolean;
  onChange: (inNicu: boolean) => Promise<void>;
}) {
  const p = usePalette();
  const [saving, setSaving] = useState(false);

  const choose = async (value: boolean) => {
    if (saving || value === inNicu) return;
    setSaving(true);
    try {
      await onChange(value);
    } finally {
      setSaving(false);
    }
  };

  const options: { value: boolean; label: string }[] = [
    { value: true, label: "Still in the NICU" },
    { value: false, label: "Home now" },
  ];

  return (
    <Card style={styles.card}>
      <Text style={[styles.title, { color: p.text }]}>
        Is {childName || "your baby"} still in the NICU?
      </Text>
      <Text style={[styles.body, { color: p.textMuted }]}>
        {inNicu
          ? "Your plan is set up for the NICU: expressing, kangaroo care and looking after yourself between visits. Tell us when they're home and it changes."
          : "Your plan is set up for life at home with a baby who arrived early. If they are still in the NICU, tell us and it changes."}
      </Text>
      <View style={styles.row}>
        {options.map((option) => {
          const selected = inNicu === option.value;
          return (
            <Pressable
              key={String(option.value)}
              disabled={saving}
              onPress={() => choose(option.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              style={[
                styles.option,
                { borderColor: selected ? p.primary : p.border },
                selected && { backgroundColor: p.surfaceAlt },
              ]}
            >
              <Text style={[styles.optionLabel, { color: p.text }]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {saving && <ActivityIndicator style={{ marginTop: spacing.sm }} />}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
  title: { fontFamily: fonts.bodySemiBold, fontSize: typeScale.h3 },
  body: {
    fontFamily: fonts.body,
    fontSize: typeScale.bodySmall,
    lineHeight: typeScale.bodySmall * 1.5,
    marginTop: spacing.xs,
  },
  row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md },
  option: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  optionLabel: { fontFamily: fonts.bodySemiBold, fontSize: typeScale.body },
});
