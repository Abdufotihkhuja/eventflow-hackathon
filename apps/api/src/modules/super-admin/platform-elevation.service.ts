import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { PlatformElevationMode, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminAuditService } from '../platform/admin-audit/admin-audit.service';
import type { ICurrentUser } from '../../common/interfaces';
import {
  PlatformElevationResponseDto,
  RequestPlatformElevationDto,
} from './dto';

@Injectable()
export class PlatformElevationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
  ) {}

  async request(
    actor: ICurrentUser,
    dto: RequestPlatformElevationDto,
  ): Promise<PlatformElevationResponseDto> {
    if (!actor.accountId) throw elevationDenied('ACCOUNT_CONTEXT_REQUIRED');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    // Токен выдаётся сразу для обоих режимов: консоль платформы должна уметь
    // писать без второго оператора (см. PlatformElevationGuard). Дополнительное
    // одобрение остаётся доступным через approveWrite.
    const rawToken = randomBytes(32).toString('base64url');
    const elevation = await this.prisma.$transaction(async (tx) => {
      const created = await tx.platformElevation.create({
        data: {
          accountId: actor.accountId!,
          requestedByAdminId: actor.sub,
          organizationId: dto.organizationId,
          mode: dto.mode,
          tokenHash: hashElevationToken(rawToken),
          reason: dto.reason,
          expiresAt,
        },
      });
      await this.audit.record(
        {
          action: 'PLATFORM_ELEVATION_REQUESTED',
          actorId: actor.sub,
          actorEmail: actor.email,
          targetType: 'PLATFORM',
          targetId: created.id,
          reason: dto.reason,
          extra: {
            mode: dto.mode,
            organizationId: dto.organizationId ?? null,
          },
        },
        tx,
      );
      return created;
    });
    return {
      id: elevation.id,
      mode: elevation.mode,
      token: rawToken,
      expiresAt,
      approvalRequired: false,
    };
  }

  async approveWrite(
    actor: ICurrentUser,
    elevationId: string,
  ): Promise<PlatformElevationResponseDto> {
    const pending = await this.prisma.platformElevation.findUnique({
      where: { id: elevationId },
    });
    if (!pending) throw new NotFoundException('Elevation не найден');
    if (pending.mode !== PlatformElevationMode.WRITE) {
      throw new ConflictException('READ elevation не требует approval');
    }
    if (pending.requestedByAdminId === actor.sub) {
      throw elevationDenied('SECOND_APPROVER_REQUIRED');
    }
    if (
      pending.approvedAt ||
      pending.revokedAt ||
      pending.expiresAt <= new Date()
    ) {
      throw new ConflictException('Elevation уже обработан или истёк');
    }

    const rawToken = randomBytes(32).toString('base64url');
    const approved = await this.prisma.$transaction(
      async (tx) => {
        const changed = await tx.platformElevation.updateMany({
          where: {
            id: elevationId,
            approvedAt: null,
            revokedAt: null,
            expiresAt: { gt: new Date() },
          },
          data: {
            approvedByAdminId: actor.sub,
            approvedAt: new Date(),
            tokenHash: hashElevationToken(rawToken),
          },
        });
        if (changed.count !== 1) {
          throw new ConflictException('Elevation уже обработан или истёк');
        }
        await this.audit.record(
          {
            action: 'PLATFORM_ELEVATION_APPROVED',
            actorId: actor.sub,
            actorEmail: actor.email,
            targetType: 'PLATFORM',
            targetId: elevationId,
            extra: {
              requesterId: pending.requestedByAdminId,
              organizationId: pending.organizationId ?? null,
            },
          },
          tx,
        );
        return tx.platformElevation.findUniqueOrThrow({
          where: { id: elevationId },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return {
      id: approved.id,
      mode: approved.mode,
      token: rawToken,
      expiresAt: approved.expiresAt,
      approvalRequired: false,
    };
  }
}

export function hashElevationToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function elevationDenied(code: string): ForbiddenException {
  return new ForbiddenException({
    code,
    message: 'Platform elevation недоступен',
  });
}
