import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import prettierConfig from "eslint-config-prettier";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

/**
 * ESLint конфигурация для проекта Eventflow (Next.js 15 + TypeScript strict)
 *
 * Правила включают:
 * - TypeScript strict типизация (запрет any, требование явных типов, non-null assertion)
 * - React лучшие практики (hooks, accessibility, jsx)
 * - Import порядок согласно FSD архитектуре (запрет импортов вверх по слоям)
 * - Качество кода (complexity, max-depth, KISS, DRY, SOLID)
 * - Запрет useEffect в прикладных компонентах
 * - Prettier интеграция для единообразного форматирования
 *
 * Скрипты:
 * - npm run lint          - проверка ошибок
 * - npm run lint:fix      - автоfix ошибок
 * - npm run format        - форматирование через Prettier
 * - npm run format:check  - проверка форматирования
 * - npm run type-check    - TypeScript проверка типов
 * - npm run check-all     - все проверки сразу
 */

const eslintConfig = [
  // Base Next.js configs
  ...compat.extends("next/core-web-vitals", "next/typescript"),

  // Language options для TypeScript
  {
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
        project: "./tsconfig.json",
      },
      globals: {
        React: "readonly",
        JSX: "readonly",
      },
    },
  },

  // Custom project rules override
  {
    rules: {
      // TypeScript strict rules
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unsafe-assignment": "warn",
      "@typescript-eslint/no-unsafe-member-access": "warn",
      "@typescript-eslint/no-unsafe-call": "warn",
      "@typescript-eslint/no-unsafe-return": "warn",
      "@typescript-eslint/explicit-function-return-type": [
        "warn",
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
        },
      ],
      "@typescript-eslint/explicit-module-boundary-types": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          prefer: "type-imports",
          fixStyle: "separate-type-imports",
        },
      ],
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/consistent-type-definitions": ["error", "interface"],
      "@typescript-eslint/naming-convention": [
        "error",
        {
          selector: "interface",
          format: ["PascalCase"],
          custom: {
            regex: "^I[A-Z]",
            match: false,
          },
        },
        {
          selector: "typeAlias",
          format: ["PascalCase"],
        },
        {
          selector: "variable",
          modifiers: ["const", "global"],
          format: ["UPPER_CASE", "camelCase", "PascalCase"],
        },
      ],
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/no-misused-promises": "error",

      // React hooks rules
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",

      // React best practices
      "react/prop-types": "off",
      "react/react-in-jsx-scope": "off",
      "react/jsx-no-target-blank": "error",
      "react/jsx-key": "error",
      "react/no-array-index-key": "warn",
      "react/self-closing-comp": "error",
      "react/jsx-boolean-value": ["error", "never"],
      "react/jsx-curly-brace-presence": [
        "error",
        { props: "never", children: "never" },
      ],
      "react/jsx-no-bind": [
        "warn",
        {
          allowArrowFunctions: true,
          allowBind: false,
          ignoreRefs: true,
        },
      ],

      // Import/Export rules для FSD архитектуры
      "import/order": [
        "warn",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            "parent",
            "sibling",
            "index",
            "type",
          ],
          pathGroups: [
            {
              pattern: "react",
              group: "external",
              position: "before",
            },
            {
              pattern: "next/**",
              group: "external",
              position: "before",
            },
            {
              pattern: "@/app/**",
              group: "internal",
              position: "before",
            },
            {
              pattern: "@/pages/**",
              group: "internal",
              position: "before",
            },
            {
              pattern: "@/widgets/**",
              group: "internal",
              position: "before",
            },
            {
              pattern: "@/features/**",
              group: "internal",
              position: "before",
            },
            {
              pattern: "@/entities/**",
              group: "internal",
              position: "before",
            },
            {
              pattern: "@/shared/**",
              group: "internal",
              position: "before",
            },
          ],
          pathGroupsExcludedImportTypes: ["react", "next"],
          "newlines-between": "always",
          alphabetize: {
            order: "asc",
            caseInsensitive: true,
          },
        },
      ],
      "import/no-restricted-paths": [
        "error",
        {
          zones: [
            {
              target: "./src/shared",
              from: "./src/app",
              message: "shared слой не может импортировать из app",
            },
            {
              target: "./src/shared",
              from: "./src/pages",
              message: "shared слой не может импортировать из pages",
            },
            {
              target: "./src/shared",
              from: "./src/widgets",
              message: "shared слой не может импортировать из widgets",
            },
            {
              target: "./src/shared",
              from: "./src/features",
              message: "shared слой не может импортировать из features",
            },
            {
              target: "./src/shared",
              from: "./src/entities",
              message: "shared слой не может импортировать из entities",
            },
            {
              target: "./src/entities",
              from: "./src/features",
              message: "entities слой не может импортировать из features",
            },
            {
              target: "./src/entities",
              from: "./src/widgets",
              message: "entities слой не может импортировать из widgets",
            },
            {
              target: "./src/entities",
              from: "./src/pages",
              message: "entities слой не может импортировать из pages",
            },
            {
              target: "./src/features",
              from: "./src/widgets",
              message: "features слой не может импортировать из widgets",
            },
            {
              target: "./src/features",
              from: "./src/pages",
              message: "features слой не может импортировать из pages",
            },
            {
              target: "./src/widgets",
              from: "./src/pages",
              message: "widgets слой не может импортировать из pages",
            },
          ],
        },
      ],
      "import/no-default-export": "off",
      "import/no-cycle": "error",
      "import/no-self-import": "error",
      "import/no-useless-path-segments": "error",
      "import/newline-after-import": "error",
      "import/no-duplicates": "error",

      // Accessibility rules
      "jsx-a11y/alt-text": "error",
      "jsx-a11y/anchor-is-valid": "error",
      "jsx-a11y/aria-props": "error",
      "jsx-a11y/aria-role": "error",
      "jsx-a11y/role-has-required-aria-props": "error",
      "jsx-a11y/role-supports-aria-props": "error",
      "jsx-a11y/click-events-have-key-events": "warn",
      "jsx-a11y/no-static-element-interactions": "warn",
      "jsx-a11y/no-noninteractive-element-interactions": "warn",

      // General code quality (смягчено до рефакторинга крупных компонентов)
      complexity: ["warn", { max: 25 }],
      "max-depth": ["warn", { max: 5 }],
      "max-lines-per-function": ["warn", { max: 100, skipBlankLines: true }],
      "max-nested-callbacks": ["error", 3],
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-debugger": "error",
      "no-alert": "error",
      "no-var": "error",
      "prefer-const": "error",
      "prefer-arrow-callback": "error",
      "prefer-template": "error",
      "no-nested-ternary": "warn",
      "no-unneeded-ternary": "error",
      "no-throw-literal": "error",
      "prefer-promise-reject-errors": "error",
      "no-async-promise-executor": "error",
      "no-await-in-loop": "warn",
      "require-atomic-updates": "error",

      // Запрет useEffect в прикладных компонентах
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.name='useEffect']:not([parent.parent.parent.parent.parent.id.name=/Provider|Context|Store|Hook/])",
          message:
            "Запрещено использовать useEffect в прикладных компонентах. Используйте TanStack Query, Server Actions, или инкапсулируйте в кастомный хук.",
        },
      ],
      "prettier/prettier": "off",
    },
  },

  // Prettier integration (должен быть последним)
  prettierConfig,

  // Global ignores
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "dist/**",
      "node_modules/**",
      "next-env.d.ts",
      "**/*.config.js",
      "**/*.config.mjs",
      "**/*.config.ts",
      ".cursor/**",
    ],
  },
];

export default eslintConfig;
