import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Card, CareNote, Chevron, PageHeading, SectionLabel } from "../../../components/parentUI";
import { useAuth } from "../../../lib/AuthProvider";
import { computeAge, youngestChild } from "../../../lib/childAge";
import { usePalette } from "../../../lib/ModeProvider";
import {
  CARE_AREAS,
  deliveryPhrase,
  deriveProfile,
  elapsedPhrase,
  isCareAreaVisible,
  topicsForProfile,
  type CareArea,
  type DeliveryType,
} from "../../../lib/parentCare";
import { fonts, spacing, typeScale } from "../../../lib/theme";

/**
 * Postpartum Care — personalized.
 *
 * A library, not a programme. There is no completion state and no order you
 * are supposed to go in, because the parent arriving here is usually looking
 * for one specific reassurance at an odd hour — most often "is this normal?".
 *
 * The top of the screen is profile-aware: it shows stage, birth method, and
 * a reassurance that matches the parent's actual experience. Everything below
 * is filtered twice — isCareAreaVisible decides which AREAS this parent
 * sees at all (a father never sees "physical recovery", and sees "For dads"
 * in its place), then topicsForProfile filters the topics within a visible
 * area by delivery method, so a vaginal-birth parent never sees caesarean
 * scar content and vice versa. "Prefer not to say" gets universally
 * applicable content with zero assumptions, at both levels.
 */

/**
 * Returns a contextual heading and body based on delivery type and postpartum
 * week. The language is deliberately warm and never clinical.
 */
function stageReassurance(
  delivery: DeliveryType,
  weeksPostpartum: number,
): { eyebrow: string; body: string } {
  const weekLabel = `Week ${weeksPostpartum}`;

  if (delivery === "caesarean") {
    return {
      eyebrow: `Recovering · ${weekLabel}`,
      body:
        `At ${elapsedPhrase(weeksPostpartum)} after a caesarean, you\u2019re still healing inside. ` +
        `Tightness, numbness, a core that feels unreliable \u2014 all normal. You haven\u2019t done anything wrong.`,
    };
  }

  if (delivery === "vaginal") {
    return {
      eyebrow: `Recovering · ${weekLabel}`,
      body:
        weeksPostpartum <= 6
          ? `At ${elapsedPhrase(weeksPostpartum)} after birth, your body is doing deep repair. ` +
            `Soreness, pelvic floor changes, and uneven energy are all part of healing \u2014 not signs you\u2019re falling behind.`
          : `At ${elapsedPhrase(weeksPostpartum)} postpartum, recovery continues beneath the surface. ` +
            `Pelvic floor strength, energy, and how your body feels during movement are all still changing.`,
    };
  }

  // prefer_not_to_say
  return {
    eyebrow: `Postpartum · ${weekLabel}`,
    body:
      `At ${elapsedPhrase(weeksPostpartum)} postpartum, your body is still recovering. ` +
      `Whatever your birth experience, tiredness, physical changes, and uneven energy are all part of the process.`,
  };
}

/**
 * The father-facing counterpart to stageReassurance above. Everything that
 * function says is about the birthing parent's own body, so it's never
 * shown once role is "father" — this is what fills that top card instead.
 */
function fatherReassurance(weeksPostpartum: number): { eyebrow: string; body: string } {
  return {
    eyebrow: `${elapsedPhrase(weeksPostpartum)} in`,
    body:
      "She's healing from things that don't fully show. Your part right now is steady, practical support. And finding your own footing matters too.",
  };
}

export default function Recovery() {
  const router = useRouter();
  const p = usePalette();
  const { children, profile: authProfile } = useAuth();
  /**
   * When opened from a specific card on You's hub (e.g. "Sleep"), `area`
   * narrows the library to just that one area instead of the full list —
   * the parent tapped "Sleep", not "everything". Omitted (opened from the
   * Today card's "Learn more", or any other general entry) shows all of
   * it, same as before the hub redesign.
   */
  const { area: areaFilter } = useLocalSearchParams<{ area?: CareArea }>();

  // The parent's own postpartum stage follows the youngest child, not
  // whichever child is active in the Kids tab switcher — see today.tsx.
  const recoveryChild = youngestChild(children);
  const ageMonths = recoveryChild ? computeAge(recoveryChild.date_of_birth)?.totalMonths ?? 0 : 0;
  const profile = useMemo(
    () => deriveProfile(ageMonths, authProfile),
    [ageMonths, authProfile],
  );

  const isFather = profile.role === "father";
  const { eyebrow, body: stageBody } = isFather
    ? fatherReassurance(profile.weeksPostpartum)
    : stageReassurance(profile.delivery, profile.weeksPostpartum);

  // Two filters stack here: isCareAreaVisible decides whether an area
  // belongs on this parent's screen at all (role, and — for physical
  // recovery — how long ago the birth was); topicsForProfile then filters
  // the topics *within* a visible area by delivery method. An area with
  // zero topics after both filters (e.g. "physical" for a father) is
  // dropped rather than shown empty.
  const areaTopics = useMemo(() => {
    return CARE_AREAS.filter((area) => isCareAreaVisible(area.key, profile.role, ageMonths))
      .filter((area) => !areaFilter || area.key === areaFilter)
      .map((area) => ({
        ...area,
        topics: topicsForProfile(profile.delivery, area.key),
      }))
      .filter((a) => a.topics.length > 0);
  }, [profile.delivery, profile.role, ageMonths, areaFilter]);

  return (
    <ScrollView
      style={{ backgroundColor: p.bg }}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <PageHeading
        eyebrow={eyebrow}
        title={
          areaFilter
            ? (areaTopics[0]?.label ?? "Your recovery, explained.")
            : isFather
              ? "Your part in this."
              : "Your recovery, explained."
        }
        body={
          areaFilter
            ? (areaTopics[0]?.blurb ?? "")
            : isFather
              ? "What she\u2019s going through, and what actually helps from you."
              : "What you\u2019re feeling has a name, and an ending. Here\u2019s both."
        }
      />

      {/* Stage-aware reassurance, before any navigation. */}
      <Card style={styles.stageCard}>
        <Text style={[styles.stageSerif, { color: p.primary }]}>Where you are</Text>
        <Text style={[styles.stageBody, { color: p.text }]}>{stageBody}</Text>
      </Card>

      {!areaFilter && !isFather && (
        <Card style={styles.stageCard} onPress={() => router.push("/you")}>
          <View style={styles.rowBetween}>
            <Text style={[styles.stageSerif, { color: p.primary }]}>How are you feeling today?</Text>
            <Chevron />
          </View>
          <Text style={[styles.stageBody, { color: p.text }]}>
            A quick, private check-in. Not a form, not a score.
          </Text>
        </Card>
      )}

      {areaTopics.map(({ key, label, blurb, topics }) => (
        <View key={key} style={styles.block}>
          {!areaFilter && (
            <>
              <SectionLabel>{label}</SectionLabel>
              <Text style={[styles.areaBlurb, { color: p.textMuted }]}>{blurb}</Text>
            </>
          )}
          {topics.map((topic) => (
            <Card
              key={topic.slug}
              style={styles.topicCard}
              onPress={() => router.push(`/care/${topic.slug}`)}
            >
              <View style={styles.rowBetween}>
                <Text style={[styles.topicTitle, { color: p.text }]}>{topic.title}</Text>
                <Chevron />
              </View>
              <Text style={[styles.topicBlurb, { color: p.textMuted }]}>{topic.blurb}</Text>
              <Text style={[styles.topicMinutes, { color: p.primary }]}>
                {topic.minutes} min read
              </Text>
            </Card>
          ))}
        </View>
      ))}

      {areaFilter && areaTopics[0] && (
        <Pressable
          onPress={() =>
            router.push({
              pathname: "/ask",
              params: { mode: "parent", topic: areaTopics[0].label, prompt: `About ${areaTopics[0].label.toLowerCase()}: ` },
            })
          }
          accessibilityRole="button"
          style={({ pressed }) => [styles.askRow, pressed && { opacity: 0.7 }]}
        >
          <Text style={[styles.askText, { color: p.primary }]}>Ask about this →</Text>
        </Pressable>
      )}

      <CareNote>
        This is here to inform, not to replace. If something feels off, your
        instinct is worth following. Reach out to your doctor.
      </CareNote>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  stageCard: {
    padding: spacing.lg,
  },
  stageSerif: {
    fontFamily: fonts.serifItalic,
    fontSize: typeScale.body,
    marginBottom: spacing.sm,
  },
  stageBody: {
    fontFamily: fonts.body,
    fontSize: typeScale.body,
    lineHeight: typeScale.body * 1.6,
  },
  block: {
    marginTop: spacing.xl,
  },
  areaBlurb: {
    fontFamily: fonts.body,
    fontSize: typeScale.bodySmall,
    marginTop: -spacing.xs,
    marginBottom: spacing.sm,
  },
  topicCard: {
    marginTop: spacing.sm,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  topicTitle: {
    flex: 1,
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.h3,
    lineHeight: typeScale.h3 * 1.3,
  },
  topicBlurb: {
    fontFamily: fonts.body,
    fontSize: typeScale.bodySmall,
    lineHeight: typeScale.bodySmall * 1.55,
    marginTop: spacing.xs,
  },
  topicMinutes: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.caption,
    marginTop: spacing.sm,
  },
  askRow: {
    marginTop: spacing.xl,
    alignItems: "center",
  },
  askText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.bodySmall,
  },
});
