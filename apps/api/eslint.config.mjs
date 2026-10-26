// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs', 'src/generated/**/*', 'dist/**/*'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
      '@typescript-eslint/no-wrapper-object-types': 'off',
      '@typescript-eslint/no-redundant-type-constituents': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/prefer-promise-reject-errors': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      'no-case-declarations': 'off',
      'no-async-promise-executor': 'off',
      'prettier/prettier': 'off',
    },
  },
  // Инвариант №2 программы уведомлений: единая точка NotificationDispatcher.
  // Прямой push (expo-server-sdk) и импорт канальных сендеров вне
  // modules/notifications запрещены на уровне error; ratchet
  // `scripts/check-notification-dispatch.mjs` дополнительно ловит `new Expo(`
  // и require-формы (селектор no-restricted-syntax здесь не используется
  // намеренно: во flat config он затёр бы tenant-правило ниже для тех же
  // файлов — у одного rule id одна конфигурация на файл).
  {
    files: ['src/**/*.ts'],
    ignores: ['src/modules/notifications/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'expo-server-sdk',
              message:
                'Push только через NotificationDispatcher (modules/notifications). ' +
                'Прямые вызовы Expo из фич запрещены (инвариант №2).',
            },
          ],
          patterns: [
            {
              group: ['**/notifications/channels/*'],
              message:
                'Канальные сендеры — деталь NotificationDispatcher. ' +
                'Отправляйте через NotificationDispatcherService.dispatch/dispatchNow.',
            },
          ],
        },
      ],
    },
  },
  // Tenant-isolation safety net (0.4): nudge raw tenant-model Prisma access toward
  // the repository layer + requireTenantWhere()/requireEventTenantWhere().
  // `warn` so it never breaks the build; scripts/check-tenant-guard.mjs is the
  // enforcing ratchet. Repository, spec, public and super-admin code is exempt.
  {
    files: ['src/**/*.ts'],
    ignores: [
      'src/**/*.repository.ts',
      'src/**/*.spec.ts',
      'src/common/tenant/**',
      'src/modules/public/**',
      'src/modules/super-admin/**',
      'src/prisma/**',
    ],
    rules: {
      'no-restricted-syntax': [
        'warn',
        {
          selector:
            "MemberExpression[property.name=/^(findMany|findFirst|updateMany|deleteMany|update|delete|count|aggregate|groupBy|upsert)$/][object.type='MemberExpression'][object.property.name=/^(registration|certificate|ticketArtifact|attendance|questionAnswer|eventRecipient|speaker|agendaItem|event|rentalPlace|organizationMember|organizationRole|organizationInvite|eventTag|board|blogPost|contactRequest|userFollowing|registrationFileUpload|order|planPurchase|eventCreditConsumption|planCreditAdjustment|entitlementOverride|usageEvent|usageCounter|coinLedgerEntry|paymentTransaction|payout|adOrder|organizationAccessOverride)$/]",
          message:
            'Tenant-scoped model accessed via raw Prisma. Route tenant reads/writes through a repository using requireTenantWhere()/requireEventTenantWhere() (src/common/tenant). 0.4 safety net; public/super-admin are exempt.',
        },
      ],
    },
  },
);
