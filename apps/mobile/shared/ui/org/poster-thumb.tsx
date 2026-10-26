/**
 * PosterThumb — small square event artwork for organizer rows (design 16
 * §5.3). Real cover when present, procedural PosterArt fallback otherwise.
 * Chips/captions are intentionally absent: the design's `dense` poster chips
 * are unreadable below ~120px (spec §9 flag), so thumbs render bare art only.
 */
import { Image, View } from "react-native";

import { radii } from "@shared/theme";

import { PosterArt } from "../poster";

export function PosterThumb({
  hue,
  pattern,
  coverImage,
  size = 60,
}: {
  hue: number;
  pattern: string;
  coverImage?: string;
  size?: number;
}): React.JSX.Element {
  return (
    <View style={{ width: size, height: size, borderRadius: radii.control, overflow: "hidden", flexShrink: 0 }}>
      {coverImage ? (
        <Image source={{ uri: coverImage }} style={{ width: size, height: size }} resizeMode="cover" />
      ) : (
        <PosterArt hue={hue} pattern={pattern} />
      )}
    </View>
  );
}
