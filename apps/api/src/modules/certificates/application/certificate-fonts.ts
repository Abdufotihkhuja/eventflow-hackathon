/**
 * Cyrillic-capable font catalogue for certificate PDF rendering.
 *
 * PDFKit's built-in standard fonts (Helvetica/Times/Courier) use Latin-1-only
 * glyph tables and garble Cyrillic — the same problem already solved for tickets
 * via `@openfonts/*_all` packages (single-file .woff with Latin + Cyrillic that
 * PDFKit accepts). We resolve the bundled file at runtime with `require.resolve`
 * so it works in both dev (src) and prod (dist) without copying assets.
 *
 * The frontend stores the chosen font in `CertificateTemplate.nameFont` as a
 * lowercase id (e.g. `roboto`, `pt-serif`); bold is encoded with a `-bold`
 * suffix (e.g. `roboto-bold`). Unknown/legacy values fall back to the default.
 */

export const DEFAULT_CERTIFICATE_FONT_ID = 'inter';

type CertificateFontDef = {
  /** Stable id stored in nameFont and sent by the editor. */
  id: string;
  /** Human-readable family name (informational / logging). */
  family: string;
  /** `@openfonts/<pkg>_all` base name. */
  pkg: string;
};

/**
 * Popular Latin + Cyrillic families. Each ships 400 (regular) and 700 (bold)
 * weights verified to cover Russian and Uzbek Cyrillic.
 */
export const CERTIFICATE_FONTS: readonly CertificateFontDef[] = [
  { id: 'inter', family: 'Inter', pkg: 'inter' },
  { id: 'roboto', family: 'Roboto', pkg: 'roboto' },
  { id: 'open-sans', family: 'Open Sans', pkg: 'open-sans' },
  { id: 'montserrat', family: 'Montserrat', pkg: 'montserrat' },
  { id: 'pt-sans', family: 'PT Sans', pkg: 'pt-sans' },
  { id: 'nunito', family: 'Nunito', pkg: 'nunito' },
  { id: 'ubuntu', family: 'Ubuntu', pkg: 'ubuntu' },
  { id: 'raleway', family: 'Raleway', pkg: 'raleway' },
  { id: 'pt-serif', family: 'PT Serif', pkg: 'pt-serif' },
  { id: 'merriweather', family: 'Merriweather', pkg: 'merriweather' },
  { id: 'lora', family: 'Lora', pkg: 'lora' },
  { id: 'roboto-slab', family: 'Roboto Slab', pkg: 'roboto-slab' },
];

const FONT_BY_ID = new Map(CERTIFICATE_FONTS.map((font) => [font.id, font]));

const BOLD_SUFFIX = '-bold';

export type ParsedCertificateFont = { fontId: string; bold: boolean };

/** Splits a stored nameFont value into a known font id + bold flag. */
export function parseCertificateNameFont(
  value: string | null | undefined,
): ParsedCertificateFont {
  const raw = (value ?? '').trim().toLowerCase();
  if (!raw) return { fontId: DEFAULT_CERTIFICATE_FONT_ID, bold: false };

  const bold = raw.endsWith(BOLD_SUFFIX);
  const baseId = bold ? raw.slice(0, -BOLD_SUFFIX.length) : raw;
  const fontId = FONT_BY_ID.has(baseId) ? baseId : DEFAULT_CERTIFICATE_FONT_ID;
  return { fontId, bold };
}

const pathCache = new Map<string, string>();

/** Absolute path to the bundled .woff for the given font id + weight. */
export function resolveCertificateFontFile(
  fontId: string,
  bold: boolean,
): string {
  const def = FONT_BY_ID.get(fontId) ?? FONT_BY_ID.get(DEFAULT_CERTIFICATE_FONT_ID)!;
  const weight = bold ? 700 : 400;
  const cacheKey = `${def.pkg}-${weight}`;

  const cached = pathCache.get(cacheKey);
  if (cached) return cached;

  const resolved = require.resolve(
    `@openfonts/${def.pkg}_all/files/${def.pkg}-all-${weight}.woff`,
  );
  pathCache.set(cacheKey, resolved);
  return resolved;
}
