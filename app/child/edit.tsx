import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { BornEarlyQuestion } from "../../components/BornEarlyQuestion";
import { DateWheel, MONTHS, isComplete, type DateParts } from "../../components/DateWheel";
import { DisplayField, FadeIn, Hint, OnboardingScreen, Prompt } from "../../components/onboarding";
import { PrimaryButton } from "../../components/ui";
import { useAuth } from "../../lib/AuthProvider";
import { CORRECTION_UNTIL_MONTHS, computeAge, isPreterm } from "../../lib/childAge";
import { parseAllergies } from "../../lib/childAllergies";
import * as family from "../../lib/db/family";
import { colors, fonts, radius, spacing, typeScale } from "../../lib/theme";

const TODAY = new Date();
const LATEST_YEAR = TODAY.getFullYear();
const EARLIEST_YEAR = LATEST_YEAR - 12;

const GENDER_OPTIONS = ["Male", "Female", "Prefer not to say"];

function toISO(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function fromISO(dateOfBirth: string): DateParts {
  const [y, m, d] = dateOfBirth.split("-").map(Number);
  return { year: y, month: m - 1, day: d };
}

/**
 * Edit the active child's details — name, birthday, gender. Reached from
 * Profile's "Child details" row, which previously had no onPress at all.
 * Reuses the exact same inputs as Add a child; only the initial values
 * and the save call (update, not create) differ.
 */
export default function EditChild() {
  const router = useRouter();
  const { child, refreshFamily } = useAuth();
  const [name, setName] = useState(child?.name ?? "");
  const [parts, setParts] = useState<DateParts>(
    child ? fromISO(child.date_of_birth) : { year: null, month: null, day: null }
  );
  const [gender, setGender] = useState<string | null>(child?.gender ?? null);
  const [gestationalWeeks, setGestationalWeeks] = useState<number | null>(
    child?.gestational_weeks ?? null
  );
  const [inNicu, setInNicu] = useState(child?.in_nicu ?? false);
  // A text buffer rather than a live array, for the same reason
  // recovery-settings.tsx uses one: splitting on every keystroke would
  // save half-typed words as allergens.
  const [allergiesText, setAllergiesText] = useState(() => (child?.allergies ?? []).join(", "));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const dateComplete = isComplete(parts);
  const iso = dateComplete ? toISO(parts.year, parts.month, parts.day) : null;
  const inFuture = iso ? new Date(iso + "T00:00:00").getTime() > TODAY.getTime() : false;
  const age = iso && !inFuture ? computeAge(iso) : null;
  const ready = !!child && name.trim().length > 0 && dateComplete && !inFuture && !saving;

  const asksBornEarly = !!age && age.totalMonths < CORRECTION_UNTIL_MONTHS;
  // Only a preterm baby can be "in the NICU" as far as the preterm module
  // goes (see lib/preterm.ts), so the question only appears for one.
  const asksInNicu = asksBornEarly && isPreterm(gestationalWeeks);

  const handleSave = async () => {
    if (!ready || !iso || !child) return;
    setSaving(true);
    setSaveError(false);
    try {
      await family.updateChild(child.id, {
        name: name.trim(),
        date_of_birth: iso,
        gender,
        gestational_weeks: asksBornEarly ? gestationalWeeks : null,
        allergies: parseAllergies(allergiesText),
        in_nicu: asksInNicu ? inNicu : false,
      });
      await refreshFamily();
      router.back();
    } catch {
      setSaving(false);
      setSaveError(true);
    }
  };

  return (
    <OnboardingScreen
      scroll
      footer={<PrimaryButton title="Save" onPress={handleSave} disabled={!ready} />}
    >
      <FadeIn>
        <Prompt>Child details</Prompt>
        <Hint>Name, birthday, and anything we should plan around. Update these anytime.</Hint>

        <DisplayField
          label="Their name"
          value={name}
          onChangeText={setName}
          placeholder="Their first name"
          autoCapitalize="words"
        />

        <View style={styles.spacer} />

        <DateWheel value={parts} onChange={setParts} earliestYear={EARLIEST_YEAR} latestYear={LATEST_YEAR} />

        {inFuture ? (
          <Text style={styles.error}>That date hasn&rsquo;t happened yet.</Text>
        ) : (
          dateComplete &&
          age && (
            <Text style={styles.echo}>
              {parts.day} {MONTHS[parts.month]} {parts.year}, that makes them {age.label}.
            </Text>
          )
        )}

        {asksBornEarly && (
          <BornEarlyQuestion
            value={gestationalWeeks}
            onChange={setGestationalWeeks}
            childName={name}
          />
        )}

        {asksInNicu && (
          <>
            <View style={styles.spacer} />
            <Text style={styles.genderLabel}>Is {name.trim() || "your baby"} still in the NICU?</Text>
            <View style={styles.genderRow}>
              {[
                { value: true, label: "Still in the NICU" },
                { value: false, label: "Home now" },
              ].map((option) => {
                const selected = inNicu === option.value;
                return (
                  <Pressable
                    key={String(option.value)}
                    onPress={() => setInNicu(option.value)}
                    style={[styles.genderPill, selected && styles.genderPillOn]}
                  >
                    <Text style={[styles.genderPillText, selected && styles.genderPillTextOn]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        <View style={styles.spacer} />

        <Text style={styles.genderLabel}>Gender (optional)</Text>
        <View style={styles.genderRow}>
          {GENDER_OPTIONS.map((option) => {
            const selected = gender === option;
            return (
              <Pressable
                key={option}
                onPress={() => setGender(selected ? null : option)}
                style={[styles.genderPill, selected && styles.genderPillOn]}
              >
                <Text style={[styles.genderPillText, selected && styles.genderPillTextOn]}>
                  {option}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.spacer} />

        <DisplayField
          label="Allergies (optional)"
          value={allergiesText}
          onChangeText={setAllergiesText}
          placeholder="e.g. peanut, egg"
          autoFocus={false}
          autoCapitalize="none"
          style={styles.allergyField}
        />
        <Text style={styles.allergyHint}>
          Separate with commas. Meals containing these are left out of the meal planner. This
          isn&rsquo;t medical advice. Your paediatrician is still the one who knows their history.
        </Text>

        {saveError && (
          <Text style={styles.error}>
            We couldn&rsquo;t save that. Check your connection and try again.
          </Text>
        )}
      </FadeIn>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  spacer: { height: spacing.lg },
  // Smaller than the name field: a comma-separated list wraps, and 30pt
  // display type turns three allergens into four lines.
  allergyField: {
    fontSize: typeScale.h3,
    marginTop: spacing.xs,
  },
  allergyHint: {
    fontFamily: fonts.body,
    fontSize: typeScale.caption,
    lineHeight: typeScale.caption * 1.55,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  echo: {
    fontFamily: fonts.bodyMedium,
    fontSize: typeScale.body,
    color: colors.warmTaupe,
    marginTop: spacing.sm,
  },
  error: {
    fontFamily: fonts.bodyMedium,
    fontSize: typeScale.body,
    color: colors.error,
    marginTop: spacing.sm,
  },
  genderLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.caption,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  genderRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  genderPill: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  genderPillOn: { backgroundColor: colors.warmTaupe, borderColor: colors.warmTaupe },
  genderPillText: {
    fontFamily: fonts.bodyMedium,
    fontSize: typeScale.bodySmall,
    color: colors.charcoal,
  },
  genderPillTextOn: { color: colors.white },
});
