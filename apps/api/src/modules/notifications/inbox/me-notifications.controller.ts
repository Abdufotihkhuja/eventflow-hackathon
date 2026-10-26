import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators';
import { JwtAuthGuard } from '../../../common/guards';
import type { ICurrentUser } from '../../../common/interfaces';
import { AccountNotificationsService } from './account-notifications.service';
import {
  AccountMarkReadDto,
  AccountNotificationListDto,
  AccountNotificationQueryDto,
  AccountUnreadCountDto,
} from './dto/account-notification.dto';

/**
 * Инбокс участника (CONTRACT_DIFF §3) — скоуп личного Account: работает и с
 * org-scoped токеном (accountId в JWT есть в обоих случаях, паттерн
 * MeDevicesController). Организаторская лента `/notifications` не трогается —
 * это параллельный ресурс на AccountNotification.
 *
 * Отдельного permission нет намеренно: уведомление — указатель на то, что
 * пользователь и так может открыть (та же логика, что у орг-ленты).
 */
@ApiTags('me')
@Controller('me/notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MeNotificationsController {
  constructor(private readonly inbox: AccountNotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Инбокс уведомлений участника' })
  @ApiResponse({ status: 200, type: AccountNotificationListDto })
  async list(
    @CurrentUser() user: ICurrentUser,
    @Query() query: AccountNotificationQueryDto,
  ): Promise<AccountNotificationListDto> {
    return this.inbox.list(this.accountId(user), query);
  }

  @Get('unread-count')
  @ApiOperation({
    summary: 'Число непрочитанных',
    description:
      'Источник истины для badge приложения: значок опрашивает его, ' +
      'а не тянет весь инбокс.',
  })
  @ApiResponse({ status: 200, type: AccountUnreadCountDto })
  async unreadCount(
    @CurrentUser() user: ICurrentUser,
  ): Promise<AccountUnreadCountDto> {
    return { count: await this.inbox.unreadCount(this.accountId(user)) };
  }

  @Patch('read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Отметить прочитанным',
    description:
      'Без списка id отмечает весь инбокс. Зеркало организаторского контракта.',
  })
  @ApiResponse({ status: 200, type: AccountUnreadCountDto })
  async markRead(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: AccountMarkReadDto,
  ): Promise<AccountUnreadCountDto> {
    const accountId = this.accountId(user);
    await this.inbox.markRead(accountId, dto.ids);
    return { count: await this.inbox.unreadCount(accountId) };
  }

  private accountId(user: ICurrentUser): string {
    if (!user.accountId) {
      throw new UnauthorizedException('Аккаунт сессии не найден');
    }
    return user.accountId;
  }
}
