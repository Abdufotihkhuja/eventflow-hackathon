# Eventflow Internal Product Design System

Foundation for the **Organizer Cabinet** (`apps/web-workspace`) and **Super Admin**
(`apps/web-admin`). Both surfaces share one visual language with the public site
(`apps/web-public`) — **bone canvas · graphite ink · ember accent · forest secondary** —
but are tuned for daily operational work, not marketing.

> Source of truth: the Eventflow design-system handoff (`colors_and_type.css` v2 +
> `organizer.html` / `admin.html` / `implementation.html`). This doc is the
> implemented adaptation. Do not redesign to the older dark/gradient brief.

This is a **foundation pass**, not a page redesign. Pages keep their current logic,
routes, API calls, permissions and i18n. The next sprints redesign pages on top of
this foundation (see “Next-sprint order”).

---

## The eight non-negotiables

If a decision violates one of these, it is wrong.

1. **Ember is earned.** One ember (primary) CTA per screen; ember also for focus rings
   and a single inflected word in a page title. Everywhere else: graphite.
2. **No left-stripe cards.** Status lives in pills/badges, never a 4px colored card edge.
3. **No gradients in UI.** Flat fills for buttons, inputs, cards, surfaces. (The only
   gradient allowed is a brand-glow halo behind a marketing hero CTA — not in the cabinet.)
4. **Sentence case** for buttons, nav, tabs, labels. Proper nouns excepted.
5. **Tabular numerals** for money, capacities, codes, timestamps. Mono for codes/timestamps.
6. **One radius family.** 6px buttons/inputs · 8px cards · 12px panels · 16px hero · 999px pills.
7. **No emoji in chrome.** Lucide icons or nothing. User content may contain emoji.
8. **Composed motion.** 120/200/400ms, `cubic-bezier(0.2,0,0,1)`. No spring overshoot,
   no bounce, buttons never scale on hover.

---

## Token architecture

The apps are shadcn-based: components consume HSL tokens (`--background`, `--primary`, …)
via Tailwind `hsl(var(--…))`. We **kept** that and added a thin **design-system role
layer** on top, so dark mode flips automatically.

- **shadcn HSL tokens** (`src/index.css` `:root` / `.dark`) — bone-ink values. Drive all
  existing shadcn components. Identical bone-ink palette in both apps.
- **DS role tokens** (additive block in `src/index.css`) — semantic names that point back
  at the shadcn vars, plus things shadcn has no slot for: status **soft** pairs
  (`--success-soft` / `--success-soft-fg`, …), `--brand-soft`, border roles
  (`--border-subtle/-default/-strong`), control heights, container widths, density.
  Names are chosen to **not collide** with shadcn token names.
- **Tailwind aliases** (`tailwind.config.ts`) — expose the role tokens as utilities:
  `bg-canvas`, `bg-surface`, `bg-sunken`, `text-fg-strong/-muted/-subtle`,
  `bg-success-soft text-success-soft-foreground`, `border-strong`, `max-w-container-full`,
  `font-display`, `ease-standard`, `duration-base`. Legacy cool families
  (`blue/sky/cyan → ember`, `indigo/violet/purple → forest`) stay aliased so old utility
  classes render on-brand without per-call edits.

### Surfaces & density — `data-surface`

`<body>` carries `data-surface`: **`organizer`** in web-workspace, **`admin`** in web-admin.
The attribute switches density tokens only (colors stay shared):

| token         | organizer | admin  |
|---------------|-----------|--------|
| `--container` | 1280px    | 1440px |
| `--row-h`     | 48px      | 40px   |
| `--body-size` | 14px      | 13px   |
| `--section-y` | 40px      | 32px   |
| `--shell-pad` | 24px      | 20px   |

Marketing breathes (80px sections, 16px body); the organizer cabinet is calm (40/14);
admin is dense (32/13). Don’t dress the dashboard like marketing.

### Type

Manrope (sans / body) × Space Grotesk (`font-display`, geometric accent, **no italics**) ×
JetBrains Mono (`font-mono`, numbers/codes/timestamps). One Space Grotesk inflection per
headline, in ember — that’s the `titleAccent` prop on `PageHeader`.

---

## Layout rules

- **App shell** — fixed left sidebar + sticky top bar + scrollable work area.
  - **Organizer sidebar:** light (`bg-card`), graphite-ink active state, grouped nav,
    232–260px.
  - **Super admin sidebar:** fixed **graphite (`#0e0e0d`) rail**, **ember active state**,
    `ADMIN` tag, denser items (12.5px), grouped (Operate / Inspect / System). Dark in both
    themes — it’s deliberate admin chrome. Implemented in
    `web-admin/.../admin-layout/ui/admin-sidebar.tsx`.
- **Top bar** — breadcrumb + page title + actions + user menu, sticky, hairline bottom border.
- **Container widths** — `max-w-wide` (1280) for the organizer, `max-w-container-full` (1440)
  for admin dashboards/tables, `max-w-narrow` (720) for forms/settings/prose.
- **Page header** — `PageHeader` is the first element of every page: eyebrow (with ember
  dot) → title (+ optional ember `titleAccent`) → description → trailing actions, with a
  bottom hairline.
- **Responsive** — sidebar collapses to an icon rail / sheet on small screens. Below 768px,
  tables collapse to vertical row-cards (key/value), never horizontal-scroll on phones.

## Component rules

| Concern | Use | Notes |
|---|---|---|
| Buttons | shadcn `Button` | One ember `default` per screen; promote secondaries to graphite/outline. Sentence case. |
| Cards | shadcn `Card` | Hairline border, `rounded-lg`, `shadow-soft` rest. No left stripe. |
| Tables | `DataTable` | Sunken header, hairline rows, hover tint, tabular numerals, right-align numerics. |
| Filters / search | `FilterChip` (workspace) / `FilterToolbar` (admin) | Search input + chips + right-aligned bulk actions. **Inconsistency to unify — see below.** |
| Forms | react-hook-form + zod + shadcn `Form`/`FormField` | Labels, helper text, `is-invalid` states, grouped sections, destructive confirm. |
| Inputs / selects | shadcn `Input` / `Select` / `Textarea` | 40px md height, ember focus ring. |
| Badges / status | **`StatusPill`** | Seven canonical pills (live/scheduled/draft/paused/ended/cancelled/soldout) + generic tones. `statusPillTone(status)` maps raw status strings. Soft tints, never loud solids (except `soldout`). |
| Tabs | shadcn `Tabs` | Underline (page) or segmented (controls). |
| Dropdowns / actions | shadcn `DropdownMenu` | Row `…` menus, user menu. |
| Modals / dialogs | shadcn `Dialog` / `AlertDialog` | Decisions use a modal/alert, never a toast. |
| Empty states | `EmptyState` | One glyph, one-line title, one-sentence prompt, one CTA. The absence is the message — don’t pitch features. |
| Loading | `LoadingState` + shadcn `Skeleton` | Skeletons mirror real geometry. |
| Errors | `ErrorState` | Calm, recoverable, owns it; **never leak backend/internal messages.** |
| Permission denied | **`PermissionDenied`** | Explains the access boundary without scaring or leaking why. |
| Toasts | sonner | Transient confirmations only. |

## Product rules

- **Organizer cabinet** — operational, focused, friendly. Light sidebar, calm density,
  event-management language: events, registrations, attendees, tickets, QR check-in,
  analytics, team, settings.
- **Super admin** — denser, stricter, more controlled. Graphite sidebar with ember active,
  6-up KPI rows, dense tables, status/monitoring blocks, moderation queue. Language:
  organizations, users, events moderation, roles, audit, payouts, system.
- Both clearly belong to **one Eventflow family** — same palette, type, components, status
  pills; only density and sidebar treatment differ.

## Anti-AI rules

No fake metrics, no generic SaaS cards without an operational purpose, no poetic/abstract
labels (“growth”, “engagement”, “insights”) unless the data means exactly that, no
placeholder content, no decorative gradients/glassmorphism/glow/blobs. Every card, table,
badge, empty state, metric and CTA must explain a real task, state or decision.

---

## Inconsistencies found (web-workspace vs web-admin)

1. **web-admin was on the old indigo theme** — Plus Jakarta Sans, indigo `--primary`,
   generic shadows, no font imports, no ember/forest ramps. **Fixed** this pass (bone-ink parity).
2. **Filter primitive split** — workspace has `FilterChip`, admin has `FilterToolbar`. Not
   yet unified (kept both; documented). Unify into one shared filter API next sprint.
3. **`locale-flag` / `PaginationBar`** exist in workspace only; admin lacks them.
4. **No canonical status pill** anywhere — only `BlogStatusBadge` (blog-specific, uses raw
   `slate/amber/emerald/rose`). **Fixed**: added `StatusPill` + `statusPillTone` to both.
5. **PageHeader drift** — admin’s was a smaller, eyebrow-dotless variant. **Fixed**: both now
   share the editorial pattern + `titleAccent`; admin keeps a one-step-smaller title (density).
6. **No `PermissionDenied`** primitive. **Fixed**: added to both.
7. **web-admin `protected-layout.tsx` is dead code** (organizer cabinet; the router only uses
   `SuperAdminLayout`). Left untouched; flag for removal.
8. **Admin mobile sidebar** (`mobile-sidebar.tsx`) is not yet dark like the desktop admin
   rail — follow-up.

## Components standardized this pass

- Token + surface foundation in **both** apps (role tokens, `data-surface` density, tailwind aliases).
- web-admin migrated to bone-ink (index.css, index.html fonts, tailwind ramps/fonts/shadows).
- New shared primitives in **both** apps: `StatusPill` (+ `statusPillTone`), `PermissionDenied`.
- `PageHeader` gained `titleAccent`; reconciled across both apps.
- Super-admin shell: dark graphite sidebar with ember active + `ADMIN` tag.

## Intentionally NOT changed yet

Page bodies (dashboards, tables, detail/create flows, settings), business logic, API
contracts, routes, permissions, i18n keys, the admin navbar internals, and `BlogStatusBadge`
(blog-specific). web-admin `protected-layout.tsx` (dead code) left as-is.

## Recommended next-sprint order

**1 · web-workspace (Organizer Cabinet)**
1. Dashboard overview — KPI row, active-events panel, needs-attention, activity (real data).
2. Events list + event detail tabs (overview / registrations / tickets / check-in).
3. Registrations/attendees table — adopt `DataTable` + `StatusPill` + unified filter toolbar.
4. Tickets, check-in mode, analytics, settings/team — apply `PageHeader`, states, forms.

**2 · web-admin (Super Admin)**
1. Platform overview — dense KPI row + system-status blocks.
2. Organizations + Users dense tables (`ef-table--dense` density, `StatusPill`, bulk actions).
3. Events moderation + detail/edit, verification codes.
4. Categories / collections / blog moderation, settings, audit surfaces.

Adopt the shared filter primitive (unify `FilterChip`/`FilterToolbar`) and dark the admin
mobile sidebar early in sprint 2.
