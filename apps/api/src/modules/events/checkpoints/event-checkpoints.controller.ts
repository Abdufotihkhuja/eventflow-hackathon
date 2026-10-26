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
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard, PermissionsGuard } from '../../../common/guards';
import { CurrentUser, RequirePermissions } from '../../../common/decorators';
import type { ICurrentUser } from '../../../common/interfaces';
import { PERMISSIONS } from '../../../common/constants/permissions.constant';
import { EventCheckpointsService } from './event-checkpoints.service';
import {
  CreateEventCheckpointDto,
  UpdateEventCheckpointDto,
} from './dto';

@ApiTags('event-checkpoints')
@Controller('events/:eventId/checkpoints')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class EventCheckpointsController {
  constructor(private readonly checkpointsService: EventCheckpointsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.ATTENDANCE_READ)
  @ApiOperation({
    summary: 'Список чекпоинтов события',
    description:
      'Каждый чекпоинт — именованное окно [startsAt, endsAt), внутри которого участника отмечают ровно один раз. Окна не пересекаются.',
  })
  @ApiOkResponse({ description: 'EventCheckpoint[] c checkedInCount' })
  list(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.checkpointsService.findByEvent(eventId, user);
  }

  @Get('attendance')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_READ)
  @ApiOperation({
    summary: 'Матрица посещаемости по чекпоинтам',
    description:
      'Участники × чекпоинты. В список попадают подтверждённые регистрации и все, у кого уже есть отметка на чекпоинте.',
  })
  @ApiOkResponse({ description: 'ICheckpointAttendanceMatrix' })
  matrix(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.checkpointsService.getAttendanceMatrix(eventId, user);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.EVENTS_UPDATE)
  @ApiOperation({ summary: 'Создать чекпоинт' })
  @ApiCreatedResponse({ description: 'EventCheckpoint' })
  @ApiConflictResponse({
    description: 'EVENT_CHECKPOINT_OVERLAP — окно пересекается с существующим',
  })
  create(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() dto: CreateEventCheckpointDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.checkpointsService.create(eventId, dto, user);
  }

  @Patch(':checkpointId')
  @RequirePermissions(PERMISSIONS.EVENTS_UPDATE)
  @ApiOperation({ summary: 'Обновить чекпоинт' })
  @ApiOkResponse({ description: 'EventCheckpoint' })
  @ApiConflictResponse({
    description: 'EVENT_CHECKPOINT_OVERLAP — окно пересекается с существующим',
  })
  update(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('checkpointId', ParseUUIDPipe) checkpointId: string,
    @Body() dto: UpdateEventCheckpointDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.checkpointsService.update(eventId, checkpointId, dto, user);
  }

  @Delete(':checkpointId')
  @RequirePermissions(PERMISSIONS.EVENTS_UPDATE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      'Удалить чекпоинт вместе с его отметками (каскад). Количество отметок доступно в списке как checkedInCount.',
  })
  @ApiNoContentResponse()
  remove(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('checkpointId', ParseUUIDPipe) checkpointId: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.checkpointsService.remove(eventId, checkpointId, user);
  }
}
