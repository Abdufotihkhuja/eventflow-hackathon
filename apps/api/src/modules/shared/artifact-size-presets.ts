import { BadRequestException } from '@nestjs/common';

export const ARTIFACT_DPI = 300;
const MM_PER_INCH = 25.4;

export type ArtifactSizePreset = {
  widthMm: number;
  heightMm: number;
  dpi: number;
  widthPx: number;
  heightPx: number;
};

export type BadgeSizePreset =
  | 'BADGE_85X55'
  | 'BADGE_90X60'
  | 'BADGE_60X90'
  | 'BADGE_90X90'
  | 'BADGE_100X70'
  | 'BADGE_80X100'
  | 'BADGE_A6';

export type CertificateSizePreset =
  | 'A4_PORTRAIT'
  | 'A4_LANDSCAPE'
  | 'A6_PORTRAIT'
  | 'A6_LANDSCAPE'
  | 'LETTER_PORTRAIT'
  | 'LETTER_LANDSCAPE'
  | 'A5_LANDSCAPE'
  | 'LEGAL_LANDSCAPE'
  | 'DIGITAL_16_9';

export function mmToPx(mm: number, dpi = ARTIFACT_DPI): number {
  return Math.round((mm / MM_PER_INCH) * dpi);
}

function preset(widthMm: number, heightMm: number): ArtifactSizePreset {
  return {
    widthMm,
    heightMm,
    dpi: ARTIFACT_DPI,
    widthPx: mmToPx(widthMm),
    heightPx: mmToPx(heightMm),
  };
}

export const BADGE_SIZE_PRESETS: Record<BadgeSizePreset, ArtifactSizePreset> = {
  BADGE_85X55: preset(85, 55),
  BADGE_90X60: preset(90, 60),
  BADGE_60X90: preset(60, 90),
  BADGE_90X90: preset(90, 90),
  BADGE_100X70: preset(100, 70),
  BADGE_80X100: preset(80, 100),
  BADGE_A6: preset(105, 148),
};

export const CERTIFICATE_SIZE_PRESETS: Record<
  CertificateSizePreset,
  ArtifactSizePreset
> = {
  A4_PORTRAIT: preset(210, 297),
  A4_LANDSCAPE: preset(297, 210),
  A6_PORTRAIT: preset(105, 148),
  A6_LANDSCAPE: preset(148, 105),
  LETTER_PORTRAIT: {
    widthMm: 215.9,
    heightMm: 279.4,
    dpi: ARTIFACT_DPI,
    widthPx: 2550,
    heightPx: 3300,
  },
  LETTER_LANDSCAPE: {
    widthMm: 279.4,
    heightMm: 215.9,
    dpi: ARTIFACT_DPI,
    widthPx: 3300,
    heightPx: 2550,
  },
  A5_LANDSCAPE: preset(210, 148),
  LEGAL_LANDSCAPE: {
    widthMm: 355.6,
    heightMm: 215.9,
    dpi: ARTIFACT_DPI,
    widthPx: 4200,
    heightPx: 2550,
  },
  DIGITAL_16_9: {
    widthMm: 162.56,
    heightMm: 91.44,
    dpi: ARTIFACT_DPI,
    widthPx: 1920,
    heightPx: 1080,
  },
};

export const DEFAULT_BADGE_SIZE_PRESET = 'BADGE_85X55' satisfies BadgeSizePreset;
export const DEFAULT_CERTIFICATE_SIZE_PRESET =
  'A4_LANDSCAPE' satisfies CertificateSizePreset;

export function resolveBadgeSizePreset(value?: string): {
  preset: BadgeSizePreset;
  size: ArtifactSizePreset;
} {
  const presetName = (value?.trim() || DEFAULT_BADGE_SIZE_PRESET) as string;
  if (!(presetName in BADGE_SIZE_PRESETS)) {
    throw new BadRequestException(
      `Unknown badge size preset "${presetName}". Use one of: ${Object.keys(BADGE_SIZE_PRESETS).join(', ')}`,
    );
  }
  const presetKey = presetName as BadgeSizePreset;
  return { preset: presetKey, size: BADGE_SIZE_PRESETS[presetKey] };
}

export function resolveCertificateSizePreset(value?: string): {
  preset: CertificateSizePreset;
  size: ArtifactSizePreset;
} {
  const presetName = (value?.trim() ||
    DEFAULT_CERTIFICATE_SIZE_PRESET) as string;
  if (!(presetName in CERTIFICATE_SIZE_PRESETS)) {
    throw new BadRequestException(
      `Unknown certificate size preset "${presetName}". Use one of: ${Object.keys(CERTIFICATE_SIZE_PRESETS).join(', ')}`,
    );
  }
  const presetKey = presetName as CertificateSizePreset;
  return {
    preset: presetKey,
    size: CERTIFICATE_SIZE_PRESETS[presetKey],
  };
}
