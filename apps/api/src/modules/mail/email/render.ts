import { renderHtml } from './layout';
import { renderText } from './text';
import { TEMPLATES } from './templates';
import { resolveLocale } from './types';
import { DEFAULT_BRAND, type BrandConfig } from './brand';
import type { EmailContext, RenderedEmail } from './types';

export { DEFAULT_BRAND } from './brand';
export type { BrandConfig } from './brand';

export function isKnownTemplate(name: string): boolean {
  return name in TEMPLATES;
}

/**
 * Renders a queued template into a deliverability-ready email
 * (subject + preheader + HTML + plain-text).
 *
 * Locale is taken from `context.locale` when present (defaults to `ru`,
 * preserving current behavior). `enqueuedSubject` is the organizer-provided
 * subject for broadcast mail and is also kept as a fallback.
 */
export function renderEmail(
  template: string,
  context: EmailContext,
  brand: BrandConfig = DEFAULT_BRAND,
  enqueuedSubject?: string,
  unsubscribeUrl?: string,
): RenderedEmail {
  const builder = TEMPLATES[template];
  if (!builder) {
    throw new Error(`Unknown email template: ${template}`);
  }

  const locale = resolveLocale(context.locale);
  const ctx: EmailContext =
    enqueuedSubject !== undefined
      ? { ...context, __subject: enqueuedSubject }
      : context;

  const doc = builder(ctx, locale);
  if (!doc.subject && enqueuedSubject) {
    doc.subject = enqueuedSubject;
  }

  return {
    subject: doc.subject,
    preheader: doc.preheader,
    html: renderHtml(doc, brand, unsubscribeUrl),
    text: renderText(doc, brand, unsubscribeUrl),
    category: doc.category,
  };
}
