import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { EMAIL_AUTH_ENABLED } from "./authMode";
import { computeAge } from "./childAge";
import { isRecoveryRelevant } from "./recoveryRelevance";

/**
 * The onboarding draft — collected BEFORE the parent ever creates an account.
 * The flow is mobile+email → (auth) → parent name → your role → partner's
 * name (mother/father only) → child name → birthday → birth type (mother
 * only) → feeding (first year only) → gender: one question per screen,
 * short enough to finish in under a minute. The draft is mirrored to
 * AsyncStorage so a parent who closes the app mid-flow resumes exactly
 * where they left off.
 *
 * Both the child's facts AND the parent's own (role, birth type, feeding
 * method) are collected here, in the same coherent setup — not as a
 * separate "Parent Care" questionnaire sprung on the parent later. Home
 * needs all of this to personalise the very first screen, so it can't wait
 * until a parent happens to open the You tab. See lib/AuthProvider.tsx for
 * where these facts end up (the `profiles` row) and lib/parentCare.ts for
 * how they're used.
 *
 * These seven facts are the ONLY profiling the app ever does up front.
 * Everything else — interests, goals, temperament — is learned from usage
 * (activities completed, notes, copilot questions), never from a form.
 */
export type OnboardingDraft = {
  mobile: string;
  email: string;
  parentName: string;
  role: "" | "mother" | "father" | "prefer_not_to_say";
  /**
   * Partner's first name — asked once, right after Role, only for a
   * mother or father (never for "Rather not say", which has no partner
   * role to name). null = not yet asked; "" = asked and deliberately left
   * blank — same not-yet-vs-answered-blank distinction as
   * gestationalWeeks below. Lets a father's "for you" copy name his wife
   * rather than misattributing her recovery to his own name.
   */
  partnerName: string | null;
  childName: string;
  dateOfBirth: string; // YYYY-MM-DD
  /**
   * Weeks of gestation at birth — 40 for full term, lower for preterm,
   * null for never asked. Collected inline on the birthday screen rather
   * than as its own step, and only for a child under two, so it costs the
   * flow nothing for the parents it doesn't apply to. See
   * components/BornEarlyQuestion.tsx and lib/childAge.ts developmentalAge.
   */
  gestationalWeeks: number | null;
  birthMethod: "" | "vaginal" | "caesarean" | "prefer_not_to_say";
  feedingMethod: "" | "exclusive" | "combination" | "formula" | "prefer_not_to_say";
  gender: string; // Boy | Girl | Prefer not to say
};

const EMPTY: OnboardingDraft = {
  mobile: "",
  email: "",
  parentName: "",
  role: "",
  partnerName: null,
  childName: "",
  dateOfBirth: "",
  gestationalWeeks: null,
  birthMethod: "",
  feedingMethod: "",
  gender: "",
};

// Bumped from v2: the draft shape gained role/birthMethod/feedingMethod,
// and a half-finished v2 draft would resume into a screen expecting them.
//
// Deliberately NOT bumped for gestationalWeeks: that addition is purely
// additive (a v3 draft picks up `null` from EMPTY on the spread below,
// and resumeFromDraft never branches on it), so a bump would throw away
// in-progress drafts to fix a problem that doesn't exist.
const STORAGE_KEY = "tn.onboarding.draft.v3";

/**
 * Birth type is about the birthing parent's own body — asked only when the
 * parent has said they're the mother (or hasn't said either way; a father
 * is never asked). Feeding is asked alongside it for the same reason
 * lib/parentCare.ts groups them, AND only while a newborn framing still
 * fits the child's age, so an 18-month-old's parent is never asked a
 * postpartum feeding question. Both gates mirror the exact rules
 * isCareAreaVisible/isRecoveryRelevant apply everywhere else in the app.
 */
function asksBirthingQuestions(role: OnboardingDraft["role"]): boolean {
  return role !== "father";
}

/** A partner to name only exists once the parent has said which role
 *  they are — "Rather not say" has no partner role implied, so it's
 *  never asked there either. */
function asksPartnerName(role: OnboardingDraft["role"]): boolean {
  return role === "mother" || role === "father";
}

function childStillInFirstYear(dateOfBirth: string): boolean {
  if (!dateOfBirth) return false;
  const ageMonths = computeAge(dateOfBirth)?.totalMonths ?? 0;
  return isRecoveryRelevant(ageMonths);
}

// The linear order of the flow. Used only to decide where to resume a
// half-finished draft — never shown to the parent as "step N of M".
export const ONBOARDING_STEPS = [
  ...(EMAIL_AUTH_ENABLED ? (["/onboarding/contact"] as const) : []),
  "/onboarding/parent-name",
  "/onboarding/role",
  "/onboarding/partner-name",
  "/onboarding/child-name",
  "/onboarding/birthday",
  "/onboarding/birth-type",
  "/onboarding/feeding",
  "/onboarding/gender",
] as const;

type OnboardingContextValue = {
  draft: OnboardingDraft;
  hydrated: boolean; // AsyncStorage read has completed
  update: (patch: Partial<OnboardingDraft>) => void;
  clear: () => Promise<void>;
  /** The furthest screen the parent has meaningful data for — for resume. */
  resumeHref: (typeof ONBOARDING_STEPS)[number];
  hasProgress: boolean;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

/**
 * "Given what's filled in so far, what's the next thing to ask?" Used both
 * to resume a half-finished draft on relaunch AND, by conditional screens
 * (birthday, birth-type), to decide their own Continue destination — so
 * the branching logic (mother vs father, first year vs not) lives in
 * exactly one place instead of being re-derived per screen.
 */
export function resumeFromDraft(d: OnboardingDraft): (typeof ONBOARDING_STEPS)[number] {
  if (EMAIL_AUTH_ENABLED && (!d.mobile || !d.email)) return "/onboarding/contact";
  if (!d.parentName) return "/onboarding/parent-name";
  if (!d.role) return "/onboarding/role";
  if (asksPartnerName(d.role) && d.partnerName === null) return "/onboarding/partner-name";
  if (!d.childName) return "/onboarding/child-name";
  if (!d.dateOfBirth) return "/onboarding/birthday";
  if (asksBirthingQuestions(d.role) && !d.birthMethod) return "/onboarding/birth-type";
  if (asksBirthingQuestions(d.role) && childStillInFirstYear(d.dateOfBirth) && !d.feedingMethod) {
    return "/onboarding/feeding";
  }
  return "/onboarding/gender";
}

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [draft, setDraft] = useState<OnboardingDraft>(EMPTY);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setDraft({ ...EMPTY, ...JSON.parse(raw) });
      })
      .catch(() => {})
      .finally(() => setHydrated(true));
  }, []);

  const update = (patch: Partial<OnboardingDraft>) => {
    setDraft((prev) => {
      const next = { ...prev, ...patch };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  };

  const clear = async () => {
    setDraft(EMPTY);
    await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  };

  // Any field the CURRENT flow actually collects. Keying this off
  // mobile/email alone meant it was permanently false with auth off,
  // since those screens no longer run — so a parent who quit halfway was
  // never offered their place back.
  const hasProgress = Boolean(
    draft.mobile || draft.email || draft.parentName || draft.childName || draft.dateOfBirth
  );

  return (
    <OnboardingContext.Provider
      value={{ draft, hydrated, update, clear, resumeHref: resumeFromDraft(draft), hasProgress }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

/**
 * Screen state seeded from the draft, correctly across hydration.
 *
 * The draft starts EMPTY and is filled in asynchronously from
 * AsyncStorage, so a plain `useState(draft.x)` captures the empty value
 * on any screen that mounts before that read resolves — a reload or a
 * deep link straight onto the screen — and the parent finds the answer
 * they already gave missing. This seeds the state once hydration lands,
 * and only while the parent hasn't answered in the meantime: a value
 * they typed or picked post-mount always wins over the stored one.
 */
export function useDraftState<T>(
  select: (draft: OnboardingDraft) => T,
  isUnanswered: (value: T) => boolean
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const { draft, hydrated } = useOnboarding();
  const [value, setValue] = useState<T>(() => select(draft));

  // Read through refs so the seeding effect can depend on `hydrated`
  // alone — the callers pass inline functions, which change identity on
  // every render and would otherwise re-run it constantly.
  const latest = useRef({ draft, select, isUnanswered });
  latest.current = { draft, select, isUnanswered };

  const seeded = useRef(false);
  useEffect(() => {
    if (!hydrated || seeded.current) return;
    seeded.current = true;
    const { draft: d, select: pick, isUnanswered: blank } = latest.current;
    setValue((current) => (blank(current) ? pick(d) : current));
  }, [hydrated]);

  return [value, setValue];
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error("useOnboarding must be used within OnboardingProvider");
  return ctx;
}
