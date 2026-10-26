import {
  PrismaClient,
  UserType,
  MembershipKind,
  PlatformRole,
  AuthProvider,
} from '@prisma/client';

const prisma = new PrismaClient();

async function ensureAccount(params: {
  email: string;
  displayName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
  phone?: string | null;
  provider: AuthProvider;
  providerId?: string | null;
  passwordHash?: string | null;
  actorType: UserType;
  actorId: string;
}) {
  const identity = await prisma.identity.findUnique({
    where: {
      actorType_actorId: {
        actorType: params.actorType,
        actorId: params.actorId,
      },
    },
    include: { account: true },
  });

  if (identity) {
    return prisma.account.update({
      where: { id: identity.accountId },
      data: {
        email: params.email,
        displayName: params.displayName ?? undefined,
        firstName: params.firstName ?? undefined,
        lastName: params.lastName ?? undefined,
        avatarUrl: params.avatarUrl ?? undefined,
        phone: params.phone ?? undefined,
      },
    });
  }

  return prisma.account.create({
    data: {
      email: params.email,
      displayName: params.displayName,
      firstName: params.firstName,
      lastName: params.lastName,
      avatarUrl: params.avatarUrl,
      phone: params.phone,
      identities: {
        create: {
          email: params.email,
          provider: params.provider,
          providerId: params.providerId,
          passwordHash: params.passwordHash,
          actorType: params.actorType,
          actorId: params.actorId,
        },
      },
    },
  });
}

async function main() {
  const users = await prisma.user.findMany();
  for (const user of users) {
    await ensureAccount({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      displayName:
        [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email,
      avatarUrl: user.avatarUrl,
      phone: user.phone,
      provider: user.authProvider,
      providerId: user.providerId,
      passwordHash: user.passwordHash,
      actorType: UserType.USER,
      actorId: user.id,
    });
  }

  const organizations = await prisma.organization.findMany();
  for (const organization of organizations) {
    const ownerRole = await prisma.organizationRole.findFirst({
      where: {
        organizationId: organization.id,
        isSystem: true,
        name: 'Владелец',
      },
      select: { id: true },
    });
    const account = await ensureAccount({
      email: organization.email,
      displayName: organization.name,
      avatarUrl: organization.logoUrl,
      phone: organization.phone,
      provider: organization.authProvider,
      providerId: organization.providerId,
      passwordHash: organization.passwordHash,
      actorType: UserType.ORGANIZATION,
      actorId: organization.id,
    });

    await prisma.membership.upsert({
      where: {
        accountId_organizationId_kind: {
          accountId: account.id,
          organizationId: organization.id,
          kind: MembershipKind.OWNER,
        },
      },
      update: {
        roleId: ownerRole?.id,
        roleName: 'OWNER',
      },
      create: {
        accountId: account.id,
        organizationId: organization.id,
        kind: MembershipKind.OWNER,
        roleId: ownerRole?.id,
        roleName: 'OWNER',
      },
    });
  }

  const members = await prisma.organizationMember.findMany({
    include: {
      role: { include: { permissions: { include: { permission: true } } } },
      permissions: { include: { permission: true } },
    },
  });

  for (const member of members) {
    const account = await ensureAccount({
      email: member.email,
      firstName: member.firstName,
      lastName: member.lastName,
      displayName:
        [member.firstName, member.lastName].filter(Boolean).join(' ') ||
        member.email,
      avatarUrl: member.avatarUrl,
      phone: member.phone,
      provider: AuthProvider.EMAIL,
      passwordHash: member.passwordHash,
      actorType: UserType.MEMBER,
      actorId: member.id,
    });

    const permissions = [
      ...new Set([
        ...member.role.permissions.map((item) => item.permission.code),
        ...member.permissions.map((item) => item.permission.code),
      ]),
    ];

    await prisma.membership.upsert({
      where: { organizationMemberId: member.id },
      update: {
        roleId: member.roleId,
        accountId: account.id,
        organizationId: member.organizationId,
        kind: MembershipKind.MEMBER,
        roleName: member.role.name,
        permissions,
      },
      create: {
        accountId: account.id,
        organizationId: member.organizationId,
        organizationMemberId: member.id,
        roleId: member.roleId,
        kind: MembershipKind.MEMBER,
        roleName: member.role.name,
        permissions,
      },
    });
  }

  const admins = await prisma.superAdmin.findMany();
  for (const admin of admins) {
    const account = await ensureAccount({
      email: admin.email,
      displayName: admin.name,
      provider: AuthProvider.EMAIL,
      passwordHash: admin.passwordHash,
      actorType: UserType.SUPER_ADMIN,
      actorId: admin.id,
    });

    await prisma.platformAdminGrant.upsert({
      where: {
        accountId_superAdminId: {
          accountId: account.id,
          superAdminId: admin.id,
        },
      },
      update: { role: PlatformRole.SUPER_ADMIN },
      create: {
        accountId: account.id,
        superAdminId: admin.id,
        role: PlatformRole.SUPER_ADMIN,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
