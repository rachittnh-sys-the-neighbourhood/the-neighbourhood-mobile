import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { workshopBySlug } from "../../../../lib/learning";
import { getRegisteredWorkshops, setWorkshopRegistered } from "../../../../lib/learningProgress";
import { colors, fonts, radius, spacing, typeScale } from "../../../../lib/theme";

/**
 * A single workshop: schedule, instructor, location, and a registration
 * toggle. No booking flow or payment yet — registered is a local boolean,
 * but it already lives behind the same setWorkshopRegistered() call a real
 * booking/payment confirmation would eventually call, so wiring that in
 * later replaces this button's onPress body, not its shape.
 */
export default function WorkshopDetail() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const workshop = slug ? workshopBySlug(slug) : undefined;
  const [registered, setRegistered] = useState(false);

  const loadRegistered = useCallback(async () => {
    if (!workshop) return;
    const all = await getRegisteredWorkshops();
    setRegistered(all.includes(workshop.slug));
  }, [workshop]);

  useEffect(() => {
    void loadRegistered();
  }, [loadRegistered]);

  if (!workshop) {
    return (
      <View style={styles.missing}>
        <Text style={styles.missingText}>We couldn&rsquo;t find that workshop.</Text>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Text style={styles.back}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const starts = new Date(workshop.startsAt);
  const dateLabel = starts.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const timeLabel = starts.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

  const toggleRegistered = async () => {
    const next = !registered;
    setRegistered(next);
    await setWorkshopRegistered(workshop.slug, next);
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: "" }} />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>
          {workshop.location.mode === "online" ? "ONLINE WORKSHOP" : "IN-PERSON WORKSHOP"}
        </Text>
        <Text style={styles.title}>{workshop.title}</Text>
        <Text style={styles.description}>{workshop.description}</Text>

        <View style={styles.detailCard}>
          <DetailRow label="When" value={`${dateLabel} · ${timeLabel}`} />
          <DetailRow label="Duration" value={`${workshop.durationMinutes} min`} />
          <DetailRow
            label="Hosted by"
            value={`${workshop.instructor.name}, ${workshop.instructor.credential}`}
          />
          <DetailRow
            label="Where"
            value={
              workshop.location.mode === "online"
                ? "Online. Link shared after registration"
                : workshop.location.venue
            }
          />
          {workshop.capacity && <DetailRow label="Spots" value={`Limited to ${workshop.capacity}`} />}
        </View>

        <Pressable
          style={[styles.registerButton, registered && styles.registerButtonDone]}
          onPress={toggleRegistered}
        >
          <Text style={[styles.registerButtonText, registered && styles.registerButtonTextDone]}>
            {registered ? "You're registered ✓" : "Register (free)"}
          </Text>
        </Pressable>

        {registered && workshop.location.mode === "online" && workshop.location.joinUrl && (
          <Pressable
            style={styles.joinLink}
            onPress={() => Linking.openURL(workshop.location.mode === "online" ? workshop.location.joinUrl! : "")}
          >
            <Text style={styles.joinLinkText}>Save the join link for later</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  eyebrow: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.caption,
    letterSpacing: 1.5,
    color: colors.warmTaupe,
    marginBottom: spacing.sm,
  },
  title: {
    fontFamily: fonts.bodyBold,
    fontSize: typeScale.h1,
    lineHeight: typeScale.h1 * 1.2,
    color: colors.charcoal,
  },
  description: {
    fontFamily: fonts.body,
    fontSize: typeScale.body,
    lineHeight: typeScale.body * 1.5,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  detailCard: {
    marginTop: spacing.xl,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    gap: spacing.md,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  detailLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: typeScale.caption,
    color: colors.textMuted,
  },
  detailValue: {
    flex: 1,
    textAlign: "right",
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.bodySmall,
    color: colors.charcoal,
  },
  registerButton: {
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.sageDark,
    alignItems: "center",
  },
  registerButtonDone: {
    backgroundColor: "rgba(168, 181, 164, 0.24)",
  },
  registerButtonText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.body,
    color: colors.white,
  },
  registerButtonTextDone: {
    color: colors.charcoal,
  },
  joinLink: {
    marginTop: spacing.md,
    alignItems: "center",
  },
  joinLinkText: {
    fontFamily: fonts.bodyMedium,
    fontSize: typeScale.bodySmall,
    color: colors.warmTaupe,
  },
  missing: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    backgroundColor: colors.cream,
  },
  missingText: {
    fontFamily: fonts.body,
    fontSize: typeScale.body,
    color: colors.textMuted,
  },
  back: {
    fontFamily: fonts.bodyMedium,
    fontSize: typeScale.body,
    color: colors.warmTaupe,
  },
});
