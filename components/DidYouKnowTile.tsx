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
 * front of it on every card. The visible card body shows only the fact
 * text itself — no theme, no age range clutter. The one exception is a
 * research-based card (Species = Fact or Research insight): that gets a
 * small "Source" control the parent can tap to reveal the citation.
 * Everything else shows no source control at all.
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
  );
}

const styles = StyleSheet.create({
  // Solid sage — the green from the original mockup, now here rather than
  // on the activities tile (see childSection in home.tsx, which took a
  // darker warm sand instead). Link/source colors below are charcoal-
  // based rather than sageDark, which would nearly vanish on this bg.
  card: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.sage,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(96, 79, 60, 0.08)",
  },
  eyebrow: {
    ...type.eyebrow,
    color: colors.charcoal,
  },
  text: {
    ...type.title,
    color: colors.charcoal,
    marginTop: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    marginTop: spacing.md,
  },
  link: {
    ...type.label,
    color: colors.warmTaupe,
  },
  sourceText: {
    ...type.meta,
    color: colors.charcoal,
    marginTop: spacing.sm,
  },
  sourceLinkText: {
    textDecorationLine: "underline",
  },
});
