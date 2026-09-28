import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import * as moodCheckins from "../lib/db/moodCheckins";
import type { MoodCheckin, MoodValue } from "../lib/db/types";
import { usePalette } from "../lib/ModeProvider";
import { fonts, spacing, typeScale } from "../lib/theme";
import { Card } from "./parentUI";
import { MoodIcon } from "./MoodIcon";

const MOOD_ORDER: MoodValue[] = ["rough", "meh", "okay", "good", "great"];
const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * You hub's daily mood check-in -- "How's today treating you?", one tap,
 * five options, always the same single tone (never a red-to-green ramp,
 * see MoodIcon). Distinct from and additional to CheckInCard's weekly
 * recovery check-in: this one has no cadence gate and is meant to be
 * answered every day.
 *
 * Below the row, a Monday-Sunday strip of this week's answers so far --
 * always the full calendar week regardless of when the parent first
 * started using the app; a day before their first check-in (or today,
 * before it's answered) just renders as an empty slot, not a shifted
 * window (see lib/db/moodCheckins.ts weekBounds).
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
}: {
  profileId: string | null;
  onMoodChange?: (mood: MoodValue) => void;
}) {
  const p = usePalette();
  const [week, setWeek] = useState<MoodCheckin[] | null>(null);

  useEffect(() => {
    if (!profileId) return;
    let alive = true;
    const { start, end } = moodCheckins.weekBounds(new Date());
    moodCheckins
      .getCheckinsForWeek(profileId, start, end)
      .then((rows) => {
        if (!alive) return;
        setWeek(rows);
        const todayRow = rows.find((r) => r.checkin_date === dateKey(new Date()));
        if (todayRow) onMoodChange?.(todayRow.mood);
      })
      .catch(() => {
        if (alive) setWeek([]);
      });
    return () => {
      alive = false;
    };
    // onMoodChange is a fresh closure each render in the caller; only
    // profileId should re-trigger the fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  const weekDays = useMemo(() => {
    const { start } = moodCheckins.weekBounds(new Date());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, []);

  const todayKey = dateKey(new Date());
  const todaysMood = week?.find((r) => r.checkin_date === todayKey)?.mood ?? null;

  if (!profileId) return null;

  const choose = async (mood: MoodValue) => {
    setWeek((prev) => {
      const rest = (prev ?? []).filter((r) => r.checkin_date !== todayKey);
      return [...rest, { id: "optimistic", profile_id: profileId, checkin_date: todayKey, mood, created_at: new Date().toISOString() }];
    });
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
      <Text style={[styles.eyebrow, { color: p.primary }]}>TODAY</Text>
      <Text style={[styles.title, { color: p.text }]}>How's today treating you?</Text>
      <View style={styles.moodRow}>
        {MOOD_ORDER.map((mood) => {
          const selected = todaysMood === mood;
          return (
            <Pressable
              key={mood}
              onPress={() => choose(mood)}
              hitSlop={6}
              style={[
                styles.moodButton,
                selected && { backgroundColor: p.surfaceAlt },
              ]}
            >
              <MoodIcon mood={mood} color={selected ? p.text : p.primary} size={26} />
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.weekSection, { borderTopColor: p.border }]}>
        <Text style={[styles.eyebrow, { color: p.primary }]}>THIS WEEK</Text>
        <View style={styles.weekRow}>
          {weekDays.map((day, index) => {
            const key = dateKey(day);
            const row = week?.find((r) => r.checkin_date === key);
            const isToday = key === todayKey;
            return (
              <View key={key} style={styles.weekDay}>
                {row ? (
                  <MoodIcon mood={row.mood} color={p.primary} size={16} />
                ) : (
                  <View
                    style={[
                      styles.emptyDot,
                      { borderColor: isToday ? p.primary : p.border },
                    ]}
                  />
                )}
                <Text style={[styles.dayLetter, { color: isToday ? p.primary : p.textMuted }]}>
                  {DAY_LETTERS[index]}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  eyebrow: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.caption,
    letterSpacing: 1.2,
  },
  title: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.h3,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  moodRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  moodButton: {
    padding: spacing.xs,
    borderRadius: 999,
  },
  weekSection: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.sm,
  },
  weekDay: {
    alignItems: "center",
    gap: 4,
  },
  emptyDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  dayLetter: {
    fontFamily: fonts.body,
    fontSize: typeScale.caption,
  },
});
