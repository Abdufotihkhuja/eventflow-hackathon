import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AccessMaskRepository } from './access-mask.repository';
import { AccessMaskService } from './access-mask.service';

/**
 * Маска доступа организации (тонкое управление супер-админа). Используется
 * в auth (jwt.strategy — резолв прав) и super-admin (управление маской).
 */
@Module({
  imports: [PrismaModule],
  providers: [AccessMaskRepository, AccessMaskService],
  exports: [AccessMaskService],
})
export class AccessMaskModule {}
