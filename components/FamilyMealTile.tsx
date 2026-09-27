import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import * as familyMeals from "../lib/db/familyMeals";
import type { DietaryPreference } from "../lib/parentCare";
import type { FamilyMeal } from "../lib/db/types";
import { colors, radius, spacing, type } from "../lib/theme";

function slotForHour(hour: number): familyMeals.FamilyMealSlot {
  if (hour < 10) return "breakfast";
  if (hour < 12) return "morning_snack";
  if (hour < 16) return "lunch";
  if (hour < 19) return "afternoon_snack";
  return "dinner";
}

/**
 * Home's Family Meal tile — "what's the family eating around now",
 * one meal, not a whole day's timeline (that lives on the fuller
 * Family Meals screen at you/nutrition.tsx). Picked by the slot that
 * matches the time of day, same rotation-by-day pattern as everything
 * else that varies daily in the app.
 */
export function FamilyMealTile({
  ageMonths,
  diet,
  allergies,
  onPress,
}: {
  ageMonths: number;
  diet: DietaryPreference;
  allergies: string[];
  onPress: () => void;
}) {
  const [allMeals, setAllMeals] = useState<FamilyMeal[] | null>(null);

  useEffect(() => {
    let alive = true;
    familyMeals
      .fetchAllFamilyMeals()
      .then((rows) => {
        if (alive) setAllMeals(rows);
      })
      .catch(() => {
        if (alive) setAllMeals([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  const meal = useMemo(() => {
    if (!allMeals) return null;
    const slot = slotForHour(new Date().getHours());
    const ageStage = familyMeals.familyMealAgeStage(ageMonths);
    const pool = familyMeals.mealsForSlot(allMeals, slot, ageStage, diet, allergies);
    const dayIndex = Math.floor(Date.now() / 86_400_000);
    return familyMeals.pickForDay(pool, dayIndex);
  }, [allMeals, ageMonths, diet, allergies]);

  if (!meal) return null;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.75 }]}
    >
      <Text style={styles.eyebrow}>FAMILY MEAL</Text>
      <Text style={styles.title}>{meal.name}</Text>
      {meal.age_guidance && <Text style={styles.body}>{meal.age_guidance}</Text>}
      <Text style={styles.link}>See today's meals ›</Text>
      <Text style={styles.disclaimer}>Under expert review</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
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
  link: {
    ...type.label,
    color: colors.sageDark,
    marginTop: spacing.md,
  },
  disclaimer: {
    ...type.meta,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});
