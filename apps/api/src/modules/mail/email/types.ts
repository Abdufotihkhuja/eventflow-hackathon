export type Locale = 'ru' | 'en' | 'uz';

export const SUPPORTED_LOCALES: Locale[] = ['ru', 'en', 'uz'];
export const DEFAULT_LOCALE: Locale = 'ru';

export function resolveLocale(value: unknown): Locale {
  if (typeof value === 'string') {
    const lower = value.toLowerCase().slice(0, 2);
    if (SUPPORTED_LOCALES.includes(lower as Locale)) {
      return lower as Locale;
    }
  }
  return DEFAULT_LOCALE;
}

export type InfoTone = 'neutral' | 'success' | 'warning' | 'danger';

export type EmailBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'code'; value: string; note?: string }
  | { type: 'infobox'; tone: InfoTone; title?: string; lines: string[] }
  | {
      type: 'ticket';
      org: string;
      number: string;
      event: string;
      badge?: string;
      /** Надпись над номером. По умолчанию «E-TICKET» — для ещё не выпущенного
       *  билета (заявка на рассмотрении) сюда передают «Заявка». */
      label?: string;
    }
  | { type: 'keyvalue'; rows: Array<[string, string]> }
  | { type: 'divider' }
  | { type: 'message'; text: string };

export interface EmailCta {
  label: string;
  url: string;
  /** Plain-text label for the fallback line, e.g. "Open the link below". */
  fallbackLabel?: string;
}

/**
 * Category drives deliverability headers.
 * - `transactional`: security / account / direct-action mail (no unsubscribe).
 * - `notification`: organizer broadcasts and digest-like mail (List-Unsubscribe added).
 */
export type EmailCategory = 'transactional' | 'notification';

export interface EmailDocument {
  lang: Locale;
  subject: string;
  /** Short hidden inbox-preview text (40-110 chars recommended). */
  preheader: string;
  heading: string;
  /** Lead paragraphs rendered before the main blocks. */
  intro?: string[];
  blocks?: EmailBlock[];
  cta?: EmailCta;
  /** Paragraphs rendered after blocks / CTA. */
  outro?: string[];
  category: EmailCategory;
}

export interface RenderedEmail {
  subject: string;
  preheader: string;
  html: string;
  text: string;
  category: EmailCategory;
}

export type EmailContext = Record<string, unknown>;

export type EmailTemplateBuilder = (
  context: EmailContext,
  locale: Locale,
) => EmailDocument;
