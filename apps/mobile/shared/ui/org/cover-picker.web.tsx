/**
 * CoverPicker (web) — the react-native-web replacement that wires a real
 * `<input type="file" accept="image/*">`. On the Expo web verification surface
 * this makes the cover uploader fully functional: pick a file → `onPick(file)`
 * hands the browser `File` to the screen, which uploads it via the typed
 * uploads endpoint on the org token. Native has no image picker (see the
 * `.tsx` sibling), so this behaviour is web-only by design.
 */
import { createElement, useRef } from "react";
import { Image, Text, View } from "react-native";

import { useI18n } from "@shared/i18n";
import { AnimatedPressable } from "@shared/motion";
import { accent, radii, type, usePalette } from "@shared/theme";

import { Icon } from "../icon";
import { PosterArt } from "../poster";

import type { CoverPickerProps } from "./cover-picker";

/** Web `onPick` receives the chosen `File` (native's is a no-arg tap). */
interface WebCoverPickerProps extends Omit<CoverPickerProps, "onPick"> {
  onPick?: (file: File) => void;
}

export function CoverPicker({
  coverUrl,
  hue,
  pattern,
  uploading,
  onPick,
  onRemove,
}: WebCoverPickerProps): React.JSX.Element {
  const p = usePalette();
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const openPicker = (): void => {
    if (uploading) return;
    inputRef.current?.click();
  };

  let ctaLabel = t("org.form.cover.add");
  if (uploading) ctaLabel = t("org.form.cover.uploading");
  else if (coverUrl) ctaLabel = t("org.form.cover.change");

  const fileInput = createElement("input", {
    ref: inputRef,
    type: "file",
    accept: "image/*",
    style: { display: "none" },
    onChange: (e: { target: { files?: FileList | null } }) => {
      const file = e.target.files?.[0];
      if (file) onPick?.(file);
      // Reset so re-picking the same file still fires change.
      if (inputRef.current) inputRef.current.value = "";
    },
  });

  return (
    <View>
      {fileInput}
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={t("org.form.a11yCover")}
        onPress={openPicker}
        scaleTo={0.985}
        style={{
          aspectRatio: 16 / 9,
          borderRadius: radii.lg,
          overflow: "hidden",
          borderWidth: 1.5,
          borderColor: coverUrl ? p.border : p.borderStrong,
          borderStyle: coverUrl ? "solid" : "dashed",
          backgroundColor: p.sunken,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
          {coverUrl ? (
            <Image source={{ uri: coverUrl }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
          ) : (
            <PosterArt hue={hue} pattern={pattern} />
          )}
        </View>

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
            {ctaLabel}
          </Text>
          {!coverUrl ? (
            <Text style={type({ role: "mono", weight: 500, size: 10, leading: 1.4, color: "rgba(245,245,243,0.72)", align: "center" })}>
              {t("org.form.cover.hint")}
            </Text>
          ) : null}
        </View>
      </AnimatedPressable>

      {/* Remove control — only when a cover is set. */}
      {coverUrl && !uploading ? (
        <AnimatedPressable
          accessibilityRole="button"
          onPress={onRemove}
          hitSlop={8}
          style={{ alignSelf: "flex-start", marginTop: 8, flexDirection: "row", alignItems: "center", gap: 5 }}
        >
          <Icon name="x" size={14} color={accent.ink} />
          <Text style={type({ weight: 600, size: 12, leading: 1, color: accent.ink })}>{t("org.form.cover.remove")}</Text>
        </AnimatedPressable>
      ) : null}
    </View>
  );
}
