import { tokens } from './tokens';
import type { EmailBlock } from './types';

const c = tokens.color;
const f = tokens.font;

function toStr(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean')
    return String(value);
  return JSON.stringify(value);
}

/** HTML-escape untrusted text before placing it into markup. */
export function esc(value: unknown): string {
  return toStr(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Escapes text and converts newlines to <br> for multi-line user content. */
function escMultiline(value: unknown): string {
  return esc(value).replace(/\r?\n/g, '<br />');
}

export function paragraph(text: string): string {
  return `<p style="margin:0 0 16px;font-family:${f.sans};font-size:16px;line-height:1.65;color:${c.inkBody};">${escMultiline(
    text,
  )}</p>`;
}

export function heading(text: string): string {
  return `<h1 style="margin:0 0 18px;font-family:${f.sans};font-size:22px;line-height:1.35;font-weight:700;color:${c.ink};">${esc(
    text,
  )}</h1>`;
}

/** Bulletproof CTA button (VML fallback for Outlook desktop). */
export function button(label: string, url: string): string {
  const safeUrl = esc(url);
  const safeLabel = esc(label);
  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 4px;">
  <tr>
    <td align="center" bgcolor="${c.accent}" style="border-radius:${tokens.radius.md};">
      <!--[if mso]>
      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${safeUrl}" style="height:48px;v-text-anchor:middle;width:280px;" arcsize="17%" strokecolor="${c.accent}" fillcolor="${c.accent}">
        <w:anchorlock/>
        <center style="color:#ffffff;font-family:${f.sans};font-size:16px;font-weight:bold;">${safeLabel}</center>
      </v:roundrect>
      <![endif]-->
      <!--[if !mso]><!-- -->
      <a href="${safeUrl}" target="_blank" style="display:inline-block;padding:14px 30px;font-family:${f.sans};font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:${tokens.radius.md};background-color:${c.accent};">${safeLabel}</a>
      <!--<![endif]-->
    </td>
  </tr>
</table>`;
}

/** Plain visible fallback URL line shown under every CTA. */
export function fallbackLink(label: string, url: string): string {
  const safeUrl = esc(url);
  return `
<p style="margin:18px 0 4px;font-family:${f.sans};font-size:13px;line-height:1.6;color:${c.inkMeta};">${esc(
    label,
  )}</p>
<p style="margin:0 0 8px;font-family:${f.mono};font-size:13px;line-height:1.6;word-break:break-all;">
  <a href="${safeUrl}" target="_blank" style="color:${c.accentPress};text-decoration:underline;">${safeUrl}</a>
</p>`;
}

function codeBlock(value: string, note?: string): string {
  const noteHtml = note
    ? `<p style="margin:12px 0 0;font-family:${f.sans};font-size:13px;line-height:1.6;color:${c.inkMeta};">${esc(
        note,
      )}</p>`
    : '';
  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:8px 0 20px;">
  <tr>
    <td align="center" bgcolor="${c.sunkenBg}" style="padding:22px;border-radius:${tokens.radius.md};border:1px solid ${c.divider};">
      <div style="font-family:${f.mono};font-size:32px;font-weight:700;letter-spacing:8px;color:${c.ink};">${esc(
        value,
      )}</div>
    </td>
  </tr>
</table>${noteHtml}`;
}

const toneColor = {
  neutral: { bg: c.sunkenBg, bar: c.borderStrong, text: c.inkSecondary },
  success: { bg: c.successSoft, bar: c.success, text: c.inkBody },
  warning: { bg: c.warningSoft, bar: c.warning, text: c.inkBody },
  danger: { bg: c.dangerSoft, bar: c.danger, text: c.inkBody },
} as const;

function infobox(
  tone: keyof typeof toneColor,
  lines: string[],
  title?: string,
): string {
  const t = toneColor[tone];
  const titleHtml = title
    ? `<p style="margin:0 0 6px;font-family:${f.sans};font-size:14px;font-weight:700;color:${c.ink};">${esc(
        title,
      )}</p>`
    : '';
  const body = lines
    .map(
      (l) =>
        `<p style="margin:0 0 4px;font-family:${f.sans};font-size:14px;line-height:1.6;color:${t.text};">${escMultiline(
          l,
        )}</p>`,
    )
    .join('');
  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:4px 0 20px;">
  <tr>
    <td bgcolor="${t.bg}" style="padding:16px 18px;border-radius:${tokens.radius.md};border-left:4px solid ${t.bar};">
      ${titleHtml}${body}
    </td>
  </tr>
</table>`;
}

function ticketCard(
  org: string,
  number: string,
  event: string,
  badge?: string,
  label = 'E-TICKET',
): string {
  const badgeHtml = badge
    ? `<div style="display:inline-block;margin-top:12px;padding:5px 12px;border-radius:${tokens.radius.pill};background-color:${c.warningSoft};color:${c.warning};font-family:${f.sans};font-size:12px;font-weight:600;">${esc(
        badge,
      )}</div>`
    : '';
  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:8px 0 20px;">
  <tr>
    <td bgcolor="${c.sunkenBg}" style="padding:22px;border-radius:${tokens.radius.lg};border:1px solid ${c.borderStrong};">
      <div style="font-family:${f.sans};font-size:11px;letter-spacing:1.4px;text-transform:uppercase;color:${c.accentPress};margin-bottom:8px;">${esc(
        label,
      )} · ${esc(org)}</div>
      <div style="font-family:${f.mono};font-size:22px;font-weight:700;letter-spacing:1.5px;color:${c.ink};margin-bottom:4px;">${esc(
        number,
      )}</div>
      <div style="font-family:${f.sans};font-size:14px;color:${c.inkSecondary};">${esc(
        event,
      )}</div>
      ${badgeHtml}
    </td>
  </tr>
</table>`;
}

function keyValue(rows: Array<[string, string]>): string {
  const body = rows
    .map(
      ([k, v]) => `
  <tr>
    <td style="padding:8px 0;font-family:${f.sans};font-size:14px;color:${c.inkMeta};width:40%;vertical-align:top;">${esc(
      k,
    )}</td>
    <td style="padding:8px 0;font-family:${f.sans};font-size:14px;font-weight:600;color:${c.inkBody};">${escMultiline(
      v,
    )}</td>
  </tr>`,
    )
    .join('');
  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:4px 0 20px;border-top:1px solid ${c.divider};border-bottom:1px solid ${c.divider};">
  ${body}
</table>`;
}

function divider(): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:24px 0;"><tr><td style="border-top:1px solid ${c.divider};font-size:0;line-height:0;">&nbsp;</td></tr></table>`;
}

function quotedMessage(text: string): string {
  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:4px 0 20px;">
  <tr>
    <td bgcolor="${c.sunkenBg}" style="padding:18px 20px;border-radius:${tokens.radius.md};border:1px solid ${c.divider};">
      <p style="margin:0;font-family:${f.sans};font-size:15px;line-height:1.65;color:${c.inkBody};">${escMultiline(
        text,
      )}</p>
    </td>
  </tr>
</table>`;
}

export function renderBlock(block: EmailBlock): string {
  switch (block.type) {
    case 'paragraph':
      return paragraph(block.text);
    case 'code':
      return codeBlock(block.value, block.note);
    case 'infobox':
      return infobox(block.tone, block.lines, block.title);
    case 'ticket':
      return ticketCard(
        block.org,
        block.number,
        block.event,
        block.badge,
        block.label,
      );
    case 'keyvalue':
      return keyValue(block.rows);
    case 'divider':
      return divider();
    case 'message':
      return quotedMessage(block.text);
  }
}
