import { Global, Module } from '@nestjs/common';
import { AdminAuditService } from './admin-audit.service';

/**
 * Глобальный модуль аудита операторских действий (S-12) — по прецеденту
 * QueueModule: биллинг, супер-админ и энтайтлменты пишут аудит без
 * import-церемоний.
 */
@Global()
@Module({
  providers: [AdminAuditService],
  exports: [AdminAuditService],
})
export class AdminAuditModule {}
