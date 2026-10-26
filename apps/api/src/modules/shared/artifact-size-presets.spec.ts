import {
  BADGE_SIZE_PRESETS,
  CERTIFICATE_SIZE_PRESETS,
  resolveBadgeSizePreset,
  resolveCertificateSizePreset,
} from './artifact-size-presets';

describe('artifact size presets', () => {
  it('converts badge millimeter presets to 300 DPI pixels', () => {
    expect(BADGE_SIZE_PRESETS.BADGE_85X55).toMatchObject({
      widthPx: 1004,
      heightPx: 650,
    });
    expect(BADGE_SIZE_PRESETS.BADGE_90X60).toMatchObject({
      widthPx: 1063,
      heightPx: 709,
    });
    expect(BADGE_SIZE_PRESETS.BADGE_60X90).toMatchObject({
      widthPx: 709,
      heightPx: 1063,
    });
  });

  it('converts certificate millimeter presets to 300 DPI pixels', () => {
    expect(CERTIFICATE_SIZE_PRESETS.A6_PORTRAIT).toMatchObject({
      widthPx: 1240,
      heightPx: 1748,
    });
    expect(CERTIFICATE_SIZE_PRESETS.A4_PORTRAIT).toMatchObject({
      widthPx: 2480,
      heightPx: 3508,
    });
  });

  it('rejects unknown presets unless a future explicit custom mode is added', () => {
    expect(() => resolveBadgeSizePreset('BADGE_WHATEVER')).toThrow(
      /Unknown badge size preset/,
    );
    expect(() => resolveCertificateSizePreset('POSTER')).toThrow(
      /Unknown certificate size preset/,
    );
  });
});
