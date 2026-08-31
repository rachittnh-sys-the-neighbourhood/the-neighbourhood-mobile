import { Tabs, useRouter } from "expo-router";
import { AvatarButton } from "../../components/AvatarButton";
import { LogoMark } from "../../components/Logo";
import { AskTabIcon, ChildIcon, CommunityIcon, HomeIcon, YouIcon } from "../../components/TabIcons";
import { useMode } from "../../lib/ModeProvider";
import { colors, spacing, type } from "../../lib/theme";

/**
 * The app shell: ONE permanent bottom bar, five destinations, no toggle.
 *
 *   Home       — what matters today, for the family (zero taps: it's the
 *                landing screen)
 *   Community  — learn from and connect with parents at a similar stage
 *   Ask        — the single AI entry point (one tap from anywhere)
 *   Child      — everything about understanding, supporting, tracking them
 *   You        — everything about taking care of the parent
 *
 * This replaces two 4-tab bars (Child Mode / Parent Mode) swapped by a
 * header toggle. Child and You are both still real internal "zones" —
 * ModeProvider still derives a palette from the route, since a subtle
 * colour-temperature shift is a useful wayfinding cue — but nothing about
 * that is a concept the user has to learn. They just pick a tab.
 *
 * Family and app settings live behind the avatar in the top-right corner
 * of every screen, presented as a modal. Account chrome does not deserve
 * a permanent tab — parents open the app to plan, ask, or understand, not
 * to edit their profile.
 *
 * Child and You are both nested Stacks (not flat screens): tapping into a
 * section pushes a real screen with a back button while the tab bar stays
 * visible, and re-tapping the tab always lands back on that zone's home
 * rather than reopening whatever was left open.
 */
export default function TabsLayout() {
  const router = useRouter();
  // The bar itself is one permanent shell shared by all five tabs, so it
  // can't read a per-screen palette the way You's own Stack does — it has
  // to pick, per render, whether the CURRENT route is in You/Care and
  // theme itself to match, same wayfinding cue as the header change (see
  // lib/ModeProvider.tsx).
  const { palette, isParent } = useMode();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.cream },
        headerShadowVisible: false,
        headerTitleStyle: {
          ...type.title,
          color: colors.charcoal,
        },
        headerRight: () => <AvatarButton />,
        // In You/Care, the active icon matches the parent palette's own
        // primary so it doesn't clash with the greener bar background;
        // everywhere else it's the app's dark-sage "pop" accent (see
        // colors.sageDark) rather than plain charcoal.
        tabBarActiveTintColor: isParent ? palette.primary : colors.sageDark,
        tabBarInactiveTintColor: isParent ? palette.textMuted : colors.textMuted,
        tabBarStyle: {
          backgroundColor: isParent ? palette.bg : colors.cream,
          borderTopColor: isParent ? palette.border : colors.border,
          paddingTop: spacing.xs,
          paddingBottom: spacing.sm,
          height: 76,
        },
        // On the scale, and SemiBold rather than Medium — the tab bar was
        // the last place Medium survived, and 10px sat below every other
        // size in the app.
        tabBarLabelStyle: {
          ...type.eyebrow,
          letterSpacing: 0.2,
          textTransform: "none",
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          // The greeting below already says who this is for, so the header
          // carries the mark instead of a title that would repeat it.
          headerTitle: () => <LogoMark size={26} />,
          tabBarIcon: ({ color, focused }) => <HomeIcon color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: "Community",
          tabBarIcon: ({ color, focused }) => <CommunityIcon color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="ask"
        options={{
          title: "Ask",
          tabBarIcon: () => <AskTabIcon />,
        }}
      />
      <Tabs.Screen
        name="child"
        options={{
          title: "Child",
          headerShown: false, // the nested Stack draws its own header
          tabBarIcon: ({ color, focused }) => <ChildIcon color={color} focused={focused} />,
        }}
        listeners={{
          tabPress: (event) => {
            event.preventDefault();
            router.replace("/child");
          },
        }}
      />
      <Tabs.Screen
        name="you"
        options={{
          title: "You",
          headerShown: false, // the nested Stack draws its own header
          tabBarIcon: ({ color, focused }) => <YouIcon color={color} focused={focused} />,
        }}
        listeners={{
          tabPress: (event) => {
            event.preventDefault();
            router.replace("/you");
          },
        }}
      />
    </Tabs>
  );
}
