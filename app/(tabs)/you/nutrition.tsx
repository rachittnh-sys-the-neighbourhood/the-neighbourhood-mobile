import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ExpertReviewBanner } from "../../../components/ExpertReviewBanner";
import { Card, CareNote, Chip, PageHeading, SectionLabel } from "../../../components/parentUI";
import { useAuth } from "../../../lib/AuthProvider";
import { computeAge, youngestChild } from "../../../lib/childAge";
import * as familyMeals from "../../../lib/db/familyMeals";
import type { FamilyMeal } from "../../../lib/db/types";
import { formatIngredients, splitGuidanceClauses } from "../../../lib/mealIngredientLabels";
import { usePalette } from "../../../lib/ModeProvider";
import { deriveProfile, elapsedPhrase, type DietaryPreference } from "../../../lib/parentCare";
import { isRecoveryRelevant } from "../../../lib/recoveryRelevance";
import { fonts, radius, spacing, typeScale } from "../../../lib/theme";

/**
 * Family Meals — replaces the old, separate role-based "Nutrition"
 * screen (a hardcoded mother/father meal timeline) and the Child tab's
 * own "Meal Planner" (a hardcoded feeding-stage timeline): one whole-
 * family meal plan, sourced from the v11 Meal Planner workbook, for
 * everyone at the table.
 *
 * STILL PENDING RD/PAEDIATRICIAN SIGN-OFF — see ExpertReviewBanner and
 * supabase/migrations/20260910090000_family_meal_planner.sql.
 *
 * A mother sees her own diet-specific addition on each meal ("For you:
 * add curd and a squeeze of lemon") and a day-balancing summary — a
 * HEURISTIC count of how many times a nutrient source shows up today,
 * never a number met or a target reached, per the workbook's own rule. A
 * father sees the same family meals without the mother-specific layer.
 */
const DIET_LABEL: Record<DietaryPreference, string> = {
  omnivore: "Non-vegetarian",
  vegetarian: "Vegetarian",
  eggetarian: "Eggetarian",
  vegan: "Vegan",
};

export default function FamilyMealsScreen() {
  const p = usePalette();
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ from?: string }>();
  const { children, profile: authProfile } = useAuth();
  const [allMeals, setAllMeals] = useState<FamilyMeal[] | null>(null);
  const [openDayBalancing, setOpenDayBalancing] = useState(false);
  const [expandedMealId, setExpandedMealId] = useState<string | null>(null);

  // This screen is pushed from two different places — Home's Family Meal
  // tile and You's own Family Meals card — and it lives inside the You
  // tab's stack either way. Reached from You, the default back behaviour
  // already does the right thing (pop back to the You hub, same stack).
  // Reached from Home, that same default back would instead land on the
  // You hub, not Home, because pushing across tabs doesn't carry Home
  // onto this stack. So the caller marks itself with ?from=home (see
  // home.tsx), and this intercepts via beforeRemove rather than just
  // overriding the header button — beforeRemove also catches the Android
  // hardware back button and the iOS edge-swipe gesture, neither of which
  // goes through headerLeft at all.
  useEffect(() => {
    if (params.from !== "home") return;
    return navigation.addListener("beforeRemove", (e) => {
      e.preventDefault();
      router.replace("/home");
    });
  }, [navigation, params.from, router]);

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

  // The parent's own postpartum stage, and the family's meal filtering,
  // both follow the youngest child — same rule every other You screen
  // applies (see lib/childAge.ts youngestChild).
  const recoveryChild = youngestChild(children);
  const ageMonths = recoveryChild ? computeAge(recoveryChild.date_of_birth)?.totalMonths ?? 0 : 0;
  const profile = useMemo(() => deriveProfile(ageMonths, authProfile), [ageMonths, authProfile]);
  const recoveryFramingApplies = isRecoveryRelevant(ageMonths);
  const isFather = profile.role === "father";

  const ageStage = familyMeals.familyMealAgeStage(ageMonths);
  const allergies = useMemo(
    () => Array.from(new Set([...profile.allergies, ...(recoveryChild?.allergies ?? [])])),
    [profile.allergies, recoveryChild?.allergies]
  );

  const dayIndex = Math.floor(Date.now() / 86_400_000);

  const slotPicks = useMemo(() => {
    if (!allMeals) return [];
    return familyMeals.FAMILY_MEAL_SLOTS.map((slot) => {
      const pool = familyMeals.mealsForSlot(allMeals, slot.key, ageStage, profile.diet, allergies);
      const meal = familyMeals.pickForDay(pool, dayIndex);
      const alternative = pool.length > 1 ? pool[(dayIndex + 1) % pool.length] : null;
      return { slot, meal, alternative: alternative?.id === meal?.id ? null : alternative };
    }).filter((entry) => entry.meal);
  }, [allMeals, ageStage, profile.diet, allergies, dayIndex]);

  const todaysMeals = slotPicks.map((entry) => entry.meal!).filter(Boolean);
  const opportunities = useMemo(
    () => familyMeals.dayBalancingOpportunities(todaysMeals, profile.diet),
    [todaysMeals, profile.diet]
  );

  if (allMeals === null) {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: p.bg }]}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: p.bg }}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <ExpertReviewBanner />

      <PageHeading
        eyebrow="Family Meals"
        title="Today, for the family"
        body={
          isFather
            ? "The same meals the whole family is eating today."
            : recoveryFramingApplies
              ? `Built around your recovery at ${elapsedPhrase(profile.weeksPostpartum)}, for everyone at the table.`
              : "Simple, familiar meals, for everyone at the table."
        }
      />

      {/* The youngest child being fully milk-fed doesn't mean there's no
          family meal plan — it means the FAMILY's plan below isn't yet
          shaped by that baby's own feeding stage. This note says so and
          sits alongside the plan, rather than replacing it outright. */}
      {!ageStage && recoveryChild && (
        <Card style={styles.milkNote}>
          <Text style={[styles.milkNoteTitle, { color: p.text }]}>
            {recoveryChild.name} is still fully milk-fed
          </Text>
          <Text style={[styles.milkNoteBody, { color: p.textMuted }]}>
            Milk is the whole diet for now — {recoveryChild.name}&rsquo;s own solid-food timeline
            starts around six months. The meals below are for the rest of the family.
          </Text>
        </Card>
      )}

      <View style={styles.chips}>
        <Chip label={DIET_LABEL[profile.diet]} />
        {allergies.map((allergen) => (
          <Chip key={allergen} label={`No ${allergen}`} />
        ))}
      </View>

      <View style={styles.block}>
        <SectionLabel>Today</SectionLabel>
        {slotPicks.map(({ slot, meal, alternative }) => (
          <View key={slot.key} style={styles.slot}>
            <View style={styles.slotRail}>
              <View style={[styles.slotDot, { borderColor: p.border }]} />
              <View style={[styles.slotLine, { backgroundColor: p.border }]} />
            </View>
            <View style={styles.slotBody}>
              <Text style={[styles.slotWindow, { color: p.textMuted }]}>
                {slot.window.toUpperCase()}
              </Text>
              <MealCard
                meal={meal!}
                diet={profile.diet}
                showMotherBoost={!isFather}
                expanded={expandedMealId === meal!.id}
                onToggle={() => setExpandedMealId(expandedMealId === meal!.id ? null : meal!.id)}
              />
              {alternative && (
                <Pressable
                  onPress={() =>
                    setExpandedMealId(expandedMealId === alternative.id ? null : alternative.id)
                  }
                  style={({ pressed }) => pressed && { opacity: 0.6 }}
                >
                  <Text style={[styles.swap, { color: p.primary }]}>
                    or {alternative.name.toLowerCase()}
                  </Text>
                </Pressable>
              )}
              {expandedMealId === alternative?.id && alternative && (
                <View style={styles.altDetail}>
                  <MealCard
                    meal={alternative}
                    diet={profile.diet}
                    showMotherBoost={!isFather}
                    expanded
                    onToggle={() => setExpandedMealId(null)}
                  />
                </View>
              )}
            </View>
          </View>
        ))}
      </View>

      {!isFather && opportunities.length > 0 && (
        <View style={styles.block}>
          <Card onPress={() => setOpenDayBalancing((v) => !v)}>
            <View style={styles.rowBetween}>
              <Text style={[styles.discTitle, { color: p.text }]}>How today's meals add up</Text>
              <Text style={[styles.discToggle, { color: p.primary }]}>
                {openDayBalancing ? "Hide" : "Show"}
              </Text>
            </View>
            {!openDayBalancing && (
              <Text style={[styles.discHint, { color: p.textMuted }]}>
                A rough sense of variety across today's meals — not a nutrient count.
              </Text>
            )}
          </Card>
          {openDayBalancing && (
            <Card style={styles.opportunityCard}>
              {opportunities.map((entry, index) => (
                <View
                  key={entry.label}
                  style={[
                    styles.opportunityRow,
                    index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: p.border },
                  ]}
                >
                  <Text style={[styles.opportunityLabel, { color: p.text }]}>{entry.label}</Text>
                  <Text style={[styles.opportunityCount, { color: p.textMuted }]}>
                    appears {entry.count} {entry.count === 1 ? "time" : "times"} today
                  </Text>
                </View>
              ))}
              <CareNote>
                This counts how often a food source shows up today — it does not calculate
                nutrient amounts, and it is never a target to hit.
              </CareNote>
            </Card>
          )}
        </View>
      )}

      <Text style={[styles.footer, { color: p.textMuted }]}>
        This is here to inform, not to replace. If something feels off, your instinct is worth
        following. Reach out to your doctor.
      </Text>
    </ScrollView>
  );
}

function MealCard({
  meal,
  diet,
  showMotherBoost,
  expanded,
  onToggle,
}: {
  meal: FamilyMeal;
  diet: DietaryPreference;
  showMotherBoost: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const p = usePalette();
  const boost = showMotherBoost ? familyMeals.motherBoostFor(meal, diet) : null;
  const ingredientsText = useMemo(() => formatIngredients(meal.ingredients), [meal.ingredients]);
  const safetyLines = useMemo(
    () => splitGuidanceClauses(meal.choking_modifications),
    [meal.choking_modifications]
  );
  const ageLines = useMemo(
    () => splitGuidanceClauses(meal.adaptation_guidance),
    [meal.adaptation_guidance]
  );

  return (
    <Card onPress={onToggle}>
      <Text style={[styles.mealTitle, { color: p.text }]}>{meal.name}</Text>
      {meal.age_guidance && (
        <Text style={[styles.mealBlurb, { color: p.textMuted }]}>{meal.age_guidance}</Text>
      )}

      <View style={styles.mealMeta}>
        {meal.total_minutes != null && (
          <Text style={[styles.mealMinutes, { color: p.primary }]}>{meal.total_minutes} min</Text>
        )}
        {meal.allergen_flags.length > 0 && (
          <Text style={[styles.mealFlag, { color: p.textMuted }]}>
            · contains {meal.allergen_flags.join(", ").toLowerCase()}
          </Text>
        )}
      </View>

      {expanded && (
        <View style={styles.recipe}>
          {ingredientsText && (
            <>
              <Text style={[styles.recipeHeading, { color: p.text }]}>What you need</Text>
              <Text style={[styles.recipeItem, { color: p.textMuted }]}>{ingredientsText}</Text>
            </>
          )}
          {safetyLines.length > 0 && (
            <>
              <Text style={[styles.recipeHeading, { color: p.text, marginTop: spacing.md }]}>
                Keeping it safe
              </Text>
              {safetyLines.map((line, index) => (
                <Text
                  key={index}
                  style={[
                    styles.recipeItem,
                    { color: p.textMuted },
                    index > 0 && styles.recipeItemStacked,
                  ]}
                >
                  {line}
                </Text>
              ))}
            </>
          )}
          {ageLines.length > 0 && (
            <>
              <Text style={[styles.recipeHeading, { color: p.text, marginTop: spacing.md }]}>
                By age
              </Text>
              {ageLines.map((line, index) => (
                <Text
                  key={index}
                  style={[
                    styles.recipeItem,
                    { color: p.textMuted },
                    index > 0 && styles.recipeItemStacked,
                  ]}
                >
                  {line}
                </Text>
              ))}
            </>
          )}
          {boost && (
            <Text style={[styles.motherBoost, { color: p.primary }]}>{boost}</Text>
          )}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  block: {
    marginTop: spacing.xl,
  },
  milkNote: {
    marginTop: spacing.lg,
    padding: spacing.lg,
  },
  milkNoteTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.h3,
    lineHeight: typeScale.h3 * 1.3,
  },
  milkNoteBody: {
    fontFamily: fonts.body,
    fontSize: typeScale.bodySmall,
    lineHeight: typeScale.bodySmall * 1.55,
    marginTop: spacing.xs,
  },
  slot: {
    flexDirection: "row",
    gap: spacing.md,
  },
  slotRail: {
    alignItems: "center",
    width: 12,
    paddingTop: 18,
  },
  slotDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
  },
  slotLine: {
    flex: 1,
    width: StyleSheet.hairlineWidth,
    marginTop: 4,
  },
  slotBody: {
    flex: 1,
    paddingBottom: spacing.lg,
  },
  slotWindow: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.caption,
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
  },
  swap: {
    fontFamily: fonts.body,
    fontSize: typeScale.bodySmall,
    marginTop: spacing.sm,
    marginLeft: spacing.xs,
  },
  altDetail: {
    marginTop: spacing.sm,
  },
  mealTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.h3,
    lineHeight: typeScale.h3 * 1.3,
  },
  mealBlurb: {
    fontFamily: fonts.body,
    fontSize: typeScale.bodySmall,
    lineHeight: typeScale.bodySmall * 1.55,
    marginTop: spacing.xs,
  },
  mealMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: spacing.sm,
  },
  mealMinutes: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.caption,
  },
  mealFlag: {
    fontFamily: fonts.body,
    fontSize: typeScale.caption,
  },
  recipe: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(60, 80, 62, 0.13)",
  },
  recipeHeading: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.bodySmall,
    marginBottom: spacing.xs,
  },
  recipeItem: {
    fontFamily: fonts.body,
    fontSize: typeScale.bodySmall,
    lineHeight: typeScale.bodySmall * 1.7,
  },
  // "Keeping it safe" / "By age" render one clause per line (see
  // splitGuidanceClauses) rather than one semicolon-joined paragraph --
  // this is the gap between those lines, applied to every line after the
  // first.
  recipeItemStacked: {
    marginTop: spacing.xs,
  },
  motherBoost: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.bodySmall,
    lineHeight: typeScale.bodySmall * 1.6,
    marginTop: spacing.md,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  discTitle: {
    flex: 1,
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.h3,
  },
  discToggle: {
    fontFamily: fonts.bodyMedium,
    fontSize: typeScale.bodySmall,
  },
  discHint: {
    fontFamily: fonts.body,
    fontSize: typeScale.bodySmall,
    lineHeight: typeScale.bodySmall * 1.55,
    marginTop: spacing.xs,
  },
  opportunityCard: {
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
  },
  opportunityRow: {
    paddingVertical: spacing.sm,
  },
  opportunityLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.bodySmall,
  },
  opportunityCount: {
    fontFamily: fonts.body,
    fontSize: typeScale.caption,
    marginTop: 2,
  },
  footer: {
    fontFamily: fonts.body,
    fontSize: typeScale.caption,
    lineHeight: typeScale.caption * 1.6,
    marginTop: spacing.xl,
    textAlign: "center",
    paddingHorizontal: spacing.md,
  },
});
