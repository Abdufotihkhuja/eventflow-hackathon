import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";

/**
 * @eventflow/eslint-config — framework-agnostic base.
 *
 * The cross-cutting TypeScript + code-quality rules the web apps already
 * enforce inline, distilled to a flat-config array with NO framework coupling
 * (no Next.js, no Expo, no FSD path zones — those are layered by each app).
 *
 * Syntactic typescript-eslint only (no type-aware rules) so simple packages
 * can consume it without wiring `parserOptions.project`. Apps that want
 * type-aware rules (e.g. no-floating-promises) opt in on top of this.
 *
 * @type {import("typescript-eslint").ConfigArray}
 */
export const base = tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // — TypeScript strictness (mirrors web apps) —
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/consistent-type-definitions": ["error", "interface"],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "separate-type-imports" },
      ],
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],

      // — General code quality —
      "no-var": "error",
      "prefer-const": "error",
      "prefer-template": "error",
      "no-debugger": "error",
      "no-nested-ternary": "warn",
      "no-unneeded-ternary": "error",
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  prettier,
);

export default base;
