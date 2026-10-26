# Product

## Register

product

Note: the default register is product (workspace + admin app UI). Marketing surfaces in `apps/web-public` (landing, pricing, about, organizers) run in the brand register; per-surface cues win over this default.

## Users

- **Attendees (web-public, mobile)**: people in Uzbekistan discovering events, registering, holding tickets/certificates. Trilingual audience (uz/ru/en), often on mid-range Android devices and spotty networks.
- **Organizers (web-workspace)**: event teams running registration, participants, check-in, certificates, badges, boards, blog, billing. In a task, often under time pressure right before or during an event.
- **Platform admins (web-admin)**: EventFlow staff moderating organizations, users, and platform health.

## Product Purpose

EventFlow is an event platform for Uzbekistan: public event discovery and registration, an organizer workspace (participants, check-in, certificates, badges, tasks), and a platform admin panel. Success = organizers trust it with a live event, attendees register without friction in their language.

## Brand Personality

Formal but young. Calm, editorial, precise. High contrast, generous whitespace, one warm accent (ember) used sparingly. The interface stays quiet so events and content carry the color.

## Anti-references

- Generic AI-generated SaaS: indigo/violet gradients, glassmorphism cards, gradient text, sparkle emoji.
- Dashboard-template look: hero-metric tiles with gradient accents, identical icon-card grids.
- Loud startup landing pages: bouncing motion, neon, all-caps shouting.

## Design Principles

1. **Calm chrome, loud content**: UI chrome is bone/ink; color belongs to event imagery, status, and one accent.
2. **Ember is an accent, never a wash**: primary actions, active state, brand moments only (recorded user preference).
3. **Fewer controls, clearer defaults**: prefer minimal flag-style switchers and inline flows over stacked toggles and modals.
4. **Earned familiarity in product surfaces**: standard nav, tables, forms; no invented affordances during a live event.
5. **Trilingual by construction**: every string ships in uz/ru/en; copy length and typography must survive all three.

## Accessibility & Inclusion

- WCAG 2.1 AA as the working bar: contrast on bone backgrounds, visible focus, keyboard paths in workspace flows.
- Respect `prefers-reduced-motion`; motion conveys state only.
- Cyrillic + Latin scripts must both render well in the chosen faces.
