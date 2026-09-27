import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import * as family from "../lib/db/family";
import { hasSeenPartnerNamePrompt, markPartnerNamePromptSeen } from "../lib/firstRun";
import { colors, radius, spacing, type } from "../lib/theme";

/**
 * A one-time Home banner asking for a father's wife's name — covers every
 * account that onboarded before app/onboarding/partner-name.tsx existed
 * (its partner_name column is simply null, no different from having
 * skipped the question), and anyone who did see it but skipped. Without
 * it, a father's "for you" nutrition/recovery copy is stuck saying "her"
 * forever (see you/index.tsx familyMealsDescription).
 *
 * Shown at most once per device — see lib/firstRun.ts
 * hasSeenPartnerNamePrompt. Dismissing without a name still marks it
 * seen: this is a single nudge, not a recurring nag.
 */
export function PartnerNamePrompt({
  profileId,
  onSaved,
}: {
  profileId: string;
  onSaved: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    hasSeenPartnerNamePrompt()
      .then((seen) => {
        if (alive && !seen) setVisible(true);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const dismiss = () => {
    setVisible(false);
    void markPartnerNamePromptSeen();
  };

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      dismiss();
      return;
    }
    setSaving(true);
    try {
      await family.updateProfile(profileId, { partner_name: trimmed });
      onSaved();
    } catch {
      // Not fatal — the prompt is still marked seen below so it doesn't
      // nag every time Home reloads; the parent can add this later once
      // editing a partner's name has its own settings entry.
    } finally {
      setSaving(false);
      dismiss();
    }
  };

  if (!visible) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>ONE QUICK THING</Text>
      <Text style={styles.title}>What&rsquo;s your wife&rsquo;s name?</Text>
      <Text style={styles.body}>
        So the recovery guidance here can talk about her by name, not just &ldquo;her&rdquo;.
      </Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Her first name"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="words"
        autoComplete="name"
        style={styles.input}
        onSubmitEditing={save}
        editable={!saving}
      />
      <View style={styles.row}>
        <Pressable onPress={dismiss} hitSlop={8} disabled={saving}>
          <Text style={styles.skip}>Not now</Text>
        </Pressable>
        <Pressable onPress={save} hitSlop={8} disabled={saving}>
          <Text style={styles.save}>{saving ? "Saving…" : "Save"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(96, 79, 60, 0.10)",
  },
  eyebrow: {
    ...type.eyebrow,
    color: colors.warmTaupe,
  },
  title: {
    ...type.title,
    color: colors.charcoal,
    marginTop: spacing.sm,
  },
  body: {
    ...type.body,
    color: colors.textMuted,
    marginTop: 4,
  },
  input: {
    ...type.body,
    color: colors.charcoal,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.cream,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.md,
  },
  skip: {
    ...type.label,
    color: colors.textMuted,
  },
  save: {
    ...type.label,
    color: colors.sageDark,
  },
});
