import type { ColorValue } from "react-native";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { colors } from "../lib/theme";

/**
 * The three tab glyphs, lifted out of the old hand-rolled BottomNav so the
 * Tabs navigator can own layout and state while these stay pure drawing.
 *
 * Line weight thickens slightly when focused rather than switching to a
 * filled variant — the same restraint the rest of the app uses.
 */
// ColorValue rather than string: react-navigation hands tabBarIcon a
// ColorValue, and react-native-svg accepts the same union.
type IconProps = { color: ColorValue; focused: boolean };

const w = (focused: boolean) => (focused ? 2 : 1.6);

/** Home — a roof. Today's plan is where you live. */
export function HomeIcon({ color, focused }: IconProps) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 11.5 12 4l8 7.5"
        stroke={color}
        strokeWidth={w(focused)}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M6 10v9.5h12V10"
        stroke={color}
        strokeWidth={w(focused)}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * Ask — the one tab with a persistent circular backdrop, so it reads as
 * the row's central action without leaving the row. Solid sageDark (the
 * app's dark-sage CTA "pop" colour, already what the Ask composer's own
 * button uses on Home) rather than a pale tint, so it reads as "the main
 * thing you can do here" — a constant, not a selected-state colour that
 * happens to change with focus like the other four tabs.
 */
export function AskTabIcon() {
  return (
    <View style={askIconStyles.circle}>
      <Svg width={19} height={19} viewBox="0 0 24 24" fill="none">
        <Path
          d="M12 4c.7 3.6 2.3 5.3 6 6-3.7.7-5.3 2.4-6 6-.7-3.6-2.3-5.3-6-6 3.7-.7 5.3-2.4 6-6Z"
          fill="#FFFFFF"
        />
        <Path
          d="M18.5 16c.3 1.5 1 2.2 2.5 2.5-1.5.3-2.2 1-2.5 2.5-.3-1.5-1-2.2-2.5-2.5 1.5-.3 2.2-1 2.5-2.5Z"
          fill="#FFFFFF"
        />
      </Svg>
    </View>
  );
}

const askIconStyles = StyleSheet.create({
  circle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.sageDark,
    marginTop: -6,
    marginBottom: 6,
    shadowColor: colors.charcoal,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 2,
  },
});

/** Three lines — opens the Ask screen's chat history drawer. */
export function HamburgerIcon({ size = 22, color = colors.charcoal }: { size?: number; color?: ColorValue }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 7h16M4 12h16M4 17h10" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

/**
 * The same four-point sparkle as the Ask tab's badge, on its own and
 * scaled up — for moments where Ask wants to introduce itself (the
 * empty-thread greeting) rather than just mark its place in the tab bar.
 */
export function SparkleMark({ size = 40, color = colors.warmTaupe }: { size?: number; color?: ColorValue }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 4c.7 3.6 2.3 5.3 6 6-3.7.7-5.3 2.4-6 6-.7-3.6-2.3-5.3-6-6 3.7-.7 5.3-2.4 6-6Z"
        fill={color}
      />
    </Svg>
  );
}

/** Child — a heart. Care, plainly. */
export function ChildIcon({ color, focused }: IconProps) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 19.5c0 0-8-5-8-11.2C4 5 6.2 3 9 3c1.4 0 2.7.7 3 1.8C12.3 3.7 13.6 3 15 3c2.8 0 5 2 5 5.3 0 6.2-8 11.2-8 11.2Z"
        stroke={color}
        strokeWidth={w(focused)}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** You — a leaf cradled by a hand. Self-care, tended. */
export function YouIcon({ color, focused }: IconProps) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 13.5c0-4 2.6-7 6.5-7.5.4 3.9-1.7 7.6-6.5 7.5Z"
        stroke={color}
        strokeWidth={w(focused)}
        strokeLinejoin="round"
      />
      <Path
        d="M12 21v-7.5M12 14c-.4-2.7-2-4.4-4.5-4.8"
        stroke={color}
        strokeWidth={w(focused)}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** Community — two overlapping figures standing together. */
export function CommunityIcon({ color, focused }: IconProps) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Circle cx="9" cy="7" r="3" stroke={color} strokeWidth={w(focused)} />
      <Path
        d="M3 18c0-3 2.7-5 6-5s6 2 6 5"
        stroke={color}
        strokeWidth={w(focused)}
        strokeLinecap="round"
      />
      <Circle cx="16.5" cy="8.5" r="2.3" stroke={color} strokeWidth={w(focused)} />
      <Path
        d="M14 18c.3-1.8 1.8-3 3.8-3 1.4 0 2.6.6 3.2 1.8"
        stroke={color}
        strokeWidth={w(focused)}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** The avatar affordance in the top corner — profile/settings live behind it. */
export function AvatarIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8.2" r="3.2" stroke={color} strokeWidth={1.8} />
      <Path
        d="M5 20c1.2-3.8 4-5.6 7-5.6s5.8 1.8 7 5.6"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** Row chevron, used by the Growth section list. */
export function ChevronRight({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M9 5l7 7-7 7" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
