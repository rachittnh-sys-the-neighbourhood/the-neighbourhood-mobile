import * as AppleAuthentication from "expo-apple-authentication";
import { Redirect, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path, Rect } from "react-native-svg";
import { LogoMark } from "../components/Logo";
import { useAuth } from "../lib/AuthProvider";
import { EMAIL_OTP_READY } from "../lib/authMode";
import * as session from "../lib/db/session";
import { useOnboarding } from "../lib/OnboardingProvider";
import { colors, fonts, radius, spacing, typeScale } from "../lib/theme";

/**
 * The front door — redesigned.
 *
 * Structure: a single screen with two visual zones.
 *
 *   Top — editorial brand promise. No illustration; typography IS the hero.
 *         The mark, an overline, a large headline, and a short paragraph.
 *
 *   Bottom — an authentication card that rises gently from the base of the
 *            screen. Apple / Google sign-in buttons, a sign-in link for
 *            returning parents, and the legal footer.
 *
 * The whole screen fades in in two stages: the brand promise first, then the
 * auth card 200ms later. Buttons have native press feedback. Everything is
 * calm, warm and intentional.
 *
 * Auth mode: signing in with Apple or Google creates a REAL account from
 * the first tap — there's no anonymous stage for these parents the way
 * there is for "Meet your Neighbourhood" (see lib/authMode.ts). Once
 * signed in, onboarding runs exactly the same; app/index.tsx doesn't care
 * how the session was created, only that one exists.
 *
 * Blocked on dashboard setup this code can't do: both providers need a
 * client ID/secret pasted into Supabase → Authentication → Providers, from
 * a Google Cloud OAuth client and an Apple Developer "Sign In with Apple"
 * key respectively. Until that's done, both buttons will fail with a
 * provider-not-enabled error from Supabase — that's expected, not a bug
 * in this file.
 */
export default function Welcome() {
  const router = useRouter();
  const { resumeHref, hasProgress } = useOnboarding();
  const { session: authSession, refreshFamily, authCallbackError } = useAuth();
  const [busyProvider, setBusyProvider] = useState<"apple" | "google" | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "ios") return;
    AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
  }, []);

  // Landing back here can itself BE a failed Google/Apple redirect return
  // (see AuthProvider's authCallbackError) — without this, that failure is
  // invisible: the parent just sees the sign-up screen again with no idea
  // anything went wrong.
  useEffect(() => {
    if (authCallbackError) setAuthError(authCallbackError);
  }, [authCallbackError]);

  const continueWithApple = async () => {
    setAuthError(null);
    setBusyProvider("apple");
    try {
      await session.signInWithApple();
      await refreshFamily();
      router.replace("/");
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : "Apple sign-in didn't go through."
      );
    } finally {
      setBusyProvider(null);
    }
  };

  const continueWithGoogle = async () => {
    setAuthError(null);
    setBusyProvider("google");
    try {
      await session.signInWithGoogle();
      await refreshFamily();
      router.replace("/");
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : "Google sign-in didn't go through."
      );
    } finally {
      setBusyProvider(null);
    }
  };

  // --- Staggered entrance animations ---
  const heroOpacity = useRef(new Animated.Value(0)).current;
  const heroTranslateY = useRef(new Animated.Value(16)).current;
  const sheetOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    // Hero fades in first
    Animated.parallel([
      Animated.timing(heroOpacity, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(heroTranslateY, {
        toValue: 0,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // Auth card follows 200ms later
    Animated.parallel([
      Animated.timing(sheetOpacity, {
        toValue: 1,
        duration: 560,
        delay: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: 0,
        duration: 560,
        delay: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleGetStarted = () => {
    router.push(resumeHref);
  };

  // app/index.tsx sends anyone without a child here, including a parent
  // who just finished a real Google/Apple sign-in — there's no "child yet"
  // for a brand-new account until onboarding creates one. Without this
  // check, that parent lands right back on this same sign-in card even
  // though they're already authenticated: it looks like the Google login
  // never went through. A session here means it did — skip straight into
  // onboarding instead of asking them to sign in again.
  if (authSession) return <Redirect href={resumeHref} />;

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      {/* ── Top: Brand Promise ── */}
      <Animated.View
        style={[
          styles.hero,
          { opacity: heroOpacity, transform: [{ translateY: heroTranslateY }] },
        ]}
      >
        <LogoMark size={48} />

        <Text style={styles.overline}>THE NEIGHBOURHOOD</Text>

        <Text style={styles.headline}>
          Parent with{"\n"}
          <Text style={styles.headlineAccent}>confidence.</Text>
        </Text>

        <Text style={styles.subheadline}>
          Evidence-based guidance, personalised activities and expert support
          for every stage of your parenting journey.
        </Text>
      </Animated.View>

      {/* ── Bottom: Authentication Card ── */}
      <Animated.View
        style={[
          styles.authCard,
          { opacity: sheetOpacity, transform: [{ translateY: sheetTranslateY }] },
        ]}
      >
        {hasProgress && (
          <Text style={styles.resumeHint}>
            Welcome back, we saved your place.
          </Text>
        )}

        {/* Continue with Apple — iOS only. There is no equivalent native
            sheet on Android/web, and a web-based stand-in is the thing
            Apple's review guidelines specifically exist to catch. */}
        {appleAvailable && (
          <Pressable
            onPress={continueWithApple}
            disabled={busyProvider !== null}
            style={({ pressed }) => [
              styles.authButton,
              styles.authButtonApple,
              pressed && styles.authButtonPressed,
              busyProvider !== null && styles.authButtonDisabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Continue with Apple"
          >
            {busyProvider === "apple" ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <AppleIcon />
                <Text style={[styles.authButtonText, styles.authButtonTextApple]}>
                  Continue with Apple
                </Text>
              </>
            )}
          </Pressable>
        )}

        {/* Continue with Google */}
        <Pressable
          onPress={continueWithGoogle}
          disabled={busyProvider !== null}
          style={({ pressed }) => [
            styles.authButton,
            styles.authButtonGoogle,
            pressed && styles.authButtonPressed,
            busyProvider !== null && styles.authButtonDisabled,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Continue with Google"
        >
          {busyProvider === "google" ? (
            <ActivityIndicator color={colors.charcoal} />
          ) : (
            <>
              <GoogleIcon />
              <Text style={[styles.authButtonText, styles.authButtonTextGoogle]}>
                Continue with Google
              </Text>
            </>
          )}
        </Pressable>

        {authError && <Text style={styles.authError}>{authError}</Text>}

        {/* The no-account path — unaffected by the buttons above. */}
        <Pressable
          onPress={handleGetStarted}
          hitSlop={8}
          style={({ pressed }) => [styles.laterWrap, pressed && { opacity: 0.6 }]}
        >
          <Text style={styles.laterText}>
            {hasProgress ? "Pick up where you left off" : "Not now, just let me in"}
          </Text>
        </Pressable>

        {/* Sign in link — hidden until Supabase can actually deliver the
            six-digit code verify.tsx expects (see lib/authMode.ts). A link
            that dead-ends is worse than no link. */}
        {EMAIL_OTP_READY && (
          <Pressable
            onPress={() => router.push("/sign-in")}
            hitSlop={12}
            style={({ pressed }) => [
              styles.signInWrap,
              pressed && { opacity: 0.6 },
            ]}
          >
            <Text style={styles.signInText}>
              Already have an account?{" "}
              <Text style={styles.signInLink}>Sign in</Text>
            </Text>
          </Pressable>
        )}

        {/* Legal */}
        <Text style={styles.legal}>
          By continuing you agree to our{"\n"}
          <Text
            style={styles.legalLink}
            onPress={() =>
              Linking.openURL("https://theneighbourhood.in/terms")
            }
          >
            Terms of Service
          </Text>
          {"  ·  "}
          <Text
            style={styles.legalLink}
            onPress={() =>
              Linking.openURL("https://theneighbourhood.in/privacy")
            }
          >
            Privacy Policy
          </Text>
        </Text>
      </Animated.View>
    </SafeAreaView>
  );
}

/* ------------------------------------------------------------------ */
/* Icons                                                               */
/* ------------------------------------------------------------------ */

function AppleIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C4.24 16.74 4.89 10.59 8.7 10.36c1.14.06 1.94.64 2.62.68.99-.2 1.94-.78 3-.72 1.27.1 2.22.58 2.85 1.5-2.6 1.56-1.98 4.98.22 5.94-.52 1.38-1.2 2.74-2.34 3.52ZM12.03 10.3c-.13-2.18 1.68-4.01 3.72-4.2.3 2.42-2.22 4.28-3.72 4.2Z"
        fill={colors.white}
      />
    </Svg>
  );
}

function GoogleIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
        fill="#4285F4"
      />
      <Path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z"
        fill="#34A853"
      />
      <Path
        d="M5.84 14.09A6.97 6.97 0 0 1 5.48 12c0-.72.13-1.43.36-2.09V7.07H2.18A11.96 11.96 0 0 0 .96 12c0 1.94.46 3.77 1.22 5.33l3.66-3.24Z"
        fill="#FBBC05"
      />
      <Path
        d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.09 14.97 0 12 0 7.7 0 3.99 2.47 2.18 6.07l3.66 2.84c.87-2.6 3.3-4.16 6.16-4.16Z"
        fill="#EA4335"
      />
    </Svg>
  );
}

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.cream,
  },

  // ── Hero ──
  hero: {
    flex: 1,
    paddingHorizontal: spacing.xl + 4,
    justifyContent: "center",
    alignItems: "center",
  },
  overline: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.caption,
    letterSpacing: 2.5,
    color: colors.warmTaupe,
    marginTop: spacing.xl,
    textAlign: "center",
  },
  headline: {
    fontFamily: fonts.bodyBold,
    fontSize: 38,
    lineHeight: 46,
    color: colors.charcoal,
    marginTop: spacing.md,
    textAlign: "center",
  },
  headlineAccent: {
    fontFamily: fonts.serifItalic,
    color: colors.warmTaupe,
  },
  subheadline: {
    fontFamily: fonts.body,
    fontSize: typeScale.body,
    lineHeight: typeScale.body * 1.6,
    color: colors.textMuted,
    marginTop: spacing.md,
    maxWidth: 320,
    textAlign: "center",
  },

  // ── Auth Card ──
  authCard: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.lg + 8,
    borderTopRightRadius: radius.lg + 8,
    paddingHorizontal: spacing.lg + 4,
    paddingTop: spacing.lg + 4,
    paddingBottom: Platform.OS === "ios" ? spacing.md : spacing.lg,
    gap: spacing.sm + 2,
    // Subtle lift — lighter than the old sheet
    shadowColor: "rgba(44, 44, 44, 0.06)",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 6,
  },
  resumeHint: {
    fontFamily: fonts.bodyMedium,
    fontSize: typeScale.bodySmall,
    color: colors.warmTaupe,
    textAlign: "center",
    marginBottom: spacing.xs,
  },

  // ── Auth Buttons ──
  authButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm + 2,
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  authButtonApple: {
    backgroundColor: colors.charcoal,
    borderColor: colors.charcoal,
  },
  authButtonGoogle: {
    backgroundColor: colors.white,
    borderColor: colors.border,
  },
  authButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },
  authButtonDisabled: {
    opacity: 0.6,
  },
  authButtonText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.body,
  },
  authButtonTextApple: {
    color: colors.white,
  },
  authButtonTextGoogle: {
    color: colors.charcoal,
  },
  authError: {
    fontFamily: fonts.body,
    fontSize: typeScale.caption,
    color: colors.error,
    textAlign: "center",
    marginTop: spacing.xs,
  },

  // ── No-account path ──
  laterWrap: {
    alignItems: "center",
    paddingVertical: spacing.xs + 2,
  },
  laterText: {
    fontFamily: fonts.bodyMedium,
    fontSize: typeScale.bodySmall,
    color: colors.warmTaupe,
  },

  // ── Sign in link ──
  signInWrap: {
    alignItems: "center",
    paddingVertical: spacing.xs + 2,
  },
  signInText: {
    fontFamily: fonts.body,
    fontSize: typeScale.bodySmall,
    color: colors.textMuted,
  },
  signInLink: {
    fontFamily: fonts.bodySemiBold,
    color: colors.warmTaupe,
  },

  // ── Legal ──
  legal: {
    fontFamily: fonts.body,
    fontSize: typeScale.caption,
    lineHeight: typeScale.caption * 1.6,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.xs,
  },
  legalLink: {
    fontFamily: fonts.bodyMedium,
    color: colors.warmTaupe,
  },
});
