# @eventflow/ui-tokens

Canonical, platform-agnostic design tokens for the EventFlow **bone-and-ink**
system — plain TypeScript objects, no CSS and no build tooling beyond `tsc`.

```ts
import { tokens, ember, fontSize, space } from "@eventflow/ui-tokens";

ember[400]; // "#ea580c"  (primary accent)
tokens.semantic.bg[1]; // "#fbfbfa"  (page canvas)
```

## Modules

| Export        | Contents                                              |
| ------------- | ----------------------------------------------------- |
| `colors`      | `bone` · `ink` · `ember` · `forest` · `brand` · `status` · `border` |
| `semantic`    | `bg` / `fg` role maps (resolved hex)                  |
| `typography`  | `fontFamily` · `fontSize` · `fontWeight` · `letterSpacing` · `lineHeight` |
| `spacing`     | `space` (4px grid) · `radius`                         |
| `effects`     | `duration` · `easing` · `shadow` · `zIndex`           |
| `tokens`      | everything in one tree                                |

## Source of truth & scope

Values were extracted verbatim from
`apps/web-public/src/app/globals.css`. This package is now the **canonical**
home for them. The web apps still duplicate the tokens as CSS variables;
migrating web to consume this package and deleting the duplicates is a separate
tech-debt task — intentionally **not** part of the mobile work that introduced
this package.

Consumed by `apps/mobile` (NativeWind theme + JS theme object). Built to CJS so
it is usable from both bundlers (Metro) and CommonJS Node configs
(`tailwind.config.js`). Run `npm run build` (or `build:packages` at the root)
before consuming `dist`.
