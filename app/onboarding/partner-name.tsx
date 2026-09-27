import { useFocusEffect, useRouter } from "expo-router";
import { useCallback } from "react";
import { GhostButton, PrimaryButton } from "../../components/ui";
import { DisplayField, FadeIn, Hint, OnboardingScreen, Prompt } from "../../components/onboarding";
import { resumeFromDraft, useDraftState, useOnboarding } from "../../lib/OnboardingProvider";

/**
 * Partner's name — asked once, right after Role, only for a mother or
 * father (never "Rather not say", which implies no partner role). Wholly
 * optional: a parent can Skip, which stores "" (asked, deliberately left
 * blank) rather than leaving the null "never asked" sentinel in place —
 * see lib/OnboardingProvider.tsx OnboardingDraft.partnerName.
 *
 * This is what lets a father's "for you" content name his wife rather
 * than misattributing her recovery to his own name (see
 * lib/parentCare.ts and app/(tabs)/you/nutrition.tsx).
 */
export default function PartnerName() {
  const router = useRouter();
  const { draft, hydrated, update } = useOnboarding();
  const [name, setName] = useDraftState(
    (d) => d.partnerName ?? "",
    (v) => v.trim() === ""
  );

  // Same landed-on-the-wrong-step guard the other conditional screens use
  // (see feeding.tsx) — a father whose role was already answered before
  // this question existed, or "Rather not say", should never see this.
  useFocusEffect(
    useCallback(() => {
      if (!hydrated) return;
      if (resumeFromDraft(draft) !== "/onboarding/partner-name") router.replace(resumeFromDraft(draft));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [draft, hydrated, router])
  );

  const proceed = (value: string) => {
    update({ partnerName: value.trim() });
    router.push("/onboarding/child-name");
  };

  return (
    <OnboardingScreen
      progress={2 / 7}
      scroll
      footer={
        <>
          <PrimaryButton title="Continue" onPress={() => proceed(name)} />
          <GhostButton title="Skip" onPress={() => proceed("")} />
        </>
      }
    >
      <FadeIn>
        <Prompt>What's your partner's name?</Prompt>
        <Hint>
          Entirely optional — we use it so your content can talk about the two of you by name,
          not just you.
        </Hint>
        <DisplayField
          label="Partner's name"
          value={name}
          onChangeText={setName}
          placeholder="Their first name"
          autoCapitalize="words"
          autoComplete="name"
          onSubmitEditing={() => proceed(name)}
        />
      </FadeIn>
    </OnboardingScreen>
  );
}
