# @eventflow/eslint-config

Shared, framework-agnostic ESLint flat-config base for the EventFlow monorepo.

`./base` carries the cross-cutting TypeScript strictness + code-quality rules
the web apps already enforce — with no framework coupling. Each app composes it
with its own framework preset and FSD path zones.

## Usage

```js
// apps/mobile/eslint.config.mjs
import expo from "eslint-config-expo/flat";
import { base } from "@eventflow/eslint-config/base";

export default [...expo, ...base /* + app-specific FSD zones */];
```

> The web apps keep their inline `eslint.config.mjs` (Next.js + FSD zones) for
> now; consolidating them onto this base is a separate tech-debt task.
