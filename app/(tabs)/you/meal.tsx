import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { MealSlotIcon } from "../../../components/MealSlotIcon";
import { Card } from "../../../components/parentUI";
import { useAuth } from "../../../lib/AuthProvider";
import { computeAge, youngestChild } from "../../../lib/childAge";
import * as familyMeals from "../../../lib/db/familyMeals";
import type { FamilyMealSlot } from "../../../lib/db/familyMeals";
import type { FamilyMeal } from "../../../lib/db/types";
import { formatIngredients, splitGuidanceClauses } from "../../../lib/mealIngredientLabels";
import { usePalette } from "../../../lib/ModeProvider";
import { deriveProfile, type DietaryPreference } from "../../../lib/parentCare";
import { fonts, radius, spacing, typeScale } from "../../../lib/theme";

const DIET_LABEL: Record<DietaryPreference, string> = {
  omnivore: "Non-vegetarian",
  vegetarian: "Vegetarian",
  eggetarian: "Eggetarian",
  vegan: "Vegan",
};

/**
 * A single meal's own screen -- reached by tapping "View meal" on Family
 * Meals' Today list. Own custom header (not the Stack's native one, see
 * you/_layout.tsx) to match the agreed layout exactly: back arrow, the
 * slot name as the title, nothing else.
 *
 * Structure is deliberately just four things, per the agreed spec: the
 * name/duration/diet-type header, "What you need" (ingredients, plain
 * text), "Serving guidance" (age-appropriate portion info AND the safety/
 * prep notes together -- choking_modifications reads as the same topic as
 * "how to serve this at this age", not a separate concern), and "Good for
 * her/his recovery" when the meal has one. No trust-marker/confirmation
 * card -- that was empty copy with nothing behind it.
 *
 * Swap here does the same thing as the list's own Swap: substitutes the
 * next alternative from this slot's pool (see
 * lib/db/familyMeals.ts's swap-override store) and shows an Undo, rather
 * than a separate picker screen.
 */
export default function MealDetailsScreen() {
  const p = usePalette();
  const router = useRouter();
  const params = useLocalSearchParams<{ mealId: string; slot: FamilyMealSlot }>();
  const { children, profile: authProfile } = useAuth();
  const [allMeals, setAllMeals] = useState<FamilyMeal[] | null>(null);
  // Open by default -- this is the one section actually worth reading
  // right away (age-appropriate portion + safety notes), so the chevron
  // is there to let someone close it once they've read it, not to make
  // them ask for it first.
  const [guidanceOpen, setGuidanceOpen] = useState(true);
  const [justSwapped, setJustSwapped] = useState<string | null>(null);

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

  const recoveryChild = youngestChild(children);
  const ageMonths = recoveryChild ? computeAge(recoveryChild.date_of_birth)?.totalMonths ?? 0 : 0;
  const profile = useMemo(() => deriveProfile(ageMonths, authProfile), [ageMonths, authProfile]);
  const isFather = profile.role === "father";
  const ageStage = familyMeals.familyMealAgeStage(ageMonths);
  const allergies = useMemo(
    () => Array.from(new Set([...profile.allergies, ...(recoveryChild?.allergies ?? [])])),
    [profile.allergies, recoveryChild?.allergies]
  );

  // The override applies here too -- if the list screen already swapped
  // this slot, or this screen's own Swap was just tapped, show that meal,
  // not whatever mealId was passed in at navigation time.
  const override = familyMeals.getSwapOverride(params.slot);
  const displayedId = override ?? params.mealId;
  const meal = allMeals?.find((m) => m.id === displayedId) ?? null;

  const slotLabel =
    familyMeals.FAMILY_MEAL_SLOTS.find((s) => s.key === params.slot)?.label ?? "Meal";

  const boost = meal
    ? isFather
      ? familyMeals.partnerBoostFor(meal, profile.diet)
      : familyMeals.motherBoostFor(meal, profile.diet)
    : null;
  const ingredientsText = useMemo(() => formatIngredients(meal?.ingredients), [meal?.ingredients]);
  const safetyLines = useMemo(
    () => splitGuidanceClauses(meal?.choking_modifications),
    [meal?.choking_modifications]
  );
  const ageLines = useMemo(
    () => splitGuidanceClauses(meal?.adaptation_guidance),
    [meal?.adaptation_guidance]
  );
  // The household's actual diet choice (profile.diet), not a re-derived
  // guess from this one meal's own vegetarian flag -- that was wrong for
  // eggetarian/vegan households (every meal would've read "Vegetarian" or
  // "Non-vegetarian" regardless of what they'd actually chosen). Every
  // meal shown here already matches this diet (see matchesDiet in
  // lib/db/familyMeals.ts), so restating it is just confirming the same
  // fact the list screen's own pill already shows, correctly this time.
  const dietLabel = DIET_LABEL[profile.diet];

  const swap = () => {
    if (!allMeals || !meal) return;
    const pool = familyMeals.mealsForSlot(allMeals, params.slot, ageStage, profile.diet, allergies);
    if (pool.length < 2) return;
    const currentIndex = pool.findIndex((m) => m.id === meal.id);
    const next = pool[(currentIndex + 1) % pool.length];
    if (!next || next.id === meal.id) return;
    familyMeals.setSwapOverride(params.slot, next.id);
    setJustSwapped(next.name);
  };

  const undoSwap = () => {
    familyMeals.clearSwapOverride(params.slot);
    setJustSwapped(null);
  };

  if (allMeals === null || !meal) {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: p.bg }]}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: p.bg }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Path d="M15 6l-6 6 6 6" stroke={p.text} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </Pressable>
        <Text style={[styles.headerTitle, { color: p.text }]}>{slotLabel}</Text>
        <View style={{ width: 20 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {justSwapped && (
          <View style={[styles.swapBanner, { backgroundColor: p.surfaceAlt }]}>
            <Text style={[styles.swapBannerText, { color: p.text }]}>Swapped to {justSwapped}</Text>
            <Pressable onPress={undoSwap} hitSlop={8}>
              <Text style={[styles.swapBannerUndo, { color: p.primary }]}>Undo</Text>
            </Pressable>
          </View>
        )}

        <View style={[styles.iconBadge, { backgroundColor: p.surfaceAlt }]}>
          <MealSlotIcon slot={params.slot} color={p.textMuted} size={30} />
        </View>

        <Text style={[styles.mealName, { color: p.text }]}>{meal.name}</Text>
        <Text style={[styles.mealMeta, { color: p.textMuted }]}>
          {meal.total_minutes != null ? `${meal.total_minutes} min · ` : ""}
          {dietLabel}
        </Text>
        {meal.allergen_flags.length > 0 && (
          <View style={[styles.allergenChip, { backgroundColor: p.surfaceAlt }]}>
            <Text style={[styles.allergenChipText, { color: p.textMuted }]}>
              Contains {meal.allergen_flags.join(", ").toLowerCase()}
            </Text>
          </View>
        )}

        {ingredientsText && (
          <View style={[styles.section, { backgroundColor: p.surface, borderColor: p.border }]}>
            <Text style={[styles.sectionTitle, { color: p.text }]}>What you need</Text>
            <Text style={[styles.sectionBody, { color: p.textMuted }]}>{ingredientsText}</Text>
          </View>
        )}

        {(ageLines.length > 0 || safetyLines.length > 0) && (
          <View style={[styles.section, { backgroundColor: p.surface, borderColor: p.border }]}>
            <Pressable
              onPress={() => setGuidanceOpen((v) => !v)}
              style={styles.disclosureHeader}
              hitSlop={6}
            >
              <Text style={[styles.disclosureTitle, { color: p.text }]}>Serving guidance</Text>
              <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                <Path
                  d={guidanceOpen ? "m6 15 6-6 6 6" : "m6 9 6 6 6-6"}
                  stroke={p.textMuted}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </Pressable>
            {guidanceOpen && (
              <View style={[styles.disclosureBody, { borderTopColor: p.border }]}>
                {/* Some meals repeat a clause verbatim across
                    adaptation_guidance and choking_modifications (e.g.
                    "Ensure paratha is soft" in both) -- deduped here
                    rather than showing the same line twice. */}
                {Array.from(new Set([...ageLines, ...safetyLines])).map((line, index) => (
                  <Text
                    key={index}
                    style={[
                      styles.sectionBody,
                      { color: p.textMuted },
                      index > 0 && styles.stackedLine,
                    ]}
                  >
                    {line}
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}

        {boost && (
          <View style={[styles.boostCallout, { backgroundColor: p.surface, borderLeftColor: p.primary }]}>
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
              <Path
                d="M12 13.5c0-4 2.6-7 6.5-7.5.4 3.9-1.7 7.6-6.5 7.5Z"
                stroke={p.primary}
                strokeWidth={1.8}
                strokeLinejoin="round"
              />
              <Path d="M12 21v-7.5M12 14c-.4-2.7-2-4.4-4.5-4.8" stroke={p.primary} strokeWidth={1.8} strokeLinecap="round" />
            </Svg>
            <Text style={[styles.boostText, { color: p.text }]}>{boost}</Text>
          </View>
        )}

        <Pressable
          onPress={() => router.back()}
          style={[styles.primaryButton, { backgroundColor: p.primary }]}
        >
          <Text style={styles.primaryButtonText}>Back to today</Text>
        </Pressable>
        <Pressable onPress={swap} style={styles.swapLink}>
          <Text style={[styles.swapLinkText, { color: p.primary }]}>Swap this meal</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.h3,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  swapBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  swapBannerText: {
    fontFamily: fonts.body,
    fontSize: typeScale.bodySmall,
  },
  swapBannerUndo: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.bodySmall,
  },
  iconBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  mealName: {
    fontFamily: fonts.bodyBold,
    fontSize: typeScale.h1,
  },
  mealMeta: {
    fontFamily: fonts.body,
    fontSize: typeScale.bodySmall,
    marginTop: spacing.xs,
  },
  allergenChip: {
    alignSelf: "flex-start",
    borderRadius: radius.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  allergenChipText: {
    fontFamily: fonts.body,
    fontSize: typeScale.caption,
  },
  section: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sectionTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.h3,
    marginBottom: spacing.xs,
  },
  sectionBody: {
    fontFamily: fonts.body,
    fontSize: typeScale.bodySmall,
    lineHeight: typeScale.bodySmall * 1.6,
  },
  stackedLine: {
    marginTop: spacing.xs,
  },
  disclosureHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  disclosureTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.h3,
  },
  disclosureBody: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  boostCallout: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    borderRadius: radius.md,
    borderLeftWidth: 3,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  boostText: {
    flex: 1,
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.bodySmall,
    lineHeight: typeScale.bodySmall * 1.5,
  },
  primaryButton: {
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginTop: spacing.xl,
  },
  primaryButtonText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.bodySmall,
    color: "#FFFDFC",
  },
  swapLink: {
    alignItems: "center",
    marginTop: spacing.md,
  },
  swapLinkText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.bodySmall,
    textDecorationLine: "underline",
  },
});
