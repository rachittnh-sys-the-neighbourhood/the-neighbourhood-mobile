import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { useAuth } from "../../../lib/AuthProvider";
import { computeAge } from "../../../lib/childAge";
import * as growth from "../../../lib/db/growth";
import { cancelReminder, scheduleVaccinationReminders } from "../../../lib/notifications";
import {
  VACCINE_TIERS,
  VACCINE_TIER_BLURB,
  VACCINE_TIER_HIGHLIGHT,
  VACCINE_TIER_LABEL,
  type ChildVaccination,
  type VaccinationScheduleItem,
  type VaccineTier,
} from "../../../lib/db/types";
import { colors, fonts, radius, spacing, typeScale } from "../../../lib/theme";

// Enable LayoutAnimation for Android — same switch milestones.tsx uses for
// its own segmented tabs, so the tier switch here animates consistently.
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/** Inside this many days of due, the "coming up" banner switches to its
 *  urgent styling — close enough that booking is worth doing now, not
 *  just noting for later. */
const DUE_SOON_DAYS = 7;

/**
 * Vaccinations — schedule, history, and recording one.
 *
 * Grouped by tier — Essential is what the government programme guarantees,
 * Recommended is what IAP adds, Situational is only for particular
 * circumstances — and shown one tier at a time behind a segmented control
 * rather than three stacked sections. Essential alone can run long enough
 * that a parent scrolling through it would give up before ever reaching
 * Recommended or Situational; tabs put all three one tap apart instead.
 * That ordering still matters — a family relying on the free UIP schedule
 * should see their child as fully covered, never as short of a longer
 * private list — so Essential stays the default tab.
 *
 * Nothing here is framed as overdue. A date that has passed is "due",
 * never "missed", because the app cannot know what happened at the clinic
 * and shouldn't imply fault.
 */
export default function Vaccinations() {
  const { child } = useAuth();
  const [schedule, setSchedule] = useState<VaccinationScheduleItem[]>([]);
  const [recorded, setRecorded] = useState<Set<string>>(new Set());
  const [records, setRecords] = useState<Map<string, ChildVaccination>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [unsureEditor, setUnsureEditor] = useState<VaccinationScheduleItem | null>(null);
  const [unsureNote, setUnsureNote] = useState("");
  const [savingUnsure, setSavingUnsure] = useState(false);
  const [activeTier, setActiveTier] = useState<VaccineTier>("essential");

  const selectTier = (tier: VaccineTier) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveTier(tier);
  };

  const ageDays = child
    ? Math.floor(
        (Date.now() - new Date(child.date_of_birth + "T00:00:00").getTime()) / 86_400_000
      )
    : 0;

  /**
   * The single next thing on the schedule — same rule Home and the Child
   * hub use for their own "coming up" preview: earliest not-yet-given item
   * at or after today, falling back to the earliest overdue one so a
   * parent who's behind still sees something rather than nothing.
   */
  const nextDue = useMemo(() => {
    const upcoming = schedule.filter((s) => !recorded.has(s.id));
    return upcoming.find((s) => s.age_days >= ageDays) ?? upcoming[0] ?? null;
  }, [schedule, recorded, ageDays]);
  const daysUntilDue = nextDue ? nextDue.age_days - ageDays : null;
  const dueSoon = daysUntilDue !== null && daysUntilDue <= DUE_SOON_DAYS;

  const load = useCallback(async () => {
    if (!child) return;
    try {
      const [s, all] = await Promise.all([
        growth.getVaccinationSchedule(),
        growth.getVaccinationRecords(child.id),
      ]);
      setSchedule(s);
      setRecords(new Map(all.map((r) => [r.vaccination_id, r])));
      const recordedIds = new Set(
        all.filter((r) => r.status === "given").map((r) => r.vaccination_id)
      );
      setRecorded(recordedIds);
      scheduleVaccinationReminders(child.id, child.name, child.date_of_birth, s, recordedIds).catch(
        () => {}
      );
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [child]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Optimistic, and rolled back on failure — a vaccination record must
   *  never claim something happened that wasn't saved. Also clears any
   *  "unsure" note the same tap overwrites, since a dose can't be both. */
  const toggle = async (item: VaccinationScheduleItem) => {
    if (!child) return;
    const was = recorded.has(item.id);
    const previousRecord = records.get(item.id);

    setRecorded((prev) => {
      const next = new Set(prev);
      was ? next.delete(item.id) : next.add(item.id);
      return next;
    });
    setRecords((prev) => {
      const next = new Map(prev);
      if (was) next.delete(item.id);
      return next;
    });

    try {
      if (was) {
        await growth.removeVaccination(child.id, item.id);
      } else {
        const saved = await growth.recordVaccination({
          childId: child.id,
          vaccinationId: item.id,
          administeredOn: new Date().toISOString().slice(0, 10),
        });
        setRecords((prev) => new Map(prev).set(item.id, saved));
        void cancelReminder(`vaccine-${child.id}-${item.id}`);
      }
    } catch {
      setRecorded((prev) => {
        const next = new Set(prev);
        was ? next.add(item.id) : next.delete(item.id);
        return next;
      });
      setRecords((prev) => {
        const next = new Map(prev);
        if (previousRecord) next.set(item.id, previousRecord);
        else next.delete(item.id);
        return next;
      });
    }
  };

  const openUnsureEditor = (item: VaccinationScheduleItem) => {
    setUnsureNote(records.get(item.id)?.notes ?? "");
    setUnsureEditor(item);
  };

  /** Saves the current dose as "unsure", with whatever note was typed —
   *  a parent can leave a note without claiming the dose happened. */
  const saveUnsure = async () => {
    if (!child || !unsureEditor) return;
    setSavingUnsure(true);
    try {
      const saved = await growth.markVaccinationUnsure({
        childId: child.id,
        vaccinationId: unsureEditor.id,
        note: unsureNote.trim() || null,
      });
      setRecords((prev) => new Map(prev).set(unsureEditor.id, saved));
      setRecorded((prev) => {
        const next = new Set(prev);
        next.delete(unsureEditor.id);
        return next;
      });
      setUnsureEditor(null);
    } catch {
      // Leave the editor open so the parent can retry rather than losing
      // what they typed.
    } finally {
      setSavingUnsure(false);
    }
  };

  /** Clears an unsure record back to untouched. */
  const clearUnsure = async () => {
    if (!child || !unsureEditor) return;
    setSavingUnsure(true);
    try {
      await growth.removeVaccination(child.id, unsureEditor.id);
      setRecords((prev) => {
        const next = new Map(prev);
        next.delete(unsureEditor.id);
        return next;
      });
      setUnsureEditor(null);
    } catch {
      // Same reasoning as saveUnsure — stay open on failure.
    } finally {
      setSavingUnsure(false);
    }
  };

  const allRecorded = schedule.length > 0 && recorded.size === schedule.length;

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.warmTaupe} />
      </View>
    );
  }

  if (error || schedule.length === 0) {
    return (
      <View style={styles.screen}>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>
            {error ? "We couldn't load the schedule." : "The schedule isn't here yet."}
          </Text>
          <Text style={styles.emptyBody}>
            {error
              ? "Check your connection and try again. Anything you've recorded is safe."
              : "It'll appear here shortly. In the meantime, please follow the schedule your paediatrician gave you."}
          </Text>
        </View>
      </View>
    );
  }

  const activeItems = schedule.filter((s) => s.tier === activeTier);
  const activeSources = Array.from(
    new Set(activeItems.map((s) => s.source).filter((s): s is string => !!s))
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.intro}>
        A gentle record of {child?.name ?? "your little one"}&rsquo;s vaccines: tap
        anything already done. Your paediatrician always has the final word.
      </Text>

      {nextDue && !allRecorded && (
        <Pressable
          onPress={() => selectTier(nextDue.tier)}
          style={({ pressed }) => [
            styles.upNextCard,
            dueSoon && styles.upNextCardSoon,
            pressed && { opacity: 0.85 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Coming up: ${nextDue.vaccine_name}, ${nextDue.age_label}`}
        >
          <Text style={styles.upNextEyebrow}>{dueSoon ? "DUE SOON" : "COMING UP"}</Text>
          <Text style={styles.upNextTitle}>
            {nextDue.vaccine_name}
            {nextDue.dose_label ? ` · ${nextDue.dose_label}` : ""}
          </Text>
          <Text style={[styles.upNextMeta, dueSoon && styles.upNextMetaSoon]}>
            {daysUntilDue !== null && daysUntilDue <= 0
              ? "Due now, worth booking soon"
              : daysUntilDue !== null && dueSoon
                ? `Due in ${daysUntilDue} day${daysUntilDue === 1 ? "" : "s"}, worth booking soon`
                : `Due around ${nextDue.age_label}`}
          </Text>
          {nextDue.source && (
            <Text style={styles.upNextSource}>Source: {sourceLabel(nextDue.source)}</Text>
          )}
        </Pressable>
      )}

      {/* Segmented tier control — one tier visible at a time instead of
          three stacked sections, so Recommended and Situational are a tap
          away rather than a long scroll away. */}
      <View style={styles.tabContainer}>
        {VACCINE_TIERS.map((tier) => (
          <Pressable
            key={tier}
            style={[styles.tabButton, activeTier === tier && styles.tabButtonActive]}
            onPress={() => selectTier(tier)}
          >
            <Text style={[styles.tabButtonText, activeTier === tier && styles.tabButtonTextActive]}>
              {VACCINE_TIER_LABEL[tier]}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.tierBlock}>
        <Text style={styles.tierBlurb}>
          {VACCINE_TIER_BLURB[activeTier]}
          {VACCINE_TIER_HIGHLIGHT[activeTier] && (
            <Text style={styles.tierBlurbStrong}> {VACCINE_TIER_HIGHLIGHT[activeTier]}</Text>
          )}
        </Text>
        {activeSources.length > 0 && (
          <Text style={styles.tierSource}>
            {activeSources.length > 1 ? "Sources" : "Source"}:{" "}
            {activeSources.map(sourceLabel).join(" · ")}
          </Text>
        )}

        {activeItems.length === 0 ? (
          <Text style={styles.tierEmpty}>
            Nothing in {VACCINE_TIER_LABEL[activeTier].toLowerCase()} for{" "}
            {child?.name ?? "your child"}&rsquo;s age yet.
          </Text>
        ) : (
          activeItems.map((item) => {
            const record = records.get(item.id);
            return (
              <Row
                key={item.id}
                item={item}
                recorded={recorded.has(item.id)}
                unsure={record?.status === "unsure"}
                unsureNote={record?.status === "unsure" ? record.notes : null}
                due={ageDays >= item.age_days}
                /* Only worth repeating per row when the tier draws on more
                   than one source — otherwise the line under the tabs
                   already says it, and every row saying it again is noise. */
                showSource={activeSources.length > 1}
                onPress={() => toggle(item)}
                onUnsurePress={() => openUnsureEditor(item)}
              />
            );
          })
        )}
      </View>

      {allRecorded && (
        <View style={styles.celebrationCard}>
          <Text style={styles.celebrationEmoji}>🎉</Text>
          <Text style={styles.celebrationTitle}>Every vaccine on the schedule, recorded.</Text>
          <Text style={styles.celebrationBody}>
            {child?.name ?? "Your child"} is caught up. New doses will appear here as they come
            due.
          </Text>
        </View>
      )}

      {/* Sources are named per tier above, so this is the disclaimer only. */}
      <Text style={styles.footnote}>
        A record to help you keep track, not a substitute for your paediatrician&rsquo;s
        advice.
      </Text>

      <Modal
        visible={!!unsureEditor}
        transparent
        animationType="fade"
        onRequestClose={() => setUnsureEditor(null)}
      >
        <View style={styles.modalVeil}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {unsureEditor
                ? `Not sure about ${unsureEditor.vaccine_name}?`
                : "Not sure?"}
            </Text>
            <Text style={styles.modalBody}>
              This won&rsquo;t mark it as given. Just flags it as unsure, with an optional note
              for yourself.
            </Text>
            <TextInput
              style={styles.modalInput}
              value={unsureNote}
              onChangeText={setUnsureNote}
              placeholder="e.g. think this was given at the clinic, need to check the card"
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={300}
            />
            <View style={styles.modalActions}>
              {records.get(unsureEditor?.id ?? "")?.status === "unsure" && (
                <Pressable
                  onPress={clearUnsure}
                  disabled={savingUnsure}
                  style={({ pressed }) => [styles.modalSecondaryButton, pressed && { opacity: 0.7 }]}
                >
                  <Text style={styles.modalSecondaryButtonText}>Clear</Text>
                </Pressable>
              )}
              <Pressable
                onPress={() => setUnsureEditor(null)}
                disabled={savingUnsure}
                style={({ pressed }) => [styles.modalSecondaryButton, pressed && { opacity: 0.7 }]}
              >
                <Text style={styles.modalSecondaryButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={saveUnsure}
                disabled={savingUnsure}
                style={({ pressed }) => [styles.modalPrimaryButton, pressed && { opacity: 0.7 }]}
              >
                {savingUnsure ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <Text style={styles.modalPrimaryButtonText}>Save as unsure</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function Row({
  item,
  recorded,
  unsure,
  unsureNote,
  due,
  showSource,
  onPress,
  onUnsurePress,
}: {
  item: VaccinationScheduleItem;
  recorded: boolean;
  unsure: boolean;
  unsureNote: string | null;
  due: boolean;
  showSource: boolean;
  onPress: () => void;
  onUnsurePress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        recorded && styles.rowDone,
        unsure && styles.rowUnsure,
        pressed && { opacity: 0.7 },
      ]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: recorded }}
      accessibilityLabel={`${item.vaccine_name}, ${item.age_label}`}
    >
      <View style={[styles.check, recorded && styles.checkOn]}>{recorded && <Tick />}</View>
      <View style={styles.rowText}>
        <Text style={styles.name}>{item.vaccine_name}</Text>
        <Text style={styles.meta}>
          {item.age_label}
          {item.dose_label ? ` · ${item.dose_label}` : ""}
        </Text>
        {item.notes && <Text style={styles.notes}>{item.notes}</Text>}
        {showSource && item.source && (
          <Text style={styles.source}>Source: {sourceLabel(item.source)}</Text>
        )}
        {unsure && unsureNote && <Text style={styles.parentNote}>Your note: {unsureNote}</Text>}
        {!recorded && (
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              onUnsurePress();
            }}
            hitSlop={6}
          >
            <Text style={styles.unsureLink}>{unsure ? "Edit note" : "Not sure? Add a note"}</Text>
          </Pressable>
        )}
      </View>
      {/* "Due" only — never "overdue". We can't know what happened at the
          clinic, and implying a parent is late would be both wrong and unkind. */}
      {!recorded && !unsure && due && <Text style={styles.due}>Due</Text>}
      {unsure && <Text style={styles.unsurePill}>Unsure</Text>}
    </Pressable>
  );
}

/** The schedule's own source codes, spelled out — see
 *  supabase/migrations/20260726094000_vaccination_schedule_seed.sql. */
function sourceLabel(source: string): string {
  if (source === "NIS") return "National Immunization Schedule, Govt. of India";
  if (source === "IAP") return "IAP-ACVIP Recommended Schedule";
  return source;
}

function Tick() {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4.5 12.5 9.5 17.5 19.5 6.5"
        stroke={colors.white}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  centered: {
    flex: 1,
    backgroundColor: colors.cream,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  intro: {
    fontFamily: fonts.body,
    fontSize: typeScale.bodySmall,
    lineHeight: typeScale.bodySmall * 1.55,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  upNextCard: {
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: "rgba(168, 181, 164, 0.20)",
    marginBottom: spacing.md,
  },
  upNextCardSoon: {
    backgroundColor: "rgba(201, 165, 142, 0.20)",
  },
  upNextEyebrow: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    letterSpacing: 1.2,
    color: colors.warmTaupe,
  },
  upNextTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.h3,
    color: colors.charcoal,
    marginTop: 3,
  },
  upNextMeta: {
    fontFamily: fonts.bodyMedium,
    fontSize: typeScale.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  upNextMetaSoon: {
    color: "#96703A",
    fontFamily: fonts.bodySemiBold,
  },
  upNextSource: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 8,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(139, 115, 85, 0.06)",
    padding: 4,
    borderRadius: radius.sm,
    marginBottom: spacing.lg,
  },
  tabButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: "center",
    borderRadius: radius.sm - 2,
  },
  tabButtonActive: {
    backgroundColor: colors.white,
    ...Platform.select({
      web: {
        boxShadow: "0px 2px 3px rgba(0, 0, 0, 0.04)",
      } as any,
      default: {
        shadowColor: "rgba(0, 0, 0, 0.04)",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 3,
        elevation: 2,
      },
    }),
  },
  tabButtonText: {
    fontFamily: fonts.bodyMedium,
    fontSize: typeScale.caption,
    color: colors.textMuted,
  },
  tabButtonTextActive: {
    color: colors.charcoal,
    fontFamily: fonts.bodySemiBold,
  },
  tierBlock: { marginBottom: spacing.xl },
  tierBlurb: {
    fontFamily: fonts.body,
    fontSize: typeScale.caption,
    lineHeight: typeScale.caption * 1.5,
    color: colors.textMuted,
    marginBottom: 4,
  },
  tierBlurbStrong: {
    fontFamily: fonts.bodySemiBold,
    color: colors.charcoal,
  },
  tierSource: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  tierEmpty: {
    fontFamily: fonts.body,
    fontSize: typeScale.bodySmall,
    lineHeight: typeScale.bodySmall * 1.5,
    color: colors.textMuted,
    paddingVertical: spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: "rgba(255, 255, 255, 0.55)",
    marginBottom: spacing.sm,
  },
  rowDone: { backgroundColor: "rgba(168, 181, 164, 0.20)" },
  rowUnsure: { backgroundColor: "rgba(201, 165, 142, 0.16)" },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  checkOn: { backgroundColor: colors.sage, borderColor: colors.sage },
  rowText: { flex: 1 },
  name: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.bodySmall,
    color: colors.charcoal,
  },
  meta: {
    fontFamily: fonts.body,
    fontSize: typeScale.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  notes: {
    fontFamily: fonts.body,
    fontSize: typeScale.caption,
    lineHeight: typeScale.caption * 1.45,
    color: colors.textMuted,
    marginTop: 6,
  },
  source: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 6,
  },
  due: {
    fontFamily: fonts.bodyMedium,
    fontSize: typeScale.caption,
    color: colors.warmTaupe,
    marginTop: 2,
  },
  unsurePill: {
    fontFamily: fonts.bodyMedium,
    fontSize: typeScale.caption,
    color: "#96703A",
    marginTop: 2,
  },
  parentNote: {
    fontFamily: fonts.body,
    fontSize: typeScale.caption,
    fontStyle: "italic",
    lineHeight: typeScale.caption * 1.45,
    color: colors.textMuted,
    marginTop: 4,
  },
  unsureLink: {
    fontFamily: fonts.bodyMedium,
    fontSize: typeScale.caption,
    color: colors.warmTaupe,
    marginTop: 8,
  },
  celebrationCard: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.lg,
    alignItems: "center",
    backgroundColor: "rgba(168, 181, 164, 0.20)",
  },
  celebrationEmoji: {
    fontSize: 28,
    marginBottom: spacing.xs,
  },
  celebrationTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.h3,
    color: colors.charcoal,
    textAlign: "center",
  },
  celebrationBody: {
    fontFamily: fonts.body,
    fontSize: typeScale.bodySmall,
    lineHeight: typeScale.bodySmall * 1.5,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 4,
  },
  modalVeil: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(44, 44, 44, 0.32)",
  },
  modalCard: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
  },
  modalTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: typeScale.h3,
    color: colors.charcoal,
  },
  modalBody: {
    fontFamily: fonts.body,
    fontSize: typeScale.caption,
    lineHeight: typeScale.caption * 1.5,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  modalInput: {
    marginTop: spacing.md,
    minHeight: 70,
    maxHeight: 140,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    fontFamily: fonts.body,
    fontSize: typeScale.bodySmall,
    color: colors.charcoal,
    textAlignVertical: "top",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  modalSecondaryButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalSecondaryButtonText: {
    fontFamily: fonts.bodyMedium,
    fontSize: typeScale.bodySmall,
    color: colors.textMuted,
  },
  modalPrimaryButton: {
    minWidth: 130,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.pill,
    backgroundColor: colors.sageDark,
  },
  modalPrimaryButtonText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.bodySmall,
    color: colors.white,
  },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.h3,
    color: colors.charcoal,
    textAlign: "center",
  },
  emptyBody: {
    fontFamily: fonts.body,
    fontSize: typeScale.bodySmall,
    lineHeight: typeScale.bodySmall * 1.55,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.sm,
  },
  footnote: {
    fontFamily: fonts.body,
    fontSize: typeScale.caption,
    lineHeight: typeScale.caption * 1.5,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
});
