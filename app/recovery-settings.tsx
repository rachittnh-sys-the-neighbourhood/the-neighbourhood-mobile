import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  RecoveryProfileQuestions,
  type HypertensionAnswer,
} from "../components/RecoveryProfileQuestions";
import { useAuth } from "../lib/AuthProvider";
import * as family from "../lib/db/family";
import {
  type DeliveryType,
  type DietaryPreference,
  type FeedingMethod,
  type ParentRole,
} from "../lib/parentCare";
import { colors, fonts, spacing, typeScale } from "../lib/theme";

/**
 * Recovery Profile settings — the same questions asked during main
 * onboarding (see app/onboarding/role.tsx, birth-type.tsx, feeding.tsx),
 * available anytime from Profile → Recovery profile. `profiles` is the
 * only place these facts live, so a change here takes effect everywhere
 * (Home, You, Copilot) the moment refreshFamily() resolves — there's no
 * separate local copy to fall out of sync.
 *
 * Changes save instantly on selection (no "Save" button needed).
 */
export default function RecoverySettings() {
  const router = useRouter();
  const { session, profile, refreshFamily } = useAuth();

  const role = (profile?.relationship as ParentRole | null) ?? "";
  const birthMethod = (profile?.birth_method as DeliveryType | null) ?? "";
  const feedingMethod = (profile?.feeding_method as FeedingMethod | null) ?? "";
  const diet = (profile?.diet as DietaryPreference | null) ?? "";
  const hadHypertension: HypertensionAnswer | "" =
    profile?.had_hypertension === true ? "yes" : profile?.had_hypertension === false ? "no" : "";
  // A local text buffer so a comma or a half-typed word isn't saved as an
  // allergen on every keystroke — this only writes on blur.
  const [allergiesText, setAllergiesText] = useState(() => (profile?.allergies ?? []).join(", "));

  const save = async (patch: {
    relationship?: string | null;
    birth_method?: string | null;
    feeding_method?: string | null;
    diet?: string | null;
    allergies?: string[];
    had_hypertension?: boolean | null;
  }) => {
    const userId = session?.user?.id;
    if (!userId) return;
    await family.updateProfile(userId, patch).catch(() => {});
    await refreshFamily();
  };

  const handleRole = (value: ParentRole) => {
    // Switching to father clears any birth/feeding answers already on file
    // — those describe the birthing parent's own body, and leaving stale
    // answers in place after this switch would keep them influencing
    // content that no longer applies to this profile.
    if (value === "father") {
      void save({ relationship: value, birth_method: null, feeding_method: null });
    } else {
      void save({ relationship: value });
    }
  };

  const handleBirth = (value: DeliveryType) => {
    void save({ birth_method: value });
  };

  const handleFeeding = (value: FeedingMethod) => {
    void save({ feeding_method: value });
  };

  const handleDiet = (value: DietaryPreference) => {
    void save({ diet: value });
  };

  const handleHypertension = (value: HypertensionAnswer) => {
    void save({ had_hypertension: value === "yes" });
  };

  const handleAllergiesBlur = () => {
    const list = allergiesText
      .split(",")
      .map((a) => a.trim().toLowerCase())
      .filter(Boolean);
    void save({ allergies: list });
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={styles.close}>
            <Text style={styles.closeLabel}>Done</Text>
          </Pressable>
          <Text style={styles.eyebrow}>RECOVERY PROFILE</Text>
          <Text style={styles.title}>About your recovery</Text>
          <Text style={styles.subtitle}>
            Updating these changes what you see in the Recovery tab and your
            daily plan. Nothing is shared.
          </Text>
        </View>

        <RecoveryProfileQuestions
          role={role}
          feedingMethod={feedingMethod}
          birthMethod={birthMethod}
          diet={diet}
          allergiesText={allergiesText}
          hadHypertension={hadHypertension}
          onRoleChange={handleRole}
          onFeedingChange={handleFeeding}
          onBirthChange={handleBirth}
          onDietChange={handleDiet}
          onAllergiesTextChange={setAllergiesText}
          onAllergiesBlur={handleAllergiesBlur}
          onHypertensionChange={handleHypertension}
        />

        <Text style={styles.reassurance}>
          You can change these anytime. Your recovery experience will update
          straight away.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    paddingTop: spacing.md,
  },
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
  subtitle: {
    fontFamily: fonts.body,
    fontSize: typeScale.body,
    lineHeight: typeScale.body * 1.5,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  reassurance: {
    fontFamily: fonts.serifItalic,
    fontSize: typeScale.body,
    lineHeight: typeScale.body * 1.5,
    color: colors.warmTaupe,
    marginTop: spacing.xl,
    textAlign: "center",
  },
});
