import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { ActivityVideo } from "./ActivityVideo";
import { kitItemsFor } from "../lib/devKit";
import { DOMAIN_LABEL, type Activity, type Domain } from "../lib/db/types";
import { storyForActivity } from "../lib/storiesLibrary";
import { colors, radius, spacing, type } from "../lib/theme";

/**
 * The day's activity cards — shared between Home and the Child hub so
 * both present the same WHAT / HOW / WHY, collapsed-by-default
 * interaction (see app/(tabs)/home.tsx and app/(tabs)/child/index.tsx).
 * Previously lived only in home.tsx; lifted out rather than duplicated.
 */

/**
 * A short, honest fallback for the rare activity whose source content had
 * no genuine rationale sentence to split out (see
 * scripts/gen-activity-library-seed.mjs) — a true domain-level statement
 * rather than a fabricated per-activity claim.
 */
const DOMAIN_BENEFIT_FALLBACK: Record<Domain, string> = {
  motor: "Small movements like this build coordination and body confidence.",
  communication: "Moments like this are how language and connection grow together.",
  cognitive: "Simple exploration like this is how early problem-solving develops.",
  social_emotional: "Everyday moments like this build trust and emotional security.",
};

/** Collapsed — enough to understand what it is, not the full detail. */
export function ActivityCollapsedRow({
  activity,
  onPress,
}: {
  activity: Activity;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
      accessibilityRole="button"
      accessibilityLabel={`Open ${activity.title}`}
    >
      <View style={styles.rowDot} />
      <View style={styles.rowText}>
        <Text style={styles.rowDomain}>{DOMAIN_LABEL[activity.domain]}</Text>
        <Text style={styles.rowTitle}>{activity.title}</Text>
      </View>
      <View style={styles.rowMeta}>
        <Text style={styles.rowDuration}>
          {activity.duration_label ?? `${activity.duration_minutes} min`}
        </Text>
        <ChevronRight />
      </View>
    </Pressable>
  );
}

/**
 * Once every domain for the day is done, the list of rows has nothing left
 * to act on, so it folds into this single card — the day's result without
 * the clutter. Still tappable: reopens the full list to look back at what
 * was done. Shared between Home and the Child hub, same as the rows above.
 */
export function EndOfDay({
  childName,
  collapsed,
  onToggle,
}: {
  childName: string;
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      onPress={onToggle}
      style={({ pressed }) => [styles.endCard, pressed && { opacity: 0.7 }]}
      accessibilityRole="button"
      accessibilityLabel={collapsed ? "Show today's four activities" : "Hide today's activities"}
    >
      {/* No title here — callers that want a headline show it themselves
          (see Home's "Nicely done today."); repeating it read as the same
          sentence twice. */}
      <Text style={styles.endBody}>
        Motor, communication, cognitive and social. {childName} had a bit of each today.
      </Text>
      <Text style={styles.endToggle}>{collapsed ? "Show what we did ›" : "Hide"}</Text>
    </Pressable>
  );
}

/** Done, and staying visible — quieter, but not struck through or greyed out.
 *  Still opens on tap: finishing an activity shouldn't lock the parent out of
 *  the steps they just followed, or of doing it a second time. */
export function ActivityDoneRow({
  activity,
  onPress,
}: {
  activity: Activity;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, styles.rowDone, pressed && { opacity: 0.5 }]}
      accessibilityRole="button"
      accessibilityLabel={`Open ${activity.title}, completed`}
    >
      <CheckIcon />
      <View style={styles.rowText}>
        <Text style={styles.rowDomainDone}>{DOMAIN_LABEL[activity.domain]}</Text>
        <Text style={styles.rowTitleDone} numberOfLines={1}>
          {activity.title}
        </Text>
      </View>
      <ChevronRight />
    </Pressable>
  );
}

/**
 * The one activity Home leads with — prominent, but compact, and not a
 * full detail view. Category, title and duration are all a parent needs
 * to decide whether to open it; HOW, WHY, and the Done button live one
 * tap away, inside the same ActivityExpandedCard the collapsed rows
 * already use. Done is deliberately NOT offered here — logging an
 * activity you haven't actually opened would let a parent mark something
 * complete without ever reading it, which is worse for the recommendation
 * signal Done exists to feed, not just worse UX.
 *
 * The "more ideas" toggle is the one action this collapsed state does
 * offer, since picking a different activity doesn't require opening this
 * one first.
 */
export function FeaturedActivityCard({
  activity,
  highlighted = false,
  moreIdeasCount,
  moreIdeasOpen,
  onOpen,
  onToggleMoreIdeas,
}: {
  activity: Activity;
  highlighted?: boolean;
  /** Activities not shown here, tucked behind the toggle. 0 hides it. */
  moreIdeasCount: number;
  moreIdeasOpen: boolean;
  onOpen: () => void;
  onToggleMoreIdeas: () => void;
}) {
  return (
    <View style={[styles.card, styles.featuredCard, highlighted && styles.tourHighlight]}>
      <Pressable
        onPress={onOpen}
        style={styles.cardHeader}
        accessibilityRole="button"
        accessibilityLabel={`Open ${activity.title}`}
      >
        <View style={styles.cardCopy}>
          <Text style={styles.domainLabel}>{DOMAIN_LABEL[activity.domain].toUpperCase()}</Text>
          <Text style={styles.featuredTitle}>{activity.title}</Text>
        </View>
        <View style={styles.featuredMeta}>
          <View style={styles.duration}>
            <ClockIcon />
            <Text style={styles.durationText}>
              {activity.duration_label ?? `${activity.duration_minutes} min`}
            </Text>
          </View>
          {/* The only cue that this header is tappable — the chevron
              alone read as decoration, so it's paired with the words it's
              pointing at. */}
          <View style={styles.featuredTapRow}>
            <Text style={styles.featuredTapHint}>Tap for how &amp; why</Text>
            <ChevronRight />
          </View>
        </View>
      </Pressable>

      {moreIdeasCount > 0 && (
        <Pressable
          onPress={onToggleMoreIdeas}
          style={({ pressed }) => [styles.moreIdeasRow, pressed && { opacity: 0.6 }]}
          accessibilityRole="button"
          accessibilityLabel={moreIdeasOpen ? "Hide more ideas" : "Show more ideas"}
        >
          <Text style={styles.moreIdeasRowText}>
            {moreIdeasOpen
              ? "Fewer ideas"
              : `${moreIdeasCount} more ${moreIdeasCount === 1 ? "idea" : "ideas"} for today`}
          </Text>
          <View style={moreIdeasOpen && styles.moreIdeasChevronOpen}>
            <ChevronRight />
          </View>
        </Pressable>
      )}
    </View>
  );
}

/** Opened on tap — WHAT is already visible above (the collapsed row); this
 *  adds HOW, WHY THIS MATTERS, an optional trust marker, and what's needed. */
export function ActivityExpandedCard({
  activity,
  canSwap,
  highlighted = false,
  isDone = false,
  onComplete,
  onSwap,
  onCollapse,
}: {
  activity: Activity;
  canSwap: boolean;
  highlighted?: boolean;
  /** Already completed today — reopened to re-read, not to re-log. */
  isDone?: boolean;
  onComplete: () => void;
  onSwap: () => void;
  onCollapse: () => void;
}) {
  const router = useRouter();
  // Matched on the activity's own band rather than the child's, so a
  // swapped-in activity for an adjacent stage still suggests the right thing.
  const kitItem = kitItemsFor(activity.materials, activity.age_band)[0];
  const story = storyForActivity(activity.id);
  const steps = (activity.instructions ?? "")
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*\d+[.)]\s*/, "").trim())
    .filter(Boolean);

  return (
    <View style={[styles.card, highlighted && styles.tourHighlight]}>
      {/* PROTOTYPE: only "Reach for it" has a clip right now. */}
      {activity.title === "Reach for it" && <ActivityVideo style={styles.activityVideo} />}
      <Pressable onPress={onCollapse} style={styles.cardHeader} accessibilityRole="button" accessibilityLabel="Collapse">
        <View style={styles.cardCopy}>
          <Text style={styles.domainLabel}>{DOMAIN_LABEL[activity.domain].toUpperCase()}</Text>
          <Text style={styles.title}>{activity.title}</Text>
        </View>
        <View style={styles.duration}>
          <ClockIcon />
          <Text style={styles.durationText}>
            {activity.duration_label ?? `${activity.duration_minutes} min`}
          </Text>
        </View>
      </Pressable>

      {steps.length > 0 && (
        <View style={styles.howBlock}>
          <Text style={styles.blockLabel}>HOW</Text>
          {steps.map((step) => (
            <View key={step} style={styles.stepRow}>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>
      )}

      {/* WHY THIS MATTERS — genuinely new information, not a repeat of WHAT. */}
      <View style={styles.whyMattersBlock}>
        <Text style={styles.blockLabel}>WHY THIS MATTERS</Text>
        <Text style={styles.whyMattersText}>
          {activity.benefit ?? DOMAIN_BENEFIT_FALLBACK[activity.domain]}
        </Text>
      </View>

      {/* What you'll need. The household answer comes first and is the
          primary text — nothing here is a shopping list, and the activity
          works without owning anything. */}
      <View style={styles.needBlock}>
        <Text style={styles.blockLabel}>WHAT YOU&rsquo;LL NEED</Text>
        <Text style={styles.needPrimary}>{activity.materials}</Text>
        {kitItem && <Text style={styles.needAlt}>{kitItem.household}</Text>}
        {kitItem && (
          <Pressable
            onPress={() => router.push("/child/kit")}
            hitSlop={6}
            style={({ pressed }) => pressed && { opacity: 0.55 }}
          >
            <Text style={styles.kitNote}>
              We also make one: {kitItem.name.toLowerCase()} ›
            </Text>
          </Pressable>
        )}
      </View>

      {/* One specific story, not the whole library — see
          lib/storiesLibrary.ts storyForActivity. Only the handful of
          activities that are genuinely "read a story with your child"
          carry a link here. */}
      {story && (
        <Pressable
          onPress={() => router.push(`/child/story/${story.id}`)}
          style={styles.storyLinkBlock}
          accessibilityRole="button"
          accessibilityLabel={`Read the story: ${story.title}`}
        >
          <View style={styles.storyLinkCopy}>
            <Text style={styles.blockLabel}>STORY TO TRY</Text>
            <Text style={styles.storyLinkTitle}>{story.title}</Text>
          </View>
          <ChevronRight />
        </Pressable>
      )}

      <View style={styles.actionRow}>
        {isDone ? (
          // Already logged today. Shown as a quiet marker rather than a live
          // button so a second tap can't double-log the same activity.
          <View style={styles.doneMarker}>
            <CheckIcon />
            <Text style={styles.doneMarkerText}>Done today</Text>
          </View>
        ) : (
          <Pressable
            style={styles.activityButton}
            onPress={onComplete}
            accessibilityRole="button"
            accessibilityLabel={`Mark ${activity.title} done`}
          >
            <Text style={styles.activityButtonText}>Done</Text>
          </Pressable>
        )}
        {canSwap && !isDone && (
          <Pressable
            onPress={onSwap}
            style={styles.swapButton}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel="Show a different activity"
          >
            <RefreshIcon />
          </Pressable>
        )}
      </View>
    </View>
  );
}

function ClockIcon() {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 7v5.5l3.5 2M20.5 12a8.5 8.5 0 1 1-17 0 8.5 8.5 0 0 1 17 0Z"
        stroke={colors.textMuted}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function RefreshIcon() {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4v4.2h-4.2"
        stroke={colors.warmTaupe}
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CheckIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4.5 12.5 9.5 17.5 19.5 6.5"
        stroke={colors.sage}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ChevronRight() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 5l7 7-7 7"
        stroke={colors.textMuted}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md - 1,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowDone: {
    opacity: 0.78,
  },
  rowDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginHorizontal: 4,
    backgroundColor: colors.softSand,
  },
  rowText: { flex: 1 },
  rowMeta: {
    alignItems: "flex-end",
    gap: 2,
  },
  rowDomain: {
    ...type.eyebrow,
    color: colors.warmTaupe,
  },
  rowTitle: {
    ...type.label,
    color: colors.charcoal,
    marginTop: 1,
  },
  rowDuration: {
    ...type.meta,
    color: colors.textMuted,
  },
  rowDomainDone: {
    ...type.eyebrow,
    color: colors.textMuted,
  },
  rowTitleDone: {
    ...type.body,
    color: colors.textMuted,
    marginTop: 1,
  },

  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.charcoal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 2,
  },
  tourHighlight: {
    borderWidth: 1,
    borderColor: colors.warmTaupe,
    shadowOpacity: 0.14,
    shadowRadius: 28,
    elevation: 6,
  },
  // Same card shell as the full expanded view, just without its HOW/WHY
  // sections — that's what makes it read as "one thing to act on" rather
  // than a fifth kind of surface to learn. Tighter padding and gap than
  // the shared `card` style so it reads closer to a single collapsed row
  // plus a button than a scaled-down detail card.
  featuredCard: {
    padding: spacing.sm + 2,
  },
  // Full `title` weight, same as the collapsed and expanded views. This
  // was previously two steps smaller than the "For you" card's heading,
  // which inverted the hierarchy: the day's one suggested activity read
  // as less important than an article recommendation beneath it.
  featuredTitle: {
    ...type.title,
    color: colors.charcoal,
  },
  featuredMeta: {
    alignItems: "flex-end",
    gap: 2,
  },
  // A parent who's never opened this card has no reason to assume the
  // header is tappable — the chevron alone was too easy to miss the first
  // time, so this spells it out once, right-aligned under the duration
  // it sits beneath.
  featuredTapRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: 1,
  },
  featuredTapHint: {
    ...type.meta,
    color: colors.textMuted,
  },
  // A footer row rather than a floating pill — full-width and divided by
  // a hairline, so it reads as part of the card instead of a stray
  // control sitting in leftover space beside it.
  moreIdeasRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 40,
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  moreIdeasRowText: {
    ...type.label,
    color: colors.warmTaupe,
  },
  // Points down instead of right once the list is open, so the chevron
  // still reads as "this is what happens if you tap" rather than dangling
  // in its collapsed direction.
  moreIdeasChevronOpen: {
    transform: [{ rotate: "90deg" }],
  },
  domainLabel: {
    ...type.eyebrow,
    color: colors.warmTaupe,
    marginBottom: 3,
  },
  title: {
    ...type.title,
    color: colors.charcoal,
  },
  blockLabel: {
    ...type.eyebrow,
    color: colors.warmTaupe,
    marginBottom: spacing.sm,
  },
  howBlock: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  stepRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  stepText: {
    flex: 1,
    ...type.body,
    color: colors.textMuted,
  },
  whyMattersBlock: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  whyMattersText: {
    ...type.body,
    color: colors.textMuted,
  },
  needBlock: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  needPrimary: {
    ...type.label,
    color: colors.charcoal,
  },
  needAlt: {
    ...type.body,
    color: colors.textMuted,
    marginTop: 2,
  },
  kitNote: {
    ...type.meta,
    color: colors.warmTaupe,
    marginTop: spacing.sm,
  },
  storyLinkBlock: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  storyLinkCopy: { flex: 1 },
  storyLinkTitle: {
    ...type.label,
    color: colors.charcoal,
    marginTop: 2,
  },
  activityVideo: {
    width: "100%",
    aspectRatio: 16 / 9,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  cardCopy: { flex: 1 },
  duration: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  durationText: {
    ...type.meta,
    color: colors.textMuted,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  activityButton: {
    minWidth: 64,
    minHeight: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.warmTaupe,
  },
  activityButtonText: {
    ...type.label,
    color: colors.white,
  },
  doneMarker: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 40,
  },
  doneMarkerText: {
    ...type.label,
    color: colors.textMuted,
  },
  swapButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  endCard: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: "rgba(168, 181, 164, 0.20)",
  },
  endBody: {
    ...type.body,
    color: colors.textMuted,
  },
  endToggle: {
    ...type.label,
    color: colors.warmTaupe,
    marginTop: spacing.sm,
  },
});
