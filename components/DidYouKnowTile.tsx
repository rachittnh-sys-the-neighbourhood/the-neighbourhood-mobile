import * as Sharing from "expo-sharing";
import { useEffect, useMemo, useRef, useState } from "react";
import { Linking, Platform, Pressable, Share, StyleSheet, Text, View } from "react-native";
import ViewShot from "react-native-view-shot";
import * as dyk from "../lib/db/dyk";
import type { DidYouKnowFact } from "../lib/db/types";
import { colors, fonts, palettes, radius, spacing, type } from "../lib/theme";
import { LogoMark } from "./Logo";

/** The one link every share carries — the app is a PWA hosted here (see
 *  app/welcome.tsx, which already links Terms/Privacy off this same
 *  domain), so this is the correct destination for someone who doesn't
 *  have the app yet, not an app-store link that doesn't exist. */
const SHARE_URL = "https://www.theneighbourhood.co.in";
const SHARE_URL_LABEL = "theneighbourhood.co.in";

/**
 * Home's "Did you know" tile — first thing on the screen.
 *
 * The heading is the card's own `header` field from the source workbook
 * (DidYouKnow_PRODUCTION_READY.xlsx's "Header" column — "Sound
 * familiar?", "Through their eyes", "Been there?", …) — NOT `lane`
 * (Food is fascinating / Children are fascinating / …), which is a
 * broader categorical tag, not a per-card heading. No literal "Did you
 * know" boilerplate stacked in front of it on every card, either way —
 * and it sits directly on the tile's own lightly-tinted sage background.
 * The actual fact content (text, source controls) lives on a white
 * sub-card nested inside, the same shape the activities tile uses for
 * its own rows. The one exception to "only the fact text" is a
 * research-based card (Species = Fact or Research insight): that gets a
 * small "Source" control the parent can tap to reveal the citation.
 * Everything else shows no source control at all.
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
}: {
  ageMonths: number;
  role: "mother" | "father" | "prefer_not_to_say";
}) {
  const [pool, setPool] = useState<DidYouKnowFact[] | null>(null);
  const [offset, setOffset] = useState(0);
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

  const fact = useMemo(() => {
    if (!pool || pool.length === 0) return null;
    return pool[dyk.pickFactIndex(pool.length, offset)];
  }, [pool, offset]);

  if (!fact) return null;

  const sourceLine = dyk.sourceLineFor(fact);
  const heading = fact.header || "Did you know?";
  const textMessage = `${heading}\n${fact.card_text}\n\nPowered by The Neighbourhood — ${SHARE_URL}`;

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
      <Text style={styles.eyebrow}>{heading.toUpperCase()}</Text>

      <Text style={styles.text}>{fact.card_text}</Text>

      <View style={styles.row}>
        <View style={styles.rowLeft}>
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

        {/* Bottom-right, apart from "Another one"/"Source" — a
            separate, less-frequent action, not one more item in the
            same row of controls. */}
        <Pressable onPress={share} hitSlop={8}>
          <Text style={styles.link}>Share ›</Text>
        </Pressable>
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

      {/* Off-screen — never visible to the parent, only ever captured.
          Positioned far outside the viewport rather than opacity/size-0,
          since some capture implementations need real, laid-out
          dimensions to photograph. Only mounted while actually sharing,
          so it costs nothing the rest of the time. */}
      {preparingShare && (
        <View style={styles.captureWrap} pointerEvents="none">
          <ViewShot ref={shotRef} options={{ format: "png", quality: 1 }}>
            <ShareCardTemplate heading={heading} factText={fact.card_text} />
          </ViewShot>
        </View>
      )}
    </View>
  );
}

/**
 * The image a share actually produces — deliberately its own layout, not
 * a screenshot of the on-screen tile: no "Another one"/"Share"/"Source"
 * controls (meaningless in a static image), and The Neighbourhood's own
 * logo + website link permanently baked into the bottom, since that's
 * the whole point of sharing an image over plain text.
 */
function ShareCardTemplate({ heading, factText }: { heading: string; factText: string }) {
  return (
    <View style={styles.shareCard}>
      <Text style={styles.shareEyebrow}>{heading.toUpperCase()}</Text>
      <View style={styles.shareInnerCard}>
        <Text style={styles.shareText}>{factText}</Text>
      </View>
      <View style={styles.shareFooter}>
        <LogoMark size={22} color={colors.warmTaupe} />
        <Text style={styles.shareFooterText}>The Neighbourhood · {SHARE_URL_LABEL}</Text>
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
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(60, 80, 62, 0.16)",
  },
  eyebrow: {
    ...type.eyebrow,
    color: palettes.parent.primary,
    paddingHorizontal: spacing.xs,
  },
  text: {
    // Same size/line-height as type.title, just not bold -- the fact
    // itself doesn't need to shout, and the lighter weight reads as more
    // spacious even at the same line count.
    fontFamily: fonts.bodyMedium,
    fontSize: type.title.fontSize,
    lineHeight: type.title.lineHeight,
    color: colors.charcoal,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.md,
    flexShrink: 1,
  },
  link: {
    ...type.label,
    color: palettes.parent.primary,
  },
  sourceText: {
    ...type.meta,
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
  shareEyebrow: {
    ...type.eyebrow,
    color: colors.charcoal,
  },
  shareInnerCard: {
    marginTop: spacing.sm,
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
  },
});
