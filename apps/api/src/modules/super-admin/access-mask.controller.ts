import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../common/decorators';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import type { ICurrentUser } from '../../common/interfaces';
import { UserType } from '@prisma/client';
import { SuperAdminAccessMaskService } from './access-mask.service';
import { SetAccessMaskDto } from './dto/set-access-mask.dto';

/**
 * Тонкое управление доступом организации (супер-админ): маска поверх ролей,
 * закрывающая отдельные права/модули для всей организации, включая владельца.
 */
@ApiTags('super-admin')
@Controller('super-admin/organizations/:orgId/access-mask')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserType.SUPER_ADMIN)
export class SuperAdminAccessMaskController {
  constructor(private readonly service: SuperAdminAccessMaskService) {}

  @Get()
  @ApiOperation({
    summary: 'Каталог прав + текущая маска доступа организации',
    description:
      'allCodes — полный каталог кодов прав; deniedCodes — закрытые для ' +
      'организации (deny-list). Пустой deniedCodes = маски нет.',
  })
  getMask(@Param('orgId', ParseUUIDPipe) orgId: string) {
    return this.service.getMask(orgId);
  }

  @Put()
  @ApiOperation({
    summary: 'Заменить маску доступа организации',
    description:
      'Заменяет весь набор закрытых прав на deniedCodes (пустой = снять ' +
      'маску). Невалидные коды отбрасываются. Причина необязательна; ' +
      'аудит ACCESS_MASK_SET. Применяется мгновенно (маска читается на запросе).',
  })
  setMask(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Body() dto: SetAccessMaskDto,
    @CurrentUser() admin: ICurrentUser,
  ) {
    return this.service.setMask(orgId, dto.deniedCodes, dto.reason, admin);
  }
}
