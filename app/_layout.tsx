import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { PlayfairDisplay_400Regular_Italic } from "@expo-google-fonts/playfair-display";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "../lib/AuthProvider";
import { ModeProvider } from "../lib/ModeProvider";
import { OnboardingProvider } from "../lib/OnboardingProvider";
import { registerServiceWorker } from "../lib/registerServiceWorker";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    PlayfairDisplay_400Regular_Italic,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  useEffect(() => {
    registerServiceWorker();
  }, []);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ModeProvider>
          <OnboardingProvider>
            <StatusBar style="dark" />
            {/* Headers are owned by each area: the tab navigator draws its
                own, onboarding uses its bespoke OnboardingScreen chrome.
                Profile is a modal rather than a route inside (tabs), so
                account settings never occupy one of the five tab slots.

                Child and You both live inside (tabs) now, as nested Stacks
                — there's no separate sibling shell to swap into, since
                there's no more mode toggle for ModeProvider to react to.
                It still derives a palette from the route (see
                lib/ModeProvider.tsx) for the Child/You colour-temperature
                cue, just without any navigation of its own. */}
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen
                name="profile"
                options={{ presentation: "modal" }}
              />
              <Stack.Screen
                name="recovery-settings"
                options={{ presentation: "modal" }}
              />
              <Stack.Screen
                name="secure-account"
                options={{ presentation: "modal" }}
              />
              <Stack.Screen
                name="child/add"
                options={{ presentation: "modal" }}
              />
              <Stack.Screen
                name="child/edit"
                options={{ presentation: "modal" }}
              />
              <Stack.Screen
                name="community/discussion"
                options={{ presentation: "card" }}
              />
              <Stack.Screen
                name="community/ask"
                options={{ presentation: "modal" }}
              />
            </Stack>
          </OnboardingProvider>
        </ModeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
