import { useEffect, useMemo, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import * as dyk from "../lib/db/dyk";
import type { DidYouKnowFact } from "../lib/db/types";
import { colors, radius, spacing, type } from "../lib/theme";

/**
 * Home's "Did you know" tile — first thing on the screen.
 *
 * The heading is ONLY the card's own dynamic lane ("THROUGH THEIR EYES",
 * "THAT IS SO US", …) — no literal "Did you know" boilerplate stacked in
 * front of it on every card — and it sits directly on the tile's own
 * lightly-tinted sage background. The actual fact content (text, source
 * controls) lives on a white sub-card nested inside, the same shape the
 * activities tile uses for its own rows. The one exception to "only the
 * fact text" is a research-based card (Species = Fact or Research
 * insight): that gets a small "Source" control the parent can tap to
 * reveal the citation. Everything else shows no source control at all.
 */
export function DidYouKnowTile({
  ageMonths,
  role,
}: {
  ageMonths: number;
  role: "mother" | "father" | "prefer_not_to_say";
}) {
  const [pool, setPool] = useState<DidYouKnowFact[] | null>(null);
  const [offset, setOffset] = useState(0);
  const [showSource, setShowSource] = useState(false);

  useEffect(() => {
    let alive = true;
    dyk
      .fetchAllFacts()
      .then((all) => {
        if (alive) setPool(dyk.factsForAge(all, ageMonths, role));
      })
      .catch(() => {
        if (alive) setPool([]);
      });
    return () => {
      alive = false;
    };
  }, [ageMonths, role]);

  const fact = useMemo(() => {
    if (!pool || pool.length === 0) return null;
    return pool[dyk.pickFactIndex(pool.length, offset)];
  }, [pool, offset]);

  if (!fact) return null;

  const sourceLine = dyk.sourceLineFor(fact);

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>{fact.lane ? fact.lane.toUpperCase() : "DID YOU KNOW"}</Text>

      <View style={styles.innerCard}>
        <Text style={styles.text}>{fact.card_text}</Text>

        <View style={styles.row}>
          <Pressable
            onPress={() => {
              setShowSource(false);
              setOffset((o) => o + 1);
            }}
            hitSlop={8}
          >
            <Text style={styles.link}>Another one ›</Text>
          </Pressable>

          {sourceLine && (
            <Pressable onPress={() => setShowSource((v) => !v)} hitSlop={8}>
              <Text style={styles.link}>{showSource ? "Hide source" : "Source"}</Text>
            </Pressable>
          )}
        </View>

        {showSource && sourceLine && (
          <Pressable
            disabled={!fact.source_url}
            onPress={() => fact.source_url && Linking.openURL(fact.source_url)}
          >
            <Text style={[styles.sourceText, fact.source_url && styles.sourceLinkText]}>
              {sourceLine}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // A tad-lighter tint of sage as the OUTER tile — the eyebrow sits
  // directly on it — with the actual fact content on a white sub-card
  // nested inside. Same "tinted outer / white inner" shape the
  // activities tile below uses for its own rows (see childSection +
  // ActivityCollapsedRow in home.tsx), so the two tiles read as siblings.
  card: {
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.sageLight,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(96, 79, 60, 0.08)",
  },
  eyebrow: {
    ...type.eyebrow,
    color: colors.charcoal,
    paddingHorizontal: spacing.xs,
  },
  innerCard: {
    marginTop: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.white,
  },
  text: {
    ...type.title,
    color: colors.charcoal,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    marginTop: spacing.md,
  },
  link: {
    ...type.label,
    color: colors.sageDark,
  },
  sourceText: {
    ...type.meta,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  sourceLinkText: {
    textDecorationLine: "underline",
  },
});
