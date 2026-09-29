import { supabase, unwrap } from "./client";
import type { DidYouKnowFact } from "./types";

/**
 * Home's "Did you know" tile -- see supabase/migrations/
 * 20260929100000_did_you_know_facts_v4_refresh.sql.
 *
 * No per-card heading -- the v4 workbook dropped that column entirely, so
 * the visible card shows only the fact text itself. The one exception: a
 * card whose Species is "Fact" or "Research insight" (is_research_based)
 * gets a "Source" control the parent can tap, which reveals the
 * citation. Every other card (the large majority — plain
 * human-observation facts) shows no source control at all, because there
 * is no source to show.
 */

let cache: DidYouKnowFact[] | null = null;

export async function fetchAllFacts(): Promise<DidYouKnowFact[]> {
  if (cache) return cache;
  const rows = unwrap<DidYouKnowFact[]>(
    "dyk.fetchAllFacts",
    await supabase.from("did_you_know_facts").select("*")
  );
  cache = rows;
  return rows;
}

export function _resetFactsCacheForTests(): void {
  cache = null;
}

/**
 * The pool relevant to this child right now: age-appropriate (a prenatal
 * card, age_min_months === -9, only counts before birth, which never
 * applies once there's a child profile at all) and generally addressed to
 * "All parents" — plus role-specific cards (a handful are "Fathers"-only)
 * when they apply.
 */
export function factsForAge(
  allFacts: DidYouKnowFact[],
  ageMonths: number,
  role: "mother" | "father" | "prefer_not_to_say"
): DidYouKnowFact[] {
  return allFacts.filter((fact) => {
    if (fact.age_min_months < 0) return false; // prenatal-only, not relevant post-birth
    if (ageMonths < fact.age_min_months || ageMonths > fact.age_max_months) return false;
    if (fact.audience.includes("All parents")) return true;
    if (role === "father" && fact.audience.includes("Fathers")) return true;
    return false;
  });
}

/**
 * Deterministic day-index rotation, same idea every other rotating card
 * in the app uses (see home.tsx) -- one pick per calendar day, so the
 * card doesn't change mid-session or on every reload.
 *
 * `familySeed` (a hash of the child's id, see hashString below) mixes
 * into the same seed as the day index -- without it, every family with a
 * similarly-aged child sees the literal identical fact on the same date,
 * which is the opposite of "random." With it, two families land on
 * different, still-day-stable picks.
 *
 * Hashed rather than used directly as `(dayIndex + familySeed) %
 * poolLength`: the table is naturally grouped by lane/theme (rows for
 * one lane sit together), so walking the pool sequentially meant many
 * consecutive days landing in the same lane before moving to the next.
 * That read as repetitive rather than varied. Hashing the seed spreads
 * picks across the whole pool while staying fully deterministic: same
 * day, same family, same card.
 */
export function pickFactIndex(poolLength: number, familySeed: number): number {
  if (poolLength === 0) return 0;
  const dayIndex = Math.floor(Date.now() / 86_400_000);
  return hashToIndex(dayIndex + familySeed, poolLength);
}

/** Turns a child id (or any string) into a small integer seed for
 *  pickFactIndex -- so the per-day pick varies by family. */
export function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h;
}

/** A small integer hash (a variant of Murmur3's finalizer) turning a
 *  plain incrementing seed into a well-spread pseudo-random index. */
function hashToIndex(seed: number, mod: number): number {
  let h = seed ^ 0x9e3779b9;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h = h ^ (h >>> 16);
  return Math.abs(h) % mod;
}

/** The source workbook's own cross-reference to its separate "Sources
 *  Referenced" sheet failed for 64 of the 850 rows (all "Fact"/"Research
 *  insight", none with a source_url either) -- rather than a real
 *  citation, `source_citation` for those is literally the workbook's own
 *  broken-join placeholder text. Treated as "no citation on file", not a
 *  citation to show a parent. */
const BROKEN_CITATION = "source id not found";

/** The line to show under the eyebrow when a research-based card's
 *  source is expanded -- citation first, falling back to a plain
 *  "peer-reviewed source" note when only a URL (no citation text) is on
 *  file, and never showing raw evidence-level letters to a parent. Null
 *  means "no Source control at all" (see DidYouKnowTile) -- we only ever
 *  offer to show a source when one is actually on file. */
export function sourceLineFor(fact: DidYouKnowFact): string | null {
  if (!fact.is_research_based) return null;
  const citation = fact.source_citation?.trim();
  if (citation && citation.toLowerCase() !== BROKEN_CITATION) return citation;
  return fact.source_url ? "See source" : null;
}
