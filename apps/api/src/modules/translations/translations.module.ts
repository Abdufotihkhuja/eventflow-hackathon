import { Module } from '@nestjs/common';
import { TranslationsController } from './translations.controller';
import { TranslationsService } from './translations.service';
import { TahrirchiTranslationProvider } from './providers/tahrirchi-translation.provider';
import { TRANSLATION_PROVIDER } from './providers/translation-provider.interface';

@Module({
  controllers: [TranslationsController],
  providers: [
    TranslationsService,
    TahrirchiTranslationProvider,
    {
      provide: TRANSLATION_PROVIDER,
      useExisting: TahrirchiTranslationProvider,
    },
  ],
})
export class TranslationsModule {}
