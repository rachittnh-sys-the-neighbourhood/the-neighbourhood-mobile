import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { MotherActivity } from "../lib/db/types";
import { getTodaysCompletionCount, recordCompanionThreadCompletion } from "../lib/companionThread";
import { usePalette } from "../lib/ModeProvider";
import { fonts, radius, spacing, typeScale } from "../lib/theme";

/**
 * The You hub's "companion thread" -- a quiet nudge that offers today's
 * physical_recovery activity, rather than a separate browsable card the
 * way the other three categories still work. Deliberately the ONLY place
 * physical recovery surfaces on the hub now -- see
 * app/(tabs)/you/index.tsx's own notes on why "One idea for today" was
 * retired.
 *
 * Renders INSIDE MoodCheckInCard (passed as its `children`), not as its
 * own card underneath it -- the whole point of "while you're here" is
 * that it reads as a continuation of the check-in she's already
 * answering, not a second ask competing for attention right below it.
 * This component renders no outer Card/border of its own; it's a plain
 * section with a top divider, matching whatever's already inside that
 * card.
 *
 * Two shapes, picked by which dosing fields the activity carries (see
 * 20261002120000_mother_physical_recovery_dosing.sql -- a row never has
 * both):
 *
 * - `weekly_target_sessions` set: a longer, cleared, fitness-building
 *   session (a walk, a strength workout). Too long for an inline "do it
 *   now" -- shown as a quiet preview with its weekly cadence line,
 *   linking out to the full activity screen rather than expanding here.
 * - Otherwise (including every plain, undosed row -- a stretch, a scar
 *   massage routine, anything from months 1-3): an inline "While you're
 *   here" offer. Tapping it expands the steps right in this card, no
 *   navigation. `repeat_times_per_day` (when set) is the only thing that
 *   changes -- it raises today's cap above the implicit 1, so the same
 *   card can be offered again later today after being marked done.
 *
 * No "X of Y" anywhere, on purpose -- see the design discussion this
 * carries forward: a visible count either implies a backlog or becomes
 * its own small scoreboard, both of which this app avoids everywhere
 * else (see home.tsx's own "no streak, no score" note). The cap is
 * enforced silently via lib/companionThread.ts's local, device-only
 * count; once it's reached, this card simply renders nothing further
 * today -- no closing "all done" message either, same quiet default.
 */
export function CompanionThreadCard({
  activity,
  onSwap,
  swapping,
}: {
  activity: MotherActivity | null;
  onSwap: () => void;
  swapping: boolean;
}) {
  const p = usePalette();
  const router = useRouter();
  const [count, setCount] = useState<number | null>(null);
  const [phase, setPhase] = useState<"offer" | "expanded" | "logged" | "later">("offer");

  useEffect(() => {
    if (!activity) return;
    let alive = true;
    setCount(null);
    setPhase("offer");
    getTodaysCompletionCount(activity.id).then((n) => {
      if (alive) setCount(n);
    });
    return () => {
      alive = false;
    };
  }, [activity?.id]);

  if (!activity || count === null) return null;

  const isWeekly = activity.weekly_target_sessions != null;
  const cap = activity.repeat_times_per_day ?? 1;

  // The cap is reached for today -- quiet by design, no closing message.
  // `phase !== "logged"` matters here: marking the last one done this
  // session pushes count to (or past) cap in the same render pass that
  // sets phase to "logged" -- without this exception the confirmation
  // would never actually show, the card would just vanish the instant
  // she taps "Mark done". A fresh mount (reopening the app) always starts
  // at phase "offer" again, so this only keeps today's final confirmation
  // visible for the rest of THIS visit, not forever.
  if (!isWeekly && count >= cap && phase !== "logged") return null;

  if (isWeekly) {
    return (
      <View style={[styles.wrap, { borderTopColor: p.border }]}>
        <Text style={[styles.offerText, { color: p.textMuted }]}>Today's pick</Text>
        <Text style={[styles.title, { color: p.text }]}>{activity.title}</Text>
        <Text style={[styles.body, { color: p.textMuted }]}>
          {activity.short_description ?? activity.description}
        </Text>
        {activity.weekly_target_note && (
          <Text style={[styles.weeklyNote, { color: p.primary }]}>{activity.weekly_target_note}</Text>
        )}
        <View style={styles.actionRow}>
          <Pressable
            onPress={() => router.push(`/you/activity/${activity.id}`)}
            style={[styles.primaryButton, { backgroundColor: p.primary }]}
          >
            <Text style={[styles.primaryButtonText, { color: p.surface }]}>See how</Text>
          </Pressable>
          <Pressable disabled={swapping} onPress={onSwap}>
            <Text style={[styles.linkText, { color: p.primary }]}>
              {swapping ? "Swapping…" : "Something else"}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const markDone = async () => {
    const next = await recordCompanionThreadCompletion(activity.id);
    setCount(next);
    setPhase("logged");
  };

  return (
    <View style={[styles.wrap, { borderTopColor: p.border }]}>
      {phase === "offer" && (
        <>
          <Text style={[styles.offerText, { color: p.text }]}>
            <Text style={{ fontFamily: fonts.bodySemiBold }}>While you're here</Text> —{" "}
            {(activity.short_description ?? activity.description).replace(/\.$/, "")}?
          </Text>
          <View style={styles.actionRow}>
            <Pressable
              onPress={() => setPhase("expanded")}
              style={[styles.primaryButton, { backgroundColor: p.primary }]}
            >
              <Text style={[styles.primaryButtonText, { color: p.surface }]}>Do it now</Text>
            </Pressable>
            <Pressable onPress={() => setPhase("later")} style={styles.secondaryButton}>
              <Text style={[styles.secondaryButtonText, { color: p.textMuted, borderColor: p.border }]}>
                Maybe later
              </Text>
            </Pressable>
          </View>
          <Pressable disabled={swapping} onPress={onSwap} style={styles.somethingElseRow}>
            <Text style={[styles.linkText, { color: p.primary }]}>
              {swapping ? "Swapping…" : "Something else"}
            </Text>
          </Pressable>
        </>
      )}

      {phase === "expanded" && (
        <>
          <Text style={[styles.title, { color: p.text }]}>{activity.title}</Text>
          {activity.steps && activity.steps.length > 0 && (
            <View style={styles.stepsWrap}>
              {activity.steps.map((step, index) => (
                <View key={index} style={styles.stepRow}>
                  <View style={[styles.stepNumber, { backgroundColor: p.surfaceAlt }]}>
                    <Text style={[styles.stepNumberText, { color: p.primary }]}>{index + 1}</Text>
                  </View>
                  <Text style={[styles.stepText, { color: p.text }]}>{step}</Text>
                </View>
              ))}
            </View>
          )}
          {activity.repeat_note && (
            <Text style={[styles.repeatNote, { color: p.textMuted }]}>{activity.repeat_note}</Text>
          )}
          <Pressable onPress={markDone} style={[styles.primaryButton, styles.fullWidthButton, { backgroundColor: p.primary }]}>
            <Text style={[styles.primaryButtonText, { color: p.surface }]}>
              {cap > 1 ? "Mark set done" : "Mark done"}
            </Text>
          </Pressable>
          <Pressable onPress={() => setPhase("offer")}>
            <Text style={[styles.notNowText, { color: p.textMuted }]}>Not now</Text>
          </Pressable>
        </>
      )}

      {phase === "logged" && (
        <View style={styles.loggedRow}>
          <View style={[styles.checkCircle, { backgroundColor: p.surfaceAlt }]}>
            <Text style={[styles.checkMark, { color: p.primary }]}>✓</Text>
          </View>
          <Text style={[styles.loggedText, { color: p.text }]}>Logged.</Text>
        </View>
      )}

      {phase === "later" && (
        <Text style={[styles.laterText, { color: p.textMuted }]}>
          No problem — it'll be here later today.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  offerText: {
    fontFamily: fonts.body,
    fontSize: typeScale.body,
    lineHeight: typeScale.body * 1.5,
  },
  title: {
    fontFamily: fonts.bodyBold,
    fontSize: typeScale.h3,
    lineHeight: typeScale.h3 * 1.25,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: typeScale.bodySmall,
    lineHeight: typeScale.bodySmall * 1.5,
    marginTop: spacing.xs,
  },
  weeklyNote: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.caption,
    marginTop: spacing.sm,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  primaryButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
  },
  fullWidthButton: {
    alignSelf: "stretch",
    alignItems: "center",
    marginTop: spacing.md,
  },
  primaryButtonText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.bodySmall,
  },
  secondaryButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  secondaryButtonText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.bodySmall,
  },
  somethingElseRow: {
    marginTop: spacing.sm,
  },
  linkText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.bodySmall,
    textDecorationLine: "underline",
  },
  stepsWrap: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  stepNumber: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  stepNumberText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.caption,
  },
  stepText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: typeScale.bodySmall,
    lineHeight: typeScale.bodySmall * 1.5,
  },
  repeatNote: {
    fontFamily: fonts.body,
    fontSize: typeScale.caption,
    lineHeight: typeScale.caption * 1.5,
    marginTop: spacing.md,
  },
  notNowText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.caption,
    textAlign: "center",
    marginTop: spacing.sm,
  },
  loggedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  checkMark: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.caption,
  },
  loggedText: {
    fontFamily: fonts.bodyMedium,
    fontSize: typeScale.body,
  },
  laterText: {
    fontFamily: fonts.body,
    fontSize: typeScale.bodySmall,
    lineHeight: typeScale.bodySmall * 1.5,
  },
});
