import { ApiProperty } from '@nestjs/swagger';
import type {
  AppLocale,
  TranslationBatchResponse,
  TranslationResultStatus,
} from '../translation.types';

export class TranslationResultDto {
  @ApiProperty({ example: 'title' })
  fieldKey: string;

  @ApiProperty({ enum: ['ru', 'uz', 'en'], example: 'uz' })
  targetLocale: AppLocale;

  @ApiProperty({
    enum: ['auto_translated', 'translation_error', 'skipped'],
    example: 'auto_translated',
  })
  status: TranslationResultStatus;

  @ApiProperty({ example: 'Konferensiya', nullable: true })
  translatedText: string | null;

  @ApiProperty({ enum: ['tahrirchi'], nullable: true, example: 'tahrirchi' })
  provider: 'tahrirchi' | null;

  @ApiProperty({ example: 'sayqalchi', nullable: true })
  model: string | null;

  @ApiProperty({ enum: ['ru', 'uz', 'en'], example: 'ru' })
  sourceLocale: AppLocale;

  @ApiProperty({ example: 'sha256:6f1ed002ab5595859014ebf0951522d9' })
  sourceHash: string;

  @ApiProperty({
    example: '2026-04-27T12:00:00.000Z',
    nullable: true,
  })
  translatedAt: string | null;

  @ApiProperty({ example: null, nullable: true })
  error: string | null;
}

export class TranslationSummaryDto {
  @ApiProperty({ example: 1 })
  translated: number;

  @ApiProperty({ example: 0 })
  skipped: number;

  @ApiProperty({ example: 0 })
  failed: number;
}

export class TranslationBatchResponseDto implements TranslationBatchResponse {
  @ApiProperty({ type: [TranslationResultDto] })
  results: TranslationResultDto[];

  @ApiProperty({ type: TranslationSummaryDto })
  summary: TranslationSummaryDto;
}
