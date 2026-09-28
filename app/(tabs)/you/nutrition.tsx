import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { ExpertReviewBanner } from "../../../components/ExpertReviewBanner";
import { MealSlotIcon } from "../../../components/MealSlotIcon";
import { Card, CareNote } from "../../../components/parentUI";
import { useAuth } from "../../../lib/AuthProvider";
import { computeAge, youngestChild } from "../../../lib/childAge";
import * as family from "../../../lib/db/family";
import * as familyMeals from "../../../lib/db/familyMeals";
import type { FamilyMealSlot } from "../../../lib/db/familyMeals";
import type { FamilyMeal } from "../../../lib/db/types";
import { usePalette } from "../../../lib/ModeProvider";
import { deriveProfile, type DietaryPreference } from "../../../lib/parentCare";
import { isRecoveryRelevant } from "../../../lib/recoveryRelevance";
import { fonts, radius, spacing, typeScale } from "../../../lib/theme";

/**
 * Family Meals -- one whole-family meal plan, sourced from the v11 Meal
 * Planner workbook, for everyone at the table.
 *
 * STILL PENDING RD/PAEDIATRICIAN SIGN-OFF -- see ExpertReviewBanner and
 * supabase/migrations/20260910090000_family_meal_planner.sql.
 *
 * Colour is reserved for actionable things only -- "View meal", "Swap",
 * the primary button, the diet-preference options -- everything else
 * (the slot icon badges, the allergen chip, section labels) is plain
 * neutral gray. That split (not "one accent color everywhere") is what
 * actually keeps this calm rather than just quieter.
 *
 * Allergens show on a meal's own detail screen only, not on this list --
 * the top pill here is purely the household's diet type (veg/non-veg/
 * eggetarian/vegan), asked once on first visit if never answered (see
 * needsDietConfirmation below), never assumed silently.
 */
const DIET_LABEL: Record<DietaryPreference, string> = {
  omnivore: "Non-vegetarian",
  vegetarian: "Vegetarian",
  eggetarian: "Eggetarian",
  vegan: "Vegan",
};

const DIET_OPTIONS: { value: DietaryPreference; label: string }[] = [
  { value: "vegetarian", label: "Vegetarian" },
  { value: "omnivore", label: "Non-vegetarian" },
  { value: "eggetarian", label: "Eggetarian" },
  { value: "vegan", label: "Vegan" },
];

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function FamilyMealsScreen() {
  const p = usePalette();
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ from?: string }>();
  const { session, children, profile: authProfile, refreshFamily } = useAuth();
  const [allMeals, setAllMeals] = useState<FamilyMeal[] | null>(null);
  const [openDayBalancing, setOpenDayBalancing] = useState(false);
  const [view, setView] = useState<"today" | "week">("today");
  const [savingDiet, setSavingDiet] = useState(false);
  const [editingDiet, setEditingDiet] = useState(false);
  // The swap-override store (lib/db/familyMeals.ts) is a plain module Map,
  // not React state -- this counter's only job is to force a re-render
  // after a Swap tap changes it, since bumping it is cheaper than lifting
  // the whole store into context for something this local.
  const [swapVersion, setSwapVersion] = useState(0);

  // The meal detail screen (you/meal.tsx) can swap a slot via the same
  // module-level override store this screen reads -- but it's a separate
  // screen instance, kept mounted by the stack navigator rather than
  // remounted on back, so nothing here re-renders on its own when that
  // happens. Re-checking on focus (not just on mount) is what actually
  // picks up a swap made there and shows it here too.
  useFocusEffect(
    useCallback(() => {
      setSwapVersion((v) => v + 1);
    }, [])
  );

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

  // Never answered vs. explicitly "no restrictions" -- deriveProfile falls
  // back to "vegetarian" silently for either, which is right for existing
  // accounts (preserves what they already see) but wrong for a brand new
  // one, who should be asked once rather than have a diet assumed for
  // them. Same pattern as needsBirthConfirmation elsewhere in You.
  const needsDietConfirmation = authProfile?.diet == null;

  const chooseDiet = async (value: DietaryPreference) => {
    const userId = session?.user?.id;
    if (!userId) return;
    setSavingDiet(true);
    try {
      await family.updateProfile(userId, { diet: value });
      await refreshFamily();
      setEditingDiet(false);
    } finally {
      setSavingDiet(false);
    }
  };

  const today = new Date();
  const dayIndex = Math.floor(today.getTime() / 86_400_000);

  const slotPicks = useMemo(() => {
    if (!allMeals) return [];
    return familyMeals.FAMILY_MEAL_SLOTS.map((slot) => {
      const pool = familyMeals.mealsForSlot(allMeals, slot.key, ageStage, profile.diet, allergies);
      const overrideId = familyMeals.getSwapOverride(slot.key);
      const meal = (overrideId && pool.find((m) => m.id === overrideId)) || familyMeals.pickForDay(pool, dayIndex);
      return { slot, meal, pool };
      // swapVersion is read only to force this to recompute after a swap;
      // the override store itself lives outside React state.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }).filter((entry) => entry.meal);
  }, [allMeals, ageStage, profile.diet, allergies, dayIndex, swapVersion]);

  const todaysMeals = slotPicks.map((entry) => entry.meal!).filter(Boolean);
  const opportunities = useMemo(
    () => familyMeals.dayBalancingOpportunities(todaysMeals, profile.diet),
    [todaysMeals, profile.diet]
  );

  const weekPreview = useMemo(() => {
    if (!allMeals || view !== "week") return [];
    return Array.from({ length: 7 }, (_, offset) => {
      const date = new Date(today);
      date.setDate(date.getDate() + offset);
      const di = dayIndex + offset;
      const meals = familyMeals.FAMILY_MEAL_SLOTS.map((slot) => {
        const pool = familyMeals.mealsForSlot(allMeals, slot.key, ageStage, profile.diet, allergies);
        return familyMeals.pickForDay(pool, di);
      }).filter((m): m is FamilyMeal => !!m);
      return { date, meals };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    });
  }, [allMeals, view, ageStage, profile.diet, allergies, dayIndex]);

  const swap = (slot: FamilyMealSlot, pool: FamilyMeal[], currentMealId: string) => {
    if (pool.length < 2) return;
    const currentIndex = pool.findIndex((m) => m.id === currentMealId);
    const next = pool[(currentIndex + 1) % pool.length];
    if (!next) return;
    familyMeals.setSwapOverride(slot, next.id);
    setSwapVersion((v) => v + 1);
  };

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

      <Text style={[styles.pageLabel, { color: p.text }]}>Family meals</Text>
      <Text style={[styles.headline, { color: p.text }]}>Today, for the family</Text>
      <Text style={[styles.dateLine, { color: p.textMuted }]}>
        {DAY_NAMES[today.getDay()]}, {today.toLocaleDateString("en-US", { day: "numeric", month: "long" })}
      </Text>

      {needsDietConfirmation || editingDiet ? (
        <Card style={styles.dietCard}>
          <Text style={[styles.dietCardTitle, { color: p.text }]}>What does your family eat?</Text>
          <Text style={[styles.dietCardBody, { color: p.textMuted }]}>
            So the meals below actually fit your table.
          </Text>
          <View style={styles.dietOptionRow}>
            {DIET_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                disabled={savingDiet}
                onPress={() => chooseDiet(option.value)}
                style={[
                  styles.dietOption,
                  { borderColor: p.border },
                  profile.diet === option.value && { backgroundColor: p.primary, borderColor: p.primary },
                ]}
              >
                <Text
                  style={[
                    styles.dietOptionLabel,
                    { color: profile.diet === option.value ? "#FFFDFC" : p.text },
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
          {savingDiet && <ActivityIndicator style={{ marginTop: spacing.sm }} />}
        </Card>
      ) : (
        <View style={styles.dietRow}>
          <View style={[styles.dietPill, { backgroundColor: p.surfaceAlt }]}>
            <Text style={[styles.dietPillText, { color: p.text }]}>{DIET_LABEL[profile.diet]}</Text>
          </View>
          <Pressable onPress={() => setEditingDiet(true)} hitSlop={8}>
            <Text style={[styles.preferencesLink, { color: p.text }]}>Preferences</Text>
          </Pressable>
        </View>
      )}

      {!ageStage && recoveryChild && (
        <View style={[styles.milkNote, { backgroundColor: p.surfaceAlt }]}>
          <Text style={[styles.milkNoteText, { color: p.text }]}>
            {recoveryChild.name} is still fully milk-fed — this menu is for the rest of the family.
          </Text>
        </View>
      )}

      <View style={[styles.toggleRow, { backgroundColor: p.surface }]}>
        <Pressable
          onPress={() => setView("today")}
          style={[styles.toggleOption, view === "today" && { backgroundColor: p.primary }]}
        >
          <Text style={[styles.toggleLabel, { color: view === "today" ? "#FFFDFC" : p.textMuted }]}>
            Today
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setView("week")}
          style={[styles.toggleOption, view === "week" && { backgroundColor: p.primary }]}
        >
          <Text style={[styles.toggleLabel, { color: view === "week" ? "#FFFDFC" : p.textMuted }]}>
            This week
          </Text>
        </Pressable>
      </View>

      {view === "today" ? (
        <View style={styles.block}>
          {slotPicks.map(({ slot, meal, pool }) => {
            const boost = isFather
              ? familyMeals.partnerBoostFor(meal!, profile.diet)
              : familyMeals.motherBoostFor(meal!, profile.diet);
            return (
            <View key={slot.key}>
              <Text style={[styles.slotLabel, { color: p.textMuted }]}>{slot.label.toUpperCase()}</Text>
              <Card
                style={styles.mealRow}
                onPress={() => router.push(`/you/meal?mealId=${meal!.id}&slot=${slot.key}`)}
              >
                <View style={styles.mealRowInner}>
                  <View style={[styles.iconBadge, { backgroundColor: p.surfaceAlt }]}>
                    <MealSlotIcon slot={slot.key} color={p.textMuted} size={20} />
                  </View>
                  <View style={styles.mealRowText}>
                    <Text style={[styles.mealTitle, { color: p.text }]}>{meal!.name}</Text>
                    {meal!.total_minutes != null && (
                      <Text style={[styles.mealMinutes, { color: p.textMuted }]}>
                        {meal!.total_minutes} min
                      </Text>
                    )}
                    {/* Embedded here, not tucked behind "View meal" -- this
                        is an actionable line (add this, boost that) for
                        whoever's cooking, so it shouldn't need a second
                        tap to surface. Restored after it was dropped
                        during the icon-first redesign. */}
                    {boost && (
                      <Text style={[styles.mealBoost, { color: p.primary }]}>{boost}</Text>
                    )}
                    <View style={styles.actionsRow}>
                      <Text style={[styles.actionText, { color: p.primary }]}>View meal →</Text>
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation();
                          swap(slot.key, pool, meal!.id);
                        }}
                        hitSlop={6}
                        style={styles.swapButton}
                      >
                        <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
                          <Path
                            d="M17 2.1 21 6l-4 3.9M3 12v-2a4 4 0 0 1 4-4h14M7 21.9 3 18l4-3.9M21 12v2a4 4 0 0 1-4 4H3"
                            stroke={p.primary}
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </Svg>
                        <Text style={[styles.actionText, { color: p.primary }]}>Swap</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              </Card>
            </View>
            );
          })}
        </View>
      ) : (
        <View style={styles.block}>
          {weekPreview.map(({ date, meals }) => (
            <View key={date.toDateString()} style={styles.weekDayRow}>
              <Text style={[styles.weekDayLabel, { color: p.text }]}>
                {date.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" })}
              </Text>
              <Text style={[styles.weekDayMeals, { color: p.textMuted }]}>
                {meals.map((m) => m.name).join(" · ")}
              </Text>
            </View>
          ))}
        </View>
      )}

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
    </ScrollView>
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
  pageLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.body,
  },
  headline: {
    fontFamily: fonts.bodyBold,
    fontSize: typeScale.h1,
    marginTop: spacing.sm,
  },
  dateLine: {
    fontFamily: fonts.body,
    fontSize: typeScale.bodySmall,
    marginTop: 2,
  },
  dietRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.md,
  },
  dietPill: {
    borderRadius: radius.pill,
    paddingVertical: 5,
    paddingHorizontal: spacing.md,
  },
  dietPillText: {
    fontFamily: fonts.body,
    fontSize: typeScale.bodySmall,
  },
  preferencesLink: {
    fontFamily: fonts.bodyMedium,
    fontSize: typeScale.bodySmall,
  },
  dietCard: {
    marginTop: spacing.md,
    padding: spacing.lg,
  },
  dietCardTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.h3,
  },
  dietCardBody: {
    fontFamily: fonts.body,
    fontSize: typeScale.bodySmall,
    marginTop: spacing.xs,
  },
  dietOptionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  dietOption: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  dietOptionLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: typeScale.bodySmall,
  },
  milkNote: {
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  milkNoteText: {
    fontFamily: fonts.body,
    fontSize: typeScale.caption,
    lineHeight: typeScale.caption * 1.5,
  },
  toggleRow: {
    flexDirection: "row",
    borderRadius: radius.md,
    padding: 3,
    marginTop: spacing.lg,
  },
  toggleOption: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  toggleLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.bodySmall,
  },
  block: {
    marginTop: spacing.lg,
  },
  slotLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.caption,
    letterSpacing: 1.2,
    marginBottom: spacing.xs,
  },
  mealRow: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  mealRowInner: {
    flexDirection: "row",
    gap: spacing.md,
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  mealRowText: {
    flex: 1,
  },
  mealTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.body,
  },
  mealMinutes: {
    fontFamily: fonts.body,
    fontSize: typeScale.caption,
    marginTop: 2,
  },
  mealBoost: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.caption,
    lineHeight: typeScale.caption * 1.5,
    marginTop: spacing.xs,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.sm,
  },
  swapButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  actionText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.caption,
  },
  weekDayRow: {
    marginBottom: spacing.md,
  },
  weekDayLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.bodySmall,
  },
  weekDayMeals: {
    fontFamily: fonts.body,
    fontSize: typeScale.caption,
    marginTop: 2,
    lineHeight: typeScale.caption * 1.5,
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
});
