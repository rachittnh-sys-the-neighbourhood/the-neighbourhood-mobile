import Svg, { Circle, Path } from "react-native-svg";
import type { MoodValue } from "../lib/db/types";

/**
 * The five daily-check-in faces -- hand-drawn to match FeatureHub's own
 * FeatureIcon style (stroke-only, 24x24 viewBox, strokeWidth ~1.8), not a
 * font or emoji set, so it sits next to the rest of the app's icons
 * without looking imported from somewhere else.
 *
 * Deliberately ONE stroke color across all five, set by the caller (never
 * a red-to-green ramp) -- see MoodCheckInCard. A mood is a description of
 * the day, not a status to flag; color-coding "rough" as red would read
 * as alarming in a way this app specifically avoids elsewhere (see
 * lib/theme.ts colors.error).
 */
export function MoodIcon({
  mood,
  color,
  size = 24,
}: {
  mood: MoodValue;
  color: string;
  size?: number;
}) {
  const mouthByMood: Record<MoodValue, string> = {
    rough: "M8 16.5c1.2-1.6 2.8-2.3 4-2.3s2.8.7 4 2.3",
    meh: "M8 15.8c1.2-.7 2.8-1 4-1s2.8.3 4 1",
    okay: "M8 15H16",
    good: "M8 14c1.2 2 2.8 3 4 3s2.8-1 4-3",
    great: "M7.3 13.3c1 2.8 2.9 4.4 4.7 4.4s3.7-1.6 4.7-4.4",
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={1.8} />
      <Circle cx="9" cy="10" r="1" fill={color} />
      <Circle cx="15" cy="10" r="1" fill={color} />
      <Path d={mouthByMood[mood]} stroke={color} strokeWidth={1.8} strokeLinecap="round" fill="none" />
      {mood === "rough" && (
        <Path
          d="M15.6 12.2c.5.6.8 1.1.8 1.6a1 1 0 1 1-2 0c0-.5.3-1 .8-1.6Z"
          stroke={color}
          strokeWidth={1.4}
          fill="none"
        />
      )}
    </Svg>
  );
}
