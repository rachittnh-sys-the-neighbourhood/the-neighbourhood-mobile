import * as Sharing from "expo-sharing";
import { useEffect, useMemo, useRef, useState } from "react";
import { Linking, Platform, Pressable, Share, StyleSheet, Text, View } from "react-native";
import ViewShot from "react-native-view-shot";
import * as dyk from "../lib/db/dyk";
import type { DidYouKnowFact } from "../lib/db/types";
import { colors, fonts, homeType, palettes, radius, spacing, type } from "../lib/theme";
import { LightbulbIcon } from "./HomeTileIcons";
import { LogoMark } from "./Logo";

/** The one link every share carries — the app is a PWA hosted here, so
 *  this is the correct destination for someone who doesn't have the app
 *  yet, not an app-store link that doesn't exist. (app/welcome.tsx's own
 *  Terms/Privacy links point at theneighbourhood.in, a different domain
 *  — that looks like the stale one, tracked separately; this is the
 *  domain to treat as correct.) */
const SHARE_URL_LABEL = "theneighbourhood.co.in";

/** The actual tap target for the text-share fallback below — written out
 *  in full (https://www.…) rather than the bare label above, so it's a
 *  real link regardless of whether the recipient's app auto-linkifies a
 *  bare domain. The image footer keeps the bare label -- it's baked into
 *  a static PNG there and can never be tapped either way, so the shorter
 *  wording reads better. */
const SHARE_URL = `https://www.${SHARE_URL_LABEL}`;

/**
 * Home's "Did you know" tile — first thing on the screen.
 *
 * No per-card heading -- the v4 content workbook dropped that column
 * entirely, so the fact text is the whole card, with a small lightbulb
 * icon leading it instead of an eyebrow label. The one exception to
 * "only the fact text" is a research-based card (Species = Fact or
 * Research insight): that gets a small "Source" control the parent can
 * tap to reveal the citation. Everything else shows no source control at
 * all.
 *
 * "Share" shares the card as an actual IMAGE — heading, fact text, and
 * The Neighbourhood's own logo + website link baked into the picture —
 * rather than plain text, so it reads as branded content wherever it
 * lands (WhatsApp, Instagram, anywhere). It does this by rendering a
 * second, purpose-built copy of the card off-screen (see
 * ShareCardTemplate below — sized and laid out for sharing, not a literal
 * screenshot of the on-screen tile), capturing it with react-native-
 * view-shot, and handing the resulting PNG to expo-sharing's native
 * share sheet. If capture or image-sharing fails for any reason (or
 * isn't available on the platform, e.g. web), this falls back to a
 * plain-text share via React Native's own Share API, same as before.
 */
export function DidYouKnowTile({
  ageMonths,
  role,
  childId,
}: {
  ageMonths: number;
  role: "mother" | "father" | "prefer_not_to_say";
  /** Seeds which fact today's pick lands on (see lib/db/dyk.ts
   *  pickFactIndex) -- without this, every family with a similarly-aged
   *  child would see the literal identical fact on the same date. */
  childId: string;
}) {
  const [pool, setPool] = useState<DidYouKnowFact[] | null>(null);
  const [showSource, setShowSource] = useState(false);
  const [preparingShare, setPreparingShare] = useState(false);
  const shotRef = useRef<ViewShot>(null);

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

  // No manual "show me another one" control anymore -- pickFactIndex's
  // own day-seeded hash still rotates the fact day to day on its own,
  // this just no longer takes a within-session nudge on top of it.
  // childId's hash keeps that day-pick from being the literal same fact
  // for every family with a similarly-aged child.
  const fact = useMemo(() => {
    if (!pool || pool.length === 0) return null;
    return pool[dyk.pickFactIndex(pool.length, dyk.hashString(childId))];
  }, [pool, childId]);

  if (!fact) return null;

  const sourceLine = dyk.sourceLineFor(fact);
  const textMessage = `${fact.card_text}\n\nUnderstand their world before they have the words. Build your village at ${SHARE_URL}.`;

  const share = async () => {
    // Neither react-native-view-shot's capture nor expo-sharing's image
    // share work on web — there's no native layer for either to call
    // into, so isAvailableAsync() is reliably false there. Skipping
    // straight to the text share on web avoids mounting the hidden
    // template and waiting a frame for nothing; on native (iOS/Android,
    // including Expo Go) the capture attempt below is the real path.
    if (Platform.OS !== "web") {
      // Mount the hidden template, give it one frame to actually lay out
      // and render, then capture it. A failure anywhere in this half —
      // capture, or the image share itself — falls through to the
      // plain-text share below rather than leaving the parent with
      // nothing.
      let uri: string | undefined;
      try {
        setPreparingShare(true);
        await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 50)));
        uri = await shotRef.current?.capture?.();
      } catch {
        uri = undefined;
      } finally {
        setPreparingShare(false);
      }

      try {
        if (uri && (await Sharing.isAvailableAsync())) {
          await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: "Share" });
          return;
        }
      } catch {
        // Fall through to the text share below.
      }
    }

    try {
      await Share.share({ message: textMessage });
    } catch {
      // The share sheet itself failing (rather than just being
      // dismissed, which resolves normally) isn't worth surfacing as an
      // error — the fact is still right there on screen either way.
    }
  };

  return (
    <View style={styles.card}>
      {/* No eyebrow anymore -- the lightbulb leads the fact text itself,
          top-aligned with its first line. */}
      <View style={styles.factRow}>
        <LightbulbIcon size={16} color={palettes.parent.primary} />
        <Text style={[styles.text, styles.textFlex]}>{fact.card_text}</Text>
      </View>

      {/* Its own row beneath the text, right-aligned -- sits at the
          text block's own bottom-right corner rather than floating level
          with its first line. */}
      <View style={styles.shareRow}>
        <Pressable onPress={share} hitSlop={8}>
          <Text style={styles.link}>Share ›</Text>
        </Pressable>
      </View>

      {sourceLine && (
        <Pressable onPress={() => setShowSource((v) => !v)} hitSlop={8} style={styles.sourceToggle}>
          <Text style={styles.link}>{showSource ? "Hide source" : "Source"}</Text>
        </Pressable>
      )}

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

      {/* Off-screen — never visible to the parent, only ever captured.
          Positioned far outside the viewport rather than opacity/size-0,
          since some capture implementations need real, laid-out
          dimensions to photograph. Only mounted while actually sharing,
          so it costs nothing the rest of the time. */}
      {preparingShare && (
        <View style={styles.captureWrap} pointerEvents="none">
          <ViewShot ref={shotRef} options={{ format: "png", quality: 1 }}>
            <ShareCardTemplate factText={fact.card_text} />
          </ViewShot>
        </View>
      )}
    </View>
  );
}

/**
 * The image a share actually produces — deliberately its own layout, not
 * a screenshot of the on-screen tile: no "Another one"/"Share"/"Source"
 * controls (meaningless in a static image), and no heading either — just
 * the fact itself, which is the one thing worth sharing. The Neighbourhood's
 * own logo + a join-us line is permanently baked into the bottom, since
 * that's the whole point of sharing an image over plain text.
 */
function ShareCardTemplate({ factText }: { factText: string }) {
  return (
    <View style={styles.shareCard}>
      <View style={styles.shareInnerCard}>
        <Text style={styles.shareText}>{factText}</Text>
      </View>
      <View style={styles.shareFooter}>
        <LogoMark size={22} color={colors.warmTaupe} />
        <Text style={styles.shareFooterText}>
          Understand their world before they have the words. Build your village at{" "}
          {SHARE_URL_LABEL}.
        </Text>
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
    // Not a solid green fill -- the same soft tinted wash as the "For
    // dads"/ForYouCard tile below on Home (home.tsx forYouCard), so the
    // two read as using the same green language rather than one being a
    // heavier block than the other. The green itself only shows up as the
    // eyebrow/link accent color, same as that card.
    backgroundColor: "rgba(94, 115, 96, 0.08)",
  },
  text: {
    // homeType.bodyText's size, but Medium (500) rather than Regular --
    // no variable-weight font is loaded (only static 400/500/600/700
    // Inter files, see app/_layout.tsx), so an exact 450 isn't available;
    // Medium is the nearest weight up from the previous Regular.
    ...homeType.bodyText,
    fontFamily: fonts.bodyMedium,
    color: colors.charcoal,
  },
  textFlex: {
    flex: 1,
  },
  // The lightbulb leads the fact text -- no eyebrow anymore, so this is
  // the card's first row. Centered rather than top-aligned: the icon
  // reads as sitting in line with the text rather than pinned to its
  // first line specifically.
  factRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  // Right-aligned only -- Share sits at the text block's own
  // bottom-right corner, its own row rather than sharing one with the
  // text.
  shareRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  sourceToggle: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  link: {
    ...homeType.action,
    color: palettes.parent.primary,
  },
  sourceText: {
    ...homeType.meta,
    color: colors.textMuted,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  sourceLinkText: {
    textDecorationLine: "underline",
  },
  captureWrap: {
    position: "absolute",
    top: -10000,
    left: -10000,
  },
  shareCard: {
    width: 340,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.sageLight,
  },
  shareInnerCard: {
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.white,
  },
  shareText: {
    ...type.title,
    color: colors.charcoal,
  },
  shareFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  shareFooterText: {
    ...type.label,
    color: colors.warmTaupe,
    flex: 1,
  },
});
