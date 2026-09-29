import Svg, { Path } from "react-native-svg";

/**
 * Small leading icons for Home's own tile eyebrows/headings -- same
 * hand-drawn line-icon construction as components/FeatureHub.tsx's
 * FeatureIcon and components/MealSlotIcon.tsx (24x24 viewBox, no fill,
 * ~1.6-1.8 stroke), not a separate icon library. Bowl/heart/leaf
 * deliberately re-draw the same shapes FeatureIcon's "meal" case and the
 * Child/You tab icons already use (see components/TabIcons.tsx) rather
 * than importing those components directly -- MealSlotIcon already
 * established that "redraw at this context's own size" pattern instead
 * of sharing a tab-specific component into unrelated tiles.
 */

type IconProps = { size?: number; color: string };

/** DYK card -- an idea/insight. */
export function LightbulbIcon({ size = 16, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.5.4.8 1 .8 1.6V16h5.4v-.5c0-.6.3-1.2.8-1.6A6 6 0 0 0 12 3Z"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** "A moment with ..." -- a hands-on, together activity. */
export function HandIcon({ size = 18, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M8 12.5V6a1.5 1.5 0 0 1 3 0v5.5M11 11.5V4.5a1.5 1.5 0 0 1 3 0V11M14 11V6a1.5 1.5 0 0 1 3 0v6.5"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M17 10.5a1.5 1.5 0 0 1 3 0V15c0 3.9-3.1 7-7 7h-.8c-2.8 0-4-1-5.7-3l-2-2.4a1.4 1.4 0 0 1 2-2L8 11.5"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Family meal tile -- same bowl silhouette FeatureIcon's "meal" case uses. */
export function BowlIcon({ size = 16, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M7 2v7a3 3 0 0 0 3 3v10M7 2v7M7 9V2M11 2v7M17 2c-2 2-2 5-2 8s0 4 2 4v8"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** "For dads"/ForYouCard -- same heart shape the Child tab icon uses. */
export function HeartIcon({ size = 16, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 19.5c0 0-8-5-8-11.2C4 5 6.2 3 9 3c1.4 0 2.7.7 3 1.8C12.3 3.7 13.6 3 15 3c2.8 0 5 2 5 5.3 0 6.2-8 11.2-8 11.2Z"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** WHAT'S NEXT row -- same leaf shape the You tab icon uses. */
export function LeafIcon({ size = 16, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 13.5c0-4 2.6-7 6.5-7.5.4 3.9-1.7 7.6-6.5 7.5Z"
        stroke={color}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      <Path
        d="M12 21v-7.5M12 14c-.4-2.7-2-4.4-4.5-4.8"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </Svg>
  );
}
