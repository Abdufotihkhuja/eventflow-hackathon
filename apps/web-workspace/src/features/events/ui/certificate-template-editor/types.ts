/**
 * Локальные типы для редактора шаблона сертификата (UI only).
 * Контракт для будущей интеграции с backend не меняем в api/services.
 */

import type { CertificateRecipientRole, CertificateSizePreset } from '@api/services'

export type CertificateSizeOption = {
  id: CertificateSizePreset
  labelKey: string
  detailKey: string
  widthPx: number
  heightPx: number
  widthMm?: number
  heightMm?: number
  widthIn: number
  heightIn: number
  dpiLabel: string
}

export const DEFAULT_CERTIFICATE_ROLE: CertificateRecipientRole = 'PARTICIPANT'
export const DEFAULT_CERTIFICATE_SIZE_PRESET: CertificateSizePreset = 'A4_LANDSCAPE'

export const CERTIFICATE_SIZE_OPTIONS: CertificateSizeOption[] = [
  {
    id: 'A4_PORTRAIT',
    labelKey: 'events.certificates.sizes.a4Portrait',
    detailKey: 'events.certificates.sizes.a4Detail',
    widthPx: 2480,
    heightPx: 3508,
    widthMm: 210,
    heightMm: 297,
    widthIn: 8.27,
    heightIn: 11.69,
    dpiLabel: '300 DPI',
  },
  {
    id: 'A4_LANDSCAPE',
    labelKey: 'events.certificates.sizes.a4Landscape',
    detailKey: 'events.certificates.sizes.a4Detail',
    widthPx: 3508,
    heightPx: 2480,
    widthMm: 297,
    heightMm: 210,
    widthIn: 11.69,
    heightIn: 8.27,
    dpiLabel: '300 DPI',
  },
  {
    id: 'A6_PORTRAIT',
    labelKey: 'events.certificates.sizes.a6Portrait',
    detailKey: 'events.certificates.sizes.a6Detail',
    widthPx: 1240,
    heightPx: 1748,
    widthMm: 105,
    heightMm: 148,
    widthIn: 4.13,
    heightIn: 5.83,
    dpiLabel: '300 DPI',
  },
  {
    id: 'A6_LANDSCAPE',
    labelKey: 'events.certificates.sizes.a6Landscape',
    detailKey: 'events.certificates.sizes.a6Detail',
    widthPx: 1748,
    heightPx: 1240,
    widthMm: 148,
    heightMm: 105,
    widthIn: 5.83,
    heightIn: 4.13,
    dpiLabel: '300 DPI',
  },
  {
    id: 'LETTER_PORTRAIT',
    labelKey: 'events.certificates.sizes.letterPortrait',
    detailKey: 'events.certificates.sizes.letterDetail',
    widthPx: 2550,
    heightPx: 3300,
    widthIn: 8.5,
    heightIn: 11,
    dpiLabel: '300 DPI',
  },
  {
    id: 'LETTER_LANDSCAPE',
    labelKey: 'events.certificates.sizes.letterLandscape',
    detailKey: 'events.certificates.sizes.letterDetail',
    widthPx: 3300,
    heightPx: 2550,
    widthIn: 11,
    heightIn: 8.5,
    dpiLabel: '300 DPI',
  },
  {
    id: 'A5_LANDSCAPE',
    labelKey: 'events.certificates.sizes.a5Landscape',
    detailKey: 'events.certificates.sizes.a5Detail',
    widthPx: 2480,
    heightPx: 1748,
    widthMm: 210,
    heightMm: 148,
    widthIn: 8.27,
    heightIn: 5.83,
    dpiLabel: '300 DPI',
  },
  {
    id: 'LEGAL_LANDSCAPE',
    labelKey: 'events.certificates.sizes.legalLandscape',
    detailKey: 'events.certificates.sizes.legalDetail',
    widthPx: 4200,
    heightPx: 2550,
    widthIn: 14,
    heightIn: 8.5,
    dpiLabel: '300 DPI',
  },
  {
    id: 'DIGITAL_16_9',
    labelKey: 'events.certificates.sizes.digitalWide',
    detailKey: 'events.certificates.sizes.digitalDetail',
    widthPx: 1920,
    heightPx: 1080,
    widthIn: 16,
    heightIn: 9,
    dpiLabel: 'digital',
  },
]

export const CERTIFICATE_ROLE_OPTIONS: Array<{
  id: CertificateRecipientRole
  labelKey: string
  descriptionKey: string
}> = [
  {
    id: 'PARTICIPANT',
    labelKey: 'events.certificates.roles.participants',
    descriptionKey: 'events.certificates.roles.participantsDescription',
  },
  {
    id: 'SPEAKER',
    labelKey: 'events.certificates.roles.speakers',
    descriptionKey: 'events.certificates.roles.speakersDescription',
  },
  {
    id: 'MENTOR',
    labelKey: 'events.certificates.roles.mentors',
    descriptionKey: 'events.certificates.roles.mentorsDescription',
  },
]

export function getCertificateSizeOption(
  preset?: CertificateSizePreset | string | null
): CertificateSizeOption {
  return (
    CERTIFICATE_SIZE_OPTIONS.find(option => option.id === preset) ??
    CERTIFICATE_SIZE_OPTIONS.find(option => option.id === DEFAULT_CERTIFICATE_SIZE_PRESET) ??
    CERTIFICATE_SIZE_OPTIONS[0]
  )
}

export const CERTIFICATE_WIDTH = getCertificateSizeOption(DEFAULT_CERTIFICATE_SIZE_PRESET).widthPx
export const CERTIFICATE_HEIGHT = getCertificateSizeOption(DEFAULT_CERTIFICATE_SIZE_PRESET).heightPx

/**
 * PDF page size in points per preset — mirrors the backend PDF_PAGE_PRESETS.
 * The certificate font size is expressed in points relative to this page, so we
 * use these to scale it into canvas pixels for an accurate preview.
 */
export const CERTIFICATE_PAGE_PT: Record<
  CertificateSizePreset,
  { width: number; height: number }
> = {
  A4_PORTRAIT: { width: 595, height: 842 },
  A4_LANDSCAPE: { width: 842, height: 595 },
  A6_PORTRAIT: { width: 298, height: 420 },
  A6_LANDSCAPE: { width: 420, height: 298 },
  LETTER_PORTRAIT: { width: 612, height: 792 },
  LETTER_LANDSCAPE: { width: 792, height: 612 },
  A5_LANDSCAPE: { width: 595, height: 420 },
  LEGAL_LANDSCAPE: { width: 1008, height: 612 },
  DIGITAL_16_9: { width: 960, height: 540 },
}

export function getCertificatePagePt(
  preset?: CertificateSizePreset | string | null
): { width: number; height: number } {
  return (
    CERTIFICATE_PAGE_PT[preset as CertificateSizePreset] ??
    CERTIFICATE_PAGE_PT[DEFAULT_CERTIFICATE_SIZE_PRESET]
  )
}

// ─── Text style (font / size / color) ───────────────────────────────────────

export type CertificateFontOption = {
  /** Stable id stored in nameFont and understood by the backend registry. */
  id: string
  /** Display label (the family name — a proper noun, not translated). */
  label: string
  /** CSS font-family stack used to render the live preview on the canvas. */
  cssFamily: string
}

/**
 * Popular Latin + Cyrillic families. Mirrors the backend certificate-fonts
 * catalogue (@openfonts/*_all); ids must stay in sync so the preview matches
 * the generated PDF.
 */
export const CERTIFICATE_FONT_OPTIONS: CertificateFontOption[] = [
  { id: 'inter', label: 'Inter', cssFamily: "'Inter', system-ui, sans-serif" },
  { id: 'roboto', label: 'Roboto', cssFamily: "'Roboto', system-ui, sans-serif" },
  { id: 'open-sans', label: 'Open Sans', cssFamily: "'Open Sans', system-ui, sans-serif" },
  { id: 'montserrat', label: 'Montserrat', cssFamily: "'Montserrat', system-ui, sans-serif" },
  { id: 'pt-sans', label: 'PT Sans', cssFamily: "'PT Sans', system-ui, sans-serif" },
  { id: 'nunito', label: 'Nunito', cssFamily: "'Nunito', system-ui, sans-serif" },
  { id: 'ubuntu', label: 'Ubuntu', cssFamily: "'Ubuntu', system-ui, sans-serif" },
  { id: 'raleway', label: 'Raleway', cssFamily: "'Raleway', system-ui, sans-serif" },
  { id: 'pt-serif', label: 'PT Serif', cssFamily: "'PT Serif', Georgia, serif" },
  { id: 'merriweather', label: 'Merriweather', cssFamily: "'Merriweather', Georgia, serif" },
  { id: 'lora', label: 'Lora', cssFamily: "'Lora', Georgia, serif" },
  { id: 'roboto-slab', label: 'Roboto Slab', cssFamily: "'Roboto Slab', Georgia, serif" },
]

/** Google Fonts families (with weights) preloaded so the preview is accurate. */
export const CERTIFICATE_FONT_FAMILIES_CSS_PARAM = CERTIFICATE_FONT_OPTIONS.map(
  o => `family=${o.label.replace(/ /g, '+')}:wght@400;700`
).join('&')

export const DEFAULT_CERTIFICATE_FONT_ID = 'inter'
export const FONT_SIZE_MIN = 8
export const FONT_SIZE_MAX = 120
export const DEFAULT_FONT_SIZE = 20
export const DEFAULT_TEXT_COLOR = '#111111'

/** Curated swatches that read well on certificate backgrounds. */
export const CERTIFICATE_TEXT_COLORS: string[] = [
  '#111111', // near-black
  '#FFFFFF', // white (for dark templates)
  '#1F2A44', // navy
  '#475569', // slate
  '#B8860B', // gold
  '#7B2D3B', // burgundy
  '#1F6B4E', // emerald
  '#C2410C', // ember
]

export function getCertificateFontOption(id?: string | null): CertificateFontOption {
  return (
    CERTIFICATE_FONT_OPTIONS.find(option => option.id === id) ??
    CERTIFICATE_FONT_OPTIONS[0]
  )
}

export function clampFontSize(size: number): number {
  if (!Number.isFinite(size)) return DEFAULT_FONT_SIZE
  return Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, Math.round(size)))
}

/** Line-height multiplier used to derive a name field's box height from its
 *  font size (leaves room for ascenders/descenders so glyphs are not clipped). */
export const NAME_LINE_HEIGHT = 1.35

/**
 * Height (in % of the page height) a name field should occupy for the given
 * font size — the box height is derived from the font, never set by hand.
 * Font size is in points relative to the page, so height% = lineHeight ·
 * fontSize / pageHeightPt · 100.
 */
export function nameFieldHeightPercent(fontSize: number, pageHeightPt: number): number {
  if (!pageHeightPt) return 0
  return (NAME_LINE_HEIGHT * clampFontSize(fontSize)) / pageHeightPt * 100
}

export function normalizeHexColor(value?: string | null): string | null {
  if (!value) return null
  const v = value.trim()
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v) ? v : null
}

const FONT_BOLD_SUFFIX = '-bold'

/** Combine a font id + bold flag into the value persisted in nameFont. */
export function composeNameFont(fontId: string, bold: boolean): string {
  const id = getCertificateFontOption(fontId).id
  return bold ? `${id}${FONT_BOLD_SUFFIX}` : id
}

/** Split a stored nameFont value back into a known font id + bold flag. */
export function parseNameFont(value?: string | null): {
  fontId: string
  bold: boolean
} {
  const raw = (value ?? '').trim().toLowerCase()
  if (!raw) return { fontId: DEFAULT_CERTIFICATE_FONT_ID, bold: false }
  const bold = raw.endsWith(FONT_BOLD_SUFFIX)
  const baseId = bold ? raw.slice(0, -FONT_BOLD_SUFFIX.length) : raw
  const fontId = CERTIFICATE_FONT_OPTIONS.some(option => option.id === baseId)
    ? baseId
    : DEFAULT_CERTIFICATE_FONT_ID
  return { fontId, bold }
}

/** Область на холсте в процентах (0–100) от выбранного размера шаблона */
export type TemplateFieldArea = {
  x: number
  y: number
  width: number
  height: number
}

/** Horizontal text alignment applied to «Имя» and «Фамилия». */
export type NameAlign = 'left' | 'center' | 'right'

const NAME_ALIGNS: readonly NameAlign[] = ['left', 'center', 'right']

/** Coerce an unknown value into a valid NameAlign (defaults to 'left'). */
export function parseNameAlign(value: unknown): NameAlign {
  return NAME_ALIGNS.includes(value as NameAlign) ? (value as NameAlign) : 'left'
}

/** Состояние позиций полей и стиля текста редактора */
export type CertificateTemplateFieldsState = {
  firstNamePosition: TemplateFieldArea
  lastNamePosition: TemplateFieldArea
  qrPosition: TemplateFieldArea
  /** Доп. зона «Роль» — используется только редактором бейджей (extraZones). */
  rolePosition?: TemplateFieldArea
  /** Доп. зона «Название события» — используется только редактором бейджей. */
  eventNamePosition?: TemplateFieldArea
  /**
   * Текст, кегль (pt) и цвет доп. зон бейджа. Пустой текст означает значение
   * по умолчанию (displayName роли / title события); кегль и цвет обязательны,
   * когда зона включена. Только для редактора бейджей.
   */
  roleLabel?: string
  roleFontSize?: number
  roleColor?: string
  eventLabel?: string
  eventFontSize?: number
  eventColor?: string
  /** Font id (without bold suffix) applied to «Имя» and «Фамилия». */
  nameFont: string
  nameBold: boolean
  /** Font size in points (relative to the PDF page). */
  nameFontSize: number
  /** Hex text colour. */
  nameColor: string
  /** Horizontal alignment applied to «Имя» and «Фамилия». */
  nameAlign: NameAlign
}

export const DEFAULT_FIELDS_STATE: CertificateTemplateFieldsState = {
  firstNamePosition: { x: 25, y: 35, width: 20, height: 8 },
  lastNamePosition: { x: 25, y: 45, width: 20, height: 8 },
  qrPosition: { x: 70, y: 80, width: 18, height: 18 },
  nameFont: DEFAULT_CERTIFICATE_FONT_ID,
  nameBold: false,
  nameFontSize: DEFAULT_FONT_SIZE,
  nameColor: DEFAULT_TEXT_COLOR,
  nameAlign: 'left',
}

const STORAGE_KEY_PREFIX = 'eventflow_cert_template_'

export function loadFieldsFromStorage(eventId: string): CertificateTemplateFieldsState | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${eventId}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<CertificateTemplateFieldsState>
    if (parsed?.firstNamePosition && parsed?.lastNamePosition && parsed?.qrPosition) {
      return {
        firstNamePosition: parsed.firstNamePosition,
        lastNamePosition: parsed.lastNamePosition,
        // Keep the stored QR percents as-is — re-squaring them shrinks the QR
        // on every restore (it's square in px, not in percent on a non-square page).
        qrPosition: parsed.qrPosition,
        nameFont: getCertificateFontOption(parsed.nameFont).id,
        nameBold: Boolean(parsed.nameBold),
        nameFontSize: clampFontSize(parsed.nameFontSize ?? DEFAULT_FONT_SIZE),
        nameColor: normalizeHexColor(parsed.nameColor) ?? DEFAULT_TEXT_COLOR,
        nameAlign: parseNameAlign(parsed.nameAlign),
      }
    }
  } catch {
    // ignore
  }
  return null
}

export function saveFieldsToStorage(eventId: string, fields: CertificateTemplateFieldsState): void {
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${eventId}`, JSON.stringify(fields))
  } catch {
    // ignore
  }
}
