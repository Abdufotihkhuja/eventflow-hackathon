import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { ICurrentUser } from '../../common/interfaces';
import { AdminAuditService } from '../platform/admin-audit/admin-audit.service';
import {
  AccessMaskService,
  ALL_PERMISSION_CODES,
} from '../access-mask/access-mask.service';

/**
 * Управление маской доступа организации супер-админом (тонкое управление
 * правами поверх ролей). Чтение каталога + текущего deny-list; замена набора
 * с обязательной причиной и аудитом ACCESS_MASK_SET.
 */
@Injectable()
export class SuperAdminAccessMaskService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessMask: AccessMaskService,
    private readonly adminAudit: AdminAuditService,
  ) {}

  /** Полный каталог кодов + текущий deny-list организации. */
  async getMask(organizationId: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true },
    });
    if (!organization) {
      throw new NotFoundException('Организация не найдена');
    }
    const deniedCodes =
      await this.accessMask.listDeniedCodes(organizationId);
    return {
      allCodes: ALL_PERMISSION_CODES,
      deniedCodes,
    };
  }

  /** Заменяет deny-list организации; пишет аудит ACCESS_MASK_SET. */
  async setMask(
    organizationId: string,
    deniedCodes: string[],
    reason: string | undefined,
    admin: ICurrentUser,
  ) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true },
    });
    if (!organization) {
      throw new NotFoundException('Организация не найдена');
    }

    const { before, after } = await this.accessMask.setDeniedCodes(
      organizationId,
      deniedCodes,
      reason?.trim() || null,
      admin.sub,
    );

    await this.adminAudit.record({
      action: 'ACCESS_MASK_SET',
      actorId: admin.sub,
      actorEmail: admin.email,
      targetType: 'ORGANIZATION',
      targetId: organizationId,
      targetLabel: organization.name,
      reason: reason?.trim() || null,
      before: { deniedCount: before.length },
      after: { deniedCount: after.length },
      extra: {
        beforeCodes: before.sort(),
        afterCodes: [...after].sort(),
      },
    });

    return { deniedCodes: after };
  }
}
