import { Stack } from "expo-router";
import { AvatarButton } from "../../../components/AvatarButton";
import { HeaderTitleWithMark } from "../../../components/Logo";
import { useAuth } from "../../../lib/AuthProvider";
import { CHILD_SECTIONS } from "../../../lib/childSections";
import { colors, fonts } from "../../../lib/theme";

/**
 * Child is a Stack, not a flat screen, so its sections push over the
 * timeline with a real back button instead of becoming destinations of
 * their own. The tab bar stays visible throughout — a parent is never
 * more than one tap from Home or Ask, even three levels into Child.
 *
 * The bottom-tab label is the fixed word "Child" (set in the tabs
 * _layout), so it never has to guess how much of a long name fits. The
 * Stack header here still shows the child's actual name — headers aren't
 * width-constrained the same way, and "Aarav" reads better than "Child"
 * once you're already inside.
 *
 * Depth budget: landing (1 tap from Home) → section (2 taps) → detail
 * (3 taps, only for a specific milestone / report / kit item, which is
 * where the IA explicitly allows a third).
 */
export default function ChildLayout() {
  const { child } = useAuth();
  const title = child?.name && child.name.length <= 12 ? child.name : "Your Child";

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.cream },
        headerShadowVisible: false,
        headerTintColor: colors.warmTaupe,
        headerTitleAlign: "left",
        headerTitleStyle: {
          fontFamily: fonts.bodySemiBold,
          fontSize: 17,
          color: colors.charcoal,
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title,
          headerTitle: () => (
            <HeaderTitleWithMark title={title} textColor={colors.charcoal} weight="semiBold" />
          ),
          headerRight: () => <AvatarButton />,
        }}
      />
      {CHILD_SECTIONS.map((section) => (
        <Stack.Screen
          key={section.slug}
          name={section.slug}
          options={{ title: section.title }}
        />
      ))}
    </Stack>
  );
}
