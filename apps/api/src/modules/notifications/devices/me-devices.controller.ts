import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Put,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators';
import { JwtAuthGuard } from '../../../common/guards';
import type { ICurrentUser } from '../../../common/interfaces';
import { DeviceTokensService } from './device-tokens.service';
import { RegisterDeviceDto } from './dto/register-device.dto';

/**
 * Device tokens (BL-08, CONTRACT_DIFF §1) — скоуп личного Account: работает и
 * с org-scoped токеном (accountId в JWT есть в обоих случаях, паттерн
 * MeController). GET-списка нет намеренно (нет UI-потребности).
 */
@ApiTags('me')
@Controller('me/devices')
@UseGuards(JwtAuthGuard)
export class MeDevicesController {
  constructor(private readonly deviceTokensService: DeviceTokensService) {}

  @Put(':installationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Регистрация/обновление push-токена устройства (PUT-upsert)',
    description:
      'Идемпотентен по (account, installationId): покрывает ротацию Expo-токена, ' +
      'смену локали и повторный login. Активные строки других аккаунтов с тем же ' +
      'токеном/установкой деактивируются (гигиена общего устройства, D-09).',
  })
  @ApiResponse({ status: 204 })
  async upsertDevice(
    @CurrentUser() user: ICurrentUser,
    @Param('installationId', ParseUUIDPipe) installationId: string,
    @Body() dto: RegisterDeviceDto,
  ): Promise<void> {
    await this.deviceTokensService.upsertDevice(
      this.accountId(user),
      installationId,
      dto,
    );
  }

  @Delete(':installationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Отвязка устройства при logout (идемпотентно)',
  })
  @ApiResponse({ status: 204 })
  async removeDevice(
    @CurrentUser() user: ICurrentUser,
    @Param('installationId', ParseUUIDPipe) installationId: string,
  ): Promise<void> {
    await this.deviceTokensService.removeDevice(
      this.accountId(user),
      installationId,
    );
  }

  private accountId(user: ICurrentUser): string {
    if (!user.accountId) {
      throw new UnauthorizedException('Аккаунт сессии не найден');
    }
    return user.accountId;
  }
}
