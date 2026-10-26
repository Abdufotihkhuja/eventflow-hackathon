import { Injectable } from '@nestjs/common';
import { InviteStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

const inviteInclude = {
  organization: true,
  role: true,
} satisfies Prisma.OrganizationInviteInclude;

export type InviteWithRelations = Prisma.OrganizationInviteGetPayload<{
  include: typeof inviteInclude;
}>;

@Injectable()
export class InvitesRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(
    data: Prisma.OrganizationInviteCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<InviteWithRelations> {
    return (tx ?? this.prisma).organizationInvite.create({
      data,
      include: inviteInclude,
    });
  }

  findByTokenHash(tokenHash: string): Promise<InviteWithRelations | null> {
    return this.prisma.organizationInvite.findUnique({
      where: { tokenHash },
      include: inviteInclude,
    });
  }

  findById(id: string): Promise<InviteWithRelations | null> {
    return this.prisma.organizationInvite.findUnique({
      where: { id },
      include: inviteInclude,
    });
  }

  /** Live (non-expired) pending invite for an org + normalized email, if any. */
  findPending(
    organizationId: string,
    email: string,
  ): Promise<InviteWithRelations | null> {
    return this.prisma.organizationInvite.findFirst({
      where: { organizationId, email, status: InviteStatus.PENDING },
      include: inviteInclude,
    });
  }

  /**
   * Живые приглашения, адресованные конкретному email — для кабинета
   * приглашённого: он видит их, не открывая письмо.
   */
  listPendingForEmail(email: string): Promise<InviteWithRelations[]> {
    return this.prisma.organizationInvite.findMany({
      where: {
        email,
        status: InviteStatus.PENDING,
        expiresAt: { gt: new Date() },
      },
      include: inviteInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  listForOrganization(
    organizationId: string,
    status?: InviteStatus,
  ): Promise<InviteWithRelations[]> {
    return this.prisma.organizationInvite.findMany({
      where: { organizationId, ...(status ? { status } : {}) },
      include: inviteInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  update(
    id: string,
    data: Prisma.OrganizationInviteUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<InviteWithRelations> {
    return (tx ?? this.prisma).organizationInvite.update({
      where: { id },
      data,
      include: inviteInclude,
    });
  }

  claimPending(
    tx: Prisma.TransactionClient,
    inviteId: string,
    acceptedAt: Date,
  ): Promise<Prisma.BatchPayload> {
    return tx.organizationInvite.updateMany({
      where: {
        id: inviteId,
        status: InviteStatus.PENDING,
        expiresAt: { gt: acceptedAt },
      },
      data: { status: InviteStatus.ACCEPTED },
    });
  }

  completeAcceptance(
    tx: Prisma.TransactionClient,
    inviteId: string,
    data: {
      acceptedAt: Date;
      acceptedByUserId: string | null;
      acceptedMemberId: string;
    },
  ) {
    return tx.organizationInvite.update({
      where: { id: inviteId },
      data,
    });
  }

  delete(id: string): Promise<void> {
    return this.prisma.organizationInvite
      .delete({ where: { id } })
      .then(() => undefined);
  }

  /**
   * Marks any PENDING invite for this (org, email) whose deadline has passed as
   * EXPIRED. Keeps the partial-unique "one pending per (org,email)" index clear
   * before creating a fresh invite.
   */
  async expireStalePending(
    organizationId: string,
    email: string,
  ): Promise<void> {
    await this.prisma.organizationInvite.updateMany({
      where: {
        organizationId,
        email,
        status: InviteStatus.PENDING,
        expiresAt: { lt: new Date() },
      },
      data: { status: InviteStatus.EXPIRED },
    });
  }
}
