import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AgendaService } from './agenda.service';
import {
  CreateAgendaItemDto,
  UpdateAgendaItemDto,
  ReorderAgendaDto,
} from './dto';
import { JwtAuthGuard, PermissionsGuard } from '../../../common/guards';
import { CurrentUser, RequirePermissions } from '../../../common/decorators';
import type { ICurrentUser } from '../../../common/interfaces';
import { PERMISSIONS } from '../../../common/constants/permissions.constant';

@ApiTags('agenda')
@Controller('events/:eventId/agenda')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class AgendaController {
  constructor(private readonly agendaService: AgendaService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.EVENTS_UPDATE)
  @ApiOperation({ summary: 'Добавить пункт программы' })
  async create(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() dto: CreateAgendaItemDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.agendaService.create(eventId, dto, user);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.EVENTS_READ)
  @ApiOperation({ summary: 'Получить программу события' })
  async findAll(@Param('eventId', ParseUUIDPipe) eventId: string) {
    return this.agendaService.findByEvent(eventId);
  }

  @Patch('reorder')
  @RequirePermissions(PERMISSIONS.EVENTS_UPDATE)
  @ApiOperation({ summary: 'Изменить порядок программы' })
  async reorder(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() dto: ReorderAgendaDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.agendaService.reorder(eventId, dto.itemIds, user);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.EVENTS_UPDATE)
  @ApiOperation({ summary: 'Обновить пункт программы' })
  async update(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAgendaItemDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.agendaService.update(eventId, id, dto, user);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.EVENTS_UPDATE)
  @ApiOperation({ summary: 'Удалить пункт программы' })
  async delete(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    await this.agendaService.delete(eventId, id, user);
    return { message: 'Пункт программы удалён' };
  }
}
