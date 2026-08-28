import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";
import { AUTH_MODE } from "../authMode";
import { DbError, supabase } from "./client";

// Lets the in-app browser tab used for the Google OAuth round-trip close
// itself and hand control back to the app once Supabase redirects to our
// custom scheme. Must run at module scope, before any sign-in is attempted.
WebBrowser.maybeCompleteAuthSession();

/**
 * Getting a usable session.
 *
 * Every write in this app goes through RLS, which means nothing reaches
 * the database without an auth.uid(). This is the one place that
 * guarantees one exists.
 *
 * In anonymous mode a session is created on demand — the parent never
 * sees it happen. In email mode a session must already exist (verify.tsx
 * created it), and the absence of one is a real error rather than
 * something to paper over by silently signing them in as someone else.
 */

/** The current user id, or null if there's no session. */
export async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

/**
 * Whether this account can survive losing the device.
 *
 * An anonymous account lives entirely in this install's stored refresh
 * token. Delete the app, change phone, or sign out, and the family — child,
 * milestones, vaccination records, plan history — is unreachable forever,
 * because there is no identifier left to authenticate as.
 *
 * Supabase clears `is_anonymous` once an email is confirmed, so the two
 * checks agree; we require both because `email` alone can be set-but-
 * unconfirmed mid-flow, and an unconfirmed email cannot sign you back in.
 */
export function isAccountLinked(user: {
  email?: string | null;
  is_anonymous?: boolean;
} | null | undefined): boolean {
  if (!user) return false;
  return Boolean(user.email) && user.is_anonymous !== true;
}

/**
 * Attach an email to the account currently signed in.
 *
 * This is an email CHANGE on an existing user, not a new sign-up — the
 * whole point is that auth.uid() stays the same, so every children /
 * child_milestones / daily_plans row keeps pointing at it and no migration
 * is needed. Supabase sends a six-digit code to the address given.
 */
export async function linkEmail(email: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ email: email.trim() });
  if (error) {
    throw new DbError(
      "session.linkEmail",
      new Error(
        error.message.toLowerCase().includes("already")
          ? "That email is already attached to another family."
          : error.message
      )
    );
  }
}

/**
 * Confirm the code sent by linkEmail.
 *
 * Deliberately "email_change" rather than "email": the latter verifies a
 * fresh sign-up, and using it here fails against an account that already
 * exists.
 */
export async function confirmEmailLink(email: string, token: string): Promise<void> {
  const { error } = await supabase.auth.verifyOtp({
    email: email.trim(),
    token,
    type: "email_change",
  });
  if (error) {
    throw new DbError("session.confirmEmailLink", error);
  }
}

/**
 * Sign in with Apple.
 *
 * iOS only — deliberately. Apple requires the native AuthenticationServices
 * sheet on iOS (a web-based Apple login inside your own app is the thing
 * their review guidelines exist to catch), and there is no equivalent
 * native Apple sheet on Android or web. Callers must check availability
 * before showing the button; this throws rather than silently no-op-ing if
 * they don't, because a button that does nothing is worse than no button.
 *
 * The nonce dance is Supabase's requirement for `signInWithIdToken`: Apple
 * signs the identity token over a hash of the nonce, and Supabase verifies
 * that hash server-side against the raw nonce this function sends — it's
 * what stops a captured token from being replayed against a different
 * session.
 *
 * Resolves silently (no session, no error) if the parent dismisses the
 * sheet — that is the normal "changed my mind" path, not a failure.
 */
export async function signInWithApple(): Promise<void> {
  if (Platform.OS !== "ios") {
    throw new DbError(
      "session.signInWithApple",
      new Error("Sign in with Apple is only available on iOS.")
    );
  }

  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce
  );

  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });
  } catch (err) {
    // Apple's own code for "the parent tapped Cancel" — not an error.
    if (err instanceof Error && "code" in err && err.code === "ERR_REQUEST_CANCELED") {
      return;
    }
    throw new DbError("session.signInWithApple", err instanceof Error ? err : new Error(String(err)));
  }

  if (!credential.identityToken) {
    throw new DbError(
      "session.signInWithApple",
      new Error("Apple did not return an identity token.")
    );
  }

  const { error } = await supabase.auth.signInWithIdToken({
    provider: "apple",
    token: credential.identityToken,
    nonce: rawNonce,
  });
  if (error) throw new DbError("session.signInWithApple", error);
}

/**
 * Sign in with Google.
 *
 * Goes through Supabase's hosted OAuth rather than a native Google Sign-In
 * SDK: one code path for iOS, Android and web, and no separate native
 * client ID to register per platform in Google Cloud Console — only the
 * single web client ID Supabase's provider settings ask for. The cost is a
 * system browser tab flashing open instead of Google's native bottom
 * sheet; for a first release that trade is worth the platform code we
 * don't have to maintain three copies of.
 *
 * `WebBrowser.openAuthSessionAsync` opens that tab and suspends until
 * Supabase redirects back to the app's own scheme
 * (`theneighbourhood://auth-callback`, registered via app.json), at which
 * point the tokens Supabase attached to the redirect URL become this
 * device's session.
 *
 * Web is a separate path (see below): there is no system browser tab to
 * hand off to, and `WebBrowser`'s web shim opens Google in a popup via
 * `window.open()`, which mobile browsers — and plenty of desktop ones —
 * block unless it happens synchronously inside the click that triggered
 * it. Awaiting `signInWithOAuth` first, as this function always did,
 * guarantees it never does. A full-page redirect can't be blocked because
 * it isn't a new window at all.
 *
 * Resolves silently if the parent backs out of the browser sheet, same as
 * the Apple path above.
 */
export async function signInWithGoogle(): Promise<void> {
  if (Platform.OS === "web") {
    // Supabase attaches the session to this URL's hash fragment on
    // return; detectSessionInUrl (web only — see lib/supabase.ts) reads
    // it back out once the page reloads here, and the app's normal
    // session-driven routing (app/index.tsx) takes it from there.
    const redirectTo = window.location.origin + "/";
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo, skipBrowserRedirect: false },
    });
    if (error) throw new DbError("session.signInWithGoogle", error);
    return; // the page is navigating away; there is no "after" on web
  }

  const redirectTo = Linking.createURL("auth-callback");

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw new DbError("session.signInWithGoogle", error);
  if (!data.url) {
    throw new DbError("session.signInWithGoogle", new Error("No Google auth URL returned."));
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== "success" || !("url" in result)) {
    return; // cancel / dismiss. The parent backed out, not an error
  }

  // Supabase appends the session as a URL fragment, not a query string
  // (#access_token=...&refresh_token=...) — swap the delimiter so the
  // standard URL/URLSearchParams parser can read it.
  const parsed = new URL(result.url.replace("#", "?"));
  const access_token = parsed.searchParams.get("access_token");
  const refresh_token = parsed.searchParams.get("refresh_token");
  if (!access_token || !refresh_token) {
    throw new DbError(
      "session.signInWithGoogle",
      new Error("Google sign-in completed but returned no session.")
    );
  }

  const { error: sessionError } = await supabase.auth.setSession({ access_token, refresh_token });
  if (sessionError) throw new DbError("session.signInWithGoogle", sessionError);
}

/**
 * Returns a user id, creating an anonymous session if that's the mode and
 * none exists yet. Throws rather than returning null: callers use this
 * precisely because they're about to write, and a silent null would
 * become an RLS failure three frames later with no useful message.
 */
export async function ensureSession(): Promise<string> {
  const existing = await currentUserId();
  if (existing) return existing;

  if (AUTH_MODE !== "anonymous") {
    throw new DbError(
      "session.ensureSession",
      new Error("No session. Sign in before writing.")
    );
  }

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) {
    // The most likely cause by far, and completely invisible from the
    // client otherwise, so name it explicitly.
    throw new DbError(
      "session.ensureSession",
      new Error(
        error.message.includes("disabled")
          ? "Anonymous sign-ins are disabled for this Supabase project. Enable them under Authentication → Providers → Anonymous."
          : error.message
      )
    );
  }

  const id = data.session?.user?.id;
  if (!id) {
    throw new DbError("session.ensureSession", new Error("No user returned"));
  }
  return id;
}
