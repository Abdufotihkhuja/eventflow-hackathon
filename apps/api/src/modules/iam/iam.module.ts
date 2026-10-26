import { Module } from '@nestjs/common';
import { BlogModule } from '../blog/blog.module';
import { EventsModule } from '../events/events.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { UsersModule } from '../users/users.module';
import { AccountSavedBlogPostsController } from './account-saved-blog-posts.controller';
import { AccountController } from './account.controller';
import { AccountSavedEventsController } from './account-saved-events.controller';
import { IamController } from './iam.controller';
import { IamV2Controller } from './iam-v2.controller';
import { IamCoreModule } from './iam-core.module';
import { WorkspaceMembersController } from './workspace-members.controller';
import { WorkspaceController } from './workspace.controller';

@Module({
  imports: [
    IamCoreModule,
    UsersModule,
    OrganizationsModule,
    EventsModule,
    BlogModule,
  ],
  controllers: [
    IamController,
    IamV2Controller,
    AccountController,
    AccountSavedBlogPostsController,
    AccountSavedEventsController,
    WorkspaceController,
    WorkspaceMembersController,
  ],
  // Re-export so existing consumers (e.g. AuthModule) keep resolving IamService
  // through IamModule without a direct dependency on IamCoreModule.
  exports: [IamCoreModule],
})
export class IamModule {}
