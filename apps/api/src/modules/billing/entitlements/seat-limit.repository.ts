import { Injectable } from '@nestjs/common';
import { InviteStatus, MemberStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

/** Подсчёт занятых мест сотрудников (E-4, правило CR-10). */
@Injectable()
export class SeatLimitRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Занятые места = живые сотрудники (ACTIVE | INVITED) + непросроченные
   * PENDING-инвайты (иначе инвайт-спам обходит лимит; revoke/expiry
   * освобождает место немедленно).
   */
  async countOccupiedSeats(organizationId: string, now: Date): Promise<number> {
    const [members, pendingInvites] = await Promise.all([
      this.prisma.organizationMember.count({
        where: {
          organizationId,
          deletedAt: null,
          status: { in: [MemberStatus.ACTIVE, MemberStatus.INVITED] },
        },
      }),
      this.prisma.organizationInvite.count({
        where: {
          organizationId,
          status: InviteStatus.PENDING,
          expiresAt: { gt: now },
        },
      }),
    ]);
    return members + pendingInvites;
  }
}
