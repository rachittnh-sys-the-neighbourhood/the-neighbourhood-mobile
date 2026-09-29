import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import * as familyMeals from "../lib/db/familyMeals";
import type { DietaryPreference } from "../lib/parentCare";
import type { FamilyMeal } from "../lib/db/types";
import { colors, homeType, radius, spacing } from "../lib/theme";

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
      <Text style={styles.eyebrow}>Family meal</Text>
      <View style={styles.titleRow}>
        {/* Same row as the link now, matching the reference layout --
            but the real data has names up to "Chicken Vegetable Curry
            Rice" (28 chars), which won't fit beside "See today's meals"
            at full size. numberOfLines+ellipsis lets it truncate
            gracefully instead of wrapping into the link or overflowing. */}
        <Text style={[styles.title, styles.titleFlex]} numberOfLines={1} ellipsizeMode="tail">
          {meal.name}
        </Text>
        <Text style={styles.link}>See today's meals ›</Text>
      </View>
      <Text style={styles.disclaimer}>Under expert review</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    // Bumped back up from the ultra-compact pass now that dropping the
    // two-line description freed real space -- give some of it back as
    // breathing room instead of just shrinking the tile further.
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(96, 79, 60, 0.10)",
  },
  eyebrow: {
    ...homeType.eyebrow,
    color: colors.warmTaupe,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  titleFlex: {
    flex: 1,
  },
  // homeType.cardTitle -- the exact same role "Gentle Wrist Turns" uses
  // (components/ActivityCard.tsx featuredTitle), since both are entity
  // names (a dish, an activity) that should read as the same weight of
  // "thing" regardless of which tile they're in.
  title: {
    ...homeType.cardTitle,
    color: colors.charcoal,
  },
  link: {
    ...homeType.action,
    color: colors.sageDark,
    flexShrink: 0,
  },
  disclaimer: {
    ...homeType.meta,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});
