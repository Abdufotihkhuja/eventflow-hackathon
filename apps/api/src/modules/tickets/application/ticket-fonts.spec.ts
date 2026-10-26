/**
 * Smoke test: rendering a PDF that contains BOTH Latin and Cyrillic strings
 * must not produce missing-glyph (.notdef) substitutions. We don't have a
 * trivial way to extract per-glyph IDs from a PDFKit-produced stream here,
 * so this test exercises the registration path itself: if the font files
 * are missing or PDFKit can't decode them, registerFont/font/text will throw
 * before doc.end() resolves.
 *
 * If someone removes @openfonts/inter_all or downgrades it to a subset-split
 * package (like @fontsource/inter), this test fails — preventing the
 * regression that caused EVF-260416-BETXAD to render as `EVF-260416-BETXAD`
 * in Latin but `___ ___ _____` for the Russian labels.
 */
import PDFDocument from 'pdfkit';

const RU_LABELS = [
  'ИНФОРМАЦИЯ О СОБЫТИИ',
  'ДАТА',
  'ВРЕМЯ',
  'МЕСТО',
  'ФОРМАТ',
  'УЧАСТНИК',
  'БИЛЕТ №',
  'QR ДЛЯ ВХОДА',
  'Безопасно · Уникальный билет · Передача невозможна',
  '29 апреля 2026 г.',
];

const FONT_REGULAR = require.resolve(
  '@openfonts/inter_all/files/inter-all-400.woff',
);
const FONT_BOLD = require.resolve(
  '@openfonts/inter_all/files/inter-all-700.woff',
);

function renderToBuffer(textRuns: Array<{ font: string; text: string }>): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: [400, 600], margin: 0 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk as Buffer));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    try {
      doc.registerFont('Inter', FONT_REGULAR);
      doc.registerFont('Inter-Bold', FONT_BOLD);
      let y = 20;
      for (const run of textRuns) {
        doc.fillColor('black').font(run.font).fontSize(14);
        doc.text(run.text, 20, y);
        y += 30;
      }
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

describe('Ticket PDF font pipeline', () => {
  it('registers Inter Regular and Bold without throwing', () => {
    const doc = new PDFDocument({ size: [100, 100], margin: 0 });
    expect(() => {
      doc.registerFont('Inter', FONT_REGULAR);
      doc.registerFont('Inter-Bold', FONT_BOLD);
    }).not.toThrow();
    doc.end();
  });

  it('renders a mixed Latin+Cyrillic page without crashing', async () => {
    const buffer = await renderToBuffer([
      { font: 'Inter-Bold', text: 'E-ticket · Baseline Public Event' },
      ...RU_LABELS.map((text) => ({ font: 'Inter', text })),
      { font: 'Inter-Bold', text: 'EVF-260416-BETXAD' },
    ]);
    expect(buffer.length).toBeGreaterThan(2000);
    // PDF magic header + single-page footer
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('font files are reachable via require.resolve (catches missing dep)', () => {
    expect(() =>
      require.resolve('@openfonts/inter_all/files/inter-all-400.woff'),
    ).not.toThrow();
    expect(() =>
      require.resolve('@openfonts/inter_all/files/inter-all-700.woff'),
    ).not.toThrow();
  });
});
