import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserType } from '@prisma/client';
import { CurrentUser, Roles } from '../../common/decorators';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import type { ICurrentUser } from '../../common/interfaces';
import {
  MarkReadDto,
  NotificationListDto,
  NotificationQueryDto,
  UnreadCountDto,
} from './dto/notification.dto';
import { NotificationsService } from './notifications.service';

/**
 * Центр уведомлений организации (2.6).
 *
 * Лента ОБЩАЯ для организации, а не личная: сотрудники ведут одни и те же
 * события, и «заявку уже посмотрели» — это факт про организацию, а не про
 * человека. Персональная адресация в схеме есть (`memberId`), но пока не
 * используется ни одним поводом — появится вместе с задачами.
 *
 * Намеренно НЕ требует отдельного permission: уведомление — это указатель на
 * то, что пользователь и так может открыть, а каждый такой экран уже закрыт
 * своей проверкой прав.
 */
@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserType.ORGANIZATION, UserType.MEMBER)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  private orgIdOf(user: ICurrentUser): string {
    return user.type === UserType.ORGANIZATION ? user.sub : user.organizationId!;
  }

  @Get()
  @ApiOperation({ summary: 'Лента уведомлений организации' })
  @ApiResponse({ status: 200, type: NotificationListDto })
  async list(
    @CurrentUser() user: ICurrentUser,
    @Query() query: NotificationQueryDto,
  ): Promise<NotificationListDto> {
    return this.notifications.list(this.orgIdOf(user), query);
  }

  @Get('unread-count')
  @ApiOperation({
    summary: 'Число непрочитанных',
    description:
      'Отдельный дешёвый эндпоинт: значок в шапке опрашивает его, а не тянет всю ленту.',
  })
  @ApiResponse({ status: 200, type: UnreadCountDto })
  async unreadCount(@CurrentUser() user: ICurrentUser): Promise<UnreadCountDto> {
    return { count: await this.notifications.unreadCount(this.orgIdOf(user)) };
  }

  @Patch('read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Отметить прочитанным',
    description: 'Без списка id отмечает всю ленту организации.',
  })
  @ApiResponse({ status: 200, type: UnreadCountDto })
  async markRead(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: MarkReadDto,
  ): Promise<UnreadCountDto> {
    const organizationId = this.orgIdOf(user);
    await this.notifications.markRead(organizationId, dto.ids);
    return { count: await this.notifications.unreadCount(organizationId) };
  }
}
