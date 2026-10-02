import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { MoodIcon } from "../../../components/MoodIcon";
import { Card, PageHeading } from "../../../components/parentUI";
import { useAuth } from "../../../lib/AuthProvider";
import * as moodCheckins from "../../../lib/db/moodCheckins";
import type { MoodCheckin, MoodValue } from "../../../lib/db/types";
import { usePalette } from "../../../lib/ModeProvider";
import { fonts, radius, spacing, typeScale } from "../../../lib/theme";

const MOOD_LABEL: Record<MoodValue, string> = {
  rough: "Low",
  meh: "Worn",
  okay: "Okay",
  good: "Good",
  great: "Great",
};

const DAYS_SHOWN = 30;

function formatDate(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

function todayKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * The mood check-in's full history -- what used to be a Monday-Sunday
 * strip squeezed inside MoodCheckInCard now gets its own screen, reached
 * via "Past check-ins". `?note=1` additionally opens straight onto a
 * compose box for today's note (the card's "Add a note" link), since a
 * note attaches to a day's already-recorded mood rather than being its
 * own standalone entry.
 */
export default function PastCheckIns() {
  const p = usePalette();
  const { session } = useAuth();
  const { note: wantsNote } = useLocalSearchParams<{ note?: string }>();
  const profileId = session?.user?.id ?? null;

  const [rows, setRows] = useState<MoodCheckin[] | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    if (!profileId) return;
    let alive = true;
    moodCheckins
      .getRecentCheckins(profileId, DAYS_SHOWN)
      .then((data) => {
        if (!alive) return;
        setRows(data);
        const today = data.find((r) => r.checkin_date === todayKey());
        if (today?.note) setNoteDraft(today.note);
      })
      .catch(() => {
        if (alive) setRows([]);
      });
    return () => {
      alive = false;
    };
  }, [profileId]);

  const today = rows?.find((r) => r.checkin_date === todayKey()) ?? null;
  const rest = (rows ?? []).filter((r) => r.checkin_date !== todayKey());

  const saveNote = async () => {
    if (!profileId || !today) return;
    setSavingNote(true);
    try {
      const updated = await moodCheckins.submitMoodNote(profileId, noteDraft);
      setRows((prev) => (prev ? prev.map((r) => (r.id === updated.id ? updated : r)) : prev));
    } catch {
      // Draft stays on screen even if the save failed -- nothing to lose.
    } finally {
      setSavingNote(false);
    }
  };

  return (
    <ScrollView
      style={{ backgroundColor: p.bg }}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <PageHeading eyebrow="You" title="Past check-ins" body="How the last month has been treating you." />

      {rows === null ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} />
      ) : (
        <>
          {wantsNote === "1" && (
            <Card style={styles.noteCard}>
              <Text style={[styles.noteTitle, { color: p.text }]}>
                {today ? "A note for today" : "Check in first to add a note"}
              </Text>
              {today ? (
                <>
                  <TextInput
                    value={noteDraft}
                    onChangeText={setNoteDraft}
                    placeholder="What's on your mind?"
                    placeholderTextColor={p.textMuted}
                    multiline
                    style={[styles.noteInput, { color: p.text, borderColor: p.border }]}
                  />
                  <Pressable
                    onPress={saveNote}
                    disabled={savingNote}
                    style={[styles.saveButton, { backgroundColor: p.primary }]}
                  >
                    <Text style={[styles.saveButtonText, { color: p.surface }]}>
                      {savingNote ? "Saving…" : "Save note"}
                    </Text>
                  </Pressable>
                </>
              ) : (
                <Text style={[styles.noteBody, { color: p.textMuted }]}>
                  Pick how today's treating you on the You tab, then come back to add a note.
                </Text>
              )}
            </Card>
          )}

          {rows.length === 0 ? (
            <Text style={[styles.emptyText, { color: p.textMuted }]}>
              No check-ins yet -- they'll show up here once you start.
            </Text>
          ) : (
            [...(today ? [today] : []), ...rest].map((row) => (
              <Card key={row.id} style={styles.row}>
                <MoodIcon mood={row.mood} color={p.primary} size={22} />
                <View style={styles.rowText}>
                  <Text style={[styles.rowDate, { color: p.text }]}>
                    {row.checkin_date === todayKey() ? "Today" : formatDate(row.checkin_date)}
                    <Text style={{ color: p.textMuted }}> · {MOOD_LABEL[row.mood]}</Text>
                  </Text>
                  {row.note && <Text style={[styles.rowNote, { color: p.textMuted }]}>{row.note}</Text>}
                </View>
              </Card>
            ))
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  noteCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  noteTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.h3,
    marginBottom: spacing.sm,
  },
  noteBody: {
    fontFamily: fonts.body,
    fontSize: typeScale.bodySmall,
    lineHeight: typeScale.bodySmall * 1.5,
  },
  noteInput: {
    fontFamily: fonts.body,
    fontSize: typeScale.body,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 80,
    textAlignVertical: "top",
  },
  saveButton: {
    alignSelf: "flex-start",
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
  },
  saveButtonText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.bodySmall,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: typeScale.body,
    marginTop: spacing.lg,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  rowText: {
    flex: 1,
  },
  rowDate: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.bodySmall,
  },
  rowNote: {
    fontFamily: fonts.body,
    fontSize: typeScale.bodySmall,
    lineHeight: typeScale.bodySmall * 1.5,
    marginTop: 4,
  },
});
