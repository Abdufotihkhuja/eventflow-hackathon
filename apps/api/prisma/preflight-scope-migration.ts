import { createHash } from 'node:crypto';
import { InviteStatus, UserType, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const cutoff = new Date().toISOString();
  const [
    accounts,
    personalIdentityGroups,
    orphanPersonalIdentities,
    membershipGroups,
    crossTenantRoles,
    pendingInviteGroups,
    archivedPendingInvites,
    refreshFamilies,
  ] = await Promise.all([
    prisma.account.count(),
    prisma.identity.groupBy({
      by: ['accountId'],
      where: { actorType: UserType.USER },
      _count: { _all: true },
    }),
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM identities i
      LEFT JOIN users u ON u.id = i.actor_id
      WHERE i.actor_type = 'USER' AND u.id IS NULL
    `,
    prisma.membership.groupBy({
      by: ['accountId', 'organizationId'],
      _count: { _all: true },
    }),
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM organization_members m
      JOIN organization_roles r ON r.id = m.role_id
      WHERE m.organization_id <> r.organization_id
    `,
    prisma.organizationInvite.groupBy({
      by: ['organizationId', 'email'],
      where: { status: InviteStatus.PENDING },
      _count: { _all: true },
    }),
    prisma.organizationInvite.count({
      where: {
        status: InviteStatus.PENDING,
        organization: { deletedAt: { not: null } },
      },
    }),
    prisma.refreshToken.groupBy({
      by: ['familyId'],
      _count: { _all: true },
    }),
  ]);

  const report = {
    schemaVersion: 1,
    cutoff,
    readOnly: true,
    accounts,
    personalIdentity: {
      zero: accounts - personalIdentityGroups.length,
      one: personalIdentityGroups.filter((row) => row._count._all === 1).length,
      many: personalIdentityGroups.filter((row) => row._count._all > 1).length,
      orphaned: Number(orphanPersonalIdentities[0]?.count ?? 0n),
    },
    membership: {
      duplicateAccountOrganization: membershipGroups.filter(
        (row) => row._count._all > 1,
      ).length,
      crossTenantRole: Number(crossTenantRoles[0]?.count ?? 0n),
    },
    invite: {
      duplicatePendingTuple: pendingInviteGroups.filter(
        (row) => row._count._all > 1,
      ).length,
      pendingForArchivedOrganization: archivedPendingInvites,
    },
    refresh: {
      families: refreshFamilies.length,
      familiesWithMultipleRows: refreshFamilies.filter(
        (row) => row._count._all > 1,
      ).length,
    },
  };
  const serialized = JSON.stringify(report);
  console.log(
    JSON.stringify(
      {
        ...report,
        sha256: createHash('sha256').update(serialized).digest('hex'),
      },
      null,
      2,
    ),
  );
}

void main().finally(() => prisma.$disconnect());
