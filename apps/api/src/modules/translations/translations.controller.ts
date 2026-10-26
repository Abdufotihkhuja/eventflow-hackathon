import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../common/guards';
import { TranslateBatchDto } from './dto/translate-batch.dto';
import { TranslationBatchResponseDto } from './dto/translation-result.dto';
import { TranslationsService } from './translations.service';

const TRANSLATIONS_THROTTLE = {
  default: {
    ttl: 60_000,
    limit: 20,
  },
} as const;

@ApiTags('translations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('translations')
export class TranslationsController {
  constructor(private readonly translationsService: TranslationsService) {}

  @Post('batch')
  @Throttle(TRANSLATIONS_THROTTLE)
  @ApiOperation({ summary: 'Translate plain business-data fields in a batch' })
  @ApiResponse({ status: 201, type: TranslationBatchResponseDto })
  translateBatch(
    @Body() dto: TranslateBatchDto,
  ): Promise<TranslationBatchResponseDto> {
    return this.translationsService.translateBatch(dto);
  }
}
