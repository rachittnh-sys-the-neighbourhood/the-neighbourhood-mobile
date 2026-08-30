import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LogoMark } from "../components/Logo";
import { ReplayTourDialog } from "../components/ReplayTourDialog";
import { StartOverDialog } from "../components/StartOverDialog";
import { GhostButton } from "../components/ui";
import { useAuth } from "../lib/AuthProvider";
import { EMAIL_OTP_READY } from "../lib/authMode";
import { computeAge } from "../lib/childAge";
import { colors, fonts, radius, spacing, typeScale } from "../lib/theme";

/**
 * Family + account settings. Reached from the avatar in the top-right of
 * every tab, presented as a modal — deliberately not a fourth tab, and
 * not on Today's Plan, which shouldn't make room for account chrome
 * every single day.
 */
export default function Profile() {
  const router = useRouter();
  const { parentName, child, signOut, accountLinked, accountEmail } = useAuth();
  const age = child ? computeAge(child.date_of_birth) : null;
  const [showReplayDialog, setShowReplayDialog] = useState(false);
  const [showStartOverDialog, setShowStartOverDialog] = useState(false);

  const replayTour = () => {
    setShowReplayDialog(false);
    router.replace("/home?guidedTour=1&step=0&replay=1");
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.inner}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.close}>
          <Text style={styles.closeLabel}>Done</Text>
        </Pressable>

        <View style={styles.brand}>
          <LogoMark size={30} />
        </View>

        <Text style={styles.eyebrow}>FAMILY</Text>
        <Text style={styles.title}>{parentName ?? "You"}</Text>

        {child && (
          <View style={styles.card}>
            <Text style={styles.childName}>{child.name}</Text>
            <Text style={styles.childMeta}>{age ? `${age.label} old` : "Age not set"}</Text>
          </View>
        )}

        <View style={styles.settingsList}>
          {/* Account safety, stated plainly. An unlinked account is one
              reinstall away from losing everything, and the parent has no
              way to know that unless we say so. */}
          <Pressable
            onPress={() => EMAIL_OTP_READY && router.push("/secure-account")}
            disabled={!EMAIL_OTP_READY}
            style={[styles.settingRow, !accountLinked && styles.settingRowAlert]}
            accessibilityRole="button"
          >
            <View>
              <Text style={styles.settingTitle}>
                {accountLinked ? "Account" : "Keep this family safe"}
              </Text>
              <Text style={styles.settingBody}>
                {accountLinked
                  ? `Saved to ${accountEmail}. Sign in anywhere to find your family.`
                  : "Right now this family only exists on this phone. Add an email so it survives a new one."}
              </Text>
            </View>
          </Pressable>
          <Pressable
            onPress={() => router.push("/child/edit")}
            style={styles.settingRow}
            accessibilityRole="button"
          >
            <View>
              <Text style={styles.settingTitle}>Child details</Text>
              <Text style={styles.settingBody}>Name, birthday, and gender.</Text>
            </View>
          </Pressable>
          <Pressable
            onPress={() => router.push("/recovery-settings")}
            style={styles.settingRow}
            accessibilityRole="button"
          >
            <View>
              <Text style={styles.settingTitle}>Recovery profile</Text>
              <Text style={styles.settingBody}>Your role, birth method, and feeding method.</Text>
            </View>
          </Pressable>
          <View style={styles.settingRow}>
            <View>
              <Text style={styles.settingTitle}>Notifications</Text>
              <Text style={styles.settingBody}>Gentle reminders for daily plans.</Text>
            </View>
          </View>
          <Pressable onPress={() => setShowReplayDialog(true)} style={styles.settingRow} accessibilityRole="button">
            <View>
              <Text style={styles.settingTitle}>Take the tour again</Text>
              <Text style={styles.settingBody}>A quick refresher whenever you need it.</Text>
            </View>
          </Pressable>
        </View>

        <View style={styles.signOut}>
          {/* Whether this is reversible depends on THIS account, not on a
              build flag: with an email you can sign back in, without one
              signing out destroys the only key to the family. So the
              unlinked case names the consequence and confirms first. */}
          {accountLinked ? (
            <GhostButton title="Sign out" onPress={signOut} />
          ) : (
            <GhostButton
              title="Start over on this device"
              onPress={() => setShowStartOverDialog(true)}
            />
          )}
        </View>
      </View>
      <ReplayTourDialog
        visible={showReplayDialog}
        onDismiss={() => setShowReplayDialog(false)}
        onConfirm={replayTour}
      />
      <StartOverDialog
        visible={showStartOverDialog}
        childName={child?.name ?? "your child"}
        onCancel={() => setShowStartOverDialog(false)}
        onKeepSafe={() => {
          setShowStartOverDialog(false);
          router.push("/secure-account");
        }}
        onErase={() => {
          setShowStartOverDialog(false);
          signOut();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  inner: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  close: {
    alignSelf: "flex-end",
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  closeLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: typeScale.body,
    color: colors.warmTaupe,
  },
  brand: {
    marginBottom: spacing.md,
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
    color: colors.charcoal,
  },
  card: {
    marginTop: spacing.xl,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  tourHighlight: {
    borderWidth: 1,
    borderColor: colors.warmTaupe,
    shadowColor: colors.charcoal,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 4,
  },
  childName: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.h3,
    color: colors.charcoal,
  },
  childMeta: {
    fontFamily: fonts.body,
    fontSize: typeScale.bodySmall,
    color: colors.textMuted,
    marginTop: 2,
  },
  signOut: {
    marginTop: "auto",
    marginBottom: spacing.lg,
    alignItems: "center",
  },
  settingsList: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  settingRow: {
    backgroundColor: "rgba(255, 255, 255, 0.58)",
    borderRadius: radius.md,
    padding: spacing.md,
  },
  // Warm, not alarming — this is a nudge, not an error state.
  settingRowAlert: {
    backgroundColor: "rgba(201, 165, 142, 0.20)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(139, 116, 91, 0.30)",
  },
  settingTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.bodySmall,
    color: colors.charcoal,
  },
  settingBody: {
    fontFamily: fonts.body,
    fontSize: typeScale.caption,
    lineHeight: typeScale.caption * 1.45,
    color: colors.textMuted,
    marginTop: 2,
  },
});
