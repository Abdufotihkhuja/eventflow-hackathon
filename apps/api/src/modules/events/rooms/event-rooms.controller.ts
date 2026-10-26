import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard, PermissionsGuard } from '../../../common/guards';
import {
  CurrentUser,
  RequirePermissions,
} from '../../../common/decorators';
import type { ICurrentUser } from '../../../common/interfaces';
import { PERMISSIONS } from '../../../common/constants/permissions.constant';
import { EventRoomsService } from './event-rooms.service';
import { CreateEventRoomDto, UpdateEventRoomDto } from './dto';

@ApiTags('event-rooms')
@Controller('events/:eventId/rooms')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class EventRoomsController {
  constructor(private readonly eventRoomsService: EventRoomsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.EVENTS_READ)
  @ApiOperation({ summary: 'Список залов события' })
  @ApiOkResponse({ description: 'EventRoom[]' })
  list(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.eventRoomsService.findByEvent(eventId, user);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.EVENTS_UPDATE)
  @ApiOperation({ summary: 'Создать зал в событии' })
  @ApiCreatedResponse({ description: 'EventRoom' })
  create(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() dto: CreateEventRoomDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.eventRoomsService.create(eventId, dto, user);
  }

  @Patch(':roomId')
  @RequirePermissions(PERMISSIONS.EVENTS_UPDATE)
  @ApiOperation({ summary: 'Обновить зал' })
  @ApiOkResponse({ description: 'EventRoom' })
  update(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Body() dto: UpdateEventRoomDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.eventRoomsService.update(eventId, roomId, dto, user);
  }

  @Delete(':roomId')
  @RequirePermissions(PERMISSIONS.EVENTS_UPDATE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      'Удалить зал. Блокируется, если зал привязан к пунктам программы (BAD_REQUEST EVENT_ROOM_IN_USE).',
  })
  @ApiNoContentResponse()
  remove(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.eventRoomsService.remove(eventId, roomId, user);
  }
}
