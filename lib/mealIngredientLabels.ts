/**
 * The v11 Meal Planner workbook's own "Ingredients" column has no spaces
 * inside compound words -- "Moongdal,rice,ghee" not "Moong dal, rice,
 * ghee" -- and it's like that all the way back to the source PDF
 * extraction the workbook itself was built from, not something that broke
 * in migration. Fixing it means recognising each of the ~230 distinct
 * ingredient tokens that appear across all 202 family meals, which is a
 * closed, hand-checked set (see the token below); a new meal added later
 * whose ingredients aren't in this table still gets comma/paren spacing
 * (formatIngredients' fallback), just not the compound-word split.
 */
const INGREDIENT_LABELS: Record<string, string> = {
  "1-2tbsp": "1–2 tbsp",
  "2": "2",
  ">12m": ">12m",
  ">18m": ">18m",
  ">24m": ">24m",
  almondbutter: "almond butter",
  almondpowder: "almond powder",
  almonds: "almonds",
  almondsorwalnuts: "almonds or walnuts",
  alsi: "alsi",
  appam: "appam",
  apple: "apple",
  "apple/banana": "apple or banana",
  applegourd: "apple gourd",
  bainganbharta: "baingan bharta",
  bajraflour: "bajra flour",
  banana: "banana",
  "banana/papaya": "banana or papaya",
  bangda: "bangda",
  beans: "beans",
  beetroot: "beetroot",
  beetrootsabzi: "beetroot sabzi",
  besan: "besan",
  bhindisabzi: "bhindi sabzi",
  boiled: "boiled",
  boiledchana: "boiled chana",
  boiledegg: "boiled egg",
  boiledeggs: "boiled eggs",
  bottlegourd: "bottle gourd",
  "bread/toast": "bread or toast",
  brokenwheat: "broken wheat",
  buttermilk: "buttermilk",
  cardamom: "cardamom",
  carrot: "carrot",
  carrotsabzi: "carrot sabzi",
  catlafish: "catla fish",
  catlafishcurry: "catla fish curry",
  cauliflower: "cauliflower",
  cauliflowersabzi: "cauliflower sabzi",
  cauliflowerstuffing: "cauliflower stuffing",
  chaas: "chaas",
  cheesesauce: "cheese sauce",
  chicken: "chicken",
  "chicken-vegetablecurry": "chicken-vegetable curry",
  chickencurry: "chicken curry",
  chickenmince: "chicken mince",
  chickpeaflour: "chickpea flour",
  chickpeas: "chickpeas",
  cholecurry: "chole curry",
  coconutmilk: "coconut milk",
  coconutoil: "coconut oil",
  cooked: "cooked",
  coriander: "coriander",
  cornflour: "corn flour",
  cornkernels: "corn kernels",
  cucumber: "cucumber",
  curd: "curd",
  curryleaves: "curry leaves",
  custard: "custard",
  dal: "dal",
  dalia: "dalia",
  dalsoup: "dal soup",
  dates: "dates",
  "deboned-fish": "deboned fish",
  dhokla: "dhokla",
  dosa: "dosa",
  ediblegum: "edible gum",
  egg: "egg",
  eggomelette: "egg omelette",
  eggs: "eggs",
  fermentedbesan: "fermented besan",
  fermentedbesanrolls: "fermented besan rolls",
  fermentedricebatter: "fermented rice batter",
  fish: "fish",
  fishcurry: "fish curry",
  flaxseeds: "flax seeds",
  foxnuts: "fox nuts",
  fruit: "fruit",
  fruitsmoothie: "fruit smoothie",
  gardencress: "garden cress",
  ghee: "ghee",
  gond: "gond",
  grapes: "grapes",
  gratedcarrot: "grated carrot",
  gratedcucumber: "grated cucumber",
  "guava/orange": "guava or orange",
  handful: "handful",
  "hard-boiledegg": "hard-boiled egg",
  hing: "hing",
  hungcurd: "hung curd",
  idli: "idli",
  indianmackerel: "Indian mackerel",
  jaggery: "jaggery",
  jowarflour: "jowar flour",
  khandvi: "khandvi",
  lauki: "lauki",
  lean: "lean",
  leftoverdal: "leftover dal",
  "leftoverorready-to-eat": "leftover or ready-to-eat",
  lemon: "lemon",
  lobiacurry: "lobia curry",
  makhana: "makhana",
  mango: "mango",
  mashed: "mashed",
  "mashedbanana<24m": "mashed banana (<24m)",
  masoordal: "masoor dal",
  melonseeds: "melon seeds",
  methi: "methi",
  methisabzi: "methi sabzi",
  methistuffing: "methi stuffing",
  milk: "milk",
  "milk/curd": "milk or curd",
  minced: "minced",
  minimal: "minimal",
  "minimal12-24m": "minimal (12–24m)",
  mixeddal: "mixed dal",
  mixeddalbatter: "mixed dal batter",
  mixeddalcurry: "mixed dal curry",
  mixedfruits: "mixed fruits",
  mixedmilletflour: "mixed millet flour",
  mixedvegetables: "mixed vegetables",
  mixedvegetablesabzi: "mixed vegetable sabzi",
  "moong+besan": "moong + besan",
  "moong+masoor": "moong + masoor",
  "moong+toor": "moong + toor",
  "moong/masoor": "moong or masoor",
  moongdal: "moong dal",
  moongdalbatter: "moong dal batter",
  murmura: "murmura",
  mustardoil: "mustard oil",
  mustardseeds: "mustard seeds",
  muttoncurry: "mutton curry",
  muttonkeema: "mutton keema",
  "none<12m": "none (<12m)",
  oats: "oats",
  oil: "oil",
  okrasabzi: "okra sabzi",
  onion: "onion",
  optional: "optional",
  palaksabzi: "palak sabzi",
  paneer: "paneer",
  "paneer-vegetablecurry": "paneer-vegetable curry",
  paneerbhurji: "paneer bhurji",
  paneercurry: "paneer curry",
  paneerpulao: "paneer pulao",
  paneerstuffing: "paneer stuffing",
  papaya: "papaya",
  pasta: "pasta",
  paste: "paste",
  peanutbutter: "peanut butter",
  peanuts: "peanuts",
  peas: "peas",
  pepper: "pepper",
  poha: "poha",
  pomegranateseeds: "pomegranate seeds",
  potato: "potato",
  potatosabzi: "potato sabzi",
  potatostuffing: "potato stuffing",
  puffedrice: "puffed rice",
  pumpkin: "pumpkin",
  pumpkinsabzi: "pumpkin sabzi",
  quartered: "quartered",
  "ragi+jowar+bajra": "ragi + jowar + bajra",
  ragiflour: "ragi flour",
  ragihalwa: "ragi halwa",
  ragikheer: "ragi kheer",
  raisins: "raisins",
  raita: "raita",
  rajma: "rajma",
  rajmacurry: "rajma curry",
  rava: "rava",
  reduced: "reduced",
  reheateduntilsteaming: "reheated until steaming",
  rice: "rice",
  ricekheer: "rice kheer",
  roastedchana: "roasted chana",
  roastedjeera: "roasted jeera",
  roastedmakhana: "roasted makhana",
  "rohu/catla": "rohu or catla",
  "rohu/sardine/indianmackerel-bangda": "rohu, sardine, or Indian mackerel (bangda)",
  rohufish: "rohu fish",
  rohufishcurry: "rohu fish curry",
  roti: "roti",
  salt: "salt",
  sambar: "sambar",
  sardinefish: "sardine fish",
  sardinefishcurry: "sardine fish curry",
  scrambledegg: "scrambled egg",
  seasonalfruit: "seasonal fruit",
  semolina: "semolina",
  sesame: "sesame",
  "sesameseeds-optional": "sesame seeds (optional)",
  shrikhand: "shrikhand",
  small: "small",
  smooth: "smooth",
  soaked: "soaked",
  spices: "spices",
  spinach: "spinach",
  spinachsabzi: "spinach sabzi",
  spinachstuffing: "spinach stuffing",
  sproutedmoong: "sprouted moong",
  steamed: "steamed",
  sujihalwa: "suji halwa",
  sujikheer: "suji kheer",
  sweetpotato: "sweet potato",
  tamarind: "tamarind",
  tempering: "tempering",
  thepla: "thepla",
  til: "til",
  tinda: "tinda",
  tomato: "tomato",
  tomatosauce: "tomato sauce",
  "toor+moong+masoor": "toor + moong + masoor",
  toordal: "toor dal",
  turmeric: "turmeric",
  uraddal: "urad dal",
  uraddalbatterwithvegetables: "urad dal batter with vegetables",
  uttapam: "uttapam",
  walnuts: "walnuts",
  water: "water",
  "water/milk": "water or milk",
  wheat: "wheat",
  wheatflour: "wheat flour",
  wheathalwa: "wheat halwa",
  wheatparatha: "wheat paratha",
  wheatroti: "wheat roti",
  wholewheatbread: "whole wheat bread",
  wholewheatflour: "whole wheat flour",
};

/** One meal (M110-ish, the sattu/roasted-chana one) whose ingredients cell
 *  isn't a plain list at all -- it's an age-gated instruction squeezed
 *  into the same field ("no whole chana before 4y, powder or mashed
 *  2-4y") -- so it gets its own full-string override rather than trying
 *  to force the generic token splitter onto it. */
const FULL_STRING_OVERRIDES: Record<string, string> = {
  "roastedchana(chickpeas);2-4y:groundtopowder(sattu)orboiledandmashed":
    "roasted chana (chickpeas) — 2–4 years: ground to powder (sattu) or boiled and mashed",
};

/** Splits on `,` and `;` at nesting depth 0, so a parenthesised aside like
 *  "mixedvegetables(carrot,pumpkin,beans)" stays one segment. */
function splitTopLevel(input: string, separators: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of input) {
    if (ch === "(") {
      depth += 1;
      current += ch;
    } else if (ch === ")") {
      depth -= 1;
      current += ch;
    } else if (depth === 0 && separators.includes(ch)) {
      parts.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  parts.push(current);
  return parts.map((p) => p.trim()).filter(Boolean);
}

/** A token the dictionary doesn't have outright, joined with `+` or `/`
 *  (both used in the source data for "either of these" or "combine
 *  these") -- looked up piece by piece so at least the known halves come
 *  back spaced, even when the whole compound isn't itself a table entry. */
function lookupToken(token: string): string | null {
  const key = token.trim().toLowerCase();
  if (key in INGREDIENT_LABELS) return INGREDIENT_LABELS[key];
  if (key.includes("+")) {
    return key
      .split("+")
      .map((p) => INGREDIENT_LABELS[p.trim()] ?? p.trim())
      .join(" + ");
  }
  if (key.includes("/")) {
    return key
      .split("/")
      .map((p) => INGREDIENT_LABELS[p.trim()] ?? p.trim())
      .join(" or ");
  }
  return null;
}

function formatSegment(segment: string): string {
  const parenMatch = segment.match(/^([^()]+)\((.*)\)$/);
  if (parenMatch) {
    const outer = lookupToken(parenMatch[1]) ?? parenMatch[1].trim().toLowerCase();
    const innerParts = splitTopLevel(parenMatch[2], ",");
    const inner = innerParts.map((p) => lookupToken(p) ?? p.trim().toLowerCase()).join(", ");
    return `${outer} (${inner})`;
  }
  return lookupToken(segment) ?? segment.trim().toLowerCase();
}

/**
 * "Moongdal,rice,ghee,turmeric,hing" -> "Moong dal, rice, ghee, turmeric,
 * hing" -- readable comma spacing, compound ingredient words split, and
 * an opening capital, without needing the workbook itself re-authored.
 */
export function formatIngredients(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const override = FULL_STRING_OVERRIDES[trimmed.toLowerCase()];
  if (override) return override[0].toUpperCase() + override.slice(1);
  const formatted = splitTopLevel(trimmed, ",;").map(formatSegment).join(", ");
  return formatted ? formatted[0].toUpperCase() + formatted.slice(1) : null;
}

/**
 * "Keeping it safe" (choking_modifications) and "By age"
 * (adaptation_guidance) are each several clauses semicolon-joined into
 * one workbook cell -- e.g. "Mash for children under 12 months; No added
 * salt for children under 12 months; minimal salt from 12–24 months".
 * Read fine as data, reads as a wall of text as one paragraph on a phone
 * screen. Splits into one clause per line instead; the clauses
 * themselves are already properly worded/spaced, so this is a pure
 * split, no dictionary needed.
 */
export function splitGuidanceClauses(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(";")
    .map((clause) => clause.trim())
    .filter(Boolean);
}
