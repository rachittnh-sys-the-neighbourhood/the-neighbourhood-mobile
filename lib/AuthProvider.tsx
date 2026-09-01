import AsyncStorage from "@react-native-async-storage/async-storage";
import { Session } from "@supabase/supabase-js";
import { useRouter } from "expo-router";
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import * as family from "./db/family";
import { isAccountLinked } from "./db/session";
import type { Child, Profile } from "./db/types";
import { supabase } from "./supabase";

/**
 * The signed-in family.
 *
 * The database is the source of truth: `child` comes from the `children`
 * table, not from device storage. That's what makes the same family
 * appear on a reinstall once the account is linked to an email, and it's
 * why lib/localProfile.ts is gone.
 *
 * `profile` carries the parent's own facts (role, birth method, feeding
 * method — see lib/parentCare.ts) the same way: collected once during main
 * onboarding, read from `profiles`, never a second local copy. This
 * replaced a separate AsyncStorage-only "Recovery Profile" that was asked
 * on first visit to the You tab and never survived a reinstall.
 *
 * `Child` is re-exported from lib/db/types so screens keep importing it
 * from here — its shape now matches the table exactly (uuid id, no
 * interests/goals columns; those are learned from activity_log instead of
 * being stored on the child).
 */
export type { Child, Profile };

/** Which child a device last chose to view, so it survives a restart. */
const ACTIVE_CHILD_KEY = "neighbourhood.activeChildId";

/**
 * Retries a failing async call a couple of times with a short, growing
 * delay before giving up — absorbs a transient failure (e.g. the network
 * stack not fully reconnected yet right after a device wakes up) instead
 * of surfacing it as a hard error on the very first attempt.
 */
async function withRetries<T>(run: () => Promise<T>, attempts = 3, delayMs = 600): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await run();
    } catch (err) {
      lastError = err;
      if (attempt < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
      }
    }
  }
  throw lastError;
}

type AuthState = {
  session: Session | null;
  /** Still resolving the initial session. */
  loading: boolean;
  /** Fetching profile/children rows. */
  familyLoading: boolean;
  parentName: string | null;
  /** The full profiles row — role/birth/feeding live on `relationship` /
   *  `birth_method` / `feeding_method`. Null until a session resolves. */
  profile: Profile | null;
  /** The child every child-scoped screen reads — whichever is active. */
  child: Child | null;
  /** All of this parent's children, oldest first. Length 1 for the common
   *  case; the switcher only appears when there's more than one. */
  children: Child[];
  /** Switches which child `child` points to, and remembers the choice. */
  setActiveChild: (childId: string) => void;
  /** Adds a new child and makes it the active one. */
  addChild: (input: {
    name: string;
    dateOfBirth: string;
    gender?: string | null;
    gestationalWeeks?: number | null;
  }) => Promise<Child>;
  connectionError: string | null;
  /**
   * True once an email is confirmed on this account. Until then the family
   * exists only on this device — see isAccountLinked. Screens use this to
   * decide whether signing out is safe and whether to offer linking.
   */
  accountLinked: boolean;
  /** The confirmed email, for display. Null while anonymous. */
  accountEmail: string | null;
  hydrateFamily: (input: { profile: Profile; child: Child }) => void;
  refreshFamily: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children: appChildren }: { children: React.ReactNode }) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [familyLoading, setFamilyLoading] = useState(false);
  const [parentName, setParentName] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [child, setChild] = useState<Child | null>(null);
  const [kids, setKids] = useState<Child[]>([]);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  // Which user id `child` currently reflects. Lets fetchFamily tell "a
  // slower fetch for the SAME user landed late" (keep the newer local
  // state) apart from "the signed-in identity actually changed" (an old
  // anonymous account's child must never leak into a fresh Google/Apple
  // sign-in that legitimately has none yet).
  const childUserId = useRef<string | null>(null);

  const fetchFamily = async (userId: string) => {
    setFamilyLoading(true);
    setConnectionError(null);
    try {
      // A PWA/home-screen relaunch after the device has been asleep for a
      // while is the common case that lands here: the page reloads and
      // fires this fetch before the network stack has actually finished
      // reconnecting, so the very first attempt fails even though the
      // connection is fine a moment later. Retrying a couple of times
      // before surfacing the hard error screen (see connection-error.tsx)
      // absorbs exactly that race, rather than making the parent tap "Try
      // again" themselves for something that would have resolved on its own.
      const [profileRow, allKids] = await withRetries(() =>
        Promise.all([family.getProfile(userId), family.listChildren(userId)])
      );
      setParentName(profileRow?.parent_name ?? null);
      // No stale-carry-over guard needed here the way `child` needs one:
      // the profiles row is created by a DB trigger the moment a user
      // exists (see lib/db/family.ts), so profileRow is only ever null
      // for a split second before that trigger runs — never a legitimate
      // "this account has no profile" state to protect against overwriting.
      setProfile(profileRow);
      setKids(allKids);
      // Prefer whichever child this device was last looking at, so a
      // switch survives app restarts; fall back to the oldest child.
      const lastActiveId = await AsyncStorage.getItem(ACTIVE_CHILD_KEY).catch(() => null);
      const primary = allKids.find((k) => k.id === lastActiveId) ?? allKids[0] ?? null;
      // Anonymous signup can fire an auth-state fetch before onboarding has
      // inserted the child row. If that slower "no child yet" response lands
      // after onboarding has already hydrated the created child locally for
      // this SAME user, do not erase the dashboard's source of truth. But if
      // the signed-in user has changed since `child` was last set, `primary`
      // is authoritative even when null — otherwise a previous anonymous
      // account's child would leak into a brand-new Google/Apple sign-in.
      setChild((current) => (primary ?? (childUserId.current === userId ? current : null)));
      childUserId.current = userId;
    } catch {
      // Network/DNS failures land here too — surface a calm message rather
      // than leaving the app stuck on a spinner forever.
      setConnectionError(
        "We couldn't reach The Neighbourhood right now. Please check your connection and try again."
      );
    } finally {
      setFamilyLoading(false);
    }
  };

  const refreshFamily = async () => {
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user?.id;
    // Keep session in step: onboarding may have created one since mount.
    setSession(data.session);
    if (userId) await fetchFamily(userId);
  };

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      if (data.session?.user?.id) {
        await fetchFamily(data.session.user.id);
      }
      setLoading(false);
    })();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession?.user?.id) {
        fetchFamily(newSession.user.id);
      } else {
        // Signed out — clear, or the next person on this device inherits
        // the previous family.
        setParentName(null);
        setProfile(null);
        setChild(null);
        setKids([]);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    setParentName(null);
    setProfile(null);
    setChild(null);
    setKids([]);
    await supabase.auth.signOut();
    // Without this, the app just stays on whatever screen was open (e.g.
    // the Profile modal) instead of landing back on "/", which is what
    // re-evaluates auth state and sends a signed-out family to /welcome —
    // see app/index.tsx.
    router.replace("/");
  };

  const hydrateFamily = (input: { profile: Profile; child: Child }) => {
    setParentName(input.profile.parent_name);
    setProfile(input.profile);
    setChild(input.child);
    setKids([input.child]);
    setConnectionError(null);
    setFamilyLoading(false);
  };

  /** Switches the active child and remembers the choice for next launch. */
  const setActiveChild = (childId: string) => {
    const next = kids.find((k) => k.id === childId);
    if (!next) return;
    setChild(next);
    AsyncStorage.setItem(ACTIVE_CHILD_KEY, childId).catch(() => {});
  };

  /** Adds a child under the signed-in parent and makes them the active one. */
  const addChild = async (input: {
    name: string;
    dateOfBirth: string;
    gender?: string | null;
    gestationalWeeks?: number | null;
  }): Promise<Child> => {
    const userId = session?.user?.id;
    if (!userId) throw new Error("addChild requires a signed-in parent");
    const created = await family.createChild({ parentId: userId, ...input });
    setKids((prev) => [...prev, created]);
    setChild(created);
    AsyncStorage.setItem(ACTIVE_CHILD_KEY, created.id).catch(() => {});
    return created;
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
        familyLoading,
        parentName,
        profile,
        child,
        children: kids,
        setActiveChild,
        addChild,
        connectionError,
        accountLinked: isAccountLinked(session?.user),
        accountEmail: isAccountLinked(session?.user) ? session?.user?.email ?? null : null,
        hydrateFamily,
        refreshFamily,
        signOut,
      }}
    >
      {appChildren}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
