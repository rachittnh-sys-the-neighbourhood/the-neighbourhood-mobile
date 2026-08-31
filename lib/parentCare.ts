/**
 * The parent-side domain model: who the parent is right now, what their body
 * needs at this stage, and what the day looks like.
 *
 * LOCAL ONLY. There is no parent table yet, so this is typed demo data with
 * real clinical shape rather than a fake network layer. Everything a screen
 * needs goes through the selector functions at the bottom, so swapping in
 * Supabase later is a change to this file and nothing else.
 *
 * Editorial rule that governs every string here: describe, never grade. No
 * "you missed", no "you're behind", no percentages presented as scores. A
 * parent reading this at 3am should feel accompanied, not audited.
 */

import { isRecoveryRelevant } from "./recoveryRelevance";

/**
 * Which parent this is, for the purpose of what content applies to them.
 * Sourced from `profiles.relationship` — see lib/AuthProvider.tsx — the
 * one place this fact is asked (main onboarding) and stored.
 */
export type ParentRole = "mother" | "father" | "prefer_not_to_say";

export type PostpartumStage =
  | "pregnancy"
  | "fourth_trimester" // 0–12 weeks
  | "recovering" // 3–6 months
  | "established"; // 6 months+

export type DeliveryType = "vaginal" | "caesarean" | "prefer_not_to_say";
export type FeedingMethod =
  | "breastfeeding"
  | "exclusive"
  | "combination"
  | "mixed"
  | "formula"
  | "prefer_not_to_say";
export type DietaryPreference = "omnivore" | "vegetarian" | "vegan";

export type ParentProfile = {
  weeksPostpartum: number;
  stage: PostpartumStage;
  role: ParentRole;
  delivery: DeliveryType;
  feeding: FeedingMethod;
  diet: DietaryPreference;
  /** Free-text allergens, matched case-insensitively against ingredients. */
  allergies: string[];
};

/**
 * "two weeks" / "six months" — the phrasing used mid-sentence when telling a
 * parent what's ordinary for where they are. Spelled out rather than
 * numeric, because "at 6 months" reads like a chart and "at six months"
 * reads like a person talking.
 */
const SPELLED = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
];

export function elapsedPhrase(weeks: number): string {
  if (weeks < 1) return "the first days";
  if (weeks < 9) {
    const w = Math.max(1, Math.round(weeks));
    return `${SPELLED[w] ?? w} week${w === 1 ? "" : "s"}`;
  }
  const months = Math.round(weeks / 4.345);
  if (months >= 12) {
    const years = Math.floor(months / 12);
    return `${SPELLED[years] ?? years} year${years === 1 ? "" : "s"}`;
  }
  return `${SPELLED[months] ?? months} months`;
}

/** "a caesarean" / "a vaginal birth" / "your delivery" — how to name the event in a sentence. */
export function deliveryPhrase(delivery: DeliveryType): string {
  if (delivery === "caesarean") return "a caesarean";
  if (delivery === "vaginal") return "a vaginal birth";
  return "your delivery";
}

export function stageFromWeeks(weeks: number): PostpartumStage {
  if (weeks < 0) return "pregnancy";
  if (weeks <= 12) return "fourth_trimester";
  if (weeks <= 26) return "recovering";
  return "established";
}

export const STAGE_LABEL: Record<PostpartumStage, string> = {
  pregnancy: "Pregnancy",
  fourth_trimester: "Fourth trimester",
  recovering: "Recovering",
  established: "Finding your rhythm",
};

/** The parent facts this file needs, exactly as stored on `profiles` — see
 *  lib/AuthProvider.tsx's `profile` field. Raw strings rather than the
 *  union types below because that's what comes back from the database;
 *  anything unrecognized (including null/undefined, i.e. not answered
 *  yet) falls back to "prefer_not_to_say" in deriveProfile. */
export type ProfileInput = {
  relationship?: string | null;
  birth_method?: string | null;
  feeding_method?: string | null;
  diet?: string | null;
  allergies?: string[] | null;
};

/**
 * Builds a ParentProfile from the child's age and, when available, the
 * parent's own profile facts (role, birth method, feeding method — asked
 * once during main onboarding, see lib/AuthProvider.tsx). Without them the
 * defaults are deliberately neutral ("prefer_not_to_say") so no screen ever
 * makes a wrong assumption.
 *
 * Postpartum weeks are always derived from the child's date of birth — the
 * one source of truth for age everywhere in the app — never from a
 * separately-entered delivery date.
 */
export function deriveProfile(
  childAgeMonths: number,
  input?: ProfileInput | null,
): ParentProfile {
  const weeks = Math.round(childAgeMonths * 4.345);

  let delivery: DeliveryType = "prefer_not_to_say";
  if (input?.birth_method === "vaginal") delivery = "vaginal";
  else if (input?.birth_method === "caesarean") delivery = "caesarean";

  let feeding: FeedingMethod = "prefer_not_to_say";
  if (input?.feeding_method === "exclusive") feeding = "exclusive";
  else if (input?.feeding_method === "combination") feeding = "combination";
  else if (input?.feeding_method === "formula") feeding = "formula";

  // Same "neutral default" rule as delivery/feeding above: nobody has
  // answered yet, or chose not to, gets the value that makes no assumption
  // — which for role means content stays exactly as it always has, rather
  // than a blank answer being read as "father" and hiding recovery content
  // from someone who simply hasn't been asked yet.
  const role: ParentRole =
    input?.relationship === "mother" || input?.relationship === "father"
      ? input.relationship
      : "prefer_not_to_say";

  // "vegetarian" is the fallback for anyone who hasn't answered yet —
  // preserves existing behaviour for every account created before this
  // question existed, rather than silently switching their meal plan.
  let diet: DietaryPreference = "vegetarian";
  if (input?.diet === "omnivore") diet = "omnivore";
  else if (input?.diet === "vegetarian") diet = "vegetarian";
  else if (input?.diet === "vegan") diet = "vegan";

  const allergies = (input?.allergies ?? []).map((a) => a.trim()).filter(Boolean);

  return {
    weeksPostpartum: weeks,
    stage: stageFromWeeks(weeks),
    role,
    delivery,
    feeding,
    diet,
    allergies,
  };
}

/* ------------------------------------------------------------------ */
/* Nutrition                                                           */
/* ------------------------------------------------------------------ */

export type NutrientKey =
  | "protein"
  | "iron"
  | "calcium"
  | "vitamin_d"
  | "omega_3"
  | "folate"
  | "fibre"
  | "hydration";

export type Nutrient = {
  key: NutrientKey;
  label: string;
  unit: string;
  target: number;
  /** How much today's logged meals cover. */
  current: number;
  /** One plain sentence on why this matters at this stage. */
  why: string;
};

/** A father's own basic nutrition — general adult targets, none of them
 *  postpartum or lactation guidance, since neither applies to him. */
function nutrientsForFather(): Nutrient[] {
  return [
    {
      key: "protein",
      label: "Protein",
      unit: "g",
      target: 56,
      current: 38,
      why: "Keeps your own energy steady through short nights too.",
    },
    {
      key: "iron",
      label: "Iron",
      unit: "mg",
      target: 8,
      current: 5,
      why: "Easy to run low on when meals get skipped in the rush.",
    },
    {
      key: "calcium",
      label: "Calcium",
      unit: "mg",
      target: 1000,
      current: 600,
      why: "Bone health doesn't pause just because life's busier.",
    },
    {
      key: "vitamin_d",
      label: "Vitamin D",
      unit: "IU",
      target: 400,
      current: 180,
      why: "Most people are low without noticing, worth keeping in the mix.",
    },
    {
      key: "omega_3",
      label: "Omega-3",
      unit: "mg",
      target: 300,
      current: 110,
      why: "Supports mood and focus when sleep is short for you as well.",
    },
    {
      key: "folate",
      label: "Folate",
      unit: "mcg",
      target: 400,
      current: 280,
      why: "Part of a basic balanced diet, not just a pregnancy nutrient.",
    },
    {
      key: "fibre",
      label: "Fibre",
      unit: "g",
      target: 28,
      current: 16,
      why: "Keeps digestion steady when routines are all over the place.",
    },
  ];
}

/**
 * Targets follow standard postpartum/lactation guidance, adjusted for feeding
 * method and diet. These are educational reference points, not prescriptions —
 * the UI says so wherever they appear. A father gets nutrientsForFather()
 * instead — his own basic nutrition, not postpartum/lactation targets.
 */
export function nutrientsFor(profile: ParentProfile): Nutrient[] {
  if (profile.role === "father") return nutrientsForFather();
  const lactating =
    profile.feeding !== "formula" && profile.feeding !== "prefer_not_to_say";
  const plant = profile.diet === "vegan";

  return [
    {
      key: "protein",
      label: "Protein",
      unit: "g",
      target: lactating ? 71 : 56,
      current: 44,
      why: "Rebuilds tissue and keeps energy steady through broken nights.",
    },
    {
      key: "iron",
      label: "Iron",
      unit: "mg",
      // Plant iron absorbs less readily, so the practical target is higher.
      target: plant ? 32 : lactating ? 9 : 18,
      current: 6,
      why: "Replaces what birth took, and lifts the fog that low iron causes.",
    },
    {
      key: "calcium",
      label: "Calcium",
      unit: "mg",
      target: 1000,
      current: 620,
      why: "Protects your own bone stores while you feed.",
    },
    {
      key: "vitamin_d",
      label: "Vitamin D",
      unit: "IU",
      target: lactating ? 600 : 400,
      current: 200,
      why: "Works with calcium, and most of us are low without noticing.",
    },
    {
      key: "omega_3",
      label: "Omega-3",
      unit: "mg",
      target: 300,
      current: 120,
      why: "Supports mood and your baby's brain if you're feeding.",
    },
    {
      key: "folate",
      label: "Folate",
      unit: "mcg",
      target: lactating ? 500 : 400,
      current: 310,
      why: "Keeps making the new cells recovery depends on.",
    },
    {
      key: "fibre",
      label: "Fibre",
      unit: "g",
      target: 28,
      current: 17,
      why: "Gently sorts out the digestion nobody warns you about.",
    },
  ];
}

export type MealSlot =
  | "breakfast"
  | "morning_snack"
  | "lunch"
  | "afternoon_snack"
  | "dinner";

export const MEAL_SLOTS: { key: MealSlot; label: string; window: string }[] = [
  { key: "breakfast", label: "Breakfast", window: "Morning" },
  { key: "morning_snack", label: "Something small", window: "Mid-morning" },
  { key: "lunch", label: "Lunch", window: "Midday" },
  { key: "afternoon_snack", label: "Something small", window: "Afternoon" },
  { key: "dinner", label: "Dinner", window: "Evening" },
];

export type Meal = {
  id: string;
  slot: MealSlot;
  title: string;
  blurb: string;
  minutes: number;
  /** Nutrients this meal meaningfully contributes. */
  delivers: NutrientKey[];
  ingredients: string[];
  steps: string[];
  diets: DietaryPreference[];
  /** True for meals you can assemble with one hand. */
  oneHanded: boolean;
  logged: boolean;
};

const MEALS: Meal[] = [
  {
    id: "m-oats",
    slot: "breakfast",
    title: "Warm oats, dates and almond butter",
    blurb: "Slow-release energy that holds through a cluster-feed morning.",
    minutes: 6,
    delivers: ["iron", "fibre", "calcium", "protein"],
    ingredients: [
      "Rolled oats",
      "Milk or fortified plant milk",
      "Medjool dates",
      "Almond butter",
      "Cinnamon",
    ],
    steps: [
      "Simmer oats in milk for four minutes.",
      "Stir through chopped dates until they soften.",
      "Top with almond butter and cinnamon.",
    ],
    diets: ["omnivore", "vegetarian", "vegan"],
    oneHanded: true,
    logged: true,
  },
  {
    id: "m-eggs",
    slot: "breakfast",
    title: "Akuri (spiced scrambled eggs) on buttered toast",
    blurb: "Protein and choline without standing at the hob for long.",
    minutes: 8,
    delivers: ["protein", "vitamin_d", "folate"],
    ingredients: ["Eggs", "Onion", "Tomato", "Green chilli", "Coriander", "Toast", "Butter"],
    steps: [
      "Sauté onion, tomato and chilli until soft.",
      "Add beaten eggs and scramble gently until just set.",
      "Spoon over buttered toast and scatter coriander.",
    ],
    diets: ["omnivore", "vegetarian"],
    oneHanded: false,
    logged: false,
  },
  {
    id: "m-lassi",
    slot: "morning_snack",
    title: "Salted yoghurt lassi",
    blurb: "Replaces the fluid feeding quietly takes. Drink it one-handed.",
    minutes: 2,
    delivers: ["hydration", "calcium", "protein"],
    ingredients: ["Yoghurt", "Cold water", "Salt", "Cumin", "Mint"],
    steps: ["Whisk everything until loose.", "Pour over ice."],
    diets: ["omnivore", "vegetarian"],
    oneHanded: true,
    logged: true,
  },
  {
    id: "m-dal",
    slot: "lunch",
    title: "Everyday dal with spinach and lemon",
    blurb: "Iron and folate in a bowl you can reheat all week.",
    minutes: 25,
    delivers: ["iron", "folate", "protein", "fibre"],
    ingredients: [
      "Red lentils",
      "Spinach",
      "Garlic",
      "Turmeric",
      "Cumin seeds",
      "Lemon",
    ],
    steps: [
      "Simmer lentils with turmeric until collapsing.",
      "Wilt spinach through at the end.",
      "Bloom cumin and garlic in ghee or oil, pour over.",
      "Finish with lemon, it helps the iron absorb.",
    ],
    diets: ["omnivore", "vegetarian", "vegan"],
    oneHanded: true,
    logged: false,
  },
  {
    id: "m-salmon",
    slot: "dinner",
    title: "Pan-seared fish with spiced potatoes and greens",
    blurb: "The most direct omega-3 there is, on one tray.",
    minutes: 30,
    delivers: ["omega_3", "protein", "vitamin_d"],
    ingredients: ["Pomfret or rawas fillets", "Potatoes", "Spinach", "Lemon", "Mustard oil"],
    steps: [
      "Roast potatoes with a little mustard oil and turmeric for twenty minutes.",
      "Pan-sear the fish, then wilt spinach in the same pan.",
      "Squeeze lemon over everything.",
    ],
    diets: ["omnivore"],
    oneHanded: false,
    logged: false,
  },
  {
    id: "m-tofu",
    slot: "dinner",
    title: "Sesame-tempered tofu with greens and brown rice",
    blurb: "Calcium-set tofu does the work dairy would.",
    minutes: 22,
    delivers: ["calcium", "protein", "iron", "fibre"],
    ingredients: [
      "Firm tofu",
      "Sesame seeds",
      "Mustard seeds",
      "Curry leaves",
      "Spinach",
      "Brown rice",
    ],
    steps: [
      "Crisp the tofu in a hot pan.",
      "Steam the greens over the rice for the last five minutes.",
      "Temper mustard seeds, curry leaves and sesame in oil, spoon over.",
    ],
    diets: ["omnivore", "vegetarian", "vegan"],
    oneHanded: false,
    logged: false,
  },
  {
    id: "m-trail",
    slot: "afternoon_snack",
    title: "Pumpkin seeds, walnuts and dried apricots",
    blurb: "Keep a jar wherever you feed. That's the whole recipe.",
    minutes: 1,
    delivers: ["iron", "omega_3", "fibre"],
    ingredients: ["Pumpkin seeds", "Walnuts", "Dried apricots"],
    steps: ["Combine in a jar.", "Leave it where you sit."],
    diets: ["omnivore", "vegetarian", "vegan"],
    oneHanded: true,
    logged: true,
  },
];

/**
 * A father's own Nutrition timeline — not a postpartum-recovery plan, since
 * none of that applies to him. Each slot covers one of: his own basic
 * nutrition, supporting the mother's nutrition, family meals, or supporting
 * feeding routines — same card shape as MEALS so the existing timeline UI
 * needs no changes.
 */
const FATHER_MEALS: Meal[] = [
  {
    id: "f-breakfast-own",
    slot: "breakfast",
    title: "A proper breakfast, for you too",
    blurb: "Whatever you make her, make yourself a plate. You're both running on broken sleep.",
    minutes: 8,
    delivers: ["protein", "fibre"],
    ingredients: ["Eggs", "Whole wheat toast", "Fruit"],
    steps: ["Fry or boil the eggs.", "Toast the bread.", "Sit down to eat it, even for five minutes."],
    diets: ["omnivore", "vegetarian", "vegan"],
    oneHanded: false,
    logged: false,
  },
  {
    id: "f-snack-support-mother",
    slot: "morning_snack",
    title: "Stock her one-handed snack basket",
    blurb: "A snack she can eat one-handed while feeding is easy to run out of. Keep it topped up.",
    minutes: 3,
    delivers: ["fibre", "hydration"],
    ingredients: ["Nuts", "Dates", "Cut fruit", "A full water bottle"],
    steps: [
      "Fill a small basket or box with grab-and-eat snacks.",
      "Top up the water bottle beside her.",
      "Leave it wherever she feeds most.",
    ],
    diets: ["omnivore", "vegetarian", "vegan"],
    oneHanded: false,
    logged: false,
  },
  {
    id: "f-lunch-family",
    slot: "lunch",
    title: "A lunch that works for everyone",
    blurb: "One pot, enough for the whole table. Including whoever's too tired to cook today.",
    minutes: 25,
    delivers: ["protein", "iron", "fibre"],
    ingredients: ["Rice", "Dal", "Mixed vegetables", "Ghee"],
    steps: [
      "Cook the rice and dal.",
      "Sauté the vegetables with basic spices.",
      "Serve everyone from the same pot, less washing up too.",
    ],
    diets: ["omnivore", "vegetarian", "vegan"],
    oneHanded: false,
    logged: false,
  },
  {
    id: "f-afternoon-feeding-routine",
    slot: "afternoon_snack",
    title: "Take a feed off her plate",
    blurb: "Burping, settling, or a bottle if that's part of your routine. So she gets a real break to eat.",
    minutes: 15,
    delivers: [],
    ingredients: ["A burp cloth", "A bottle, if you're using one"],
    steps: [
      "Take over a feed or the settling-after routine.",
      "Use the time to bring her something to eat.",
      "Fifteen minutes off is still a real break.",
    ],
    diets: ["omnivore", "vegetarian", "vegan"],
    oneHanded: false,
    logged: false,
  },
  {
    id: "f-dinner-family",
    slot: "dinner",
    title: "Dinner for the table",
    blurb: "A simple dinner that covers you and whoever else is eating tonight.",
    minutes: 30,
    delivers: ["protein", "calcium", "fibre"],
    ingredients: ["Roti or rice", "A vegetable curry", "Yoghurt"],
    steps: [
      "Cook a simple curry with what's in the fridge.",
      "Warm through with roti or rice.",
      "Sit down to eat it together if you can.",
    ],
    diets: ["omnivore", "vegetarian", "vegan"],
    oneHanded: false,
    logged: false,
  },
];

/**
 * Meals filtered to the parent's diet and allergies, grouped by slot. A
 * father gets FATHER_MEALS instead of MEALS — his own basic nutrition,
 * supporting the mother, family meals, and feeding-routine support, never
 * postpartum recovery or breastfeeding content presented as his own.
 */
export function mealsFor(profile: ParentProfile, slot: MealSlot): Meal[] {
  const allergens = profile.allergies.map((a) => a.toLowerCase().trim()).filter(Boolean);
  const source = profile.role === "father" ? FATHER_MEALS : MEALS;
  return source.filter((meal) => {
    if (meal.slot !== slot) return false;
    if (!meal.diets.includes(profile.diet)) return false;
    if (
      allergens.some((allergen) =>
        meal.ingredients.some((i) => i.toLowerCase().includes(allergen))
      )
    ) {
      return false;
    }
    return true;
  });
}

/** Everything not already in the kitchen, for the meals planned today. */
export function groceriesFor(profile: ParentProfile): string[] {
  const planned = MEAL_SLOTS.flatMap(({ key }) => mealsFor(profile, key).slice(0, 1));
  return Array.from(new Set(planned.flatMap((m) => m.ingredients))).sort();
}

/* ------------------------------------------------------------------ */
/* Today's wellness                                                    */
/* ------------------------------------------------------------------ */

export type Vital = {
  key: "hydration" | "rest" | "nourishment" | "movement" | "mood";
  label: string;
  /** Short, human reading of state — never a score. */
  reading: string;
  /** 0–1, for the quiet arc. Absent when there's nothing to show. */
  fraction?: number;
  detail: string;
};

export function vitalsFor(profile: ParentProfile): Vital[] {
  const lactating =
    profile.feeding !== "formula" && profile.feeding !== "prefer_not_to_say";
  return [
    {
      key: "hydration",
      label: "Water",
      reading: lactating ? "5 of about 10 glasses" : "5 of about 8 glasses",
      fraction: 0.5,
      detail: "Feeding pulls roughly a litre a day. Keep one within reach.",
    },
    {
      key: "nourishment",
      label: "Eating",
      reading: "Three of five moments",
      fraction: 0.6,
      detail: "Small and often beats three proper meals right now.",
    },
    {
      key: "rest",
      label: "Rest",
      reading: "5h 20m, broken",
      fraction: 0.55,
      detail: "Fragmented sleep is normal here. Naps count fully.",
    },
    {
      key: "movement",
      label: "Movement",
      reading: "A short walk",
      fraction: 0.35,
      detail: `Gentle is the goal at ${elapsedPhrase(profile.weeksPostpartum)} after ${deliveryPhrase(profile.delivery)}.`,
    },
    {
      key: "mood",
      label: "Mood",
      reading: "Steady, tired",
      detail: "You logged this yesterday too. That's worth noticing.",
    },
  ];
}

/* ------------------------------------------------------------------ */
/* Postpartum care library                                             */
/* ------------------------------------------------------------------ */

export type CareArea =
  | "physical"
  | "fathering"
  | "mental"
  | "sleep"
  | "feeding"
  | "nutrition"
  | "relationships";

export type DeliveryRelevance = "caesarean" | "vaginal" | "general";

export type CareTopic = {
  slug: string;
  area: CareArea;
  title: string;
  blurb: string;
  minutes: number;
  /** Shown on the topic screen, in order. */
  sections: { heading: string; body: string }[];
  /** When to stop reading and call someone. */
  seekHelp?: string[];
  /**
   * Which delivery method this topic is primarily relevant to.
   * "general" topics are shown to everyone.
   * Omitted = general (backwards-compatible with existing topics).
   */
  deliveryRelevance?: DeliveryRelevance;
};

export const CARE_AREAS: {
  key: CareArea;
  label: string;
  blurb: string;
}[] = [
  { key: "physical", label: "Physical recovery", blurb: "Healing, pelvic floor, moving again." },
  { key: "fathering", label: "For dads", blurb: "Your part in this, named and supported." },
  { key: "mental", label: "Mental health", blurb: "Mood, stress, and when to reach out." },
  { key: "sleep", label: "Sleep", blurb: "Recovering rest in a broken-night season." },
  { key: "feeding", label: "Feeding", blurb: "Latch, supply, and common snags." },
  { key: "nutrition", label: "Nutrition", blurb: "What your body is asking for." },
  { key: "relationships", label: "Relationships", blurb: "Reconnecting, dividing the load, and staying a team." },
];

export const CARE_TOPICS: CareTopic[] = [
  /* ---- Caesarean-specific ---- */
  {
    slug: "caesarean-healing",
    area: "physical",
    title: "How a caesarean scar heals",
    blurb: "What the first year actually looks like, week by week.",
    minutes: 5,
    deliveryRelevance: "caesarean",
    sections: [
      {
        heading: "The timeline nobody gives you",
        body: "The outer wound closes in about two weeks. The deeper layers take three to six months, and the scar keeps softening and fading for a full year or more. Tightness at six months is ordinary, not a setback.",
      },
      {
        heading: "Numbness and tugging",
        body: "The nerves cut during surgery regrow slowly, so numbness above the scar, pins and needles, or a tugging feeling when you stretch are all expected. Most of it settles, though a narrow band of altered sensation can stay permanently.",
      },
      {
        heading: "Scar massage",
        body: "Once fully closed and cleared by your doctor (usually around six weeks)gentle massage helps the layers glide. Two minutes, small circles, firm enough to move the skin but never enough to hurt.",
      },
    ],
    seekHelp: [
      "Spreading redness, heat, or discharge from the scar",
      "A fever above 38°C",
      "Pain that is getting worse rather than better",
    ],
  },
  {
    slug: "core-recovery-caesarean",
    area: "physical",
    title: "Core recovery after caesarean",
    blurb: "Reconnecting with muscles that were cut, not just stretched.",
    minutes: 5,
    deliveryRelevance: "caesarean",
    sections: [
      {
        heading: "Why it feels different",
        body: "A caesarean cuts through skin, fascia, and the abdominal wall to reach the uterus. Those deeper layers need time to knit back together before they can do their job again. A weak or absent core is not laziness, it is healing.",
      },
      {
        heading: "Starting small",
        body: "Gentle diaphragmatic breathing (expanding the ribcage on the inhale, feeling it draw inward on the exhale)begins reconnecting the deep core. This can start as soon as you feel ready, even in the first week.",
      },
      {
        heading: "Building up",
        body: "After six weeks and a clearance from your doctor, you can add gentle pelvic tilts and modified core exercises. Avoid sit-ups and planks until your physiotherapist says the layers are communicating properly.",
      },
    ],
    seekHelp: [
      "A visible bulge along the midline of your abdomen when you strain",
      "Ongoing back pain that isn't easing with gentle movement",
    ],
  },
  {
    slug: "lifting-safely",
    area: "physical",
    title: "Lifting safely after caesarean",
    blurb: "The practical side of the lifting restriction.",
    minutes: 3,
    deliveryRelevance: "caesarean",
    sections: [
      {
        heading: "The guideline",
        body: "Most guidelines suggest nothing heavier than your baby for the first six weeks. That sounds simple until you remember car seats, toddlers, and shopping bags. Ask for help where you can, and be honest when you cannot.",
      },
      {
        heading: "How to lift when you must",
        body: "Exhale as you lift, keep the weight close to your body, and engage your pelvic floor before you move. Avoid twisting, turn your whole body instead.",
      },
      {
        heading: "Returning to normal",
        body: "After six weeks, gradually increase what you carry. If you feel pulling, pressure, or pain at the scar, ease back. Progress is not always linear.",
      },
    ],
  },
  /* ---- Vaginal-birth-specific ---- */
  {
    slug: "pelvic-floor",
    area: "physical",
    title: "Pelvic floor, without the mystery",
    blurb: "What it does, how to find it, and what progress feels like.",
    minutes: 4,
    deliveryRelevance: "vaginal",
    sections: [
      {
        heading: "Finding the right muscles",
        body: "Imagine stopping wind, then gently lifting that feeling up and in. Your stomach, thighs and buttocks should stay relaxed. If everything clenches at once, you've recruited too much, start smaller.",
      },
      {
        heading: "Both halves matter",
        body: "Squeezing is only half of it. A pelvic floor that cannot fully release is as much of a problem as a weak one. Let go completely between each lift and give it as long as the squeeze.",
      },
      {
        heading: "A realistic week",
        body: "Three sets of eight, most days, attached to something you already do. Feeding, kettle boiling, red lights. Changes usually show up somewhere between six and twelve weeks.",
      },
    ],
    seekHelp: [
      "Leaking that isn't improving after three months of consistent work",
      "A feeling of heaviness or bulging in the vagina",
      "Pain during sex",
    ],
  },
  {
    slug: "perineal-healing",
    area: "physical",
    title: "Perineal healing",
    blurb: "What to expect, and what actually helps.",
    minutes: 4,
    deliveryRelevance: "vaginal",
    sections: [
      {
        heading: "The first two weeks",
        body: "Swelling, bruising, and soreness are all expected. Stitches (if you had them)dissolve on their own, usually within two to three weeks. Keep the area clean with warm water after using the toilet.",
      },
      {
        heading: "Sitz baths and cold packs",
        body: "A shallow warm bath for ten minutes, two or three times a day, genuinely helps. Ice packs wrapped in cloth can ease swelling in the first few days. Alternate between the two.",
      },
      {
        heading: "Sitting and moving",
        body: "A cushion or rolled towel can take pressure off the area. Change position often. Walking is good. It improves blood flow to the area and helps healing, even when it feels slow.",
      },
    ],
    seekHelp: [
      "Pain that is getting worse after the first week, not better",
      "Foul-smelling discharge or spreading redness",
      "Stitches that feel like they've opened",
    ],
  },
  {
    slug: "returning-to-exercise",
    area: "physical",
    title: "Returning to exercise",
    blurb: "A gentle progression, not a race to where you were.",
    minutes: 4,
    deliveryRelevance: "vaginal",
    sections: [
      {
        heading: "The first six weeks",
        body: "Gentle walking and pelvic floor exercises are enough. Your body did something extraordinary and it needs time to recover, not prove itself.",
      },
      {
        heading: "After your check-up",
        body: "Once cleared, you can gradually add low-impact activity. Swimming, yoga, light strength work. If anything causes leaking, heaviness, or pain, ease back a step. That is not failure, it is feedback.",
      },
      {
        heading: "What to watch for",
        body: "Pelvic floor symptoms during exercise (leaking, pressure, dragging)mean the intensity has outpaced your recovery. A women's health physiotherapist can help you find the right level.",
      },
    ],
    seekHelp: [
      "Any pelvic floor symptoms that appear or worsen with exercise",
      "Persistent pain during activity",
    ],
  },
  {
    slug: "managing-discomfort",
    area: "physical",
    title: "Managing discomfort after birth",
    blurb: "What's normal, what isn't, and what helps.",
    minutes: 4,
    deliveryRelevance: "vaginal",
    sections: [
      {
        heading: "The first days",
        body: "Soreness, afterpains (cramping as the uterus contracts), and general exhaustion are all normal. Afterpains can be stronger with second or later babies, and often peak during feeding.",
      },
      {
        heading: "Pain relief",
        body: "Paracetamol and ibuprofen are usually safe and effective. Your midwife or GP can confirm. Keeping on top of pain relief in the early days helps you rest and feed more comfortably.",
      },
      {
        heading: "When pain changes",
        body: "Pain should gradually ease over the first week or two. If it plateaus or worsens, that is worth a conversation with your midwife. You are not being difficult by asking.",
      },
    ],
    seekHelp: [
      "Pain that is worsening rather than improving",
      "Heavy bleeding that soaks a pad in an hour",
      "A temperature above 38°C",
    ],
  },
  /* ---- General (shown to everyone including 'prefer not to say') ---- */
  {
    slug: "general-postpartum",
    area: "physical",
    title: "Your body after birth",
    blurb: "The universal postpartum timeline, whatever your birth story.",
    minutes: 5,
    deliveryRelevance: "general",
    sections: [
      {
        heading: "The first six weeks",
        body: "Lochia (postpartum bleeding), cramping as the uterus shrinks, and profound tiredness are common to all births. Most of this settles gradually. Keep an eye on the trajectory. Improvement, even slow, is the right direction.",
      },
      {
        heading: "Three to six months",
        body: "Energy returns unevenly. Some weeks feel almost normal, others like a step backwards. Hormonal shifts, broken sleep, and the sheer cognitive load of a new baby all contribute. You are not imagining it.",
      },
      {
        heading: "Beyond six months",
        body: "Many parents feel pressure to be \"back to normal\" by now. In practice, postpartum recovery often takes a full year or longer. Your timeline is yours.",
      },
    ],
    seekHelp: [
      "Bleeding that returns after stopping, or suddenly becomes much heavier",
      "Persistent pain anywhere that isn't improving",
      "A feeling that something is wrong, even without a specific symptom, trust that feeling",
    ],
  },
  /* ---- Mental health ---- */
  {
    slug: "managing-stress-and-overwhelm",
    area: "mental",
    title: "Managing stress and overwhelm",
    blurb: "The feeling of never catching up, and what actually eases it.",
    minutes: 4,
    sections: [
      {
        heading: "Overwhelm has a shape",
        body: "It's rarely one big thing. It's the accumulation of small, constant demands with no clear end point. Naming it as \"overwhelm\" rather than \"failing to cope\" is often the first thing that makes it feel manageable.",
      },
      {
        heading: "Lower the bar on purpose",
        body: "This season is not the time to hold every standard you used to. Meals can be simple, the house can be messy, and plans can be cancelled. Protecting your capacity matters more than protecting appearances.",
      },
      {
        heading: "Ask for the specific thing",
        body: "\"Can you take the 7 to 9pm shift tonight\" gets a yes far more often than \"I need help.\" Specific, time-bound requests are easier for other people to say yes to, and easier for you to notice when they're met.",
      },
    ],
  },
  {
    slug: "self-care-without-guilt",
    area: "mental",
    title: "Self-care without guilt",
    blurb: "Taking care of yourself is not time stolen from your baby.",
    minutes: 3,
    sections: [
      {
        heading: "You are part of the system you're caring for",
        body: "A parent who is fed, rested, and occasionally alone is better able to care for their baby than one running on nothing. Looking after yourself isn't competing with looking after them. It's part of the same job.",
      },
      {
        heading: "It doesn't need to be big",
        body: "A shower without rushing, ten minutes with a coffee that's still hot, five minutes outside without the pram. Small, frequent moments do more for most parents than an occasional big gesture that takes weeks to arrange.",
      },
      {
        heading: "Guilt is common, not a signal you're doing something wrong",
        body: "Most parents feel a flicker of guilt the first few times they hand the baby over to rest. That feeling fades with repetition. It's not a sign you should stop, it's a sign you're not used to it yet.",
      },
    ],
  },
  {
    slug: "building-a-support-system",
    area: "mental",
    title: "Building a support system",
    blurb: "You are not meant to do this without other people.",
    minutes: 4,
    sections: [
      {
        heading: "Different people, different kinds of help",
        body: "One friend might be good for a vent, another for practical help, another for just sitting with you in silence. Spreading what you need across a few people is more sustainable than expecting one person (usually your partner)to be everything.",
      },
      {
        heading: "Other parents get it fastest",
        body: "A parent group, in person or online, at the same stage as you shortens the distance between \"is this normal\" and an honest answer. Shared experience does something reassurance from someone further out can't quite do.",
      },
      {
        heading: "Accepting help is a skill, not a weakness",
        body: "When someone offers to bring food or hold the baby for an hour, saying yes is not admitting defeat. Most people offering genuinely want to help and feel good when you let them.",
      },
    ],
  },
  {
    slug: "anxiety-after-parenthood",
    area: "mental",
    title: "Anxiety after becoming a parent",
    blurb: "Racing thoughts and constant checking are common, and treatable.",
    minutes: 5,
    sections: [
      {
        heading: "It doesn't always look like worry",
        body: "New-parent anxiety can show up as checking the baby's breathing repeatedly, intrusive images of something going wrong, or a racing mind that won't settle even when the baby is finally asleep. It's one of the most under-reported parts of the first year.",
      },
      {
        heading: "Intrusive thoughts are not a warning sign about you",
        body: "Sudden, unwanted images of harm coming to your baby are extremely common, and are the opposite of an intention. They happen precisely because you care so much about keeping your baby safe. They become concerning only if they bring an urge to act on them, which is a different and much rarer thing.",
      },
      {
        heading: "It responds well to treatment",
        body: "Talking therapies, peer support, and (when appropriate)medication compatible with breastfeeding all help. Anxiety that's interfering with sleep, eating, or daily function is worth raising with your GP, not something to just wait out.",
      },
    ],
    seekHelp: [
      "Anxiety that stops you sleeping even when your baby is asleep",
      "Intrusive thoughts that come with an urge to act on them",
      "Anxiety that is stopping you leaving the house or caring for your baby",
    ],
  },
  {
    slug: "baby-blues-or-more",
    area: "mental",
    title: "Baby blues, or something more",
    blurb: "How to tell the difference, honestly and without alarm.",
    minutes: 6,
    sections: [
      {
        heading: "Baby blues",
        body: "Tearfulness, sensitivity and mood swings that start in the first week and settle by about two weeks. Up to eight in ten parents experience it. It lifts on its own.",
      },
      {
        heading: "Postnatal depression",
        body: "Low mood, loss of interest, or hopelessness that lasts beyond two weeks or begins later in the first year. It affects roughly one in ten parents and responds well to treatment. It is not a failure of love or effort.",
      },
      {
        heading: "Anxiety, which gets missed",
        body: "Racing thoughts, checking the baby compulsively, intrusive images of harm coming to them. Frightening, common, and very treatable. Intrusive thoughts are not intentions.",
      },
    ],
    seekHelp: [
      "Low mood or anxiety lasting more than two weeks",
      "Feeling unable to care for yourself or your baby",
      "Any thought of harming yourself or your baby. Contact your doctor or emergency services now",
    ],
  },
  {
    slug: "preventing-burnout",
    area: "mental",
    title: "Preventing burnout",
    blurb: "Running on empty for long enough stops being sustainable. What to watch for before it does.",
    minutes: 4,
    sections: [
      {
        heading: "Burnout builds slowly",
        body: "It rarely arrives as a single bad day. It's weeks of depleted reserves with no real refuelling. Constant fatigue that sleep doesn't fix, irritability at small things, and feeling emotionally flat toward things you normally enjoy are early signs, not personal failings.",
      },
      {
        heading: "Recovery needs more than rest",
        body: "Sleep helps, but burnout also needs moments where you're not \"on call\". Even twenty minutes where someone else has the baby and your attention is genuinely free. Rest without that mental off-switch doesn't refill the tank the same way.",
      },
      {
        heading: "Say it before it's a crisis",
        body: "Telling your partner or a friend \"I'm running on empty\" while you still have some capacity left gets a far better response than waiting until you're depleted. Early honesty is what keeps burnout from becoming something bigger.",
      },
    ],
    seekHelp: [
      "Feeling emotionally numb or detached from your baby for more than a few days",
      "Persistent exhaustion that doesn't lift with rest",
      "Thoughts that you'd be better off not being here. Contact your doctor or emergency services now",
    ],
  },
  {
    slug: "recognizing-when-to-get-help",
    area: "mental",
    title: "Recognizing when professional help is needed",
    blurb: "The line between a hard season and something worth treating, made concrete.",
    minutes: 5,
    sections: [
      {
        heading: "Duration and intensity are the signal",
        body: "Low mood, anxiety, or exhaustion that lasts more than two weeks, or that is intense enough to affect how you function day to day, has crossed from a hard patch into something worth raising with your GP. You don't need to wait for it to get worse to ask.",
      },
      {
        heading: "You don't need the \"right\" words",
        body: "\"I don't feel like myself\" or \"I'm struggling more than I think I should be\" is enough to start the conversation. A good GP will ask the follow-up questions. You don't need a diagnosis prepared before you go in.",
      },
      {
        heading: "Help works, and often works quickly",
        body: "Talking therapy, peer support, and medication (including options compatible with breastfeeding)all have strong evidence behind them in the postpartum period. Many parents notice a real difference within a few weeks of starting support.",
      },
    ],
    seekHelp: [
      "Low mood or anxiety lasting more than two weeks",
      "Feeling unable to care for yourself or your baby",
      "Any thought of harming yourself or your baby. Contact your doctor or emergency services now",
    ],
  },
  /* ---- Sleep ---- */
  {
    slug: "sleep-when-broken",
    area: "sleep",
    title: "Recovering rest when nights are broken",
    blurb: "What actually helps when eight hours isn't available.",
    minutes: 4,
    sections: [
      {
        heading: "Protect the first stretch",
        body: "The deepest, most restorative sleep comes early in the night. If someone can cover one feed, make it the late-evening one, and go to bed at the same time as your baby does.",
      },
      {
        heading: "Naps are real sleep",
        body: "A twenty-minute nap measurably restores alertness. Ninety minutes gets you a full cycle and you wake more easily than at sixty. Set an alarm and let the tidying wait.",
      },
      {
        heading: "Light does the resetting",
        body: "Ten minutes of daylight within an hour of waking anchors your body clock harder than any evening routine. Take it outside with the pram if that's what's possible.",
      },
    ],
  },
  {
    slug: "newborn-sleep-expectations",
    area: "sleep",
    title: "Newborn sleep expectations",
    blurb: "What's actually normal in the first three months, so you're not measuring against the wrong thing.",
    minutes: 4,
    sections: [
      {
        heading: "There is no schedule yet",
        body: "Newborns sleep in short, frequent bursts around the clock. Typically 14 to 17 hours a day, in stretches of one to three hours, because their stomachs are small and need refilling often. A predictable pattern isn't something you're failing to establish; it isn't available yet.",
      },
      {
        heading: "Day and night take time to sort themselves out",
        body: "Babies are born without a working body clock and develop one gradually, usually by around three to four months. Bright light and activity in the day, dim and quiet at night, help nudge this along. But the confusion itself is expected, not a problem to fix immediately.",
      },
      {
        heading: "The four-hour stretch is a milestone, not a baseline",
        body: "A single longer stretch (often the first sign of things settling)tends to arrive somewhere in the six-to-twelve-week range, and it moves around a lot. Comparing your baby's stretch to another baby's rarely tells you anything useful.",
      },
    ],
  },
  {
    slug: "safe-sleep-practices",
    area: "sleep",
    title: "Safe sleep, made simple",
    blurb: "The handful of things that measurably lower risk. And nothing beyond them is required.",
    minutes: 4,
    sections: [
      {
        heading: "Back, alone, and on a firm flat surface",
        body: "Every sleep, including naps, on their back, on a firm flat mattress, with nothing else in the cot. No pillows, loose blankets, bumpers, or soft toys. This single set of choices is the most evidence-backed way to lower the risk of sudden infant death.",
      },
      {
        heading: "Room-sharing, not bed-sharing",
        body: "Having your baby sleep in your room, in their own separate sleep space, for at least the first six months is associated with lower risk than either bed-sharing or a separate room. A cot or bassinet beside your bed covers both closeness and safety.",
      },
      {
        heading: "Temperature and dressing",
        body: "A room that feels comfortably cool to an adult in a t-shirt, and a baby dressed in one layer more than you'd wear, is the rough guide most guidelines use. Overheating is a genuine risk factor, so resist the urge to over-bundle.",
      },
    ],
    seekHelp: [
      "Snoring, gasping, or pauses in breathing during sleep",
      "A baby who is unusually difficult to wake, or unusually floppy",
    ],
  },
  {
    slug: "sleep-regressions",
    area: "sleep",
    title: "Sleep regressions, explained",
    blurb: "Why a baby who was sleeping well suddenly isn't. A sign of progress, not a step backward.",
    minutes: 4,
    sections: [
      {
        heading: "They usually track development",
        body: "The common regression windows (around four months, eight to ten months, and eighteen months)line up with real developmental leaps: a maturing sleep cycle, new mobility, language coming online. Sleep gets disrupted because the brain is busy doing something else important.",
      },
      {
        heading: "The four-month regression is different from the rest",
        body: "At four months, a baby's sleep cycles permanently mature to look more like an adult's, with more, lighter wake-ups between cycles. This one doesn't fully pass. It's a new normal a baby then learns to sleep through, not a phase that ends on its own.",
      },
      {
        heading: "What helps without undoing progress",
        body: "Keeping the routine steady, giving a little extra time to resettle before intervening, and expecting two to six weeks rather than a couple of nights tends to work better than changing everything at once. Most regressions resolve faster with consistency than with a new approach.",
      },
    ],
  },
  {
    slug: "managing-night-wakings",
    area: "sleep",
    title: "Managing night wakings",
    blurb: "Not every waking needs a full response. Knowing the difference changes a lot.",
    minutes: 4,
    sections: [
      {
        heading: "Pause before you pick up",
        body: "Babies stir and vocalise between sleep cycles without actually waking. Giving a minute or two before going in (long enough to see whether they resettle on their own)avoids turning a normal stir into a full waking.",
      },
      {
        heading: "Keep it boring",
        body: "Dim light, a quiet voice, minimal handling. The less stimulating a night waking is, the faster your baby learns that night-time isn't when the interesting things happen. Which, over weeks, tends to shorten the wakings themselves.",
      },
      {
        heading: "Rule out the obvious first",
        body: "Hunger, a wet nappy, being too hot or cold, or teething discomfort account for most wakings in the first year. A quick check for these before assuming it's a habit or phase saves a lot of guessing.",
      },
    ],
    seekHelp: [
      "A sudden increase in night wakings alongside fever, rash, or reduced feeding",
      "Wakings that seem to involve pain, not just fussing",
    ],
  },
  {
    slug: "baby-naps",
    area: "sleep",
    title: "Making sense of baby naps",
    blurb: "Wake windows, tired signs, and why nap timing matters more than nap length.",
    minutes: 4,
    sections: [
      {
        heading: "Wake windows change fast",
        body: "How long a baby can comfortably stay awake between sleeps grows quickly across the first year. Roughly 45 minutes to an hour for a newborn, stretching to two to three hours by six months. Watching the clock alongside your baby's cues works better than either alone.",
      },
      {
        heading: "Read the early tired signs",
        body: "Red or rubbing eyes, going quiet or staring, and the first yawn tend to appear before full-blown overtired crying. Starting the wind-down at the early signs, rather than waiting for the obvious ones, usually makes for an easier nap.",
      },
      {
        heading: "Short naps are still doing their job",
        body: "A 20-to-30-minute nap that ends the moment a sleep cycle does is common, and not necessarily a problem to solve. If your baby wakes happy, the nap has served its purpose even if it was shorter than you hoped.",
      },
    ],
  },
  {
    slug: "establishing-sleep-routines",
    area: "sleep",
    title: "Establishing a sleep routine",
    blurb: "A short, repeatable sequence does more than any single sleep trick.",
    minutes: 3,
    sections: [
      {
        heading: "Consistency, not complexity",
        body: "A bath, a feed, a dim room, and the same few words every time. Repeated nightly, it becomes a cue your baby's brain learns to associate with sleep. It doesn't need to be elaborate, just genuinely the same most nights.",
      },
      {
        heading: "When to start",
        body: "A simple wind-down routine can begin from a few weeks old, even before it changes anything measurable. By around eight to twelve weeks, most babies start responding to it, which is usually when parents notice it actually helping.",
      },
      {
        heading: "Keep it portable",
        body: "A routine built entirely around your own nursery falls apart the first time you travel or a grandparent does bedtime. A version that fits in a bag (a particular song, a specific phrase, a small comfort object)travels with you.",
      },
    ],
  },
  {
    slug: "milk-supply",
    area: "feeding",
    title: "Milk supply, and what actually affects it",
    blurb: "Separating the real levers from the noise.",
    minutes: 5,
    sections: [
      {
        heading: "Removal drives production",
        body: "Supply responds to how often and how well milk is removed, far more than to anything you eat or drink. Frequent, effective feeding is the lever. Most other advice is downstream of this one.",
      },
      {
        heading: "Signs it's going well",
        body: "Six or more heavy nappies a day, steady weight gain, and swallowing you can hear. Softer breasts and shorter feeds after the early weeks usually mean efficiency, not decline.",
      },
      {
        heading: "What genuinely helps",
        body: "Enough food and fluid for you, rest where you can find it, and a good latch. If feeding hurts, that's a latch question and worth a lactation consultant rather than endurance.",
      },
    ],
    seekHelp: [
      "Feeding that is painful rather than just unfamiliar",
      "Fewer than six wet nappies a day",
      "A hard, red, painful area on the breast with flu-like symptoms",
    ],
  },
  /* ---- Relationships ---- */
  {
    slug: "reconnecting-after-birth",
    area: "relationships",
    title: "Reconnecting with your partner after childbirth",
    blurb: "You're both still there. It just takes deliberate finding, for a while.",
    minutes: 5,
    sections: [
      {
        heading: "Why it feels distant",
        body: "You've gone from two people to a family of three (or more), running on broken sleep, with most of your attention pulled toward someone who can't yet meet you halfway. Feeling like roommates rather than partners for a stretch is common, not a sign anything is wrong between you.",
      },
      {
        heading: "Small, not grand",
        body: "This isn't the season for date nights that need planning. A two-minute check-in before sleep, sitting close on the sofa instead of across the room, a text in the middle of the day. These rebuild connection faster than waiting for the energy to do something bigger.",
      },
      {
        heading: "Say the tired part out loud",
        body: "\"I miss us\" lands better than silence, and better than resentment that builds because neither of you named what's happening. Most partners are relieved to hear it, they've usually felt it too.",
      },
    ],
  },
  {
    slug: "dividing-responsibilities",
    area: "relationships",
    title: "Division of responsibilities",
    blurb: "The invisible load is real work. Naming it is the first fix.",
    minutes: 5,
    sections: [
      {
        heading: "It's not just tasks",
        body: "Remembering the next vaccination is due, noticing the wipes are running low, tracking whose turn it is to be tired. This mental load is real labour, and it's often invisible precisely to the partner not carrying it. Naming it out loud is the first step to sharing it.",
      },
      {
        heading: "Divide by ownership, not just chores",
        body: "\"You do bath, I do bottles\" works better long-term than splitting each task in half every time. Full ownership of a piece means one of you isn't managing a helper. You both simply have your part.",
      },
      {
        heading: "Revisit it. This isn't a one-time conversation",
        body: "What worked at six weeks won't fit at six months. A short, regular check-in (even five minutes on a Sunday) keeps the split honest as both your capacities and the baby's needs change.",
      },
    ],
  },
  {
    slug: "communication-early-parenthood",
    area: "relationships",
    title: "Communication during early parenthood",
    blurb: "Exhausted people say things sharper than they mean. Here's how to talk anyway.",
    minutes: 4,
    sections: [
      {
        heading: "Sleep debt talks for you",
        body: "Snapping over something small (whose turn it was, where the muslin went)is usually exhaustion speaking, not a verdict on the relationship. Naming that pattern to each other in a calm moment takes the sting out of it in the hard ones.",
      },
      {
        heading: "State the need, not just the complaint",
        body: "\"I need forty-five minutes alone this evening\" gets heard. \"You never give me a break\" gets defended against. Both are asking for the same thing. One is far more likely to get it.",
      },
      {
        heading: "Timing matters more than wording",
        body: "The conversation that goes badly at 11pm on day four of broken sleep often goes fine the next morning after coffee. If it's not urgent, it can wait for a moment when you both have something left to give.",
      },
    ],
  },
  {
    slug: "managing-conflicts",
    area: "relationships",
    title: "Managing conflicts",
    blurb: "More friction is normal here. It doesn't have to mean more damage.",
    minutes: 5,
    sections: [
      {
        heading: "More arguments is not a red flag on its own",
        body: "Sleep deprivation, hormonal shifts, and the sheer logistics of keeping a baby alive raise the friction in any relationship. More disagreements than before is expected in this season. What matters is how you're having them.",
      },
      {
        heading: "Pause before you're past the point of useful",
        body: "\"Can we come back to this in twenty minutes\" is not avoidance. It's recognising that a conversation had by two exhausted people rarely reaches anywhere good. Actually returning to it is the part that makes this work rather than becoming a dodge.",
      },
      {
        heading: "Repair matters more than avoiding the fight",
        body: "Every couple argues. The ones who come through this season well are not the ones who never clash. They're the ones who reliably circle back and repair afterward, even briefly.",
      },
    ],
    seekHelp: [
      "Conflict that is becoming frequent, harsh, or frightening to either of you",
      "A sense that you're navigating this entirely alone, with no repair happening at all",
    ],
  },
  {
    slug: "intimacy-after-childbirth",
    area: "relationships",
    title: "Intimacy after childbirth",
    blurb: "Physically, emotionally, and on your own timeline, not a deadline.",
    minutes: 5,
    sections: [
      {
        heading: "There's no correct timeline",
        body: "Most guidance suggests waiting until any bleeding has stopped and a healthcare provider has confirmed healing (often around six weeks)but readiness afterward varies hugely and honestly. Fatigue, body-image shifts, and touch-fatigue from being needed by a baby all day are all real, common reasons it takes longer.",
      },
      {
        heading: "Intimacy is bigger than sex",
        body: "Physical closeness that doesn't lead anywhere (a hand held, a long hug, lying close before sleep)keeps a physical connection alive during a stretch where sex itself may not feel available yet. Neither of you should read its absence as rejection.",
      },
      {
        heading: "Talk before you're both guessing",
        body: "Assuming you know what the other wants (or doesn't) is where resentment quietly builds. A plain, low-pressure conversation about where you both are removes most of the guesswork.",
      },
    ],
    seekHelp: [
      "Pain during sex that persists beyond the initial return to intimacy",
      "A sense of dread or disconnection around intimacy that isn't easing over time",
    ],
  },
  {
    slug: "parenting-partnership",
    area: "relationships",
    title: "Building a healthy parenting partnership",
    blurb: "You don't have to parent identically. You do have to parent as a team.",
    minutes: 4,
    sections: [
      {
        heading: "You will disagree on approach, that's fine",
        body: "Different instincts about soothing, routine, or how much to intervene are normal, not a sign one of you is doing it wrong. The goal is alignment on the big things, not identical instincts on every small one.",
      },
      {
        heading: "Back each other up in front of the baby",
        body: "Working out a disagreement about approach privately, rather than contradicting each other in the moment, gives your child a consistent picture and keeps either of you from feeling undermined.",
      },
      {
        heading: "Catch each other doing it well",
        body: "It's easy for early parenthood to become a running tally of what the other person got wrong. Deliberately noticing and saying when they did something well does more for the partnership than any logistics fix.",
      },
    ],
  },
  /* ---- For dads ---- */
  {
    slug: "what-she-needs-right-now",
    area: "fathering",
    title: "What she needs from you right now",
    blurb: "Practical support does more than it gets credit for.",
    minutes: 4,
    sections: [
      {
        heading: "Logistics are love, right now",
        body: "Bringing water without being asked, handling the pharmacy run, taking the baby for twenty minutes so she can shower alone. This is not the small stuff while the real support happens elsewhere. In the fourth trimester, this is the support.",
      },
      {
        heading: "Notice before she has to ask",
        body: "Asking for help takes energy she often doesn't have. Watching for the signs (she's wincing when she stands, she hasn't eaten, she's been holding the baby for two hours straight)and stepping in without waiting to be asked removes a whole layer of labour from her day.",
      },
      {
        heading: "Believe what she tells you about her body",
        body: "You can't feel what a caesarean or a torn perineum feels like. When she says something hurts or feels wrong, the right response is to believe her and help her get seen, not to weigh whether it sounds serious enough.",
      },
    ],
  },
  {
    slug: "your-own-adjustment",
    area: "fathering",
    title: "Your own adjustment matters too",
    blurb: "You're allowed to be finding this hard as well.",
    minutes: 5,
    sections: [
      {
        heading: "This is a real transition for you, not a side story",
        body: "New identity, new financial pressure, new relationship dynamics, and often far less acknowledgment than she gets. All landing at once. Finding it disorienting doesn't mean you're not coping; it means it's disorienting.",
      },
      {
        heading: "Paternal postnatal depression is real",
        body: "Studies put it at roughly one in ten fathers, often peaking a few months in rather than right at birth. Which is part of why it gets missed. It doesn't always look like sadness; irritability, withdrawal, or losing interest in things you used to enjoy all count.",
      },
      {
        heading: "You don't have to hold it alone",
        body: "Other fathers, a GP, a therapist. Any of these count as legitimate support, not an overreaction. Naming that you're struggling to one person is usually the hardest part, and the part that changes things most.",
      },
    ],
    seekHelp: [
      "Low mood, irritability, or numbness lasting more than two weeks",
      "Losing interest in the baby, your partner, or things you used to care about",
      "Any thought of harming yourself. Contact your doctor or emergency services now",
    ],
  },
  {
    slug: "supporting-recovery-you-cant-see",
    area: "fathering",
    title: "Supporting a recovery you can't see",
    blurb: "Her healing is mostly invisible. Your support still matters enormously.",
    minutes: 4,
    sections: [
      {
        heading: "Most of it doesn't show",
        body: "A healing uterus, a recovering pelvic floor, hormones resetting over months. Almost none of this is visible from the outside, which makes it easy to underestimate how much recovery is still happening once she looks and sounds like herself again.",
      },
      {
        heading: "Six weeks is not a finish line",
        body: "The six-week check-up is a checkpoint, not a discharge from recovery. Energy, strength, and healing continue well beyond it. Often for the better part of a year. Pacing your expectations to that timeline, not to the six-week mark, helps both of you.",
      },
      {
        heading: "Take the physical load off where you can",
        body: "Carrying the car seat, handling the stairs with the pram, doing the lifting she's been told to avoid. Small, consistent choices that protect her healing add up more than one big gesture.",
      },
    ],
  },
  {
    slug: "bonding-when-shes-feeding",
    area: "fathering",
    title: "Bonding when you're not the one feeding",
    blurb: "Attachment is built in a hundred small moments, not just at the breast.",
    minutes: 4,
    sections: [
      {
        heading: "Skin-to-skin works for you too",
        body: "Holding your baby against bare skin (after a bath, during a nap, first thing in the morning)builds the same calming, bonding response for you that it does for a breastfeeding parent. It's not a consolation version of connection; it's a real one.",
      },
      {
        heading: "Claim something as yours",
        body: "The bedtime routine, the morning nappy change, the walk before dinner. A small ritual that's reliably yours builds a bond of its own, on a rhythm that doesn't depend on feeding at all.",
      },
      {
        heading: "Your voice is already familiar",
        body: "Babies recognise a voice they heard often before birth. Talking, singing, narrating what you're doing. None of it requires feeding to matter, and all of it is already building recognition.",
      },
    ],
  },
];

export function topicsForArea(area: CareArea): CareTopic[] {
  return CARE_TOPICS.filter((t) => t.area === area);
}

/**
 * Whether an area belongs on this parent's Recovery screen at all — the
 * role-based counterpart to topicsForProfile's delivery-based filtering
 * within an area.
 *
 * Two areas are role-gated:
 *   - "physical" (postpartum recovery) is about the birthing parent's own
 *     body, so it's shown to mothers, and to anyone who hasn't said
 *     otherwise (the same "don't assume" default used everywhere else in
 *     this file). A father who has told us so does not see it. The time
 *     bound reuses RECOVERY_RELEVANT_MONTHS — the same "roughly a year"
 *     window recovery-relevance already uses elsewhere, rather than a new
 *     threshold invented here.
 *   - "fathering" is the reverse: shown only once someone has told us
 *     they're the father. It doesn't default open, because its content
 *     assumes that fact rather than merely not contradicting it.
 *
 * Every other area — mental health, sleep, feeding, nutrition,
 * relationships — is general parenting content and stays visible to both,
 * unchanged.
 */
export function isCareAreaVisible(
  area: CareArea,
  role: ParentRole,
  childAgeMonths: number,
): boolean {
  if (area === "physical") {
    return role !== "father" && isRecoveryRelevant(childAgeMonths);
  }
  if (area === "fathering") {
    return role === "father";
  }
  return true;
}

/**
 * Returns care topics filtered to the parent's delivery method.
 * - caesarean  → caesarean + general topics
 * - vaginal   → vaginal + general topics
 * - prefer_not_to_say / unknown → general topics only
 */
export function topicsForProfile(
  delivery: DeliveryType,
  area?: CareArea,
): CareTopic[] {
  return CARE_TOPICS.filter((t) => {
    if (area && t.area !== area) return false;
    const relevance = t.deliveryRelevance ?? "general";
    if (relevance === "general") return true;
    if (delivery === "prefer_not_to_say") return false;
    return relevance === delivery;
  });
}

export function topicBySlug(slug: string): CareTopic | undefined {
  return CARE_TOPICS.find((t) => t.slug === slug);
}

/**
 * The exact areas + topic counts You's card grid and the Care screen
 * (app/(tabs)/you/care.tsx) both need — pulled into one function so the two
 * can never drift: an area the grid shows a card for is guaranteed to have
 * at least one topic when the Care screen opens it, and vice versa.
 */
export function visibleCareAreas(
  role: ParentRole,
  childAgeMonths: number,
  delivery: DeliveryType,
): { key: CareArea; label: string; blurb: string; topicCount: number }[] {
  return CARE_AREAS.filter((area) => isCareAreaVisible(area.key, role, childAgeMonths))
    .map((area) => ({ ...area, topicCount: topicsForProfile(delivery, area.key).length }))
    .filter((area) => area.topicCount > 0);
}

/**
 * Up to `count` recommended topics for "Your Stage" / Home's "For You" —
 * pooled across every area currently visible to this parent (the same
 * visibleCareAreas gate everything else uses), then rotated by day so the
 * same one doesn't show forever. `offset` lets two call sites on the same
 * screen (e.g. a single "for today" pick and a "your stage" pair) draw
 * different topics from the same pool rather than repeating each other.
 * Spreads across distinct areas where the pool is large enough to allow it.
 */
export function recommendedTopicsForProfile(
  profile: ParentProfile,
  childAgeMonths: number,
  count = 2,
  offset = 0,
): CareTopic[] {
  const areas = visibleCareAreas(profile.role, childAgeMonths, profile.delivery);
  const pool = areas.flatMap((area) => topicsForProfile(profile.delivery, area.key));
  if (pool.length === 0) return [];

  const dayIndex = Math.floor(Date.now() / 86_400_000) + offset;
  const picked: CareTopic[] = [];
  const usedAreas = new Set<CareArea>();
  for (let i = 0; i < pool.length && picked.length < count; i++) {
    const topic = pool[(dayIndex + i) % pool.length];
    if (usedAreas.has(topic.area) && picked.length < pool.length - 1) continue;
    usedAreas.add(topic.area);
    picked.push(topic);
  }
  return picked;
}

/* ------------------------------------------------------------------ */
/* The bridge between modes                                            */
/* ------------------------------------------------------------------ */

export type Bridge = {
  /** What the child just did, or is about to. */
  childMoment: string;
  /** What that makes possible for the parent. */
  parentOffer: string;
  detail: string;
  minutes: number;
};

/**
 * The product's whole thesis in one object: the child's routine is the
 * scaffolding for the parent's care. Surfaced in BOTH modes, so neither half
 * feels like a separate app.
 */
export function bridgesFor(profile: ParentProfile): Bridge[] {
  const bridges: Bridge[] = [
    {
      childMoment: "Tummy time",
      parentOffer: "Open your chest while you're down there",
      detail:
        "You're already on the floor at their level. Two minutes of thoracic opening undoes some of the feeding hunch.",
      minutes: 2,
    },
    {
      childMoment: "Nap started",
      parentOffer: "Eat something that isn't standing up",
      detail: "The dal is in the fridge. Sit for it. Digestion works better than you'd think.",
      minutes: 10,
    },
    {
      childMoment: "Feed finished",
      parentOffer: "Refill your glass before you put them down",
      detail: "This is the single easiest habit to attach to something you already do every day.",
      minutes: 1,
    },
  ];
  if (profile.delivery === "caesarean" && profile.weeksPostpartum >= 12) {
    bridges.push({
      childMoment: "Bedtime done",
      parentOffer: "Two minutes of scar massage",
      detail: "You're past twelve weeks. Small circles, firm but never sore.",
      minutes: 2,
    });
  }
  if (profile.delivery === "vaginal" && profile.weeksPostpartum <= 12) {
    bridges.push({
      childMoment: "Feed finished",
      parentOffer: "Three gentle pelvic floor lifts",
      detail: "Attach them to something you already do. Squeeze, hold, release, three is plenty.",
      minutes: 1,
    });
  }
  return bridges;
}
