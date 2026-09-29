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

/** ForYouCard -- a head-and-shoulders silhouette with a small heart on
 *  the chest, rather than the plain heart shape the Child tab icon uses:
 *  this card rotates between "For dads", a mother's own recovery
 *  content, and other parent-neutral self-care topics, so it needs to
 *  read as "self-care for you, the parent" regardless of who's looking
 *  at it, not as romance/relationships. */
export function PersonIcon({ size = 16, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
        stroke={color}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      <Path
        d="M4.5 20c1-3.9 4.2-6 7.5-6s6.5 2.1 7.5 6"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 18.6c0 0-2-1.3-2-2.7 0-.7.6-1.3 1.3-1.3.3 0 .6.1.7.4.1-.3.4-.4.7-.4.7 0 1.3.6 1.3 1.3 0 1.4-2 2.7-2 2.7Z"
        stroke={color}
        strokeWidth={1.3}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** WHAT'S NEXT row -- a small flag: this row rotates between "Worth
 *  knowing", an upcoming milestone to watch for, a vaccination due, and a
 *  new developmental stage, so the icon needs to read as "flagged for
 *  your attention" across all four rather than any one of them
 *  specifically. */
export function FlagIcon({ size = 16, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 21V4M6 5h11l-3 3.5L17 12H6"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
