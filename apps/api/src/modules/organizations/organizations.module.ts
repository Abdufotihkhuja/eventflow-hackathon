import { Module } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { MailModule } from '../mail/mail.module';
import { UploadsModule } from '../uploads/uploads.module';
import { IamCoreModule } from '../iam/iam-core.module';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsRepository } from './organizations.repository';
import { OrganizationsService } from './organizations.service';
import { MembersController } from './members/members.controller';
import { MembersRepository } from './members/members.repository';
import { MembersService } from './members/members.service';
import { InvitesController } from './invites/invites.controller';
import { InvitesRepository } from './invites/invites.repository';
import { InvitesService } from './invites/invites.service';
import { RolesController } from './roles/roles.controller';
import { RolesRepository } from './roles/roles.repository';
import { RolesService } from './roles/roles.service';
import { PermissionsController } from './permissions/permissions.controller';
import { DashboardController } from './dashboard/dashboard.controller';
import { DashboardService } from './dashboard/dashboard.service';
import { DashboardRepository } from './dashboard/dashboard.repository';
import { FollowersModule } from './followers/followers.module';
import { ContactsModule } from './contacts/contacts.module';

@Module({
  imports: [
    BillingModule,
    PrismaModule,
    MailModule,
    UploadsModule,
    IamCoreModule,
    FollowersModule,
    ContactsModule,
  ],
  controllers: [
    OrganizationsController,
    MembersController,
    InvitesController,
    RolesController,
    PermissionsController,
    DashboardController,
  ],
  providers: [
    OrganizationsService,
    OrganizationsRepository,
    MembersService,
    MembersRepository,
    InvitesService,
    InvitesRepository,
    RolesService,
    RolesRepository,
    DashboardService,
    DashboardRepository,
  ],
  exports: [
    OrganizationsService,
    MembersService,
    InvitesService,
    RolesService,
    DashboardService,
    FollowersModule,
    ContactsModule,
  ],
})
export class OrganizationsModule {}
