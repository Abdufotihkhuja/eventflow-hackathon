import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { TagsService } from './tags.service';
import { CreateTagDto, AssignTagsDto, TagsQueryDto } from './dto';
import { JwtAuthGuard, PermissionsGuard } from '../../../common/guards';
import {
  CurrentUser,
  Public,
  RequirePermissions,
} from '../../../common/decorators';
import type { ICurrentUser } from '../../../common/interfaces';
import { PERMISSIONS } from '../../../common/constants/permissions.constant';

@ApiTags('event-tags')
@Controller('events')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  // ==================== Публичные endpoints ====================

  @Get('tags')
  @Public()
  @ApiOperation({ summary: 'Получить все доступные теги' })
  @ApiResponse({
    status: 200,
    description: 'Список тегов (системные + теги организации если авторизован)',
  })
  async getAllTags(
    @Query() query: TagsQueryDto,
    @CurrentUser() user?: ICurrentUser,
  ) {
    return this.tagsService.getAvailableTags(query, user);
  }

  @Get(':id/tags')
  @Public()
  @ApiOperation({ summary: 'Получить теги мероприятия' })
  @ApiResponse({ status: 200, description: 'Список тегов мероприятия' })
  async getEventTags(@Param('id', ParseUUIDPipe) id: string) {
    return this.tagsService.getEventTags(id);
  }

  // ==================== Endpoints для организаторов ====================

  @Put(':id/tags')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.EVENTS_UPDATE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Назначить теги мероприятию' })
  @ApiResponse({
    status: 200,
    description: 'Теги назначены (максимум 3)',
  })
  async assignTags(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignTagsDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.tagsService.assignTagsToEvent(id, dto, user);
  }
}

@ApiTags('organization-tags')
@Controller('organizations/tags')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrganizationTagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @RequirePermissions(PERMISSIONS.EVENTS_CREATE)
  @ApiOperation({ summary: 'Создать кастомный тег организации' })
  @ApiResponse({ status: 201, description: 'Тег создан' })
  async create(@Body() dto: CreateTagDto, @CurrentUser() user: ICurrentUser) {
    return this.tagsService.createCustomTag(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Получить теги организации' })
  @ApiResponse({ status: 200, description: 'Список кастомных тегов' })
  async getAll(@CurrentUser() user: ICurrentUser) {
    return this.tagsService.getOrganizationTags(user);
  }

  @Delete(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(PERMISSIONS.EVENTS_DELETE)
  @ApiOperation({ summary: 'Удалить кастомный тег' })
  @ApiResponse({ status: 200, description: 'Тег удалён' })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    await this.tagsService.deleteCustomTag(id, user);
    return { message: 'Тег удалён' };
  }
}
