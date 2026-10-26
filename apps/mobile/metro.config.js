// Metro config for the EventFlow mobile app in the monorepo.
//
// The app lives at apps/mobile and consumes workspace packages from packages/*
// (e.g. @eventflow/ui-tokens, and later @eventflow/sdk-*, @eventflow/i18n).
//
// NOTE: NativeWind was intentionally removed from the mobile build. Its Metro
// CSS transform deadlocks Metro at "99.9% (N-1/N)" on this monorepo (a known
// NativeWind issue), and the app styles entirely via the JS token layer
// (@eventflow/ui-tokens → shared/theme: `type()`, palettes, StyleSheet) with no
// `className` usage. If className support is ever wanted, re-add `withNativeWind`
// + the Tailwind-v3 resolver shim and verify the bundle still completes.
const path = require("path");

const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// 1. Watch only what the app actually consumes — the hoisted root node_modules
//    and the workspace packages (e.g. @eventflow/ui-tokens). Watching the whole
//    monorepoRoot makes Metro crawl every sibling app (web-public/.next,
//    web-admin/dist, their node_modules, …), which on a cold start is very slow.
//    (projectRoot is always watched.)
config.watchFolders = [
  path.resolve(monorepoRoot, "node_modules"),
  path.resolve(monorepoRoot, "packages"),
];

// 2. Resolve from the app first, then the hoisted root node_modules.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

// 3. Workspace packages expose an "exports" map (ui-tokens, sdk-*, i18n).
config.resolver.unstable_enablePackageExports = true;

// 4. Pin React to 19.1.0 for the mobile bundle ONLY.
//    Expo SDK 54 / RN 0.81's renderer hard-checks `React.version === "19.1.0"`,
//    but the monorepo's hoisted React is 19.2.4 (the web apps want ^19.1.x and
//    the root `overrides` are not honored by the existing install). Rather than
//    reinstall/downgrade the whole monorepo, we vendor a dependency-free
//    react@19.1.0 under vendor/react and force every `react` / `react/*` import
//    in THIS bundle (including react-native's renderer) to resolve to it. Other
//    apps are untouched.
const PINNED = {
  react: path.resolve(projectRoot, "vendor", "react"),
  "react-dom": path.resolve(projectRoot, "vendor", "react-dom"),
  scheduler: path.resolve(projectRoot, "vendor", "scheduler"),
};
config.resolver.resolveRequest = (context, moduleName, platform) => {
  for (const [name, dir] of Object.entries(PINNED)) {
    if (moduleName === name) {
      return { type: "sourceFile", filePath: require.resolve(dir) };
    }
    if (moduleName.startsWith(name + "/")) {
      return { type: "sourceFile", filePath: require.resolve(path.join(dir, moduleName.slice(name.length + 1))) };
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
