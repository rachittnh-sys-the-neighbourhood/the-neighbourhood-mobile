import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import * as checkins from "../lib/db/checkins";
import type { ParentCheckin, ParentCheckinEnergy, ParentCheckinHelp } from "../lib/db/types";
import { usePalette } from "../lib/ModeProvider";
import { fonts, spacing, typeScale } from "../lib/theme";
import { Card } from "./parentUI";

const ENERGY_OPTIONS: { value: ParentCheckinEnergy; label: string }[] = [
  { value: "good", label: "Good" },
  { value: "okay", label: "Okay" },
  { value: "running_on_empty", label: "Running on empty" },
];

const HELP_OPTIONS: { value: ParentCheckinHelp; label: string }[] = [
  { value: "yes", label: "Yes" },
  { value: "maybe", label: "Maybe" },
  { value: "not_really", label: "Not really" },
];

/**
 * You hub's check-in — replaces the old unpersisted five-emoji mood
 * picker with the meal planner workbook's two-question Recovery Check-in
 * (energy, and whether help is available today), adapted for whichever
 * parent is answering: a mother's is about her own recovery, a father's
 * is about how he's doing supporting her. Weekly by default, twice-weekly
 * in the first six weeks — see lib/db/checkins.ts isCheckinDue.
 *
 * Once answered for this cadence window, shows a quiet "already checked
 * in" note instead of asking again — never nagging, never scored. The
 * moment that answer is from today specifically, this collapses further
 * still, to a small "✓ Checked in today" row — barely any footprint on
 * the page once it's done, for either role.
 */
export function CheckInCard({
  profileId,
  role,
  weeksPostpartum,
}: {
  profileId: string | null;
  role: "mother" | "father" | "prefer_not_to_say";
  weeksPostpartum: number;
}) {
  const p = usePalette();
  const [latest, setLatest] = useState<ParentCheckin | null | undefined>(undefined);
  const [energy, setEnergy] = useState<ParentCheckinEnergy | null>(null);
  const [help, setHelp] = useState<ParentCheckinHelp | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profileId) return;
    let alive = true;
    checkins
      .getLatestCheckin(profileId)
      .then((row) => {
        if (alive) setLatest(row);
      })
      .catch(() => {
        if (alive) setLatest(null);
      });
    return () => {
      alive = false;
    };
  }, [profileId]);

  if (!profileId || latest === undefined) return null;

  const due = checkins.isCheckinDue(latest, weeksPostpartum);
  const isFather = role === "father";

  const submit = async (finalEnergy: ParentCheckinEnergy, finalHelp: ParentCheckinHelp) => {
    setSaving(true);
    try {
      const saved = await checkins.submitCheckin(profileId, finalEnergy, finalHelp);
      setLatest(saved);
    } finally {
      setSaving(false);
    }
  };

  if (!due) {
    // The moment it's actually today's answer, a tiny acknowledgement --
    // otherwise nothing at all. The fuller "Checked in for now." card
    // used to render here the rest of the cadence window, but now that
    // MoodCheckInCard's own daily check-in (and its week strip) always
    // sits right above this, on both roles, that filler card was just
    // repeating "you're checked in" a second time one row down.
    if (checkins.isCheckedInToday(latest)) {
      return (
        <View style={styles.collapsedRow}>
          <Text style={[styles.collapsedText, { color: p.textMuted }]}>✓ Checked in today</Text>
        </View>
      );
    }
    return null;
  }

  return (
    <Card style={styles.card}>
      <Text style={[styles.title, { color: p.text }]}>
        {isFather ? "How's your energy this week?" : "How's your energy this week?"}
      </Text>
      <View style={styles.optionRow}>
        {ENERGY_OPTIONS.map((option) => (
          <Pressable
            key={option.value}
            disabled={saving}
            onPress={() => setEnergy(option.value)}
            style={[
              styles.option,
              { borderColor: p.border },
              energy === option.value && { backgroundColor: p.primary, borderColor: p.primary },
            ]}
          >
            <Text
              style={[
                styles.optionLabel,
                { color: energy === option.value ? p.surface : p.text },
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {energy === "running_on_empty" && (
        <Text style={[styles.hint, { color: p.textMuted }]}>
          {isFather
            ? "Taking something off her plate today, even briefly, is worth it."
            : "Quick, low-effort meals and your free IFA tablet reminder are below today."}
        </Text>
      )}

      <Text style={[styles.title, { color: p.text, marginTop: spacing.lg }]}>
        {isFather
          ? "Could you take one thing off her plate today?"
          : "Could someone take one caregiving block or one chore off you today?"}
      </Text>
      <View style={styles.optionRow}>
        {HELP_OPTIONS.map((option) => (
          <Pressable
            key={option.value}
            disabled={saving}
            onPress={() => setHelp(option.value)}
            style={[
              styles.option,
              { borderColor: p.border },
              help === option.value && { backgroundColor: p.primary, borderColor: p.primary },
            ]}
          >
            <Text
              style={[styles.optionLabel, { color: help === option.value ? p.surface : p.text }]}
            >
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {help === "not_really" && (
        <Text style={[styles.hint, { color: p.textMuted }]}>
          {isFather
            ? "Ask someone else to take one thing today — a chore, a nappy change, cooking — so you can."
            : "Ask someone to take one thing: burping and settling the baby, bath time, a nappy change, washing bottles if you use them, cooking, laundry."}
        </Text>
      )}

      {energy && help && (
        <Pressable
          disabled={saving}
          onPress={() => submit(energy, help)}
          style={[styles.submit, { backgroundColor: p.primary }]}
        >
          <Text style={[styles.submitLabel, { color: p.surface }]}>
            {saving ? "Saving…" : "Done"}
          </Text>
        </Pressable>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  collapsedRow: {
    paddingVertical: spacing.sm,
    marginBottom: spacing.lg,
  },
  collapsedText: {
    fontFamily: fonts.bodyMedium,
    fontSize: typeScale.bodySmall,
  },
  card: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  title: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.h3,
  },
  copy: {
    fontFamily: fonts.body,
    fontSize: typeScale.bodySmall,
    lineHeight: typeScale.bodySmall * 1.55,
    marginTop: spacing.xs,
  },
  optionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  option: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  optionLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: typeScale.bodySmall,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: typeScale.caption,
    lineHeight: typeScale.caption * 1.5,
    marginTop: spacing.sm,
  },
  submit: {
    marginTop: spacing.lg,
    alignSelf: "flex-start",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 999,
  },
  submitLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.bodySmall,
  },
});
