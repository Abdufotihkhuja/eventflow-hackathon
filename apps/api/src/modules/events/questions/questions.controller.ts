import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { QuestionsService } from './questions.service';
import {
  CreateQuestionDto,
  UpdateQuestionDto,
  ReorderQuestionsDto,
} from './dto';
import { QuestionEntity, QuestionAdminEntity } from './entities';
import { JwtAuthGuard, PermissionsGuard } from '../../../common/guards';
import {
  CurrentUser,
  RequirePermissions,
  Public,
} from '../../../common/decorators';
import type { ICurrentUser } from '../../../common/interfaces';
import { PERMISSIONS } from '../../../common/constants/permissions.constant';
import {
  HARD_MAX_FILE_SIZE_MB,
  MB,
} from '../../registration-files/registration-files.constants';

@ApiTags('registration-questions')
@Controller('events/:eventId/questions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.EVENTS_UPDATE)
  @ApiOperation({ summary: 'Добавить вопрос регистрации' })
  async create(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() dto: CreateQuestionDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.questionsService.create(eventId, dto, user);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.EVENTS_READ)
  @ApiOperation({
    summary:
      'Получить вопросы события (для организаторов - с правильными ответами)',
  })
  @ApiResponse({ status: 200, type: [QuestionAdminEntity] })
  async findAll(@Param('eventId', ParseUUIDPipe) eventId: string) {
    return this.questionsService.findByEvent(eventId);
  }

  @Get('public')
  @Public()
  @ApiOperation({
    summary: 'Получить вопросы события БЕЗ правильных ответов (для участников)',
    description:
      'Этот endpoint используется участниками для просмотра вопросов при регистрации. Правильные ответы и баллы скрыты для безопасности. Принимает ?locale=ru|uz|en для локализации question/options/informationalText.',
  })
  @ApiResponse({ status: 200, type: [QuestionEntity] })
  async findAllPublic(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Query('locale') locale?: string,
  ) {
    return this.questionsService.findByEventPublic(eventId, locale);
  }

  @Post('template')
  @RequirePermissions(PERMISSIONS.EVENTS_UPDATE)
  @ApiOperation({ summary: 'Загрузить файл-шаблон для вопроса FILE_UPLOAD' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: HARD_MAX_FILE_SIZE_MB * MB, files: 1 },
    }),
  )
  async uploadTemplate(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.questionsService.uploadTemplate(eventId, file, user);
  }

  @Delete('template')
  @RequirePermissions(PERMISSIONS.EVENTS_UPDATE)
  @ApiOperation({ summary: 'Удалить файл-шаблон вопроса FILE_UPLOAD' })
  async deleteTemplate(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body('url') url: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    await this.questionsService.deleteTemplate(eventId, url, user);
    return { message: 'Файл шаблона удалён' };
  }

  @Patch('reorder')
  @RequirePermissions(PERMISSIONS.EVENTS_UPDATE)
  @ApiOperation({ summary: 'Изменить порядок вопросов' })
  async reorder(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() dto: ReorderQuestionsDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.questionsService.reorder(eventId, dto.questionIds, user);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.EVENTS_UPDATE)
  @ApiOperation({ summary: 'Обновить вопрос' })
  async update(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateQuestionDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.questionsService.update(eventId, id, dto, user);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.EVENTS_UPDATE)
  @ApiOperation({ summary: 'Удалить вопрос' })
  async delete(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    await this.questionsService.delete(eventId, id, user);
    return { message: 'Вопрос удалён' };
  }
}
