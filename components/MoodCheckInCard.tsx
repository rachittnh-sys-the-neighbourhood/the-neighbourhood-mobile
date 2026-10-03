import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import * as moodCheckins from "../lib/db/moodCheckins";
import type { MoodValue } from "../lib/db/types";
import { usePalette } from "../lib/ModeProvider";
import { fonts, radius, spacing, typeScale } from "../lib/theme";
import { Card } from "./parentUI";
import { MoodIcon } from "./MoodIcon";

const MOOD_ORDER: MoodValue[] = ["rough", "meh", "okay", "good", "great"];

/** "Low / Worn / Okay / Good / Great" — mother-facing labels for the same
 *  five MoodValue rows the rest of the app already stores and reads
 *  (rough/meh/okay/good/great). A relabel only, not a new scale. */
const MOOD_LABEL: Record<MoodValue, string> = {
  rough: "Low",
  meh: "Worn",
  okay: "Okay",
  good: "Good",
  great: "Great",
};

function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * You hub's daily mood check-in -- "How's today treating you?", one tap,
 * five labelled options, always the same single tone (never a
 * red-to-green ramp, see MoodIcon). Distinct from and additional to
 * CheckInCard's weekly recovery check-in: this one has no cadence gate
 * and is meant to be answered every day.
 *
 * "Past check-ins" replaces the inline this-week strip this card used to
 * render directly -- the full history now lives on its own screen (see
 * app/(tabs)/you/checkins.tsx), reached from the link below, so this card
 * stays to the single "how are you right now" question.
 *
 * `onMoodChange` fires whenever today's mood is known -- on first load if
 * already answered today, and again on every tap -- so the caller can use
 * it to suggest which FOR TODAY role opens first (see
 * lib/fatherRoles.ts FATHER_MOOD_ROLE). Purely a suggestion: the caller
 * decides whether a later manual choice should stick over a later mood
 * change.
 */
export function MoodCheckInCard({
  profileId,
  onMoodChange,
  children,
}: {
  profileId: string | null;
  onMoodChange?: (mood: MoodValue) => void;
  /** The You hub's companion thread (see CompanionThreadCard) renders
   *  here, inside this same card, below "Add a note" / "Past check-ins"
   *  -- those two links are about the mood tap itself, so they stay
   *  grouped with it; the companion thread gets its own divider below
   *  them rather than being sandwiched in between. */
  children?: React.ReactNode;
}) {
  const p = usePalette();
  const router = useRouter();
  const [todaysMood, setTodaysMood] = useState<MoodValue | null>(null);

  useEffect(() => {
    if (!profileId) return;
    let alive = true;
    const { start, end } = moodCheckins.weekBounds(new Date());
    moodCheckins
      .getCheckinsForWeek(profileId, start, end)
      .then((rows) => {
        if (!alive) return;
        const todayRow = rows.find((r) => r.checkin_date === dateKey(new Date()));
        if (todayRow) {
          setTodaysMood(todayRow.mood);
          onMoodChange?.(todayRow.mood);
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
    // onMoodChange is a fresh closure each render in the caller; only
    // profileId should re-trigger the fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  if (!profileId) return null;

  const choose = async (mood: MoodValue) => {
    setTodaysMood(mood);
    onMoodChange?.(mood);
    try {
      await moodCheckins.submitMoodCheckin(profileId, mood);
    } catch {
      // The optimistic local state is still a reasonable guess even if the
      // save failed silently -- worth showing, not worth erroring over.
    }
  };

  return (
    <Card style={styles.card}>
      <Text style={[styles.title, { color: p.text }]}>How's today treating you?</Text>
      <Text style={[styles.subtitle, { color: p.textMuted }]}>A little space for you, every day.</Text>
      <View style={styles.moodRow}>
        {MOOD_ORDER.map((mood) => {
          const selected = todaysMood === mood;
          return (
            <Pressable
              key={mood}
              onPress={() => choose(mood)}
              hitSlop={4}
              style={[
                styles.moodButton,
                { borderColor: p.border },
                selected && { backgroundColor: p.primary, borderColor: p.primary },
              ]}
            >
              <MoodIcon mood={mood} color={selected ? p.surface : p.primary} size={22} />
              <Text style={[styles.moodLabel, { color: selected ? p.surface : p.text }]}>
                {MOOD_LABEL[mood]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.linkRow}>
        <Pressable onPress={() => router.push("/you/checkins?note=1")} hitSlop={6}>
          <Text style={[styles.linkText, { color: p.primary }]}>Add a note</Text>
        </Pressable>
        <Pressable onPress={() => router.push("/you/checkins")} hitSlop={6}>
          <Text style={[styles.linkText, { color: p.primary }]}>Past check-ins</Text>
        </Pressable>
      </View>

      {children}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  title: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.h3,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: typeScale.bodySmall,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  moodRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.xs,
  },
  moodButton: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  moodLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: typeScale.caption,
  },
  linkRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.lg,
  },
  linkText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.bodySmall,
    textDecorationLine: "underline",
  },
});
