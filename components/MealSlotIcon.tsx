import Svg, { Circle, Path } from "react-native-svg";
import type { FamilyMealSlot } from "../lib/db/familyMeals";

/**
 * Time-of-day icons for Family Meals' slot badges -- sunrise / cup / sun /
 * cup / moon, reusing the same idea a coffee-cup and sun-position language
 * conveys everywhere: a quick "when" cue that doesn't compete with the
 * meal name for attention. Hand-drawn to match FeatureHub's own FeatureIcon
 * style (stroke-only, no fill, ~1.8 stroke width) rather than pulled from
 * an icon font, so it sits next to the rest of the app's icons as if it
 * always belonged there.
 *
 * Deliberately one color, set by the caller -- these sit in a plain
 * neutral-gray badge circle in Family Meals, never a colored one. Color
 * there is reserved for actionable text (View meal / Swap), not for
 * telling breakfast apart from dinner.
 */
export function MealSlotIcon({
  slot,
  color,
  size = 24,
}: {
  slot: FamilyMealSlot;
  color: string;
  size?: number;
}) {
  const props = { width: size, height: size, viewBox: "0 0 24 24", fill: "none" as const };
  switch (slot) {
    case "breakfast":
      return (
        <Svg {...props}>
          <Path
            d="M4 18h16M6 18a6 6 0 0 1 12 0M12 4v3M5.6 8.6l1.4 1.4M18.4 8.6 17 10"
            stroke={color}
            strokeWidth={1.8}
            strokeLinecap="round"
          />
        </Svg>
      );
    case "morning_snack":
    case "afternoon_snack":
      return (
        <Svg {...props}>
          <Path
            d="M5 8h12v6a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5Z"
            stroke={color}
            strokeWidth={1.8}
            strokeLinejoin="round"
          />
          <Path d="M17 9.5h1.2a2.3 2.3 0 0 1 0 4.6H17" stroke={color} strokeWidth={1.8} />
          <Path
            d="M8 3.5c-.7.7-.7 1.6 0 2.3M12 3.5c-.7.7-.7 1.6 0 2.3"
            stroke={color}
            strokeWidth={1.6}
            strokeLinecap="round"
          />
        </Svg>
      );
    case "lunch":
      return (
        <Svg {...props}>
          <Circle cx="12" cy="12" r="4.5" stroke={color} strokeWidth={1.8} />
          <Path
            d="M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8 6 18M18 6l1.8-1.8"
            stroke={color}
            strokeWidth={1.8}
            strokeLinecap="round"
          />
        </Svg>
      );
    case "dinner":
      return (
        <Svg {...props}>
          <Path
            d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9Z"
            stroke={color}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
  }
}
