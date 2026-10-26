import { BoardWriteGateGuard } from '../board-write-gate.guard';
import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  ParseUUIDPipe,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { AttachmentsService } from './attachments.service';
import { JwtAuthGuard } from '../../../common/guards';
import { CurrentUser } from '../../../common/decorators';
import type { ICurrentUser } from '../../../common/interfaces';
import { resolveUserContext } from '../boards.utils';

@ApiTags('task-attachments')
@Controller('tasks/:taskId/attachments')
@UseGuards(JwtAuthGuard, BoardWriteGateGuard)
@ApiBearerAuth()
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Post()
  @ApiOperation({ summary: 'Загрузить вложение' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Файл загружен' })
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: ICurrentUser,
  ) {
    const ctx = resolveUserContext(user);
    return this.attachmentsService.upload(
      taskId,
      file,
      ctx.memberId,
      ctx.orgId,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Получить вложения задачи' })
  @ApiResponse({ status: 200, description: 'Список вложений' })
  async findAll(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    const ctx = resolveUserContext(user);
    return this.attachmentsService.findByTaskId(
      taskId,
      ctx.memberId,
      ctx.orgId,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить вложение' })
  @ApiResponse({ status: 200, description: 'Вложение удалено' })
  async delete(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    const ctx = resolveUserContext(user);
    await this.attachmentsService.delete(taskId, id, ctx.memberId, ctx.orgId);
    return { message: 'Вложение удалено' };
  }
}
