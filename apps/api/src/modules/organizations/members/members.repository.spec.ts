import { MembersRepository, memberSafeSelect } from './members.repository';

/**
 * Security regression guard: GET /organizations/members (+ detail/update/create
 * responses) used to serialize `passwordHash`, `invitationToken` and
 * `tokenExpiresAt` because the repository queried with `include` only.
 * These tests pin the field whitelist at the QUERY level — the sensitive
 * columns must never be selected for member rows that reach a response body.
 */
const SENSITIVE_FIELDS = [
  'passwordHash',
  'invitationToken',
  'tokenExpiresAt',
] as const;

/** Fields web-workspace renders/edits — removing any of these breaks it. */
const REQUIRED_SAFE_FIELDS = [
  'id',
  'organizationId',
  'email',
  'firstName',
  'lastName',
  'phone',
  'position',
  'department',
  'avatarUrl',
  'roleId',
  'status',
  'createdAt',
  'role',
  'permissions',
] as const;

describe('MembersRepository field whitelist', () => {
  function setup() {
    const prisma = {
      organizationMember: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    return { prisma, repository: new MembersRepository(prisma as never) };
  }

  function expectSafeArgs(args: {
    select?: Record<string, unknown>;
    include?: unknown;
  }): void {
    expect(args.include).toBeUndefined();
    expect(args.select).toBeDefined();
    for (const field of SENSITIVE_FIELDS) {
      expect(args.select).not.toHaveProperty(field);
    }
    for (const field of REQUIRED_SAFE_FIELDS) {
      expect(args.select).toHaveProperty(field);
    }
  }

  it('never selects passwordHash/invitationToken/tokenExpiresAt in the shared whitelist', () => {
    for (const field of SENSITIVE_FIELDS) {
      expect(memberSafeSelect).not.toHaveProperty(field);
    }
  });

  it('list query (findByOrganizationId) uses the whitelist select', async () => {
    const { prisma, repository } = setup();
    await repository.findByOrganizationId('org-1');
    expectSafeArgs(prisma.organizationMember.findMany.mock.calls[0][0]);
  });

  it('detail query (findById) uses the whitelist select', async () => {
    const { prisma, repository } = setup();
    await repository.findById('member-1');
    expectSafeArgs(prisma.organizationMember.findFirst.mock.calls[0][0]);
  });

  it('create/update responses use the whitelist select', async () => {
    const { prisma, repository } = setup();
    await repository.create({} as never);
    await repository.update('member-1', {});
    expectSafeArgs(prisma.organizationMember.create.mock.calls[0][0]);
    expectSafeArgs(prisma.organizationMember.update.mock.calls[0][0]);
  });
});
