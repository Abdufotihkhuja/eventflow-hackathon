import { useEffect } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Image, ScrollView, Text, useWindowDimensions, View } from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LANGUAGES, useI18n } from "@shared/i18n";
import { accent, fade, gutter, radii, type, usePalette } from "@shared/theme";
import { haptics } from "@shared/lib/haptics";
import {
  AnimatedPressable,
  dur,
  ease,
  enterStagger,
  useReducedMotion,
  useScreenFocused,
} from "@shared/motion";
import { Btn, Flag, Icon, Screen, Wordmark } from "@shared/ui";

const HERO = require("../../assets/images/welcome-hero.png");

/** Reserved boxes so a longer translation shrinks its type instead of pushing
 *  the CTAs — two display lines at 29/1.06, two body lines at 16/1.5. */
const HEADLINE_H = 66;
const SUB_H = 50;
const LANG_ROW_H = 56;

/**
 * Everything below the hero, summed. The hero then takes whatever is left
 * rather than a fixed 62% of the screen — at that share the column below it
 * needed more room than remained, so the bottom of it ran off the screen.
 */
const BELOW_HERO_H =
  8 +            // breathing room under the photo
  HEADLINE_H +
  SUB_H +
  28 +           // gap before the CTAs
  52 + 12 + 52 + // primary + gap + secondary
  14 + 44 +      // organizer link
  LANG_ROW_H;

/**
 * 01 · Welcome — photo hero (kept per product decision; the design's poster
 * collage is superseded here) with the design's motion treatment: a slow
 * Ken Burns drift, the 4-stop scrim fading into the canvas, and a staggered
 * entrance for wordmark → headline → CTAs. Dark sky → light status-bar icons.
 */
export default function Welcome(): React.JSX.Element {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const p = usePalette();
  const { t, lang, setLang } = useI18n();
  const { width, height } = useWindowDimensions();
  // The photo gets the remainder, floored so it stays a hero on short screens.
  const bottomPad = Math.max(insets.bottom, 16) + 6;
  const heroH = Math.max(Math.round(height * 0.36), Math.round(height - BELOW_HERO_H - bottomPad));

  // Ken Burns: scale 1 → 1.08 over ~12s, loop-reverse. The loop pauses when
  // the screen blurs and never runs under reduced motion (§3.4 loop rule).
  const focused = useScreenFocused();
  const reduced = useReducedMotion();
  const drift = useSharedValue(1);
  useEffect(() => {
    if (!focused || reduced) {
      cancelAnimation(drift);
      drift.value = withTiming(1, { duration: dur.base, easing: ease.standard });
      return;
    }
    drift.value = withRepeat(withTiming(1.08, { duration: dur.kenBurns, easing: ease.standard }), -1, true);
    return () => cancelAnimation(drift);
  }, [focused, reduced, drift]);
  const driftStyle = useAnimatedStyle(() => ({ transform: [{ scale: drift.value }] }));

  return (
    <Screen>
      <StatusBar style="light" />

      {/* The layout is designed to FIT the screen (spacer-driven), but compact
          Android phones / large font scales overflow it — so it scrolls when,
          and only when, the content is taller than the viewport. */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
      <View style={{ width, height: heroH, overflow: "hidden" }}>
        <Animated.View style={[{ width: "100%", height: "100%" }, driftStyle]}>
          <Image source={HERO} style={{ width: "100%", height: "100%" }} resizeMode="cover" accessible={false} />
        </Animated.View>
        {/* Top scrim — holds the wordmark/status bar over the sky. Alpha-0 ink
            copy, never `"transparent"` (transparent BLACK bands mid-gradient). */}
        <LinearGradient
          colors={[fade.inkSoft, fade.ink0]}
          locations={[0, 1]}
          style={{ position: "absolute", left: 0, right: 0, top: 0, height: insets.top + 130 }}
          pointerEvents="none"
        />
        {/* Bottom scrim — the design's 4-stop curve (0 → 30% light → 72% heavy
            → solid canvas), in alpha-0/low/high bone so the photo melts into
            the page with no hard edge or grey band. */}
        <LinearGradient
          colors={[fade.canvas0, fade.canvasLow, fade.canvasHigh, p.canvas]}
          locations={[0, 0.3, 0.72, 1]}
          style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: Math.round(heroH * 0.5) }}
          pointerEvents="none"
        />
        <Animated.View entering={enterStagger(0)} style={{ position: "absolute", top: insets.top + 14, left: gutter }}>
          <Wordmark size={24} />
        </Animated.View>
      </View>

      <View style={{ flex: 1, paddingHorizontal: gutter, paddingBottom: Math.max(insets.bottom, 16) + 6, alignItems: "center" }}>
        {/* Fixed height + shrink-to-fit: the three locales set this headline over
            two or three lines, and letting it reflow shoved every control below
            it down the screen on each language switch. */}
        <Animated.View entering={enterStagger(1)} style={{ height: HEADLINE_H, alignSelf: "stretch", justifyContent: "center" }}>
          <Text
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.72}
            maxFontSizeMultiplier={1.3}
            // leading ≥1.2, not the 1.06 this shipped with: uppercase Cyrillic
            // puts a breve above cap height ("Й"), and a line box that tight
            // shears it clean off — the headline read "РАСКРОИ СВОИ ПОТЕНЦИАЛ",
            // which looks like a spelling mistake rather than a clipped glyph.
            // The block is a fixed HEADLINE_H with shrink-to-fit, so the looser
            // line box costs nothing below it.
            style={type({ role: "display", weight: 700, size: 29, leading: 1.2, track: -0.01, color: p.fg, align: "center", transform: "uppercase" })}
          >
            {t("welcome.headline")}
          </Text>
        </Animated.View>
        <Animated.View entering={enterStagger(2)} style={{ height: SUB_H, alignSelf: "stretch", justifyContent: "center" }}>
          <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8} style={type({ weight: 400, size: 16, leading: 1.5, color: p.fgMuted, align: "center" })}>
            {t("welcome.sub")}
          </Text>
        </Animated.View>

        <Animated.View entering={enterStagger(3)} style={{ alignSelf: "stretch", marginTop: 28, gap: 12 }}>
          <Btn full variant="primary" size="lg" iconRight="aright" haptic="press" onPress={() => router.push("/signup")}>
            {t("welcome.createAccount")}
          </Btn>
          <Btn full variant="secondary" size="lg" onPress={() => router.push("/login")}>
            {t("welcome.haveAccount")}
          </Btn>
        </Animated.View>

        <Animated.View entering={enterStagger(4)}>
          <AnimatedPressable
            onPress={() => router.push("/intent?role=organizer")}
            haptic="tap"
            scaleTo={0.98}
            accessibilityRole="button"
            style={{ marginTop: 14, minHeight: 44, flexDirection: "row", alignItems: "center", gap: 7 }}
          >
            <Icon name="zap" size={15} color={p.fgMuted} />
            <Text style={type({ weight: 600, size: 14, leading: 1, color: p.fgMuted })}>{t("welcome.organize")}</Text>
          </AnimatedPressable>
        </Animated.View>

        {/* In the flow, at the end. Pinning this as its own absolute layer let
            it sit on top of the buttons whenever the column ran long — the
            fixed-height headline above is what actually stops the locale switch
            from shifting the layout, so the switcher does not need to float. */}
        <View
          style={{
            marginTop: "auto", height: LANG_ROW_H,
            flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12,
          }}
          accessibilityRole="radiogroup"
        >
          {LANGUAGES.map(({ code, label }) => {
            const on = code === lang;
            return (
              <AnimatedPressable
                key={code}
                onPress={() => {
                  if (!on) {
                    haptics.select();
                    setLang(code);
                  }
                }}
                rippleBorderless
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                accessibilityLabel={label}
                // NB: the inactive dim lives on an inner View — AnimatedPressable
                // animates the outer opacity, so a static opacity there would be lost.
                style={{ padding: 3, borderRadius: radii.lg, borderWidth: 2, borderColor: on ? accent.base : fade.ink0 }}
              >
                <View style={{ opacity: on ? 1 : 0.5 }}>
                  <Flag code={code} width={28} />
                </View>
              </AnimatedPressable>
            );
          })}
        </View>
      </View>
      </ScrollView>
    </Screen>
  );
}
