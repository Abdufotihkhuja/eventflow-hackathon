import {
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  SavedEventsQueryDto,
  PaginatedSavedEventsDto,
} from '../events/saved/dto';
import { SavedEventsService } from '../events/saved/saved-events.service';
import { CurrentUser, Roles } from '../../common/decorators';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import type { ICurrentUser } from '../../common/interfaces';
import { UserType } from '@prisma/client';

@ApiTags('account-saved-events')
@Controller('account/me/saved-events')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserType.USER)
@ApiBearerAuth()
export class AccountSavedEventsController {
  constructor(private readonly savedEventsService: SavedEventsService) {}

  @Post(':eventId')
  @ApiOperation({ summary: 'Сохранить мероприятие в избранное' })
  @ApiResponse({ status: 201, description: 'Мероприятие сохранено' })
  save(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.savedEventsService.save(eventId, user);
  }

  @Delete(':eventId')
  @ApiOperation({ summary: 'Удалить мероприятие из избранного' })
  @ApiResponse({
    status: 200,
    description: 'Мероприятие удалено из избранного',
  })
  async unsave(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    await this.savedEventsService.unsave(eventId, user);
    return { message: 'Мероприятие удалено из избранного' };
  }

  @Get()
  @ApiOperation({ summary: 'Получить сохранённые мероприятия' })
  @ApiResponse({
    status: 200,
    description: 'Список сохранённых мероприятий',
    type: PaginatedSavedEventsDto,
  })
  findAll(
    @Query() query: SavedEventsQueryDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.savedEventsService.findByUserId(user, query);
  }

  @Get(':eventId/check')
  @ApiOperation({ summary: 'Проверить, сохранено ли мероприятие' })
  @ApiResponse({
    status: 200,
    description: 'Статус сохранения',
  })
  async checkSaved(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    const isSaved = await this.savedEventsService.isSaved(eventId, user);
    return { isSaved };
  }
}
