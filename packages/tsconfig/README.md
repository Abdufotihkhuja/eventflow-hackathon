# @eventflow/tsconfig

Shared TypeScript configuration bases for the EventFlow monorepo.

| File                 | Use for                                                 |
| -------------------- | ------------------------------------------------------- |
| `base.json`          | Strict, framework-agnostic core (no target/module/lib). |
| `library.json`       | Pure-TS packages that emit JS + d.ts (CommonJS).        |
| `react-native.json`  | The Expo app, composed after `expo/tsconfig.base`.      |

## Usage

Library package:

```jsonc
{ "extends": "@eventflow/tsconfig/library.json", "compilerOptions": { "outDir": "dist" } }
```

Expo app (array extends — Expo defaults first, EventFlow strictness last):

```jsonc
{ "extends": ["expo/tsconfig.base", "@eventflow/tsconfig/react-native.json"] }
```

> The existing web apps (`web-public`, `web-workspace`, `web-admin`) keep their
> inline tsconfigs for now. Migrating them onto these bases is a separate
> tech-debt task — not required to adopt them in new packages.
