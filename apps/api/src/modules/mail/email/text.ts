import { chrome } from './i18n';
import type { BrandConfig } from './brand';
import type { EmailBlock, EmailDocument } from './types';

function blockToText(block: EmailBlock): string {
  switch (block.type) {
    case 'paragraph':
    case 'message':
      return block.text.trim();
    case 'code':
      return [block.value, block.note?.trim()].filter(Boolean).join('\n');
    case 'infobox':
      return [block.title, ...block.lines]
        .filter(Boolean)
        .map((l) => String(l).trim())
        .join('\n');
    case 'ticket':
      return [
        `${block.label ?? 'E-ticket'} — ${block.org}`,
        block.number,
        block.event,
        block.badge,
      ]
        .filter(Boolean)
        .join('\n');
    case 'keyvalue':
      return block.rows.map(([k, v]) => `${k}: ${v}`).join('\n');
    case 'divider':
      return '----------------------------------------';
  }
}

/**
 * Plain-text alternative carrying the same meaning, the CTA URL and all key
 * data — keeps a healthy text/HTML balance for spam filters.
 */
export function renderText(
  doc: EmailDocument,
  brand: BrandConfig,
  unsubscribeUrl?: string,
): string {
  const t = chrome(doc.lang);
  const parts: string[] = [];

  parts.push(doc.heading);
  parts.push('');

  for (const p of doc.intro ?? []) parts.push(p.trim());
  if (doc.intro?.length) parts.push('');

  for (const b of doc.blocks ?? []) {
    parts.push(blockToText(b));
    parts.push('');
  }

  if (doc.cta) {
    parts.push(`${doc.cta.label}:`);
    parts.push(doc.cta.url);
    parts.push('');
  }

  for (const p of doc.outro ?? []) parts.push(p.trim());
  if (doc.outro?.length) parts.push('');

  parts.push('—');
  parts.push(`${t.supportTitle} ${brand.supportEmail}`);
  parts.push(t.autoNotice);
  parts.push(`${brand.legalName} · ${brand.postalAddress}`);
  parts.push(t.rightsReserved(new Date().getFullYear()));
  parts.push(brand.siteUrl);
  if (unsubscribeUrl) {
    parts.push(`${t.unsubscribe}: ${unsubscribeUrl}`);
  }

  return parts
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
