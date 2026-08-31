import { Stack } from "expo-router";
import { AvatarButton } from "../../../components/AvatarButton";
import { usePalette } from "../../../lib/ModeProvider";
import { fonts } from "../../../lib/theme";

/**
 * You is a Stack, same shape as Child: it lands on a feature-card hub
 * (index) rather than a menu of headings, and every section pushes over
 * it with a real back button. "Today" — the parent's own daily companion
 * (check-in, nourishment, recovery line) — used to BE this landing
 * screen; it's now its own pushed screen like Care and Nutrition, reached
 * from a card on the hub, so the hub itself stays as clean and scannable
 * as Child's.
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
      <Stack.Screen name="today" options={{ title: "Today" }} />
      <Stack.Screen name="nutrition" options={{ title: "Nutrition" }} />
      {/* Titled "You" rather than "Care" — every WELL BEING tile on the hub
          pushes here, and the header should still read as "you're still in
          your own space", not name a screen concept the parent never
          chose to open. */}
      <Stack.Screen name="care" options={{ title: "You" }} />
    </Stack>
  );
}
