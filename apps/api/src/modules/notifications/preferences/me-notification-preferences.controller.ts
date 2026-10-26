import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators';
import { JwtAuthGuard } from '../../../common/guards';
import type { ICurrentUser } from '../../../common/interfaces';
import {
  NotificationPreferencesDto,
  UpdateNotificationPreferencesDto,
} from './dto/notification-preferences.dto';
import { NotificationPreferencesService } from './notification-preferences.service';

/**
 * Матрица преференсов уведомлений (BL-23, CONTRACT_DIFF §2) — скоуп личного
 * Account: работает и с org-scoped токеном (accountId в JWT есть в обоих
 * случаях, паттерн MeDevicesController).
 */
@ApiTags('me')
@Controller('me/notification-preferences')
@UseGuards(JwtAuthGuard)
export class MeNotificationPreferencesController {
  constructor(
    private readonly preferencesService: NotificationPreferencesService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Полная матрица преференсов уведомлений',
    description:
      'Все ключи каталога с эффективными значениями (строка БД или дефолт on). ' +
      'Transactional-строка отдаётся с locked=true — её нельзя отключить.',
  })
  @ApiResponse({ status: 200, type: NotificationPreferencesDto })
  async getMatrix(
    @CurrentUser() user: ICurrentUser,
  ): Promise<NotificationPreferencesDto> {
    return this.preferencesService.getMatrix(this.accountId(user));
  }

  @Patch()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Частичное обновление матрицы',
    description:
      'Список {key, channel, enabled}. Неизвестный ключ и transactional → 400. ' +
      'Ответ — обновлённая полная матрица.',
  })
  @ApiResponse({ status: 200, type: NotificationPreferencesDto })
  async update(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: UpdateNotificationPreferencesDto,
  ): Promise<NotificationPreferencesDto> {
    return this.preferencesService.applyChanges(
      this.accountId(user),
      dto.changes,
    );
  }

  private accountId(user: ICurrentUser): string {
    if (!user.accountId) {
      throw new UnauthorizedException('Аккаунт сессии не найден');
    }
    return user.accountId;
  }
}
