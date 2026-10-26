/**
 * CoverPicker (native — iOS/Android) — the create/edit cover slot (design 18
 * §7.3). A native image picker (`expo-image-picker`) is NOT available in this
 * build (deliberately absent from apps/mobile deps and unresolvable at root),
 * and packages are frozen in W7 — so on device the cover is an OPTIONAL,
 * web-managed field: the drop-zone explains the hand-off and the deterministic
 * PosterArt fallback always renders, so an event never ships without a cover.
 * The `.web.tsx` sibling wires a real `<input type=file>` upload.
 *
 * When a cover already exists (edit of an event that got its cover on the web),
 * it is shown here read-only under the poster frame.
 */
import { Image, Text, View } from "react-native";

import { useI18n } from "@shared/i18n";
import { radii, type, usePalette } from "@shared/theme";

import { Icon } from "../icon";
import { PosterArt } from "../poster";

export interface CoverPickerProps {
  /** Resolved (fetchable) URL of the current cover, if any. */
  coverUrl?: string;
  /** Poster fallback seed. */
  hue: number;
  pattern: string;
  /** Upload state (web only fires these; native never uploads). */
  uploading?: boolean;
  onPick?: () => void;
  onRemove?: () => void;
}

export function CoverPicker({ coverUrl, hue, pattern, uploading }: CoverPickerProps): React.JSX.Element {
  const p = usePalette();
  const { t } = useI18n();

  return (
    <View
      style={{
        aspectRatio: 16 / 9,
        borderRadius: radii.lg,
        overflow: "hidden",
        borderWidth: 1.5,
        borderColor: p.borderStrong,
        borderStyle: "dashed",
        backgroundColor: p.sunken,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Cover fill: real image when present, else procedural art. */}
      <View style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        {coverUrl ? (
          <Image source={{ uri: coverUrl }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
        ) : (
          <PosterArt hue={hue} pattern={pattern} />
        )}
      </View>

      {/* Hand-off note — only while there is no real cover yet. */}
      {!coverUrl ? (
        <View
          style={{
            alignItems: "center",
            gap: 8,
            paddingHorizontal: 24,
            paddingVertical: 16,
            borderRadius: radii.card,
            backgroundColor: "rgba(14,14,13,0.55)",
          }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: radii.control,
              backgroundColor: "rgba(255,255,255,0.14)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="cam" size={22} color="#fbfbfa" sw={1.6} />
          </View>
          <Text style={type({ weight: 600, size: 12, leading: 1.3, color: "#fbfbfa", align: "center" })}>
            {t("org.form.cover.add")}
          </Text>
          <Text style={type({ role: "mono", weight: 500, size: 10, leading: 1.4, color: "rgba(245,245,243,0.72)", align: "center" })}>
            {uploading ? t("org.form.cover.uploading") : t("org.form.cover.webOnly")}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
