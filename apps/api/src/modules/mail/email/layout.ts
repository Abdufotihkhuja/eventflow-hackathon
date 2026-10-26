import { tokens } from './tokens';
import { esc, heading, button, fallbackLink, renderBlock } from './components';
import { chrome } from './i18n';
import type { BrandConfig } from './brand';
import type { EmailDocument } from './types';

const c = tokens.color;
const f = tokens.font;

/** Zero-width spacer to keep preheader text from pulling body copy into preview. */
const PREHEADER_PAD = '&#847; &zwnj; &nbsp; '.repeat(40);

function header(brand: BrandConfig): string {
  return `
<tr>
  <td style="padding:32px 40px 8px;">
    <a href="${esc(brand.siteUrl)}" target="_blank" style="text-decoration:none;font-family:${f.sans};font-size:20px;font-weight:800;letter-spacing:-0.4px;color:${c.ink};">
      <img src="${esc(brand.logoUrl)}" alt="${esc(brand.productName)}" width="168" height="37" style="display:block;width:168px;max-width:168px;height:auto;border:0;outline:none;text-decoration:none;color:${c.ink};font-family:${f.sans};font-size:20px;font-weight:800;" />
    </a>
  </td>
</tr>`;
}

function supportSection(brand: BrandConfig, doc: EmailDocument): string {
  const t = chrome(doc.lang);
  return `
<tr>
  <td style="padding:0 40px 28px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-top:1px solid ${c.divider};">
      <tr><td style="height:20px;font-size:0;line-height:0;">&nbsp;</td></tr>
      <tr>
        <td style="font-family:${f.sans};font-size:13px;line-height:1.6;color:${c.inkMeta};">
          <strong style="color:${c.inkSecondary};">${esc(t.supportTitle)}</strong><br />
          ${esc(t.supportBody(brand.supportEmail).replace(brand.supportEmail, ''))}<a href="mailto:${esc(
            brand.supportEmail,
          )}" style="color:${c.accentPress};text-decoration:underline;">${esc(brand.supportEmail)}</a>
        </td>
      </tr>
    </table>
  </td>
</tr>`;
}

function footer(
  brand: BrandConfig,
  doc: EmailDocument,
  unsubscribeUrl?: string,
): string {
  const t = chrome(doc.lang);
  const year = new Date().getFullYear();
  const unsubscribeLine = unsubscribeUrl
    ? `
    <p style="margin:0 0 6px;font-family:${f.sans};font-size:12px;line-height:1.6;color:${c.inkMeta};">
      <a href="${esc(unsubscribeUrl)}" target="_blank" style="color:${c.inkMeta};text-decoration:underline;">${esc(
        t.unsubscribe,
      )}</a>
    </p>`
    : '';
  return `
<tr>
  <td style="padding:24px 40px 36px;background-color:${c.sunkenBg};border-top:1px solid ${c.divider};">
    <p style="margin:0 0 6px;font-family:${f.sans};font-size:12px;line-height:1.6;color:${c.inkMeta};">
      ${esc(t.autoNotice)}
    </p>
    <p style="margin:0 0 6px;font-family:${f.sans};font-size:12px;line-height:1.6;color:${c.inkMeta};">
      ${esc(brand.legalName)} · ${esc(brand.postalAddress)}
    </p>${unsubscribeLine}
    <p style="margin:0;font-family:${f.sans};font-size:12px;line-height:1.6;color:${c.inkMeta};">
      ${esc(t.rightsReserved(year))} ·
      <a href="${esc(brand.siteUrl)}" target="_blank" style="color:${c.inkMeta};text-decoration:underline;">${esc(
        brand.siteUrl.replace(/^https?:\/\//, ''),
      )}</a>
    </p>
  </td>
</tr>`;
}

/** Renders the full, email-client-safe HTML document. */
export function renderHtml(
  doc: EmailDocument,
  brand: BrandConfig,
  unsubscribeUrl?: string,
): string {
  const t = chrome(doc.lang);

  const intro = (doc.intro ?? []).map(
    (p) =>
      `<p style="margin:0 0 16px;font-family:${f.sans};font-size:16px;line-height:1.65;color:${c.inkBody};">${esc(
        p,
      )}</p>`,
  );

  const blocks = (doc.blocks ?? []).map(renderBlock);

  const cta = doc.cta
    ? button(doc.cta.label, doc.cta.url) +
      fallbackLink(doc.cta.fallbackLabel ?? t.ctaFallback, doc.cta.url)
    : '';

  const outro = (doc.outro ?? []).map(
    (p) =>
      `<p style="margin:0 0 16px;font-family:${f.sans};font-size:16px;line-height:1.65;color:${c.inkBody};">${esc(
        p,
      )}</p>`,
  );

  const body = [
    heading(doc.heading),
    ...intro,
    ...blocks,
    cta,
    ...outro,
  ].join('\n');

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="${doc.lang}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="color-scheme" content="light only" />
  <meta name="supported-color-schemes" content="light only" />
  <title>${esc(doc.subject)}</title>
  <!--[if mso]><style>table,td,div,p,a{font-family:Arial,Helvetica,sans-serif !important;}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:${c.pageBg};">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${c.pageBg};">
    ${esc(doc.preheader)}${PREHEADER_PAD}
  </div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${c.pageBg};">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="${parseInt(
          tokens.layout.maxWidth,
          10,
        )}" style="width:100%;max-width:${tokens.layout.maxWidth};background-color:${c.cardBg};border:1px solid ${c.divider};border-radius:${tokens.radius.lg};overflow:hidden;">
          ${header(brand)}
          <tr>
            <td style="padding:16px 40px 8px;">
              ${body}
            </td>
          </tr>
          ${supportSection(brand, doc)}
          ${footer(brand, doc, unsubscribeUrl)}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
