import { Stack } from "expo-router";
import { AvatarButton } from "../../../components/AvatarButton";
import { usePalette } from "../../../lib/ModeProvider";
import { fonts } from "../../../lib/theme";

/**
 * You is a Stack, same shape as Child: it lands on a feature-card hub
 * (index) rather than a menu of headings, and every section pushes over
 * it with a real back button. "Today" — the parent's own daily companion
 * (check-in, nourishment, recovery line) — used to BE this landing
 * screen; it's now folded into the hub itself, reached directly from
 * index rather than a card pushing to its own screen.
 *
 * Palette: You's screens read the "parent" palette (a cooler eucalyptus
 * tone, see lib/theme.ts) purely as a wayfinding cue — the room changes
 * temperature when you're in your own space, even though there's no more
 * toggle or transition ceremony to announce it. modeForPath() in
 * ModeProvider derives this from the /you and /care route prefixes.
 */
export default function YouLayout() {
  const p = usePalette();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: p.bg },
        headerShadowVisible: false,
        headerTintColor: p.primary,
        headerTitleStyle: {
          fontFamily: fonts.bodySemiBold,
          fontSize: 17,
          color: p.text,
        },
      }}
    >
      <Stack.Screen name="index" options={{ title: "You", headerRight: () => <AvatarButton /> }} />
      <Stack.Screen name="nutrition" options={{ title: "Family Meal Planner" }} />
      {/* Own custom header (see you/meal.tsx) -- back arrow + slot name,
          matching the agreed layout exactly rather than the Stack's
          default. */}
      <Stack.Screen name="meal" options={{ headerShown: false }} />
      {/* A father's full monthly activity inventory — deliberately not on
          the landing page (see you/index.tsx's FOR TODAY section), one
          tap away via "See more for today →". */}
      <Stack.Screen name="for-today" options={{ title: "For Today" }} />
      {/* Titled "You" rather than "Care" — every WELL BEING/EXPLORE tile on
          the hub pushes here, and the header should still read as "you're
          still in your own space", not name a screen concept the parent
          never chose to open. */}
      <Stack.Screen name="care" options={{ title: "You" }} />
      {/* Mother-only -- "Your wellbeing", the hub above the four personal
          wellbeing areas (physical/mental/sleep/feeding). See
          you/wellbeing.tsx. */}
      <Stack.Screen name="wellbeing" options={{ title: "Your wellbeing" }} />
      {/* One mother_activities row, in full -- reached from a FOR TODAY
          card's "See how" or wellbeing's featured activity. */}
      <Stack.Screen name="activity/[id]" options={{ title: "" }} />
      {/* One father_activities row, in full -- the father-side mirror of
          activity/[id] above. */}
      <Stack.Screen name="father-activity/[id]" options={{ title: "" }} />
      <Stack.Screen name="checkins" options={{ title: "Past check-ins" }} />
    </Stack>
  );
}
