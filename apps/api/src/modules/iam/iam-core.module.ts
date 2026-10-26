import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { IamService } from './iam.service';
import { ScopeResolverService } from './scope-resolver.service';

/**
 * Lightweight module exposing only {@link IamService} (account / identity /
 * membership resolution). It depends on nothing but Prisma, so feature modules
 * such as Organizations can consume the IAM helpers without importing the full
 * {@link IamModule} (which wires controllers and pulls in OrganizationsModule,
 * creating a dependency cycle).
 */
@Module({
  imports: [PrismaModule],
  providers: [IamService, ScopeResolverService],
  exports: [IamService, ScopeResolverService],
})
export class IamCoreModule {}
