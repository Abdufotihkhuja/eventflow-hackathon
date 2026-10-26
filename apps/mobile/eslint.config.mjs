import { base } from "@eventflow/eslint-config/base";
// Explicit .js: eslint-config-expo has no "exports" map and ships both flat.js
// and a flat/ dir, so ESM resolution needs the file specifier.
import expo from "eslint-config-expo/flat.js";

/**
 * Mobile ESLint: Expo's flat preset (RN + import + a11y) composed with the
 * shared EventFlow TS/quality base.
 *
 * FSD layer-boundary rules (import/no-restricted-paths: shared ⊥ features, etc.)
 * are added in Phase 2 once cross-layer imports actually exist.
 */
export default [
  ...expo,
  ...base,
  {
    ignores: [
      "dist/*",
      ".expo/*",
      // Vendored upstream packages (react 19.1.0 renderer pin) — not ours to lint.
      "vendor/*",
      "expo-env.d.ts",
      "nativewind-env.d.ts",
      "babel.config.js",
      "metro.config.js",
      "tailwind.config.js",
      // Одноразовые node-скрипты генерации ассетов (CommonJS, node-окружение) —
      // линтятся конфигом RN-приложения и не должны его ломать.
      "scripts/*",
      // Исходники макета из claude.ai/design (html + сопутствующий js экспорта) —
      // референс, а не код приложения: экраны правятся в app/, а не здесь.
      "design/**",
    ],
  },
];
