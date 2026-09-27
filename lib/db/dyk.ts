import { supabase, unwrap } from "./client";
import type { DidYouKnowFact } from "./types";

/**
 * Home's "Did you know" tile -- see supabase/migrations/
 * 20260910091000_did_you_know_facts.sql.
 *
 * The heading is dynamic (the calling screen composes it from the lane —
 * "DID YOU KNOW · Through their eyes" — or falls back to a plain "DID YOU
 * KNOW"); the visible card shows only the fact text itself. The one
 * exception: a card whose Species is "Fact" or "Research insight"
 * (is_research_based) gets a "Source" control the parent can tap, which
 * reveals the citation. Every other card (the large majority — plain
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

/** Same deterministic day-index rotation every other rotating card in the
 *  app uses (see home.tsx). "Another one" advances the SAME session's
 *  local index by one instead of waiting for tomorrow. */
export function pickFactIndex(poolLength: number, offset: number): number {
  if (poolLength === 0) return 0;
  const dayIndex = Math.floor(Date.now() / 86_400_000);
  return (dayIndex + offset) % poolLength;
}

/** The line to show under the eyebrow when a research-based card's
 *  source is expanded -- citation first, falling back to a plain
 *  "peer-reviewed source" note when only a URL (no citation text) is on
 *  file, and never showing raw evidence-level letters to a parent. */
export function sourceLineFor(fact: DidYouKnowFact): string | null {
  if (!fact.is_research_based) return null;
  return fact.source_citation || (fact.source_url ? "See source" : null);
}
