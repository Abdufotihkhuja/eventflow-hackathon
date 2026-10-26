import type { ExpoConfig } from "expo/config";

/**
 * EventFlow participant (attendee) app.
 *
 * `scheme` is the deep-link / push target prefix (work-items 3.1/3.2).
 * Routes live in `app/` and map 1:1 to URLs via Expo Router.
 */
const config: ExpoConfig = {
  name: "EventFlow",
  slug: "eventflow",
  scheme: "eventflow",
  version: "1.0.0",
  orientation: "portrait",
  // 1024² renders of the original dot-swirl mark on the bone canvas, generated
  // by scripts/generate-app-icons.js (the 180px apple-touch-icon pixelated on
  // launchers and had no padding).
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: "uz.eventflow.app",
  },
  android: {
    package: "uz.eventflow.app",
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#FBFBFA",
    },
  },
  web: {
    bundler: "metro",
    output: "static",
    // Expo generates the web favicons from a PNG source (the EventFlow sun mark).
    favicon: "./assets/apple-touch-icon.png",
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    "expo-font",
    "expo-localization",
    [
      // The native splash — the frame shown before any JS runs. Bone canvas
      // with the mark centred, matching `SPLASH_BG` in shared/ui/brand-splash
      // so the OS frame, the pre-font hold and the real splash are one colour
      // and the hand-off is invisible.
      // NOTE: Expo Go shows its OWN splash and ignores this; it only applies to
      // a development build or a store build.
      "expo-splash-screen",
      {
        image: "./assets/splash-mark.png",
        imageWidth: 120,
        resizeMode: "contain",
        backgroundColor: "#fbfbfa",
        dark: { backgroundColor: "#fbfbfa" },
      },
    ],
    [
      // Push core (BL-15). Icon: the dot-swirl mark (Android masks it to the
      // status-bar monochrome glyph), tinted brand ember. NOTE: config plugins
      // apply on `expo prebuild` — the checked-in android/ manifest also
      // carries POST_NOTIFICATIONS by hand (builds are gradle, not EAS).
      // TODO(BL-12): APNs key / FCM `googleServicesFile` credentials are an
      // external blocker (OQ-13, Expo Push Service) — added when they exist.
      "expo-notifications",
      {
        icon: "./assets/splash-mark.png",
        color: "#ea580c",
        defaultChannel: "updates",
      },
    ],
    [
      "expo-camera",
      {
        cameraPermission: "Allow EventFlow to use the camera to scan attendee tickets at check-in.",
        recordAudioAndroid: false,
      },
    ],
    [
      "expo-location",
      {
        locationAlwaysAndWhenInUsePermission:
          "Allow EventFlow to use your location to open the feed on events near you. You can pick a city by hand instead.",
        locationWhenInUsePermission:
          "Allow EventFlow to use your location to open the feed on events near you. You can pick a city by hand instead.",
        isAndroidBackgroundLocationEnabled: false,
      },
    ],
    [
      "expo-image-picker",
      {
        photosPermission: "Allow EventFlow to access your photos so you can set a profile picture.",
        cameraPermission: "Allow EventFlow to use the camera to take a profile picture.",
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    // Expo project id for `getExpoPushTokenAsync({ projectId })` (BL-12).
    // `extra.eas.projectId` is the canonical location expo-notifications reads
    // by default, so BL-25 needs no explicit argument once the env is set.
    // Supplied via EXPO_PUBLIC_PROJECT_ID (same convention as EXPO_PUBLIC_* in
    // shared/config/env.ts); no value is hardcoded on purpose.
    // TODO(BL-12, внешнее): создать проект в Expo-консоли, залить FCM server
    // key + APNs key, затем задать EXPO_PUBLIC_PROJECT_ID в окружении сборки.
    eas: {
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
    },
  },
};

export default config;
