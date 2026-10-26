import { Module } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module';
import { BoardWriteGateGuard } from './board-write-gate.guard';
import { PrismaModule } from '../../prisma/prisma.module';
import { BoardsController } from './boards.controller';
import { BoardsService } from './boards.service';
import { BoardsRepository } from './boards.repository';
import { ColumnsController } from './columns/columns.controller';
import { ColumnsService } from './columns/columns.service';
import { TasksController } from './tasks/tasks.controller';
import { TasksService } from './tasks/tasks.service';
import { TagsController } from './tags/tags.controller';
import { TagsService } from './tags/tags.service';
import { CommentsController } from './comments/comments.controller';
import { CommentsService } from './comments/comments.service';
import { ChecklistsController } from './checklists/checklists.controller';
import { ChecklistsService } from './checklists/checklists.service';
import { AttachmentsController } from './attachments/attachments.controller';
import { AttachmentsService } from './attachments/attachments.service';
import { BoardMembersController } from './members/members.controller';
import { BoardMembersService } from './members/members.service';
import { ActivitiesController } from './activities/activities.controller';
import { ActivitiesService } from './activities/activities.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [PrismaModule, StorageModule, BillingModule],
  controllers: [
    BoardsController,
    ColumnsController,
    TasksController,
    TagsController,
    CommentsController,
    ChecklistsController,
    AttachmentsController,
    BoardMembersController,
    ActivitiesController,
  ],
  providers: [
    BoardWriteGateGuard,
    BoardsService,
    BoardsRepository,
    ColumnsService,
    TasksService,
    TagsService,
    CommentsService,
    ChecklistsService,
    AttachmentsService,
    BoardMembersService,
    ActivitiesService,
  ],
  exports: [BoardsService, BoardsRepository],
})
export class BoardsModule {}
