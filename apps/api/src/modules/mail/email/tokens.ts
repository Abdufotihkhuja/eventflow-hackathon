/**
 * Email design tokens.
 *
 * Mirrors the eventflow.uz public-site visual system (bone / ink / ember)
 * so transactional mail reads as a natural continuation of the site.
 * Values are flat hex (no CSS variables, no gradients) for email-client safety.
 */
export const tokens = {
  color: {
    // Surfaces
    pageBg: '#fbfbfa', // bone-100
    cardBg: '#ffffff', // bone-50
    sunkenBg: '#f5f5f3', // bone-200
    divider: '#ececea', // bone-300
    borderStrong: '#dcdcda', // bone-400

    // Text (ink)
    ink: '#0e0e0d', // ink-400 — headings
    inkBody: '#2a2a28', // ink-300 — body
    inkSecondary: '#4a4a47', // ink-200 — secondary
    inkMeta: '#6f6f6c', // ink-100 — meta / footer

    // Brand accent (ember)
    accent: '#ea580c', // ember-400 — primary
    accentPress: '#c64a07', // ember-500
    accentSoft: '#fff3eb', // ember-50

    // Status
    success: '#1f7a3f',
    successSoft: '#d8ebe0',
    warning: '#b8860b',
    warningSoft: '#f6e6bf',
    danger: '#c2270e',
    dangerSoft: '#f9d6cf',

    white: '#ffffff',
  },
  font: {
    // System stack only — no web fonts in email.
    sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    mono: "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace",
  },
  radius: {
    md: '8px',
    lg: '12px',
    pill: '999px',
  },
  layout: {
    maxWidth: '600px',
  },
} as const;
