import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { BuildingBanner } from "../../../components/BuildingBanner";
import {
  Card,
  CareNote,
  Chip,
  NutrientTrack,
  PageHeading,
  SectionLabel,
} from "../../../components/parentUI";
import { useAuth } from "../../../lib/AuthProvider";
import { computeAge, youngestChild } from "../../../lib/childAge";
import { usePalette } from "../../../lib/ModeProvider";
import {
  MEAL_SLOTS,
  type Meal,
  deriveProfile,
  elapsedPhrase,
  groceriesFor,
  mealsFor,
  nutrientsFor,
} from "../../../lib/parentCare";
import { isRecoveryRelevant } from "../../../lib/recoveryRelevance";
import { fonts, radius, spacing, typeScale } from "../../../lib/theme";

/**
 * The Nutrition Planner.
 *
 * The brief for this screen was mostly a list of things NOT to be: not
 * MyFitnessPal, not a calorie ledger, not analytical. So the organising idea
 * is a day rather than a database — a timeline you read top to bottom, with
 * the nutrient view folded away underneath it for the parent who wants it.
 *
 * Two rules hold the tone:
 *   1. Nutrients show a soft track and a REASON, never a number chased to
 *      100%. "A little more iron" beats "38% of RDA".
 *   2. Nothing is logged automatically and nothing turns red when it isn't.
 */
export default function Nutrition() {
  const p = usePalette();
  const { children, profile: authProfile } = useAuth();
  const [openNutrients, setOpenNutrients] = useState(false);
  const [openGroceries, setOpenGroceries] = useState(false);
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null);

  // The parent's own postpartum stage follows the youngest child, not
  // whichever child is active in the Kids tab switcher — see today.tsx.
  const recoveryChild = youngestChild(children);
  const ageMonths = recoveryChild ? computeAge(recoveryChild.date_of_birth)?.totalMonths ?? 0 : 0;
  const profile = useMemo(() => deriveProfile(ageMonths, authProfile), [ageMonths, authProfile]);
  const nutrients = useMemo(() => nutrientsFor(profile), [profile]);
  const groceries = useMemo(() => groceriesFor(profile), [profile]);
  // Postpartum framing (title, "N weeks postpartum", the caesarean chip)
  // only fits roughly the first year — see lib/recoveryRelevance.ts. Past
  // that it's just "your everyday nutrition," same as you/today.tsx.
  const recoveryFramingApplies = isRecoveryRelevant(ageMonths);
  // A father's Nutrition is about supporting her and the family, and his
  // own basic wellbeing — never postpartum recovery or breastfeeding
  // presented as if it were his own.
  const isFather = profile.role === "father";

  const dietLabel =
    profile.diet === "vegan" ? "Vegan" : profile.diet === "vegetarian" ? "Vegetarian" : "No restrictions";

  return (
    <ScrollView
      style={{ backgroundColor: p.bg }}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <BuildingBanner />

      <PageHeading
        eyebrow="Nutrition"
        title={
          isFather
            ? "Supporting her, and yourself."
            : recoveryFramingApplies
              ? "Eating for the body that's healing."
              : "Eating well, day to day."
        }
        body={
          isFather
            ? "A few ways to help with meals, her nutrition, and your own energy today."
            : recoveryFramingApplies
              ? `Built around ${
                  profile.feeding === "formula" ? "recovery" : "breastfeeding"
                } at ${elapsedPhrase(
                  profile.weeksPostpartum
                )}, and around the fact that you may be eating one-handed.`
              : "Simple, steady meals built around your day."
        }
      />

      {/* What this plan is adapted to — stated plainly, because a plan that
          silently assumes things about your body is not trustworthy. */}
      <View style={styles.chips}>
        {!isFather && recoveryFramingApplies && profile.feeding !== "formula" && (
          <Chip
            label={profile.feeding === "mixed" ? "Mixed feeding" : "Breastfeeding"}
            tone="accent"
          />
        )}
        <Chip label={dietLabel} />
        {!isFather && recoveryFramingApplies && profile.delivery === "caesarean" && (
          <Chip label="Post-caesarean" />
        )}
        {profile.allergies.map((allergen) => (
          <Chip key={allergen} label={`No ${allergen}`} />
        ))}
      </View>

      {/* The day, as a timeline. */}
      <View style={styles.block}>
        <SectionLabel>Today</SectionLabel>
        {MEAL_SLOTS.map((slot) => {
          const options = mealsFor(profile, slot.key);
          if (options.length === 0) return null;
          const meal = options[0];
          const alternative = options[1];
          return (
            <View key={slot.key} style={styles.slot}>
              <View style={styles.slotRail}>
                <View
                  style={[
                    styles.slotDot,
                    {
                      backgroundColor: meal.logged ? p.positive : p.surface,
                      borderColor: meal.logged ? p.positive : p.border,
                    },
                  ]}
                />
                <View style={[styles.slotLine, { backgroundColor: p.border }]} />
              </View>

              <View style={styles.slotBody}>
                <Text style={[styles.slotWindow, { color: p.textMuted }]}>
                  {slot.window.toUpperCase()}
                </Text>
                <MealCard
                  meal={meal}
                  expanded={expandedMeal === meal.id}
                  onToggle={() =>
                    setExpandedMeal(expandedMeal === meal.id ? null : meal.id)
                  }
                />
                {alternative && (
                  <Pressable
                    onPress={() =>
                      setExpandedMeal(expandedMeal === alternative.id ? null : alternative.id)
                    }
                    style={({ pressed }) => pressed && { opacity: 0.6 }}
                  >
                    <Text style={[styles.swap, { color: p.primary }]}>
                      or {alternative.title.toLowerCase()}
                    </Text>
                  </Pressable>
                )}
                {expandedMeal === alternative?.id && alternative && (
                  <View style={styles.altDetail}>
                    <MealCard meal={alternative} expanded onToggle={() => setExpandedMeal(null)} />
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>

      {/* Nutrients, folded away. Present for those who want them, invisible
          for those for whom they'd be one more thing to fail at. */}
      <View style={styles.block}>
        <Card
          onPress={() => setOpenNutrients((v) => !v)}
          style={openNutrients ? styles.discOpen : undefined}
        >
          <View style={styles.rowBetween}>
            <Text style={[styles.discTitle, { color: p.text }]}>
              {isFather ? "Your own basic nutrition" : "What your body is asking for"}
            </Text>
            <Text style={[styles.discToggle, { color: p.primary }]}>
              {openNutrients ? "Hide" : "Show"}
            </Text>
          </View>
          {!openNutrients && (
            <Text style={[styles.discHint, { color: p.textMuted }]}>
              {isFather
                ? "Seven nutrients worth keeping an eye on for yourself."
                : recoveryFramingApplies
                  ? "Seven nutrients that matter more while feeding."
                  : "Seven nutrients worth keeping an eye on."}
            </Text>
          )}
        </Card>

        {openNutrients && (
          <Card style={styles.nutrientCard}>
            {nutrients.map((n, index) => (
              <View
                key={n.key}
                style={[
                  styles.nutrient,
                  index > 0 && {
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderTopColor: p.border,
                  },
                ]}
              >
                <View style={styles.rowBetween}>
                  <Text style={[styles.nutrientLabel, { color: p.text }]}>{n.label}</Text>
                  <Text style={[styles.nutrientAmount, { color: p.textMuted }]}>
                    {n.current} of {n.target} {n.unit}
                  </Text>
                </View>
                <View style={styles.nutrientTrack}>
                  <NutrientTrack fraction={n.current / n.target} />
                </View>
                <Text style={[styles.nutrientWhy, { color: p.textMuted }]}>{n.why}</Text>
              </View>
            ))}
            <CareNote>
              This is here to inform, not to replace. If something feels off, your
              instinct is worth following. Reach out to your doctor.
            </CareNote>
          </Card>
        )}
      </View>

      {/* Groceries. */}
      <View style={styles.block}>
        <Card onPress={() => setOpenGroceries((v) => !v)}>
          <View style={styles.rowBetween}>
            <Text style={[styles.discTitle, { color: p.text }]}>What to have in</Text>
            <Text style={[styles.discToggle, { color: p.primary }]}>
              {openGroceries ? "Hide" : `${groceries.length} things`}
            </Text>
          </View>
          {openGroceries && (
            <View style={styles.groceryList}>
              {groceries.map((item) => (
                <View key={item} style={styles.groceryRow}>
                  <View style={[styles.groceryDot, { backgroundColor: p.secondary }]} />
                  <Text style={[styles.groceryText, { color: p.textMuted }]}>{item}</Text>
                </View>
              ))}
            </View>
          )}
        </Card>
      </View>
    </ScrollView>
  );
}

function MealCard({
  meal,
  expanded,
  onToggle,
}: {
  meal: Meal;
  expanded: boolean;
  onToggle: () => void;
}) {
  const p = usePalette();
  return (
    <Card onPress={onToggle}>
      <View style={styles.rowBetween}>
        <Text style={[styles.mealTitle, { color: p.text }]}>{meal.title}</Text>
        {meal.logged && (
          <View style={[styles.loggedDot, { backgroundColor: p.positive }]} />
        )}
      </View>
      <Text style={[styles.mealBlurb, { color: p.textMuted }]}>{meal.blurb}</Text>

      <View style={styles.mealMeta}>
        <Text style={[styles.mealMinutes, { color: p.primary }]}>{meal.minutes} min</Text>
        {meal.oneHanded && (
          <Text style={[styles.mealFlag, { color: p.textMuted }]}>· one-handed</Text>
        )}
      </View>

      {expanded && (
        <View style={styles.recipe}>
          <Text style={[styles.recipeHeading, { color: p.text }]}>What you need</Text>
          {meal.ingredients.map((i) => (
            <Text key={i} style={[styles.recipeItem, { color: p.textMuted }]}>
              {i}
            </Text>
          ))}
          <Text style={[styles.recipeHeading, { color: p.text, marginTop: spacing.md }]}>
            How
          </Text>
          {meal.steps.map((step, index) => (
            <View key={step} style={styles.stepRow}>
              <Text style={[styles.stepNumber, { color: p.secondary }]}>{index + 1}</Text>
              <Text style={[styles.stepText, { color: p.textMuted }]}>{step}</Text>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
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
    flex: 1,
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.h3,
    lineHeight: typeScale.h3 * 1.3,
  },
  loggedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
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
  stepRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  stepNumber: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.bodySmall,
    width: 14,
  },
  stepText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: typeScale.bodySmall,
    lineHeight: typeScale.bodySmall * 1.55,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  discOpen: {
    marginBottom: spacing.sm,
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
  nutrientCard: {
    paddingVertical: spacing.xs,
  },
  nutrient: {
    paddingVertical: spacing.md,
  },
  nutrientLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.bodySmall,
  },
  nutrientAmount: {
    fontFamily: fonts.body,
    fontSize: typeScale.caption,
  },
  nutrientTrack: {
    marginTop: spacing.sm,
  },
  nutrientWhy: {
    fontFamily: fonts.body,
    fontSize: typeScale.caption,
    lineHeight: typeScale.caption * 1.6,
    marginTop: spacing.sm,
  },
  groceryList: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  groceryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  groceryDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  groceryText: {
    fontFamily: fonts.body,
    fontSize: typeScale.bodySmall,
  },
});
