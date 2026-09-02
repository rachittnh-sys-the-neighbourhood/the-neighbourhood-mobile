import { useMemo, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { BuildingBanner } from "../../../components/BuildingBanner";
import { Card, CareNote, Chip, PageHeading, SectionLabel } from "../../../components/parentUI";
import { useAuth } from "../../../lib/AuthProvider";
import { developmentalAgeMonths } from "../../../lib/childAge";
import { formatAllergies, matchedAllergen, parseAllergies } from "../../../lib/childAllergies";
import * as family from "../../../lib/db/family";
import {
  MEAL_SLOTS,
  STAGE_HEADLINE,
  STAGE_LABEL,
  groceriesForStage,
  mealsFor,
  nextStage,
  nutrientsForStage,
  slotsForStage,
  stageDescription,
  stageForAgeMonths,
  tipsForStage,
  type KidMeal,
} from "../../../lib/kidMealPlanner";
import { usePalette } from "../../../lib/ModeProvider";
import { fonts, spacing, typeScale } from "../../../lib/theme";

/**
 * The Kid Meal Planner.
 *
 * Same organising idea as app/parent/nutrition.tsx — a day read top to
 * bottom rather than a database — because the brief for that screen (not
 * a calorie ledger, not a percentage chased to 100%) applies just as much
 * to a toddler's plate as a postpartum parent's. What's different is the
 * axis: nutrition.tsx personalises to weeks postpartum, this personalises
 * to feeding stage — first solids, textures, finger foods, family meals.
 *
 * 0–6 months genuinely has no meal timeline (milk is the whole diet), so
 * that stage renders as a short standalone explainer instead of an empty
 * "Today" section pretending there's a plan to show.
 */
export default function MealPlanner() {
  const p = usePalette();
  const { child, profile: authProfile, refreshFamily } = useAuth();
  const [openNutrients, setOpenNutrients] = useState(false);
  const [openGroceries, setOpenGroceries] = useState(false);
  const [openTips, setOpenTips] = useState(false);
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null);

  // Solids readiness follows corrected age, not the calendar — a baby born
  // at 32 weeks is ready for first foods around six months corrected. See
  // lib/childAge.ts developmentalAge.
  const ageMonths = developmentalAgeMonths(child);
  const stage = useMemo(() => stageForAgeMonths(ageMonths), [ageMonths]);
  const nutrients = useMemo(() => nutrientsForStage(stage), [stage]);
  const groceries = useMemo(() => groceriesForStage(stage), [stage]);
  const tips = useMemo(() => tipsForStage(stage), [stage]);
  const slots = useMemo(() => slotsForStage(stage), [stage]);
  const upcoming = nextStage(stage);

  const hasTimeline = stage !== "m0_6";

  // --- The child's allergens -------------------------------------------
  // Asked here rather than in onboarding: it's free text (the heaviest
  // input there is), it's empty for most children, and nothing before this
  // screen needs it. Not a dismissible prompt either — a quiet row that
  // reads as an invitation when empty and a status when filled, so it
  // never nags and never disappears when the answer changes.
  const allergies = child?.allergies ?? [];
  const allergyKey = allergies.join(",");
  const [editingAllergies, setEditingAllergies] = useState(false);
  const [allergyDraft, setAllergyDraft] = useState("");
  const [savingAllergies, setSavingAllergies] = useState(false);

  const beginEditAllergies = () => {
    setAllergyDraft(formatAllergies(allergies));
    setEditingAllergies(true);
  };

  const saveAllergies = async () => {
    if (!child) return;
    setSavingAllergies(true);
    try {
      await family.updateChild(child.id, { allergies: parseAllergies(allergyDraft) });
      await refreshFamily();
      setEditingAllergies(false);
    } catch {
      // Leave the editor open with their text intact — silently closing
      // would look like it saved.
    } finally {
      setSavingAllergies(false);
    }
  };

  // Meals are filtered, not merely flagged: an allergen listed here should
  // not be a thing the parent has to notice in an ingredient list.
  const { slotMeals, hiddenCount } = useMemo(() => {
    let hidden = 0;
    const bySlot = slots.map((slot) => {
      const options = mealsFor(stage, slot.key).filter((meal) => {
        const hit = matchedAllergen(meal.ingredients, allergies);
        if (hit) hidden += 1;
        return !hit;
      });
      return { slot, options };
    });
    return { slotMeals: bySlot, hiddenCount: hidden };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots, stage, allergyKey]);

  const safeGroceries = useMemo(
    () => groceries.filter((item) => !matchedAllergen([item], allergies)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [groceries, allergyKey]
  );

  return (
    <ScrollView
      style={{ backgroundColor: p.bg }}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <BuildingBanner />

      <PageHeading
        eyebrow="Meal planner"
        title={STAGE_HEADLINE[stage]}
        body={stageDescription(stage, authProfile?.feeding_method ?? null)}
      />

      <View style={styles.chips}>
        <Chip label={STAGE_LABEL[stage]} tone="accent" />
        {upcoming && <Chip label={`Next: ${STAGE_LABEL[upcoming]}`} />}
      </View>

      {hasTimeline && (
        <View style={styles.block}>
          <AllergyRow
            allergies={allergies}
            childName={child?.name ?? "your child"}
            editing={editingAllergies}
            draft={allergyDraft}
            saving={savingAllergies}
            onDraftChange={setAllergyDraft}
            onBeginEdit={beginEditAllergies}
            onCancel={() => setEditingAllergies(false)}
            onSave={saveAllergies}
          />
        </View>
      )}

      {hasTimeline ? (
        <View style={styles.block}>
          <SectionLabel>Today</SectionLabel>
          {slotMeals.map(({ slot, options }) => {
            if (options.length === 0) return null;
            const meal = options[0];
            const alternative = options[1];
            return (
              <View key={slot.key} style={styles.slot}>
                <View style={styles.slotRail}>
                  <View style={[styles.slotDot, { backgroundColor: p.surface, borderColor: p.border }]} />
                  <View style={[styles.slotLine, { backgroundColor: p.border }]} />
                </View>

                <View style={styles.slotBody}>
                  <Text style={[styles.slotWindow, { color: p.textMuted }]}>
                    {slot.window.toUpperCase()}
                  </Text>
                  <MealCard
                    meal={meal}
                    expanded={expandedMeal === meal.id}
                    onToggle={() => setExpandedMeal(expandedMeal === meal.id ? null : meal.id)}
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

          {hiddenCount > 0 && (
            <Text style={[styles.hiddenNote, { color: p.textMuted }]}>
              {hiddenCount} {hiddenCount === 1 ? "idea is" : "ideas are"} hidden because of the
              allergens you listed.
            </Text>
          )}
        </View>
      ) : (
        <View style={styles.block}>
          <Card>
            <Text style={[styles.discTitle, { color: p.text }]}>No timeline yet, and that's right</Text>
            <Text style={[styles.discHint, { color: p.textMuted, marginTop: spacing.xs }]}>
              There's nothing to plan around meals for a while yet. This screen will fill in with a
              real "Today" once first solids are close, around six months.
            </Text>
          </Card>
        </View>
      )}

      {/* Nutrients, folded away — same disclosure pattern as Nutrition,
          but no current/target number: nobody is tracking a baby's actual
          intake, so a fabricated fraction would read as a real measurement. */}
      <View style={styles.block}>
        <Card onPress={() => setOpenNutrients((v) => !v)} style={openNutrients ? styles.discOpen : undefined}>
          <View style={styles.rowBetween}>
            <Text style={[styles.discTitle, { color: p.text }]}>What matters most right now</Text>
            <Text style={[styles.discToggle, { color: p.primary }]}>
              {openNutrients ? "Hide" : "Show"}
            </Text>
          </View>
          {!openNutrients && (
            <Text style={[styles.discHint, { color: p.textMuted }]}>
              {nutrients.length} nutrients that matter more at this stage.
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
                  index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: p.border },
                ]}
              >
                <Text style={[styles.nutrientLabel, { color: p.text }]}>{n.label}</Text>
                <Text style={[styles.nutrientWhy, { color: p.textMuted }]}>{n.why}</Text>
                <View style={styles.sourceRow}>
                  {n.sources.map((s) => (
                    <View key={s} style={[styles.sourcePill, { backgroundColor: p.surfaceAlt }]}>
                      <Text style={[styles.sourceText, { color: p.textMuted }]}>{s}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
            <CareNote>
              General guidance, not a prescription. We leave out anything matching the allergens
              you&rsquo;ve listed, but your paediatrician knows {child?.name ?? "your child"}
              &rsquo;s full history and this doesn&rsquo;t. Check with them before introducing a
              known allergen.
            </CareNote>
          </Card>
        )}
      </View>

      {/* Feeding tips, folded away. */}
      <View style={styles.block}>
        <Card onPress={() => setOpenTips((v) => !v)} style={openTips ? styles.discOpen : undefined}>
          <View style={styles.rowBetween}>
            <Text style={[styles.discTitle, { color: p.text }]}>Tips for this stage</Text>
            <Text style={[styles.discToggle, { color: p.primary }]}>{openTips ? "Hide" : "Show"}</Text>
          </View>
          {!openTips && (
            <Text style={[styles.discHint, { color: p.textMuted }]}>
              Feeding and safety guidance beyond what's on the plate.
            </Text>
          )}
        </Card>

        {openTips && (
          <Card style={styles.nutrientCard}>
            {tips.map((tip, index) => (
              <View
                key={tip.title}
                style={[
                  styles.nutrient,
                  index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: p.border },
                ]}
              >
                <Text style={[styles.nutrientLabel, { color: p.text }]}>{tip.title}</Text>
                <Text style={[styles.nutrientWhy, { color: p.textMuted }]}>{tip.body}</Text>
              </View>
            ))}
          </Card>
        )}
      </View>

      {hasTimeline && (
        <View style={styles.block}>
          <Card onPress={() => setOpenGroceries((v) => !v)}>
            <View style={styles.rowBetween}>
              <Text style={[styles.discTitle, { color: p.text }]}>What to have in</Text>
              <Text style={[styles.discToggle, { color: p.primary }]}>
                {openGroceries ? "Hide" : `${safeGroceries.length} things`}
              </Text>
            </View>
            {openGroceries && (
              <View style={styles.groceryList}>
                {safeGroceries.map((item) => (
                  <View key={item} style={styles.groceryRow}>
                    <View style={[styles.groceryDot, { backgroundColor: p.secondary }]} />
                    <Text style={[styles.groceryText, { color: p.textMuted }]}>{item}</Text>
                  </View>
                ))}
              </View>
            )}
          </Card>
        </View>
      )}
    </ScrollView>
  );
}

/**
 * The child's allergens, asked where they're actually used.
 *
 * Two states, no third: empty reads as an invitation, filled reads as a
 * status you can tap to change. There's deliberately no dismiss — a
 * "hide this forever" on an allergy question is exactly the wrong thing
 * to offer, and a row this quiet doesn't need one.
 */
function AllergyRow({
  allergies,
  childName,
  editing,
  draft,
  saving,
  onDraftChange,
  onBeginEdit,
  onCancel,
  onSave,
}: {
  allergies: string[];
  childName: string;
  editing: boolean;
  draft: string;
  saving: boolean;
  onDraftChange: (t: string) => void;
  onBeginEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const p = usePalette();
  const name = childName.trim().split(" ")[0] || "your child";

  if (editing) {
    return (
      <Card>
        <Text style={[styles.discTitle, { color: p.text }]}>Anything to leave out?</Text>
        <TextInput
          value={draft}
          onChangeText={onDraftChange}
          placeholder="e.g. peanut, egg, dairy"
          placeholderTextColor={p.textMuted}
          autoCapitalize="none"
          autoFocus
          editable={!saving}
          style={[
            styles.allergyInput,
            { color: p.text, borderBottomColor: p.border },
            // RN web draws its own focus ring, which fights the hairline.
            Platform.OS === "web" && ({ outlineStyle: "none" } as any),
          ]}
          onSubmitEditing={onSave}
          returnKeyType="done"
        />
        <Text style={[styles.discHint, { color: p.textMuted }]}>
          Separate with commas. Meals containing these are left out.
        </Text>
        <View style={styles.allergyActions}>
          <Pressable onPress={onCancel} hitSlop={8} disabled={saving}>
            <Text style={[styles.allergyAction, { color: p.textMuted }]}>Cancel</Text>
          </Pressable>
          <Pressable onPress={onSave} hitSlop={8} disabled={saving}>
            <Text style={[styles.allergyAction, { color: p.primary }]}>
              {saving ? "Saving…" : "Save"}
            </Text>
          </Pressable>
        </View>
      </Card>
    );
  }

  return (
    <Card onPress={onBeginEdit}>
      <View style={styles.rowBetween}>
        <Text style={[styles.discTitle, { color: p.text }]}>
          {allergies.length ? "Left out of these plans" : "Anything to leave out?"}
        </Text>
        <Text style={[styles.discToggle, { color: p.primary }]}>
          {allergies.length ? "Edit" : "Add"}
        </Text>
      </View>
      <Text style={[styles.discHint, { color: p.textMuted }]}>
        {allergies.length
          ? allergies.join(", ")
          : `Tell us ${name}'s allergies and we'll keep them off the plan.`}
      </Text>
    </Card>
  );
}

function MealCard({
  meal,
  expanded,
  onToggle,
}: {
  meal: KidMeal;
  expanded: boolean;
  onToggle: () => void;
}) {
  const p = usePalette();
  return (
    <Card onPress={onToggle}>
      <View style={styles.rowBetween}>
        <Text style={[styles.mealTitle, { color: p.text }]}>{meal.title}</Text>
      </View>
      <Text style={[styles.mealBlurb, { color: p.textMuted }]}>{meal.blurb}</Text>

      <View style={styles.mealMeta}>
        <Text style={[styles.mealMinutes, { color: p.primary }]}>{meal.minutes} min</Text>
        <Text style={[styles.mealFlag, { color: p.textMuted }]}>· {meal.texture}</Text>
      </View>

      {expanded && (
        <View style={styles.recipe}>
          <Text style={[styles.recipeHeading, { color: p.text }]}>What you need</Text>
          {meal.ingredients.map((i) => (
            <Text key={i} style={[styles.recipeItem, { color: p.textMuted }]}>
              {i}
            </Text>
          ))}
          <Text style={[styles.recipeHeading, { color: p.text, marginTop: spacing.md }]}>How</Text>
          {meal.steps.map((step, index) => (
            <View key={step} style={styles.stepRow}>
              <Text style={[styles.stepNumber, { color: p.secondary }]}>{index + 1}</Text>
              <Text style={[styles.stepText, { color: p.textMuted }]}>{step}</Text>
            </View>
          ))}
          {meal.safetyNote && (
            <View style={[styles.safetyNote, { borderColor: p.border }]}>
              <Text style={[styles.safetyText, { color: p.textMuted }]}>{meal.safetyNote}</Text>
            </View>
          )}
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
  safetyNote: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  safetyText: {
    fontFamily: fonts.bodyMedium,
    fontSize: typeScale.caption,
    lineHeight: typeScale.caption * 1.5,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  hiddenNote: {
    fontFamily: fonts.body,
    fontSize: typeScale.caption,
    lineHeight: typeScale.caption * 1.55,
    marginTop: spacing.xs,
  },
  allergyInput: {
    fontFamily: fonts.bodyMedium,
    fontSize: typeScale.body,
    borderBottomWidth: 1,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  allergyActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.lg,
    marginTop: spacing.md,
  },
  allergyAction: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.bodySmall,
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
  nutrientWhy: {
    fontFamily: fonts.body,
    fontSize: typeScale.caption,
    lineHeight: typeScale.caption * 1.6,
    marginTop: spacing.xs,
  },
  sourceRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: spacing.sm,
  },
  sourcePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  sourceText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
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
