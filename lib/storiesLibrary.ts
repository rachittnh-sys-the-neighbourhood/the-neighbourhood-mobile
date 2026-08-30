import rawStories from "../content/stories_library.json";
import type { AgeBand } from "./db/types";

/**
 * The read-aloud story library — 66 fixed stories for 0–3 years, sourced
 * from stories_0_to_3_years.xlsx. Static app content, not a Supabase
 * table: this never changes per-user or per-day, so it ships in the
 * bundle the same way lib/parentCare.ts's CARE_TOPICS does, rather than
 * round-tripping to the DB like activities/mother_activities/father_activities.
 *
 * age_band values are exactly the m0_3..m34_36 slice of
 * ACTIVITY_LIBRARY_AGE_BANDS (see lib/db/types.ts) — the story ages and the
 * child activity library's fine-grained bands happen to line up exactly.
 */
export type Story = {
  id: string;
  title: string;
  age_band: AgeBand;
  story_type: string;
  telling_minutes: number;
  story: string;
  repeating_line: string | null;
  how_they_join_in: string | null;
  how_to_tell_it: string | null;
  what_this_builds: string | null;
  hindi_words: string | null;
};

export const STORIES: Story[] = rawStories as Story[];

const byId = new Map(STORIES.map((s) => [s.id, s]));

export function storyById(id: string): Story | undefined {
  return byId.get(id);
}

export function storiesForAgeBand(ageBand: AgeBand): Story[] {
  return STORIES.filter((s) => s.age_band === ageBand);
}

/**
 * Curated: which activity in the child activity library (content/activity_library.csv)
 * is genuinely "read a story with your child", mapped to one specific story
 * from the library rather than the whole age band — tapping through opens
 * that one story, not a shelf to choose from. Hand-picked rather than
 * pattern-matched on "book" in materials, since most "book" mentions there
 * are a prop (a step to stand on, something to carry) rather than a story
 * to actually read.
 */
const ACTIVITY_STORY_LINK: Record<string, string> = {
  "read-aloud-m0_3": "chanda-mama-comes-to-see-you-m0_3",
  "reading-together-daily-m16_18": "the-thirsty-crow-m16_18",
  "show-empathy-books-m16_18": "the-lost-chappal-m16_18",
  "story-re-tell-m19_21": "the-big-big-turnip-m19_21",
  "story-prediction-m22_24": "where-does-the-sun-go-m22_24",
  "story-from-memory-m25_27": "titli-titli-the-butterfly-m25_27",
  "how-others-feel-m25_27": "the-broken-cup-m25_27",
  "storytelling-from-memory-m28_30": "kaun-aaya-who-came-to-the-door-m28_30",
  "simple-inference-m28_30": "the-big-feeling-m28_30",
  "retell-story-m34_36": "the-foolish-brahmin-and-the-pot-of-rice-m34_36",
};

/** The one story this activity links to, if it's a reading activity. */
export function storyForActivity(activityId: string): Story | undefined {
  const storyId = ACTIVITY_STORY_LINK[activityId];
  return storyId ? storyById(storyId) : undefined;
}

/** The 12 three-month bands the story library spans, in order. */
export const STORY_AGE_BANDS: AgeBand[] = [
  "m0_3",
  "m4_6",
  "m7_9",
  "m10_12",
  "m13_15",
  "m16_18",
  "m19_21",
  "m22_24",
  "m25_27",
  "m28_30",
  "m31_33",
  "m34_36",
];

/** Which of the library's bands a child's age falls into, clamped to the
 *  library's range — a newborn and a 5-year-old both get a real answer. */
export function storyAgeBandFor(childAgeMonths: number): AgeBand {
  const index = Math.min(Math.max(Math.floor(childAgeMonths / 3), 0), STORY_AGE_BANDS.length - 1);
  return STORY_AGE_BANDS[index];
}
