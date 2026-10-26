# EventFlow Design System

Bone-and-ink editorial. Cool bone canvas, graphite ink type, electric ember accent, forest as secondary editorial accent. Sharp 6px corners, hairline ink borders, generous space. Canonical tokens live in `packages/ui-tokens` (extracted verbatim from `apps/web-public/src/app/globals.css`); web apps consume them as CSS variables, mobile consumes them 1:1.

## Color

### Canvas (bone, cool off-white)
- `bone-50` #ffffff (raised card) · `bone-100` #fbfbfa (page) · `bone-200` #f5f5f3 (card/sunken) · `bone-300` #ececea (sidebar) · `bone-400` #dcdcda (divider)

### Ink (graphite text)
- `ink-400` #0e0e0d (primary) · `ink-300` #2a2a28 · `ink-200` #4a4a47 (secondary) · `ink-100` #6f6f6c (meta) · `ink-50` #8a8a87 (placeholder)

### Accents
- **Ember** (single brand accent, ≤10% of any surface): `ember-400` #ea580c primary, hover #f26b25, press #c64a07; soft tints 50–200 for chips/soft states.
- **Forest** (secondary editorial accent, info/positive-leaning): `forest-400` #3f7048, tints 50–200.

### Status
- success #1f7a3f / soft #d8ebe0 · warning #b8860b / soft #f6e6bf · danger #c2270e / soft #f9d6cf · info = forest.

### Borders
Hairlines of ink at low opacity, never gray hexes: `--border-1` rgba(14,14,13,.08) · `--border-2` rgba(14,14,13,.16) · `--border-strong` rgba(14,14,13,.32).

Color strategy: **Restrained** everywhere in product surfaces; web-public brand moments may go Committed with ember, never gradients.

## Typography

- **Display**: Space Grotesk (headings, hero, numbers with voice).
- **Body/UI**: Manrope. **Mono**: JetBrains Mono (codes, IDs, tabular data).
- Scale (px): 12, 14, 16, 18, 20, 24, 30, 38, 48, 64, 84; display = clamp(64px, 9vw, 132px) on web-public only.
- Tracking: tight -0.035em (display) → eyebrow 0.18em (uppercase kickers). Line heights 1.0/1.15/1.5/1.6.
- Body line length ≤72ch.

## Spacing & Radii

- 4px base grid: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128.
- Radii sharp and small: xs 2px, sm 4px, md 6px (default), and only slightly larger for overlays. No pill cards, no 16px+ blobs.

## Elevation & Motion

- Shadows are ink-based, cool and soft (xs→lg); `glowWarm` (ember) is reserved for tickets and primary CTA emphasis.
- Durations 120/200/400/700ms; easing `cubic-bezier(.2,0,0,1)` and ease-out `cubic-bezier(.16,1,.3,1)`. Motion conveys state; no decorative loops, no bounce.

## Components

- Buttons: solid ink or ember (primary), quiet borders otherwise; 6px radius; full state set (hover/focus/active/disabled/loading).
- Cards: bone-50 on bone-100 with hairline border; never nested, never side-stripe accents.
- Status communicated with soft-tint chips (status soft + strong text), not colored left borders.
- Empty states teach; loading uses skeletons, not spinners in content.

## Hard bans (project-specific)

- No gradients as decoration (incl. gradient text via `bg-clip-text`), no glassmorphism, no indigo/violet legacy colors.
- No `#000`/`#fff` outside the bone/ink ramps above.
- No emoji as UI ornament; icons are Lucide, stroke, ink-colored.
- Dark mode exists in web-workspace/web-admin (migrated surfaces): keep parity when touching those screens.
