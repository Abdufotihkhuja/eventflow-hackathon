import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ServeStaticModule } from '@nestjs/serve-static';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { SuperAdminModule } from './modules/super-admin/super-admin.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { EventsModule } from './modules/events/events.module';
import { RegistrationsModule } from './modules/registrations/registrations.module';
import { RegistrationFilesModule } from './modules/registration-files/registration-files.module';
import { AppBuildsModule } from './modules/app-builds/app-builds.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { EventAnalyticsModule } from './modules/event-analytics/event-analytics.module';
import { CertificatesModule } from './modules/certificates/certificates.module';
import { BadgesModule } from './modules/badges/badges.module';
import { MailModule } from './modules/mail/mail.module';
import { BoardsModule } from './modules/boards/boards.module';
import { PublicModule } from './modules/public/public.module';
import { VerificationModule } from './modules/verification/verification.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { BlogModule } from './modules/blog/blog.module';
import { BlogCategoriesModule } from './modules/blog-categories/blog-categories.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { CollectionsModule } from './modules/collections/collections.module';
import { PlacesModule } from './modules/places/places.module';
import { JwtAuthGuard } from './common/guards';
import { ScopeContextGuard } from './common/guards/scope-context.guard';
import { CookieCsrfGuard } from './common/guards/cookie-csrf.guard';
import { PlatformElevationGuard } from './common/guards/platform-elevation.guard';
import { AllExceptionsFilter } from './common/filters';
import {
  validateEnvironment,
  jwtConfig,
  googleConfig,
  linkedinConfig,
  mailConfig,
  pushConfig,
  frontendConfig,
} from './config';
import { getUploadsRootDir } from './modules/storage/storage-paths';
import { QueueModule } from './modules/platform/queue/queue.module';
import { AdminAuditModule } from './modules/platform/admin-audit/admin-audit.module';
import { InternalJobsModule } from './modules/platform/internal-jobs/internal-jobs.module';
import { IamModule } from './modules/iam/iam.module';
import { ObservabilityModule } from './modules/platform/observability/observability.module';
import { TranslationsModule } from './modules/translations/translations.module';
import { BillingModule } from './modules/billing/billing.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
  controllers: [AppController],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnvironment,
      load: [
        jwtConfig,
        googleConfig,
        linkedinConfig,
        mailConfig,
        pushConfig,
        frontendConfig,
      ],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 минута
        // Глобальный потолок на пользователя (по реальному IP — см. trust proxy
        // в main.ts). Накрывает все маршруты без своего @Throttle. SPA делает
        // много запросов на экран, поэтому держим щедрый запас и используем этот
        // лимит лишь как защиту от явного abuse; чувствительные ручки
        // (логин/регистрация) ограничены строже своими @Throttle в auth.controller.
        limit: 1000, // 1000 запросов/мин на пользователя
      },
    ]),
    ServeStaticModule.forRoot({
      rootPath: getUploadsRootDir(),
      serveRoot: '/uploads',
      exclude: ['/api/(.*)'],
      serveStaticOptions: {
        index: false,
        fallthrough: false,
      },
    }),
    ObservabilityModule,
    QueueModule,
    AdminAuditModule,
    InternalJobsModule,
    IamModule,
    PrismaModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    SuperAdminModule,
    UploadsModule,
    EventsModule,
    RegistrationsModule,
    RegistrationFilesModule,
    AppBuildsModule,
    AttendanceModule,
    EventAnalyticsModule,
    CertificatesModule,
    BadgesModule,
    MailModule,
    BoardsModule,
    PublicModule,
    VerificationModule,
    TicketsModule,
    BlogModule,
    BlogCategoriesModule,
    CategoriesModule,
    CollectionsModule,
    PlacesModule,
    TranslationsModule,
    BillingModule,
    NotificationsModule,
  ],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ScopeContextGuard,
    },
    {
      provide: APP_GUARD,
      useClass: CookieCsrfGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PlatformElevationGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
