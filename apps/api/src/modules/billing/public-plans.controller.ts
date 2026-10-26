import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CatalogService } from './catalog/catalog.service';
import { BillingCatalogDto } from './dto/catalog.dto';

/**
 * Публичный каталог тарифов (M-1, путь по D-11: /api/v1/public/plans).
 * Без аутентификации; только активные строки.
 */
@ApiTags('public')
@Controller('public/plans')
export class PublicPlansController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get()
  @ApiOperation({
    summary: 'Публичный каталог тарифов и add-on SKU',
    description:
      'Активные тарифы и пакеты для публичной страницы прайсинга. Деньги — строки ' +
      'минорных единиц (тийины); отображаемые названия — на фронтенде по key/code (i18n).',
  })
  @ApiOkResponse({ type: BillingCatalogDto })
  getPublicPlans(): Promise<BillingCatalogDto> {
    return this.catalogService.getPublicCatalog();
  }
}
