import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { PrimaryButton } from "../../components/ui";
import { FadeIn, Hint, OnboardingScreen, Prompt, SelectableCard } from "../../components/onboarding";
import { useAuth } from "../../lib/AuthProvider";
import * as family from "../../lib/db/family";
import { useDraftState, useOnboarding, type OnboardingDraft } from "../../lib/OnboardingProvider";
import { spacing } from "../../lib/theme";

const OPTIONS: { value: OnboardingDraft["role"]; label: string; gloss: string }[] = [
  { value: "mother", label: "I'm the mother", gloss: "Shapes your own recovery and wellbeing support." },
  { value: "father", label: "I'm the father", gloss: "Your role as a dad, understood and supported." },
  { value: "prefer_not_to_say", label: "Rather not say", gloss: "We'll build your space around the child, not a specific parent role." },
];

/**
 * Asked once, right up front — not as a separate "Parent Care" step later.
 * Home, You, and Copilot all personalise from this from the very first
 * screen, so it has to be known before onboarding finishes, not after the
 * parent happens to open the You tab. See lib/parentCare.ts ParentRole.
 *
 * `?complete=1` reaches this same screen a second way: an existing
 * account from before this field existed, whose child and everything
 * else is already set up — see app/index.tsx. That path writes straight
 * to the database and returns to Home, rather than continuing into the
 * rest of the (already-completed) onboarding draft.
 */
export default function Role() {
  const router = useRouter();
  const params = useLocalSearchParams<{ complete?: string }>();
  const { update } = useOnboarding();
  const { session, refreshFamily } = useAuth();
  const isCompletingExisting = params.complete === "1";
  const [role, setRole] = useDraftState<OnboardingDraft["role"]>(
    (d) => d.role,
    (v) => v === ""
  );
  const [saving, setSaving] = useState(false);

  const handleContinue = async () => {
    if (!role) return;

    if (isCompletingExisting) {
      const userId = session?.user?.id;
      if (!userId) return;
      setSaving(true);
      await family.updateProfile(userId, { relationship: role }).catch(() => {});
      await refreshFamily();
      router.replace("/home");
      return;
    }

    // Switching away from mother clears any birth/feeding answers already
    // on file — those describe the birthing parent's own body, and
    // leaving stale answers in place would keep them influencing content
    // that no longer applies.
    update(
      role === "father"
        ? { role, birthMethod: "", feedingMethod: "" }
        : { role }
    );
    // Only a mother or father has a partner role to name — "Rather not
    // say" skips straight to the child's name. See asksPartnerName in
    // lib/OnboardingProvider.tsx.
    router.push(
      role === "mother" || role === "father"
        ? "/onboarding/partner-name"
        : "/onboarding/child-name"
    );
  };

  return (
    <OnboardingScreen
      progress={isCompletingExisting ? undefined : 2 / 7}
      footer={
        <PrimaryButton
          title="Continue"
          onPress={handleContinue}
          disabled={!role}
          loading={saving}
        />
      }
    >
      <FadeIn>
        <Prompt>Who are you?</Prompt>
        <Hint>This shapes what your own space in the app looks like.</Hint>
        <View style={{ marginTop: spacing.xl, gap: spacing.sm }}>
          {OPTIONS.map((option) => (
            <SelectableCard
              key={option.value}
              title={option.label}
              gloss={option.gloss}
              selected={role === option.value}
              onPress={() => setRole(option.value)}
            />
          ))}
        </View>
      </FadeIn>
    </OnboardingScreen>
  );
}
