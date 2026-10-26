import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Хранилище маски доступа организации (deny-list прав). Файл *.repository.ts
 * — единственное место прямого доступа к organizationAccessOverride
 * (tenant-guard 0.4). Управление — только супер-админ, поэтому scope здесь
 * явный по organizationId без requireTenantWhere (super-admin exempt).
 */
@Injectable()
export class AccessMaskRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Коды прав, закрытых для организации (пустой массив = маски нет). */
  async findDeniedCodes(organizationId: string): Promise<string[]> {
    const rows = await this.prisma.organizationAccessOverride.findMany({
      where: { organizationId },
      select: { permissionCode: true },
    });
    return rows.map((r) => r.permissionCode);
  }

  /**
   * Заменяет весь набор закрытых кодов организации на `deniedCodes` в одной
   * транзакции (удаляем снятые, добавляем новые; существующие не трогаем).
   * Возвращает before/after для аудита.
   */
  async replaceDeniedCodes(
    organizationId: string,
    deniedCodes: string[],
    reason: string | null,
    createdByAdminId: string | null,
  ): Promise<{ before: string[]; after: string[] }> {
    const target = new Set(deniedCodes);
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.organizationAccessOverride.findMany({
        where: { organizationId },
        select: { permissionCode: true },
      });
      const before = existing.map((r) => r.permissionCode);
      const beforeSet = new Set(before);

      const toRemove = before.filter((c) => !target.has(c));
      const toAdd = deniedCodes.filter((c) => !beforeSet.has(c));

      if (toRemove.length > 0) {
        await tx.organizationAccessOverride.deleteMany({
          where: { organizationId, permissionCode: { in: toRemove } },
        });
      }
      for (const code of toAdd) {
        await tx.organizationAccessOverride.create({
          data: {
            organizationId,
            permissionCode: code,
            reason,
            createdByAdminId,
          },
        });
      }
      return { before, after: [...target] };
    });
  }
}
